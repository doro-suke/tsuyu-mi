/**
 * Vesper 高密度構造化Markdown 共通アセンブラ & パーサー
 *
 * Gemini API が返却したJSONレスポンスを YAMLフロントマター＋4セクション構成の
 * 構造化Markdownへ安全に変換し、新旧両フォーマットの本文抽出を統一的に提供する。
 */

'use strict';

const ALLOWED_DOMAINS = [
  'youtube-script',
  'video-pipeline',
  'game-design',
  'godot-impl',
  'marketing',
  'other',
];

const EMPTY_SNIPPET_PATTERNS = new Set([
  '',
  'なし',
  '特になし',
  '特記事項なし',
  '該当なし',
  'none',
  'n/a',
  'na',
  'null',
]);

/**
 * URL と LLM 推定値から媒体名（source）を判定する
 * @param {string} url
 * @param {string} fallbackSource
 * @returns {string}
 */
function inferSourceFromUrl(url, fallbackSource = '') {
  const cleaned = String(fallbackSource || '').trim();
  const invalidValues = new Set(['', '不明', 'unknown', 'web', 'blog', 'その他', 'other']);
  if (cleaned && !invalidValues.has(cleaned.toLowerCase())) {
    return cleaned;
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'note.com' || hostname.endsWith('.note.com')) return 'note';
    if (hostname === 'zenn.dev' || hostname.endsWith('.zenn.dev')) return 'Zenn';
    if (hostname === 'qiita.com' || hostname.endsWith('.qiita.com')) return 'Qiita';
    if (hostname === 'github.com' || hostname.endsWith('.github.com')) return 'GitHub';
    if (hostname === 'youtube.com' || hostname === 'youtu.be' || hostname.endsWith('.youtube.com')) return 'YouTube';
    if (hostname === 'x.com' || hostname === 'twitter.com') return 'X';
    if (hostname) return hostname;
  } catch {
    // URL パース失敗時はフォールバックへ進む
  }

  return cleaned || 'Web記事';
}

/**
 * domain を許可された6カテゴリのいずれかに正規化する
 * @param {string} domain
 * @returns {string}
 */
function normalizeDomain(domain) {
  const d = String(domain || '').trim().toLowerCase();
  return ALLOWED_DOMAINS.includes(d) ? d : 'other';
}

/**
 * 年月を YYYY-MM 形式に正規化する
 * @param {string} dateStr
 * @param {string} fallbackDate
 * @returns {string}
 */
