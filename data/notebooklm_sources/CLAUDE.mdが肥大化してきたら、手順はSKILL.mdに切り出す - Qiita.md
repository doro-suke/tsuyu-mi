# CLAUDE.mdが肥大化してきたら、手順はSKILL.mdに切り出す - Qiita
- **Source URL**: https://qiita.com/caymezon/items/d82d0e2d30d2647293dc
- **Score**: 88
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #プロンプトエンジニアリング
- **Processed Date**: 2026/9/26

---

## 本文
背景
Claude Code / Claude.aiには、「専用の手順書と知識」をClaudeに渡して特定作業をこなせるようにするClaude Skillsという拡張機能があります。実体はSKILL.mdという名前のMarkdownファイルで、Agent Skillsというオープンスタンダードに準拠しています。CLAUDE.mdとの役割の違いと、実際の書き方を整理します。

1. CLAUDE.mdとSKILL.mdは読み込みタイミングが違う




CLAUDE.md
SKILL.md




役割
常に適用されるルール・文脈
必要な時だけ呼び出す手順


読み込みタイミング
セッション開始時に毎回全文
呼び出された時だけ


向いている内容
短いルール、言語設定、基本方針
詳細な手順、ワークフロー



CLAUDE.mdはコンテキストを常に消費するため、長くなりすぎるとそれだけでトークンを圧迫します。詳細な手順はSKILL.mdに切り出すのが正解です。

2. SKILL.mdの基本構造
---
name: スキル名（ローバーケース、ハイフン区切り）
description: いつ使うかの説明（Claudeの自動判断に使われる重要な項目）
disable-model-invocation: false
argument-hint: [引数のヒント]
---

ここに指示を書く

1. 手順1
2. 手順2
3. 手順3

nameと本文以外に、以下のフロントマターフィールドがあります。



フィールド
説明




description
Claudeが自動判断するための説明（最重要）


disable-model-invocation

trueにするとユーザーが明示的に呼ばないと起動しない


user-invocable

falseにするとメニュー・一覧から非表示（Claudeのみが起動可能）


argument-hint

/skill-nameの後に続く引数のヒント表示


allowed-tools
使用を許可するツールを制限


model

sonnet / opus / haikuから選択


context

forkを指定すると隔離されたコンテキストで実行




3. descriptionの書き方が成否を分ける
descriptionはセッション開始時に常に読み込まれ、Claudeが「このスキルをいつ使うか」を判断する唯一の材料になります。
# 悪い例（曖昧すぎる）
description: コードを処理する

# 良い例（いつ使うかが明確）
description: Explains how code works with diagrams and analogies.
  Use when the user asks "how does this work?" or wants to understand
  a specific piece of code.

「何をするか」だけでなく「いつ使うか」を明示的に書くことが、誤作動しないスキルを作る鍵です。

4. 動的な値の埋め込みとシェルコマンド注入
---
name: fix-issue
description: Fix a GitHub issue by number
argument-hint: [issue-number]
---

Fix GitHub issue number $ARGUMENTS following our coding standards.

Log activity to logs/${CLAUDE_SESSION_ID}.log

$ARGUMENTSで呼び出し時の引数を、${CLAUDE_SESSION_ID}のような変数で動的な値を埋め込めます。さらに、!`コマンド`という記法でシェルコマンドの実行結果をスキルに直接注入できます。
---
name: pr-summary
description: Summarize the current pull request
---

## PR情報
- 差分: !`gh pr diff`
- 変更ファイル: !`gh pr diff --name-only`
- コメント: !`gh pr view --comments`

## タスク
上記のPRを日本語で詳しくサマリーしてください。

呼び出された瞬間にgh pr diffなどのコマンドが実行され、その結果がスキルの指示文に埋め込まれた状態でClaudeに渡ります。

5. 誤実行を防ぐdisable-model-invocation: true

---
name: deploy-production
description: 本番環境へデプロイする
disable-model-invocation: true
allowed-tools: Bash
---

disable-model-invocation: trueを設定すると、Claudeが会話の文脈から「デプロイの話をしているな」と判断しても自動的には起動しません。ユーザーが/deploy-productionと明示的に打った時だけ実行される、という安全装置になります。本番操作系のスキルには必須の設定です。

6. 配置場所と優先順位



配置場所
スコープ
優先順位




Managed Policy（企業管理）
組織全体
1位（最優先）


~/.claude/skills/
全プロジェクト（個人用）
2位


.claude/skills/
このプロジェクトのみ
3位


Plugin内 skills/

Plugin有効時
4位



.claude/skills/はgitリポジトリに含めればチーム全体で共有できます。同名のスキルが複数の場所に存在する場合、優先順位が高い方が使われます。

まとめ
SKILL.mdは「呼び出された時だけ読み込まれる」という性質上、CLAUDE.mdより長く詳細に書いても問題ありません。descriptionを具体的に書くこと、本番操作系にはdisable-model-invocation: trueを付けること、この2点を押さえればSkills運用の基本は完成です。
→ Claude Skills完全ガイド｜とは・使い方・SKILL.mdの作り方まで初心者向けに徹底解説（ブログ）
