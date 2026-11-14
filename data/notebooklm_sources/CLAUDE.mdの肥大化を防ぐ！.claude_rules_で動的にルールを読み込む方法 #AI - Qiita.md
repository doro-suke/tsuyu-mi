# CLAUDE.mdの肥大化を防ぐ！.claude/rules/で動的にルールを読み込む方法 #AI - Qiita
- **Source URL**: https://qiita.com/tomada/items/cb05d3a7aa00cb35c486
- **Priority**: high
- **AI Summary**:
  - .claude/rules/によりCLAUDE.mdの肥大化を防ぐモジュール化が可能。
  - YAMLフロントマターのpaths指定で、特定ファイル操作時のみルールを動的読込。
  - 必要時のみコンテキストを消費するため、大規模開発でもAIの応答精度を維持。
- **Read Now Reason**: Claude Codeの最新機能を活用し、AIのコンテキスト消費を劇的に削減して開発効率を高める具体的な方法が解説されているため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #開発効率化
- **Processed Date**: 2026/5/3

---

## 本文
こんにちは、とまだです。
Claude Codeを使っていると、プロジェクトごとのルールをCLAUDE.mdに書いていくことが多いと思います。
「TypeScriptのコーディング規約」「テストの書き方」「APIの設計ルール」...気づいたらCLAUDE.mdが数百行になっていた、なんてことはありませんか？
CLAUDE.mdが大きくなると、起動時に全てがコンテキストに読み込まれます。つまり、常にコンテキストを圧迫し続けるわけです。これはちょっともったいないですよね。

最近、Claude Codeには.claude/rules/という機能が追加されました。
ルールをファイルごとに分割でき、さらに必要な時だけ動的に読み込む設定が可能です。

この記事では、実際に検証用プロジェクトを作って動作を確認した結果をお伝えします。
本検証や調査にあたっては oikon48さんのツイートを参考にさせていただきました。ありがとうございます！
（12/12追記：Youtube動画で実演していますので、ぜひご覧ください！）


忙しい人のために要約
この記事のポイントを4つにまとめました。


.claude/rules/はCLAUDE.mdの肥大化を防ぐためのモジュラールール機能

paths指定なしのルールは起動時にロード、指定ありのルールは対象ファイル操作時に動的ロード

一度ロードされたルールは重複ロードされない（コンテキスト効率◎）
複数ルールの同時適用も可能（TypeScript + APIルールなど）


著者について
とまだ

Claude Code・Cursor・Codex などAI駆動開発の実践者
本業はフリーランスエンジニア、ならびに法人向けAI駆動開発の導入コンサルタント
AI駆動開発を学ぶ方が集まる Vibe Coding Studio コミュニティを運営
UdemyでAI駆動開発を学べる複数のベストセラー講座を展開

東京AI祭プレイベントに登壇
プログラミングスクール講師として100名以上に指導経験

SNS

X (Twitter)
YouTube
Qiita
Zenn


CLAUDE.md 肥大化問題とは
CLAUDE.mdは便利な機能です。プロジェクト固有のルールや慣習を書いておけば、Claude Codeがそれを踏まえて作業してくれます。
しかし、便利だからといって何でも書き込んでいくと、気づけば肥大化しています。
コーディング規約、テストの書き方、API設計のルール、セキュリティ要件...プロジェクトが成長するにつれて、CLAUDE.mdも膨らんでいきます。
そして問題は、CLAUDE.mdの内容は起動時に全てコンテキストに読み込まれることです。
つまり、TypeScriptのルールも、Markdownのルールも、APIのルールも、全部がコンテキストを占有します。今からREADMEを編集するだけなのに、TypeScriptのルールがコンテキストを使っている...これはもったいないですよね。
人間の頭に例えるなら、ゲームをしているときに、仕事のことがずっと頭に残っているようなものです。

「必要な時だけ、必要なルールを読み込んでほしい」
そんなニーズに応えるのが.claude/rules/機能です。

.claude/rules/とは
.claude/rules/は、CLAUDE.mdを分割して管理するためのモジュラールール機能です。

基本的なディレクトリ構成
まずは基本的なフォルダ構成を見てみましょう。以下はプロジェクトルートに配置するファイル構成の例です。
your-project/
├── .claude/
│   ├── CLAUDE.md           # メインの指示（最小限に保つ）
│   └── rules/
│       ├── code-style.md   # コードスタイル
│       ├── testing.md      # テスト規約
│       └── security.md     # セキュリティ要件

.claude/rules/配下に置いた.mdファイルは、自動的にプロジェクトメモリとして認識されます。サブディレクトリを作っても再帰的に検出してくれるので、frontend/やbackend/といったフォルダで整理することも可能です。
Anthropic 公式も、ベストプラクティスの一つとして触れています。

paths指定による条件付きルール
ここからが本題です。
ルールファイルにYAMLフロントマターでpathsを指定すると、特定のファイルを操作した時だけルールが読み込まれるようになります。
---
paths: src/api/**/*.ts
---

# API開発ルール

このルールには以下のような内容を書きます。

