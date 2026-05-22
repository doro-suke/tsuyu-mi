# Claude Code Skills の作り方入門 — 実務で使えるカスタムコマンドを自作する #AI - Qiita
- **Source URL**: https://qiita.com/joinclass/items/19b96eff86619e2cdaeb
- **Score**: 88
- **AI Summary**:
  - Claude Codeのカスタムコマンド「Skills」の定義方法とディレクトリ構造を具体的に解説
  - 引数の受け取りやBash操作を含む高度な自動化ワークフロー（テスト・修正等）の実装例を提示
  - CLAUDE.mdの肥大化を防ぐための設計原則や名前空間による管理手法といったベストプラクティス
- **Read Now Reason**: AI駆動開発においてCLAUDE.mdが肥大化し精度が低下する問題を、Skillsへの機能分離という設計原則で解決できるため。即時コピー可能な設定ファイル形式が明記されている。
- **Suggested Tags**: #ClaudeCode, #AI駆動開発
- **Processed Date**: 2026/5/11

---

## 本文
はじめに
Claude Code を日常的に使っていると、「毎回同じ指示を書くのが面倒」「チーム全員に同じワークフローを共有したい」と感じる場面が出てくる。
そこで活躍するのが Skills（スキル） だ。
Skills は Claude Code のカスタムコマンド機能で、/my-skill のようにスラッシュコマンドとして呼び出せる再利用可能なプロンプトテンプレートのこと。僕は現在、自社の業務自動化に Claude Code を使っており、17個の launchd ジョブと合わせて自動化率98%を達成している。その中核にあるのが Skills だ。
この記事では、Skills の基本から実践的な作り方までを解説する。

Skills とは何か
Skills は一言でいうと「Claude Code に登録できるカスタムスラッシュコマンド」だ。
通常の CLAUDE.md がプロジェクト全体のルールを定義するのに対し、Skills は特定のタスクに特化した指示セットを定義する。
# 通常の使い方
> コミットメッセージを日本語で書いて、conventional commits形式で…（毎回入力）

# Skills を使った場合
> /commit
（事前に定義した指示が自動で展開される）


Skills ファイルの基本構造
Skills は .claude/skills/ ディレクトリに Markdown ファイルとして配置する。
.claude/
└── skills/
    └── commit.md          # /commit で呼び出せる
    └── review-pr.md       # /review-pr で呼び出せる
    └── my-namespace/
        └── deploy.md      # /my-namespace:deploy で呼び出せる


最小構成
---
name: commit
description: コミットメッセージを生成する
user_invocable: true
---

# コミットメッセージ生成

変更内容を分析し、Conventional Commits 形式で日本語のコミットメッセージを生成してください。


フロントマターの各フィールド



フィールド
必須
説明




name
○
スキル名（スラッシュコマンドの名前）


description
○
1行の説明（Claude がスキル選択時に参照）


user_invocable
○

true にするとユーザーが /name で呼び出せる


args
-
引数の定義（後述）




実践：3つのスキルを作ってみる

1. シンプルなレビュースキル
まずは一番シンプルな例から。
---
name: review
description: コードレビューを実行する
user_invocable: true
---

# コードレビュー

変更されたファイルを確認し、以下の観点でレビューしてください：

1. バグの可能性
2. セキュリティリスク（OWASP Top 10）
3. パフォーマンスの問題
4. 命名規則の一貫性

問題がなければ「LGTM」とだけ返してください。

使い方：
> /review


2. 引数付きスキル
引数を受け取るスキルも作れる。
---
name: new-component
description: React コンポーネントを新規作成する
user_invocable: true
args:
  - name: component_name
    description: コンポーネント名（PascalCase）
    required: true
---

# コンポーネント作成

`$ARGUMENTS` という名前で新しい React コンポーネントを作成してください。

- `src/components/{component_name}/index.tsx` に配置
- Props の型定義を含める
- テストファイルも同時に作成

使い方：
> /new-component UserProfile

$ARGUMENTS にはユーザーが渡した引数がそのまま展開される。

3. 他のツールを呼び出すスキル
Skills の本体はプロンプトなので、Claude Code が使えるツール（Bash, Read, Write, Agent など）を自由に指示できる。
---
name: test-and-fix
description: テスト実行→失敗時に自動修正
user_invocable: true
---

# テスト実行と自動修正

1. `npm test` を実行
2. 失敗したテストがあれば、エラー内容を分析
3. 該当コードを修正
4. 再度テストを実行して全パスを確認
5. 修正内容をサマリとして報告


