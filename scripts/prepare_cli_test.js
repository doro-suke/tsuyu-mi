const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  BOOKMARKS_JSON: path.join(__dirname, '..', 'data', 'bookmarks.json'),
  PROMPT_FILE: path.join(__dirname, '..', 'prompts', 'summarize_prompt.txt')
};

function runGeminiCLI(prompt) {
  // 一時ファイルにプロンプトを書き出す
  const tmpPromptPath = path.join(__dirname, 'tmp_prompt.txt');
  fs.writeFileSync(tmpPromptPath, prompt, 'utf8');
  
  try {
    // gemini コマンドを実行 (標準入力からプロンプトを渡す)
    // 注意: 環境によって 'gemini' コマンドの呼び出し方が異なる場合があります。
    // ここでは汎用的な実行方法を試みます。
    const cmd = `gemini "以下のプロンプトに従って分析し、JSONのみを出力してください。\\n\\n$(cat scripts/tmp_prompt.txt)"`;
    const output = execSync(cmd, { encoding: 'utf8' });
    return output;
  } catch (e) {
    console.error(`CLI実行エラー: ${e.message}`);
    return null;
  } finally {
    if (fs.existsSync(tmpPromptPath)) fs.unlinkSync(tmpPromptPath);
  }
}

async function testReevaluationCLI() {
  const bookmarks = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  const promptTemplate = fs.readFileSync(CONFIG.PROMPT_FILE, 'utf8');

  // 旧評価が 'high' の記事からランダムに3件抽出 (CLIは時間がかかるため少なめに)
  const highArticles = bookmarks.articles.filter(a => a.priority === 'high');
  const testTargets = highArticles.sort(() => 0.5 - Math.random()).slice(0, 3);

  console.log(`=== Gemini CLI による再評価テスト (N=3) ===\n`);

  for (const article of testTargets) {
    const mdPath = path.join(__dirname, '..', article.markdown_path);
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    const parts = mdContent.split('---');
    const excerpt = parts.length > 1 ? parts[parts.length - 1].trim().substring(0, 3000) : mdContent.substring(0, 3000);

    const fullPrompt = promptTemplate
      .replace('{{title}}', article.title)
      .replace('{{url}}', article.url)
      .replace('{{excerpt}}', excerpt);

    console.log(`分析中: ${article.title}...`);
    
    // ここではスクリプトから外部コマンドとして呼ぶのではなく、
    // エージェント（私）自身がツールとして実行する方が確実です。
    // そのため、このスクリプトは「プロンプトを生成して表示する」役割に留め、
    // 実際の推論は次のターンで私（Gemini CLI）が行います。
    
    console.log(`\n--- プロンプト開始 ---`);
    console.log(fullPrompt);
    console.log(`--- プロンプト終了 ---\n`);
    
    // 1件ずつ、ユーザーの指示を待たずに私自身が `invoke_agent` 等で処理する流れにします。
    break; // 今回は1件のサンプル提示に留めます
  }
}

testReevaluationCLI();
