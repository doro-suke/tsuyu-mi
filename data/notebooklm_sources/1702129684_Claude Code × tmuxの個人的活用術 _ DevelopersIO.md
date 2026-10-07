# Claude Code × tmuxの個人的活用術 | DevelopersIO
- **Source URL**: https://dev.classmethod.jp/articles/shuntaka-claude-code-tmux-personal-tips
- **Priority**: high
- **AI Summary**:
  - tmuxのキーバインドをOptionキー起点に統一し、ペインやセッション移動を最速化する設定手法。
  - fzfを活用したポップアップにより、ファイルパスの自動入力や過去の会話履歴の検索・再開を効率化。
  - capture-paneコマンドを使い、別ペインのエラーログや実行結果をClaudeへ直接参照させる連携術。
- **Read Now Reason**: 最新のAIコーディングエージェントであるClaude Codeを、既存のターミナル環境に最適化して組み込むための即効性の高い具体策が網羅されているため。
- **Suggested Tags**: #Claude Code, #tmux, #開発環境構築, #AIコーディング, #生産性向上
- **Processed Date**: 2026/5/3

---

## 本文
はじめに
私の普段の AI コーディングは、Claude Code を tmux の中で動かす運用がベースになっています。Claude Code が日常になってからは、その「tmux を整えておく」ことの効きが一段強くなったと感じます。かれこれ7年くらい使っているツールですが、Claude Code登場やモデルの進化にともなって、もっとも設定や使い方が大きく変わったツールの1つだと感じます。
本記事では、その日常で実際に使っている tmux 周りの工夫をまとめます。過去にも Claude Code と開発環境について書いたり、登壇したりしてきました。本記事はその延長線上にあります。

Claude Code活用時のつらみと隙間を埋めるツール（2026.03.09）
ターミナル生活を支えるClaude Code設定（2025.12.22）
Claude Codeチーム活用の現在地（2025.09.08）
Claude Codeをdotfiles管理しよう！（2025.08.08）

 前提となる設定
 pane / window 移動を最速にする
このあとに出てくる「複数ペインで Claude を観測する」「並行で別の Claude を回す」運用は、ペインやウィンドウ間の移動が視線移動と同じ速度になることで初めて成立します。 .tmux.conf のキーバインドは全部 ⌥（Option）始まりにする。
vim の hjkl をそのまま縦横の感覚に持ち込んでいて、左右でウィンドウを、上下でセッションを行き来します。

Option + l(→) と Option + h(←) で横のウィンドウ間の移動

Option + j(↓) と Option + k(↑) でセッションの移動


そもそもこの M- 始まりという発想自体、当時 yuki-yano さんの「tmuxを効率よく使って開発を爆速にする最高の設定」を読んで学び世界が変わりました。

最近だと以下の記事の §3.1「prefix 不要の切り替え」で丁寧に紹介されています。

ウィンドウ、ペイン分割も同じ要領でキーバインドを設定すると快適だと思います。詳しくは以下の設定を参考にして頂けると良いかなと思います。

 tmux windowの構成
ウィンドウとペインの並べ方は、DHH が Pragmatic Engineer のインタビューで紹介していた構成を参考にしました。

記事版はこちら。

ざっくり要約すると、左に Neovim、右側を tmux で上下に割って上のパネルで Kimi（高速モデル / OpenCode）、下のパネルで Claude Opus 4.5（強力モデル / Claude Code）、最下段にコマンド実行・ログ確認用の細い shell ペイン、という構成です。DHH 自身は普段 OpenCode をメインに使いつつ、比較用に Claude Code を併用しているとのこと[1]。
試しに同じ構成を自分の環境で再現してみたのが以下です。

左に nvim、右上に OpenCode、右下に Claude Code、下に shell
自分は上記の構成でしばらく試してみましたが、以下の画像のように変えました。

左に nvim、右に Claude Code を2枚、下に shell
理由としては、自分は拡張ディスプレイがない場面も多く、単純にスクロールが大変なのでAIコーディングエージェントを縦分割にしました。自分は高速なモデルとThinkingなモデルに同じタスクを依頼することはしないため[2]、単純にClaudeを2つ同じワークスペースで並列に動かす目的でこのレイアウトにしています。具体的には以下のようなケースです。

会話の途中で別の方針で相談、実装方針を固めたい場合

/branch(fork) → /resume(対象の会話を選択) → 必要があればESC x 2 or /resume で対象のやり取りに戻る → 2. Restore conversationを選択 → 会話を継続[3]


競合しない別の修正を行う場合


