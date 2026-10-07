# Claude Code 完全リファレンス — 全機能網羅+意外と知らない便利機能トップ10 #AI - Qiita
- **Source URL**: https://qiita.com/nogataka/items/5e64037cc452c5d497fa
- **Score**: 85
- **AI Summary**:
  - Claude Code v2.1の全機能に加え、生産性を向上させる隠れた便利機能10選を網羅的に解説
  - /loopによる自動定期実行や/rewindによる変更の即時巻戻しなど、実務直結の機能を詳述
  - CI/CD連携を最適化する--bareモードや、推論を介さないシェル直接実行(!)の活用法を提示
- **Read Now Reason**: AI駆動開発において、開発効率を劇的に向上させる実行制御系コマンドや、自動化パイプラインに即時組み込み可能な--bareモードの具体的仕様が明記されているため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #CLIツール, #自動化パイプライン, #生産性向上
- **Processed Date**: 2026/5/14

---

## 本文
Claude Code は Anthropic 公式の CLI エージェントです。ターミナルから直接 Claude を呼び出し、コード生成・編集・デバッグ・Git 操作・プロジェクト管理まで一気通貫で行えます。
この記事では 2026 年 4 月時点の全機能をカテゴリ別に整理し、「意外と使われていない便利機能トップ 10」も紹介します。

本記事は Claude Code v2.1.x 系（2026 年 4 月時点）の情報です。バージョンによって利用できない機能があります。



意外と知らない便利機能トップ 10

多くのユーザーが見落としがちな機能を 10 個厳選しました。日常のワークフローに取り入れるだけで、作業効率が大きく変わります。

1. /btw — メインコンテキストを汚さないサイドクエスチョン
長い実装作業の途中で「ちょっとした疑問」が浮かぶことがあります。通常の質問だと会話履歴に追加されてコンテキストが膨らみますが、/btw なら履歴を汚しません。
/btw TypeScriptでRecord型とMap型の使い分けはどうすべき？

/btw このエラー "ECONNREFUSED" の原因として何が考えられる？

現在のコンテキスト（開いているファイルや直前の議論）を共有しながら回答してくれるため、文脈に沿った的確な答えが得られます。プロンプトキャッシュを再利用するため、追加のトークンコストは最小限です。
サブエージェントとの違いを把握しておくと使い分けがスムーズになります。



特性
/btw
サブエージェント




コンテキスト
現在の文脈を共有
空（独立）


ツール利用
なし
あり（ファイル読み書き等）


向いている用途
概念の確認、用語の意味
重い調査、別ファイルの実装




2. Ctrl+S — プロンプト下書き保存（スタッシュ）
長いプロンプトを書いている最中に「あ、先にこっちを確認したい」という場面はよくあります。Ctrl+S を押すと、書きかけのプロンプトが一時退避（スタッシュ）されます。
# 作業の流れ
1. 長い指示を入力中...
2. Ctrl+S で下書き保存
3. 割り込みの質問を投げる
4. 回答を受け取る
5. 下書きが自動的に復帰 → 続きから入力

Git の git stash と同じ発想です。割り込みが終わると自動的に下書きが戻ってくるので、「どこまで書いたっけ？」と思い出す手間がなくなります。

3. # テキスト — その場で auto-memory にメモを永続化
作業中に「このルールは今後も守りたい」と思ったことを、手を止めずにプロジェクトメモリに保存できます。
# テストは必ず jest で書くこと
# APIレスポンスは snake_case で統一
# 環境変数は .env.local に置く

# から始めるだけで auto-memory（.claude/projects/<project>/memory/）に保存されます。CLAUDE.md への直書きではなく、Claude が自動管理するメモリ領域に記録される仕組みです。

# プレフィックスによるメモリ保存は非推奨になりつつあります。現在は Claude に「これを覚えておいて」と伝えるか、/memory コマンドで管理する方法が推奨されています。

チーム開発では、新しく決まったコーディング規約やアーキテクチャ判断をその場でメモしておくと、次のセッションでも Claude が一貫した提案をしてくれるようになります。

4. /loop — ローカル定期実行（最大 3 日）
プロンプトやスラッシュコマンドを指定間隔で繰り返し実行します。
/loop 5m npm test            # 5分ごとにテスト実行
/loop 30m /security-review   # 30分ごとにセキュリティレビュー
/loop 1h git log --oneline -5  # 1時間ごとに直近コミットを確認

各イテレーションは独立したコンテキストで動くため、前回の結果に引きずられません。デフォルト間隔は 10 分で、最大 3 日間継続します。

