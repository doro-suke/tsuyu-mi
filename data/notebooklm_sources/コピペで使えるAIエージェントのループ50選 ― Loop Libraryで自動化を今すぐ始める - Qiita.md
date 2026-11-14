# コピペで使えるAIエージェントのループ50選 ― Loop Libraryで自動化を今すぐ始める - Qiita
- **Source URL**: https://qiita.com/nogataka/items/c16ce85f625be66f9796
- **Score**: 85
- **AI Summary**:
  - AIエージェントの自律ループを実装する50のテンプレートと安全設計原則を提示
  - 各ループは検証と停止条件を重視し、自己採点の罠や暴走を防ぐ共通構造で定義されている
  - 既存ループの監査機能や、承認ゲート・終端状態の設計手順を網羅し即時適用が可能
- **Read Now Reason**: AI駆動開発や自動化パイプライン構築において不可欠な、エージェントの「暴走・コスト爆発を防ぐ停止条件」や「検証(Verify)の客観性設計」が具体的に提示されており、実装設計に即座に反映できるため。
- **Suggested Tags**: #AIエージェント, #自動化パイプライン, #プロンプトエンジニアリング, #システム設計
- **Processed Date**: 2026/6/30

---

## 本文
はじめに
AIに仕事を任せて自動で回す「ループ」。その作り方が分かっても、自分でゼロから組むのは骨が折れそう、と感じるかもしれません。
実は、よくあるループはすでに50本が公開されています。
コピーして、自分用に少し調整するだけで始められます。
それを集めたのが「Loop Library」です。本記事は、その使い方をループの実践編として紹介します。
Loop Library は Forward Future によるプロジェクトで、エンジニアリングから運用・評価まで50本のループを公開しています。
リポジトリは次のとおりです。

公開サイト（カタログ本体）はこちらです。

読むと得られるものは、次の3つを想定しています。

Loop Library が「サイト」と「スキル」の2部構成であることが分かる
50本のループがどんなカテゴリで、どんな構造を持つかが分かる
自分のエージェント（Claude Code / Codex / Cursor）から探して使う手順が分かる

対象読者は、ループを実際に試したい方、もしくは既存の自動化を一段進めたい開発者です。
ループという考え方そのものを詳しく知りたい方向けの記事は、末尾の参考文献に挙げています。

本記事は Loop Library の公開リポジトリ・カタログ（2026年6月21日時点・50ループ）と公式ドキュメントを一次情報として参照しています。
各ループの名称・カテゴリ・件数はカタログの記述に依拠しています。
構成と要約の整理には生成AI（Claude）を併用し、内容は筆者が確認しました。
仕様は更新され得るため、利用時は最新のカタログとリポジトリをご確認ください。


先に結論（この記事の要点）

Loop Library は「公開ループのカタログ（サイト）」と「それを対話的に扱うスキル」の2部構成です。サイトだけでも使えます。
50ループは Engineering / Evaluation / Operations / Content / Design の5カテゴリに分かれています。
各ループは「Use when・Prompt・Verify・Steps・Why・Note・Related」という共通の構造を持ちます。
スキルには Find / Loop Doctor / Adapt / Design の4つの使い方があります。探す・直す・合わせる・設計する、です。
重要な前提があります。ループを「選ぶ」ことと「実行する」ことは別です。破壊的操作や本番変更は別途あなたの許可が要ります。


Loop Library とは ― 2部構成を押さえる
最初に全体像です。
Loop Library は、別々だが関連する2つの部分でできています。


ウェブサイト（カタログ本体）: 公開ループを誰でも閲覧でき、プロンプトをコピーできます。インストール不要です。

スキル（任意インストール）: エージェントがループを探す・監査する・直す・合わせる・設計するのを対話で助けます。推奨時はサイトの最新カタログを参照します。

サイトが図書館本体で、スキルはその使い方を助ける司書、という関係です。
スキルを入れなくても、サイトをエージェントに渡せば使えます。
スキルを入れると、対話的なワークフローが足されます。

リポジトリの構成 ― サイトとスキルの中身
GitHub リポジトリは、サイトとスキルの両方を含みます。
主な構成は次のとおりです。



パス
役割




README.md
プロジェクト説明・インストール・使い方


