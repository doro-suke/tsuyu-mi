# Dccd
- **Source URL**: https://zenn.dev/yurinchi/articles/879883dc91c3d6
- **Score**: 60
- **AI Summary**:
  - MCPの仕様と、Node.jsおよびWebSocketを用いたGodot連携のシステム構成を解説
  - Claudeの構成ファイルとGodotアドオンによる具体的な双方向連携の手順を明記
  - AIからゲームエンジンを直接操作し、数分でゲームを自動生成するプロセスを実証
- **Read Now Reason**: Claude Desktopと外部ツールを接続するMCP（Model Context Protocol）の具体的な設定手順やJSON設定、WebSocketを介した双方向通信アーキテクチャが解説されており、ローカル環境におけるAI駆動開発のパイプライン構築の設計パターンとして非常に参考になります。
- **Suggested Tags**: #MCP, #Claude-Desktop, #AI駆動開発, #Godot
- **Processed Date**: 2026/6/22

---

## 本文
テーマ「AI駆動開発でやったこと」
 はじめに
Claudeとgodot-mcpを利用してGodotのゲーム開発を実践していこうと思います。
今流行りのAIの自然言語処理能力を活用し、作りたいゲームの「雰囲気」や「感覚」を伝えてどんなゲームが出来るか試していきます。
Claudeを利用してゲームを作る方法はいくつか方法がありますが、今回は主にgodot-mcpを活用した開発方法について情報を整理していきます。
動画でも解説をしているのでよかったら見てください！


 🔌 MCP（Model Context Protocol）とは？
MCPは一言で言うと「AIのためのUSB-C」です。
Claudeを開発したAnthropic社が提唱した、AIが、外部ツールやデータに安全かつ柔軟にアクセスできるようにする標準プロトコルです。

 🏁 MCPの目的
従来、AIに外部ツールを使わせるには、以下のような個別のAPI設計やカスタム連携が必要でした。

🔧 API設計：ツールごとにREST APIやGraphQLを設計・公開
🧪 カスタム連携：AIがそのAPIを使えるように、専用のプロンプトやコードを組む
🔐 認証・権限管理：OAuthやトークンの扱いもツールごとに異なる
🧠 AI側の理解：ツールの仕様をAIが理解できるように、文脈を与える必要がある

ツールごとに異なる接続方法・仕様・制約があり、AIがそれらを使いこなすには多くの手間と知識が必要でした。
MCPはそれを統一的な仕組みで解決します。

 🏗 MCPの構成要素
MCPは以下の3つのコンポーネントで構成されます



コンポーネント
役割




MCPホスト
Claude DesktopやClaude Codeなど、AI本体。MCPクライアントを通じて外部と接続


MCPクライアント
ホスト内の仲介役。特定のMCPサーバと通信する


MCPサーバ
外部ツールやデータを提供する軽量サーバ。AIが使える「リソース」「ツール」「プロンプト」を提供





 🔁 通信方式
MCPは JSON-RPC 2.0 をベースにしたステートフルなセッションプロトコルです。 通信は以下の方法で行われます。


stdio（標準入出力）
HTTP + Server-Sent Events（SSE）

これにより、AIとツール間で双方向のやり取りが可能になります。

 🧰 MCPサーバの役割
MCPサーバは、AIからの指示を受けて、外部ツールやデータソースにアクセスする「仲介者」として機能します。
MCPサーバが外部ツールを操作する方法は、MCPサーバの実装次第で柔軟に設計されています。



MCPサーバの役割
外部ツールとの接続方法




AIからの指示を受け取る
JSON-RPC 2.0（stdio/SSE）


外部ツールを操作する
API / SDK / CLI / ファイル操作など


結果をAIに返す
JSON形式で応答




 🤖 Godot-MCPの説明
Godotはプロジェクトの内容をプレーンテキストで管理することが出来るため、
MCPを利用せずともAIが直接テキストを編集してゲームを作ることも可能ですが、
MCPを利用することで、Godotのプロジェクト構造、現在のシーン、ノードツリー、リソースの状況などを直接取得できます。
これにより、単なるドキュメント知識だけでなく、プロジェクトの「文脈」を理解した上で、より適切で正確なコードや設定を提案できるのです。
Godotエンジンを操作するMCPとして代表的な２つのMCPサーバが公開されています。

ee0pdt/Godot-MCP
Coding-Solo/godot-mcp

この記事では ee0pdt/Godot-MCP の説明をしていきます。

 ee0pdt/Godot-MCPのディレクトリ構造
