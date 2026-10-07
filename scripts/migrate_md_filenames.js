/**
 * 一回限りの移行: markdown ファイル名を `${id}_${title}.md` 形式に変更し、
 * bookmarks.json の markdown_path を更新する。
 * 使用法: node scripts/migrate_md_filenames.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BOOKMARKS_JSON = path.join(ROOT, 'data', 'bookmarks.json');
const NOTEBOOK_DIR = path.join(ROOT, 'data', 'notebooklm_sources');
const isDryRun = process.argv.includes('--dry-run');

function sanitizeFileName(title) {
  return (title || 'untitled').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\/:*?"<>|]/g, '_').trim().substring(0, 100);
}

const data = JSON.parse(fs.readFileSync(BOOKMARKS_JSON, 'utf8'));
const resolvedDir = path.resolve(NOTEBOOK_DIR);

// 旧パスごとの参照数
const refCount = new Map();
for (const a of data.articles) {
  if (a.markdown_path) {
    const p = path.resolve(ROOT, a.markdown_path);
    refCount.set(p, (refCount.get(p) || 0) + 1);
  }
}

const stats = { renamed: 0, copied: 0, missing: [], shared: [], skippedSame: 0, noPath: [], collisions: [] };
const plannedTargets = new Set();
const toRemoveAfter = new Set(); // 共有元で全員コピー後に削除する旧ファイル

for (const a of data.articles) {
  const newRel = `data/notebooklm_sources/${a.id}_${sanitizeFileName(a.title)}.md`;
  const newAbs = path.resolve(ROOT, newRel);
  if (plannedTargets.has(newAbs)) { stats.collisions.push(a.id); continue; }
  plannedTargets.add(newAbs);

  if (!a.markdown_path) { stats.noPath.push(a.id); continue; }
  const oldAbs = path.resolve(ROOT, a.markdown_path);
  if (!oldAbs.startsWith(resolvedDir + path.sep)) { stats.missing.push(`${a.id} (範囲外: ${a.markdown_path})`); continue; }
  if (oldAbs === newAbs) { stats.skippedSame++; continue; }
  if (!fs.existsSync(oldAbs)) {
    if (fs.existsSync(newAbs)) { a.markdown_path = newRel; stats.skippedSame++; continue; }
    stats.missing.push(`${a.id} ${a.markdown_path}`);
    continue;
  }
  const shared = refCount.get(oldAbs) > 1;
  if (shared) {
    stats.shared.push(`${a.id} <- ${path.basename(oldAbs)}`);
    toRemoveAfter.add(oldAbs);
  }
  console.log(`${shared ? 'COPY  ' : 'RENAME'} ${path.basename(oldAbs)} -> ${path.basename(newAbs)}`);
  if (!isDryRun) {
    if (shared) fs.copyFileSync(oldAbs, newAbs);
    else fs.renameSync(oldAbs, newAbs);
    a.markdown_path = newRel;
  }
  shared ? stats.copied++ : stats.renamed++;
}

if (!isDryRun) {
  // 共有元の旧ファイルは、どの記事からも参照されなくなったら削除
  const still = new Set(data.articles.filter(a => a.markdown_path).map(a => path.resolve(ROOT, a.markdown_path)));
  for (const f of toRemoveAfter) {
    if (!still.has(f) && fs.existsSync(f)) fs.unlinkSync(f);
  }
  fs.writeFileSync(BOOKMARKS_JSON, JSON.stringify(data, null, 2), 'utf8');
}

console.log(`\n[${isDryRun ? 'DRY-RUN' : 'EXECUTED'}] rename=${stats.renamed} copy(shared)=${stats.copied} already-new=${stats.skippedSame}`);
console.log(`missing=${stats.missing.length} noPath=${stats.noPath.length} collisions=${stats.collisions.length} sharedSources=${toRemoveAfter.size}`);
stats.missing.forEach(m => console.log('  MISSING', m));
stats.shared.forEach(m => console.log('  SHARED ', m));
stats.noPath.forEach(m => console.log('  NOPATH ', m));
stats.collisions.forEach(m => console.log('  COLLISION ', m));