AGENTS.md
メンテナ向けの運用規約（ループ追加手順・生成物の整合・フォームのセキュリティ・デプロイ）


scripts/loop-data.mjs
全公開ループの正本（source of truth）となるカタログデータ


scripts/build-*.mjs
カタログ・各ループ詳細ページ・OGP画像・スキル用カタログの生成


scripts/check.mjs
生成物どうしのドリフト（不整合）を検出する整合チェック


site/
公開される静的サイトと各形式のカタログ（json / md / txt）


skills/loop-library/
インストール可能なスキル本体（SKILL.md と参照ドキュメント）


worker/
フォーム投稿を処理する Cloudflare Worker



正本は scripts/loop-data.mjs です。
ここを変えると、生成スクリプトがサイトと各カタログをまとめて作り直します。
人間向けのサイトと、エージェント向けのカタログが、同じ正本から生成される仕組みです。

そもそも「ループ」とは（1行のおさらい）
ループの定義を1行でおさらいします。
ほとんどのプロンプトは「1回やって終わり」ですが、ループは結果から学んで次の一手を取れる仕組みでした。
Loop Library は、良いループを「4つの問いに答えるもの」と定義しています。

エージェントは何を達成しようとしているか
直近の試行が効いたかをどう判断するか
学んだことをどう扱うか
いつ終える、または人に助けを求めるか

この4つは、ループの5要素（トリガー / アクション / 証明 / メモリ / 停止条件）と地続きです。
Loop Library が強調するのは、ループは「永遠に走る許可」ではない、という点です。
良いループは意図的に有界で、本物のチェックと明確な停止点を持ちます。

カタログの全体像 ― 50ループ・5カテゴリ
公開ループは50本です。
カテゴリ別の内訳は次のとおりです。



カテゴリ
本数
主な狙い




Engineering
24
docs / test / 性能 / 整理など、コードベースの自己保守


Evaluation
11
自己採点の罠を構造的に潰す評価


Operations
7
リリース・データ品質・復旧・督促などの運用


Content
2
SEO/GEO・製品アップデートの発信


Design
6
見た目・UX・アクセシビリティの再現可能な検査



カテゴリの多くがエンジニアリングですが、PM・運用・デザインまで射程が広いのが特徴です。
PMの「週次の状況把握」に近いものも、Operations や Evaluation に含まれています。

各ループの構造 ― 共通フォーマット
50本すべてが、同じ構造で記述されています。
ここが Loop Library の使いやすさの肝でした。


Use when: そのループが解く問題（いつ使うか）

Prompt: コピーしてすぐ使える指示文

Verify: 成功を証明する証拠の定義

Steps: フィードバック・サイクルを読みやすく分解したもの

Why: なぜ効くか

Note: 実務上の制約・リスク・前提

Related: 近い別ループへの導線

例として、1本目の「The docs sweep」を見ます。
Use when: 実装変更で README・セットアップ・APIリファレンス・例・runbook が
          取り残された可能性があるとき
Prompt:   ドキュメントパスが必要なときは、コードベース全体をレビューし、
          全ドキュメントを現在の実装に合わせる。古い記述を更新し、
          変更を検証し、PRを開く
Verify:   ドキュメントが現実装と一致。レビュー可能なPRで締める

注目したいのは、どのループにも必ず Verify（証明）と停止の考え方が入っている点です。
ループでは「弱い検証役が一番高くつくバグ」とよく言われます。
Loop Library のループは、その検証役を最初から組み込んだ形で配られています。

スキルの4つの使い方 ― Find / Loop Doctor / Adapt / Design
ここからがスキルの中核機能です。
ループの用語を知らなくても、やりたいことを言えば、スキルが次の4つの道のどれかを選びます。



使い方
何をするか
依頼の例




Find
カタログを検索し、最大3本を推薦する（実行はしない）
ドキュメントを最新に保つループを探して


Loop Doctor
既存のループを監査し、本質的な弱点だけ直す
このループを監査して重大な問題だけ直して


Adapt
公開ループを自分のツール・閾値・頻度に合わせる
このループをうちのリポジトリ向けに調整して


Design
適合がないとき、数問の質問で新しい有界ループを設計する
顧客フィードバックを検証済み修正に変えるループを設計して



