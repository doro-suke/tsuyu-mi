# 【AI駆動開発 / Claude Code】AGENT.mdや、product.md, DESIGN.md などのAIエージェント向けのMDファイル・ドキュメントについて📝
- **Source URL**: https://zenn.dev/manase/scraps/6bd12beaafd308
- **Score**: 88
- **AI Summary**:
  - AIエージェント向けドキュメントの役割を挙動、前提、仕様、見た目、手順の5系統に分類
  - AGENTS.mdは業界標準規格でありClaude Code用のCLAUDE.mdとはシンボリックリンクで紐付ける
  - GoogleのDESIGN.mdとKiroのdesign.mdの混同しやすい目的や記述法の違いを明確化
- **Read Now Reason**: 現在のAI駆動開発において、Claude CodeやCursor等のAIエージェントの挙動を最適化するためのファイル選定と、CLAUDE.mdとAGENTS.mdのシンボリックリンクによる共通化の手法が即座に実務に適用できるため。
- **Suggested Tags**: #AI駆動開発, #Claude Code, #Cursor, #プロンプトエンジニアリング
- **Processed Date**: 2026/6/20

---

## 本文
整理すると、これらの .md ファイルは「全部AIエージェント向け」という点では同じですが、役割のレイヤーが違うので混ざると分かりにくくなります。大きく4つの系統に分けると整理しやすいです。

 まず全体像



ファイル
系統
答える問い
主な提唱元




AGENTS.md / CLAUDE.md
エージェント挙動
このリポジトリで「どう作業するか」
オープン標準 / Anthropic


product.md / tech.md / structure.md
ステアリング（永続文脈）
このプロジェクトは「何で・何を使い・どう構成するか」
Kiro (AWS)


requirements.md / design.md / tasks.md
仕様駆動 (SDD)
この機能は「何を・どう作り・どの順で」
Kiro 他


DESIGN.md
デザインシステム仕様
UIは「どう見えるべきか」
Google Labs / Stitch


SKILL.md
スキル（再利用手順）
特定タスクの「やり方の手順書」
Anthropic





 ① エージェント挙動ファイル（リポジトリでの振る舞い）
AGENTS.md はいま事実上の業界標準になりつつあるファイルです。リポジトリのルートに置く「エージェント向けREADME」で、READMEが人間向け（概要・コントリビューション方法）なのに対し、ビルド手順・テスト・コーディング規約といった、コーディングエージェントが必要とする詳細な文脈を入れる場所です。OpenAI Codex・Amp・Google Jules・Cursor・Factory など複数のエコシステムから生まれた共通フォーマットで、現在はLinux Foundation傘下のAgentic AI Foundationが管理しています。プレーンなMarkdownで必須項目はなく、モノレポではサブディレクトリにネストでき、編集対象に最も近いファイルが優先されます。
CLAUDE.md はその Claude Code 版です。注意点として、Claude Code は AGENTS.md を読まず CLAUDE.md を使うので、両方のツールを揃えたい場合はシンボリックリンクで紐付けるのが定番です。
同じ系統の他ツール版:


.cursor/rules（旧 .cursorrules）— Cursor

.github/copilot-instructions.md — GitHub Copilot

GEMINI.md — Gemini CLI

.windsurfrules — Windsurf

AGENTS.md はこれらを一本化する狙いで登場した、という背景です。


 ② ステアリングファイル（product.md / tech.md / structure.md）
これは Kiro（AWSのspec駆動IDE）の「Steering」 という仕組みのファイル群です。①が「作業ルール」なのに対し、こちらはプロジェクトの永続的な前提知識を与えます。product.md は製品の目的・対象ユーザー・主要機能・ビジネス目標を定義して技術判断の「なぜ」を理解させ、tech.md はフレームワーク・ライブラリ・技術的制約を、structure.md はファイル構成・命名規則・アーキテクチャ判断を文書化します。これらの基盤ファイルはデフォルトで毎回の対話に含まれ、Kiroのプロジェクト理解のベースラインになります。deployment-workflow.md などを足すこともあります。


 ③ 仕様駆動開発（SDD）ファイル
機能ごとに「何を作るか」をコードを書く前に仕様として確定させる流れです。Kiro の SDD はrequirements.md（EARS記法のユーザーストーリーと受け入れ条件）、design.md（技術アーキテクチャ・シーケンス図・実装上の考慮点）、tasks.md（追跡可能な単位に分解した実装計画）の3点セットを生成します。
ツールによっては単一の SPEC.md にまとめるスタイルもあります。実装前に書かれ「正」として扱われる構造化された仕様で、人間には曖昧さを減らし、AIには推測を排除させるアンカーになるのが核心です。specs.md のように Claude Code / Cursor / Copilot 横断で使えるフレームワークも出ています。


 ④ DESIGN.md（デザインシステム仕様）— ここが混同ポイント
⚠️ ③のKiroの design.md（小文字・技術設計書）と、Googleの DESIGN.md（大文字・デザインシステム）は別物です。後者がおそらく質問の DESIGN.md だと思います。
2026年4月10日にGoogle Labsが google-labs-code/design.md として公開した仕様で、UI生成ツール Google Stitch のリファレンス実装です。カバーするのはデザインシステム仕様で、ファイル上部にYAMLで機械可読なデザイントークン（色・タイポグラフィ・余白・コンポーネント）を、下部のMarkdown本文に人間可読なデザイン意図を書きます。トークンで表せないエッジケースや新しいコンポーネント、想定外のレイアウト制約に直面したとき、「ブランドの個性は楽観的・信頼できる・能動的」といった、トークン化できないがブランドに沿った判断を導く指示で隙間を埋めるという発想です。Claude Design / Cursor / Stitch などで使えます。


 ⑤ SKILL.md（スキル）
特定タスクの再利用可能な手順書で、フロントマター付きMarkdownです（Claude Code / Anthropic のSkillsで使用、まさぴょんさんも記事品質レビュー用に作られていましたね）。①が「常時効くルール」なのに対し、SKILL.md は「必要なときに呼び出される手順」という位置づけです。


 まとめ：3レイヤー + SDD という見方
ある記事が綺麗に整理していて、AIへの指示が「挙動(AGENTS.md) / 個別タスク(SKILL.md) / 見た目(DESIGN.md)」の3レイヤーに分かれ始めており、SDD がそれと並走する別の動きだとしています。
つまり覚え方としては:


挙動・規約 → AGENTS.md / CLAUDE.md

プロジェクト前提 → product.md / tech.md / structure.md（Kiroステアリング）

機能の仕様 → requirements / design(小文字) / tasks（SDD）

見た目 → DESIGN.md（大文字・Google）

タスク手順 → SKILL.md

まさぴょんさんは Claude Code 中心なので、実務では CLAUDE.md（または AGENTS.md とのシンボリックリンク）+ SKILL.md が主軸、メンタリングや受託で仕様を固める場面で SDD系（requirements/design/tasks）、デザインを伴うフロント案件で DESIGN.md、という使い分けが現実的だと思います。
