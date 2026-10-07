const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// .env 読み込み
require(path.resolve(process.cwd(), 'node_modules/dotenv')).config();

const RAINDROP_API_KEY = process.env.RAINDROP_API_KEY;

if (!RAINDROP_API_KEY) {
  console.error('【エラー】RAINDROP_API_KEY が設定されていません。');
  process.exit(1);
}

const CONFIG = {
  DATA_DIR: path.join(__dirname, '..', 'data'),
  BACKUP_DIR: path.join(__dirname, '..', 'data', 'backups'),
  BOOKMARKS_JSON: path.join(__dirname, '..', 'data', 'bookmarks.json'),
  NOTEBOOK_DIR: path.join(__dirname, '..', 'data', 'notebooklm_sources'),
  GENERATE_SCRIPT: path.join(__dirname, 'generate_dashboard.js')
};

/**
 * 古いチェックアウトでの実行を防止する（origin/main より遅れていたら中断）
 */
function assertUpToDate(allowStale) {
  try {
    execSync('git fetch', { stdio: 'pipe' });
    const behind = parseInt(execSync('git rev-list --count HEAD..origin/main', { encoding: 'utf8' }).trim(), 10);
    if (Number.isNaN(behind)) throw new Error('rev-list の結果を解釈できません');
    if (behind > 0) {
      if (allowStale) {
        console.warn(`【警告】ローカルは origin/main より ${behind} コミット遅れています（--allow-stale により続行）`);
        return;
      }
      console.error(`【エラー】ローカルは origin/main より ${behind} コミット遅れています。先に git pull してください。`);
      console.error('（意図的に続行する場合のみ --allow-stale を指定）');
      process.exit(1);
    }
  } catch (e) {
    if (allowStale) {
      console.warn(`【警告】git の状態確認に失敗しましたが --allow-stale により続行: ${e.message}`);
      return;
    }
    console.error(`【エラー】git fetch / 比較に失敗しました: ${e.message}`);
    process.exit(1);
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const idArgs = args.filter(a => !a.startsWith('--'));
  assertUpToDate(args.includes('--allow-stale'));

  if (idArgs.length === 0) {
    console.error('使用法: node scripts/safe_prune.js [--dry-run] <ID1,ID2,...>');
    process.exit(1);
  }

  // 1. 入力バリデーション
  const rawIds = idArgs.join(',').split(',').map(s => s.trim()).filter(Boolean);
  const targetIds = [...new Set(rawIds)];

  for (const id of targetIds) {
    if (!/^\d+$/.test(id)) {
      console.error(`【無効なID形式】数字以外のIDが検出されました: "${id}"`);
      process.exit(1);
    }
  }

  console.log(`========================================`);
  console.log(`🛡️ Vesper 安全削除スクリプト (Safe Prune)`);
  console.log(`モード: ${isDryRun ? 'DRY-RUN (シミュレーション)' : '本番実行 (EXECUTE)'}`);
  console.log(`対象ID数: ${targetIds.length} 件`);
  console.log(`========================================\n`);

  if (!fs.existsSync(CONFIG.BOOKMARKS_JSON)) {
    console.error(`エラー: bookmarks.json が存在しません: ${CONFIG.BOOKMARKS_JSON}`);
    process.exit(1);
  }

  const bookmarksData = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  const bookmarksMap = new Map(bookmarksData.articles.map(a => [String(a.id), a]));
  const targetIdSet = new Set(targetIds);

  // 2. 事前状態スキャン
  console.log('[Phase 1] 削除対象のメタデータ調査と整合性確認...');
  const targetsInfo = [];

  for (const id of targetIds) {
    const localArticle = bookmarksMap.get(id);
    let rdItem = null;
    let rdStatus = 'Not found';

    try {
      const cmd = `curl -s -H "Authorization: Bearer ${RAINDROP_API_KEY}" "https://api.raindrop.io/rest/v1/raindrop/${id}"`;
      const res = JSON.parse(execSync(cmd, { encoding: 'utf8' }));
      // ゴミ箱(-99)内のアイテムへの DELETE は完全削除になるため、削除対象から除外する
      if (res.result && res.item && res.item.collection?.$id !== -99) {
        rdItem = res.item;
        rdStatus = 'Active';
      } else if (res.result && res.item) {
        rdStatus = 'In trash';
      }
    } catch (e) {
      rdStatus = 'Error/Not found';
    }

    targetsInfo.push({
      id,
      title: (rdItem && rdItem.title) || (localArticle && localArticle.title) || '(不明/削除済み)',
      url: (rdItem && rdItem.link) || (localArticle && localArticle.url) || '',
      inRaindrop: !!rdItem,
      inBookmarks: !!localArticle,
      markdownPath: localArticle ? localArticle.markdown_path : null
    });

    await sleep(150); // レート制限対策
  }

  const rdActiveCount = targetsInfo.filter(t => t.inRaindrop).length;
  const localActiveCount = targetsInfo.filter(t => t.inBookmarks).length;
  const alreadyDeletedCount = targetsInfo.filter(t => !t.inRaindrop && !t.inBookmarks).length;

  console.log(`\n【調査結果】`);
  console.log(`- Raindrop.io 現存（削除対象）: ${rdActiveCount} 件`);
  console.log(`- ローカル bookmarks.json 現存（削除対象）: ${localActiveCount} 件`);
  console.log(`- すでに削除済み/未登録: ${alreadyDeletedCount} 件\n`);

  if (isDryRun) {
    console.log('[DRY-RUN] シミュレーション完了。実際の変更は行われていません。');
    return;
  }

  // 3. 完全バックアップの取得
  console.log('[Phase 2] 安全バックアップの生成...');
  if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
    fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupBookmarksPath = path.join(CONFIG.BACKUP_DIR, `bookmarks_backup_${timestamp}.json`);
  const snapshotPath = path.join(CONFIG.BACKUP_DIR, `deletion_snapshot_${timestamp}.json`);

  // bookmarks.json のバックアップ
  fs.copyFileSync(CONFIG.BOOKMARKS_JSON, backupBookmarksPath);
  console.log(`[Backup] bookmarks.json バックアップ完了: ${path.basename(backupBookmarksPath)}`);

  // 削除対象スナップショット（万が一の復元用メタデータ）
  fs.writeFileSync(snapshotPath, JSON.stringify(targetsInfo, null, 2), 'utf8');
  console.log(`[Backup] 削除対象メタデータスナップショット保存: ${path.basename(snapshotPath)}`);

  // 4. Raindrop.io からの削除
  console.log('\n[Phase 3] Raindrop.io API による削除（ゴミ箱移動）...');
  let rdSuccessCount = 0;
  let rdSkippedCount = 0;

  for (const t of targetsInfo) {
    if (!t.inRaindrop) {
      console.log(`- ID: ${t.id} -> Raindrop上に存在しないためスキップ`);
      rdSkippedCount++;
      continue;
    }

    try {
      const deleteCmd = `curl -s -X DELETE -H "Authorization: Bearer ${RAINDROP_API_KEY}" "https://api.raindrop.io/rest/v1/raindrop/${t.id}"`;
      const deleteRes = JSON.parse(execSync(deleteCmd, { encoding: 'utf8' }));

      if (deleteRes.result) {
        console.log(`- ID: ${t.id} [削除成功] ${t.title}`);
        rdSuccessCount++;
      } else {
        console.warn(`- ID: ${t.id} [削除スキップ/エラー] ${deleteRes.errorMessage || '不明'}`);
      }
    } catch (err) {
      console.error(`- ID: ${t.id} [API通信エラー] ${err.message}`);
    }

    await sleep(250); // APIレート制限遵守
  }

  // 5. ローカル bookmarks.json & Markdown の削除
  console.log('\n[Phase 4] ローカルデータのクリーンアップ...');
  const remainingArticles = [];
  const deletedArticles = [];

  const resolvedNotebookDir = path.resolve(CONFIG.NOTEBOOK_DIR);

  for (const article of bookmarksData.articles) {
    if (targetIdSet.has(String(article.id))) {
      // Markdown ファイルの削除（パストラバーサル防御）
      if (article.markdown_path) {
        const resolvedMdPath = path.resolve(path.join(__dirname, '..', article.markdown_path));
        const sharedByOther = bookmarksData.articles.some(o =>
          !targetIdSet.has(String(o.id)) && o.markdown_path &&
          path.resolve(path.join(__dirname, '..', o.markdown_path)) === resolvedMdPath);
        if (sharedByOther) {
          console.warn(`[SKIP] 他の記事が同じ markdown を参照しているため削除しません: ${article.markdown_path}`);
        } else if (resolvedMdPath.startsWith(resolvedNotebookDir + path.sep) && resolvedMdPath.startsWith(resolvedNotebookDir) && fs.existsSync(resolvedMdPath)) {
          try {
            fs.unlinkSync(resolvedMdPath);
            console.log(`[Deleted MD] ${path.basename(resolvedMdPath)}`);
          } catch (e) {
            console.warn(`[MD削除失敗] ${resolvedMdPath}: ${e.message}`);
          }
        } else {
          console.warn(`[SKIP] パストラバーサル防止またはファイル不在: ${article.markdown_path}`);
        }
      }
      deletedArticles.push(article);
    } else {
      remainingArticles.push(article);
    }
  }

  bookmarksData.articles = remainingArticles;
  bookmarksData.updated_at = new Date().toISOString();
  fs.writeFileSync(CONFIG.BOOKMARKS_JSON, JSON.stringify(bookmarksData, null, 2), 'utf8');
  console.log(`[Bookmarks] bookmarks.json を更新しました（残存数: ${remainingArticles.length} 件）`);

  // 6. ダッシュボード & NotebookLM マスターの再生成
  console.log('\n[Phase 5] ダッシュボードおよびNotebookLMマスターの再生成...');
  try {
    execSync(`node "${CONFIG.GENERATE_SCRIPT}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`[ダッシュボード更新失敗] ${err.message}`);
  }

  console.log('\n========================================');
  console.log('🎉 安全削除処理がすべて完了しました！');
  console.log(`- Raindrop.io ゴミ箱移動: ${rdSuccessCount} 件`);
  console.log(`- ローカル削除: ${deletedArticles.length} 件`);
  console.log(`- バックアップ保存先: ${CONFIG.BACKUP_DIR}`);
  console.log('========================================');
  console.log('\n⚠️ 重要: この変更は未コミットです。git commit して push しないとリモートのダッシュボードには反映されません。');
  console.log('   （push しないと次回の GitHub Actions 同期で削除分が復活する恐れがあります）');
}

main().catch(err => {
  console.error(`致命的エラー: ${err.message}`);
  process.exit(1);
});