/loop はローカルマシンで動作するため、PC をスリープすると停止します。マシンに依存しない定期実行には /schedule を使ってください。


5. ! コマンド — シェル直接実行（Claude の推論を経由しない）
先頭に ! をつけると、Claude の推論処理を経由せずにシェルコマンドを直接実行します。
!git status                # ステージング状況の確認
!git log --oneline -10     # 直近のコミット一覧
!ls -la src/               # ディレクトリ構造の確認
!cat package.json | jq .version  # バージョン確認

Claude に「git status を見せて」と頼むと、Claude が内容を解釈してからツールを実行します。! を使えば Claude の推論ステップを省略して即座に結果を確認できます。

コマンドの出力は会話コンテキストに含まれます。完全にトークンフリーではない点に注意してください。大量の出力を生むコマンドは避けることをおすすめします。

「確認だけ」のコマンドは ! で叩き、「判断・変更が必要な作業」は Claude に頼む、という使い分けが効率的です。

6. Ctrl+B — バックグラウンド実行
Claude が長い処理（テスト実行、大規模リファクタリング等）に入ったとき、Ctrl+B を押すとその処理をバックグラウンドに移せます。
# 作業の流れ
1. 「全テストを実行して」と指示
2. Claude がテストを開始
3. Ctrl+B でバックグラウンドに
4. 別の質問や作業を進める
5. テスト完了通知を受け取る

メインのプロンプトがすぐに空くため、待ち時間ゼロで次の作業に取りかかれます。Ctrl+T でバックグラウンドタスクの進捗を一覧表示できます。

7. --bare — 軽量モード（hooks なし・高速起動）
hooks・LSP・plugin 同期・skill スキャン・auto-memory・CLAUDE.md 自動検出・キーチェーン読み込みなどの初期化処理をすべてスキップして最速で起動します。
# CI/CDパイプラインでの利用例
claude --bare -p "このdiffにセキュリティ上の問題はある？" < diff.patch

# シェルスクリプトからの呼び出し
result=$(claude --bare -p "この関数名をsnake_caseに変換して: getUserName" --output-format json)

# パイプと組み合わせてコードレビュー
git diff HEAD~1 | claude --bare -p "このdiffをレビューして" --max-turns 5

通常起動時の初期化処理が省かれるため、ワンショット実行で体感速度が大きく変わります。-p（非対話モード）や --output-format json と組み合わせて自動化パイプラインに組み込むのが定番です。

8. /rewind（ESC×2）— 変更の巻き戻し
Claude が行った直前のファイル変更をなかったことにして元に戻します。
# 作業の流れ
1. 「認証ロジックをリファクタリングして」と指示
2. Claude がファイルを複数変更
3. 結果を確認 → 「ちょっと違う...」
4. /rewind（またはESCを2回押す）
5. 変更前の状態に復帰
6. 指示を修正して再度トライ

「まず試してダメなら戻す」という実験的なアプローチを安心して取れます。Git の commit 前であれば、何度でも気軽に試行錯誤できます。

9. Ctrl+G — $EDITOR でプロンプトを編集
入力中のプロンプトを Vim、Neovim、VS Code など $EDITOR 環境変数で指定したエディタで開けます。
# 事前に$EDITORを設定しておく
export EDITOR=nvim    # Neovim の場合
export EDITOR="code --wait"  # VS Code の場合

ターミナルの 1 行入力欄では書きにくい長文の仕様書やマルチステップの指示を、使い慣れたエディタのシンタックスハイライトや補完機能を使って快適に書けます。エディタを保存して閉じると、その内容がプロンプトとして送信されます。

10. スパース worktree — 大規模モノレポの起動高速化
大規模モノレポでは Claude Code の起動時に全ファイルの読み込みで時間がかかることがあります。worktree.sparsePaths 設定で必要なパスだけを読み込めます。

settings.json
{
  "worktree": {
    "sparsePaths": [
      "packages/my-service",
      "shared/utils"
    ]
  }
}


内部的には git sparse-checkout（cone mode）を使っており、worktree 作成時に指定したディレクトリだけがチェックアウトされます。glob パターンではなくディレクトリパスを指定します。数百パッケージのモノレポでも、自分の担当サービスだけを対象にすれば起動が軽くなります。

ここからはカテゴリ別の全機能リファレンスです。

キーボードショートカット


