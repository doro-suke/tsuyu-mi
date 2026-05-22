const fs = require('fs');
const path = require('path');

async function main() {
  // .envファイルから環境変数を手動で読み込む (外部ライブラリなし)
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('エラー: .env ファイルが見つかりません。');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });

  const apiKey = env.RAINDROP_API_KEY;
  if (!apiKey) {
    console.error('エラー: RAINDROP_API_KEY が .env に設定されていません。');
    return;
  }

  const url = 'https://api.raindrop.io/rest/v1/raindrops/0?perpage=3&sort=-created';
  
  console.log(`Raindrop.io API に接続中: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`APIリクエスト失敗: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const count = data.items ? data.items.length : 0;
    console.log(`成功: ${count} 件のブックマークを取得しました。`);

    const outputPath = path.join(__dirname, '..', 'data', 'sample_raindrops.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`結果を ${outputPath} に保存しました。`);

  } catch (error) {
    console.error(`エラーが発生しました: ${error.message}`);
  }
}

main();
