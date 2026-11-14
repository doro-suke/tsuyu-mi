/**
 * Vesper ナレッジベース横断検索・参照 CLI
 * 外部依存ゼロ（Node.js 標準モジュールのみ）で動作し、
 * 他プロジェクトで作業中の AI エージェントから段階的開示（search -> view -> read）で参照できる。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { normalizeTags } = require('./tag_taxonomy');

if (process.stdout.setDefaultEncoding) {
  process.stdout.setDefaultEncoding('utf8');
}
if (process.stderr.setDefaultEncoding) {
  process.stderr.setDefaultEncoding('utf8');
}

const ROOT_DIR = path.resolve(__dirname, '..');
const BOOKMARKS_JSON = path.join(ROOT_DIR, 'data', 'bookmarks.json');
const FEEDBACK_JSON = path.join(ROOT_DIR, 'data', 'kb_feedback.json');
const NOTEBOOK_DIR = path.resolve(ROOT_DIR, 'data', 'notebooklm_sources');
const SUMMARY_MD = path.join(ROOT_DIR, 'docs', 'notebooklm_sources_summary.md');
const SCRIPT_FWD_PATH = __filename.replace(/\\/g, '/');

const DEFAULT_LIMIT = 7;
const MAX_LIMIT = 20;
const DEFAULT_MAX_CHARS = 4000;
const HARD_MAX_CHARS = 12000;

/**
 * CLI引数をパースする（--key value と --key=value の両形式に対応）
 */
function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val;
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, flags };
}

/**
 * 数値を安全にパースして範囲内にクランプする
 */
function parseBoundedInt(val, fallback, min, max) {
  if (val === undefined || val === true) return fallback;
  const num = parseInt(String(val), 10);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * 記事のスコアを算出する（新旧スキーマ両対応）
 */
function deriveScore(article) {
  if (article.score !== undefined && article.score !== null && !Number.isNaN(Number(article.score))) {
    return Number(article.score);
  }
  const map = { high: 75, medium: 45, low: 15 };
  return map[(article.priority || 'low').toLowerCase()] ?? 15;
}

/**
 * パレート分布（上位15%=high, 50%=medium, 残り=low）でティアを割り当てる
 */
function buildTierMap(articles) {
  const sorted = [...articles].sort((a, b) => deriveScore(b) - deriveScore(a));
  const n = sorted.length;
  const highCut = Math.ceil(n * 0.15);
  const medCut = Math.ceil(n * 0.50);
  const tierMap = new Map();

  sorted.forEach((article, idx) => {
    const tier = idx < highCut ? 'high' : idx < medCut ? 'medium' : 'low';
    tierMap.set(String(article.id), tier);
  });

  return tierMap;
}

/**
 * bookmarks.json を安全に読み込む
 */
function loadBookmarks() {
  if (!fs.existsSync(BOOKMARKS_JSON)) {
    throw new Error(`bookmarks.json が見つかりません: ${BOOKMARKS_JSON}`);
  }
  const raw = fs.readFileSync(BOOKMARKS_JSON, 'utf8');
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.articles)) {
    throw new Error('bookmarks.json の形式が不正です（articles 配列が存在しません）。');
  }
  return data;
}

/**
 * kb_feedback.json を安全に読み込む（存在しない場合は空構造を返す）
 */
function loadFeedback() {
  if (!fs.existsSync(FEEDBACK_JSON)) {
    return { updated_at: null, articles: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(FEEDBACK_JSON, 'utf8'));
    return parsed && typeof parsed.articles === 'object' ? parsed : { updated_at: null, articles: {} };
  } catch {
    return { updated_at: null, articles: {} };
  }
}

/**
 * トークン一致判定関数を生成する（1〜2文字の英数字は単語境界マッチでノイズを防止）
 */
function createTokenMatcher(token) {
  if (/^[a-z0-9]{1,2}$/i.test(token)) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
    return (text) => re.test(text);
  }
  return (text) => text.includes(token);
}

/**
 * パストラバーサルを防止しつつ、notebooklm_sources 配下の実ファイルパスを解決する
 */