入力・編集系
Ctrl+S — プロンプト下書き保存
書きかけのプロンプトをスタッシュします。割り込みの質問を投げた後、自動的に下書きが復帰します。
Ctrl+G — $EDITOR でプロンプト編集
入力中のプロンプトを外部エディタで開きます。長い仕様書やステップバイステップの指示を書くときに便利です。
\ + Enter — 複数行入力
行末に \ を置いてから Enter で改行します。Option+Enter / Shift+Enter / Ctrl+J も同様ですが、全ターミナルで確実に動作するのは \ + Enter のみです。
Ctrl+R — コマンド履歴の逆方向検索
過去に入力したプロンプトをインクリメンタルに検索します。シェルの Ctrl+R と同じ操作感です。Ctrl+R を繰り返し押すと、古い一致を順にさかのぼります。

実行制御系
Ctrl+B — バックグラウンド実行
現在の処理をバックグラウンドに移します。テスト実行やビルドなど、結果を待つ必要がない長い処理を流しておけます。
Ctrl+C — 応答を中断（セッションは継続）
Claude の出力を即座に止めます。Ctrl+D や /exit と違い、セッション自体は終了しません。「方向性が違う」と気づいた瞬間に止めて修正できます。
Ctrl+F ×2 — 全バックグラウンドエージェント停止
3 秒以内に 2 回押すと、稼働中の全バックグラウンドエージェントを強制終了します。暴走してトークンを浪費し続けているエージェントへの緊急ブレーキです。

表示・切替系
Ctrl+T — タスクリスト表示切替
複数のサブエージェントが並行して動いているとき、進捗を一覧で確認できます。/compact をまたいでもタスクは保持されます。
Ctrl+O — トランスクリプトビューア
現在セッションの全ログをトランスクリプト形式で表示します。Claude がどのファイルを読み、どのような判断を下したかを振り返れます。
Shift+Tab — パーミッションモード順次切替
default → acceptEdits → auto → plan の 4 段階を循環します。



モード
動作




default
読み取りのみ自動承認、書き込みは都度確認


acceptEdits
ファイル編集を自動承認、コマンド実行は確認


auto
AI 分類器が安全な操作を自動承認、危険な操作はブロック


plan
計画の提示のみ。実行は承認後



Option+T / Alt+T — Extended Thinking トグル
セッション中にいつでも拡張思考モードを ON/OFF できます。複雑な設計判断やデバッグで「もっと深く考えてほしい」ときに ON にし、単純作業では OFF にするという使い方がおすすめです。
Option+P / Alt+P — モデルピッカー
Opus・Sonnet・Haiku をその場で切り替えます。簡単な質問は Haiku、複雑な実装は Opus のように、タスクの重さに応じて使い分けるとコスト効率が上がります。

ショートカット一覧



ショートカット
機能
カテゴリ




Ctrl+S
プロンプト下書き保存
入力


Ctrl+G

$EDITOR でプロンプト編集
入力



\ + Enter

複数行入力
入力


Ctrl+R
コマンド履歴の逆方向検索
入力


Ctrl+B
バックグラウンド実行
実行制御


Ctrl+C
応答を中断
実行制御



Ctrl+F ×2
全バックグラウンドエージェント停止
実行制御


Ctrl+T
タスクリスト表示切替
表示


Ctrl+O
トランスクリプトビューア
表示


Shift+Tab
パーミッションモード切替
切替



Option+T / Alt+T

Extended Thinking トグル
切替



Option+P / Alt+P

モデルピッカー
切替





スラッシュコマンド


セッション管理
/compact [指示] — 会話を要約して圧縮継続
会話が長くなってコンテキストウィンドウが逼迫してきたとき、全消去する /clear の前にまず試すべきコマンドです。会話を圧縮した要約で置き換えて続行できます。
/compact                          # 全体を要約
/compact auth関連の議論だけ残して    # 特定トピックにフォーカス
/compact 実装方針の結論だけ残して    # 決定事項のみ保持

/context でコンテキスト使用量を確認し、80% を超えたあたりで /compact を実行するのがおすすめです。
/clear — 会話履歴を完全リセット
ファイルへの編集は残りますが、会話の文脈は完全に消えます。新しいタスクに切り替える前のリセットとして使います。
/resume — セッション再開
引数なしで過去のセッション一覧を表示し、選択して再開できます。
/resume                  # 一覧から選択

CLI からは以下のフラグでも再開できます。
claude -c              # 最新のセッションを継続
claude -r "auth改修"   # 名前で特定セッションを指定

/rename <名前> — セッションに名前をつける
/rename auth-refactor
/rename バグ修正-ログイン画面

複数セッションを並走させるとき、意味のある名前をつけておくと /resume での識別が楽になります。
/color <色> — プロンプトバーの色を変更
/color red
/color blue

