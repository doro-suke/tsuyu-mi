# Claude Code × Obsidianで実現！Qiita記事執筆を完全自動化したら、記事が書くのが楽しくなった話 - Qiita
- **Source URL**: https://qiita.com/hoge_kawamuro/items/20a91a58680ed93326ee
- **Score**: 82
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #ワークフロー自動化
- **Processed Date**: 2026/9/15

---

## 本文
はじめに
Qiita記事、書いてますか？
正直に言うと、僕は記事を書くのが結構苦手でした。理由はいくつかあって：


記事ネタが見つからない - 何を書けばいいか分からず、ネタ探しに時間がかかる

執筆に時間がかかる - 記事を書くのに何時間もかかり、続かない

投稿の手間が面倒 - コピペやフォーマット調整が煩雑

文章がAIっぽくなる - Claude/ChatGPTに書かせると無機質な文章になってしまう

この全部の悩みを一気に解決したくて、Claude Code × Obsidianで記事執筆を自動化するシステムを作りました。
結論から言うと、めちゃくちゃ快適になりました。
記事ネタはSlackやObsidianから自動で見つけてくれるし、執筆時間は半分以下になるし、投稿もワンクリック。しかも、AIっぽくない自然な文章が書けるようになりました。
今回は、このシステムをどうやって作ったのか、使ってみてどうだったのかを共有します。

作ったシステムの全体像
まず、システムの構成を見てみましょう。
┌─────────────────────────────────────────┐
│         Obsidian Vault                  │
│  ┌──────────┐  ┌──────────┐            │
│  │Daily Notes│  │ Archives │            │
│  │作業ログ   │  │イベント  │            │
│  └──────────┘  └──────────┘            │
│         ↓               ↓               │
│    ┌──────────────────────┐            │
│    │   11_Qiita/drafts    │            │
│    └──────────────────────┘            │
└─────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│         Claude Code (CLI)               │
│  ┌──────────┐  ┌──────────┐            │
│  │qiita-draft│  │qiita-review│          │
│  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐            │
│  │qiita-publish│ │qiita-workflow│       │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│            Qiita                        │
└─────────────────────────────────────────┘

このシステムは、5つのClaude Code Skillsで構成されています：


/qiita-workflow - ワークフロー管理（次に何をすべきか自動提案）

/qiita-draft - 記事の下書き作成

/qiita-review - 文体チェック・推敲

/qiita-publish - Qiitaへの投稿

/qiita-topics-from-slack - Slackから記事ネタ探索


実際の使い方デモ
実際にどう使うのか、デモで見てみましょう。

たった1コマンドで記事が完成
/qiita-workflow start

これだけです。あとは提案に「はい」と答えるだけで、記事執筆の全ステップが自動で進みます。
具体的な流れ:
1. /qiita-workflow start を実行
   ↓
2. 「Slackから記事ネタを探しますか？」
   → 「はい」
   ↓
3. Slackメッセージを自動探索
   → 「Next.jsでハマった話」「RAG導入の課題」など候補が出る
   ↓
4. トピックを選択
   → 「次のステップ: 下書き執筆」と自動提案
   ↓
5. インタビュー形式で体験を引き出す
   → 「どんなきっかけで始めましたか？」
   → 「どこでハマりましたか？」
   ↓
6. 下書きが完成
   → 「次のステップ: 文体チェック」と自動提案
   ↓
7. AIっぽい表現を自動検出
   → 「〜について説明します」→「〜を見ていきます」
   ↓
8. 修正を確認
   → 「次のステップ: 投稿」と自動提案
   ↓
9. Claude CodeからQiitaに直接投稿
   → 完了！🎉

実際のコマンド数: たったの1つ。
あとは対話に答えるだけで、記事が完成します。

システムの4つの独自性
このシステムの「これが他と違う！」というポイントを4つ紹介します。

独自性1: アイディア収集から投稿まで全自動
Slackから記事ネタを自動探索
/qiita-topics-from-slack

このコマンドで、Slackの会話から記事にできそうなトピックを自動で発見してくれます。
探索対象:

技術的な問題解決（「ハマった」「解決した」）
勉強会・イベント参加（「参加した」「学んだ」）
新しい技術の試行（「試した」「使ってみた」）

見つかる情報:

会話の要約
投稿者・日時・チャンネル
リアクション数
スレッド数
Slackへのリンク