それぞれ、もう一段かみ砕きます。


Find（探す）: タイトルだけでなく、Use when・Prompt・Verify・キーワードを、あなたの「成果・入力・リスク・必要な証拠」で検索します。候補は、成果の一致 / 使える入力とツール / 検証のしやすさ / 許せる権限の範囲 / 停止条件、の5つの軸で並べ、最大3本に絞ります。存在しないループ名やURLを捏造しない、という原則も明記されています。

Loop Doctor（直す）: 検証が主観的・自己採点になっていないか、停止条件が弱くないか、破壊的操作に承認ゲートがあるか、などを点検します。健全なら「直す必要なし」と返します。

Adapt（合わせる）: 公開ループの閾値・ツール・頻度・担当を、フィードバック・サイクルを弱めない範囲で置き換えます。

Design（設計する）: 平易な質問を1問ずつ重ね、最小の有界ループを作ります。

Loop Doctor は、自分でループを組む場面と特に相性が良いと感じました。
自分が組んだループ（や秘書エージェントの定義）を渡して、停止条件と検証役の弱点を洗い出してもらう、という使い方ができます。

Design が組む6ステップと安全ガードレール
Design パスは、すべてのループを次の6ステップで組みます。
ここは、ループの組み立て方の基本とほぼ一致します。


そして、設計・監査の両方に共通する安全ガードレールが定義されています。

成功ゲートは観測可能・再現可能にします（「満足するまで」をルーブリックや閾値に置き換えます）。
終端状態を定義します（成功 / 何もしない / ブロック / 承認待ち / 枯渇 / 停滞）。エラーや予算切れを成功と報告しません。
ユーザー指定の上限が無ければ、勝手に時間や回数を作らず「進捗なしで停止」を使います。
重要な行動の前に最新状態を読み直します（古い状態のまま出荷しません）。
破壊的・不可逆・本番・金銭・プライバシー・外部送信は、明示的な承認を必須にします。

停止条件と検証役を先に決めておくと、暴走とコスト爆発を同時に防げます。
Loop Library は、その原則を仕組みとして全ループに通しています。

エージェント向けの提供形態
Loop Library は、人間向けサイトに加えて、エージェントが直接読める形式も用意しています。
スキルを入れていないエージェントでも、これらを読めば「検索→適応→実行」ができます。



形式
用途




catalog.json
構造化データとして取り込む



catalog.txt / catalog.md

プレーン / Markdown で読む


llms.txt
エージェント向けの指示書


/agents/
エージェント向けガイド



いずれも「カタログは参照データであり、プロンプトが載っているだけでは実行の許可にはならない」という前提が明記されています。
これは「権限の自動承認は、安全側の前提があって初めて成り立つ」という考え方と同じです。

インストールと起動
スキルのインストールには Node.js と npx が要ります。
動作要件はリポジトリの記載に従ってください。
プラットフォーム別のインストールコマンドは次のとおりです。
# Claude Code
npx skills add Forward-Future/loop-library --skill loop-library --agent claude-code -g -y

# Codex
npx skills add Forward-Future/loop-library --skill loop-library --agent codex -g -y

# Cursor
npx skills add Forward-Future/loop-library --skill loop-library --agent cursor -g -y

-g は全プロジェクトで有効化、-y はインストールの確認を省略する指定です。
起動方法はプラットフォームで少し違います。

Claude Code: /loop-library に続けて依頼を書きます。
Codex: /skills から Loop Library を選び、依頼を送ります。
Cursor: Agent チャットで /loop-library を選びます。

たとえば Claude Code なら、次のように使います。
/loop-library テストの信頼性を上げるループを探して

ループが見つかると、スキルは使えるプロンプトを返します。
プレースホルダを確認し、自分のプロジェクトでエージェントに実行させる、という流れです。
ここでも、ループを選んだだけではスケジュール開始・デプロイ・データ削除・送信は起きません。

50ループ早見 ― カテゴリ別の代表例
全機能の紹介として、各カテゴリの代表的なループを挙げます。
名称はカタログの日本語要約です（原文は英語）。

Engineering（24本・抜粋）