ターミナルを複数開いているとき、どのウィンドウが何をしているかを色で判別できます。/rename と組み合わせて使うのが効果的です。
/context — コンテキスト使用量をグラフ表示
現在のトークン消費をグラフで確認します。/compact のタイミングを判断するための情報源です。
/export [ファイル名] — 会話をファイルに書き出す
/export debug-session.txt

問題解決のやりとりをテキストファイルとして保存し、トラブルシューティング記録やチームへのナレッジ共有に使えます。

実行制御
/plan — 実装前に計画を立てて承認
/plan 認証システムをJWTからOAuthに移行する

Claude が実装方針を提案して待機します。計画を確認・修正してから承認することで、初めて実装フェーズに進みます。複雑な変更で「いきなりコードを書き始めて迷走する」のを防ぎます。
/effort [low/medium/high/max] — 推論の深さを調整
/effort low      # typo修正、単純な質問
/effort medium   # 通常の実装作業（デフォルト）
/effort high     # 複雑な設計判断
/effort max      # アーキテクチャレベルの深い推論

環境変数 CLAUDE_CODE_EFFORT_LEVEL でデフォルト値を固定することもできます。
/btw <質問> — サイドクエスチョン
トップ 10 で紹介済み。メインコンテキストを汚さず、文脈を共有した軽い質問に使います。
/loop [間隔] <コマンド> — ローカル定期実行
トップ 10 で紹介済み。プロンプトやスラッシュコマンドを指定間隔で繰り返します。
/schedule — クラウドスケジュール実行
Anthropic のインフラで実行されるため、ローカルマシンがオフでも動き続けます。
/schedule "毎朝9時にmainブランチのテストを実行して結果をSlackに通知"

/loop との違いは実行環境です。/loop はローカル（最大 3 日）、/schedule はクラウド（継続的）で動作します。
/rewind — 直前のファイル変更を巻き戻し
トップ 10 で紹介済み。ESC を 2 回押しても同じ動作です。

コードレビュー・品質
/simplify — 3 エージェント並列コードレビュー
「コード再利用」「品質」「効率」の 3 つの観点から、それぞれ独立したエージェントが並列でレビューします。問題を検出すると自動修正まで行います。
/simplify             # 直近の変更をレビュー

PR 作成前の品質ゲートとして組み込むと、セルフレビューの精度が上がります。
/batch <指示> — 大規模並列変更
反復的な変更を、並列 worktree で自動実行して PR まで作成します。
/batch 全APIエンドポイントにレート制限を追加して
/batch 全コンポーネントにaria-labelを追加して

同じパターンを多数のファイルに適用する場面で威力を発揮します。各変更は独立した worktree で行われるため、失敗しても他に影響しません。
/security-review — セキュリティスキャン
変更内容のデータフロー分析を行い、脆弱性を検出します。XSS、SQL インジェクション、認証バイパスなどの一般的な脆弱性パターンをチェックしてくれます。
/diff — セッション内の変更差分を確認
セッション内で Claude が行った変更を git diff 形式で表示します。コミット前の最終確認に使います。
/pr-comments [PR番号] — GitHub PR コメントを取り込む
/pr-comments 142

GitHub の PR レビューコメントをセッションに読み込みます。レビュー指摘を Claude に渡して修正させるワークフローを一気通貫にできます。

Git 操作・会話分岐

/commit と /commit-push-pr は built-in command ではなく bundled skill です。/ で呼び出せますが、内部的にはマークダウンベースの skill として実装されています。

/branch — 会話の分岐
/branch my-experiment    # 現在の会話を分岐

現在の会話を新しい独立したセッションに分岐します。/fork の別名です。Git ブランチ操作ではなく、会話履歴の分岐である点に注意してください。「この方針で試してみたいが、失敗したら元に戻りたい」という場面で使います。
/commit — コミットメッセージ自動生成＋コミット
変更内容を分析して適切なコミットメッセージを自動生成し、コミットまで実行します。
/commit-push-pr — コミットから PR 作成までワンコマンド
コミット → push → PR 作成を一気に行います。コミットメッセージも PR のタイトル・本文も自動生成されます。