Obsidian Daily Notesから自動抽出
日々のメモがObsidianに溜まっていれば、それだけで記事ネタになります。
Explore Agentが以下のディレクトリを自動探索:


05_Daily Notes - 作業ログや学習メモ

04_Archives - イベント参加レポート

06_Knowledge - 学習記録

01_Projects - トラブルシューティング

Qiitaへ直接投稿
/qiita-publish

このコマンドで、Claude CodeからQiitaに直接投稿できます。
以前:

記事をコピー
Qiita Web UIを開く
貼り付けて投稿
URLを手動でメモ
ファイルを手動で published/ に移動

これから:


/qiita-publish を実行
「Claude Codeから直接投稿」を選択
完了！（URL自動記録、自動でpublished/に移動）


独自性2: AIっぽくない、人間味のある文章
インタビュー形式で生の声を引き出す
/qiita-draft は、単に「記事を書いて」と言うのではなく、インタビュー形式で体験を引き出します。
質問例:

この技術と最初に出会ったきっかけは？
実際に試してみてどう感じましたか？
躓いたポイントはありましたか？
どうやって解決しましたか？

この質問に答えることで、自然とあなたの体験・感情が記事に反映されます。
文体チェック機能でAI表現を検出
/qiita-review で、AIっぽい表現を自動検出して修正提案してくれます。
検出パターン:

❌ 「〜について説明します」→ ✅ 「〜を見ていきます」
❌ 「〜することができます」→ ✅ 「〜できます」
❌ 「本記事では」→ ✅ 「今回は」
❌ 「以下の通りです」→ ✅ 「こんな感じです」

設定ファイル（.qiita-config.yaml）で、カスタマイズ可能です。

独自性3: Obsidianとの完全統合
日々のメモが記事の資産に
Obsidianで日々メモを取る習慣があれば、それがそのまま記事ネタになります。
Daily Notesに書いたこと:

「今日はNext.jsのApp Routerでハマった」
「勉強会でRAGの話を聞いた」
「tmuxのセットアップをした」

これが全部、記事候補として自動抽出されます。
フロントマターで進捗管理
各記事のフロントマターに workflow_step が自動追加され、進捗を管理します。
---
title: "記事タイトル"
tags: [タグ1, タグ2]
status: draft
workflow_step: review  # ← 自動管理
created: 2026-02-17
updated: 2026-02-17
qiita_url: ""
---

workflow_step の値:


idea - アイディアのみ

draft - 下書き完了

review - 推敲完了

completed - 投稿完了

/qiita-workflow で進捗状況を確認できます。

独自性4: Organization紐付けで組織の記事として投稿
会社・チームのOrganizationに自動紐付け
記事を投稿する際、所属しているQiita Organizationに自動で紐付けることができます。
/qiita-publish

何が起きるか:
Claude: 所属しているOrganizationが見つかりました：
1. 株式会社Example (example-inc)
2. テックチーム (tech-team)
3. 個人投稿（Organizationなし）

どれに紐付けますか？

あなた: 1

Claude: example-inc に紐付けて投稿します...
→ 組織の記事として投稿完了！

メリット:

会社・チームの技術ブログとして発信できる
組織のページに記事が自動でまとまる
個人と組織の記事を使い分けられる

設定で自動化:
.qiita-config.yaml でデフォルトのOrganizationを設定できます：
organization:
  default_url_name: "your-company"  # デフォルトで紐付けるOrganization
  always_ask: true                  # 毎回確認するか



always_ask: true → 毎回選択（推奨）

always_ask: false → デフォルトを自動使用

Organization一覧の取得:
MCPツール qiita_get_organizations で、所属している組織を自動取得します。

Claude Code Skillsの設計思想
このシステムを作る上で、Skillの設計は重要でした。

Claudeのおかげで苦労いらず
正直、Skillの設計って難しそうだと思ってたんですが、Claudeに任せたら全部うまくいきました。

Skillの粒度をどうするか → Claudeが提案
ユーザーとの対話設計 → Claudeが実装
ワークフロー管理の実装 → Claudeが自動化

僕がやったのは、「こういう機能が欲しい」と伝えただけです。

ユーザーとの対話設計
特に重要だったのが、AskUserQuestion ツールの活用です。
従来のCLIツールだと:
$ qiita-draft --topic "Next.js" --tags "React,JavaScript" --title "..."