ディレクトリの構造を見てみましょう。
Godot-MCP/
├── addons/
│   └── godot_mcp/
├── docs/
└── server/
serverはNode.jsで実行されるMCPサーバです。
Claudeがユーザーの自然言語の指示をMCPプロトコルで定義された特定のJSON-RPCメソッドを呼び出すためのコマンドに変換し、MCPサーバに伝達します。
addons/godot_mcpはGodotエディターで利用するAdd-Onです。
Godotエディターを起動するとGodot内にWebSocketサーバーを作成します。
MCPサーバとaddons/godot_mcpがソケット通信を行い、addons/godot_mcpがGodot API呼び出してGodotを操作します。

 🎮 Godot-MCPとの連携
ClaudeがGodotのゲームプロジェクトを操作するには、以下のような流れになります。

Godotエディターを起動
Add-OnがGodot内にWebSocketサーバーを作成する
Claude Desktopを起動
開発者が Claude に自然言語で指示を出す
Claude Desktop内のMCPクライアントがNode.jsでMCPサーバのプロセスを起動
stdio(標準入出力)を介してMCPサーバにコマンドを伝達
MCPサーバがGodot内にWebSocketサーバーと通信
WebSocketサーバーがGodot API呼び出してGodotを操作
GodotからMCPサーバに応答メッセージを送信します
MCPサーバからClaudeへ応答結果を返却します



 実践

 セッティング
堅苦しい説明も終わったので実際に設定を進めていきます。
前提としてClaude Desktop、node.js、Godotが既にインストールされているPCで進めていきます。
ちなみに下記の環境で試しています。



名前
バージョン




Node.js
v20.9.0


Godot
v4.3.3




 Godot-MCPの取得
githubからGodot-MCPを取得します。

 Godot-MCPの中からMCPサーバの抜き出し
Godotのゲーム開発共通で利用するため、MCPサーバだけ抜き出してます。
サンプルでは下記のディレクトリに配置します。
~/workspace/claude/MCP/godot-mcp
git clone https://github.com/ee0pdt/Godot-MCP.git
mkdir ~/workspace/claude/MCP/godot-mcp
mv Godot-MCP/server ~/workspace/claude/MCP/godot-mcp/server
node.jsの必要なパッケージをインストールして、TypeScriptをビルドしてMCPサーバを作成しましょう。
cd ~/workspace/claude/MCP/godot-mcp/server
npm install
npm run build

 Claude Desktopの設定
Claude DesktopにMCPサーバを登録します。
Claude Desktopを起動し、設定 > 開発者に移動し「設定を編集」ボタンを押します。

Claudeの設定ファイルが置かれたディレクトリが開くのでclaude_desktop_config.jsonファイルを見つけ出し、テキストエディタで編集します。

 claude_desktop_config.json
{
  "mcpServers": {
    "godot-mcp": {
      "command": "{Node.jsのパス}",
      "args": [
        "/Users/yurinchi/workspace/claude/MCP/godot-mcp/server/dist/index.js"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}


Claude Desktopを再起動するとMCPサーバーが登録されていることが確認できます。


 アドオンの設定
Godot側にアドオンを設定していきます。アドオンはgodotのプロジェクト毎に設定する必要があります。
まずは新しくゲームのプロジェクトを作成して、先ほどダウンロードしたGodot-MCPからアドオンのファイルをゲームのプロジェクトに組み込みます。
Gitで取得したGodot-MCPのaddonsディレクトリをGodotのファイルシステムにドラッグ&ドロップします。
次にプロジェクト設定>プラグインに行くとGodot-MCPが一覧に表示されていると思うので、有効のチェックボックスをオンにします。
そうするとGodotの出力パネルにWebSocketサーバーが立ち上がったログを確認することが出来ます。
これでセットアップは完了です。

 実際にゲームを作ってみる
それでは早速ゲームを作ってみましょう。
まず初めにClaudeに現在のプロジェクトの情報を認識させましょう。
以下のように指示をしてみましょう。
godot-mcpでゲーム情報を取得して
次にリバーシーを作るように指示してみましょう。
リバーシーを作ってみて
Claude Desktopが思考を始めるのとGodotを操作していることが視覚的にも確認できます。
Claudeの作業が終わったらGodotで最新のファイルを読み込みましょう。
実際にプレイするとリバーシーがたった数分で完成していることが確認できると思います。

 ✅ MCPのメリット

開発効率の向上：AIとツールの連携が簡単に
再利用性：1つのMCPサーバを複数のAIアプリで使える
セキュリティ：アクセス権限やデータ制御が明確
ベンダーロックイン回避：Claude以外のAIでも同じMCPサーバが使える


 ⚠ MCPの課題

ステートフル通信の運用コスト：常時接続が必要
実装の複雑さ：既存ツールをMCP対応させるには手間がかかる
セキュリティリスク：ツール汚染や認証情報の漏洩などの懸念も
