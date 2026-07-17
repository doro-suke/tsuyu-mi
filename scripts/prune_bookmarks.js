const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 設定
 */
const CONFIG = {
  BOOKMARKS_JSON: path.join(__dirname, '..', 'data', 'bookmarks.json'),
  NOTEBOOK_DIR: path.join(__dirname, '..', 'data', 'notebooklm_sources'),
  GENERATE_SCRIPT: path.join(__dirname, 'generate_dashboard.js')
};

function main() {
  const input = process.argv[2];
  if (!input) {
    console.log('使用法: node scripts/prune_bookmarks.js <ID1,ID2,...>');
    return;
  }

  const idsToDelete = input.split(',').map(id => id.trim());
  if (idsToDelete.length === 0) return;

  if (!fs.existsSync(CONFIG.BOOKMARKS_JSON)) {
    console.error('bookmarks.json が見つかりません。');
    return;
  }

  const data = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  const initialCount = data.articles.length;

  const remainingArticles = [];
  const deletedTitles = [];

  data.articles.forEach(article => {
    if (idsToDelete.includes(article.id.toString())) {
      // Markdownファイルの削除
      if (article.markdown_path) {
        const mdPath = path.join(__dirname, '..', article.markdown_path);
        if (fs.existsSync(mdPath)) {
          fs.unlinkSync(mdPath);
          console.log(`[Deleted File] ${path.basename(mdPath)}`);
        }
      }
      deletedTitles.push(article.title);
    } else {
      remainingArticles.push(article);
    }
  });

  if (deletedTitles.length === 0) {
    console.log('一致するIDが見つかりませんでした。');
    return;
  }

  data.articles = remainingArticles;
  data.updated_at = new Date().toISOString();

  fs.writeFileSync(CONFIG.BOOKMARKS_JSON, JSON.stringify(data, null, 2), 'utf8');

  console.log(`\n=== 削除完了 ===`);
  console.log(`削除数: ${deletedTitles.length} 件`);
  deletedTitles.forEach(t => console.log(`- ${t}`));
  console.log(`残存数: ${data.articles.length} 件`);

  // ダッシュボードの再生成
  console.log('\n[Dashboard] ダッシュボードを更新中...');
  try {
    // scripts/sync.js の generateDashboard を直接呼ぶのは難しいため、
    // scripts/generate_dashboard.js があればそれを使うか、
    // 本来は共通モジュール化すべきだが、ここでは簡易的に sync.js をダミー実行するか、
    // あるいはこのスクリプト内にロジックをコピーするか。
    // 今回は generate_dashboard.js があるのでそれを実行。
    if (fs.existsSync(CONFIG.GENERATE_SCRIPT)) {
      execSync(`node "${CONFIG.GENERATE_SCRIPT}"`, { stdio: 'inherit' });
    } else {
        console.log('警告: generate_dashboard.js が見つからないため、ダッシュボードは次回同期時に更新されます。');
    }
  } catch (err) {
    console.error(`ダッシュボード更新失敗: ${err.message}`);
  }
}

main();
