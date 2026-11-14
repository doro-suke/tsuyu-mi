/**
 * 既存記事を「高密度な構造化Markdown」へ段階的に変換するバッチスクリプト
 *
 * 使い方:
 *   node scripts/convert_structured.js [件数=10] [--id <記事ID>] [--dry-run]
 *   node scripts/convert_structured.js all
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { normalizeTags } = require('./tag_taxonomy');
const {
  assembleStructuredMarkdown,
  buildSummaryFromStructured,
  extractMdBody,
  isStructuredMarkdown,
  normalizeDomain,
  inferSourceFromUrl,
} = require('./structured_md');
const {
  CONFIG,
  sleep,
  extractContent,
  getSummary,
  buildSummarizePrompt,
  sanitizeFileName,
} = require('./sync');

require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..');
const RAW_BACKUP_DIR = path.join(CONFIG.DATA_DIR, 'backups', 'notebooklm_sources_raw');

/**
 * 記事の現在スコアを取得する（新旧スキーマ両対応）
 * @param {object} article
 * @returns {number}
 */
function deriveScore(article) {
  if (article.score !== undefined && article.score !== null && !Number.isNaN(Number(article.score))) {
    return Number(article.score);
  }
  const map = { high: 75, medium: 45, low: 15 };
  return map[(article.priority || 'low').toLowerCase()] ?? 15;
}

/**
 * CLI引数をパースする
 * @param {string[]} argv
 */
function parseArgs(argv) {
  let limit = 10;
  let targetId = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--id' && argv[i + 1]) {
      targetId = String(argv[++i]).trim();
    } else if (arg.startsWith('--id=')) {
      targetId = arg.slice(5).trim();
    } else if (arg.toLowerCase() === 'all') {
      limit = Infinity;
    } else if (/^\d+$/.test(arg)) {
      limit = parseInt(arg, 10);
    }
  }

  return { limit, targetId, dryRun };
}

/**
 * 既存の未構造化 Markdown ファイルを安全に退避する（初回一括＋個別ガード）
 */
function ensureInitialBackup() {
  if (fs.existsSync(RAW_BACKUP_DIR)) return;
  if (!fs.existsSync(CONFIG.NOTEBOOK_DIR)) return;

  console.log(`[Backup] 初回実行のため既存 Markdown を退避します: ${RAW_BACKUP_DIR}`);
  fs.mkdirSync(RAW_BACKUP_DIR, { recursive: true });

  const files = fs.readdirSync(CONFIG.NOTEBOOK_DIR).filter((f) => f.endsWith('.md'));
  let copied = 0;
  for (const file of files) {
    const src = path.join(CONFIG.NOTEBOOK_DIR, file);
    const dest = path.join(RAW_BACKUP_DIR, file);
    fs.copyFileSync(src, dest);
    copied++;
  }
  console.log(`[Backup] ${copied} 件の原本 Markdown をバックアップしました。`);
}

/**
 * 上書き直前に該当ファイルの原本をバックアップへ退避する
 * @param {string} mdPath
 */
function backupSingleFileIfNeeded(mdPath) {
  if (!fs.existsSync(mdPath)) return;
  fs.mkdirSync(RAW_BACKUP_DIR, { recursive: true });

  const backupPath = path.join(RAW_BACKUP_DIR, path.basename(mdPath));
  if (!fs.existsSync(backupPath)) {
    const currentContent = fs.readFileSync(mdPath, 'utf8');
    if (!isStructuredMarkdown(currentContent)) {
      fs.copyFileSync(mdPath, backupPath);
    }
  }
}

/**
 * ローカル MD（バックアップまたは現行ファイル）から生本文を読み出す
 * @param {object} article
 * @param {string} mdPath
 * @returns {string}
 */