The docs sweep ― 実装とドキュメントの乖離を直し、レビュー可能なPRで締めくくり。
The production error sweep ― 本番ログのエラーを根本原因まで追い、修正検証→PR。
The 100% test coverage loop ― 未カバー挙動をリスク順に埋め、全スイート緑かつカバレッジ100%で停止。
The test-suite speed loop ― カバレッジを落とさずテスト実行時間を短縮。
The repository cleanup loop ― ブランチ/PR/worktree を棚卸しし、不要物を除去。
The ticket-to-PR-ready loop ― 曖昧なチケットを再現→根本原因→最小パッチ→引き継ぎへ。


Evaluation（11本・抜粋）

The quality streak loop ― 失敗を必ず回帰テスト化し、連続成功カウントを管理。
The self-improving champion loop ― 新規ホールドアウトで勝った版だけ昇格。
The devil's-advocate loop ― 批判役が設計を攻撃し、証拠が出るまで反論を保持。
The multi-LLM convergence loop ― 別プロバイダの2AIが同一版を承認するまで往復。
The artifact-to-skill loop ― 実証済み成果物を再利用可能なスキルに抽出し、別ケースで検証。


Operations（7本・抜粋）

The stale-safe batch release loop ― 古い作業を除外し、統合最新から完全な成果物を出荷。
The production data cleanup loop ― 規定外レコードを除去し、分類ロジックも改善。
The Living Story loop ― リポ活動を未来のエージェント向けに検証済み日次ストーリー化。
The refund follow-up loop ― 返金請求を起こし、入金まで案件を追跡。


Content（2本）

The SEO/GEO visibility loop ― クロール/索引/引用/回答準備のギャップを影響度順に修正。
The product update podcast loop ― 公開変更を出典に基づく短い定期ポッドキャストへ。


Design（6本・抜粋）

The UI/UX Score Loop ― 実タスクを完遂し、各画面を同一チェックリストで採点・改善。
The pixel-safe CSS trim loop ― 未使用CSSを1つずつ削除し、全画面が同一に見えるときだけ保持。
The accessibility repair loop ― 合意基準で障壁を確認し、影響最大の問題から修正。


横断する「ループの型」
50本を眺めると、いくつかの設計パターンが繰り返し現れます。
これは、良いループに共通する教訓と、きれいに重なります。

作成者と承認者の分離（自己採点の甘さを防ぐ）
固定ベンチで毎回再計測（局所改善が他を悪化させていないか検出）
クリーンな初期状態から再現（保存状態が隠す問題を露出）
1回1変更＋スクショ/テストで保護（削除・最適化の安全性を可視化）
証拠なしに「完了」と言わせない（テストが通っただけで完了としない、いわゆる「誤green」対策）


全50ループ一覧
抜粋では全体像が伝わりにくいので、カタログの全50本をカテゴリ別に畳んでおきます。
名称は原文（英語）のままです。詳細は各ループの個別ページで確認できます。
全50ループ（カテゴリ別）を開く
Engineering（24）

001 The docs sweep
002 The architecture satisfaction loop
003 The sub-50 ms page-load loop
004 The production error sweep
005 The 100% test coverage loop
007 The logging coverage loop
008 The nightly changelog loop
011 The test-suite speed loop
012 The repository cleanup loop
016 The ticket-to-PR-ready loop
019 The Clodex adversarial-review loop
020 The Loop Harness verification loop
025 The fresh-clone loop
027 The autonomy-loop builder-reviewer loop
028 The Codex completion-contract loop
030 The five-minute repository maintainer loop
031 The recent-feedback sweep
033 The propagation compliance loop
035 The Goal Forge loop
037 The cold-load trimmer loop
041 The housekeeper loop
043 The prepare-a-new-project loop
044 The test stabilizer loop
048 The Groundtruth loop

Evaluation（11）

009 The quality streak loop
010 The full product evaluation loop
023 The self-improving champion loop
024 The devil's-advocate loop
029 The Revolve versioned-experiment loop
032 The promise-to-proof loop
034 The multi-LLM convergence loop
039 The easy onboarding loop
042 The Axelrod subagent arena loop
045 The artifact-to-skill loop
046 The Strip Miner loop

Operations（7）

