# Claude Code の Dynamic Workflows を理解する — Subagents / Skills との違いと実務での使い
- **Source URL**: https://zenn.dev/akasara/articles/ccfb2f7a5174e0
- **Score**: 85
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #AIエージェント
- **Processed Date**: 2026/9/19

---

## 本文
はじめに
Claude Code で Subagents や Skills を使い始めると、次にぶつかるのが 「大きなタスクをどう分割し、どう検証し、どう再利用するか」 という問題です。
1ファイルの修正なら、通常の Claude Code で十分です。
しかし、リポジトリ全体の認証チェック、数百ファイル規模のマイグレーション、SEO記事群の一括レビュー、設計判断の反証のようなタスクでは、1回の会話や1人のエージェントだけでは見落としが起きやすくなります。
そこで登場したのが Dynamic Workflows（動的ワークフロー） です。
Dynamic Workflows は、ひとことで言うと 「Claude がその場でオーケストレーション用の JavaScript を書き、そのスクリプトが複数のサブエージェントを並列に動かし、互いに検証させたうえで最終結果だけを返す」 仕組みです。
2026年5月28日に Claude Opus 4.8 とあわせて Claude Code に追加され、現時点では research preview として提供されています。

この記事では、公式ドキュメント（Claude Code Docs: dynamic workflows、Introducing dynamic workflows）をもとに、Dynamic Workflows の仕組み・使い方・制限を整理しつつ、特に 「どんな実務タスクで使うべきか」 をユースケース別に紹介します。



 この記事でわかること
この記事では、Dynamic Workflows について次の観点を整理します。

Dynamic Workflows が何を解決する機能なのか
Subagents / Skills / Hooks との違い
どんなタスクに向いていて、どんなタスクには向かないのか

/deep-research、workflow、/effort ultracode の使い分け
実行時の権限・コスト・保存・再利用の注意点
セキュリティ監査、デッドコード調査、マイグレーション、SEOレビュー、設計レビューなどの具体的なユースケース

「新機能として何ができるか」だけでなく、Claude Code を実務で使うとき、どこに Dynamic Workflows を組み込むべきか が見える構成にしています。


 Dynamic Workflows とは何か
通常の Claude Code では、メインの Claude が会話の文脈の中で「次に何をするか」をターンごとに判断します。
中間結果はすべて Claude のコンテキストに積み上がっていきます。
一方、Dynamic Workflows では、その計画部分が スクリプト になります。
流れは次のようなイメージです。
ユーザーが大きなタスクを依頼する
  ↓
Claude が依頼内容を分析する
  ↓
Claude が JavaScript のオーケストレーションスクリプトを生成する
  ↓
ワークフローランタイムがスクリプトをバックグラウンドで実行する
  ↓
スクリプトが複数のサブエージェントを並列に起動する
  ↓
各エージェントが調査・編集・レビュー・検証を担当する
  ↓
別のエージェントが結果を反証・クロスチェックする
  ↓
検証済みの最終結果だけがセッションに返る
公式ドキュメントでは、ワークフローは 「サブエージェントを大規模にオーケストレーションする JavaScript スクリプト」 と説明されています。
重要なのは、Dynamic Workflows が単なる「並列実行機能」ではないことです。
本質は、次の3つです。

広い対象を分割する
独立した観点で調べる
別のエージェントに反証させてからまとめる

つまり、Dynamic Workflows は「Claude をたくさん動かす機能」ではなく、大きなタスクを分割・検証・再利用するための実行エンジン と考えると理解しやすいです。


 なぜ必要なのか：single-pass の限界
Claude Code は強力ですが、1回の依頼で何でも正確にできるわけではありません。
特に、レガシーで複雑なコードベースや、記事数の多いドキュメント群では、1人のエージェントが1回で全体を見切るには大きすぎる問題があります。
従来の Subagents / Skills だけで大きなタスクを扱うと、主に次の限界が出ます。

 1. コンテキストが圧迫される
サブエージェントの結果がすべてメインの Claude のコンテキストに戻るため、対象が広いほどトークンを消費します。
途中結果が多いほど、最終判断に必要な情報が埋もれやすくなります。

 2. 計画が会話に縛られる
