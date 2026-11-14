# Claude Code Skillの作り方｜21個運用して分かった設計と育て方
- **Source URL**: https://zenn.dev/yamato_snow/articles/3cd6ed9ac340a2
- **Score**: 88
- **AI Summary**:
  - Claude Codeの振る舞いを制御するSkillの定義方法とYAMLフロントマターの各フィールドを詳説。
  - 個人環境やプロジェクト単位での配置ルール、および引数渡しや自動発動の仕組みを具体的に解説。
  - skill-creatorを用いたスキルの自動生成、評価、改善を行うための実践的な運用サイクルを提示。
- **Read Now Reason**: AI駆動開発のコアツールであるClaude Codeの効率を劇的に高める具体的設定ファイル(SKILL.md)の構造と、自動化パイプラインの構築手法が即座に適用可能な形式でまとめられているため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #ワークフロー自動化, #LLM-Ops
- **Processed Date**: 2026/5/5

---

## 本文
Claude Codeを半年以上使い込んでいると、毎回同じ指示を打っている自分に気づくことがあります。「コミットメッセージは日本語で」「テストを書いてからPRを出して」「この記事はこのトーンで」。
これを解決するのがSkillです。
Skillとは、~/.claude/skills/ や .claude/skills/ に置くYAMLフロントマター付きのMarkdownファイル（SKILL.md）のこと。テキストファイル1つで、Claude Codeの振る舞いを根本から変えられます。
私は現在21個のSkillを運用していますが、そのうち16個は自作です。この記事では、Skillの構造から作り方、実際の運用で分かった育て方まで、一通り解説します。


 Skillの構造

 SKILL.mdファイルの中身
Skillファイルはこんな構造です。
---
name: my-skill-name
description: このスキルが何をするか、いつ使用するかの説明
---

# スキル名

## 手順
1. まず○○を確認する
2. 次に○○を実行する
3. 最後に○○で検証する

## 出力フォーマット
- ファイル形式: ○○
- 命名規則: ○○

## 注意事項
- ○○の場合は△△する
- ○○は禁止
冒頭の --- で囲まれた部分がYAMLフロントマターです。


name: スキルの識別子（小文字・ハイフン・数字のみ、最大64文字）。/name で呼び出す時の名前になる

description: 最重要フィールド。Claude Codeはこの説明文を読んで「この会話でこのスキルを使うべきか？」を自動判断する


フロントマターの後はMarkdownで「こうやってほしい」と書くだけです。

 フロントマターの全フィールド
公式ドキュメントに基づくフロントマターの全フィールドを整理します。



フィールド
必須
説明




name
No
表示名。省略するとディレクトリ名が使われる


description
推奨
何をするか・いつ使うか。Claudeの自動判断に使われる。省略するとMarkdownコンテンツの最初の段落が使われる。250文字で切り詰められるのでキーワードを前半に入れる



argument-hint
No
オートコンプリート時のヒント（例: [issue-number]）


disable-model-invocation
No

true で手動呼び出しのみに制限。副作用のあるSkill向け


user-invocable
No

false で / メニューから非表示。バックグラウンド知識向け


allowed-tools
No
Skill実行中に承認なしで使えるツールを事前許可（例: Read Grep Glob）。他のツールの使用を制限するものではない


model
No
Skill実行時に使用するモデル


effort
No
思考レベルの上書き（low / medium / high / max）


context
No

fork でサブエージェントコンテキストで実行


agent
No

context: fork 時のサブエージェントタイプ


hooks
No
Skillライフサイクルにフックを設定


paths
No
Globパターンで自動発動条件を限定


shell
No

bash（デフォルト）or powershell




正直、最初は name と description だけで十分です。使い込んでいくうちに disable-model-invocation や context: fork が欲しくなってきます。


 Skillの配置と読み込みの仕組み

 Personal と Project の2種類



配置場所
パス
適用範囲




Enterprise
マネージド設定で配布
組織全体


Personal
~/.claude/skills/<skill-name>/SKILL.md
全プロジェクト


Project
.claude/skills/<skill-name>/SKILL.md
そのプロジェクトのみ


Plugin
<plugin>/skills/<skill-name>/SKILL.md
プラグイン有効時



迷ったら、まずはPersonal（~/.claude/skills/）に置くのがおすすめです。どのプロジェクトでも使えるので汎用性が高い。チームで共有したいSkillはProject（.claude/skills/）に置いてGitでバージョン管理すると便利です。


 ディレクトリ構成
my-skill/
├── SKILL.md           # メインの指示（必須）
├── template.md        # テンプレート
├── examples/
│   └── sample.md      # 出力例
├── references/        # 参考ドキュメント
│   └── api-docs.md    # 必要時に読み込まれる
└── scripts/
    └── validate.sh    # 実行可能スクリプト
最初は SKILL.md だけで十分ですが、使い込んでいくとスクリプトやテンプレートを追加したくなります。
公式の /pptx スキルにはPDF回転やフォーム入力用のPythonスクリプトが scripts/ に入っていたりします。毎回コードを書き直す必要がなくなるので、安定した品質の出力が得られます。

 descriptionによる自動トリガー
