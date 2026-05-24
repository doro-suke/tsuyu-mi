const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

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
  INDEX_HTML: path.join(__dirname, '..', 'docs', 'index.html'),
  RAINDROP_PER_PAGE: 50,
  MAX_PROCESS_DEFAULT: 100, // 取得件数: 100件
  SLEEP_MS: 60000,          // 絶対遅延: 60秒（RPM制限対策で延長）
  MAX_RETRIES: 3
};

/**
 * ユーティリティ
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sanitizeFileName(title) {
  return title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
}

const { execSync } = require('child_process');

/**
 * ユーティリティ: curlを実行
 */
function curl(url, options = {}) {
  let command = `curl -s -L "${url}"`;
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      // 値にダブルクォートが含まれる場合の簡易的なエスケープ
      const safeValue = String(value).replace(/"/g, '\\"');
      command += ` -H "${key}: ${safeValue}"`;
    }
  }
  if (options.method === 'POST') {
    const tempFile = path.join(CONFIG.DATA_DIR, `temp_post_${Date.now()}.json`);
    fs.writeFileSync(tempFile, options.body, 'utf8');
    command += ` -X POST -H "Content-Type: application/json" -d "@${tempFile}"`;
    try {
      const stdout = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      fs.unlinkSync(tempFile);
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
 * 1. Raindrop.io から記事を取得
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
  
  // Raindrop API のエラーレスポンスをチェック
  if (data.result === false || data.error) {
    throw new Error(`Raindrop API エラー: ${data.error || '不明なエラー'}`);
  }

  return data.items || [];
}

/**
 * 2. 本文抽出
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
 * 3. Gemini API で解析 (リトライロジック付き)
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

  // レート制限 (429) またはエラーの判定
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
 * スコアフィールドの後方互換取得
 * 旧フォーマット（priority文字列）の記事にもスコアを割り当てる
 */
function deriveScore(article) {
  if (article.score !== undefined) return article.score;
  const map = { high: 75, medium: 45, low: 15 };
  return map[(article.priority || 'low').toLowerCase()] ?? 15;
}

/**
 * 全記事を相対分布でトリアージ: 上位15%→high, 次の35%→medium, 下位50%→low
 * 結果を article._tier に書き込む（JSONには保存しない一時フィールド）
 */
function assignTiers(articles) {
  const sorted = [...articles].sort((a, b) => deriveScore(b) - deriveScore(a));
  const n = sorted.length;
  const highCut = Math.ceil(n * 0.15);
  const medCut = Math.ceil(n * 0.50);
  sorted.forEach((article, i) => {
    article._tier = i < highCut ? 'high' : i < medCut ? 'medium' : 'low';
  });
}

/**
 * notebooklm_sources/ 内の孤立 .md ファイルを削除する
 * bookmarks.json に markdown_path が存在しないファイルが対象
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
 * 4. ダッシュボード生成
 */
const TAG_MAP = {
  'prompt engineering': 'プロンプトエンジニアリング',
  'promptengineering': 'プロンプトエンジニアリング',
  'aiプロンプト': 'プロンプトエンジニアリング',
  'claudecode': 'ClaudeCode',
  'claude code': 'ClaudeCode',
  'llm': '生成AI',
  'ai自動化': 'AI自動化',
  'ai駆動開発': 'AI駆動開発',
  'ai開発': 'AI駆動開発'
};

function normalizeTags(tags = []) {
  const normalized = tags.map(tag => {
    const lowTag = tag.toLowerCase().trim().replace(/^#/, '');
    return TAG_MAP[lowTag] || tag.trim().replace(/^#/, '');
  });
  return [...new Set(normalized)];
}

function generateDashboard(data) {
  if (!fs.existsSync(CONFIG.TEMPLATE_FILE)) return;
  const template = fs.readFileSync(CONFIG.TEMPLATE_FILE, 'utf8');
  const getPriorityClasses = (p) => {
    switch (p.toLowerCase()) {
      case 'high': return { border: 'border-red-500', badge: 'bg-red-100 text-red-800', label: 'High' };
      case 'medium': return { border: 'border-amber-400', badge: 'bg-amber-100 text-amber-800', label: 'Medium' };
      case 'low': return { border: 'border-gray-300', badge: 'bg-gray-100 text-gray-600', label: 'Low' };
      default: return { border: 'border-blue-300', badge: 'bg-blue-100 text-blue-800', label: p };
    }
  };
  const generateCard = (article) => {
    const classes = getPriorityClasses(article._tier);
    const tags = normalizeTags(article.tags);
    const tagsHtml = tags.map(tag => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 mr-1 mb-1">#${tag}</span>`).join('');
    const mdRelPath = article.markdown_path ? `../${article.markdown_path}` : '#';
    const isRead = article.status === 'read';
    const score = deriveScore(article);
    return `
      <div class="article-card flex flex-col bg-white rounded-lg shadow-md overflow-hidden border-t-4 ${classes.border} transition transform hover:-translate-y-1 hover:shadow-lg ${isRead ? 'status-read opacity-60' : ''}"
           data-article-id="${article.id}"
           data-title="${article.title.replace(/"/g, '&quot;')}"
           data-summary="${article.summary.replace(/"/g, '&quot;')}"
           data-priority="${article._tier}"
           data-score="${score}"
           data-tags="${tags.join(',')}">
          <div class="px-6 py-4 flex-grow">
              <div class="flex justify-between items-start mb-2">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes.badge}">${classes.label} <span class="opacity-70">· ${score}</span></span>
                  <div class="flex items-center gap-2">
                    <button onclick="toggleStatus('${article.id}')" class="toggle-status-btn text-xs font-medium text-indigo-600 hover:text-indigo-800 underline">
                        ${isRead ? '未読に戻す' : '既読にする'}
                    </button>
                    <button onclick="deleteArticle('${article.id}')" class="text-xs font-medium text-red-500 hover:text-red-700 underline ml-1">
                        削除
                    </button>
                    <span class="text-xs text-gray-400">${new Date(article.analyzed_at).toLocaleDateString('ja-JP')}</span>
                  </div>
              </div>
              <h2 class="text-xl font-bold mb-3 line-clamp-2 hover:text-indigo-600">
                  <a href="${article.url}" target="_blank">${article.title}</a>
              </h2>
              <div class="text-gray-600 text-sm mb-4 space-y-1">
                  ${article.summary.split('\n').map(line => `<p>・ ${line}</p>`).join('')}
              </div>
              <div class="bg-gray-50 p-3 rounded-md mb-4">
                  <p class="text-xs font-bold text-gray-500 uppercase mb-1">今読む理由</p>
                  <p class="text-sm text-gray-700 italic">${article.read_now_reason}</p>
              </div>
              <div class="mt-auto">${tagsHtml}</div>
          </div>
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-2">
              <a href="${article.url}" target="_blank" class="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">記事を読む</a>
              <a href="${mdRelPath}" target="_blank" class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">AI用ソース</a>
          </div>
      </div>`;
  };
  assignTiers(data.articles);
  const sortedArticles = [...data.articles].sort((a, b) => deriveScore(b) - deriveScore(a));
  const articlesHtml = sortedArticles.map(generateCard).join('\n');
  const finalHtml = template
    .replace('{{last_updated}}', new Date(data.updated_at).toLocaleString('ja-JP'))
    .replace('<!-- ARTICLES_PLACEHOLDER -->', articlesHtml);
  fs.writeFileSync(CONFIG.INDEX_HTML, finalHtml, 'utf8');
}

/**
 * メイン処理
 */
async function main() {
  console.log('=== つゆみ: 全自動同期パイプライン開始 ===');
  
  const maxProcess = process.argv[2] ? parseInt(process.argv[2], 10) : CONFIG.MAX_PROCESS_DEFAULT;
  console.log(`最大処理件数: ${maxProcess}`);
  let bookmarks = { updated_at: new Date().toISOString(), articles: [] };
  if (fs.existsSync(CONFIG.BOOKMARKS_JSON)) {
    bookmarks = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  }
  console.log('[クリーンアップ] 孤立 .md ファイルをスキャン中...');
  cleanupOrphanedMarkdowns(bookmarks);

  try {
    let allItems = [];
    for (let p = 0; p < 4; p++) {
      const items = await fetchRaindrops(RAINDROP_API_KEY, p);
      if (items.length === 0) break;
      allItems = allItems.concat(items);
      if (items.length < CONFIG.RAINDROP_PER_PAGE) break;
    }
    console.log(`[Raindrop] 合計 ${allItems.length} 件の記事を取得しました。`);
    const promptTemplate = fs.readFileSync(CONFIG.PROMPT_FILE, 'utf8');
    let processedCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    for (const item of allItems) {
      if (processedCount >= maxProcess) break;
      const existing = bookmarks.articles.find(a => a.url === item.link);
      const sanitizedTitle = sanitizeFileName(item.title);
      const mdPath = path.join(CONFIG.NOTEBOOK_DIR, `${sanitizedTitle}.md`);
      if (existing && fs.existsSync(mdPath)) {
        skipCount++;
        continue;
      }
      console.log(`\n[Processing] ${item.title}`);
      try {
        const extracted = await extractContent(item.link);
        const contentText = extracted ? extracted.textContent.trim() : (item.excerpt || '内容なし');
        const prompt = promptTemplate.replace('{{title}}', item.title).replace('{{url}}', item.link).replace('{{excerpt}}', contentText.substring(0, 5000));
        const analysis = await getSummary(GEMINI_API_KEY, prompt);
        const mdContent = `# ${item.title}\n- **Source URL**: ${item.link}\n- **Score**: ${analysis.score}\n- **AI Summary**:\n${analysis.summary.map(s => `  - ${s}`).join('\n')}\n- **Read Now Reason**: ${analysis.read_now_reason}\n- **Suggested Tags**: ${analysis.tags_suggested.map(t => `#${t}`).join(', ')}\n- **Processed Date**: ${new Date().toLocaleDateString('ja-JP')}\n\n---\n\n## 本文\n${contentText}\n`;
        fs.writeFileSync(mdPath, mdContent, 'utf8');
        const newArticle = {
          id: item._id.toString(),
          url: item.link,
          title: item.title,
          summary: analysis.summary.join('\n'),
          score: analysis.score,
          read_now_reason: analysis.read_now_reason,
          defer_reason: analysis.defer_reason,
          tags: [...new Set([...(item.tags || []), ...(analysis.tags_suggested || [])])],
          status: existing ? existing.status : 'unread',
          analyzed_at: new Date().toISOString(),
          markdown_path: `data/notebooklm_sources/${sanitizedTitle}.md`
        };
        if (existing) { Object.assign(existing, newArticle); } else { bookmarks.articles.push(newArticle); }
        bookmarks.updated_at = new Date().toISOString();
        fs.writeFileSync(CONFIG.BOOKMARKS_JSON, JSON.stringify(bookmarks, null, 2), 'utf8');
        processedCount++;
        console.log('  成功');
      } catch (err) {
        errorCount++;
        console.error(`  失敗: ${err.message}`);
        // 429リトライ上限に達した場合は少し長めに休む
        if (err.message.includes('429') || err.message.includes('limit')) {
            console.log('  [警告] API制限が厳しいようです。90秒待機して次へ進みます...');
            await sleep(90000);
        }
        console.log('  (次の記事へ進みます)');
        continue;
      } finally {
        await sleep(CONFIG.SLEEP_MS);
      }
    }
    console.log(`\n=== 処理統計 ===\n新規/更新: ${processedCount} 件\nスキップ: ${skipCount} 件\nエラー: ${errorCount} 件`);
    if (processedCount > 0 || !fs.existsSync(CONFIG.INDEX_HTML)) { generateDashboard(bookmarks); }
    console.log('=== つゆみ: 全自動同期パイプライン完了 ===');
  } catch (error) {
    console.error(`\n[致命的なエラー] ${error.message}`);
    process.exit(1);
  }
}

main();
