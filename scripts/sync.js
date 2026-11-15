const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { execSync, execFileSync } = require('child_process');
const { normalizeTags } = require('./tag_taxonomy');
const {
  assembleStructuredMarkdown,
  buildSummaryFromStructured,
  normalizeDomain,
  inferSourceFromUrl,
} = require('./structured_md');

// ローカル実行時のみ .env を読み込み、クラウドでは process.env を優先する
require('dotenv').config();

const RAINDROP_API_KEY = process.env.RAINDROP_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * 設定
 */
const CONFIG = {
  DATA_DIR: path.join(__dirname, '..', 'data'),
  NOTEBOOK_DIR: path.join(__dirname, '..', 'data', 'notebooklm_sources'),
  DOCS_DIR: path.join(__dirname, '..', 'docs'),
  BOOKMARKS_JSON: path.join(__dirname, '..', 'data', 'bookmarks.json'),
  PROMPT_FILE: path.join(__dirname, '..', 'prompts', 'summarize_prompt.txt'),
  TEMPLATE_FILE: path.join(__dirname, '..', 'templates', 'dashboard_template.html'),
  INDEX_HTML: path.join(__dirname, '..', 'index.html'),
  RAINDROP_PER_PAGE: 50,
  MAX_PROCESS_LIMIT: 200,         // 件数引数の上限
  MAX_PROCESS_DEFAULT: 10,        // 1回のデフォルト処理件数: 10件
  MAX_SCAN_PAGES: 10,             // 最大10ページ（500件）まで未処理記事を走査
  CONSECUTIVE_EXISTING_LIMIT: 25, // 連続25件すでに処理済みであれば安全にスキャン終了
  SLEEP_MS: 15000,                // 待機時間: 15秒（軽量プロンプト化により60秒から短縮）
  MAX_RETRIES: 3
};

/**
 * ユーティリティ
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ログ出力前にAPIキーをマスクする（execSync のエラーメッセージにはキー入りのコマンド全文が含まれるため）
function redact(text) {
  let out = String(text);
  for (const secret of [RAINDROP_API_KEY, GEMINI_API_KEY]) {
    if (secret) out = out.split(secret).join('***REDACTED***');
  }
  return out
    .replace(/([?&]key=)[^&"\s]+/g, '$1***REDACTED***')
    .replace(/(x-goog-api-key:\s*)[^\s"']+/gi, '$1***REDACTED***')
    .replace(/(Bearer\s+)[^\s"']+/gi, '$1***REDACTED***');
}

function truncateByBytes(str, maxBytes) {
  let bytes = 0;
  let result = '';
  for (const ch of str) {
    const chBytes = Buffer.byteLength(ch, 'utf8');
    if (bytes + chBytes > maxBytes) break;
    bytes += chBytes;
    result += ch;
  }
  return result;
}

function sanitizeFileName(title, maxBytes = 180) {
  const cleaned = (title || 'untitled').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\\/:*?"<>|]/g, '_').trim();
  return truncateByBytes(cleaned, maxBytes).trim() || 'untitled';
}

/**
 * curl 設定ファイル（-K -）の引用符付き文字列にエスケープする。
 * 制御文字（改行等）は設定行の注入に使われるため拒否する。
 */
