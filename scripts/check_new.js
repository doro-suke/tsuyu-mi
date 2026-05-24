/**
 * Raindrop から新規ブックマークを確認するスクリプト
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) env[key.trim()] = val.join('=').trim();
  });
  return env;
}

function curlGet(url, token) {
  const cmd = `curl -s -L "${url}" -H "Authorization: Bearer ${token}"`;
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(result);
}

async function main() {
  const env = loadEnv();
  const key = env.RAINDROP_API_KEY;
  if (!key) { console.error('RAINDROP_API_KEY が見つかりません'); return; }

  const existing = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'bookmarks.json'), 'utf8'));
  const existingUrls = new Set(existing.articles.map(a => a.url));
  const existingIds = new Set(existing.articles.map(a => a.id));

  console.log(`現在のデータ: ${existing.articles.length} 件`);

  let allNew = [];
  for (let page = 0; page < 6; page++) {
    const url = `https://api.raindrop.io/rest/v1/raindrops/0?perpage=50&page=${page}&sort=-created`;
    console.log(`[Page ${page}] 取得中...`);
    const data = curlGet(url, key);
    const items = data.items || [];
    if (items.length === 0) break;
    
    const newItems = items.filter(i => !existingUrls.has(i.link) && !existingIds.has(i._id.toString()));
    allNew = allNew.concat(newItems);
    
    console.log(`  取得: ${items.length}件 / 新規: ${newItems.length}件`);
    if (items.length < 50) break;
  }

  console.log(`\n=== 結果 ===`);
  console.log(`新規ブックマーク合計: ${allNew.length} 件`);
  if (allNew.length > 0) {
    console.log('\n新規一覧:');
    allNew.forEach((i, idx) => console.log(`  ${idx+1}. [${i._id}] ${i.title?.substring(0, 60)}`));
  }
}

main().catch(console.error);
