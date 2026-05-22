# Gemini CLIとClaude Codeによるピンポンプログラミング
- **Source URL**: https://zenn.dev/yonekubo/articles/3a2da69cacaa73
- **Score**: 88
- **AI Summary**:
  - Gemini CLIとClaude Codeを連携させ、AIエージェント間でTDD（テスト駆動開発）を行う手法の解説
  - Claude Codeの非対話モードやセッションID再開機能を活用し、プログラムから制御する具体的な実装案
  - 役割分担、許可ツール、ワークフローを定義したプロンプト（GEMINI.md）の具体的な構成を提示
- **Read Now Reason**: AI駆動開発において、テスト作成と実装を別々のエージェントに担当させるマルチエージェント・オーケストレーションの具体例であり、Claude CodeのCLIオプションを活用した自動化パイプライン構築に即座に活用できるため。
- **Suggested Tags**: #AI駆動開発, #ClaudeCode, #TDD, #自動化パイプライン, #GeminiCLI
- **Processed Date**: 2026/5/5

---

## 本文
TL;DR
本記事では、Gemini CLIとClaude Codeとを用いて、AIコーディングエージェント同士でピンポンプログラミングを実行させる方法について解説します。

 ピンポンプログラミングとは
ピンポンプログラミングは、テスト駆動開発（TDD）をペアプログラミングで実行する手法です。
卓球のラリーのように役割を交代しながら開発を進めることからその名が付けられました。
以下の2つの役割を交互に担当します。

失敗するテストコードを書く
そのテストをパスする最小限のコードを書く

もちろん、テストがパスするようになったら必要に応じてコードのリファクタリングも行います。

 今回の技術的な構成
今回は、ピンポンプログラミングの2つの役割をそれぞれAIコーディングエージェントに担当させます。

失敗するテストコードを書く役割: Gemini CLI
テストをパスするコードを書く役割: Claude Code

ユーザーとのインターフェースになるのはGemini CLIです。開発ワークフローや諸々のルールはGEMINI.mdに記載します。Claude Codeとのやりとりは、Claude Code SDK（コマンドライン版の非対話モード）を利用します。

 GEMINI.md の記載内容（抜粋）
全文はちょっと長いので、記事の末尾に載せています。

 開発ワークフロー
正しいTDDのやり方を引き出すマジカルフレーズ t-wada を使ってます。
# 開発ワークフロー
- t-wadaさんのやり方に従う
- AI(あなた)は Ping-Pong Programming における、失敗するテストコードを書く役割を担う
- テストをパスするコードを書く実装者は別のAIであり、AI(あなた)自身がコードを実装することは強く禁止する
- 一度に一つのテストケースを作成し、実装者に指示を出す
- もっともシンプルなテストケースから始め、段階的に複雑なテストケースを追加していく
- AI(あなた)は、テストコード以外のコードは絶対に書いてはいけない

 Claude Codeの非対話モード
-p オプションをつけると非対話モードでClaude Codeを起動できます。--resume オプションでセッションIDを付与することで、会話を継続させるのがポイントです（会話履歴がコンテキストに含まれるようになります）。
## コマンド
- Claude Codeの非対話モードを用いる

```bash
% claude -p "指示" --output-format=json --system-prompt "システムプロンプト" --allowedTools "許可されたツール" 
```

- 出力結果のJSONには "session_id" が含まれるので、次回からはセッションIDを指定してセッションを再開する

```bash
% claude -p "指示" --output-format=json --resume <session_id> --system-prompt "システムプロンプト" --allowedTools "許可されたツール"
```

 ツールの使用（Claude Code）
非対話モードで呼び出すClaude Codeがタスクを遂行する上で必要なパーミッションを一通り指定しています。面倒なら、自己責任のもと、 --dangerously-skip-permissions を指定してもいいですが。
## 許可されたツール
`--allowedTools` オプションを使用して、以下のツールを許可する。毎回以下の全てのツールを指定すること。
```
Read
ReadFile
Edit
MultiEdit
WriteFile
DeleteFile
Grep
LS
Glob
Bash(npm run:*)
Bash(npm test)
Bash(cat:*)
Bash(ls:*)
Bash(tree:*)
Bash(find:*)
Bash(mkdir:*)
```

オプション指定例
```
--allowedTools "Read,Edit,Bash(ls:*),Bash(npm run *)"
```

 FizzBuzzでサンプル実装
ターミナルからGemini CLIを起動します。
% gemini
指示を出します。
> FizzBuzzを実装して。
ちゃんとt-wadaさんのやり方に従って、実装者（Claude Code）と連携しながらピンポンプログラミングを進めてくれます。
✦ 承知いたしました。FizzBuzzの実装を開始します。
  t-wadaさんのやり方に従い、まずは最もシンプルな、失敗するテストコードを作成します。

  (中略)

