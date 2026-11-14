/**
 * 記事を 7 つの大カテゴリフォルダ（data/categories/）へ排他エクスポートし、
 * NotebookLM 一括投入用の分割パックファイル（_pack_XX.md）を生成するスクリプト。
 * 原本（data/notebooklm_sources/）は変更せず、常に bookmarks.json からクリーンに再生成する。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { CATEGORIES, resolvePrimaryCategory } = require('./tag_taxonomy');
const { extractMdBody } = require('./structured_md');

const ROOT_DIR = path.resolve(__dirname, '..');
const BOOKMARKS_JSON = path.join(ROOT_DIR, 'data', 'bookmarks.json');
const NOTEBOOK_DIR = path.resolve(ROOT_DIR, 'data', 'notebooklm_sources');
const CATEGORIES_DIR = path.resolve(ROOT_DIR, 'data', 'categories');

const MAX_ARTICLES_PER_PACK = 35;
const MAX_CHARS_PER_PACK = 250000;

function deriveScore(article) {
  if (article.score !== undefined && article.score !== null && !Number.isNaN(Number(article.score))) {
    return Number(article.score);
  }
  const map = { high: 75, medium: 45, low: 15 };
  return map[(article.priority || 'low').toLowerCase()] ?? 15;
}

/**
 * 原本 Markdown のパスを安全に解決する
 */
function resolveSafeSourcePath(article) {
  if (!article || !article.markdown_path) return null;
  const resolved = path.resolve(ROOT_DIR, article.markdown_path);
  const rel = path.relative(NOTEBOOK_DIR, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return fs.existsSync(resolved) ? resolved : null;
}

/**
 * 1記事分のパック用テキストを整形する
 */
function formatArticleForPack(article, indexInCat, rawMdContent) {
  const score = deriveScore(article);
  const tagsStr = (article.tags || []).map((t) => `#${t}`).join(', ');
  let body = '';
  if (rawMdContent) {
    body = extractMdBody(rawMdContent).trim();
  } else {
    body = article.excerpt || '(本文なし)';
  }

  let block = `## [${indexInCat}] ${article.title}\n`;
  block += `- **ID**: ${article.id}\n`;
  block += `- **Source URL**: ${article.url}\n`;
  block += `- **Score**: ${score} | **Status**: ${article.status}\n`;
  block += `- **Tags**: ${tagsStr}\n`;
  if (article.summary && article.summary.trim()) {
    block += `- **Summary**: ${article.summary.replace(/\s+/g, ' ').trim()}\n`;
  }
  block += `\n### 本文\n${body}\n\n---\n\n`;
  return block;
}

/**
 * カテゴリ別フォルダと NotebookLM パックを生成する
 * @param {object} bookmarksData
 */
function exportCategories(bookmarksData) {
  const articles = bookmarksData.articles || [];
  const grouped = new Map();
  for (const cat of CATEGORIES) {
    grouped.set(cat.dir, []);
  }

  for (const article of articles) {
    const catDir = resolvePrimaryCategory(article.tags);
    if (!grouped.has(catDir)) grouped.set(catDir, []);
    grouped.get(catDir).push(article);
  }

  // クリーンに再生成（削除済み記事の残留を防止）
  if (fs.existsSync(CATEGORIES_DIR)) {
    fs.rmSync(CATEGORIES_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(CATEGORIES_DIR, { recursive: true });

  console.log('[Categories] カテゴリ別フォルダと NotebookLM パックを生成中...');
  let totalExported = 0;

  for (const cat of CATEGORIES) {
    const list = (grouped.get(cat.dir) || []).sort((a, b) => deriveScore(b) - deriveScore(a));
    const catPath = path.join(CATEGORIES_DIR, cat.dir);
    const articlesDir = path.join(catPath, 'articles');
    fs.mkdirSync(articlesDir, { recursive: true });

    let packIdx = 1;
    let currentPackItems = [];
    let currentPackChars = 0;
    let packCount = 0;

    const flushPack = () => {
      if (currentPackItems.length === 0) return;
      const packName = `_pack_${String(packIdx).padStart(2, '0')}.md`;
      const header =
        `# Vesper Category Pack: ${cat.label} (Part ${packIdx})\n` +
        `> 更新日: ${new Date().toISOString().split('T')[0]} | 収録記事数: ${currentPackItems.length} 件\n\n---\n\n`;
      fs.writeFileSync(path.join(catPath, packName), header + currentPackItems.join(''), 'utf8');
      packCount++;
      packIdx++;
      currentPackItems = [];
      currentPackChars = 0;
    };

    list.forEach((article, idx) => {
      const srcPath = resolveSafeSourcePath(article);
      let rawContent = '';
      if (srcPath) {
        rawContent = fs.readFileSync(srcPath, 'utf8');
        fs.copyFileSync(srcPath, path.join(articlesDir, path.basename(srcPath)));
      }

      const block = formatArticleForPack(article, idx + 1, rawContent);
      if (
        currentPackItems.length >= MAX_ARTICLES_PER_PACK ||
        (currentPackItems.length > 0 && currentPackChars + block.length > MAX_CHARS_PER_PACK)
      ) {
        flushPack();
      }
      currentPackItems.push(block);
      currentPackChars += block.length;
      totalExported++;
    });
    flushPack();

    console.log(`  - ${cat.dir}: ${list.length} 件 (Pack: ${packCount} ファイル)`);
  }

  console.log(`[Categories] 完了: 計 ${totalExported} 件を ${CATEGORIES.length} カテゴリへエクスポートしました。`);
}

function main() {
  if (!fs.existsSync(BOOKMARKS_JSON)) {
    console.error(`エラー: bookmarks.json が見つかりません: ${BOOKMARKS_JSON}`);
    process.exit(1);
  }
  const bookmarks = JSON.parse(fs.readFileSync(BOOKMARKS_JSON, 'utf8'));
  exportCategories(bookmarks);
}

if (require.main === module) {
  main();
}

module.exports = { exportCategories };
