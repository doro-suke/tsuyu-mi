const fs = require('fs');
const bookmarks = JSON.parse(fs.readFileSync('data/bookmarks.json', 'utf8'));

const newArticles = [
  {
    "id": "1702134481",
    "url": "https://note.com/kawaidesign/n/n56fa6fdcf616",
    "title": "デザインの科学をAIに渡したら、10分でプロ品質のLPができた",
    "summary": "良いデザインを「科学（数値）」として定義し、AIに渡すための設計書 DESIGN.md の重要性を解説。\nCLAUDE.md から DESIGN.md を参照させることで、曖昧さを排除しプロ品質のUIを高速生成する手法を提示。\n数値ベースの指定と Frontend Design Plugin の併用により、AI特有の無難さを克服し審美性を高める。",
    "priority": "high",
    "read_now_reason": "DESIGN.md という具体的なアーキテクチャ解決策が示されており、現在のAI駆動開発パイプラインに即座に組み込んでUI品質を向上させられるため。",
    "defer_reason": "UI/UXデザインの自動化やフロントエンド実装の精度向上に興味がない場合は、後回しにしても安全です。",
    "tags": ["DESIGN.md", "UI設計", "Claude Code", "デザインシステム"],
    "status": "unread",
    "analyzed_at": "2026-05-03T00:00:00.000Z",
    "markdown_path": "data/notebooklm_sources/デザインの科学をAIに渡したら、10分でプロ品質のLPができた.md"
  },
  {
    "id": "1702135451",
    "url": "https://zenn.dev/shunya_sudo/articles/claude-code-45-automation-tasks",
    "title": "Claude Codeで日常のタスクを45個自動化した東大院生の全記録",
    "summary": "Claude Codeを活用し、Gmail処理や論文監視など45種類の日常業務を自動化した東大院生の実践記録。\n「判断（AI）」と「作業（スクリプト）」を分離し、Slackを情報の集約先とするアーキテクチャを提示。\n月額1.5万円のコストで雑務を排除し、研究などの重要タスクに集中できる環境構築の全容を解説。",
    "priority": "high",
    "read_now_reason": "自動化のカテゴリと設計原則が非常に具体的で、本プロジェクトのパイプライン拡張（通知やレポート生成等）の青写真として極めて価値が高いため。",
    "defer_reason": "単発のコーディング補助としてのみAIを使いたい、あるいは自動化ワークフローの構築に興味がない場合は後回しでよい。",
    "tags": ["自動化", "ワークフロー", "Slack連携", "日常業務効率化", "Claude Code"],
    "status": "unread",
    "analyzed_at": "2026-05-03T00:00:00.000Z",
    "markdown_path": "data/notebooklm_sources/Claude Codeで日常のタスクを45個自動化した東大院生の全記録.md"
  },
  {
    "id": "1702135549",
    "url": "https://qiita.com/nogataka/items/b2b4a84ba611ccaf8447",
    "title": "Claude × Codex × Gemini を\"併用\"する設計 ＝ セカンドオピニオン運用フレームワーク",
    "summary": "Claude Code, Codex, Geminiの3大CLIツールを、それぞれの強み（設計、対話、長文/マルチモーダル）に応じて使い分ける「併用設計」を提案。\n複数のAIに意見を求める「セカンドオピニオン運用」のルール化により、判断ミスや行き詰まりを回避する手法を提示。\nClaude Codeをオーケストレーターとし、Skill経由で他AIを呼び出す具体的な実装構成を解説。",
    "priority": "high",
    "read_now_reason": "異なるAIモデルの特性を活かした「併用」という視点は、単一モデルの限界を突破するために重要。特に「アプローチが2回以上失敗したときのセカンドオピニオン」は、本プロジェクトの自律動作の安定性を高めるために即座に活用できるため。",
    "defer_reason": "特定の1ツールのみで全てのタスクを完結させており、複数ツールの導入コストや切り替えの手間を現時点では避けたい場合は後回しでよい。",
    "tags": ["マルチエージェント", "セカンドオピニオン", "Claude Code", "Gemini CLI", "開発戦略"],
    "status": "unread",
    "analyzed_at": "2026-05-03T00:00:00.000Z",
    "markdown_path": "data/notebooklm_sources/Claude × Codex × Gemini を_併用_する設計 ＝ セカンドオピニオン運用フレームワーク.md"
  }
];

bookmarks.articles.push(...newArticles);
bookmarks.updated_at = new Date().toISOString();
fs.writeFileSync('data/bookmarks.json', JSON.stringify(bookmarks, null, 2), 'utf8');
console.log('Successfully updated bookmarks.json');
