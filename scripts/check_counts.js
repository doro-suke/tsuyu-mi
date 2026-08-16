const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'data', 'notebooklm_sources - コピー');

function main() {
  const dirs = fs.readdirSync(TARGET_DIR).filter(d => fs.statSync(path.join(TARGET_DIR, d)).isDirectory());
  console.log('=== 最新のカテゴリ別ファイル件数 ===');
  let total = 0;
  for (const dir of dirs) {
    const count = fs.readdirSync(path.join(TARGET_DIR, dir)).filter(f => f.endsWith('.md')).length;
    console.log(`${dir}: ${count} 件`);
    total += count;
  }
  console.log(`\n合計: ${total} 件`);
}

main();