- 全APIエンドポイントは入力検証必須
- 標準エラーレスポンス形式を使用

この設定により、src/api/配下のTypeScriptファイルを触った時だけ、このルールがコンテキストに追加されます。
重要な動作仕様をまとめるとこのようになります。



paths指定
ロードタイミング
コンテキスト




なし
起動時に即座にロード
常に消費


あり
対象ファイル操作時に動的ロード
必要な時だけ消費



paths指定がないルールは従来のCLAUDE.mdと同じく起動時にロードされます。一方、paths指定があるルールは必要になるまでロードされないので、コンテキストを節約できます。


Globパターンの書き方
pathsフィールドではGlobパターンが使えます。
例も交えて、いくつか紹介します。



パターン
マッチ対象




**/*.ts
全ディレクトリのTypeScriptファイル


src/**/*
src/配下の全ファイル


*.md
プロジェクトルートのMarkdownファイルのみ


src/components/*.tsx
特定ディレクトリのReactコンポーネント



複数パターンを指定したい場合は、ブレース展開やカンマ区切りが使えます。
---
paths: src/**/*.{ts,tsx}
---

---
paths: {src,lib}/**/*.ts, tests/**/*.test.ts
---


実際に検証してみた
公式ドキュメントを読むだけでは本当に動的ロードされるのか分からなかったので、検証用プロジェクトを作って確かめてみました。

検証環境のセットアップ
以下のような構成でテストプロジェクトを作成しました。
~/Desktop/rules-test/
├── .claude/
│   ├── CLAUDE.md              # メインの指示
│   └── rules/
│       ├── general.md         # paths指定なし
│       ├── typescript.md      # paths: **/*.ts
│       ├── markdown.md        # paths: **/*.md
│       └── api/
│           └── api-rules.md   # paths: src/api/**/*.ts
├── src/
│   ├── index.ts
│   ├── utils.ts
│   └── api/
│       └── handler.ts
└── docs/
    └── readme.md

どのルールが適用されたか分かりやすくするため、各ルールファイルには「回答の最後に絵文字を付けて」という指示を書きました。具体的には以下の4つです。


general.md（paths指定なし）→ 🌟

typescript.md（paths: **/*.ts）→ 🔷TS

markdown.md（paths: **/*.md）→ 📝MD

api-rules.md（paths: src/api/**/*.ts）→ 🔌API

この「目印方式」で、どのルールが有効になっているか一目で分かります。

検証1: 起動時のロード確認
まず、Claude Codeを起動して/memoryコマンドを実行しました。
╭──────────────────────────────────────────────────────────────────╮
│ Select memory to edit:                                           │
│                                                                  │
│    1. User memory                Saved in ~/.claude/CLAUDE.md    │
│    2. .claude/CLAUDE.md                                          │
│  ❯ 3. .claude/rules/general.md                                   │
│    4. Project memory             Saved in ./CLAUDE.md            │
│                                                                  │
╰──────────────────────────────────────────────────────────────────╯

paths指定のない general.mdだけ が表示されています。
つまり、typescript.mdやapi-rules.mdはこの時点ではロードされていません。これが「動的ロード」の証拠です。

検証2: 動的ロードの確認
次に「src/index.ts を読んで」と依頼しました。
> src/index.ts を読んで

⏺ Read(src/index.ts)
  ⎿  Read 5 lines
  ⎿  .claude/rules/typescript.md   ← ここで動的ロード！

⏺ src/index.ts の内容です：
  // メインエントリーポイント
  export function main() {
    console.log("Hello, World!");
  }

  🌟🔷TS

Readツールの出力に.claude/rules/typescript.mdと表示されています。これが動的ロードされた証拠です。
そして回答には🌟（常時ロードのgeneral.md）と🔷TS（動的ロードのtypescript.md）の両方が付いています。


検証3: 複数ルールの同時適用
では、src/api/handler.tsを読むとどうなるでしょうか。このファイルは**/*.tsとsrc/api/**/*.tsの両方にマッチします。
> src/api/handler.ts を読んで

⏺ Read(src/api/handler.ts)
  ⎿  Read 5 lines
  ⎿  .claude/rules/api/api-rules.md
  ⎿  .claude/rules/typescript.md

⏺ src/api/handler.ts の内容：
  // APIハンドラー
  export async function handleRequest(req: Request): Promise<Response> {
    return new Response("OK");
  }

  🔷TS🔌API🌟

結果は予想どおり、両方のルールがロードされました。そして回答には🔷TS、🔌API、🌟の3つが付いています。このように、複数のルールが同時に適用されることが確認できました。

検証4: 重複ロード防止
同じファイルを2回読んだらどうなるでしょうか。
毎回ルールがロードされるとコンテキストが無駄に消費されてしまいます。
> src/utils.ts を読んで

⏺ Read(src/utils.ts)
  ⎿  Read 5 lines   ← ルールファイルのロード表示なし

⏺ src/utils.ts の内容は以下の通りです：
  // ユーティリティ関数
  export function add(a: number, b: number): number {
    return a + b;
  }

  🌟🔷TS