こんな感じで、全部の引数を一度に指定する必要がありました。
でも、AskUserQuestionを使うと:
1. 「どのトピックで書きますか？」→ ユーザーが選択
2. 「タグは何にしますか？」→ ユーザーが選択
3. 「タイトルはどうしますか？」→ ユーザーが入力

こんな感じで、対話的に進められるので、使いやすさが全然違います。

ワークフロー管理の実装
/qiita-workflow の実装では、フロントマターを自動更新する仕組みを作りました。
各Skillが実行されるたびに:

フロントマターの workflow_step を更新

updated フィールドを現在時刻に更新
次のステップを自動提案

これによって、ユーザーが忘れても、次に何をすべきか自動で案内してくれます。

使ってみた感想
実際に使ってみた感想を正直に書きます。

予想以上に快適
執筆時間が半分以下になりました。
以前は、記事を1本書くのに30〜1時間かかっていましたが、今は一瞬で書けます。
理由:

ネタ探しの時間がゼロ（Slackから自動抽出）
執筆時はインタビューに答えるだけ
推敲もAIが自動チェック
投稿もワンクリック


ネタ探しが楽
Slackを見るだけで候補が出るのが、めちゃくちゃ便利です。
以前は「何か記事書けることないかな…」と悩んでいましたが、今は：
/qiita-topics-from-slack

これで、過去1週間のSlackメッセージから記事候補が3-5個出てきます。
「あ、そういえばこれハマったな」「これ勉強会で聞いたな」と思い出せるので、記事のハードルが一気に下がりました。

文体が自然に
インタビュー形式が効きました。
以前は、Claudeに「記事を書いて」と頼むと、堅苦しい文章になっていました。
でも、インタビュー形式で「どう感じましたか？」「どこでハマりましたか？」と聞かれると、自然と自分の言葉で答えるので、結果的に人間味のある文章になります。
文体チェック機能も効果的で、AIっぽい表現を自動で検出してくれるので、最終的にかなり読みやすい記事になります。

技術スタック
このシステムで使っている技術スタックを紹介します。

現在使用中


Obsidian - ナレッジベース（Daily Notes、Archives管理）

Claude Code - AI統合CLI

Skills - カスタムコマンド（~/.claude/skills/に配置）

SubAgents - タスク分散処理（Explore Agent、Style Checker Agent）

MCP (Model Context Protocol) - Slack/Qiita連携

YAML - 設定ファイル（.qiita-config.yaml）

Markdown - 記事フォーマット


Skillの構成



Skill
役割
使用ツール




/qiita-workflow
ワークフロー管理
Read, Glob, AskUserQuestion


/qiita-draft
下書き作成
Task (Explore Agent), AskUserQuestion, Write


/qiita-review
文体チェック
Read, Edit, AskUserQuestion


/qiita-publish
投稿
Read, Bash, ToolSearch (Qiita MCP)


/qiita-topics-from-slack
Slackネタ探索
ToolSearch (Slack MCP), AskUserQuestion




MCP連携
Slack MCP - Slackメッセージの探索


slack_search_public_and_private - チャンネル検索

slack_read_channel - メッセージ取得

Qiita MCP - Qiitaへの投稿


qiita_post_article - 記事投稿（Organization紐付け対応）

qiita_update_article - 記事更新

qiita_get_organizations - 所属Organization一覧取得

qiita_get_my_articles - 記事一覧取得

qiita_get_article_stats - 記事統計情報取得


セットアップ手順
このシステムを自分でも使いたい人向けに、簡単なセットアップ手順を書いておきます。

1. Obsidianのセットアップ
Obsidian Vaultに以下のディレクトリを作成:
11_Qiita/
├── drafts/           # 執筆中の記事
├── published/        # 公開済みの記事
├── templates/        # 記事テンプレート
└── .qiita-config.yaml # 文体チェック設定


2. Claude Code Skillsの作成
~/.claude/skills/ に各Skillを配置します。
Skillの作り方は、Claude Codeに聞けば教えてくれます：
「Qiita記事の下書きを作成するSkillを作りたいです。
インタビュー形式で体験を引き出して、カジュアルな文体で執筆してください。」

こんな感じで頼めば、Claudeが自動で実装してくれます。

3. Qiita MCPのセットアップ
Qiitaアクセストークンを取得:


Qiita設定ページを開く
「個人用アクセストークン」を作成
スコープを選択（read_qiita, write_qiita）

