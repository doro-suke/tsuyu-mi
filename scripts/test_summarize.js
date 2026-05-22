const fs = require('fs');
const path = require('path');

/**
 * このスクリプトは、Gemini CLIの文脈でAI自身が要約処理を行うための
 * テスト用テンプレートです。
 */
async function main() {
  const sampleDataPath = path.join(__dirname, '..', 'data', 'sample_raindrops.json');
  const promptPath = path.join(__dirname, '..', 'prompts', 'summarize_prompt.txt');

  if (!fs.existsSync(sampleDataPath) || !fs.existsSync(promptPath)) {
    console.error('エラー: サンプルデータまたはプロンプトファイルが見つかりません。');
    return;
  }

  const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
  const promptTemplate = fs.readFileSync(promptPath, 'utf8');

  const article = sampleData.items[0];
  if (!article) {
    console.error('エラー: サンプルデータに記事が含まれていません。');
    return;
  }

  // プロンプトの変数を置換
  let prompt = promptTemplate
    .replace('{{title}}', article.title)
    .replace('{{url}}', article.link)
    .replace('{{excerpt}}', article.excerpt || '内容なし');

  console.log('--- 生成されたプロンプト ---');
  console.log(prompt);
  console.log('---------------------------');

  console.log('\n[注意] このスクリプトはプロンプトの準備までを行います。');
  console.log('実際の要約は、このプロンプトをAIエージェント（私）に渡して実行します。');
}

main();