function normalizeYearMonth(dateStr, fallbackDate) {
  const raw = String(dateStr || '').trim();
  const match = raw.match(/^(\d{4})[-/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}`;
  }
  const fb = String(fallbackDate || '').trim();
  const fbMatch = fb.match(/^(\d{4})[-/](\d{1,2})/);
  if (fbMatch) {
    return `${fbMatch[1]}-${fbMatch[2].padStart(2, '0')}`;
  }
  return new Date().toISOString().slice(0, 7);
}

/**
 * YAML スカラー値向けに改行を除去し、安全にダブルクォートエスケープする
 * @param {string} val
 * @returns {string}
 */
function yamlString(val) {
  const singleLine = String(val || '').replace(/\r?\n+/g, ' ').trim();
  return JSON.stringify(singleLine);
}

/**
 * セクション本文から重複した見出し行や前後の余分な空行を除去する
 * @param {string|string[]} text
 * @param {string} fallback
 * @returns {string}
 */
function normalizeSectionText(text, fallback = '- 特記事項なし') {
  let str = '';
  if (Array.isArray(text)) {
    str = text.map((item) => `- ${String(item).replace(/^[-*]\s+/, '').trim()}`).join('\n');
  } else {
    str = String(text || '').trim();
  }

  if (!str) return fallback;

  // LLM が誤ってセクション見出し（## 1. ... 等）を本文先頭に含めた場合は除去する
  const lines = str.split(/\r?\n/);
  if (lines.length > 0 && /^#{1,4}\s*\d+\.\s*/.test(lines[0].trim())) {
    lines.shift();
  }
  const cleaned = lines.join('\n').trim();
  return cleaned || fallback;
}

/**
 * snippets に実質的な内容があるか判定し、不要であれば null を返す
 * @param {string} snippets
 * @returns {string|null}
 */
function normalizeSnippets(snippets) {
  const str = normalizeSectionText(snippets, '');
  if (!str) return null;

  const stripped = str
    .replace(/^[-*]\s+/gm, '')
    .replace(/[。．.\s`"'()（）]/g, '')
    .toLowerCase();

  if (EMPTY_SNIPPET_PATTERNS.has(stripped)) {
    return null;
  }
  return str;
}

/**
 * メタデータと Gemini 解析結果から高密度な構造化 Markdown を組み立てる
 * @param {object} meta { title, url, fallbackDate }
 * @param {object} analysis Gemini API からの JSON レスポンス
 * @returns {string}
 */
function assembleStructuredMarkdown(meta, analysis = {}) {
  const title = meta?.title || analysis?.title || 'Untitled';
  const url = meta?.url || '';
  const source = inferSourceFromUrl(url, analysis.source);
  const date = normalizeYearMonth(analysis.date, meta?.fallbackDate);
  const domain = normalizeDomain(analysis.domain);

  const rawTags = Array.isArray(analysis.tags) && analysis.tags.length > 0
    ? analysis.tags
    : (Array.isArray(analysis.tags_suggested) ? analysis.tags_suggested : []);
  const cleanTags = [...new Set(
    rawTags.map((t) => String(t || '').replace(/^#/, '').trim()).filter(Boolean)
  )].slice(0, 5);

  const rawScore = Number(analysis.score);
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 50;

  const coreRule = String(analysis.core_rule || '').trim() || '特記事項なし';
  const antiPattern = String(analysis.anti_pattern || '').trim() || '特記事項なし';

  const problem = normalizeSectionText(analysis.problem, '- 特記事項なし');
  const actionableRules = normalizeSectionText(analysis.actionable_rules, '- 特記事項なし');
  const antiPatterns = normalizeSectionText(analysis.anti_patterns, '- 特記事項なし');
  const snippets = normalizeSnippets(analysis.snippets);

  const lines = [
    '---',
    `title: ${yamlString(title)}`,
    `source: ${yamlString(source)}`,
    `url: ${yamlString(url)}`,
    `date: ${yamlString(date)}`,
    `domain: ${yamlString(domain)}`,
    `tags: [${cleanTags.map((t) => yamlString(t)).join(', ')}]`,
    `score: ${score}`,
    `core_rule: ${yamlString(coreRule)}`,
    `anti_pattern: ${yamlString(antiPattern)}`,
    '---',
    '',
    '## 1. 解決する課題（Problem）',
    problem,
    '',
    '## 2. 実践ルール・判断基準（Actionable Rules）',
    actionableRules,
    '',
    '## 3. 避けるべきアンチパターン（Anti-Patterns）',
    antiPatterns,
  ];

  if (snippets) {
    lines.push(
      '',
      '## 4. 具体的なコード・構成テンプレート（Snippets / Examples）',
      snippets
    );
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Markdown 文字列が新フォーマット（構造化済み）かどうかを判定する
 * @param {string} rawMd
 * @returns {boolean}
 */
function isStructuredMarkdown(rawMd) {
  if (!rawMd || typeof rawMd !== 'string') return false;
  return /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(rawMd) && /^core_rule:/m.test(rawMd);
}

/**
 * 新旧両フォーマットの Markdown からヘッダ/フロントマターを除いた本文を抽出する
 * @param {string} rawMd
 * @returns {string}
 */
function extractMdBody(rawMd) {
  if (!rawMd || typeof rawMd !== 'string') return '';

  // 1. 新フォーマット: 先頭の YAML フロントマター (--- ... ---) を除去
  if (rawMd.startsWith('---')) {
    const endMatch = rawMd.slice(3).match(/\r?\n---(?:\r?\n|$)/);
    if (endMatch && endMatch.index !== undefined) {
      return rawMd.slice(3 + endMatch.index + endMatch[0].length).replace(/^\r?\n+/, '');
    }
  }

  // 2. 旧フォーマット: 「## 本文」以降を抽出
  const marker = /^##\s+本文\s*$/m;
  const match = rawMd.match(marker);
  if (match && match.index !== undefined) {
    return rawMd.slice(match.index + match[0].length).replace(/^\r?\n+/, '');
  }

  // 3. 旧フォーマットフォールバック: 水平線 (---) 以降を抽出
  const hrMatch = rawMd.match(/\r?\n---\r?\n/);
  if (hrMatch && hrMatch.index !== undefined) {
    return rawMd.slice(hrMatch.index + hrMatch[0].length).replace(/^\r?\n+/, '');
  }

  return rawMd;
}

/**
 * bookmarks.json の summary フィールド用に結論とNGをまとめた文字列を生成する
 * @param {object} analysis
 * @returns {string}
 */
function buildSummaryFromStructured(analysis = {}) {
  const parts = [];
  const coreRule = String(analysis.core_rule || '').replace(/\r?\n+/g, ' ').trim();
  const antiPattern = String(analysis.anti_pattern || '').replace(/\r?\n+/g, ' ').trim();

  if (coreRule && coreRule !== '特記事項なし') {
    parts.push(`【結論】${coreRule}`);
  }
  if (antiPattern && antiPattern !== '特記事項なし' && antiPattern !== '特になし') {
    parts.push(`【NG】${antiPattern}`);
  }
  return parts.join('\n');
}

module.exports = {
  ALLOWED_DOMAINS,
  inferSourceFromUrl,
  normalizeDomain,
  normalizeYearMonth,
  assembleStructuredMarkdown,
  isStructuredMarkdown,
  extractMdBody,
  buildSummaryFromStructured,
};