設定・診断
/config — 設定をインタラクティブに変更
メニュー形式でモデル・音声・メモリ・プロンプト候補などを変更できます。JSON を直接編集する必要がありません。
/status — 現在の設定状態を確認
アクティブなモデル・パーミッションモード・接続中 MCP サーバー・ツール状態を一覧表示します。/doctor との違いは、テストを実行しない点です。
/cost — トークン消費確認（API ユーザー向け）
現在のセッションで消費したトークン数とコストを表示します。
/stats — 使用統計（Pro/Max 向け）
サブスクリプションプランでの使用統計を表示します。
/insights — セッション傾向を分析
過去のセッションから自分の Claude Code 利用パターンを分析します。待機時間と実作業時間の比率など、無駄の多い習慣を可視化してくれます。
/doctor — インストール診断
環境の問題・キーバインドの警告・MCP サーバーの状態などを一括チェックします。動作がおかしいと思ったら最初に叩くコマンドです。
/memory — CLAUDE.md をインタラクティブに編集
UI 上で CLAUDE.md を直接編集できます。# プレフィックスでのオートメモリ追加と併用すると効率的です。
/init — CLAUDE.md を自動生成
cd my-new-project
claude
/init

新規プロジェクトのルートで実行するとコードベースをスキャンし、ビルドコマンド・テスト手順・コード規約を自動抽出して CLAUDE.md を生成します。
/vim — Vim キーバインド入力モード
プロンプト入力で Vim 操作が使えるようになります。normal/insert モード切替、h/j/k/l 移動、d/c/y 操作、テキストオブジェクトに対応しています。
/voice — 音声入力
プッシュトゥトーク方式で音声入力します。日本語を含む 20 言語に対応しています。リポジトリ名・OAuth・JSON などの技術用語の認識精度も改善されています。

外部連携
/teleport — デバイス間セッション引継ぎ
PC で作業中のセッションをスマホやタブレットに転送して続きを操作できます。外出先での確認や、移動中のレビューに便利です。
/remote-control（/rc）— claude.ai からリモート操作
ローカルの Claude Code セッションをブラウザ（claude.ai）から監視・操作できます。
/rc    # リモートコントロールを有効化

ターミナルを直接開けない環境からでも、ブラウザ経由で作業の確認・指示が可能になります。
/chrome — Chrome 連携の設定
Claude in Chrome との連携を設定するコマンドです。設定が完了すると、Web アプリのテスト・コンソールデバッグ・フォーム操作・データ抽出を Claude Code から指示できるようになります。
/chrome

/install-github-app — GitHub PR 自動レビュー
設定後、PR が作成されるたびに Claude が自動でレビューします。claude-code-review.yml でレビュープロンプトをカスタマイズできます。
/install-slack-app — Slack 連携
Slack で @Claude とメンションするだけで Claude Code にタスクを送れます。バグ修正・コードレビュー依頼を Slack から直接ルーティングできます。

エージェント・ツール管理
/agents — サブエージェント管理
稼働中のサブエージェントを一覧表示し、設定を確認・変更できます。
/mcp — MCP サーバー管理
接続済み MCP サーバーの一覧・追加・削除を行います。MCP サーバーのプロンプトは /mcp__サーバー名__コマンド 形式でスラッシュコマンドとして使えます。
/skills — スキル一覧
インストール済みの全スキル（ビルトイン・カスタム）を確認できます。デフォルトで /simplify・/batch・/loop・/debug・/claude-api などが付属しています。
/add-dir <path> — 作業ディレクトリを追加
/add-dir ../shared-libs

モノレポや複数プロジェクトで、追加ディレクトリを同時に参照させます。CLI 起動時は --add-dir フラグでも指定できます。
/hooks — インタラクティブ hook 設定 UI
JSON を直接編集せず、メニュー形式で hook を設定できます。hook を初めて設定するときはここから始めるのが確実です。


CLI フラグ（起動時オプション）


セッション制御
-c / --continue — 直前のセッションを継続
claude -c              # 最新のセッションを継続
claude -r "auth改修"   # 名前で指定して再開

-p "..." — 非対話モード（ワンショット）
# 単純なワンショット
claude -p "package.jsonのdependenciesを一覧にして"

# JSON出力でスクリプト連携
claude -p "この関数のバグを説明して" --output-format json < buggy.ts

# パイプで入力
cat error.log | claude -p "このエラーの原因と対処法を教えて"

プロンプトを投げて結果を返し、すぐに終了します。CI/CD やシェルスクリプトへの組み込みの基本形です。
-c --fork-session — セッションをフォーク
現在のコンテキストを引き継ぎながら、別の ID で新しいセッションを作成します。実験的なアプローチを本流を汚さずに試したいときに使います。
--from-pr <PR番号> — PR セッションを復元
claude --from-pr 142

特定の GitHub PR に関連するセッションを復元します。PR レビュー修正作業のコンテキストを翌日に持ち越せます。

実行モード
--permission-mode auto — Auto モード
AI 分類器が安全な操作（読み取り・git status・テスト実行等）を自動承認し、危険な操作（ファイル削除・force push 等）はブロックします。
claude --permission-mode auto