function resolveSafeMdPath(article) {
  if (!article || !article.markdown_path) return null;
  const resolved = path.resolve(ROOT_DIR, article.markdown_path);
  const rel = path.relative(NOTEBOOK_DIR, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  if (!fs.existsSync(resolved)) {
    return null;
  }
  return resolved;
}

/**
 * Markdownファイルから「## 本文」以降を抽出する
 */
function extractMdBody(rawMd) {
  const marker = /^##\s+本文\s*$/m;
  const match = rawMd.match(marker);
  if (match && match.index !== undefined) {
    return rawMd.slice(match.index + match[0].length).replace(/^\r?\n+/, '');
  }
  const hrIdx = rawMd.indexOf('\n---\n');
  if (hrIdx !== -1) {
    return rawMd.slice(hrIdx + 5).replace(/^\r?\n+/, '');
  }
  return rawMd;
}

/**
 * 本文内の Markdown 見出し（H1〜H4）を一覧抽出する
 */
function extractHeadings(text) {
  const headings = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,4})\s+(.+?)\s*$/);
    if (m) {
      headings.push({
        level: m[1].length,
        title: m[2],
        lineIndex: i,
      });
    }
  }
  return headings;
}

/**
 * テキストを1行のコンパクトな文字列に整形する
 */
function compactWhitespace(str) {
  return String(str || '').replace(/\s+/g, ' ').trim();
}

/**
 * キーワード周辺の抜粋（KWIC: Keyword in Context）を生成する
 */
function buildKwicSnippet(text, tokens, maxLen = 140) {
  const clean = compactWhitespace(text);
  if (!clean) return '';

  const lower = clean.toLowerCase();
  let firstIdx = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
    }
  }

  if (firstIdx === -1) {
    return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
  }

  const half = Math.floor(maxLen / 2);
  const start = Math.max(0, firstIdx - Math.floor(half * 0.7));
  const end = Math.min(clean.length, start + maxLen);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';
  return `${prefix}${clean.slice(start, end)}${suffix}`;
}

/**
 * Markdown テキストから見出しレベル配下のセクションを抽出する
 */
function extractHeadingSection(text, keyword) {
  const lines = text.split(/\r?\n/);
  const lowerKw = keyword.toLowerCase();
  const headings = extractHeadings(text);
  const target = headings.find((h) => h.title.toLowerCase().includes(lowerKw));

  if (!target) return null;

  let endLine = lines.length;
  for (const h of headings) {
    if (h.lineIndex > target.lineIndex && h.level <= target.level) {
      endLine = h.lineIndex;
      break;
    }
  }

  return {
    heading: target.title,
    content: lines.slice(target.lineIndex, endLine).join('\n').trim(),
  };
}

/**
 * 記事一覧からクエリとフィルタに一致する記事を検索・スコアリングする
 */
