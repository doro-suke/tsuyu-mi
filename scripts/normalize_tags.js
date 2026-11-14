/**
 * 既存 bookmarks.json のタグを標準タクソノミー（19個）へ一括正規化するスクリプト
 * 実行前に data/backups/ へバックアップを保存し、実行後にダッシュボードを再生成する。
 *
 * 使用法:
 *   node scripts/normalize_tags.js --dry-run   # 変更せず分布のみ確認
 *   node scripts/normalize_tags.js             # 本番適用＆ダッシュボード再生成
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { normalizeTags } = require('./tag_taxonomy');

const ROOT_DIR = path.resolve(__dirname, '..');
const BOOKMARKS_JSON = path.join(ROOT_DIR, 'data', 'bookmarks.json');
const BACKUP_DIR = path.join(ROOT_DIR, 'data', 'backups');
const GENERATE_SCRIPT = path.join(__dirname, 'generate_dashboard.js');

function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(BOOKMARKS_JSON)) {
    console.error(`エラー: bookmarks.json が見つかりません: ${BOOKMARKS_JSON}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(BOOKMARKS_JSON, 'utf8'));
  const beforeSet = new Set();
  const afterCounts = new Map();
  const unmappedSamples = [];
  let changedArticles = 0;

  const updatedArticles = data.articles.map((article) => {
    const oldTags = Array.isArray(article.tags) ? article.tags : [];
    oldTags.forEach((t) => beforeSet.add(String(t).trim().replace(/^#/, '')));

    const newTags = normalizeTags(oldTags, 4);
    if (newTags.length === 0) {
      newTags.push('その他');
    }

    if (newTags.includes('その他')) {
      unmappedSamples.push({ id: article.id, title: article.title, oldTags });
    }

    if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
      changedArticles++;
    }

    for (const nt of newTags) {
      afterCounts.set(nt, (afterCounts.get(nt) || 0) + 1);
    }

    return {
      ...article,
      tags: newTags,
    };
  });

  console.log('========================================');
  console.log(`🏷️ Vesper タグ一括正規化 (${isDryRun ? 'DRY-RUN' : 'EXECUTE'})`);
  console.log(`対象記事数: ${data.articles.length} 件`);
  console.log(`正規化前のユニークタグ数: ${beforeSet.size} 個`);
  console.log(`正規化後のユニークタグ数: ${afterCounts.size} 個`);
  console.log(`タグが変更される記事数: ${changedArticles} 件`);
  console.log('========================================\n');

  console.log('【正規化後のタグ分布】');
  [...afterCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count], idx) => {
      console.log(`  ${String(idx + 1).padStart(2, ' ')}. #${tag} (${count})`);
    });

  if (unmappedSamples.length > 0) {
    console.log(`\n【「その他」になった記事 (${unmappedSamples.length} 件)】`);
    unmappedSamples.slice(0, 10).forEach((s) => {
      console.log(`  - ${s.id}: ${s.title} | old: [${s.oldTags.join(', ')}]`);
    });
  }

  if (isDryRun) {
    console.log('\n[DRY-RUN] シミュレーション完了。ファイルは変更されていません。');
    return;
  }

  // バックアップ保存
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `bookmarks_before_tag_norm_${timestamp}.json`);
  fs.copyFileSync(BOOKMARKS_JSON, backupPath);
  console.log(`\n[Backup] バックアップ保存完了: ${path.basename(backupPath)}`);

  // bookmarks.json 更新
  data.articles = updatedArticles;
  data.updated_at = new Date().toISOString();
  fs.writeFileSync(BOOKMARKS_JSON, JSON.stringify(data, null, 2), 'utf8');
  console.log(`[Save] bookmarks.json を更新しました。`);

  // ダッシュボード再生成
  console.log('[Dashboard] index.html を再生成中...');
  execSync(`node "${GENERATE_SCRIPT}"`, { stdio: 'inherit' });
  console.log('=== タグ正規化完了 ===');
}

main();
