/**
 * Vesper 標準タグタクソノミー（単一ソース: SSoT）
 * 乱立したタグ表記揺れや使い捨てタグを 19 個の標準マスタータグへ正規化する。
 */

'use strict';

const MASTER_TAGS = [
  'ClaudeCode',
  'AIエージェント',
  'AI駆動開発',
  'プロンプト・コンテキスト',
  'MCP・外部連携',
  '生成AI・LLM',
  '自動化パイプライン',
  '画像生成AI',
  'ComfyUI',
  '動画生成AI',
  'ショート動画・YouTube',
  'ゲーム開発',
  'UI・デザイン',
  'マーケティング・SNS',
  '個人開発・マネタイズ',
  'ナレッジ・情報整理',
  'マインドセット・戦略',
  'セキュリティ・品質',
  'プログラミング・インフラ',
];

const MASTER_TAG_SET = new Set(MASTER_TAGS);

/**
 * 7つの大カテゴリ定義（優先順位順・排他振り分け用）
 */
const CATEGORIES = [
  { dir: '01_ClaudeCode', label: 'Claude Code 実践・設定', tags: ['ClaudeCode'] },
  { dir: '05_画像生成_ComfyUI', label: '画像生成 AI・ComfyUI・LoRA', tags: ['ComfyUI', '画像生成AI'] },
  { dir: '06_動画生成_ゲーム制作', label: '動画生成 AI・ショート動画・ゲーム開発', tags: ['動画生成AI', 'ショート動画・YouTube', 'ゲーム開発'] },
  { dir: '02_AIエージェント_自動化', label: 'AIエージェント・MCP・自動化パイプライン', tags: ['AIエージェント', 'MCP・外部連携', '自動化パイプライン'] },
  { dir: '07_ビジネス_マネタイズ_戦略', label: '個人開発・マネタイズ・マーケティング・戦略', tags: ['個人開発・マネタイズ', 'マーケティング・SNS', 'マインドセット・戦略'] },
  { dir: '03_AI駆動開発_設計_品質', label: 'AI駆動開発・設計・UI・セキュリティ品質', tags: ['AI駆動開発', 'セキュリティ・品質', 'UI・デザイン', 'プログラミング・インフラ'] },
  { dir: '04_プロンプト_LLM_情報整理', label: 'プロンプト・LLM活用・ナレッジ整理', tags: ['プロンプト・コンテキスト', '生成AI・LLM', 'ナレッジ・情報整理'] },
];

const DEFAULT_CATEGORY = '07_ビジネス_マネタイズ_戦略';

/**
 * 記事のタグ配列から、最も主要な1つの大カテゴリディレクトリ名を決定する
 * @param {string[]} tags
 * @returns {string}
 */
function resolvePrimaryCategory(tags = []) {
  const norm = normalizeTags(tags, 0);
  for (const cat of CATEGORIES) {
    if (norm.some((t) => cat.tags.includes(t))) {
      return cat.dir;
    }
  }
  return DEFAULT_CATEGORY;
}

/**
 * 具体的なキーワードから順に判定し、最適なマスタータグを返す
 * 順序が重要（例: ComfyUI -> 画像生成AI、ショート動画 -> 動画生成AI）
 */
