# Claude DesignとClaude Codeを連携させてアプリを実装する
- **Source URL**: https://zenn.dev/teeyo/articles/claude-design-with-claude-code
- **Score**: 75
- **AI Summary**:
  - Claude Designで作成したデザインをMCP経由でClaude Codeへ直接引き継ぐ手順を解説。
  - MCPサーバー追加コマンドと自動プロンプト連携による具体的コード実装フローを提示。
  - Claude Code単体生成とClaude Design連携時の生成デザインやUI品質の相違を検証。
- **Read Now Reason**: AI駆動開発においてClaude CodeとMCP（Claude Design MCP）を連携させたUI開発パイプラインの構築手順および具体的な設定コマンドが明記されているため。
- **Suggested Tags**: #Claude Code, #Claude Design, #MCP, #AI駆動開発
- **Processed Date**: 2026/8/2

---

## 本文
※ この記事は人間が書いて、AIがレビューしました。
※ 2026/07/24時点の情報になります。

 はじめに
自作アプリを作りたいが、AI臭いデザインになってしまう。
プロっぽいデザインでアプリを作りたい。
そんな時に役立つのがClaude Designです。
Claude Designは、自然言語での会話を通じてデザイン、プロトタイプ、スライドなど、完成度の高いビジュアル作品を作成できるツールです。
作成したデザインは、MCPを使用して簡単にClaude Codeに引き継げます。
本記事では、「Claude Designを使用してプロトタイプ作成　=> Claude Codeで実装」の一連の手順を紹介いたします。

 利用するアプリケーション

Claude Design（Claude Desktopに内包）
Claude Code


 Claude Designを使用してみる
今回はサンプルとして家計簿アプリを実装してみます。
まずはやりたいことをClaude Designに入力します。

Claude Designが意図を明確にするために幾つか質問をしてくれるので、それらに回答します。



しばらく待つと、Claude Designがサンプルを複数案作成してくれます。
具体的なモノを提示してくれるので、アイデアが浮かびやすいのが良いところです。



作成されたサンプルの中から気に入ったものを指定します。
ホームは1bで
可視化は1dで
すると、それらを組み合わせたプロトタイプが作成されました。


 Claude CodeにDesignを渡して実装させる
claude designのmcp serverが必要になるので、以下urlの手順でインストールします。
Claude Designを始める

サーバーを追加します。

claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp

/design-loginを実行してサインインします。

Claude DesignのShareからClaude Codeを選択します。

今回はlocal Agentを使用し、指示を入力した上でCopy Promptを選択します。

すると、以下のようなプロンプトがクリップボードにコピーされます。
Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login) to import this project:
https://claude.ai/design/p/e84c86ed-ffd8-...?file=%E5%AE%B6%E8%A8%88%E7%B0%BF%E3%82%A2%E3%83%97%E3%83%AA.dc.html

Focus on these files (the whole project is readable):
- `家計簿アプリ.dc.html`

Also read these files the selection imports:
- `_ds/organic-6b4d2032-9bb9-44c9-8391-66d04a0f340c/_ds_bundle.js`
- `_ds/organic-6b4d2032-9bb9-44c9-8391-66d04a0f340c/styles.css`
- `ios-frame.jsx`
- `support.js`

Implement: CloudflareにWorkerとしてデプロイできるPWAにして実装してください。
実際にプロンプトを実行すると、MCPサーバを利用してファイルを取得し、Claude Codeが実装を始めます。
⏺ claude-design - get_project (MCP)(project_id: "e84c86ed-ffd8-...")
{
  "id": "e84c86ed-ffd8-...",
  "name": "家計簿アプリプロトタイプ",
  "sharing": {
    "link_permission": "comment",
    "scope": "org",
    "view_mode": "team"
  },
  "type": "PROJECT_TYPE_PROJECT",
  "url": "https://claude.ai/design/p/e84c86ed-ffd8-..."
}

⏺ claude-design - list_files (MCP)(project_id: "e84c86ed-ffd8-...", depth: -1)
[
  { "path": ".thumbnail", "type": "file", "size": 7444 },
  { "path": "_ds/organic-6b4d2032-.../_ds_bundle.js", "type": "file" },
  { "path": "_ds/organic-6b4d2032-.../styles.css", "type": "file" },
  ...(省略)
  { "path": "ios-frame.jsx", "type": "file", "size": 16507 },
  { "path": "support.js", "type": "file", "size": 69150 },
  { "path": "家計簿アプリ.dc.html", "type": "file", "size": 74528 }
]

⏺ claude-design - read_file (MCP)(project_id: "e84c86ed-ffd8-46...", path: "家計簿アプリ.dc.html")
取得されたのは主に以下のファイルです。


家計簿アプリ.dc.html — プロトタイプ本体

_ds/organic-.../ — デザインシステム（CSSやバンドル）

ios-frame.jsx — プレビュー用のiPhoneフレーム

support.js — プロトタイプの動作を支えるスクリプト

Claude Sonnet5で実装させてみました。
特に指示を付け加えることなく、5分ほどで作業が完了。
HTML + CSS + Vanilla JS, localStorage使用のサンプル実装です。
デプロイされたアプリは以下のようになりました。

ボタンの位置がずれていたり、ところどころ惜しい部分はありますが、
Claude Designの結果を引き継ぐことには成功していそうです。

 デザインもClaude Codeでやれば良いのでは？
参考までに、「自分だけの家計簿アプリを作りたい」というプロンプトだけで実装した結果をそれぞれ記載します。
1度試した結果のみになるので、生成のばらつきは考慮出来ていません。
Claude Code Plan + auto implementation(Opus5)

Claude Design(Opus5)

Claude CodeのPlanモードで発生したやり取りは以下の通りです。
⏺ User answered Claude's questions:
· どの形で作りますか？（プロトタイプの土台となる構成） → Vite + React + TS（推奨）
· データはどこに保存しますか？ → localStorage（推奨）
· 最初のプロトタイプに入れる機能は？（基本の「支出の記録・一覧・当月合計」は必ず入ります） → カテゴリ別グラフ
Claude Codeの会話履歴で使用されていたのはdatavizというskillだけでした。
他にもskillを使用したり、プロンプトを工夫することで改善は可能と思われます。
Claude Codeの結果も機能的には悪くない。むしろこちらの方が見やすいかもしれないと感じますが、機能的で質素な印象を受けます。
デザインに拘りたい場合や、skillやプロンプトエンジニアリングに詳しくない場合はClaude Designを利用するとよさそうです。

 感想
ここまで、Claude Design + Claude Codeを連携させる方法を紹介しました。
デザイナーさんにデザインを依頼して、それをエンジニアに実装してもらう。
それに近い体験が出来ることが新鮮でした。
今回はシンプルな利用方法でしたが、自作のデザインテーマを使用したり、skillを組み合わせたりなど、他にも出来ることは多そうです。
皆さんもぜひ試してみてください！