従来は、Claude が会話の流れの中で「次に何をするか」を判断します。
そのため、大きなタスクでは途中で方針がブレたり、再開時に同じ調査を繰り返したりしやすくなります。

 3. 再利用しづらい
その場の会話で進めた調査や改修は、同じ手順をもう一度回すのが難しくなります。
たとえば「毎月、記事群の品質チェックをしたい」「リリース前に同じ観点でPRレビューしたい」といった場合、手順を再現しにくいのが課題です。
Dynamic Workflows は、計画を JavaScript のスクリプトとして持つことで、これらの問題を緩和します。
中間結果はスクリプト変数に保持され、Claude のコンテキストには最終的な要約や結果だけが戻ります。


 Subagents / Skills / Hooks / Dynamic Workflows の違い
Claude Code をすでに使っている人にとって、Dynamic Workflows は既存の仕組みを置き換えるものではありません。
むしろ、次のように役割を分けて考えると整理しやすいです。
CLAUDE.md
  = プロジェクト全体の前提・ルール

Skills
  = 再利用する専門手順

Subagents
  = 個別タスクを担当する作業者

Hooks
  = 必ず実行されるガードレール

Dynamic Workflows
  = 多数の作業者を束ねる大規模実行エンジン
比較すると次のようになります。



仕組み
役割
計画を持つ場所
向いていること




CLAUDE.md
常に読ませたい前提・ルール
プロジェクト設定
コーディング規約、禁止事項、環境情報


Skills
再利用可能な手順書
Claude のコンテキスト
定型作業、専門タスクの手順化


Subagents
専門の作業者
Claude のコンテキスト
調査、レビュー、編集などの分担


Hooks
強制的なガードレール
Claude Code の実行前後
テスト、lint、禁止コマンド制御


Dynamic Workflows
大規模オーケストレーション
スクリプト
広範囲・多観点・反証つきの実行



最大の違いは、計画を誰が持つか です。
Subagents や Skills では、Claude がオーケストレーターです。
どの作業者を呼ぶか、次に何をするかは、Claude が会話の流れの中で判断します。
Dynamic Workflows では、オーケストレーションがスクリプト側に移ります。
そのため、ループ・分岐・中間結果・レビュー手順を、より明示的に扱えます。

 参考書籍
本記事では Dynamic Workflows を中心に扱いましたが、その前提として Subagents や Skills をどう設計するか を理解しておくと、Claude Code 全体の見通しがかなりよくなります。
特に Skills は、単なるプロンプトの保存ではなく、AIエージェントに「この作業はこう進める」という手引きを渡すための仕組みです。Dynamic Workflows が複数の作業者を束ねる実行エンジンだとすれば、Skills はその作業者に渡す再利用可能な手順書に近い位置づけです。
『Claude Codeで学ぶ Agent Skills入門』（佐藤 亮）

Agent Skills の基礎、公式スキルやサードパーティ製スキルの使い方、さらに skill-creator を使った独自スキルの作成・配布までを扱った一冊です。
Claude Code を「その場のチャットで便利に使う」段階から、自分用・チーム用の作業手順をスキル化して再利用する 段階に進みたい人には、Dynamic Workflows とあわせて読んでおくと理解しやすい内容です。

 使うべき場面・使わない方がいい場面
Dynamic Workflows は強力ですが、すべての作業に使うものではありません。
むしろ、普段使いには重いです。
判断の目安は次のとおりです。



判断軸
Dynamic Workflows 向き
通常の Claude Code / Skills 向き




対象範囲
リポジトリ全体、記事群全体、数十〜数百ファイル
1〜数ファイル


観点
セキュリティ、性能、保守性、SEOなど複数
単一の修正・説明


検証
独立レビューや反証が必要
自分で確認すれば足りる


再利用
同じ監査やレビューを繰り返したい
その場限り


コスト
トークンを多く使っても価値がある
低コストで素早く済ませたい


失敗時の影響
見落としが大きな問題になる
すぐ直せる小さな問題



迷ったときは、次の4つで判断するとよいです。
1. 対象が広いか
2. 観点が複数あるか
3. 独立レビューが必要か
4. 同じ手順を再利用したいか
このうち2つ以上に当てはまるなら、Dynamic Workflows を検討する価値があります。
逆に、1ファイルのバグ修正、短い文章のリライト、小さなコマンド確認程度なら、通常の Claude Code の方が向いています。


 3つの起動方法