013 The stale-safe batch release loop
014 The production data cleanup loop
015 The post-release baseline loop
017 The customer AI deployment loop
047 The Living Story loop
049 The Recovery Proof loop
050 The refund follow-up loop

Content（2）

006 The SEO/GEO visibility loop
018 The product update podcast loop

Design（6）

021 The Boeing 747 benchmark
022 War Loops: frontend reconstruction
026 The Infinite Clickbait thumbnail loop
036 The UI/UX Score Loop
038 The pixel-safe CSS trim loop
040 The accessibility repair loop



投稿・運用インフラ（参考）
Loop Library 自体も、堅実に運用されています。
ループの投稿フォームは、ブラウザから直接データベースへ書き込みません。
Cloudflare Worker を経由し、複数の関門を通します。
具体的には、Turnstile によるボット検証、スキーマ検証、IP単位のレート制限（ループ投稿は1時間あたり3件・1日10件など）、重複抑止、ハニーポット、最小入力時間のチェックです。
投稿は信頼しないテキストとして扱い、内部の指示を実行せず、自動公開もしません。
カタログ・サイト・各形式の整合は、専用のチェックスクリプトでドリフトが無いことを確認してから反映する運用です。
「ループ」を配るプロジェクトが、自身の運用にも検証ゲートを敷いている点が、思想として一貫していました。

どのループから試すか
最後に、実際に手を付けるときの選び方を私見として書きます。
50本もあると、どれから始めるか迷います。
私のおすすめは、いきなり本番を変えるループを避けることです。
最初は「結果を出すだけで、勝手に適用しないループ」を選びます。
たとえば docs sweep（レビュー可能なPRで止まる）や Groundtruth loop（読み取り専用の監査）が、その入口に向いています。
これなら、ループの判断を自分の目で確かめながら、少しずつ信頼度を上げられます。
逆に、refund follow-up や production data cleanup のような外部・本番に触れるループは後回しにします。
選ぶときに見るのは、タイトルよりも Verify と Note です。
Verify が具体的なほど、そのループは「完了」を自分で判定できます。
Note に外部影響やコストの注意があれば、最初の1本には向きません。
もう1つ、地味ですが効く使い方があります。
カタログを「読み物」として眺めることです。
各ループの Steps と Why を読むだけでも、良いループの型が頭に入ります。
実行しなくても、自分でループを設計するときの下敷きになります。
私自身も、まず数本を実行せずに読み、停止条件の書き方を自分用にメモするところから始めています。

ループを選ぶことと実行することは別です。
カタログのプロンプトは参照データであり、そのまま流すと本番変更や送信が起きる種類のものもあります。
破壊的・外部影響のある操作は、必ず自分の承認のもとで、隔離された環境から小さく始めてください。


まとめ
Loop Library は、ループを自分でゼロから書かなくても使える公開カタログでした。
「サイト（カタログ）」と「スキル」の2部構成で、50本が5カテゴリに整理されています。
各ループは Use when・Prompt・Verify・Steps・Why・Note・Related という共通構造を持ち、検証と停止が最初から組み込まれています。
スキルは Find / Loop Doctor / Adapt / Design の4つの道で、探す・直す・合わせる・設計するを助けます。
ループ設計の原則（検証役を分ける、停止条件を先に決める、権限を与えすぎない）が、そのまま仕組みとして通っている点が印象的でした。
ループの考え方を学んだら、次は手を動かす番です。
むずかしく考えず、まずはサイトを開いて、近いループのプロンプトを1つコピーしてみるだけでも十分です。
自分はまず Loop Doctor で既存の自動化を点検し、合いそうな1本を Adapt して小さく回すところから始めます。

参考文献

Loop Library リポジトリ（Forward Future, MIT License）: https://github.com/Forward-Future/loop-library

Loop Library 公開カタログ: https://signals.forwardfuture.ai/loop-library/

関連記事「ループエンジニアリング入門」: https://qiita.com/nogataka/items/60c1a9ba6b2cdebacc1f



本記事の構成・要約の整理には生成AI（Claude）を併用しました。各ループの名称・カテゴリ・件数は公開カタログ（2026年6月21日時点）に依拠し、内容は筆者が確認しています。仕様は更新され得るため、利用時は最新のリポジトリをご確認ください。