実務での活用：僕が実際に使っているパターン
僕は一人会社で AI-CEO Framework という仕組みを運用している。Claude Code に10部門のAIエージェントを統括させ、朝の5分で全部門を把握して承認ボタンを押すだけ、という運用だ。
この運用の中で Skills は不可欠な存在になっている。いくつか実例を紹介する。

朝ダイジェスト生成
毎朝の定型業務を1コマンドで完了させる。
---
name: morning
description: 朝ダイジェストを生成する
user_invocable: true
---

全部門の STATE.md を読み取り、承認待ちアイテムと KPI を集約して
ダイジェストを生成してください。

これだけで、各部門の状態収集・承認待ち一覧・KPIサマリが一発で出る。

記事の自動生成
---
name: write-article
description: 技術記事を生成する
user_invocable: true
args:
  - name: theme
    description: 記事のテーマ
    required: true
---

$ARGUMENTS のテーマで技術記事を書いてください。
実体験データベースを参照し、具体的な数値と失敗談を含めること。

コンテンツ制作も Skills 化することで、品質基準を統一しながら量産できる。実際に僕は3チャネル（Zenn, Qiita, note）で毎日記事を自動公開している。

Skills 設計のコツ
実際に運用してわかった、Skills を効果的に設計するためのポイントを共有する。

1. CLAUDE.md を肥大化させない
僕は以前、CLAUDE.md にルールを追加し続けて1,000行を超えたことがある。結果、AIが矛盾する指示に混乱し、指示と逆の動作を始めた。
対策：CLAUDE.md は200行以内に抑え、具体的な業務ロジックは Skills に分離する。
CLAUDE.md（200行以内）= プロジェクト全体のルール
Skills（各ファイル）= タスク固有の指示


2. 1スキル1責務
1つのスキルに複数の責務を持たせると、どこを直せばいいかわからなくなる。Unix哲学と同じだ。
❌ /deploy-and-notify-and-update-docs
✅ /deploy, /notify, /update-docs（それぞれ独立）


3. 名前空間で整理する
スキルが増えてきたらディレクトリで名前空間を切る。
.claude/skills/
├── dev/
│   ├── review.md        # /dev:review
│   └── hotfix.md        # /dev:hotfix
├── publish/
│   ├── new.md           # /publish:new
│   └── status.md        # /publish:status
└── mkt/
    └── campaign.md      # /mkt:campaign


4. Agent との使い分け
Skills は「何をするか」の指示テンプレート。Agent（.claude/agents/）は「どう実行するか」のサブプロセス定義。
Skills  → ユーザーが /command で起動するエントリーポイント
Agents  → Skills から呼び出される実行エンジン

僕の場合、Skills が入口で、重い処理は Agent に委任する設計にしている。

よくあるハマりどころ

user_invocable: true を忘れる
これがないと /skill-name で呼び出せない。内部専用スキル（他のスキルから呼ばれるだけ）なら false でいいが、直接使いたいなら必ず true に。

プロンプトが長すぎる
Skills のプロンプトもコンテキストを消費する。不要な説明は削り、参照すべきファイルはパスだけ渡す。僕はこれを「Thin Skill」と呼んでいる。
# ❌ スキル内にルールを全部書く
品質基準は以下の通りです...（200行のルール）

# ✅ ファイルパスだけ渡す
品質基準は `.company/steering/quality.md` を参照してください。


macOS の cron で動かない
Skills を cron で定期実行しようとして動かないケースがある。macOS ではフルディスクアクセスの問題で cron ジョブが全滅することがある。僕も実際にこれでハマった。解決策は launchd に移行することだ。

まとめ
Skills は Claude Code の「再利用可能なプロンプト」だ。


.claude/skills/ に Markdown ファイルを置くだけ
フロントマターで user_invocable: true を設定

/skill-name で呼び出せる
引数も受け取れる
Agent と組み合わせて複雑なワークフローも構築可能

僕は Skills と Agent の組み合わせで、一人会社の自動化率98%を実現している。月のAIコストは約2万円。仕組みの初期投資は大きいが、一度作れば自動で回る。
まずは1つ、自分が繰り返しやっている作業を Skills 化するところから始めてみてほしい。

関連書籍
Claude Code や AI 自動化についてさらに深く学びたい方は、筆者の書籍もぜひご覧ください。
👉 Zenn 書籍一覧
実践で得たノウハウを体系的にまとめています。