Dynamic Workflows の起動方法は主に3つあります。


 1. /deep-research を使う
いちばん手早く試せるのが、Claude Code に標準同梱されている /deep-research です。
/deep-research What changed in the Node.js permission model between v20 and v22?
複数の角度で Web 検索を行い、ソースを取得し、相互にクロスチェックしたうえで、引用付きのレポートを返します。
クロスチェックを通らなかった主張は除外されます。



 2. プロンプトに workflow という単語を含める
単発のタスクをワークフローとして走らせたい場合は、プロンプトに workflow という単語を入れます。
Run a workflow to audit every API endpoint under src/routes/ for missing auth checks.
Claude Code が入力中の workflow をハイライトし、その依頼を通常のターン処理ではなく、ワークフロースクリプトとして扱います。
意図せずトリガーされた場合は、alt+w でそのプロンプトだけ無視できます。


 3. /effort ultracode を使う
ultracode は、xhigh の reasoning effort と自動ワークフローオーケストレーションを組み合わせた Claude Code の設定です。
/effort ultracode
有効にすると、こちらが明示しなくても Claude が「このタスクはワークフロー化すべきか」を判断します。
たとえば、次のような依頼では、Claude が複数のワークフローに分割する可能性があります。
コードベース全体を調査して、認証周りの問題を見つけ、修正案を出して、テスト方針まで整理して
この場合、内部的には次のように分かれるかもしれません。
1. コードベース理解
2. 認証・認可の監査
3. 修正案の生成
4. リスクレビュー
5. テスト方針の整理
ただし、ultracode はセッション内のタスク全体に影響します。
普段の軽い作業ではトークン消費が大きくなりやすいので、必要なときだけ有効にするのが無難です。



 実行を承認する
ワークフローを起動すると、CLI では実行前に計画されたフェーズと選択肢が表示されます。
主な選択肢は次のとおりです。


Yes, run it：実行する

Yes, and don't ask again for <name> in <path>：このプロジェクトの当該ワークフローについて今後尋ねない

View raw script：実行前にスクリプトを読む

No：キャンセル

Ctrl+G でスクリプトをエディタで開けます。
Tab で実行前にプロンプトを調整できます。
このプロンプトが出るかどうかは、permission mode によって変わります。



Permission mode
尋ねられるタイミング




Default / accept edits
毎回。ただし「Yes, don't ask again」を選んだ場合を除く


Auto
初回起動のみ。ultracode がオンのときは完全にスキップ


Bypass permissions / claude -p / Agent SDK
尋ねられない。即座に実行が始まる





 権限とセキュリティ
実務で使う場合、このセクションはかなり重要です。
permission mode が制御するのは、主に ワークフロー起動時の確認 です。
ワークフローが起動するサブエージェントは、セッションのモードに関わらず acceptEdits モードで動作し、ツール allowlist を継承します。
つまり、ファイル編集は自動承認されます。
一方で、allowlist に入っていない次のような操作は、途中で確認を求められる可能性があります。

シェルコマンド
Web フェッチ
MCP ツール
外部サービスへのアクセス

長時間のワークフローで途中停止したくない場合は、必要なコマンドやツールを事前に allowlist へ追加しておく必要があります。
特に、claude -p のような非対話モードや Agent SDK で使う場合は注意が必要です。
尋ねる相手がいないため、ツール呼び出しは設定された permission ルールに従ってそのまま進みます。


 ワークフローの実行モデル
ワークフローランタイムは、会話とは分離された隔離環境でスクリプトを実行します。
中間結果は Claude のコンテキストには入らず、スクリプト変数に保持されます。
そのため、会話側には最終的な要約や結果だけが返ります。

 実行中の確認と管理
ワークフローはバックグラウンドで動くため、実行中もセッションは応答可能です。
進行状況は /workflows で確認できます。
/workflows
進行ビューでは、各フェーズの次の情報を確認できます。

エージェント数
累計トークン
経過時間
実行中／完了済みの状態

主な操作キーは次のとおりです。



キー
操作





