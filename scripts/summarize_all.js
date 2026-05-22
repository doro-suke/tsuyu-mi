const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

/**
 * 指定されたミリ秒待機する
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ファイル名をサニタイズする
 */
function sanitizeFileName(title) {
  return title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
}

/**
 * .envファイルから環境変数を読み込む
 */
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

/**
 * URLから本文を抽出する
 */
async function extractContent(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();
    
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    return article ? {
      textContent: article.textContent,
      content: article.content,
      excerpt: article.excerpt
    } : null;
  } catch (error) {
    console.error(`抽出失敗 (${url}): ${error.message}`);
    return null;
  }
}

/**
 * Gemini APIを使用して要約を取得する
 */
async function getSummary(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${error}`);
  }

  const result = await response.json();
  const text = result.candidates[0].content.parts[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("有効なJSONレスポンスが得られませんでした。");
  return JSON.parse(jsonMatch[0]);
}

async function main() {
  const env = loadEnv();
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('エラー: GEMINI_API_KEY が .env に設定されていません。');
    return;
  }

  const sampleDataPath = path.join(__dirname, '..', 'data', 'sample_raindrops.json');
  const promptTemplatePath = path.join(__dirname, '..', 'prompts', 'summarize_prompt.txt');
  const outputPath = path.join(__dirname, '..', 'data', 'bookmarks.json');
  const notebookDir = path.join(__dirname, '..', 'data', 'notebooklm_sources');

  if (!fs.existsSync(sampleDataPath) || !fs.existsSync(promptTemplatePath)) {
    console.error('エラー: 必要ファイルが見つかりません。');
    return;
  }

  const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
  const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8');
  
  let bookmarks = { updated_at: new Date().toISOString(), articles: [] };
  if (fs.existsSync(outputPath)) {
    bookmarks = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }

  console.log(`${sampleData.items.length} 件の記事を処理します...`);

  for (const item of sampleData.items) {
    console.log(`\n--- 処理中: ${item.title} ---`);
    
    // 既存チェック
    const existing = bookmarks.articles.find(a => a.url === item.link);
    if (existing && fs.existsSync(path.join(notebookDir, `${sanitizeFileName(item.title)}.md`))) {
      console.log('-> スキップ: 既に処理済みです。');
      continue;
    }

    try {
      // 1. 本文抽出
      console.log('本文を抽出中...');
      const extracted = await extractContent(item.link);
      const contentText = extracted ? extracted.textContent.trim() : (item.excerpt || '内容なし');

      // 2. AIによる要約と判定 (本文の一部をプロンプトに含める)
      console.log('Geminiで解析中...');
      const truncatedContent = contentText.substring(0, 5000); // トークン節約のため制限
      const prompt = promptTemplate
        .replace('{{title}}', item.title)
        .replace('{{url}}', item.link)
        .replace('{{excerpt}}', truncatedContent);

      const analysis = await getSummary(apiKey, prompt);
      
      // 3. NotebookLM用Markdownの生成
      const sanitizedTitle = sanitizeFileName(item.title);
      const mdContent = `# ${item.title}
- **Source URL**: ${item.link}
- **Priority**: ${analysis.priority}
- **AI Summary**:
${analysis.summary.map(s => `  - ${s}`).join('\n')}
- **Read Now Reason**: ${analysis.read_now_reason}
- **Suggested Tags**: ${analysis.tags_suggested.map(t => `#${t}`).join(', ')}
- **Processed Date**: ${new Date().toLocaleDateString('ja-JP')}

---

## 本文
${contentText}
`;
      fs.writeFileSync(path.join(notebookDir, `${sanitizedTitle}.md`), mdContent, 'utf8');
      console.log(`-> Markdown保存完了: ${sanitizedTitle}.md`);

      // 4. データ保存
      const newArticle = {
        id: item._id.toString(),
        url: item.link,
        title: item.title,
        summary: analysis.summary.join('\n'),
        priority: analysis.priority,
        read_now_reason: analysis.read_now_reason,
        defer_reason: analysis.defer_reason,
        tags: [...new Set([...(item.tags || []), ...(analysis.tags_suggested || [])])],
        status: 'unread',
        analyzed_at: new Date().toISOString(),
        markdown_path: `data/notebooklm_sources/${sanitizedTitle}.md`
      };

      if (existing) {
        Object.assign(existing, newArticle);
      } else {
        bookmarks.articles.push(newArticle);
      }
      
      bookmarks.updated_at = new Date().toISOString();
      fs.writeFileSync(outputPath, JSON.stringify(bookmarks, null, 2), 'utf8');
      console.log('-> 成功: 要約と判定を保存しました。');

      console.log('待機中 (3秒)...');
      await sleep(3000);

    } catch (error) {
      console.error(`-> エラー: ${item.title} の処理に失敗しました。 ${error.message}`);
    }
  }

  console.log('\nすべての処理が完了しました。');
}

main();