function handleSearch(positionals, flags) {
  const data = loadBookmarks();
  const tierMap = buildTierMap(data.articles);

  const queryText = positionals.join(' ').trim();
  const tokens = queryText
    .split(/[\s\u3000]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const limit = parseBoundedInt(flags.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const filterTag = typeof flags.tag === 'string' ? flags.tag.trim().replace(/^#/, '').toLowerCase() : null;
  const filterTier = typeof flags.tier === 'string' ? flags.tier.trim().toLowerCase() : null;
  const filterUnread = Boolean(flags.unread);
  const sortMode = typeof flags.sort === 'string' ? flags.sort.trim().toLowerCase() : 'relevance';
  const feedback = loadFeedback();

  // 1次フィルタ（メタデータ上の条件）
  const filtered = data.articles.filter((article) => {
    const tier = tierMap.get(String(article.id)) || 'low';
    if (filterTier && tier !== filterTier) return false;
    if (filterUnread && article.status !== 'unread') return false;
    if (filterTag) {
      const rawTags = (article.tags || []).map((t) => String(t).replace(/^#/, '').toLowerCase());
      const normTags = normalizeTags(article.tags).map((t) => t.toLowerCase());
      const allTags = [...new Set([...rawTags, ...normTags])];
      if (!allTags.some((t) => t.includes(filterTag))) return false;
    }
    return true;
  });

  // クエリ空の場合はフィルタ結果をスコア順で返す
  if (tokens.length === 0) {
    const ranked = filtered
      .map((article) => ({
        article,
        tier: tierMap.get(String(article.id)) || 'low',
        baseScore: deriveScore(article),
        searchScore: deriveScore(article),
        snippetSource: null,
        bodyCache: null,
      }))
      .sort((a, b) => b.baseScore - a.baseScore);

    printSearchResults(ranked.slice(0, limit), ranked.length, queryText, tokens, false, flags);
    return;
  }

  // クエリあり：bookmarks.json + MD本文のハイブリッド検索
  const tokenMatchers = tokens.map((t) => ({ token: t, match: createTokenMatcher(t) }));
  const scoredAll = [];
  for (const article of filtered) {
    const titleLower = (article.title || '').toLowerCase();
    const normTags = normalizeTags(article.tags);
    const tagsLower = normTags.join(' ').toLowerCase();
    const rawTagsLower = (article.tags || []).join(' ').toLowerCase();
    const summaryExcerptLower = `${article.summary || ''} ${article.excerpt || ''}`.toLowerCase();
    const reasonLower = (article.read_now_reason || '').toLowerCase();

    let bodyText = '';
    const mdPath = resolveSafeMdPath(article);
    if (mdPath) {
      try {
        bodyText = extractMdBody(fs.readFileSync(mdPath, 'utf8'));
      } catch {
        bodyText = '';
      }
    }
    const bodyLower = bodyText.toLowerCase();

    let matchedTokenCount = 0;
    let score = 0;
    let hitInBodyOnly = false;

    for (const { match } of tokenMatchers) {
      const inTitle = match(titleLower);
      const inTags = match(tagsLower) || match(rawTagsLower);
      const inSummaryExcerpt = match(summaryExcerptLower);
      const inReason = match(reasonLower);
      const inBody = match(bodyLower);

      if (inTitle || inTags || inSummaryExcerpt || inReason || inBody) {
        matchedTokenCount++;
        if (inTitle) score += 15;
        if (inTags) score += 12;
        if (inSummaryExcerpt) score += 6;
        if (inReason) score += 4;
        if (inBody) score += 3;
        if (inBody && !inTitle && !inTags && !inSummaryExcerpt && !inReason) {
          hitInBodyOnly = true;
        }
      }
    }

    if (matchedTokenCount > 0) {
      const baseScore = deriveScore(article);
      // 品質スコアの寄与（最大 +12.5 点）
      score += baseScore / 8;

      // フィードバック調整（クエリ一致による文脈別減点 ＋ マイルドな全体補正）
      const fb = feedback.articles[String(article.id)];
      if (fb) {
        // 1. 全体補正（マイルド: useful=+3, miss=-4）
        const generalUseful = fb.useful || 0;
        const generalMiss = fb.miss || 0;
        score += generalUseful * 3 - generalMiss * 4;

        // 2. クエリ文脈付きフィードバック（特定の検索語で miss と判定された場合のピンポイント減点）
        if (Array.isArray(fb.query_feedback)) {
          for (const qf of fb.query_feedback) {
            const qTokens = (qf.query || '').toLowerCase().split(/[\s\u3000]+/).filter(Boolean);
            const isQueryMatch = qTokens.length > 0 && qTokens.some((qt) => tokens.includes(qt));
            if (isQueryMatch) {
              if (qf.type === 'miss') score -= 15;
              if (qf.type === 'useful') score += 5;
            }
          }
        }
      }

      scoredAll.push({
        article,
        tier: tierMap.get(String(article.id)) || 'low',
        baseScore,
        searchScore: score,
        matchedTokenCount,
        hitInBodyOnly,
        bodyText,
      });
    }
  }

  // AND検索を優先し、0件ならORフォールバック
  const andMatches = scoredAll.filter((item) => item.matchedTokenCount === tokens.length);
  const isOrFallback = andMatches.length === 0 && scoredAll.length > 0;
  const results = (isOrFallback ? scoredAll : andMatches).sort((a, b) => {
    if (isOrFallback && b.matchedTokenCount !== a.matchedTokenCount) {
      return b.matchedTokenCount - a.matchedTokenCount;
    }
    if (sortMode === 'score') {
      if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
      return b.searchScore - a.searchScore;
    }
    return b.searchScore - a.searchScore;
  });

  printSearchResults(results.slice(0, limit), results.length, queryText, tokens, isOrFallback, flags);
}

/**
 * 検索結果をコンパクトなテキスト形式で出力する
 */
function printSearchResults(items, totalMatched, queryText, tokens, isOrFallback, flags) {
  const filterDesc = [];
  if (queryText) filterDesc.push(`Query: "${queryText}"`);
  if (flags.tag) filterDesc.push(`Tag: #${flags.tag}`);
  if (flags.tier) filterDesc.push(`Tier: ${flags.tier}`);
  if (flags.unread) filterDesc.push('Unread only');

  console.log(`[Vesper KB] ${totalMatched}件ヒット (表示: ${items.length}件 | ${filterDesc.join(' | ') || 'All'})`);
  if (isOrFallback) {
    console.log('[Fallback] 全キーワード一致(AND)が0件のため、部分一致(OR)上位を表示しています。');
  }
  if (items.length > 0 && items.every((i) => i.tier === 'low')) {
    console.log('[Notice] 上位ヒットがすべて LOW ティアです。この領域の良質な記事が KB 内に不足している可能性があります。');
  }
  console.log('--------------------------------------------------------------------------------');

  if (items.length === 0) {
    console.log('該当する記事が見つかりませんでした。キーワードを変えるか `overview` で全体像を確認してください。');
    return;
  }

  for (const item of items) {
    const a = item.article;
    const normTags = normalizeTags(a.tags);
    const tagStr = normTags.map((t) => `#${t}`).join(', ') || '(なし)';

    let snippet = '';
    if (a.summary && a.summary.trim()) {
      const sumOneLine = compactWhitespace(a.summary);
      if (item.hitInBodyOnly && item.bodyText) {
        snippet = `[本文一致] ${buildKwicSnippet(item.bodyText, tokens, 140)}`;
      } else {
        snippet = sumOneLine.length > 140 ? sumOneLine.slice(0, 140) + '...' : sumOneLine;
      }
    } else {
      let bodyText = item.bodyText;
      if (bodyText === undefined || bodyText === null) {
        const mdPath = resolveSafeMdPath(a);
        if (mdPath) {
          try {
            bodyText = extractMdBody(fs.readFileSync(mdPath, 'utf8'));
          } catch {
            bodyText = '';
          }
        }
      }
      if (bodyText) {
        snippet = tokens.length > 0
          ? `[本文抜粋] ${buildKwicSnippet(bodyText, tokens, 140)}`
          : `[本文冒頭] ${buildKwicSnippet(bodyText, [], 140)}`;
      } else {
        snippet = compactWhitespace(a.excerpt || '(要約なし)').slice(0, 140);
      }
    }

    console.log(`ID: ${a.id} | Score: ${item.baseScore} (${item.tier.toUpperCase()}) | Relevance: ${item.searchScore.toFixed(1)} | Status: ${a.status}`);
    console.log(`Title: ${a.title}`);
    console.log(`Tags: ${tagStr}`);
    console.log(`Snippet: ${snippet}`);
    console.log(`View: node "${SCRIPT_FWD_PATH}" view ${a.id}`);
    console.log(`Read: node "${SCRIPT_FWD_PATH}" read ${a.id}`);
    console.log('--------------------------------------------------------------------------------');
  }
}

/**
 * 記事の詳細メタデータ・要約・見出し一覧を表示する
 */
function handleView(positionals) {
  const id = positionals[0];
  if (!id) {
    console.error('エラー: 記事IDを指定してください。例: view 1879701898');
    process.exit(1);
  }

  const data = loadBookmarks();
  const tierMap = buildTierMap(data.articles);
  const article = data.articles.find((a) => String(a.id) === String(id));

  if (!article) {
    console.error(`エラー: ID "${id}" の記事が bookmarks.json に見つかりません。`);
    process.exit(1);
  }

  const tier = tierMap.get(String(article.id)) || 'low';
  const baseScore = deriveScore(article);
  const normTags = normalizeTags(article.tags);

  const mdPath = resolveSafeMdPath(article);
  let bodyText = '';
  let headings = [];
  if (mdPath) {
    bodyText = extractMdBody(fs.readFileSync(mdPath, 'utf8'));
    headings = extractHeadings(bodyText);
  }

  console.log(`[Vesper KB Article View]`);
  console.log(`ID: ${article.id}`);
  console.log(`Title: ${article.title}`);
  console.log(`URL: ${article.url}`);
  console.log(`Score: ${baseScore} (Tier: ${tier.toUpperCase()}) | Status: ${article.status} | Analyzed: ${article.analyzed_at || '-'}`);
  console.log(`Tags: ${normTags.map((t) => `#${t}`).join(', ') || '(なし)'}`);
  console.log(`MD Path: ${article.markdown_path || '(なし)'}`);
  console.log(`Body Length: ${bodyText.length} chars`);
  console.log('');

  if (article.summary && article.summary.trim()) {
    console.log('## AI Summary');
    console.log(article.summary.trim());
  } else {
    console.log('## Body Preview (bookmarks.json の summary が空のため本文冒頭を自動抽出)');
    const preview = compactWhitespace(bodyText || article.excerpt || '(本文なし)');
    console.log(preview.length > 400 ? preview.slice(0, 400) + '...' : preview);
  }

  if (article.read_now_reason && article.read_now_reason.trim()) {
    console.log('');
    console.log('## Read Now Reason');
    console.log(article.read_now_reason.trim());
  }

  if (headings.length > 0) {
    console.log('');
    console.log(`## Markdown Headings (${headings.length}件)`);
    headings.slice(0, 15).forEach((h) => {
      console.log(`${'  '.repeat(h.level - 1)}- ${'#'.repeat(h.level)} ${h.title}`);
    });
    if (headings.length > 15) {
      console.log(`... 他 ${headings.length - 15} 件`);
    }
  }

  console.log('');
  console.log(`Next Step: node "${SCRIPT_FWD_PATH}" read ${article.id}`);
}

/**
 * 記事の Markdown 本文（または指定セクション）を文字数制限付きで読み込む
 */
function handleRead(positionals, flags) {
  const id = positionals[0];
  if (!id) {
    console.error('エラー: 記事IDを指定してください。例: read 1879701898');
    process.exit(1);
  }

  const data = loadBookmarks();
  const article = data.articles.find((a) => String(a.id) === String(id));
  if (!article) {
    console.error(`エラー: ID "${id}" の記事が bookmarks.json に見つかりません。`);
    process.exit(1);
  }

  const mdPath = resolveSafeMdPath(article);
  if (!mdPath) {
    console.error(`エラー: 記事ID "${id}" の安全な Markdown ファイルが見つかりません (${article.markdown_path})。`);
    process.exit(1);
  }

  const rawMd = fs.readFileSync(mdPath, 'utf8');
  const body = extractMdBody(rawMd);
  const sectionKw = typeof flags.section === 'string' ? flags.section.trim() : '';
  const maxChars = parseBoundedInt(flags['max-chars'], DEFAULT_MAX_CHARS, 200, HARD_MAX_CHARS);
  const offset = parseBoundedInt(flags.offset, 0, 0, Math.max(0, body.length));

  let targetText = body;
  let noteLine = '';

  if (sectionKw) {
    const sec = extractHeadingSection(body, sectionKw);
    if (sec) {
      targetText = sec.content;
      noteLine = `[Section Matched: "${sec.heading}"]`;
    } else {
      // 見出しがない（約72%の記事）または一致しない場合は本文内キーワード位置へフォールバック
      const idx = body.toLowerCase().indexOf(sectionKw.toLowerCase());
      if (idx !== -1) {
        const contextStart = Math.max(0, idx - 300);
        // 直近の改行に合わせると読みやすい
        const newlineBefore = body.lastIndexOf('\n', contextStart);
        const alignedStart = newlineBefore !== -1 && idx - newlineBefore < 500 ? newlineBefore + 1 : contextStart;
        targetText = body.slice(alignedStart);
        noteLine = `[Note: Heading "${sectionKw}" not found; showing body context around keyword match]`;
      } else {
        const headings = extractHeadings(body);
        console.log(`[Vesper KB Read] ID: ${article.id} | Title: ${article.title}`);
        console.log(`キーワード/見出し "${sectionKw}" は本文中に見つかりませんでした。`);
        if (headings.length > 0) {
          console.log('利用可能な見出し: ' + headings.slice(0, 10).map((h) => h.title).join(' / '));
        }
        return;
      }
    }
  }

  const total = targetText.length;
  const start = Math.min(offset, total);
  const end = Math.min(total, start + maxChars);
  const slice = targetText.slice(start, end);

  console.log(`[Vesper KB Read] ID: ${article.id} | Title: ${article.title}`);
  console.log(`Source URL: ${article.url}`);
  if (noteLine) console.log(noteLine);
  console.log(`Showing: ${start}..${end} of ${total} chars`);
  console.log('================================================================================');
  console.log(slice);
  console.log('================================================================================');

  if (end < total) {
    const secArg = sectionKw ? ` --section "${sectionKw}"` : '';
    console.log(`[Truncated: showing ${start}..${end} of ${total} chars. Next: node "${SCRIPT_FWD_PATH}" read ${article.id}${secArg} --offset ${end}]`);
  }
}

/**
 * docs/notebooklm_sources_summary.md（全体体系レポート）の概要またはセクションを表示する
 */
function handleOverview(flags) {
  if (!fs.existsSync(SUMMARY_MD)) {
    console.error(`エラー: 全体レポートが見つかりません: ${SUMMARY_MD}`);
    process.exit(1);
  }
  const content = fs.readFileSync(SUMMARY_MD, 'utf8');
  const sectionKw = typeof flags.section === 'string' ? flags.section.trim() : '';

  if (sectionKw) {
    const sec = extractHeadingSection(content, sectionKw);
    if (!sec) {
      const headings = extractHeadings(content);
      console.log(`セクション "${sectionKw}" が見つかりませんでした。利用可能な見出し一覧:`);
      headings.forEach((h) => console.log(`${'  '.repeat(h.level - 1)}- ${h.title}`));
      return;
    }
    console.log(`[Vesper KB Overview - Section: ${sec.heading}]`);
    console.log('================================================================================');
    console.log(sec.content);
    return;
  }

  const headings = extractHeadings(content);
  console.log('[Vesper KB Overview] docs/notebooklm_sources_summary.md 構造案内');
  console.log('※ 全体の見出し一覧です。興味のある領域を `--section` で抽出できます。');
  console.log('--------------------------------------------------------------------------------');
  headings.forEach((h) => {
    if (h.level <= 3) {
      console.log(`${'  '.repeat(h.level - 1)}- ${h.title}`);
    }
  });
  console.log('--------------------------------------------------------------------------------');
  console.log('【収録範囲の方針】');
  console.log('  - 薄いが対象: note 運営・記事設計 / YouTube Shorts 運用 / 個人開発 LP 改善');
  console.log('  - 収集対象外: X(Twitter)単体のアルゴリズム攻略・投稿運用 / 一般的な SNS 分析単体');
  console.log('  ※ 収集対象外の領域は検索を早期打ち切りし、一次情報や別調査を優先してください。');
  console.log('--------------------------------------------------------------------------------');
  console.log(`例: node "${SCRIPT_FWD_PATH}" overview --section "Claude Code"`);
}

/**
 * ナレッジベース全体の統計と頻出タグを表示する
 */
function handleStats() {
  const data = loadBookmarks();
  const tierMap = buildTierMap(data.articles);

  const tierCounts = { high: 0, medium: 0, low: 0 };
  const statusCounts = {};
  const tagCounts = new Map();
  let withSummary = 0;

  for (const a of data.articles) {
    const tier = tierMap.get(String(a.id)) || 'low';
    tierCounts[tier]++;
    const st = a.status || 'unknown';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (a.summary && a.summary.trim()) withSummary++;
    for (const tag of normalizeTags(a.tags)) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('[Vesper KB Stats]');
  console.log(`Updated At: ${data.updated_at || '-'}`);
  console.log(`Total Articles (SSoT): ${data.articles.length}`);
  console.log(`With AI Summary: ${withSummary} | Body-Only (New Light Schema): ${data.articles.length - withSummary}`);
  console.log(`Tiers: HIGH=${tierCounts.high}, MEDIUM=${tierCounts.medium}, LOW=${tierCounts.low}`);
  console.log(`Status: ${Object.entries(statusCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log('');
  console.log('Top 20 Tags:');
  topTags.forEach(([tag, count], idx) => {
    console.log(`  ${String(idx + 1).padStart(2, ' ')}. #${tag} (${count})`);
  });
}

/**
 * エージェントからの使用フィードバックを kb_feedback.json へ記録する（bookmarks.json の status は変更しない）
 */
function handleFeedback(positionals, flags) {
  const id = positionals[0];
  if (!id) {
    console.error('エラー: 記事IDを指定してください。例: feedback 1702135231 --useful');
    process.exit(1);
  }

  const isUseful = Boolean(flags.useful);
  const isMiss = Boolean(flags.miss);
  if (isUseful === isMiss) {
    console.error('エラー: --useful または --miss のどちらか一方を指定してください。');
    process.exit(1);
  }

  const data = loadBookmarks();
  const article = data.articles.find((a) => String(a.id) === String(id));
  if (!article) {
    console.error(`エラー: ID "${id}" の記事が bookmarks.json に見つかりません。`);
    process.exit(1);
  }

  const feedback = loadFeedback();
  const key = String(id);
  if (!feedback.articles[key]) {
    feedback.articles[key] = { useful: 0, miss: 0, query_feedback: [], notes: [] };
  }
  if (!Array.isArray(feedback.articles[key].query_feedback)) {
    feedback.articles[key].query_feedback = [];
  }

  const queryOpt = typeof flags.query === 'string' ? flags.query.trim() : '';

  if (queryOpt) {
    feedback.articles[key].query_feedback.push({
      type: isUseful ? 'useful' : 'miss',
      query: queryOpt,
      at: new Date().toISOString(),
    });
    if (feedback.articles[key].query_feedback.length > 20) {
      feedback.articles[key].query_feedback = feedback.articles[key].query_feedback.slice(-20);
    }
  } else {
    if (isUseful) feedback.articles[key].useful++;
    if (isMiss) feedback.articles[key].miss++;
  }

  const note = typeof flags.note === 'string' ? flags.note.trim() : '';
  if (note) {
    feedback.articles[key].notes.push({
      type: isUseful ? 'useful' : 'miss',
      query: queryOpt || null,
      note,
      at: new Date().toISOString(),
    });
    if (feedback.articles[key].notes.length > 10) {
      feedback.articles[key].notes = feedback.articles[key].notes.slice(-10);
    }
  }

  feedback.updated_at = new Date().toISOString();
  fs.writeFileSync(FEEDBACK_JSON, JSON.stringify(feedback, null, 2), 'utf8');

  console.log(`[Vesper KB Feedback] 記録しました: ID ${key} (${article.title})`);
  if (queryOpt) {
    console.log(`対象クエリ: "${queryOpt}" (このクエリ文脈でのみ優先的に加減点されます)`);
  } else {
    console.log(`全体累計: useful=${feedback.articles[key].useful}, miss=${feedback.articles[key].miss}`);
  }
}

function printUsage() {
  console.log(`Vesper KB Search CLI (Zero-Dependency)

Usage:
  node "${SCRIPT_FWD_PATH}" search [query...] [--tag <tag>] [--tier high|medium|low] [--unread] [--sort relevance|score] [--limit N]
  node "${SCRIPT_FWD_PATH}" view <id>
  node "${SCRIPT_FWD_PATH}" read <id> [--section <keyword>] [--offset N] [--max-chars N]
  node "${SCRIPT_FWD_PATH}" feedback <id> --useful | --miss [--query "..."] [--note "..."]
  node "${SCRIPT_FWD_PATH}" overview [--section <keyword>]
  node "${SCRIPT_FWD_PATH}" stats`);
}

function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  if (flags.help || positionals.length === 0) {
    printUsage();
    return;
  }

  const cmd = positionals[0].toLowerCase();
  const rest = positionals.slice(1);

  switch (cmd) {
    case 'search':
      handleSearch(rest, flags);
      break;
    case 'view':
      handleView(rest);
      break;
    case 'read':
      handleRead(rest, flags);
      break;
    case 'feedback':
      handleFeedback(rest, flags);
      break;
    case 'overview':
      handleOverview(flags);
      break;
    case 'stats':
      handleStats();
      break;
    default:
      console.error(`不明なコマンド: ${cmd}`);
      printUsage();
      process.exit(1);
  }
}

try {
  main();
} catch (err) {
  console.error(`[Vesper KB Error] ${err.message}`);
  process.exit(1);
}