↑ / ↓

フェーズ／エージェントを選択



Enter, →

フェーズからエージェントへドリルダウン


Esc
1階層戻る


p
実行を一時停止／再開


x
選択中のエージェント、またはワークフロー全体を停止


r
選択中の実行エージェントを再起動


s
実行したスクリプトをコマンドとして保存





 一時停止からの再開
実行を止めた場合、同じセッション内であれば再開できます。
すでに完了したエージェントはキャッシュ結果を返し、残りのエージェントがライブで走ります。
再開方法は主に2つです。


/workflows で対象を選び、p を押す
Claude に同じスクリプトで再起動するよう依頼する




 ワークフローの保存・再利用
繰り返し使うワークフローは、実行したスクリプトをコマンドとして保存できます。
/workflows で対象を選んで s を押し、保存先を Tab で切り替えます。


.claude/workflows/：プロジェクト内に保存。リポジトリをクローンした全員と共有できる

~/.claude/workflows/：自分のホームに保存。全プロジェクトで使えるが自分だけに見える

保存すると、次回以降は次のように実行できます。
/<name>
/deep-research などの組み込みワークフローと同じように、/ の補完にも表示されます。
同名のプロジェクトワークフローと個人ワークフローがある場合は、プロジェクト側が優先されます。


 設定手順
ここからは、実際に Dynamic Workflows を使えるようにするまでの手順です。

 手順1：バージョンを確認する
Dynamic Workflows を使うには、Claude Code v2.1.154 以降が必要です。
claude --version
古い場合は更新します。
claude update


 手順2：/config で Dynamic workflows を有効化する
Claude Code を起動し、/config を開きます。
/config
設定一覧の中にある Dynamic workflows 行を選び、有効化します。
Max / Team / Enterprise プランや API 利用では既定で使えますが、Pro プランの場合は /config から有効化が必要です。



 手順3：/effort で ultracode が出るか確認する
Claude にワークフロー化すべきか自動判断させたい場合は、/effort メニューを開きます。
/effort
xhigh をサポートするモデルを選んでいる場合、メニューに ultracode が表示されます。
表示されない場合は、/model でモデルを切り替えてから再度確認します。


 使用手順
設定ができたら、まずは小さめのタスクで試すのがおすすめです。
いきなりリポジトリ全体や数千ファイルを対象にすると、トークン消費が大きくなります。
最初はディレクトリや観点を絞って、どのくらいの規模で動くのかを確認すると安全です。


 手順1：ワークフローを起動する
例として、APIルート配下の認証チェック監査を依頼します。
Run a workflow to audit every API endpoint under src/routes/ for missing auth checks.
Claude Code が workflow を検知し、このタスク用のワークフロースクリプトを生成します。


 手順2：実行を承認する
スクリプトが用意されると、計画されたフェーズと承認の選択肢が表示されます。
確認して問題なければ Yes, run it を選びます。
中身を先に確認したい場合は View raw script を選びます。


 手順3：/workflows で進行を監視する
実行はバックグラウンドで進みます。
進行状況は /workflows で確認できます。
/workflows
フェーズを選ぶと、個々のエージェントまでドリルダウンできます。


 手順4：スクリプトを保存する
繰り返し使えそうなワークフローは、/workflows で対象を選んで s を押すと保存できます。
保存後は、次回以降 /<name> で実行できます。


 ユースケース別：Dynamic Workflows が効く場面
ここからが実務でいちばん重要な部分です。
Dynamic Workflows は、単に「多数のエージェントを並列に動かす機能」ではありません。
本質は、広い対象を分割し、独立した観点で調べ、さらに別のエージェントに反証させてから最終結果にまとめること です。
そのため、1ファイルの修正や小さな質問には向きません。
一方で、対象が広く、観点が多く、間違えると影響が大きい作業では強力です。


 ユースケース1：コードベース全体のセキュリティ監査
Dynamic Workflows が最もわかりやすく効くのは、コードベース全体にまたがるセキュリティ監査です。
たとえば API エンドポイントごとに、次のような観点を別々のエージェントに調べさせます。

認証ミドルウェアが抜けていないか
ロールやスコープの確認が正しいか
トークン検証に抜けがないか
入力値検証が不足していないか
エラー時に情報を出しすぎていないか
ログに秘密情報を出していないか