　src/fizzbuzz.tsにはfizzbuzz関数を空の状態で定義し、src/fizzbuzz.test.tsには、
　数値を文字列に変換する最もシンプルなテストケースとして「1を渡したら"1"が返ってくる」
　ことを確認するコードを記述します。

  (中略)

  次に、実装者にFizzBuzzの実装を依頼します。
  実装者には、src/fizzbuzz.test.tsのshould return "1" when given 1
　テストケースをパスするように実装を依頼します。
  │ Shell claude -p "FizzBuzzの実装をお願いします。
　　src/fizzbuzz.test.ts の `should return \"1\" when given 1` を
　　パスしてください。" -… │

  (中略)

✦ 実装者は、現在のテストケースはすでにパスしていると判断しています。
  npm test を実行して、本当にテストが成功するのかを確認します。

  (中略)

 ✦ テストが成功しました。
  次のステップとして、3の倍数の場合に "Fizz" を返すテストケースを追加します。
  src/fizzbuzz.test.ts に、fizzbuzz(3) が "Fizz" を返すことを確認する
　テストコードを追記します。

  (中略)

✦ すべてのテストが成功しました。
  これでFizzBuzzの基本的な実装は完了です。
  実装者から、コードの可読性や保守性について特に指摘はなかったため、リファクタリング
　は不要と判断します。以上で、FizzBuzzの実装を終了します。

 まとめ
一年前の今頃は、「人間とAIでピンポンプログラミングができるようになった。すごい！」と言っていたのですが、AI同士でそれが実現できるようになるなんて！
（補足）Gemini CLIのキャッチアップ中のため、今回はGemini - Claudeで実施しましたが、もちろんClaude - Claudeでやらせても構いません。

 GEMINI.md の記載内容（全文）
# 開発ワークフロー
- t-wadaさんのやり方に従う
- AI(あなた)は Ping-Pong Programming における、失敗するテストコードを書く役割を担う
- テストをパスするコードを書く実装者は別のAIであり、AI(あなた)自身がコードを実装することは強く禁止する
- 一度に一つのテストケースを作成し、実装者に指示を出す
- もっともシンプルなテストケースから始め、段階的に複雑なテストケースを追加していく
- AI(あなた)は、テストコード以外のコードは絶対に書いてはいけない

# 実装者(別のAI)とのやり取り
このセクションの記載内容に**厳密に**従うこと。
## コマンド
- Claude Codeの非対話モードを用いる

```bash
% claude -p "指示" --output-format=json --system-prompt "システムプロンプト" --allowedTools "許可されたツール" 
```

- 出力結果のJSONには "session_id" が含まれるので、次回からはセッションIDを指定してセッションを再開する

```bash
% claude -p "指示" --output-format=json --resume <session_id> --system-prompt "システムプロンプト" --allowedTools "許可されたツール"
```

**重要** コマンドを実行する前に、必ず上記の形式で必要なオプションが指定されていることを確認すること。

## 指示
以下の情報を伝える。
- タスクの目的
- 失敗するテストコードの情報（プロジェクトルートからの相対パス、テストケース名）

## システムプロンプト
`--system-prompt` オプションを使用して、以下の内容を設定する。

```
- t-wadaさんのやり方に従う
- あなたは Ping-Pong Programming における、失敗するテストコードをパスするコードを書く役割を担う
- テストコード自体を修正したり、削除したりすることは禁止する
- テストコードの修正が必要な場合は、ユーザーへ知らせること
- 指定されたテストケースがパスするだけでなく、既存のテストケースもすべてパスするように実装すること
- 作業を遂行する上で権限が不足している場合は、ユーザーへ何の権限が不足しているかを伝えること
```

## 許可されたツール
`--allowedTools` オプションを使用して、以下のツールを許可する。毎回以下の全てのツールを指定すること。
```
Read
ReadFile
Edit
MultiEdit
WriteFile
DeleteFile
Grep
LS
Glob
Bash(npm run:*)
Bash(npm test)
Bash(cat:*)
Bash(ls:*)
Bash(tree:*)
Bash(find:*)
Bash(mkdir:*)
```

オプション指定例
```
--allowedTools "Read,Edit,Bash(ls:*),Bash(npm run *)"
```

## 結果確認
- 実装者からの出力結果を確認し、テストコードが成功するかチェックする
- テストが失敗する場合は再度実装者に指示を出す
- 権限不足の場合、ユーザーに不足している権限情報を伝えて、処理を中断する。権限を与えるなどAIが勝手な判断で進めることを禁止する
- テストコードが成功する場合、コードを評価し、可読性や保守性に問題があるなら、実装者にリファクタリングを依頼する

# 使用技術
- node.js
- jest
- TypeScript