~/.zshenv に追加:
export QIITA_ACCESS_TOKEN="your_token_here"


⚠️ 注意: ~/.zshrc ではなく ~/.zshenv に設定してください
Claude CodeはMCPサーバーを非インタラクティブシェルで起動します。.zshrc はインタラクティブシェルのみで読み込まれるため、MCPサーバーからは参照されません。.zshenv はすべてのシェルで読み込まれるので、こちらに設定する必要があります。

~/.claude/config.json に追加:
{
  "mcpServers": {
    "qiita": {
      "command": "node",
      "args": ["/path/to/qiita-mcp-server/index.js"],
      "env": {
        "QIITA_ACCESS_TOKEN": "${QIITA_ACCESS_TOKEN}"
      }
    }
  }
}


4. Claude Codeを再起動
設定を反映させるため、Claude Codeを完全に終了してから再起動します。

⚠️ source ~/.zshenv だけでは不十分です
MCPサーバーはClaude Codeの起動時にシェルごと起動されるため、Claude Code自体を再起動する必要があります。


5. 使い始める
Claude Codeを起動して:
/qiita-workflow start

これで、記事執筆が始まります！

この記事もこのシステムで投稿しました
メタ的な話ですが、この記事自体も、ここで紹介したシステムを使って投稿しています。
実際の流れ:

Obsidian Daily Notesに「Qiita記事システムを作った」とメモ

/qiita-draft で下書き作成
インタビュー形式で体験・感想を書き込む

/qiita-review で文体チェック

/qiita-publish で直接投稿 ← ここで実行

投稿時のコマンド:
/qiita-publish

内部で実行されたMCPツール:
mcp__qiita__qiita_post_article({
  title: "Claude Code × Obsidianで実現！...",
  body: "記事本文...",
  tags: [
    { name: "ClaudeCode" },
    { name: "Obsidian" },
    { name: "Qiita" },
    { name: "自動化" },
    { name: "MCP" }
  ],
  private: false,
  organization_url_name: null  // 個人投稿
})

結果:

✅ 投稿完了
✅ URLが自動記録 (qiita_url フロントマターに追加)
✅ published/ ディレクトリに自動移動
✅ 投稿日時が自動記録

所要時間: 約1時間

下書き作成: 30分
文体チェック・修正: 20分
投稿: 1秒（MCPツール実行）

以前なら3-4時間かかっていた作業が、1時間で完了しました。
システムを使いながら改善
記事を書きながら、「Organization紐付け機能が欲しい」と思い、その場でClaude Codeに実装を依頼。30分後には機能が完成し、この記事にも反映しました。
こんな感じで、使いながら改善していけるのが、Claude Codeの強みです。

まとめ
Qiita記事執筆、自動化するとめちゃくちゃ楽になります。
Before:

記事ネタ探し: 手動で思い出す（30分〜1時間）
執筆: 3-4時間
投稿: コピペ、手動入力、URL記録（10分）

After:

記事ネタ探し: Slackから自動抽出（5分）
執筆: インタビュー形式で30分〜1時間
投稿: ワンクリック（1分）

合計で半分以下の時間になりました。

記事執筆を楽にしよう
このシステムを作って気づいたのは、記事を書くハードルを下げることが大事ということです。

ネタ探しの時間を減らす → 自動抽出
執筆の時間を減らす → インタビュー形式
投稿の手間を減らす → ワンクリック投稿

この3つを自動化するだけで、記事執筆が一気に楽になります。

Claude Codeの可能性
Claude CodeのSkills + MCP + SubAgentsの組み合わせは、かなり強力です。
今回のような「記事執筆の自動化」だけでなく、いろんなワークフローを自動化できると思います。
例えば:

日報の自動生成
コードレビューの自動化
ドキュメントの自動更新
タスク管理の自動化

あなたも、自分のワークフローをClaude Codeで自動化してみませんか？

自分だけのシステムを作ろう
このシステムは、僕の個人的なワークフローに合わせて作ったものです。
あなたのワークフローに合わせて、カスタマイズしてみてください：

記事ネタの探索先を変える（GitHub Issues、Notion、など）
文体チェックのルールを変える
投稿先をQiita以外にする（Zenn、はてなブログ、など）

Claude Codeなら、こういったカスタマイズも簡単にできます。
自分だけの最強の記事執筆システムを作りましょう！