さらに、別のエージェントに「その指摘は本当に問題か」「誤検知ではないか」を反証させます。
Run a workflow to audit the entire codebase for API security issues.

Split the workflow into independent agent groups:
- authentication checks
- authorization / role / scope checks
- token validation
- input validation
- unsafe logging or secret exposure
- inconsistent error handling

For each finding, require an independent reviewer agent to challenge whether it is a real issue or a false positive.

Return:
1. confirmed issues
2. likely false positives
3. affected files
4. severity
5. recommended fixes
この用途では、単に「問題を探して」と頼むよりも、認証・認可・入力検証・ログ・エラー処理 のように観点を分けるのが重要です。


 ユースケース2：デッドコード・技術的負債の棚卸し
使われていない関数、古い設定、参照されていないコンポーネント、不要な feature flag などを洗い出す用途にも向いています。
この手の調査は、単純な grep や静的解析だけでは誤検知が多くなります。
たとえば、関数名が直接呼ばれていなくても、ルーティング設定や動的 import、テスト、ドキュメントから参照されている場合があります。
そこで、観点を分けます。
Run a workflow to find dead code and cleanup opportunities in this repository.

Use separate agents to inspect:
- unused functions and classes
- unused components
- stale configuration files
- deprecated feature flags
- routes or API handlers no longer referenced
- tests that refer to removed behavior
- documentation references

Require reviewer agents to verify each deletion candidate.

Return candidates grouped by:
- safe to remove
- needs manual review
- do not remove
ポイントは、削除候補をすぐ消させないことです。
まずは safe to remove / needs manual review / do not remove に分類させると安全です。


 ユースケース3：大規模マイグレーション
deprecated API の置き換え、フレームワーク移行、設定ファイル形式の変更など、複数ファイルにまたがる移行にも使えます。
たとえば、古い logging API を新しい API に置き換える場合、単純な一括置換では危険です。
実装コード、テスト、型、ドキュメント、互換性リスクを分けて見た方が安全です。
Run a workflow to migrate all files under src/ from the deprecated logging API to the new one.

Use separate agents for:
- finding all usages
- updating implementation code
- updating tests
- checking backward compatibility
- reviewing risky changes
- updating documentation if needed

Do not modify files until the workflow has produced a migration plan.
After the plan, apply changes in small batches and run tests after each batch.

Return:
1. migration plan
2. per-file change summary
3. risky files
4. tests to run
5. manual follow-up items
大規模マイグレーションでは、いきなり全ファイルを編集させるより、まず 移行計画を出させる のがおすすめです。


 ユースケース4：PRマージ前の重いレビュー
通常のPRレビューは、1人の Claude でもできます。
しかし、大きいPRでは観点が散らばりやすく、見落としが起きます。
特に次のようなPRでは、Dynamic Workflows が向いています。

API変更がある
DB変更がある
認証・認可に関わる
フロントエンドとバックエンドの両方を触っている
テストやドキュメント更新も含む
運用影響がある

Run a workflow to review the current branch before merge.

Split review agents by:
- API compatibility
- database migration risk
- security regression
- performance regression
- test coverage
- operational impact
- documentation updates

Each finding must include:
- file path
- why it matters
- confidence level
- suggested fix
- whether it blocks merge

Have independent reviewer agents challenge high-severity findings.
「マージしてよいか」を判断したい場合は、最後に blocks merge / should fix soon / non-blocking のように分類させると実務で使いやすくなります。


 ユースケース5：設計判断のレビュー・反証
Dynamic Workflows は、コードを書いた後だけでなく、設計段階にも使えます。
たとえば、次のような判断です。

Redis を導入すべきか
認証を API Gateway 側に寄せるべきか
モノリスを分割すべきか
Feature flag を導入すべきか
管理画面を別サービスに切り出すべきか
キャッシュをアプリ側に持つべきか、Gateway側に寄せるべきか

このような問題は、単純な正解がありません。
性能、運用、障害時の挙動、セキュリティ、コスト、保守性のバランスで決まります。
Run a workflow to evaluate this architecture decision from multiple independent perspectives.

