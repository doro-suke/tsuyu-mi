const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 設定
 */
const CONFIG = {
  BOOKMARKS_JSON: path.join(__dirname, '..', 'data', 'bookmarks.json'),
  GENERATE_SCRIPT: path.join(__dirname, 'generate_dashboard.js')
};

function main() {
  const idsInput = process.argv[2];
  const targetStatus = process.argv[3] || 'read'; // デフォルトは 'read'

  if (!idsInput) {
    console.log('使用法: node scripts/update_status.js <ID1,ID2,...> [status]');
    console.log('status: read | unread (デフォルト: read)');
    return;
  }

  const idsToUpdate = idsInput.split(',').map(id => id.trim());
  if (idsToUpdate.length === 0) return;

  if (!fs.existsSync(CONFIG.BOOKMARKS_JSON)) {
    console.error('bookmarks.json が見つかりません。');
    return;
  }

  const data = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  let updateCount = 0;

  data.articles.forEach(article => {
    if (idsToUpdate.includes(article.id.toString())) {
      article.status = targetStatus;
      updateCount++;
    }
  });

  if (updateCount === 0) {
    console.log('一致するIDが見つかりませんでした。');
    return;
  }

  data.updated_at = new Date().toISOString();
  fs.writeFileSync(CONFIG.BOOKMARKS_JSON, JSON.stringify(data, null, 2), 'utf8');

  console.log(`\n=== ステータス更新完了 ===`);
  console.log(`更新数: ${updateCount} 件`);
  console.log(`新ステータス: ${targetStatus}`);

  // ダッシュボードの再生成
  console.log('\n[Dashboard] ダッシュボードを更新中...');
  try {
    if (fs.existsSync(CONFIG.GENERATE_SCRIPT)) {
      execSync(`node "${CONFIG.GENERATE_SCRIPT}"`, { stdio: 'inherit' });
    } else {
      console.log('警告: generate_dashboard.js が見つかりません。');
    }
  } catch (err) {
    console.error(`ダッシュボード更新失敗: ${err.message}`);
  }
}

main();