2回目はルールファイルのロード表示がありません。
つまり、一度ロードされたルールは再ロードされない仕様のようです。これはコンテキスト効率の観点から嬉しいポイントですね。
すでにコンテキストに展開されている（Claude Codeが覚えている）内容なので、再ロードされないのは当然です。

検証5: コンテキスト増加の可視化
最後に、動的ロードでコンテキストがどれくらい増加するか確認しました。
検証のため、markdown-large.mdという200KBほどの大きなルールファイルを追加作成して/contextコマンドでコンテキスト使用量を比較しました。
起動直後:
Context Usage
claude-opus-4-5-20251101 · 80k/200k tokens (40%)

Markdownファイル読み込み後:
Context Usage
claude-opus-4-5-20251101 · 115k/200k tokens (57%)

差分: 40% → 57%（+17%）
ルールファイルの動的ロードによって、確かにコンテキストが増加しています。そして、2回目の読み込みでは+2%程度（会話分のみ）でした。これは重複ロードが防止されている証拠です。

どんな時に使うべきか
ここまでの検証結果を踏まえて、.claude/rules/の実践的な活用パターンを紹介します。


ケース1: フロントエンドとバックエンドでルールを分ける
フルスタックなプロジェクトでは、フロントエンドとバックエンドで異なるルールを適用したいことが多いでしょう。
.claude/rules/
├── frontend/
│   ├── react.md        # paths: src/components/**/*
│   └── styles.md       # paths: **/*.css, **/*.scss
└── backend/
    ├── api.md          # paths: src/api/**/*
    └── database.md     # paths: src/db/**/*

フロントエンドのコンポーネントを編集している時にバックエンドのルールがコンテキストを占有することがなくなります。

ケース2: テストファイル専用のルール
テストには独自のルールがあることが多いです。テストファイルを触った時だけ適用されるルールを作れます。
---
paths: **/*.test.ts, **/*.spec.ts
---

# テストルール

- describeとitで構造化する
- AAA（Arrange-Act-Assert）パターンを使う
- モックは最小限に抑える


ケース3: ドキュメント執筆のルール
技術ドキュメントを書く時だけ適用したいスタイルガイドがある場合も便利です。
---
paths: docs/**/*.md
---

# ドキュメント執筆ルール

- 見出しは名詞句で始める
- コード例には必ず説明を添える
- 画像にはalt属性を付ける


注意点とベストプラクティス
最後に、.claude/rules/を使う際の注意点をまとめます。
Anthropic 公式が、ベストプラクティスとして触れている点も交えて紹介します。

Best practices for .claude/rules/:


Keep rules focused: Each file should cover one topic (e.g., testing.md, api-design.md)

Use descriptive filenames: The filename should indicate what the rules cover

Use conditional rules sparingly: Only add paths frontmatter when rules truly apply to specific file types

Organize with subdirectories: Group related rules (e.g., frontend/, backend/)



1. 1ファイル1トピック

testing.md、api-design.mdなど、1つのファイルには1つのトピックだけを書きましょう。複数のトピックを混ぜると、動的ロードのメリットが薄れます。
また、ファイル名は、そのファイルに書かれているルールの内容を示すようにしましょう。

2. paths指定は控えめに

全てのルールにpathsを指定する必要はありません。なぜなら、プロジェクト全体に適用したい基本ルールは、paths指定なしで起動時にロードさせた方がシンプルだからです。本当に特定ファイル専用のルールだけにpathsを使いましょう。

3. 動的ロードしたルールは/memoryに表示されない

検証で確認したとおり、動的ロードされたルールは/memoryコマンドの一覧には表示されません。ただし、コンテキストには含まれています。「見えないけど効いている」状態なので、混乱しないように注意しましょう。

4. サブディレクトリで整理する

ルールファイルが増えてきたら、frontend/、backend/、testing/などのサブディレクトリで整理しましょう。再帰的に検出されるので、自由にフォルダ構成を決められます。

まとめ
この記事では、Claude Codeの.claude/rules/機能について解説しました。ポイントを振り返ると以下の3つです。

CLAUDE.mdの肥大化問題は.claude/rules/で解決できる
paths指定による動的ロードでコンテキストを節約
複数ルールの同時適用、重複ロード防止も確認

プロジェクトの規模が大きくなって「CLAUDE.mdが長すぎる...」と感じたら、ぜひ.claude/rules/への分割を検討してみてください。必要な時に必要なルールだけがロードされる、スマートなルール管理ができるようになります。


ちょっと宣伝：AI駆動開発を体系的に学びたい方へ
冒頭でも触れましたが Udemy では AI 駆動開発講座を複数開講しており、いくつかベストセラーもいただいています。
最大で 90%OFF のクーポンも配布しておりますので、これから学ぶ方はぜひご利用ください。
Webアプリやスマホアプリ、Pythonなど、多くの分野で講座を開講しています！

また、Discord で AI 駆動開発を学ぶ同士が集まる無料コミュニティでも情報交換が盛んです。