tmux split-window で割って send-keys で各ペインに c（claude）や nvim を流し込んで一発で起動できるようにすると便利です。この速度なら全く苦になりません。

dhh を叩くと、この構成が一発で立ち上がる

 ファイルを選択する
tmux display-popup を使って、現在のペインの上に9割サイズの popup を被せ、その中で fzf ベースのファイルピッカー[4]を動かしています。C-f で起動します。
Claude Codeでファイルを選択する際の2つのデモを紹介します。

C-f で popup → ファイル選択 → 親ペインに @パス で書き戻し

C-s で grep モードに切り替え → rg で全文検索 → 親ペインに @パス で書き戻し

popup を起動した親ペインで動いているプロセスが Claude / Codex / Gemini のいずれかだと判定したら、選択したファイルパスに @ プレフィックスを付けてそのペインに send-keys で書き戻します。普通の shell なら shell-escape したパスを送り、AI のプロンプト入力中なら @ 付きの参照になる、という挙動です。
加えて popup の中で C-s を押すと、ファイル名検索モードと rg での grep モードを行き来できて、grep 中は bat でハイライト付きのプレビューに切り替わります。

 会話を再開する
「昨日の続きをやりたい」「mainのworktreeの会話を新規のworktreeに引き継ぎたい」といった場面で、過去の Claude Code 会話に戻りたくなることがあります。claude --resume のリストはセッション ID とタイトルだけなので、本文を覗き見ながら選べると探す体験が一段楽になります。
C-h で過去の Claude Code 会話履歴を popup で開き、glow のプレビューで中身を確認しつつ Enter で claude --resume まで一気に繋げます。C-r / C-s / C-a で「現在のプロジェクト / 同 worktree / 全リポジトリ」を切り替えられます。会話履歴の取り出しには自作の chathist を使っています。


C-h で popup → glow プレビューで中身を確認 → Enter で resume
重要な考え方は会話をリストするだけの単純なCLIを構築し、検索とUIをfzf側に移譲することです。Vibe Codingが出来る現代でもUIや検索の動作確認はそこそこ時間がかかるためです。
実装は以下のような形です。

 Gitの操作をする(lazygit)
Git操作はtmux popup経由でlazygitを利用しています。

ステージング、diff確認、log閲覧といった日常のGit操作はpopup + lazygitでほぼ完結しており、ここは快適です。ただし、AIコミットのように同期で時間がかかる処理をpopup内で走らせるとtmux操作全体がブロックされてしまいます。閉じるとプロセスが死んでしまうので、<C-g>でバックグラウンドで動かすようにしてみましたが、安定しないので使っていません。

現状はshellにaic aliasを貼って下のshellかClaude Codeの!aic で実行しています。


スラッシュコマンドで実行することもあるので時と場合によってコミットは使い分けています。

popupを閉じてもプロセスが死なないソリューションがあると、このつらみは解消しそうです。Neovimでtoggleterm.nvimを使っていた際は起動速度の問題がありました。プロセス常駐してかつ起動が早いpopupを探す旅に出たいと、書いていて思いました。おそらくNeovim側でlazygitを操作するのが方向性として良さそうと考えています。
追記: snacks.nvim でプロセス常駐な lazygit popup を試している記事を書いた直後、folke/snacks.nvim の lazygit ピッカーに乗り換える形でこの問題に手を入れてみました。tmuxのC-gによるpopupでのlazygit起動はやめて、Neovim側に寄せる構成です。しばらくこれで様子を見ようと思います。
ポイントは以下の3つです。

<leader>gg で Snacks.lazygit() を起動し、popup 内の terminal mode で <C-q> を押すと self:hide() でプロセスを残したまま popup だけ閉じる。再表示は瞬時
FocusGained 時に buftype == "terminal" なら startinsert させて、別ペインから戻ってきたときに即 lazygit へ入力できるようにする
terminal mode の <C-w>h/j/k/l を上書きして、floating window なら閉じてから nvim-tmux-navigation の方向移動を呼ぶ。バッファとプロセスは残るので <leader>gg で再表示できる


設定の本体は以下です。


 別ペインをClaude Codeと共有する
 トラシューをする
別ペイン情報を共有することが可能です。
Please take a look at tmux pane %187.
このようなプロンプトをClaude Codeに投げると、Claudeがtmux capture-pane -p -t %187でそのペインの内容を勝手に拾ってくれます。エラーログや実行結果が長いとき、コピペするより速く文脈を渡せるので便利です。
ペインの参照先はClaude同士はもちろん、Codex / Geminiなど他のAIコーディングエージェントが動いているペインでも同じ要領で渡せます。「隣のClaudeの会話の流れを引き継いでほしい」「Codex側で出たエラーをClaudeに見てほしい」といったエージェント横断の連携にもそのまま使えます。
エラーをコピペする方が早いケースもありますが、スクロールが長くなる場面ではこちらの方が早いです。

 ペア作業をする
