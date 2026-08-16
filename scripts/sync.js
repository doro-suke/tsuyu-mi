const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { execSync } = require('child_process');

// ローカル実行時のみ .env を読み込み、クラウドでは process.env を優先する
require('dotenv').config();

const RAINDROP_API_KEY = process.env.RAINDROP_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!RAINDROP_API_KEY || !GEMINI_API_KEY) {
  console.error("【CRITICAL ERROR】RAINDROP_API_KEY または GEMINI_API_KEY が環境変数に設定されていません。GitHub Secrets と sync.yml の env 設定を確認してください。");
  process.exit(1);
}

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

function sanitizeFileName(title) {
  return (title || 'untitled').replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
}

/**
 * ユーティリティ: curlを実行
 */
function curl(url, options = {}) {
  let command = `curl -s -L "${url}"`;
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      const safeValue = String(value).replace(/"/g, '\\"');
      command += ` -H "${key}: ${safeValue}"`;
    }
  }
  if (options.method === 'POST') {
    const tempFile = path.join(CONFIG.DATA_DIR, `temp_post_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    fs.writeFileSync(tempFile, options.body, 'utf8');
    command += ` -X POST -H "Content-Type: application/json" -d "@${tempFile}"`;
    try {
      const stdout = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return {
        ok: true,
        text: async () => stdout,
        json: async () => {
          try {
            return JSON.parse(stdout);
          } catch (e) {
            console.error(`[JSON解析失敗] レスポンスがJSONではありません: ${stdout.substring(0, 200)}...`);
            throw e;
          }
        }
      };
    } catch (error) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      console.error(`curl (POST) failed: ${error.message}`);
      return { ok: false, status: 500, text: async () => '', json: async () => ({}) };
    }
  }
  
  try {
    const stdout = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return {
      ok: true,
      text: async () => stdout,
      json: async () => {
        try {
          if (!stdout || stdout.trim() === "") throw new Error("レスポンスが空です");
          return JSON.parse(stdout);
        } catch (e) {
          console.error(`[JSON解析失敗] URL: ${url}`);
          console.error(`[JSON解析失敗] 内容: ${stdout.substring(0, 500)}...`);
          throw e;
        }
      }
    };
  } catch (error) {
    console.error(`curl failed: ${error.message}`);
    return { ok: false, status: 500, text: async () => '', json: async () => ({}) };
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
  const existingUrls = new Set(bookmarks.articles.map(a => a.url));
  const existingIds = new Set(bookmarks.articles.map(a => a.id));
  
  let unprocessedItems = [];
  let consecutiveExistingCount = 0;
  let totalScanned = 0;

  console.log(`[Raindrop] 未処理記事のスキャンを開始します (最大 ${CONFIG.MAX_SCAN_PAGES * CONFIG.RAINDROP_PER_PAGE} 件走査)...`);

  for (let page = 0; page < CONFIG.MAX_SCAN_PAGES; page++) {
    const items = await fetchRaindrops(apiKey, page);
    if (items.length === 0) break;
    
    totalScanned += items.length;

    for (const item of items) {
      const sanitizedTitle = sanitizeFileName(item.title);
      const mdPath = path.join(CONFIG.NOTEBOOK_DIR, `${sanitizedTitle}.md`);
      
      const isAlreadyProcessed = (existingUrls.has(item.link) || existingIds.has(item._id.toString())) && fs.existsSync(mdPath);

      if (isAlreadyProcessed) {
        consecutiveExistingCount++;
        if (consecutiveExistingCount >= CONFIG.CONSECUTIVE_EXISTING_LIMIT) {
          console.log(`[Scan] 連続 ${consecutiveExistingCount} 件の処理済み記事を検出。スキャンを完了します。`);
          break;
        }
      } else {
        // 未処理記事を発見
        consecutiveExistingCount = 0;
        unprocessedItems.push(item);
      }
    }

    if (consecutiveExistingCount >= CONFIG.CONSECUTIVE_EXISTING_LIMIT || items.length < CONFIG.RAINDROP_PER_PAGE) {
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
    if (!response.ok) throw new Error(`Fetch failed`);
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
    console.error(`  [抽出失敗] ${url}: ${error.message}`);
    return null;
  }
}

/**
 * 4. Gemini API で解析 (スコアリング＆タグ分類のみの軽量呼び出し)
 */
async function getSummary(apiKey, prompt, retryCount = 0) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  const response = curl(url, {
    method: 'POST',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API 接続エラー (curl failed)`);
  }

  const responseJson = await response.json();

  if (responseJson.error) {
    const errorCode = responseJson.error.code;
    const errorMessage = responseJson.error.message;

    if (errorCode === 429 && retryCount < CONFIG.MAX_RETRIES) {
      const waitTime = (retryCount + 1) * 30000 + 10000; // 40s, 70s, 100s...
      console.log(`  [429 Error] レート制限に達しました。${waitTime/1000}秒後にリトライします... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(waitTime);
      return getSummary(apiKey, prompt, retryCount + 1);
    }
    throw new Error(`Gemini API エラー: ${errorMessage} (Code: ${errorCode})`);
  }

  if (!responseJson.candidates || !responseJson.candidates[0]) {
      throw new Error("Gemini API からの応答が不正です（候補がありません）。");
  }
  const text = responseJson.candidates[0].content.parts[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("有効なJSONが得られませんでした。");
  return JSON.parse(jsonMatch[0]);
}

/**
 * notebooklm_sources/ 内の孤立 .md ファイルを削除する
 */
function cleanupOrphanedMarkdowns(bookmarks) {
  if (!fs.existsSync(CONFIG.NOTEBOOK_DIR)) return;
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
 * メイン処理
 */
async function main() {
  console.log('=== Vesper: 全自動同期パイプライン開始 ===');
  
  const maxProcess = process.argv[2] ? parseInt(process.argv[2], 10) : CONFIG.MAX_PROCESS_DEFAULT;
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
      const sanitizedTitle = sanitizeFileName(item.title);
      const mdPath = path.join(CONFIG.NOTEBOOK_DIR, `${sanitizedTitle}.md`);

      try {
        const extracted = await extractContent(item.link);
        const contentText = extracted ? extracted.textContent.trim() : (item.excerpt || '内容なし');
        const prompt = promptTemplate
          .replace('{{title}}', item.title)
          .replace('{{url}}', item.link)
          .replace('{{excerpt}}', contentText.substring(0, 5000));
        
        const analysis = await getSummary(GEMINI_API_KEY, prompt);
        const score = typeof analysis.score === 'number' ? analysis.score : 50;
        const tagsSuggested = Array.isArray(analysis.tags_suggested) ? analysis.tags_suggested : [];

        // AI用ソース（本文 Markdown）の生成
        const mdContent = `# ${item.title}\n` +
          `- **Source URL**: ${item.link}\n` +
          `- **Score**: ${score}\n` +
          `- **Suggested Tags**: ${tagsSuggested.map(t => `#${t}`).join(', ')}\n` +
          `- **Processed Date**: ${new Date().toLocaleDateString('ja-JP')}\n\n` +
          `---\n\n` +
          `## 本文\n${contentText}\n`;
        
        fs.writeFileSync(mdPath, mdContent, 'utf8');

        const existing = bookmarks.articles.find(a => a.url === item.link || a.id === item._id.toString());
        const newArticle = {
          id: item._id.toString(),
          url: item.link,
          title: item.title,
          excerpt: item.excerpt || (extracted ? extracted.excerpt : '') || '',
          summary: existing?.summary || '', // 旧データの要約があれば保持、新規は空文字
          score: score,
          read_now_reason: existing?.read_now_reason || '',
          defer_reason: existing?.defer_reason || '',
          tags: [...new Set([...(item.tags || []), ...tagsSuggested])],
          status: existing ? existing.status : 'unread',
          analyzed_at: new Date().toISOString(),
          markdown_path: `data/notebooklm_sources/${sanitizedTitle}.md`
        };

        if (existing) {
          Object.assign(existing, newArticle);
        } else {
          bookmarks.articles.push(newArticle);
        }

        bookmarks.updated_at = new Date().toISOString();
        fs.writeFileSync(CONFIG.BOOKMARKS_JSON, JSON.stringify(bookmarks, null, 2), 'utf8');
        processedCount++;
        console.log(`  成功: Score ${score} / Tags: [${tagsSuggested.join(', ')}]`);
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
    console.error(`\n[致命的なエラー] ${error.message}`);
    process.exit(1);
  }
}

main();