Skillは /skill名 で手動呼び出しするだけでなく、descriptionの内容にマッチすると自動で発動します。
たとえば、descriptionに Use when deploying the application to production と書いておくと、ユーザーが「本番にデプロイして」と言っただけで、Claude Codeが自動的にそのSkillを使います。
だからこそ、descriptionは「何をするか」と「いつ使うか」の両方を具体的に書くことが重要です。


 $ARGUMENTS による引数渡し
---
name: fix-issue
description: GitHub Issueを修正する
disable-model-invocation: true
---

GitHub Issue $ARGUMENTS を修正してください。

1. Issueの内容を読む
2. 要件を理解する
3. 修正を実装する
4. テストを書く
5. コミットを作成する
/fix-issue 123 と打てば $ARGUMENTS が 123 に置換されます。$ARGUMENTS[0]、$ARGUMENTS[1] で複数引数にも対応。$0、$1 の短縮形も使えます。


 Skillの入手方法

 1. 公式プラグイン
Claude Codeには2つのAnthropic公式マーケットプレイスがあります。
claude-plugins-official（自動追加済み）
Claude Code起動時に自動で利用可能になるマーケットプレイスです。/plugin の Discover タブから閲覧・インストールできます。



プラグイン
用途




frontend-design

/frontend-design — フロントエンドUI設計


code-review
PRのコードレビュー


feature-dev
ガイド付き機能開発


各種LSPプラグイン
コード補完・型チェック（TypeScript, Python, Goなど）


各種連携プラグイン
GitHub, Slack, Sentry, Linearなど外部サービス連携



anthropic-agent-skills（手動追加）
Skill中心のマーケットプレイスです。以下のコマンドで追加します。
/plugin marketplace add anthropics/skills



プラグイン
含まれるSkill
用途




document-skills

/pptx, /xlsx, /pdf, /docx, /skill-creator, /frontend-design など
ドキュメント生成・Skill開発



個人的なおすすめは /xlsx です。CSVを渡して「グラフ付きのExcelにして」と言うだけで、フォーマット済みの .xlsx ファイルが出てきます。

 2. コミュニティ / GitHub
GitHubで「claude code skills」と検索すると、色々出てきます。
探す際のポイント：

スター数を確認する
最終更新日を確認する（Claude Codeの更新が速いので、古いものは動かないことがある）
READMEが充実しているか
実際の使用例があるか


 3. 自作（最終的にはここ）
最初は公式やコミュニティで十分です。でも使い込んでいくと「自分の仕事に特化したSkillがほしい」と感じるようになります。
私の自作Skill 16個の内訳はざっくりこんな感じです。


執筆系（6個）: 記事作成、X投稿生成、チャットログ整形、参考記事クリーンアップ

開発系（5個）: エンドポイントテスター、コードレビュー、設定検証

運用系（5個）: コンテンツ検証、リプライ生成、ブログテンプレート

毎週使っているのは5〜6個ですが、残りも月1回程度は出番があります。あるとないとでは作業効率が全然違います。


 自作Skillの設計と作成

 ステップ1：課題の特定
「何を自動化・効率化したいのか」を明確にします。
私の場合、ブログ記事を書くときに毎回同じことを指示していました。「一人称は『私』で」「ターゲット読者はこういう人」「起承転結で」「CTAを入れて」。これを毎回手で打つのが面倒だったのがきっかけです。

 ステップ2：プロンプトの構造化
繰り返している指示を整理します。

ターゲット読者は誰か
トーンや文体の指定
構成のルール
必須要素
禁止事項

これを箇条書きにするだけでOKです。

 ステップ3：/skill-creator で作成する
ここが一番大事なポイントです。Skillは手書きで作るのではなく、/skill-creator に作ってもらうのが正解です。
/skill-creator
/skill-creator は対話形式でヒアリングしてくれます。「どんな目的のスキルですか？」「ターゲットは？」「トーンの指定はありますか？」。ステップ2で整理した内容を答えていくと、正しいフォーマットのSKILL.mdを自動生成してくれます。

 /skill-creator の4つのモード
/skill-creator にはCreate以外にも便利なモードがあります。



モード
目的
やること




Create
Skillを新規作成
対話形式でヒアリング→SKILL.md生成


Eval
Skillをテスト
テストケースを作成してA/Bテスト


Improve
description最適化
失敗パターン分析→改善案を提案・適用


Benchmark
品質監視
Pass rate、実行時間、トークン数を計測



作る → テスト → 改善のサイクルをskill-creator 1つで回せます。

 ステップ4：Eval / Improve でテスト・改善