セッション中は Shift+Tab で切り替えることもできます。
--bare — 軽量モード
トップ 10 で紹介済み。hooks・LSP・plugin・auto-memory・CLAUDE.md 自動検出などの初期化処理をスキップして最速起動します。
--max-turns <N> — ターン数上限
claude -p "リファクタリングして" --max-turns 20

エージェントのターン数に上限を設けます。CI 環境やスクリプト自動化時に暴走を防ぐ安全弁として必ず設定しておくことをおすすめします。

モデル・推論
--model opus/sonnet/haiku — モデル指定
claude --model haiku    # 軽い質問にはHaiku
claude --model opus     # 複雑な設計にはOpus

セッション中は /model コマンドや Option+P で切り替えられます。
--effort [low/medium/high/max] — 推論の深さ
起動時に推論レベルを指定します。環境変数 CLAUDE_CODE_EFFORT_LEVEL でデフォルトを固定することも可能です。

ワークツリー
-w <branch> / --worktree — 独立 worktree で起動
claude -w feature-auth       # feature-authブランチのworktreeで起動
claude -w bugfix-login       # 別のworktreeで並行作業

変更は worktree に閉じるため、main ブランチに影響しません。/batch コマンドも内部でこの仕組みを使っています。

ツール・プロンプト制御
--allowedTools / --disallowedTools — ツール許可・禁止
# 読み取りとgitコマンドだけ許可
claude --allowedTools "Read,Bash(git *)"

# rm -rfをブロック
claude --disallowedTools "Bash(rm -rf *)"

両方を組み合わせて、ホワイトリストとブラックリストを同時に設定することもできます。
--system-prompt / --append-system-prompt — プロンプト注入
# システムプロンプトを完全置換
claude --system-prompt "セキュリティ重視のレビュアーとして振る舞え"

# 既存のプロンプトに追記
claude --append-system-prompt "回答は日本語で"

特定のペルソナや制約を起動時に固定できます。


エージェント・ツール機能


サブエージェント
.claude/agents/ ディレクトリにエージェント定義ファイルを配置して、専門エージェントを作成します。

.claude/agents/security-auditor.md
---
name: security-auditor
description: セキュリティ脆弱性のレビュー専門
model: opus
allowed-tools: Read,Grep,Glob,Bash(grep *),Bash(git *)
---

あなたはセキュリティ審査員です。以下の観点でコードをレビューしてください：
- SQLインジェクション
- XSS
- 認証バイパス
- 秘密情報のハードコード


フロントエンド・バックエンド・セキュリティなど役割別にエージェントを定義しておくと、それぞれが独立したコンテキストで動くため、トークン効率が上がります。

インライン操作
!コマンド — シェル直接実行
トップ 10 で紹介済み。Claude の推論ステップを経由せずにシェルコマンドを直接実行します。
@ファイルパス — ファイル参照（タブ補完付き）
@src/auth/login.ts のバリデーションロジックを見て
@package.json の依存関係を確認して

タブ補完が効くため、パスの入力ミスを防げます。「このあたりのファイルを見て」という曖昧な指示より、精度が格段に上がります。
#テキスト — auto-memory にメモ永続化
トップ 10 で紹介済み。# から始めると auto-memory に保存されます。

AskUserQuestion ツール — インタビュー駆動の仕様策定
Claude 自身がインタビュアーとして質問を重ね、実装前に仕様を固めてくれます。
AskUserQuestion ツールを使って以下の順番でインタビューしてください：
1. 機能の目的とユーザーストーリー
2. 技術的な制約・既存システムとの統合ポイント
3. エッジケースとエラーハンドリング方針
4. パフォーマンス要件
5. セキュリティ要件
全項目が完了したら SPEC.md にまとめてください。

「何を作るべきか」が曖昧なまま実装に入って手戻りが発生するのを防ぎます。

Channels — 外部からセッションにイベント送信
Slack・Discord・Telegram・Webhook からのイベントを、実行中の Claude Code セッションにリアルタイムで流し込めます。
# Slackとの連携例
/install-slack-app

# 設定後、Slackで以下のようにメンション
@Claude このバグを調査して: #issue-1234

CI/CD の完了通知、モニタリングアラート、チームメンバーからの依頼などを Claude Code のセッションに統合できます。


Git・バージョン管理


ワークツリー並列開発
# ターミナル1: フロントエンド作業
claude -w feature-frontend
/color blue
/rename frontend-auth

# ターミナル2: バックエンド作業
claude -w feature-backend
/color green
/rename backend-api