const KEYWORD_RULES = [
  { tag: 'ComfyUI', pattern: /comfy\s*ui/i },
  { tag: 'ClaudeCode', pattern: /claude[\s_-]*code|claude\.md|claude\s*design|claudecode/i },
  { tag: 'ショート動画・YouTube', pattern: /ショート動画|youtube|tiktok|reels|shorts/i },
  { tag: '動画生成AI', pattern: /動画|video|seedance|remotion|minimax|kling|sora|runway|anime|vfx/i },
  { tag: '画像生成AI', pattern: /画像|image|sdxl|stable[\s_-]*diffusion|lora|flux|midjourney|nijijourney|イラスト|illustrious/i },
  { tag: 'ゲーム開発', pattern: /ゲーム|game|unity|godot|blender|3d|rpg|カード|ポーカー/i },
  { tag: 'UI・デザイン', pattern: /ui|ux|デザイン|design|フロントエンド|frontend|lp改善|css|tailwind|html|web制作/i },
  { tag: 'セキュリティ・品質', pattern: /セキュリティ|security|テスト|test|tdd|レビュー|review|ガードレール|ssrf|品質|監査|脆弱|防衛/i },
  { tag: 'MCP・外部連携', pattern: /\bmcp\b|api連携|slack|playwright|webhook|連携|chrome拡張|browser/i },
  { tag: 'プロンプト・コンテキスト', pattern: /プロンプト|prompt|コンテキスト|context|トークン|token|コスト最適化|ハルシネーション/i },
  { tag: 'AIエージェント', pattern: /エージェント|agent|マルチエージェント|オーケストレーション|orchestration|ハーネス|harness|swarm|subagent|サブエージェント/i },
  { tag: 'AI駆動開発', pattern: /駆動開発|ai駆動|ai開発|aiコーディング|cursor|codex|antigravity|copilot|仕様|要件定義|システム設計|アーキテクチャ|ソフトウェア設計|開発プロセス|開発効率|バイブコーディング|vibe/i },
  { tag: '自動化パイプライン', pattern: /自動|ワークフロー|workflow|パイプライン|pipeline|n8n|dify|環境構築|docker|tmux|cron|バッチ/i },
  { tag: 'マーケティング・SNS', pattern: /マーケ|sns|x運用|twitter|note|ブログ|アフィリ|コンテンツ|seo|集客|コピーライティング|営業|広告/i },
  { tag: '個人開発・マネタイズ', pattern: /個人開発|副業|マネタイズ|収益|起業|事業|プロダクト|saas|フリーランス|一人会社|ソロプレナー|ビジネスモデル/i },
  { tag: 'ナレッジ・情報整理', pattern: /ナレッジ|knowledge|obsidian|生産性|業務効率|日常業務|時短|情報収集|notebooklm|rag|メモ/i },
  { tag: 'マインドセット・戦略', pattern: /マインド|思考|戦略|キャリア|ビジネススキル|学習|仕事術|マネジメント|組織|課題/i },
  { tag: 'プログラミング・インフラ', pattern: /python|typescript|javascript|rust|go\b|fastapi|react|next\.?js|github|cloudflare|データ|時系列|sql|分析|colab|prophet|whisper|ffmpeg/i },
  { tag: '生成AI・LLM', pattern: /生成ai|llm|claude|gemini|chatgpt|gpt|openai|anthropic|ローカル|gguf|マルチモーダル|aiツール|ai活用|ai時代|\bai\b/i },
];

/**
 * 単一の生タグを標準マスタータグへ変換する
 * @param {string} rawTag
 * @returns {string}
 */
function normalizeSingleTag(rawTag) {
  const cleaned = String(rawTag || '').trim().replace(/^#/, '');
  if (!cleaned) return '';

  if (MASTER_TAG_SET.has(cleaned)) {
    return cleaned;
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(cleaned)) {
      return rule.tag;
    }
  }

  return 'その他';
}

/**
 * 記事のタグ配列を標準マスタータグへ正規化・重複排除する
 * @param {string[]} tags
 * @param {number} maxTags
 * @returns {string[]}
 */
function normalizeTags(tags = [], maxTags = 4) {
  const mapped = [];
  for (const t of tags) {
    const norm = normalizeSingleTag(t);
    if (norm && !mapped.includes(norm)) {
      mapped.push(norm);
    }
  }

  // 有効なマスタータグが1つでもあれば「その他」を除外する
  const withoutOther = mapped.filter((t) => t !== 'その他');
  const finalTags = withoutOther.length > 0 ? withoutOther : mapped;

  return maxTags > 0 ? finalTags.slice(0, maxTags) : finalTags;
}

module.exports = {
  MASTER_TAGS,
  CATEGORIES,
  DEFAULT_CATEGORY,
  normalizeSingleTag,
  normalizeTags,
  resolvePrimaryCategory,
};