他に便利な使い方として、tmux send-keys で別ペインにコマンドを送り、出力をそのコンソールに流す運用にしておくと、人間と Claude が同じ画面を見ながら作業できる状態を作れます。
自分は以下のようなケースで、Claude 側の Bash で実行したくない場合があります。

手順書 / ブログなどで再現手順をコマンドラインで作る
ベンチマーク試験結果

Claude が提案したコマンドを、別ペインの素の shell でそのまま実行する例です。出力をブログや手順書にコピペしやすい形で残せます。

左の Claude が tmux pane %147 で実行してよいですか？ と聞き、右の素の shell で hyperfine / curl のクリーンな出力を取る
この時の会話履歴User
api.shuntaka.dev のパフォーマンスを測定して
コマンドを実行したら確認を挟んで
tmux pane %147 で実行して
Assistant
api.shuntaka.dev のパフォーマンス測定を開始します。まず tmux pane %147 の状態と利用可能なツールを確認します。
Assistant
利用可能なツール: curl, hey, ab, hyperfine。まずは /health エンドポイントへの疎通確認を行います。tmux pane %147 で以下のコマンドを実行します。
curl -sS -o /dev/null -w 'http_code=%{http_code} dns=%{time_namelookup}s connect=%{time_connect}s tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s\n' https://api.shuntaka.dev/health
Assistant
疎通成功です。結果を整理します。



指標
値




http_code
204(正常)


DNS lookup
146ms


TCP connect
186ms


TLS handshake
231ms


TTFB
851ms


total
851ms



初回 TTFB が 851ms と大きめです。コールドスタートの可能性があるため、次は連続測定でウォーム状態のレイテンシを確認したいです。
次に実行したいコマンド(hyperfine で 10回連続実行、ウォームアップ 3 回)。
hyperfine --warmup 3 --runs 10 'curl -sS -o /dev/null https://api.shuntaka.dev/health'
このコマンドを tmux pane %147 で実行してよいですか？
User
OK
Assistant
実行します。
Assistant
/health のウォーム状態の結果です。



指標
値




Mean
174.5ms ± 46.6ms


Min
117.4ms


Max
245.7ms



コールド 851ms → ウォーム 175ms。コネクション再利用は curl 単発呼び出しなので毎回 TLS ハンドシェイクが入っている前提の結果です。
次は記事一覧エンドポイントを測定したいです。ユーザー名は shuntaka9576 を想定。
hyperfine --warmup 3 --runs 10 'curl -sS -o /dev/null https://api.shuntaka.dev/users/shuntaka9576/articles'
実行してよいですか？
(以降上記のgifの通り)

 並行作業
 前提
git worktree を切って、別ペインで別の Claude Code を走らせる、という並行作業のスタイルがあります。自分は以下の要素がある場合活用しています。

長時間かかるタスク: 大きめのリファクタや調査系は、走らせたあと数分〜数十分待つことがある。その間、人間が手を止めているのは単純にもったいない
環境を分離したいタスク: worktree で隔離しておけば、ダメだったらブランチごと捨てられるし、本筋のセッションを汚さない [5]

worktrunkを使ってworktreeを作成しています。worktree wrapperは沢山あるので好きなものを利用するのが良いかなと思います。設定ファイルは以下のようにしています。

設定のポイントは以下です。

worktree-path: bare リポジトリと並列にブランチ名のディレクトリを作る配置（<bare-repo>/../<ブランチ名>/）
pre-start の set-upstream: 新規 worktree のブランチに origin/<branch> を upstream として張るフック。git status の ahead/behind や引数なしの git push / pull を効かせるために入れています。

bare clone は .bare/ をリポジトリ本体として独立させ、main も含むすべての worktree がその下に対等に並ぶ形にできます。
~/repos/                                  # ghq.root
└── github.com/
    └── <owner>/
        └── <repo>/                      # リポジトリのコンテナ
            ├── .bare/                   # bare リポジトリの中身 (repo_path)
            ├── .git                     # "gitdir: ./.bare" を指すテキストファイル
            ├── .envrc                   # direnv: 全 worktree 共通の環境変数
            ├── main/                    # worktree (branch=main)
            │   ├── .envrc               # source_up + dotenv .env.local
            │   └── .env.local           # この worktree 固有の値 (PORT 等)
            ├── feature-auth/
            ├── fix-login-bug/
            └── refactor-api/