function quoteCurlConfig(value) {
  const str = String(value);
  if (/[\u0000-\u001F\u007F]/.test(str)) {
    throw new Error('curl 引数に制御文字が含まれています');
  }
  return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/**
 * ユーティリティ: curlを実行
 * - シェルを経由しない（execFileSync + 引数配列）ため、URL 中の %VAR% / " / $() / バッククォートは展開・実行されない
 * - ヘッダ（API キーを含む）は標準入力の設定（-K -）で渡し、プロセス一覧の引数に載せない
 * - http/https 以外のスキームは取得しない
 * - 戻り値の ok は従来どおり「curl 自体の成否」。HTTP ステータスは status / httpOk で参照できる
 *   （Gemini の 429/503 は応答 JSON の error.code で判定する既存の再試行ロジックを維持するため、
 *    -f / --fail は使わずステータスを -w で取得している）
 */
function curl(url, options = {}) {
  const failed = () => ({ ok: false, httpOk: false, status: 500, text: async () => '', json: async () => ({}) });

  let target;
  try {
    target = new URL(String(url));
  } catch {
    console.error('curl failed: 不正な URL です');
    return failed();
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    console.error(`curl failed: 未対応のスキームです (${target.protocol})`);
    return failed();
  }

  const MARK = '__VESPER_HTTP__';
  const args = [
    '-s', '-L',
    '--proto', '=http,https', '--proto-redir', '=http,https',
    '--connect-timeout', '15', '--max-time', '45',
    '-w', MARK + '%{http_code}',
    '-K', '-'
  ];

  let config;
  try {
    config = [`url = ${quoteCurlConfig(target.href)}`];
    for (const [key, value] of Object.entries(options.headers || {})) {
      config.push(`header = ${quoteCurlConfig(`${key}: ${value}`)}`);
    }
    if (options.method === 'POST') {
      // 本文は設定（標準入力）に直接載せる。一時ファイルを使わない（日本語パスを curl.exe が読めない問題の回避も兼ねる）
      config.push('request = "POST"');
      config.push('header = "Content-Type: application/json"');
      config.push(`data-binary = ${quoteCurlConfig(options.body)}`);
    }
  } catch (error) {
    console.error(`curl failed: ${redact(error.message)}`);
    return failed();
  }

  try {
    const raw = execFileSync('curl', args, {
      input: config.join('\n') + '\n',
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    const idx = raw.lastIndexOf(MARK);
    const stdout = idx >= 0 ? raw.slice(0, idx) : raw;
    const status = idx >= 0 ? parseInt(raw.slice(idx + MARK.length), 10) : 0;
    return {
      ok: true,
      status,
      httpOk: status >= 200 && status < 300,
      text: async () => stdout,
      json: async () => {
        try {
          if (!stdout || stdout.trim() === "") throw new Error("レスポンスが空です");
          return JSON.parse(stdout);
        } catch (e) {
          console.error(`[JSON解析失敗] URL: ${redact(url)}`);
          console.error(`[JSON解析失敗] 内容: ${redact(stdout.substring(0, 500))}...`);
          throw e;
        }
      }
    };
  } catch (error) {
    console.error(`curl failed: ${redact(error.message)}`);
    return failed();
  }
}

/**
 * 1. Raindrop.io から指定ページのブックマークを取得
 */
async function fetchRaindrops(apiKey, page = 0) {
  const url = `https://api.raindrop.io/rest/v1/raindrops/0?perpage=${CONFIG.RAINDROP_PER_PAGE}&page=${page}&sort=-created`;
  console.log(`[Raindrop] 記事を取得中 (Page ${page}): ${url}`);
  
  const response = curl(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (!response.ok) {
    throw new Error(`Raindrop API 接続エラー (curl failed)`);
  }

  const data = await response.json();
  
  if (data.result === false || data.error) {
    throw new Error(`Raindrop API エラー: ${data.error || '不明なエラー'}`);
  }

  return data.items || [];
}

/**
 * 2. Raindrop から未処理記事（未登録または .md ファイル欠落）を安全にスキャン・キュー化
 */
async function scanUnprocessedRaindrops(apiKey, bookmarks) {
  const existingById = new Map(bookmarks.articles.map(a => [a.id, a]));
  const existingByUrl = new Map(bookmarks.articles.map(a => [a.url, a]));
  
  let unprocessedItems = [];
  let totalScanned = 0;

  console.log(`[Raindrop] 未処理記事のスキャンを開始します (最大 ${CONFIG.MAX_SCAN_PAGES * CONFIG.RAINDROP_PER_PAGE} 件走査)...`);

  for (let page = 0; page < CONFIG.MAX_SCAN_PAGES; page++) {
    const items = await fetchRaindrops(apiKey, page);
    if (items.length === 0) break;
    
    totalScanned += items.length;

    for (const item of items) {
      const existing = existingById.get(item._id.toString()) || existingByUrl.get(item.link);
      let mdPath;
      if (existing && existing.markdown_path) {
        mdPath = path.resolve(__dirname, '..', existing.markdown_path);
      } else {
        const sanitizedTitle = sanitizeFileName(item.title);
        mdPath = path.join(CONFIG.NOTEBOOK_DIR, `${item._id}_${sanitizedTitle}.md`);
      }
      
      const isAlreadyProcessed = Boolean(existing && fs.existsSync(mdPath));

      if (!isAlreadyProcessed) {
        unprocessedItems.push(item);
      }
    }

    if (items.length < CONFIG.RAINDROP_PER_PAGE) {
      break;
    }
  }

  console.log(`[Scan完了] 走査件数: ${totalScanned} 件 / 未処理記事: ${unprocessedItems.length} 件`);
  return unprocessedItems;
}

/**
 * 3. 本文抽出
 */
async function extractContent(url) {
  try {
    const response = curl(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok || !response.httpOk) throw new Error(`Fetch failed (HTTP ${response.status})`);
    const html = await response.text();
    if (!html) throw new Error(`HTML content is empty`);
    
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    return article ? {
      textContent: article.textContent,
      excerpt: article.excerpt
    } : null;
  } catch (error) {
    console.error(`  [抽出失敗] ${redact(url)}: ${redact(error.message)}`);
    return null;
  }
}

/**
 * 4. Gemini API で構造化解析を実行 (1記事1回・503時のモデルフォールバック対応)
 */
async function getSummary(apiKey, prompt, retryCount = 0) {
  const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
  const model = MODELS[retryCount % MODELS.length];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  
  const response = curl(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: {
          type: "OBJECT",
          properties: {
            score: { type: "INTEGER" },
            tags_suggested: { type: "ARRAY", items: { type: "STRING" } },
            source: { type: "STRING" },
            date: { type: "STRING" },
            domain: {
              type: "STRING",
              enum: ["youtube-script", "video-pipeline", "game-design", "godot-impl", "marketing", "other"]
            },
            tags: { type: "ARRAY", items: { type: "STRING" } },
            core_rule: { type: "STRING" },
            anti_pattern: { type: "STRING" },
            problem: { type: "STRING" },
            actionable_rules: { type: "STRING" },
            anti_patterns: { type: "STRING" },
            snippets: { type: "STRING" }
          },
          required: [
            "score", "tags_suggested", "source", "date", "domain", "tags",
            "core_rule", "anti_pattern", "problem", "actionable_rules", "anti_patterns", "snippets"
          ]
        }
      }
    })
  });

  if (!response.ok) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`  [Network Error] curl失敗 (${model})。5秒後に別モデルでリトライします... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(5000);
      return getSummary(apiKey, prompt, retryCount + 1);
    }
    throw new Error(`Gemini API 接続エラー (curl failed)`);
  }

  const responseJson = await response.json();

  if (responseJson.error) {
    const errorCode = responseJson.error.code;
    const errorMessage = responseJson.error.message;

    if ((errorCode === 429 || errorCode === 503 || errorCode === 500 || errorCode === 404) && retryCount < CONFIG.MAX_RETRIES) {
      const waitTime = (errorCode === 503 || errorCode === 404) ? 5000 : (retryCount + 1) * 30000 + 10000;
      console.log(`  [${errorCode} Error] ${model} で一時的なAPI制限/エラーです。${waitTime/1000}秒後にリトライします... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(waitTime);
      return getSummary(apiKey, prompt, retryCount + 1);
    }
    throw new Error(`Gemini API エラー (${model}): ${errorMessage} (Code: ${errorCode})`);
  }

  if (!responseJson.candidates || !responseJson.candidates[0] || !responseJson.candidates[0].content) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`  [Candidate Empty] 応答候補が空でした。10秒後にリトライします... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(10000);
      return getSummary(apiKey, prompt, retryCount + 1);
    }
    throw new Error("Gemini API からの応答が不正です（候補がありません）。");
  }
  const text = responseJson.candidates[0].content.parts[0].text;
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // 下のフォールバックリトライへ進む
      }
    }
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`  [JSON Parse Error] ${model} の応答JSON解析に失敗。3秒後にリトライします... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(3000);
      return getSummary(apiKey, prompt, retryCount + 1);
    }
    throw parseErr;
  }
}

