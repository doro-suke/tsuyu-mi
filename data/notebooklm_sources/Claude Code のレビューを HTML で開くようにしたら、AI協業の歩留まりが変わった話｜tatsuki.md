# Claude Code のレビューを HTML で開くようにしたら、AI協業の歩留まりが変わった話｜tatsuki
- **Source URL**: https://note.com/nobel/n/n33b2a4e8eedf
- **Score**: 85
- **AI Summary**:
  - AIの出力をHTML化し自動表示することで、コードレビューの可読性と対応率が劇的に向上する
  - CLAUDE.mdでの指示だけでなく、PostToolUseフックを用いた確実な自動オープン設定を提示
  - 重要度色分けや折りたたみを含む、外部依存なしのHTML最小テンプレートと実装方法を公開
- **Read Now Reason**: AI駆動開発においてClaude Codeの大量のテキスト出力に認知負荷を感じている場合、本稿に記載されたフック設定とHTMLテンプレートを導入することで、今すぐレビュー歩留まりを改善できるため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #開発プロセス自動化, #コードレビュー
- **Processed Date**: 2026/6/22

---

## 本文
この記事は期間限定で全文無料で読めます「Claude Code にコードレビューを頼んだ。返ってきたのは200行のMarkdown。……なんとなく眺めて、だいたい直した。」そんな体験、思い当たりませんか？問題は AI の質じゃない。受け取り方がボトルネックになっています。ターミナルで `cat` して流し読みする。長いレビューをプレーンテキストのまま眺める。`#` や `|` がそのまま並んでいる状態では、どこが重要でどこが軽微なのか判断しづらい。結果、読んではいるけど直す量が半分以下になる。AI の出力精度を上げることに頭がいくけど、実は"受け取り側の設計"が歩留まりを決めています。2. HTML で受け取ったら別物になった転機は、僕が CLAUDE.md／rules に「レビューや成果物は HTML で出力して `open` で開く」というルールを書いて、Claude にその形で返させるようにしたときです。（このルールがどこまで"確実に"効くのかは後半で詰めます。まずは器を変えるだけで何が変わったか。）同じ内容のレビューが、HTML 1枚としてブラウザで開く。見出しが階層になっている。コードブロックに色がついている。`Cmd+F` でファイル名を検索できる。severity ごとに赤・黄・緑で色分けされている。長いセクションは `<details>` で折りたたんで全体が見渡せる。正直、最初は「どうせ見た目だけ」と思っていました。でも実際に運用してみると、直す回数が明らかに増えた。読み飛ばしていた "minor" 指摘まで拾うようになっていた。内容は同じ。変えたのは器だけです。3. なぜ HTML が効くのかMarkdown は素のテキストです。`#` や ` ``` ` は、レンダラを通して初めて見出しやコードブロックになる。ターミナルや素のエディタで開けば記号のまま。それが流し読みを生んでいます。HTML はブラウザがネイティブに描画します。専用プラグインもビューアも不要で、ダブルクリックするだけです。理由1: 描画される見出し階層・表・コードのシンタックスハイライトが、そのまま見える。ターミナルに流れていったテキストと、ブラウザで整形されたドキュメントは、同じ情報量でも処理速度がまったく違います。理由2: 探せる・畳める`Cmd+F` でページ内検索ができる。各見出しに `id` を振れば目次アンカーで節ジャンプもできる。長いレビューは `<details>` / `<summary>` でセクションを折りたたんで全体を俯瞰し、必要な部分だけ展開する。これがターミナルで `cat` したものにはできない芸当です。理由3: 重要度が色で立つseverity を色分け（赤 = critical、黄 = warning、緑 = info）にすれば、スクロールしながら「どこを優先して直すか」が一目でわかります。before / after を横並び `<table>` で対比すれば、修正の意図も伝わりやすい。Markdown のプレーン表示ではこの強弱が出せません。理由4: 1枚で完結・共有できるself-contained HTML（インライン CSS、JS なし）は1ファイルで完結します。チームメンバーに `.html` を渡せば、相手は環境を問わずブラウザで開ける。Markdown は GitHub 等のレンダラがある場所でないと整わないので、共有のたびに「ちゃんと見えてる？」が発生します。つまり、AIの成果物は"器"の設計で価値が変わるレビューの中身が同じでも、Markdown という器か HTML という器かで、読まれ方と直され方が変わる。これはレビューに限った話ではなく、AI の出力すべてに効く考え方だと思っています。受け取る側のフォーマットを設計するだけで、同じ AI から引き出せる価値が変わる。これは僕だけの感想ではない書いていて知ったのですが、同じことを Anthropic の中の人が言っていました。Claude Code のエンジニアリングリードを務める Thariq Shihipar が、Using Claude Code: The Unreasonable Effectiveness of HTML という記事でほぼ同じ主張をしています。彼の言い分はこうです。100行を超える Markdown はもう読めない。HTML なら表も diff も SVG の図も1枚に収められて、ブラウザで開いて確認できる（Claude に開かせてもいい）。コードレビューは severity で色分けして、PR ごとに HTML の説明を添付している。そして「Claude Code チームの他のメンバーも使い始めている」と。僕がたまたまたどり着いた運用は、ツールを作っている側が先に行き着いていた結論だった、というわけです。逆に言えば、ここに賭ける価値はある。4. 実際にどう仕込んでいるかCLAUDE.md / rules でルール化する（advisory）僕の運用では `~/.claude/rules/review-deliverables.md` に以下を書いています。全セッション共通でロードされるファイルです。レビューや確認が必要な成果物はターミナルに貼らず、
HTML ファイルに書き出して open <path> で開く。
置き場所: 各 repo の tasks/_review/（.gitignore に追加）。
対象外: 軽い口頭回答・コードスニペット・進捗報告。ここで一つ、注意点。CLAUDE.md は "advisory"（推奨）であって、保証ではありません。ドキュメントにも明記されています。「書けば毎回確実に実行される」は誤り。Claude がコンテキストから判断して従うかどうかで決まります。毎回確実に `open` まで固めたいなら、hook で deterministic 化する必要があります。hook で deterministic 化する（確実に毎回）`PostToolUse` hook を使えば、Write 操作の直後に任意の shell コマンドを走らせられる。`settings.json` の設定例:{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write",
      "hooks": [{ "type": "command", "command": "~/.claude/hooks/auto-open-review.sh" }]
    }]
  }
}`auto-open-review.sh` がやることはシンプルで、(1) hook が渡してくる入力から書き出されたファイルのパスを取り出し、(2) それが `tasks/_review/` 配下の `.html` なら `open` する、だけです。ここで一点注意。PostToolUse hook は実行されたツールの情報を標準入力に JSON で渡してきます。スクリプト側はその JSON からパスを取り出す必要があり、フィールド名や形式は Claude Code のバージョンで変わりうるので、実装前に必ず公式の Hooks リファレンスで最新のペイロード構造を確認してください。ここで推測のフィールド名をコピペすると動きません。もう一点、hook の async / timeout 設定は環境によって調整が要ります。Write のたびに全ファイルを開くと邪魔なので、上記 (2) の `_review/` 配下への絞り込みは入れておくのが現実的です。self-contained HTML の最小テンプレClaude に「レビューを HTML 化して」と伝えるとき、最小限のテンプレを提示しておくと出力が安定します。以下が僕が使っている骨子（20〜40行程度）:<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>Review</title>
<style>
  body { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
  h2 { border-bottom: 2px solid #ddd; padding-bottom: .3em; }
  .critical { background: #fee2e2; border-left: 4px solid #ef4444; padding: .5em 1em; margin: .5em 0; }
  .warning  { background: #fef9c3; border-left: 4px solid #eab308; padding: .5em 1em; margin: .5em 0; }
  .info     { background: #dcfce7; border-left: 4px solid #22c55e; padding: .5em 1em; margin: .5em 0; }
  details summary { cursor: pointer; font-weight: bold; padding: .4em 0; }
  code { background: #f1f5f9; padding: .1em .4em; border-radius: 3px; font-size: .9em; }
  pre  { background: #f1f5f9; padding: 1em; overflow-x: auto; border-radius: 6px; }
</style>
</head>
<body>
<h1>Code Review</h1>

<details open>
  <summary>Critical (直近で直す)</summary>
  <div class="critical">
    <code>src/auth.ts:42</code>：トークン検証をスキップしている。必ず修正。
  </div>
</details>

<details>
  <summary>Warning (余裕があれば)</summary>
  <div class="warning">
    <code>utils/fetch.ts:17</code>：エラーハンドリングが不足。
  </div>
</details>

<details>
  <summary>Info (参考)</summary>
  <div class="info">命名規則を統一するとレビュー時間が短縮できます。</div>
</details>

</body>
</html>外部ファイル依存ゼロ、JS なし。ダブルクリックで開けます。5. 運用してわかったこと読まれる・直す回数が増えた先に断っておくと、正確な計測はしていません。あくまで一次体験ベースの実感です。その上で言うと、"minor" 指摘の対応率が上がりました。プレーンテキストだとスクロールで流れてしまう細かい指摘が、色とセクション折りたたみで「これは見えている」状態になるからだと思っています。「HTML で開いた後にドキュメントを閉じてから実装に戻る」という動線が、読んで吸収してから手を動かす、というフローを作っているのだと思います。対象を選ぶ全ての Claude 出力を HTML 化する必要はありません。対象: スペック・記事ドラフト・コードレビュー・計画書・調査レポートなど、「確認してほしい」系の成果物対象外: 軽い口頭回答・コードスニペット・進捗報告・短い確認ここを混同すると、トークンも手間も無駄に増える。毎回「この出力は HTML で」と指定するより、rules ファイルに対象を書いておくほうが楽でした。トークンコストと天秤でHTML を丸ごと出力させれば、当然 Markdown より出力トークンは増えます。レビューが大きいほど差も開きます。骨子テンプレを rules で定義して「このスタイルで」と指定すれば、毎回テンプレを考える分は省けます。とはいえ体験差はレビュー1件で十分わかるので、コストに見合うかどうかは結局その人しだい。6. まとめ｜器を変えると歩留まりが変わる持ち帰りは1つ。Claude Code のレビュー・成果物は、Markdown で眺めるより HTML にして `open` で開くほうが、明らかに読まれるし、直される。内容の精度より先に、受け取り側の設計を整えること。AI 協業の歩留まりは、出力品質だけで決まらない。というのが実運用で気づいたことです。今日からできる最小手順:`tasks/_review/` ディレクトリを作って `.gitignore` に追加するCLAUDE.md か rules ファイルに「レビュー成果物は HTML で `tasks/_review/` に出力して `open <path>` する」と書くまず1件試してみる。それだけです。advisory（CLAUDE.md）で始めて、「毎回確実に開いてほしい」と思ったら hook で deterministic 化する。この二段が現実的な導入順です。特典Xやnoteで発信できない有益情報は、LINEオプチャにて発信中。 Claude Code/Codexの活用や、AI活用したX運用に興味のある方はぜひご参加ください。