.envrc は bare と並ぶ位置に1枚置いて、全 worktree で共通の環境変数はそこに集約しています。各 worktree の .envrc は source_up で親の共通設定を継承しつつ dotenv .env.local を読むだけの中身にして、PORT のように worktree ごとに変えたい値は .env.local 側に書いています。
ここは個人の好みで、ghq rootにworktreeが並ぶのが見やすいケースもあるので、各自好きな構成を考えてみてください。
 各ペインの状態監視
こちらもターミナルアプリ、エディタ、TUIなど、AIエージェント状態監視のソリューションは沢山あるので調べて使ってみると良いと思っています。
自分としてはこの課題に対して既存の構成(ターミナルアプリ + tmux)を大きく変える必要はないと感じていました。新規のツールは保守面で安定するまで時間を要します。なので既存の構成にミニマムにアタッチできる、トレイに隠れるAIエージェントの状態管理macOSアプリを利用しています。macOSアプリなのでターミナルアプリ外でも2キーで対象ペインに遷移できます。

詳しくは以下の記事に書いていますので興味があれば読んで頂けると嬉しいです。

 worktreeのtmux ウィンドウのソート
worktree を増やすほど、tmux のウィンドウは作成順にそのまま末尾へ積まれていきます。ウィンドウ名を <プロジェクト>-<worktree> 形式（例: shu-memo, shu-kanban）で運用していると、同じプロジェクトの worktree が離れた位置に散らばってしまいがちです。
ソート前（作成順）
[0] A-a | B-a | C-a | A-b
M-S でウィンドウ名のアルファベット順にソートすると、同じプロジェクトのウィンドウが隣接します。
ソート後（M-S 押下）
[0] A-a | A-b | B-a | C-a
大文字 A/B/C がプロジェクト、ハイフン以降がそのプロジェクト内の worktree 名のイメージです。同じプロジェクトのウィンドウが隣り合うので、Option + h/l の左右移動だけでプロジェクト単位の切り替えが完結します。

複数の worktree で別 Claude を回し、M-S でウィンドウを整列させる

 さいごに
今回はtmux軸でClaude Codeの活用方法を書いてみました。tmuxは使い始めて初期からほぼキーバインドやwindow構成は同じでした。ですがAIコーディングエージェントの波が来て、人間がコーディングをしなくなるスタイルに移行するべく大きく変更しました。
AIコーディングエージェントの波が来る前は、1プロジェクトあたり3つのwindow(lazygit, nvim, shell)を使っていました。これが現在では1つのwindowになってしまったことが驚きです！ソースコード編集作業は非常に大きな表示領域を求められていましたが、それが必要無くなったことによる影響が大きいと思っています。
これが出来るのはtmux自体の設計思想や柔軟性の成せる業なんだなと思います。
AIコーディングの環境を模索している人の参考になれば幸いです。自分にとってのベストを見つけてみてください。
この領域は個人、ビッグテック、ベンチャーなどプレイヤーが多いです。これからも目まぐるしく変わると思います。来年この記事を振り返ったらどう思うか今から楽しみです。

脚注

このレイアウトの特徴は、右側の上下に並んだ 2 つのモデルに同じタスクを同時に投げ、出てきた diff を見比べて良いところをマージしたり、片方の出力をもう片方にフィードバックして書き直させたりする「デュアルモデル並列」のスタイルにあります。単一モデル運用に比べてレビューが速く、片側のミスを拾いやすいのがメリットです。詳しい背景や運用の機微は元の動画/記事を参照してください。 ↩︎

現状はMaxプランで使用量を気にせずOpusだけで運用できているという背景もあります。今後コスト最適化がより求められる場面では、ペインごとに高速・低コスト寄りのモデル（Cursorのcomposer-2やCodexのSpark系など）とThinkingモデル（Opus系）を使い分けて配置した方が、タスクの性質に応じてどちらに投げるかを目視で切り替えられて作業しやすい可能性が高いと考えています。 ↩︎

/bwt で会話中で質問可能ですが、聞いた内容がすぐ消えてしまう。残らないという点で私の使い方には合いませんでした。 ↩︎

実装にあたっては raine/tmux-file-picker を参考にしました。 ↩︎

特に環境を触るタスクとは相性がいいです。たとえばパッケージマネージャを高速なものに乗り換えてみる、といった変更は失敗したときの切り戻しが重く（lockfile を戻す、依存を入れ直す、CI の挙動を確認し直す…）、本流の worktree でやると後悔します。worktree を捨てるだけで済むなら、そもそも試行のハードルが下がるといった感じです。 ↩︎