# ターミナル3: バグ修正
claude -w hotfix-login
/color red
/rename hotfix-login

ブランチごとに独立したディレクトリを作り、複数の Claude セッションを同時起動できます。各 worktree は完全に分離されているため、一方の変更が他方に影響しません。作業が終わればブランチをマージするだけです。

スパース worktree
トップ 10 で紹介済み。大規模モノレポで worktree.sparsePaths を設定すると、必要なパスだけをチェックアウトして起動速度を改善できます。

ファイルチェックポイント
/rewind がセッション全体の巻き戻しなのに対し、ファイルチェックポイントは特定ファイルの変更だけを選択的にロールバックできます。「この関数の変更は戻したいが、テストファイルの変更は残したい」という場面で使います。

PR セッション継続
claude --from-pr 142

特定の PR に関連する Claude Code セッションを復元します。PR レビューで指摘を受けた翌日に、前日のコンテキストをそのまま持ち越して修正作業に入れます。


Hooks（自動化フック）

Hooks は Claude Code のイベントにシェルコマンドを紐付ける仕組みです。設定は settings.json に記述するか、/hooks コマンドでインタラクティブに設定します。

PreToolUse — ツール実行前フック
ツールが実行される前に発火します。危険なコマンドの自動ブロックに使えます。

settings.json の例
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(rm -rf *)",
        "command": "echo 'BLOCKED: rm -rf は禁止されています' && exit 1"
      }
    ]
  }
}



PostToolUse — ツール実行後フック
ツール実行後に発火します。ファイル保存後のフォーマッター自動実行が代表的な用途です。

settings.json の例
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write(*.ts)",
        "command": "npx prettier --write $CLAUDE_FILE_PATH"
      },
      {
        "matcher": "Write(*.py)",
        "command": "black $CLAUDE_FILE_PATH"
      }
    ]
  }
}


Write(*.ts) のようにパターンマッチを使って、特定ファイルタイプだけに適用できます。

PostCompact — /compact 完了後フック
/compact でコンテキストが圧縮された後に発火します。圧縮で失われがちな重要情報を再注入する用途に使います。

Notification — ステータス変化フック
タスク完了・入力待ちなどの状態変化時に発火します。

settings.json の例
{
  "hooks": {
    "Notification": [
      {
        "command": "osascript -e 'display notification \"$CLAUDE_NOTIFICATION\" with title \"Claude Code\"'"
      }
    ]
  }
}


デスクトップ通知、Slack Webhook、LINE 通知などに連携すれば、離席中でもタスク完了を把握できます。

CwdChanged / FileChanged — ディレクトリ・ファイル変更フック
作業ディレクトリやファイルの変更に反応するフックです。direnv との連携で環境変数を自動切替するなど、リアクティブな環境管理に使えます。

フック一覧



フック
タイミング
代表的な用途




PreToolUse
ツール実行前
危険コマンドのブロック


PostToolUse
ツール実行後
フォーマッター・リンター自動実行


PostCompact

/compact 完了後
重要情報の再注入


Notification
ステータス変化時
デスクトップ通知・Webhook


CwdChanged
作業ディレクトリ変更時
環境変数の自動切替


FileChanged
ファイル変更時
ライブリロード・自動テスト





Skills・カスタマイズ


カスタムスキル
.claude/skills/NAME/SKILL.md に配置します。スラッシュコマンドとして呼び出せる再利用可能な指示セットです。旧 .claude/commands/ から進化し、サポートファイル・フロントマター制御・自律起動が追加されています。
.claude/skills/
├── qiita-writing/
│   ├── SKILL.md          # スキル本体
│   └── references/       # 参照ファイル
├── code-review/
│   └── SKILL.md
└── deploy/
    └── SKILL.md


スキルのフロントマター
---
name: my-skill
description: スキルの説明（スキル一覧に表示される）
allowed-tools: Read,Write,Bash
model: sonnet
context: fork
user-invocable: true
argument-hint: "<ファイル名>"
---

ここにスキルの本体（Claude への指示）を書く




キー
内容
例




allowed-tools
スキル実行時に使えるツールを限定
Read,Write,Bash


model
スキル専用のモデルを指定

sonnet, haiku



context
コンテキストの分離方法

fork（分岐）, isolate（完全分離）


user-invocable
ユーザーが手動で呼び出せるか

true / false



argument-hint
スラッシュコマンド入力時のヒント
"<PR番号>"




Plugin Marketplace
/plugin marketplace add <URL>

