const fs = require('fs');
const path = require('path');

const CONFIG = {
  BOOKMARKS_JSON: path.join(__dirname, '..', 'data', 'bookmarks.json'),
  PROMPT_FILE: path.join(__dirname, '..', 'prompts', 'summarize_prompt.txt'),
  ENV_FILE: path.join(__dirname, '..', '.env')
};

function loadEnv() {
  const content = fs.readFileSync(CONFIG.ENV_FILE, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length > 0) env[key.trim()] = val.join('=').trim();
  });
  return env;
}

async function getSummary(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });
  const result = await response.json();
  
  if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
    console.error('APIレスポンス異常:', JSON.stringify(result, null, 2));
    throw new Error('期待されたAPIレスポンスが得られませんでした。');
  }

  const text = result.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

async function testReevaluation() {
  const env = loadEnv();
  const bookmarks = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  const promptTemplate = fs.readFileSync(CONFIG.PROMPT_FILE, 'utf8');

  // 旧評価が 'high' の記事からランダムに5件抽出
  const highArticles = bookmarks.articles.filter(a => a.priority === 'high');
  const testTargets = highArticles.sort(() => 0.5 - Math.random()).slice(0, 5);

  console.log(`=== 新プロンプトによる再評価テスト (N=5) ===\n`);

  for (const article of testTargets) {
    const mdPath = path.join(__dirname, '..', article.markdown_path);
    if (!fs.existsSync(mdPath)) {
      console.error(`ファイルが見つかりません: ${mdPath}`);
      continue;
    }
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    
    // 文字化け対策: '## 本文' という見出しの代わりに '---' 以降を本文として抽出を試みる
    const parts = mdContent.split('---');
    const excerpt = parts.length > 1 ? parts[parts.length - 1].trim().substring(0, 5000) : mdContent.substring(0, 5000);

    const prompt = promptTemplate
      .replace('{{title}}', article.title)
      .replace('{{url}}', article.url)
      .replace('{{excerpt}}', excerpt);

    try {
      const result = await getSummary(env.GEMINI_API_KEY, prompt);
      
      console.log(`タイトル: ${article.title}`);
      console.log(`旧評価: ${article.priority.toUpperCase()}`);
      console.log(`新評価: ${result.priority.toUpperCase()}`);
      
      if (article.priority !== result.priority) {
        console.log(`[ステータス] 降格 (${article.priority} -> ${result.priority})`);
        console.log(`降格理由: ${result.defer_reason}`);
      } else {
        console.log(`[ステータス] 維持 (厳格なHigh基準をクリア)`);
        console.log(`維持理由: ${result.read_now_reason}`);
      }
      console.log('-------------------------------------------\n');
      
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`エラー: ${article.title} - ${e.message}`);
    }
  }
}

testReevaluation();