Decision:
Should we introduce Redis for session/cache handling in this service?

Create independent agents for:
- performance benefits
- operational complexity
- failure modes
- security implications
- cost and maintainability
- alternatives without Redis
- migration and rollback plan

Then create adversarial reviewer agents to challenge each position.

Return:
1. recommended decision
2. conditions where the decision changes
3. risks
4. migration plan
5. rollback plan
6. questions we must ask the application team
この用途では、賛成意見だけでなく、反対意見も強制的に出させる のが重要です。


 ユースケース6：社内ドキュメント・Runbook の整合性チェック
運用手順書や Runbook のレビューにも向いています。
たとえば、Kubernetes、Kong、API Gateway、認証基盤などの手順書では、次のような問題が起きがちです。

コマンドが古い
環境名が混在している
前提条件が抜けている
本番で実行してはいけないコマンドが混ざっている
失敗時の戻し手順がない
障害時の判断基準が曖昧
手順書同士で説明が矛盾している

Run a workflow to audit all operational runbooks under docs/runbooks/.

Check for:
- outdated commands
- missing prerequisites
- inconsistent environment names
- missing rollback steps
- unclear failure handling
- commands that could affect production
- contradictions between documents

Have reviewer agents validate each issue.

Return:
1. high-risk issues
2. missing rollback procedures
3. unclear steps
4. suggested rewritten sections
5. questions for the operations team
Runbook では、正しさだけでなく 「本番で人が迷わず実行できるか」 が重要です。
その観点をプロンプトに入れると、指摘の質が上がります。


 ユースケース7：ブログ・SEO記事の一括レビュー
Dynamic Workflows はコードだけでなく、Markdown記事やSEO記事のレビューにも使えます。
たとえば、ブログ記事が数十〜数百本ある場合、1本ずつ手でレビューするのは大変です。
また、単発の Claude レビューだと、記事ごとに評価軸がブレやすくなります。
Dynamic Workflows なら、次のような観点を分けて一括レビューできます。

事実が古くないか
検索意図に答えているか
見出し構造が自然か
導入文が読者に刺さるか
表や図解がわかりやすいか
記事同士が重複していないか
アフィリエイト感が強すぎないか
結論ファーストが不自然な記事がないか
初心者に難しすぎる表現がないか

Run a workflow to review all Markdown articles under content/.

Split agents by review perspective:
- factual freshness
- search intent coverage
- title and heading structure
- readability for beginners
- intro and conclusion quality
- table and figure usefulness
- duplicate or overlapping articles
- excessive promotion or affiliate tone

Have reviewer agents challenge each recommendation.

Return:
1. high-priority fixes
2. medium-priority improvements
3. articles that should be merged
4. articles that need factual updates
5. articles where the intro should be changed to an article-introduction style lead
この使い方は、技術ブログだけでなく、SEOサイト、社内ナレッジ、製品ドキュメントにも応用できます。


 ユースケース8：調査レポートのクロスチェック
Dynamic Workflows は、調査系のタスクにも向いています。
たとえば、新しいフレームワーク、クラウドサービス、ライブラリ、料金体系、セキュリティ仕様などを調べるとき、1つのソースだけでは危険です。
Run a workflow to research the current status of this technology.

Topic:
<調査したいテーマ>

Use separate agents to:
- find official documentation
- find release notes
- find known limitations
- find migration guides
- find community reports
- identify conflicting claims

Require cross-checking between sources.
Do not include claims that are not supported by reliable sources.

Return:
1. confirmed facts
2. uncertain or conflicting points
3. practical implications
4. recommended next actions
5. source list
特に技術記事を書く場合は、公式ドキュメント・リリースノート・実例・制限事項 を分けて調べさせると、記事の信頼性が上がります。


 ユースケースを設計するときのプロンプト型
Dynamic Workflows 用のプロンプトは、普通の依頼よりも 分担と検証 を明示するとよいです。
基本形は次のようになります。
Run a workflow to <目的>.

Scope:
<対象範囲>

Split agents by:
- <観点1>
- <観点2>
- <観点3>
- <観点4>

For each finding, require independent reviewer agents to challenge:
- whether the issue is real
- whether it is a duplicate
- whether the severity is appropriate
- whether the proposed fix is safe