コミュニティが作成したスキル・エージェント・フックのパッケージをインストールできます。チームで共通のワークフローを配布する仕組みとしても使えます。

キーバインドカスタマイズ
~/.claude/keybindings.json で全ショートカットを再定義できます。

~/.claude/keybindings.json
{
  "ctrl+k ctrl+s": "save-draft",
  "ctrl+k ctrl+r": "rewind",
  "ctrl+k ctrl+b": "background"
}


Chord（ctrl+k ctrl+s のように 2 段階のキー操作）にも対応しているため、VS Code や Emacs のショートカット体系に統一することが可能です。設定後は /doctor でバリデーション確認をおすすめします。

CLAUDE.md HTML コメント

CLAUDE.md
# プロジェクトルール

<!-- ここはチームメンバー向けのメモ。Claudeには見えない -->
<!-- 担当: Taka / レビュアー: Yuki -->

テストは必ず jest で書くこと。
API レスポンスは snake_case で統一。


CLAUDE.md 内の HTML コメント（<!-- -->）は、Claude Code が自動注入する際に除外されます。チームメンバー向けのメモと Claude 向けの指示を同一ファイルに共存させたいときに便利です。

Claude が Read ツールで直接ファイルを読んだ場合はコメントも見えます。自動注入時のみフィルタリングされる点に注意してください。



設定・診断


Auto モード管理
claude auto-mode config     # 現在のルールを確認
claude auto-mode critique   # AIがルールを評価・改善提案

Auto モード（--permission-mode auto）で使われるルールを確認・最適化できます。critique では AI がカスタムルールの不足や矛盾を指摘してくれます。

過去セッションの全文検索
transcript search "認証 OAuth 移行"

過去のセッションを全文検索できます。「あのとき、どう実装したっけ？」という場面で、過去の判断とそのコンテキストを掘り起こせます。

managed-settings.d/ — チームポリシーの分散管理
managed-settings.json と並行して、managed-settings.d/ ディレクトリに複数のポリシーフラグメントを配置できます。
managed-settings.d/
├── 01-security.json      # セキュリティチームのポリシー
├── 02-frontend.json      # フロントエンドチームのポリシー
└── 03-testing.json       # QAチームのポリシー

ファイルはアルファベット順でマージされるため、チームごとに独立してポリシーを管理できます。

設定コマンド一覧



操作
コマンド




インタラクティブ設定
/config


設定状態確認
/status


使用統計（Pro/Max）
/stats


トークン消費（API）
/cost


Auto モード確認
claude auto-mode config


Auto モード最適化
claude auto-mode critique


セッション検索
transcript search


インストール診断
/doctor





実践的な組み合わせパターン


パターン 1: CI/CD パイプライン
#!/bin/bash
# PR作成時に自動レビュー
claude --bare \
  -p "このPRの変更をレビューして。セキュリティ・パフォーマンス・可読性の観点で指摘して" \
  --output-format json \
  --max-turns 10 \
  --permission-mode auto \
  --model sonnet

--bare で高速起動、-p で非対話、--max-turns で暴走防止、--model sonnet でコスト最適化を組み合わせています。

パターン 2: 並列ブランチ開発
# ターミナル1: フロントエンド（青）
claude -w feature-frontend --model sonnet
/color blue
/rename frontend-auth

# ターミナル2: バックエンド（緑）
claude -w feature-backend --model opus
/color green
/rename backend-api

# 各セッションは独立したworktreeで動作
# 作業完了後、それぞれのブランチをmainにマージ


パターン 3: PR 作成前の品質ゲート
# 1. コードレビュー（3観点の並列レビュー）
/simplify

# 2. セキュリティスキャン
/security-review

# 3. 差分の最終確認
/diff

# 4. コミット〜PR作成まで一気通貫
/commit-push-pr


パターン 4: 長時間タスクの定期監視
# ローカルで10分ごとにテスト実行
/loop 10m npm test を実行して、失敗があれば原因を分析して

# クラウドで毎朝9時にmainブランチの健全性チェック
/schedule 毎朝9時にmainブランチでテストとリントを実行し、結果をSlackの#ci-alertsに通知


パターン 5: PR レビュー対応の翌日持ち越し
# 1日目: レビューコメントを取り込んで修正
claude
/pr-comments 142
# Claudeがレビュー指摘に対応...
# 途中で退勤

# 2日目: 前日のセッションを復元して続行
claude --from-pr 142
# 前日のコンテキストがそのまま残っている



リファレンスサイト


Claude Code は活発に開発が進んでいるため、機能の追加・変更が頻繁に行われます。最新情報は 公式ドキュメント やリリースノートを確認してください。