作ったSkillを実際に使ってみて、「ここが違うな」と思ったらEvalモードでテストケースを作ります。
Evalモードの内部では4つのサブエージェントがパイプラインで動きます。
Comparator（A/Bテスト） が特に面白くて、「Skillありの出力」と「Skillなしの出力」をブラインドで比較して、本当にSkillが効果を持っているかを定量的に確認してくれます。
正直に言うと、私のブログ記事作成Skillの評価はB+ でした。A+じゃないあたりが、まだ改善の余地があるということなんですが、「Skillなしの出力」と明確に差が出ていたので、効果自体は確認できました。
Improveモードでは、失敗パターンを分析してdescriptionの改善案を提案・適用してくれます。Anthropicの公式ブログによると、Improveモード適用後、公開されている6つのドキュメント作成スキルのうち5つでトリガー精度が改善したそうです。

 ステップ5：運用・メンテナンス（Benchmark モード）
Skillは作って終わりではありません。特に重要なのが、Claudeのモデルが更新されたときの品質チェックです。
Benchmarkモードでは以下の指標をトラッキングします。


Pass rate: テストケースのアサーション通過率（%）

Elapsed time: Skill実行にかかった時間（秒）

Token usage: 1回の実行で消費したトークン数

「モデルが進化してSkillが不要になった」場合もBenchmarkが検出してくれます。不要なSkillを抱え続けると、かえってClaude Codeのパフォーマンスが落ちることがあるので、引き算のメンテナンスも大事です。
日常の運用ルールとして、私はこうしています。

月1回くらいの頻度で「このSkill、まだ必要か？」と見直す
Claudeのモデル更新があったらBenchmarkを回す
新しい気づきがあったら随時追加する
使わなくなったSkillは削除する



 よくある失敗パターン
自作Skillで私がやらかした失敗パターンを共有しておきます。



失敗
原因
対策




詰め込みすぎ
1つのSkillに複数の役割を持たせた
1 Skill = 1目的に分割する


descriptionが曖昧
「便利なスキル」としか書かなかった
「何をするか」+「いつ使うか」を具体的に


テストしない
作って満足、使ってみない
Evalモードで必ず検証する


メンテナンスしない
モデル更新後に放置
定期的にBenchmarkを回す



特にdescriptionが曖昧だと、Claude Codeが「いつこのSkillを使うべきか」を判断できず、トリガーされないか、逆に関係ない場面でトリガーされてしまいます。


 知っておくと便利な仕組み

 動的コンテキスト注入
!`<command>` 構文でシェルコマンドの結果をSkillに注入できます。
---
name: pr-summary
description: PRの変更内容を要約する
context: fork
agent: Explore
---

## PRの情報
- PR diff: !`gh pr diff`
- PRコメント: !`gh pr view --comments`
- 変更ファイル: !`gh pr diff --name-only`

## タスク
このPRの変更内容を要約してください。


 context: fork でサブエージェント実行
context: fork をfrontmatterに追加すると、Skillがサブエージェントの独立コンテキストで実行されます。メインの会話履歴にはアクセスしません。
---
name: deep-research
description: コードベースを徹底調査する
context: fork
agent: Explore
---

$ARGUMENTS について徹底調査してください。

1. Glob と Grep で関連ファイルを探す
2. コードを読んで分析する
3. ファイルパスを含めた調査結果を要約する
調査結果の要約だけがメインセッションに返ってくるので、コンテキストが汚れません。トークン節約の観点でも有効です。


 私の運用環境 — 21個のSkillの使い分け
参考までに、私のSkill運用の全体像を共有します。



カテゴリ
個数
使用頻度
例




執筆系
6
週2〜3回
記事作成、X投稿生成、記事クリーンアップ


開発系
5
週1〜2回
エンドポイントテスト、設定検証、コードレビュー


運用系
5
月1〜2回
コンテンツ検証、リプライ生成


公式プラグイン
5
必要時

/pptx, /xlsx, /pdf, /skill-creator, /simplify




21個全部が毎日必要なわけではないです。でも、特定の作業に取りかかったとき「あ、あのSkillがある」と思えるのが大事で、ないときと比べると明らかに立ち上がりが速くなります。


 おわりに
Skillは「自分専用のClaude Code」を育てることに近いと感じています。
最初はぎこちない指示しかできなかったClaude Codeが、Skillを入れることで「こういうことね」と察してくれるようになる。一緒に仕事をしていくうちに阿吽の呼吸ができてくる感覚です。
ただし、完璧を目指すと挫折します。最初は name と description だけのシンプルなSKILL.mdで十分。使いながら育てていくのが一番のコツです。
今日やること： /skill-creator でSkillを1つ作って、Evalモードで評価してみてください。自分の仕事に特化したSkillが1つあるだけで、Claude Codeとの付き合い方が変わるはずです。

以前書いた「Claude Codeのトークン消費を半減させる5フェーズ運用術」の中で「CLAUDE.mdからSkillに移動する」というテクニックを紹介しましたが、Skillの作り方・育て方はこの記事で解説した通りです。Skillの活用事例（pptx・xlsx・pdfなど）についても別途記事にまとめる予定です。
この記事の内容は2026年4月時点のClaude Code公式ドキュメントに基づいています。
公式ドキュメント: https://code.claude.com/docs/en/skills