/**
 * プロンプトテンプレートへ記事メタデータ・本文を安全に埋め込む
 */
function buildSummarizePrompt(template, { title, url, date, contentText }) {
  const safeExcerpt = String(contentText || '').substring(0, 15000);
  return template
    .replace('{{title}}', () => String(title || ''))
    .replace('{{url}}', () => String(url || ''))
    .replace('{{date}}', () => String(date || new Date().toISOString().slice(0, 7)))
    .replace('{{excerpt}}', () => safeExcerpt);
}

/**
 * notebooklm_sources/ 内の孤立 .md ファイルを削除する
 */
function cleanupOrphanedMarkdowns(bookmarks) {
  if (!fs.existsSync(CONFIG.NOTEBOOK_DIR)) return;
  if (!bookmarks.articles || bookmarks.articles.length === 0) {
    console.log('[クリーンアップ] bookmarks が空のため、孤立ファイルの削除をスキップします。');
    return;
  }
  const knownPaths = new Set(
    bookmarks.articles
      .filter(a => a.markdown_path)
      .map(a => path.resolve(path.join(__dirname, '..', a.markdown_path)))
  );
  const files = fs.readdirSync(CONFIG.NOTEBOOK_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.resolve(path.join(CONFIG.NOTEBOOK_DIR, f)));
  let cleaned = 0;
  for (const file of files) {
    if (!knownPaths.has(file)) {
      fs.unlinkSync(file);
      console.log(`  [クリーンアップ] 孤立ファイル削除: ${path.basename(file)}`);
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`[クリーンアップ] ${cleaned} 件の孤立ファイルを削除しました。`);
}

/**
 * 件数引数の検証（-1 などで全件処理になる事故を防ぐ）。未指定ならデフォルト。
 */
function parseMaxProcess(arg) {
  if (arg === undefined) return CONFIG.MAX_PROCESS_DEFAULT;
  if (!/^[0-9]+$/.test(String(arg))) {
    console.error(`エラー: 処理件数は 1〜${CONFIG.MAX_PROCESS_LIMIT} の整数で指定してください (指定値: ${arg})`);
    process.exit(1);
  }
  const n = parseInt(arg, 10);
  if (n < 1 || n > CONFIG.MAX_PROCESS_LIMIT) {
    console.error(`エラー: 処理件数は 1〜${CONFIG.MAX_PROCESS_LIMIT} の整数で指定してください (指定値: ${arg})`);
    process.exit(1);
  }
  return n;
}

/**
 * bookmarks.json を一時ファイル経由で書き込む（書き込み途中の中断で壊れないようにする）
 */
function writeBookmarksAtomic(bookmarks) {
  const tmp = CONFIG.BOOKMARKS_JSON + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(bookmarks, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG.BOOKMARKS_JSON);
}

/**
 * メイン処理
 */
async function main() {
  if (!RAINDROP_API_KEY || !GEMINI_API_KEY) {
    console.error("【CRITICAL ERROR】RAINDROP_API_KEY または GEMINI_API_KEY が環境変数に設定されていません。GitHub Secrets と sync.yml の env 設定を確認してください。");
    process.exit(1);
  }

  console.log('=== Vesper: 全自動同期パイプライン開始 ===');
  
  const maxProcess = parseMaxProcess(process.argv[2]);
  console.log(`最大処理件数: ${maxProcess}`);
  
  let bookmarks = { updated_at: new Date().toISOString(), articles: [] };
  if (fs.existsSync(CONFIG.BOOKMARKS_JSON)) {
    bookmarks = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  }
  console.log('[クリーンアップ] 孤立 .md ファイルをスキャン中...');
  cleanupOrphanedMarkdowns(bookmarks);

  try {
    // 1. 未処理記事のスキャン＆キュー化
    const unprocessedItems = await scanUnprocessedRaindrops(RAINDROP_API_KEY, bookmarks);
    
    if (unprocessedItems.length === 0) {
      console.log('[Info] 新規・未処理の記事はありません。すべて同期済みです。');
    } else {
      console.log(`[Queue] ${unprocessedItems.length} 件の未処理記事のうち、今回は最大 ${maxProcess} 件を処理します。`);
    }

    const promptTemplate = fs.readFileSync(CONFIG.PROMPT_FILE, 'utf8');
    let processedCount = 0;
    let errorCount = 0;

    const itemsToProcess = unprocessedItems.slice(0, maxProcess);

    for (const item of itemsToProcess) {
      console.log(`\n[Processing ${processedCount + 1}/${itemsToProcess.length}] ${item.title}`);
      const existing = bookmarks.articles.find(a => a.url === item.link || a.id === item._id.toString());
      const sanitizedTitle = sanitizeFileName(item.title);
      const relativeMdPath = existing?.markdown_path || `data/notebooklm_sources/${item._id}_${sanitizedTitle}.md`;
      const mdPath = path.resolve(__dirname, '..', relativeMdPath);

      try {
        const extracted = await extractContent(item.link);
        const contentText = extracted ? extracted.textContent.trim() : (item.excerpt || '内容なし');
        const fallbackDate = (item.created || new Date().toISOString()).slice(0, 7);
        const prompt = buildSummarizePrompt(promptTemplate, {
          title: item.title,
          url: item.link,
          date: fallbackDate,
          contentText,
        });

        const analysis = await getSummary(GEMINI_API_KEY, prompt);
        const rawScore = Number(analysis.score);
        const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 50;
        const tagsSuggested = Array.isArray(analysis.tags_suggested) ? analysis.tags_suggested : [];
        const specificTags = Array.isArray(analysis.tags) ? analysis.tags : [];

        // 高密度な構造化 Markdown の生成（ノイズ排除・YAMLフロントマター＋4セクション）
        const mdContent = assembleStructuredMarkdown(
          { title: item.title, url: item.link, fallbackDate },
          { ...analysis, score }
        );

        fs.mkdirSync(path.dirname(mdPath), { recursive: true });
        fs.writeFileSync(mdPath, mdContent, 'utf8');

        const structuredSummary = buildSummaryFromStructured(analysis);
        const newArticle = {
          id: item._id.toString(),
          url: item.link,
          title: item.title,
          excerpt: item.excerpt || (extracted ? extracted.excerpt : '') || '',
          summary: structuredSummary || existing?.summary || '',
          score: score,
          domain: normalizeDomain(analysis.domain),
          source: inferSourceFromUrl(item.link, analysis.source),
          core_rule: String(analysis.core_rule || '').trim(),
          anti_pattern: String(analysis.anti_pattern || '').trim(),
          specific_tags: specificTags,
          read_now_reason: existing?.read_now_reason || '',
          defer_reason: existing?.defer_reason || '',
          tags: normalizeTags([...(item.tags || []), ...tagsSuggested, ...specificTags], 4),
          status: existing ? existing.status : 'unread',
          is_structured: true,
          analyzed_at: new Date().toISOString(),
          markdown_path: relativeMdPath
        };

        if (existing) {
          Object.assign(existing, newArticle);
        } else {
          bookmarks.articles.push(newArticle);
        }

        bookmarks.updated_at = new Date().toISOString();
        writeBookmarksAtomic(bookmarks);
        processedCount++;
        console.log(`  成功: Score ${score} | Domain: ${newArticle.domain} | Tags: [${newArticle.tags.join(', ')}]`);
      } catch (err) {
        errorCount++;
        console.error(`  失敗: ${err.message}`);
        if (err.message.includes('429') || err.message.includes('limit')) {
          console.log('  [警告] API制限を検知。60秒待機して次へ進みます...');
          await sleep(60000);
        }
        console.log('  (未処理のまま残るため、次回以降の実行で再試行されます)');
        continue;
      } finally {
        await sleep(CONFIG.SLEEP_MS);
      }
    }

    const remainingCount = unprocessedItems.length - processedCount;
    console.log(`\n=== 処理統計 ===\n処理成功: ${processedCount} 件\nエラー: ${errorCount} 件\n残り未処理: ${remainingCount > 0 ? remainingCount : 0} 件`);
    if (remainingCount > 0) {
      console.log(`※ 残り ${remainingCount} 件の未処理記事は、次回の定期同期または手動実行で自動処理されます。`);
    }
    
    // ダッシュボードとNotebookLMまとめファイルの更新
    console.log('\n[Dashboard] ダッシュボードとNotebookLMまとめを更新中...');
    try {
      const execScript = path.join(__dirname, 'generate_dashboard.js');
      if (fs.existsSync(execScript)) {
        execSync(`node "${execScript}"`, { stdio: 'inherit' });
      } else {
        console.log('警告: generate_dashboard.js が見つかりません。');
      }
    } catch (err) {
      console.error(`ダッシュボード更新失敗: ${err.message}`);
    }
    
    console.log('=== Vesper: 全自動同期パイプライン完了 ===');
  } catch (error) {
    console.error(`\n[致命的なエラー] ${redact(error.message)}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  CONFIG,
  sleep,
  curl,
  extractContent,
  getSummary,
  cleanupOrphanedMarkdowns,
  parseMaxProcess,
  buildSummarizePrompt,
  sanitizeFileName,
};