function readLocalRawBody(article, mdPath) {
  const candidates = [];
  if (mdPath) {
    candidates.push(path.join(RAW_BACKUP_DIR, path.basename(mdPath)));
    candidates.push(mdPath);
  }

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    // すでに構造化済みでないファイルを優先（バックアップがあればそちらが原文）
    if (!isStructuredMarkdown(raw)) {
      return extractMdBody(raw).trim();
    }
  }

  // 構造化済みファイルしか残っていない場合はそのまま抽出本文を返す
  if (mdPath && fs.existsSync(mdPath)) {
    return extractMdBody(fs.readFileSync(mdPath, 'utf8')).trim();
  }
  return '';
}

/**
 * メイン処理
 */
async function main() {
  const { limit, targetId, dryRun } = parseArgs(process.argv.slice(2));
  console.log('=== Vesper: 既存記事の高密度構造化Markdown変換バッチ ===');

  if (!fs.existsSync(CONFIG.BOOKMARKS_JSON)) {
    console.error(`エラー: bookmarks.json が見つかりません: ${CONFIG.BOOKMARKS_JSON}`);
    process.exit(1);
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!dryRun && !GEMINI_API_KEY) {
    console.error('【CRITICAL ERROR】GEMINI_API_KEY が環境変数に設定されていません。');
    process.exit(1);
  }

  const bookmarks = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  const articles = bookmarks.articles || [];

  // 変換対象リストの抽出
  let targets = [];
  if (targetId) {
    const found = articles.find((a) => String(a.id) === targetId);
    if (!found) {
      console.error(`エラー: ID "${targetId}" の記事が bookmarks.json に見つかりません。`);
      process.exit(1);
    }
    targets = [found];
  } else {
    targets = articles.filter((a) => {
      if (a.is_structured !== true) return true;
      const mdPath = a.markdown_path ? path.resolve(ROOT_DIR, a.markdown_path) : null;
      if (!mdPath || !fs.existsSync(mdPath)) return true;
      const raw = fs.readFileSync(mdPath, 'utf8');
      return !isStructuredMarkdown(raw);
    });

    // スコア上位（重要度の高い記事）から優先的に変換
    targets.sort((a, b) => {
      const diff = deriveScore(b) - deriveScore(a);
      if (diff !== 0) return diff;
      return new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0);
    });
  }

  const totalPending = targets.length;
  const batch = targets.slice(0, limit);

  console.log(`総記事数: ${articles.length} 件 | 未変換対象: ${totalPending} 件 | 今回処理予定: ${batch.length} 件`);
  if (batch.length === 0) {
    console.log('[Info] すべての記事がすでに構造化Markdownへ変換済みです。');
    return;
  }

  if (dryRun) {
    console.log('\n--- [DRY-RUN] 処理対象プレビュー ---');
    batch.forEach((a, idx) => {
      const relPath = a.markdown_path || `data/notebooklm_sources/${a.id}_${sanitizeFileName(a.title)}.md`;
      const mdPath = path.resolve(ROOT_DIR, relPath);
      const localBody = readLocalRawBody(a, mdPath);
      const sourceMode = localBody.length >= 100 ? `ローカル本文 (${localBody.length}字)` : 'Web再取得フォールバック';
      console.log(`${idx + 1}. [Score: ${deriveScore(a)}] ID:${a.id} | ${a.title}`);
      console.log(`   ソース: ${sourceMode} | URL: ${a.url}`);
    });
    console.log('--- [DRY-RUN] 完了（ファイル変更なし） ---');
    return;
  }

  // 初回バックアップを実行
  ensureInitialBackup();

  const promptTemplate = fs.readFileSync(CONFIG.PROMPT_FILE, 'utf8');
  let convertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const article = batch[i];
    const scoreBefore = deriveScore(article);
    console.log(`\n[Converting ${i + 1}/${batch.length}] (Score:${scoreBefore}) ID:${article.id} - ${article.title}`);

    const relativeMdPath =
      article.markdown_path || `data/notebooklm_sources/${article.id}_${sanitizeFileName(article.title)}.md`;
    const mdPath = path.resolve(ROOT_DIR, relativeMdPath);

    try {
      // 1. ローカル本文の読み出し（不足時のみWeb再取得）
      let contentText = readLocalRawBody(article, mdPath);
      if (contentText.length < 100 && article.url) {
        console.log(`  [Fallback] ローカル本文が短いため (${contentText.length}字) URLから再取得します...`);
        const extracted = await extractContent(article.url);
        if (extracted && extracted.textContent && extracted.textContent.trim().length > contentText.length) {
          contentText = extracted.textContent.trim();
        }
      }
      if (!contentText) {
        contentText = article.excerpt || article.summary || article.title || '内容なし';
      }

      // 2. Gemini API で構造化解析を実行（1記事1回）
      const fallbackDate = (article.analyzed_at || new Date().toISOString()).slice(0, 7);
      const prompt = buildSummarizePrompt(promptTemplate, {
        title: article.title,
        url: article.url,
        date: fallbackDate,
        contentText,
      });

      const analysis = await getSummary(GEMINI_API_KEY, prompt);
      const rawScore = Number(analysis.score);
      const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : scoreBefore;
      const tagsSuggested = Array.isArray(analysis.tags_suggested) ? analysis.tags_suggested : [];
      const specificTags = Array.isArray(analysis.tags) ? analysis.tags : [];

      // 3. 上書き前の原本退避＆構造化 Markdown 書き出し
      backupSingleFileIfNeeded(mdPath);
      const mdContent = assembleStructuredMarkdown(
        { title: article.title, url: article.url, fallbackDate },
        { ...analysis, score }
      );
      fs.mkdirSync(path.dirname(mdPath), { recursive: true });
      fs.writeFileSync(mdPath, mdContent, 'utf8');

      // 4. bookmarks.json を即時更新（既存の status 等は維持）
      const structuredSummary = buildSummaryFromStructured(analysis);
      Object.assign(article, {
        summary: structuredSummary || article.summary || '',
        score: score,
        domain: normalizeDomain(analysis.domain),
        source: inferSourceFromUrl(article.url, analysis.source),
        core_rule: String(analysis.core_rule || '').trim(),
        anti_pattern: String(analysis.anti_pattern || '').trim(),
        specific_tags: specificTags,
        tags: normalizeTags([...(article.tags || []), ...tagsSuggested, ...specificTags], 4),
        status: article.status || 'unread',
        is_structured: true,
        structured_at: new Date().toISOString(),
        analyzed_at: article.analyzed_at || new Date().toISOString(),
        markdown_path: relativeMdPath,
      });

      bookmarks.updated_at = new Date().toISOString();
      fs.writeFileSync(CONFIG.BOOKMARKS_JSON, JSON.stringify(bookmarks, null, 2), 'utf8');

      convertedCount++;
      console.log(`  成功: Score ${scoreBefore} -> ${score} | Domain: ${article.domain} | Core: ${article.core_rule.slice(0, 60)}...`);
    } catch (err) {
      errorCount++;
      console.error(`  失敗: ${err.message}`);
      if (err.message.includes('429') || err.message.includes('limit')) {
        console.log('  [警告] API制限を検知。60秒待機して次へ進みます...');
        await sleep(60000);
      }
      continue;
    } finally {
      if (i < batch.length - 1) {
        await sleep(CONFIG.SLEEP_MS);
      }
    }
  }

  const remaining = Math.max(0, totalPending - convertedCount);
  console.log(`\n=== 変換バッチ統計 ===`);
  console.log(`成功: ${convertedCount} 件 | 失敗: ${errorCount} 件 | 残り未変換: ${remaining} 件`);

  if (convertedCount > 0) {
    console.log('\n[Dashboard] ダッシュボードと NotebookLM まとめを更新中...');
    try {
      const execScript = path.join(__dirname, 'generate_dashboard.js');
      if (fs.existsSync(execScript)) {
        execSync(`node "${execScript}"`, { stdio: 'inherit' });
      }
    } catch (err) {
      console.error(`ダッシュボード更新失敗: ${err.message}`);
    }
  }

  console.log('=== 変換バッチ完了 ===');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[致命的なエラー] ${err.message}`);
    process.exit(1);
  });
}