Return:
1. confirmed findings
2. likely false positives
3. prioritized actions
4. affected files or URLs
5. open questions
特に重要なのは、次の3つです。


Scope を絞る
いきなり全体を対象にせず、まずはディレクトリ・URL・機能単位で絞る


観点を分ける
「全部見て」ではなく、認証、性能、テスト、ドキュメントなどに分ける


反証させる
指摘を出すだけでなく、別エージェントに誤検知や過剰指摘をチェックさせる




 コスト管理
ワークフローは多数のエージェントを起動するため、同じタスクを通常の会話でこなすよりもトークンを多く使います。
実行はプランの使用量・レート制限にカウントされます。
まずは小さく試すのがおすすめです。
悪い例:
Run a workflow to audit the entire repository.

良い例:
Run a workflow to audit src/routes/ for missing authentication and authorization checks.
コストを抑えるコツは次のとおりです。

最初は対象ディレクトリを絞る
観点を3〜5個程度に絞る
まず調査だけさせ、編集は後段に分ける
高性能モデルが必要な段階と、軽量モデルでよい段階を分ける

/workflows で進行を見て、不要なら早めに停止する
保存したワークフローは、実行前にスクリプトや対象範囲を確認する

500エージェント規模の監査で高性能モデルを使うかどうかは、使用量に大きく影響します。
最初から最大規模で走らせず、小さいスコープで消費感をつかむのが安全です。


 制限と注意点
research preview ということもあり、制限はあります。



項目
内容




ステータス
research preview。正式安定版ではない


トークン消費
通常の Claude Code セッションより多くなりうる


並列上限
最大 16 同時エージェント。CPUコアが少ない環境ではより少ない場合がある


総エージェント数
1回あたり最大 1,000 エージェント


実行中のユーザー入力
不可。途中で止まるのは主に権限プロンプト


段階承認
段階ごとに承認したい場合は、ワークフローを分ける


ワークフロー本体
スクリプト自体は直接ファイル操作やシェル実行をしない。実際の操作はエージェントが行う


中断復帰
同一セッション内のみ再開可能。Claude Code を終了すると次回は最初から



特に注意したいのは、大きなタスクを1本のワークフローに詰め込みすぎないこと です。
たとえば、次のように分けた方が安全です。
1. 調査ワークフロー
2. 修正計画ワークフロー
3. 小さな範囲の実装ワークフロー
4. テスト・レビュー用ワークフロー
一気通貫でやらせるより、重要な境界で人間が確認した方が、実務では扱いやすくなります。



 まとめ
Dynamic Workflows は、Claude Code における 大規模タスク用のオーケストレーション機能 です。
ポイントを整理すると、次のようになります。

Claude が JavaScript のオーケストレーションスクリプトを書き、複数のサブエージェントを並列に実行する
Subagents / Skills との最大の違いは、計画が Claude の会話ではなくスクリプト側に移ること

中間結果はスクリプト変数に保持され、Claude のコンテキストには最終結果だけが返る
単なる並列実行ではなく、分割・独立レビュー・反証・再利用 が本質
普段の小さな修正には重いが、リポジトリ全体の監査、大規模マイグレーション、多観点レビューには向いている
起動方法は /deep-research、プロンプト内の workflow、/effort ultracode の3つ
research preview のため、仕様変更・トークン消費・権限設定には注意が必要

Dynamic Workflows を使うべきか迷ったら、次の4つを確認するとよいです。
対象が広いか
観点が複数あるか
独立レビューが必要か
同じ手順を再利用したいか
この条件に当てはまるなら、Dynamic Workflows は強力な選択肢になります。
逆に、1ファイルの修正や短い文章のリライトなら、通常の Claude Code や Skills の方が向いています。
まずは、リポジトリ全体ではなく、src/routes/ や content/ のように範囲を絞った小さなワークフローから試すのがよいでしょう。
そのうえで、うまくいったワークフローを保存し、プロジェクトのレビュー・監査・記事改善の定型プロセスとして育てていくのが現実的です。


 参考

Introducing dynamic workflows in Claude Code（公式ブログ）
Orchestrate subagents at scale with dynamic workflows（公式ドキュメント）
Introducing Claude Opus 4.8
