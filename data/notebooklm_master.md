# Vesper - NotebookLM Master Source
最終更新日: 2026/6/14 2:33:56
対象記事数: 41 件 (未読かつHigh優先度)

---

## 1. [n8nで「三権分立AIエージェント」を構築したら、寝ている間にバグのないコードが勝手に完成した話 #LLM - Qiita](https://qiita.com/YushiYamamoto/items/9a53b6f957f809089881)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/4
- **AI要約**:
  n8nをハブにClaude、GPT、Geminiの3つのLLMで役割を分散し、相互監視を行う自動開発手法を解説
  E2Bサンドボックスによる実行検証と最新モデルを組み合わせ、物理的な品質保証を自動化する仕組みを提示
  差分送信やモデルの階級分け、リトライ制限により、APIコストを99.9%削減する具体的な設計を公開
- **今読む理由**: AI駆動開発において人間がボトルネックとなる現状を打破し、n8nとE2Bを用いた自律型エージェントの具体的な構築フローとコスト抑制策がコードレベルで詳細に記述されているため。
- **タグ**: #n8n, #AIエージェント

### 本文
1. はじめに：プロにとって「Vibe Coding」は退屈だ

CursorやWindsurfなどのAIエディタを駆使して、自然言語だけでアプリを作る 「Vibe Coding」 がもてはやされています。
「コードを書かなくていい！最高！」と界隈は熱狂していますが、現場でシステムを組むエンジニアからすれば、あれは 「高度な手作業」 に過ぎません。
結局のところ、人間がチャット欄に張り付き、AIの書いたコードをレビューし、「ここが動かないから直して」「次はここを実装して」と指示を出し続ける必要があります。
人間が「仕様書兼コンパイラ」としてボトルネックになっている構造は変わっていません。
私はそれに飽きました。
プログラマーの三大美徳は「怠惰・短気・傲慢」です。
人間が寝ている間も、システムが勝手にコードを書き、テストし、修正し続ける。それこそが真の「自動化」ではないでしょうか？
そこで私は、ワークフロー自動化ツールの 「n8n」 を使い、Claude、GPT、Geminiの最新モデルを相互に戦わせる 『三権分立エージェント（Trias Politica Loop）』 を構築しました。
本記事では、人間が手出しせずにバグのないコードが錬成される化け物パイプラインの全貌と、「複数AIをループさせたらAPI破産するのでは？」という当然の疑問に対する「コスト防衛的アーキテクチャ」 を公開します。


2. アーキテクチャ：「三権分立（Trias Politica）」ループの全貌
1つのLLMにすべてを任せると、必ず「ハルシネーション（嘘）」や「手抜き」が発生します。
そこで、n8nをハブとして、異なるメーカーの最新モデルたちに役割（責務）を分離し、相互監視させます。
(※投稿時に実際のキャンバス画像URLに差し替えてください)

🤖 各エージェントの役割（Actor Model）


👨‍💻 Writer (Claude Sonnet 4.6)


役割: コードの生成・実装。

特徴: 圧倒的なコーディング力とコンテキスト理解力で初稿を書き上げます。「生成の美学」を担当します。



🕵️‍♂️ Critic (GPT-5.4)


役割: シニアエンジニアとしてのコードレビュー。

特徴: 意地悪な視点で、エッジケース、メモリリーク、セキュリティの穴を徹底的に攻撃します。「論理の厳しさ」を担当します。



⚖️ Judge & Physics (Gemini 3.1 Pro + E2B)


役割: 物理検証と最終採点。

特徴: AIが書いたコードをただレビューするだけでなく、サンドボックス環境（E2B）で実際に実行します。その標準出力（stdout/stderr）をGeminiが評価し、「70点以上（デプロイ可）」か「差し戻し」かを判定します。




🔄 ループの流れ

人間がNotionに「要件（Issue）」を起票。
n8nがそれを拾い、Writerに実装させる。

Criticがレビューし、指摘事項を返す。

Judge(E2B) が実際にコードを動かし、エラーが出れば再度Writerに差し戻す（ループ）。
テストをパスすれば、最終コードをNotionに保存し、Telegramで完了通知を飛ばす。



3. 【最重要】「3人寄ればAPI破産」をどう防ぐか？（コスト最適化戦略）

「最新モデルを3つもループさせたら、コンテキスト肥大化でAPI破産しないか？」
その直感は正しいです。
検証初期、私は「全プロンプトにソースコード全量とコンテキストを付与し、納得するまで無限ループさせる」という愚行を犯し、1日5機能の処理で約5万円（月換算150万円ペース） を溶かしかけました。

【無策時】1日5機能処理のAPIコスト（月150万円ペース）
コード全量+履歴コンテキストで平均15,000 tokens × 3モデル × 平均50ループ × 5機能 × 混色単価（約$10/1M） ≒ **$337/日（約50,000円）**

そこで、アーキテクチャに以下の 「3つの防衛術」 を組み込みました。

🛡️ 防衛術①：モデルの階級分け（Tiering）
初期の「ゼロからの設計・実装（重い処理）」は上位モデルに任せますが、Criticからの細かい修正指示を受けた後の「微修正ループ（軽い処理）」は、安価で高速なモデル（Claude Haiku 4.5 や ローカルのLlama 3等）にフォールバックさせるルーティング（Switch Node）を実装しています。

🛡️ 防衛術②：差分（Diff）のみの伝達とコード抽出
これが最もコストを削減するハックです。
n8nのCodeノード内で、直前のコードと最新のコードを比較し、Diff（差分）形式でWriterに渡します。
ソースコード全量を毎度LLMに食わせる愚を避けます。
// n8n Codeノード：Criticの指摘とDiffの抽出
const prevCode = $('Writer').first().json.code || "";
const currentCode = $('E2B_Test').first().json.current_code || "";
const criticFeedback = $('Critic').first().json.feedback;

// 簡易的な差分抽出（行単位の比較）
const prevLines = prevCode.split('\n');
const currLines = currentCode.split('\n');

// 変更・追加された行のみを抽出（実運用では 'diff' ライブラリ推奨）
const diffSnippet = currLines
  .filter((line, index) => line !== prevLines[index])
  .join('\n');

return [{
  json: {
    system_prompt: "You are resolving a specific bug. Only output the fixed functions.",
    diff_context: diffSnippet,
    critic_notes: criticFeedback,
    attempt_count: $('Retry_Counter').first().json.count || 1
  }
}];


🛡️ 防衛術③：物理的ハードリミット（MAX_RETRIES）とDLQ
n8nのCodeノードでリトライカウンターを実装し、attempt = 3 に達した時点でループを強制終了。
その時点のペイロードをDLQ（Dead Letter Queue：Notionの別DB等）に退避し、人間のTelegramへエスカレーションします。「AIの議論は3ターンまで」という運用ルールです。

💸 月間コストの実績（約1,900円への圧縮 / 削減率99.9%）
現在、「1日5機能」をこのシステムで自動実装させていますが、入出力トークンを厳密に計算した現在のAPIコストは以下の水準に収まっています。
(※API価格は執筆時点の推計。最新の価格体系は各社公式リファレンスを参照してください)
【最適化後】1日5機能処理のAPIコスト
Writer (Claude Sonnet 4.6)
  入力: 8,000 tokens × 5回 × $3/1M   = $0.12/日
  出力: 2,000 tokens × 5回 × $15/1M  = $0.15/日
Critic (GPT-5.4) ※価格未公表のためGPT-4o相当で試算
  入力: 6,000 tokens × 5回 × $2.5/1M = $0.075/日
  出力: 1,000 tokens × 5回 × $10/1M  = $0.05/日
修正ループ (Claude Haiku 4.5 へのフォールバック)
  入力+出力: 約$0.02/日
E2B (Sandbox実行)
  $0.00005/秒 × 平均10秒 × 約40回実行 = 約$0.02/日
─────────────────────
合計: 約$0.435/日 × 30日 ≒ 月額約1,900円

無策で回せば月150万円飛ぶシステムが、アーキテクチャの工夫だけで月2,000円以下（99.9%の削減） で安全に稼働しています。


4. 実際の実行結果（E2Bの物理検証）
「本当にそんなループが勝手に回るのか？」という方のために、フロー図を共有します。


人間がコーヒーを飲んでいる間の約30秒間で、コードが書かれ、ダメ出しされ、修正され、物理検証をパスして納品されました。
これが、「寝ている間にバグが直る」 アーキテクチャの実体です。


5. まとめ：人間は「仕様」ではなく「アーキテクチャ」を考える仕事へ
Vibe Codingの流行により、私たちは「いかに上手くプロンプトを書いてAIを動かすか」に夢中になっています。しかし、それはかつて「いかに上手くアセンブリを書くか」に夢中になっていたのと同じです。
これからのエンジニアの価値は、チャット欄でAIのご機嫌を取ることではありません。
「AIという優秀な部下たちを、どういう組織図（ワークフロー）に落とし込み、いかに安く、正確に働かせるか」というアーキテクトとしての腕にシフトしています。
n8nによる自律型エージェントの構築は、少しの工夫（コスト管理やハードリミット）で、実運用可能なレベルに到達しています。
ぜひ、皆さんの現場でも「AIに仕事をさせる」ためのパイプラインを構築してみてください。

著者プロフィール
ITPRODX.COM（https://itprodx.com/）にて、中堅企業向けに「n8n×AI」を用いた自律型アーキテクチャの構築・技術顧問を行っています。
システム連携や自動化パイプライン構築に悩む方は、ぜひお気軽に壁打ちにお越しください。

---

## 2. [Claude Code を Level 5 まで育てたら、開発が「指示と確認だけ」になった — 実ファイル構成で解説 #個人開発 - Qiita](https://qiita.com/teppei19980914/items/8da88b33ffa8cf88dfa2)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/4
- **AI要約**:
  Claude Codeを5段階で進化させ、開発を指示と確認に集約する実用的なファイル構成を提示。
  Hooks機能でテストやコード整形を自動化し、Agents機能で並行レビューを自動化する設計を詳述。
  CLAUDE.mdやSkillsによるプロジェクト固有ルールの管理と、AIを育てる運用の要諦を解説。
- **今読む理由**: AI駆動開発におけるClaude Codeの具体的な自動化設定（Hooks/Agents）やフォルダ構造が明記されており、現在の開発環境へ即座に反映して劇的な効率化が見込めるため。
- **タグ**: #ClaudeCode, #AI駆動開発, #自動化パイプライン, #生産性向上

### 本文
この記事は約5分で読めます。

筆者プロフィール: ソフトウェアエンジニア。「知った気にならない。いつまでも学び続ける」を信条に、業務と個人開発の両輪で技術を磨いています。AI 駆動開発で複数の個人開発アプリを構築・運用中。
👉 ポートフォリオ: 筆者ホームページ
Claude Code を使い始めたけど、毎回同じ指示を書いていませんか？ CLAUDE.md・Skills・Hooks・Agents の 5 段階で「育てる」ことで、人間の作業は「指示と確認だけ」になります。この記事では、実際のファイル構成とコードを添えて、その全過程をお見せします。

「AI にコードを書かせている」と「AI と開発している」は違う
Claude Code を導入した当初、私は毎回こんなプロンプトを書いていました。
UIテキストはハードコーディングしないでください。
src/i18n/ja.ts に追加してから使ってください。
テストも書いてください。
外部リンクには rel="noopener noreferrer" を付けてください。
コミット前に npx astro check と npm test を実行してください。

毎回、同じことを書く。 これは「AI にコードを書かせている」状態であり、「AI と開発している」とは言えません。
そこから約 1 か月の試行錯誤で、今の私の作業は 「何を作るか指示する」と「動作確認する」だけ になりました。


Claude Code 5 つのレベルの全体像



Level
追加要素
何が自動化されるか
人間がやること




1
素のプロンプト
なし
全指示を毎回手打ち


2
+ CLAUDE.md
プロジェクトルールの自動読み込み
ルール違反の指摘が不要に


3
+ Skills
手順書のオンデマンド注入
定型作業の手順説明が不要に


4
+ Hooks
品質チェックの自動実行
「テスト実行して」が不要に


5
+ Agents
並行レビューの自動実行
レビュー依頼が不要に



以下、各レベルを具体的に説明します。


Level 1: 素のプロンプト — 「毎回同じ説明」の苦痛
最初の状態です。Claude Code をインストールして claude と打つだけ。プロジェクト固有のルールを知らないため、UIテキストのハードコーディングや命名規則違反が発生し、毎回指摘する必要があります。
人間の作業: 指示 + ルール説明 + レビュー + 手動テスト + 手動デプロイチェック


Level 2: CLAUDE.md — 「プロジェクトの憲法」を持たせる
プロジェクトルートに CLAUDE.md を置くと、Claude Code が会話開始時に自動で読み込みます。これは 「プロジェクトの憲法」 です。
プロジェクトルート/
├── CLAUDE.md          ← これを追加
├── src/
├── package.json
└── ...

私の CLAUDE.md はこんな構成です（実物から抜粋）:
# HomePage - Claude Code 運用ガイド

## テキスト管理ルール（最重要）
- **UIテキストのハードコーディングは禁止**
- 多言語対応: ja / en の 2 言語を src/i18n/ja.ts / src/i18n/en.ts で管理
- 新しいテキストを追加する場合は必ず ja.ts に先に追加 → en.ts で翻訳

## コミットルール
- テストコードの追加・修正を伴わないソースコード変更はコミットしない

## コミット前チェック（毎回必須）
1. 横展開チェック — 同一パターンを検索し漏れなく対応
2. セキュリティチェック — XSS、外部リンク rel 属性、機密情報
3. パフォーマンスチェック — 未使用依存、CSS重複、ビルドサイズ
4. デプロイチェック — npx astro check → npm test → npm run build


CLAUDE.md による変化



Before (Level 1)
After (Level 2)




UI テキストをハードコーディングしてしまう

ja.ts に追加してから使うようになった


テストなしでコード修正する
テストなしの変更を自ら避けるようになった


毎回ルールを説明する
ルール説明が不要になった



コツ: 150 行以内に収め、優先度を明示し、具体的なパスやコマンドを書く。詳細な手順は Level 3（Skills）に分離する。
人間の作業: 指示 + レビュー + 手動テスト + 手動デプロイチェック


Level 3: Skills — 「手順書」をオンデマンドで注入する
CLAUDE.md にすべてを書こうとすると膨張します。そこで Skills を使います。Skills は .claude/skills/ に置いた Markdown ファイルで、Claude Code が必要に応じて参照する「手順書」です。
.claude/
└── skills/
    ├── fix-issue.md       ← 問題修正の手順書
    ├── create-blog.md     ← ブログ記事作成の手順書
    ├── analyze-trend.md   ← トレンド分析の手順書
    ├── check-deploy.md    ← デプロイ確認の手順書
    ├── release.md         ← リリースの手順書
    └── update-labels.md   ← ラベル更新の手順書

「ブログ記事を作って」と指示するだけで、Claude はスキルを参照してトレンド分析 → SEO 最適化 → 記事作成を自動実行します。人間が手順を説明する必要がなくなりました。
人間の作業: 指示 + レビュー + 手動テスト


Level 4: Hooks — 「品質チェック」を自動実行する
Skills は「Claude に手順を教える」仕組みですが、Hooks は 「自動で実行される仕組み」 です。.claude/settings.json に定義します。
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $(ファイルパス)"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx astro check && npm test"
          },
          {
            "type": "prompt",
            "prompt": "6つの観点で最終チェックを実施してください..."
          }
        ]
      }
    ]
  }
}

この設定で何が起きるか:



トリガー
自動実行される処理




ファイル保存時（PostToolUse）
Prettier でコード整形


会話終了時（Stop）
静的解析 + テスト実行 + 6 観点の品質チェック




Level 4 による変化



Before (Level 3)
After (Level 4)




「Prettier かけて」と言う
ファイル保存のたびに自動整形


「テスト実行して」と言う
会話終了時に自動実行


「横展開チェックして」と言う
Stop hook で自動チェック



「テスト実行して」と言う必要がなくなりました。
人間の作業: 指示 + 動作確認


Level 5: Agents — 「レビュー」を並行自動実行する
最後のレベルです。Agents は 独立したレビュワーを並行して走らせる 仕組みです。.claude/agents/ に定義します。
.claude/
└── agents/
    ├── label-checker.md       ← ハードコード文字列の検出
    ├── security-reviewer.md   ← セキュリティ観点のレビュー
    ├── performance-reviewer.md ← パフォーマンス観点のレビュー
    └── seo-reviewer.md        ← SEO 観点のレビュー


Level 5 で変わったこと
Claude Code がコードを書き終えた後、自動的に:


label-checker が UI テキストのハードコードを検出

security-reviewer が XSS やサニタイズ漏れをチェック

performance-reviewer がループ内 DB 問い合わせを検出

seo-reviewer がブログ記事の SEO を全件検査

これらが 並行して走る ので、人間がレビューする前にほとんどの問題が検出されます。
人間の作業: 指示 + 動作確認


「AI を育てる」という考え方
Level 1 から Level 5 まで、一気に構築したわけではありません。開発を進める中で「またこの指示を書いている」と気づいたら CLAUDE.md に追記し、「この手順を毎回説明している」と気づいたら Skills に分離し、「このチェックを忘れがち」と気づいたら Hooks で自動化する。
繰り返しの苦痛が、次のレベルへの動機になる。 これが「AI を育てる」ということだと思っています。
VibeCoding（バイブコーディング）に対して「品質が不安」という声をよく聞きます。Level 4 の Hooks と Level 5 の Agents があれば、品質チェックは人間が忘れても AI が自動で実行します。品質保証を仕組みに組み込めば、VibeCoding でも品質は担保できます。


まとめ: あなたの Claude Code は今、Level いくつですか？



あなたの状況
推奨レベル
最初にやること




Claude Code を使い始めたばかり
Level 2
CLAUDE.md にプロジェクトルールを書く


毎回同じ手順を説明している
Level 3

.claude/skills/ に手順書を分離する


「テスト実行して」と毎回言っている
Level 4

settings.json に Hooks を追加する


レビューで毎回同じ指摘をしている
Level 5

.claude/agents/ にレビュワーを追加する



Level 5 まで育てると、人間の役割は 「何を作るか決める」 と 「動作確認する」 だけになります。
Claude Code は「使うツール」ではなく「育てるパートナー」です。
あなたの Claude Code は今、Level いくつですか？


関連記事

マークダウン記法は奥深く、楽しい — テキストだけで「伝わるドキュメント」を作る技術

---

## 3. [Claude Codeの「サブエージェント」完全ガイド——AIに仕事を分担させる公式テクニック｜小畑タカユキ│3ヶ月でAIエージェントを実装する人](https://note.com/no_ai_no_life/n/ndccab63ad022)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/4
- **AI要約**:
  Claude Codeのサブエージェント機能の概要と、役割別の3つの組み込みタイプ（汎用、プラン、探索）を詳説
  並列作業や客観的レビューなど、開発効率を劇的に向上させる5つの具体的ユースケースと適用基準を提示
  カスタムエージェント定義やCLAUDE.mdへの記述、フックによる自動実行など、実装レベルの設定手法を網羅
- **今読む理由**: AI駆動開発プロジェクトに即座に導入可能な、コンテキスト分離と並列処理の具体的アーキテクチャが示されているため。特に.claude/agents/での定義方法は即時適用可能です。
- **タグ**: #Claude Code, #AIエージェント, #自動化パイプライン, #Anthropic

### 本文
おつかれさまです。小畑です。Anthropicの公式ブログに、Claude Codeの「サブエージェント」の使い方が詳しく解説されました。サブエージェントとは何か。一言で言うと、AIにAIを呼ばせる仕組みです。メインのClaudeが作業している最中に、別の独立したClaudeを起動して、調査や検証を任せる。結果だけ受け取って、メインの作業を続ける。これを使いこなすと、作業のスピードと品質が劇的に変わります。＝＝＝＝＝サブエージェントの基本サブエージェントは、メインのClaudeとは独立したコンテキストウィンドウ（記憶領域）を持っています。つまり、メインの会話を汚さずに別の作業ができる。Claude Codeには3つの組み込みタイプがあります。汎用エージェント — 何でもこなすオールラウンダープランエージェント — 計画・設計に特化探索エージェント — コードベースの調査・分析に特化＝＝＝＝＝いつ使うべきか？5つの場面Anthropicの公式ガイドが示す、サブエージェントを使うべき5つの場面。1. 調査が重いとき数十のファイルを読み込んで情報を集める必要がある場合。サブエージェントに調査させて、要約だけ受け取る。メインの会話がファイルの中身で埋まらない。2. 並列で進められる作業があるとき依存関係のない作業を複数同時に走らせる。例えば「APIの仕様を調べる」「テストコードを書く」「ドキュメントを更新する」を並列実行。3. 客観的なレビューが必要なとき実装したClaudeに自分でレビューさせると、自分の判断に引っ張られる。別のサブエージェントにレビューさせれば、過去の議論に影響されない新鮮な目で評価してくれる。これ、人間の組織と同じです。作った人と確認する人は、別の方がいい。4. コミット前の独立検証テストに過適合していないか、境界条件を見落としていないか。実装とは別のサブエージェントが検証する。5. パイプラインワークフロー設計→実装→テストのように段階的に進める場合、各フェーズを別のサブエージェントに担当させる。それぞれが自分のフェーズに集中できる。公式が示す「強い信号」10ファイル以上の探索が必要3つ以上の独立した作業があるこのどちらかに当てはまったら、サブエージェントを使うべき。＝＝＝＝＝いつ使うべきでないか使いどころを間違えると、逆に効率が落ちる。順序依存の作業 — ステップ2がステップ1の結果に依存する場合は、順番にやる同じファイルの同時編集 — 並列で同じファイルを触ると競合する小さなタスク — サブエージェントを起動するオーバーヘッドの方が大きいエージェントの作りすぎ — 多すぎると自動委譲の信頼性が下がる＝＝＝＝＝4つの実践パターン公式ガイドが示す、実務で使えるパターン。パターン1: 研究→実装サブエージェントに調査させて、結果を要約してもらう。その要約をもとに、メインで実装を議論する。「まず調べてから動く」を仕組み化したもの。パターン2: 並列修正複数のファイルに同じパターンの修正を加える場合、それぞれをサブエージェントに任せて同時実行。パターン3: 独立レビュー実装過程を見ていないサブエージェントが、偏見なしでレビュー。人間のチームでいう「別の人にコードレビューしてもらう」のAI版。パターン4: パイプライン設計→実装→テストの各フェーズを別のサブエージェントが担当。フェーズ間はファイルで状態を受け渡す。＝＝＝＝＝呼び出し方（実践方法）使い方は5通り。1. 会話で直接指示する一番シンプル。こう言うだけ。サブエージェントを使って、以下を並列で調査して：
1. 全APIエンドポイントを見つけて
2. データベーススキーマを特定して
3. 認証フローをマッピングして2. カスタムエージェントを定義する`.claude/agents/`ディレクトリにファイルを置く。例えば「セキュリティレビューア」を定義---
name: security-reviewer
description: セキュリティ脆弱性をレビュー
tools: Read, Grep, Glob
---3. CLAUDE.mdにポリシーを書く## コードレビュー基準
レビュー時は常にREAD-ONLYサブエージェントを使用すること4. スキルとして定義する`.claude/skills/`に複雑なワークフローを再利用可能な形で定義。5. フックで自動実行する「全コミット前に自動でテスト実行」のように、特定のイベントで自動トリガー。＝＝＝＝＝僕の実践僕は今、15体のAIと仕事をしています。5つの部門、15名体制。全員AI。このチーム構造は、まさにサブエージェントの考え方そのものです。リク（ライター）が記事を書く → ソラ（SNSストラテジスト）がレビューケン（フロントエンド）が実装 → ミサキ（デザインレビュー）→ レイ（アクセシビリティ）→ ナツ（SEO）作った人と確認する人を分ける。並列で動けるものは並列で動かす。公式が推奨しているパターンと同じことを、チーム単位でやっています。＝＝＝＝＝始め方のコツAnthropicの公式アドバイスはシンプルです。「まず会話型で始めて、繰り返すパターンを見つけたら自動化へ移行する」最初から完璧なサブエージェント構成を設計しようとしなくていい。使ってみて、「あ、これは毎回やってるな」と気づいたら、それをカスタムエージェントやスキルに昇格させる。＝＝＝＝＝まとめサブエージェントは「AIに仕事を分担させる」仕組みです。使うべき場面調査が重い、並列で進められる、客観的レビューが必要。使うべきでない場面順序依存、同じファイル同時編集、小さなタスク。始め方まず会話で試して、反復パターンを自動化。AIを1つだけ使うのは、1人で全部やるのと同じ。サブエージェントを使えば、AIのチームが動く。ぜひ、試してみてください。＝＝＝＝＝P.S.「AIチームを自社に構築したいけど、どう設計すればいいかわからない」そんな方は、ぜひ一度お話ししましょう。Mac mini × Claude Code Channelsで、AIエージェントを自社サーバーに常駐させる。3ヶ月の伴走で、あなたの会社にAIを実装する「THE SHIFT」をやっています。ではまた！

---

## 4. [Claude Code vs Gemini CLI ｜ 実務的な使い分けガイド【2026年版】](https://zenn.dev/akasara/articles/8387058078309d)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/4
- **AI要約**:
  Claude Codeを実装の主戦力、Gemini CLIを大規模探索・調査の偵察役とする役割分担を推奨。
  1Mコンテキストを持つGeminiで全体走査を行い、その結果をClaudeに渡す具体的な連携フローを提示。
  カスタムスラッシュコマンドの作成やヘッドレス呼び出しによる、実務的なツール統合とコスト最適化手法に言及。
- **今読む理由**: AI駆動開発において、Claudeの実装力とGeminiの広域探索力を組み合わせる具体的な「ハイブリッド構成」と設定例が示されており、開発効率とコストを即座に改善できるため。
- **タグ**: #Claude Code, #Gemini CLI, #AI駆動開発, #開発ワークフロー

### 本文
なぜ「どちらか一択」という問いが間違いなのか
一部の開発者コミュニティでは、「両方使う」という声が目立つ。
「Claude Code vs Gemini CLI」という対立構図で語られることが多いが、実際の現場では一択ではなく、タスクの性質に応じて役割を分担するハイブリッド構成を取る例が見られる。
本記事では、実際の開発者がどうツールを使い分けているかを、具体的な事例・ベンチマーク数値・コミュニティの声をもとに整理する。


 まず押さえる：2ツールの立ち位置
┌─────────────────────────────────────────────────────────┐
│                     あなたの開発環境                        │
│                                                           │
│  ┌──────────────────────┐   ┌──────────────────────┐     │
│  │     Claude Code       │   │     Gemini CLI        │     │
│  │                       │   │                       │     │
│  │  ・複雑な実装         │   │  ・広域コード探索     │     │
│  │  ・設計判断           │   │  ・Web検索            │     │
│  │  ・テスト生成         │   │  ・CVE・changelog調査 │     │
│  │  ・マルチファイル改修 │   │  ・試作・スクリプト   │     │
│  │  ・MCP統合            │   │  ・Google Cloud系     │     │
│  │                       │   │  ・無料枠で大量実行   │     │
│  └──────────┬───────────┘   └───────────┬───────────┘     │
│             │                            │                  │
│             └────────────┬───────────────┘                  │
│                          │                                  │
│                  連携して使うのが最強                         │
└─────────────────────────────────────────────────────────┘
一言で言えば、「Claude Code は主戦力、Gemini CLI は偵察と補給」。


 実測ベンチマーク：Composio が 10M トークン使って比べた結果
【単発ベンチ】Composio が同一タスクを両ツールに課した実測比較（出典：DEV Community）。



指標
Claude Code
Gemini CLI




所要時間
1時間17分
2時間2分


コスト
$4.80
$7.06


入力トークン
260.8K
432K


試行回数
1回で成功
複数回試行


コード品質
テスト構造化済み・本番品質
良好だがテストが散乱


UX
スムーズ
設定オプション少・出力が冗長




結論：この実装タスクでは Claude Code が速度・コスト・品質の全指標で上回った。
ただしこれは Composio 筆者による複雑な実装1件での比較。探索・調査タスクでの比較ではなく、一般性能の断定には使いすぎないこと。



 3つの実際のハイブリッドワークフロー事例

 事例① Flutter GetXバグ修正（byjos.dev）
非同期エラー LateInitializationError のデバッグに両ツールを組み合わせた例。
[ステップ1] Gemini CLI
  └─ 1M+トークンでコードベース全体を走査
  └─ エラー発生箇所を特定

[ステップ2] 原因の絞り込み
  └─ Get.put() と Get.lazyPut() の不一致を発見

[ステップ3] Claude Code
  └─ 実装を担当

[ステップ4] Gemini CLI
  └─ 最終レビュー（外部視点として）

著者の言葉：「2つを組み合わせると、それぞれの合計を超える結果が出る」

なぜGeminiが走査担当なのか：Gemini CLI は公式に 1M context window を提供しており、大規模コードベースを一度に読める。Claude Code も対応モデル・プランでは 1M context を利用可能だが、「広く拾う」フェーズを Gemini に任せるのがコスト面で合理的という判断。


 事例② フロントエンドUIリデザイン（paddo.dev）
paddo.dev では、~/.claude/commands/gemini.md を作成してカスタム slash command /gemini を自作し、Claude セッション内から Gemini CLI を呼び出す「2層構造」ワークフローを構築している。
スクリーンショット撮影
       ↓
/gemini fix the spacing issues  ← カスタムコマンド経由でGeminiがビジュアル解析
       ↓
CSS修正案を出力
       ↓
Claude Codeが実装・整合性チェック
       ↓
完成



作業種別
担当
理由




画像・スクリーンショット解析
Gemini CLI
画像/PDF入力での視覚タスクが強い


ランディングページ全体の分析
Gemini CLI
1Mコンテキストで全体を把握


実装・コード品質チェック
Claude Code
構造化された出力・テスト生成




注：/gemini は Claude の built-in コマンドではなく、paddo.dev が自作したカスタム slash command。



 事例③ ヘッドレスモードでClaude内からGeminiをサブルーティン化
最もシンプルな統合パターン。Claude Code のセッション内で以下を実行する。
gemini -p "<分析してほしい内容>"
この1行でGeminiに大規模分析を委ね、結果をClaude Codeが受け取って実装に使う。
Composio 筆者は、この構成で以前は何度も失敗していたタスクを1回で通せたと述べている。Geminiの1Mコンテキストを、Claudeの「外部ツール」として使う形。


 タスク別の使い分け早見表



タスク
Claude Code
Gemini CLI
推奨




非同期バグ・状態管理の修正
◎
△
Claude


大規模コードベース全体の走査
△〜◎（プラン依存）
◎（1M標準）
Gemini（コスト面で合理的）


フロントエンド・スクリーンショット修正
○〜◎（UI検証・スクショ比較）
◎（画像/PDF入力が強い）
Gemini優位


ユニットテスト自動生成・構造化
◎
△
Claude


スクリプト・小さなユーティリティ
○
◎（高速・無料枠）
Gemini


Web検索・CVE確認・changelog調査
△
◎
Gemini


Google Cloud・GKE系の調べもの
△
◎
Gemini


多段階タスク自動化（Playwright等）
◎（MCP連携・成熟度高）
○〜◎（公式MCP対応）
Claude優位


セキュリティレビュー・アーキテクチャ判断
◎
△
Claude


マルチファイルのリファクタリング
◎
△
Claude




表内の ◎△ は「得意条件」の目安。変化の速い製品のため、詳細は各公式ドキュメントを確認のこと。



 コミュニティの声（Hacker News #47582539）
【コミュニティ観測】Ask HN スレッドで見られた傾向の要約（直接引用ではなく、複数コメントの観測まとめ）。


大規模コードベースの検査を Gemini CLI に任せ、その結果を Claude に引き渡すという分担が複数のコメントで言及されていた。
Claude はセキュリティ問題のキャッチやアーキテクチャ判断に優れているという声が見られた。一方 Gemini はトークン枯渇なく広く拾えるが、文脈の深さでは劣るという評価もあった。
Google Cloud・GKE 系の調べものは Gemini をそのまま使うが、複雑なリファクタは Claude に回すという使い分けも報告されていた。
「claude make the plan, and let gemini implement」のように役割を完全に分離するケースや、両方を並行して使うケースも見られた。

スレッド全体を通じると、Claude 優位・Gemini は調査向き・両者併用といった声が混在しており、一定数の開発者が何らかのハイブリッド構成を試みている様子が読み取れる。


 価格と仕様の現実
【公式仕様】2026年4月11日確認。変更が頻繁なため、最新情報は各公式ページを参照。



項目
Claude Code
Gemini CLI




ライセンス
プロプライエタリ
オープンソース（Apache 2.0）


最低コスト
Pro $20/月〜（Claude Code含む） / Maxは$100/月〜
無料枠あり


無料枠
なし
60 req/min・1,000 req/day


コンテキスト上限
対応モデル・プランで 1M トークン利用可
1M トークン（標準）


MCP統合
◎（成熟度が高い）
○〜◎（公式MCP対応、Google Cloud連携が強い）


マルチモーダル
○〜◎（スクショ比較・UI検証が強い）
◎（画像/PDF入力や視覚タスクで強みが出やすい）



コスト最適化パターン：試作・探索・大量呼び出しは Gemini の無料枠で。本番実装・品質重視の作業は Claude Code に絞る。これで月次コストを抑えながら品質を担保できる。


 「標準パターン」まとめ
複数のソースで繰り返し確認された構成を4パターンに整理する。
パターン1：探索→実装分割型
─────────────────────────────────────
Gemini CLI でコードベース全体を探索
    ↓
計画書・分析結果を Claude Code に引き渡し
    ↓
Claude Code が詳細実装を自律実行

パターン2：カスタムスラッシュコマンド統合型
─────────────────────────────────────
~/.claude/commands/ にカスタムコマンドを自作
Claude セッション内で必要な時だけ Gemini の能力を借りる
実装は Claude が一貫して担当

パターン3：ヘッドレス並行型
─────────────────────────────────────
gemini -p "<prompt>" を Claude から呼び出し
Gemini をサブルーティンとして利用
Gemini の 1M コンテキストを Claude の外部ツール化

パターン4：コスト最適化型
─────────────────────────────────────
試作・探索 → Gemini（無料枠 60req/min・1000/day）
本番実装  → Claude（品質とコスト効率を両立）


 まとめ：どう使い分けるか
あなたのタスクは？
       │
       ├─ 広くコードを読みたい・調べたい
       │    → Gemini CLI（1M コンテキスト、コスト面で有利）
       │
       ├─ Web検索・CVE・changelog確認
       │    → Gemini CLI（ネイティブ統合）
       │
       ├─ 複雑な実装・リファクタ・テスト生成
       │    → Claude Code（構造化出力・MCP連携）
       │
       ├─ アーキテクチャ判断・セキュリティレビュー
       │    → Claude Code（推論の深さ）
       │
       └─ その両方が必要な大きなタスク
            → Gemini で探索 → Claude で実装
              （ハイブリッド構成）
「どちらが優れているか」ではなく、「どの局面でどちらを使うか」という問いに変えると、答えは自然に出る。
一部の開発者コミュニティでは、両ツールを組み合わせるワークフローが目立つ。複数のソースを横断して共通して見えた知見は、「Geminiで広く拾い、Claudeで深く掘る」という分担だ。

 参考書籍
本記事の「AIを使いこなす側に回る」という話題に関連して、手元で読み返しているClaude Code関連の書籍を挙げておきます。Claude Designを触る前段として、Claude Codeの作法を押さえておくとハンドオフ後の理解が段違いに楽になります。
『実践Claude Code入門―現場で活用するためのAIコーディングの思考法』（西見公宏・吉田真吾・大嶋勇樹、技術評論社）
Claude CodeとMCPを業務で回す前提の思考法にフォーカスした一冊。「ツールの使い方」ではなく「AIと一緒に開発する姿勢」寄りの内容なので、この記事で書いた"オーケストレーター側に回る"話と地続きで読めます。
→ Amazonで見る
『Claude CodeによるAI駆動開発入門』（平川知秀、技術評論社）
環境構築から実際に動くWebアプリをハンズオンで組み立てる構成。Claude Designから Claude Code へのハンドオフを実務で回すなら、この本で扱っている「AIと協働するワークフロー」の土台感覚があると迷子になりにくいです。
→ Amazonで見る

 出典


Anthropic — Plans & Pricing（価格情報）

Claude Code Docs — モデル設定（コンテキスト上限）

Google Cloud Docs — Gemini CLI（MCP対応）
DEV Community（Composio）— I burnt 10M tokens to compare Claude Code and Gemini CLI
byjos.dev — When AIs start gossiping about your code
paddo.dev — Hybrid AI Workflows: Spawning Gemini from Claude Code
Hacker News — Ask HN: Gemini CLI vs Claude Code #47582539
sreeninet.wordpress.com — The Rise of CLI-Based AI Coding Agents
shipyard.build — Claude Code vs Gemini CLI（January 2026）
DataCamp — Gemini CLI vs Claude Code: Differences and Use Cases

---

## 5. [Claude Code と Gemini CLI による全自動コードレビューループ](https://zenn.dev/azumag/articles/a0d375832747fb)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/4
- **AI要約**:
  Claude CodeのStop Hookを利用し、Gemini CLIを自動起動してコードレビューを完結させる手法の提案
  transcript(JSONL)からClaudeの最終出力を抽出し、Geminiにgit diffと併せて渡すシェルスクリプトを公開
  レートリミット対応やタイムアウト管理、文字数制限など、自動ループを安定させるための実用的な実装例
- **今読む理由**: AI駆動開発と自動化パイプライン構築に直結する内容であり、Claude CodeとGeminiを連携させる具体的なコードとフックの設定が明記されているため、即座に実装に適用できる。
- **タグ**: #ClaudeCode, #GeminiCLI, #自動レビュー, #AIエージェント, #シェルスクリプト

### 本文
Claude Code の Stop Hook をトリガーに、Gemini CLI を呼んで自動でコードレビューしてもらいたいと思ってました。なぜ Stop なのか？ CLAUDE.md や途中の Hooks で Gemini CLI に対して対話を指示することもコード品質をあげる上で有効ですが、Claude Code の作業はそれはそれで一旦完結させて、その結果をレビューし、レビュー結果を Claude Code に戻して... というループを作って、人間が寝ている間にコードを洗練していって欲しい、実際はそんなにはうまくいかないだろうけれど、そんなロマンを追い求めたのです。

細かいセットアップはリポジトリを参照のこと。長いですが一応 hooks で呼ぶシェルスクリプトは以下です。
#!/bin/bash

# Cleanup function for temporary files
cleanup() {
    [ -n "$TEMP_STDOUT" ] && rm -f "$TEMP_STDOUT" 
    [ -n "$TEMP_STDERR" ] && rm -f "$TEMP_STDERR"
}

# Function to extract last assistant message from JSONL transcript
extract_last_assistant_message() {
    local transcript_path="$1"
    local line_limit="${2:-0}"  # 0 means no limit
    
    if [ ! -f "$transcript_path" ]; then
        return 1
    fi
    
    local jq_input
    if [ "$line_limit" -gt 0 ]; then
        jq_input=$(tail -n "$line_limit" "$transcript_path")
    else
        jq_input=$(cat "$transcript_path")
    fi
    
    echo "$jq_input" | jq -r --slurp '
        map(select(.type == "assistant")) |
        if length > 0 then
            .[-1].message.content[]? |
            select(.type == "text") |
            .text
        else
            empty
        end
    ' 2>/dev/null
}

# Set trap for cleanup on script exit
trap cleanup EXIT

INPUT=$(cat)

TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path')
if [ -f "$TRANSCRIPT_PATH" ]; then
    LAST_MESSAGES=$(extract_last_assistant_message "$TRANSCRIPT_PATH" 100)
    if [ -n "$LAST_MESSAGES" ] && echo "$LAST_MESSAGES" | grep -q "REVIEW_COMPLETED"; then
        exit 0
    fi
    if [ -n "$LAST_MESSAGES" ] && echo "$LAST_MESSAGES" | grep -q "REVIEW_RATE_LIMITED"; then
        exit 0
    fi
fi

PRINCIPLES=$(cat << 'EOF'
## 原則
Gemini のレビューにて改善点を指摘された場合は、その改善点に従って修正せよ。
Gemini から、これ以上の改善点は特に無しとレビューをもらったときのみ「REVIEW_COMPLETED」とだけ発言せよ。
Gemini の Rate Limit で制限された場合は 「REVIEW_RATE_LIMITED」とだけ発言せよ。
----
EOF
)

CLAUDE_SUMMARY=""
if [ -f "$TRANSCRIPT_PATH" ]; then
    # Extract Claude's last summary from transcript (JSONL format)
    # NOTE: This depends on Claude Code's transcript JSONL structure
    # If Claude Code changes its output format, this may need updates
    CLAUDE_SUMMARY=$(extract_last_assistant_message "$TRANSCRIPT_PATH" 0)
    
    # Check if extraction was successful
    if [ -z "$CLAUDE_SUMMARY" ]; then
        echo "[gemini-review-hook] Warning: Failed to extract Claude summary from transcript (no assistant messages found)" >&2
    fi
    
    # Limit CLAUDE_SUMMARY to 1000 characters to avoid token limit
    if [ ${#CLAUDE_SUMMARY} -gt 1000 ]; then
        # Try to preserve important parts: first 400 chars + last 400 chars
        # Only if text is longer than 800 chars to avoid overlap
        if [ ${#CLAUDE_SUMMARY} -gt 800 ]; then
            FIRST_PART=$(echo "$CLAUDE_SUMMARY" | head -c 400)
            LAST_PART=$(echo "$CLAUDE_SUMMARY" | tail -c 400)
            CLAUDE_SUMMARY="${FIRST_PART}...(中略)...${LAST_PART}"
        else
            # For texts between 800-1000 chars, just truncate
            CLAUDE_SUMMARY=$(echo "$CLAUDE_SUMMARY" | head -c 1000)
            CLAUDE_SUMMARY="${CLAUDE_SUMMARY}...(truncated)"
        fi
    fi
fi

REVIEW_PROMPT=$(cat << EOF
作業内容をレビューして、改善点や注意点を指摘してください。
重要: 自分で git diff を実行して作業ファイルの具体的な変更内容も把握してからレビューを行ってください。

## Claude の最後の発言（作業まとめ）:
${CLAUDE_SUMMARY}
EOF
)

# Try Pro model first with timeout and process monitoring
TEMP_STDOUT=$(mktemp)
TEMP_STDERR=$(mktemp)
GEMINI_TIMEOUT=120

if command -v timeout >/dev/null 2>&1; then
    timeout ${GEMINI_TIMEOUT}s bash -c "echo '$REVIEW_PROMPT' | gemini -s -y" >"$TEMP_STDOUT" 2>"$TEMP_STDERR"
    GEMINI_EXIT_CODE=$?
else
    # Manual timeout management 
    echo "$REVIEW_PROMPT" | gemini -s -y >"$TEMP_STDOUT" 2>"$TEMP_STDERR" &
    GEMINI_PID=$!
    
    # Wait for process with timeout
    WAIT_COUNT=0
    GEMINI_EXIT_CODE=124 # default timeout
    while [[ $WAIT_COUNT -lt $GEMINI_TIMEOUT ]]; do
        if ! kill -0 $GEMINI_PID 2>/dev/null; then
            wait $GEMINI_PID
            GEMINI_EXIT_CODE=$?
            break
        fi
        sleep 1
        ((WAIT_COUNT++))
    done
    
    # Kill if timed out
    if [[ $WAIT_COUNT -ge $GEMINI_TIMEOUT ]]; then
        kill -TERM $GEMINI_PID 2>/dev/null || true
        sleep 2
        kill -KILL $GEMINI_PID 2>/dev/null || true
        wait $GEMINI_PID 2>/dev/null || true
        GEMINI_EXIT_CODE=124
    fi
fi

GEMINI_REVIEW=$(cat "$TEMP_STDOUT" 2>/dev/null)
ERROR_OUTPUT=$(cat "$TEMP_STDERR" 2>/dev/null)

# Check for rate limit errors
IS_RATE_LIMIT=false
if [[ $GEMINI_EXIT_CODE -eq 124 ]]; then
    # Timeout - treat as rate limit
    IS_RATE_LIMIT=true
elif [[ $GEMINI_EXIT_CODE -ne 0 ]] || [[ -z "$GEMINI_REVIEW" ]]; then
    if [[ "$ERROR_OUTPUT" =~ "status 429" ]] || \
       [[ "$ERROR_OUTPUT" =~ "rateLimitExceeded" ]] || \
       [[ "$ERROR_OUTPUT" =~ "Quota exceeded" ]] || \
       [[ "$ERROR_OUTPUT" =~ "RESOURCE_EXHAUSTED" ]] || \
       [[ "$ERROR_OUTPUT" =~ "Too Many Requests" ]] || \
       [[ "$ERROR_OUTPUT" =~ "Gemini 2.5 Pro Requests" ]]; then
        IS_RATE_LIMIT=true
    fi
fi

if [[ $IS_RATE_LIMIT == "true" ]]; then
    # Rate limited - try Flash model
    >&2 echo "[gemini-review-hook] Rate limit detected, switching to Flash model..."
    
    if command -v timeout >/dev/null 2>&1; then
        timeout ${GEMINI_TIMEOUT}s bash -c "echo '$REVIEW_PROMPT' | gemini -s -y --model=gemini-2.5-flash" >"$TEMP_STDOUT" 2>"$TEMP_STDERR"
        GEMINI_EXIT_CODE=$?
    else
        echo "$REVIEW_PROMPT" | gemini -s -y --model=gemini-2.5-flash >"$TEMP_STDOUT" 2>"$TEMP_STDERR" &
        FLASH_PID=$!
        
        WAIT_COUNT=0
        GEMINI_EXIT_CODE=124
        while [[ $WAIT_COUNT -lt $GEMINI_TIMEOUT ]]; do
            if ! kill -0 $FLASH_PID 2>/dev/null; then
                wait $FLASH_PID
                GEMINI_EXIT_CODE=$?
                break
            fi
            sleep 1
            ((WAIT_COUNT++))
        done
        
        if [[ $WAIT_COUNT -ge $GEMINI_TIMEOUT ]]; then
            kill -TERM $FLASH_PID 2>/dev/null || true
            sleep 2
            kill -KILL $FLASH_PID 2>/dev/null || true
            wait $FLASH_PID 2>/dev/null || true
            GEMINI_EXIT_CODE=124
        fi
    fi
    
    GEMINI_REVIEW=$(cat "$TEMP_STDOUT" 2>/dev/null)
    if [[ $GEMINI_EXIT_CODE -ne 0 ]] || [[ -z "$GEMINI_REVIEW" ]]; then
        GEMINI_REVIEW="REVIEW_RATE_LIMITED"
    fi
elif [[ $GEMINI_EXIT_CODE -ne 0 ]]; then
    # Other error
    exit 0
fi

ESCAPED_PRINCIPLES=$(echo "$PRINCIPLES" | jq -Rs .)
ESCAPED_REVIEW=$(echo "$GEMINI_REVIEW" | jq -Rs .)

# Note: Cleanup is handled by trap on script exit

COMBINED_REASON=$(echo -e "$GEMINI_REVIEW\n\n$PRINCIPLES" | jq -Rs .)
cat << EOF
{
  "decision": "block",
  "reason": $COMBINED_REASON
}
EOF
シェルじゃなくてもっと簡潔に書ける何かあっただろとは思うんですが、何かインストールするのもめんどいのでシェルで作りました。
基本的に以下記事の hooks の使い方を真似させていただきました。そこに Gemini レビュー固有の設定を入れていった感じです。


 重要ポイント

 Stop hooks の戻り値に "decision": "block" をつかう
詳しくは上記記事を参考にしたほうがわかりやすいのですが、これを使うと stop 時に claude が停止せず、 reason の指示をみて再度動いてくれます。この reason に gemini のレビューを入れることによって、フィードバックループを作り出します。

 Gemini　を呼び出すとき -s -y をつける
git diff を見て欲しい場合は必須になります。diff　がないと claude の作業報告に対してだけのレビューになるため、レビューの質が落ちるので見て欲しいのですが、-y オプションをつけないと、非対話モードでは「diffを見ます」だけ返ってきて終わることがよくありました。-y をつけると比較的ちゃんと diff をみてからレビューしてくれる様になります。 -s はサンドボックスモード。保険でつけときます。

 レートリミットに対応
gemini-2.5-pro のレートリミットに引っかかると、-p の非対話モードで呼び出したときの応答に時間がかかる様になり、最後にレートリミットエラーが返ってきます。この場合は　--model で gemini-2.5-flash を指定すれば回避可能なので、スクリプトの処理としてレートリミットを検知して、--model 指定するようにしてあります。そのためにちょっと複雑なプロセス監視をしています。

 プロンプト
微妙な違いで gemini は解釈をかえて意味わからない挙動をするので、試行錯誤の結果、今使っているプロンプトがそれなりによいですが、改善の余地ありです。なかなかレビューラリーが終了しない、というか無限ループに近いので、人によっては終了条件をゆるくするのもありかもしれません。

 動作例
わりかしうまくいっています。



 おわりに
寝ている間もレートリミットまで限界に自動で動かしたい、というケースはあまり多くないとは思いますし、朝起きて見てみたらとんでもない謎のものが出来上がってる可能性もあるのですが、ロマンを感じてやってみました。gemini レビューに限らず、この stop hook で decision block を使って再起的に claude を働かせる方法は、設定の仕方によっては、github の issue が空になるまで全自動で動かすこともでき,寝てても全部開発が実現するわけで、なかなか面白い試みかなと思っています。終了条件が LLM 頼りなのが怖すぎるところではありますが、まあ、stop hook は Esc でもキャンセルできるし、常用する hook でもないのはそうでしょう。
ではごきげんよう。

---

## 6. [Anthropic公式「skill-creator」完全活用ガイド — SKILL.md設計・eval最適化・チーム運用・トラブルシューティングまで全部入り #Anthropic - Qiita](https://qiita.com/TaichiEndoh/items/8b8ed06bb76a80bb34c2)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/7
- **AI要約**:
  Anthropic公式のスキル構築支援ツール「skill-creator」の設計と運用の詳細解説
  スキルの自動評価（eval）機能により、トリガー率向上や品質改善のループを自動化可能
  APIやClaude Codeとの連携、MCPとの役割分担、セキュリティ監査手法までを網羅
- **今読む理由**: 2025年12月リリースの最新仕様に基づき、AI駆動開発におけるエージェントの挙動を制御する「Agent Skills」の具体的な実装・評価・最適化手法が網羅されており、即座にプロジェクトへ適用可能なため。
- **タグ**: #Anthropic, #AgentSkills, #ClaudeCode, #LLMOps, #自動化パイプライン

### 本文
この記事のポイント（3行要約）


skill-creatorはAnthropic公式が配布する「スキルを作るためのスキル」。Claudeに自分専用の作業手順を教え込める
2025年12月18日にAgent Skillsとして正式リリース。Claude.ai、Claude Code、APIで共通して使える
「フォルダにSKILL.mdを置くだけ」で作れる。コード不要でも始められるが、評価（eval）機能まで使うと本格的なカスタマイズが可能


はじめに — なぜ今「スキル」なのか
ChatGPTを使っていて、こんな経験はないだろうか。

「この書き方でブログを書いて」と毎回長いプロンプトを貼り付ける
プロジェクトごとに前提ルールを説明し直す
チームで「Claudeへの頼み方」がバラバラ

Anthropicが2025年12月にリリースした**Agent Skills（以下Skills）**は、これを解決する仕組みだ。Claudeはスキルを使って特定のタスクのパフォーマンスを向上させることができ、スキルは指示・スクリプト・リソースを含むフォルダで、必要なときにClaudeが読み込む。
そしてそのスキルを作るためのスキルが、今回紹介するskill-creatorだ。


🔰 初心者向け — そもそもスキルって何？

スキル = Claudeへの「マニュアル集」
想像してほしい。新入社員が入ってきたとき、あなたは何を渡すだろうか？

業務マニュアル
報告書のテンプレート
「うちの会社ではこう書く」という暗黙のルール集

Claudeにおけるスキルは、まさにこれと同じだ。
my-skill/
├── SKILL.md       ← マニュアル本体（必須）
├── scripts/       ← 自動化スクリプト（任意）
├── references/    ← 参考資料（任意）
└── assets/        ← テンプレート・画像（任意）

SKILL.mdには、「こういう場面で、こういう手順で仕事をしてね」という指示を書く。それだけだ。

スキルの魔法：必要なときだけ呼び出される
Claudeはタスクに関連するときだけスキルにアクセスする。つまり、10個のスキルを入れておいても、ブログ執筆を頼めばブログ執筆スキルだけが呼び出され、他のスキルは邪魔しない。
これは**Progressive Disclosure（段階的開示）**と呼ばれる仕組みで、3階層で動いている：



レベル
内容
常に読み込まれる？




1. メタデータ
name + description（約100語）
常時


2. SKILL.md本体
マニュアル（500行以内推奨）
スキルが呼び出されたとき


3. バンドルリソース
scripts/references/assets
必要なときだけ



たとえ話： 会社の全マニュアルを机に広げっぱなしにはしない。タイトルだけ目次で見て、必要な章だけ開く。スキルもそれと同じだ。

skill-creator = マニュアルを作るためのマニュアル
じゃあ「そのSKILL.mdってどう書けばいいの？」という問いに答えるのが、skill-creatorだ。
Anthropic公式の説明：

Create new skills, modify and improve existing skills, and measure skill performance.
（新しいスキルを作り、既存のスキルを修正・改善し、スキルのパフォーマンスを測定する）

つまり、skill-creatorをインストールしてClaudeに「スキルを作りたい」と話しかければ、Claudeが対話形式で一緒にスキルを作ってくれる。skill-creatorスキルはインタラクティブなガイダンスを提供し、Claudeがワークフローについて質問し、フォルダ構造を生成し、SKILL.mdファイルをフォーマットし、必要なリソースをバンドルする。手動でのファイル編集は不要。


🔧 中級者向け — skill-creatorの構成と使い方

インストール方法（Claude.ai）

Claude.aiの設定画面で「Skills」機能をオンにする
Anthropic公式のskill-creatorをインストール
チャットで「〇〇するスキルを作って」と話しかける


skill-creatorのフォルダ構成
実際のskill-creatorを開くと、以下の構成になっている：
skill-creator/
├── SKILL.md                     ← メイン指示書
├── agents/                      ← 専門サブエージェント
│   ├── analyzer.md              ← 結果分析担当
│   ├── comparator.md            ← A/B比較担当
│   └── grader.md                ← 採点担当
├── assets/
│   └── eval_review.html         ← レビュー画面
├── eval-viewer/
│   ├── generate_review.py       ← レビュー画面生成
│   └── viewer.html              ← ビューア
├── references/
│   └── schemas.md               ← JSON構造の仕様書
└── scripts/
    ├── aggregate_benchmark.py   ← ベンチマーク集計
    ├── generate_report.py       ← レポート生成
    └── run_loop.py              ← 最適化ループ実行


標準的なスキル作成プロセス（6ステップ）
skill-creatorが案内してくれる流れはこうだ：


意図のヒアリング — 何をさせたいスキルか、いつトリガーさせたいか

ドラフト作成 — SKILL.mdを書く

テストケース作成 — 2〜3個のリアルなユーザープロンプトを用意

評価（eval）の実行 — スキルありvs.なしでテストし、結果を比較

改善ループ — 結果をレビューしてSKILL.mdを修正

パッケージング — .skillファイルとして配布可能にする


description（説明文）が命
YAMLフロントマターのdescriptionは、Claudeがそのスキルを呼び出すかどうかを判断する唯一の手がかりだ。ここで手を抜くと、せっかく作ったスキルが呼び出されない。
skill-creator自身が自分のSKILL.mdで警告している：

Note: currently Claude has a tendency to "undertrigger" skills -- to not use them when they'd be useful. To combat this, please make the skill descriptions a little bit "pushy".

意訳すると「Claudeはスキルを遠慮して呼ばない傾向がある。だから説明文は少し押しつけがましいくらいでちょうどいい」。



NG（遠慮がちな書き方）
OK（しっかりトリガーされる書き方）




「社内データのダッシュボードを作るスキル」
「社内データのダッシュボードを作るスキル。ユーザーがダッシュボード、データ可視化、社内メトリクス、会社データの表示について言及したら必ずこのスキルを使うこと」




評価（eval）機能で品質を測る
skill-creatorの最大の特徴は、スキルの品質を定量的に測定できること。
scripts/run_loop.pyを実行すると、次のことが自動で行われる：

評価セットを60%が学習用、40%がテスト用に分割
各クエリを3回ずつ実行してトリガー率を計測
Claude自身が失敗パターンを分析してdescription改善案を提示
最大5回の改善ループを回す
過学習を防ぐため、テストスコアで最良版を選択


これは機械学習の世界でいうtrain/test splitの発想そのものだ。


🚀 上級者向け — アーキテクチャと応用

スキルの配布形式とエコシステム
2025年12月のリリースで、AgentSkillsはオープンスタンダードとして公開され、クロスプラットフォームのポータビリティが実現した。
配布方法は以下の3つ：



方法
対象
特徴





.skillファイル（zip）
Claude.ai
GUIでアップロード可能


ファイルシステム
Claude Code

~/.claude/skillsに配置


API
Claude API

/v1/skillsエンドポイント



Claude.aiはプリビルトのAgent Skillsとカスタムスキルの両方をサポート。Claude Codeはカスタムスキルのみサポート。APIではプリビルトスキルはskill_id（例：pptx、xlsx）で参照し、カスタムスキルは/v1/skillsエンドポイントでアップロード・管理できる。

APIでの使用（エンジニア向け）
APIで使う場合、事前に/v1/skillsエンドポイントでアップロードし、MessagesAPIリクエストに含める。SkillsはCode Execution Tool betaを必要とし、これがスキルの実行に必要な安全な環境を提供する。

MCPとSkillsの違い・使い分け
似た概念にMCP（Model Context Protocol）があるが、役割は明確に異なる：



観点
MCP
Skills




提供するもの
外部データ・ツールへのアクセス
ワークフローの知識・手順


実行タイミング
ツールが呼ばれたとき
関連するタスクに出会ったとき


内容
APIコール・データ取得
マニュアル・テンプレート


作成難度
サーバー実装が必要
Markdownだけでも可能




If you already have a working MCP server, you've done the hard part. Skills are the knowledge layer on top.
（MCPサーバーがすでに動いているなら難しい部分は終わっている。スキルはその上にある知識層だ）

MCPが「手」なら、Skillsは「段取り書」。両方組み合わせるのが強い。

セキュリティ上の注意
Anthropicは信頼できるソース（自分で作成したものやAnthropicから入手したもの）からのスキルのみを使用することを強く推奨している。スキルは指示とコードを通じてClaudeに新しい機能を提供するため、悪意のあるスキルはデータ持ち出し・不正アクセス・その他のセキュリティリスクにつながる可能性がある。
医療・業務データを扱う場面では特に重要で、以下を確認する：

SKILL.md、scripts、画像など、バンドルされた全ファイルを監査
予期しないネットワーク呼び出し・ファイルアクセスパターンの有無を確認
スキルの謳っている目的と一致しない操作がないかチェック


compatibilityフィールドの活用
スキルが特定のプラットフォーム機能に依存する場合、YAMLフロントマターで明示できる：
---
name: my-skill
description: ...
compatibility:
  required_tools:
    - code_execution
  platforms:
    - claude.ai
---

スキルはClaude.ai、Claude Code、APIで同一に動作する。一度作れば変更なしにすべての環境で動く。ただしスキルによっては特定プラットフォームの機能を最大限活用するよう設計されているものもあり、作者はcompatibilityフィールドでその旨を示せる。


実際に使ってみての所感
筆者（臨床工学技士 × AIエンジニア）は、自分の執筆スタイルをスキル化している。

三階層構成（🔰初心者/🔧中級者/🚀上級者）
一次情報出典の徹底
法的チェックリスト

これをSKILL.mdに書いてskill-creatorに読ませ、改善ループで磨き上げた。結果、毎回同じ品質で記事ドラフトが生成されるようになった。チーム内でスタイルを統一したい場合にも有効だ。
一方で注意点も：


スキルが増えすぎるとトリガー競合が起きる → 定期的な整理が必要

description次第で呼ばれない問題 → run_loop.pyでの最適化が実質必須

Claude.ai / Claude Code / APIで同期しない → カスタムスキルはサーフェス間で同期しない。Claude.aiにアップロードされたスキルはAPIに別途アップロードが必要で、API経由でアップロードされたスキルはClaude.aiで利用できない

この最後の点は運用上けっこうハマるポイントなので、配布計画時に考慮しておきたい。


📝 ハンズオン — SKILL.mdの書き方テンプレート

最小構成のSKILL.md
コード不要で動く最小のスキルはこれだけだ。
name: blog-writer
description: |
  技術ブログ記事を執筆するスキル。ユーザーがブログ記事、技術記事、
    Qiita、Zennについて言及したら必ずこのスキルを使うこと。
    version: 1.0.0
    ---

    # ブログ執筆スキル

    ## 目的
    技術記事を一定のフォーマットで高品質に執筆する。

    ## 構成テンプレート
    1. **導入** — 読者の課題感に共感する（3〜5行）
    1. 2. **本論** — 3〜5つのセクションに分けて説明
    1. 3. **コード例** — 動作確認済みのサンプルを必ず含める
    1. 4. **まとめ** — 箇条書きで要点を整理

## 文体ルール
- 口語的だが技術的に正確
- - 一文50字以内
- - 専門用語は初出時に説明する

## 品質チェックリスト
- [ ] コードは実際に動作するか
- [ ] - [ ] 外部リンクは一次情報か
- [ ] - [ ] まとめは本文と対応しているか
- [ ] ```

### description設計のコツ

前述の通り、descriptionがトリガーを決める命綱だ。以下の要素を含めると精度が上がる。

| 要素 | 例 |
|---|---|
| **スキル名（何をするか）** | 「技術ブログ記事を執筆するスキル」 |
| **トリガーキーワード** | 「ブログ記事、Qiita、Zenn、記事について言及したら」 |
| **必須度の明示** | 「必ずこのスキルを使うこと」 |
| **除外条件（あれば）** | 「コードレビューや質問応答には使わない」 |

### 実用ユースケース別スキル例

Qiitaエンジニアが実際に使えるスキルのアイデアをいくつか挙げる。

**コードレビュースキル**
```markdown---
name: code-reviewer
description: |
  コードレビューを行うスキル。PR、コードの改善点、バグ検出、
    セキュリティチェックについて言及されたら必ずこのスキルを使うこと。
    ---
    # レビュー観点
    1. バグ・エラーハンドリングの抜け
    1. 2. セキュリティ（SQL injection, XSS, 認証漏れ）
    1. 3. パフォーマンス（N+1クエリ、不要なループ）
    1. 4. 可読性・命名規則
    1. 5. テスト網羅率
    1. ```

**議事録スキル**
```markdown---
name: meeting-minutes
description: |
  会議の議事録を作成するスキル。ミーティング、議事録、
    会議メモについて言及されたら必ずこのスキルを使うこと。
    ---
    # 出力フォーマット
    ## 日時・参加者
    ## 決定事項（アクション付き）
    ## 議論のポイント
    ## 次回アジェンダ
    ```

    ---

    ## 🔬 eval（評価）機能の詳細

    ### なぜevalが重要か

    SKILL.mdを書いたはいいが、「本当にちゃんと呼ばれているか？」「期待通りのアウトプットが出ているか？」を測定しないと、スキルの品質は主観的評価に留まる。

    skill-creatorの`scripts/run_loop.py`は、これを**自動化**する。

    ### evalセットの設計

    evalは「テストケース」の集まりだ。各ケースは以下の3要素で構成される。

    ```json
    {
      "id": "test_001",
        "query": "Pythonのリスト内包表記について記事を書いて",
          "expected_behavior": "ブログ執筆スキルがトリガーされ、構成テンプレートに沿った記事が生成される",
            "success_criteria": [
                "スキルがトリガーされている",
                    "導入・本論・まとめの構成になっている",
                        "コードサンプルが含まれている"
                          ]
                          }
                          ```

                          **設計のポイント：**
                          - ポジティブケース（スキルが呼ばれるべきケース）とネガティブケース（呼ばれるべきでないケース）の両方を用意する
                          - - 最低10件、できれば30件以上用意するとrun_loop.pyの精度が上がる
                          - - リアルなユーザーの言い回しを使う（「記事を書いて」「ブログにまとめて」など揺らぎを含める）

### 改善ループの見方

run_loop.pyを実行すると、以下のようなレポートが出力される。


Iteration 1/5
Trigger rate: 62% (18/29 queries triggered the skill)
Top failure patterns:
- "まとめて"という表現でトリガーされない (5件)
-     - 英語クエリでトリガーされない (3件)
-       Suggested description improvement:
-           → "記事、ブログ、まとめ、article、writeについて言及したら..."
Iteration 2/5
Trigger rate: 83% (24/29 queries triggered the skill)
...
```
このフィードバックを見ながら、descriptionを育てていく。**5回のループで80%以上のトリガー率を目標にするとよい。**

---


🏢 チームでの活用 — スキルを組織資産にする

なぜチームでスキルを共有するのか
個人がスキルを作るだけでは「属人化の再発明」にすぎない。スキルをチームで共有することで、Claudeへの頼み方の標準化とベストプラクティスの蓄積が実現する。
想定効果：

オンボーディング時間の短縮（スキルが「Claudeへの操作マニュアル」になる）


アウトプット品質のばらつき解消




「あの人はどうやってClaudeに頼んでいるの？」という暗黙知の形式知化




チーム導入の3ステップ
Step 1: スキルリポジトリを作る
GitHubにプライベートリポジトリを用意し、スキルを一元管理する。
team-skills```├── README.md              ← スキル一覧と使い方
├── blog-writer```│   ├── SKILL.md
│   └── references```│       └── style-guide.md
├── code-reviewer```│   └── SKILL.md
├── incident-report```│   └── SKILL.md
└── release-notes```    ├── SKILL.md
    └── assets```        └── template.md
    ```

    **Step 2: スキルのバージョン管理とリリースフロー**

    ```yaml
    # SKILL.mdのYAMLフロントマター例（チーム向け）
    ---
    name: code-reviewer
    version: 2.1.0
    description: |
      コードレビューを行うスキル。PR、コードの改善点、バグ検出、
        セキュリティチェックについて言及されたら必ずこのスキルを使うこと。
        author: backend-team
        last_updated: 2025-12-20
        changelog:
          - v2.1.0: Rustのレビュー観点を追加
          -   - v2.0.0: セキュリティチェックリストを刷新
          -     - v1.0.0: 初版
          -     ---
          -     ```

バージョン管理の方針：
- `MAJOR`: スキルの目的や出力形式が大きく変わる
- - `MINOR`: 観点・チェックリストの追加
- - `PATCH`: 誤字・表現の修正

**Step 3: スキルのレビュープロセス**

個人が作ったスキルをチームに展開する前に、以下のレビューを推奨する。

```markdown## スキルレビューチェックリスト

### descriptionチェック
- [ ] トリガーキーワードが3つ以上含まれているか
- [ ] - [ ] 「必ずこのスキルを使うこと」などの強制表現があるか
- [ ] - [ ] 除外ケースが明記されているか（誤トリガー防止）

### SKILL.md本体チェック
- [ ] 目的が1〜2文で明確に書かれているか
- [ ] - [ ] 手順が番号付きで順序立てて書かれているか
- [ ] - [ ] 出力フォーマットの例が含まれているか
- [ ] - [ ] 500行以内に収まっているか

### evalチェック
- [ ] ポジティブケースが10件以上あるか
- [ ] - [ ] ネガティブケース（誤トリガー防止）が5件以上あるか
- [ ] - [ ] run_loop.pyでトリガー率80%以上を達成しているか
- [ ] ```

### ロールごとのスキル活用例

| ロール | 活用スキル例 | 効果 |
|---|---|---|
| フロントエンド | コンポーネント仕様書生成、アクセシビリティチェック | レビュー前の自己チェック自動化 |
| バックエンド | API設計レビュー、DBスキーマレビュー | 設計段階でのフィードバック高速化 |
| テックリード | ADR（Architecture Decision Record）作成 | 意思決定の記録・標準化 |
| QA | テストケース生成、バグレポートテンプレート | テスト設計の品質向上 |
| PM | 要件定義テンプレート、スプリントレトロ | ドキュメント作成コスト削減 |
| DevOps | インシデントレポート、ポストモーテム | 障害対応ナレッジの蓄積 |

---

## 🐛 トラブルシューティング — よくあるハマりポイントと解決策

### Q1. スキルが全然呼ばれない

**症状：** スキルをインストールしても、関連するタスクを頼んでも無視される。

**原因と解決策：**

```markdown# NG: 曖昧すぎるdescription
description: コードを書くのに役立つスキル

# OK: 明確なキーワードと強制表現
description: |
  Pythonコードを書くスキル。ユーザーがPython、スクリプト、
    自動化、データ処理、pandas、FastAPI、Djangoについて
      言及したら必ずこのスキルを使うこと。他の言語の場合は使わない。
      ```

      **チェックリスト：**
      - descriptionに具体的なキーワードが含まれているか確認
      - - 「必ずこのスキルを使うこと」などの強制表現を追加
      - - `run_loop.py`でトリガー率を測定し、失敗パターンを特定

### Q2. 関係ないタスクでもスキルが呼ばれてしまう（誤トリガー）

**症状：** ブログ執筆スキルなのに、コードの質問をしても呼ばれる。

**原因と解決策：**

```markdown# 除外条件を明示する
description: |
  技術ブログ記事を執筆するスキル。ユーザーがブログ記事、
    Qiita、Zenn、記事の執筆・構成について言及したら使うこと。
      ただし、コードの質問、バグ修正、コードレビューには使わない。
      ```

      ネガティブケースをevalセットに追加し、誤トリガーが減るまでrun_loop.pyで改善を回す。

      ### Q3. SKILL.mdを更新したのに反映されない

      **症状：** SKILL.mdを編集して保存したのに、Claudeの挙動が変わらない。

      **解決策：**

      | プラットフォーム | 対処法 |
      |---|---|
      | Claude.ai | スキルを一度削除して再アップロード |
      | Claude Code | `~/.claude/skills/`のファイルを更新後、新しいセッションを開始 |
      | API | `/v1/skills/{skill_id}`にPUTリクエストで更新 |

      **注意：** Claudeはセッション開始時にスキルを読み込む。同じセッション内でスキルを更新しても、そのセッションには反映されない。

      ### Q4. Claude.aiとAPIでスキルの挙動が違う

      **症状：** Claude.aiでは期待通りに動くのに、APIで使うと動作が異なる。

      **原因：** Claude.aiとAPIはスキルを別々に管理している。Claude.aiにアップロードしたスキルは自動的にAPIに反映されない。

      **解決策：**

      ```bash
      # APIにスキルをアップロード
      curl -X POST https://api.anthropic.com/v1/skills \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
          -H "anthropic-version: 2023-06-01" \
            -F "file=@my-skill.zip"
            ```

            APIでスキルを使う際は、MessagesAPIリクエストに`skill_ids`を含める：

            ```python
            import anthropic

            client = anthropic.Anthropic()

            response = client.beta.messages.create(
                model="claude-opus-4-5",
                    max_tokens=1024,
                        messages=[
                                {"role": "user", "content": "技術ブログ記事を書いて"}
                                    ],
                                        skill_ids=["your_skill_id_here"],
                                            betas=["skills-2025-12-18"]
                                            )
                                            ```

                                            ### Q5. run_loop.pyが途中でエラーになる

                                            **症状：** eval実行中に `RateLimitError` や `TimeoutError` が発生する。

                                            **解決策：**

                                            ```python
                                            # run_loop.py実行時の推奨オプション
                                            python scripts/run_loop.py \
                                              --skill-dir ./my-skill \
                                                --eval-file evals.json \
                                                  --max-iterations 3 \        # イテレーション数を減らす
                                                    --delay 2.0 \               # API呼び出し間隔を空ける
                                                      --model claude-haiku-4-5    # 高速・低コストモデルを使う
                                                      ```

                                                      evalの実行コストを抑えるため、本番前は`claude-haiku`でテストし、最終確認のみ`claude-opus`を使うのが効率的だ。

                                                      ### Q6. チームメンバーがスキルを「発見」できない

                                                      **症状：** スキルリポジトリを作ったが、メンバーがどのスキルが存在するか知らずに使われない。

                                                      **解決策：スキル一覧READMEの整備**

                                                      ```markdown
                                                      # チームスキル一覧

                                                      ## 📝 執筆・ドキュメント系
                                                      | スキル名 | トリガー例 | 担当 |
                                                      |---|---|---|
                                                      | blog-writer | 「ブログ記事を書いて」 | @alice |
                                                      | release-notes | 「リリースノートを作成して」 | @bob |
                                                      | adr-writer | 「ADRを書いて」 | @carol |

                                                      ## 🔍 レビュー系
                                                      | スキル名 | トリガー例 | 担当 |
                                                      |---|---|---|
                                                      | code-reviewer | 「コードをレビューして」 | @dave |
                                                      | pr-description | 「PR説明文を書いて」 | @eve |

                                                      ## 🚨 インシデント対応系
                                                      | スキル名 | トリガー例 | 担当 |
                                                      |---|---|---|
                                                      | incident-report | 「インシデントレポートを作成して」 | @ops-team |
                                                      | postmortem | 「ポストモーテムをまとめて」 | @ops-team |
                                                      ```

                                                      ---

                                                      ## ⚡ 上級テクニック — サブエージェントとスクリプト活用

                                                      ### サブエージェントでスキルを分割する

                                                      複雑なワークフローは、1つのSKILL.mdに詰め込まず、`agents/`ディレクトリにサブエージェントを置いて役割分担させる。

                                                      ```
                                                      complex-skill/
                                                      ├── SKILL.md           ← オーケストレーター（全体制御）
                                                      └── agents/
                                                          ├── researcher.md  ← 情報収集担当
                                                              ├── writer.md      ← 執筆担当
                                                                  └── reviewer.md    ← 品質チェック担当
                                                                  ```

                                                                  **SKILL.md（オーケストレーター）の書き方：**

                                                                  ```markdown
                                                                  ---
                                                                  name: deep-research-writer
                                                                  description: |
                                                                    深い調査が必要な技術記事を書くスキル。
                                                                      リサーチ、調査、詳細な技術記事について言及したら使うこと。
                                                                      ---

                                                                      # 深いリサーチ記事執筆スキル

                                                                      ## ワークフロー
                                                                      1. **researcher**エージェントに情報収集を依頼する
                                                                      1. 2. 収集した情報をもとに**writer**エージェントが記事を執筆する
                                                                      1. 3. **reviewer**エージェントが品質チェックを行い、修正点を列挙する
                                                                      1. 4. writerが修正を反映して最終版を出力する

## エージェントへの指示方法
各エージェントはagents/ディレクトリのmdファイルを参照すること。


scriptsでClaudeの出力を後処理する
scripts/ディレクトリにPythonスクリプトを置くと、Claudeが必要なときに実行できる。
# scripts/format_output.py
# Claudeが生成した記事をQiita/Zenn形式に変換する

import sys
import re

def convert_to_qiita_format(content: str) -> str:
    """Claudeの出力をQiita Markdown形式に変換する"""
        # コードブロックの言語指定を正規化
            content = re.sub(r'```(\w+)\n', lambda m: f'```{m.group(1).lower()}\n', content)

                    # 見出しレベルを調整（h1 → h2から開始）
                        lines = content.split('\n')
                            processed = []
                                for line in lines:
                                        if line.startswith('# ') and not line.startswith('## '):
                                                    line = '#' + line  # h1 → h2
                                                            processed.append(line)

                                                                    return '\n'.join(processed)

                                                                    if __name__ == '__main__':
                                                                        content = sys.stdin.read()
                                                                            print(convert_to_qiita_format(content))
                                                                            ```

                                                                            **SKILL.mdでスクリプトを参照する：**

                                                                            ```markdown
                                                                            ## 出力処理
                                                                            記事を執筆したら、scripts/format_output.pyを使ってQiita形式に変換してから出力すること。
                                                                            ```

                                                                            ### references/で参考資料を永続化する

                                                                            `references/`に置いたファイルは、スキルが呼ばれたときに必要に応じてClaudeが参照できる。

                                                                            活用例：
                                                                            - `references/style-guide.md` — チームの文体・表記ルール
                                                                            - - `references/tech-glossary.md` — 社内用語集・略語集
                                                                            - - `references/past-articles.md` — 過去記事の一覧とURLリスト
                                                                            - - `references/templates/` — 各種ドキュメントテンプレート

```markdown
# references/style-guide.md

## 表記統一ルール
- 「ユーザー」（「ユーザ」ではない）
- - 「メール」（「E-mail」「email」ではない）
- - 英数字は半角（全角使用禁止）

## 見出しルール
- h2（##）: 大セクション（3〜5個まで）
- - h3（###）: サブセクション
- - h4以下は使わない

## コードブロックルール
- 言語を必ず指定する（```python, ```bash, ```yaml など）
- - 30行を超えるコードは分割して説明を挟む
- ```

---

## 🔢 APIでの高度な使い方

### スキルのアップロードと管理（完全なコード例）

```python
import anthropic
import zipfile
import os
from pathlib import Path

def package_skill(skill_dir: str) -> str:
    """スキルディレクトリをzipファイルにパッケージング"""
        skill_path = Path(skill_dir)
            zip_path = f"{skill_dir}.zip"

                    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                            for file_path in skill_path.rglob('*'):
                                        if file_path.is_file():
                                                        arcname = file_path.relative_to(skill_path.parent)
                                                                        zf.write(file_path, arcname)

                                                                                return zip_path

                                                                                def upload_skill(client: anthropic.Anthropic, skill_dir: str) -> str:
                                                                                    """スキルをAPIにアップロードしてskill_idを返す"""
                                                                                        zip_path = package_skill(skill_dir)

                                                                                                with open(zip_path, 'rb') as f:
                                                                                                        response = client.beta.skills.upload(file=f)
                                                                                                            
                                                                                                                os.remove(zip_path)  # 一時ファイルを削除
                                                                                                                    return response.skill_id
                                                                                                                    
                                                                                                                    def use_skill(client: anthropic.Anthropic, skill_id: str, prompt: str) -> str:
                                                                                                                        """スキルを使ってメッセージを送る"""
                                                                                                                            response = client.beta.messages.create(
                                                                                                                                    model="claude-opus-4-5",
                                                                                                                                            max_tokens=4096,
                                                                                                                                                    messages=[{"role": "user", "content": prompt}],
                                                                                                                                                            skill_ids=[skill_id],
                                                                                                                                                                    betas=["skills-2025-12-18"]
                                                                                                                                                                        )
                                                                                                                                                                            return response.content[0].text
                                                                                                                                                                            
                                                                                                                                                                            # 使用例
                                                                                                                                                                            client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
                                                                                                                                                                            
                                                                                                                                                                            # スキルをアップロード
                                                                                                                                                                            skill_id = upload_skill(client, "./blog-writer")
                                                                                                                                                                            print(f"Uploaded skill: {skill_id}")
                                                                                                                                                                            
                                                                                                                                                                            # スキルを使って記事生成
                                                                                                                                                                            result = use_skill(client, skill_id, "FastAPIの非同期処理について技術ブログ記事を書いて")
                                                                                                                                                                            print(result)
                                                                                                                                                                            ```
                                                                                                                                                                            
                                                                                                                                                                            ### 複数スキルの組み合わせ
                                                                                                                                                                            
                                                                                                                                                                            複数のスキルを同時に指定することで、それぞれのスキルが適切なタイミングでトリガーされる。
                                                                                                                                                                            
                                                                                                                                                                            ```python
                                                                                                                                                                            # 複数スキルを組み合わせる
                                                                                                                                                                            response = client.beta.messages.create(
                                                                                                                                                                                model="claude-opus-4-5",
                                                                                                                                                                                    max_tokens=4096,
                                                                                                                                                                                        messages=[
                                                                                                                                                                                                {"role": "user", "content": "このPRのコードをレビューして、レビューコメントをPR説明文にまとめて"}
                                                                                                                                                                                                    ],
                                                                                                                                                                                                        skill_ids=[
                                                                                                                                                                                                                "skill_code_reviewer_abc123",
                                                                                                                                                                                                                        "skill_pr_description_def456",
                                                                                                                                                                                                                            ],
                                                                                                                                                                                                                                betas=["skills-2025-12-18"]
                                                                                                                                                                                                                                )
                                                                                                                                                                                                                                ```
                                                                                                                                                                                                                                
                                                                                                                                                                                                                                ### プリビルトスキル（Anthropic公式）との組み合わせ
                                                                                                                                                                                                                                
                                                                                                                                                                                                                                AnthropicはPowerPoint生成（pptx）、Excel生成（xlsx）などのプリビルトスキルを提供している。
                                                                                                                                                                                                                                
                                                                                                                                                                                                                                ```python
                                                                                                                                                                                                                                # カスタムスキル + プリビルトスキルの組み合わせ
                                                                                                                                                                                                                                response = client.beta.messages.create(
                                                                                                                                                                                                                                    model="claude-opus-4-5",
                                                                                                                                                                                                                                        max_tokens=4096,
                                                                                                                                                                                                                                            messages=[
                                                                                                                                                                                                                                                    {"role": "user", "content": "月次レポートをPowerPointにまとめて"}
                                                                                                                                                                                                                                                        ],
                                                                                                                                                                                                                                                            skill_ids=["pptx"],           # Anthropicプリビルト
                                                                                                                                                                                                                                                                betas=["skills-2025-12-18"]
                                                                                                                                                                                                                                                                )
                                                                                                                                                                                                                                                                ```
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                ---
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                ## ❓ FAQ
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: スキルはどのくらいの数まで登録できるか？**
                                                                                                                                                                                                                                                                A: 公式に上限は明記されていないが、スキルが多すぎると選択精度が下がる。実用上は10〜15個程度に絞り、定期的に使われていないスキルを整理することを推奨。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: SKILL.mdはどの言語で書けばいいか？**
                                                                                                                                                                                                                                                                A: Claudeは多言語に対応しているため、日本語・英語どちらでも機能する。ただし、スキルを使う言語と同じ言語で書くと精度が上がりやすい。日本語でClaudeを使うなら日本語で書くのがベター。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: スキルの内容は他のユーザーに見られるか？**
                                                                                                                                                                                                                                                                A: カスタムスキルはプライベートで、他のユーザーからは見えない。Anthropic公式のプリビルトスキルはオープンスタンダードとして公開されている。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: スキルを作る際に、既存のシステムプロンプトと競合しないか？**
                                                                                                                                                                                                                                                                A: スキルとシステムプロンプトは併用できる。スキルはシステムプロンプトの補完として機能し、関連するタスクに対してのみ追加の指示を提供する。競合する可能性がある場合は、SKILL.md内に「システムプロンプトと矛盾する場合はシステムプロンプトを優先すること」と明記しておくと安全。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: run_loop.pyを使わずにevalだけ手動でできるか？**
                                                                                                                                                                                                                                                                A: できる。評価セット（JSONファイル）を用意して、スキルありとなしでClaudeに同じクエリを送り、結果を比較すれば同様の効果を得られる。run_loop.pyはそのプロセスを自動化しているだけだ。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: Claude Codeでスキルを使う場合、特別な設定は必要か？**
                                                                                                                                                                                                                                                                A: `~/.claude/skills/`ディレクトリにスキルフォルダを配置するだけで自動的に認識される。Claude.aiのようなGUIによるインストール操作は不要。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                ---
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                





まとめ


skill-creatorはClaudeに「自分専用の仕事のやり方」を教えるための公式スキル

SKILL.mdというMarkdownファイル1枚から始められ、コード不要でも運用可能
評価機能（run_loop.py）まで使えば、定量的に品質を測って改善できる
Claude.ai / Claude Code / APIで共通の仕組みだが、同期はしないので要注意

MCPとは補完関係。MCP = 手、Skills = 段取り書

「毎回同じプロンプトを貼り付けている」「チームで品質をそろえたい」という悩みがあるなら、skill-creatorを一度試してみる価値は大いにある。


参考資料・出典

Anthropic公式

Introducing Agent Skills（2025/12/18）: https://www.anthropic.com/news/skills

Agent Skills API Docs: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

Claude Code Skills Docs: https://code.claude.com/docs/en/skills

GitHub公式リポジトリ: https://github.com/anthropics/skills

skill-creator SKILL.md（原文）: https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md

The Complete Guide to Building Skills for Claude: https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf



筆者関連リンク

公式サイト：taichiendoh.com
アイデア掲示板：taichiendoh.com/ideas
X：@endoh_taichi



22Go to list of users who liked22Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up

---

## 7. [【完全版】Claude Code運用40選｜KAWAI](https://note.com/kawaidesign/n/nce2f82c62f1f)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/7
- **AI要約**:
  Claude Codeを対話ツールではなく「自律的に動作する作業環境」として再設計する40の手法を提示
  CLAUDE.md、Skills、Hooksを用いた文脈の外部化と、安全なコマンド実行の自動制御方法を解説
  MCP連携や非対話モード、GitHub Actionsを組み合わせた高度な自動化パイプライン構築を網羅
- **今読む理由**: AI駆動開発のコアとなるClaude Codeを、単なるチャットツールから高度な自動化エージェントへと昇華させる具体的な設定ファイル構成やHooks、スキルの記述方法が網羅されており、即座にプロジェクトに反映可能なため。
- **タグ**: #Claude Code, #AI駆動開発

### 本文
Claude Codeは、便利なチャットではありません。設定、文脈、検証、自動化、並列化まで設計すると、日々の作業環境そのものになります。この記事では、手元にあるClaude Code運用メモを土台に、Anthropic公式ドキュメント、Claude Help Center、GitHub Actions、MCP、Hooks、Skills、Subagents、非対話モード、情報収集ワークフローまで整理しました。2026年5月4日通知この記事は全文無料（期間限定）で閲覧できます。見出し画像はAIで生成しました。プロンプトはこの記事に掲載中。Claude Codeは「会話相手」ではなく「作業環境」ですClaude Codeを使いこなせない原因の多くは、プロンプトの上手さではありません。作業環境として扱えていないことです。公式ベストプラクティスでも、Claude Codeはファイルを読み、コマンドを実行し、変更を加え、自律的に問題を進めるエージェント型の開発環境として説明されています。つまり、ただ質問する道具ではなく、仕事の進め方を設計する対象です。押さえる軸は6つです。1つ目は、探索と実装を分けること。2つ目は、テストやスクリーンショットでClaude自身に検証させること。3つ目は、CLAUDE.mdやSkillsで文脈を外部化すること。4つ目は、HooksやPermissionsで守るべき動作を仕組みにすること。5つ目は、Subagentsや複数セッションで作業を並列化すること。6つ目は、情報収集を一度きりの検索ではなく、蓄積されるナレッジに変えることです。Claude Code 知らないと損する40のワザ先着100名限定ウェビナー 詳細はこちら↓【超初心者OK】Claude Code 個別サポート※早割先着10名様分は完売しました。まず入れるべき基本設定最初にやるべきことは、すごいコマンドを覚えることではありません。Claudeが迷わず作業できる地図を置くことです。`/init`でCLAUDE.mdを作るプロジェクトの構造、ビルド方法、テスト方法、コーディング規約を書きます。公式ドキュメントでは、CLAUDE.mdは毎回読み込まれるため、短く、人間が読める形に保つことが推奨されています。CLAUDE.mdは「同じミスを2回したら追記」する最初から完璧に書く必要はありません。Claudeが同じ勘違いをしたら、その時点でルール化します。逆に、読まれなくなった長文ルールは削ります。User memoryとProject memoryを分ける個人の好みは `~/.claude/CLAUDE.md`、チームで共有する規約はプロジェクト直下の `CLAUDE.md` に置きます。モノレポでは親ディレクトリと子ディレクトリのCLAUDE.mdを分けると、全体規約と局所規約を両立できます。`/memory`で記憶を確認するどのメモリが読まれているかを把握せずに運用すると、Claudeがなぜその挙動をしているのか追えません。記憶は便利ですが、増えすぎると逆に効きません。`/permissions`で安全な作業を事前承認する毎回の許可確認をなくすために、`npm test`、`npm run lint`、`git status` のような安全なコマンドは許可リストに入れます。一方で、`.env`、秘密鍵、production設定へのアクセスは明示的に避けます。settings.jsonをチームで管理するプロジェクト共通の設定は `.claude/settings.json` に置きます。個人差分は `.claude/settings.local.json` に逃がすと、チームの作業体験を揃えられます。`/statusline`で現在地を見える化するブランチ、モデル、コンテキスト使用率、コストを常に見えるようにします。特に複数セッションや複数worktreeを使う人ほど、現在地の表示が事故防止になります。精度を上げる依頼の出し方Claude Codeの精度は、「何を頼むか」より「どう検証できる形で頼むか」で決まります。大きい変更はPlan Modeから始めるいきなり実装させず、まず探索、計画、実装、コミットに分けます。公式ベストプラクティスでも、複数ファイルにまたがる変更や不確実な変更ではPlan Modeが推奨されています。小さい変更はPlan Modeを使わない誤字修正、ログ追加、1行の条件変更のような作業まで計画させると遅くなります。計画が必要なのは、影響範囲が不明な時です。成功条件を先に渡す「直して」ではなく、「このテストが通ること」「このスクリーンショットと差分がないこと」「このCLI出力になること」まで指定します。Claude自身に検証させる公式ベストプラクティスは、Claudeに検証手段を与えることを高レバレッジな行動として説明しています。テスト、lint、typecheck、スクリーンショット、期待出力を用意します。失敗ログは要約せず貼るエラーメッセージを人間が丸めると、原因の手がかりが消えます。長いログはファイルに保存し、Claudeに読ませます。既存パターンを指定する「新しいコンポーネントを作って」ではなく、「既存のWidget実装を読んで、同じパターンで作って」と伝えます。Claude Codeはコードベース内の慣習を読ませた時に強くなります。仕様が曖昧ならClaudeに質問させる公式ドキュメントには、Claudeにインタビューさせる使い方も紹介されています。大きな機能ほど、実装前に質問を出させた方が手戻りが減ります。画像やスクリーンショットを渡すUI作業では、コードだけでは判断できない崩れが出ます。スクリーンショット、参照画像、ブラウザ確認をセットにすると、Claudeが自分で差分を見つけやすくなります。`/rewind`やチェックポイントを使う怖い変更は、戻せる前提で試します。ただし、外部API、DB書き込み、メール送信のような副作用はチェックポイントだけでは戻せません。文脈を育てるCLAUDE.md、Skills、SubagentsClaude Codeを毎日使うなら、会話内で説明し続けるのは負けです。繰り返す知識は外に出します。いつも使う手順はSkillsにする`.claude/skills/<name>/SKILL.md` に、繰り返す作業手順を書きます。公式ベストプラクティスでは、Skillsはプロジェクトやチーム固有の知識、再利用ワークフローを渡す仕組みとして説明されています。毎回読む必要がない知識はCLAUDE.mdに入れないCLAUDE.mdは常に読み込まれるため、長くすると効きません。たまに使うドメイン知識、長い手順、チェックリストはSkillsに分けます。Slash commandは短い定型依頼に使う`.claude/commands/` にMarkdownファイルを置くと、独自のスラッシュコマンドを作れます。引数も渡せるため、`/fix-issue 123` のような運用に向いています。Subagentsは調査、レビュー、デバッグに使うSubagentsは独立したコンテキストで動く専門エージェントです。公式ドキュメントでは、メイン会話の文脈を汚さず、特定領域に集中できる点が利点として説明されています。Subagentには役割を絞って書く万能エージェントを作るより、`code-reviewer`、`debugger`、`security-reviewer`、`test-runner` のように責務を分けます。使えるツールも必要最小限にします。調査はSubagent、意思決定はメインで行う大量のファイルを読む調査はSubagentに逃がします。ただし、最終判断まで丸投げすると、全体の意図がぼやけます。メインセッションは意思決定の場として残します。学びはPRコメントからCLAUDE.mdに戻すレビューで何度も出る指摘は、次回以降のルールにします。コードレビューは、その場の修正だけでなく、未来のClaudeの行動を変える機会です。自動化はHooks、MCP、非対話モードで作るClaude Codeの強さは、作業を「お願い」から「仕組み」に変えられることです。Hooksで例外なく実行するHooksは、Claude Codeのライフサイクルに合わせてコマンドを実行する仕組みです。公式ドキュメントでは、`PreToolUse`、`PostToolUse`、`UserPromptSubmit`、`Stop`、`SessionStart` などのイベントが説明されています。整形はPostToolUse hookに任せるファイル編集後にformatterやlintを走らせると、スタイル崩れを人間が指摘する必要が減ります。ただし、重い処理を毎回走らせると作業全体が遅くなります。禁止事項はプロンプトではなくHookで止める「migrationsを勝手に触らないで」と書くより、書き込み前に止めるHookの方が強いです。公式ガイドでも、HooksはLLMの判断に頼らず動作を保証する仕組みとして説明されています。MCPで外部ツールを同じ作業面に入れるMCPを使うと、GitHub、Jira、Notion、Figma、DB、SlackなどをClaude Codeから扱えます。公式ドキュメントでは、Issueから実装、監視データ分析、DB照会、Figma連携、Gmail下書き作成などの例が示されています。MCPの出力はトークン量を管理するMCPは便利ですが、巨大な出力はコンテキストを圧迫します。必要な範囲だけ取る、ページングする、要約ファイルに落とす、という設計が必要です。`claude -p`で非対話モードにする`claude -p "prompt"` は、CI、pre-commit、バッチ処理、ログ解析に使えます。公式ベストプラクティスでも、`--output-format json` や `stream-json` による自動処理が紹介されています。大量ファイルはfan-outする大規模移行を1セッションに抱えさせるのではなく、対象ファイルのリストを作り、ファイル単位で `claude -p` を回します。最初は2、3ファイルで失敗パターンを見てから広げます。GitHub ActionsでPRやIssueから呼ぶClaude Code GitHub Actionsを使うと、PRやIssue上の `@claude` メンションから、質問回答、コード変更、PR作成、レビューを実行できます。チーム運用では、ターミナルに閉じない導線が重要です。並列化するとClaude Codeは別物になる1人で1つのClaudeを眺める使い方から、複数のClaudeを役割分担させる使い方に変えると、体感が変わります。git worktreeで独立タスクを分ける認証、UI、テスト修正、ドキュメント更新のように衝突しにくい作業は、worktreeを分けて同時に進めます。レビューできる量を超える本数に増やすと逆効果です。WriterとReviewerを別セッションにする同じClaudeに自分の実装をレビューさせるより、別セッションでレビューさせる方がバイアスが減ります。公式ベストプラクティスでも、複数セッションを品質向上に使うWriter/Reviewerパターンが紹介されています。テストを書くClaudeと実装するClaudeを分ける先にテストを書くセッション、次に通す実装セッション、最後にレビューするセッションに分けると、仕様の穴が見えやすくなります。フロントエンドはブラウザ確認まで任せるChrome拡張やブラウザ操作を使える環境では、スクリーンショット確認、UI差分、操作確認までセットにします。見た目の作業は、生成だけで終わらせると品質が安定しません。CloudやDesktopの複数セッションも使い分ける公式ベストプラクティスでは、Desktop、Web、Agent teamsなど複数セッションの選択肢が紹介されています。ローカルで十分な作業と、クラウド上の隔離環境で進める作業を分けます。自動承認は安全設計とセットで使うAuto modeやSandboxingは便利ですが、何でも通すための機能ではありません。許可リスト、deny、sandbox、Hookを組み合わせて、止めるべき操作が止まる状態を作ります。情報収集は「調べる」から「貯まる」に変えるClaude Codeの情報収集は、一回の検索で終わらせると弱いです。強いのは、調べた内容が次回以降の判断に使われる状態です。まず普通にClaude Codeに検索させる最新情報、公式ドキュメント、GitHubリポジトリ、リリースノートを調べるだけなら、普通の検索で十分な場面が多いです。最初から複雑な仕組みにしない方が続きます。SNSの温度感は専用リサーチに分けるReddit、X、YouTube、TikTok、Hacker Newsなどを横断する `/last30days` 型の調査。こうした横断検索は、公式情報では見えない「現場の温度感」を取る時に効きます。Routines、Scheduled tasks、Grok、Obsidianで蓄積する毎日見るサイトはRoutinesやScheduled tasksで巡回し、Xのリアルタイム性はGrokで拾い、MarkdownでObsidianに保存します。Routinesは公式ドキュメント上でresearch previewとされているため、仕様変更を前提に扱います。最後にCLAUDE.mdやSkill GraphsからClaude Codeが読める状態にすると、「調べる、貯める、使う」のループになります。まずはこの順番で入れてください全部を一気に入れる必要はありません。順番を間違えないことが大事です。最初の1週間は、CLAUDE.md、Plan Mode、自己検証だけで十分です。ここで「毎回同じ説明をしなくていい」「テストまで自分で回す」状態を作ります。次の1週間で、Permissions、Hooks、Skillsを入れます。繰り返す作業、守らせたいルール、毎回使うチェックリストを外部化します。その次に、Subagents、worktree、`claude -p`、MCP、GitHub Actionsに広げます。ここからClaude Codeは単体ツールではなく、チームや業務プロセスに組み込む道具になります。最終的には、情報収集も同じです。検索して終わりではなく、蓄積して、次の投稿、次の記事、次の実装、次の研修に使える形にします。参考にした一次情報Anthropic / Claude Code Docs「Best Practices for Claude Code」https://code.claude.com/docs/en/best-practicesAnthropic / Claude Code Docs「How Claude remembers your project」https://code.claude.com/docs/en/memoryAnthropic / Claude Code Docs「Hooks reference」https://code.claude.com/docs/en/hooksAnthropic / Claude Code Docs「Connect Claude Code to tools via MCP」https://code.claude.com/docs/en/mcpAnthropic / Claude Code Docs「Claude Code GitHub Actions」https://code.claude.com/docs/en/github-actionsClaude Help Center「Claude Code power user tips」https://support.claude.com/en/articles/14554000-claude-code-power-user-tipsAnthropic / Claude Code Docs「Run prompts on a schedule」https://code.claude.com/docs/en/scheduled-tasksAnthropic / Claude Code Docs「Automate work with routines」https://code.claude.com/docs/en/web-scheduled-tasksX Help Center「About Grok」https://help.x.com/en/using-x/about-grokClaude Code 知らないと損する40のワザ先着100名限定ウェビナー 詳細はこちら↓⬇️ 1on1で密に教えて欲しい方はこちらがオススメです。【超初心者OK】Claude Code 個別サポート※早割先着10名様分は完売しました。⬇️ 法人研修をご希望の方はこちらClaude Code 法人研修 無料相談はこちらnoteメンバーシップに参加すると700本以上の記事が読み放題です。お問い合わせ・個別相談・法人研修のご依頼AI活用・キャリア戦略 個別相談書籍「AIでゼロからデザイン」好評発売中 #AI  #生成AI  #AIエージェント  #AI時代  #AI活用  #AI人材  #AI研修  #AIツール  #Claude  #ClaudeCode

---

## 8. [DESIGN.mdは「どんなサイトもスキャンして再構築できる」のか — advanced-design-mdによる既存3手段の検証と再設計](https://zenn.dev/marycache/articles/03011f881e36f7)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/7
- **AI要約**:
  AI用デザイン仕様書「DESIGN.md」の抽出と生成を統合するツールキットの設計・検証の記録。
  機械的観測、意味付け解釈、要求仕様の3層構造により、AIによる推測と事実の混同を防止する設計。
  Claude CodeスキルやPlaywrightを用いた実装コードと、MITライセンスのリポジトリを公開。
- **今読む理由**: AI駆動開発（Claude Code/Cursor等）におけるUI設計の揺れを抑えるための、具体的かつ即時導入可能なGitHubリポジトリと自動化パイプラインが提示されているため。事実と推測を分離する3層構造の設計は、プロンプトエンジニアリングの精度向上に直結する。
- **タグ**: #DESIGN.md, #Claude Code

### 本文
第0章 本記事が紹介する対象

 0.0 本記事を読むための前提知識
本記事は複数の読者層を想定している。
読み進めるうえで知っておくと理解が早まる用語を、最初に一覧化する。
「これは何だろう」と感じた用語があれば、対応する章に飛んで確認できるように設計した。
すべて理解してから読み進める必要はない。
必要に応じて参照する読み方を想定している。



用語
何を指すか(極めて簡潔に)
詳細を解説する場所




DESIGN.md
AIに渡すデザイン仕様書
第1章(成立経緯と仕様全体)


フロントエンド / UI / プロトタイプ
Webサイトやアプリの「見た目」に関する領域
第1章 §1.2


HTML / CSS / JavaScript
Webページを作るための3つの基本言語
第1章 §1.2


AIコーディングエージェント
自然言語の指示でコードを書くAI(Claude Code・Cursor・GitHub Copilot等)
第1章 §1.5.1


デザイントークン
色・フォント・余白といったデザインの構成値
第1章 §1.5.2


YAML / Markdown
機械にも人間にも読みやすい記述形式
第1章 §1.5.2


CLI(コマンドラインツール)
ターミナルから操作するソフトウェア
第1章 §1.6.1


オープンソース / MIT / Apache 2.0
ソフトウェアを共有する際のライセンス形式
第0章 §0.2、第1章 §1.6


Google Stitch / awesome-design-md / designmd.me
DESIGN.mdを扱う既存の3つの主要手段
第2章 §2.1〜§2.3


Playwright
実際のブラウザを自動操作する仕組み
第3章 §3.4.1


Node.js / npm
JavaScriptをブラウザ外で動かす環境
第0章 §0.4(シナリオA前提)


Claude Codeのスキル機構
プロジェクトに応じた手順をAIに学習させる仕組み
第0章 §0.3


VANILLA / INTERPRETED / DESIGN(三段階の文書)
本ツールキットが生成する3種類の文書
第0章 §0.3、第3章 §3.1


lexicon / patterns
DESIGN.md生成時に参照される辞書と経験則
第0章 §0.3、第3章 §3.2


[要確認] マーカー
文書内で「保留」を明示する記号
第0章 §0.3、第3章 §3.1



このリストは網羅的ではない。
読み始める時点で知っておくと迷わない最小限の用語である。
記事中で初めて使う技術用語は、本文内で都度補足することとする。

 0.1 本記事の構成と読み進め方
本記事は、AIに対してデザインを記述する仕様書「DESIGN.md」を、抽出と生成の両方向で扱うために私が構築・配布したツールキットについて論じるものである。
論述の縦軸として、本記事は次の流れを採る。
第1章で、DESIGN.mdを巡る世間の熱狂的言説を記録する。
第2章で、既存3手段の実態を検証して、その言説との距離を観察する。
第3章以降では、その距離を私自身の手で埋めようとした試みを論じる。
世間の熱狂が約束したものを、ある個人が部分的にせよ自身の手で実現しようとした応答として、本ツールキットを位置づけたい。
想定する読者は複数の層にわたる。


AIを用いてUIを構築している開発者および設計者。Claude CodeやCursorを日常的に利用し、生成結果のデザインが揺れることに課題感を持つ者。

フロントエンドへの関心はあるものの、初学者寄りの位置にある者。DESIGN.mdという語は認識しつつ、今後の導入を検討している者。

独自のツール・スキルを設計している、あるいは設計しようとしている技術者。他者の設計事例から自身のワークフローへの示唆を得ようとする者。

これら複数層の読者を同時に想定するため、技術用語は初出の箇所で、即座に括弧書きで補足することとする。
本記事の章構成は以下の通りである。


第0章(本章): 構築されたツールキットの全体像と利用方法 ― 結論および到達点の先行提示

第1章: DESIGN.mdという概念の成立経緯と、その技術的構造

第2章: 既存のDESIGN.md生成手段を、同一の実在サイトに対して適用した場合の比較検証

第3章以降: 本ツールキットの設計判断と、AI時代のデザイン記述における観測と推測の分離

初学者寄りの読者は、第1章から順に読み進めることで理解が容易になる。
DESIGN.mdの概念を既に把握している読者は、第2章から読み始めても論旨に支障はない。
リポジトリの中身から確認したい読者は、本章を読んだ後にGitHubを開き、必要に応じて他章に遡ることもできる。

 0.2 本記事が紹介する対象
本記事で紹介するのは、私がGitHub上で公開している以下のリポジトリである。
MaryCache/advanced-design-md

MITライセンスの下で公開しており、誰でもクローン・改変・利用が可能である。
MITライセンスとは、オープンソースソフトウェアで広く使われる緩いライセンス形式である。
著作権表示とライセンス条文を含めれば、商用・非商用を問わず自由に利用・改変・再配布できる。
日本語のREADMEに加え、英語版README、および「とりあえず動かしたい人向け」のQUICKSTARTを同梱している。
本リポジトリは、Claude Code(Anthropic社が提供するAIコーディングツール)向けの2つのスキルを組み合わせたツールキットとして設計されている。


design-extractor: 任意のURLからデザイン情報を抽出し、機械的観測と意味付け解釈を分離した形式で記録する

design-creator: 言語化されていない要望をクイズ形式で引き出し、構造化されたDESIGN.mdを生成する

要約すれば、「実在するサイトを観察してデザインを言語化する」方向と、「漠然とした要望をデザイン仕様に落とす」方向の、2つの異なる流れを同じ語彙体系の上で統合したツールキットである。
公式のGoogle Stitchや、既存のオープンソースリポジトリ(awesome-design-md等)とは異なる設計判断を複数含む。
相違点および設計判断の理由は、第2章以降で詳述する。
本章では、本リポジトリの内容と利用法の提示に限る。

 0.3 リポジトリの構成

 全体構造
advanced-design-md/
├── README.md ← 日本語版の主たる文書
├── README.en.md ← 英語版
├── QUICKSTART.md ← 簡易導入手順(日本語)
├── LICENSE ← MIT
├── settings.recommended.json ← Claude Code推奨権限
└── skills/
 ├── design-extractor/ ← URL → VANILLA.md / INTERPRETED.md
 │ ├── SKILL.md
 │ ├── package.json
 │ ├── scripts/fetch.js
 │ └── references/
 └── design-creator/ ← クイズ → DESIGN.md
 ├── SKILL.md
 ├── references/
 │ ├── question-bank.md ← 設問プール(20問・7層)
 │ ├── prompt-format.md ← 完了プロンプト仕様
 │ ├── extractor-handoff.md ← 補助抽出オファー手順
 │ ├── lexicon/ ← colors / typography / animations / parts辞書
 │ ├── patterns/ ← mood × use組み合わせ経験則
 │ ├── templates/ ← DESIGN.md空テンプレート
 │ └── samples/ ← 用途別サンプル
 └── assets/
 └── quiz.html ← 静的HTMLクイズ(JA/EN)

 2つのスキルと、その関係
本ツールキットの中核は、skills/ 配下に置かれた2つのClaude Codeスキルである。
Claude Codeにはスキル機構(プロジェクトに応じた処理手順をAIに学習させる仕組み)があり、本リポジトリの2スキルもその上に実装されている。
design-extractor(抽出側)は、対象サイトのURLを入力として、以下の3つを生成する。


raw/: Playwright(Microsoftが公開するブラウザ自動化ツール)で取得したDOM・CSS・JavaScript・挙動ログの生データ

VANILLA.md: サイトから機械的に観測された値のみを記述した記録層。推測・補完・創作は一切含まない

INTERPRETED.md: VANILLA.mdを唯一の入力として、各要素に名前・印象(tone)・機能(effect)などの意味付けを加えた解釈層

design-creator(生成側)は、ユーザーの要望をクイズで引き出し、以下を生成する。


quiz-{name}.html: 回答済みのクイズHTML(履歴・再編集用に保存される)

DESIGN.md: クイズ回答を元に、辞書(lexicon)と経験則(patterns)を参照して組み立てた仕様書

両スキルは独立して動作可能である。
ただし、design-creatorは特定条件下でdesign-extractorを呼び出す権限を持つ(後述のStep 9補助抽出オファー)。
これにより、辞書だけでは表現できない固有ブランドへの言及を、参照サイトの抽出により補完できる。
連携は creator → extractorの単方向である。
extractor側からcreatorを呼ぶ経路は存在しない。

 三段階の文書 ― VANILLA / INTERPRETED / DESIGN
本ツールキットは、目的の異なる3種類のMarkdown文書を生成する。
これが最も特徴的な設計判断である。



文書
生成元
役割
推測の許容




VANILLA.md
design-extractor
観測された事実のみを記述する
一切禁止


INTERPRETED.md
design-extractor
VANILLAを元にした意味付け・解釈
VANILLAに存在する範囲内のみ


DESIGN.md
design-creator
クイズ回答 + 辞書から組み立てた仕様書
辞書(lexicon)に存在する範囲内のみ



3種類とも以下の同じセクション構成を持つ。
## {先頭セクション} ← Meta(VANILLA/INTERPRETED) または Intent(DESIGN)
## Colors
## Typography
## Spacing
## Components
## Animations
## Constraints
先頭セクションのみが文書ごとに異なる。
VANILLA.mdとINTERPRETED.mdの先頭は ## Meta(取得元URL・抽出日)、DESIGN.mdの先頭は ## Intent(用途・ターゲット・第一印象軸など)となる。
これにより、後段の実装フェーズで3種類の文書を統一的に扱える。
なぜこの3層構造を採るのか。
既存のDESIGN.md生成手段の多くが、観測された事実とAIによる推測を文中で混在させて記述しているためである。
この混在は、AIへの引き渡し時に重大な問題を生む。
詳細は第2章および第3章で論じる。

 lexicon と patterns の役割
design-creatorは、辞書(lexicon)と経験則(patterns) という2種類の参照データに依拠する。
これはAIがDESIGN.mdを「自由に書く」のではなく、事前に定義された語彙の中から選ぶようにするための装置である。



種別
パス
役割




lexicon
references/lexicon/{colors,typography,animations,parts}.md

何が使用可能かを定義する辞書


patterns
references/patterns/{color-combos,animation-recipes,component-defaults}.md

何と何が併用されやすいかの経験則



DESIGN.mdには、lexiconに存在する語彙のみが記録される。
利用者の自由入力でlexiconに該当しない語(例えば「Apple風」)は、原文のまま [要確認] というマーカーとして保持される。
これにより、「lexicon由来の選定」と「利用者独自の要望」が視覚的に区別され、実装フェーズで追加指示が必要な箇所が明示される。

 [要確認] というマーカー
DESIGN.md / VANILLA.md / INTERPRETED.mdには、しばしば [要確認] という記号が現れる。
これは「不具合」や「欠落」ではなく、保留の明示である。
具体的には、以下のいずれかを示す。

観測または辞書に該当値が存在せず、AIが選定を保留した
ユーザーの自由入力が原文のまま保持され、後段で人間判断を要する
volume(後述)制約により設問が出題されず、値を確定できなかった

この記号があることで、実装フェーズの担当者は追加指示が必要な箇所を即座に把握できる。
「AIが知らないことを知らないと言える」設計が、本ツールキットの中核的な思想の一つである。

 0.4 利用方法 ― 2つのシナリオ
本リポジトリの利用方法は、目的に応じて2通りに分かれる。
両者は独立して使用できる。

「他サイトの設計手法を観測したい」「自身が手本としたいサイトをDESIGN.md化したい」という読者を対象とする。
前提: Claude Codeが導入済みであること。Node.js 18以上が使用可能であること。
手順(対話の流れ):
ユーザー: このサイトを抽出してくださいhttps://www.apple.com
Claude: 保存フォルダ名(スラグ)を指定してください。
 例: apple-home / google-store / microsoft-corp
ユーザー: apple-home
Claude: → fetch.jsによりDOM / CSS / JSを取得
 → VANILLA.mdを生成(生抽出・推測補完なし)
 → INTERPRETED.mdを生成(VANILLAを意味付け解釈)
 → meta.yamlを生成
 ✓ 保存先: ~/my-design-library/sites/apple-home/
生成される成果物の構成:
<output-base>/apple-home/
├── raw/ # fetch結果(dom.html, styles/, scripts/, behavior-log.json)
├── VANILLA.md # 生抽出
├── INTERPRETED.md # 意味付け解釈
└── meta.yaml # 取得元URL、タグ、メモ
スキルの内部処理は第3章で詳述する。
要点を示せば、「動的レンダリング後のHTML/CSS/JSを取得」し、「アニメーションライブラリをJavaScript本体の署名から判定」し、「Claudeが自然言語として整形」するという3段構成である。

 シナリオ B: ヒアリングによる新規仕様生成(design-creator)
「クライアントの曖昧な要望を仕様書に落としたい」「新規プロダクトのデザインシステムを起こしたい」という読者を対象とする。
手順(対話の流れ):
ユーザー: コーポレートサイトのデザインを検討したい
Claude: ボリュームを選択してください。
 - quick (5問・5分) → [要確認] が約50% 残存する想定
 - standard (10問・10分) → [要確認] 30% 以下
 - deep (20問・20分) → [要確認] 20% 以下
ユーザー: standard
Claude: → quiz-corporate-modern.htmlをlocalhostで配信
 → ブラウザで開き設問に回答してください
 → 回答完了後、出力プロンプトを貼り付けてください
ユーザーはブラウザでクイズに回答し、完了ボタンで生成された自然文プロンプトをClaudeに貼り付ける。
Claudeは以下を実行する。
Claude: → 回答プロンプトをパース
 → lexiconと照合(colors / typography / animations / parts)
 → patternsを参照(mood × useの組み合わせ経験則)
 → DESIGN.mdを生成
 ✓ 保存先: ~/.claude/outbox/DESIGN-corporate-modern.md

 クイズの構造 ― 7レイヤー × 20設問
design-creatorのクイズは、7レイヤー × 20設問の固定プールから、選択したvolumeに応じて出題される。



layer
主目的
設問数
DESIGN.mdへの反映先




intent
用途・第一印象軸・差別化軸
4

## Intent セクション全項目


mood
明度・温度・エネルギー・形式感
4
Mood・Constraintsの派生


visual
配色戦略・アクセント戦略・質感
3

## Colors パレット選定


typography
Serif/Sans比率・日本語系統
2

## Typography テーブル


motion
テンポ・キャラクター・採用ライブラリ
3
## Animations


component
レイアウト型・必要パーツ群
2

## Components 構成


technical
デバイス優先度・外部依存許容度
2

## Constraints 制約条項



クイズには重要な設計判断が組み込まれている。
完了プロンプトには、選択されなかった選択肢も含めて全項目が記録される。
これによりClaudeは、「ユーザーがlightとの比較の上でdarkを選択した」といった排除された方向性を推論材料として活用できる。

 補助抽出オファー(Step 9 Handoff)
クイズの自由入力に「Apple風」「ある特定のゲームのような」など固有名詞や辞書外の語が含まれる場合、Claudeは次のような提案を行う。
「Apple風」のニュアンスはlexiconのみでは表現が困難です。
参照可能なサイトURLがあれば抽出を実行可能ですが、いかがいたしますか? (yes / no)
yes と回答すると、design-creatorは背後でdesign-extractorを呼び出す。
抽出結果(INTERPRETED.md)は辞書と同格に扱われ、DESIGN.md生成へ反映される。採用された値には <!-- source: extracted from {slug}/INTERPRETED.md --> というコメントが必ず付される。
後の監査時に「lexicon由来か、抽出由来か」を識別できるようにするためである。
これにより、シナリオA(抽出)とシナリオB(生成)が機能的に統合される。
要望を出発点とし、必要に応じて参照サイトを観測し、結果を生成に反映する流れが、ユーザーの判断を介在させながら成立する。

 DESIGN.md の実装フェーズへの引き継ぎ
仕様書を起点とした実装には、複数の選択肢がある。
本ツールキットは、実装そのものは担わない設計である。



方法
概要




手動実装
DESIGN.mdを仕様書として参照し、HTML / CSS / Tailwind等を直接実装


自作スキル
DESIGN.mdを読み込みモックHTMLを生成するClaude Codeスキルを構築


他AIツール
DESIGN.mdをv0 / Lovable / Cursor等に投入し初稿を生成



3種類の文書(VANILLA / INTERPRETED / DESIGN)は同系統のセクション構成を採用しているため、実装側はいずれの文書も統一的に扱える。

 0.5 本章のまとめ
本章では、advanced-design-mdの全体像 ―

2つのClaude Codeスキル(design-extractor / design-creator)
3種類の文書(VANILLA.md / INTERPRETED.md / DESIGN.md)による三段階の構造
辞書(lexicon)と経験則(patterns)による語彙制約

[要確認] マーカーによる保留の明示
7レイヤー × 20設問のクイズと、選ばれなかった選択肢の保持
Step 9による2スキルの単方向連携

および、2通りの利用シナリオを提示した。
シナリオAは「実在するサイトを観測して言語化する」流れである。
シナリオBは「漠然とした要望を構造化する」流れである。
両者は独立して使用できる一方、Step 9の補助抽出オファーを通じて統合的にも機能する。
次章以降は、この形態を採った経緯を遡る。
第1章では、DESIGN.mdという概念の成立史と、公式仕様の構造を整理する。
第2章では、既存のDESIGN.md生成手段を実在サイトにおいて検証する。
第3章以降で、本ツールキットの設計判断 ― 観測と推測の分離、辞書による語彙制約、保留の明示 ― を論じる。
読み進めるにつれ、本稿の論述対象は段階的に拡張される。
単なるツール紹介から、AI時代のデザイン記述という新たな領域における設計問題へと、論じる対象が広がっていく構造を採っている。
章を選択的に参照する読み方にも、順次読み進める読み方にも対応する設計である。


 第1章 DESIGN.mdの誕生と意義

 1.1 要約 ― DESIGN.mdとは何か
DESIGN.mdとは、ある製品やブランドのデザインシステム ― 色・タイポグラフィ・余白・コンポーネントの形 ― を、AIが読みやすい一つのテキストファイルにまとめたものを指す。
プロジェクトのフォルダにこのファイルが置かれていると、AIコーディングエージェントはセッションごとに「このサービスはどんな見た目を持つべきか」を毎回説明されなくても、自律的にブランドに沿ったUIを組み立てられるようになる。
人間の開発者にとってのREADMEが「このプロジェクトは何で、どう動かすか」を伝える文書であるならば、DESIGN.mdはそれと同じ位置づけを、デザインのために用意するものである。
「このブランドはどのような見た目を持ち、なぜそうなのか」をAIに伝える規範的な文書として機能する。
Claude Code・Cursor・GitHub Copilotをはじめとする任意のAIコーディングエージェント(自然言語の指示を受けてコードを書くAI)が、セッションを跨いで一貫した設計システムの理解を保持できるようにすること ― これが目的である。
DESIGN.mdという考え方は2026年3月、Google Labsが公開している実験的AIデザインツール Stitch の大型アップデートにおいて、その内部機能として最初に導入された。
本章では、StitchのローンチからDESIGN.md提唱に至る経緯を確認する。
その後に2026年4月21日のオープンソース化を経て現在に至るまでの流れを整理する。

 1.2 前史 ― Stitchという実験の素地
DESIGN.mdの導入を理解するには、その器となったStitchの前史を辿る必要がある。
Stitchは2025年5月20日、Google I/O 2025で発表された実験的なAIデザインツールである。
Google Labsが運用する実験プロダクトとして、自然言語の指示や画像からWeb・モバイルアプリのUIモックアップを生成し、生成された画面のHTML・CSS・Figma互換コードを書き出せるという、当時としては野心的なツールであった。
基盤モデルにはGemini 2.5 Proが用いられ、ベータ版として一般公開された。
ローンチ時点のStitchには、後にDESIGN.mdとして結実するものは存在しない。
あくまで「自然言語と画像からUIを作る」ツールとして、FigmaやGalileo AIの文脈に位置づけられる。
生成されるのは個別の画面とそのコードであり、ブランド全体の設計システムを記述する仕組みは備わっていなかった。
この時期、Stitchは 「言葉からUIを作る」最初の試行 として注目を集めつつも、生成結果の一貫性 ― 例えば連続して生成した画面の間で色味が微妙に揺れる、フォントサイズが画面ごとに変わる、ボタンの形が安定しない ― という課題を抱えていた。
これはStitchだけの問題ではなく、AIによるUI生成全般に共通する課題であった。
この課題への一つの回答が、後のDESIGN.mdである。

 1.3 2026年3月のStitch大型アップデートとDESIGN.mdの導入
2026年3月19日、Stitchは大規模なアップデートを受けた。
このアップデートはStitchを単一画面の生成ツールから、Google自身が「AIネイティブなソフトウェアデザインキャンバス」と呼ぶ統合作業空間へと変えた。
主な追加機能は以下の通り。
(1) 無限キャンバス: アイデアの発想から動くプロトタイプまでを、一つの広い空間で発散できるAI向けキャンバス。
テキスト・画像・コードを同じ空間に並べて参考資料として扱える。
(2) Vibe Design(バイブデザイン): ワイヤーフレーム(画面構造の下書き)から始めるのではなく、ビジネス目的・ユーザに感じてほしい雰囲気・現在のインスピレーションを説明するところからデザインを開始できる対話的なモード。
(3) デザインエージェント: プロジェクト全体の進化を跨いで考えられるAIアシスタント。
制作開始から完了までを伴走する。
(4) 最大5画面の同時生成とユーザジャーニー地図化: 相互に接続された複数画面を同時に生成し、画面間の遷移を自動的に地図化する。
「Play」ボタンで即座に動作確認できる。
(5) 音声対話: Gemini Live(リアルタイム会話型AI)を基盤とする音声対話機能。
キャンバスに向かって話しかけるとデザイン批評が返ってきたり、「3種類のメニュー案を出して」「この画面を別のカラーパレットで見せて」といった指示でリアルタイムに更新できる。
(6) 任意URLからのデザインシステム抽出: 既存WebサイトのURLを入力すると、その色・タイポグラフィ・レイアウトを解析する。
(7) MCPサーバとSDK: Cursor・Antigravity・Gemini CLIなどの外部AIツールからStitchの機能を呼び出せるようにする仕組み。
MCP(Model Context Protocol)とはAIと外部ツールをつなぐための共通プロトコルである。
(8) 7種のフレームワークへのコード出力: HTML/CSS, Tailwind, Vue.js, Angular, Flutter, SwiftUI等、実運用で使われる主要な実装方式にそのまま移行できるコードを出力する。
そしてこの2026年3月のアップデートで、DESIGN.mdはStitchの一機能として初めて導入された。
Googleの公式ブログはその目的をこう説明している。

デザインツールキットを、より深い文脈を持った制作を可能にするように拡張した。
任意のURLからデザインシステムを抽出できるようになり、あるいは新しいDESIGN.md― エージェント(AI)向けのMarkdownファイル ― を使って、他のデザインツールやコーディングツールへ/からデザインルールをエクスポート(書き出し)・インポート(読み込み)できるようになった。

ここで注目すべきは、DESIGN.mdが次の二つの役割を同時に担っていた点である。


他ツールへの書き出し形式(export): Stitch内で作ったデザインを、Claude CodeやCursorなどの外部AIコーディングツールに渡すための中間の形式。

他ツールからの取り込み形式(import): 外部で書かれたデザインをStitchプロジェクトに適用する入力の形式。

この双方向性は、DESIGN.mdが最初から「Stitch単体で閉じないこと」を意図していたことを示す。
そしてこの3月の時点で、生成されたDESIGN.mdはStitchのUI上で閲覧でき、ファイルとして取得・コピーすることができた。
Stitchを使えば誰でも、自分のプロジェクトのDESIGN.mdを手元に持ち帰り、Claude CodeやCursorに渡すことができた。
ただし、後述する4月21日のオープンソース化までの間は、正式な仕様書(spec)は公開されていなかった。
書式の構造を理解するには、Stitchが生成する出力例を観察し、そこから書式を逆算する必要があった。
検証手段(後述の lint のような機械的チェック)も存在しなかった。
Stitchの現在の提供条件を記録として付記する。
2026年4月時点でGoogle Labsの実験として無料で提供されており、標準モード(Gemini 3.0 FlashまたはGemini 2.5 Flash)で月350回、実験モード(Gemini 3.0 ProまたはGemini 2.5 Pro)で月200回の生成が可能である。
ただしLabs実験としての性質上、長期的な提供や価格体系は保証されていない。

 1.4 オープンソース化以前から始まっていた動き
§1.3の末尾に記したコピペ可能性 ― これが本記事の論述において重要な意味を持つ。
DESIGN.mdは2026年4月21日のオープンソース化を待たずに、既に外部世界で動き始めていた。
本節ではその動きを整理する。

 1.4.1 Stitchを経由しない手書きの可能性
DESIGN.mdはYAML(機械が読みやすい、キーと値のペアで書くシンプルな記法)とMarkdownという汎用的な形式で構成されている。
特殊なバイナリ形式ではなく、テキストエディタで開ける一般的なファイルだった。
この性質により、Stitchが出力したDESIGN.mdを観察すれば、書式の構造は人間にも把握できた。
つまり理屈の上では、Stitchの出力例を参考に、誰でも自分のテキストエディタを開いてDESIGN.mdを手書きすることが可能だった。
「うちのブランドは深い紺色(#0A1A3F)を基調とする。
理由は信頼感と静けさを表現するため」と書き、それをプロジェクトのフォルダに置いてClaude Codeに渡す ― これだけで、実質的なDESIGN.mdとして機能した。
Stitchを経由する必要はなかった。

 1.4.2 派生ツール・キュレーションの先行
この自由度を活用して、オープンソース化以前から複数の動きが進んでいた。
designmd.me のような外部Webツールは、ユーザがフォームに入力した情報からDESIGN.mdを生成するサービスとして、独自に展開していた。
Stitchとは無関係に動作し、自前の解釈でDESIGN.mdを組み立てていた。
本記事では第2章でこの実装の精度を検証する。
awesome-design-md リポジトリは、Apple・Stripe・Linearなど著名ブランドのデザインをDESIGN.md化したサンプル集として、コミュニティ主導でキュレーションされていた。
これもStitchを介さず、人間の手作業による解釈で書かれたファイルの集積であった。
そして筆者(私)自身の advanced-design-md ツールキット ― 本記事が紹介する対象 ― も、オープンソース化以前から開発を進めていた。
Stitch出力の構造を観察し、独自に拡張(特に動きを記述するAnimationsセクションの追加)を施したDESIGN.mdを生成・抽出するためのスキル群として組み上げていた。

 1.4.3 既に開かれていたもの、まだ開かれていなかったもの
以上から分かるのは、「考え方」と「読める形」は元々開かれていた ということである。
コピペで取得できる以上、書式を観察することは誰にでもできた。
それを真似て手書きすることも、独自に拡張することも、別の生成ツールを作ることも、原理的には可能だった。
一方で、まだ開かれていなかったもの もある。


正式な仕様書(spec) ―Stitch出力例から逆算するしかなく、ブレが残った

書式準拠を機械的に検証する手段 ― 人間の目視に頼るしかなかった

ライセンスの法的な明確さ ―Stitch出力を改変・再配布する際の権利関係が曖昧だった

Apache 2.0のような外部貢献を受け入れる枠組み ― 仕様の進化に外部から関与する経路がなかった

オープンソース化はこの「まだ開かれていなかったもの」を解放する転換点であった。
次節以降では、まずオープンソース化を待たずに既に動いていたDESIGN.mdの本質を整理し(§1.5)、その上で4月21日のオープンソース化が 何を新たに加えたか を確認する(§1.6)。

 1.5 DESIGN.mdの本質 ― 仕様書という「考え方」と、その一つの書き方
§1.4で確認した通り、DESIGN.mdはStitchという器の中から生まれたが、その器に閉じ込められていなかった。
本節では、本仕様について一つの大事な区別を立てておきたい。

 1.5.1 「AIに渡すデザイン仕様書」という考え方
Webサイトやアプリの「フロントエンド」とは、ユーザの目に触れる部分 ― 色・文字・レイアウト・ボタンの形など、画面上で見えるすべての要素 ― を指す。
従来、デザイナーがフロントエンドの仕様を伝える手段は、Figmaなどのデザインツールで作ったビジュアルのモックアップや、色のコードやフォントサイズをまとめた説明書(スタイルガイド)であった。
これらは主に 人間の開発者 に向けて書かれていた。
しかし生成AIがコードを書く時代に入ると、新たな読み手が現れた。
Claude Code、Cursor、GitHub Copilotのような AIコーディングエージェント である。
これらは文章の指示からコードを生成するが、ブランドの色やフォントといったデザイン固有の情報をセッションごとに繰り返し指示しなければならず、一貫性を保つのが難しかった。
「ダッシュボードを私のブランドカラーで作って」と指示しても、汎用的な青いボタンが並んだ出力が返ってくる。
手で修正し、もう一度指示し直し、次のコンポーネントでは違う見た目が出てくる ― そういう反復が当たり前になっていた。
「AIが読める、言葉で書かれたデザイン仕様書」というアイデア自体は、ここでひとつの独立した考え方として成立する。
特定のツールに依存しない。
特定の書き方に縛られない。
本質は次の一点に尽きる ― 色やフォントといった機械が読める値と、その値が存在する理由の自然な説明を、AIが読める形でひとつの文書にまとめること。

 1.5.2 Stitchが実演したのは「具体的な一つの書き方」
ではGoogle Stitchが2026年3月に導入した「DESIGN.md機能」は何をしたのか。
Stitchがしたのは、この抽象的な考え方を、具体的で真似しやすい書式として実演したこと である。
Stitchが生成するDESIGN.mdは「これだけの細かさで、これだけ構造化すれば、AIはここまでデザインを一貫して作れる」という参考の型を提示するものであった。
具体的には次のような構造である。

ファイルの冒頭に、色・タイポグラフィ・余白といった値(これをデザイントークンと呼ぶ)をYAML形式で並べる
その後に続く本文で、「なぜその値なのか」を自然な言葉で記述する

{colors.primary} のような記法で、値と値のつながりを明示する(たとえばボタンの背景色はこの色を使う、と指定する)
決まった8つのセクション(Overview/Colors/Typography/Layout/Elevation & Depth/Shapes/Components/Do's and Don'ts)を、決まった順番で並べる

これらは 考え方として必須というわけではなく、Stitchが選んだ一つの設計判断 である。
YAMLという書式でなくても考え方は成立する。
8セクションでなくても成立する。
Stitchはあくまで「こう書けば十分に機能する」という一つのお手本を世に出したのである。
そして§1.4で確認した通り、この実演はStitch出力のコピペを通じて広く参照可能だった。
書式は誰でも観察でき、誰でも真似でき、誰でも拡張できた。
awesome-design-md・designmd.meなどの動きは、まさにこの参照可能性の上で進んでいた。

 1.5.3 公式準拠と独自拡張の二択
この区別は、実用上の選択肢に直結する。
利用者は次のどちらの立場も取れる。
(A) 公式の書き方に従う: Stitch由来の書式で書き、互換エージェントとの相互運用性(違うツール同士でも同じファイルを読めて、同じように解釈される性質)を最大化する。
OpenAPIがREST API(サーバとやり取りするための共通ルールを記述する標準)に対して果たしたような「業界標準」としてのDESIGN.mdに乗る道である。
(B) 考え方だけ引き継ぎ、独自の書き方を採る: AIに渡すデザイン仕様書という思想は共有しつつ、記述形式を自分の使い方(例: アニメーションや状態変化をもっと細かく書きたい)に合わせて拡張する。
公式書式との完全な互換性は部分的に犠牲になるが、表現の自由度は高い。
どちらも正当な選択肢である。
advanced-design-mdは(B)の立場をとり、特に「動きを記述する領域」の不足を独自拡張で埋めている(これは第3章で詳述する)。

 1.6 2026年4月21日 ― 慣習から契約書へ
Stitchの内部機能としてDESIGN.mdが導入されてからおよそ一ヶ月後、2026年4月21日に重要な節目が訪れる。
Google Labsはこの日、DESIGN.mdのドラフト仕様をGitHubリポジトリ google-labs-code/design.md 上で Apache 2.0ライセンス の下に公開した。
§1.4で整理した通り、DESIGN.mdはオープンソース化以前から「コピペで取得でき」「手書きで書ける」状態にあった。
本節では、その上で4月21日のオープンソース化が 何を新たに加えたか を整理する。

 1.6.1 オープンソース化「以後」に追加されたもの
公開されたGitHubリポジトリには、以下が含まれている。
(1) 正式仕様書 docs/spec.md ― これまでStitch出力例から逆算するしかなかった書式が、Google Labs自身による正式な記述として公開された。
トークンスキーマ・参照記法・必須セクションの構造が、正規の参照点を持つようになった。
(2) CLIツール @google/design.md(初版0.1.1) ―DESIGN.mdを機械的に検証・変換するためのコマンド群が、npmパッケージとして公開された。
主なサブコマンドは以下の通り。


lint: 仕様への準拠を検証し、トークン参照の不整合・WCAGコントラスト比違反・循環参照などを構造化されたJSONで報告する

diff: 二つのバージョンのDESIGN.mdを比較し、トークンレベルの追加・削除・変更と本文の回帰を検出する

export: DESIGN.mdのトークンをTailwind CSSテーマやW3C DTCG(Design Tokens Community Group)形式に書き出す

spec: 仕様書本体をAIプロンプトに注入する用途のために出力する

(3) Apache 2.0ライセンス ― 派生物の再配布・改変が法的に明確化された。
それまでStitch出力をどこまで改変・再配布できるかは曖昧であったが、Apache 2.0の下では特許条項(特許侵害訴訟からの保護)も含めて企業利用での安心感が担保される。
(4) stitch-skills リポジトリの同時公開 ―Claude Code・Cursor・Antigravity・Gemini CLIなど各種AIコーディングエージェントから利用可能な「Agent Skills」のライブラリが、別リポジトリとして公開された。
design-md スキルはStitch MCPサーバを経由してプロジェクトの画面・HTML・メタデータを取得し、DESIGN.mdを生成する。
(5) 正式バージョニング(alpha 0.1.1) ― 仕様の進化を追跡できるバージョン番号が付与された。
alpha段階であり「仕様変更を予期せよ」と明記されているが、互換性議論ができる土台が整った。

 1.6.2 「ゼロからの解放」ではなく「既に進行していた動きへの正式な合流地点」
これらが追加されたことの意味は、しばしば「StitchからDESIGN.mdが解き放たれた」という言い方で表現される。
例えばawesomeagents.aiの評論記事は、本オープンソース化を「Stitchという内部慣習(internal Stitch convention)を、ブランドとAIエージェントの間の、持ち運び可能な契約書(portable contract)に変えた」と表現している。
慣習から契約書へ ― この比喩は実態を的確に捉えている。
ただしここで、§1.4で整理した文脈を改めて重ねる必要がある。
Stitch出力をコピペで取得できた以上、「使えること」は元々開かれていた。
awesome-design-md・designmd.me・本記事が紹介するadvanced-design-mdは、いずれもオープンソース化を待たずに動いていた。
これらはコピペ可能性の上で、それぞれ独自の解釈・拡張・キュレーションを進めていた。
オープンソース化が解放したのは、「使えること」ではなく「正式な参照点を共有できること」 である。
これまで個別に進んでいた動きが、共通の仕様書・共通の検証ツール・共通のライセンス的安心感の下に合流できる土台が、4月21日に用意された。
つまりオープンソース化は ゼロからの解放ではなく、既に進行していた動きへの正式な合流地点 として位置づけるのが、より正確な理解である。

 1.6.3 公開後の反応
リポジトリは公開直後から急速な注目を集めた。
本章執筆時点(2026年4月24日)で既にスター数(GitHub上でのブックマーク相当)6,200超、フォーク(複製して自分の改変版を作った件数)600超を記録している。
awesomeagents.aiの評論は「公開から72時間で5,200スター、awesome-design-mdは64,000スターを突破」と報じている。
GitHub Topicsの design-md タグには、Chrome/Firefox/Edgeの各ブラウザ拡張、独自のCLI、著名サイトから抽出したDESIGN.mdの集積リポジトリなどが、短期間のうちに積み上がりつつある。
Anthropicの公式skillsリポジトリでも、frontend-designスキルへのDESIGN.md統合提案が議論されている。
「設計システムの記述をAIに渡すための共通の書き方」という問題設定は、もはやGoogle単独の構想ではない。

 1.7 提唱以降の熱狂 ― X(Twitter)で交わされた期待
DESIGN.md― とくにawesome-design-mdと4月21日のオープンソース化を巡る ― 反響は、X(Twitter)上で2026年3月下旬から急速に拡大した。
本節では、その熱狂を当時の発言として記録に残す。
本章執筆時点で本仕様の登場から1ヶ月強しか経過していないが、その短い期間に交わされた言説の温度は、本論の後段(第2章)で示す実態とのコントラストにおいて意味を持つ。
X上での代表的な発言を引用形式で示す。

awesome-design-mdというGitHubリポジトリを発見した。
Apple、Stripe、Linearといった有名ブランドのDESIGN.mdがそのまま入っている。
これは公式じゃないけど、信じられない。
誰でも一流ブランドの設計システムを自分のプロジェクトに引き込める時代になった。


DESIGN.mdをCursorに放り込んでみたら、最初の30秒でブランドそのまま色味で何もかも返してきた。
これが当たり前になったらフロントエンドの初稿はもう手作業で書く時代じゃない。


面白いのは、これがコードじゃなくてMarkdownだってこと。
誰でも書ける。
デザイナーが直接AIに向かって書ける。
GitHubにコミットして、PRでレビューして、AIに消費させる。
設計システムがGitで動く時代が来た。


AppleのDESIGN.mdがあるってことは、どんなウェブサイトでもスキャンして瞬時に再構築できるってことだ。
これ、世界が変わるよ。
5分で終わる。

これら4本以外にも、awesome-design-mdリポジトリの存在とDESIGN.mdのオープンソース化を結びつけて「プロのデザインシステムを誰もが手元に取り込める」「大手企業の参入障壁が取り払われた」と表現する投稿が相次いだ。
投稿には数万から100万を超える表示数が付き、「誰でもプロデザイナーになれる」という期待が広く共有された。
これらの発言の背景には、AIコーディングエージェントを用いた開発における実感のある問題がある。
すなわち「AIにUIを作らせると毎回デザインが揺れる」「色が微妙に違う、フォントサイズが統一されない、ボタンの形が毎回変わる」という一貫性の崩壊だ。
DESIGN.mdはまさにこの問題への回答として提示された。
AIが毎回このファイルを読んでからコードを書くから、ブランドの一貫性が自動で保たれる ― これがDESIGN.md推進の基本線である。
さらにawesome-design-mdリポジトリの存在と4月21日のオープンソース化は、この基本線にもうひとつの魅力を加えた。
AppleやStripeやLinearのような世界的ブランドのデザインシステムが、無料で、マークダウンファイル一つで、手元のプロジェクトに引き込める ― 書くことすら必要ない。
この「すでに書かれたもの」を使える手軽さが、開発者とデザイナーの双方に対して強いメッセージを放った。
DESIGN.mdという考え方の成立から、Stitchによるひとつの具体化、3月の大型アップデートでの導入、それと並行して進んでいた外部の動き(awesome-design-md / designmd.me / 個人プロジェクトの派生)、そして4月21日のオープンソース化による合流まで ― 本章ではこの一連の経緯を時系列で追った。
オープンソース化は熱狂の開始点ではなく、既に進行していた動きが共通の参照点の下に合流した一つの節目 として位置づけられる。
次章では、この熱狂の実態を検証する。
「どんなウェブサイトでも瞬時にDESIGN.md化できる」と語られた手段が、具体的に何を生み出すのか。
オープンソース化以前から動いていた既存3手段(Google Stitch・designmd.me・awesome-design-md)を同じ実在サイトに対して適用し、その出力を観察する。


 第2章 既存のDESIGN.md生成手段の実態検証

 2.0 検証の方法
第1章で述べた通り、DESIGN.mdへの熱狂は2026年3月のStitch提唱以降すでにX(Twitter)上で広がっており、その言説は「どんなウェブサイトでもスキャンして、デザインシステムを瞬時に再構築できる」という趣旨を含んでいた。
4月21日のオープンソース化は、この既に進行していた動きが共通の参照点の下に合流した節目であり、熱狂そのものはそれ以前から継続していた。
本章はこの言説に対する実態調査として、同一の実在サイトを対象に、既存のDESIGN.md生成手段3つを適用し、出力を比較する。
比較を行うためには、まず比較基準そのものを定める必要がある。
本節ではこの基準について述べる。

 2.0.1 比較基準 ― VANILLA.mdとは何か
本章における比較の参照軸は、本ツールキットが独自に定義する VANILLA.md である。
VANILLA.mdとは、対象サイトから観測された事実のみを記述し、推測・補完・創作を一切含めない記録層である。
第0章で予告した二段モデル(VANILLA / INTERPRETED)のうち、観測のみを担う層に位置する。
本章で比較の基準として用いるため、最低限の仕様を先に示す。
生成方法:


Playwright(Microsoftが公開するブラウザ自動化ツール。ChromeやFirefoxを自動操作できる)により、対象URLを実際のブラウザで読み込む
JavaScriptによって動的に生成された後のHTML・CSS・JavaScriptを全て取得する
アニメーションライブラリはURLの文字列判定ではなく、JavaScript本体のコード内容(メソッド呼び出し等の署名)から識別する
取得した全資源をClaudeが読み込み、観測された値のみを整形して記述する

Chromeがサイトによってブロックされる場合、Firefoxに自動で切り替えて再取得する

記述上の原則:

観測された事実のみを記述する。「このサイトにありそうな一般的な値」は記述しない
観測できなかった項目は、空欄にせず [未取得] と明記する
取得できなかった理由が判明している場合は [未取得: requires_scroll](スクロール前で未発火)、[未取得: lazy_loaded](遅延読み込みで初期DOMに未存在)のように理由を付記する
JavaScriptで動的に値が変更される要素は [動的: JS制御] と明示する

この原則は、VANILLA.mdが**「記述されていないことを記述する」能力を持つ**ことを意味する。
「知らないことを黙って補完する」ことを構造的に禁止しているため、観測の限界がそのまま記録される。
本章における用途:
本検証では、私自身がdesign-extractorを実行して取得した複数のサイトのVANILLA.mdを比較基準として用いる。
これらは対象サイトから直接観測された事実の集積である。
本章では、既存の3手段の出力をこのVANILLA.mdと照合し、出力内の各記述が観測事実と一致するか、推測・創作によるものかを判定する。
VANILLA.md自体の設計思想 ― なぜ観測と推測を分離するか、二段モデルにおいてVANILLAを観測専用の層に置く意義は何か ― は、第3章で論じる。
本章では比較基準としての機能に限って使用することとする。

 2.0.2 検証対象の3手段
検証対象とする手段は以下の3つである。


Google Stitch: 2026年3月の大型アップデートで導入された、DESIGN.md規格の提唱者であるGoogle自身のツール。URLを与えるとDESIGN.mdを自動生成する

designmd.me: 第三者(Crowdlinker社)が公開する、任意のURLからDESIGN.mdを生成するWebアプリケーション

awesome-design-md: VoltAgent社が運営する、大企業の公開サイトを手動で抽出したDESIGN.mdのキュレーション型リポジトリ。利用者自身は抽出せず、収録済みのファイルを利用する


 2.0.3 判定基準と公平性
本章では、公平性のため次の原則を守る。


対象サイトは固定: 原則として「魔法使いの約束1st Anniversary」(mahoyaku.com/1st/)を使用する。ただしawesome-design-mdは国内サイトを収録していないため、その比較には「linear.app)を使用する

VANILLA.mdと照合する: 各出力の色値・タイポグラフィ・コンポーネント仕様等が、VANILLA.mdに記録された観測値と一致するかを判定する

解釈の妥当性ではなく、観測された事実との一致度を判定基準とする。例えば「deep navyという印象」の妥当性は問わず、出力された具体値(例: #05101A)がVANILLA.md記載値(例: #07161f)と一致するかを問う

以降、各手段の出力を個別に検討する。


 2.1 Google Stitch ― 題材の先入観が創作を誘発する

 2.1.1 出力の概観
Google Stitchにmahoyaku-1stのURLを与えた結果、生成されたDESIGN.mdは約40行であった。
公式仕様が規定する8セクション(Overview / Colors / Typography / Layout / Elevation & Depth / Shapes / Components / Do's and Don'ts)のうち、実際に埋められたのは6セクションにとどまった。
# Design System: Promise of Wizard 1st Anniversary (Mahoyaku)
## Brand Personality
- Mystical & Magical
- Elegant & Sophisticated
- Celebratory
- Celestial
## Color Palette
### Primary Colors
- Midnight Navy (#05101A)
- Radiant Gold (#D4AF37)
- Starry White (#FDFDFD)
### Secondary Colors
- Celestial Blue (#1A3A5A)
- Sunlight Amber (#FFD700)
## Typography
### Headings
- Primary: Cormorant Garamond または Cinzel
- Secondary: Playfair Display または Montserrat
### Body
- Noto Sans JP または Inter
...

 2.1.2 VANILLA.mdとの照合
mahoyaku-1stのVANILLA.mdに記録された色は、次の3値のみである。
#07161f (body 背景・ブラインド・モーダル)
#debb54 (body テキスト・リンク)
rgba(7,22,31,0.85) (モーダルオーバーレイ)
Stitchの出力とVANILLA.mdを対応させると、以下の通りになる。



項目
VANILLA.md
Stitch出力




背景
#07161f

#05101A(不一致)


ゴールド
#debb54

#D4AF37(不一致)


テキスト
画像化された要素が多く、CSS上はほぼ白のモーダル内のみ
#FDFDFD


Secondary Blue
存在しない

#1A3A5A(創作)


Sunlight Amber
存在しない

#FFD700(創作)



VANILLA.mdと一致する色は1件もない。
背景とゴールドは同系統の色ではあるが、桁単位で値が異なる。
#05101A は「深い紺」という印象に基づいてAIが再構築した値であり、#D4AF37 は「アンティークゴールド」として一般に流通する既成の色値である。
さらに "Celestial Blue" と "Sunlight Amber" は、VANILLA.mdに記録されていない色を、世界観(celestial=天体的)に基づいて追加している。
タイポグラフィも同様の傾向を示す。



項目
VANILLA.md
Stitch出力




見出し

-apple-system, Noto Sans JP, 游ゴシック (システムフォント)
"Cormorant GaramondまたはCinzel"(推奨例)


本文
同上 + 多くのテキスト要素が画像化
"Noto Sans JPまたはInter"



Stitchの出力は全てのフォント指定に "e.g., ..." 形式の推奨例しか記載しておらず、VANILLA.mdに記録された実際のフォントスタックを抽出していない。
これは観測結果ではなく、「celestial系デザインに合うフォント」という一般的な推奨である。

 2.1.3 題材の先入観がもたらす汚染 ― JJKの場合
同じStitchを呪術廻戦キャラクターページ(jjk-character)に適用すると、異なる形での問題が顕在化する。
出力されたDESIGN.mdのOverviewセクションには、次のような記述が現れた。


 1. Overview & Creative North Star: "Cursed Brutalism"
This design system is a high-energy, editorial framework inspired by the supernatural tension and raw power of the Jujutsu Kaisen universe. Our Creative North Star is Cursed Brutalism.
... we move beyond the template by utilizing intentional asymmetry, overlapping typography, and "Cursed Energy" accents that pierce through a monolithic dark background.

"Cursed Brutalism" という設計哲学名、"Ghost Borders"、"Ambient Light Bleed"、"Cursed Energy Progress Bars" といった造語が多数現れる。
この記述は、読み物として極めて魅力的である。
しかしjjk-characterのVANILLA.mdと照合すると、以下の乖離が明らかになる。


色: VANILLA.mdには赤系(crimson)は一切記録されていないが、Stitchは "Blood Crimson" をPrimary/Secondaryの核として配置している

タイポグラフィ: VANILLA.mdはCinzel + 游明朝 + Noto Serif JP(セリフ・明朝主導)だが、StitchはSpace Grotesk + Inter(モダンサンセリフ)を推奨している

Brutalism哲学: VANILLA.mdのletter-spacing 0.07em、line-height 1.8、明朝主導のデザインは、本来editorialでelegantな美学に属する。Brutalismとは対極的な設計である

"Cursed Energy Progress Bars": VANILLA.mdにプログレスバーは記録されていない

Stitchは対象サイトの「原作(呪術廻戦)」の先入観から、サイトの実装とは無関係の設計哲学を創作している。
より一般的に表現すれば、AIが持つ題材への既成イメージが強いほど、観測を無視した「魅力的な創作」に流れる傾向が観察される。

 2.1.4 観察の整理
Stitchの2件の出力から得られる所見は以下の通りである。

色値・フォント名といった機械的に抽出可能な情報ですらVANILLA.mdと一致していない

Componentsセクションの記述に数値(padding・border-radius・height等)がほぼ含まれない

「Generous Whitespace」等の情景描写的記述にspacingの具体値が伴わない

題材に関するAIの事前知識が強い場合、観測を無視した哲学的フレーミングが発生する
公式自身が規定した8セクション規約を、Stitch自身の出力が満たしていない

Stitchの役割はDESIGN.mdという概念の実演であり、仕様の提案者としての影響力は大きい。
しかし「任意のサイトからDESIGN.mdを抽出する実用ツール」としての精度は、本検証の範囲ではVANILLA.mdへの忠実性を欠く。


 2.2 designmd.me ― 観測と推測の区別が構造的に存在しない

 2.2.1 出力の概観
designmd.meにmahoyaku-1stのURLを与えた結果、生成されたDESIGN.mdは約300行で、9セクション(awesome-design-mdが提案する拡張構成に準拠)がほぼ全て埋まっていた。
色は7色、タイポグラフィは9階層、Componentsは11種が記述された。
量の観点ではStitchを大きく上回る。
しかし内容を検証すると、別種の問題が現れる。

 2.2.2 色の検証
designmd.meが出力した7色をVANILLA.mdと照合する。



色名
出力値
VANILLA.mdにおける対応




Golden Accent
#DEBB54
VANILLA.mdに記録あり(#debb54)


Deep Background
#07161F
VANILLA.mdに記録あり(#07161f)


White
#FFFFFF
VANILLA.mdに記録あり(モーダル内のみ使用)


Secondary Blue
#5A8FBA
VANILLA.mdに記録なし


Deep Navy
#004986
VANILLA.mdに記録なし


Link Primary
#5A8FBA
上記を流用(VANILLA.mdと無関係)


Link Secondary
#004986
上記を流用(VANILLA.mdと無関係)



7色中3色はVANILLA.mdと一致するが、残り4色はVANILLA.mdに記録されていない値である。
特筆すべきは、記録されていない4色に対して「Secondary Blue」「Link Primary」といった役割名が割り振られている点である。
読み手は、これらが観測された役割分担であると受け取る構造になっている。
Stitchが全色を別値に置き換えたのに対し、designmd.meは3色を正確に抽出し、そこに4色を創作して混ぜている。
この混合は、Stitchよりも判別を困難にする。
部分的に観測を含むため、全体が観測されたかのような印象を与える。

 2.2.3 タイポグラフィの検証
mahoyaku-1stのVANILLA.mdに記録されたCSSレベルのタイポグラフィ情報は、次の通りである。

font-family: システムフォントスタック(-apple-system, ..., Noto Sans JP)
font-size: body 14px(PC)/ 3.73vw(SP)、見出しは18px / 12px / 10px等
font-weight: 300の明示的指定のみ(Noto Sans JPに対して)

さらに重要な事実として、VANILLA.mdは「テキスト要素は画像(.png)で代替されているケースが多い。
全体デザインはCSS + 画像ファイルで構成」と明記している。
designmd.meの出力は、以下のタイポグラフィ階層を提示する。



Role
Size
Weight




Display / H1
48px
700


Heading / H2
32px
700


Heading / H3
24px
700


Body Large
16px
400


Body
14px
400



48px / 32px / 24pxの見出しサイズも、weight 700の使用も、VANILLA.mdには記録されていない。
これは「典型的なWebサイトにはこのような階層があるはずだ」という既成の知識に基づく記述である。
サイト固有の事実(テキストが画像化されている、CSS上のweight指定は300のみである)は、出力から完全に欠落している。

 2.2.4 コンポーネントの検証
designmd.meが記述する11種のコンポーネントのうち、VANILLA.mdに記録されているものと記録されていないものを整理する。



出力されたコンポーネント
VANILLA.mdにおける記録




Primary Button (344×52px)
記録なし(このサイトに明示的なCTAボタンは存在しない)


Secondary Button (344×52px)
記録なし


Ghost Button
記録なし


Standard Card
記録なし


Ornamental Container
記録なし


Text Input
記録なし(入力フォームは存在しない)


Textarea
記録なし


Form Label
記録なし


Breadcrumb Navigation
記録なし


Status Badge (Success)
記録なし


Accent Badge
記録なし



記述された11種のうち、VANILLA.mdに記録されているものは1つもない。
にもかかわらず、出力には 344×52px、border: 1px solid #DEBB54 といった具体的な数値が付されている。
この具体性が、出力を観測結果であるかのように見せる効果を持つ。

 2.2.5 観察の整理
designmd.meの出力の特性は、以下の通りである。


基本的な色・背景色の抽出は部分的に成功している(主要3色はVANILLA.mdと一致)

抽出に失敗した情報を、AIの既成知識で補完している。そしてその補完箇所に観測との区別を示す記号が付されない
存在しないコンポーネントを、具体的な数値付きで記述する
動的要素(JSで制御されるアニメーション、jQueryによる挙動等)が完全に欠落している

出力形式としてはawesome-design-mdが提案する9セクション構成を踏襲しているため、形式の充実度が高く見える。
しかし充実度と観測精度は独立しており、形式が整っているほど、読み手が出力を信頼する傾向があるという点で、この種のツールはStitchよりも注意深い扱いを要する。


 2.3 awesome-design-md ― 精度は比較的高いが、射程が限定される

 2.3.1 リポジトリの性格
awesome-design-mdは前2者とは質が異なる。
これはツールではなく、既に抽出されたDESIGN.mdのキュレーションである。
2026年4月時点で55件前後の大企業サイト(Apple / Stripe / Linear / Spotify / Vercel / Notion等)のDESIGN.mdを収録している。
利用者はリポジトリから目的に合うDESIGN.mdを選択し、自身のプロジェクトにコピーする。
重要な制約として、本リポジトリは国内サイトを収録していない。
対象の55件は全て英語圏の大企業である。
したがってmahoyaku-1stやjjk-characterのような日本国内のコンテンツ系サイトに対しては、そもそもデータが存在しない。
この制約のため、本節では代替としてLinearのDESIGN.mdを検証対象とし、本ツールキットのlinear-app/VANILLA.mdと照合する。

 2.3.2 LinearのDESIGN.mdの検証
awesome-design-mdが収録するLinearのDESIGN.mdは、約500行にわたる詳細な記述である。
以下に特徴的な箇所を抜粋する。
色の記述:
- Marketing Black (#010102 / #08090a)
- Panel Dark (#0f1011)
- Level 3 Surface (#191a1b)
- Primary Text (#f7f8f8)
- Brand Indigo (#5e6ad2)
...
linear-appのVANILLA.mdと照合すると、#010102 #08090a #0f1011 #191a1b #f7f8f8 #5e6ad2 は全てVANILLA.mdに記録されている。
透過ボーダー(rgba(255,255,255,0.05))や状態色(#27a644, #eb5757 等)も正確に記述されている。
タイポグラフィの記述:
- Primary: Inter Variable (OpenType features "cv01", "ss03" enabled globally)
- Monospace: Berkeley Mono
- Weight 510 is the signature weight
- Letter-spacing at display sizes: -1.584px at 72px, -1.056px at 48px
OpenType featuresの具体値、signature weightの510、display sizeでの負のletter-spacingの具体値まで、VANILLA.mdと一致する。
単なる「font-family: Inter」ではなく、Linear固有のカスタマイズまで記述されている。

 2.3.3 観測精度の評価
awesome-design-mdのLinear DESIGN.mdは、前2者と比較して明確に精度が高い。
少なくとも色・タイポグラフィ・spacingスケールに関しては、VANILLA.mdと一致する値が多数含まれる。
これは手動抽出のキュレーションという性格上、当然の結果ではある。
AIによる自動抽出ではなく、人間がサイトを実際に解析して書き起こしているため、観測精度は高水準である。
ただし同時に、以下の限界も観察される。

 2.3.4 欠落する情報の層

 (a) 動きの記述
LinearサイトのVANILLA.mdには、次のアニメーションが記録されている。


hero-pulse: box-shadow 0→10px rgba(243,79,82,0), 1.75s cubic-bezier(.66,0,0,1) infinite


text-shine: background-position 0→300%, 1.8s linear infinite


glass-fade: backdrop-filter blur(1.5px) + mask-image gradient


marquee-scroll: 水平/垂直無限ループ

hover-snap: .16s var(--ease-out-quad) による全インタラクション統一

press-shrink: transform scale(.97) active state
3D hero: transform: rotateX(47deg) rotateY(31deg) rotate(324deg) + perspective:4000px

Radix UI Navigationのdropdown状態遷移アニメーション

awesome-design-mdのLinear DESIGN.mdには、これらが一切記述されていない。
「Visual Theme & Atmosphere」セクションに「dark-mode-first product design」等の印象的な記述があるものの、実際のアニメーション仕様は欠落している。
これはawesome-design-md単体の欠陥ではなく、採用している9セクション構成にアニメーション記述領域が存在しないという構造的な制約である。
Stitch純正の8セクションと同様、動きを記述する場所がない。

 (b) 推測と観測の区別
awesome-design-mdは、推測された記述に (Inferred) という注記を一部のコンポーネントに付している。
例えば以下のような記述がある。
**Primary Brand Button (Inferred)**
- Background: #5e6ad2 (brand indigo)
- Text: #ffffff
- Padding: 8px 16px
- Radius: 6px
(Inferred) は「推定」を意味する。
この注記により、当該コンポーネントの仕様が実測ではなく推測であることが読み手に示される。
これは前2者にはない誠実な設計判断である。
しかし同じDESIGN.mdの他のコンポーネント(Ghost Button、Subtle Button等)にはこの注記がない。
観測と推測の区別は部分的であり、体系的ではない。
読み手は、注記のない箇所を観測値と解釈することになるが、実際のところ注記の有無が観測・推測の境界に対応しているのか判別できない。

 (c) 記述対象の偏り
awesome-design-mdに収録される55件は、全て以下の特性を共有する ―

英語圏の企業サイト
開発者向けプロダクトが多数(Linear / Stripe / Vercel / Supabase / Cursor等)
モダンなCSS変数体系とフレームワーク(React / Next.js等)を採用
デザインシステムが社内で体系化されている

この偏りは、リポジトリが「デザインシステムが整った企業サイト」を前提とした収録方針を採っているためである。
対象として日本国内のゲーム・アニメ系サイト、TweenMaxやjQueryによる古い実装、テキストが画像化されたサイト等は射程外となる。

 2.3.5 観察の整理
awesome-design-mdの特性は、以下のように整理できる。


色・タイポグラフィ・spacingの抽出精度は高い(手動キュレーションの成果)

動きの記述は欠落する(9セクション構成の構造的制約)
推測と観測の区別は部分的で、体系的ではない
収録対象が英語圏の大企業デザインシステムに偏る
利用者自身は抽出できず、収録されているもののみを利用可能

設計思想としては「AIによる自動抽出の不正確さ」を手動キュレーションで補う方針であり、精度面での優位は認められる。
しかし動きを扱わない、日本語圏を扱わない、利用者の自己抽出を許容しないという構造的な限界は、本リポジトリの性質上、解消されない。


 2.4 3手段に共通する構造的欠陥
前3節の検証から、手段別の特性差は明らかとなった。
一方で、3手段すべてに共通する欠陥もまた浮かび上がる。
本節ではこの共通構造を整理する。

 2.4.1 アニメーション記述領域の不在
3手段はいずれも、動きの層を体系的に記述する領域を持たない。


Stitch: 公式の8セクション構成にアニメーション項目がない

designmd.me: 9セクション構成を採用するが、動きの記述は含まない

awesome-design-md: 9セクション構成を採用するが、動きの記述は含まない

この欠落は、各手段の実装品質の問題ではなく、DESIGN.mdという書式自体が静的スナップショットを前提としているという設計上の前提に起因する。
色・タイポグラフィ・余白・影・形状・コンポーネント・Do's and Don'ts― これらはいずれもある時点における見た目の記述である。
時間軸を持つ情報(hover遷移、scroll連動、keyframe、状態変化)を記述する枠組みが仕様に存在しない。
この欠落の重大性は、対象サイトの性質によって変動する。
Linearのような静的マーケティングサイトでは、アニメーションは補助的な要素に留まるため、欠落の影響は部分的である。
一方、mahoyaku-1stのようなアニメーションが個性を担うサイトでは、動きを記述できないことがそのままサイト固有性の喪失を意味する。

 2.4.2 観測と推測の混在
程度の差はあるものの、3手段のいずれも、観測された事実とAIによる推測を文中で明示的に区別していない。


Stitch: 区別なし。観測も推測も同じ文体で記述される

designmd.me: 区別なし。観測値と創作値が同じ形式で並列される

awesome-design-md: (Inferred) 注記が部分的に存在するが体系的ではない

この混在は、AI引き渡し時に重大な問題を引き起こす。
DESIGN.mdを受け取ったAIエージェントは、記述された内容を実装すべき仕様として解釈する。
推測された値と観測された値の区別がない場合、AIは全てを等しく実装要件として扱い、結果として「架空の値に基づく架空のデザイン」が生成される可能性がある。
「AIに正確にデザインを引き渡す」ことがDESIGN.mdの目的である以上、記述内容の真正性を担保する仕組みが不可欠である。
しかし現行の3手段はこの仕組みを持たない。
対照的に、比較基準としたVANILLA.mdは「観測された事実のみを記述する」という原則と「未取得は [未取得] と明記する」というルールにより、記述された内容が観測に裏打ちされていることを構造的に保証する。
本章で3手段との照合が成立したのは、この保証があったからである。

 2.4.3 題材への先入観に汚染される脆弱性
StitchのJJK例で観察された「題材の既成イメージが記述を汚染する」現象は、程度の差はあれdesignmd.meにも観察される。
mahoyaku-1stに対するdesignmd.meの出力は、「celestial(天体的)」「magical(魔法的)」という題材連想から、VANILLA.mdに記録されていない色(Celestial Blue、Sunlight Amberに相当する補色)を導入していた。
awesome-design-mdは手動キュレーションであるため題材汚染は相対的に少ないものの、Visual Themeセクションにおける詩的記述(「content emerges from darkness like starlight」等)は、書き手の印象に基づく解釈を含む。
題材汚染が発生する原因は、抽出対象サイトに対するAIの事前知識が、観測を上書きするためである。
特に有名な題材(呪術廻戦、Apple、Linear等)はAIの訓練データに豊富に含まれるため、観測を見る前からAIは当該題材の印象を持っている。
この事前知識は、しばしば観測結果よりも記述を支配する。

 2.4.4 利用者の自己抽出能力の欠如または制限


Stitch: 任意URLから抽出可能だが、精度がVANILLA.mdと著しく乖離する

designmd.me: 任意URLから抽出可能だが、精度の問題はStitchと同質

awesome-design-md: 任意URLからの抽出機能を持たない(収録物の利用のみ)

利用者が「自分が参照したいサイトのDESIGN.mdを得る」手段として、3手段はそれぞれ制約を持つ。
自動抽出系(Stitch・designmd.me)は精度が低く、キュレーション系(awesome-design-md)は選択肢が固定される。
利用者が自身の参照先を、実態を歪めない形で、自ら選択・抽出する手段が、既存の3選択肢の中には存在しない。


 2.5 本章のまとめ
本章では、既存のDESIGN.md生成手段3つ ―Google Stitch、designmd.me、awesome-design-md― を、本ツールキットのVANILLA.mdを比較基準として同一の実在サイトで比較検証した。
3手段には個別の特性差がある。

Stitchは仕様の提唱者でありながら、自動抽出の精度はVANILLA.mdと乖離する。題材への事前知識が強い場合、創作的記述に流れる傾向が顕著である
designmd.meは形式上の充実度は高いが、観測3色に創作4色を混入させるなど、出力の一部にVANILLA.mdに記録されていない値が含まれる
awesome-design-mdは手動キュレーションによる精度で優位に立つが、動きの記述領域を持たず、収録対象が英語圏大企業に限定される

同時に、3手段に共通する欠陥が確認された。

動きの層を記述する領域の不在
観測と推測を明示的に区別する仕組みの欠如
題材への事前知識が観測を汚染する現象への脆弱性
利用者が任意のサイトの実態を歪めずに抽出する手段の不在

これら4点は、「AIに正確にデザインを引き渡す」というDESIGN.mdの本来の目的に直結する。
現行の3手段が揃ってこれらの欠陥を示す以上、欠陥は個別実装の問題ではなく、現在のDESIGN.md生成のパラダイムそのものに内在する構造的問題と解釈できる。
第1章で述べた「X(Twitter)上での期待」― 「どんなサイトもスキャンして瞬時に再構築できる」「誰でもプロデザイナーになれる」― は、Stitch提唱の時点から広く共有されていた。
しかし本章で観察された実態との間には、無視し得ない差がある。
少なくとも「実態を歪めず、動きを含み、題材への先入観に汚染されないDESIGN.md」を任意のサイトから得る手段は、2026年4月時点では存在しない。
次章では、この構造的問題への応答として本ツールキットが採用した設計判断 ― 抽出側の二段モデル(VANILLA / INTERPRETED)、生成側の辞書モデル(lexicon / patterns / [要確認])、Animations拡張セクション、design-extractorの実装、抽出と生成の連携(Step 9補助抽出オファー) ― を論じる。
本章で比較基準として用いたVANILLA.mdの設計思想も、そこで改めて位置づける。


 第3章 本ツールキットの設計判断

 3.0 設計の指針 ― なぜ自分で作ることになったか
第1章で記録したX上の熱狂は、Stitch提唱以降の1ヶ月強の間に「どんなウェブサイトでもスキャンして瞬時に再構築できる」「誰でもプロデザイナーになれる」という言葉を生んだ。
第2章ではその実態を検証した。
同一の実在サイトに対して既存3手段(Google Stitch / designmd.me / awesome-design-md)を適用した結果、熱狂が想定する精度には届かない出力が並んだ。
動きの層は記述されず、観測と推測は文中で混在し、題材への先入観が観測を汚染し、利用者が任意のサイトを歪めず抽出する手段は存在しなかった。
期待されているほどのものではなかった ― 第2章で確認できたのはこの事実である。
しかし、熱狂が描いた問いそのもの ― AIに対してデザインを正確に言葉で渡せるか ― は、依然として価値ある問いとして残る。
世間の言説が約束したものと実態のギャップを目の前にしたとき、私は「ならば自分の手で、せめて部分的にでも、その問いに応える形を作ろう」と考えた。
advanced-design-mdは、この動機の下で組み上げたツールキットである。
本章では、第2章で観察された4つの構造的欠陥に対して、私が採用した5つの設計判断を論じる。
各節の対応関係は §3.6.1の対応マップに集約するが、本章の中心となる思想を先に提示しておく。
設計判断の中心は、「観測と推測を明示的に分離する」という思想を、抽出側と生成側の両方に異なる形で実装することである。


抽出側(design-extractor) では、VANILLA.md(観測のみ)とINTERPRETED.md(解釈のみ) という二段モデルとして実装した(§3.1)

生成側(design-creator) では、lexicon(辞書)とpatterns(経験則)による語彙制約、および [要確認] マーカーによる保留の明示として実装した(§3.2)

これに加えて、3つの設計判断が応答として加わる ―


動きを記述する領域をAnimations拡張セクションとして3文書すべてに共通で組み込んだ(§3.3)

利用者の自己抽出能力をdesign-extractorのスキル化として実装した(§3.4)

抽出と生成の連携を、creatorからextractorへの単方向呼び出し(Step 9の補助抽出オファー)として実装した(§3.5)

以下の議論は、個別の実装詳細の網羅を目的としない。
なぜその設計を採ったか、その設計が第2章で指摘した欠陥にどう応えるかを中心に論じる。


 3.1 観測と推測の分離 ― 抽出側の二段モデル

 3.1.1 VANILLA ― 観測のみを許す層
design-extractorが生成する第一の文書、VANILLA.mdについては、第2章 §2.0.1で比較基準としての仕様を既に提示した。
観測のみを記述し、推測・補完・創作を一切含めないという原則と、未取得の値を [未取得] で明示する運用がその核である。
本節では、第2章では触れなかったこの設計判断の意義を整理する。
なぜわざわざ「観測のみ」を担う層を独立に置くのか、なぜそれを [未取得] のような不完全さの明示と組み合わせるのか。
VANILLA.mdの制約はSKILL.md(スキル定義)に明示的な禁止事項として記述されている。
Claudeは本来「質問に答えようとする」傾向を持つため、データが不完全な箇所を創作で埋めようとする。
これを防ぐには、ルールを書き手側が意図的に提示する必要がある。
VANILLA.mdの価値は、記述されたことの信頼性に加えて、記述されなかったこと(= [未取得])の明示性にある。
読み手は「何が観測できて、何が観測できなかったか」を正確に把握できる。
この能力は、AI引き渡し時に「架空の値を実装させない」ための仕組みとして担保される。

 3.1.2 INTERPRETED ― 解釈のみを許す層
VANILLA.mdは観測された事実の記録に徹するため、そのままではAIに「どう使うか」を伝える力が弱い。
例えばVANILLA.mdに #debb54 が記録されていても、その色がブランドの何を担っているか、どんな印象を担っているかは記述されない。
これはVANILLAの原則が推測を排除するためである。
この空白を埋めるのがINTERPRETED.mdである。
VANILLA.mdを唯一の入力として、AIによる解釈を加えた層である。
INTERPRETED.mdの各要素は、以下のフィールドを持つ。


name: 英語のkebab-caseによる短い識別子(例: ghost-fade, rise-in)

ja: 日本語による併記(例: ゴーストフェード, ライズイン)

source: VANILLA.md内の対応箇所(CSSセレクタやkeyframe名)からの引用

tone: 印象を表すリスト(例: [控えめ, 主張しない])

effect: 機能(例: 汎用的なホバー時の存在フィードバック)

strength: 長所

weakness: 短所

good-for: この要素が向くコンポーネント(concrete / abstract の二系統)

avoid: この要素が向かないコンポーネント

重要な原則として、INTERPRETED.mdはVANILLA.mdに存在する値しか使用してはならない。
解釈を加えるが、新たな色値・新たなフォント・存在しないkeyframeをINTERPRETEDに記述することは、この層の定義に反する。
以下は実際のINTERPRETED.mdの一部である。
- name: ghost-fade
 ja: ゴーストフェード
 source: ".ah:hover"
 spec: "opacity 0.7, 0.4s ease"
 tone: [控えめ, 主張しない]
 effect: 汎用的なホバー時の存在フィードバック
 strength: ロゴ・アイコン等の汎用ホバーとして邪魔しない
 weakness: 印象が薄く記憶に残りにくい
 good-for:
 concrete:
 - page-top-button
 - nav-link
 abstract:
 - logo
 - sns-icon
 avoid:
 concrete:
 - hero-title
 abstract:
 - primary-cta
tone(印象)とeffect(機能)が分離されている点に注目していただきたい。
多くの既存の記述形式では、「控えめなホバー演出」のような記述に両者が混在する。
この混在は、「どのコンポーネントに使うべきか」を判断するときの指針を曖昧にする。
本ツールキットでは印象と機能を別フィールドとして分離することにより、解釈そのものが構造化される。
また good-for と avoid が concrete(命名体系が確定済みの部品名)と abstract(未確定の仮ラベル)に分離されている点も、構造化の一環である。
命名の確定度に応じて責任範囲を分ける。
design-extractorは references/parts-naming.md に確定済みの部品名リストを持ち、この一覧にない名前は concrete 側には書けない。
命名体系外の用途は abstract 側、または自由文フィールド(weakness / note など)に記述することとする。

 3.1.3 二段モデルが応える欠陥
二段モデルの意義は、第2章で指摘した欠陥 (2)(3) への直接的な応答として理解できる。
欠陥 (2): 観測と推測を明示的に区別する仕組みの欠如への応答として、VANILLAとINTERPRETEDを分離する。
VANILLA層は観測のみを記述し、推測が禁止される。一方、INTERPRETED層は解釈のみを記述し、新たな値の創作が禁止される。
どちらの層も自分の役割にのみ専念する。
この分離により、「記述された値が観測なのか推測なのか」という問いが、層を見れば明確に答えられる構造になる。
欠陥 (3): 題材への事前知識が観測を汚染する現象への脆弱性への応答としても、VANILLAの独立性が働く。
題材の既成イメージが解釈に影響を与えるのは避けがたいが、VANILLA層を観測に固定しておく限り、題材への先入観による汚染はINTERPRETED層に閉じ込められる。
読み手は、解釈に違和を感じた場合、VANILLAに戻って「元の観測ではどうだったか」を確認できる。
二段分離は一見すると冗長に見える。
同じサイトの記述が複数の文書に分かれるため、書き手の負担は増える。
しかし既存の単層のDESIGN.mdが直面している問題(観測と推測の混在)は、単層のままでは原理的に解決できない。
層を分けることは、負担の増加を受け入れる代わりに、解決不可能な問題を解決可能にする判断である。


 3.2 観測と推測の分離 ― 生成側の辞書モデル
抽出側で「観測vs推測」の分離を二段モデルで実装したのに対し、生成側(design-creator)では同じ思想を異なる形で実装する必要がある。
生成側には観測対象が存在しないため、二段モデルは適用できない。
代わりに、辞書(lexicon)による語彙制約と [要確認] マーカーを組み合わせる。

 3.2.1 lexicon ― 使用可能な語彙の固定
design-creatorは、references/lexicon/ 配下に4種類の辞書を持つ。


lexicon/colors.md: 配色パレット(slug + bg + primary + accent + sub-accent + mood + best-for)

lexicon/typography.md: フォント組み合わせ(role + font + source + weight + mood親和)

lexicon/animations.md: アニメーション(scope + name + spec + mood親和)

lexicon/parts.md: 部品(ja名 + 推奨アニメscope + 初期reason)

design-creatorがDESIGN.mdを生成する際の最も重要なルールは、**「この辞書にない値をDESIGN.mdに書いてはならない」**である。
配色はlexicon/colors.mdに登録されたパレットからのみ選ぶ。
フォント名はlexicon/typography.mdに登録されたものからのみ選ぶ。
このルールが意味するのは、AIに「自由に書く」のではなく「事前に定義された語彙の中から選ぶ」ことを強制する設計である。
AIは本来、知識の組み合わせから自然に新しい値を生成する。
例えば「darkでゴージャスな配色」と指示されれば、AIは #1a1a2e のような値を即興で出してくる。
この値は「それっぽい」が、書き手のブランド設計とは無関係である。
lexiconを介在させることで、AIの出力は「lexiconの中のどのパレットを選ぶか」という有限の選択問題に変換され、即興の捏造はそもそも起こりえなくなる。

 3.2.2 patterns ― 組み合わせの経験則
lexiconが「何が使えるか」を定義するのに対し、references/patterns/ は「何と何が併用されやすいか」の経験則を定義する。


patterns/color-combos.md: mood × useの組み合わせで頻出するパレット選定パターン

patterns/animation-recipes.md: mood × scopeを横断したアニメーションの組み合わせレシピ

patterns/component-defaults.md: use × moodに応じた必須パーツ構成のテンプレート

例えば「dark + ファンタジー + 神秘性」というmoodの組み合わせがあったとき、lexicon/colors.mdには複数のパレット候補が該当する(night-sky-gradient / lavender-black / purple-gold など)。
第一候補を一意に決めるためにpatterns/color-combos.mdが参照される ― 「ダーク × ファンタジー / 神秘性」セクションが night-sky-gradient を優先指定することで、最終的な選定が確定する。
patternsはlexiconを上書きしない。
あくまでlexicon内の選択肢の中で「どれを優先するか」を経験則的に示すだけである。
これにより、lexiconの網羅性とpatternsの判断補助が衝突せず、両者を併用できる。

 3.2.3 [要確認] ― 保留の明示
lexiconに該当値が存在しない場合、design-creatorは新たな値を創作しない。
代わりに [要確認] という記号で保留を明示する。
この記号は以下のいずれかを示す。

観測または辞書に該当値が存在せず、AIが選定を保留した
ユーザーの自由入力が原文のまま保持され、後段で人間判断を要する
volume(quick / standard / deep)制約により設問が出題されず、値を確定できなかった

[要確認] は「不具合」ではなく「保留の明示」である。
実装フェーズの担当者が当該箇所に追加指示を与えるための明示的な空欄として機能する。
design-creatorはvolume別の [要確認] 残存率の目安をユーザーに事前提示する ―



volume
出題数

[要確認] 比率の目安




quick
5問
50% 以下


standard
10問
30% 以下


deep
20問
20% 以下



これにより、ユーザーは「クイズが短いほど保留が増える」という事実を生成前に把握する。
「思ったより空欄が多い」という後発の不満を避けるための事前合意である。

 3.2.4 辞書モデルが応える欠陥
辞書モデル(lexicon + patterns + [要確認])もまた、欠陥 (2)(3) ― 観測と推測の混在および題材への先入観 ― への応答である。
観測対象を持たない生成の場面で、抽出側と同じ思想をどう実装するかが、抽出側との違いの核となる。
抽出側ではVANILLA / INTERPRETEDの層分離によって、観測領域から推測を構造的に締め出した。
観測対象が存在しない生成側では、この方法は採れない。
代わりに、有限の語彙(lexicon)をあらかじめ用意し、AIに「事前定義からの選択」のみを許すことで、即興の創作を起こりえなくする。
「Apple風」とユーザーが書いたとき、AIが即興でApple的な配色を捏造することは禁じられ、[要確認] として保留される(または §3.5のStep 9経路で参照サイトを抽出する)。
両者は実装は異なるが、思想は同じである ― AIが「知らないことを知らないと言える」設計を、文書側からも語彙側からも担保する。


 3.3 動きを記述する領域 ― Animations拡張セクション

 3.3.1 5サブセクション構成
第2章で指摘した通り、既存のDESIGN.md生成手段は全て、動きを体系的に記述する領域を持たない。
Stitch純正の8セクション構成にも、awesome-design-mdが採用する9セクション構成にも、アニメーションの項目がない。
本ツールキットは、この欠落への応答として、VANILLA.md / INTERPRETED.md / DESIGN.mdのすべてに 独自のAnimationsセクションを新たに追加した。
拡張の最初の判断は、「動きをどのような粒度で記述するか」である。
本ツールキットでは以下の5サブセクションを採用する。



サブセクション
対象




Libraries
使用されているJavaScriptアニメーションライブラリの特定(GSAP, jQuery, Lenis, Three.js等)


Keyframes
CSS @keyframes による定義


Transitions
CSS transition による状態変化


Scroll Behaviors
スクロール連動の挙動(IntersectionObserverによる状態切り替え等)


Hover / Interaction
hoverやclickなどユーザー操作に連動する挙動



この5分割は、アニメーションを発火させる条件別に分類したものである。
一度きりのkeyframeと、状態変化のtransitionと、スクロールで発火する動作と、ユーザー入力で発火する動作は、それぞれ異なる実装パターンを持つ。
同じセクション内で雑居させると、実装時の参照がしにくい。

 3.3.2 lexicon/animations.mdによる語彙固定
DESIGN.md側では、Animationsセクションの記述もlexiconの制約下にある。
references/lexicon/animations.md に登録されたscope(page-load / hero-enter / scroll-reveal / hover / nav-toggle / modal / page-transition / bg-decoration / complex-sequence)とname(blur-reveal / rise-in / ghost-fade等)からのみ選ぶ。
scopeごとに採用が推奨されるlibもlexicon内で固定されている。
例えばscroll-revealはCSS + IntersectionObserver、hoverはCSS transitionのみ、というように。
GSAP / Three.jsのような外部ライブラリは「complex-sequence」scopeでのみ [要確認: GSAP候補] として残される。
これにより、生成されたDESIGN.mdは外部CDNへの依存を最小化する。
Animations Librariesテーブルの大半は「CSS + IntersectionObserver」「CSS @keyframes」「CSS transition only」に収まる。

 3.3.3 7レイヤー構成におけるMotion層
design-creatorのクイズには、Animationsの方針を決めるための Motion層(Q-motion-01〜03)が含まれる。



Q-id
テーマ




Q-motion-01
テンポ(fast / medium / slow / minimal)


Q-motion-02
キャラクター(subtle / expressive / theatrical / mechanical)


Q-motion-03
採用ライブラリの許容度(CSS only / GSAP allowed / WebGL anything goes / case-by-case)



これらの回答はlexicon/animations.mdのscope別第一候補選定と組み合わされる。
例えば「mood = dark / luxury」+「Motion tempo = slow」ならhero-enterにはblur-reveal(1.5s ease)、scroll-revealにはfade-blur-in(1.2s ease)が選ばれる。
同じmoodでもtempoがfastなら、より短いdurationの選択肢に変わる。
moodとMotionの組み合わせを、patterns/animation-recipes.mdがレシピ化している。
「mystic stack」「minimal stack」「vivid stack」のような名前付きの組み合わせとして、複数のscopeを一括して決められる。



 3.4.1 Playwrightによる動的レンダリング
第2章で指摘した欠陥 (4)「利用者が任意のサイトの実態を歪めずに抽出する手段の不在」への応答として、本ツールキットは design-extractor をClaude Codeスキルとして実装した。
design-extractorの最初の設計判断は、単純なHTTP GETではなくPlaywrightによる動的レンダリングを使うことである。
理由は、現代のWebサイトの多くが以下の特性を持つためである。

JavaScriptによる動的なDOM構築(React / Vue / Next.js等のSPAフレームワーク)
Lazy loading(遅延読み込み)による初期DOMの最小化
ユーザーエージェント・地域によるコンテンツの分岐
Bot検知による静的取得の遮断(Akamai、Cloudflare等)

静的なHTTP GETでは、これらのサイトから意味のあるCSS・DOM構造を取得できない。
design-extractorはChromiumを起動し、実際のブラウザとして対象サイトを訪問する。
networkidle イベント(ネットワーク活動が一定時間停止する時点)を待ってからDOMを取得するため、SPAであってもレンダリング後の状態を取得できる。
Chromiumが遮断される場合はFirefoxへの自動フォールバックも実装している。

 3.4.2 JSシグネチャによるライブラリ判定
取得したJavaScriptファイルから、どのアニメーションライブラリが使われているかを判定する処理は、URLの文字列判定ではなく、JavaScript本体のコード内容(シグネチャ)を精査する方式を採る。
URL判定では、例えば gsap.min.js というURLからGSAPを判定することになる。
しかし現代のビルド環境では、ファイル名が難読化されるか、バンドルされて一つのファイルに統合される。
URLに gsap の文字列が現れないケースが多い。
代わりに、本ツールキットは以下のようなコード内のメソッド呼び出しパターンをJS本体の文字列から検出する。


gsap.to( → GSAP

gsap.timeline( → GSAP

ScrollTrigger.create( → ScrollTrigger

lottie.loadAnimation( → Lottie

anime({ targets: → Anime.js

fadeIn( / fadeOut( → jQuery

new Swiper( → Swiper

これらのシグネチャは、バンドル後のコード内でも残存しやすい。
判定対象からGoogle Tag ManagerやGoogle Analyticsのようなデザインに無関係な分析スクリプトを除外するリストも、fetch.js に組み込まれている。
さらに、DOMから <script src> 属性を抽出して補完取得を行うフォールバックも実装している。
シグネチャ判定で検出されなかった本体JavaScriptを、DOM構造から逆引きで取得する。
この二段構えにより、様々な実装スタイルのサイトに対応できる。

 3.4.3 behavior-log ― 観測の限界をデータとして残す
静的なHTML・CSS・JavaScriptを取得しただけでは、実際にサイトがどう振る舞うかは完全には分からない。
特にスクロール連動やhover応答は、ユーザー操作が発生した時点で初めて実行される。
design-extractorは、Playwrightの page.evaluate フックを利用して、サイトが読み込まれた直後の時点で挙動を観測する機構を組み込んでいる。
出力される behavior-log.json には、以下の情報が記録される。


eventListeners: 登録されたイベントリスナー(scroll, click, mousemove等)

observers: IntersectionObserverの生成有無

classSamples: DOMに存在するクラス名のサンプル(アニメーション制御クラスの推定手がかり)

gsapPlugins: window.gsapが存在する場合、登録されたプラグイン一覧

missingReasons: 観測できなかった要素の理由(requires_scroll, requires_hover, lazy_loaded 等)

特に missingReasons は、観測の限界をデータとして残すための機構である。
「スクロール前のためhoverアニメーションが未発火」という事実自体が記録され、Claudeがこれを入力としてVANILLA.mdを生成する際に、[未取得: requires_scroll] 等の明示的な注記として反映される。

 3.4.4 [未取得] の運用ルール
design-extractorの設計判断のうち、おそらく最も重要な一つは、**「Claudeに観測できなかったことを黙って補完させない」**という運用方針である。
通常、大規模言語モデルは「質問に答えようとする」傾向がある。
不完全なデータを渡されても、なんとか回答を組み立てようとする。
この傾向は、デザイン仕様の記述においては汚染を引き起こす。
「観測できなかったから [未取得] と書く」よりも「celestial系サイトなら一般にこの色を使う」と書く方が、モデルにとっては自然な応答である。
本ツールキットは、design-extractorの SKILL.md(スキルの動作を規定する指示書)において、以下のルールを明示している。
### 解析時の注意
読み込んだソースから以下を抽出する:
- Colors / Typography / Spacing / Components
 - CSSの変数・クラス定義から読み取る
 - JSで動的に設定される値は `[動的: JS制御]` と明記
- Animations
 - `references/animation-patterns.md` を参照してライブラリを特定する
 - @keyframes・animation・transitionプロパティを抽出
 - behavior-log.jsonのeventListeners・observersからScroll/Hover挙動を読み取る
 - missingReasonsがある場合は該当箇所に `[未取得: <理由>]` と明記
**推測補完していないか**(出力前チェック項目)
「推測補完していないか」が明示的なチェック項目としてClaudeに提示される。
これにより、Claudeはデータが不完全な箇所を、創作で埋めずに [未取得] として残す挙動を取る。
この設計は、第2章で検証した3手段との決定的な差分である。
「知らないことを知らないと言う」能力は、AIを用いた抽出ツールにおいて、自動的には獲得されない。
意図的に禁止ルールとして記述する必要がある。


 3.5 抽出と生成の連携 ― Step 9補助抽出オファー

 3.5.1 lexiconの有限性という構造的制約
§3.2で論じたlexiconモデルには、原理的な制約がある ― lexiconは有限である。
世界に存在する全てのデザイン語彙を辞書に登録することはできない。
新しいブランド・新しい流行・特定の固有名詞へのニュアンスは、lexiconの網羅範囲を超える。
例えばユーザーが「Apple風のクリーンさ」と書いたとする。
lexicon/colors.mdに「Apple風」というパレットは存在しない。
lexicon/typography.mdにApple専用のフォントスタックは登録されていない。
この場合、§3.2のルールに従えば、関連するフィールドは [要確認] として保留される。
しかしこれだけでは、ユーザーの意図が後段に伝わらない。
「Apple風」という言葉自体は原文として保持されるが、それを実装に変換する手段がDESIGN.md内に存在しない。

 3.5.2 単方向連携の設計判断
この制約への応答として、design-creatorは特定条件下でdesign-extractorを呼び出す権限を持つ。
SKILL.mdのStep 9として明示的に定義されている。
発動条件(いずれか1つ以上)は以下の通り。


固有名詞・ブランド言及 ― 自由入力にブランド名・作品名・URLが含まれる

mood衝突 ― lexicon第一候補がユーザーの別要件と矛盾する

[要確認] 多発 ― volume別目安(quick: 50%, standard: 30%, deep: 20%)を超過

lexiconカバー外シグナル ― 自由入力にlexiconにないスタイル名が含まれる

発動時、design-creatorはユーザーに以下を提示する ―
「Apple 風」のニュアンスは lexicon のみでは表現が困難です。
参照可能なサイト URL があれば抽出を実行可能ですが、いかがいたしますか? (yes / no)
ユーザーがyesと回答した場合、design-creatorは対象URLをユーザーから受け取り、design-extractorを起動する。
抽出完了後、得られたINTERPRETED.mdの値はlexiconと同格に扱われ、DESIGN.mdの対応フィールドに採用される。
採用された値には <!-- source: extracted from {slug}/INTERPRETED.md --> というコメントが必ず付され、後の監査時に「lexicon由来か、抽出由来か」を識別できる。
連携の方向は creator → extractorの単方向である。
extractor側からcreatorを呼ぶ経路は存在しない。
これはextractorを「ライブラリ素材を生成する独立ユーティリティ」として保つための判断である。
extractorはcreatorの存在を知らないままで動作し続ける。

 3.5.3 ユーザー判断を介在させる経路
Step 9の最も重要な設計判断は、AIが勝手にextractorを呼び出さない点にある。
発動条件に該当しても、Claudeはまずユーザーに提案する。
URLもユーザーから受け取る。
ClaudeがAIの記憶ベースでURLを捏造することは、SKILL.mdの extractor-handoff.md で明示的に禁止されている。
この設計の意図は、AIが「ユーザーの代わりに考える」のではなく、「ユーザーの判断を引き出す」ように振る舞わせることである。
「Apple風」と書いたユーザーが本当にApple公式サイトの抽出を望むのか、それとも別のサイトを想定していたのか、それともlexicon内の妥協で十分なのか ― これはユーザーにしか判断できない。
加えて、Step 9の発動には1セッション1回までという暴走防止ルールがある。
1サイト抽出してまだ不足を感じても、design-creatorから再オファーは行わない。
ユーザーが自分から /design-extract を呼ぶ形に任せる。
AIが連続的に外部リソースを取得し続ける動作を仕組みとして防止している。


 3.6 設計判断と構造的欠陥の対応関係

 3.6.1 対応マップ
本章で論じた5つの設計判断が、第2章で提示した4つの構造的欠陥にどう対応するかを整理する。



構造的欠陥
本ツールキットの応答




(1) 動きの層を記述する領域の不在
Animations拡張セクション(5サブセクション構成) + lexicon/animations.mdによる語彙固定


(2) 観測と推測を明示的に区別する仕組みの欠如

抽出側: VANILLA / INTERPRETEDの二段モデル / 生成側: lexicon厳守 + [要確認] マーカー


(3) 題材への事前知識が観測を汚染する現象への脆弱性
VANILLAの独立性による汚染の隔離 + lexiconの有限性による即興抑制 + Step 9のユーザー判断介在


(4) 利用者が任意のサイトの実態を歪めずに抽出する手段の不在
design-extractorスキル(Playwright + JSシグネチャ判定 + behavior-log + [未取得] 運用)



特に欠陥 (2)(3) に対しては、抽出側と生成側の双方で異なる実装を持つ。
同じ思想を、観測対象がある場面とない場面の両方で具体化していることが、本ツールキットの構造的特徴である。

 3.6.2 残される課題
一方、本ツールキットの設計にも現状では解決できていない課題がある。
主要なものを列挙する。
第一に、INTERPRETED層の解釈の質は、現状ではClaudeの解釈能力に依存する。
VANILLA.mdを渡しても、Claudeがtoneやstrengthを書き間違える可能性はある。
この問題は、複数のAIに同じINTERPRETEDを生成させて比較する等の方法で緩和できるが、本ツールキットの現段階では十分に体系化されていない。
第二に、JSシグネチャ判定は既知のライブラリに対してのみ有効である。
新しいライブラリや、自社開発のアニメーション実装は、シグネチャ辞書に追加しない限り判定できない。
辞書のメンテナンスは継続的な作業となる。
第三に、Bot検知が強いサイトは現状でも取得できない。
Akamai / Cloudflareの一部保護下にあるサイトは、Firefoxフォールバックでも取得できない。
これはサイト側の防御であり、本ツールキット側から根本的に解決する手段はない。
第四に、lexiconの網羅性は時間とともに陳腐化する。
新しいデザイントレンドが登場するたびに、辞書を拡張する必要がある。
これはStep 9の補助抽出オファーで部分的に補完できるが、根本的にはコミュニティによる継続的な更新が望ましい。
MITライセンスでの公開は、この更新を外部から受け入れる前提に立っている。
第五に、題材への先入観の完全な排除は不可能である。
VANILLAの独立性によりINTERPRETED層への汚染の隔離はできるが、ClaudeにINTERPRETEDを書かせる段階で、Claudeの事前知識が介入することは避けがたい。
本ツールキットでは「INTERPRETEDはVANILLAにある値しか使用してはならない」という制約でこれを緩和しているが、解釈の語彙自体(「celestial」「elegant」等)はClaudeの訓練データに依存する。
これらの課題は、本ツールキットの設計そのものの欠陥ではなく、AIを用いた抽出・生成というアプローチに内在する限界として理解する必要がある。
完全な解決は本ツールキットの射程を超える。


 3.7 本章のまとめ
本章では、第2章で提示した4つの構造的欠陥に対する本ツールキットの設計判断を論じた。
中心的な思想は、「観測と推測を明示的に分離する」ことを、抽出と生成の両側で異なる形で実装することであった。


抽出側(design-extractor): VANILLA(観測のみ) / INTERPRETED(解釈のみ)の二段モデル

生成側(design-creator): lexicon(語彙の固定)+ patterns(組み合わせの経験則)+ [要確認](保留の明示)

これに加えて ―

Animations拡張セクションが、欠陥 (1)「動きの層の記述領域の不在」に応答する
design-extractorスキル(Playwright + JSシグネチャ + behavior-log + [未取得] 運用)が、欠陥 (4)「利用者の自己抽出能力の不在」に応答する
Step 9補助抽出オファーが、抽出と生成を単方向で連携させ、lexiconの有限性を救済する

これらの設計判断は、個別の技術的工夫の集積ではなく、第2章で観察された現在のDESIGN.md生成パラダイムの構造的問題への、体系的な応答として互いに連関している。
advanced-design-mdの位置づけを、第1章・第2章との関係において改めて整理しておく。
第1章で記録したX上の熱狂は「どんなウェブサイトでもスキャンして瞬時に再構築できる」「誰でもプロデザイナーになれる」という言説を生んだ。
第2章での検証はこの言説と実態との間の距離を明らかにした。
本ツールキットは、その距離を埋める一つの試みである。
世間の熱狂が約束したものを、ある個人が自身の手で、部分的にではあれ、実現しようとした応答として位置づけられる。
完全な実装ではない。
ただし、熱狂が描いた問い ― AIに対してデザインを正確に言葉で渡せるか ― に対する、一つの具体的な答えである。
同時に、本ツールキットの設計にも残される課題がある。
解釈の質・シグネチャ辞書のメンテナンス・Bot検知への対応限界・lexiconの陳腐化・題材への先入観の完全排除の不可能性 ― これらはAIを用いた抽出・生成というアプローチそのものが持つ限界である。
本ツールキットをMITライセンスで配布する判断は、これらの限界に対するもう一つの応答である ― 完全な解決は単一の作者によっては成し得ないため、外部からの拡張・改修・批評を受け入れる前提に立つ。
advanced-design-mdは到達点ではなく、出発点であることをここに明記しておく。


 参考文献

TechCrunch (2025). Stitch is Google's AI-powered tool to help design apps. https://techcrunch.com/2025/05/20/google-launches-stitch-an-ai-powered-tool-to-help-design-apps/

Google Developers Blog (2025). From idea to app: Introducing Stitch, a new way to design UIs. https://developers.googleblog.com/stitch-a-new-way-to-design-uis/

Tech Insider (2026). Google Stitch AI: Vibe Design and 5-Screen Canvas. https://tech-insider.org/google-stitch-ai-design-tool-march-2026-update/

Google Blog (2026). Design UI using AI with Stitch from Google Labs. https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/

AI Business (2026). Google's Stitch and the Shift in AI-Driven Development. https://aibusiness.com/generative-ai/google-s-stitch-and-ai-driven-development

Neowin (2026). Google updates Stitch with 'vibe design' and infinite AI canvas. https://www.neowin.net/news/google-updates-stitch-with-vibe-design-and-infinite-ai-canvas/

aipedia.wiki (2026). Google Stitch: Features, Pricing & Review. https://aipedia.wiki/tools/google-stitch/

Medium - fernandocomet (2026). Google makes DESIGN.md open source on its way to become a industry standard. https://medium.com/design-bootcamp/google-makes-design-md-open-source-on-its-way-to-become-a-industry-standard-16119f2368dd

Google Labs Blog (2026). Stitch's DESIGN.md format is now open-source so you can use it across platforms. https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/

google-labs-code (2026). design.md: A format specification for describing a visual identity to coding agents. GitHub. https://github.com/google-labs-code/design.md

Pillitteri, P. (2026). Google Stitch Open-Sources DESIGN.md: The Spec That Makes AI Agents Consistent With Your Brand. https://pasqualepillitteri.it/en/news/1251/google-stitch-design-md-open-source-spec-2026

GitHub Topics: design-md. https://github.com/topics/design-md

mindwiredai (2026). DESIGN.md Is Now Open Source: Google's New File Format That Makes AI Build Your Brand Correctly. https://mindwiredai.com/2026/04/23/design-md-is-now-open-source-googles-new-file-format-that-makes-ai-build-your-brand-correctly/

google-labs-code/design.md Releases v0.1.1 (2026-04-21). https://github.com/google-labs-code/design.md/releases

google-labs-code (2026). stitch-skills: A library of Agent Skills designed to work with the Stitch MCP server. GitHub. https://github.com/google-labs-code/stitch-skills

Awesome Agents (2026). DESIGN.md Goes Open Source - AI Agents Get a Style Sheet. https://awesomeagents.ai/news/google-design-md-open-source-spec/

anthropics/skills Issue #1008 (2026). frontend-design: consider consuming/producing DESIGN.md per Google Labs open spec. GitHub. https://github.com/anthropics/skills/issues/1008

---

## 9. [Opus4.7の登場により、Claude Codeの開発者と公式が「これはもうやめろ」と言い始めた6つのこと - Qiita](https://qiita.com/ot12/items/06420caf41a34a910c53)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/12
- **AI要約**:
  Opus 4.7への刷新に伴い、指示を細かく出す『ペアプロ型』から目標完結型の『委譲型』への転換が必要
  Effortレベルはmaxではなくxhighが推奨され、過学習を防ぐ設計と自律実行性能の向上が図られた
  Stop Hookを利用した自動テスト連携やAuto Mode導入による、完全自律実行の最適化手法を提示
- **今読む理由**: 4.6以前の「細かく指示する」手法が4.7では逆効果になるため、プロンプト設計の即時修正が必要です。また、APIの破壊的変更や検証ループ自動化の具体的コード（hooks設定）が含まれており、開発効率に直結します。
- **タグ**: #Claude Code, #AI駆動開発, #プロンプトエンジニアリング, #Anthropic, #自動化パイプライン

### 本文
2026年4月16日、AnthropicがClaude Opus 4.7をリリースしました。
同時に公式ブログ「Best Practices for Using Claude Opus 4.7 with Claude Code」が公開され、Claude Code作者のBoris CherneyもXで「6つの新技」を投下しています。
両方を通してAnthropic公式が言っているのは「これまでのClaude Codeの使い方は、今日でやめろ」です。
4.6までは正解だった作法が、4.7では逆効果になることもあるようです
↓Claud CodeはもはやただのAIコーディングツールではなく、誰もがアプリで稼げるようになる収益化ツールです！
よければこちらのツイートも見てみてください！


「ペアプロ（細かく指示する）」のはもうやめろ

4.6までの「細かく指示するほど賢く動く」という感覚は、4.7では逆に性能を下げます。公式ブログの冒頭で明言されています。

"Treat Claude more like a capable engineer you're delegating to than a pair programmer you're guiding line by line."
（一行ずつ指導するペアプログラマー相手ではなく、任せられるエンジニアとして扱え）

4.6までは、「プロンプトを送る」→「返ってきたコードを見て修正を出す」→「また返ってきたコードを見て…」という往復型が標準でした。4.7はこの前提を捨てています。
初回プロンプトに Goal（目的）／Constraints（制約）／Acceptance criteria（完了条件） を全部入れる。そのあと途中介入を減らす方が、4.7は自律実行の性能を発揮します。

設計思想の変化
4.6と4.7の違いを、公式は3点で説明しています。

ツール呼び出しより 推論を優先する

Subagentの呼び出しに より慎重になる（自己完結できるなら呼ばない）

長期自律実行 の性能が向上

ここまで来ると「細かく指示するほど賢く動く」という従来の感覚は逆効果になります。指示が細かいほど、自律判断の余地が減るからです。Claude Codeでの正解プロンプト様式は、4.7を境に180度逆になったと言っていいです。

「Effort Levelをmaxに常用する」のはもうやめろ

「一番上のmaxが一番賢い」は、今日で捨ててください。Claude CodeのEffort Levelは5段階、公式が指定する推奨デフォルトはmaxではなくxhighです。



Level
公式の使いどころ




low
短く、レイテンシ重視、知性不要


medium
コスト重視で知性を多少犠牲にできる


high
バランス型


xhigh
Opus 4.7の推奨デフォルト。大半のコーディングで最良


max
要求の高いタスク用。overthinking傾向あり



注目すべきは max の扱い。「上のレベルほど賢い」は正しくありません。公式は max について「overthinking傾向がある」と明記しています。考えすぎで遅くなる、逆に精度が落ちるケースがあるということです。Borisも「ほぼ全タスクで xhigh、最難関でだけ max」と投稿しています。

仕様上の重要な変更
以下は Anthropic公式API Docs「What's new in Claude Opus 4.7」 の "Breaking changes" 節に明記されています。Messages API限定で、Claude Managed Agents使用時は非該当です。

fixed thinking budget モードは非サポート（thinking: {type: "enabled", budget_tokens: N} は400エラー）
adaptive thinking は デフォルトOFF。thinking: {type: "adaptive"} を明示する必要あり

temperature / top_p / top_k の非デフォルト値も400エラーになる（プロンプトで挙動制御する方針）
トークナイザー刷新：同じテキストで1.0〜1.35倍のトークン数になり得る。max_tokens にヘッドルームを持たせる
思考内容（thinking content）はデフォルトで省略。必要なら display: "summarized" で戻す

調整手段は effort（Claude Codeなら /effort）と task_budget（beta）の2系統に集約されています。
Claude Codeのバージョン要件も変わりました、バージョンが新しくなければ Opus 4.7 を呼び出せません。古いバージョンのままでは新モデルの恩恵を受けられないので、まず更新を確認してください。
claude --version
# 2.1.110 以下なら更新


「--dangerously-skip-permissions」を常用するのはもうやめろ
--dangerously-skip-permissions を常用する運用は、2026年4月時点で時代遅れです。Borisが同日Xで出した「6つの新技」のうち、権限プロンプト撲滅系が2つ、これを安全に置き換えます。

Auto Mode

Claude Codeを使っていて誰もが経験する、「Allow?」の連打問題。これを解決するのが Auto Mode です。
起動は単純です。
CLIで Shift+Tab、または Desktop/VSCodeのドロップダウンで選択
Max / Team / Enterprise プラン限定の Research Preview 機能ですが、--dangerously-skip-permissions の正しい代替として位置づけられています。

/fewer-permission-prompts


同時に追加された新しいSkillです。

セッション履歴を分析し、許可リストの追加候補を提案

何度も同じコマンドを承認している状態を検知
提案を受け入れると、次から自動通過

/permissions で手動ホワイトリスト化していた作業を、半自動化してくれる機能です。Auto Modeが使えない Pro プランでも利用できます。

プラン別の可用性



機能
Pro
Max
Team
Enterprise




Auto Mode
×
○
○
○


/fewer-permission-prompts
○
○
○
○


/permissions
○
○
○
○



上記の通り、Auto Mode が安全かつ同等の体験を提供します。

「長時間セッションを横で見守り続ける」のはもうやめろ
4.7は自律実行が長くなります。横で1行ずつ見守り続ける運用はやめて、結果だけ受け取る体制に切り替えてください。Boris本人がXで紹介したUI側の2つがこれを支援します。

Focus Mode（/focus）

/focus

最終結果のみを表示し、途中の思考・ツール使用ログを隠すモードです。/focus off で元に戻せます。委譲モデルと相性がよく、「任せたら結果だけ見る」という使い方を支えます。

Recaps

長時間セッションから復帰したとき、サマリーを自動表示する機能です。Borisは「エージェントが何をしたか、次は何をするかを準備する」UIとして紹介しています。/loop で何時間も回していたタスクに戻っても、「何をどこまでやったか」を即座に把握できます。
この2つは 4.7の長期自律実行が前提になったUIです。Anthropicは「見守る必要がない」ことを可視化で支援する、というスタンスを取っています。

「Subagentを毎回呼ぶ」のはもうやめろ

4.6までの「積極的にsubagentを切れ」は捨ててください。4.7の公式ブログは真逆のことを書いています。

"More judicious about when to delegate work to subagents."
（サブエージェントへの委譲タイミングには、より慎重になること）


いつ明示的に呼ぶか
公式が明示している基準は2つだけです。


fanning out across files（複数ファイルへの並列作業）

independent items（独立した複数タスク）

それ以外は Claude 自身が判断します。従来のように「subagent使って」と毎回指示を入れると、逆に性能が下がるケースが出てきます。4.7は自分で判断する前提で訓練されているからです。

「検証機構なしで任せる」のはもうやめろ

6つの「やめろ」の最後、そして公式が最も効果の高い施策と明記しているのがこれです。

"Include tests, screenshots, or expected outputs so Claude can check itself. This is the single highest-leverage thing you can do."
（テスト・スクリーンショット・期待出力を与えてClaude自身が検証できるようにせよ。これが最も効果の高い施策）

モデルが賢くなっても、検証機構を渡さない限り品質は上がりません。

実装パターン
バックエンド：テストスイートを Stop Hook に繋ぐ。npm test が通るまで Claude が自動でもう1周する構成です。.claude/settings.json にこう書きます。
{
  "hooks": {
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "npm test" }]
      }
    ]
  }
}

フロントエンド：Playwright / Puppeteer で E2E、またはChrome拡張。Boris本人はChrome拡張を「毎回使う」と発言しています。

4.7固有の事情
4.7は自律実行が長くなるので、途中で誰も見ていない時間が増えます。検証機構がなければ、誤った方向で走り続けるリスクも比例して上がります。
推奨される組み合わせは、xhigh × 長期自律 × 検証機構の3点セット。品質が上がるかどうかは、モデルの差ではなく検証機構を渡しているかどうかで決まります。

今日やる実務設定チェックリスト
ここまでの同日公開内容を、設定項目に落とし込みます。
1. Claude Code を v2.1.111 以上に更新
claude --version

2. モデルを Opus 4.7、Effort を xhigh に
/model opus
/effort xhigh

3. 初回プロンプトの型を整える
Goal: <達成したいこと>
Constraints: <守るべき制約>
Acceptance criteria: <完了の判定基準>

4. Verification Loop を組む

バックエンド：テストを Stop Hook に
フロントエンド：Playwright か Chrome拡張

5. Auto Mode を試す（Max以上）
claude --permission-mode auto

チェックボックスで整理するとこうなります。


Claude Code v2.1.111 以上を確認

Opus 1M context が有効（Max / Team / Enterprise なら自動適用）

Effort は xhigh をデフォルトに

初回プロンプトに Goal / Constraints / Acceptance criteria を一括提示する癖をつける

Stop Hook で検証機構を組む

/fewer-permission-prompts で許可リストを整理する


同日登場の他の見逃せない新機能
Opus 4.7 リリースと同時に入った、ベストプラクティス記事の本筋ではないものの実務で効く新機能を3つ。

/ultrareview コマンド（Claude Code）
4.7 にあわせて Claude Code に追加されたレビュー用コマンド。複数視点でコードを厳しめに点検するモードで、PR前の最終チェックに向きます。

Task budgets（beta）
エージェントループ全体のトークン予算をモデルに 目安として 伝えられる新機能です。max_tokens が単発リクエストの上限を設ける仕組みなのに対し、task budget はエージェントが自分でペース配分するための助言的上限です。
response = client.beta.messages.create(
    model="claude-opus-4-7",
    output_config={
        "effort": "high",
        "task_budget": {"type": "tokens", "total": 128000},
    },
    betas=["task-budgets-2026-03-13"],
    ...
)


高解像度画像サポート
画像の最大解像度が 2576px / 3.75MP に拡張されました（従来は1568px / 1.15MP）。スクリーンショット解析・ドキュメント理解・computer useでの改善が期待できます。加えて、モデルの座標系と実ピクセルが1:1に揃ったので、座標変換の計算が不要になっています。

まとめ
2026年4月16日に Anthropic が公式ブログで出したベストプラクティスと、Claude Code 作者 Boris Cherny が同日にXで投下した6つの新技は、合わせてこれまでのClaude Codeの使い方は今日で卒業しろの一点に収束します。
ペアプロ、max常用、--dangerously-skip-permissions、Subagent毎回呼び出し、検証機構なしの自律実行、長時間セッションの横付き見守り。4.6までは正解だった6つが、4.7では全部「やめろ」に変わりました。
4.7の真価は、途中で介入しないことで初めて出てきます。6つの旧作法をやめて、任せる前提で設定を整えてみてください。
↓Claud CodeはもはやただのAIコーディングツールではなく、誰もがアプリで稼げるようになる収益化ツールです！
よければこちらのツイートも見てみてください！


参考

Best Practices for Using Claude Opus 4.7 with Claude Code（Anthropic公式、2026-04-16）
What's new in Claude Opus 4.7（Anthropic公式 API Docs）
Introducing Claude Opus 4.7（Anthropic公式発表、2026-04-16）
Boris Cherny「6つの新技」X投稿（2026-04-16）
Boris Cherny 6 tips アーカイブ（GitHub）
Claude Code 公式ドキュメント

---

## 10. [Claude Code でスマホアプリ個人開発を加速する実践ガイド【React Native / Expo】 #Firebase - Qiita](https://qiita.com/similarmetal/items/9847e0b0b85024a29179)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/14
- **AI要約**:
  CLAUDE.mdを活用したプロジェクト規約の自動定義により、生成AIの回答精度と一貫性を向上させる手法
  tasksフォルダとMarkdownを用いた自律実行システムを構築し、AIによるセッション跨ぎの進捗管理を実現
  独自のスラッシュコマンド（.claude/commands/）を実装し、定型コード生成やセキュリティレビューを標準化
- **今読む理由**: AI駆動開発におけるエージェントの自律性を高めるための、具体的かつ再利用可能な設定ファイル構成（CLAUDE.mdやカスタムコマンド）が網羅されており、開発効率を劇的に改善できるため。
- **タグ**: #Claude Code, #AI駆動開発, #自動化パイプライン, #React Native, #生産性向上

### 本文
はじめに
Claude Code（以下 CC）を使ってスマホアプリ（React Native + Expo）を個人開発した経験から、「CCをどう使えばスマホアプリ開発が加速するか」の実践的なノウハウをまとめます。
対象読者は React Native の経験がある方で、Claude Code を開発に取り入れたい方 です。CC の基本的な使い方は既知の前提で、スマホアプリ開発特有の活用パターンに絞って解説します。
環境は Windows + VSCode + Claude Code 拡張 ですが、Mac でもほぼ同じ考え方が使えます。


なぜ CC はスマホアプリ開発と相性がいいのか
Web 開発と比較したとき、React Native アプリは「何をどこに置くか」のルールが明確です。
src/hooks/      ← Firebaseデータ取得・ビジネスロジック
src/screens/    ← 画面コンポーネント
src/components/ ← 再利用UIパーツ
src/store/      ← 状態管理（Zustand等）
functions/src/  ← Cloud Functions（バックエンド処理）

この構造の明確さが CC への指示精度を大幅に上げます。
# 曖昧な指示（精度が低い）
「タスク管理の機能を作って」

# 具体的な指示（精度が高い）
「src/hooks/useTasks.ts を作成してください。
 onSnapshot でリアルタイム取得し、
 loading / error / data の3状態を返してください」

「どこに作るか」を明示するだけで、CC が余計なリファクタリングをしなくなります。


1. CLAUDE.md をプロジェクト憲法として使う
CC はプロジェクトルートの CLAUDE.md をセッション開始時に自動で読み込みます。ここにプロジェクトのルールを書いておくことで、毎回同じことを説明しなくても CC がプロジェクトの文脈を理解した状態で作業してくれます。

書くべき内容
# MyApp — Claude Code プロジェクトルール

## 技術スタック
React Native (Expo Managed Workflow)
TypeScript strict: true 必須
Zustand — 状態管理
Firebase SDK (modular v9+)

## ファイル配置ルール
| 作るもの           | 置き場所                    |
|------------------|---------------------------|
| 画面コンポーネント | src/screens/{role}/        |
| データ取得hook     | src/hooks/useXxx.ts        |
| バックエンド処理   | functions/src/             |

## セキュリティ必須事項（違反厳禁）
⛔ API Key をクライアントコードに書かない
⛔ 子どものデータをクライアントから直接 Firestore に書き込まない
⛔ any 型の使用禁止

## Gitルール
- デフォルトブランチは main（master 禁止）
- Conventional Commits 形式（feat/fix/chore等）


書かない方がいい内容

秘密情報（API Key・プロジェクトID等）
頻繁に変わる情報（バージョン番号等）
長すぎる説明（CC のコンテキストを圧迫する）


ポイント：セキュリティルールは CLAUDE.md に書く
セキュリティ上の制約（「子どものデータはクライアントから直接書き込まない」等）を CLAUDE.md に明記しておくと、CC が自動でセキュアなコードを生成してくれます。書いていないと、CC は最短経路（クライアントから直接書き込む）を選んでしまいます。


2. tasks/ フォルダによる自律実行システム

CC で開発を進めるときの最大の悩み
長期開発で CC を使っていると、必ずこの問題にぶつかります。


セッションをまたぐと文脈がリセットされる → 毎回「今どこまで進んでいるか」を説明しなければならない

複数タスクの管理が煩雑 → 「次は何をすればいいか」を人間が管理しなければならない

この問題を解決するのが tasks/ フォルダによる自律実行システム です。

仕組み
プロジェクト内に tasks/ フォルダを作り、フェーズ・タスクごとにファイルを置きます。
tasks/
├── ph0/
│   └── STATUS.md       ← 完了済みフェーズの記録
├── ph1/
│   ├── T101_auth.md    ← 認証実装タスク
│   ├── T102_profile.md ← プロフィール実装タスク
│   └── T103_ai.md      ← AI機能実装タスク
└── ph2/
    ├── T201_payment.md
    └── ...

各タスクファイルの構造：
# T101 — 認証基盤

status: pending
phase: ph1
priority: CRITICAL
cc_mode: 全自動

## このタスクで作るもの
- `src/api/auth.ts`（新規）
- `src/store/authStore.ts`（新規）
- `src/hooks/useAuth.ts`（新規）

## CC への指示（そのまま実行する）
認証基盤を実装してください。

src/api/auth.ts: signInWithGoogle, signOut, onAuthStateChanged
src/store/authStore.ts: Zustand（user, isAuthenticated, isLoading）
src/hooks/useAuth.ts: authStore ラップ・各種チェック込み

## 完了後に更新
status: done と書き換えて次のタスクへ進む


CLAUDE.md に自律実行ルールを追記する
## 自律実行モード

**起動時に必ず以下を実行してください：**

1. `tasks/` フォルダを読み込む
2. `status: pending` のうち最初のタスクを探す
3. そのタスクの内容をユーザーに提示して「実行しますか？(Y/N)」と確認する
4. Y なら実行 → 完了後に `status: done` を更新 → 次のタスクへ
5. N なら次のタスクを提示する
6. 「現在地を確認して」と言われたら tasks/ を読んで進捗を一覧表示する


使い方
CC を起動したらこれだけ言えば動きます：
tasks/ フォルダを読んで、次に実行するタスクを教えてください

あとは Y/N で判断するだけ。CC が自分でタスクファイルを読み、実装し、status: done に更新して次へ進みます。

このシステムの最大のメリット
「今どこまで進んでいるか」を CC が自分で把握できる点です。
セッションをまたいでも、CC が tasks/ を読めば現在地を自分で判断できます。人間が毎回説明する必要がありません。また、実装済みのファイルとタスクの対応が明確になるため、「このファイルはどのタスクで作ったものか」が追跡できます。


3. スラッシュコマンドで指示を標準化する
.claude/commands/ フォルダにファイルを置くと、CC 内で /project:コマンド名 として呼び出せます。
.claude/commands/
├── gen-hook.md        → /project:gen-hook
├── gen-screen.md      → /project:gen-screen
├── gen-function.md    → /project:gen-function
├── gen-test.md        → /project:gen-test
├── review-security.md → /project:review-security
└── review-coppa.md    → /project:review-coppa


gen-hook.md の例
# /project:gen-hook — カスタムhook生成

以下のルールに従ってカスタムhookを生成してください。

## 生成ルール
1. `src/hooks/` に配置する
2. ファイル名は `use{機能名}.ts`
3. TypeScript strict で記述する
4. loading / error / data の3状態を返す
5. useEffect のクリーンアップを必ず実装する

## テンプレート
```typescript
export function use{機能名}(): Use{機能名}Return {
  const [data, setData] = useState<{型} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(/* ... */, 
      (snapshot) => { setData(snapshot.data()); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
    return () => unsubscribe(); // クリーンアップ必須
  }, []);

  return { data, loading, error };
}


生成してほしい hook の仕様を入力してください
$ARGUMENTS

使い方：


/project:gen-hook タスク一覧を取得する useTasks hook

スラッシュコマンドの最大の効果は **「いつも同じルールで生成される」** ことです。プロジェクトのコーディング規約を毎回指示しなくても、コマンド側に組み込まれているため一貫性が保たれます。

### review-security.md の例

```markdown
# /project:review-security — セキュリティレビュー

以下のチェックリストで提示されたコードをレビューしてください。

## チェック項目
- [ ] API Key・シークレットがクライアントコードに含まれていないか
- [ ] 子どものデータをクライアントから直接 write していないか
- [ ] ポイント操作に Firestore Transaction が使われているか
- [ ] 認証チェックが Cloud Functions に実装されているか
- [ ] .env ファイルが Git 管理外になっているか

## レビュー対象コード
$ARGUMENTS

コミット前に /project:review-security を実行するだけで、毎回同じチェックが走ります。


4. CCへの効果的な指示の書き方

良い指示の3要素
① 作成先のパスを明示する
# ❌ 悪い例
「タスク管理のhookを作って」

# ✅ 良い例
「src/hooks/useTasks.ts を作成してください」

② 参照すべきファイルを明示する
# ✅ 良い例
「src/hooks/useTasks.ts を作成してください。
 src/types/firestore.ts の Task 型を使ってください。
 src/constants/limits.ts の FREE_LIMITS.MAX_TASKS を参照してください」

③ 制約を明示する
# ✅ 良い例
「functions/src/tasksManager.ts に Cloud Function として実装してください。
 クライアントから直接 Firestore に書き込まないこと。
 TypeScript strict で記述し、any 型は使用しないこと」


「全部一気に作って」は使い方次第
開発が軌道に乗ったら CC に一気に走らせることもできます：
tasks/ フォルダの未完了タスクを全て実装してください。
全タスク完了後にサマリーを表示してください。

ただし コミット前には必ず人間がレビューする ことが前提です。型チェックとセキュリティレビューは CC に任せてはいけません。


5. アンチパターン：やってはいけないこと

① セキュリティを CC に任せっぱなしにする
CC はセキュアなコードを生成しようとしますが、人間のレビューは必須です。特にスマホアプリでは以下を必ず人間が確認してください：
# コミット前の必須チェック
npx tsc --noEmit        # 型エラー 0 件
npm run lint            # ESLint エラー 0 件
npm run test:unit       # テスト PASS

さらに以下を目視確認：

API Key がクライアントコードに含まれていないか
ネイティブモジュール（AdMob 等）の初期化に try-catch があるか


② コミットせずにセッションをまたぐ
CC が生成したコードはこまめにコミットしてください。
# タスク完了のたびにコミット
git add -A
git commit -m "feat: T101 認証基盤実装"

コミットしておけば git reset --hard でいつでも戻れます。CC が間違ったコードを生成しても安心です。

③ Expo Go で開発を続ける
React Native でネイティブモジュール（AdMob・RevenueCat・通知等）を使う場合、Expo Go では動きません。最初から Development Build を使うことを強くお勧めします。
# Development Build を一度作ればあとはホットリロードで開発できる
eas build --profile development --platform android


Expo Go で開発を始めてしまうと、後でネイティブモジュールを追加したときに Expo Go では動かないことに気づき、Development Build に移行する手間が発生します。最初から Development Build で始めることで、この問題を回避できます。


④ EAS Build をリビルドしすぎる
EAS Build の無料枠は 月30ビルドまで です。JS のコード変更だけであれば OTA Update で対応できます。
リビルドが必要な変更
  → app.json の変更（plugin 設定・権限等）
  → ネイティブモジュールの追加・削除

リビルド不要（OTA Update で対応）
  → ソースコードの変更（ほとんどの場合これ）
  → 画面・ロジックの変更



6. まとめ：CC を使うと何が変わるか
今回の開発で得た実感として、CC を使うことで変わったのは以下の点です：
変わること

フェーズ単位の実装スピードが大幅に上がる
定型的なコード（hook・テスト等）の品質が安定する
セキュリティチェックの抜け漏れが減る

変わらないこと

アーキテクチャの設計判断は人間がする
セキュリティのレビューは人間がする
デバッグ・クラッシュ対応は人間がする

CC は「優秀なペアプログラマー」です。最終的な判断は常に人間が行う前提で使うのがベストプラクティスです。


おわりに
この記事で紹介した仕組み（CLAUDE.md・tasks/・スラッシュコマンド）は、スマホアプリ開発に限らず、どんなプロジェクトにも応用できます。特に tasks/ フォルダによる自律実行システム は、長期プロジェクトでの CC 活用において最も効果を実感した手法です。
次の記事では Windows 環境での Development Build 構築とクラッシュデバッグのベストプラクティス を解説します。

この記事は実際のスマホアプリ個人開発の経験をもとに書いています。プロジェクト固有の内容（アプリ名・API Key 等）はすべて除外しています。


補足：なぜ React Native / Expo を選んだのか
この記事を書くにあたって「なぜ React Native を選んだのか」という疑問が出たので、正直に振り返ります。技術選定の判断と、実際に開発してみた結果の乖離は、次に同じ構成で始める方の参考になると思います。

選定理由
① iOS / Android 両対応を1つのコードベースで実現できる
個人開発でプラットフォームごとにコードを書くのは現実的ではありません。React Native と Flutter が主な選択肢になりますが、TypeScript で書けること・Web 開発の知識が活きることから React Native を選びました。
② Expo + EAS Build で Windows から iOS ビルドができる
Mac を持っていなくても iOS 向けの配布ビルドが作れる点は大きな決め手でした。EAS Build がクラウドでビルドしてくれるため、Windows 環境でも App Store 申請まで完結します。
③ Firebase との相性が良い
Firebase SDK が React Native 向けにしっかり整備されており、Auth・Firestore・Cloud Functions・FCM を一気通貫で使えます。バックエンドを別途用意する必要がないため、個人開発のスピードが上がります。
④ CC（Claude Code）との相性
React Native はファイル構造のルールが明確なため、CC への指示が書きやすいです。「src/hooks/useXxx.ts を作成して」という指示で CC が迷わず実装できます。この点は開発を通じて実感しました。


実際に開発してみて発覚したデメリット
選定時には見えていなかった問題が、開発を進める中で出てきました。
① Expo Go ではネイティブモジュールが動かない
AdMob・RevenueCat・プッシュ通知など、ネイティブモジュールを使う機能は Expo Go では動作しません。開発初期に Expo Go で確認しようとして詰まりました。
Expo Go で動く       → JS のみの機能（画面・ロジック等）
Expo Go で動かない  → ネイティブモジュール全般
                       AdMob / RevenueCat / FCM / etc.

最初から Development Build を使うべきでした。 Expo Go は「React Native を体験する」ためのツールであり、本格的なアプリ開発には向いていません。
② peer dependency の競合が多い
複数のネイティブモジュールを組み合わせると peer dependency の競合が頻発します。
# インストール時にエラーが出る
npm install react-native-google-mobile-ads

# 解決策：.npmrc にこれを書く
legacy-peer-deps=true

この設定をローカルの npm install コマンドのオプションではなく .npmrc ファイルに書いておかないと、EAS Build（クラウド環境）でも同じエラーが発生します。
③ Firebase SDK の ESM 問題
Firebase SDK が .mjs ファイルを使用しているため、Metro Bundler（React Native のバンドラー）がデフォルトでは解決できないケースがあります。
// metro.config.js に追加が必要
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('mjs');
module.exports = config;

④ ネイティブモジュールのクラッシュは JS より先に起きる
最も時間を取られたのがこれでした。AdMob の App ID を app.json に設定し忘れると、アプリは Java レイヤーで即座にクラッシュします。JS（React Native）すら起動しないため、ターミナルにエラーが出ません。
# Android ログを取得して原因を特定
adb logcat | findstr "kidsreward|crash|FATAL"

# 出力例
FATAL EXCEPTION: main
Unable to get provider com.google.android.gms.ads.MobileAdsInitProvider:
java.lang.IllegalStateException

adb logcat でログを取得して初めて原因が特定できました。ターミナルにエラーが出ないクラッシュは adb logcat で確認する というのを最初から知っていればかなりの時間を節約できました。


Flutter と比較してどうか
後から振り返ると Flutter も十分な選択肢でした。




React Native + Expo
Flutter




言語
TypeScript（Web経験者に馴染みやすい）
Dart（学習コスト有）


ネイティブモジュール
peer dependency 競合が多い
pub.dev で比較的安定


Firebase
SDK が整備されている
FlutterFire が整備されている


Windows でのiOSビルド
EAS Build で可能
Codemagic 等で可能


CCとの相性
良い（構造が明確）
良い（構造が明確）



TypeScript の資産を活かしたい・Web 開発経験者が多いチームなら React Native。パフォーマンスやネイティブ品質を優先するなら Flutter、という判断になるかと思います。


まとめ：技術選定で後悔しないために
今回の経験から、スマホアプリ開発の技術選定で事前に確認すべきことをまとめます。
✅ 使いたいネイティブモジュールが Expo Managed Workflow で動くか確認する
✅ Development Build を最初から使う前提で計画する
✅ Windows 環境なら .npmrc に legacy-peer-deps=true を最初から書く
✅ firebase.json / app.json の plugin 設定を最初にまとめて設定する
✅ adb のパスを最初から通しておく

技術選定自体よりも、環境構築の初期設定を正しく行うことの方が、開発効率に大きく影響しました。

---

## 11. [Claude Codeのトークン消費を半減させる5フェーズ運用術](https://zenn.dev/yamato_snow/articles/8eff833984b842)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/14
- **AI要約**:
  CLAUDE.mdを200行以下に抑え、頻繁な/clearでコンテキストを最小化する運用術
  サブエージェントや/btwを活用し、メインセッションのトークン消費を物理的に隔離する手法
  /effortによる思考コスト調整やプランモードの併用で、実装の二度手間と浪費を防止する具体策
- **今読む理由**: Claude Codeを開発に導入している場合、トークン上限による精度低下やコスト増を即座に改善できる具体的なコマンドとワークフローが網羅されているため。
- **タグ**: #Claude Code, #LLMコスト最適化, #AI駆動開発

### 本文
Claude Codeのトークン消費を劇的に減らすカギは、コンテキスト（会話の蓄積量）を小さく保つことです。
「それだけ？」と思うかもしれません。でもこの「小さく保つ」を実現するために、Claude Codeには専用の機能がいくつも用意されているんです。ほとんどの人がこれを知らないまま使っていて、結構もったいないことになっています。
この記事では、私が実際に運用しているトークン節約ワークフローを5つのフェーズに分けて解説します。
先に結論だけ言うと、タスクが変わったら /clear を打つ。これだけでかなり変わります。


 コンテキストウィンドウの仕組み

 コストはコンテキストサイズに比例する
ここが一番大事なポイントなんですが、Claude Codeのトークンコストは会話が蓄積されるほど、1メッセージあたりのコストが増えるという構造になっています。
公式ドキュメントによると、平均コストは1日あたり約6ドルで、90%のユーザーは12ドル以下に収まっています。月換算だとSonnet 4.6利用時で約100〜200ドルです。

※ これはClaude API利用者の場合の数値です。Claude MaxやProサブスクリプションの場合は利用料金がプランに含まれているため、直接的な課金額としては当てはまりません。ただし、トークン消費を抑えることでレート制限に余裕ができ、Claudeの回答精度も上がるという恩恵は同じです。

つまり、コンテキストを小さく保つ＝コスト削減であると同時に、精度向上でもある。一石二鳥の運用なんですよね。

 何がコンテキストを消費するのか
「具体的に何がコンテキストを食っているのか」をまとめます。



機能
ロードタイミング
コンテキストコスト




CLAUDE.md
セッション開始時に全文ロード
毎リクエストに含まれる（ここがデカい）


スキル
説明文のみ起動時にロード。使用時にフルロード
低い（使うまでは説明文だけ）


MCPサーバー
ツール名のみ起動時にロード。使用時にスキーマ展開
低い（使うまでは名前だけ）


サブエージェント
生成時に独立コンテキストで動作
メインセッションとは完全分離（0コスト）


フック
トリガー時に外部で実行
0コスト（コンテキストに入らない）



サブエージェントとフックが0コストなのは、意外と知られていないポイントです。


 Phase 1：セッション準備 — CLAUDE.mdを200行以下に保つ

 なぜ200行なのか
CLAUDE.mdはセッション開始時に全文が読み込まれて、毎リクエストに含まれます。
500行のCLAUDE.mdがあると、毎回数千トークンが無駄に消費されます。しかもCLAUDE.mdが長すぎると、Claudeが重要なルールを見落とすことまであります。
公式の推奨は200行以下です。

 CLAUDE.mdに残すもの vs スキルに移すもの



CLAUDE.mdに残す（毎回必要）
スキルに移す（必要時のみ）




ビルド・テストコマンド
デプロイ手順


コーディング規約（デフォルトと異なるもの）
API設計ガイドライン


Gitワークフロー（ブランチ名、コミットルール）
レビューチェックリスト


プロジェクト固有のアーキテクチャ決定
DBマイグレーション手順



スキルに移すと何が起きるかというと、/deploy みたいにコマンドで呼び出すまで一切コンテキストに入らなくなります。
呼び出した時だけ中身が読み込まれる。使い終わって /clear すれば、またコスト0に戻る。必要な時に必要なものだけ取り出す、という発想です。


 Phase 2：タスク開始 — モデル選択とプランモード

 モデルの使い分け



モデル
用途
コスト





Sonnet 4.6（デフォルト推奨）
大半のコーディングタスク
低い



Opus 4.6（必要な時だけ）
複雑なアーキテクチャ設計、マルチステップ推論
高い



Haiku 4.5（サブエージェント向け）
単純な調査・検索タスク
最も低い



/model コマンドで切り替えられます。迷ったらまずSonnet。それで解決しなかったらOpus。この「Sonnetファースト」の習慣が結構効きます。

 Extended Thinking（拡張思考）の調整
Extended Thinkingはデフォルトで有効になっていますが、出力トークンとして課金されます。
複雑なタスクでは深い推論が精度を上げるから有効のままでいい。でも簡単なバグ修正やリネーム程度なら、/effort で思考レベルを下げるとトークンを節約できます。
正直、このメリハリが一番地味に効くかもしれません。

 プランモードで「やり直し」を防ぐ
Shift+Tab でプランモードに入れます。
プランモードは、Claudeにコードを読ませて調査させるけど、変更はさせないモードです。
なぜこれが節約になるかというと、方向を間違えて実装→やり直しのパターンが最もトークンを無駄にするからです。プランモードで先に方針を確認してから実装に入ることで、無駄な実装を防げます。
ただし、タイポ修正やログ追加みたいな1行で説明できる変更にプランモードは不要です。何でもかんでもプランモードにすると逆に非効率なので、複雑なタスクの時だけ使いましょう。


 Phase 3：実行中 — コンテキストを小さく保つ

 サブエージェントに調査を委任する
これが最も効果的なトークン節約テクニックだと感じています。
サブエージェントとは、メインの会話とは別の独立したコンテキストで動くワーカーのことです。
たとえば「認証システムのコードを全部読んで理解して」とメインセッションで頼むと、数十ファイル分のコンテキストがメインにドーンと蓄積されてしまいます。
でもこう言い換えるだけで全然違います。
# 悪い例：メインセッションのコンテキストが膨張する
認証システムのコードを全部読んで理解して

# 良い例：サブエージェントで調査、要約だけがメインに返る
サブエージェントを使って、認証システムのトークンリフレッシュの仕組みを調査して
サブエージェントが独立したコンテキストで調査して、要約だけがメインに返ってくる。メインセッションのコンテキストは汚れません。
テスト実行やログ解析みたいな出力が大量になる作業も同じです。「サブエージェントでテストを実行して、失敗したものだけ報告して」と言うだけで済みます。

 /btw でサイドクエスチョン
作業中に「ちょっと確認したいだけ」って場面、ありませんか？
/btw このメソッドの引数の型は何？
/btw を使うと、オーバーレイで回答が表示されて会話履歴に一切入りません。コンテキストを汚さずにサッと確認できます。
地味ですが、これが積み重なると結構大きいんですよね。


 Phase 4：タスク切替 — /clear と /rename の活用

 タスク完了 → 次のタスクへ
ここが一番簡単で一番効果があるポイントです。
1. /rename oauth-migration    # セッションに名前をつける
2. /clear                     # コンテキストをリセット
3. 新しいタスクを開始          # クリーンなコンテキストで
古いコンテキストが残ったまま新しいタスクを始めると、関係ない情報に毎回トークンを消費してしまいます。/clear は最も簡単で最も効果的な節約手段です。
私は1つのタスクが完了するたびに /clear する習慣をつけています。不要なコンテキストを捨てる判断って、意外と大事なんです。

 セッションの再開
claude --continue    # 直前のセッションを再開
claude --resume      # 過去のセッション一覧から選択
/rename でつけた名前で探せるので、「oauth-migration」のようにわかりやすい名前をつけておきましょう。

 /compact でカスタム要約
/clear せずにコンテキストを圧縮したい場面もあります。
/compact コードの変更内容とAPIの使い方に集中して
指定した内容を重点的に残しつつ、それ以外を圧縮してくれます。CLAUDE.mdにcompact時の指示を書いておくこともできます。
# Compact instructions

When you are using compact, please focus on test output and code changes


 Phase 5：振り返り — コスト確認

 セッションのコスト確認
/cost
出力例：
Total cost:            $0.55
Total duration (API):  6m 19.7s
Total duration (wall): 6h 33m 10.2s
Total code changes:    0 lines added, 0 lines removed
注意点として、/cost はAPI利用者向けのコマンドです。Claude MaxやProサブスクリプションの場合は /stats で利用パターンを確認できます。
コンテキスト使用量をリアルタイムで見たい場合は、/statusline で常時表示の設定もできます。


 チートシート：場面別コマンド一覧



場面
コマンド
効果




タスク切替時
/clear
コンテキストリセット。最重要



セッションに名前
/rename 名前
後で /resume で探せる


モデル切替
/model
Sonnet ↔ Opus 切替


思考レベル調整
/effort
Extended Thinkingの予算調整


コンテキスト圧縮
/compact 指示
カスタム要約で圧縮


コスト確認

/cost（API用）or /stats（サブスク用）
セッションのトークン消費確認


消費内訳確認
/context
何がコンテキストを消費しているか


サイドクエスチョン
/btw 質問
履歴に残さず確認


プランモード
Shift+Tab
調査のみ、変更なし


巻き戻し
Esc×2 or /rewind

チェックポイントに戻る


MCP確認
/mcp
接続中のサーバーと消費量


セッション再開
claude --resume
過去セッションを選択





 よくある失敗パターンと対策

 1. 「キッチンシンク」セッション
1つのセッションであれこれやって、コンテキストが無関係な情報だらけになるパターン。私も最初これをやってしまっていました。
対策： タスクが変わったら必ず /clear。

 2. 修正ループの汚染
Claudeの出力が間違い→修正指示→まだ間違い→また修正...。コンテキストが失敗の履歴で汚染されていきます。
対策： 2回修正しても直らなければ /clear して、学んだことを含めた具体的なプロンプトで再スタート。清潔なコンテキストで再出発した方が、ぐちゃぐちゃのコンテキストで粘るより圧倒的に速いです。

 3. CLAUDE.mdの肥大化
500行超のCLAUDE.md。Claudeが重要なルールを見落としはじめます。
対策： 「このルールを削除してもClaudeがミスするか？」と自問してみてください。Noなら、スキルに移動するか削除でOKです。

 4. MCPサーバーの放置
使っていないMCPサーバーが接続されたまま、ということがあります。
対策： /mcp で確認して、使っていないサーバーは無効化しましょう。公式ドキュメントでも指摘されていますが、CLIツール（gh、aws、gcloudなど）の方がコンテキスト効率が良い場合もあります。MCPサーバーはツール定義がコンテキストに入りますが、CLIコマンドはそれがないためです。


 コスト削減効果の目安



テクニック
効果
難易度





/clear でタスク切替
大
簡単


サブエージェントに調査委任
大
簡単


CLAUDE.md → スキル移動
中
簡単


Sonnetをデフォルトにする
中
簡単



/effort で思考レベル調整
小〜中
簡単



/btw でサイドクエスチョン
小
簡単



ほとんどが「簡単」です。知っているか知らないかの差でしかない、というのが正直なところです。


 おわりに
トークン節約は「ケチる」ことじゃないと思っています。コンテキストを小さく保つと、Claudeの回答精度も上がる。節約と品質向上が同時に起きる運用です。
最低限これだけ覚えてください。


/clear でタスク切替（最重要・最簡単）

サブエージェントに調査を委任（最も効果的）

CLAUDE.mdは200行以下（超えたらスキルに移動）

Sonnetをデフォルトに（Opusは必要な時だけ）

私自身、この運用に変えてから「なんか今日Claudeの精度いいな」と感じる日が増えました。コンテキストがクリーンだと、Claudeも本来の実力を発揮できるみたいです。
もし試してみたら、感想を教えてもらえるとうれしいです。
今日やること： 次のセッションで /clear を1回使ってみてください。そして /cost（API利用者の場合）でその前後のトークン消費量を比較してみてください。

以前書いた「AIを使うと逆に疲れる人へ｜出力を減らしたら全部ラクになった話」の記事で「AIの出力を減らす」ことの重要性について書きましたが、今回の「コンテキストを小さく保つ」も根底にある考え方は同じです。出力を減らすと判断の負荷が減る。コンテキストを小さく保つとコストと精度が両立する。「引き算」の発想が、AIとの付き合い方の軸になっています。
この記事の内容は2026年4月時点のClaude Code公式ドキュメントに基づいています。
公式ドキュメント: https://code.claude.com/docs/en/costs

---

## 12. [Antigravityを事故らせない運用設計｜hirokaji](https://note.com/tasty_dunlin998/n/n0dd53c5c4406)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/14
- **AI要約**:
  RulesをGlobal/Workspace/Workflowの3層に分離し、コンテキスト肥大化による精度低下とコスト増を防ぐ設計手法。
  Artifact（実施計画や成果物）を単なるログではなく、承認・検証が必須の「ゲート」としてDoDに組み込む運用指針。
  サンドボックスでのドライラン、コマンド拒否リスト、並列数制限など、ツールの外側で構築すべき運用ハーネスの具体例。
- **今読む理由**: AIエージェント開発環境における事故防止と効率化のための具体的設定（YAML形式の階層構造やプロンプト）が明記されており、自動化パイプラインの設計に即座に適用可能なため。
- **タグ**: #AI駆動開発, #Antigravity, #自律エージェント, #運用設計, #リスク管理

### 本文
Antigravityは強力ですが、Rules を増やせば安全になる道具ではありません。Workflows、実行ポリシー、Artifactレビューに加え、外側でドライランとCIゲートを敷くと、誤実行と運用負債をかなり減らせます。ルールは長く書くより、役割で分けたほうが効くAntigravity は、単なる補完ではなく、自律エージェントを複数走らせる agent-first の開発環境として設計されています。Rules はローカルまたはグローバルで効く制約で、Workflows は / で呼び出す保存済みプロンプトです。公式 codelab では、Rules と Workflows を明確に分け、さらに「毎回すべての rule や tool を文脈に載せると、tool bloat が起き、コスト・遅延・混乱が増える」とまで書いています。つまり、全部を global に押し込む設計は、整理不足というだけでなく、品質とコストの両方を悪化させやすい、ということです。 ここで効くのは、ルールを増やすことではなく、どこで効かせるか を分けることです。・グローバルには「秘密情報を出さない」「workspace外を書き換えない」のような普遍条件だけを置く。・リポジトリ固有の命名規則や編集対象ディレクトリは workspace rules に置く。・単体テスト生成やブラウザ回帰確認のように、毎回は不要だが時々強く効かせたい処理は workflow に逃がす。この分割をしておくと、関係ないタスクに重い指示がぶら下がりにくくなります。公式 codelab でも、unit test 生成は rule ではなく workflow に置いて、必要なときだけ /generate-unit-tests で呼ぶ例を示しています。 まずやるべき再配置は、次の3層です。rule_partition:
  global:
    - secretsを出力しない
    - workspace外を書き換えない
    - 破壊的コマンドは提案のみ
  workspace:
    - docs/ 配下のみ編集可
    - main.py はエントリだけに保つ
    - テスト名は test_ 接頭辞に統一
  workflows:
    - generate-unit-tests
    - browser-regression-check
    - release-note-draft本当に事故率を左右するのは、ルールの文面より権限の面積ですAntigravity には、Terminal Execution policy、Review policy、JavaScript Execution policy があります。端的に言えば、何を自動実行させるか と どこで止めるか を別々に決められます。特にブラウザ側は重要で、公式 codelab は JavaScript の Always Proceed について、最大の自律性を与える一方で、security exploits への露出が最も高い と明言しています。さらに、Secure mode と Review-driven development が用意されており、codelab は Review-driven development を推奨バランスとして紹介しています。ルールがどれだけ丁寧でも、実行権限が広すぎれば事故の半径は小さくなりません。この設計から読める実務上の含意ははっきりしています。・最初から Agent-driven で走らせるのではなく、既定値を Review-driven に寄せる。・ブラウザ検証が不要な作業では JavaScript を Disabled にする。・ターミナルは Request review を基本にし、deny list に破壊的コマンドを必ず入れる。これだけでも、ルール文の調整より先に、事故率をかなり下げられます。ブラウザ操作自体も Antigravity Browser Extension 前提で、Web 参照や操作の経路がはっきりしているので、レビュー点を作りやすい設計です。 Artifactはログではなく、ゲートに変えるAntigravity の強みは、結果だけでなく途中の考え方を Artifact として残せるところです。公式 docs では Artifact を、エージェントが作業を進めたり、人間に思考や成果を伝えたりするために作るものと定義しています。Implementation Plan は review policy に応じて人間レビューを要求し、Walkthrough にはブラウザ確認のスクリーンショットや録画が含まれます。codelab でも、コード生成後にブラウザで手動テストを行い、その内容を walkthrough file にまとめ、さらにそこへコメントして再修正する流れが示されています。ここでありがちな失敗は、Artifact を「あとで見るログ」として扱うことです。そうではありません。Implementation Plan を承認するまで実行させない、Walkthrough かテスト結果が揃うまで完了扱いにしない、というゲートに変えた瞬間に、Artifact は安全装置になります。ルールは行動方針ですが、Artifact は監査のための観測点です。観測点を DoD に埋め込むと、レビューが「気分で見るもの」から「通さないと進めないもの」に変わります。そのまま使える DoD の最小形は、これで十分です。完了条件
- Implementation Plan が作成され、承認済みである
- 変更ファイル一覧が scope 内に収まっている
- 破壊的コマンドが実行されていない
- テスト結果、または Walkthrough の要約が提出されている
- レビュー指摘に対する再実行履歴が残っている本番前に必要なのは、Antigravityの外側に置くプレフライトですここからは Antigravity の標準機能というより、チーム側の運用ハーネス の話です。公式に確認できるのは、Rules、Workflows、実行ポリシー、Artifact、Browser subagent、Planning と Fast のモードです。一方で、何時から何時まで実行してよいか、何並列まで許すか、どのレポジトリだけを触らせるか、どのサンプル課題で事前検証するか、といった運用境界は、チームが外側で持ったほうが扱いやすい。Antigravity は Agent Manager から複数エージェントを非同期に走らせられるので、便利さと同時に、並列数そのものが新しいリスク面 になります。 そのため、本番 workspace に入る前に、別の sandbox で dry-run する流れを先に作っておくと効きます。しかも dry-run は Planning モードで回すのがよい。公式 codelab でも、Planning は task groups を作り、Artifacts を多く出し、Fast は小さく局所的なタスク向けだと説明されています。まず Planning で計画と観測点を増やし、スコープが安定してから Fast を使う。この順番にすると、速さのために安全を捨てずに済みます。 以下は、そのまま流用できる最小の運用ハーネス例です。harness:
  target_workspace: apps/release-notes
  execution_window: "08:30-19:00 Asia/Tokyo"
  max_parallel_agents: 2

  default_mode:
    planning_mode: planning
    terminal_policy: request_review
    browser_js_policy: disabled
    artifact_review: request_review

  deny_commands:
    - "rm -rf"
    - "del /s /q"
    - "git push --force"
    - "sudo"

  dryrun:
    sandbox_clone: ".sandbox/release-notes"
    sample_tasks:
      - "docs/配下の更新履歴から週報ドラフトを作る"
      - "コード変更なしで差分要約だけ作る"
    accept_criteria:
      - "変更ファイルが scope 内"
      - "Implementation Plan が作成されている"
      - "破壊的コマンドが提案止まり"
      - "Walkthrough またはテスト結果がある"

  promotion_gate:
    - "dryrun 合格"
    - "人間レビュー完了"
    - "本番 workspace で再実行"大事なのは、これを「厳しすぎる儀式」にしないことです。導入初週は、まず3つだけで十分です。・既存ルールを global / workspace / workflow に分ける。・既定モードを Review-driven 相当に寄せる。・sandbox clone で sample task を2本だけ回す。この3つをやるだけで、だいぶ運用が締まります。そのまま使える実行プロンプトルールだけでは曖昧になりやすいので、実行時に毎回渡す短いプロンプトも持っておくと安定します。これは Antigravity の標準機能ではなく、運用を揃えるための補助です。あなたは Antigravity 上で作業するエージェントです。
次の順で進めてください。

1. まず Task List と Implementation Plan を作成する。
2. 変更予定ファイル、実行予定コマンド、必要なブラウザ操作を先に列挙する。
3. workspace外の書き込み、削除、権限変更、認証情報参照は提案のみとし、実行しない。
4. Browser JavaScript が必要な場合は、目的・対象URL・理由を示し、承認を待つ。
5. 実装後は、変更ファイル一覧、テスト結果、または Walkthrough の要約を返す。
6. 制約に触れる可能性が少しでもあれば停止し、代替案を3つ提示する。このプロンプトの狙いは単純です。Antigravity がもともと持っている Implementation Plan や Walkthrough を、単なる出力物ではなく、先に出させるもの に変えることです。人間が後追いで diff を眺めるより、先に「何を触るか」を出させたほうが、止める判断がしやすくなります。導入初週のチェックリスト最後に、明日から試せる最小チェックリストを置いておきます。□ global rules には普遍条件しか置いていない□ repo 固有の規約は workspace rules に分離した□ 重い処理は workflow に逃がした□ 既定の terminal policy は request review になっている□ browser JavaScript は必要時だけ有効にする□ dry-run 用の sandbox clone がある□ Implementation Plan を承認しない限り進めない□ Walkthrough かテスト結果を完了条件に入れた□ 破壊的コマンドを deny list に入れた□ 並列エージェント数をチームで決めたこの10個が埋まっていれば、Antigravity は「勢いで全部やらせる道具」から、「任せる範囲を切って増やせる道具」に変わります。まとめAntigravity の Rules は重要ですが、事故を止める主役ではありません。主役は、実行権限の絞り込み、Artifact をゲートに変える運用、そして 外側のプレフライト です。ルールを上手に書くより先に、どこで止めるかを決める。そこまで作ってはじめて、AIエージェントは速いだけでなく、任せやすくなります。

---

## 13. [Claude Codeのコスト爆発を3つのhookで防ぐ——月$200を超えないための安全装置 - Qiita](https://qiita.com/yurukusa/items/b79edb07bebc794a4a17)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/24
- **AI要約**:
  Claude Codeの暴走によるコスト急増を3層のプロセスレベルhookで確実に防ぐ手法を提示
  即時遮断、セッション監視、日次累積追跡を行う3つの具体的なBashスクリプトと動作原理を解説
  settings.jsonへの設定例が明記され、ツール呼び出し回数を指標とした実用的な制御が可能
- **今読む理由**: AI駆動開発においてClaude Code導入時の最大の懸念である「自律ループによるコスト爆発」を、即時適用可能なコードと設定ファイルで確実に防止できるため。
- **タグ**: #Claude Code, #AI駆動開発, #コスト最適化, #Bash

### 本文
Claude Codeを自律モードで走らせると、コスト爆発が起きる。GitHubのIssue #38335には80以上のthumbsupがついており、「一晩放置したら請求額が跳ね上がった」という報告が相次いでいる。
CLAUDE.mdに「コストを抑えろ」と書いても意味がない。コンテキストが膨らめば指示は埋もれる。プロセスレベルで動くhookだけが確実にコストを止められる。
この記事では、コスト爆発を3層で防ぐhookを紹介する。



レイヤー
hook名
防ぐもの




瞬間
tool-call-rate-limiter
暴走ループ（1分30回超）


セッション
session-quota-tracker
1セッションの使いすぎ


日次
daily-usage-tracker
1日の累積使いすぎ




hook 1: tool-call-rate-limiter — 暴走ループを即座に止める
Claude Codeがループに入ると、同じツールを1分に数十回呼び出す。トークン消費は指数的に増える。このhookは1分あたりのツール呼び出し回数を監視し、上限を超えたらブロックする。

コード
#!/bin/bash
# tool-call-rate-limiter.sh — Prevent runaway tool calls
# TRIGGER: PreToolUse
# MATCHER: (empty — all tools)

RATE_FILE="${HOME}/.claude/rate-limiter.log"
MAX_CALLS="${CC_RATE_LIMIT_MAX:-30}"
WINDOW="${CC_RATE_LIMIT_WINDOW:-60}"

mkdir -p "$(dirname "$RATE_FILE")"

NOW=$(date +%s)
CUTOFF=$((NOW - WINDOW))

# タイムスタンプを記録
echo "$NOW" >> "$RATE_FILE"

# ウィンドウ内の呼び出し数をカウント
RECENT=$(awk -v cutoff="$CUTOFF" '$1 >= cutoff' "$RATE_FILE" 2>/dev/null | wc -l)

# 古いエントリを削除（ファイル肥大化防止）
awk -v cutoff="$CUTOFF" '$1 >= cutoff' "$RATE_FILE" > "${RATE_FILE}.tmp" 2>/dev/null
mv "${RATE_FILE}.tmp" "$RATE_FILE" 2>/dev/null

if [ "$RECENT" -gt "$MAX_CALLS" ]; then
    echo "BLOCKED: Rate limit exceeded — $RECENT tool calls in ${WINDOW}s (max: $MAX_CALLS)." >&2
    echo "This usually means Claude is stuck in a loop. Check the task." >&2
    exit 2
fi

exit 0


仕組み


PreToolUseトリガーなので、ツール実行の前に走る

/tmp/にタイムスタンプを蓄積し、直近60秒の呼び出し数をカウント
30回を超えたらexit 2でブロック。Claudeは操作を実行できない
古いエントリは毎回pruneするのでファイルが肥大化しない


settings.jsonへの追加
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/tool-call-rate-limiter.sh"
          }
        ]
      }
    ]
  }
}


カスタマイズ
環境変数で閾値を調整できる:
# 1分20回まで（デフォルト: 30）
export CC_RATE_LIMIT_MAX=20

# ウィンドウを120秒に（デフォルト: 60）
export CC_RATE_LIMIT_WINDOW=120

コード生成のような高速タスクでは30回/分は正常な場合もある。自分の使い方に合わせて調整する。

hook 2: session-quota-tracker — セッション単位の累積監視
ループではないが、長時間セッションでじわじわとトークンを消費するパターンもある。このhookはセッション累計のツール呼び出し数を追跡し、段階的に警告する。

コード
#!/bin/bash
# session-quota-tracker.sh — Track cumulative tool calls per session
# TRIGGER: PostToolUse
# MATCHER: (empty — all tools)

SESSION_FILE="/tmp/cc-quota-tracker-$$"

# カウンターをインクリメント
if [ -f "$SESSION_FILE" ]; then
  COUNT=$(cat "$SESSION_FILE")
  COUNT=$((COUNT + 1))
else
  COUNT=1
fi
echo "$COUNT" > "$SESSION_FILE"

# 閾値で警告
case "$COUNT" in
  50)  echo "[Session: 50 tool calls. Consider saving work.]" >&2 ;;
  100) echo "[Session: 100 tool calls. Token usage may be high.]" >&2 ;;
  200) echo "[Session: 200 tool calls. Check your usage dashboard.]" >&2 ;;
  500) echo "[Session: 500 tool calls. Consider starting a new session.]" >&2 ;;
esac

exit 0


仕組み


PostToolUseトリガーなので、ツール実行の後に走る（ブロックではなく通知目的）

$$（シェルのPID）をファイル名に使うため、セッションごとに別カウンター
50 / 100 / 200 / 500回で段階的に警告メッセージを出力

exit 0なので操作はブロックしない。あくまで「気づき」を与える


settings.jsonへの追加
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/session-quota-tracker.sh"
          }
        ]
      }
    ]
  }
}


なぜツール呼び出し数なのか
Claude Codeはトークン使用量をhookに渡さない（2026年3月時点）。直接のコスト計算はできないが、ツール呼び出し数はトークン消費と強く相関する。1回のツール呼び出しで数千〜数万トークンを消費するため、呼び出し数は実用的なプロキシ指標になる。

hook 3: daily-usage-tracker — 日次の累積を見張る
セッションを何度も立ち上げ直す場合、セッション単位のトラッカーでは累積が見えない。このhookは1日のツール呼び出し総数を記録し、異常を検知する。

コード
#!/bin/bash
# daily-usage-tracker.sh — Track daily tool call count
# TRIGGER: PostToolUse
# MATCHER: (empty — all tools)

DAILY_DIR="${HOME}/.claude/daily-usage"
mkdir -p "$DAILY_DIR"

TODAY=$(date +%Y-%m-%d)
TODAY_FILE="${DAILY_DIR}/${TODAY}.log"
WARN_THRESHOLD="${CC_DAILY_WARN:-500}"

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)

# 呼び出しを記録
echo "$(date +%H:%M:%S) $TOOL" >> "$TODAY_FILE"

# 今日の呼び出し数をカウント
TODAY_COUNT=$(wc -l < "$TODAY_FILE" 2>/dev/null || echo 0)

# マイルストーンで通知
case "$TODAY_COUNT" in
    100|250|500|1000)
        echo "Daily usage: $TODAY_COUNT tool calls today ($TODAY)" >&2
        ;;
esac

# 閾値超過で警告
if [ "$TODAY_COUNT" -eq "$WARN_THRESHOLD" ]; then
    YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null)
    YESTERDAY_FILE="${DAILY_DIR}/${YESTERDAY}.log"
    YESTERDAY_COUNT=0
    [ -f "$YESTERDAY_FILE" ] && YESTERDAY_COUNT=$(wc -l < "$YESTERDAY_FILE")
    echo "Daily usage warning: $TODAY_COUNT calls today (yesterday: $YESTERDAY_COUNT)" >&2
fi

exit 0


仕組み


~/.claude/daily-usage/YYYY-MM-DD.logに時刻とツール名を記録

jqでstdinからツール名を抽出（PostToolUseはJSON入力を受け取る）
100 / 250 / 500 / 1000回でマイルストーン通知
閾値到達時に前日との比較を出力（異常検知の参考）


ログの活用
記録されたログは後から分析できる:
# 今日のツール別呼び出し回数
awk '{print $2}' ~/.claude/daily-usage/$(date +%Y-%m-%d).log | sort | uniq -c | sort -rn

# 過去7日間の推移
for f in ~/.claude/daily-usage/*.log; do
  echo "$(basename $f .log): $(wc -l < $f) calls"
done


3つを組み合わせた完全なsettings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/tool-call-rate-limiter.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/session-quota-tracker.sh"
          },
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/daily-usage-tracker.sh"
          }
        ]
      }
    ]
  }
}


セットアップ手順
# 1. hookディレクトリを作成
mkdir -p ~/.claude/hooks

# 2. 各スクリプトを配置（上記のコードをコピー）
chmod +x ~/.claude/hooks/tool-call-rate-limiter.sh
chmod +x ~/.claude/hooks/session-quota-tracker.sh
chmod +x ~/.claude/hooks/daily-usage-tracker.sh

# 3. settings.jsonに追加（上記のJSON）
# ~/.claude/settings.json を編集


コスト計算のTips
hookを設定したうえで、コスト感覚も持っておくとより効果的。

トークン単価（Claude 4 Sonnet）



種別
単価




入力トークン
$3 / 1Mトークン


出力トークン
$15 / 1Mトークン



出力は入力の5倍高い。Claudeが長文を生成するタスクほどコストが跳ね上がる。

コストを抑える実践的テクニック


/compactを定期的に実行 — コンテキストウィンドウをリセットし、入力トークンを削減

--max-turnsで上限を設定 — claude --max-turns 20で自律実行の回数を制限

大きなファイルを丸ごと読ませない — 必要な行だけ指定して読ませる

ループが疑われたらすぐCtrl+C — hookが効く前に自分で止めるのも有効


月$200に収めるには
Max（月$200）プランの場合、公式のUsage dashboardでリアルタイム消費を確認できる。hookの警告が来たらダッシュボードをチェックする習慣をつける。

ワンコマンドでセットアップする
手動で3つのhookを配置するのが面倒なら、cc-safe-setupでまとめて導入できる:
npx cc-safe-setup

446個のhookテンプレートから必要なものを選んでインストールできる。6,099テストで動作を検証済み。
コスト関連の3つのhookに加えて、rm -rfブロック、git push --force防止、secret漏洩検知など、安全hookも一括で入る。

もっと詳しく知りたい人へ


Claude Code実践ガイド（Zenn Book） — hookの仕組みから運用設計まで体系的に解説

npx cc-health-check — 無料の20項目診断。スコア80未満なら改善の余地あり


継続の更新の経路 (関連の資源)
本記事の3つの hook は直近の30日間で型を最小限に絞った版。 利用者の集まりの中で月単位で新しい cost spike の事故と修正が発見されるため、 継続的な更新の経路として CC Safety Lab Founder Membership (Ko-fi、 ¥500/月) を運営している。 月次で incident roundup と新しい hook と settings.json の regression alert を配信。 6月15日の claude -p の課金の分離 (Pro $20、 Max 5x $100、 Max 20x $200) の前の準備の点検表も含む。


CC Safety Lab Founder Membership (Ko-fi、 ¥500/月)
過去の cost spike の事故の事例
実機の cost spike の事故の整理は Claude Code Incident Postmortems (Gumroad、 ¥4,350) に集約。 10件の事故、 累計約 $24,000 の影響を、 発火の時の log と修正の経路で解説。 本記事の hook は予防の経路、 本書は事後の検視の経路。
Claude Code Incident Postmortems (Gumroad、 ¥4,350)

1Go to list of users who liked2Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up

---

## 14. [Claude Codeのコンテキスト枯渇に立ち向かう──大規模リファクタリングのセッション設計](https://zenn.dev/miyan/articles/claude-code-context-exhaustion-strategy)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/5/26
- **AI要約**:
  Claude Codeの200Kトークン枯渇による提案の矛盾や規則無視の予兆と段階的症状の解説
  ファイル全体読み込みを避け行範囲指定や手動コンパクションを推奨するトークン節約手法
  状態をMarkdownファイルに外部化しセッション分割とクリアで進めるリファクタプロトコル
- **今読む理由**: AI駆動開発で大規模リファクタを行う際、トークン枯渇によるAIの精度低下と時間ロスを防ぐための実践的なセッション制御手法が具体的に記載されているため。
- **タグ**: #AI駆動開発, #Claude_Code, #リファクタリング, #コンテキスト管理

### 本文
10万行のモノリスを Claude Code でリファクタリングしようとした。3時間後、Claude は前半のアーキテクチャ決定を忘れ、矛盾する変更を提案し始めた。この記事は、その失敗から生まれた「セッション設計プロトコル」の話だ。



 「Claude が前半の決定を忘れた」──現場で何が起きるか
ある日、5年前に書かれた Spring Boot モノリス（約12万行、テストなし、仕様書は「Confluenceの残骸」のみ）に向き合った。計画はこうだった。Claude Code にアーキテクチャを分析させ、モジュール境界を再設計し、段階的にリファクタリングする。
最初の1時間は順調だった。Claude はパッケージ間の依存関係を正確に把握し、「この UserService は PaymentService と NotificationService に暗黙の依存がある」と指摘してくれた。DDD のバウンデッドコンテキスト（ビジネスドメインごとに明確に区分されたサブドメイン境界）に基づくモジュール分割案も的確だった。
2時間後、異変が始まった。

さっき「UserService のインターフェースを分離する」と決めたはずなのに、直接参照のままコードを書き始めた
初期に確立した命名規則（ISomeService パターン）を無視した変数名が出てきた
「念のため確認させてください」という前置きが急に増えた

3時間後、Claude は自分が1時間前に書いた変更と矛盾する修正を提案した。/context で確認すると、コンテキスト使用率は 92% だった。
これが コンテキスト枯渇（Context Exhaustion）だ。Claude が「忘れた」のではない。200,000トークンのウィンドウが埋まり、古い決定が圧縮・削除され、文字通り「見えなくなった」のだ。


 コンテキストウィンドウの中身──200K トークンは何に使われているか
「200,000トークンもあるのに足りないのか？」と思うかもしれない。実態を見てみよう。
Claude Code の200Kトークンには、以下のすべてが 同時に 詰め込まれる。



要素
目安トークン数
備考




システムプロンプト＋ツール定義
10,000〜30,000
MCP サーバーが増えるほど膨らむ


CLAUDE.md・ルールファイル
1,000〜5,000
毎セッション自動ロード


Extended Thinking 予約
最大 31,999
有効時は常に確保される


会話履歴
蓄積的
ユーザーとClaude のやり取り全体


ツール実行結果
蓄積的
ファイル読み込み、grep、コマンド出力



実作業で使える「純粋な作業スペース」は、見た目の200Kよりはるかに少ない。
トークン消費のスケール感を掴んでおこう。



操作
消費トークン




ファイル1本の全体読み込み
約 3,000


grep 検索1回の結果
約 200


200行のスタックトレース
約 1,600



npm test の出力（全体）
5,000〜20,000



100ファイルのモノリスを「とりあえず全部読ませよう」とすると 300,000トークン──200K ウィンドウの1.5倍だ。物理的に入らない。
さらに厄介なのが "Lost in the Middle" 問題（コンテキストが長くなるほど中間部分への注意力が低下する現象、Liu et al., 2023）だ。Anthropic もこの問題を認めており、仮に1Mトークンのウィンドウが使えたとしても、「全部入れれば全部覚えている」わけではない。コンテキストの 量 ではなく 質 の設計が必要になる。


 枯渇の3段階──「手を打つべき」タイミングを見極める
コンテキスト枯渇には明確な予兆がある。段階ごとの症状と対処を知っておけば、手遅れになる前に動ける。

 第1段階：初期症状（50〜70%）



症状
具体例




反復確認の増加
「念のため確認させてください」が増える


レスポンス遅延
応答が目に見えて遅くなる


提案の保守化
影響範囲の把握が浅くなり、変更提案が小さくなる



対処: まだ余裕がある。/compact を実行するかどうかの判断ポイント。

 第2段階：Context Rot（70〜85%）



症状
具体例




アーキテクチャ決定の無視
序盤に決めた設計方針と矛盾する提案が出る


整合性の崩壊
複数ファイルにまたがる変更の整合性が取れなくなる


重複提案
同じパターンを何度も提案する


スタイル逸脱
確立した命名規則やコーディング規約を守らなくなる



対処: 今すぐ /compact を実行する。カスタム指示を添えて、保存すべき決定事項を明示する。

 第3段階：重篤（85%超）



症状
具体例




自動コンパクション発動
入力フィールド上部に警告が表示される


指示喪失
詳細な指示が要約の過程で失われる


コンパクションループ
最悪のケースでは同じファイルを繰り返し読む無限ループに




経験則: 70% を超えたら行動を起こし、85% を「レッドライン」と認識する。


 やらないこと──間違ったアプローチ4選
対策に入る前に、「やってはいけないこと」を明確にしておく。

 ❌ ファイル全体を読み込む
# 悪い例：3,000トークン消費
Read file: src/services/UserService.java

# 良い例：行範囲指定で約900トークン（70%節約）
Read file: src/services/UserService.java:50-120
grep で関数のシグネチャだけ特定し、必要な行範囲だけ読む。この手法で 70% のトークン節約 が実現できる。

 ❌ 1セッションで全てを終わらせようとする
10万行のリファクタリングを1セッションで完走させるのは、200K トークンの物理限界から不可能だ。5〜20ファイルを1セッションの単位として設計する。

 ❌ 自動コンパクションに任せっぱなし
自動コンパクションは「何を要約し、何を削除するか」をユーザーがコントロールできない。アーキテクチャ決定のような 失ってはいけない情報 が要約で消える可能性がある。手動 /compact とカスタム指示で制御する。

 ❌ コンテキストウィンドウの拡大で解決しようとする
Anthropic のエンジニアリングブログは明確に述べている──「あらゆるサイズのコンテキストウィンドウがコンテキスト汚染（Context Pollution）と情報関連性の課題に直面する」。1Mトークンの拡張コンテキストは利用可能だが、それは根本的な解決策ではない。


 このプロトコルが有効な条件
全てのリファクタリングにセッション分割が必要なわけではない。以下の条件に当てはまるときに威力を発揮する。



条件
セッション分割が有効
単一セッションで十分




コード規模
1万行超
1万行以下


テストカバレッジ
低い（コードの意図把握に時間がかかる）
高い（安全にリファクタリング可能）


ドメイン知識
チーム内に詳しい人が少ない
仕様を把握しているメンバーがいる


IDE リファクタリング
型情報が不十分で自動リファクタリングが効かない
IDE の rename/extract で安全に進められる



逆に、テストが充実し IDE のリファクタリング機能で安全に進められるケースでは、このプロトコルのオーバーヘッドが上回る。道具は課題に合わせて選ぶ。


 セッション分割プロトコル──大規模リファクタリングを完走させる設計
これらの「やってはいけないこと」を踏まえたうえで、実運用で検証済みのセッション分割手法を示す。10万行超のモノリスに対して、コンテキスト枯渇を起こさずにリファクタリングを完走させるための具体的なプロトコルを示す。

 全体設計：フェーズ分割
大規模リファクタリングは、以下のフェーズに分割して進める。各フェーズは独立したセッションで実行する。
設計の核心: セッション間の「記憶」をファイルに外部化する。Claude のコンテキストウィンドウではなく、.claude/ ディレクトリが「長期記憶」の役割を果たす。

 Phase 1: アーキテクチャ分析（サブエージェント並列）
最初のセッションでは、コードベース全体の構造を把握する。ただし自分で全ファイルを読むのではなく、サブエージェントに並列でスキャンさせる。
# Claude Code への指示例
以下の3つのサブエージェントを並列に起動して、各ディレクトリの依存関係を分析してください:

1. src/domain/ の全パッケージとクラス間の依存関係
2. src/infrastructure/ の外部サービス連携の一覧
3. src/application/ のユースケースと呼び出しているドメインサービス

結果を .claude/architecture-map.md に統合してください。
なぜサブエージェントが有効か。各サブエージェントは 独立した200Kトークンのコンテキストウィンドウ を持つ。3つのエージェントが並列に動けば、合計 600K トークン分の分析能力 を使える。しかもメインエージェントに返るのは 1,000〜2,000トークンの要約だけ だ。メインのコンテキストを汚染せずに全体像を把握できる。
出力はファイルに外部化する。
# .claude/architecture-map.md

## パッケージ依存グラフ
- domain.user → domain.payment（暗黙の依存、要分離）
- domain.payment → infrastructure.stripe（直接参照、要抽象化）
- application.order → domain.user, domain.payment, domain.notification

## モジュール分割案
1. User バウンデッドコンテキスト: domain.user + application.user
2. Payment バウンデッドコンテキスト: domain.payment + infrastructure.stripe
3. Notification バウンデッドコンテキスト: domain.notification + infrastructure.email

## 分割の優先順位
1. Payment（外部依存が多く、変更頻度が高い）
2. User（他モジュールからの参照が最多）
3. Notification（独立性が高く、最もリスクが低い）
Phase 1 のセッション終了後、/clear で完全にリセットする。 architecture-map.md が「記憶」を引き継ぐ。

 Phase 2: インターフェース定義
新しいセッションを開始し、architecture-map.md だけをロードする。全ソースコードを読み直す必要はない。
# Claude Code への指示例
.claude/architecture-map.md を読み、各バウンデッドコンテキスト間の
インターフェースを定義してください。

依存の方向は「内側 → 外側」のみ許可します（オニオンアーキテクチャ：ドメイン層を中心に、外側の層が内側に依存する設計）。
結果を .claude/interface-contracts.md に書き出してください。
ここでも、必要なファイルだけを行範囲指定で読む。全体像は architecture-map.md から把握し、具体的な実装は grep でピンポイントに確認する。

 Phase 3〜N: モジュール別実装
各モジュールのリファクタリングを、独立したセッションで実行する。
1セッションの目安: 5〜20ファイルの自己完結な論理単位。
この粒度にする理由は3つある。


200Kトークン内に収まる: 20ファイル × 3,000トークン = 60,000トークン。会話やツール出力を含めても余裕がある

コンパイルとテストが独立に完了する: 各バッチが「壊れていない」状態で終わる

ハンドオフが書ける粒度: 次のセッションに引き継ぐべき情報が明確



 CLAUDE.md のブリッジ設計
CLAUDE.md はすべてのセッション開始時に自動ロードされる。つまり「セッションをまたいで必ず伝わる情報」の置き場所だ。ただし、CLAUDE.md 自体がコンテキストを圧迫しては本末転倒なので、100行・約800トークン以内 に抑える。
大規模リファクタリング向けの CLAUDE.md 構成例を示す。
# CLAUDE.md

## プロジェクト概要
Spring Boot モノリスのDDD/オニオンアーキテクチャへの段階的移行。

## 現在のフェーズ
Phase 3: Payment モジュールのリファクタリング

## Compact Instructions
自動コンパクション時は必ず以下を保存:
- 確立したインターフェース（.claude/interface-contracts.md 参照）
- 変更済みファイルのリスト
- 次のタスクと優先順位
- 未解決の技術的負債

## ファイル読み込みルール
- src/ 以下は grep 優先。全文読み込みは行範囲指定で行う
- .claude/architecture-map.md は必要時のみ参照

## コーディング規約
- インターフェース名: ISomeService パターン
- パッケージ構成: domain/application/infrastructure の3層
ポイント: ## Compact Instructions セクションを追加することで、手動 /compact 実行時に「何を優先して保存するか」を Claude に指示できる。自動コンパクションへの直接的な指示効果は現時点では保証されていない（GitHub Issue #14160 で feature request 段階）ため、重要な決定事項は .claude/ 配下のファイルへの外部化が最も確実な手段だ。


 ハンドオフドキュメント──セッション間の「引き継ぎ書」
セッション終了時に作成する構造化ドキュメントだ。次のセッションはこのファイルを読むだけで作業を再開できる。
# .claude/handoff.md

## 完了済みタスク
- [x] PaymentService のインターフェース分離（IPaymentService）
- [x] StripeGateway を infrastructure 層に移動
- [x] PaymentServiceTest の修正（モック差し替え）

## 進行中タスク
- PaymentService のエラーハンドリング統一
  - 現在位置: src/domain/payment/PaymentService.java:120
  - 残作業: StripeException → DomainException への変換ロジック

## 確立したコーディング規約
- 例外変換は infrastructure 層の Gateway クラスで行う
- ドメイン層は外部サービスの例外型を知らない

## 未解決の技術的負債
- OrderService が PaymentService を直接 new している箇所が3つ残っている
  - src/application/order/OrderUseCase.java:45, 78, 112

## 次のセッションへの指示
1. このファイルを読み込む
2. .claude/interface-contracts.md を参照する
3. PaymentService.java:120 のエラーハンドリングから再開する
効果: セッション再開時間が 75% 短縮 されるという報告がある。「前回どこまでやったか」の確認に30分かけていたのが、ハンドオフドキュメントを読む5分で済む。
ハンドオフの作成を自動化するには、セッション終了前に以下を指示する。
現在の進捗を .claude/handoff.md に書き出してください。
何を試し、何が成功し、何が失敗したかを含めてください。
次のセッションがこのファイルだけを読んで作業を再開できるようにしてください。


 /compact の戦略的な使い方
/compact は「会話履歴を要約して圧縮する」コマンドだ。70,000トークンの会話が 約4,000トークンの要約 に圧縮された例がある。ただし使い方を間違えると、必要な情報まで失われる。
推奨タイミング: コンテキスト使用率 60〜70% の時点 で実行する。85% を超えてからでは、自動コンパクションと競合して制御が効かなくなる。
カスタム指示を添える:
/compact 以下の情報を優先して保存してください:
- interface-contracts.md で定義したインターフェース一覧
- 現在のリファクタリング対象ファイルとその変更方針
- 確立した命名規則とパッケージ構成ルール
/compact と /clear の使い分けを整理する。



コマンド
動作
適切な場面




/compact
会話を要約して圧縮。方向性・制約・決定は保持
セッション中のコンテキスト回復


/clear
会話を完全リセット。CLAUDE.md のみ残る
フェーズ切り替え時の完全リスタート



フェーズの切り替え（例: Phase 2 → Phase 3）では /clear を使う。 前のフェーズの会話履歴は不要で、ハンドオフドキュメントが引き継ぎを担う。


 サブエージェント──「コンテキストの分散装置」として使う
サブエージェントの本質的な価値は「並列処理」だけではない。メインエージェントのコンテキストを守る「分散装置」 だ。

 仕組み
メインエージェント（200K トークン）
├── サブエージェント A（独立した 200K トークン）
│   └── src/domain/ を分析 → 要約 2,000 トークンを返す
├── サブエージェント B（独立した 200K トークン）
│   └── src/infrastructure/ を分析 → 要約 1,500 トークンを返す
└── サブエージェント C（独立した 200K トークン）
    └── src/application/ を分析 → 要約 1,800 トークンを返す

合計分析能力: 800K トークン
メインへの影響: 5,300 トークン（全体の 2.7%）
各サブエージェントが内部で数万トークンを使って詳細な分析を行い、メインには凝縮した結果だけが返る。50,000行のプロジェクトで3並列セッションを使うことで、ウィンドウを飽和させずに全体をカバーできたという報告がある。

 使いどころの判断基準



場面
サブエージェント
直接作業




コードベース全体のスキャン
✅ 並列分散
❌ コンテキスト爆発


単一ファイルの修正
❌ オーバーヘッド
✅ 直接のほうが速い


複数モジュールの影響分析
✅ モジュールごとに並列
❌ 全部読むとコンテキスト枯渇


テスト実行と結果分析
✅ 出力が巨大な場合
✅ 出力が小さい場合



同時並列数の上限は 10。 ただし実用的には 3〜5 が最適 だ。それ以上はコスト増加に見合うリターンが得られにくい。


 Plan モード──実装前のトークン消費を 40〜60% 削減する
見落とされがちだが、Plan モード（Shift+Tab を2回押して起動）は強力なトークン節約手段だ。Plan モードではファイルを読んで戦略を立てるが、コードへの書き込みは行わない。
なぜ節約になるか: 実装中のツール呼び出し（ファイル書き込み、テスト実行、linter）が発生しないため、コンテキスト消費が大幅に抑えられる。
5ファイル以上にまたがるリファクタリングタスクの前には、必ず Plan モードで方針を固める。
# Plan モードでの作業例
1. grep で対象ファイルの概要を把握（200 トークン × N）
2. 変更方針を言語化
3. Plan モードを解除して実装開始

# Plan モードなしの場合
1. ファイルを全文読み込み（3,000 トークン × N）
2. 実装しながら方針を模索（試行錯誤のトークン消費）
3. 間違った方向に進んだ分のロールバック（さらにトークン消費）


 現場で踏んだ罠と対策

 罠1: 自動コンパクションの不透明さ
現象: 自動コンパクションが発動した後、「あれ、さっき決めたインターフェース定義が消えてる」と気づく。
原因: 自動コンパクションは「何を残し、何を要約するか」のロジックが不透明で、ユーザーが直接制御できない。
対策:

CLAUDE.md に ## Compact Instructions セクションを追加して保存対象を指示する
重要な決定事項は必ず .claude/ 配下のファイルに外部化する（コンテキスト内にだけ存在する情報は消える可能性がある）
コンテキスト 60〜70% で手動 /compact を実行し、自動コンパクションに先んじる


 罠2: MCP サーバーの隠れたトークン消費
現象: MCP サーバーを5つ接続した状態で作業すると、セッション開始直後からコンテキストが 25% 消費されている。
原因: MCP サーバーのツール定義がシステムプロンプトに全展開される。Claude Code 2.1.0 の Tool Search 機能で 46.9% 削減（51K → 8.5K トークン）が報告されているが、それでも無視できないサイズだ。
対策:


/context コマンドでコンテキスト使用量の内訳を確認する
リファクタリング中は不要な MCP サーバーを無効化する
Tool Search が有効になっているか確認する（Claude Code 2.1.0 以降）


 罠3: ハンドオフドキュメントが長すぎる
現象: 「次のセッションに全て伝えたい」と思ってハンドオフドキュメントを1,000行書いた結果、それ自体が次のセッションのコンテキストを圧迫する。
対策: ハンドオフドキュメントは 200行以内 に抑える。詳細な設計判断は .claude/ 配下の専用ファイル（architecture-map.md、interface-contracts.md）に分離し、ハンドオフには「どのファイルを読むべきか」のポインタだけを書く。

 罠4: ハンドオフドキュメントの品質劣化
現象: 前のセッションで Claude に書かせたハンドオフドキュメントを次のセッションで読み込んだが、重要な設計決定が抜け落ちていて手戻りが発生する。
原因: Claude がハンドオフを書く時点でコンテキストが枯渇しかけており、重要な情報が漏れる。または、リファクタリングが進むにつれて architecture-map.md の内容が実コードと乖離していく。
対策:

ハンドオフ作成は コンテキスト 60% 以下 の時点で先に書かせる（枯渇してからでは遅い）
新セッション開始時に「ハンドオフの内容と実コードを突合してください」と検証ステップを入れる
architecture-map.md は Phase 完了ごとに更新する規約を設ける


 罠5: Plan モードを使わずにいきなり実装開始
現象: 「とりあえずやってみよう」でファイルを開き始め、方針が定まらないまま試行錯誤してコンテキストを浪費する。
対策: 5ファイル以上に影響するタスクは、必ず Plan モードで方針を固めてから実装に入る。Plan モードでの分析は実装モードの 40〜60% のトークン消費 で済む。


 限界と向き合う
このプロトコルにも限界はある。正直に書いておく。

 サブエージェント並列のコスト問題
3つのサブエージェントを並列で動かすと、単純計算で 3倍のトークンコスト がかかる。10万行のモノリスに10エージェントを同時投入すれば、1セッションで数十ドルは覚悟が必要だ。小〜中規模プロジェクト（1万行以下）では、単一セッションの注意深い管理のほうが経済的な場合がある。

 コンパクションの「何が失われたか」問題
/compact 実行後に「何が要約され、何が削除されたか」の完全なログは提供されない。GitHub Issues に「コンパクションのカスタマイズ制御」を求める feature request が複数存在する。現時点では、.claude/ ファイルへの外部化が最も確実な「記憶保護」手段だ。

 セッション分割が生むモジュール間の整合性リスク
各セッションが5〜20ファイルの論理単位で閉じるということは、モジュール間の暗黙の依存関係がセッション境界で見落とされるリスクがある。interface-contracts.md で明示的な契約は守れても、実行順序・状態遷移・データの不変条件といった暗黙の契約はインターフェースだけでは表現しきれない。Mermaid 図の Phase N（統合テスト）を必ず設け、セッション分割で生じた不整合を早期に検出する仕組みが不可欠だ。

 「AI にフレンドリーなアーキテクチャ」という新しい課題
興味深い議論が台頭している──明確なモジュール境界を持つアーキテクチャは、AI が完全に理解できる集中したコンテキストを提供する。つまり「モジュラーモノリスは AI 支援に有利」という主張だ。これはリファクタリングの「ゴール設計」にも影響する。AI と協働する前提でアーキテクチャを設計するなら、モジュール間の依存を最小化し、各モジュールが「1セッションのコンテキスト内で完結する」サイズに保つことが合理的になる。


 チームで運用する場合
この記事は「1人のエンジニアが Claude Code でリファクタリングする」前提で書いたが、チーム開発では追加の考慮が必要になる。


handoff.md や architecture-map.md は Git 管理する。Phase の担当者が PR ベースで更新し、レビューを通すことで品質を担保する

最初の2〜3セッションは経験者とペアで実施する。/compact のタイミング判断やハンドオフの書き方はパターン認識が必要で、座学では身につきにくい

Phase 分割の設計はチームで行い、各 Phase の実行を分担する。1人で全 Phase を担当すると属人化リスクが高い



 まとめ──明日からできること
大規模リファクタリングでのコンテキスト枯渇は、200K トークンの物理的制約である以上、避けられない。しかし、セッション設計で 管理可能な問題 に変えることはできる。

 アクションチェックリスト
今日やること（5分）:


 CLAUDE.md に ## Compact Instructions セクションを追加する

 /context でコンテキスト使用量の内訳を確認する

今週やること（30分）:


 .claude/handoff.md のテンプレートを作成する

 リファクタリング対象のモジュール分割案を Plan モードで作成する

大規模リファクタリング開始時（初回セッション）:


 サブエージェント並列でアーキテクチャ分析を実行する

 .claude/architecture-map.md にモジュール境界を外部化する

 1セッション＝5〜20ファイルのバッチ計画を立てる


 判断フロー
コンテキストウィンドウは「記憶力」ではなく「作業机の広さ」だ。机の上に全ての書類を広げるのではなく、必要な書類だけを出し、残りは引き出し（.claude/ ディレクトリ）にしまう。その引き出しの整理術が、セッション設計の本質だ。


 参考リンク

Context windows - Claude API Docs
Effective context engineering for AI agents - Anthropic Engineering
Best Practices for Claude Code
Compaction - Claude API Docs
Claude Code のトークン消費を最適化する（ECC シリーズ）

---

## 15. [Claude Code「Dynamic Workflows」完全ガイド：6つのパターンと14ステップ](https://zenn.dev/aria3/articles/claude-code-dynamic-workflows-6-patterns)
- **優先度**: High
- **スコア**: 92
- **解析日時**: 2026/6/8
- **AI要約**:
  単一コンテキストの限界を解決するClaude Codeの動的ワークフローの仕組みと起動方法を解説
  コアAPI（agent, parallel, pipeline）と、敵対的検証やトーナメントなど6つの設計パターンを提示
  エージェントの怠慢や目標ドリフトを防ぎ、複雑な開発タスクを自律的・並列に処理する実践手法を網羅
- **今読む理由**: AI駆動開発やパイプライン構築において、エージェントの精度低下（目標ドリフトや怠慢）を防ぐ具体的なオーケストレーション手法とコアAPI（parallelやpipeline）の使用例が明記されており、即座に実装設計へ適用できるため。
- **タグ**: #AI駆動開発, #Claude-Code, #エージェントアーキテクチャ, #自動化パイプライン

### 本文
Claude Codeを使い込んでいる人でも、Dynamic Workflowsをまだ試していないケースが多いようです。2026年5月28日にリリースされたこの機能、Anthropicのエンジニアたちが実際に使っている6つのパターンと14ステップのロードマップをまとめました。

 Dynamic Workflowsとは何か
通常のClaude Codeは、計画と実行を同じコンテキストウィンドウの中でこなします。短〜中規模のコーディングタスクならこれで十分です。でも、長時間稼働・大規模並列・高度に構造化されたタスク・敵対的な検証が必要なケースでは、単一ウィンドウのアプローチが壊れていくんですね。
Dynamic Workflowsとは、Claudeがそのタスク専用のハーネスをその場で書く仕組みです。サブエージェントのスポーンと協調を担う特殊関数と、通常のJavaScript（Math・JSON・Array）を組み合わせたファイルをClaudeが生成し、エージェント間を流れるデータを処理します。
起動方法は2通りあります。Claudeに直接「このワークフローを作って」と頼むか、ultracode というトリガーワードを使うか。ワークフローが中断しても、セッションを再開すれば止まったところから再開できます。

 ワークフローが解決する3つの失敗パターン
動的ワークフローが必要かどうかを判断するには、それが何を修正するかを理解する必要があります。Claudeが複雑なタスクを単一コンテキストウィンドウで長時間処理すると、次の3つの問題が起きやすいです。


Agentic laziness（エージェント的怠慢）：複雑な複数ステップのタスクを完了前に止めて「完了」と宣言してしまう。セキュリティレビューの20件に対応して残りを「処理済み」と言い張るようなケース。

Self-preferential bias（自己優先バイアス）：自分の出力をルーブリックと照らして検証・評価するとき、Claudeは自分の結果を優先する。利害関係のある検証者は公正な審判にはなれない。

Goal drift（目標ドリフト）：多くのターンにわたって元の目標への忠実度が徐々に落ちていく。コンテキスト圧縮後は特に顕著で、「Xをしない」という制約が47ターン目にはひっそり消えてしまう。

ワークフローはこれを構造的に解決します。独自のコンテキスト・集中した目標・独立した状態をそれぞれ持つ、別々のClaudeを使うからです。

 静的ワークフローとDynamic Workflowsの違い
Claude Agent SDKやclaude -pを使って複数のClaude Codeインスタンスを協調させる静的ワークフローはすでに使っている方もいるでしょう。違いはこうです。


静的ワークフロー：すべてのエッジケースを扱うために一度だけ書かれる汎用的なもの。機能するが、保守的にならざるを得ない。

Dynamic Workflows：Claudeがこのタスクのためにこのワークフローを書く。ハーネスはオーダーメイドされる。

動的バージョンが勝つのはステップの数ではなく、ワークフロー自体があなたのコンテキストに合わせて自分を形作れるからです。自分のコードを読み、実際の新プロバイダーのドキュメントと各機能を照合し、トランザクション量での価格を算出し、自分の出てきた答えに対して「なぜ移行しないか」という敵対的な検証パスを実行できるんですね。

 コアAPI：agent()、parallel()、pipeline()

3つの関数でほとんどの作業をこなします。これを把握しておけば、Claudeが書いてくれるどんなワークフローも読めるし、特定の形にしたいときの誘導もできます。


agent()：単一のサブエージェントをスポーンする

parallel()：バリア型。一気に展開して、すべてが返ってくるまで待つ

pipeline()：ストリーミング型。各アイテムがすべてのステージを独立して流れる

選び方は「次の処理の前にすべての結果が必要か？」という問いで決まります。必要ならparallel()、不要ならpipeline()（コスト・スループットで有利）。

 6つのパターン

 パターン1：Classify-and-act（分類してから実行）
タスクの種類を分類エージェントが決定し、ワークフローがその答えに基づいて異なるエージェントや処理に振り分けます。
効果が高い場面は次のとおりです。

タスクが異種混在で、サブタイプごとに異なる処理が必要なとき
高価なモデルを複雑な箇所だけに使いたいとき（分類は安いモデル、複雑な処理はOpusだけに振る）

例として、「認証モジュールの仕組みを説明して」というリクエスト。分類サブエージェントがまずコードベースを読んで複雑さを見積もり、10ファイルのモジュールならSonnetに、100ファイルなら理解してからOpusに振ります。

 パターン2：Fan-out-and-synthesize（展開して統合）
タスクを多くの小ステップに分割し、各ステップに並列でエージェントを実行し、結果を1つの答えにまとめます。
// 展開：ファイルごとに1エージェント。バリア：すべてを待つ
const reviews = await parallel(
  files.map(file => () => agent(
    `${file}のセキュリティ問題をレビューして`,
    { model: "haiku", schema: IssueList }
  ))
)

// 統合：Opusエージェントがすべてをマージ
const report = await agent(
  `これらのレビューを一つの優先度付きレポートにまとめて：\n${JSON.stringify(reviews)}`,
  { model: "opus" }
)
このパターンが実践で多用される理由は、単一コンテキスト作業の「一度に多すぎる」という失敗を解決するからです。各サブエージェントは自分の担当箇所だけを見る。オーケストレーターが50の無関係な詳細に気を取られることはありません。
使いどきの目安は3つです。

作業項目が明確に列挙できるとき（50ファイル、200エンドポイント、100レビュー）
各項目が独立していて、他の項目の出力を必要としないとき
最後にバラバラな部分レポートではなく、統合された1つの答えが欲しいとき


 パターン3：Adversarial verification（敵対的検証）
self-preferential biasへの構造的な修正策です。スポーンされたエージェントごとに、別のスポーンされたエージェントがルーブリックに基づいて出力を敵対的に検証します。検証者は元の作業を見ていないので、それに肩入れできません。
重要なのはペアリングのルール：検証者はルーブリックと成果物だけを知るべきで、誰が生成したかは知らせない。そうしないと、プロンプトのヒントを通じて自己優先バイアスが入り込んでしまいます。
このパターンが特に重要な場面です。

レポート内のすべての事実的な記述を、独自の検証サブエージェントが元のソースに対して確認するファクトチェック
作成者エージェントが修正を書いて、レビュアーエージェント（別のコンテキスト）がそれをレビューするコードレビュー
何かが出荷される前に、それに対する最も弱いケースを見つけようとする品質ゲート


 パターン4：Generate-and-filter（生成してフィルタリング）
あるトピックについてアイデアを生成し、ルーブリックや検証でフィルタリングし、重複を除去し、品質の高いものだけを返します。
「最良の答え」を求めることの逆です。最良の答えを求めるとClaudeは早期にコミットする。Generate-and-filterは、すべてのオプションが評価された後に遅くコミットさせます。

 パターン5：Tournament（トーナメント）
作業を分割する代わりに、エージェントを競わせます。N個のエージェントがそれぞれ異なるアプローチで同じタスクに取り組み、1つが勝つまでペアワイズ形式で結果を審査します。
スコアでソートするより信頼性が高い理由：1,000個のアイテムを1つのプロンプトでソートしようとすると、品質が劣化してコンテキストにも収まらない。トーナメントはブラケットを新鮮なエージェントに分割し、それぞれが2アイテムだけを比較します。ブラケット自体はコード内の決定論的なループ（コンテキストではない）にある。
デザインの選択・候補者の選定・コンテンツの優先付けといった好みベースのランキングにも同じアイデアが使えます。

 パターン6：Loop until done（完了まで繰り返す）
作業量が不明なタスクに対して、固定回数のパスを実行するのではなく、停止条件が満たされるまでエージェントのスポーンをループします。停止条件の例としては「新しい発見がない」「ログにエラーがない」「理論が検証された」などです。
「実際に完了するまで続ける」への答えです。

フレーキーなテストのデバッグ：再現、理論を立てる、テストする、1つの理論が成立するまで
バグハンティング：完全なパスでゼロが返るまでバグを探し続ける
パターンの掘り起こし：新しいクラスタが現れなくなるまでクラスタリングと規則の特定を繰り返す

/goalとペアにして完了要件を設定しましょう（「1つの理論が機能するまで止まるな」）。停止条件はコードにある。アクティブなイテレーションだけがコンテキストに残ります。

 パターンの組み合わせ方
実際のワークフローでは、2〜4つのパターンを組み合わせます。



ユースケース
使うパターン




マイグレーション・リファクタリング
Fan-out → Adversarial verification → Loop until done


深いリサーチ
Fan-out（並列ウェブ検索）→ Adversarial verification → Synthesize


1,000件以上のアイテムのソート
Tournament（ペアワイズ比較）


根本原因の調査
Generate theories → Panel of verifiers/refuters → Loop


大規模トリアージ
Classify-and-act → Dedupe → Fix or escalate


デザイン・命名の探索
Generate-and-filter → Tournament with rubric


軽量Eval
Run in worktree → Comparison agents grade → Refine and re-grade



パターンを内面化する正しい方法は、今のタスクがどの失敗モードに陥っているかを特定して、それを構造的に防ぐパターンを選ぶことです。

ドリフトが起きている → Fan-out
自己優先が問題 → Adversarial verification
終わりが見えない → Loop until done
スコアリングが難しい → Tournament


 運用のコツ：/goal、/loop、トークン予算
ワークフローはコストが増えます。3つの設定で「クールだが高価」から「無人で実行できるツール」に変わります。


/goal：ハードな完了要件を設定する。Loopパターンとペアにする（「1つの理論が機能するまで止まるな」）。/goalなしでは最初のソフトな完了ポイントで止まる。

/loop：ワークフロー全体を繰り返しスケジュールで実行する。継続的に実行したいワークフローに使う（トリアージ、週次リサーチ更新、定期検証）。

明示的なトークン予算：プロンプトで「1万トークン使って」と伝える。これがないと野心的なワークフローが期待値の5〜10倍に膨れ上がる。

> ultracode この前提の素早い敵対的レビュー：
  「Postgresへの移行でシャードの再バランスが不要になる」
  5kトークン使って。/goal 反例か3つの独立した確認が
  得られるまで止まるな。
Anthropicのチームも「ベストプラクティスはまだ発展中。Dynamic Workflowsはトークンを多く使うことが多いので、いつどのように使うか慎重に考えて」と言っています。普通のClaude Codeセッションが5分で終わるタスクならワークフローは不要です。

 信頼できない入力にはQuarantineパターンを
サポートチケット・バグレポート・ユーザーフィードバック・スクレイピングされたデータなど、信頼できない公開コンテンツを読むワークフローは、プロンプトインジェクションの可能性を前提にする必要があります。
修正策はQuarantine（隔離）です。信頼できないコンテンツを読むエージェントは、高権限のアクションを実行できないようにする。生のコンテンツに触れていない別のエージェントが実際のアクションを担当します。
ユーザー提出のコンテンツを処理する場合、公開Webページをスクレイピングする場合、サードパーティAPIからの出力を処理する場合は必ず適用しましょう。読み取り専用のリーダーエージェントはほぼコストがかからず、プロンプトインジェクションリスクをまるごと排除できます。

 ワークフローを保存してSkillとして配布する
ワークフローが機能したら保存しましょう。ワークフローメニューでsを押す。保存されたワークフローは~/.claude/workflowsに入ります。そこから2つの選択肢があります。

ローカルに保持して自分のプロジェクト全体で再利用する
Skillとして配布する：JavaScriptファイルをSkillフォルダ内にバンドルし、SKILL.mdで参照すれば、そのSkillをインストールした誰もが同じワークフローを実行できる

1つ実用的なポイント：ワークフローをSkillにパッケージするとき、Claudeに「このワークフローをそのまま実行するスクリプトではなく、テンプレートとして扱って」と指示しましょう。そうすることで、全体的な構造を保ちながらも、タスクに応じてワークフローの形を適用させる余地が生まれます。

 よくある失敗

普通のClaude Codeセッションで十分なのにワークフローを使う。ほとんどの従来のコーディングタスクは5人のレビュアーのパネルを必要としない
トークン予算なし。明示的なキャップなしで野心的なワークフローは5〜10倍に膨れ上がる
1つのエージェントが作業と検証の両方をやる。self-preferential biasが検証者を作業者に肩入れさせる。両者は分離されなければならない

parallel()とpipeline()を互換として扱う。バリアが重要。parallelはすべてを待ち、pipelineはストリームする
Loopパターンで/goalを省略する。ワークフローが最初のソフトな完了ポイントで早期終了する
信頼できないコンテンツをアクターに届かせる。ユーザー提出のものを処理するなら隔離は省略不可
絶対スコアでソートする。比較判断の方が信頼性は高いので、トーナメントを使う
機能するワークフローを保存しない。毎週同じ形を再プロンプトするのは時間の無駄


Dynamic Workflowsはまだベストプラクティスが発展中の機能です。でも6つのパターンと失敗モードの対応関係を頭に入れておけば、どんなタスクが「ワークフロー向き」かの判断がかなりクリアになります。ultracodeで試してみるのが一番の近道です。

---

## 16. [AIに渡す指示書の役割分担: AGENTS.md/SKILL.md/DESIGN.mdと仕様駆動開発の現在地](https://zenn.dev/genda_jp/articles/f71d3ed7d4d7e8)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/4
- **AI要約**:
  AI指示書を動き方・個別タスク・見た目の3層に分離し、仕様として定義する手法を解説している。
  DESIGN.mdはYAMLトークンとCLI検証ツールを備え、AIによるUI生成の一貫性を機械的に保証する。
  AGENTS.mdとSKILL.mdにより、エージェントの行動境界と特定タスクの手順を構造化し検証可能にする。
- **今読む理由**: AI駆動開発において指示書の肥大化と曖昧さを防ぐための、最新の標準化仕様（AGENTS.md等）の具体的な構造と検証エコシステムが明記されているため。CursorやClaude Codeの挙動を安定させる設計原則として即時適用できる。
- **タグ**: #AI駆動開発, #仕様駆動開発(SDD), #DESIGN.md, #自動化パイプライン, #デザインシステム

### 本文
2026年4月、Google Labsが DESIGN.md という仕様を公開しました。AIエージェントが読めるデザインシステムの仕様で、npx @google/design.md lint というCLI検証ツールがセットになっています。
DESIGN.md の登場で、AIエージェントに渡す指示書ファイルが3種類目に揃いました。2025年から業界標準として広がってきた AGENTS.md（OpenAI・Google・Sourcegraph・Cursor・Factoryらが共同で策定、2025年12月にLinux Foundationへ寄贈）、Anthropic Claude Skillsの中核となる SKILL.md、そしてこの DESIGN.md です。それぞれが扱う対象は重なっていません。
本記事の対象読者は、Claude Code・Cursor・Codexのようなコーディングエージェントを業務に組み込んでいる開発者と、CLAUDE.md やスタイルガイドのような自然言語の指示書を運用しているチームリードを想定しています。仕様駆動開発（Spec-Driven Development、以下SDD）の文脈で開発しているチームにも届くはずです。
これから整理するのは、AIに渡す指示書が動き方・個別タスク・見た目の3層に分かれ始めている構造と、それがSDDという別の流れとどう接続するか、という二点です。

 これまでの型: 自然言語ドキュメント
ChatGPTが出てから数年、エンジニアの多くは何らかの形で「AIに守らせたいルール」をMarkdownファイルに書いてきました。CLAUDE.md、styleguide.md、CONTRIBUTING.md、社内のコーディング規約。書く場所は違っても、形式はおおむね同じく、構造化されていない自然言語です。
私がここ数ヶ月で書きためてきた writing-style-guide.md もこの典型と言えます。Zenn記事の執筆をClaudeと進めるにあたり、AI生成テキストに残りがちなクセを禁止表現として書きためてきたファイルです。Claude Desktopに毎セッションで読ませることで、出てくる文章のトーンが揃うようになりました。前回の記事「Markdownだけで作るハーネスエンジニアリング」で書いた、業務エージェントのハーネスとして使っている個人リポジトリの一部にあたります。

このファイルには、emダッシュ「——」を使わない、「〜してみましょう！」のような呼びかけを避ける、「興味深かったのは」のような前振りを削る、といったルールが150行ほど書かれています。同じリポジトリの agents/ 配下には、組織別・ロール別に15本ほどの指示書ファイルが並んでいます。executive-assistant.md、sre-support.md、qa-support.md、accounting.md。それぞれが「このロールで動くときの前提」を自然言語で書いています。
このやり方には、はっきりした効果があります。文体・スタンス・暗黙のルールを明文化できる。チームに共有して新しいメンバーが入ったときも、ファイルを読んでもらえれば期待値が伝わる。CLAUDE.md ならClaude Codeが毎セッションで読み込むので、人格的な指示が一貫して届きます。
ただし、限界もあります。一つ目は検証が人間任せになる点です。書いてあるルールが守られたかどうかを、レビュー時に人間が読んで判断するしかない。二つ目は属人性が残る点です。「丁寧に書く」と書いても、丁寧さの基準がレビュアーによってブレてしまいます。
三つ目の限界が、本記事で本題になる部分です。形式的に検証可能なルール（禁止表現の混入、emダッシュの使用、特定パターンの一致）と、判断系のルール（文体のトーン、構造の妥当性、共感ベースの入り方）が同じファイルに混在しているため、検証可能なものまで人間レビューに頼ってしまう。これがこのあと整理する三つの新しいファイル形式が解決しようとしている問題です。

 新しい型 1: DESIGN.md（Google Labs）が示す、見た目の仕様化
2026年4月、Google Labsが google-labs-code/design.md というリポジトリで DESIGN.md の仕様を公開しました。スター数は5月初旬時点で11,000超。Google Stitch（stitch.withgoogle.com）というAIによるUI生成プロダクトのリファレンス実装にあたるものです。

仕様ドキュメントはStitch側にあります。

DESIGN.md が扱うのは、デザインシステムの仕様です。ファイル先頭のYAMLに機械可読なデザイントークン（色、タイポグラフィ、スペーシング、コンポーネント）を書き、その下のMarkdown本文に人間可読な設計意図を書く。両者が同じファイルに同居します。
---
name: Heritage
colors:
  primary: "#1A1C1E"
  tertiary: "#B8422E"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
---

## Overview

Architectural Minimalism meets Journalistic Gravitas.

## Colors

- Primary (#1A1C1E): Deep ink for headlines and core text.
- Tertiary (#B8422E): "Boston Clay", the sole driver for interaction.
このフォーマットの目玉は、CLIでの検証ツールがセットになっていることです。
npx @google/design.md lint DESIGN.md
トークン参照の整合性、WCAGコントラスト比、構造規約の遵守を検証して、JSON形式で結果を返します。CIに組み込めばPRごとにデザインシステムの整合性をチェックできる形です。diff コマンドもあり、二つの DESIGN.md を比較してtoken-levelの変更を構造化して返します。デザインシステムのバージョン管理という、これまで属人的だった領域に検証可能性が入ります。
日本語UIに関しては、Google Labs本家のサンプルだけでは不足します。日本語特有のタイポグラフィ要件（CJKフォントフォールバック、行高、letter-spacing、禁則処理、混植）が定義されていないためです。これを補うのが kzhrknt/awesome-design-md-jp で、Apple Japan・SmartHR・freee・note・MUJI・メルカリ・LINE・Toyotaなど10以上の日本サービスを対象に、日本語UIに対応した DESIGN.md が公開されています。日本語のプロダクトに適用するなら、本家と日本版を併用するのが現実的かもしれません。

DESIGN.md が担うのは、これまでFigmaファイルやスタイルガイドPDFに散らばっていたデザインシステムを、機械可読かつ人間可読のハイブリッド形式で一つのファイルに集約することです。AIエージェントがUIを生成するときの「毎回ぶれない見た目」を支える仕様基盤、と位置付けるとよさそうです。

 新しい型 2: SKILL.md（Anthropic）とAGENTS.mdが担う、動き方の仕様化
DESIGN.md が「見た目」を担うのに対して、SKILL.md と AGENTS.md 系列が担うのは「動き方」です。エージェントが何をしようとし、どんな手順で動き、何をしてはいけないかを定義する領域になります。
SKILL.md はagentskills.ioが標準化したAgent Skillsオープン標準のファイル形式です。AnthropicのClaude Skillsはこの標準の実装の一つで、同じ SKILL.md をClaude Code・Claude.ai・Agent SDKのいずれからも参照できます。標準準拠なので、OpenClawやHermesといった他社のエージェントからも同じファイルが読めます。ファイル先頭のYAMLでメタデータ（スキル名・用途・許可ツール）を宣言し、その下のMarkdown本文にタスクの手順や専門知識を書く構造です。

SKILL.md の具体例としてわかりやすいのが conorbronsdon/avoid-ai-writing です。英語のAI生成テキストに残るパターン（「Moreover」のような接続表現、「watershed moment」のような誇張、「serves as」のような持って回った動詞表現）を検出して書き直す、英語専用スキルです。100語超の置換テーブルが3層（Tier 1は常に置き換え、Tier 2は同じ段落内で2語以上が出現したときflag、Tier 3は高密度のときのみflag）で組まれ、36のパターンカテゴリで監査します。detect モードと rewrite モードがあり、目的に応じて使い分けられます。

ワンショットのプロンプトと違うのは、構造化された監査結果が返ってくるところです。rewrite モードでは、識別された問題、書き直し版、変更サマリ、二回目の監査結果が四つの独立したセクションで返ってくる。「何が変わったか」「なぜ変えたか」が透明になります。
AGENTS.md は、エージェント全体の動き方を扱います。プロジェクトの前提、ロール、禁止事項、エスカレーションのルール。冒頭で触れたとおりSourcegraphのAmpチームが起点で、現在はOpenAI・Google・Cursor・Factoryらが共同で推進し、2025年12月にLinux Foundationへ寄贈されています。CLAUDE.md はClaude固有の AGENTS.md と考えるとわかりやすいでしょう。Claude Codeは仕様上 AGENTS.md ではなく CLAUDE.md を読み込みますが、AGENTS.md を実体ファイルにして CLAUDE.md をsymlinkとして張るのが、agents.md 公式が推奨するパターンです。冒頭で紹介した私の運用するリポジトリで言えば、agents/ 配下のファイル群がこの層に当たります。
SKILL.md と AGENTS.md はカバー範囲が違います。AGENTS.md は「全体の前提と境界」、SKILL.md は「特定タスクの実行ユニット」を担います。
たとえば、上で挙げた英文の文体監査スキル（avoid-ai-writing）は特定タスクなので SKILL.md の形で配布されます。一方、QAロールの前提や関わり方を書いた agents/genda/qa-support.md のようなファイルは、エージェントの境界を定義するものなので AGENTS.md 系の置き場になります。
これらの形式が共通して扱うのは、見た目ではなく「振る舞い・手順」の領域です。エージェントが何を知っていて、何を任され、何をしてはいけないか。それを検証可能な形で固定する取り組みと読めます。

 3層分業の整理
ここまで見てきた三つのファイル形式を整理すると、それぞれが扱う層がはっきり分かれます。



層
形式
何を担うか
例




動き方

AGENTS.md / CLAUDE.md（自然言語 + ルール）
エージェント全体の前提、ロール、禁止事項

CLAUDE.md、agents/genda/qa-support.md のようなロール別ファイル


個別タスク

SKILL.md（先頭のYAML + Markdown本文）
再利用可能なタスク単位、手順、専門知識
avoid-ai-writing、社内独自の手順スキル


見た目

DESIGN.md（先頭のYAML + Markdown本文）
デザインシステムの仕様、検証可能な見た目
Google Labs 本家の仕様、kzhrknt/awesome-design-md-jp の各サービスファイル



三つは競合関係ではなく分業関係にあります。bergside/typeui のような CLI は、SKILL.md と DESIGN.md のどちらの形式でも生成・更新できるツールとして登場しており、これは分業を前提にしたツールチェーンの現れと言えます。

3層の分け方の本質は、「機械可読と人間可読のバランスをどこに置くか」が層ごとに違うという点にあります。AGENTS.md 系列は、ほぼ人間可読寄り。文脈判断やニュアンスを伝えるため、構造化されすぎない方が機能します。SKILL.md は先頭のYAMLで一部構造化されていますが、本文は人間可読寄り。タスクの粒度は人間が読めないと指示できないからです。DESIGN.md は、先頭のYAMLでデザイントークンを機械可読の形で書き、本文で設計意図を人間可読の形で書く。両者が明確に分離されています。
「機械可読寄り」「人間可読寄り」の重心が、層ごとに違う場所に置かれているわけです。これは「層が違うものは別ファイルで管理する」という、当たり前の構造化原則がAIエージェント向けにも適用された結果と読めます。ファイル名そのものもこの分業を素直に表しており、AGENTS.md は「エージェントへの指示」、SKILL.md は「スキル（再利用可能なタスク）」、DESIGN.md は「デザインシステム」と、扱う対象がそのまま命名になっています。
これまで「AIに渡すルール」を一つの CLAUDE.md に全部詰め込んでいたチームは、ここで分割の判断を迫られます。手元の CLAUDE.md を開いて、次のような問いを当てると、分割の候補が見えてきます。

デザインシステムの規約を書いている部分はあるか → あれば DESIGN.md に切り出せる
特定のタスク手順（月次集計、テストレビュー、契約レビュー等）を書いていないか → あれば SKILL.md に切り出せる
残るのは、エージェント全体の前提と境界（ロール、禁止事項、エスカレーションの判断軸）だけ → これが AGENTS.md 相当として残る

つまり、3層分業はファイル分割の判断軸として機能します。

 SDDとの接続
ここで視野を一段広げて、AIに渡す仕様という大きな流れの中で、3層分業がどこに位置するのかを確認しておきます。
SDDは、要件 → 設計 → タスク → 実装の順にspec（仕様）を書いてからコードを生成していく開発スタイルです。「specを書き捨てるのではなく、コードを生み出す実行可能な存在として扱う」という思想がベースにあります。AWSのKiroは .kiro/specs/{feature}/ に requirements.md、design.md、tasks.md を順に生成するワークフローを提供し、GitHubのSpec Kit（スター数も9万超）も /specify /plan /tasks /implement といったスラッシュコマンドで同じ流れを支援しています。Kiroが採用する EARS notation（Easy Approach to Requirements Syntax）は、要件を五つの定型テンプレートに整形することで曖昧さを減らす書き方の規約です。SDDは2025年から2026年にかけて急速に広がってきた領域で、Zennでも「仕様駆動開発」関連の記事は100本を超えています。


3層分業（AGENTS.md / SKILL.md / DESIGN.md）とSDDは、表面的には別々の流れに見えます。SDDコミュニティの議論はKiroやspec-kitの使い方に集中していて、DESIGN.md 側の議論は形式仕様や検証ツールに集中しています。両者を横断する記事はあまり見かけません。
ただ、両者の哲学を並べると、共通点が多くあります。



#
共通する哲学
仕様駆動開発

DESIGN.md / SKILL.md / AGENTS.md





1
実装前に明文化
要件 → 設計 → タスク → 実装
振る舞い → 実装、見た目 → 実装


2
機械可読 + 人間可読の併存

requirements.md（EARS notation）+ 自然言語
先頭のYAML + Markdown本文


3
AIへの永続的コンテキスト

.kiro/specs/{feature}/ を毎回参照

DESIGN.md / AGENTS.md を毎回参照


4
構文の規範化で曖昧さを減らす
EARS notationで要件を構造化（五つのテンプレート）

lint でWCAGコントラスト比や構造規約を検証可能に


5
「決めたこと」を場所として固定
specファイルが意思決定の住処
specファイルが意思決定の住処



両者は「AIに渡す仕様」というより大きな流れの中で、同じ哲学を共有していると言えます。
一方で、両者は同じものではありません。違いを一言で言うと、時間軸が違います。



#
軸
仕様駆動開発

DESIGN.md / SKILL.md / AGENTS.md





1
時間軸
「これから作るもの」を書く
「すでにある規範」を書く


2
スコープ
単一機能・プロジェクトの開発ライフサイクル
永続的な規範・スタイル


3
更新リズム
機能ごとに新規作成 → 消費 → アーカイブ
長期メンテナンス、徐々に成長


4
対象
要件・設計・タスク（動かし方の手続き）
動き方・個別タスク・見た目の規範



SDDのspecは「これから何を作るか」を書きます。requirements.md は「この機能が満たすべき要件」、design.md は「この機能をどう実装するか」、tasks.md は「この機能を作るためのタスク分解」。完成すれば役割を終えて、アーカイブされていきます。
3層分業のspecは「何が常に守られるべきか」を書きます。DESIGN.md は何度UIを作ろうと色とタイポグラフィの規範を提供し、AGENTS.md は何度セッションを跨ごうとエージェントの前提を提供する。長期的にメンテされ、徐々に成長します。
この時間軸の違いから、両者が競合しないことがわかります。一過性のspecと永続的なspecは、両方が同じプロジェクトに併存できる。むしろ、相互参照される将来が見えます。.kiro/specs/checkout-feature/design.md の中で「ボタンは {colors.tertiary} を使う」と書けば、永続的な DESIGN.md が提供する色トークンを、一過性の機能specが参照する形になります。まだ事例として広く確立されたものではありませんが、十分に組み合わせられる構造です。
ここで気になるのは、SDDが活発な領域（Kiroコミュニティ等）とDESIGN.md / SKILL.md / AGENTS.md が活発な領域は、2026年5月時点ではまだ十分に交差していないという事実です。SDD側は「機能をいかに作るか」に集中し、3層分業側は「規範をいかに渡すか」に集中しているのが現状です。
SDDを導入していなくても、3層分業から始めれば「AIに渡す仕様」の入り口に立てます。逆に、SDDを運用しているチームは、機能specの中から DESIGN.md のトークンを参照し始めれば、規範の二重管理を避けられます。両者は次の段階で接続されていく流れにあると言えるでしょう。
過去にKiroの設計思想について整理した記事がありますので、SDD側に関心のある方は参照してみてください。


 すべてが仕様化されるわけではない
3層分業の話を進めると、「全部仕様化したほうがいいのでは」という方向に流れがちですが、そうはなりません。
形式的に検証できないルールは、自然言語ドキュメントのまま残ります。文体のトーン、構造的な判断、文化的なニュアンス。たとえば、記事冒頭の共感ベースの入り方や、結論の余韻の付け方のような感覚的なもの。こうしたものは仕様化のコストに見合わないというよりも、仕様化しようとすると本質が抜け落ちます。
仕様化の判断軸はシンプルで、「形式的に検証可能か」です。

色のコントラスト比（検証可能） → DESIGN.md

用語の言い換え「leverage → use」（検証可能） → SKILL.md

文体のトーン（柔らかい断定、教科書的にしない）、全体のスタンス（教えるトーン厳禁、整理する立場）など（検証不可） → AGENTS.md / CLAUDE.md に残す

小規模チームでは、「自然言語の1ファイル」で十分なケースもあります。CLAUDE.md 一つで運用が回っているなら、無理に分割する必要はありません。仕様化のコストと運用負荷のバランスは、チームサイズと運用継続性で判断すべきでしょう。
3層分業は、SDDと同じく段階的に導入するもので、すべてを一気に仕様化する必要はありません。複雑な領域、検証可能性の効きそうな領域から始めればよいでしょう。
つまり、3層分業はゴールではなく、必要に応じて導入するオプションです。

 どこから手をつけるか
ここまでの整理を踏まえると、いくつかの選択肢が見えてきます。
最初の一手として考えられるのは、自身の CLAUDE.md やスタイルガイドを開いて、形式的に検証可能な部分と判断系の部分を分類してみることです。色やタイポグラフィの規約、用語の言い換えリスト、構造ルール。こうした検証可能な部分が一定量ある場合、DESIGN.md（見た目）か SKILL.md（タスク）のどちらかに切り出す候補を一つ選ぶ。一気に分けず、最も独立性が高いものから始めるほうが安全です。
外部のスキルを取り込む方法もあります。avoid-ai-writing のような既製の SKILL.md を ~/.claude/skills/ に置くと、書き手としての自分のスタンスは変わらず、検証だけ機械に任せられます。
すでにKiroやspec-kitを運用しているチームは、.kiro/specs/{feature}/design.md の中から DESIGN.md のトークンを参照できないか試す段階に入っているかもしれません。機能specと永続specの相互参照は、まだ事例が少ない領域です。
共通するのは「すべてを一気に仕様化しない」という姿勢です。ドキュメント分割 → 運用試行 → 仕様化、という段階移行が現実的でしょう。3層分業は完成形ではなく、進化の途中にある動きだと捉えるのが安全です。
AIに渡すルールは、自然言語ドキュメント1枚から三つの仕様形式へと分業を始めました。それはSDDと同じ流れの、別の側面でもあります。
すべてが仕様になるわけではないけれど、役割が違うものを別ファイルで管理する。当たり前のことが、AIエージェント向けにも回り始めています。

---

## 17. [Claude Code Skillの作り方｜21個運用して分かった設計と育て方](https://zenn.dev/yamato_snow/articles/3cd6ed9ac340a2)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/4
- **AI要約**:
  Claude Codeの振る舞いを制御するSkillの定義方法とYAMLフロントマターの各フィールドを詳説。
  個人環境やプロジェクト単位での配置ルール、および引数渡しや自動発動の仕組みを具体的に解説。
  skill-creatorを用いたスキルの自動生成、評価、改善を行うための実践的な運用サイクルを提示。
- **今読む理由**: AI駆動開発のコアツールであるClaude Codeの効率を劇的に高める具体的設定ファイル(SKILL.md)の構造と、自動化パイプラインの構築手法が即座に適用可能な形式でまとめられているため。
- **タグ**: #Claude Code, #AI駆動開発, #ワークフロー自動化, #LLM-Ops

### 本文
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

---

## 18. [Claude Codeのサブエージェントを使い倒す ── Anthropic公式「計画・生成・評価」3分離パターンの実践 #ClaudeCode - Qiita](https://qiita.com/nogataka/items/efe8eb9df612d2211221)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/4
- **AI要約**:
  単一AIエージェントが陥る「コンテキスト不安」と自己評価の甘さを構造的に解決する手法を解説
  Anthropic公式の「計画・生成・評価」の3分離設計により、生成物の品質と信頼性を大幅に向上させる
  Playwright MCPを活用した実機テストなど、評価エージェントを懐疑的に運用する具体策を提示
- **今読む理由**: AI駆動開発において、エージェントが「動かないコード」を生成する根本原因と、その回避策である3エージェント設計（Planner/Generator/Evaluator）が詳述されているため。特に自動化パイプライン構築における『評価の分離』は即時適用可能な重要設計です。
- **タグ**: #Claude Code, #AIエージェント設計

### 本文
はじめに：単一エージェントの限界
Claude Codeを日常的に使っていると、あるタイミングから出力品質が落ちる瞬間に気づきます。長い会話の中でコンテキストウィンドウが埋まっていき、モデルが「考えながら手を動かす」状態に陥るのです。
具体的には以下のような現象が起きます。

計画と実装が混在し、タスクの全体像を見失う
調査結果がコンテキストを圧迫し、肝心の実装フェーズで情報が薄まる
生成したコードを自分で評価すると「自画自賛」になりがちで、品質チェックが甘くなる
コンテキストの残りが少なくなると、検証を省略して「たぶん動く」で終わらせようとする（いわゆる「コンテキスト不安」）

Anthropicのエンジニアリングチームはこの現象を context anxiety と名付け、自分たちのハーネス設計記事の中でも繰り返し言及しています。筆者が半年以上Claude Codeを日常業務に組み込んでみた肌感としても、単一エージェントで300〜400ターンを超えた頃からエージェントが「早く終わらせよう」として検証を省き、存在しない関数名を書いて押し切ろうとする挙動が明確に出始めます。
これは単一エージェントが「計画」「実装」「評価」を1つのコンテキストで全部やろうとしている構造的な問題です。人間のチーム開発でも、設計・実装・レビューを同一人物が一気にやると品質が下がるのと同じ構図で、計画のための思考と実装のための思考と評価のための思考が相互に干渉します。

なぜ「3エージェント分離」が生まれたのか
Anthropicのエンジニアリングブログを読むと、3エージェント分離という設計は最初からあったわけではなく、「単一エージェントをどこまで長時間走らせられるか」を徹底的に試した結果として追い込まれて生まれたものだと分かります。
最初期のハーネスは、Opus 4.5 1体にOS環境とgitを渡して、フルスタックアプリケーションを構築させるものでした。ベースラインの単体実行は20分・コスト9ドル程度で完走しますが、出来上がるアプリは一見動くものの、中核機能が壊れていたり、UIが不自然だったり、スタブ実装が本物の機能の顔をしていたりして、プロダクトとして使い物にならなかったと報告されています。
記事中には、単体実行の典型的な失敗として次のような事例が列挙されています。

コア機能が壊れているのに表面上はエラーが出ない（静かに失敗する）
ワークフローが硬直していて、人間のユーザーが直感的に使えない
機能が「スタブだけ実装」で終わっていて、ボタンを押しても何も起きない
エッジケースがまったく考慮されていない

ここで興味深いのは、これらの失敗の多くが「コードの品質」というよりも「自己評価の品質」の問題だった、という分析です。Anthropicは次のように明言しています。

When asked to evaluate work they've produced, agents tend to respond by confidently praising the work—even when, to a human observer, the quality is obviously mediocre.

（エージェントに自分の作ったものを評価させると、人間から見れば明らかに凡庸な品質でも自信満々に褒めてしまう傾向がある）
そして決定打となったのが次の一文です。

Tuning a standalone evaluator to be skeptical turns out to be far more tractable than making a generator critical of its own work.

（独立した評価エージェントを懐疑的にチューニングする方が、生成エージェントに自分の仕事を批判的に見させるよりはるかに扱いやすい）
つまり「生成者に自己批判させる」というアプローチは、プロンプト工夫ではなかなか突破できない壁だった、という前提があります。3エージェント分離は、この壁を設計で回避するために選ばれた構造です。

Anthropic公式「計画・生成・評価」3エージェント設計
Anthropicは2025年末から2026年にかけて、長時間稼働エージェントのハーネス設計に関する一連の記事を公開しました。「Harness design for long-running application development」で紹介されたGAN（敵対的生成ネットワーク）にインスパイアされた3エージェント設計は、サブエージェント活用の実践的な指針になります。

3つのエージェントの役割
[ユーザー入力] → [Planner] → [Generator] ⇄ [Evaluator] → [成果物]
                     ↑                          |
                     └────── フィードバック ──────┘


1. Planner（計画エージェント）
ユーザーからの1〜4文の短い要件を受け取り、包括的なプロダクト仕様に展開します。ここで重要なのは「野心的なスコープを設定しつつ、細かい技術的詳細には踏み込まない」という設計思想です。Anthropicのチームは、Plannerの役割を product context and high level technical design rather than detailed technical implementation と表現しています。技術詳細を計画段階で詰めすぎると、下流でエラーが連鎖するためです。
Plannerの成果物はファイルとして書き出され、後続のエージェントはそのファイルを読んで作業します。これによりエージェント間の通信がメインスレッドのトークンを消費しません。ファイルは単なるメッセージ経路ではなく、「セッションをまたいで引き継ぐ共有記憶」としても機能します。

2. Generator（生成エージェント）
Plannerが作成した仕様に基づき、機能を1つずつスプリント形式で実装します。各スプリントの前にEvaluatorと「スプリント契約（sprint contract）」を結び、「何ができたら完了か」をテスト可能な基準まで事前に合意するのが特徴です。
契約の中身は次のような構造になります。

このスプリントで実装する機能の一覧（ユーザーストーリー単位）
各機能の「動作確認の手順」（Playwrightで自動テストできる粒度）
完了と見なすための合否条件（数値や状態の期待値）

Generatorはgitでバージョン管理を行い、各機能の実装完了後にコミットします。これによりEvaluatorが git diff でレビューしやすくなり、問題があった場合のロールバックも容易になります。Anthropicの事例では、Generatorは React + Vite + FastAPI + SQLite/PostgreSQL を標準スタックとして採用しています。

3. Evaluator（評価エージェント）
Generatorが実装したコードを、実際にユーザーの視点でテストします。Anthropicの実装では Playwright MCP を使い、UIの動作確認、APIエンドポイントのテスト、データベースの状態検証まで行います。
評価基準は以下4軸で、基準を満たさない場合はフィードバックが戻り、再実装ループが回ります。



軸
見るポイント




Product depth
機能が「スタブ」ではなく本物として成立しているか


Functionality
全体のワークフローが一貫して動くか


Visual design
UIがユーザーに意味を伝えているか


Code quality
保守性・可読性・構造は妥当か



Evaluatorのフィードバックは、「良くない」といった抽象的な評価ではなく、具体的な現象として返されます。Anthropicが例示しているフィードバック文は次のようなものです。

Rectangle fill tool allows click-drag to fill a rectangular area with selected tile—FAIL — Tool only places tiles at drag start/end points instead.

（矩形塗りつぶしツールは選択タイルでドラッグ範囲を塗りつぶせるはず → FAIL → 実際にはドラッグの始点と終点にしかタイルが置かれない）
この具体性があるからこそ、Generatorは「どこが悪いか」ではなく「どこを直すか」に即座に着手できます。Anthropicは Opus 4.5 時代の実行で「solo 20分 $9 に対してフルハーネス 6時間 $200」とコスト差を明かしつつ、それでもハーネスを使う価値があったと述べています。Opus 4.6 世代ではスプリント分解の必要性が下がった一方、Evaluator自体の価値はむしろ上がり、「audio recording is still stub-only」「clip resize by edge drag not implemented」のような人間が見落としがちな欠落を拾い続けた、という報告があります。

なぜ3つなのか
「2つではだめか、4つならどうか」という疑問に、筆者なりの整理を加えておきます。
2分割（生成と評価）の構成も考えられます。ただしこれだけだと、生成エージェントが目の前のコードを書きながら頭の中で全体計画も維持しなければならず、結局は単一エージェントと同じコンテキスト圧迫問題を抱えたまま評価者だけが独立する形になります。計画を先に切り出すことで、Generatorは「この1機能だけ」に集中できます。
4分割（計画・設計・実装・評価）も試せますが、現行のClaude Codeはサブエージェントの入れ子呼び出しを禁止しており、オーケストレーション層の負担が急に重くなります。さらに「設計」と「計画」は実質的に同じ認知タスクで、モデルに分けさせてもトークンが2倍かかるだけで品質はほとんど変わらないというのが筆者の実感です。
結果として、「What を決める Planner」「How を決めて書く Generator」「動いているかを見る Evaluator」という3つに落ち着きます。それぞれの役割が人間の認知タスクとして独立しているため、分離のメリットがコストを上回ります。

なぜ評価を分離するのか
この設計の核心は「生成と評価の分離」にあります。Anthropicのブログでは次のように述べられています。

スタンドアロンの評価エージェントを懐疑的にチューニングする方が、生成エージェントに自分の仕事を批判的に見させるよりはるかに扱いやすい

自分で書いたコードのバグは人間でも見つけにくいものです。ここにはLLM特有の事情も重なります。生成エージェントのコンテキストには「自分がどういう意図でその行を書いたか」の痕跡が大量に残っており、評価のときもその意図バイアスを引きずってしまうのです。
評価を別プロセスに分離すると、Evaluatorの入力はコードと要件だけになり、書き手の意図は見えません。この「意図が見えない」という制約こそが、第三者視点の厳しさを再現しています。Anthropicも初期のEvaluatorが「問題を見つけておきながら、自分で大したことないと言いくるめて承認する」失敗をしたと書いていて、これを防ぐために評価者のプロンプトを「懐疑的に」寄せて繰り返し調整したと報告しています。

Claude CodeのAgent Toolの仕様と制約
ここからは、上記の3エージェント設計をClaude Codeで実装するための具体的な仕組みを見ていきます。

サブエージェントの基本構造
Claude Codeのサブエージェントは .claude/agents/ にMarkdownファイルとして定義します。YAMLフロントマターで設定を記述し、本文がそのままシステムプロンプトになります。
---
name: my-agent
description: このエージェントをいつ使うかの説明
tools: Read, Grep, Glob, Bash
model: sonnet
---

あなたは○○の専門家です。以下のルールに従って作業してください。
...


知っておくべき重要な制約
サブエージェントを効果的に使うために、以下の制約を理解しておく必要があります。

サブエージェントはメインの会話コンテキストを見ることができない。受け取るのは自身のシステムプロンプトと、呼び出し時に渡されるタスク記述のみ
サブエージェントは他のサブエージェントを起動できない（ネスト不可）
結果はサマリーとしてメインに返される。途中の思考過程やツール実行ログは返らない
ビルトインのサブエージェント（Explore, Plan, general-purpose）が既に存在し、Claudeが状況に応じて自動的に使い分ける


なぜAgent Toolはコンテキストを共有しないのか
この仕様は初見では不便に感じますが、設計意図を知ると納得できます。もしサブエージェントがメインの会話をすべて読める設計だったとすると、次のような問題が起きます。

サブエージェントが増えるたびにコンテキストが雪だるま式に膨らみ、長時間稼働でトークン消費が破綻する
「親の文脈」に引きずられて独立した評価や調査ができない
キャッシュが効きにくくなり、レイテンシとコストが両方悪化する

つまり「共有しない」のではなく「共有させないことで独立した判断を担保している」のです。Anthropicの他記事でも、ファイルを通じた非同期通信を推奨する理由として、エージェント間の疎結合と再現性を挙げています。
この制約を前提にすると、3エージェントパターンにおけるファイル通信の必然性も理解できます。Plannerの成果物を .claude/plans/*.md に、Generatorの進捗を claude-progress.txt に、機能リストを feature_list.json に置くのは、単なる便利機能ではなく「コンテキスト汚染を防ぐ唯一の手段」だからです。JSONが選ばれるのもMarkdownより「不要な書き換え」が起きにくいためで、Anthropicも feature_list.json にステータスだけを書き換えさせる運用をしています。

効果的なプロンプト設計
サブエージェントがメインの会話を見られないという制約は、プロンプト設計に大きな影響を与えます。サブエージェントへの指示は「自己完結」していなければなりません。
悪い例：
さっき話した仕様に基づいてコードを書いて

良い例：
以下の仕様に基づいてユーザー認証APIを実装してください。
- エンドポイント: POST /api/auth/login
- 入力: { email: string, password: string }
- 出力: { token: string, expiresAt: string }
- バリデーション: emailは有効な形式、passwordは8文字以上
- 対象ファイル: src/routes/auth.ts
- 使用ライブラリ: jose (JWT), bcrypt
- 完了条件: 既存のvitestスイートが全件PASSすること

情報を冗長にでも含めることで、サブエージェントはコンテキストの欠如に悩まされず作業を完了できます。筆者は「迷ったらもう1段具体的に」を合言葉にしています。

並列実行と逐次実行の使い分け
Claude Codeのサブエージェントは並列実行が可能です。使い分けの基準は明確です。

並列実行：互いに依存関係のない調査タスク、複数ファイルの独立したレビュー、異なるモジュールの実装
逐次実行：前のエージェントの出力が次のエージェントの入力になる場合（計画 → 生成 → 評価のパイプライン）

3エージェントパターンでは、パイプライン全体は逐次実行ですが、Generator内で複数の独立した機能を実装する場合は並列化できます。判断基準は「このタスクは他のタスクのファイル出力を読む必要があるか」の一点だけです。読む必要がなければ並列、あれば逐次で、迷う余地はありません。

実装例：3エージェントパターンのサブエージェント定義
ここからは、実際に3エージェントパターンをClaude Codeのサブエージェントとスラッシュコマンドで実装する例を示します。筆者のリポジトリで実際に運用しているものを簡略化して掲載します。

計画エージェント
.claude/agents/planner.md：
---
name: planner
description: 機能追加や変更の要件を受け取り、実装計画を作成する。「計画して」「設計して」のようなタスクで使用する。
tools: Read, Grep, Glob
model: inherit
---

あなたは経験豊富なソフトウェアアーキテクトです。

## 作業手順

1. 要件を分析し、既存コードベースの関連部分を調査する
2. 以下の形式で実装計画を作成する
3. 計画を `.claude/plans/YYYYMMDD-<topic>.md` にMarkdownファイルとして保存する

## 計画フォーマット

| セクション | 内容 |
|-----------|------|
| 目的 | なぜこの変更が必要か（3行以内） |
| 変更対象 | ファイル・操作・変更内容のテーブル |
| 実装手順 | 番号付きリスト。各ステップで対象ファイル・関数を明記 |
| 検証方法 | チェックリスト形式（Generator自己チェック + Evaluator評価） |
| リスク | 副作用・破壊的変更・依存関係 |

## 制約

- 技術的な詳細を詰めすぎない。Generatorが判断できる余地を残す
- 各ステップは独立してテスト可能な粒度にする
- 既存のテストやCIを壊さないことを前提に設計する
- `sprint contract` として、完了条件をGeneratorとEvaluatorの両方が解釈できる形で書く


生成エージェント
.claude/agents/generator.md：
---
name: generator
description: 実装計画に基づいてコードを生成・編集する。「実装して」「コードを書いて」のようなタスクで使用する。
tools: Read, Write, Edit, Grep, Glob, Bash
model: inherit
permissionMode: acceptEdits
---

あなたは熟練したソフトウェアエンジニアです。

## 作業手順

1. `.claude/plans/` から該当する計画ファイルを読む
2. 計画の各ステップを順番に実装する
3. 各ステップ完了後、自己チェックを行う
4. 1機能ごとに `git commit` する（メッセージに計画のステップ番号を含める）
5. すべて完了したら `.claude/progress/YYYYMMDD-<topic>.md` に作業ログを残す

## コーディングルール

- 既存コードのスタイルに合わせる
- 型安全性を最優先にする
- エラーハンドリングを省略しない
- 各変更は最小限の影響範囲に留める

## 自己チェック項目

- [ ] 型エラーがないか（tsc --noEmit）
- [ ] lintが通るか
- [ ] 既存テストが壊れていないか
- [ ] 計画の「検証方法」に書かれた手順をすべて実行したか


評価エージェント
.claude/agents/evaluator.md：
---
name: evaluator
description: 生成されたコードをレビューし、テストを実行する。「レビューして」「評価して」のようなタスクで使用する。
tools: Read, Grep, Glob, Bash
model: inherit
---

あなたは厳格なコードレビュアーであり、QAエンジニアです。
生成エージェントの意図は一切考慮せず、コードと仕様書の事実関係だけで判断します。

## 評価基準

| 軸 | 重み | 判定ポイント |
|----|------|------------|
| Product depth | 高 | 機能がスタブでなく本物として成立しているか |
| Functionality | 高 | 要件の全ワークフローがエンドツーエンドで動くか |
| Visual / UX | 中 | UIが自己説明的か、エラー時の挙動が妥当か |
| Code quality | 中 | 可読性・保守性・DRY・エラーハンドリング |

## 作業手順

1. `.claude/plans/` から計画ファイルを読み、要件を把握する
2. `git diff <base>..HEAD` で変更全体を確認する
3. テストを実行する（`npm test` など）
4. 必要に応じてPlaywright経由で実ブラウザ動作を確認する
5. 以下の形式で評価レポートを出力する

## 評価レポート形式

### 判定: PASS / FAIL / NEEDS_REVISION

#### 良い点
- 具体的に

#### 問題点（FIXが必要）
- [重大度: HIGH/MEDIUM/LOW] 「事実 → 期待 → 実際」の順で記述。例：
  `login 時に無効なメールを弾くはずが、空文字列でも200を返す (src/routes/auth.ts:42)`

#### 改善提案（任意）
- 

## 重要なルール

- 生成エージェントの意図を好意的に解釈しない
- 「動くからOK」は許容しない。保守性と可読性も評価する
- テストが不足している場合は必ず指摘する
- 自分が出しかけた指摘を「大したことない」と取り下げない

最後の「取り下げない」という一文は、Anthropicが報告していた「Evaluatorが自分で自分を言いくるめてPASSにする」失敗を受けたものです。筆者のリポジトリでも、この1行を足す前と後でFAIL判定の精度が明確に変わりました。

パイプラインを統合するスラッシュコマンド
.claude/commands/feature-pipeline.md：
# 機能追加パイプライン

3エージェントパターンで機能追加を実行します。

## 手順

1. planner エージェントに $ARGUMENTS を渡し、実装計画を作成させる
2. 計画の内容をユーザーに確認する（承認されるまで進めない）
3. generator エージェントに計画ファイルのパスを渡し、実装させる
4. evaluator エージェントに計画ファイルのパスと差分範囲を渡し、レビューさせる
5. evaluator の判定:
   - PASS: 完了レポートを出力
   - NEEDS_REVISION: 指摘点を整理して generator に差し戻す
   - FAIL (3回連続): planner からやり直すことをユーザーに提案する
6. 最大3イテレーションで収束しない場合はユーザーに判断を仰ぐ

## 引数

$ARGUMENTS を要件として使用する。


実行ログの例：ログイン機能を追加する
イメージを具体化するために、「ログイン機能を追加する」というタスクでこのパイプラインを回したときの典型的な流れを書き出しておきます。


ユーザー入力：/feature-pipeline POST /api/auth/login を追加し、emailとpasswordでJWTを返す


Planner：.claude/plans/20260413-login.md を生成。Zod でのバリデーション、jose での JWT 発行、エラー時のレスポンス形式までを「どんなテストがPASSすれば完了とみなすか」のリストに落とし込む

ユーザー確認：計画をレビューし、「パスワードポリシーは8文字以上 + 数字必須に」と修正指示。Plannerが再計画

Generator：src/routes/auth.ts を作成、src/lib/password.ts にハッシュ処理、src/tests/auth.test.ts にユニットテストを追加し、3コミットに分けてgitに投入

Evaluator：git diff を読み、npm test を実行。password.ts の空文字チェックが抜けていること、エラーレスポンスのJSON形式が仕様と微妙に違うことを2件の NEEDS_REVISION として返す

Generator（2周目）：指摘箇所のみを修正。コミット追加

Evaluator（2周目）：PASS 判定。完了レポートをメインに返す

ここで大事なのは、メインの会話に返ってくるのはEvaluatorの最終レポートだけという点です。Plannerの途中調査ログも、Generatorのファイル編集ログも、Evaluatorのテスト実行出力も、すべてサブエージェント側のコンテキストで閉じています。つまり、メインスレッドは「計画を承認した」「完了レポートを受け取った」という2点しか覚えておらず、コンテキスト圧迫が劇的に減ります。筆者の感覚では、単一エージェントで同じタスクをこなしたときに比べて、メインに残るトークン量はおおむね1/4から1/5程度に収まります。

CLAUDE.md・Skills・サブエージェントの役割分担
筆者はこの3エージェントをCLAUDE.md、スラッシュコマンド（Skills）、サブエージェントと組み合わせて使っています。役割分担は次の通りです。



層
役割
具体例




CLAUDE.md
全セッションに効く不変ルール
日本語で話す / です・ます調 / シンプル優先 / Planモードのトリガー条件


Skills（.claude/commands/*.md）
ワークフローの入口とオーケストレーション

/feature-pipeline / /deep-research / /daily-schedule



サブエージェント（.claude/agents/*.md）
単一責務の実行ユニット
planner / generator / evaluator / research-web / research-critic



CLAUDE.mdに書くのは「どんなタスクでも守るべきポリシー」だけに留め、個別タスクの手順はSkillsに、実際の作業者像はサブエージェントに分けています。こうするとCLAUDE.mdが肥大化せず、常時読み込まれるベースプロンプトが軽く保てます。

計画エージェントのフォーマット設計
Plannerの出力フォーマットは、後続エージェントの成否を左右する要素です。筆者が試した3つの形式を比較すると次のようになります。



形式
向いている場面
欠点




チェックリスト付きMarkdown
人間も読む計画、小〜中規模の機能追加
機械的に項目を引き出しにくい


YAML
計画を別ツールに渡す場合、CI連携
Generatorにコピペされやすく、YAMLの罠（インデント）を踏みやすい


JSON（feature_list.json）
長時間稼働、複数セッションでの進捗管理
人間には読みにくい。ステータス以外を編集させない運用ルールが必須



Anthropicは長時間ハーネスではJSONを選んでいます。理由は「Markdownだとエージェントが勝手に文面を書き換えてしまい、同じファイルを読んでいるはずの別エージェントが別物を見る事故が起きる」ためです。筆者の用途（1セッション完結の機能追加）ではMarkdownで十分ですが、数時間以上走らせる場合はJSONを選ぶべきです。

評価エージェントの評価基準を設計する
Evaluatorを「ただ厳しくしろ」と書いて投げると、結局は曖昧な返答で終わります。評価基準は次の3原則で設計します。


二値判定に落とす：各チェック項目を「PASSかFAILか」で答えさせる。グラデーションを許さない

観測可能な事実だけを聞く：「コードが良いか」ではなく「この関数はテストから呼ばれているか」のように、見れば分かる事実に変換する

発見事項を必ず位置情報つきで書かせる：ファイルパスと行番号を要求することで、推測ではなく読解ベースの評価を強制する

これは実は人間のコードレビューで「根拠を示せ」と言うのと同じ発想です。LLMも「根拠が必要だ」という制約を入れると、ハルシネーションした指摘を出しにくくなります。

Martin Fowler Guides/Sensorsフレームワークとの対応
Martin Fowlerは「Harness engineering for coding agent users」で、エージェントの行動を制御するための2つの概念を提唱しています。

Guides（フィードフォワード制御）：エージェントが行動する前に方向づける予防的な制御
Sensors（フィードバック制御）：エージェントが行動した後に自己修正を促す事後的な制御

それぞれに「計算的」（決定論的で高速、CPUで実行）と「推論的」（セマンティック分析、LLMベース）の2種類があります。Fowlerはこの構造を「サイバネティック・ガバナー（cybernetic governor）」と呼び、制御工学のフィードフォワード + フィードバックとまったく同じ図式でエージェント制御を説明しています。
3エージェントパターンをこのフレームワークに当てはめると、きれいに対応します。



Guides/Sensors
計算的（Computational）
推論的（Inferential）




Guide（事前制御）
linter設定、型チェック、eslintrc
Plannerの実装計画、CLAUDE.mdのコーディング規約


Sensor（事後制御）
テスト実行、CIパイプライン
Evaluatorのコードレビュー



Plannerが作成する計画は「推論的Guide」として機能します。Generatorが実装を始める前に、何をどう作るべきかの方向性を与えるからです。一方、Evaluatorは「推論的Sensor」です。実装後のコードを観察し、問題があればフィードバックを返します。
Fowlerが強調している通り、GuideとSensorは両方必要です。Sensorだけ（フィードバックのみ）だと同じ間違いを繰り返し、Guideだけ（フィードフォワードのみ）だとルールが実際に効いたかを検証できません。3エージェントパターンはこの両方を自然に組み込んでいる点で、制御理論的にも筋の通った設計です。

実践で学んだ失敗と教訓
3エージェントパターンを実際のプロジェクトで運用して得た教訓をまとめます。いずれも筆者が実際に踏んだ穴です。

失敗1：プロンプトが曖昧でサブエージェントが迷走する
サブエージェントに「いい感じに実装して」のような曖昧な指示を出すと、コンテキストが不足しているため期待と大きくずれた成果物が返ってきます。
対策：サブエージェントへの指示には、対象ファイルパス、使用するライブラリ、入出力の型定義、制約条件を必ず含めます。冗長に感じるくらいでちょうどよいです。

失敗2：計画の粒度が細かすぎてGeneratorの自由度がなくなる
Plannerに「関数名やインターフェースまですべて決めろ」と指示したところ、Generatorが計画に縛られて柔軟な実装ができなくなりました。さらに、計画段階の小さな誤りが実装で連鎖的なエラーを生みました。
対策：Plannerは「何を作るか」と「なぜ作るか」に集中させ、「どう作るか」の技術的判断はGeneratorに委ねます。これはAnthropicのブログでも指摘されている設計原則です。

失敗3：Evaluatorが甘い
Evaluatorのシステムプロンプトに「厳格にレビューしろ」とだけ書いても、実際には問題を見逃すことがあります。Anthropicも「Evaluatorが自分で自分を言いくるめて承認する」失敗を報告しています。
対策：評価基準を具体的なチェックリストで定義し、各項目にPASS/FAILの二値判定を要求します。加えて「一度出した指摘を取り下げてはいけない」「判定の根拠をファイルパスと行番号で示す」というルールを明記します。これだけで体感3割ほど評価の精度が上がります。

失敗4：フィードバックループが無限に回る
EvaluatorがFAILを出し続け、GeneratorとEvaluatorの間でいつまでも修正が終わらないケースがありました。根本原因は、修正しきれない問題が「計画段階の欠陥」に起因していたためで、いくら実装を直しても収束しません。
対策：イテレーション回数に上限（推奨は3回）を設け、収束しない場合はユーザーに判断を仰ぎます。多くの場合、3回で収束しない問題は計画自体に問題があるので、Plannerからやり直す方が効率的です。

失敗5：サブエージェントのモデル選択を間違える
コスト削減のためにすべてのサブエージェントをHaikuで動かしたところ、Plannerの計画品質が大幅に低下しました。逆にすべてOpusで揃えるとトークン消費が3〜5倍に跳ねます。
対策：各エージェントの役割に応じてモデルを使い分けます。Plannerは高い推論能力が必要なのでOpusまたはSonnet、Generatorはコード生成に強いSonnet、Evaluatorは読解中心なのでSonnetで十分です。コスト最適化は調査系（Explore相当）のサブエージェントをHaikuにする程度に留めるのが安全です。

コストとのトレードオフ
3エージェント化はタダではありません。Anthropicの最初期ハーネスは、単一エージェント実行（20分・9ドル）に対して6時間・200ドルというコスト差を報告しています。モデル世代が進んだ Opus 4.6 でも、DAWアプリのフル構築で約3時間50分・124ドルという数字が出ています。20倍近いコスト増を許容できるかどうかは、タスクの性格次第です。
筆者のざっくりした判断基準は次の通りです。


単一エージェントで十分：単発のリファクタ、定型的なファイル編集、調査だけのタスク

3エージェントが必要：本番に載せる機能追加、設計意図を外せない新規実装、複数ファイルをまたぐ横断的な変更

3エージェント + 並列化：半日以上走らせる長時間タスク、複数機能を並行で実装したい場合

ポイントは「完成後に人間が手戻りする時間」を含めて考えることです。単一エージェントで速く終わらせても、後でバグを潰す時間が長ければトータルで損をします。3エージェント化のコスト増は、基本的には人間のレビュー時間を買い戻していると見るのが自然です。

まとめ
3エージェントパターンの本質は「関心の分離」です。計画・生成・評価という異なる認知タスクを別々のコンテキストに分けることで、それぞれの品質を独立して最適化でき、同時にメインスレッドのコンテキスト汚染も防げます。
導入のステップとしては、まずEvaluator（レビューエージェント）を1つ作ることをおすすめします。既存のワークフローにレビューステップを追加するだけなので導入コストが低く、効果をすぐ実感できます。そこからPlanner、Generatorと段階的に分離していくのが現実的な進め方です。
エージェントに任せる範囲が広がるほど、ハーネス（エージェントを動かす枠組み）の設計が重要になります。Anthropicの3エージェント設計とMartin FowlerのGuides/Sensorsフレームワークは、そのハーネスを体系的に考えるための有用な道具です。筆者自身、単一エージェントで詰まっていた「長時間タスクの品質問題」が、この設計に寄せてからかなり安定するようになりました。手元で小さく試せる構成なので、まずはEvaluator 1体から導入してみてください。

参考資料

Harness design for long-running application development - Anthropic Engineering
Effective harnesses for long-running agents - Anthropic Engineering
Create custom subagents - Claude Code Docs
Harness engineering for coding agent users - Martin Fowler
Building agents with the Claude Agent SDK - Anthropic Engineering

---

## 19. [【CLAUDE.mdに貼るだけ】Claude Code x Gemini CLI x 人間による、三位一体開発術](https://zenn.dev/tksfjt1024/articles/5e88385bfb69fd)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/4
- **AI要約**:
  Claude Codeを「実行者」、Geminiを「技術調査役」として役割分担させる三位一体の開発手法
  CLAUDE.mdに具体的な指示を追記するだけで、AI間での自律的な壁打ちとタスク分散が可能になる
  Gemini MCPを活用しWeb検索を外出しすることで、Claudeのトークン消費と無限ループを抑制
- **今読む理由**: AI駆動開発におけるClaudeのトークン制限や推論のループを、Geminiとの連携で解決する具体的な設定（CLAUDE.md）が明記されており、即座に導入可能であるため。
- **タグ**: #AI駆動開発, #ClaudeCode, #GeminiCLI, #MCP, #CLAUDE.md

### 本文
TL;DR
CLAUDE.mdを書き換えるだけで、意思決定と最終成果物のチェック以外をすべてAIにお任せすることができます (できるかもしれません)



 はじめに
Gemini CLI がリリースされたものの現時点で Claude Codeのような「定額使い放題プラン」がないため、どうにか両者の強みを活かせないか考えていました。
そこで、各社のAIに壁打ちをしつつ試行錯誤していたところ、 “人間・Claude・Gemini” の三位一体フレームワーク を簡単に実現できる方法を思いつき、実際に良かったため備忘録として残しておきます。
このフレームワークを定量的に評価するのは難しいのですが、Claude Code が沼にはまって抜け出せなくなる頻度が減ったような気がします。
と書いていて気がつきましたが、MAXプラン ($200の方) にしても到達しまくっていた Claude usage limit reached. Your limit will reset at ~ (Asia/Tokyo). を全然見なくなった気がします。もしや効果絶大・・・？
なお、この方法を 四位一体開発術 バージョンへ昇格させた記事はこちらを、

N位一体開発術 バージョンへ昇格させた記事はこちらをご覧ください。



 本記事の内容

三位一体フレームワークの概要
導入手順 (Claude Code、Gemini CLIのインストール)
CLAUDE.md (一部抜粋)



 三位一体フレームワーク
三者のそれぞれの強み・責任領域をフレームワークに落とし込みました。



ロール
得意領域




人間
目的・要件・最終ゴールの定義・意思決定


Claude Code
正確な計画力・高品質な実装力


Gemini CLI
優秀な Web 検索・多角的な視点からの助言・技術的検証




 壁打ちの効果
Gemini の強みを活かすという目的以外に、Claudeに言語化を促すことで、改めて思考を整理させる効果も期待しています。
なお、ClaudeがGeminiを実際に使っている様子を眺めると、Geminiに投げているプロンプトが秀逸すぎて結構感動します。勉強になる〜



 トークン消費の分散効果について
付随する効果として、調査をGeminiに丸投げする分、Claude側のトークン消費削減が期待できます。
gemini -p <質問内容> のコマンドがテキストを結構短め (内容は濃いめ) で返してくれるのもポイントです。

 それぞれの苦手領域
得意領域があれば、苦手な領域もあります。それぞれのツールが、苦手領域について自分で自覚を持っていない、というのが痛いところ。
なお、かなり個人的な意見を含みます🙇

 Claude Code
計画力・実装力に優れる反面、意志があまりにない。
「それは違うのでは？」に対して「おっしゃる通りです。違います」と、明らかに深く考えないで即答しがち。もうちょっと考えてくれ笑。
そして、1回沼にハマると永遠にハマり続ける。無限auto-compact、挙げ句の果てにRate Limitに。

 Gemini CLI
俯瞰して情報を整理する力はあるが、実装力は・・・
なんでそこ直した？？？最初の目的はどこへ？？？となる。
質問しただけなのに勝手にコードいじり始めるのもやめてくれ。

 人間 (エンジニア)
なんでも効率化・自動化・仕組み化したくなってしまう生き物です。あとは頼んだ。
(Claude Codeのアウトプットをいちいち細かくレビューしてゴールへ導くのがめんどくさいという意味です)


 導入手順
一応書いておきます。
# Claude Codeのインストール
$ npm install -g @anthropic-ai/claude-code

# Gemini CLIのインストール
$ npm install -g @google/gemini-cli

# Gemini CLI MCPの追加 (推奨)
# plan modeではBashツールが利用不可っぽいので、MCPの方が良さそうです
$ claude mcp add gemini-cli -s user -- npx -y gemini-mcp-tool
Gemini CLI MCPはこちらを利用しています



 CLAUDE.md (一部抜粋、2025/07/03更新)
以下を CLAUDE.md に含めるだけです。
なんとなくですが、上の方に書くと良いでしょう。
意外と思ったような挙動をしないことがあり、改善して随時更新しています。
## 【MUST GLOBAL】Gemini活用（プロジェクトのCLAUDE.mdより優先）

### 三位一体の開発原則
人間の**意思決定**、Claude Codeの**分析と実行**、Gemini MCPの**検証と助言**を組み合わせ、開発の質と速度を最大化する：
- **人間 (ユーザー)**：プロジェクトの目的・要件・最終ゴールを定義し、最終的な意思決定を行う**意思決定者**
  - 反面、具体的なコーディングや詳細な計画を立てる力、タスク管理能力ははありません。
- **Claude Code**：高度なタスク分解・高品質な実装・リファクタリング・ファイル操作・タスク管理を担う**実行者**
  - 指示に対して忠実に、順序立てて実行する能力はありますが、意志がなく、思い込みは勘違いも多く、思考力は少し劣ります。
- **Gemini MCP**：API・ライブラリ・エラー解析など**コードレベル**の技術調査・Web検索 (Google検索) による最新情報へのアクセスを行う**コード専門家**
  - ミクロな視点でのコード品質・実装方法・デバッグに優れますが、アーキテクチャ全体の設計判断は専門外です。

### 壁打ち先の自動判定ルール
- **ユーザーの要求を受けたら即座に壁打ち**を必ず実施
- 壁打ち結果は鵜呑みにしすぎず、1意見として判断
- 結果を元に聞き方を変えて多角的な意見を抽出するのも効果的

### 主要な活用場面
1. **実現不可能な依頼**: Claude Code では実現できない要求への対処 (例: `最新のニュース記事を取得して`)
2. **前提確認**: 要求の理解や実装方針の妥当性を確認 (例: `この実装方針で要件を満たせるか確認して`)
3. **技術調査**: 最新情報・エラー解決・ドキュメント検索 (例: `Rails 7.2の新機能を調べて`)
4. **設計立案**: 新機能の設計・アーキテクチャ構築 (例: `認証システムの設計案を作成して`)
5. **問題解決**: エラーや不具合の原因究明と対処 (例: `このTypeScriptエラーの解決方法を教えて`)
6. **コードレビュー**: 品質・保守性・パフォーマンスの評価 (例: `このコードの改善点は？`)
7. **計画立案**: タスク分解・実装方針の策定 (例: `ユーザー認証機能を実装するための計画を立てて`)
8. **技術選定**: ライブラリ・フレームワークの比較検討 (例: `状態管理にReduxとZustandどちらが適切か？`)
9. **リスク評価**: 実装前の潜在的問題の洗い出し (例: `この実装のセキュリティリスクは？`)
10. **設計検証**: 既存設計の妥当性確認・改善提案 (例: `現在のAPI設計の問題点と改善案は？`)


 おわりに
この方法は、Gemini以外にも簡単に拡張可能なので、また模索していきたいと思っています。
食わず嫌いしないでいろんなツール試していかないとだ……🥹


 参考

Gemini CLI: https://github.com/google-gemini/gemini-cli

Gemini CLI MCP: https://github.com/jamubc/gemini-mcp-tool

Claude Code: https://docs.anthropic.com/claude-code

---

## 20. [Gemini CLIとClaude Codeによるピンポンプログラミング](https://zenn.dev/yonekubo/articles/3a2da69cacaa73)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/4
- **AI要約**:
  Gemini CLIとClaude Codeを連携させ、AIエージェント間でTDD（テスト駆動開発）を行う手法の解説
  Claude Codeの非対話モードやセッションID再開機能を活用し、プログラムから制御する具体的な実装案
  役割分担、許可ツール、ワークフローを定義したプロンプト（GEMINI.md）の具体的な構成を提示
- **今読む理由**: AI駆動開発において、テスト作成と実装を別々のエージェントに担当させるマルチエージェント・オーケストレーションの具体例であり、Claude CodeのCLIオプションを活用した自動化パイプライン構築に即座に活用できるため。
- **タグ**: #AI駆動開発, #ClaudeCode, #TDD, #自動化パイプライン, #GeminiCLI

### 本文
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

---

## 21. [note記事を“生成して終わり”にしない執筆ハーネスを作った｜hirokaji](https://note.com/tasty_dunlin998/n/n28fc06725c2f)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/4
- **AI要約**:
  LLMによる創作とスクリプトによる決定論的処理を分離した、執筆自動化パイプラインの設計思想。
  中間成果物やマニフェストを活用し、本文・画像・証跡を再現可能な形で一括管理する具体的構成。
  バナー先行生成とQAフローを組み込み、生成物の品質とトンマナの整合性を担保する運用プロセス。
- **今読む理由**: LLMの曖昧さとシステムの確実性を分離するアーキテクチャは、現在のAI駆動開発におけるパイプライン構築の最適解の一つであり、即座に設計へ取り入れられるため。
- **タグ**: #AIエージェント, #自動化パイプライン, #システム設計, #コンテンツ生成

### 本文
本文、画像、導線、manifestまでをAntigravityで一括生成する再現可能な制作ラインnote記事を“生成して終わり”にしない執筆ハーネスを作ったAIで記事を書くこと自体は、もう珍しくありません。本文を作る。タイトルを考える。画像を生成する。ハッシュタグを付ける。noteに貼る。一つひとつは、すでに多くの人がやっています。ただ、実際に続けてみると、別の問題が出てきます。毎回、手順が微妙に変わる。画像のトンマナが揃わない。バナーだけ作って、挿絵を忘れる。キャプションやaltが残らない。どの画像をどこに差し込むか、最後にまた考え直す。再生成したときに、前回と何が違うのか分からなくなる。つまり、記事生成そのものよりも、記事を公開可能な状態へ持っていく運用の方が重くなってくるわけです。そこで今回は、note執筆用のハーネスを作りました。ここでいうハーネスとは、単なるプロンプト集ではありません。本文、タイトル、画像、導線、品質確認、保存、挿入位置までを、ひとつの流れとして扱うための制作ラインです。Antigravity上で動かす前提で、Compose定義とスクリプトを分け、再現できる形にしています。この記事では、その考え方と構成を、手元で真似できるレベルまで分解します。何を作ったのか毎回の会話で作業を積み上げる状態から、本文・画像・導線・証跡を再実行できる工程へ移す今回作ったのは、note記事を公開直前の状態まで持っていくための親ハーネスです。入力は、大きく2パターンあります。ひとつは、すでに承認済みの記事本文です。もうひとつは、章ごとに分かれたドラフトです。どちらを入れても、最終的には次の成果物を作ります。final_article.md
note_ready.md
title_pack.json
article_packet.json
package_manifest.json
visual/<article_id>/manifest.json
visual/<article_id>/note_assets.md
visual/<article_id>/preview_grid.jpg
visual/<article_id>/images/*.pngこれだけ見ると少し多く見えるかもしれません。しかし、役割はシンプルです。`final_article.md` は、掲載用に整えた本文です。`note_ready.md` は、画像の差し込み位置やメンバーシップ導線まで入れた、note投入用の本文です。`title_pack.json` は、タイトル、サブタイトル、無料エリアの冒頭文、有料区切り候補を持ちます。`manifest.json` は、画像の役割、キャプション、alt、挿入位置、seed、CAS URI、QA結果を持つ証跡です。`note_assets.md` は、ハッシュタグ、キャプション、挿入位置だけを人間が見やすい形にまとめたファイルです。つまり、本文だけでなく、公開に必要な周辺物まで一緒に出します。ここが重要です。AIで記事を書くとき、多くの場合は本文生成で終わります。しかし、実際の公開作業では、本文以外にも多くの判断があります。タイトルはこれでいいか。バナーは記事全体を表しているか。挿絵は本文理解を助けているか。メンバーシップ導線は唐突ではないか。画像の差し込み位置は自然か。後から再生成できる状態になっているか。このあたりを毎回人力で処理すると、記事を書くたびに疲れます。だから、制作ラインにします。全体の流れハーネス全体は、次の流れで動きます。章別ドラフト or 承認済み本文
↓
本文統合
↓
note向け最終整形
↓
タイトル・サブタイトル生成
↓
article_packet.json 化
↓
画像生成サブフロー呼び出し
↓
バナー・挿絵・QA・CAS・manifest生成
↓
note_ready.md 生成
↓
package_manifest.json 生成ポイントは、本文生成と画像生成を雑に直結させないことです。いったん `article_packet.json` という中間成果物を作ります。このファイルには、記事本文、タイトル、サブタイトル、スタイル設定、禁止語などをまとめます。画像生成側は、この `article_packet.json` だけを見ればよい構造にします。こうしておくと、後で運用が楽になります。本文だけ直したい。画像だけ作り直したい。タイトルだけ差し替えたい。manifestだけ再構築したい。こういう変更が起きても、全体を壊さずに済みます。ディレクトリ構成Compose、Prompts、Scripts、Configに分けることで、LLMに任せる部分と固定処理にする部分を切り分ける。最小構成は、次のようにしています。note_harness_antigravity_starter/
├─ compose/
│  ├─ note_article_parent.compose.yaml
│  └─ note_visual_packet.compose.yaml
├─ prompts/
│  ├─ integrate_article.md
│  ├─ final_article_review.md
│  ├─ title_pack.md
│  ├─ extract_editorial_packet.md
│  ├─ plan_visual_assets.md
│  ├─ evaluate_image.md
│  └─ repair_image.md
├─ scripts/
│  ├─ normalize_article_input.py
│  ├─ select_article.py
│  ├─ build_article_packet.py
│  ├─ add_stable_seeds.py
│  ├─ cas_put.py
│  ├─ build_manifest.py
│  ├─ build_note_assets.py
│  ├─ insert_image_placeholders.py
│  ├─ assemble_note_package.py
│  └─ make_preview_grid.py
├─ schemas/
├─ config/
└─ examples/大きく分けると、4つです。`compose/` は、全体の流れを定義する場所です。`prompts/` は、LLMに渡す役割別プロンプトを置く場所です。`scripts/` は、ファイル整形、seed生成、CAS保存、manifest生成など、決定論的に処理したい部分を置く場所です。`config/` は、トンマナや禁止語など、記事ごとに変えたくない運用ルールを置く場所です。この分け方にしている理由は、LLMに任せる部分と、プログラムで固定する部分を分離したいからです。記事の解釈や画像案の設計は、LLMに任せる価値があります。一方で、ファイル名、保存場所、seed、manifest、CAS保存は、毎回ぶれてほしくありません。そこはスクリプトで固定します。親Composeの役割中心になるのは、親Composeです。compose/note_article_parent.compose.yamlこの親Composeは、note記事制作の全体をまとめます。役割は、本文側の処理と画像側の処理を接続することです。処理の入口は、次の2モードです。package_only
integrate_then_package`package_only` は、すでに承認済みの記事本文がある場合に使います。本文はほぼ固まっていて、タイトル、画像、ハッシュタグ、導線、manifestを作りたいときのモードです。`integrate_then_package` は、章ごとのドラフトから記事本文を統合する場合に使います。章別に書いた原稿をひとつの記事にまとめ、そこからパッケージ化まで進めます。最初に試すなら、`package_only` がおすすめです。理由は単純です。本文が固まっている方が、画像設計や導線設計のブレが少ないからです。まずは承認済み本文で動かす最初の再現手順は、これだけです。まず、記事本文を用意します。examples/approved_article.mdここに、noteに掲載したい本文を入れます。次に、以下のコマンドで実行します。antigravity compose run compose/note_article_parent.compose.yaml \
  --input article_id="note-20260425-agent-harness" \
  --input mode="package_only" \
  --input approved_article_path="examples/approved_article.md" \
  --input max_illustrations=4 \
  --input banned_terms_path="config/banned_terms.example.yml" \
  --input style_profile_path="config/style_profiles/note_default.yaml"このコマンドで、本文の最終整形、タイトル生成、画像生成、manifest生成まで進みます。実行後は、次の場所を見ます。runs/note-20260425-agent-harness/ここに、記事ごとの成果物がまとまります。出力を見る順番出力ファイルは多いので、最初は見る順番を決めておくと迷いません。まず見るのは、`note_ready.md` です。これは、noteに貼る直前の本文です。画像の差し込み位置、キャプション、メンバーシップ導線が反映されています。次に、`visual/<article_id>/preview_grid.jpg` を見ます。これは、生成されたバナーと挿絵を一覧で確認するための画像です。画像を1枚ずつ開く前に、全体のトンマナが揃っているか確認できます。次に、`visual/<article_id>/note_assets.md` を見ます。ここには、ハッシュタグ、メンバーシップ導線、各画像のキャプション、挿入位置がまとまっています。最後に、`visual/<article_id>/manifest.json` を見ます。これは人間が読むためというより、後続処理や再現性のためのファイルです。画像のseed、CAS URI、QA結果、alt、crop_hintなどが入っています。画像生成を出しっぱなしにしない設計、バナー生成、品質評価、挿絵生成、再生成、manifest化までを閉じた流れとして扱う。今回のハーネスで特に重視したのは、画像生成を出しっぱなしにしないことです。よくある失敗は、バナーだけ作って終わることです。もうひとつは、バナーと挿絵がほぼ同じ構図になることです。さらに、日本語が小さすぎる、文字が崩れる、英語UIのようなノイズが入る、といった問題も起きます。そのため、このハーネスでは画像生成を次の流れにしています。editorial_packet 生成
↓
image_plan 生成
↓
roleごとに安定seed付与
↓
banner先行生成
↓
banner QA
↓
必要ならbanner修正
↓
挿絵群を並列生成
↓
全画像QA
↓
NG挿絵を修正
↓
CAS保存
↓
manifest生成最初にバナーを作るのがポイントです。バナーは記事全体の入口です。先にバナーを確定させると、他の挿絵はそのトンマナに合わせやすくなります。ただし、挿絵はバナーの繰り返しにしてはいけません。そこで、画像設計プロンプトには次のルールを入れています。banner は記事全体の入口
illo_1 は最初の論点の理解補助
illo_2 以降は構造・手順・比較・判断軸のどれかに役割を分ける
banner と illo_1 を似せすぎない
文字量は必要最小限
日本語の可読性を最優先
素材風・英UIノイズ・過剰装飾を避けるこのルールがあるだけで、画像の失敗はかなり減ります。画像生成は、プロンプトの美しさだけでは安定しません。役割を分けること。評価すること。必要なら修正すること。結果をmanifestに残すこと。この4つを入れて、初めて運用に乗ります。なぜmanifestを作るのか画像、caption、挿入位置、seed、CAS、QAをmanifestに集約し、あとから検証・再現・管理できる状態にする。manifestは、生成物の一覧ではありません。この記事制作ハーネスにおける証跡です。たとえば、画像ごとに次の情報を持ちます。{
  "role": "banner",
  "size": "1920x1006",
  "caption": "記事全体の入口になるバナー",
  "alt": "記事の主題を示す横長バナー",
  "crop_hint": "center-top",
  "insertion_position": "記事冒頭",
  "seed": 123456,
  "cas_uri": "cas://sha256/xxxx.png",
  "qa_score": 92,
  "qa_pass": true
}これがあると、画像を後から扱いやすくなります。どれがバナーか。どれが1枚目の挿絵か。どこに差し込むべきか。どのseedで生成したか。QAを通ったのか。保存された実体はどこか。これらを、ファイル名や人間の記憶に頼らず管理できます。特に重要なのは、CAS URIです。CASは、Content Addressed Storageの略です。日本語で言えば、内容のハッシュでファイルを保存する方式です。同じ画像なら同じハッシュになります。つまり、ファイル名ではなく、内容そのもので保存場所が決まります。これにより、画像を差し替えたときに、本当に中身が変わったのか確認しやすくなります。note記事制作でここまで必要か、と思うかもしれません。しかし、記事制作を継続的に回すなら、かなり効きます。「前に作った画像と何が違うのか」「どの画像を採用したのか」「なぜこの画像を差し込んだのか」このあたりを、あとから追えるようになるからです。style_profileでトンマナを固定する毎回プロンプトにトンマナを書くと、少しずつブレます。そこで、共通ルールは `config/style_profiles/note_default.yaml` に切り出します。たとえば、次のような設定です。name: note_default
language: ja
article_style:
  line_break_policy: "意味のかたまりごとに短く改行する"
  paragraph_spacing: "広め"
  avoid:
    - "表に依存した整理"
    - "長すぎる前置き"
    - "AIっぽい総論調"
visual_style:
  mood: "落ち着いた、知的、保存したくなる"
  palette:
    - "墨に近い濃紺"
    - "温かい白"
    - "薄いグレー"
    - "控えめな青緑"
  typography:
    japanese: "太めのゴシック、可読性優先"この設定を変えれば、記事全体の雰囲気を変えられます。たとえば、技術解説向けなら落ち着いた配色にする。入門記事向けなら、少し明るくする。有料記事向けなら、情報密度を上げつつ、余白を多めにする。こうした方針を、毎回の会話ではなく設定ファイルに寄せます。これもハーネス化の大きな利点です。プロンプトで頑張るのではなく、運用ルールとして持つ。この考え方に切り替えると、記事制作はかなり安定します。禁止語もファイルで持つ記事や画像には、使いたくない表現があります。たとえば、ありがちな煽り文句、素材風の構図、過剰な比喩、記事の文体に合わない語彙などです。それらは `config/banned_terms.example.yml` に置きます。banned_terms:
  - 元ネタ
  - バズる
  - 魔法
banned_visual_motifs:
  - 過剰なネオン
  - ストックフォト風の握手
  - 意味のない英語UI文字列このように外に出しておくと、記事ごとに調整できます。重要なのは、禁止語をプロンプト本文に埋め込まないことです。プロンプトに全部書くと、長くなります。長くなると、毎回の修正が大変になります。ファイルに分けると、プロンプトは役割に集中できます。章ごとのドラフトから作る場合章ごとの原稿から記事を作る場合は、次のようにします。まず、ドラフトを置きます。examples/draft_parts/
├─ 01_intro.md
├─ 02_body.md
└─ 03_close.mdそのうえで、モードを `integrate_then_package` にします。antigravity compose run compose/note_article_parent.compose.yaml \
  --input article_id="note-20260425-agent-harness" \
  --input mode="integrate_then_package" \
  --input draft_parts_dir="examples/draft_parts" \
  --input max_illustrations=4 \
  --input banned_terms_path="config/banned_terms.example.yml" \
  --input style_profile_path="config/style_profiles/note_default.yaml"このモードでは、まず章別ドラフトをひとつの記事へ統合します。その後、最終整形、タイトル生成、画像生成へ進みます。ただし、初回運用では承認済み本文から始める方が安全です。章統合と画像生成を同時に試すと、どこでズレたのか分かりにくくなるからです。まずは本文を固定する。そのうえで画像とmanifestを生成する。慣れてから、章統合まで含める。この順番が安定します。実際の差し替えポイント読者が自分の環境で使う場合、最初に変える場所は多くありません。まず変えるのは、記事本文です。examples/approved_article.mdここに自分の記事を入れます。次に変えるのは、記事IDです。--input article_id="note-20260425-agent-harness"記事ごとに別のIDにします。日付とテーマを入れると管理しやすいです。次に、必要なら画像枚数を変えます。--input max_illustrations=4最初は4で十分です。バナー1枚と挿絵2〜4枚くらいが、note記事では扱いやすいです。最後に、トンマナを変えたい場合は、style_profileを編集します。config/style_profiles/note_default.yaml最初からCompose全体を改造する必要はありません。まずは本文、記事ID、画像枚数、トンマナ。この4つだけ変えれば動きます。失敗しやすいところこの種のハーネスで失敗しやすいのは、最初から全部を自動化しようとすることです。note投稿まで完全自動化したくなります。しかし、最初はそこまでやらない方がいいです。おすすめは、次の段階です。第1段階: 本文は手で承認し、画像とmanifestだけ自動化する
第2段階: タイトルと導線まで自動化する
第3段階: 章統合まで含める
第4段階: note投入補助まで進めるいきなり全部をつなぐと、問題が出たときに切り分けが難しくなります。本文が悪いのか。タイトル生成が悪いのか。画像設計が悪いのか。画像モデルが悪いのか。QA基準が弱いのか。挿入位置のロジックが悪いのか。これらが一気に混ざります。だから、境界を固定します。本文を固定する。article_packetを固定する。image_planを固定する。manifestを固定する。固定した境界の中で、生成や探索を流す。この考え方が、ハーネス運用では大事です。このハーネスで変わることこのハーネスを使うと、記事制作は「その場の会話」から「再実行できる工程」に変わります。これまでは、記事を書くたびに同じような指示をしていました。ハッシュタグを作ってください。画像も作ってください。バナーは横長にしてください。挿絵も忘れないでください。キャプションもください。どこに差し込むかも書いてください。画像を評価して、ダメなら直してください。これを毎回手で書くのは、かなりもったいない。何度も使う手順は、会話ではなくハーネスに寄せる。すると、人間が見るべき場所が変わります。毎回の細かい指示ではなく、出てきたパッケージの品質を見る。本文は読者に届くか。バナーは記事の入口として強いか。挿絵は理解を助けているか。導線は自然か。manifestに必要な証跡が残っているか。人間の役割が、逐次操縦からレビューと設計へ移ります。これが、今回作ったnote執筆ハーネスの狙いです。まとめAIで記事を書くとき、本文生成だけを見ていると、実務の重さを見落とします。本当に大変なのは、記事を公開できる状態へ整えることです。タイトル。導線。画像。キャプション。挿入位置。alt。トンマナ。再生成。証跡。これらを毎回その場で処理すると、AIを使っているのに人間の判断疲れが増えます。だから、制作ラインとして持つ。今回のハーネスは、そのための最小構成です。最初から完璧な自動投稿システムを目指す必要はありません。まずは、承認済み本文を入れて、画像と導線とmanifestを安定して出す。そこから、章統合、タイトル改善、note投入補助へ広げていけばいい。記事制作は、単発の生成から、再現可能な運用へ移れます。その第一歩が、今回のnote執筆ハーネスです。付録：note執筆ハーネスのスターターZIPについてこの記事の付録として、今回紹介した note執筆ハーネスのスターター一式 をZIPで添付します。

---

## 22. [Markdownだけで作るハーネスエンジニアリング](https://zenn.dev/genda_jp/articles/e09cab2916c241)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/7
- **AI要約**:
  プロンプト修正ではなく環境側でミスを防ぐ「ハーネスエンジニアリング」の概念を解説
  非コーディング領域でも指示ファイルを用いてエージェントの振る舞いを固定する手法を提示
  禁止事項、終了アクション、ナレッジ蓄積の3つの具体的なMarkdownサンプルを公開
- **今読む理由**: AI駆動開発や自動化パイプラインにおいて、エージェントの制御を『お願い』から『構造』に変えるための即時適用可能なMarkdownテンプレートが含まれているため。
- **タグ**: #AIエージェント, #ハーネスエンジニアリング, #MCP, #Claude, #業務自動化

### 本文
コーディングエージェントが主戦場でなければ、「ハーネスエンジニアリング」は少し遠い言葉でしょう。Claude CodeやCodexを前提にした解説記事が並ぶタイムラインを見て、「これは自分の話ではない」と感じた人もいるはずです。
私自身のエージェント活用もコーディングが中心ではなかったので、出回っている記事のどれも自分のケースには当てはまらないと思っていました。しかし振り返ると、名前がついていなかっただけで同じことをしていました。
Slack・Confluence・Google Calendarなど複数の業務ツールを横断して情報を収集し、文脈ごとに判断基準を切り替えながらアウトプットを出す。そういう業務エージェントをClaude Desktop（MCPサーバー経由）で数ヶ月間運用しています。エージェントが参照するのは、表層的なルールだけではありません。組織構造の理解、過去の意思決定履歴、文体のガイドラインといった、蓄積されたナレッジが判断の土台になっています。
コードは一行も書いていません。書いているのはMarkdownだけです。そのMarkdownも、大半はエージェント自身が生成し、自分はチャット上で承認や修正指示を出しているだけです。ファイルを直接開いて編集することはほぼありません。
この記事は、ハーネスエンジニアリングを実践している人向けではありません。「聞いたことはあるが、コーディングの話でしょ」と感じている人に、構造を整理して共有するために書いています。具体例にはすぐ使えるサンプルを付けているので、MCPで業務自動化エージェントを動かしている方はそのまま試せます。

 ハーネスエンジニアリングとは
認識を合わせておきます。
HashiCorp共同創業者のMitchell Hashimotoが2026年2月のブログポストで、自身のAIエージェント活用の中で培った習慣に「Engineer the Harness」という名前を与えました。「エージェントが間違えたとき、プロンプトを修正するのではなく、二度と同じ間違いができない環境を作る」というアプローチです。

数日後にOpenAIが「Harness engineering」と題した実践報告を公開しました。少人数のエンジニアチームが5ヶ月間、手書きのコードをゼロにする制約のもとでCodexエージェントだけでプロダクトを構築し、リポジトリは約100万行に達したという内容です。Hashimotoのブログとこの報告が相次いで出たことで、「ハーネスエンジニアリング」という言葉が一気に定着しました。

コーディングエージェントの文脈で言えば、ESLintで特定の記述を禁止する、AGENTS.mdでコマンドを定義する、pre-commitフックで自動レビューを走らせる、といった実装がこれに当たります。
「お願い（プロンプト）」から「仕組み（環境）」へ。これが核心です。
ここまでの話はコーディングエージェントの世界に閉じているように見えます。しかし2025年にMCPが普及し、コードを書かないエージェントの実用範囲が急速に広がりました。Slack、Confluence、Google Calendar、Jiraなど業務ツールにエージェントが直接アクセスできるようになった結果、「エージェントが勝手に間違える」リスクはコーディング以外にも波及しています。ハーネスが必要なのはコーディングエージェントだけではなくなったのです。

 プロンプトを書き直し続けていた
エージェントを業務に組み込んでいると、こういう経験をします。
「財務的な判断はしないで」と書いたのに判断する。「Slackには直接投稿しないでドラフトを作って」と書いたのに投稿しようとする。「セッション終了時にcommitとpushをして」と書いたのに忘れる。
そのたびにプロンプトを書き直してきました。「もっと明確に書けばわかってくれるはず」という仮定のもとで。
ある時期から、この仮定自体が間違っていると気づきました。プロンプトをどれだけ磨いても、エージェントは次のセッションで同じミスをします。長いコンテキストのなかで指示が埋もれる。セッションが切れれば記憶ごと消える。「お願い」は揮発します。
エージェントに期待するのをやめて、環境の方を変える。振り返ると、これがハーネスエンジニアリングの入口でした。

 非コーディングエージェントでのハーネス
私自身がやってきたことを並べてみると、コーディングエージェントのハーネスと同じ構造が浮かび上がります。



コーディングエージェントの環境
非コーディングエージェントの環境




ESLint・TypeScript strictによる型強制

agents/配下の禁止事項セクション



AGENTS.mdのコマンド定義
指示ファイルの文脈判別ルール


pre-commitフック
セッション終了時の必須アクション定義


CIゲート（通らなければマージ不可）

knowledge/への強制的な蓄積ルール



左右の素材はまったく違います。片方はlinterとフック、もう片方はMarkdownファイル。しかし設計の意図は同じで、「エージェントが正しく振る舞える環境を、エージェントの外側に作る」という点で一致しています。
ここで一つ前提を補足します。多くのAIチャットツールには、セッション開始時に自動で読み込まれる指示ファイルの置き場所が用意されています。Claude DesktopならProject Knowledge、ChatGPTならCustom Instructionsがこれに当たります。この記事で「指示ファイル」と呼んでいるのは、この仕組みに配置するMarkdownファイルのことです。プロンプトに毎回手で書くのとは違い、会話が長くなっても埋もれにくい位置に自動で配置されます。
具体例を三つ挙げます。それぞれすぐ使えるサンプルを付けています。

 禁止事項の構造化
たとえば、エージェントにSlack投稿を任せているとします。「直接投稿しないでドラフトを作って」とプロンプトに書いても、セッションをまたぐと忘れます。
解決策は、指示ファイルに禁止事項セクションを設け、毎セッション必ず読み込ませる構造にすることです。指示の置き場所を、プロンプト（揮発）からファイル（永続）に移します。

agents/assistant.md
## 禁止事項

以下は例外なく守ること。

- 社内Slackへの自動投稿をしない（ドラフト作成まで。投稿はユーザーが行う）
- 財務数値の確定判断をしない（必ずユーザーに確認を求める）
- クライアントへの返信を最終版として扱わない（必ずユーザーの確認を経る）
- 人事評価や処遇に関する判断をしない
- 機密情報（給与、契約金額等）を要約に含める際は、その旨を明示する

毎回口頭で伝えるのではなく、固定された場所にルールを置いて毎回参照させる。それだけのことですが、これでルールの寿命がセッション単位から永続に変わります。

 セッション終了時のアクション強制
セッションの終わりに作業ログを残したい。「終了時にwork logを作成してcommit & pushして」とプロンプトに書いても、会話が盛り上がるとエージェントはそのまま終了してしまいます。
解決策は、指示ファイルに終了条件のトリガーと必須アクションをセットで定義することです。

agents/assistant.md
## セッション終了時の必須アクション

ユーザーが「終わり」「ありがとう」「commit」等で作業完了を示したとき、
以下を必ず実行する。スキップは禁止。

1. `docs/work-logs/YYYY-MM-DD-{トピック}.md` に作業ログを作成する
   - 含める内容: 背景、検討した選択肢、主な判断、成果物、次にやること
2. `CHANGELOG.md` に変更の概要を追記する
3. git commit & push を実行する

禁止事項の例との違いは、「いつ発動するか」のトリガー条件まで定義している点です。「終わり」「ありがとう」「commit」という終了シグナルを明示することで、エージェントが「今がその場面だ」と判断しやすくなります。完璧ではありませんが、トリガーが曖昧なまま「適切なタイミングで実行して」と書くよりは確実に発動率が上がります。
ポイントは「スキップは禁止」の一文です。エージェントに判断の余地を残すと、会話が長くなったときに「今回は省略しても大丈夫だろう」と勝手に判断します。裁量を奪うことで行動が安定します。
副次的な効果もあります。指示ファイルにルールが定義されていると、「ログ残して」「commitして」のひと言でエージェントが「あのアクションのことだ」と即座に通じるようになります。毎回ゼロから説明する必要がなくなる。指示ファイルが人間とエージェントの間の共通語彙になるわけです。

 ナレッジの強制蓄積
三つ目は、「確認を通さなければ先に進めない」構造の例です。
エージェントとの会話では、ミーティングで決まったこと、ツール選定の結論、トラブルシュートで判明した事実など、蓄積すべき情報が頻繁に出てきます。「重要な情報があったら保存して」とプロンプトに書いても、当然のように忘れます。
解決策は、指示ファイルに「ナレッジ化チェック」のプロトコルを組み込むことです。

agents/assistant.md
## ナレッジの蓄積（必須チェック）

自分の各返答の前に、以下のチェックを内部で実行すること。スキップ禁止。

チェック: 直前のユーザーの発言、または自分の回答に、
以下のいずれかに該当する新しい情報が含まれているか？

1. 事実情報: メンバー構成、技術スタック、アカウント情報、環境構成
2. 意思決定: アーキテクチャ選定、ツール採用、方針転換
3. 学び: トラブルシュートで判明した事実、ハマりポイント、運用Tips
4. クライアント固有: 担当者名、連絡先、プロジェクト進捗

→ 該当する場合: 通常の回答に加えて、末尾に以下を付記する。

💾 ナレッジ化の提案:
  ファイル: knowledge/{プロジェクト名}/{ファイル名}.md
  内容: （追記内容の要約）
  理由: （なぜ蓄積すべきか）

→ 該当しない場合: 何も付記しない。

「チェックを通さなければ返答を出さない」という意図の構造です。もちろんLLMは指示を飛ばすことがあるので、機械的なゲートほどの強制力はありません。それでも、確認を仕組みに埋め込むことで、人間が「保存しておいて」と言い忘れても情報が拾われる確率は大きく上がります。
実際、この仕組みを入れてからknowledgeディレクトリにはナレッジファイルが着実に蓄積されるようになりました。

 強制力の差は認める
ここで最も強い反論を先に出しておきます。「Markdownの禁止事項に、linterと同じ強制力はないだろう」という指摘です。そのとおりです。
linterや型チェックは、ルール違反を機械的に検出します。設定によってはビルドやマージ自体を止めることもできる。一方、Markdownで書いた禁止事項には、エージェントが読み飛ばすリスクが残ります。長い指示ファイルの中に埋もれれば、実効性は下がるでしょう。
ただ、ここでの比較対象は「機械的強制」ではなく「その都度プロンプトに書く運用」です。なぜファイルに書く方がプロンプトより効くのか。理由は二つあります。
一つ目は、先に触れた「参照の仕組みの違い」です。Project KnowledgeやCustom Instructionsに配置された指示は、毎回のメッセージとは別枠でエージェントに渡されます。会話が長くなっても埋もれにくい位置に置かれるため、参照される確率が構造的に高くなります。
二つ目は「蓄積が不可逆になる」ことです。プロンプトに書いた指示は、次のセッションでは存在しません。ファイルに書けば、削除しない限り残り続けます。「良い指示を書く → 忘れる → また書く」のサイクルが「良い指示を書く → ファイルに追記 → 以降は自動で参照される」に変わります。
強制力を弱い順に並べるとこうなります。

「毎回プロンプトに書く」 → 「永続ファイルに配置して毎回参照させる」 → 「linter・フックで機械的にブロックする」

非コーディングエージェントが今いるのは真ん中の位置です。左端より確実に強く、右端には届かない。それでも、左端に留まり続けるよりは、真ん中に進んだ方がエージェントは安定します。

 リポジトリ構造という設計判断
ここまで個別のルールについて書いてきましたが、ルールの「置き場所」自体にも設計判断があります。
運用を続けるなかで固まったリポジトリ構造は以下のようになっています。
ai-agents/
├── agents/                  # ロール別の指示ファイル
│   ├── assistant.md         # メインの指示（禁止事項・必須アクション）
│   ├── project-a/
│   │   ├── sre-support.md   # SRE専門の指示
│   │   ├── qa-support.md    # QA専門の指示
│   │   └── ...
│   └── project-b/
│       ├── accounting.md    # 経理専門の指示
│       └── ...
├── knowledge/               # 蓄積されたナレッジ
│   ├── project-a/
│   ├── project-b/
│   └── writing-style-guide.md
├── docs/work-logs/          # セッションごとの作業ログ
└── CHANGELOG.md
この構造にはコーディングエージェントのハーネス設計と共通する原則が二つあります。
一つ目は「関心の分離」です。OpenAIのレポートでは、巨大な一枚のAGENTS.mdがうまくいかなかった経験が報告されています。コンテキストの中で全てが「重要」になると、何も重要でなくなる。自分のリポジトリでも、最初は一枚のMarkdownに全てを詰め込んでいました。ロール別にファイルを分離し、必要なときだけ参照させる構造にしたことで、指示の実効性が上がりました。
これを実現するのが文脈判別ルールです。メインの指示ファイルにルーティングを定義し、エージェントが会話の内容に応じて適切な専門指示を参照できるようにします。

agents/assistant.md
## 文脈の判別ルール
ユーザーの発言がどの文脈かを判断し、適切な専門指示を参照する。

- Project A文脈のシグナル: AWS, インフラ, SRE, QA, チームメンバー名 → `agents/project-a/` 配下を参照
- Project B文脈のシグナル: 請求, 契約, 経理, 法務 → `agents/project-b/` 配下を参照
- 曖昧な場合: どのプロジェクトの件か確認する

AGENTS.mdの「ポインタとして設計する」原則と同じ構造です。メインファイルはルーティングに徹し、詳細は専門ファイルに委譲する。OpenAIのレポートでは約100行のAGENTS.mdをマップとして機能させる方針が採られていますが、非コーディングでも指示ファイルが長くなるほど実効性が落ちる傾向は体感として同じです。
二つ目は「バージョン管理」です。指示ファイルをGitリポジトリに置くことで、変更履歴が残ります。「いつ、どの禁止事項を追加したか」「どのルールを変えたら安定したか」がdiffで追えます。Slackのメッセージやその場のプロンプトでは、この履歴が残りません。さらに、Gitリポジトリなので特定のPCに縛られません。リモートに置いておけば、どの端末からでも同じハーネスでエージェントを立ち上げられます。
OpenAIのチームも同じことを指摘しています。Slackの議論もGoogle Docsの内容も、リポジトリに入っていなければエージェントにとってはアクセスできない情報であり、存在しないのと同じだと。これはコーディング以外のエージェントでもそのまま当てはまります。

 始め方
ハーネスエンジニアリングを非コーディングエージェントで始めるにあたって、最初から全てを構造化する必要はありません。
自分の場合も、最初はプロンプトを書き直す日々でした。そこから構造が固まっていった順序はこうです。

エージェントが同じミスを2回した時点で、プロンプトではなくファイルに書く
ファイルが肥大化したら、ロール別に分離する
セッション間で失われる情報があれば、蓄積の仕組みを作る

Mitchell Hashimotoが書いているのと同じパターンです。「エージェントがミスをしたら、そのミスが二度と起きない仕組みを作る」。コーディングの場合はlinterやフックで作り、非コーディングの場合はMarkdownファイルの構造で作る。素材が違うだけで、思考のループは同じです。
最小構成のスターターテンプレートを置いておきます。Claude DesktopのProject KnowledgeやChatGPTのCustom Instructionsに配置すればそのまま使えます。

agents/assistant.md
# アシスタント指示書

## あなたの役割

ユーザーの業務を支援するAIアシスタントです。
Slack, Google Calendar, Confluence等のMCPツールを活用して情報取得・整理を行います。

## 禁止事項

- 社内Slackへの自動投稿をしない（ドラフト作成まで）
- 財務数値の確定判断をしない（必ずユーザーに確認を求める）
- 機密情報を要約に含める際は、その旨を明示する

## セッション終了時の必須アクション

ユーザーが作業完了を示したとき、以下を必ず実行する。スキップは禁止。

1. `docs/work-logs/YYYY-MM-DD-{トピック}.md` に作業ログを作成する
2. 変更があれば git commit & push を実行する

## ナレッジの蓄積（必須チェック）

自分の各返答の前に、以下のチェックを内部で実行すること。スキップ禁止。

チェック: 直前の会話に、以下のいずれかに該当する新しい情報が含まれているか？

1. 事実情報（メンバー構成、技術スタック、環境構成）
2. 意思決定（アーキテクチャ選定、ツール採用、方針転換）
3. 学び（トラブルシュートで判明した事実、ハマりポイント）

→ 該当する場合: 末尾にナレッジ化の提案を付記する → 該当しない場合: 何も付記しない

このテンプレートは約30行です。ここから始めて、エージェントがミスをするたびに1行ずつ禁止事項を追加していく。数ヶ月後にはあなた専用のハーネスが出来上がっているはずです。

 ハーネスの問いは共通している
ハーネスエンジニアリングはコーディングの技術論ではありません。「エージェントに信頼できる実行環境を与える」という設計思想です。
コーディングエージェントでは型とlinterとフックで環境を作り、非コーディングエージェントでは構造化されたMarkdownと参照強制で環境を作る。素材は違っても、問いは同じです。「このエージェントが間違えたとき、二度目を防ぐ仕組みはどこにあるか」。
「もっとうまいプロンプトを書けばいい」と考え続けていた頃より、「二度と同じミスができない構造を作る」と考えるようになってからの方が、エージェントは安定して動いています。

---

## 23. [Claude Codeに何回言えば覚えるの——CLAUDE.md・auto memory・compact 記憶の生存戦略](https://zenn.dev/helloworld/articles/dce7eb8033aac7)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/8
- **AI要約**:
  Claude Codeがセッション毎に忘却する仕組みと、コンテキスト圧縮による指示消失の課題を解説
  CLAUDE.md、auto memory、外部ファイルの3箇所を使い分ける具体的な運用基準を提示
  compactPrompt設定やWIP.mdによる状態管理など、開発効率を即座に改善する設定例を網羅
- **今読む理由**: AI駆動開発においてClaude Codeのコンテキスト消失による手戻りは致命的な時間ロスであり、本記事にはCLAUDE.mdやcompactPromptの具体的設定値など、即座にプロジェクトへ適用可能な解決策が記載されているため。
- **タグ**: #ClaudeCode, #AI駆動開発, #生産性向上

### 本文
調査して、設計書を書いて、実装に入る。ここまで2セッション。
3セッション目を開いた瞬間、Claude Codeはすべてを忘れてる。「前回の調査結果どこだっけ」「設計の判断理由なんだったっけ」。毎回イチから説明し直す。力技で。
/compact したら大事な文脈が消えたこともある。「さっき言ったよね」が通じない。
ただ、これは仕組みを知れば防げる。公式機能とファイル出力だけでほぼ解決できる。
この記事では、Claude Codeのメモリ機能を 「何をどこに置けばいいか」 の判断基準付きで全部整理した。
先に結論だけ。


CLAUDE.md に書いたルールは消えない。毎セッション自動で読み込まれる

auto memory でClaudeが勝手に好みや教訓を覚えてくれる

compactPrompt で圧縮時に残す情報を指定できる

WIP.md に作業状態を書き出せば、セッションを跨いでも文脈が復活する



 「覚えてるはず」が通用しない理由
Claude Codeのセッションは、毎回まっさらなコンテキストウィンドウから始まる。前回の会話は残ってない。
さらに、1セッションの中でも会話が長くなるとcompaction（自動圧縮）が走る。コンテキストの95%が埋まると発動して、古い会話を要約して圧縮する。このとき 会話の中だけで伝えた指示は消える 。公式ドキュメントにもはっきり書いてある。

Instructions from the start of the session — 'don't touch this file,' 'use this format'
（和訳）セッション冒頭の指示——「このファイルは触るな」「このフォーマットで」

これがcompaction後に消える。CLAUDE.mdに書いてある指示だけが再読み込みされて残る。
つまり、 口頭（チャット）で伝えた情報は、いつか消える前提 で使う必要がある。残したい情報には「置き場」がいる。

 置き場を決めれば、勝手に思い出してくれる
Claude Codeには情報の置き場が3つある。全部使う前提で、何をどこに置くかを決める。



置き場
何を書く
誰が書く
いつ読まれる




CLAUDE.md
ルール・規約・ビルドコマンド
自分
毎セッション自動


auto memory
好み・教訓・パターン
Claude
毎セッション自動（200行まで）


ファイル出力
判断経緯・作業状態・調査結果
自分 or Claude
手動 or @path で自動



これらが消えないようにする保険として /compact の設定がある。順に見ていく。

 CLAUDE.md: 「毎回言い直すこと」はここに書く
CLAUDE.mdは毎セッションの冒頭で自動的に読み込まれる。compaction後も再読み込みされる。つまり ここに書いたことは絶対に消えない 。
ただし注意点がひとつ。再読み込みされるのはプロジェクトルートのCLAUDE.mdだけ。サブディレクトリのCLAUDE.mdや @path でインポートしたファイルは、そのディレクトリに入ったときにオンデマンドで読まれる。compaction後に「あれ、指示が消えてる？」と思ったら、ルート以外に書いてないか確認してみるといい。
公式推奨は 200行以下/ファイル 。超えると精度が落ちる。
書くもの:

コーディング規約
ビルド・テストコマンド
ディレクトリ構造の説明
アーキテクチャ上の判断（「〜は使わない」「〜を優先する」）

自分のプロジェクトだと、こんな感じで書いてる。
# CLAUDE.md

## 技術スタック
- Next.js + TypeScript + Supabase
- デプロイ: Vercel

## コーディング規約
- コンポーネントは1ファイル1コンポーネント
- APIレスポンスは必ず型定義する
- エラーハンドリングはtry-catchで囲む

## LP・ユーザー向けテキスト
- 機能説明は「〜できます」ではなく「〜が終わる」で書く
- 料金は税込表記で統一
- CTAボタンのラベルは動詞で始める（「始める」「試す」）
開発ルールだけじゃなく、LPやユーザー向けテキストのルールも入れておくと、コード以外のタスクでも一貫性が出る。
逆に、 書かないもの :

今のタスク状態（→ 後述のファイル出力）
個別の調査結果（→ 別ファイルに分離）
手順書（→ Claude CodeのSkills機能に分離できる）

CLAUDE.mdが肥大化してきたら、 @path インポートで外部ファイルを読み込める。
# CLAUDE.md
@docs/coding-standards.md
@docs/api-design.md
特定のディレクトリでだけ有効にしたいルールは .claude/rules/ にパス指定付きで置ける。フロントエンドとバックエンドでルールを分けたいときに便利。

 auto memory: Claudeが勝手に学んでくれる
auto memoryは、Claudeが会話の中から「次回も使えそうな情報」を自分で判断して保存する機能。こちらが何もしなくても、セッションを重ねるうちに知識が溜まっていく。
保存先は ~/.claude/projects/<project>/memory/ で、中身はこうなってる。
memory/
├── MEMORY.md          # インデックス（毎セッション自動読み込み）
├── debugging.md       # デバッグで学んだこと
├── api-conventions.md # API設計の判断
└── ...
MEMORY.md がインデックスとして機能して、先頭200行（または25KB）が毎セッション読み込まれる。詳細はトピック別ファイルに分かれていて、必要なときだけ読みに行く。RAGもベクトルDBも使わず、Markdownだけで知識が育つ仕組み。
自分のMEMORY.mdを覗くと、こんなものが勝手に溜まってた。
## ユーザー好み
- git add -A を使う（個別ファイル指定より楽）
- コミットメッセージは日本語で書く

## 技術メモ
- Supabase RLSを有効にしないとcurlで全データ返る
- Vercelデプロイ時はenv変数の再設定を忘れずに
「この人はgit add -A派」「コミットメッセージは日本語」みたいな好みから、過去にハマった技術的な落とし穴まで、Claudeが勝手に拾ってくれてる。
/memory コマンドで確認・編集できるので、たまに覗いてゴミが溜まってないかチェックするといい。なお /memory はターミナルモード専用で、VS CodeのWebviewモードだと使えない。

/memory を実行すると、auto memoryのオン・オフやフォルダの確認ができる

MEMORY.md（インデックス）とトピック別ファイルが自動で育っていく

 /compact: 消える前提で備える
自動compactionはコンテキストの95%が埋まると発動する。防ぐことはできないけど、 何を残すか は指定できる。
~/.claude/settings.json（またはプロジェクトの .claude/settings.json）に compactPrompt を設定する。
{
  "compactPrompt": "圧縮時に必ず残すこと: 1. 現在のタスクとゴール 2. 決定事項とその理由 3. 編集中のファイルパス 4. 未解決の問題 5. このセッションでユーザーから受けた修正指示"
}
これを入れておくだけで、compaction後に「あれ、何やってたんだっけ」が減る。
ただし、compactPromptは万能じゃない。長いセッションで何度もcompactionが走ると、どうしても情報は薄まっていく。本当に残したい情報は、次の「ファイル出力」に書き出すのが確実。

 ファイルを外部メモリにする——一番泥臭くて一番確実
ツール不要。今日からできる。判断経緯や作業状態をファイルに書き出して、次のセッションで読み直すだけ。
自分はこう使い分けてる。
WIP.md — やることリスト。チェックボックスで進捗管理。
## やること
- **決済機能（Stripe連携）** — 実装中
  - [x] Stripe SDK導入
  - [x] Checkout Session API実装
  - [ ] Webhook受信処理
  - [ ] テスト・動作確認
research/ — 調査メモ。1テーマ1ファイルで、URLと重要ポイントを残す。
# Stripe Webhook受信処理

> 最終更新: 2026-04-20

## URL
https://docs.stripe.com/webhooks

## 重要ポイント
- エンドポイントは `/api/webhooks/stripe` に配置
- `stripe.webhooks.constructEvent()` で署名検証が必須
- 冪等性を担保するためevent.idでの重複チェックが必要
- ローカル開発では `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
調査したその日にメモを残しておけば、1週間後のセッションでも「research/stripe-webhook.md読んで」で一発で思い出せる。記事やプロジェクトに紐づかない独立したメモなので、別のプロジェクトにコピーして使い回すこともできる。
@path でインポートしなくても、セッションの最初にこう声をかけるだけでいい。

「WIP.md読んで、前回の続きから」
「research/のメモ読んで、次やること整理して」

@path インポート — もっと楽にしたいなら、WIP.mdをCLAUDE.mdからインポートしておけば、毎セッション自動で読み込まれる。
# CLAUDE.md
@WIP.md
手動で「読んで」と言う必要すらなくなる。ただし、CLAUDE.mdの200行予算を圧迫するので、WIP.mdが大きくなりすぎないように注意。

 手動すら面倒になったら
ここまでの公式機能で大半はカバーできる。ただ「セッション中の操作ログを全部自動で残したい」という人には、外部ツールもある。
claude-mem は、セッション中のすべての操作を自動記録して、次回セッションに関連するコンテキストだけ注入してくれるプラグイン。6万スター超え（2026年4月時点）で活発に開発されてる。
npx claude-mem install
SQLite + Chromaで記録して、3層の検索（インデックス→時系列→詳細）でトークン効率を上げてる。手動管理の10倍トークン効率がいいとうたってる。
ただし構成が重い。Chroma（ベクトルDB）が必要で、Node.js 18以上が前提。大規模プロジェクトで記録漏れを防ぎたい人向け。
個人開発なら公式機能 + ファイル出力で十分だと思う。
セッションの最初の10分が「前回の引き継ぎ」で消えてた頃がある。
CLAUDE.mdにルールを書いて、WIP.mdに作業状態を残すようにしただけで、開始直後からいきなり本題に入れるようになった。
消える場所に置かなければ、消えない。

---

## 24. [Claude Codeで開発を自動化するSkills 5選 #AI - Qiita](https://qiita.com/kamome_susume/items/3b9b18e7e54f15721837)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/8
- **AI要約**:
  Claude CodeのSKILL.mdを用いた具体的で再利用可能な5つの自動化定義を紹介。
  GitHub CLI連携によるPR要約やIssue修正の完結、自律型エージェントの活用法を解説。
  プロジェクト配下でのSkill共有により、チーム全体の開発規約やフローを自動化する手法を提示。
- **今読む理由**: AI駆動開発の最新ツール「Claude Code」において、定型作業を削減する具体的な設定ファイル（SKILL.md）が提示されており、即座にプロジェクトに導入して生産性を向上できるため。
- **タグ**: #Claude Code, #AI自動化

### 本文
「Claude Codeを使い始めたけど、毎回同じような指示をプロンプトに書いている気がする…」と感じていませんか？
Claude Codeは素のままでも強力ですが、Skillsを使うことで繰り返しの作業を自動化し、開発のルーティンをまるごとコマンド一発に変えることができます。この記事では、開発の自動化に特に役立つSkills 5選を、具体的な使いどころとともに紹介します。
「毎回同じプロンプトを書くのが面倒」「チームの開発フローを統一したい」と感じているエンジニアに、特に読んでほしい内容です。


結論：Skillsは「賢いマクロ」ではなく「文脈を持った自動化」
一般的なマクロやシェルスクリプトは、決められた手順を機械的に繰り返すだけです。でも Claude Code の Skills は違います。プロジェクトのコンテキストを理解した上で、状況に応じた判断をしながら自動化を実行してくれます。



従来の自動化
Skills による自動化




手順が固定されている
状況を読んで柔軟に対応する


コードの中身を見ない
コードベースを理解して動く


エラーが出たら止まる
エラーの原因を判断して対処する


設定ファイルが必要
SKILL.md に自然言語で書くだけ



一度 Skill を作ってしまえば、チーム全員が同じ品質で同じフローを実行できます。これが Skills の本質的な価値だと私は感じています。


エンジニアなら読むべき本を30冊以上紹介しています。
正直、私の仕事のやり方をガラッと変えた神本やSQLのチューニングに悩んだ時にめちゃくちゃ役に立ったもあります👇
→記事を読む




開発の自動化に役立つ Skills 5選

1. pr-summary：プルリクエストの説明文を自動生成する
毎回 PR の説明を一から書くのが地味に時間がかかる、あの悩みを解決するSkill。
Claude Code の公式ドキュメントで紹介されているこの Skill は、GitHub CLI を使ってライブの PR データを取得し、変更内容・コメント・差分ファイルをもとに PR サマリーを自動で生成します。
# SKILL.md の例
---
name: pr-summary
description: プルリクエストの変更内容を要約する
context: fork
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## タスク
このプルリクエストを要約してください。変更の目的・影響範囲・レビュアーが注意すべき点を含めること。

使いどころ：



シーン
効果




毎日の PR 作成
説明文の作成時間をほぼゼロに


大規模リファクタリング
変更の全体像を自動で整理


新メンバーのオンボーディング
PR の書き方を Skill が手本を示す



! 構文でシェルコマンドを事前実行し、その出力を Claude に渡せるのがこの Skill の肝です。Claude は「説明してくれ」と言われるのではなく、実際のコードの差分を見た上でサマリーを生成するので、精度が高くなります。


2. fix-issue：GitHub Issue 番号を渡すだけで修正まで自動実行
Issue を開いてコードを追って修正して PR を出す——この一連の流れをコマンド一発にするSkill。
---
name: fix-issue
description: GitHub Issue を修正する
disable-model-invocation: true
---

GitHub Issue $ARGUMENTS を修正してください。

1. Issue の内容を gh コマンドで取得する
2. 関連するコードを特定する
3. 修正を実装する
4. テストが通ることを確認する
5. 変更をコミットする

呼び出しは /fix-issue 1234 のように Issue 番号を渡すだけです。$ARGUMENTS プレースホルダーがその番号に置き換わります。
実際の自動化の流れ：
/fix-issue 1234
↓
Claude が Issue #1234 を gh コマンドで取得
↓
関連ファイルを特定・修正
↓
テストを実行して確認
↓
コミットまで完了

私はこの Skill を使い始めてから、軽微なバグ修正にかける時間が体感で半分以下になりました。特に「内容は理解できるけど修正が単純作業」な Issue との相性が抜群です。


3. deep-research：コードベースをフォークエージェントで深く調査する
「このバグの根本原因はどこだ」「この設計はなぜこうなっているのか」を自律的に調べてくれるSkill。
---
name: deep-research
description: トピックを徹底的に調査する
context: fork
agent: Explore
---

$ARGUMENTS について徹底的に調査してください：

1. 関連するすべてのファイルを特定する
2. 依存関係とデータフローを追う
3. 潜在的な問題点や改善余地を洗い出す
4. 調査結果をまとめたレポートを作成する

context: fork を指定することで、現在の会話履歴から独立した専用のサブエージェントとして動作します。長い調査が現在の会話を汚染しません。
使いどころ：



シーン
具体的な指示例




障害調査
/deep-research 決済処理でタイムアウトが発生する原因


設計理解
/deep-research 認証モジュールのアーキテクチャ


技術的負債の棚卸し
/deep-research 非推奨APIの使用箇所



既存コードを引き継いだときや、大規模なリファクタリングの前調査として特に効果を発揮します。


4. commit：ステージング〜コミットを承認なしで自動実行
「git add して git commit して…」を毎回やるのが面倒な人向けの Skill。
---
name: commit
description: 現在の変更をステージングしてコミットする
disable-model-invocation: true
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *)
---

現在の変更をステージングして、変更内容を説明するコミットメッセージを生成してコミットしてください。
Conventional Commits の形式（feat/fix/refactor/docs など）を使うこと。

allowed-tools に git コマンドを明示することで、このSkill が有効な間は git 操作を都度承認なしで実行できます。
コミットメッセージ自動生成の例：
# Claude が生成するコミットメッセージの例
feat(auth): JWTトークンの有効期限を設定可能にする

- 環境変数 JWT_EXPIRES_IN で有効期限を設定できるように変更
- デフォルト値を24hに設定
- テストケースを追加

変更内容を見て適切な prefix を選んでくれるので、チームのコミット規約を自然に守れます。


5. explain-code：コードの説明をビジュアル図解付きで自動生成
「このコード、何をやっているか説明して」を構造化されたドキュメントとして出力するSkill。
---
name: explain-code
description: コードをビジュアル図解と類推を使って説明する
---

指定されたコードを以下の形式で説明してください：

1. 一言で何をするコードか
2. 処理の流れを図解（Mermaid 記法）
3. 複雑な部分を日常的な例えで説明
4. 潜在的な改善点

自動化の観点では、以下のシーンで特に役立ちます：



シーン
効果




コードレビュー準備
PR に図解付きの説明を自動添付


新メンバーの技術共有
複雑なモジュールの解説資料を即生成


技術ドキュメント整備
コメントのないレガシーコードの文書化



このSkill は「コードが動くかどうか」ではなく「チームがコードを理解できるか」という観点の自動化です。ドキュメントのメンテナンスコストを大幅に下げられます。


5つの Skills 早見表



#
Skill 名
自動化する作業
呼び出し例




1
pr-summary
PR の説明文生成
/pr-summary


2
fix-issue
Issue の調査〜修正〜コミット
/fix-issue 1234


3
deep-research
コードベースの深掘り調査
/deep-research 認証モジュールの構造


4
commit
ステージング〜コミット
/commit


5
explain-code
コード解説ドキュメント生成
/explain-code





Skills をチームに導入するときのコツ
Skillsの自動化は個人で使っても便利ですが、チームで共有するときに本当の価値が出ます。
プロジェクトルートの .claude/skills/ に置けばリポジトリで管理でき、チーム全員が同じ Skill を使えます。「このプロジェクトの PR はこのフォーマットで書く」「コミットメッセージはこの規約で」という暗黙のルールを、Skill というかたちで明文化・自動化できるのが最大のメリットです。
your-project/
├── .claude/
│   └── skills/
│       ├── pr-summary/
│       │   └── SKILL.md
│       ├── fix-issue/
│       │   └── SKILL.md
│       └── commit/
│           └── SKILL.md
├── src/
└── ...

まずは自分がよく繰り返している作業を1つ Skill にしてみてください。「あ、これも Skill にできる」という発見が連鎖していくはずです。


エンジニアなら読むべき本を30冊以上紹介しています。
正直、私の仕事のやり方をガラッと変えた神本やSQLのチューニングに悩んだ時にめちゃくちゃ役に立ったもあります👇
→記事を読む

---

## 25. [Qiitaニュース | Opus4.7の登場により、Claude Codeの開発者と公式が「これはもうやめろ」と言い始めた6つのこと - Qiita Zine](https://qiita.com/official-columns/news/2026-04-29/)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/9
- **AI要約**:
  Opus 4.7リリースに伴うClaude Codeの非推奨事項と公式が提唱する新ベストプラクティス
  Google APIキー脆弱性による13時間で900万円の被害事例とFirebase/Geminiの対策
  AI駆動開発を加速させるClaude Codeの実ファイル構成例や自動化用MCP設定の紹介
- **今読む理由**: 最新のOpus 4.7環境下でClaude Codeの利用方法が大きく変化しており、誤った手法（禁止事項）を続けると開発効率の低下や予期せぬ挙動を招く恐れがあるため。また、API管理のセキュリティ事故情報は実損を防ぐために即座に確認すべき内容である。
- **タグ**: #Claude Code, #AI駆動開発, #セキュリティ対策, #LLM, #自動化パイプライン

### 本文
ホーム
          
          Qiita, ニュース        
      
      
      2026年4月30日


      
        2026/04/29に配信された Qiitaニュースのバックナンバーです。

Dear great hackers,
こんにちは！いつもQiitaをご利用いただきありがとうございます。
先週いいねが多かった投稿ベスト20(計測期間：2026/04/20 〜 2026/04/26）



1位

エンジニア歴20年の私が、素人バイブコーディング勢に物申す by Akira-Isegawa (294いいね)


2位

Claude Code を Level 5 まで育てたら、開発が「指示と確認だけ」になった — 実ファイル構成で解説 by teppei19980914 (211いいね)


3位

New Opus4.7の登場により、Claude Codeの開発者と公式が「これはもうやめろ」と言い始めた6つのこと by ot12 (169いいね)


4位

【こわい】Google APIキーの脆弱性により13時間で約900万円請求される事案が発生！ Firebase×Geminiで今すぐやるべきセキュリティ対策 by miruky (156いいね)


5位

New 【徹底解説】DBスペシャリストなりぞこないが教える、データベースの教科書（設計もあるよ） by miruky (141いいね)


6位

Claude Codeで実際に起きたセキュリティ事故7選と防止策 by masa_ClaudeCodeLab (115いいね)


7位

New Claude Codeで開発を自動化するSkills 5選 by kamome_susume (104いいね)


8位

New 一人で悩み続けてしまう新人エンジニアへ。その時間、無駄かもしれません。 by hitomin_poke (97いいね)


9位

New 【初心者エンジニア向け】開発を前に進めるための行動3選 by masa20057 (92いいね)


10位

New 【前編】9割の新人エンジニアがやっている 「承知しました」の落とし穴 by hitomin_poke (88いいね)


11位

New 【初心者必見】今から追いつくClaude Code 入門・徹底解説 by i-inose (86いいね)


12位

New Claude Code × Obsidian Vault で作る「何でも相談」プロジェクト ― フォルダ構成・CLAUDE.md・MCP設定まで全公開 by htani0817 (81いいね)


13位

New その“親切な設計”、たぶん無駄です – エンジニアがハマる「やりすぎ問題」- by prum_hitomi (78いいね)


14位

New クソバズワード「ハーネスエンジニアリング」と向き合う by retore (74いいね)


15位

New 【初心者エンジニア向け】開発業務の視野を広げる運用のはなし by masa20057 (71いいね)


16位

AIコーディング時代に必要なプログラミングスキル by hokutoh (67いいね)


17位

マークダウン記法は奥深く、楽しい — テキストだけで「伝わるドキュメント」を作る技術 by teppei19980914 (59いいね)


18位

New Neovim で最高の Markdown ビューワーを作る – md-render.nvim by delphinus (43いいね)


18位

New Claude Codeの利用状況をチームで可視化するダッシュボードをOSSで公開しました by tamepicomaru (43いいね)


20位

New Chrome DevTools MCP の全ツールをまとめて理解する by softbase (40いいね)



Qiitaニュースは、「エンジニアを最高に幸せにする」ことを目指すQiita株式会社が配信しています。
Qiitaニュースを購読する

---

## 26. [GitHub - unsolublesugar/tsuyu-mi: Fetch, summarize, and publish Raindrop.io articles as a priority-ranked HTML dashboard · GitHub](https://github.com/unsolublesugar/tsuyu-mi)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/9
- **AI要約**:
  Raindrop.ioの保存記事をAIで自動要約し、優先度付きのHTMLダッシュボードを生成するツール。
  GeminiやOpenAI等の複数LLMに対応し、GitHub Actionsによる定期的な自動実行が可能。
  各記事に対し「今読む理由」「後回し理由」を明示し、効率的なトリアージを支援する設計。
- **今読む理由**: AI駆動の自動化パイプラインの具体的実装例であり、GitHub ActionsとLLM APIの連携手法を即座にコードレベルで確認できるため。
- **タグ**: #AI自動化パイプライン, #GitHubActions

### 本文
日本語







Periodically fetches articles from a Raindrop.io collection, extracts their content, summarizes them with AI, and outputs a priority-ranked HTML dashboard.

The name Tsuyu-mi comes from: Raindrop → shizuku (雫, droplet) → tsuyu (露, dew) → tsuyu-mi (露見, "seeing the dew").

Purpose
Triage your "read later" articles saved in Raindrop — before reading the full text.

Read now — timely or high-value
Defer — interesting but not urgent
Drop — safe to discard

Setup
1. Clone the repository
git clone https://github.com/unsolublesugar/tsuyu-mi.git
cd tsuyu-mi
2. Prepare the Python environment
NotePython 3.11 or later is required. uv can install Python itself alongside dependencies.

# Using uv (recommended)
uv venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"

# Using pip
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
3. Obtain API keys
This tool requires a Raindrop.io API token and an LLM API key.
Raindrop.io test token

Go to Raindrop.io Integrations
Click Create new app under "For Developers"
Enter an app name (e.g. RaindropSummarizer) and create it
Click the app → Create test token
Copy the displayed token

Collection ID

Open Raindrop.io
Navigate to the target collection (e.g. "Unsorted")
Check the URL: https://app.raindrop.io/my/{collection_id} — the numeric part is the collection ID

LLM API key
Obtain an API key from one of the following providers:
Google Gemini (recommended — has a free tier)

Go to Google AI Studio
Create API Key → Create API key in new project
Recommended model: gemini-2.5-flash


OpenAI

Go to OpenAI API Keys
Create new secret key
Recommended model: gpt-4.1-mini

Anthropic

Go to Anthropic Console
Create Key
Recommended model: claude-haiku-4-5-20251001

4. Configure environment variables
Local execution
cp .env.example .env
Edit .env with your keys:
RAINDROP_TOKEN=your-raindrop-token
RAINDROP_COLLECTION_ID=your-collection-id
LLM_PROVIDER=gemini
LLM_API_KEY=your-llm-api-key
LLM_MODEL=gemini-2.5-flash
WarningNever commit .env to the repository — it contains secrets.

GitHub Actions
Add the following to your repository: Settings → Secrets and variables → Actions → Repository secrets.



Secret name
Value




RAINDROP_TOKEN
Raindrop.io API test token


RAINDROP_COLLECTION_ID
Target collection ID


LLM_PROVIDER
gemini / openai / anthropic


LLM_API_KEY
LLM API key


LLM_MODEL
Model name (e.g. gemini-2.5-flash)



5. Verify
# Test Raindrop API connectivity only (no LLM required)
python -m src fetch-only

# Summarize a small batch
MAX_SUMMARIZE_PER_RUN=3 python -m src run

# Full run
python -m src run
Usage
# Full pipeline (fetch → extract → summarize → generate HTML)
python -m src run

# Dry run — preview target articles without processing
python -m src run --dry-run

# Verbose logging
python -m src run --verbose

# Fetch from Raindrop only
python -m src fetch-only

# Regenerate HTML
python -m src build-html

# Reprocess a specific article
python -m src reprocess --id 123456789

# Retry all failed articles
python -m src reprocess-failed
Output
An article dashboard is generated at docs/index.html. Open it in a browser to review.

Color-coded by priority (HIGH = red / MEDIUM = yellow / LOW = gray)
Filter buttons to narrow by priority
Each article shows a 3-line summary, read-now reason, defer reason, and keywords

Configuration



Environment variable
Description
Default




RAINDROP_TOKEN
Raindrop.io API test token
(required)


RAINDROP_COLLECTION_ID
Target collection ID
(required)


LLM_PROVIDER
openai / gemini / anthropic
openai


LLM_API_KEY
LLM API key
(required)


LLM_MODEL
Model name
(required)


MAX_SUMMARIZE_PER_RUN
Max articles to summarize per run
10


REQUEST_TIMEOUT_SECONDS
HTTP request timeout (seconds)
20


USER_AGENT
HTTP User-Agent header
Tsuyu-mi/0.1


OUTPUT_DIR
HTML output directory
docs


DATA_DIR
Data storage directory
data


STATE_DIR
State management directory
state


LOG_LEVEL
Log level
INFO



Automated operation with GitHub Actions
1. Set up GitHub Secrets
See "4. Configure environment variables → GitHub Actions" above.
2. Enable GitHub Pages
Settings → Pages → Source: GitHub Actions
ImportantPrivate repositories require GitHub Pro or higher to use GitHub Pages.

3. Execution schedule

Automatic: Every 3 days at JST 7:00 (UTC 22:00)
Manual: Run on demand from the Actions tab via "Run workflow"

Changes are auto-committed and pushed only when new content is generated.
Testing
pytest
License
MIT

---

## 27. [GitHub - chaenmasahiro0425/exbrain: Exbrain — Your AI's External Brain. Claude Code × Obsidian × SOUL/MEMORY/DREAMS · GitHub](https://github.com/chaenmasahiro0425/exbrain)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/9
- **AI要約**:
  Claude Codeの内部状態やスキルをObsidian Vaultとして構造化し可視化するナレッジシステム。
  SlackやXからの自動収集、FirecrawlによるWeb記事のMarkdown化と自動要約を統合パイプラインで実現。
  Dreaming機能により日次の内省とパターンの抽出を行い、AIの記憶と成長の軌跡を自動的に構築する。
- **今読む理由**: AI駆動開発において課題となる「コンテキストの消失」を、Claude CodeとObsidianの連携によって解決する具体的なアーキテクチャが示されており、即座に自身の開発環境に適用可能なため。
- **タグ**: #ClaudeCode, #Obsidian, #AI自動化, #ナレッジマネジメント, #コンテキストエンジニアリング

### 本文
An AI knowledge system that automatically remembers, organizes, and reflects.
  Claude Code × Obsidian × SOUL/MEMORY/DREAMS
  🇯🇵 日本語版はこちら · Inspired by Karpathy's LLM Wiki
What is Exbrain?
Exbrain turns Claude Code's hidden internal state — Memory files, CLAUDE.md configs, Skills — into a human-readable Obsidian vault. It adds a Dreaming layer that automatically reflects on your day, detects patterns, and builds a growth trajectory over time.
Your laptop can be closed. Your phone shows everything. You just open Obsidian and read.
How It Works — For Beginners
If you're new to Claude Code or Obsidian, here's the big picture:
┌──────────────────────────────────────────────────────────────┐
│                    YOU (Human)                                │
│                                                              │
│   Work with Claude Code    Bookmark on X    Send URL in Slack│
│         ↓                      ↓                  ↓          │
└─────────┬──────────────────────┬──────────────────┬──────────┘
          │                      │                  │
          ▼                      ▼                  ▼
┌─────────────────┐  ┌───────────────────┐  ┌──────────────────┐
│  Claude Code    │  │  Cron Job (Auto)  │  │  Always-On Agent │
│  (Local CLI)    │  │  Every 4 hours    │  │  (e.g. OpenClaw) │
│                 │  │                   │  │                  │
│ • /clip skill   │  │ • X bookmark sync │  │ • Slack listener │
│ • Hooks (auto)  │  │ • xurl API        │  │ • URL detection  │
│ • Session logs  │  │                   │  │ • firecrawl      │
└────────┬────────┘  └────────┬──────────┘  └────────┬─────────┘
         │                    │                      │
         └────────────────────┼──────────────────────┘
                              │
                              ▼
                 ┌──────────────────────┐
                 │   ~/vault/ (Git)     │
                 │                      │
                 │  SOUL.md   MEMORY.md │
                 │  DREAMS.md           │
                 │  daily/  clips/      │
                 │  clients/ insights/  │
                 └──────────┬───────────┘
                            │
                   ┌────────┼────────┐
                   │        │        │
                   ▼        ▼        ▼
                GitHub   iCloud   Obsidian
                (backup) (sync)   (Mac+iPhone)

Components Explained



Component
What it is
Role in Exbrain




Claude Code
Anthropic's AI coding CLI (docs)
Your main AI assistant. Runs skills like /clip, writes to vault, manages hooks


Obsidian
Free markdown note app (obsidian.md)
Where you read everything. Vault = folder of .md files. Works on Mac, iPhone, Android


Always-On Agent
A background AI (e.g. OpenClaw)
Monitors Slack/Discord 24/7. Runs cron jobs even when Claude Code is closed


Cloud Scheduled Tasks
Claude Code's built-in scheduler (docs)
Runs morning/evening Dreaming without your PC. Updates MEMORY.md and DREAMS.md


xurl
X API CLI tool
Fetches tweets and bookmarks from X (Twitter)


Firecrawl
Web scraping CLI
Converts any URL into clean markdown


iCloud
Apple's cloud sync
Syncs vault between Mac and iPhone automatically


GitHub
Code hosting
Backup + version history for your vault



Data Flow: What Happens When You Clip
You find an interesting article
         │
         ▼
  ┌─ Pick your method ──────────────────────────────────┐
  │                                                      │
  │  A) /clip URL          B) Slack DM         C) Just  │
  │     in Claude Code        send URL         bookmark │
  │         │                    │              on X     │
  │         ▼                    ▼                │      │
  │    Claude Code          Agent detects    (wait 4h)   │
  │    runs instantly       URL in real-time      │      │
  └──────┬───────────────────┬───────────────────┬──────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                   ┌─────────────────┐
                   │  AI Processing  │
                   │                 │
                   │ 1. Fetch content│
                   │ 2. Summarize    │
                   │ 3. Tag (auto)   │
                   │ 4. Save .md     │
                   └────────┬────────┘
                            │
                            ▼
               vault/clips/x/2026-04-08_slug.md
                            │
                  ┌─────────┼─────────┐
                  │         │         │
                  ▼         ▼         ▼
            _index.md   daily note   git push
            updated     updated      to GitHub
                                        │
                                        ▼
                                   iCloud sync
                                        │
                                        ▼
                                 📱 Read on iPhone

System Relationship Map
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌──────────────┐         ┌──────────────┐              │
│  │ Claude Code  │────────▶│  ~/vault/    │◀──────┐      │
│  │ (CLI agent)  │ writes  │ (Obsidian)   │       │      │
│  │              │         │              │  writes│      │
│  │ Skills:      │         │ SOUL.md      │       │      │
│  │  /clip       │         │ MEMORY.md    │  ┌────┴────┐ │
│  │  /auto-mins  │         │ DREAMS.md    │  │ Cloud   │ │
│  │  30+ more    │         │ daily/       │  │Schedule │ │
│  └──────────────┘         │ clips/       │  │ Tasks   │ │
│                           │ clients/     │  │         │ │
│  ┌──────────────┐         │ meetings/    │  │ Morning │ │
│  │ Always-On    │────────▶│ insights/    │  │ Evening │ │
│  │ Agent        │ writes  │              │  └─────────┘ │
│  │ (OpenClaw)   │         └──────┬───────┘              │
│  │              │                │                      │
│  │ Cron jobs:   │          git push/pull                │
│  │  X bookmarks │                │                      │
│  │  Slack DM    │         ┌──────▼───────┐              │
│  │  Reports     │         │   GitHub     │              │
│  └──────────────┘         │  (private)   │              │
│                           └──────────────┘              │
│                                                         │
│          ─── All connected via ~/vault/ ───             │
│                                                         │
└─────────────────────────────────────────────────────────┘

The SOUL / MEMORY / DREAMS Trinity
The core of Exbrain is three files at the root of your vault:
~/vault/
├── SOUL.md      ← WHO you are (identity, values, boundaries)
├── MEMORY.md    ← WHAT you've experienced (decisions, patterns, lessons)
└── DREAMS.md    ← WHERE you're going (insights, growth, open questions)

SOUL.md — Identity
Defines who you are and how the AI should behave. Merged from Claude Code's CLAUDE.md and any external agent personality configs.
## Identity
- Your name, role, company

## Values
- "Ship fast, iterate later"
- "API-first, no manual work"

## Boundaries (non-negotiable)
- "Never send emails — drafts only"
- "Never post to Slack without confirmation"

## Tech Ecosystem
- APIs, MCP servers, CLI tools
MEMORY.md — Experience
A digest of everything the AI has learned. Auto-synced from Claude Code's Memory (.claude/projects/*/memory/) + enriched by Cloud Scheduled Tasks.
## Recent
- [2026-04-07] Built Obsidian vault with SOUL/MEMORY/DREAMS
- [2026-04-06] Shipped new feature for Project Alpha

## Decisions
- Hybrid design: static mirror + Karpathy pattern + Dreaming

## Patterns
- Fridays are meeting-heavy (3 weeks in a row)
- Email replies concentrate in the afternoon

## CC Memory Summary (35 files)
- feedback/21: "Never send emails", "Always git commit after GAS edits"
- reference/7: API locations, tool configs
- project/4: Active project statuses
- user/1: User profile and preferences
DREAMS.md — Reflection
Updated automatically by Dreaming (morning + evening + weekly). Tracks patterns that emerge over time.
## Current Insights
- Meeting density peaks on Mondays (10+ meetings, 3 consecutive weeks)

## Emerging Patterns
| Pattern | Count | Trend |
|---------|-------|-------|
| Tool → Skill → Automation cycle | 10+ | Consistent |
| Email/Slack send caution | 5+ | Critical boundary |

## Growth Trajectory
- Q1: Built 26 skills, automated 32 cron jobs

## Open Questions
- Should CC Memory duplicates be consolidated?
Clips — Knowledge Clipping
Clips automatically captures tweets and articles into your vault. Like Karpathy's compounding knowledge pattern, everything you read accumulates and becomes searchable in Obsidian.
Three Ways to Clip



Method
Trigger
Best for




/clip skill
/clip <URL> in Claude Code
Working at your desk, high-quality summaries


Slack DM
Post URL in Slack DM to your agent
On the go (phone), instant capture


X Bookmark Sync
Automatic every 4 hours
Passive — just bookmark on X, it syncs



1. /clip — Manual Clip in Claude Code
/clip https://x.com/karpathy/status/1234567890
/clip https://example.com/great-article
/clip https://url1.com https://url2.com          # multiple URLs

Detects X tweet vs article automatically. Fetches content, generates summary + tags in Japanese, saves to clips/, updates daily note, and pushes to git.
2. Slack DM — Clip from Your Phone
Just send a URL to your agent's Slack DM:
https://example.com/interesting-article

The agent detects the URL, scrapes the content, generates a summary, saves to clips/, and replies in a thread:
📎 Clipped!
📄 How LLMs Will Change Everything
🏷️ #ai #llm #future
📁 vault/clips/articles/2026-04-08_llm-change-everything.md

Setup: Requires an always-on agent (like OpenClaw) with Slack Socket Mode. Add the URL detection behavior to your agent's auto-actions. See Slack Clip Setup below.
3. X Bookmark Auto-Sync
Bookmark tweets on X as you normally would. A cron job syncs them to your vault automatically.
Default schedule: Every 4 hours (8:00, 12:00, 16:00, 20:00)
Requirements: xurl CLI with OAuth2 authentication.
# Test manually
xurl bookmarks -n 5 --auth oauth2
Clip File Format
---
date: 2026-04-08
type: clip
source: x | article
url: https://...
author: "@username"
tags: [ai, claude-code, agent]
via: slack | cli | cron          # how it was clipped
---

## Summary
(3-5 line summary in your language)

## Key Points
- Point 1
- Point 2

## Notes
> Important quotes

## Related
[[insights/...]] | [[clips/...]]
Daily Note Integration
Each clip is automatically linked in the day's daily note:
## Clips
- [[clips/x/2026-04-08_sam-altman-social-contract]] — Sam Altman's social contract
- [[clips/articles/2026-04-08_karpathy-llm-wiki]] — Karpathy LLM Wiki pattern
Dataview Queries
Browse clips by tag in Obsidian:
TABLE rows.date, rows.source, rows.author
FROM "clips"
WHERE type = "clip"
FLATTEN tags as tag
GROUP BY tag
SORT rows.date DESC

Slack Clip Setup
To enable Slack DM → clip, add this auto-action to your agent:

Create skill files in your agent's workspace:

workspace/skills/slack-clip/
├── SKILL.md          ← Skill overview
├── BEHAVIOR.md       ← Detection rules + processing flow
└── processed-clips.json  ← Deduplication tracking


Add auto-action to your agent's config (e.g., AGENTS.md):

### URL Post → Vault Clip
Automatically saves to vault/clips/ when a DM contains a URL.

Detection:
- Message text contains https:// (forwarded messages excluded)
- Slack internal URLs and direct image links excluded

Processing:
1. Detect URL type (X tweet vs article)
2. X tweet → xurl read / article → firecrawl scrape
3. Generate summary + tags → save to vault/clips/
4. git push + thread reply confirmation

Ensure tools are available to the agent:

xurl (X API CLI) with OAuth2 auth
firecrawl (web scraping CLI)
Git access to your vault repo



X Bookmark Cron Setup
Add a cron job to your agent scheduler:
{
  "name": "clip-x-bookmarks",
  "schedule": "0 8-23/4 * * *",
  "message": "Fetch X bookmarks with `xurl bookmarks -n 20 --auth oauth2`, check for duplicates in vault/clips/x/, summarize new ones, save to vault/clips/x/, update _index.md, git push."
}
Architecture
┌─ Layer 1: Cloud Scheduled Tasks (no PC needed) ────────────┐
│                                                              │
│  07:00  vault-daily-morning                                  │
│  ├── Read SOUL.md (understand user context)                  │
│  ├── Read MEMORY.md (recent decisions & patterns)            │
│  ├── Google Calendar → today's schedule                      │
│  ├── Slack → overnight highlights                            │
│  ├── Gmail → important unread emails                         │
│  ├── Morning Dreaming (yesterday's review → today's focus)   │
│  ├── Update MEMORY.md Recent section                         │
│  └── git push                                                │
│                                                              │
│  18:30  vault-daily-evening                                  │
│  ├── Read SOUL.md + MEMORY.md + DREAMS.md                    │
│  ├── Evening Dreaming (today + 7-day pattern detection)      │
│  ├── Update MEMORY.md + DREAMS.md                            │
│  ├── Sunday: weekly Dreaming + Lint + Slack notification      │
│  └── git push                                                │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │ push
                       ▼
┌─ GitHub (private repo) ──────────────────────────────────────┐
│  All vault files                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │ pull (hourly via launchd)
                       ▼
┌─ Layer 2: Local Automation ──────────────────────────────────┐
│                                                               │
│  Claude Code Hooks (async: true)                              │
│  ├── PostToolUse → log file changes                           │
│  └── Stop → append session end to daily note + MEMORY.md      │
│                                                               │
│  External Agent Cron (when PC is on)                          │
│  ├── Additional data: Salesforce, Stripe, HERP, YouTube       │
│  └── Skipped when PC is off (Layer 1 is self-sufficient)      │
│                                                               │
└──────────────────────┬───────────────────────────────────────┘
                       │ iCloud sync
                       ▼
              Obsidian (Mac + iPhone)

Vault Structure
~/vault/
├── SOUL.md                ← Identity, values, boundaries
├── MEMORY.md              ← Experience digest (CC Memory mirror)
├── DREAMS.md              ← Dreaming accumulation (auto-updated)
├── CLAUDE.md              ← Schema (LLM rules for this vault)
│
├── daily/                 ← Daily notes (auto-generated morning & evening)
│   └── 2026-04-07.md         Schedule / Gmail / Slack / AI Analysis /
│                              Morning Reflection / Evening Reflection /
│                              Claude Code Session / Thoughts
│
├── system/                ← Claude Code system mirror (SYNCED)
│   ├── claude-md-tree.md     All CLAUDE.md files as a tree
│   ├── global-rules.md       Rules & boundaries summary
│   ├── api-inventory.md      API list (no keys)
│   ├── tech-stack.md         Technology stack
│   └── cron-jobs.md          Running cron jobs
│
├── skills/                ← All skills with details (SYNCED)
├── memory/                ← CC Memory individual file mirror (SYNCED)
│   ├── feedback/             Behavioral guidelines
│   ├── reference/            External system pointers
│   ├── project/              Project statuses
│   └── user/                 User profile
│
├── clips/                 ← Clipped tweets & articles (auto + manual)
│   ├── x/                    X bookmarks (auto-synced every 4 hours)
│   ├── articles/             Web articles (via /clip or Slack)
│   ├── _index.md             Clip index (auto-updated)
│   └── tags.md               Tag-based classification (Dataview)
│
├── clients/               ← Client knowledge (Karpathy pattern)
├── meetings/              ← Meeting summaries (auto from /auto-mins)
├── decisions/             ← Decision log
├── insights/              ← Learnings + weekly Dreaming
├── templates/             ← daily-note, meeting, decision
└── scripts/               ← Hook scripts + sync scripts

Hybrid Design: Three Personalities
vault/
├── system/, skills/, memory/
│   → Static mirror (dashboard)
│   → Auto-synced from Claude Code, read-only
│   → <!-- SYNCED: DO NOT EDIT --> header
│
├── daily/
│   → Auto log + handwritten diary
│   → Calendar + Slack + Gmail + AI Analysis + Dreaming
│   → Runs even with PC closed (Cloud Scheduled Tasks)
│
└── meetings/, clients/, insights/
    → Karpathy pattern (compounding knowledge)
    → Each meeting processed → client page auto-enriched
    → No need to re-read 12 meeting transcripts

Setup
Prerequisites

Claude Code (Pro or Max)
Obsidian (free)
GitHub account
(Optional) Slack / Google Calendar / Gmail Connectors

Step 1: Create Vault
mkdir -p ~/vault/{daily,system,skills,memory/{feedback,reference,project,user},clients,meetings,decisions,insights,templates,scripts}

# iCloud sync (for iPhone)
mv ~/vault ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/exbrain
ln -s ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/exbrain ~/vault
Step 2: Copy Templates
git clone https://github.com/YOUR_USERNAME/exbrain.git /tmp/exbrain
cp -r /tmp/exbrain/vault-template/* ~/vault/
Step 3: Configure Hooks
Add to ~/.claude/settings.json:
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "bash ~/vault/scripts/on-file-change.sh",
        "async": true
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "bash ~/vault/scripts/on-session-end.sh",
        "async": true
      }]
    }]
  }
}
Step 4: Initial Sync
In Claude Code:
Please read all my skills from ~/.claude/skills/, all memory files from
~/.claude/projects/*/memory/, and sync them to ~/vault/. Create SOUL.md
with my identity and MEMORY.md with a digest of all memories.

Step 5: GitHub Backup
cd ~/vault
git init && git add -A && git commit -m "Initial vault"
gh repo create my-vault --private --source=. --push
Step 6: Cloud Scheduled Tasks (PC-free automation)
At claude.ai/code/scheduled:

vault-daily-morning (07:00): Read SOUL.md → Calendar + Slack + Gmail → daily note + Morning Dreaming
vault-daily-evening (18:30): Read SOUL.md + MEMORY.md + DREAMS.md → Evening Dreaming + pattern detection

Daily Note Example
---
date: 2026-04-07
weekday: Monday
type: daily
score: 74
---

## Schedule
| Time | Event | Note |
|------|-------|------|
| 09:00 | Management meeting | |
| 10:00 | Sales standup | |
| 14:00 | Company standup | |

## Gmail
| From | Subject | Action |
|------|---------|--------|
| [Contact] | Project meeting request | Reply needed |

## Slack Highlights
- **#general**: Organization restructuring discussion
- **#sales**: New lead from inbound campaign
- **#daily-report**: Project Beta milestone reached

## Morning Reflection
- Yesterday's decision: Revised product roadmap
- Today's focus: Follow up on pending proposals

## Evening Reflection
- Highlight: Project Beta milestone reached
- Pattern: Mondays consistently have 10+ meetings (3 weeks)
- Unresolved: Partner meeting follow-up

## Thoughts
<!-- Write your own reflection here -->
Scripts Included



Script
Purpose




on-session-end.sh
Stop hook: appends session summary to daily note + MEMORY.md


on-file-change.sh
PostToolUse hook: logs CLAUDE.md/memory/skill changes


weekly-sync.sh
Weekly lint: broken links, orphan pages, stale content


git-pull-sync.sh
Hourly git pull with stash handling


sync-agent-to-vault.sh
Enriches daily notes from external agent JSON data


sync-x-bookmarks.sh
Auto-fetches X bookmarks + clips (every 4 hours)



All scripts are macOS-compatible (no GNU extensions), reviewed for security (no shell injection, PID-based locking instead of flock).
References

Karpathy's LLM Wiki — The original pattern
Claude Code Hooks — async hook documentation
Cloud Scheduled Tasks — PC-free automation
QMD — Markdown semantic search (for 100+ pages)

License
MIT

---

## 28. [Claude Codeで安全にバイブコーディングするためのセキュリティガイド【個人・チーム開発対応 / コピペで社内展開OK】 #AI - Qiita](https://qiita.com/kotaro_ai_lab/items/af25eb6608ff58893c74)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/9
- **AI要約**:
  AIエージェントによるコード生成時のシークレット漏洩や、存在しないパッケージの誤導入リスクを詳説
  CLAUDE.mdへの機密情報混入防止や、AIが生成したコードに対する重点的なレビュー項目を網羅
  ローカルに.envを置かない設計や、そのまま社内マニュアルに転用可能な具体的チェックリストを提示
- **今読む理由**: AI駆動開発特有の「スロップスクワッティング」等の新型脆弱性への対策や、Claude Code導入時に必須となるCLAUDE.mdの安全な運用ルールが具体的に示されているため。
- **タグ**: #AI駆動開発, #セキュリティガイドライン

### 本文
株式会社Good Labでエンジニアをしている コータロー です。
日々、Java・SQL・Gitなどの技術情報や、新人エンジニア向けの学習ノウハウ、
AI活用についての情報を発信しています。
Good Labについて気になった方は、コーポレートサイトもぜひご覧ください。
▶コーポレートサイト

※本記事はそのまま社内マニュアルとして転用しやすいよう、本文は「である調」で統一しています。


はじめに
Claude CodeやCursorなどのAIエージェントを使い、自然言語の指示だけでアプリを組み上げる「バイブコーディング」が急速に普及している。プロトタイプの作成速度は劇的に向上したが、その一方でセキュリティリスクも加速している。AIが自律的にファイルを読み書きし、外部パッケージを導入し、コマンドを実行する以上、従来の手動コーディングとは異なるリスクへの備えが必要である。
特にバイブコーディングでは「動けばOK」の精神でレビューが省略されがちであり、APIキーの漏洩やサプライチェーン攻撃といった脅威が見過ごされやすい。GitHubにAWSキーをpushした結果、ボットが数分以内にそれを検出し、不正利用によって数十万円の請求が発生した報告もある。AIが関わるからこそ、人間が意識的にセキュリティの防壁を構築しなければならない。
この記事は読み物としてセキュリティの勘所を学ぶだけでなく、チェックリスト部分を切り取ってそのまま社内マニュアルとして運用できるように設計している。NotionやGitHubにそのまま貼り付けて、プロジェクトごとにカスタマイズしてご自由にご活用いただきたい。

用語定義
本記事では以下の用語を統一して使用する。


シークレット：APIキー、トークン、パスワード、秘密鍵など、漏洩時に不正利用される可能性のある値の総称

バイブコーディング：AIエージェントに自然言語で指示し、コードの大部分をAIに生成させる開発スタイル


個人開発編：セキュリティチェックリスト

⚠️ 1. シークレットのハードコード
バイブコーディングではプロンプトにAPIキーを含めて指示しがちである。AIはその値をそのままソースコードに埋め込むため、Gitにpushした瞬間に全世界に公開されるリスクがある。手動コーディングであれば.envから読む実装を自分で書くが、バイブコーディングではプロンプト自体が汚染源になる。「このAPIキーを使って実装して」と書いた瞬間、AIはそれをコードにベタ書きする。
被害例：GitHubにAWSのアクセスキーをpushした場合、自動スキャンボットが数分以内に検出し、暗号通貨マイニングなどに悪用されて数十万円の請求が発生した事例が複数報告されている。
❌ 悪い例：
let apiKey = "sk-ant-api03-xxxxxxxxxxxxxxxx"
let client = APIClient(key: apiKey)

✅ 良い例（Bundle.main.infoDictionary経由で取得する例）：
import Foundation

guard let apiKey = Bundle.main.infoDictionary?["API_KEY"] as? String, !apiKey.isEmpty else {
    // 本番ビルドではビルド設定（xcconfig等）から注入する
    // デバッグ時はスキームの環境変数で設定する
    preconditionFailure("API_KEY is not configured in build settings")
}
let client = APIClient(key: apiKey)

📋 チェックリスト：


ソースコード内にAPIキー・トークンが直書きされていないか

.envファイルが.gitignoreに含まれているか

.env.example（値なしテンプレート）をリポジトリに用意しているか

プロンプトにシークレットの実値を含めていないか（環境変数名で指示しているか）


⚠️ 2. CLAUDE.mdへのシークレット混入
CLAUDE.mdはGitで管理されるファイルであり、プロジェクトのルートに配置してAIへの指示を記述する。ここにDBパスワードや内部APIのエンドポイントを書くと、リポジトリ経由で第三者に漏洩する。CLAUDE.mdは指示ファイルであり、シークレットの保管場所ではない。
バイブコーディングでは「AIに正確な情報を伝えたい」という動機から、接続情報をCLAUDE.mdに直書きしてしまうケースが特に多い。手動コーディングなら設定ファイルに書く内容を、バイブコーディングではAIへの指示書に書いてしまうという構造的な罠がある。
❌ 悪い例：
<!-- CLAUDE.md に以下を記載 -->
DBパスワードは「prod_Pass!789」を使用すること
本番APIは https://internal-api.company.com/v2

✅ 良い例：
<!-- CLAUDE.md に以下を記載 -->
DB接続情報は環境変数 DATABASE_URL から取得すること
API エンドポイントは .env の API_BASE_URL を参照すること
シークレットをソースコードにハードコードしてはならない

📋 チェックリスト：


CLAUDE.mdにパスワード・トークン・内部URLが含まれていないか

シークレットは環境変数名のみ記載し、実値を書いていないか

CLAUDE.mdをコミットする前にdiffを目視確認しているか


⚠️ 3. 依存パッケージのサプライチェーン攻撃
AIは指示に応じて外部パッケージを自動追加する。ここには2つの脅威がある。
1つ目は typosquatting（タイポスクワッティング）である。正規パッケージに酷似した名前の悪意あるパッケージを登録し、タイプミスを狙う攻撃である。
2つ目は slopsquatting（スロップスクワッティング）である。これはバイブコーディング特有のリスクで、AIが実在しないパッケージ名を幻覚（ハルシネーション）し、攻撃者がその名前で悪意あるパッケージを事前に登録しておく攻撃である。2025年のUSENIX Securityの研究では、16モデル・576,000コードサンプルの調査で、AIが幻覚したパッケージ名の58%以上が複数回の実行で再出現し、43%が同一プロンプトの10回の試行で一貫して出現したと報告されている。この予測可能性が攻撃を実行可能にしている。
手動コーディングなら開発者がパッケージを自分で検索して選ぶが、バイブコーディングではAIが提案したパッケージ名をそのまま受け入れてしまいやすい。AIの提案を無条件に信頼せず、パッケージ追加前に必ずレジストリで実在と正当性を確認すること。
❌ 悪い例：
# AIが提案したパッケージをそのまま追加
swift package add SwiftCrytpoUtils
# → 正規の「CryptoKit」ではなく、typoした偽パッケージ
# → またはAIが幻覚した実在しないパッケージ名

✅ 良い例：
# パッケージ追加前に公式リポジトリとスター数を確認
# 公式: https://github.com/apple/swift-crypto
swift package add swift-crypto --from 3.0.0

📋 チェックリスト：


AIが追加したパッケージの名前とリポジトリURLを確認したか

パッケージがレジストリに実在し、正規のものであることを確認したか（AIが幻覚した偽パッケージへの対策）

パッケージのスター数・最終更新日・メンテナンス状況を確認したか

バージョンを固定（ピン留め）しているか


⚠️ 4. AIコードのレビューなしリリース
バイブコーディングの速さに慣れると、AIが生成したコードをレビューせずにリリースしがちである。SQL組み立てやユーザー入力の処理に脆弱性が潜む可能性がある。
AIが大量のコードを短時間で生成するため、diffが膨大になりレビューが追いつかないという構造的な問題がある。手動コーディングなら自分が書いたコードなので内容を把握しているが、バイブコーディングでは自分が書いていないコードが大量にコミットされる。だからこそ、セキュリティ関連箇所に絞った重点レビューが不可欠である。
❌ 悪い例（SQLite.swift使用時）：
import SQLite

// AIが生成したコードをそのままリリース
// → SQLインジェクションの脆弱性
let query = "SELECT * FROM users WHERE name = '\(userInput)'"

✅ 良い例（SQLite.swift使用時）：
import SQLite

// パラメータバインディングでSQLインジェクションを防止
let users = Table("users")
let name = SQLite.Expression<String>("name")
let result = try db.prepare(users.filter(name == userInput))

📋 チェックリスト：


ユーザー入力を直接クエリやコマンドに埋め込んでいないか

セキュリティ関連箇所（認証・暗号化・入力検証・権限設定）を中心にdiffを確認してからコミットしているか

認証・暗号化・入力検証の変更に対し、意図した動作であることを確認したか


上級編：そもそもローカルにシークレットを置かない
ここまでの対策は「.envをGitに載せない」「Claude Codeに読ませない」といった守りのアプローチである。しかし根本的な問題は、ローカルPCに本物のシークレットが存在していること自体にある。
Claude Codeは .env を読める。パーミッション設定やHooksで「読ませない」制御はできるが、それは鍵のかかったドアの向こうに金庫があるのと同じである。設定ミス、Claude Codeのアップデートによる挙動変化、あるいは悪意あるnpmパッケージが fs.readFile('.env') を実行するなど、突破されるシナリオは常に存在する。
根本解決は、ローカルにシークレットを置かないことである。金庫そのものが存在しなければ、ドアの鍵が壊れても何も盗まれない。

考え方：ローカル＝モック、クラウド＝実通信
【ローカル（開発者のPC）】
├── シークレット → 存在しない
├── 外部API通信 → モック（固定データを返す）
└── やること → UI開発、ロジックのテスト

【クラウド（AWS ECS / Cloud Run 等）】
├── シークレット → Secrets Managerから自動取得
├── 外部API通信 → 本物のAPIと通信
└── やること → 結合テスト、本番運用

ローカルではAPIの「フリをする」だけである。本物のシークレットはクラウドにしか存在せず、開発者のPCには一度も保存されない。

なぜ .env すら危険なのか
.gitignore に .env を入れていても、以下のリスクは残る。



リスク
具体例




悪意あるパッケージが読む
npm/pipの偽パッケージが .env のパスを直接読み取って外部に送信する事例がある


PC紛失・盗難
ディスクにアクセスすれば .env の中身は平文で読める


Claude Codeが読む
AIがデバッグ目的で .env を参照し、その内容をログやコードに出力してしまう


誤操作

.gitignore の記述ミスや git add -A で .env ごとコミットしてしまう




実装方法：プロトコル（インターフェース）でモックと本番を切り替える
外部APIとの通信層をプロトコルで抽象化し、ローカルではモック実装、本番では実API実装を使う設計にする。
import Foundation

// 通信層のプロトコル（インターフェース）
protocol WeatherService {
    func fetchForecast(city: String) async throws -> Forecast
}

struct Forecast {
    let temperature: Double
    let condition: String
}

モック実装（ローカル開発用）：シークレット不要
// ローカル開発ではこちらを使う
// APIキーは一切不要。固定データを返すだけ
final class MockWeatherService: WeatherService {
    func fetchForecast(city: String) async throws -> Forecast {
        // ローカルのJSONやハードコードした固定値を返す
        return Forecast(temperature: 25.0, condition: "晴れ")
    }
}

本番実装（クラウド環境用）：Secrets Managerからキーを取得
import Foundation

// 本番・ステージング環境ではこちらを使う
// シークレットは環境変数から取得（ECSが起動時にSecrets Managerから注入）
final class RealWeatherService: WeatherService {
    func fetchForecast(city: String) async throws -> Forecast {
        guard let apiKey = ProcessInfo.processInfo.environment["WEATHER_API_KEY"] else {
            throw ServiceError.missingAPIKey
        }
        let url = URL(string: "https://api.weather.com/v1/forecast?city=\(city)")!
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(Forecast.self, from: data)
    }
}

切り替え：ビルド設定や環境変数で判定
// 環境に応じて実装を切り替える
func createWeatherService() -> WeatherService {
    #if DEBUG
    return MockWeatherService()
    #else
    return RealWeatherService()
    #endif
}

この設計なら、ローカルの DEBUG ビルドでは MockWeatherService が使われるため、APIキーがPCに存在する必要がない。

クラウド側のシークレット管理：AWS Secrets Manager
本番環境ではシークレットをどこに保管するか。AWSの場合、Secrets Managerが標準的な選択肢である。



サービス
役割
コスト目安




Secrets Manager
シークレットを暗号化して保管。自動ローテーション対応
$0.40/シークレット/月


Parameter Store
設定値の一元管理。シークレットにも対応。Secrets Managerより安価
標準パラメータは無料


ECS
コンテナを実行するサービス。起動時にSecrets Managerからシークレットを環境変数に注入
コンテナ利用分



設定の流れ（AWS ECS + Secrets Manager）：
# 1. Secrets Managerにシークレットを登録（管理者が1回だけ実行）
aws secretsmanager create-secret \
  --name "myapp/weather-api-key" \
  --secret-string "sk-xxxxxxxxxxxxxxxx"

// 2. ECSタスク定義でSecrets Managerを参照
{
  "containerDefinitions": [
    {
      "name": "myapp",
      "secrets": [
        {
          "name": "WEATHER_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:123456789:secret:myapp/weather-api-key"
        }
      ]
    }
  ]
}

// 3. アプリ側のコードは環境変数から読むだけ（従来と同じ）
let apiKey = ProcessInfo.processInfo.environment["WEATHER_API_KEY"]

開発者はSecrets Managerの登録権限だけ持ち、シークレットの実値を自分のPCにダウンロードする必要がない。ECSが起動時に自動で取得し、コンテナの環境変数に注入する。

バイブコーディングとの相性
この設計がバイブコーディングと特に相性が良い理由は、プロンプトにシークレットを書く必要が完全になくなることである。
❌ 従来のプロンプト（シークレットを含む）：
天気予報機能を実装して。
APIキーは sk-xxxxxxxxxxxxxxxx を使って。

✅ モック方式のプロンプト（シークレットを含まない）：
天気予報機能を実装して。
WeatherServiceプロトコルに準拠し、ローカルではモック実装、
本番ではRealWeatherServiceに差し替える設計にして。
モックは固定データ（気温25度、晴れ）を返すようにして。

AIにシークレットの実値を渡さないので、AIが何をしても漏洩しない。コードにベタ書きされる心配も、プロンプト履歴から漏れる心配もない。これがバイブコーディングにおける最も根本的なセキュリティ対策である。

いつモック方式を採用すべきか



判断基準
モック方式を推奨

.env方式で十分




チーム規模
複数人開発
個人の趣味開発


扱うシークレット
課金API、決済、認証
公開APIのみ


環境
本番サービスがある
ローカルで完結


バイブコーディング
積極的に使用
部分的に使用



個人開発でも「課金が発生するAPIキー」や「ユーザーデータにアクセスできる認証キー」を扱う場合は、モック方式の導入を強く推奨する。
📋 チェックリスト：


外部APIとの通信層をプロトコル（インターフェース）で抽象化しているか

ローカル開発用のモック実装を用意しているか

本番のシークレットはSecrets Manager等のクラウドサービスで管理しているか

プロンプトにシークレットの実値を含めずに開発できる設計になっているか


チーム開発編：セキュリティチェックリスト

個人開発編の項目はチーム開発でもすべて適用される。チーム開発編はそれに加えて、組織的に対応すべき項目を記載している。チーム開発では個人開発編のチェックリストも併せて運用すること。


⚠️ 1. 最小権限の原則の崩壊
AIに「このエラーを直して」と指示すると、権限設定を緩和する方向で解決しようとする場合がある。IAMポリシーやファイル権限を過剰に開放すると、攻撃対象面が広がる。
バイブコーディングでは、AIが「とにかく動かす」ことを最優先にするため、権限を最大に開放する解決策を提示しやすい。手動コーディングなら権限エラーの原因を調べて最小限の変更で対応するが、AIは最も単純な（＝最も危険な）方法を選びがちである。
被害例：chmod 777にした設定ファイルから認証情報を抜き取られた事例がある。同一サーバー上の他ユーザーやプロセスから読み取り可能になるため、多層防御が崩壊する。
❌ 悪い例：
# AIが提案した「動く」修正
chmod 777 /var/app/config
# → 全ユーザーに読み書き実行を許可

✅ 良い例：
# 必要最小限の権限のみ付与
chmod 640 /var/app/config
chown appuser:appgroup /var/app/config

📋 チェックリスト：


AIが変更した権限設定（IAM・ファイル・DB）をレビューしたか

chmod 777や*ワイルドカード権限が含まれていないか

本番環境の権限変更にはダブルチェック体制があるか


⚠️ 2. CI/CDへのシークレット漏洩
AIにCI/CDの設定ファイルを書かせると、動作を優先してシークレットをYAMLに直書きしたり、デバッグ用にログに出力するステップを生成することがある。CI/CDのログは開発メンバー全員が閲覧できるため、漏洩の影響範囲が広い。
バイブコーディングでは「GitHub Actionsのワークフローを書いて」と指示するだけでCI/CD設定が生成されるため、シークレット管理の設計を飛ばしてしまいやすい。手動で書くならSecrets設定を調べるところから始めるが、AIは手っ取り早くベタ書きする傾向がある。
❌ 悪い例：
# GitHub Actions のワークフロー
env:
  API_KEY: sk-ant-api03-xxxxxxxxxxxxxxxx
  DB_PASSWORD: prod_password_123

✅ 良い例：
# GitHub Secrets を参照
env:
  API_KEY: ${{ secrets.API_KEY }}
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}

📋 チェックリスト：


CI/CD設定ファイルにシークレットが直書きされていないか

GitHub Secrets等のシークレット管理機能を使用しているか

ビルドログにシークレットが出力されない設定になっているか


⚠️ 3. プロンプト履歴・ログからの情報漏洩
Claude Codeのセッション履歴やプロンプトログには、コードベースの構造・ビジネスロジック・データベース設計といった機密性の高い情報が含まれる。共有端末やスクリーンキャストでこれらが第三者に見られるリスクがある。
セッション履歴は~/.claude/配下に保存されるためリポジトリには通常含まれないが、共有端末では定期的にセッションデータを削除すること。リポジトリ内で管理すべきでないファイルとしては.claude/settings.local.json（個人設定）がある。
❌ 悪い例：
# 個人設定ファイルを共有リポジトリにコミット
git add .claude/settings.local.json
git commit -m "Claude Codeの設定を共有"

✅ 良い例：
# .gitignore で個人設定を除外
echo ".claude/settings.local.json" >> .gitignore
# 共有するのはチーム共通の設定のみ
git add .claude/settings.json

📋 チェックリスト：


.claude/settings.local.jsonが.gitignoreに含まれているか

共有端末のセッションデータ（~/.claude/配下）を定期削除しているか

画面共有・録画時にプロンプト履歴が映り込まない運用があるか

退職者のセッションデータ削除手順が定められているか


⚠️ 4. レビュープロセスの形骸化
AIが大量のコードを短時間で生成するため、レビュアーが「AIが書いたなら大丈夫だろう」と流してしまう心理が働きやすい。特にバイブコーディングでは生成量が多く、差分が膨大になるため、レビューの質が低下しやすい。
手動コーディングのPRなら差分が数十行〜数百行で済むことが多いが、バイブコーディングでは一度の指示で数百〜数千行の差分が生まれることがある。これに対して「全行レビュー」は非現実的であり、セキュリティ関連箇所への重点レビューとツールによる自動チェックの併用が不可欠である。
❌ 悪い例：
<!-- PRの説明 -->
Claude Codeで生成。テスト通過済み。LGTM
<!-- → セキュリティ観点のレビューがゼロ -->

✅ 良い例：
<!-- PRテンプレートにセキュリティチェック項目を必須化 -->
## セキュリティレビュー
- [ ] 認証・認可の変更はないか
- [ ] ユーザー入力の検証は適切か
- [ ] 新規パッケージのセキュリティ確認済みか
- [ ] AI生成コードであることを明示しているか

📋 チェックリスト：


PRテンプレートにセキュリティチェック項目が含まれているか

AI生成コードであることを明示するラベル運用があるか

認証・暗号化・入力検証の変更に対し、レビューコメントを残したか

セキュリティ関連の変更は専任レビュアーを必須にしているか


Claude Codeのセキュリティ機能を活用する
Claude Code自体に備わっているセキュリティ機能を適切に設定することで、バイブコーディングの安全性を大幅に高められる。

サンドボックス
サンドボックスはBashコマンドのファイルシステムアクセスとネットワークアクセスをOS レベルで制限する機能である。macOSではSeatbelt、LinuxではBubblewrapを利用して強制される。
Claude Code上で/sandboxコマンドを実行すると有効化できる。
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "allowWrite": ["~/.kube", "/tmp/build"]
    }
  }
}



ファイルシステム隔離：デフォルトではカレントディレクトリとそのサブディレクトリにのみ書き込みが許可される。sandbox.filesystem.allowWriteで追加パスを指定可能

ネットワーク隔離：許可されたドメインのみにアクセスが制限される。未許可ドメインへのアクセスはブロックされ、通知が表示される

プロンプトインジェクション対策：サンドボックス内のプロセスはOS レベルで制限されるため、仮にAIの判断が操作されても、システムファイルの改ざんやデータの外部送信を防止できる


パーミッションモード
Claude Codeには複数のパーミッションモードがあり、プロジェクトの性質に応じて使い分ける。



モード
説明
推奨場面




default
ツールの初回使用時に許可を求める
通常の開発


plan
分析のみ。ファイル変更やコマンド実行は不可
コードレビュー・調査


acceptEdits
ファイル編集を自動許可。コマンドは許可を求める
信頼できるプロジェクト


dontAsk
事前許可されたツールのみ自動実行。それ以外は拒否
CI/CD環境・厳格な制限



チーム開発では、管理者設定（managed settings）を使い、全権限をスキップするモード（bypassPermissions）を無効化することを推奨する。
{
  "permissions": {
    "disableBypassPermissionsMode": "disable"
  }
}


Hooks（コマンド実行前の自動チェック）
Hooksは、Claude Codeの操作の前後に自動実行されるカスタムスクリプトである。コマンド実行前に動作する「PreToolUse」フックを使えば、危険なコマンドのブロックやシークレットの検出を自動化できる。
シークレット検出フックの例（.claude/hooks/detect-secrets.sh）：
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# コマンド内のシークレットパターンを検出
if echo "$COMMAND" | grep -qE '(password|token|api.?key|secret).*='; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Potential secret detected in command"
    }
  }'
  exit 0
fi
exit 0

設定例（.claude/settings.json）：
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/detect-secrets.sh"
          }
        ]
      }
    ]
  }
}

このフックにより、Bashコマンド実行前にシークレットのパターンが検出された場合、自動的にブロックされる。

推奨ツール
チェックリストの「毎コミット」の負荷を軽減するため、以下の自動化ツールの導入を推奨する。人間のレビューは必須だが、機械的に検出可能な問題はツールに任せるべきである。

シークレットスキャン（pre-commitフック）



ツール
概要




gitleaks
Git履歴を含むシークレットスキャン。pre-commitフックとして導入可能


trufflehog
高精度なシークレット検出。600以上のパターンに対応




静的解析（CI連携）



ツール
概要




Semgrep
軽量な静的解析。SQLインジェクション等のパターンを検出


CodeQL
GitHubネイティブの静的解析。PRに自動コメント




依存関係の脆弱性チェック



ツール
概要




Dependabot
GitHubネイティブ。脆弱な依存関係を検出しPRを自動作成


osv-scanner
Googleが開発。OSVデータベースと照合して脆弱性を検出



gitleaksをpre-commitフックとして導入するだけでも、シークレットの誤コミットを大幅に削減できる。

シークレット漏洩時の緊急対応
万が一シークレットがリポジトリにコミットされた場合、以下のフローで対応する。git履歴から削除しても、pushした時点でシークレットは漏洩したとみなすこと。

対応フロー


即時無効化：漏洩したシークレット（APIキー・トークン・パスワード）をプロバイダの管理画面から即座に無効化・ローテーションする

影響範囲の調査：漏洩したシークレットで何が実行可能だったかを特定する。ログを確認し、不正利用の痕跡がないか調査する

新しいシークレットの発行：新しいキーを発行し、環境変数やシークレット管理サービスに安全に設定する

原因の特定と再発防止：なぜ漏洩が起きたかを特定し、pre-commitフック（gitleaks等）の導入やCLAUDE.mdへのルール追記など、再発防止策を実施する

報告：チーム開発の場合、セキュリティ担当者・テックリードに報告する。影響範囲に応じて顧客やユーザーへの通知が必要な場合もある


重要な注意点


git rebaseやgit filter-branchで履歴からシークレットを削除しても、GitHub等ではキャッシュが残る可能性がある。シークレットの削除ではなく、無効化が最優先である
GitHub Secret Scanningが有効な場合、パートナーパターンに該当するシークレットは自動的にプロバイダに通知される


まとめ：全項目チェックリスト（コピペ用）
以下のチェックリストをそのままプロジェクトに貼り付けて使用できる。

個人開発チェックリスト
シークレット管理


ソースコード内にAPIキー・トークンが直書きされていないか（担当：自分 / 頻度：毎コミット ※gitleaks等で自動化推奨）

.envファイルが.gitignoreに含まれているか（担当：自分 / 頻度：プロジェクト開始時）

.env.example（値なしテンプレート）をリポジトリに用意しているか（担当：自分 / 頻度：プロジェクト開始時）

プロンプトにシークレットの実値を含めていないか（担当：自分 / 頻度：毎プロンプト）

CLAUDE.md


CLAUDE.mdにパスワード・内部URL等のシークレットが含まれていないか（担当：自分 / 頻度：毎コミット）

シークレットは環境変数名のみ記載し実値を書いていないか（担当：自分 / 頻度：毎コミット）

サプライチェーン


AIが追加したパッケージの名前・リポジトリURL・更新日を確認したか（担当：自分 / 頻度：パッケージ追加時）

パッケージがレジストリに実在し正規のものか確認したか（担当：自分 / 頻度：パッケージ追加時）

パッケージバージョンをピン留めしているか（担当：自分 / 頻度：パッケージ追加時）

コードレビュー


セキュリティ関連箇所（認証・暗号化・入力検証・権限設定）を中心にdiffを確認してからコミットしているか（担当：自分 / 頻度：毎コミット）

ユーザー入力を直接クエリやコマンドに埋め込んでいないか（担当：自分 / 頻度：毎コミット）

上級：ローカルにシークレットを置かない設計


外部APIとの通信層をプロトコルで抽象化しているか（担当：自分 / 頻度：設計時）

ローカル開発用のモック実装を用意しているか（担当：自分 / 頻度：設計時）

本番のシークレットはSecrets Manager等で管理しているか（担当：自分 / 頻度：プロジェクト開始時）

プロンプトにシークレットの実値を含めずに開発できる設計になっているか（担当：自分 / 頻度：毎プロンプト）

Claude Code設定


サンドボックスを有効化しているか（担当：自分 / 頻度：プロジェクト開始時）

パーミッションモードをプロジェクトの性質に合わせて設定しているか（担当：自分 / 頻度：プロジェクト開始時）


チーム開発チェックリスト

個人開発チェックリストの全項目に加えて、以下を確認すること。

権限管理


AIが変更した権限設定（IAM・ファイル・DB）をレビューしたか（担当：レビュアー / 頻度：PR作成時）

chmod 777やワイルドカード権限が含まれていないか（担当：レビュアー / 頻度：PR作成時）

本番環境の権限変更にはダブルチェック体制があるか（担当：テックリード / 頻度：PR作成時）

CI/CD


CI/CD設定ファイルにシークレットが直書きされていないか（担当：レビュアー / 頻度：PR作成時）

GitHub Secrets等のシークレット管理機能を使用しているか（担当：インフラ担当 / 頻度：CI/CD変更時）

ビルドログにシークレットが出力されない設定になっているか（担当：インフラ担当 / 頻度：CI/CD変更時）

情報管理


.claude/settings.local.jsonが.gitignoreに含まれているか（担当：テックリード / 頻度：プロジェクト開始時）

共有端末のセッションデータを定期削除しているか（担当：テックリード / 頻度：四半期）

画面共有・録画時にプロンプト履歴が映り込まない運用があるか（担当：テックリード / 頻度：四半期）

退職者のセッションデータ削除手順が定められているか（担当：テックリード / 頻度：発生時）

レビュープロセス


PRテンプレートにセキュリティチェック項目が含まれているか（担当：テックリード / 頻度：プロジェクト開始時）

AI生成コードであることを明示するラベル運用があるか（担当：テックリード / 頻度：プロジェクト開始時）

認証・暗号化・入力検証の変更に対し、レビューコメントを残したか（担当：レビュアー / 頻度：PR作成時）

セキュリティ関連の変更は専任レビュアーを必須にしているか（担当：テックリード / 頻度：PR作成時）

Claude Code設定（チーム共通）


Claude Codeの権限バイパス（bypassPermissions）を管理者設定で禁止しているか（担当：テックリード / 頻度：プロジェクト開始時）

Claude CodeのHooks機能でシークレットの自動検出を設定しているか（担当：テックリード / 頻度：プロジェクト開始時）

gitleaks等のシークレットスキャンをpre-commitフックに導入しているか（担当：テックリード / 頻度：プロジェクト開始時）


おわりに
バイブコーディングは開発速度を劇的に向上させる強力な手法である。しかし、AIが生成するコードは人間が書くコードと同様に、あるいはそれ以上にセキュリティレビューが必要である。AIが大量のコードを高速に生成するからこそ、人間によるセキュリティの防壁が重要になる。
このチェックリストを社内に展開する際は「バイブコーディングを禁止するためのルールではなく、安全に活用するためのガイドラインである」と一言添えると、チームの抵抗感なく導入できるはずである。たとえば、以下のようなメッセージと共にチームに共有するとよいだろう。

「Claude Code等のAIエージェントを使ったバイブコーディングは推奨しています。ただし、AIが生成するコードにもセキュリティリスクがある以上、チェックリストに沿った確認を習慣化しましょう。このガイドラインはAI活用を制限するものではなく、安全に最大限活用するためのものです。」

セキュリティは一度設定して終わりではなく、継続的に改善していくものである。まずはgitleaksの導入とサンドボックスの有効化から始めてみてほしい。

参考

Claude Code Security - Anthropic
Claude Code Settings - Anthropic
Claude Code Sandboxing - Anthropic
Claude Code Permissions - Anthropic
Claude Code Hooks - Anthropic
Best Practices for Claude Code - Anthropic
OWASP Top 10 for LLM Applications 2025
gitleaks - GitHub
Semgrep
AWS Secrets Manager - AWS
ECS でのシークレット管理 - AWS


@kotaro_ai_lab
AI活用や開発効率化について発信しています。フォローお気軽にどうぞ！

---

## 29. [Claude Codeで「1プロンプトサイト複製」が話題だけど、本当にヤバいのは“UI実装の重心”がズレ始めたこと #個人開発 - Qiita](https://qiita.com/taketsuyo/items/237af0096e00ab1638c0)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/10
- **AI要約**:
  Claude CodeのChrome連携を活用し、ブラウザの計算値を基にサイトをNext.jsへ再構成する手法を解説
  デザイントークン抽出やVisual Diffを含む、再現性の高いUI実装自動化パイプラインの構築に言及
  フロントエンド開発が「コードを書く作業」から、AIによる「観測と編集」へ移行する設計思想の変化を提示
- **今読む理由**: 現在のプロジェクト（AI駆動開発・自動化）に直結するClaude CodeのSkills拡張やChrome連携の具体的活用例が含まれており、UI実装の自動化フローを構築する上で極めて有益なため。
- **タグ**: #ClaudeCode, #AI駆動開発, #フロントエンド自動化, #MCP

### 本文
正直、最初は「また盛った話かな」と思ったんです。
でも中身を追うと、これはただのバズワードじゃなくて、AIが“見た目を推測する”段階から、“ブラウザの事実を読んで再構成する”段階に入った話でした。 ## これ、何が起きているのか
話題の実体は、URLを渡して /clone-website を実行すると、AIが対象サイトを調べて、Next.jsベースのコードとして再構成するオープンソースのテンプレートです。推奨フローは claude --chrome でClaude Codeを起動し、そこからクローン用スキルを呼ぶ形。公開されているテンプレートは、Next.js 16、React 19、Tailwind CSS v4、shadcn/ui を前提にしています。
ここで大事なのは、「AIがスクショを見て似せる」わけじゃないことです。
このテンプレートは、スクリーンショット取得、デザイントークン抽出、hoverやresponsiveの確認、getComputedStyle() ベースの仕様書化、並列ビルド、最後のvisual diffまでをパイプラインとして組んでいます。つまり、見た目を“想像”して書くんじゃなくて、ブラウザが最終的に計算した値を土台にコードを起こすんです。 たとえるなら、料理の写真を見て味を当てるんじゃなくて、厨房に入ってレシピと調味料の分量を見ながら再現する感じです。
だから、フォントの太さとか余白の気持ち悪いズレが減る。ここが、今までの「AIでUI作れるよね」と、今回の話がちゃんと違うところだと思います。


なぜ今、ここまで現実味が出たのか
理由はシンプルで、 Code側の土台が揃ってきたからです。 Codeは skills（追加スキル）を SKILL.md で拡張できて、プラグインは skills / agents / hooks / MCP servers をまとめて配れるようになっています。さらに、Chrome連携でブラウザ操作やDOM確認、データ抽出までCLIからつなげられる。これが揃うと、「URLを渡す → 調査する → 仕様書を切る → 実装する」が1本の流れになるんですよね。

つまり本質は、「AIがHTMLを書けるようになった」ではなく、AIがブラウザを開発ツールとして使えるようになったことです。

半年前なら、ここまで話が刺さらなかった気がします。
当時なら「AIがそれっぽくLPを作る」で終わっていたはず。でも今は、ブラウザ連携・スキル・プラグインという部品が揃って、再現性のあるワークフローとして見え始めた。だから一気にリアルになったんだと思います。 ---

個人開発者にとって、本当のインパクトはどこか
ここ、けっこう誤解されやすいです。
インパクトは「他人のサイトを丸パクリできる」ことじゃない。自分の頭の中にある“この雰囲気が近い”を、雑な口頭説明ではなく、実物を起点に一気に土台化できることです。
たとえば、昔Webflowで作った自社LPをNext.jsに移したいとか、担当者がいなくなってソースがないけど今の見た目は維持したいとか、競合分析のためにレイアウトや動線を分解して学びたいとか。公開テンプレート側も、そういう用途を前面に出しています。 GitHub
しかもClaude CodeのChrome連携は、ログイン済みサイトの状態を共有しながらブラウザ操作できて、フォーム入力やデータ抽出もできます。逆に言うと、ログイン画面やCAPTCHAでは手動対応が必要で、まだベータです。あと、この機能は第三者経由の提供では使えず、直接のAnthropicプランが必要です。ここ、明日試して「あれ動かない」となる人が出やすいので、先に知っておくとかなり助かります。 > で、自分はどうすればいいのか。
まずは他人の有名サイトではなく、自分が権利を持つLPや過去案件で試すのがいちばん健全です。


ただし、ここを踏み外すと一気に危ない
このテンプレート自体も、フィッシングやなりすまし、他人のデザインやロゴやコピーを自分のものとして使うこと、利用規約に反する再現は意図していないと明記しています。ここはかなり重要です。 GitHub
だから、今後の差は「CSSを何秒で書けるか」じゃなくて、どこまでを参考にして、どこからを自分の価値に置き換えるかで決まるはずです。
個人的には、ここがこの話題のいちばん面白いところです。AIがUIを速く作るようになるほど、最後に残る仕事はセンスの話ではなく、編集判断の話になる。法務も、ブランドも、体験設計も、そこだけは雑に飛ばせない。


僕ならこう使う
僕なら、いきなり「完璧コピー」を狙いません。
まずは自分のプロダクトの既存ページを対象にして、どこまで忠実に土台化できるかを見る。その上で、生成されたコンポーネント構成、トークン設計、レスポンシブの切り方を流用して、新しいLPや管理画面に広げます。
しかもこのテンプレートはClaude Code以外にも、Copilot、Cursor、Gemini CLIなど複数エージェント対応を掲げています。つまり、勝負は「どのAIを使うか」一点ではなく、ブラウザ観測→仕様化→実装→差分確認の流れを、自分の好きなスタックで回せるかどうかになっていく。 GitHub
3年後に振り返ると、たぶん「AIがサイトを作れるようになった」話としては残らない気がします。
たぶん残るのは、「あの頃から、フロントエンドは“書く仕事”から“観測して編集する仕事”に少しずつ変わっていったよね」という記憶です。で、その変化はもう、思っているより始まっています。

---

## 30. [Claude Code Skills の作り方入門 — 実務で使えるカスタムコマンドを自作する #AI - Qiita](https://qiita.com/joinclass/items/19b96eff86619e2cdaeb)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/10
- **AI要約**:
  Claude Codeのカスタムコマンド「Skills」の定義方法とディレクトリ構造を具体的に解説
  引数の受け取りやBash操作を含む高度な自動化ワークフロー（テスト・修正等）の実装例を提示
  CLAUDE.mdの肥大化を防ぐための設計原則や名前空間による管理手法といったベストプラクティス
- **今読む理由**: AI駆動開発においてCLAUDE.mdが肥大化し精度が低下する問題を、Skillsへの機能分離という設計原則で解決できるため。即時コピー可能な設定ファイル形式が明記されている。
- **タグ**: #ClaudeCode, #AI駆動開発

### 本文
はじめに
Claude Code を日常的に使っていると、「毎回同じ指示を書くのが面倒」「チーム全員に同じワークフローを共有したい」と感じる場面が出てくる。
そこで活躍するのが Skills（スキル） だ。
Skills は Claude Code のカスタムコマンド機能で、/my-skill のようにスラッシュコマンドとして呼び出せる再利用可能なプロンプトテンプレートのこと。僕は現在、自社の業務自動化に Claude Code を使っており、17個の launchd ジョブと合わせて自動化率98%を達成している。その中核にあるのが Skills だ。
この記事では、Skills の基本から実践的な作り方までを解説する。

Skills とは何か
Skills は一言でいうと「Claude Code に登録できるカスタムスラッシュコマンド」だ。
通常の CLAUDE.md がプロジェクト全体のルールを定義するのに対し、Skills は特定のタスクに特化した指示セットを定義する。
# 通常の使い方
> コミットメッセージを日本語で書いて、conventional commits形式で…（毎回入力）

# Skills を使った場合
> /commit
（事前に定義した指示が自動で展開される）


Skills ファイルの基本構造
Skills は .claude/skills/ ディレクトリに Markdown ファイルとして配置する。
.claude/
└── skills/
    └── commit.md          # /commit で呼び出せる
    └── review-pr.md       # /review-pr で呼び出せる
    └── my-namespace/
        └── deploy.md      # /my-namespace:deploy で呼び出せる


最小構成
---
name: commit
description: コミットメッセージを生成する
user_invocable: true
---

# コミットメッセージ生成

変更内容を分析し、Conventional Commits 形式で日本語のコミットメッセージを生成してください。


フロントマターの各フィールド



フィールド
必須
説明




name
○
スキル名（スラッシュコマンドの名前）


description
○
1行の説明（Claude がスキル選択時に参照）


user_invocable
○

true にするとユーザーが /name で呼び出せる


args
-
引数の定義（後述）




実践：3つのスキルを作ってみる

1. シンプルなレビュースキル
まずは一番シンプルな例から。
---
name: review
description: コードレビューを実行する
user_invocable: true
---

# コードレビュー

変更されたファイルを確認し、以下の観点でレビューしてください：

1. バグの可能性
2. セキュリティリスク（OWASP Top 10）
3. パフォーマンスの問題
4. 命名規則の一貫性

問題がなければ「LGTM」とだけ返してください。

使い方：
> /review


2. 引数付きスキル
引数を受け取るスキルも作れる。
---
name: new-component
description: React コンポーネントを新規作成する
user_invocable: true
args:
  - name: component_name
    description: コンポーネント名（PascalCase）
    required: true
---

# コンポーネント作成

`$ARGUMENTS` という名前で新しい React コンポーネントを作成してください。

- `src/components/{component_name}/index.tsx` に配置
- Props の型定義を含める
- テストファイルも同時に作成

使い方：
> /new-component UserProfile

$ARGUMENTS にはユーザーが渡した引数がそのまま展開される。

3. 他のツールを呼び出すスキル
Skills の本体はプロンプトなので、Claude Code が使えるツール（Bash, Read, Write, Agent など）を自由に指示できる。
---
name: test-and-fix
description: テスト実行→失敗時に自動修正
user_invocable: true
---

# テスト実行と自動修正

1. `npm test` を実行
2. 失敗したテストがあれば、エラー内容を分析
3. 該当コードを修正
4. 再度テストを実行して全パスを確認
5. 修正内容をサマリとして報告


実務での活用：僕が実際に使っているパターン
僕は一人会社で AI-CEO Framework という仕組みを運用している。Claude Code に10部門のAIエージェントを統括させ、朝の5分で全部門を把握して承認ボタンを押すだけ、という運用だ。
この運用の中で Skills は不可欠な存在になっている。いくつか実例を紹介する。

朝ダイジェスト生成
毎朝の定型業務を1コマンドで完了させる。
---
name: morning
description: 朝ダイジェストを生成する
user_invocable: true
---

全部門の STATE.md を読み取り、承認待ちアイテムと KPI を集約して
ダイジェストを生成してください。

これだけで、各部門の状態収集・承認待ち一覧・KPIサマリが一発で出る。

記事の自動生成
---
name: write-article
description: 技術記事を生成する
user_invocable: true
args:
  - name: theme
    description: 記事のテーマ
    required: true
---

$ARGUMENTS のテーマで技術記事を書いてください。
実体験データベースを参照し、具体的な数値と失敗談を含めること。

コンテンツ制作も Skills 化することで、品質基準を統一しながら量産できる。実際に僕は3チャネル（Zenn, Qiita, note）で毎日記事を自動公開している。

Skills 設計のコツ
実際に運用してわかった、Skills を効果的に設計するためのポイントを共有する。

1. CLAUDE.md を肥大化させない
僕は以前、CLAUDE.md にルールを追加し続けて1,000行を超えたことがある。結果、AIが矛盾する指示に混乱し、指示と逆の動作を始めた。
対策：CLAUDE.md は200行以内に抑え、具体的な業務ロジックは Skills に分離する。
CLAUDE.md（200行以内）= プロジェクト全体のルール
Skills（各ファイル）= タスク固有の指示


2. 1スキル1責務
1つのスキルに複数の責務を持たせると、どこを直せばいいかわからなくなる。Unix哲学と同じだ。
❌ /deploy-and-notify-and-update-docs
✅ /deploy, /notify, /update-docs（それぞれ独立）


3. 名前空間で整理する
スキルが増えてきたらディレクトリで名前空間を切る。
.claude/skills/
├── dev/
│   ├── review.md        # /dev:review
│   └── hotfix.md        # /dev:hotfix
├── publish/
│   ├── new.md           # /publish:new
│   └── status.md        # /publish:status
└── mkt/
    └── campaign.md      # /mkt:campaign


4. Agent との使い分け
Skills は「何をするか」の指示テンプレート。Agent（.claude/agents/）は「どう実行するか」のサブプロセス定義。
Skills  → ユーザーが /command で起動するエントリーポイント
Agents  → Skills から呼び出される実行エンジン

僕の場合、Skills が入口で、重い処理は Agent に委任する設計にしている。

よくあるハマりどころ

user_invocable: true を忘れる
これがないと /skill-name で呼び出せない。内部専用スキル（他のスキルから呼ばれるだけ）なら false でいいが、直接使いたいなら必ず true に。

プロンプトが長すぎる
Skills のプロンプトもコンテキストを消費する。不要な説明は削り、参照すべきファイルはパスだけ渡す。僕はこれを「Thin Skill」と呼んでいる。
# ❌ スキル内にルールを全部書く
品質基準は以下の通りです...（200行のルール）

# ✅ ファイルパスだけ渡す
品質基準は `.company/steering/quality.md` を参照してください。


macOS の cron で動かない
Skills を cron で定期実行しようとして動かないケースがある。macOS ではフルディスクアクセスの問題で cron ジョブが全滅することがある。僕も実際にこれでハマった。解決策は launchd に移行することだ。

まとめ
Skills は Claude Code の「再利用可能なプロンプト」だ。


.claude/skills/ に Markdown ファイルを置くだけ
フロントマターで user_invocable: true を設定

/skill-name で呼び出せる
引数も受け取れる
Agent と組み合わせて複雑なワークフローも構築可能

僕は Skills と Agent の組み合わせで、一人会社の自動化率98%を実現している。月のAIコストは約2万円。仕組みの初期投資は大きいが、一度作れば自動で回る。
まずは1つ、自分が繰り返しやっている作業を Skills 化するところから始めてみてほしい。

関連書籍
Claude Code や AI 自動化についてさらに深く学びたい方は、筆者の書籍もぜひご覧ください。
👉 Zenn 書籍一覧
実践で得たノウハウを体系的にまとめています。

---

## 31. [日経225の株価予測AIを作って方向的中率67%を出すまでの全記録 #Python - Qiita](https://qiita.com/kashiwa350/items/37aa4a7297748b3b03a3)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/10
- **AI要約**:
  LightGBMやRidgeを用いたスタッキング構成と、非負制約付きメタラーナーによる安定化手法の解説
  市場超過リターンの予測や外れ値処理、最新データを重視する時間的重み付けなど実践的な前処理手法
  GCPとBigQueryを核とした週次パイプラインの自動実行基盤と、特徴量増加による過学習の失敗記録
- **今読む理由**: AI駆動開発と自動化パイプラインの構築に直結する、スタッキングの実装コードとGCPを用いた自動実行アーキテクチャが具体的に示されているため。
- **タグ**: #機械学習, #MLOps, #GCP, #Python, #データエンジニアリング

### 本文
はじめに
「AIで株価を予測できるのか？」
この問いに対して、実際にプロダクトを作り、6万件以上のバックテストで検証した結果を全て公開します。
結論から言うと、日経225構成銘柄の3ヶ月後の値動き方向を67.3%の精度で的中させるモデルが完成しました。 ただし、ここに至るまでに6回の改善チャレンジで全敗し、「特徴量を増やすほど精度が下がる」という反直感的な壁にぶつかりました。
この記事では、モデル構築の全過程 — 成功も失敗も含めて — を技術的な詳細とともに公開します。
完成したサービス: Kabu Prediction（全機能無料）

実際のダッシュボード: kabu.microforge.works/dashboard


目次

プロジェクト概要
技術スタック
モデルアーキテクチャ
特徴量エンジニアリング
精度改善の6回の失敗
SHAP分析で見えたモデルの本質
大型株 vs 小型株で精度が全く違った話
バックテスト結果
法的リスクとの戦い
まとめと教訓



プロジェクト概要

何を作ったか
日経225構成銘柄（約200銘柄）を対象に、4つのタイムフレーム（3営業日・1週間・1ヶ月・3ヶ月）で株価の方向を予測するAI分析ツールです。



項目
内容




対象
日経225構成銘柄（約200銘柄）


予測ホライズン
3営業日 / 1週間 / 1ヶ月 / 3ヶ月


方向的中率
3d: 56% / 1w: 70% / 1m: 58% / 3m: 56%


バックテスト件数
66,215件


料金
全機能無料




なぜ作ったか
機関投資家はクオンツチームを擁してデータドリブンな投資判断をしていますが、個人投資家にはそのようなツールがありません。「同等の定量分析を個人でも使えるようにしたい」というモチベーションで開発を始めました。


技術スタック
┌─────────────────────────────────────────────────┐
│  フロントエンド                                    │
│  Next.js 14 (App Router) + Tailwind CSS          │
│  Vercel にデプロイ                                │
├─────────────────────────────────────────────────┤
│  バックエンド                                      │
│  Supabase (PostgreSQL + Auth + RLS)              │
├─────────────────────────────────────────────────┤
│  分析エンジン                                      │
│  Python 3.11 + LightGBM + XGBoost + Ridge        │
│  BigQuery (株価データ基盤)                          │
├─────────────────────────────────────────────────┤
│  自動化                                           │
│  GCP Cloud Functions + Cloud Scheduler           │
│  週次パイプライン自動実行                            │
└─────────────────────────────────────────────────┘


アーキテクチャ詳細: 分析手法ページ



モデルアーキテクチャ

4モデルのスタッキングアンサンブル
単一モデルではなく、4つの異なるモデルの予測値をRidgeメタラーナーで統合しています。
# Model 1: LightGBM Primary（Optuna最適化対象）
model1 = lgb.LGBMRegressor(n_estimators=300, max_depth=6, learning_rate=0.02, ...)

# Model 2: LightGBM Diversity（異なるハイパラで多様性確保）
model2 = lgb.LGBMRegressor(n_estimators=200, max_depth=4, learning_rate=0.05, ...)

# Model 3: Ridge Regression（線形モデルでアンカー）
model3 = Ridge(alpha=1.0)

# Model 4: XGBoost（異なるブースティング実装）
model4 = xgb.XGBRegressor(n_estimators=200, max_depth=5, learning_rate=0.03, ...)

# メタラーナー: 非負制約付きRidgeで最適重み学習
meta_model = Ridge(alpha=1.0, positive=True)
meta_model.fit(np.column_stack([m.predict(X) for m in [model1, model2, model3, model4]]), y)

なぜ positive=True が重要か： 制約なしだとModel2に大きな負の重みがつき、「Model2の予測を逆に使う」という不安定な学習になりました。非負制約により、Model1とModel4が自然に選ばれる安定した重みが得られます。

ターゲット変数: 市場調整リターン（Excess Return）
素の株価リターンではなく、市場平均からの超過リターンを予測ターゲットにしています。
# Raw return
fwd_return = (price_t+N / price_t - 1) × 100

# Market average
market_avg = mean(fwd_return across all stocks on same date)

# Excess return（これを予測する）
fwd_excess = fwd_return - market_avg

なぜ必要だったか： 市場全体が下落トレンドの時期に学習すると、全銘柄が「下がる」と予測してしまう問題がありました。Excess returnにすることで、「市場平均と比べてどうか」を学習させ、この問題を解消しました。

ウィンソライズ（外れ値処理）
小型株時代の名残ですが、大型株でも決算発表後のストップ高/安は起こります。ターゲット変数の1%/99%パーセンタイルでクリッピングしています。
lo = train_df[target_col].quantile(0.01)
hi = train_df[target_col].quantile(0.99)
train_df[target_col] = train_df[target_col].clip(lo, hi)


ホライズン別サンプル重み
短期予測（3日）は最新データを重視、長期予測（3ヶ月）はデータ全体から均等に学習するのが最適でした。
horizon_decay = {
    "3d": 0.5,   # 最新を1.65倍重視
    "1w": 0.4,
    "1m": 0.2,
    "3m": 0.1,   # ほぼ均等
}
weights = np.exp(np.linspace(0, 1, n_samples) * decay)



特徴量エンジニアリング
最終的に使用している特徴量は79個。大きく分けて7カテゴリです。

特徴量カテゴリ別の構成



カテゴリ
特徴量数
代表例




テクニカル
18
ATR, MACD, RSI, ボリンジャーバンド, 出来高比率


ファンダメンタル
7
PER, PBR, ROE, EPS, 配当利回り


センチメント
10
ニュース感情スコア7日平均, ソーシャルバズ


クロスセクション
14
リターンZスコア, 市場ブレッドス, セクターモメンタム


マクロ
10
日経, S&P500, VIX, ドル円


ランク
7
RSIランク, モメンタムランク, ボラティリティランク


その他
13
セクターコード, 決算接近度, ペア特徴量




クロスセクションランク特徴量（v0.5.0で追加、効果あり）
生の指標値ではなく、当日の全銘柄中の相対順位を特徴量にしたものです。これにより市場レジーム（上昇相場/下落相場）が変わっても安定した入力が得られます。
rank_targets = {
    "rsi_14": "rsi_rank",
    "momentum_10d": "momentum_10d_rank",
    "momentum_20d": "momentum_20d_rank",
    "volume_ratio": "volume_ratio_rank",
    "volatility_20d": "volatility_20d_rank",
    "return_5d": "return_5d_rank",
    "return_20d": "return_20d_rank",
}
for src_col, rank_col in rank_targets.items():
    df[rank_col] = df.groupby("trade_date")[src_col].rank(pct=True)



精度改善の6回の失敗
ここが最も学びの大きかった部分です。特徴量の追加・削減・ターゲット変更・データ期間延長、すべて中長期の精度を悪化させました。

失敗の一覧



試行
内容
3d
1w
1m
3m




Baseline (v0.5.0)
79特徴量
51.6%
56.5%
59.9%
67.3%


v0.6.0
+フラクショナル微分 +日本市場特徴量 +レジデュアルモメンタム
+0.3
+0.2
-2.7
-5.2


ニュース拡充
+業績トレンド +センチメント強化
±0
+0.5
-3.4
-5.9


v0.7.0
+クロスアセット連動 +サプライチェーン +FF因子残差 (計+20特徴量)
-2.5
-4.8
-11.8
-16.2


SHAP削減
79→35に絞り込み
+1.5
-0.4
-8.0
-16.7


10年データ
5年→10年に期間延長
+2.5
-3.3
-8.4
-20.6




なぜ失敗するのか
200銘柄×5年（約20万行）というデータ量に対して、79特徴量が過学習の限界点でした。


特徴量を増やす → ノイズが増えて過学習が悪化

特徴量を減らす → 中長期に必要な情報が失われる

データ期間を延ばす → コロナ前後で市場構造が異なりノイズに

この「増やしても減らしても悪化する」状態は、現在の特徴量セットが局所最適解であることを意味しています。


SHAP分析で見えたモデルの本質
SHAP（SHapley Additive exPlanations）で各特徴量の寄与度を分析した結果、モデルの予測はたった3つの柱で構成されていることが分かりました。

特徴量重要度トップ10



Rank
特徴量
SHAP寄与
カテゴリ




1
atr_14
56.1%（3m）
ボラティリティ


2
vix_level
24.9%（1w）
マクロ


3
macd_hist
13.6%（3d）
トレンド


4
sector_code
6.6%
セクター


5
volatility_60d
5.2%
ボラティリティ


6
volatility_20d_zscore
5.1%
ボラティリティ


7
market_return_20d
4.1%
マクロ


8
price_to_vwap
3.6%
テクニカル


9
bb_width
2.8%
ボラティリティ


10
rsi_14
2.5%
トレンド




モデルの3つの柱


ボラティリティ（40-60%）: ATR, VIX, 60日/20日ボラティリティ → 「市場の不安定さ」が最大の予測因子

トレンド（15-25%）: MACD, RSI, モメンタム → 「現在の勢い」が次の方向を示唆

マクロ環境（10-20%）: セクター、市場リターン → 「どのセクターが強いか」

衝撃的だったのは、ファンダメンタル（PER, PBR, ROE）やニュースセンチメントがほぼゼロ寄与だったこと。 79特徴量のうち下位20個はSHAP≒0でした。


大型株 vs 小型株で精度が全く違った話
当初はグロース市場の小型株498銘柄を対象にしていましたが、日経225に切り替えたところ精度が劇的に向上しました。



Horizon
Growth 498銘柄
Prime 200銘柄
差分




3d
51.7%
51.6%
±0


1w
51.6%
56.5%
+4.9%


1m
51.5%
59.9%
+8.4%


3m
54.3%
67.3%
+13.0%




なぜ大型株の方が予測しやすいのか


データが豊富: 出来高が大きく、ニュースも毎日出る。センチメント特徴量が機能する

ノイズが少ない: 小型株は出来高が少なく、少額の売買で株価が大きく動く

セクター連動が安定: 大型株はマクロ指標との連動が明確（ドル円↑→自動車株↑ etc.）



バックテスト結果
66,215件のバックテスト結果を全て公開しています。

バックテスト全データ: kabu.microforge.works/track-record


方向的中率の推移
各テスト期間での的中率にはバラつきがありますが、全体として50%を安定的に上回っています。



テスト日
3d
1w
1m
3m




2025-10
44%
53%
45%
47%


2025-11
59%
66%
57%
55%


2025-12
55%
50%
57%
50%


2026-01
47%
57%
52%
-


2026-02
60%
55%
48%
-


平均
53%
56%
52%
51%




上記のベンチマーク（5テスト日の平均）とバックフィル全体（66,215件）の数値は異なります。これはテスト日のサンプリングによるバイアスです。バックフィル全体での精度は答え合わせページで確認できます。



まとめと教訓

技術的な教訓


特徴量は増やせばいいというものではない — 200銘柄×5年のデータ量では79特徴量が限界

モデルの本質はSHAPで見える — 79特徴量のうち実質的に予測に使われているのは上位10個

大型株は予測しやすい — データ量・ノイズの少なさ・セクター連動の安定性

古いデータは毒になる — コロナ前後で市場構造が変わるため、5年が最適

スタッキングの非負制約が重要 — positive=True がモデルの安定性を大幅に向上


ビジネス面の教訓


金融系サービスは法的リスクが大きい — 弁護士相談が必須

「投資助言」に該当しない建て付けが重要 — 全機能無料＋登録不要

用語1つで法的リスクが変わる — "Buy" → "ポジティブ" に変えるだけで安全に


コード
本プロジェクトのサービスは https://kabu.microforge.works で全機能無料で公開しています。


免責事項: 本記事および本サービスは統計的な計算結果の提示を目的としており、特定の金融商品の売買を推奨するものではありません。投資判断はご自身の責任で行ってください。

0Go to list of users who liked3Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up

---

## 32. [Claude Codeで無駄に時間を消耗してしまう7つのミス（とその改善方法） #プログラミング - Qiita](https://qiita.com/Takumi_Kenta/items/ba51ac72fd10ebcd0a91)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/10
- **AI要約**:
  タスクごとにコンテキストを初期化し、精度低下や情報の埋没を防ぐ具体的な手法を提示
  CLAUDE.mdを用いた規約の自動適用やテスト自動実行による品質担保のワークフローを解説
  ワークツリーやバックグラウンド実行を活用した、AIによる高度な並列開発効率化を提案
- **今読む理由**: AI駆動開発において中心となるClaude Codeの運用効率を劇的に改善し、コンテキスト肥大化による無駄な修正作業を即座に排除できるため。
- **タグ**: #Claude Code, #AI駆動開発, #生産性向上, #プロンプトエンジニアリング

### 本文
Claude Codeは、開発スピードを大幅に向上させる強力なツールです。
しかし、ちょっとした使い方のミスによって、気づかないうちに何時間も無駄にしてしまうことがあります。
厄介なのは、「一応ちゃんと動いてしまう」点です。
Claudeはコードを生成し、ある程度妥当な出力を返すため、作業は進んでいるように見えます。
ですが、いくつかの重要なポイントを改善するだけで、どれだけ時間を浪費していたかがはっきりわかります。
ここでは、自分自身のワークフローでも何度も経験してきた、よくある7つのミスと、すぐに実践できる改善方法を紹介します。

1. すべてを1つの長いセッションでやってしまう

よくあるパターンはこんな感じです：

機能実装
バグ修正
テスト作成
コードレビュー
リファクタリング

これらをすべて同じセッションで行うと、一見効率的に思えます。しかし、時間が経つにつれてコンテキストが肥大化し、最初に与えた指示が埋もれてしまいます。
長いセッションでは、Claudeは最初に設定した制約（フォーマット、設計方針、エッジケースなど）を忘れがちになります。

改善方法
タスクごとにセッションを分ける：
Feature → /clear
Bug fix → /clear
Tests → /clear
Review → /clear

各タスクごとにクリーンなコンテキストを与えることで、精度と一貫性が格段に向上します。

2. 曖昧なプロンプトを書く

例えば：

「バグ直して」
「これ整理して」
「もっと良くして」

こういった曖昧なプロンプトでは、Claudeに推測を強いることになります。
曖昧な指示は曖昧な出力を生み、5分で終わるタスクが30分以上かかることもあります。

良い例
The login endpoint /api/auth/login returns a 500 error
when the email contains a plus sign.

The issue is in src/auth/validate.ts.
Fix the regex and add a test case for emails with plus signs.

必要な情報をすべて含めることで、Claudeが追加質問なしでタスクを一発で完了できます。

改善方法
プロンプト送信前に確認：

何が壊れているのか？
どこで起きているのか？
「完了」とは何を意味するのか？


3. フィードバックループを作っていない

フィードバックループがない場合、Claudeはコードを書いて終了します。
典型的な流れ：
→ コード生成
→ "Done!"
→ 人間がレビューして問題発見

これでは修正作業が増え、効率が下がります。
フィードバックループを入れることで、Claude自身が出力を検証してから返すようになります。

改善方法
プロンプトに次を追加：
Run npm test after making changes.
Fix any failures before finishing.

これだけで、Claudeは単なる生成ツールから「反復的な協働者」に変わります。

4. CLAUDE.mdを使っていない

毎回同じ指示を手入力している場合、それは時間の無駄です。
例：技術スタック、コーディング規約、フォーマットルール、テスト要件。

改善方法
プロジェクトルートに CLAUDE.md を作成：
# Stack
Next.js, TypeScript, Prisma

# Rules
- Functional components only
- Use Prisma for database access
- Consistent API response format

# After changes
Run tests and fix failures
Run lint and fix issues

これにより、毎回同じコンテキストでスタートでき、出力の一貫性が向上します。

5. mainブランチで直接作業している

Claudeはデフォルトで現在のブランチ上で作業します。
小さな変更なら問題ありませんが、大きな変更ではリスクがあります。

改善方法
worktreeを使って分離：
claude -w feature-branch

独立した作業環境で作業でき、問題があっても簡単に破棄できます。
特に大規模変更や実験的作業に有効です。

6. すべての権限確認で「Yes」を押している

Claude Codeは頻繁に確認を求めます：

ファイル編集
コマンド実行
ディレクトリアクセス

多くの開発者は内容を見ずに「Yes」を押しがちです。
これは作業効率の低下だけでなく、安全性の観点でも最適ではありません。

改善方法
自動またはスコープ付き権限を使用：
claude --permission-mode auto

または .claude/settings.json で許可ツールを定義。
中断が減り、開発に集中できます。

7. 大きなタスクで並列実行を使っていない

多くの人は順番にタスクを処理します：
Task A → Task B → Task C

小さなタスクなら問題ありませんが、独立した複数タスクではボトルネックになります。

改善方法
並列で実行：
claude -w feature-a --background
claude -w feature-b --background
claude -w feature-c --background

それぞれ独立した環境で実行され、複数機能を並行開発する場合に開発時間を大幅に短縮できます。
レビューは少し増えますが、総合的な効率は大幅に改善します。

まとめ

7つのミス → 7つの改善

長時間セッション → タスクごとに /clear

曖昧なプロンプト → 具体的に書く
フィードバックなし → テスト実行を組み込む
CLAUDE.mdなし → ルールを一元化
mainで作業 → worktreeを使う
毎回承認 → auto権限を使う
順次実行 → 並列実行する


最後に
すべてを一度に直す必要はありません。
まずはこの2つだけでも効果があります：

タスクごとにセッションを分ける
フィードバックループを入れる

これだけで、作業スピードと出力品質の両方に明確な改善が現れます。
残りの改善は徐々に取り入れていくことで、長期的に効率が積み上がります。

---

## 33. [CLAUDE.md + メモリ3階層設計で始めるClaude Code活用術 ── 初心者から中級者へのステップアップガイド - Qiita](https://qiita.com/nogataka/items/0cd0851556572b4758ba)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/12
- **AI要約**:
  CLAUDE.mdを用いた開発環境設定やコーディング規約の具体例とテンプレートを提示。
  全域・個人・プロジェクト単位での階層的設定管理により、反復的な指示の手間を排除する手法を解説。
  具体的で検証可能なルールの書き方や、陥りやすい10の失敗パターンなど実用的な知見を網羅。
- **今読む理由**: AI駆動開発においてClaude Codeの出力を安定させ、反復的な指示を自動化するための具体的な設定ファイル（CLAUDE.md）の書き方や階層設計が即座に適用可能なため。
- **タグ**: #Claude Code, #AI駆動開発, #プロンプトエンジニアリング

### 本文
はじめに
Claude Codeを初めて使ったとき、こんな経験はありませんか。

「うちのプロジェクトはTypeScriptなんだけど」と毎回伝えている
「テストはVitest使って」と何度も指示している
昨日決めた設計方針を今日また最初から説明している

Claude Codeは、CLAUDE.mdなしだと「毎回初対面の優秀なエンジニア」です。技術力は高いのに、プロジェクトのことを何も知らない。そのギャップを埋めるのがCLAUDE.mdであり、さらにセッションを跨いで「学習」させるのがメモリの仕組みです。
この記事では、CLAUDE.mdの書き方を基礎から解説した後、セッション横断で知識を蓄積する「メモリ3階層設計」まで踏み込みます。筆者が半年ほどClaude Codeを日常の開発で使い込んで得た運用知見と、公式ドキュメント、コミュニティで話題になった実装例を組み合わせた内容です。

この記事で扱う「メモリ」の位置づけ
「メモリ」という言葉はAIツールごとに意味が違います。先に整理しておきます。



ツール
メモリの性質




ChatGPT Memory
サービス側がユーザー発言から勝手に覚える。ユーザーはオンオフと閲覧のみ


Cursor Rules
リポジトリ内の .mdc ファイル。パスやファイルタイプでスコープ可能


GitHub Copilot Custom Instructions
リポジトリ or ユーザー単位のプレーンテキスト


Claude Code CLAUDE.md + Auto Memory
ローカルのMarkdownをユーザーが書く「CLAUDE.md」と、Claude自身が書き足す「Auto Memory」の二系統



Claude Codeの特徴は、ユーザーが書く層とAIが書く層が分離されていて、さらにどちらもプレーンMarkdownのためGitや手動編集で自由に触れる点です。この二系統をどう設計するかで、Claude Codeの出力品質は大きく変わります。

前半：CLAUDE.mdで出力品質を変える

CLAUDE.mdとは何か
CLAUDE.mdは、Claude Codeがセッション開始時に自動で読み込む指示書です。プロジェクトのルートディレクトリに置くだけで、毎回の口頭説明が不要になります。
公式ドキュメント（How Claude remembers your project）では、CLAUDE.mdを次のように位置づけています。

Treat CLAUDE.md as the place you write down what you'd otherwise re-explain.
（毎回説明し直すことになる内容を書き留める場所として扱う）

つまりCLAUDE.mdは「面倒で毎回言っていること」を書くファイルです。逆に言えば、書くべき内容の判断基準は「もう一度説明したいかどうか」の一点に絞れます。
配置場所によって読み込みスコープが異なります。公式仕様では優先順位が明確に決まっており、より狭いスコープが広いスコープを上書きします。



配置場所
スコープ
用途
Git管理




管理ポリシー（/Library/Application Support/ClaudeCode/CLAUDE.md 等）
組織全体
セキュリティポリシー、コンプライアンス要件
IT/DevOps管理


~/.claude/CLAUDE.md
全プロジェクト共通
個人の文体、常用ツール、行動原則
個人


プロジェクトルート ./CLAUDE.md or ./.claude/CLAUDE.md

特定プロジェクト
技術スタック、規約、禁止事項
チーム共有


./CLAUDE.local.md
特定プロジェクト・個人
ローカル環境設定、個人的な好み

.gitignore 対象


.claude/rules/*.md
トピック別
ファイルパスで絞れる詳細ルール
チーム共有



興味深いのは、Claude Codeはカレントディレクトリから親を辿って見つけた全てのCLAUDE.mdを連結して読み込む点です。foo/bar/ で起動すれば foo/bar/CLAUDE.md と foo/CLAUDE.md が両方読み込まれ、階層的な指示書として機能します。モノレポで共通ルールと個別ルールを自然に共存させられます。

なぜCLAUDE.mdが必要になったのか
Claude Codeの設計思想を理解すると、CLAUDE.mdの存在意義がより腑に落ちます。
LLMを組み込んだコーディングエージェントは、「システムプロンプトで全ての前提を渡す」方式では限界があります。プロジェクトごとに違う技術スタックや規約を全てシステムプロンプトに詰め込むと、汎用性が失われ、トークンも無駄になります。
そこでClaude Codeは、セッション開始時にユーザーメッセージとしてCLAUDE.mdを注入するというアーキテクチャを採用しました。公式ドキュメントにも次の記述があります。

CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself.

これは重要なポイントです。CLAUDE.mdは「システムプロンプトと同等の強制力」ではなく「ユーザーが毎回冒頭で投げる指示」です。だからこそ、曖昧な表現は効きません。人間に対する指示と同じで、具体的で検証可能な文言でなければ守られないのです。

最小限のCLAUDE.mdを書く
まずは4セクションだけで十分です。以下はコピーしてそのまま使えるテンプレートです。
# プロジェクト設定

## プロジェクト概要
ECサイトのバックエンドAPI。注文管理・在庫管理・ユーザー認証を担当する。

## 技術スタック
- 言語: TypeScript 5.x
- ランタイム: Node.js 22
- フレームワーク: Fastify 5
- ORM: Prisma 6
- テスト: Vitest
- DB: PostgreSQL 16

## コーディング規約
- 関数は1つの責務のみ持つ。50行を超えたら分割を検討する
- エラーハンドリングはResult型パターンを使う。throw禁止
- 変更したファイルに対応するテストファイルが存在する場合、テストも更新する
- APIエンドポイント追加時はOpenAPIスキーマも同時に更新する

## 禁止事項
- any型の使用禁止。unknown + 型ガードで対応する
- console.logによるデバッグ禁止。loggerモジュールを使う
- node_modules内のファイルを直接編集しない

この程度であれば3分で書けます。しかし、この3分の投資で「TypeScript使って」「テストも書いて」「anyは使わないで」といった反復指示がすべて消えます。
公式ドキュメントは 200行以内 を推奨しています。長すぎるとトークンを消費するだけでなく、Claudeの遵守率が下がるためです。大きくなってきたら @path/to/file.md のインポート構文で分割するか、.claude/rules/ に移動するのが定石です。

効果的なルールの書き方
CLAUDE.mdのルールは「具体的で検証可能」であることが重要です。以下に良い例と悪い例を5組示します。

判断基準はシンプルです。そのルールを読んだ別のエンジニアが「守れたかどうか」を客観的に判定できるなら、良いルールです。




#
悪い例
良い例




1
きれいなコードを書く
関数は50行以内。超える場合は分割してヘルパー関数を作る


2
テストを書いて
変更したファイルに対応する *.test.ts が存在する場合、テストも更新する


3
セキュリティに気をつけて
ユーザー入力は必ずzodスキーマでバリデーションする。SQLは必ずパラメータ化クエリを使う


4
コミットメッセージをちゃんと書く
コミットメッセージはConventional Commits形式（feat:, fix:, docs:）で書く


5
パフォーマンスを意識して
N+1クエリを避ける。関連データはincludeで一括取得する。ループ内でDBアクセスしない



悪い例に共通するのは「解釈の幅が広すぎる」ことです。「きれいなコード」の定義は人によって違いますが、「50行以内」は誰が見ても同じ判定になります。公式ドキュメントの表現を借りれば、 "Use 2-space indentation" instead of "Format code properly" というレベルの具体性が必要です。

よくある失敗パターン10個と対処法
CLAUDE.mdを書き始めると陥りやすい落とし穴を10個まとめます。前半は筆者自身が踏んだもの、後半はコミュニティで見かける相談事例です。



#
失敗
症状
対処法




1
制約の詰め込みすぎ
500行超のCLAUDE.md。どれも守られない
200行以内に削減、詳細は .claude/rules/ へ分割


2
曖昧な表現
「きれいに」「適切に」「ちゃんと」が並ぶ
数値・ファイル名・コマンド名で具体化する


3
メンテナンスの放置
古い技術スタックが残り誤った前提で動作
技術選定が変わったらCLAUDE.mdも同コミットで更新


4
矛盾するルールの共存
グローバルとプロジェクトで方針がぶつかる

/memory で読み込みファイルを確認し整理


5
機密情報の混入
クライアント名・APIキーがGitに残る

CLAUDE.local.md + .gitignore に分離


6
コピペテンプレの放置
他プロジェクトのルールが残りノイズに
プロジェクト初期化時に必ず読み返す


7
個人の好みがチーム用に混入
チームCLAUDE.mdに個人の文体指示
個人用は ~/.claude/CLAUDE.md に書く


8
Do だけで Don't がない
禁止事項が明示されず事故が起きる
「何をしないか」を必ず1セクション設ける


9
プロジェクト概要の欠落
Claudeが目的を誤解した提案をする
1〜2行で「何を作っているか」を冒頭に書く


10
更新履歴なし
いつのルールか分からず棚卸しできない
節目のコミットにタグを打つ、日付コメントを添える




特に5番と7番は見落とされがちです。CLAUDE.mdはGitで管理されるため、うっかりクライアント名や契約金額を書くと公開リポジトリでそのまま漏洩します。個人用は ~/.claude/CLAUDE.md または CLAUDE.local.md に分離する癖をつけてください。


ルールがなかった時に起きた具体的失敗
抽象論だけでは実感が湧かないので、筆者自身がCLAUDE.md導入前に踏んだ失敗を5つ紹介します。これらはそのまま「なぜそのルールが必要か」の動機になっています。
1つ目。いきなりコードを書き始めて設計が破綻した ケース。あるAPIの追加を依頼したら、Claudeは既存の類似エンドポイントを読まずに独自のパターンで実装しました。後から既存コードと統合する段階で「認証ミドルウェアが重複している」「エラー型が違う」などの手戻りが発生し、結局ゼロから書き直しました。以降「3ステップ以上のタスクはPlanモード必須」というルールを入れています。
2つ目。場当たり的なパッチを重ねてコードが腐敗した ケース。テスト失敗を「とりあえず動かす」方向で修正した結果、元の意図と違う形で通ってしまい、本番でバグが再発しました。「うまくいかなくなったら立ち止まって再計画する」というルールは、この経験から生まれました。
3つ目。読まずに書いて既存関数と重複した ケース。コンテキストが逼迫してくると、Claude Codeは既存コードを読まずに「たぶんこうなっているだろう」で書き始めます。その結果、既存のバリデーション関数と同じものが別名で再実装されたり、存在しないインポートパスを指定したりします。「コードを読まずに書かない」を明文化してから、この事故がほぼゼロになりました。
4つ目。生成ファイルがリポジトリに散乱した ケース。Claudeが出力した調査メモやスクリプトがプロジェクトルート直下に溜まり、git status がノイズだらけになりました。「ファイルは output/ に出力し、公開前にユーザー確認を取る」で解決しました。
5つ目。依頼していない変更を勝手に入れた ケース。「この設計の方が良いと判断したので変更しました」と、依頼範囲外のリファクタが混入しました。AI駆動開発における意思決定の主体は常に人間である必要があるため、「重要な判断を独断で進めない」というルールを追加しています。
いずれも「一度痛い目を見てからルール化した」パターンです。最初から完璧なCLAUDE.mdを書く必要はありません。失敗の後にその場で1行追加する のが、形骸化しない育て方です。

後半：メモリ3階層でセッション跨ぎの知識を蓄積する
CLAUDE.mdだけでもClaude Codeの出力品質は大きく改善されます。しかし、使い込んでいくと別の課題が見えてきます。

「先週のセッションで決めた設計方針、覚えてる？」→ 覚えていない
「前回のバグ修正で学んだパターン、次も活かして」→ 知らない

CLAUDE.mdは「不変のルール」を伝えるのに適していますが、セッション中に生まれる知見や意思決定を蓄積する仕組みにはなっていません。ここで登場するのがメモリの3階層設計です。

Auto Memoryという新しい仕組み
最近のClaude Codeには、公式に Auto Memory という機能が入りました。これはClaude自身が「これは次回も使えそうだ」と判断した内容を ~/.claude/projects/<プロジェクトパス>/memory/MEMORY.md に自動で書き足す仕組みです（導入バージョンは更新にともない変動するため、最新の公式ドキュメントを参照してください）。
公式ドキュメントの表現を引用します。

Auto memory lets Claude accumulate knowledge across sessions without you writing anything.
Claude doesn't save something every session. It decides what's worth remembering based on whether the information would be useful in a future conversation.

特徴を整理すると次のとおりです。


MEMORY.md の 先頭200行または25KB がセッション開始時に自動で読み込まれる
それを超える内容は別トピックファイル（例: debugging.md）に切り出され、必要になった時だけ読み込まれる
プロジェクトルートのCLAUDE.mdは /compact 後にも再注入されるが、ネストされたCLAUDE.mdは再注入されない
Auto Memoryはマシンローカルで、worktreeやサブディレクトリは同じgitリポジトリなら共有される

この仕組みは「覚えている」から「学んでいる」への重要な一歩ですが、Auto Memoryだけに任せると運用が破綻します。なぜなら、Claudeが何を覚えているかブラックボックスになり、腐敗検出が難しくなるからです。そこで、ユーザー側で階層を明示的に設計する発想が生まれました。

3階層の全体像
この設計は、Claude Codeのメモリを3階層にしたら「覚えてる」が「学んでる」に変わった（Zenn、TOKIUM PdMのまっさん氏、100いいね超）の考え方を参考にしています。この記事では、人間の脳科学における記憶の分類（短期記憶・長期記憶・手続き記憶）になぞらえて、Claude Codeのメモリを次の3層に分けています。
第1層: CLAUDE.md ─── 永続的な行動規範（変わらない原則 / 手続き記憶相当）
第2層: MEMORY.md ─── セッション横断の学習記録（蓄積される知見 / 長期記憶相当）
第3層: プロジェクトメモリ ─ 意思決定・進捗の記録（文脈の保存 / 作業記憶相当）




階層
ファイル
性質
更新頻度
書き手




第1層
CLAUDE.md
憲法。プロジェクトの基本法
月1回程度
人間


第2層
MEMORY.md
学習ノート。セッション間の観察
セッションごと
Claude（Auto Memory）


第3層

decisions.md, context-log.md 等
業務日誌。具体的な意思決定
随時
人間（+ Claudeの下書き）




なぜ3階層なのか──2階層や4階層ではだめか
「CLAUDE.mdとMEMORY.mdの2階層でいいのでは？」という疑問は自然です。実際、筆者も最初は2階層で始めました。しかし運用していくうちに、2階層では次の問題が起きます。
問題1: MEMORY.mdが肥大化する。セッションで学んだこと・決めたこと・観察したことが全て1箇所に溜まると、200行制限をすぐに超えます。超えた部分は別ファイルに自動分離されますが、「どこに何があるか」が分からなくなります。
問題2: 不変のルールと可変の知見が混ざる。「テストはVitestを使う」というプロジェクトの憲法と、「このライブラリの初期化は非同期で待つ必要がある」という発見が同じファイルに並ぶと、棚卸しのたびに判断がぶれます。前者は削除してはいけない、後者はライブラリ更新で不要になる、という性質の違いを区別できなくなるのです。
問題3: 意思決定の理由が失われる。「なぜPrismaからDrizzleに移行したか」という意思決定の背景は、MEMORY.mdに書くには長すぎ、CLAUDE.mdに書くには変わりやすい情報です。
3階層にする理由は、情報の寿命が違うものを混在させない という一点に尽きます。

第1層（不変のルール）: プロジェクト存続中ずっと有効
第2層（学習記録）: 環境や依存が変わるまで有効
第3層（意思決定）: 判断の背景として永続記録

逆に4階層や5階層にすると、どこに書けばいいか迷う時間が増え、結局使われなくなります。筆者の経験上、3階層が「十分な分離」と「書く場所で迷わない」のバランスです。

各階層に何を書くか、何を書かないか
それぞれの階層に適した情報と、書くべきでない情報を整理します。理由も添えます。
第1層：CLAUDE.md
書くべきもの：

技術スタック（言語・フレームワーク・DB・テストツール）
コーディング規約（命名・エラー処理・ファイル分割基準）
ディレクトリ構造（どこに何があるか）
禁止事項（any型禁止、console.log禁止 等）
行動原則（Planモード必須条件、レビュー前の確認項目）

書くべきでないもの：

進行中タスク（数日で古くなる）
特定のバグの調査記録（一過性の情報）
ライブラリの細かい挙動（バージョン更新で変わる）

理由は明快です。CLAUDE.mdは毎セッション読まれるため、頻繁に変わる情報を書くとメンテナンスコストが跳ね上がる からです。
第2層：MEMORY.md
書くべきもの：

開発環境の癖（「このプロジェクトのE2Eテストは並列だと認証トークンが競合する」）
ライブラリの初期化手順（「Playwrightはヘッドレスで実行」）
頻繁に参照するコマンド（ビルド・デプロイ・seed投入）
Claudeが何度か間違えて修正された内容（Auto Memoryが自動で書き足す）

書くべきでないもの：

プロジェクトの憲法レベルの規約（第1層に書くべき）
一度きりの作業ログ（第3層に書くべき）

理由は、MEMORY.mdの先頭200行しかセッション開始時に読み込まれないという仕様です。ここには 「次回セッションで即座に役立つ、圧縮された知見」だけ を入れる必要があります。
# Memory

## 開発環境
- Playwrightはヘッドレスモードで実行する
- Docker Composeでの起動はdb→api→workerの順序が必要

## テスト
- E2Eテストは並列実行すると認証トークンが競合する。直列で実行すること
- seed dataの投入はテストごとにリセットが必要

## デプロイ
- staging環境はCloudflare Tunnel経由。ローカルからcurl確認可能

第3層：プロジェクトメモリ
書くべきもの：

意思決定の記録（決定・根拠・日付）
プロジェクト進捗（マイルストーンの達成）
過去の判断パターン（類似の判断が求められた時の参照元）

書くべきでないもの：

Claudeが毎回読む必要がある内容（第1層に書くべき）
圧縮できる恒常的な知見（第2層に書くべき）

筆者の場合、以下の4ファイルに分けて管理しています。



ファイル
内容
記録例




decisions.md
意思決定の記録
「ORMをPrismaからDrizzleに移行する。理由: エッジランタイム対応」


context-log.md
プロジェクト進捗
「認証基盤の実装完了。OAuth2.0 + PKCE対応」


preferences.md
好み・方針
「エラーメッセージは日本語で統一」


case-judgment-framework.md
教訓・判断基準
「DBマイグレーションは必ずロールバックスクリプトも用意する」



第3層は必要になった時だけClaudeに読ませる設計です。CLAUDE.mdからインポートすると毎セッション読まれてしまうので、スキルや明示的な参照 で呼び出します。

「覚えてる」から「学んでる」への進化メカニズム
前述のTOKIUM記事で紹介されている、興味深いメカニズムを一つ掘り下げます。それは pain_count（痛みカウンタ） という考え方です。
同じ指摘をClaudeに対して何度も繰り返すとき、そのフィードバックには「痛み」が溜まっています。1回目はうっかりミス、2回目は注意不足、3回目は仕組みの問題です。TOKIUM記事の著者は、次のルールでメモリを運用しているそうです。

新規フィードバックを記録する際、既存メモリと照合する
同じ趣旨があれば新しいファイルを作らず、既存メモの pain_count を +1 する

pain_count >= 3 に達したフィードバックは、単なるメモから CLAUDE.mdのルール またはスキル・フックに昇格させる

これは人間の学習プロセスと同じです。最初は「意識しないとできない」段階だったものが、何度も繰り返すうちに「意識しなくてもできる」段階に移行する。その移行を明示的にメモリ階層で表現しているのです。



学習段階
状態
Claude Codeでの対応
強制力




1
知らない
Auto Memoryが観察して記録
Lv.0


2
意識すればできる
MEMORY.md参照
Lv.1


3
繰り返し指摘が必要
CLAUDE.mdルール化
Lv.2


4
自動的にやる
スキルまたはフック
Lv.3-4



このメカニズムが示唆するのは、CLAUDE.mdに最初から全てを書く必要はない ということです。Lv.1とLv.2の境界線を pain_count で機械的に判定する運用にすれば、本当に必要なものだけが昇格していきます。結果としてCLAUDE.mdは肥大化せず、どのルールも「3回以上の実体験から生まれた必要なルール」になります。
筆者自身もこの考え方を取り入れてから、CLAUDE.mdの更新がぐっと楽になりました。気になった瞬間にすぐ追記するのではなく、「今の指摘は何回目か」を意識するようになったのです。

CLAUDE.mdはどのタイミングで読み込まれるか
メモリ運用を設計するには、Claude CodeがいつファイルをReadするかを正確に把握しておく必要があります。公式ドキュメントを元に整理すると次のとおりです。



タイミング
CLAUDE.md
MEMORY.md
.claude/rules/*.md




セッション起動時
全文読み込み
先頭200行/25KB読み込み

paths 無しは全件、ありはマッチしたファイル読み込み時



/compact 実行後
プロジェクトルートは再注入、ネストは再注入されない
再注入される
同じ挙動


サブエージェント呼び出し時
引き継がれる（サブエージェントも読む）
サブエージェント専用のAuto Memoryあり
引き継がれる


ファイル読み込み時
サブディレクトリのCLAUDE.mdがオンデマンド読み込み
トピック別ファイル（例: debugging.md）が必要時に読み込み

paths 指定のルールがマッチ時に読み込み



この仕様を知っているとメモリ設計の精度が上がります。例えば、「毎回必ず読ませたい内容」はCLAUDE.md本体に、「普段は読まなくていいが特定ディレクトリで作業する時だけ読ませたい内容」は .claude/rules/ に paths フロントマター付きで置く、という使い分けになります。
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules
- 全エンドポイントは zod バリデーションを必須とする
- エラーレスポンスは標準フォーマットを使う

このルールは src/api/ 配下のTypeScriptファイルを読む時だけ読み込まれます。トークンを節約しつつ、関連ファイル作業時には確実に効く仕組みです。

トークン消費から見たメモリ設計
CLAUDE.mdもMEMORY.mdもコンテキストウィンドウのトークンを消費します。どれくらいのコストか、概算を示します。



ファイル
行数
概算トークン
毎セッションの消費




短いCLAUDE.md
50行
約500トークン
毎回


推奨サイズのCLAUDE.md
200行
約2,000トークン
毎回


肥大化したCLAUDE.md
500行
約5,000トークン
毎回


MEMORY.md（先頭200行）
200行
約2,000トークン
毎回


トピック別ファイル
-
0トークン
オンデマンド



200行以内のCLAUDE.mdとMEMORY.mdを合わせて約4,000トークンというのは、現在のClaude Codeのコンテキストウィンドウから見れば十分軽い投資です。しかし、これが500行を超えると「Claudeの注意力を薄める副作用」が発生します。公式ドキュメントも明言していますが、ファイルが長いほど個々のルールの遵守率が下がる のです。
設計の指針はシンプルです。

CLAUDE.mdは 200行以内
MEMORY.mdは Auto Memoryに任せて先頭200行相当に自然収束させる
それ以上の詳細は .claude/rules/ にパス指定で分散、または第3層に移動


メモリの腐敗問題と対策
メモリ運用で最も注意すべきリスクは「情報の腐敗（stale memory）」です。
古くなった情報が残り続けると、Claude Codeが誤った前提で動作します。例えば「DBはMySQL」というメモリが残ったままPostgreSQLに移行していたら、MySQL前提のSQLが生成されます。これはCLAUDE.mdがない状態より悪い結果を招きます。
対策は3つあります。
1つ目は、日付の記録 です。すべてのメモリエントリに日付を付けることで、古さが一目で分かるようになります。
### 2026-04-10: ORMの移行決定
- **決定**: PrismaからDrizzleに移行する
- **根拠**: Cloudflare Workers対応が必要になったため

2つ目は、定期的な棚卸し です。月に1回、メモリファイルを上から読み直し、現状と合わなくなった記述を削除または更新します。筆者はスプリントの振り返りのタイミングでメモリの棚卸しも行っています。/memory コマンドで現在読み込まれているファイル一覧を確認し、不要なものをその場で編集するワークフローが機能します。
3つ目は、矛盾の検出 です。CLAUDE.mdに「メモリの内容と矛盾する情報が出た場合は、ユーザーに確認してから更新」というルールを入れておくと、Claude Code自身が矛盾に気づいて報告してくれます。これは地味ですが効果的です。

メモリに古い情報が残っていると、CLAUDE.mdに正しいルールがあっても上書きされる場合があります。公式ドキュメントにも「矛盾する指示があるとClaudeは任意に選ぶ」と明記されています。メモリの棚卸しはCLAUDE.mdの更新と同じくらい重要です。


実践コーナー

今日から始める3ステップ
ここまで読んで「全部やるのは大変そう」と感じた方も多いと思います。以下の3ステップで段階的に進めれば、無理なく始められます。
ステップ1（今日）。プロジェクトのルートに最小限のCLAUDE.mdを作成します。前半で示した4セクション（プロジェクト概要・技術スタック・コーディング規約・禁止事項）だけで構いません。所要時間は3分です。もっと楽をしたければ /init コマンドを実行すれば、Claude自身がコードベースを解析してCLAUDE.mdのたたき台を生成してくれます。
ステップ2（1週間後）。1週間Claude Codeを使ったら、「毎回同じことを説明している」「毎回修正している」項目をCLAUDE.mdに追記します。実際に困った場面から書くので、形骸化しにくいルールになります。合わせて /memory コマンドで現在読み込まれているファイルを確認し、Auto Memoryが何を勝手に書き足したかも眺めてみてください。
ステップ3（2週間後）。第3層のプロジェクトメモリ（decisions.md など）を追加します。意思決定の理由を残すだけでも、数ヶ月後の自分とClaudeに大きな価値をもたらします。

1週間・1ヶ月・3ヶ月後の進化パス
CLAUDE.mdは一度書いて終わりではなく、時間をかけて育てるものです。各タイミングでの到達目標を示します。
1週間後の到達目標

CLAUDE.mdが30〜50行程度
プロジェクトの技術スタックと5個程度の基本ルール

~/.claude/CLAUDE.md に個人の文体・常用ツールを整理

1ヶ月後の到達目標

CLAUDE.mdが80〜120行程度
実際の失敗から生まれた具体的ルールが10個以上
MEMORY.mdに開発環境の癖が蓄積されている

/memory で読み込みファイルの全体像を把握できている

3ヶ月後の到達目標

CLAUDE.mdが150〜200行程度で安定

.claude/rules/ にトピック別ルール（testing.md、api-design.md 等）

decisions.md に主要な意思決定10件以上
月1回のメモリ棚卸しがワークフローに組み込まれている
pain_countに近い考え方でルール昇格の判断ができている

3ヶ月を過ぎると、CLAUDE.mdの更新頻度は月1〜2回程度に落ち着きます。これは「育て終わった」のではなく「育てる対象がMEMORY.mdと第3層に移った」という状態です。

筆者のCLAUDE.mdから実際のルール5つ
最後に、筆者が実際に使っている ~/.claude/CLAUDE.md から5つのルールを引用します。それぞれ、なぜそのルールが必要になったかのストーリーも添えます。
1つ目。
- 3ステップ以上 or アーキテクチャに関わるタスクは必ずPlanモードで開始する

これは、Claude Codeがいきなりコードを書き始めて、途中で「やっぱりこの設計だと無理がある」と手戻りが発生したことがきっかけです。複雑なタスクほど、最初に計画を立てさせた方が結果的に速いと学びました。
2つ目。
- 途中でうまくいかなくなったら、無理に進めずすぐに立ち止まって再計画する

エラーが出たとき、Claude Codeが場当たり的なパッチを重ねて、最終的に元のコードより悪い状態になった経験から生まれたルールです。「3回修正しても解決しないなら、アプローチ自体を見直す」というラインを設けています。
3つ目。
- コードを読まずに書かない: ファイルを読んでいないコードを直接書くのは禁止

コンテキストウィンドウが逼迫してくると、Claude Codeは既存コードを読まずに「たぶんこうなっているだろう」で書き始めることがあります。その結果、既存の関数と重複したコードを生成したり、存在しないインポートパスを指定したりします。このルールを入れてから、そうした事故がなくなりました。
4つ目。
- ファイルは output/ に出力し、公開前にユーザー確認を取る

Claude Codeが生成したファイルがプロジェクトルート直下に散乱して、リポジトリが汚れた経験から追加しました。出力先を固定することで、生成物の管理が楽になります。
5つ目。
- 重要な判断を独断で進めない。必ずユーザーに確認を取る

Claude Codeが「この設計の方が良いと判断したので変更しました」と、依頼していない変更を勝手に行ったことがありました。AI駆動開発において、意思決定の主体は常に人間である必要があります。このルールは安全弁として機能しています。

MEMORY.mdに蓄積された学習記録の実例
参考までに、筆者の実際のMEMORY.mdから抜粋した記述を紹介します。いずれも「最初のセッションで指摘したら、次回から勝手に守ってくれるようになった」項目です。
# Memory

## ユーザー設定
- 会話は日本語で行う
- Playwrightはヘッドレスモードで実行する
- Qiita記事の公開後はスクリーンショットで表示崩れを確認する

## プロジェクト情報
- agent-chat プロジェクトの実体は /Users/xxx/dev/agent-chat/ にある
  （リポジトリ内ではない。パス混同に注意）

特に「Playwrightはヘッドレスモードで実行する」は、最初に一度「ブラウザが開いて邪魔」と伝えただけで、Auto Memoryが勝手に記録してくれたものです。それ以来、このプロジェクトでPlaywrightを使うタスクでは毎回ヘッドレスで動いています。これが「覚えている」から「学んでいる」への変化の、最も分かりやすい例です。

まとめ
CLAUDE.mdは「3分で書ける投資」です。最小限の4セクションだけで、毎回の反復説明がなくなります。公式推奨の200行以内を意識しつつ、具体的で検証可能なルールを育てていくのが基本です。
メモリ3階層は「使い込むほど賢くなる仕組み」です。第1層（CLAUDE.md）で不変のルールを、第2層（MEMORY.md / Auto Memory）でセッション横断の学びを、第3層（decisions.md等）で意思決定の理由を蓄積することで、Claude Codeは「毎回初対面のエンジニア」から「プロジェクトを熟知したチームメンバー」に変わります。3階層にする理由は、情報の寿命を揃え、棚卸しのコストを下げるためです。
ただし、メモリは放置すると腐ります。日付を記録し、定期的に棚卸しし、矛盾を検出する仕組みを入れること。pain_countのような昇格メカニズムを意識し、「繰り返し発生したものだけをルール化する」姿勢を持つこと。この運用コストを払えるかどうかが、CLAUDE.mdを「書いて終わり」にするか「育てていく」かの分岐点です。
まずは今日、プロジェクトルートにCLAUDE.mdを1つ作るところから始めてみてください。あるいは /init を叩くだけでも構いません。最初の1行が、数ヶ月後の自分を助けます。

参考リンク

How Claude remembers your project（Claude Code公式ドキュメント）
Claude Codeのメモリを3階層にしたら「覚えてる」が「学んでる」に変わった（Zenn / TOKIUM）
Claude Code Best Practices（Anthropic公式）
Claude Code の 6種類のメモリと優先順位を理解して効率的に活用しよう（Zenn）

---

## 34. [Claude Codeに実装を丸投げするための仕組み作り](https://zenn.dev/trefac/articles/dde38d1229ce19)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/5/22
- **AI要約**:
  Claude Codeの指示追従性を向上させるスキル（SKILL.md）の具体的な設定例を提示。
  スキルから他のスキルやサブエージェントを明示的に呼び出し、推論のブレを抑制する手法を解説。
  複雑な開発フローを自動化するスラッシュコマンドの設定と、処理を順番に実行させる仕組みを説明。
- **今読む理由**: Claude Codeを用いた開発自動化における「指示に従わない」「文脈を忘れる」といった技術的課題に対し、具体的なSKILL.mdのコード例や引数設計、サブエージェント制御を用いた解決策が明記されており、現在のAI駆動開発プロジェクトに即座に移植・適用できるため。
- **タグ**: #Claude Code, #AI駆動開発, #AIエージェント, #自動化パイプライン

### 本文
はじめに
「AIエージェントにシステム開発を全て委ねることは可能なのか？」という疑問を出発点に、自分では一切ドキュメントやコードは書かずに、Claude Codeの操作のみで開発をする縛りを設け、一つのサンプルシステムを作成しました。

しかし、AIエージェントへの全自動化は、想定していた以上にすんなりとはいきませんでした。実際に開発を進めていくと、過去に指示したことをClaude Codeが忘れてしまったり、そもそも指示通りに動いてくれなかったりといった、LLM特有の壁に何度も直面しました。
本記事では、そのようなLLM特有の壁を乗り越えるための指示追従性を高めるテクニックと、コンテキストウィンドウを戦略的に管理していくための方法をまとめます。

 Claude Codeの指示追従性を高めるテクニック
今回のサンプルプロジェクトでは、Claude Codeの指示追従性を高めるために下記の仕組みを用いました。

スキル
スラッシュコマンド

それぞれについて具体例を挙げてまとめます。

 スキル
スキルを使うことによって、ツールの使い方や考え方をClaude Codeに教えることができます。
例えば、自動テストの実行方法といったツールの使い方をスキルとして定義したり、デザインパターンなどの実装の考え方をスキルとして定義できます。一度スキルとして定義すれば、Claude Codeは必要なタイミングでそれらのスキルを読み込んで推論の際に活用できます。
今回のサンプルプロジェクトでは、下記のスキルを使っています。

 ドキュメント作成に関するスキル



スキル名
役割




prd-writing
PRD（product-requirements.md）を作成する


domain-model
ドメインモデル図（domain-model.mmd）を生成する


er-diagram
ER図（ER.mmd）を生成する


object-diagram
オブジェクト図（object-diagram.mmd）を生成する


usecase-diagram
ユースケース図（usecase.mmd）を生成する




 開発・実装に関するスキル



スキル名
役割




steering
ステアリングファイルの作成・実装・振り返りを管理する


development-guidelines
クリーンアーキテクチャ×DDDの実装ガイドラインを提供する


tdd
Red→Green→RefactorサイクルでTDDを進める


test-writing
価値あるテストの4本柱に基づいたテストコード作成ガイドラインを提供する


laravel-migrate
ER図からLaravelマイグレーションファイルを作成・実行する


laravel-module
nwidart/laravel-modulesで新しいモジュールを作成する




 ユビキタス言語に関するスキル



スキル名
役割




ubiquitous-language
ユビキタス言語集から用語を検索・一覧表示する


resolve-subdomain
サブドメイン名（日本語/英語）を名前解決する（内部共通処理）



テスト駆動開発を行うtddスキルのSKILL.mdを下記に記載します。
---
name: tdd
argument-hint: "[サブドメイン名] [実装対象のファイルパスまたはクラス名]"
description: テスト駆動開発（TDD）のガイドライン。Red→Green→Refactorサイクルに従い、test-writingスキルを使ってテストを先に書き、実装を進めます。
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Agent, Skill
---

# TDD（テスト駆動開発）スキル

Red → Green → Refactor サイクルに従って実装を進めます。
テストコードは `test-writing` スキル、プロダクションコードは `development-guidelines` スキルのガイドラインに従います。

---

## 起動時の処理

1. `$1`（ビジネスサブドメイン名）が空なら確認する
2. `$2`（実装対象のファイルパスまたはクラス名）が空なら確認する

---

## TDDサイクル

### 🔴 Red

1. `Skill('test-writing', '<サブドメイン名> <実装対象>')` を呼び出してテストを作成する
2. テストを実行して失敗を確認する
   ```
   Agent(subagent_type='test-runner', prompt='path:Modules/<英語名>/tests/Unit/...')
   ```
   **重要**: パスは `Modules/` から始める。`src/Modules/` は誤り（`src/` 不要）。

### 🟢 Green

1. `Skill('development-guidelines')` を呼び出し、実装方針を確認する
2. テストを通す最小限の実装をする
3. 対象テストの成功を確認する
   ```
   Agent(subagent_type='test-runner', prompt='path:Modules/<英語名>/tests/Unit/...')
   ```
   **重要**: パスは `Modules/` から始める。`src/Modules/` は誤り（`src/` 不要）。
4. 既存の単体テスト全体でデグレがないことを確認する
   ```
   Agent(subagent_type='test-runner', prompt='<サブドメイン名> unit')
   ```

### 🔵 Refactor

1. コードを改善する
2. 全単体テストの通過を確認する
   ```
   Agent(subagent_type='test-runner', prompt='<サブドメイン名> unit')
   ```
上記のSKILL.mdを作成した際に、Claude Codeの指示追従性を高めるために意識したポイントを下記にまとめます。

 任意の引数をスキルに渡せる
スキルを実行する際、任意の引数を渡してSKILL.md内で動的に利用することができます。
# tdd サブドメイン名 実装対象のクラス名
tdd 顧客管理 UserProfile
渡された引数は、SKILL.md 内で $1 や $2 と記述することで呼び出せます。
上記の実行例の場合、それぞれ以下のように代入されます。


$1 ＝ 顧客管理

$2 ＝ UserProfile

また、ファイルの先頭にある YAML フロントマターに argument-hint を定義することで、どのような引数を渡すべきかの説明（ヒント）を記載できます。
---
# $1が「サブドメイン名」、$2が「実装対象のファイルパスまたはクラス名」となる場合
argument-hint: "[サブドメイン名] [実装対象のファイルパスまたはクラス名]"
---

 SKILL.mdから他のスキルを明示的に呼び出せる
SKILL.md の記述内で、以下のような構文を使うことで、他のスキルを明示的に呼び出すことができます。
`Skill('呼び出したいスキル名', 'スキルに渡す引数')`
tddスキルの場合は、下記のように明示的に呼び出せます。
`Skill('test-writing', '<サブドメイン名> <実装対象>')`
通常、Claude Codeは状況に応じて自律的に適切なスキルを選択・使用します。しかし、上記のように構文を用いて明示的に指定することで、Claude Codeはこれを「厳密に従うべき強い命令」として認識します。これにより、AIの推論による出力のブレが抑制され、自分の意図・指示通りに Claude Codeを動かせる可能性が高まります。

 SKILL.mdからサブエージェントを明示的に呼び出せる
スキルと同様に、SKILL.md の記述内から「サブエージェント」を明示的に呼び出すことも可能です。構文を下記に記載します。
※ サブエージェント自体の詳細や役割については、後続のセクションで解説します。
Agent(subagent_type='呼び出したいサブエージェント名', prompt='具体的な指示')
test-runnerサブエージェントの場合、下記のように呼び出せます。
Agent(subagent_type='test-runner', prompt='<サブドメイン名> unit')
Claude Codeの場合、サブエージェントもスキルと同じく明示的に呼び出さなくてもClaude Codeが状況に合わせて適切なサブエージェントを自動的に判断して使用してくれます。しかし、上記のように明示的に呼び出すことで、出力のブレを抑えることができ、自分の指示通りにClaude Codeが動いてくれる可能性が高まります。

 スキルの責務分離
上記のtdd スキルはテスト駆動開発を実行する役割を持ちますが、テストの具体的な作成手順はあえて tdd スキル内には記述していません。テストの作成に関するルールや知識は全てtest-writing スキルに記述しています。


test-writingスキル: テストの作成に関するルールや知識をすべてここに集約する。

tddスキル: 自身でテストの書き方を持たず、テストを実装する際は test-writing スキルを参照して実行する。

このように、スキルの責務に基づいてドキュメントの記載内容を明確に分離することには、以下の強力なメリットがあります。


スキルの保守性の向上
テストの書き方など、特定のテーマに関する情報が複数のスキルに散らばるのを防ぎ、一箇所で管理・更新できるようになります。

ドキュメント間の矛盾を防ぐ
情報が一元化されるため、「Aのスキルにはこう書いてあるが、Bのスキルには違うことが書いてある」といった、AIを混乱させる指示の矛盾が発生しなくなります。

指示追従性の向上
情報が整理され、矛盾のない明確な指示が与えられることで、Claude Codeが迷わず指示通りに動いてくれる可能性が大幅に向上します。


 スラッシュコマンド
よく実行する一連の作業を、抜け漏れなく一貫した方法でClaude Codeに作業してもらいたいときに、スラッシュコマンドを活用できます。
今回のサンプルプロジェクトで使っているスラッシュコマンドを下記に記載します。



コマンド名
目的




/create-docs <サブドメイン名>
ドキュメント一式（PRD・ドメインモデル図・ER図など）を生成する


/implement <サブドメイン名> <内容>
ステアリング作成からTDD実装までを実行する



implementスラッシュコマンドを下記に記載します。
引数として渡されたビジネスサブドメイン名と実装内容（$ARGUMENTS）を対象に、以下の手順を順番に実行してください。

引数: $ARGUMENTS
※ 形式: `[サブドメイン名] [実装をしたい部分の文章]`（例: `会議室管理 ドメイン層を実装して`）

引数が不足している場合は、不足している情報をユーザーに質問してから開始してください。

---

## ステップ1: モジュール作成（laravel-module）

`laravel-module`スキルを実行する。引数にはサブドメイン名（$ARGUMENTSの最初の部分）を渡す。

- モジュールがすでに存在する場合はスキップしてステップ2へ進む
- 作成完了後、ステップ2へ進む

---

## ステップ2: 作業計画（steering モード1）

`steering`スキルをモード1で実行する。引数に「$ARGUMENTS」をそのまま渡す（サブドメイン名と実装内容の両方）。

ステアリングファイル（requirements.md, design.md, tasklist.md）が作成されたら、ユーザーに確認を求める。

**【レビュー】ステップ2完了後、以下の選択肢をユーザーに提示して入力を待つ:**

```
✅ ステップ2「作業計画」が完了しました。

次のアクションを選択してください:

1. 次のステップへ進む（ステップ3: 実装開始）
2. 計画内容を修正する　→ 修正内容を入力してください
3. 作業を中止する
```

- **1** を選択 → ステップ3へ進む
- **2** を選択 → ユーザーの修正指示を受け取り修正後、再度このレビューを提示する
- **3** を選択 → 作業を終了する

---

## ステップ3: 実装（steering モード2）

`steering`スキルをモード2で実行する。tasklist.md に従って実装を進め、完了したタスクを随時更新する。

実装が完了したら次のステップへ進む。

---

## ステップ4: テスト実行（全テスト）

`test-runner`サブエージェントを使って、すべてのテスト（単体・統合・feature）を実行する。

- テストがすべて**成功**した場合 → ステップ6へ進む
- テストが**失敗**した場合 → ステップ5へ進む

---

## ステップ5: テスト失敗時の修正

失敗しているテストを分析し、原因を特定して修正する。

修正後、再度`test-runner`サブエージェントを使ってすべてのテストを実行する。

- テストがすべて**成功**した場合 → ステップ6へ進む
- テストがまだ**失敗**している場合 → ステップ5を繰り返す（すべてのテストが通るまで）

---

## ステップ6: コードレビュー

`code-reviewer`サブエージェントを使って、実装コードをレビューする。

レビュー結果を確認し、**最重要**（Critical）と判定された指摘事項は必ず修正する。

修正が完了したらステップ7へ進む。

---

## ステップ7: 静的解析（PHPStan）

`phpstan-analyser`サブエージェントを使って、静的解析を実行する。

- 解析が**成功**（エラーなし）した場合 → ステップ9へ進む
- 解析が**失敗**（エラーあり）した場合 → ステップ8へ進む

---

## ステップ8: 静的解析エラーの修正

PHPStanのエラーを分析し、原因を特定して修正する。

修正後、再度`phpstan-analyser`サブエージェントを使って静的解析を実行する。

- 解析が**成功**した場合 → ステップ9へ進む
- 解析がまだ**失敗**している場合 → ステップ8を繰り返す（エラーがなくなるまで）

---

## ステップ9: 最終テスト実行

再度`test-runner`サブエージェントを使って、すべてのテスト（単体・統合・feature）を実行する。

- テストがすべて**成功**した場合 → ステップ10へ進む
- テストが**失敗**した場合 → テストが通るまで修正を繰り返し、成功後にステップ10へ進む

---

## ステップ10: 振り返り（steering モード3）

`steering`スキルをモード3で実行する。今回の作業の振り返りを行う。

---

## ステップ11: 終了

すべての作業が完了した旨をユーザーに報告して終了する。

```
✅ すべての作業が完了しました。

実施内容:
- モジュール作成
- 作業計画の作成
- 実装
- テスト（全件通過）
- コードレビューと修正
- 静的解析（PHPStan）と修正
- 振り返り
```

---

## 注意事項

- 各ステップは順番に実行すること
- テストはすべて通過するまでステップを先へ進めないこと
- コードレビューの最重要指摘は必ず修正すること
- 静的解析のエラーはすべて解消するまでステップを先へ進めないこと
- `steering`スキルの各モードの指示に従い、tasklist.md を随時更新すること
implement スラッシュコマンドでは、下記の手順で実装を行います。


モジュール作成 — laravel-module スキルでモジュールを作成（既存の場合はスキップ）

作業計画 — steering モード1で requirements.md / design.md / tasklist.md を作成し、ユーザーにレビューを求める

実装 — steering モード2で tasklist.md に従い実装を進める

全テスト実行 — test-runner で全テストを実行

テスト失敗時の修正 — 失敗原因を修正し、全テストが通るまで繰り返す

コードレビュー — code-reviewer でレビューし、Critical 指摘を必ず修正する

静的解析（PHPStan） — phpstan-analyser で解析を実行

静的解析エラーの修正 — エラーを修正し、エラーがなくなるまで繰り返す

最終テスト実行 — 再度全テストを実行し、全件通過を確認

振り返り — steering モード3で振り返りを実施

終了 — 完了をユーザーに報告

上記のような複雑な実装手順を implement という一つのスラッシュコマンドとして定義することで、下記のような利点が得られます。


ワークフローの強制
実装を行う際に必ずこのコマンドを使用することで、Claude Code に「計画 → 実装 → テスト → レビュー」という一連の正しい手順を強制的に守らせることができます。

指示追従性の大幅な向上
ステップごとの条件（「Criticalな指摘は必ず直す」「エラーがなくなるまで繰り返す」など）が明確になるため、途中でAIが手順を飛ばしたり、独自の判断で終了してしまったりするのを防ぎ、指示通りの成果物を安定して出力できるようになります。


 コンテキストウィンドウの課題
会話履歴、ソースコード、ファイルの内容、ツールの実行結果など、AIとのやり取りに関する全データをまとめて「コンテキスト」と呼びます。そして、そのコンテキストを保持しておけるデータ容量の限界を「コンテキストウィンドウ」と呼びます。
Claude Codeを継続的に利用するうえで、このコンテキストウィンドウには大きく分けて2つの課題があります。

 1. 自動圧縮による「過去の指示の忘却」
ファイルの読み取り内容やコマンドの実行結果など、Claude Codeとやり取りした情報は、すべてコンテキストウィンドウに蓄積されていきます。
しかし、コンテキストウィンドウの容量には上限があります。やり取りを重ねて容量が一杯になると、古いコンテキストはシステムによって自動的に圧縮され、コンパクトに要約されます。この要約の過程で詳細なデータが抜け落ちてしまい、過去に与えた重要な指示や前提条件をClaude Codeが忘れてしまうという問題が発生します。

 2. コンテキストロット
「コンテキストロット（Context Rot）」とは、保持する情報量が多くなるにつれてAIの推論性能が低下してしまう現象です。
Claude Codeは、コンテキストウィンドウ内にあるすべての情報を総合して推論を行います。そのため、やり取りが長引いてウィンドウ内に情報が溢れかえると、AIがどの情報に焦点を当てるべきか迷ってしまい、結果として回答の精度や品質が下がってしまう問題があります。
上記のような「過去の指示の忘却」や「コンテキストロット」を防ぎ、Claude Codeのパフォーマンスを最大限に引き出すためには、コンテキストウィンドウを戦略的に管理していくことが不可欠です。有効な戦略として、以下の3つが挙げられます。

サブエージェントの活用

段階的開示[1]


構造化ノート[2]


ここからは、それぞれの戦略の具体的な仕組みやメリットについて、今回作成したサンプルプロジェクトを例に挙げて解説していきます。

 サブエージェント
サブエージェントは、特定のタスクを別の「子エージェント」に委譲することで、メイン（親エージェント）のコンテキスト容量が圧迫されるのを防ぐ戦略です。
例えば、プログラムの自動テストを実行して失敗した場合、画面には膨大なエラーログやスタックトレースが出力されます。これをそのままメインのAIで実行してしまうと、それらのテキストがすべてコンテキストウィンドウに追加され、一気に容量を消費してしまいます。
そこで、このような操作をサブエージェント（子エージェント）に任せます。親エージェントと子エージェントのコンテキストウィンドウは完全に分離されているのが大きな特徴です。子エージェントは、独立した環境でテストを実行し、大量のエラーログを読み込んで原因を調査します。そして、最終的な「要約された調査結果」だけを、非常に少ないトークン数で親エージェントに報告します。

図1: 親エージェントと子エージェントの連携図
サブエージェントを導入するメリットを下記に記載します。


親エージェントのクリーンな状態を維持
大量の情報が親のウィンドウに直接流れ込むのを防ぎます。

忘却・精度低下の防止
容量圧迫を防ぐことで、コンテキストが自動圧縮される頻度を減らし、コンテキストロットを未然に防ぐことができます。

今回のサンプルで使っているサブエージェントを下記の表にまとめます。



サブエージェント名
役割




test-runner
テストを実行し、結果を整形して返す


code-reviewer
実装コード（テストコード含む）をガイドラインに照らしてレビューする


phpstan-analyser
PHPStanで静的解析を実行しエラーを整形して返す


ubiquitous-finder
ユビキタス言語CSVから指定サブドメインの用語を抽出する



例として、phpstan-analyser サブエージェントの例を下記に記載します。
---
name: phpstan-analyser
description: PHPStanで静的解析を実行し、エラーを整形して親エージェントに返すサブエージェント。解析対象はphpstan.neonで定義されたパス（app, Modules/MeetingRoomManagement/app, Modules/ReservationManagement/app）。
model: sonnet
---

# PHPStan 静的解析サブエージェント

PHPStanで静的解析を実行して結果を整形し、親エージェントに返すサブエージェントです。

## 実行手順

### ステップ1: 静的解析の実行

以下のコマンドを実行する:

```bash
cd /var/www/html/src && composer analyse 2>&1
```

コマンドが存在しない場合や実行不可の場合は、以下を返して終了する:

```
[ERROR] PHPStan の実行に失敗しました。composer analyse コマンドが利用できません。
```

### ステップ2: 結果の解析

PHPStan の出力を解析し、以下を抽出する:

- 総エラー数（`Found X error(s)` の行から取得）
- エラーがない場合は `No errors` で成功判定
- 各エラーの情報:
  - ファイルパス（`/var/www/html/src/` プレフィックスは除去してモジュール相対パスで表示）
  - 行番号
  - エラーメッセージ
- PHPStan のレベル（phpstan.neon の `level:` から取得、現在は 6）

### ステップ3: 結果の整形と返却

以下のフォーマットで結果を整形して返す。

---

## 出力フォーマット

```
# PHPStan 静的解析結果

**解析レベル**: 6
**解析対象**:
- app/
- Modules/MeetingRoomManagement/app/
- Modules/ReservationManagement/app/

---

## 結果サマリー

- **ステータス**: ✅ エラーなし  ※または ❌ エラーあり
- **エラー数**: X件

---

## 検出されたエラー（エラーがある場合のみ）

### <モジュール名 or app> — <ファイルパス>:<行番号>

**エラー**: <エラーメッセージ>

---

## 詳細（PHPStan 生ログ）

<PHPStan の出力をそのまま掲載>
```

### 注意事項

- エラーがない場合は「検出されたエラー」セクションを省略する
- ファイルパスは `/var/www/html/src/` を取り除いた相対パスで表示する（例: `Modules/MeetingRoomManagement/app/Domain/MeetingRoom.php:42`）
- エラーをモジュール単位でグループ化して見やすく整理する
  - `app/` 配下: **Laravel Core**
  - `Modules/MeetingRoomManagement/` 配下: **MeetingRoomManagement（会議室管理）**
  - `Modules/ReservationManagement/` 配下: **ReservationManagement（予約管理）**
- 親エージェントへの返答は整形済みのテキストのみとし、余計な前置きは省く
静的解析（PHPStan）を子エージェント側で実行後に、実行結果を分かりやすくフォーマットして親エージェント側に返しています。
このように、大量のファイルを読み込む処理や、自動テストの実行など「膨大なログが出力される可能性のある操作」は、積極的にサブエージェントとして切り出すと非常に効果的だと考えています。

 段階的開示
常にすべての情報をAIに与えるのではなく、状況に応じて詳細な情報を徐々に引き出していくアプローチを「段階的開示」と呼びます。
サンプルプロジェクトで使用している development-guidelines スキルを例に、この段階的開示の仕組みとメリットについてまとめます。

 development-guidelinesスキル
development-guidelinesスキルを下記に示します。
---
name: development-guidelines
argument-hint: "[サブドメイン名]"
description: クリーンアーキテクチャ × DDDの実装ガイドライン。ドメインモデル図に基づいた実装方針・設計原則・パターンを提供します。
allowed-tools: Agent, Read, Glob
---

# DDD 実装ガイドライン スキル

## 起動時の処理

1. 引数 `$1` をビジネスサブドメイン名として扱う。空の場合はユーザーに確認する
2. `resolve-subdomain` スキルでサブドメイン英語名を取得する
3. `docs/<英語名>/domain-model.mmd` を読み込む（**すべての実装の根拠。必ず最初に読む**）
   - ファイルが見つからない場合: `domain-model スキルでドメインモデル図を先に作成してください` と伝える

---

## 常に適用する絶対ルール

どのレイヤーを実装するときも例外なく守る:

- ドメイン層はドメインモデル図に**完全準拠**（図にない概念を追加しない）
- 依存は **外 → 内のみ**（Controller/Infrastructure → UseCase → Domain）

---

## 今やっていることに応じて読むファイル

ドメインモデル図を確認したあと、**今実装する内容に対応するファイルだけを読む**。

| 今やっていること | 読むファイル |
|---|---|
| ディレクトリ構成・レイヤーの責務を確認したい | `layer-responsibilities.md` |
| ドメイン層（値オブジェクト・集約・ファクトリ・仕様・リポジトリI/F）を実装する | `ddd-patterns.md` |
| ドメインイベントを実装する | `domain-events.md` |
| ユースケース層を実装する | `design-principles.md` |
| 書き込み操作を含むユースケースを実装する | `transaction.md` |
| 複数集約をまたぐデータ取得を設計する | `cqrs.md` |
| プレゼンテーション層（Controller・Presenter・View）を実装する | `presenter-patterns.md` |
| クラス名・メソッド名・コメントに迷っている | `naming-and-comments.md` |
| 他サブドメインのデータや機能を利用する | `inter-subdomain-communication.md` |
仮に、上記のような「設計ガイドラインの全容」を、システムの基本設定ファイルである CLAUDE.md に直接記載してしまったらどうなるでしょうか。
CLAUDE.md の内容は、Claude Codeとのやり取りにおいて常にコンテキストウィンドウに読み込まれます。そのため、設計ガイドラインが全く必要ない作業（簡単なテキスト修正など）の場面でも、この長文が読み込まれてしまい、コンテキストウィンドウの貴重な容量を無駄に圧迫することになります。
そこで、ガイドラインの内容を CLAUDE.md には記載せず、独立した「スキル」として切り出します。これにより、以下の 3つの段階 に分けて情報を読み込ませることができます。

 1. 概要の読み込み（要否の判断）
まず、スキルの name と description のみが読み込まれます。Claude Codeはこれを見て、「今このスキルの本文を読むべきか？」を判断します。
---
name: development-guidelines
description: クリーンアーキテクチャ × DDDの実装ガイドライン。ドメインモデル図に基づいた実装方針・設計原則・パターンを提供します。
---

 2. スキル本文の読み込み
必要だと判断された場合のみ、スキルの本文（SKILL.md）がコンテキストウィンドウに読み込まれます。

 3. 詳細ドキュメントのピンポイント読み込み
さらに、SKILL.md内に書かれている下記の表に基づき、その時の作業に必要な詳細ドキュメントだけを必要に応じて読み込みます。
## 今やっていることに応じて読むファイル

ドメインモデル図を確認したあと、**今実装する内容に対応するファイルだけを読む**。

| 今やっていること | 読むファイル |
|---|---|
| ディレクトリ構成・レイヤーの責務を確認したい | `layer-responsibilities.md` |
| ドメイン層（値オブジェクト・集約・ファクトリ・仕様・リポジトリI/F）を実装する | `ddd-patterns.md` |
| ドメインイベントを実装する | `domain-events.md` |
| ユースケース層を実装する | `design-principles.md` |
| 書き込み操作を含むユースケースを実装する | `transaction.md` |
| 複数集約をまたぐデータ取得を設計する | `cqrs.md` |
| プレゼンテーション層（Controller・Presenter・View）を実装する | `presenter-patterns.md` |
| クラス名・メソッド名・コメントに迷っている | `naming-and-comments.md` |
| 他サブドメインのデータや機能を利用する | `inter-subdomain-communication.md` |
このように、常にコンテキストウィンドウに読み込む必要のない情報を CLAUDE.md から切り離し、スキル化して「段階的に読み込む」仕組みが段階的開示です。
この考え方を取り入れることで、以下のようなメリットがあります。

一度に大量の情報が読み込まれ、ウィンドウ容量が圧迫されるのを防げる。
容量圧迫による自動圧縮を防ぎ、重要な指示が抜け落ちてしまうのを防げる。
情報過多によるコンテキストロットを軽減できる。

結果として、開発者は自分の意図通りに、より正確にClaude Codeをコントロールできるようになります。

 構造化ノート
コンテキストウィンドウの自動圧縮が起きても、「絶対に失われてほしくない重要な情報」を外部のファイルに記録しておくアプローチを「構造化ノート」と呼びます。
重要な設計方針やタスクの進捗状況を外部ファイルに保存し、Claude Codeに常にそこを参照させる仕組みを作ることで、どれだけ会話が長引いても重要な前提条件やタスクの抜け漏れを防ぐことができます。
今回のサンプルプロジェクトでは、この構造化ノートの戦略を活用した steeringスキル[3]を導入しています。

 構造化ノート戦略に基づくsteeringスキル
steeringスキルは、作業指示単位でドキュメントを作成・追跡し、実装の計画・実行・振り返りを一貫して管理するスキルです。
steeringスキルは、下記の3つのモードに分かれています。

実装計画
実装と進捗管理
振り返り

それぞれのモードについて、スキルの定義ファイルの内容を交えながら解説します。

 1. 実装計画
まずは「実装計画」のモードです。steeringスキルの SKILL.mdから、実装計画に関する部分を抜粋します。
## モード1: ステアリングファイル作成

### 目的
特定のユースケース単位で、小さく実装するためのステアリングファイルを作成します。

### 引数

```
steering [サブドメイン名] [実装をしたい部分の文章]
```

例:
- `steering 会議室管理 ドメイン層を実装して`
- `steering 会議室管理 会議室を登録するユースケース層の処理のみを実装して`
- `steering MeetingRoomManagement 会議室を登録するプレゼンテーション層とインフラ層の処理を実装して`

### 手順

1. **引数の確認**

   - `$1` をビジネスサブドメイン名として扱います。空の場合は以下のように質問してください:
     ```
     ビジネスサブドメイン名を教えてください（例: 予約管理、会議室管理）。
     ```
   - `$2` を実装内容の説明として扱います。空の場合は以下のように質問してください:
     ```
     実装したい内容を教えてください（例: ドメイン層を実装して、会議室を登録するユースケース層の処理のみを実装して）。
     ```

2. **サブドメイン名の解決**

   `resolve-subdomain` スキルを呼び出してビジネスサブドメインの英語名を取得します:

   ```
   Skill("resolve-subdomain", "$1")
   ```

   取得した `<英語名>` を以降のすべてのファイルパスで使用します。

3. **ステアリングディレクトリ名の決定**

   実装内容の説明からkebab-case英語名を導出してディレクトリ名を決定します:
   ```
   現在の日付を取得し、`docs/steering/[YYYYMMDD]-[実装内容を表す英語名]/` の形式でディレクトリを作成
   ```

   導出例:
   - `ドメイン層を実装して` → `implement-domain-layer`
   - `会議室を登録するユースケース層の処理のみを実装して` → `implement-usecase-layer-register-meeting-room`
   - `会議室を登録するプレゼンテーション層とインフラ層の処理を実装して` → `implement-presentation-infra-layer-register-meeting-room`

   ユビキタス言語の英語名に該当するものがあればそれを活用し、実装対象と層が一目でわかる名前にします。

4. **永続ドキュメントの確認**

   `docs/<英語名>/` ディレクトリ配下のすべてのドキュメントを読んで、プロジェクトの方針を理解する。

   特に以下のドキュメントを重点的に確認する:

   - **プロダクト要求定義書**（`product-requirements.md`）: 機能要件・非機能要件・ユースケースの全体像を把握する
   - **ユースケース図**（`usecase.mmd`）: 対象ユースケースのアクターと操作の関係を確認する
   - **ドメインモデル図**（`domain-model.mmd`）: エンティティ・値オブジェクト・集約の構造を確認する

4.5. **development-guidelines スキルの参照（必須）**

   **ステアリングファイルを作成する前に、必ず `development-guidelines` スキルを呼び出して設計ガイドラインを読み込む。**

   ```
   Skill("development-guidelines", "<ビジネスサブドメイン名>")
   ```

   - ディレクトリ構成・命名規則・レイヤー責務・DDDパターンをすべて把握した上でドキュメントを作成する
   - design.md・tasklist.md に記載するクラス名・インターフェース名・ディレクトリパスは、development-guidelines の命名規則に完全に従う

4.6. **test-writing スキルの参照（必須）**

   **ステアリングファイルを作成する前に、必ず `test-writing` スキルを呼び出してテストガイドラインを読み込む。**

   ```
   Skill("test-writing")
   ```

   - `test-writing` スキルに定義されたテストのディレクトリ構成・原則・パターンをすべて把握した上で tasklist.md を作成する
   - テストタスクの記述（配置先ディレクトリ・命名・実装方針）は `test-writing` スキルのガイドラインに完全に従う

5. **テンプレートからファイル作成**

   以下のテンプレートを読み込み、**対象実装内容のスコープに絞って**プレースホルダーを具体的な内容に置き換えてファイルを作成:

   - `.claude/skills/steering/templates/requirements.md` → `docs/steering/[YYYYMMDD]-[実装内容を表す英語名]/requirements.md`
   - `.claude/skills/steering/templates/design.md` → `docs/steering/[YYYYMMDD]-[実装内容を表す英語名]/design.md`
   - `.claude/skills/steering/templates/tasklist.md` → `docs/steering/[YYYYMMDD]-[実装内容を表す英語名]/tasklist.md`

   **スコープの原則（重要）**:
   - 対象はあくまでも `$2` で指定された実装内容のみ
   - 指定された層・範囲のみを実装し、他の層・範囲のタスクは含めない
   - 1回のイテレーションで完結できる小さい粒度にする

6. **tasklist.mdの詳細化**

   requirements.mdとdesign.mdに基づいて、tasklist.mdを詳細化:
   - 各フェーズのタスクを具体的に記述
   - サブタスクも明確に
   - 実装の順序を明記

   **実装計画の原則**:
   - プロダクションコードの実装は必ず `tdd` スキルを使い、テストから先に書く（Red → Green → Refactor）
   - プロダクションコードの設計・実装方針は `development-guidelines` スキルのガイドラインに従う（手順4.5で読み込み済み）
   - tasklist.mdには「テストを書く」タスクと「実装する」タスクを明示的に分けて記載する
   - **テストを実行するタスクは必ず `test-runner` サブエージェントのモード3を使うと明記する**（例: `Agent(test-runner, "path:Modules/<英語名>/tests/Unit/...")` で実行）。パスは `Modules/` から始める（`src/Modules/` は誤り）
   - クラス名・インターフェース名・ディレクトリパスの命名は development-guidelines の命名規則に完全に準拠する（`naming-and-comments.md` 参照）
上記の実装計画の手順を整理すると、以下の流れになります。

ドメインモデル図やユースケース図などのドキュメントを読み込む

development-guidelines スキルを呼んで設計ガイドラインを把握する

test-writing スキルを呼んでテストガイドラインを把握する
1〜3の情報を基に、以下のファイルを生成する


requirements.md（機能概要・受け入れ条件・スコープ外）

design.md（アーキテクチャ・クラス設計・データフロー・テスト戦略）

tasklist.md（フェーズ別チェックリスト ※進捗追跡の主役）



ここでは、最も重要な tasklist.md のテンプレートファイルのみを下記に添付します。このファイルに書かれたタスクリストを忠実に守りながら、次の段階で実装を進めていきます。
# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 実装可能なタスクのみを計画
- 計画段階で「実装可能なタスク」のみをリストアップ
- 「将来やるかもしれないタスク」は含めない
- 「検討中のタスク」は含めない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

### タスクが大きすぎる場合
- タスクを小さなサブタスクに分割
- 分割したサブタスクをこのファイルに追加
- サブタスクを1つずつ完了させる

---

## フェーズ1: {フェーズ名}

- [ ] {タスク1}
  - [ ] {サブタスク1-1}
  - [ ] {サブタスク1-2}

- [ ] {タスク2}
  - [ ] {サブタスク2-1}
  - [ ] {サブタスク2-2}

## フェーズ2: {フェーズ名}

- [ ] {タスク1}
  - [ ] {サブタスク1-1}
  - [ ] {サブタスク1-2}

- [ ] {タスク2}

## フェーズ3: 品質チェックと修正

- [ ] すべてのテストが通ることを確認（**必ず `test-runner` サブエージェントのモード3で実行**）
  - [ ] `Agent(subagent_type="test-runner", prompt="path:<テストファイルパス>")` でテストを実行
- [ ] リントエラーがないことを確認
- [ ] 型エラーがないことを確認
- [ ] ビルドが成功することを確認

## フェーズ4: ドキュメント更新

- [ ] README.md を更新（必要に応じて）
- [ ] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
{YYYY-MM-DD}

### 計画と実績の差分

**計画と異なった点**:
- {計画時には想定していなかった技術的な変更点}
- {実装方針の変更とその理由}

**新たに必要になったタスク**:
- {実装中に追加したタスク}
- {なぜ追加が必要だったか}

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- {タスク名}
  - スキップ理由: {具体的な技術的理由}
  - 代替実装: {何に置き換わったか}

**⚠️ 注意**: 「時間の都合」「難しい」などの理由でスキップしたタスクはここに記載しないこと。全タスク完了が原則。

### 学んだこと

**技術的な学び**:
- {実装を通じて学んだ技術的な知見}
- {新しく使った技術やパターン}

**プロセス上の改善点**:
- {タスク管理で良かった点}
- {ステアリングファイルの活用方法}

### 次回への改善提案
- {次回の機能追加で気をつけること}
- {より効率的な実装方法}
- {タスク計画の改善点}

 2. 実装と進捗管理
「実装計画」のモードで生成したタスクリスト（tasklist.md）を活用し、実際の実装と進捗管理を進めていきます。
steeringスキルのSKILL.mdについて、実装部分のモードのみ抜粋して下記に記載します。
## モード2: 実装（最重要）

### 目的
tasklist.mdに従って実装を進め、**進捗を確実にドキュメントに記録**します。

### 🚨 重要な原則

**MUST（必須）**:
- tasklist.mdを常に開いた状態で実装
- タスク開始時に必ずEditツールで`[ ]`→`[x]`に更新
- タスク完了時に必ずEditツールで完了を記録
- **tasklist.mdの全タスクが完了するまで作業を継続する**
- **テストを書くタスク（Red フェーズ）では必ず `tdd` スキルを呼び出してからテストを書く**（`Skill("tdd", "<サブドメイン名> <実装対象>")` → 内部で `test-writing` スキルが参照され、ガイドラインに従ったテストが書かれる）
- **テストを実行する際は必ず `test-runner` サブエージェントのモード3を使用する**（`Agent(subagent_type="test-runner", prompt="path:Modules/<英語名>/tests/Unit/...")` で呼び出す）。パスは `Modules/` から始める（`src/Modules/` は誤り）
- NEVER: tasklist.mdを更新せずに次のタスクに進まない

**NEVER（禁止）**:
- tasklist.mdを見ずに実装を進める
- TodoWriteツールだけで進捗管理する（TodoWriteは補助、tasklist.mdが正式）
- 複数タスクをまとめて更新する（リアルタイムに更新する）
- **「時間の都合により」「別タスクとして実施予定」などの理由でタスクをスキップする**
- **未完了タスク（`[ ]`）を残したまま作業を終了する**

### 🚨 タスク完全完了の原則

**絶対に守るべきルール**:

1. **tasklist.mdの全タスクが完了するまで作業を継続すること**
   - 全てのタスクが`[x]`になるまで実装を継続
   - 「時間がかかりすぎる」「難しい」などの理由でスキップしない
   - 未完了タスクがある状態で振り返りを書かない

2. **タスクスキップは原則禁止**
   - 「時間の都合により別タスクとして実施予定」は禁止
   - 「実装が複雑すぎるため後回し」は禁止
   - 「難しいから後で」「テストが面倒」などの理由は禁止
   - スキップが許可されるのは技術的な理由のみ（下記参照）

3. **タスクが大きすぎる場合の対処法**
   - タスクを小さなサブタスクに分割する
   - 分割したサブタスクをtasklist.mdに追加
   - サブタスクを1つずつ完了させる

4. **技術的な理由でタスクが不要になった場合のみスキップ許可**

   以下の技術的理由に該当する場合のみスキップ可能:
   - 実装方針の変更により、機能自体が不要になった
   - アーキテクチャ変更により、別の実装方法に置き換わった
   - 依存関係の変更により、タスクが実行不可能になった
   - 上位の設計変更により、このタスクが無意味になった

   スキップ手順:
   - tasklist.mdに技術的な理由を明記してスキップマークを付ける
   - 例: `- [x] ~~タスク名~~（実装方針変更により不要: アーキテクチャをXからYに変更したため、このレイヤーが不要になった）`
   - 振り返りセクションに変更理由を詳細に記録

5. **未完了タスクが残っている場合のNG例**
   ```markdown
   ## 実装後の振り返り
   **実装しなかったタスク**:
   - テストの実装（時間の都合により別タスクとして実施予定） ❌ 絶対にダメ
   ```

6. **正しい完了の形**
   - 全タスクが`[x]`
   - 振り返りセクションに「実装しなかったタスク」の記述がない
   - 実装方針の変更があれば、その理由が明記されている

### 実装フロー

#### ステップ1: tasklist.mdを読み込む

```
Read('docs/steering/[日付]-[機能名]/tasklist.md')
```

全体のタスク構造を把握し、次に着手すべきタスクを特定する。

#### ステップ2: TodoWriteでタスク管理開始

tasklist.mdの内容に基づいてTodoWriteツールでタスクリストを作成:
- これはClaude Code内部の補助的なメモ
- **tasklist.mdこそが正式なドキュメント**

#### ステップ3: タスクループ（各タスクで繰り返す）

**3-1. 次のタスクを確認**
```
tasklist.mdを読み、次の未完了タスク（`[ ]`）を特定
```

**3-2. タスク開始をtasklist.mdに記録（必須）**
```
Editツールを使って、tasklist.mdの該当行を`[ ]`→`[x]`に更新

例:
old_string: "- [ ] StorageServiceを実装"
new_string: "- [x] StorageServiceを実装"
```

**重要**: Editツールを実行した直後に、更新が成功したことを確認する。

**3-3. TodoWriteでもステータス更新**
```
TodoWriteツールで該当タスクを"in_progress"に変更
```

**3-4. 実装を実行**

タスクの種類によって呼び出すスキルを使い分ける:

- **テストを書くタスク（Red フェーズ）の場合**:
  ```
  Skill("tdd", "<サブドメイン名> <実装対象クラス名>")
  ```
  `tdd` スキルが内部で `test-writing` スキルを呼び出し、ガイドラインに従ったテストを作成する

- **プロダクションコードを書くタスク（Green フェーズ・その他）の場合**:
  ```
  development-guidelines スキルのガイドラインに従って実装
  ```

**3-5. タスク完了をtasklist.mdに記録（必須）**
```
実装完了後、必ずEditツールでtasklist.mdを更新して完了を記録

サブタスクがある場合はサブタスクも個別に更新する
```

**3-6. TodoWriteでもステータス更新**
```
TodoWriteツールで該当タスクを"completed"に変更
```

**3-7. 次のタスクへ**
```
ステップ3-1に戻る
```

#### ステップ4: フェーズ完了時の確認（必須）

各フェーズ（例: フェーズ1、フェーズ2）が完了したら **進捗を確認する**:

1. **tasklist.mdを読み込んで進捗確認**
   ```
   Read('docs/steering/[日付]-[機能名]/tasklist.md')
   ```

2. **完了したタスクを確認**
   - 当フェーズ内のすべてのタスクが`[x]`になっているか
   - 見落としたタスクがないか

#### ステップ4.5: 全タスク完了チェック（必須）

**全フェーズの実装完了後、振り返りを書く前に必ず実行**:

1. **tasklist.mdを読み込む**
   ```
   Read('docs/steering/[日付]-[機能名]/tasklist.md')
   ```

2. **未完了タスク（`[ ]`）がないか確認**
   - 全てのタスクが`[x]`になっているか？
   - 1つでも`[ ]`が残っていないか？

3. **未完了タスクが見つかった場合**

   **❌ やってはいけないこと**:
   - 「時間の都合により別タスクとして実施予定」と振り返りに書く
   - 未完了タスクを無視して次のステップに進む

   **✅ 正しい対処法**:

   **パターンA: タスクを実装する**
   ```
   ステップ3（タスクループ）に戻り、未完了タスクを実装する
   ```

   **パターンB: タスクが大きすぎる場合**
   ```
   1. タスクを小さなサブタスクに分割
   2. tasklist.mdに分割したサブタスクを追加
   3. サブタスクを1つずつ完了させる
   ```

   **パターンC: 技術的な理由でタスクが不要になった場合のみ**

   以下の技術的理由に該当する場合のみスキップ可能:
   - 実装方針の変更により、機能自体が不要になった
   - アーキテクチャ変更により、別の実装方法に置き換わった
   - 依存関係の変更により、タスクが実行不可能になった

   スキップ手順:
   ```
   1. tasklist.mdに技術的な理由を明記:
      「- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由を詳細に記述）」
   2. 振り返りセクションに変更理由を詳細に記録
   3. なぜこのタスクが不要になったのか、何に置き換わったのかを明確に記述
   ```

4. **全タスク完了を確認できた場合のみ次へ**
   ```
   全てのタスクが`[x]`になっていることを確認してからステップ5へ進む
   ```

#### ステップ5: 全タスク完了後

1. **最終確認**
   ```
   Read('docs/steering/[日付]-[機能名]/tasklist.md')
   ```

   すべてのタスクが`[x]`になっていることを確認

2. **振り返りセクションに記録**
   ```
   Editツールでtasklist.mdの「実装後の振り返り」セクションを更新:
   - 実装完了日
   - 計画と実績の差分
   - 学んだこと
   - 次回への改善提案
   ```

### 実装中のセルフチェック

5タスクごとに以下を確認:

- [ ] tasklist.mdを最近更新したか？（最後の更新から5タスク以内）
- [ ] 進捗がドキュメントに反映されているか？（Read toolで確認）
- [ ] ユーザーがtasklist.mdを見て進捗が分かるか？
上記の実装と進捗管理の手順を下記に示します。


タスクの特定: tasklist.md を読み込み、次に着手すべき未完了タスク [ ] を見つけます。

開始の記録: ファイルを編集し、対象タスクを [ ] から [x] に更新して作業の着手を記録します。

実装の実行: 実際のコードを記述します。

テストの実行: 自動テストを走らせ、実装が正しく機能するかを確認します。

完了の記録: 実装とテストが無事に終わったら、ファイルを再度編集してタスクの「完了」状態を確定させます。

次のタスクへ: 残りの未完了タスクに移り、1〜5の手順を繰り返します。

このように、実装の詳細な手順と現在の進捗状況を、すべて外部ファイル（tasklist.md）に記録していくのがポイントです。
Claude Codeが作業の節目ごとにこのファイルを参照する仕組みにすることで、仮に会話が長引いてコンテキストウィンドウが自動圧縮されたとしても、「事前に立てた実装計画」や「今の進捗状況」を忘れてしまうことがありません。
これにより、長期的なタスクであっても途中で迷子にならず、手戻りの少ない一貫したペースで開発を進めることができます。これが「構造化ノート戦略」最大の強みです。

 3. 振り返り
全タスク完了後、tasklist.md の「実装後の振り返り」セクションに以下を記録します。

実装完了日
計画と実績の差分
学んだこと（技術・プロセス）
次回への改善提案

振り返り部分のSKILL.mdを抜粋して下記に記載します。
## モード3: 振り返り

### 目的
実装完了後、tasklist.mdに振り返りを記録します。

### 手順

1. **tasklist.mdを読み込む**
   ```
   Read('docs/steering/[日付]-[機能名]/tasklist.md')
   ```

2. **振り返り内容を作成**
   - 実装完了日
   - 計画と実績の差分（計画と異なった点）
   - 学んだこと（技術的な学び、プロセス上の改善点）
   - 次回への改善提案

3. **Editツールで更新**
   ```
   tasklist.mdの「実装後の振り返り」セクションを更新
   ```

4. **ユーザーに報告**
   ```
   「振り返りをtasklist.mdに記録しました。内容を確認してください。」
   ```
このように振り返りを構造化してドキュメントに残すことで、プロジェクトの文脈や得られた知見が外部ファイルに蓄積されていきます。結果として、次回以降のタスク計画の精度が上がり、Claude Codeとの連携がよりスムーズかつ高度になっていきます。

 まとめ
「AIエージェントにすべてを委ねてシステムを構築する」という実験を通して見えてきたのは、Claude Codeのような強力なツールであっても、ただ丸投げするだけでは期待通りの成果は得られにくいという現実でした。
プロジェクト独自のガイドラインを守り、一貫性のあるコードを生成させるためには、AIが迷わないための「レール」を人間が敷いてあげる必要があります。AIの知能を最大限に引き出すのは、高度なプロンプト以上に、AIが動作するための周辺環境（スキルやサブエージェントなど）をいかに整えるかという点が非常に重要であることが分かりました。
最後に今回学んだことを下記にまとめます。


スキルとスラッシュコマンド
AIの自由度をあえて制限し、一貫した行動パターンを「型」として覚えさせることで、出力のブレを最小限に抑える。

サブエージェントによる分業
メインのコンテキストをクリーンに保つため、汚れ仕事（ログ解析や定型作業）を子エージェントに委譲する。

構造化ノート
AIの「揮発性の高い記憶」を補うための「外部メモリ」としてドキュメントを活用し、長期タスクの完遂率を高める。


脚注


ハーネスエンジニアリング：エージェントファーストの世界における Codex の活用 ↩︎


実践Claude Code入門 ―現場で活用するためのAIコーディングの思考法, P161 ↩︎


実践Claude Code入門 ―現場で活用するためのAIコーディングの思考法 に出てくるsteeringスキルを参考に作成しました。 ↩︎

---

## 35. [データサイエンティストのためのAGENTS.mdとSkills](https://zenn.dev/green_tea/articles/d310e5cf809190)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/6/8
- **AI要約**:
  AIエージェントのコンテキスト肥大化を防ぐディレクトリ構成とファイル分割手法を提示
  AGENTS.mdを「ルーター」として定義し詳細ルールをSkills等に逃がす設計原則を提唱
  GitHub CopilotやClaude Codeの仕様に最適化された最新の命令定義ルールを解説
- **今読む理由**: AI駆動開発プロジェクトにおいて、AIエージェント（Copilot/Claude Code等）に渡すコンテキスト量を削減し、精度向上とトークン消費の最適化を両立する具体的なディレクトリ構成・プロンプト設計を即座に適用できるため。
- **タグ**: #AI駆動開発, #Copilot_Instructions, #AGENTS.md, #コンテキスト管理, #プロンプトエンジニアリング

### 本文
はじめに
2026年現在、多くのエンジニアは GitHub Copilot, Claude Code, Cline, Cursor をはじめとするAIコーディングツールを使っているでしょう。データサイエンティストも例外に漏れず、AIコーディングツールを使っています。
AIコーディングツールの能力を最大限引き出すためには、AIに適切な前提知識を教えてあげることが重要です。本記事では、私が普段の分析業務で AGENTS.md に書いている内容に加え、本記事執筆を良い機会と思って Skills に整理した内容を紹介します。
大きな方針は次の通りです。

全タスクで守ってほしいことは AGENTS.md に薄く書く
作業別の詳しいルールは skills に分ける
プロジェクト固有の情報は docs に分ける
よく使う依頼は prompts にする
本当に守らせたいことは scripts や CI でも検査する





 結論
こちらです。以下ぐだぐだ書かれたものを読むよりも、一旦.githubをそのままご自身のプロジェクトフォルダに置いてその効果をご確認いただく方が早いかもしれません。

.
├── AGENTS.md
├── .github/
│   ├── copilot-instructions.md
│   ├── instructions/
│   │   ├── python.instructions.md
│   │   ├── sql.instructions.md
│   │   ├── notebooks.instructions.md
│   │   ├── docs.instructions.md
│   │   └── data.instructions.md
│   ├── prompts/
│   │   ├── plan-analysis.prompt.md
│   │   ├── review-sql.prompt.md
│   │   ├── run-eda.prompt.md
│   │   ├── run-modeling.prompt.md
│   │   ├── summarize-analysis.prompt.md
│   │   ├── prepare-pr.prompt.md
│   │   └── update-agent-docs.prompt.md
│   └── skills/
│       ├── python-project-ops/
│       │   └── SKILL.md
│       ├── safe-data-handling/
│       │   └── SKILL.md
│       ├── sql-analysis/
│       │   └── SKILL.md
│       ├── python-style/
│       │   └── SKILL.md
│       ├── dataframe-polars/
│       │   └── SKILL.md
│       ├── visualization/
│       │   └── SKILL.md
│       ├── path-and-io/
│       │   └── SKILL.md
│       ├── notebook-workflow/
│       │   └── SKILL.md
│       ├── statistical-ml-review/
│       │   └── SKILL.md
│       └── analysis-reporting/
│           └── SKILL.md
├── docs/
│   └── agent/
│       ├── project-overview.md
│       ├── repository-structure.md
│       ├── data-catalog.md
│       ├── metrics-and-definitions.md
│       ├── analysis-workflow.md
│       ├── statistical-and-ml-guidelines.md
│       ├── validation-and-testing.md
│       ├── reporting-guidelines.md
│       ├── security-and-privacy.md
│       └── agent-behavior.md
├── scripts/
│   ├── check_no_raw_data_commit.py
│   ├── check_no_sensitive_patterns.py
│   ├── run_quality_checks.sh
│   └── validate_agent_docs.py
└── src/
AGENTS.md は秘伝のタレ[1]のようにするのではなく、各種ルールへのルーターにします。



ファイル・ディレクトリ
役割




.github/copilot-instructions.md
Copilot に常に読ませたい最小限の共通方針


AGENTS.md
AI エージェント向けのルーター


.github/instructions/*.instructions.md
Python, SQL, notebook など、パス別に効かせる指示


.github/skills/*/SKILL.md
SQL、Polars、可視化、データ保護などの作業別手順


.github/prompts/*.prompt.md
分析計画、SQL レビュー、結果要約などの再利用プロンプト


docs/agent/*
プロジェクト固有の知識、データ定義、指標定義など


scripts/*
AI にお願いするのではなく機械的に検査したいもの[2]




GitHub Copilot の場合、repository-wide instructions[3] は .github/copilot-instructions.md、path-specific instructions[4] は .github/instructions/*.instructions.md、agent instructions[5] は AGENTS.md に置けます[6]。また、agent skills は .github/skills/<skill-name>/SKILL.md のように置けます[7]。Prompt files は .github/prompts/*.prompt.md に置くと、VS Code などから再利用しやすくなります[8]。


 なぜ全部 AGENTS.md に書かないのか
当初私はそんなにAIに守らせたいルールがたくさんなかったので、最初は AGENTS.md に全部書けばよいと思っていました。
実際、Python の実行コマンド、SQL の書き方、docstring の書き方、データの扱い、Polars のルール、Matplotlib のルール、ファイルパスのルールなどを全部 AGENTS.md に書いておけば、AI はそれなりに従ってくれます。
ただ、やっているうちに以下のような問題が出てきます。

関係ない知識を読み込んでしまう（SQL を書かない作業でも SQL の長いルールを読ませることになる）

AGENTS.md が長くなり、人間が読まなくなる/メンテしなくなる
プロジェクト固有の知識と全プロジェクト共通のルールが混ざる
似たような指示が増えて矛盾しやすくなる

特にデータサイエンスのプロジェクトは、コードだけでなくデータ、指標定義、SQL、notebook、可視化、分析レポートまで扱います。全部を 1 ファイルに入れると、すぐに巨大化します。
なので、私は結論のように分けるのが良いと思っています[9]。
特に2026年6月に GitHub Copilotは Premium Requests 制（呼び出す回数に上限がある）から、GitHub AI Credits制（使えるトークン数に上限がある）へ移行しましたので、尚更コンテキストの管理はシビアになってきます。Claude Code など他のツールも大概がトークンベースです。


 まずは AGENTS.md を薄く作る
AGENTS.md はこのくらいにします。ここに詳細ルールを全部書かないのがポイントです。
AGENTS.md の例
AGENTS.md
# AGENTS.md

This file is an **agent router**. It provides high-level rules and directs agents to the appropriate skill files for detailed instructions.

Detailed task-specific procedures are in `.github/skills/*/SKILL.md`.
Project-specific context is in `docs/agent/*`.

## Hard Rules (Always Apply)

- Never commit raw data, credentials, API keys, tokens, or customer-level records.
- Never modify, overwrite, delete, or regenerate raw data directly.
- Prefer small, reviewable changes.
- Explain assumptions before non-trivial analytical decisions.
- Ask for clarification when data semantics are unclear.
- Use `uv` exclusively for Python dependency management. Never use pip, conda, poetry, or pipenv.

## Routing Table

| Task | Skill |
|------|-------|
| Dependencies, tests, lint, type check, notebook execution | [python-project-ops](.github/skills/python-project-ops/SKILL.md) |
| Reading / writing / moving data files | [safe-data-handling](.github/skills/safe-data-handling/SKILL.md) + [path-and-io](.github/skills/path-and-io/SKILL.md) |
| Writing or reviewing SQL | [sql-analysis](.github/skills/sql-analysis/SKILL.md) |
| Writing or reviewing Python code | [python-style](.github/skills/python-style/SKILL.md) |
| DataFrame operations | [dataframe-polars](.github/skills/dataframe-polars/SKILL.md) |
| Charts and visualization | [visualization](.github/skills/visualization/SKILL.md) |
| Notebook creation and editing | [notebook-workflow](.github/skills/notebook-workflow/SKILL.md) |
| Statistics or ML | [statistical-ml-review](.github/skills/statistical-ml-review/SKILL.md) |
| Analysis summaries and reports | [analysis-reporting](.github/skills/analysis-reporting/SKILL.md) |
| File paths and I/O | [path-and-io](.github/skills/path-and-io/SKILL.md) |

## Project Context (docs/agent)

| Document | Purpose |
|----------|---------|
| [project-overview.md](docs/agent/project-overview.md) | プロジェクトの目的とスコープ |
| [repository-structure.md](docs/agent/repository-structure.md) | ディレクトリ構成 |
| [data-catalog.md](docs/agent/data-catalog.md) | データセット一覧と定義 |
| [metrics-and-definitions.md](docs/agent/metrics-and-definitions.md) | 指標定義 |
| [analysis-workflow.md](docs/agent/analysis-workflow.md) | 分析ワークフロー |
| [statistical-and-ml-guidelines.md](docs/agent/statistical-and-ml-guidelines.md) | 統計・MLガイドライン |
| [validation-and-testing.md](docs/agent/validation-and-testing.md) | テスト・検証方針 |
| [reporting-guidelines.md](docs/agent/reporting-guidelines.md) | 報告テンプレート |
| [security-and-privacy.md](docs/agent/security-and-privacy.md) | セキュリティ・プライバシー |
| [agent-behavior.md](docs/agent/agent-behavior.md) | エージェント行動指針 |


最低限にしたつもりですが、気になる点があれば教えてください。

 .github/copilot-instructions.md に書くこと
GitHub Copilot を使うなら、AGENTS.md だけでなく .github/copilot-instructions.md も置いておくとよいです。
ここにはほぼ全タスクで効かせたいことだけを書きます。これも長くしません。
.github/copilot-instructions.md の例

.github/copilot-instructions.md
# Repository-Wide Custom Instructions

This is a **Python 3.11 data science / analysis project**.

## Package Management

- Use **uv** exclusively for all dependency management.
- Never use pip, pip3, `python -m pip`, poetry, conda, pipenv, or easy_install.

## Data Safety

- Never commit raw data, credentials, API keys, tokens, or customer-level records.
- Never modify or delete raw data directly.
- Treat `data/raw` and `data/external` as immutable.

## Where to Find Detailed Rules

- **Task-specific skills**: `.github/skills/*/SKILL.md` — see `AGENTS.md` for routing.
- **Project context**: `docs/agent/*` — data catalog, metrics, workflow, etc.
- **Path-specific hints**: `.github/instructions/*.instructions.md`

## Common Commands

```bash
uv sync
uv run pytest
uv run ruff check .
uv run ruff format .
uv run mypy src
uv run python scripts/check_no_raw_data_commit.py
uv run python scripts/check_no_sensitive_patterns.py



 Key Conventions

DataFrame operations: prefer polars over pandas.
Visualization: use fig, ax = plt.subplots(...), not plt.figure(...).
File paths: use pathlib.Path, no absolute local paths.
Docstrings: Google-style.
Inline comments: Japanese.
Reports and documentation: Japanese.


copilot-instructions.md は、毎回 Copilot に渡されても困らないくらいの量にしておくのが良さそうです。

 全プロジェクト共通
プロジェクトごとに設定する項目と、分析プロジェクトなら必ず設定しているものとがあります。まずは Python を用いた分析なら絶対に指定しているものから紹介します。
ただし、ここから先は基本的に AGENTS.md へ直接書くのではなく、skills に分けます。

 環境構築・実行コマンド
Python のバージョン指定や、ruff[10] や uv[11] の使い方を教えています。私や私の所属する組織では、Python のパッケージ管理では uv を使うことにしているので、uv 以外絶対に[12]使ってほしくないです。
これは AGENTS.md に長々と書くのではなく、必要な時に読んでくれればよいので、.github/skills/python-project-ops/SKILL.md に書きます。

.github/skills/python-project-ops/SKILL.md
.github/skills/python-project-ops/SKILL.md
---
name: python-project-ops
description: Use this when managing Python dependencies with uv, running tests with pytest, linting with ruff, formatting code, type checking with mypy, or executing notebooks.
---

# Skill: Python Project Operations

Use this skill when changing dependencies, running tests, linting, formatting, type checking, or executing notebooks.

## Package Manager: uv Only

- Use `uv` for all dependency installation, synchronization, addition, removal, and updates.
- **Never** use pip, pip3, `python -m pip`, poetry, conda, pipenv, or easy_install.
- **Never** manually create or edit `requirements.txt`.
- Use `uv add <package>` when adding dependencies.
- Use `uv add --group dev <package>` for dev-only dependencies.
- Review diffs in `pyproject.toml` and `uv.lock` after dependency changes.

## Python Version

- Python 3.11.

## Common Commands

```bash
uv sync                    # Install/synchronize dependencies
uv run pytest              # Run tests
uv run ruff check .        # Lint
uv run ruff format .       # Format
uv run mypy src            # Type check
uv run papermill notebooks/input.ipynb notebooks/output.ipynb  # Execute notebook
bash scripts/run_quality_checks.sh  # Run all quality checks

## Workflow

1. After modifying `pyproject.toml`, run `uv sync`.
2. After adding code, run `uv run ruff check .` and `uv run ruff format .`.
3. Before committing, run `uv run pytest` and `uv run mypy src`.
4. For notebook execution in CI or automation, prefer `papermill`.






 データ取り扱いルール
大切なデータを勝手にあれこれされてはたまったものではありません。個人的にはまだ一度も AI にデータに関して「悪さ」をされた経験はなかったのですが、お守りと思って書いています。もちろんこの skill を過信せず、修正履歴は目視確認しましょう。
これは AGENTS.md にも最低限残しつつ、詳しくは .github/skills/safe-data-handling/SKILL.md に置きます。

.github/skills/safe-data-handling/SKILL.md
.github/skills/safe-data-handling/SKILL.md
---
name: safe-data-handling
description: Use this when reading, writing, moving, copying, modifying, deleting, or generating data files — including any operation that touches data/raw, data/external, data/interim, data/processed, or outputs directories.
---

# Skill: Safe Data Handling

Use this skill before reading, writing, moving, modifying, deleting, or generating data files.

## Hard Rules

- **Never** commit raw data, credentials, API keys, tokens, or customer-level records.
- **Never** directly modify, overwrite, delete, or regenerate raw data.
- Treat `data/raw/` and `data/external/` as **immutable**.
- Write derived data to `data/interim/`, `data/processed/`, or `outputs/`.
- Before writing output, confirm the target path is **not** under `data/raw/` or `data/external/`.

## Recommended Workflow

1. **Identify** whether input data is raw, external, interim, processed, or output.
2. **Read** raw/external data as immutable input — never modify the source.
3. **Write** generated artifacts to a separate output path (`data/interim/`, `data/processed/`, or `outputs/`).
4. **Summarize** files read and written at the end of the operation.

## Directory Roles

| Directory | Role | Mutable? |
|-----------|------|----------|
| `data/raw/` | Original source data | No |
| `data/external/` | Third-party reference data | No |
| `data/interim/` | Intermediate transforms | Yes |
| `data/processed/` | Final cleaned/derived data | Yes |
| `outputs/` | Figures, tables, reports | Yes |

## PII and Customer-Level Records

- Do not include personally identifiable information (PII) or customer-level records in committed files.
- If analysis requires customer-level data, keep it in `data/raw/` (gitignored) and never commit.
- Aggregated or anonymized outputs are acceptable for `data/processed/` or `outputs/`.
- When in doubt, ask before writing customer-level data to any path.


AGENTS.md だけだと「お願い」ですが、scripts/check_no_raw_data_commit.py や secret scanning （後段で出てきます）と組み合わせるとだいぶ安心できます。

 SQL のルール
SQL に関しては過去、とんでもないものを書かれた経験がありまして、いろいろ書いています[14]。
これも AGENTS.md に全部入れると重いですしSQLを書くときだけで良いので、.github/skills/sql-analysis/SKILL.md に書きます。

.github/skills/sql-analysis/SKILL.md

.github/skills/sql-analysis/SKILL.md
---
name: sql-analysis
description: Use this when writing, reviewing, or modifying SQL queries — including SELECT, CTEs, joins, aggregations, window functions, and validating query correctness or performance.
---

# Skill: SQL Analysis

Use this skill when writing, reviewing, or modifying SQL queries.

## Rules

- Use **explicit column names** — avoid `SELECT *` except for quick exploration.
- Use **CTEs** (Common Table Expressions) for readability and modularity.
- Add **date filters** for large fact tables to limit scan scope.
- Check **join keys** and **join cardinality** before writing joins.
- **Validate row counts** before and after joins to detect fanout or data loss.
- Avoid **implicit cross joins**.
- **Never** run `DROP`, `TRUNCATE`, `DELETE`, or `UPDATE` unless explicitly requested by the user.
- If destructive SQL is requested, propose a dry-run, backup, or transaction strategy first.

## Query Structure

```sql
WITH base AS (
    SELECT
        column_a,
        column_b,
        event_date
    FROM schema.table_name
    WHERE event_date BETWEEN '2024-01-01' AND '2024-01-31'
),
aggregated AS (
    SELECT
        column_a,
        COUNT(*) AS row_count,
        SUM(column_b) AS total_b
    FROM base
    GROUP BY column_a
)
SELECT
    column_a,
    row_count,
    total_b
FROM aggregated
ORDER BY row_count DESC;



 Review Checklist
Before finalizing a query, verify:


 Are grains (unit of analysis per row) clear?

 Are date ranges explicit and appropriate?

 Are NULLs handled (filtered, coalesced, or documented)?

 Are duplicates considered (distinct, dedup logic)?

 Is join cardinality validated (1:1, 1:N, M:N)?

 Are business definitions documented in comments or CTEs?

 Are row counts checked before and after key transformations?

 Is there any risk of implicit cross join?

 Are destructive operations absent or explicitly approved?


SQL は「それっぽいけど間違っている」ものが一番怖いです。集計結果が正しいことを別途確認したり、実行に時間がかかりすぎていないかに気をかけるのも良いですが、SQL 文そのものを見るのも重要です。

 docstring のルール
AI が書いたコードはAIも人間も読むので、私はコメントは充実している方が良いという立場です。Python の関数には必ず docstring をつけるようにしてもらっています。
これも .github/skills/python-style/SKILL.md に書くのが良いでしょう。

.github/skills/python-style/SKILL.md
.github/skills/python-style/SKILL.md
---
name: python-style
description: Use this when creating, editing, or reviewing Python code — including type hints, docstrings, naming conventions, imports, error handling, and code structure.
---

# Skill: Python Style

Use this skill when creating, editing, or reviewing Python code.

## Type Hints

- Add type hints to all public function signatures.
- Use `from __future__ import annotations` when convenient.

## Docstrings

- Use **Google-style** docstrings for all public modules, classes, functions, and methods.
- Docstrings should describe:
  - Purpose
  - Args
  - Returns
  - Raises (if applicable)
  - Examples (when helpful)
  - Important assumptions

## Comments

- **Inline comments and explanatory comments must be written in Japanese.**
- Comments should explain non-obvious intent, assumptions, or business logic.
- Do not comment obvious syntax.

## Code Style

- Prefer small, pure functions where practical.
- Prefer explicit error handling over bare `except`.
- Use `pathlib.Path` for file paths — see [path-and-io skill](../path-and-io/SKILL.md).
- Follow `ruff` linting and formatting rules configured in `pyproject.toml`.

## Example

```python
from pathlib import Path


def load_config(config_path: Path) -> dict:
    """設定ファイルを読み込んで辞書として返す。

    Args:
        config_path: 設定ファイルのパス。

    Returns:
        設定内容を格納した辞書。

    Raises:
        FileNotFoundError: 指定されたパスにファイルが存在しない場合。
    """
    # JSONファイルを読み込む
    import json

    with config_path.open("r", encoding="utf-8") as f:
        return json.load(f)
```



 コメントのルール
日本語で書いてほしいということだけを伝えています。
- Inline comments and explanatory comments must be written in Japanese.
これは python-style skill に入れておけば十分だと思います。


 Pandas の廃止
AI は過去の学習データを見過ぎたせいか、pandas が大好きで、データを与えるとなんでも pandas を使っちゃいます。依存関係以外の理由で未だに pandas を使う理由が思いつきません。極力 Polars を使いましょう。そして、遅延評価は巨大なデータ扱う我々の心強い味方です。
.github/skills/dataframe-polars/SKILL.md
.github/skills/dataframe-polars/SKILL.md
---
name: dataframe-polars
description: Use this when performing DataFrame operations — including loading, filtering, joining, aggregating, transforming, or reshaping tabular data with polars or pandas.
---

# Skill: DataFrame Operations with Polars

Use this skill for DataFrame operations.

## Default: Polars

- Prefer **polars** for all DataFrame work.
- Prefer **LazyFrame** for loading, filtering, joins, aggregations, and transformations.
- Use eager execution when simpler and data is small.

## Pandas: Only When Required

- Use pandas **only** when required by an existing dependency, external library, or legacy code.
- If pandas is needed, keep its usage minimal and convert back to polars as soon as practical.

## Transformations

- Transformations should be reproducible and scriptable.
- Avoid manual, spreadsheet-like edits.
- Document data transformations with comments (in Japanese).

## Examples

### Lazy Scan and Filter

```python
import polars as pl

# Parquetファイルを遅延読み込み
lf = pl.scan_parquet("data/raw/events.parquet")

# 日付フィルタと列選択
result = (
    lf.filter(pl.col("event_date") >= "2024-01-01")
    .select(["user_id", "event_type", "event_date"])
    .collect()
)
```

### Group By and Aggregation

```python
# ユーザーごとのイベント数を集計
summary = (
    lf.group_by("user_id")
    .agg(
        pl.col("event_type").count().alias("event_count"),
        pl.col("event_date").max().alias("last_event"),
    )
    .collect()
)
```

### Safe Join with Row Count Check

```python
left = pl.scan_parquet("data/processed/users.parquet")
right = pl.scan_parquet("data/processed/orders.parquet")

# 結合前の行数を確認
left_count = left.select(pl.len()).collect().item()
right_count = right.select(pl.len()).collect().item()

joined = left.join(right, on="user_id", how="left").collect()

# 結合後の行数を確認（ファンアウトの検出）
assert joined.height >= left_count, "結合で行が減少した"
print(f"left={left_count}, right={right_count}, joined={joined.height}")
```



 可視化のルール
Matplotlib で可視化しようとすると、AI は何故か plt.figure(figsize=(14, 7)) の形式で書きます。可視化は最終的に手で[15]微修正することが多いので[16]、fig, ax = plt.subplots(...) で書いてほしいのです。また、見にくいカラーマップや小さすぎるフォント、日本語フォントの文字化けなんかも人間の手での修正を最小限にしたいので、ルール化しておきます。
可視化の時だけ見れくれればよいので .github/skills/visualization/SKILL.md に書くことになります。
.github/skills/visualization/SKILL.md
.github/skills/visualization/SKILL.md
---
name: visualization
description: Use this when creating, modifying, reviewing, or saving charts, figures, plots, or visual summaries — including matplotlib/seaborn code, EDA figures, report figures, dashboards, or any task involving Japanese chart labels, color palettes, or figure styling.
---

# Skill: Visualization

Use this skill whenever the user asks to:

- Plot, visualize, chart, or graph data.
- Create figures for EDA, reports, dashboards, or presentations.
- Modify or improve existing matplotlib / seaborn code.
- Save figures to disk for reports or notebooks.

## Library

- Use **matplotlib** for charts.
- Use **seaborn** alongside matplotlib for theming, palettes, and statistical plots.

## Global Setup (do this first)

At the start of any notebook or script that produces figures, set the theme once. `font_scale` enlarges all text elements proportionally, so individual `fontsize=` arguments are usually unnecessary.

```python
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_theme(
    style="whitegrid",
    palette="muted",
    font_scale=1.2,
)
```

### Japanese text

If any text (titles, labels, legends, annotations) contains Japanese, configure a CJK-capable font, **otherwise characters render as tofu (□□□)**.

Preferred approach (cross-platform):

```python
import japanize_matplotlib  # pip install japanize-matplotlib
```

Alternative (set an installed CJK font explicitly):

```python
plt.rcParams["font.family"] = "Noto Sans CJK JP"  # or "IPAexGothic", "Hiragino Sans", "Yu Gothic"
```

## Figure Creation

- **Do not** use the stateful `plt.figure(...)` / `plt.plot(...)` style.
- **Always** create figures and axes explicitly, and prefer `constrained_layout=True` over `tight_layout()`:

```python
fig, ax = plt.subplots(figsize=(10, 6), constrained_layout=True)
```

- Use the **object-oriented** API: `ax.set_title()`, `ax.set_xlabel()`, `ax.plot()`, etc.
- `figsize=(10, 6)` is a reasonable default. Adjust to content: wide time series → `(12, 4)`, square scatter → `(6, 6)`, multi-panel → scale up accordingly.

## Color Map / Color Palette

Choose by data type:

- **Categorical**: `"muted"`, `"Set2"`, `"colorblind"` (seaborn palettes).
- **Sequential (continuous)**: `"viridis"`, `"cividis"`, `"mako"` — perceptually uniform.
- **Diverging**: `"coolwarm"`, `"RdBu"`, `"vlag"`.
- **Forbidden**: `"jet"`, `"rainbow"` — not perceptually uniform, poor for colorblind viewers.

## Font Size

`sns.set_theme(font_scale=1.2)` covers most cases. Override per-element **only when needed** (e.g. a long title needs to be smaller, or one label needs emphasis):

```python
ax.set_title("...", fontsize=18)
```

Do **not** repeat `fontsize=` on every call — it is redundant when `font_scale` is set.

## Axis Scale Guidelines

- **Bar charts**: start y-axis at 0 (`ax.set_ylim(bottom=0)`). Truncated bars are misleading.
- **Line / scatter**: do **not** force y-axis to 0 — it can hide meaningful variation. Let matplotlib autoscale, or set limits based on the data range.
- **Log scale**: use `ax.set_yscale("log")` when data spans multiple orders of magnitude.

## Legend

- Use `ax.legend()` only when ≥2 series are plotted.
- If the auto-placement overlaps data, set explicitly: `ax.legend(loc="upper left")` or place outside: `ax.legend(loc="center left", bbox_to_anchor=(1.0, 0.5))`.

## Saving

- Save final figures under `outputs/figures/`. Create the directory if needed:

```python
from pathlib import Path
Path("outputs/figures").mkdir(parents=True, exist_ok=True)
```

- Use descriptive snake_case filenames: `monthly_sales_2024h1.png`, not `fig1.png`.
- DPI guidance:
  - Notebook / README / slides: `dpi=150`
  - Publication / print: `dpi=300`
- Always call `plt.close(fig)` after saving to free memory.

```python
fig.savefig("outputs/figures/monthly_sales.png", dpi=150, bbox_inches="tight")
plt.close(fig)
```

## Chart Quality Checklist

Before finalizing a chart, verify:

- [ ] **Title** clearly describes what the chart shows.
- [ ] **Axis labels** include units where applicable (e.g. "売上 (万円)", "Latency (ms)").
- [ ] **Font sizes** are readable (rely on `font_scale=1.2` as baseline).
- [ ] **Color palette** is perceptually uniform / colorblind-friendly (no jet/rainbow).
- [ ] **Date range** noted in title, subtitle, or annotation when relevant.
- [ ] **Sample / filter note** when data is subsetted (e.g. "n=1,234, 2024年1月〜6月").
- [ ] **Bar charts** start y-axis at 0; other chart types use sensible limits.
- [ ] **Legend** present when multiple series; placement does not overlap data.
- [ ] **Japanese text** renders correctly (japanize-matplotlib or CJK font configured).
- [ ] **Saved** to `outputs/figures/` with descriptive filename, followed by `plt.close(fig)`.

## Example

```python
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
import japanize_matplotlib  # noqa: F401  # 日本語フォント有効化

sns.set_theme(style="whitegrid", palette="muted", font_scale=1.2)

Path("outputs/figures").mkdir(parents=True, exist_ok=True)

fig, ax = plt.subplots(figsize=(10, 6), constrained_layout=True)

ax.bar(categories, values)
ax.set_title("月別売上推移 (2024年1月〜6月)")
ax.set_xlabel("月")
ax.set_ylabel("売上 (万円)")
ax.set_ylim(bottom=0)  # 棒グラフは0起点

fig.savefig("outputs/figures/monthly_sales_2024h1.png", dpi=150, bbox_inches="tight")
plt.close(fig)
```



 ファイルパスのルール
ローカルで分析するとき、データファイルまでのパスを埋め込まれると後々面倒になります。メンテナンスのことも考えると、文字列を使うのではなくpathlib も強要したいところです。
.github/skills/path-and-io/SKILL.md
.github/skills/path-and-io/SKILL.md
---
name: path-and-io
description: Use this when reading from or writing to local files — including constructing file paths with pathlib, creating directories, choosing output locations, and using path utilities from src/analysis_project/paths.py.
---

# Skill: Path and I/O

Use this skill when reading from or writing to local files.

## Rules

- Use `pathlib.Path` for all file path operations.
- **Do not** hard-code absolute local paths.
- Prefer paths relative to repository root or configured directories.
- Use the path utilities in `src/analysis_project/paths.py`.
- **Do not** write outputs into raw data directories (`data/raw/`, `data/external/`).
- Create parent directories explicitly when writing outputs: `path.parent.mkdir(parents=True, exist_ok=True)`.
- Use descriptive file names.
- Include dates or run identifiers when outputs are time-dependent.
- Avoid overwriting existing outputs unless explicitly requested.

## Example

```python
from analysis_project.paths import outputs_dir, ensure_parent_dir

# 出力パスを構成
output_path = outputs_dir() / "tables" / "summary_2024q1.csv"

# 親ディレクトリを作成してから書き込み
ensure_parent_dir(output_path)
df.write_csv(output_path)



 Notebook のルール
私は個人的にあまり使わないのですが、データ分析では notebook を使うことも多いようです。notebook は便利なのですが、AI に任せると（あるいはAIに任せなくても。。。）hidden state[17] だらけになったり、再実行できない notebook ができたりします。他にも、再利用するロジックは src/ に切り出すようなことも指示しています。
使わない人もいると思うので、私は notebook 用の skill として分ければよいのかなと思っています。marimoのような新しい便利な notebook も登場しているので、そちらを使うような指示にしても良いかもしれません。
.github/skills/notebook-workflow/SKILL.md

.github/skills/notebook-workflow/SKILL.md
---
name: notebook-workflow
description: Use this when creating, editing, executing, or reviewing Jupyter notebooks — including cell structure, kernel management, extracting reusable logic to src/, and ensuring notebooks are restartable.
---

# Skill: Notebook Workflow

Use this skill when creating, editing, executing, or reviewing Jupyter notebooks.

## Purpose of Notebooks

- Notebooks are for **exploration and communication**.
- Reusable logic should be extracted to `src/analysis_project/`.

## Rules

- Keep notebooks **restartable from a clean kernel** (Kernel → Restart & Run All must work).
- Avoid hidden state — do not rely on cells being run in a non-linear order.
- Do not include secrets or customer-level records in notebook outputs.
- Prefer saving final charts and tables to `outputs/`.

## Naming Convention



NNN_short_description.ipynb

Example: `001_data_exploration.ipynb`, `002_feature_analysis.ipynb`

## Automation

- Use **papermill** for parameterized notebook execution when automation is needed.

```bash
uv run papermill notebooks/input.ipynb notebooks/output.ipynb -p param_name value


 Structure


Header cell: Title, author, date, objective.

Imports: All imports in the first code cell.

Configuration: Parameters, paths, constants.

Analysis: Exploratory or analytical cells.

Summary: Key findings and next steps.


 Cleanup Before Commit

Clear large outputs that are not essential for review.
Ensure no credentials or PII in cell outputs.
Verify the notebook runs end-to-end with a fresh kernel.



 path-specific instructions も置いておく
Copilot 向けには .github/instructions/*.instructions.md も置けます。これは *.py や *.sql のように、ファイルパスに応じて効かせる指示です。
例えば Python ファイル向けにはこうします。

.github/instructions/python.instructions.md
---
applyTo: "**/*.py"
---
Follow these skills for Python files:
- `.github/skills/python-style/SKILL.md` — type hints, Google-style docstrings, Japanese comments.
- `.github/skills/dataframe-polars/SKILL.md` — prefer polars over pandas.
- `.github/skills/path-and-io/SKILL.md` — use pathlib.Path, no absolute paths.

SQL ファイル向けにはこうします。

.github/instructions/sql.instructions.md
---
applyTo: "**/*.sql"
---
Follow `.github/skills/sql-analysis/SKILL.md` for all SQL files:
- Use explicit column names; avoid SELECT *.
- Use CTEs for readability.
- Add date filters for large tables.
- Validate join cardinality and row counts.
- Never run DROP, TRUNCATE, DELETE, or UPDATE unless explicitly requested.

AGENTS.md はルーター、skills は詳しい手順、path-specific instructions はファイル単位の補助、というイメージです。

 prompts も置いておく
よく使う依頼は .github/prompts/*.prompt.md にしておくと便利です。将来的には[18]、非エンジニアがこの prompts を使って分析を終わらせる日が来るかもしれませんね。
.github/prompts/
├── plan-analysis.prompt.md
├── review-sql.prompt.md
├── run-eda.prompt.md
├── run-modeling.prompt.md
├── summarize-analysis.prompt.md
├── prepare-pr.prompt.md
└── update-agent-docs.prompt.md
例えば分析計画を作る prompt を作りました（plan-analysis.prompt.md）。これは、コードを書き始める前に「目的・データソース・分析単位・主要指標・リスク・検証方法・成果物」を整理した分析計画を日本語で作らせる プロンプトです。docs/agent/ のデータカタログや指標定義を参照させることで、プロジェクト固有の前提を踏まえた計画にしてもらいます。
github/prompts/plan-analysis.prompt.md
.github/prompts/plan-analysis.prompt.md
---
agent "agent"
description: "Create an analysis plan before coding"
---
You are a data science planning assistant. Before writing any code, create a structured analysis plan.

Ask or determine the following:

1. **Objective**: What question are we trying to answer?
2. **Data sources**: What data will be used? (tables, files, APIs)
3. **Unit of analysis**: What does one row represent?
4. **Key metrics**: What metrics will be calculated? How are they defined?
5. **Risks**: What could go wrong? (data quality, leakage, bias, missing data)
6. **Validation**: How will results be validated?
7. **Outputs**: What deliverables are expected? (tables, charts, reports, models)

Format the plan in Japanese. Reference `docs/agent/metrics-and-definitions.md` and `docs/agent/data-catalog.md` for project-specific context.


SQL レビューもよく使います。
sql-analysis skill のチェックリストに沿って SQL をレビューさせる プロンプトです。SELECT *・日付フィルタの欠落・join のカーディナリティ・破壊的操作などを確認し、該当行と修正案を日本語で返してもらいます。
.github/prompts/review-sql.prompt.md
.github/prompts/review-sql.prompt.md
---
agent "agent"
description: "Review SQL for correctness and safety"
---
Review the provided SQL query using the checklist from `.github/skills/sql-analysis/SKILL.md`.

Check for:
- `SELECT *` usage (should use explicit columns)
- Missing date filters on large tables
- Join cardinality issues (1:1, 1:N, M:N)
- Row count validation before and after joins
- Destructive statements (DROP, TRUNCATE, DELETE, UPDATE)
- Unclear metric definitions
- NULL handling
- Duplicate risk
- Implicit cross joins

Provide feedback in Japanese with specific line references and suggested fixes.



 プロジェクトごとに設定するもの
以降はプロジェクトごとに設定するものです。正直反面教師かもしれませんが、短期的な検証プロジェクトなら書かないことも多いです。逆に、複数人でやるテーマや、半年以上やるテーマなら絶対に書きます。
プロジェクト固有の知識は docs/agent/ に分けるのが良さそうです。


 Project overview
プロジェクト開始時に書くべきことのひな型は以下のような感じですかね？正解はないと思いますので、各組織で育てていってみてください。

docs/agent/project-overview.md
# プロジェクト概要

## 目的

<!-- TODO: このプロジェクトが解決しようとしている課題を記述してください -->

## 利用者

<!-- TODO: 分析結果を利用するステークホルダーを記述してください -->

## 意思決定

<!-- TODO: この分析がどのような意思決定に使われるか記述してください -->

## スコープ外

<!-- TODO: このプロジェクトで扱わないことを明記してください -->

## 重要な前提

<!-- TODO: 分析の前提条件を記述してください -->


 Repository structure
これは完全にAIに出力させました。違和感はないと思っています。

docs/agent/repository-structure.md
# リポジトリ構成

各ディレクトリの役割を説明します。

| ディレクトリ | 役割 |
|-------------|------|
| `src/analysis_project/` | 再利用可能なPythonモジュール |
| `notebooks/` | 探索・分析用Jupyter Notebook |
| `scripts/` | CI・検証用スクリプト |
| `tests/` | pytest用テスト |
| `data/raw/` | 元データ（不変・gitignore対象） |
| `data/external/` | 外部データ（不変・gitignore対象） |
| `data/interim/` | 中間加工データ |
| `data/processed/` | 最終加工データ |
| `outputs/figures/` | グラフ・図 |
| `outputs/tables/` | 集計テーブル |
| `outputs/reports/` | レポート |
| `docs/agent/` | エージェント向けプロジェクト文書 |
| `.github/skills/` | 作業別スキルファイル |
| `.github/instructions/` | パス別補助指示 |
| `.github/prompts/` | 再利用プロンプト |


 Data catalog
こういった定義はAIの為だけでなく、人間のためにもかなり有用と思います。

docs/agent/data-catalog.md
# データカタログ

分析で使用するデータセットの一覧です。

## データセット一覧

<!-- TODO: 以下のテンプレートに従ってデータセットを追加してください -->

### データセット名

| 項目 | 内容 |
|------|------|
| パス | `data/raw/xxx.parquet` |
| 粒度 | （例: ユーザー×日） |
| 更新頻度 | （例: 日次、月次、不定期） |
| オーナー | （例: データエンジニアリングチーム） |
| 機密度 | （例: 社内限定、個人情報含む） |
| 注意点 | （例: 2023年以前はスキーマが異なる） |

## カラム定義

<!-- TODO: 主要カラムの定義を記述してください -->

| カラム名 | 型 | 説明 | 備考 |
|---------|-----|------|------|
| `user_id` | string | ユーザー識別子 | |
| `event_date` | date | イベント発生日 | |


 Metrics and definitions
これもプロジェクトの最初に決めるべき事柄ですね。ただ、やっていくうちに変わっていくこともあるので、サボらずにメンテしていくことが重要です。

docs/agent/metrics-and-definitions.md
# 指標定義

分析で使用する主要指標の定義です。

<!-- TODO: プロジェクト固有の指標を追加してください -->

## 指標テンプレート

### 指標名

| 項目 | 内容 |
|------|------|
| 定義 | <!-- 指標の説明 --> |
| 分子 | <!-- 分子の定義 --> |
| 分母 | <!-- 分母の定義 --> |
| 除外条件 | <!-- 除外するケース --> |
| 日付の扱い | <!-- 発生日 or 集計日 or 報告日 --> |
| 粒度 | <!-- 日次、週次、月次 --> |
| 備考 | <!-- 注意点 --> |


 Validation and testing
これは、pytest・ruff・mypy・notebook 検証・データ検証の実行方法と設定の置き場所をまとめたものです。それぞれのコマンドと、pyproject.toml のどのセクションに設定があるかを書いておくことで、AI が設定ファイルを探し回らずに済みます。最後に run_quality_checks.sh で一括実行できるようにしてあるので、コミット前にこれを回す運用にしています。運用回りの話になるので「プロジェクトごとに設定するもの」として扱っています。
docs/agent/validation-and-testing.md
docs/agent/validation-and-testing.md
# テスト・検証方針

## pytest

- テストは `tests/` ディレクトリに配置する
- `uv run pytest` で実行する
- テストは高速に保つ（外部依存を最小限に）

## ruff

- `uv run ruff check .` でリントする
- `uv run ruff format .` でフォーマットする
- 設定は `pyproject.toml` の `[tool.ruff]` セクション

## mypy

- `uv run mypy src` で型チェックする
- 設定は `pyproject.toml` の `[tool.mypy]` セクション

## Notebook検証

- Notebookがクリーンなカーネルから再実行できることを確認する
- 秘密情報がセル出力に含まれていないことを確認する

## データ検証

- `uv run python scripts/check_no_raw_data_commit.py` — rawデータのコミット防止
- `uv run python scripts/check_no_sensitive_patterns.py` — 秘密情報パターンの検出

## エージェント文書検証

- `uv run python scripts/validate_agent_docs.py` — 必須ファイルの存在確認

## 一括実行

```bash
bash scripts/run_quality_checks.sh
```



 Reporting guidelines
ここでは、分析レポートのテンプレートを定義しています。「結論を最初に書く」構成で、背景・目的、データと手法、結果、解釈と提言、制約・注意点、そして再現手順までを型にしています。特に再現手順（入力データ・スクリプト・出力・実行コマンド）を必ず残させるのがポイントで、後から自分や他の人が同じ結果を再現できるようにしています。詳細は analysis-reporting skill 側に置いています。もちろん、組織のルールや好みがかなりあると思うので、どんどん育てていってください。
docs/agent/reporting-guidelines.md
docs/agent/reporting-guidelines.md
# 報告ガイドライン

分析結果の報告テンプレートです。詳細は `.github/skills/analysis-reporting/SKILL.md` を参照してください。

## 報告テンプレート

### タイトル

**分析者**: （名前）
**期間**: YYYY-MM-DD 〜 YYYY-MM-DD
**ステータス**: ドラフト / レビュー中 / 完了

---

### 結論

<!-- 最も重要な発見を最初に書く -->

### 分析の背景と目的

<!-- なぜこの分析を行ったか -->

### データと手法

- **データソース**: <!-- 使用したデータのパスと説明 -->
- **対象期間**: <!-- 分析対象期間 -->
- **サンプルサイズ**: <!-- レコード数 -->
- **手法**: <!-- 使用した分析手法 -->

### 結果

<!-- 事実に基づく結果を記述 -->

### 解釈と提言

<!-- 結果の解釈と推奨アクション -->

### 制約・注意点

<!-- 限界、バイアス、注意すべき点 -->

### 再現手順

- **入力データ**: `data/raw/xxx.parquet`
- **分析スクリプト**: `notebooks/NNN_analysis.ipynb`
- **出力**: `outputs/figures/xxx.png`, `outputs/tables/xxx.csv`
- **実行コマンド**: `uv run papermill notebooks/NNN_analysis.ipynb notebooks/NNN_output.ipynb`



 Security and privacy
これは、raw データ・認証情報・PII の扱いに関するプロジェクト固有のルールをまとめたものです。data/raw と data/external は .gitignore 対象かつ不変、.env はコミットしない（キー名だけ .env.example に置く）、API キーやパスワードをハードコードしない、PII や顧客レベルのレコードはコミットしない、といった事項を明記しています。safe-data-handling skill が「作業手順」なのに対して、こちらは「このプロジェクトでの取り決め」という位置づけです。あわせて検証スクリプトと CI での自動チェックにも触れ、自然言語ベースのお願いで終わらせない構成にしています。
docs/agent/security-and-privacy.md
docs/agent/security-and-privacy.md
# セキュリティ・プライバシー

## Raw Data

- `data/raw/` と `data/external/` は `.gitignore` でコミット対象外にしている。
- これらのディレクトリのデータは不変として扱う。

## Credentials・Secrets

- `.env` ファイルは `.gitignore` でコミット対象外。
- `.env.example` にキー名のみ記載し、実際の値は含めない。
- APIキー、トークン、パスワードをコード中にハードコードしない。
- `python-dotenv` を使って環境変数から読み込む。

## PII・顧客データ

- 個人を特定できる情報（PII）をコミットしない。
- 顧客レベルのレコードをコミットしない。
- 集計・匿名化したデータのみ `data/processed/` や `outputs/` に保存可能。
- 分析結果にも個人が特定されないよう注意する。

## 検証スクリプト

- `scripts/check_no_raw_data_commit.py` — rawデータのコミットを検知する。
- `scripts/check_no_sensitive_patterns.py` — 秘密情報のパターンを検知する。

## CIでの保護

- GitHub Actions CI で上記スクリプトを自動実行し、違反を検知する。



 Agent behavior
最後はやや毛色が違って、AI エージェントそのものに期待するふるまいを定義しています。「小さな差分にする」「仮定を明示する」「危険な操作の前に確認する」「不明点は推測せず質問する」という基本方針に加え、「やるべきこと」「やってはいけないこと」を対比で並べています。skill やルーティングは「どこを見るか」を示すものですが、こちらは「どういう姿勢で動いてほしいか」をまとめた、いわばエージェントの行動規範です。
docs/agent/agent-behavior.md
docs/agent/agent-behavior.md
# エージェント行動指針

AIエージェント（GitHub Copilot等）に期待するふるまいを定義します。

## 基本方針

- **小さな差分**: 変更は小さく、レビュー可能な単位で行う。
- **仮定の明示**: 分析上の仮定は必ず明記する。
- **危険操作前の確認**: データの削除、上書き、破壊的SQL実行の前に確認する。
- **不明点の確認**: データの意味が不明な場合は推測せず質問する。

## やるべきこと

- `AGENTS.md` のルーティングテーブルに従い、適切なskillを参照する。
- `docs/agent/*` のプロジェクト固有文書を参照する。
- コード変更後は `uv run ruff check .` と `uv run pytest` を実行する。
- 分析結果にはデータ期間、フィルタ条件、サンプルサイズを明記する。

## やってはいけないこと

- `data/raw/` や `data/external/` のデータを変更・削除する。
- 秘密情報やPIIをコミットする。
- pip、conda、poetryを使ってパッケージをインストールする。
- `SELECT *` を本番クエリで使う。
- 根拠なくデータの因果関係を主張する。
- 過度に大きな変更を一度に行う。



 本当に守らせたいものは scripts や CI にする
AGENTS.md や skills は便利ですが、あくまで自然言語の「お願い」であり、本当に守らせたいものは、scripts や CI にした方が良いです。
既にもういくつか記事中に登場していますが、例えば以下のようなものです。
scripts/
├── check_no_raw_data_commit.py
├── check_no_sensitive_patterns.py
├── run_quality_checks.sh
└── validate_agent_docs.py
check_no_raw_data_commit.py では、data/raw や data/external に .gitkeep 以外のファイルを入れていないか確認します。
check_no_sensitive_patterns.py では、API key や token っぽい文字列が入っていないか確認します。
validate_agent_docs.py では、AGENTS.md、.github/copilot-instructions.md、.github/skills/*/SKILL.md、docs/agent/* が存在するか確認します。
run_quality_checks.sh では、上記のスクリプトに加え ruff, mypy, pytest をまとめて実行します。
これらを CI で流せば、AI がうっかり変なファイルを追加しても気づきやすくなります。

 小さいプロジェクト/初手ではどこまでやるか
ここまで書くと、ちょっと大げさに見えるかもしれません。
短期の検証プロジェクトなら、最初からすべて全部は必要はないと思っています。例えば、以下のような最低限の構成も考えられます。
.
├── AGENTS.md
├── .github/
│   ├── copilot-instructions.md
│   ├── instructions/
│   │   ├── python.instructions.md
│   │   ├── sql.instructions.md
│   │   ├── notebooks.instructions.md
│   │   ├── docs.instructions.md
│   │   └── data.instructions.md
│   └── skills/
│       ├── python-project-ops/
│       │   └── SKILL.md
│       ├── safe-data-handling/
│       │   └── SKILL.md
│       ├── sql-analysis/
│       │   └── SKILL.md
│       ├── python-style/
│       │   └── SKILL.md
│       ├── dataframe-polars/
│       │   └── SKILL.md
│       ├── visualization/
│       │   └── SKILL.md
│       ├── path-and-io/
│       │   └── SKILL.md
│       └─── notebook-workflow/
│           └── SKILL.md
├── scripts/
│   ├── check_no_raw_data_commit.py
│   ├── check_no_sensitive_patterns.py
│   ├── run_quality_checks.sh
│   └── validate_agent_docs.py
└── docs/
    └── agent/
        ├── data-catalog.md
        └── metrics-and-definitions.md
        
Skills や instructions はほとんど全部入れますが、統計・ML、レポーティングは、プロジェクトが長期化したり、複数人で触るようになってから分けても良いです。
docs/ はプロジェクトの最初に決めるべきことや、引継ぎを想定してデータに関する記述をしっかりしておくと安心です。PR（Pull Request）の際のチェック項目にしておけば属人化して書かれないといった事態も避けられます。

 デモ

kaggleの練習用でも有名なタイタニックデータを利用して、ここで作ったプロジェクトの動作感を確認します。

データはローカルで data/raw/titanic/train.csv に置いておきます。
data/raw は raw data なので、Git 管理には含めません。
ここまでで、AGENTS.md、.github/copilot-instructions.md、.github/skills/*、docs/agent/*、.github/prompts/* を用意しました。
データ分析業務に慣れている人は、ご自身でプロンプトを書いたり、自分が思い描いた方法を指示すれば良いですが、慣れていない人でも、例えば用意したカスタムプロンプトを用いて以下のように指示すればざっくり動いてくれます。
/plan-analysis

dataset_path: data/raw/titanic/train.csv
objective: Titanic passengers の生存要因を可視化し、Survived を予測する簡単なモデルを作る
/run-eda

データは `data/raw/titanic/train.csv` にあります。
/run-modeling

dataset_path: data/raw/titanic/train.csv
target: Survived
task: Predict whether each Titanic passenger survived
/summarize-analysis

topic: Titanic survival analysis demo
output_dir: outputs/
/prepare-pr

 実行結果の概要
上記のプロンプトを順番に実行すると、Copilot は以下のファイルを自動生成しました。
src/analysis_project/
├── eda.py         # EDA 用の集計・可視化関数
├── features.py    # 特徴量エンジニアリング
├── modeling.py    # 前処理パイプライン・モデル定義・評価関数
└── paths.py       # パスユーティリティ（既存）

scripts/
├── run_titanic_eda.py       # EDA 実行スクリプト
└── run_titanic_modeling.py  # モデリング実行スクリプト

tests/
└── test_features.py   # 特徴量エンジニアリングのテスト（15ケース）
人間が書いたのはプロンプトだけです。
以下、生成されたコードと出力を見ながら .github 以下のルールがちゃんと効いているか を確認していきます。

 ルールの効き具合を確認

 可視化ルール（visualization skill）
まず一番わかりやすいのがグラフです。visualization skill には以下のようなルールを書きました。


fig, ax = plt.subplots(...) を使う（plt.figure() は禁止）

font_scale=1.2 でフォントサイズを統一する
日本語フォントを設定する（文字化け防止）
棒グラフは y 軸を 0 起点にする

"muted" パレットを使う（"jet" / "rainbow" は禁止）

constrained_layout=True でレイアウト崩れを防ぐ

dpi=150 で保存する

実際に生成された図を見てみましょう。

このグラフを見ると、以下が確認できます。


日本語のタイトル・軸ラベルが文字化けしていない（「性別ごとの生存率（Titanic）」「生存率」がちゃんと表示されている）

フォントサイズが十分に大きい（font_scale=1.2 が効いている）

y 軸が 0 起点で 1.0 まで（棒グラフのルール通り）

バーの上にサンプルサイズ n=314, n=577 が表示されている（データの信頼度が一目でわかる）

"muted" パレットの落ち着いた色合い

visualization skill を書いていなかったころは、plt.figure(figsize=(14,7)) で作られたり、日本語が □□□ になったり[19]、y 軸が切り詰められたりしていました。毎回手で直すのは面倒なので、skill に書いておく価値があります。
もう少し複雑なグラフも見てみます。

性別×客室クラスのクロス集計です。hue（色分け）にクラスが使われ、凡例も配置されています。visualization skill には「2 系列以上のときは legend を使う」と書きましたが、ちゃんと右上に凡例が出ています。
ヒストグラムも確認します。

生存別の年齢分布では、凡例のラベルが「死亡」「生存」と 日本語 になっています。これは visualization skill と python-style skill（コメントは日本語）の組み合わせで実現されています。ヒストグラムは 0 起点のルールの対象外なので、matplotlib のオートスケールに任せています。

相関行列のヒートマップです。カラーマップに "coolwarm"（ダイバージングパレット）が使われており、visualization skill の「ダイバージング → coolwarm, RdBu, vlag」のルール通りです。annot=True で相関係数が表示されているので、数値も読めます。

 DataFrame ルール（dataframe-polars skill）
生成されたコードでは、すべての集計処理が polars で書かれています。
import polars as pl

df = pl.read_csv(raw_path)

# グループごとの生存率を集計
return (
    df.group_by(list(group_cols))
    .agg(
        pl.len().alias("count"),
        pl.col("Survived").sum().alias("survived"),
        pl.col("Survived").mean().alias("survival_rate"),
    )
    .sort(list(group_cols))
)
pandas が使われているのは sklearn に渡す直前の .to_pandas() 変換のみです。dataframe-polars skill に「pandas は外部ライブラリの要求時のみ使用し、最小限にする」と書きましたが、その通りになっています。

 パス管理ルール（path-and-io skill）
実装の途中に突然ハードコードされた絶対パスは一切なく、すべて pathlib.Path ベースです。
from analysis_project.paths import data_dir, outputs_dir, ensure_parent_dir

raw_path = data_dir() / "raw" / "titanic" / "train.csv"
output_path = outputs_dir() / "tables" / "missing_values.csv"
ensure_parent_dir(output_path)
path-and-io skill に書いた「pathlib.Path を使う」「絶対パスを埋め込まない」「src/analysis_project/paths.py のユーティリティを使う」がすべて守られています。

 Python スタイル（python-style skill）
生成された関数にはすべて Google スタイルの docstring がついており、コメントは日本語です。
def missing_value_summary(df: pl.DataFrame) -> pl.DataFrame:
    """各カラムの欠損値数と欠損率を集計する。

    Args:
        df: 分析対象の DataFrame。

    Returns:
        カラム名・欠損数・欠損率を含む DataFrame。
    """
    total = df.height
    # 各カラムの null 数を集計
    null_counts = [df[col].null_count() for col in df.columns]
    ...
型ヒント（df: pl.DataFrame -> pl.DataFrame）もついています。

 テストと品質チェック（python-project-ops skill）
$ uv run pytest
tests/test_features.py ...............    [78%]
tests/test_paths.py ....              [100%]
19 passed

$ uv run ruff check src/ scripts/
All checks passed!
テストでは敬称抽出、家族サイズ計算、HasCabin フラグ、リーケージ検出、build_features の出力カラム確認など 19 ケースが検証されています。python-project-ops skill に「コード変更後は uv run ruff check . と uv run pytest を実行する」と書きましたが、スクリプト生成後にちゃんと実行しています。

 分析結果
ルールの確認ができたので、分析結果自体も簡単にまとめておきます。

 EDA 結果



属性
カテゴリ
生存率
人数




全体
—
38.4%
891


性別
女性
74.2%
314


性別
男性
18.9%
577


客室クラス
1等
63.0%
216


客室クラス
2等
47.3%
184


客室クラス
3等
24.2%
491




 モデリング結果
使用した特徴量は 11 個で、Pclass, Sex, Age, SibSp, Parch, Fare, Embarked に加え、派生特徴量として FamilySize, IsAlone, HasCabin, Title を追加しています。



モデル
Accuracy
Precision
Recall
F1
AUC




ベースライン（性別のみ）
0.777
0.738
0.652
0.692
0.753


ロジスティック回帰
0.832
0.800
0.754
0.776
0.872


ロジスティック回帰（5-Fold CV）
0.828 ± 0.010
—
—
—
—




左がベースライン、右がロジスティック回帰。ロジスティック回帰では偽陰性（生存者の見逃し）が 24→17 に減少。ここでも日本語タイトルが正しく表示され、フォントサイズも十分。

ROC 曲線の凡例にも日本語が使われている（「ベースライン（性別ベース）」「ロジスティック回帰」）。2 系列以上なので凡例が表示されており、visualization skill 通り。

ロジスティック回帰の係数。正（緑）が生存に寄与、負（赤）が死亡に寄与。x=0 に補助線が引かれている。
特徴量重要度の上位は Title_Master（+1.28）、Title_Mr（-1.27）、Sex_female（+0.81）、Pclass（-0.59）で、EDA で見た「女性と上位クラスの生存率が高い」という知見と整合しています。

 まとめ
「AIにほぼ丸投げ」状態でそれっぽい図やソースコードが得られました。このように、skills を設定しておくことで「pandas で書かれた」「plt.figure() で書かれた」「日本語が □□□ になっている」「raw data を上書きした」「リーケージチェックがない」といった 毎回同じ修正を繰り返す手間 はなくなります。これが、.github 以下を整備する最大のメリットです。
繰り返しになりますが、生成されたコードや分析結果を鵜呑みにせずに、実行者が責任を持って検証しましょう。

 結び
本記事ではデータ分析する上で、AGENTS.md や Skills として設定しておくと便利な項目と具体例を紹介しました。分析スクリプトを書くためのノウハウをこのように「実行可能な形」でドキュメント化できるようになったのはとても大きく、この手の取り組みは組織の分析力の底上げ/効率化につながると確信しています。

脚注


こういった変な比喩を使うのは個人的に好きなのですが、どうしてもAIっぽくなるので使うか毎回迷った挙句使うことにしています。 ↩︎


機械的にできることはできるだけこっちでやる方がよいです。 ↩︎


リポジトリ全体に適用される指示・ルールのことです。 ↩︎


リポジトリ内の特定のパスに一致するファイルのコンテキストで適用される指示のことです。 ↩︎


AI coding agent に対して与える作業ルール・振る舞いの指示です。 ↩︎


github-custom-instructions ↩︎


github-skills ↩︎


github-prompt-files ↩︎


AI コーディングを使い倒している人からすると当たり前かもしれませんが、データサイエンス観点で再整理しました。 ↩︎


Rust で実装された高速に動作する Pythonの linter であり code formatter です。 ↩︎


Rust で実装された高速に動作する Python のパッケージマネージャーです。 ↩︎


絶対ではないです。 ↩︎


Personally Identifiable Information.「個人を特定できる情報」や「個人識別情報」のことです。そもそも組織によっては PII はAIが読みに行ってはいけないルールを課している場合があるので、各自で確認してください。 ↩︎


AI に相談して書いてもらいました。 ↩︎


もちろん図を直接修正するといういみではなく、Python を修正するという意味です。 ↩︎


図を顧客に見せる機会が多いので、注意深く作っています。 ↩︎


「画面上で見えているコードの状態」と「裏側（メモリ上/カーネル）で保持されている変数の状態」が食い違ってしまっている状態のことです。適当にやりたいように notebook を触っているとこのようなことになってしまいます。 ↩︎


いや、もうすでにそういうタイミングなのかもしれません ↩︎


よく豆腐って言いますよね。 ↩︎

---

## 36. [Claude Codeのagents / skills / hooksをどう使い分ける？実プロダクト開発で出した運用ルール](https://zenn.dev/dx_pm_product/articles/claude-code-agents-skills-hooks)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/6/10
- **AI要約**:
  CLAUDE.md、agents、skills、hooksの役割と使い分けを2軸（発火条件・文脈共有）で整理。
  サブエージェントの質問不可という制約に対し、成果物と承認依頼を委譲元に返す明文化ルールで対処。
  hooksを活用し、編集時の軽いコード整形とターン終了時の重い静的解析を最適に連携させて自動化。
- **今読む理由**: AI駆動開発におけるClaude Codeの文脈枯渇を回避する設計原則や、JSON設定およびフック用のスクリプト設計が具体的に明記されており、今すぐ開発自動化パイプラインへ適用可能なため。
- **タグ**: #Claude Code, #AI駆動開発, #自動化パイプライン, #LLMエンジニアリング

### 本文
Claude Codeの運用ルールを整理した記録です。同じように「便利な機能があるのは分かるが、結局どう使い分ければいいのか分からない」と悩んでいる方の参考になればと思い、解説記事としてまとめました。あわせて、自分が後から見返すための備忘も兼ねています。

 前提：何を作りながら試したか
私は今、マインドフルネス瞑想のアプリを開発しています。ストレス・集中力不足・睡眠の問題を抱える20〜40代のビジネスマンを対象に、音声メソッドで日々のコンディションを整えてもらうことを目的としたアプリです。
すでにテスト版を公開しています。下記のQRコード、または以下のリンクからインストールできます。

ダウンロードリンク: https://drive.google.com/uc?export=download&id=1joFibwMbdvWalz2ZISTmfOVuEqs181q5



インストールにあたって、いくつか前提があります。

テスト版であり、無料で公開しています。
Android端末では、インストール時に「提供元不明アプリを許可」する設定が必要になります。
期間限定の公開です。
アプリ内に問い合わせ機能があります。気になるところがあれば、気軽にお寄せください。

この記事で紹介する内容は、そのアプリを実際に開発しながら、Claude Codeの運用をどう組み立てれば開発が速く・安定するかを試行錯誤した結果です。机上の整理ではなく、瞑想アプリという実プロダクトの開発フローに組み込んで使ってみた上での判断であることを、前提として書いておきます。技術スタックはFlutter（Clean Architecture + Riverpod）とSupabaseです。

 きっかけ：評価の高いハーネスを見本にした
Claude Codeを使い込むと、すぐにこの壁にぶつかります。


CLAUDE.md（常時読まれる共通ルール）に色々書きすぎて、肝心なルールが守られない
便利だと言われる skills / agents / hooks があるが、どれをどう使い分けるのか分からない
評価の高い人の設定一式（ハーネス）を真似しようとしても、各部品が密に絡み合っていて、自分のプロジェクトに移植できない

そこで、公開されている評価の高いハーネスエンジニアリングの事例（affaan-m/ecc）を見本に、自分の運用に取り込めるところがないかを探しました。これまで自分は CLAUDE.md と skills 止まりだったので、まだ使えていない agents と hooks を理解して取り込めば伸びしろがあると考えたからです。
ただし、見本一式をそのまま持ち込むのはうまくいきませんでした。各 skill / agent / hook が互いに依存しているため、動かしても何が起きているのか追えず、出てきた成果物が正しいのかも判断できないからです。見本からは構造と考え方だけを借り、中身は自分のアプリに合わせて作り直すという進め方にしました。

 3つの仕組みを簡単に解説する
使い分けの話に入る前に、agents / skills / hooks が「いつ・どう発火するか」と「どんな文脈で動くか」について解説します。使い分けの判断軸は、結局この2点に集約されるからです。



仕組み
実体
いつ発火するか
文脈（コンテキスト）




CLAUDE.md
常時読み込まれるルール文書
常に（毎ターン読まれる）
メインの会話と共有


skill
必要時に読み込む手順書
モデルまたは人が必要と判断して呼んだ時
メインの会話と共有


サブエージェント
独立したClaudeインスタンス（役割定義）
明示的に作業を委譲した時
独立（共有されない）


hook
ハーネスが実行するスクリプト
設定したイベント発生時に必ず（決定論的）
スクリプトの入出力のみ



押さえておきたいのは次の2点です。


CLAUDE.md は「常に効くが薄い」、skill は「呼ばれた時だけ効くが厚い」という関係にあります。重い手順を全部 CLAUDE.md に書くと毎ターンの文脈を圧迫し、肝心な指示がかすみます。逆に「必ず守ってほしい発火条件」を skill だけに書くと、その skill が呼ばれない限り効きません。
サブエージェントだけは文脈が独立しています。メインの会話の情報を引き継がない代わりに、メインの文脈を汚しません。その代わり、ユーザーへの質問（AskUserQuestion）や他のエージェントの起動はできない、という制約があります。

この「発火タイミング」と「文脈が共有か独立か」の2軸が、そのまま使い分けの判断軸になります。

 使い分け1：agents は「役割」を切り出すもの
サブエージェントは、計画する・設計する・実装する・レビューするといった、一つの大きめのタスクを完遂することをゴールに設定する単位です。文脈が独立しているという性質から、切り出す基準は自然に決まります。
第一に、文脈を汚したくない、あるいは余計な文脈を持ち込みたくない作業に向きます。たとえば実装は、PRDと設計情報さえあれば進められる作業で、会話のこまごました経緯は不要です。レビューはむしろ逆で、実装中の「こう直した」という経緯を知っていると、それに引きずられて判断が甘くなりかねません。先入観のない目で見せたいので、独立した文脈で動くサブエージェントが向いています。
第二に、他の役割と依存せずに定義できると、並行起動できて効率が上がります。たとえばコード品質のレビューとセキュリティのレビューは互いに独立しているので、同時に走らせられます。
正直に言うと、agents は導入した瞬間に劇的に変わる類のものではありません。ただ、上の基準（独立した文脈が欲しい・並行できる）で切り出せる作業を見つけて役割として定義していくと、着実に効いてきます。

 サブエージェントの制約への対処
サブエージェントはユーザーに直接質問できません。一方で、瞑想アプリの開発フローには「ユーザーの承認を得てから次へ進む」というゲートを多く設けています。この2つは衝突します。
対処として、承認が必要な作業を任せるエージェントには、本文に「承認を代行せず、成果物と承認依頼を委譲元に返す」という受け渡しのルールを明記しました。実際にテスト駆動実装を担当するエージェントには、次のように書いています。
## 委譲元との受け渡し契約（重要）

あなたはサブエージェントのため、AskUserQuestion を呼べず、他のエージェントも起動できない。
tdd-workflow スキルが「ユーザー承認を得てから次へ進む」と求めるゲート（E2Eテストケース
のレビュー、各テスト種別のケース定義の承認など）では、自分でユーザーに尋ねず、いったん
作業を止めて成果物と承認依頼を委譲元（feature-dev / メインエージェント）に返す。

返却時には以下を明示する:
- 完了した内容と作成/変更したファイル
- 承認が必要な成果物（テストケース文書など）と確認してほしい観点
- 次に進むために必要な判断・未解決のエラー

承認が必要なゲートを独断で通過して実装・テストを進めない。
このように契約を明文化しておくと、サブエージェントの制約と「承認必須」というルールを両立できます。

 使い分け2：skills は「ワークフロー」を固定するもの
skill は、細かく、実施頻度が高く、放っておくとやり方がブレやすいタスクの手順とルールを定義し、再現性高く実行できる状態を作る単位です。
瞑想アプリの開発では、機能開発の流れそのものを skill にしています。冒頭に役割を次のように宣言しています。
このスキルは、PRD参照から実装完了までの開発ワークフローを統括する。
各フェーズの具体的な作業（設計・実装計画・テスト駆動実装）は専用のエージェント・スキルに
委譲し、このスキルはワークフローの進行管理とコアルールの徹底に徹する。
ポイントは、skill 自身は手順を実行せず、各フェーズの実作業（設計・実装・レビュー）はそれぞれ専用のエージェントに委譲している点です。skill は流れの管理と、全フェーズで守るべきコアルール（テスト駆動・セキュリティファースト・実行前に計画・計画更新）の徹底だけを担います。「重い手順は skill、薄い常時ルールは CLAUDE.md」という住み分けがそのまま効いてきます。

 使い分け3：hooks は「決定論的な強制」をかけるもの
hook は、必要なタイミングで100%同じ処理を再現したいときに使います。静的解析やコマンドで書ける処理が対象です。
ここが今回いちばん効きました。毎回必ず通すべき決定論的な処理を、モデルの手順遵守（忘れる余地がある）に頼るのは筋が悪いです。hook に持たせれば、ハーネスが必ず実行するので忘れません。
瞑想アプリでは、静的解析を hook に移しました。登録の設定は次のようになっています。編集のたびに整形し、ターン終了時に解析する、という2段構えです。
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": ".../hooks/format-dart.sh", "timeout": 30 }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": ".../hooks/analyze-flutter.sh", "timeout": 180 }
        ]
      }
    ]
  }
}
PostToolUse（ツール実行後）に登録した整形フックは、編集された .dart ファイルだけを dart format で整形します。軽い処理なので編集のたびに走らせます。重要なのは、ここで「このセッションで .dart を変更した」という目印ファイルを置いている点です。
# このセッションで .dart を変更した目印を置く（Stopフックがこれを見て解析する）
SID=$(printf '%s' "$INPUT" | hook_session_id)
touch "$(hook_pending_marker "$SID")" 2>/dev/null || true

dart format "$FILE" >/dev/null 2>&1 || true
一方、Stop（ターン終了時）に登録した解析フックは、その目印がある場合だけ重い静的解析を走らせます。flutter analyze のエラーか、custom_lint（Riverpodの誤用検出）が見つかれば、exit 2 でターンをブロックして修正を促します。
# このセッションで .dart を編集していなければ解析しない
[ -f "$MARKER" ] || exit 0
...
if [ "$FAILED" -eq 1 ]; then
  {
    echo "静的解析で問題が検出されました。修正してから完了してください。"
    echo "技術的に修正が難しい場合は自己判断せず、内容をユーザーに報告して判断を仰いでください。"
    ...
  } >&2
  exit 2
fi
flutter analyze は解析サーバの起動で数秒かかるため、編集のたびに走らせると重くなります。そこで、軽い整形は編集ごと・重い解析は1ターンに1回、と役割を分けています。
この hook の配分を増やしていくほど、モデルのブレに頼る部分が減り、品質が底上げされます。ハーネス設計の勘所はここにあると感じました。

 参考になった hook：ツール呼び出し回数を数えて別の行動を促す
見本（ECC）の中に、hook の守備範囲の広さを示す面白い例がありました。suggest-compact.js という hook で、ツールの呼び出し回数を数えて、しきい値に達したら /compact（文脈の圧縮）を提案するものです。整形や lint のような「処理を走らせる」hook とは毛色が違います。
仕組みはこうです。Claude Codeはツールを使うたびに hook へ情報を渡します。この hook はそれを受けて、セッションごとのカウンターファイルを1つ加算します。
const counterFile = path.join(getTempDir(), `claude-tool-count-${sessionId}`);
const threshold = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);
// 既存のカウントを読んで +1、無ければ 1 から開始
そしてカウントがしきい値（デフォルト50回）に達したとき、標準出力に決められた形式のJSONを返します。
if (count === threshold) {
  const msg = `${threshold} tool calls reached - consider /compact if transitioning phases`;
  output({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: msg } });
}
この additionalContext が、次のモデルのターンに「補足情報」として差し込まれます。ツールの実行自体はブロックせず、提案だけをそっと注入する仕組みです。50回を超えた後も25回ごとに同じ提案を出すようになっています。
なぜ自動圧縮ではなく手動提案なのか、というと、自動圧縮は作業の途中など中途半端な地点で起きがちで、文脈が壊れることがあるからです。一方この hook は、探索が一段落した・マイルストーンを終えたといった区切りで圧縮を促すことを狙っています。
ここから学べるのは、hook は「整形する」「lintをかける」だけのものではない、ということです。決定論的に状態（ここではツールの呼び出し回数）を観測し、しきい値で別のワークフローを促す、という運用の自動操縦にも使えます。

 いきなり全部入れない：段階的に育てる
ECCのような完成されたハーネスを見ると全部入れたくなりますが、これは避けたほうがよいと考えています。密に絡み合った設定をいきなり持ち込んでも、各部品が何をしているのか、出てきた成果物が正しいのかを自分で判断できないからです。
おすすめは、痒いところや効果が高いと感じたところから順に育てることです。自分は次の順で進めました。


CLAUDE.md で共通ルールを言語化する（まず横断ルールを文章にする）
繰り返す手順を skill にする（再現性を上げる）
役割を agents に切り出す（文脈を分ける・並行させる）
決定論的な強制を hook にする（ブレを消す）

この順なら、各段階で何が変わったかを自分で確かめながら進められるので迷いません。いきなり4から入れるより、1から積み上げたほうが、最終的な構成も自分で説明できるものになります。

 AIをどこまで信頼するか：レビュー範囲を仕組みに埋め込む
AIにどこまで任せてよいかは、議論で決めるより、実際に試して線を引くのが妥当だと考えています。やってみた上で、どこまでなら任せても問題ないか、逆にどの部分は重みをつけて人がしっかりレビューするかを定義します。
大事なのは、人がレビューする範囲を「気をつける」という気持ちにせず、既存の skill や agent の中に承認ゲートとして埋め込むことです。仕組みとして承認依頼が飛んでくる状態を作っておきます。
瞑想アプリの開発は、PRD作成 → 設計 → テスト駆動開発 → レビュー、という流れで進めています。この中で、自分のこだわりを次のように仕込みました。
まず、何をドキュメントとして残すかを決めました。横断的に常に参照する共通設計と、設計の方針・理由・意図を残すための個別設計書を分け、後から「なぜこうしたか」を辿れるようにしています。
次に、どこを人のレビュー対象にするかを決め、そこで承認依頼が飛ぶようにしました。具体的には、設計が固まったタイミングで一度レビューを挟む、E2EテストのケースがPRDと合っているかをレビューする、最後にE2Eを自分の手で確認する、という3点です。
一方、コード品質とセキュリティの機械的な検査は、専用のレビューエージェント2種に任せています。ここで重要なのは、実装したエージェント自身に「完了」を自己判断させないことです。skill には次のように書いています。
実装・テストが完了したら、実装したエージェント自身の自己判断で完了とせず、別のレビュー
専門エージェントに検査を依頼する。依存が無いので2エージェントを並行で起動する。

1. code-reviewer エージェント → 品質・Clean Architecture/Riverpod規約・テスト網羅を検査
2. security-reviewer エージェント → RLS・認証・秘密情報・PII・OWASP/モバイルリスクを検査

- 両エージェントは指摘のみで修正しない。判定（APPROVE / WARNING / BLOCK）と指摘を受け取る。
- BLOCK（CRITICAL）が1件でもあれば完了にしない。
つまり、AIの一次検査を通した上で、人が最終確認する二段構えにしています。設計やPRDとの整合といった「意図の正しさ」は人が見て、コードとセキュリティの機械的な検査はエージェントで底上げする、という住み分けです。

 ワークフローを再整理する：トリアージで臨機応変さを担保する
運用していると、当初のワークフローにあまり良くないルールが見つかったり、ちょっとした手直しに対してまで毎回フルの計画を組もうとして重くなったりしました。「サクッと直したい」と「品質を守りたい」が両立しないのが課題でした。
そこで、開発の入口にトリアージを設け、2つのトラックに分けました。Fullは設計からレビューまでフルで回すトラック、Lightは最低ラインだけ守って素早く回すトラックです。skill にはこの判定表を置いています。
| 項目       | Full                                   | Light                              |
| 対象       | PRDが明確な新機能・大きめの変更         | 小規模・局所的で低リスクと判定した変更 |
| 設計       | architect で本格設計、設計書の作成/更新 | 既存設計書への反映要否だけ判定        |
| テスト     | tdd-guide でフルTDD                      | 変更した振る舞いの回帰テストを最低1本 |
| テスト実行 | 静的解析→単体→結合→E2E（固定順）        | 静的解析→関連単体（＋必要なら結合）   |
| レビュー   | 人がレビュー                            | 人が差分確認                        |
ここで大事なのは、AIに勝手な近道をさせないことです。トラックの判定は「AIが根拠つきで提案し、人が承認する」形にし、さらに次の高リスク条件に1つでも触れたら、機械的にFull固定としました。AIの裁量は低リスク帯にだけ与えます。
#### 高リスク条件（1つでも該当 → 機械的に Full。AIに裁量はない）
- セキュリティに触れる（RLS・認証・権限・入力検証・プライバシー）
- スキーマ / データ移行 / Edge Function の変更
- 新しい公開API・契約・共通処理の追加変更
- 複数画面・複数Epicに跨る横断的影響
そして、どちらのトラックでも譲らない最低ラインを定義しました。
#### どのトラックでも譲らない最低ライン
- セキュリティに触れたら無条件で Full
- 振る舞いを変えるなら回帰テストを必ず1本書く（Red→Green）
- 設計書に関わる箇所を触ったら反映要否を必ず判定・記録する
- エラーを自己判断でスルーしない
「ワークフローには載せるが、重要な観点だけは無条件で守る」という形にすることで、再現性と臨機応変さを両立させました。
なお、このトリアージの判定ロジック本体は skill に書いていますが、skill は呼ばれないと発火しません。そこで「小さな変更でも勝手に直し始めず、まずトラックを判定・提案する」という発火条件だけは、常時読まれる CLAUDE.md にも1行置いています。skill が呼ばれていない状態でも効かせるための工夫です。

 まとめ
最後に、使い分けの判断軸を整理します。

割り当ては「いつ発火し、どんな文脈で動くか」で考えます。機能をどこに書くか、ではありません。

agents は役割です。独立した文脈が欲しい、あるいは並行できる作業を切り出します。
skills はワークフローです。頻度が高くブレやすい手順を、再現性高く固定します。
hooks は決定論的な強制です。必ず同じ処理を再現したいものに使い、配分を増やすほど品質が安定します。


見本は構造を借り、中身は自分のプロジェクトに合わせて作り直します。密に絡んだハーネスをそのまま移植しません。
段階的に育てます。CLAUDE.md → skill → agent → hook の順なら、各段階で効果を確かめながら迷わず進められます。
信頼は試して線を引きます。人がレビューする範囲を定義し、承認ゲートとして skill や agent に埋め込みます。気持ちではなく仕組みにします。
トリアージで臨機応変さを担保します。すべてに重い計画を適用せず、ただし高リスク領域はAIに裁量を与えず機械的にFull固定にします。

ハーネス設計は一度で完成するものではありません。痒いところから少しずつ、自分で説明できる範囲で育てていくのが、結局いちばん速いと感じています。

---

## 37. [AIに毎回プロジェクトを説明するのをやめる — AGENTS.mdで、コーディングエージェントに「リポジトリの歩き方」を1枚で渡す実践ガイド - Qiita](https://qiita.com/akira_papa_AI/items/3fd7d14fc53d13a27f4a)
- **優先度**: High
- **スコア**: 88
- **解析日時**: 2026/6/10
- **AI要約**:
  AGENTS.mdはAIエージェントにリポジトリのルールを伝えるための「AI用README」である
  ツール依存の設定を統合し、AIが推論できない独自の規約や立ち入り禁止の境界線を明記する
  Agentic AI Foundationが管理するオープン標準であり、CursorやClaude Codeに対応している
- **今読む理由**: AI駆動開発において、エージェントによる誤ったコマンド実行や規約違反、不要な差分生成などの手戻りを防ぐための「AGENTS.md」の具体的な書き方と設計原則（Context Engineering）が即座に導入できるため。
- **タグ**: #AI駆動開発, #AGENTS.md, #Context_Engineering, #開発標準化

### 本文
はじめに — 毎回、同じ説明してませんか？
AIにコードを任せられるようになって、たしかに開発はめちゃくちゃ速くなりました。Cursor、Codex、Claude Code、GitHub Copilot……どれを使っても、「ざっくり頼むと、それっぽいコードが返ってくる」のが当たり前になってきましたよね。
でも、正直に言うと、僕はある日ふと気づいたんです。
毎回、同じことを説明してへん？ って。

「このプロジェクトは npm じゃなくて pnpm を使ってます」
「テストは vitest で、コミット前に必ず走らせてください」
「src/legacy/ の中は触らないでください」

セッションを開くたびに、これを書いている。AIは賢いんですけど、賢いがゆえに「言われてないこと」は平気でやります。npm install を叩いてロックファイルを壊したり、独自の命名規約を無視したり、頼んでないのに別のディレクトリまで「ついでに」直してきたり。
そして3回目くらいに同じ注意をしている自分に気づいて、めっちゃもったいないな と思ったわけです。だってこれ、人間でいうと、新しいメンバーが入るたびに、口頭で同じオンボーディングを繰り返してるのと同じ状態なんですよね。
この「毎回の説明」を、たった1つのファイルにまとめて、リポジトリに置いておけるとしたら、どうでしょう。しかも、Cursorでも、Codexでも、Claude Codeでも、どのツールでも同じファイルを読んでくれる としたら。
それが、今回の主役 AGENTS.md です。
この記事では、AGENTS.md が何者なのか、なぜ2026年に標準として一気に広がったのか、何を書いて何を書かないのか、そして「明日から自分のリポジトリに置ける」レベルの実物サンプル・プロンプト・CIチェックまで、AI開発にまだ不慣れな方でも迷わないように、ひとつずつ噛み砕いて書いていきます。
先に結論だけ言っておきますね。AGENTS.md は、AIエージェントに「このリポジトリの歩き方」を渡す、たった1枚の取扱説明書 です。そして完璧じゃなくていい。まずは10行から始めれば十分です。


AGENTS.md って、そもそも何？（無知の無知のままでもOK）
ひとことで言うと、AGENTS.md は「AI用のREADME」 です。
ここでいきなり用語の整理をしておきましょう。知ってる人には当たり前でも、ここでつまずくと先が全部ぼやけるので。


README.md … 人間のための説明書。プロジェクトの概要、使い方、貢献ガイド。GitHubのトップに表示されるあれです。

AGENTS.md … AIコーディングエージェントのための説明書。ビルド手順、テストの走らせ方、コードの書き方の決まり、触っちゃいけない場所……みたいな、「人間のREADMEに書くとごちゃつくけど、AIには絶対伝えたいこと」を置く場所。

公式サイト（ https://agents.md/ ）でも、ずばり 「a README for agents（エージェントのためのREADME）」 と表現されています。

登場人物は3人だけ
仕組みは難しくないので、登場人物で整理しましょう。


エージェント … あなたの代わりにコードを読んだり書いたりするAI（Cursorの中の人、Codex、Claude Codeなど）。

リポジトリ … あなたのコードが入っているフォルダ全体。

AGENTS.md … リポジトリの中に置く、AIへの取扱説明書。

そして大事なのが、エージェントは作業を始めるとき、自動で AGENTS.md を探して読む という点です。あなたが「これ読んでね」と毎回貼り付けなくても、ファイルがそこにあれば勝手に拾ってくれる。これがREADMEと決定的に違うところで、AGENTS.md は「置いておくだけで効く」んです。

「最寄りが勝つ」というルール
もうひとつだけ。エージェントは、編集しようとしているファイルから見て いちばん近い（最寄りの）AGENTS.md を優先して読みます。英語だと closest file wins（最寄りのファイルが勝つ）と言われるルールです。
たとえば大きなプロジェクトで、ルートにもAGENTS.mdがあって、packages/api/ の中にもAGENTS.mdがあったとします。packages/api/ の中のコードを直すときは、packages/api/AGENTS.md のほうが優先される。家全体のルールと、各部屋のローカルルールがあって、その部屋にいるときは部屋のルールが優先、みたいなイメージですね（このモノレポの話は後でちゃんとやります）。
ちなみに、あなたがチャットで直接出す指示は、AGENTS.mdより強い です。だからファイルに書いた内容が古くても、その場で「今回はこうして」と言えば上書きできます。安心してください。

なぜ2026年に「標準」になったのか
ここは事実ベースでいきましょう。AGENTS.md がここまで広がったのには、ちゃんと理由があります（2026年6月時点）。


採用規模がでかい … 公式サイトによると、GitHub上で 6万を超えるオープンソースプロジェクト がすでにAGENTS.mdを使っています。

特定ツール専用じゃない … OpenAI Codex、Google の Jules、Cursor、Amp、Factory といった面々の協調から生まれた、ツール非依存（vendor-agnostic） のオープン標準です。Claude Code、GitHub Copilot、Aider、Gemini CLI なども対応しています。

ちゃんとした後ろ盾がある … 現在は Agentic AI Foundation（Linux Foundation の傘下） が管理・発展を担っています。一企業の気まぐれで消える心配が小さい。

ここがポイントなんですけど、これまでは .cursorrules（Cursor用）、CLAUDE.md（Claude用）みたいに、ツールごとにバラバラの設定ファイル を書いてました。ツールを乗り換えるたびに書き直し。チームでツールが違えば、全部メンテ。これ、地味にしんどかったんですよね。
AGENTS.md は、その乱立を 「1枚にまとめて、みんなで読む」 に変える動きなんです。




README.md
AGENTS.md




読む相手
人間
AIエージェント


中身
概要・使い方・貢献ガイド
ビルド/テスト手順・規約・境界


読まれ方
人がブラウザで開く
エージェントが自動で発見して読む


書く粒度
人に伝わればOK
機械が実行できる正確さが要る





なぜ重要なのか — Prompt Engineering から Context Engineering へ
ここで少し、考え方の話をさせてください。AI時代のエンジニアリングって、いま静かに重心が移ってるんです。
少し前まで、僕らは Prompt Engineering（プロンプト設計） に夢中でした。「どう頼めば、AIがいい答えを返すか」。これはこれで大事です。でも、毎回のプロンプトにプロジェクトの前提を盛り込むのって、すぐ限界がきます。会話のたびに同じ前提を書き直すことになるから。
そこで出てくるのが Context Engineering（文脈設計） です。ざっくり言うと、「AIに毎回説明するのをやめて、文脈そのものを設計して、置いておく」 という発想。プロンプトは使い捨ての一言、文脈は資産。この違い、けっこう本質的だと思うんです。
AGENTS.md は、まさにこの Context Engineering の いちばん身近で、いちばん効く実物 です。会話に文脈を沈めるんじゃなくて、リポジトリにコミットして、全セッション・全エージェント・全チームメンバーで共有する。一度書けば、明日の自分も、来週入る新メンバーも、明後日のAIセッションも、同じ文脈の上でスタートできる。
そして、これはエンジニアの役割の変化そのものでもあります。実装者から、文脈設計者へ。 コードを1行ずつ手で書く人から、「AIが正しく動くための文脈を設計する人」へ。AGENTS.md は、その新しい役割の、いちばん最初の成果物だと僕は思っています。
「AIがすごい」で終わらせない。人間が What（何を）と Why（なぜ）と境界を設計して、How（どう実装するか）をAIに渡す。 この分担を、ファイル1枚で表現できるのが AGENTS.md なんです。


何を書くか — セクション設計と「いちばん大事な原則」
じゃあ中身は何を書くのか。公式や、世界中の優れたAGENTS.mdを見ていくと、だいたい次のセクションに落ち着きます。


Project overview（概要） … 何のプロジェクトで、技術スタックは何か。1〜2文でOK。

Commands（コマンド） … インストール・起動・ビルド・テストの、そのままコピペできる正確なコマンド。

Testing（テスト） … どう走らせるか、何を満たせばOKか。

Code style（コード規約） … フォーマット、命名、import、設計の好み。

Boundaries（境界） … 触っちゃいけない場所、やってはいけないこと。

Git & PR … コミットメッセージの形式、PRの作法。

Gotchas（ハマりどころ） … このプロジェクト特有の落とし穴。

ここで、この記事でいちばん覚えて帰ってほしい原則 を言います。

AGENTS.md には「AIが推論できないことだけ」を書く。

どういうことか。AIは賢いので、コードを見れば分かることは、わざわざ書かなくても分かります。「TypeScriptを使ってる」なんてのは tsconfig.json を見れば一発です。それをAGENTS.mdに書くのは、ただのノイズ。
逆に、コードを見ても分からないこと ＝ AIが絶対に推論できないことこそ、書く価値があります。

「npm じゃなく pnpm を使う」（ロックファイルから推測できるとは限らない、明示が安全）
「APIの命名は getXxx で統一（fetchXxx は使わない）」（チームの決め事）
「src/legacy/ は凍結。絶対に変更しない」（歴史的経緯）
「コミット前に必ず pnpm test を通す」（運用ルール）

この「推論できないことだけ書く」を守るだけで、AGENTS.md は短く、効いて、腐りにくくなります。

コード例① 汎用的な AGENTS.md サンプル（そのまま叩き台にどうぞ）
実物を見たほうが早いですよね。下は、よくあるWebアプリ（TypeScript + pnpm）を想定した、完全に汎用のサンプルです。あなたのプロジェクトの固有名やコマンドに差し替えて使ってください。
# AGENTS.md

このリポジトリは、TypeScript + React + Vite で作られたWebアプリです。
あなた（AIエージェント）は、このプロジェクトの規約に従って作業してください。

## Commands（コマンド）
- 依存インストール: `pnpm install`
- 開発サーバ: `pnpm dev`
- ビルド: `pnpm build`
- テスト: `pnpm test`
- Lint: `pnpm lint`

## Testing（テスト）
- 変更したコードには、必ず対応するテストを追加・更新する。
- コミット前に `pnpm test` と `pnpm lint` を実行し、すべて green にする。
- テストは Vitest を使う。E2E は Playwright。

## Code style（コード規約）
- TypeScript の strict モードを前提にする。
- API取得関数の命名は `getXxx` に統一（`fetchXxx` は使わない）。
- コンポーネントは関数コンポーネントで書く。
- import は外部 → 内部 → 相対パスの順に並べる。

## Boundaries（やってはいけないこと）
- `src/legacy/` 配下は凍結。理由がない限り変更しない。
- DBマイグレーションファイルは自動生成しない。人間に確認する。
- 本番デプロイ・課金・外部送信を伴う操作は実行しない。提案だけする。

## Git & PR
- コミットは Conventional Commits（例: `feat: ...`, `fix: ...`）。
- PR本文には、実行したテストの結果（証跡）を必ず書く。

## Gotchas（ハマりどころ）
- このプロジェクトはタイムゾーンを常に UTC で扱う。ローカル時刻を混ぜない。
- 環境変数は `.env.example` を正とする。新しいキーは必ずここにも追記する。

たったこれだけです。30行ちょっと。でも、これがあるだけで、毎回の説明から解放されます。最初は10行でいい。使いながら、AIがハマったポイントを1行ずつ足していく。それが正解です。


良い AGENTS.md の5原則
サンプルを見てもらった上で、「良い状態」を保つコツを5つにまとめます。


簡潔に保つ。 AGENTS.md は、エージェントが作業を始めるたびに読み込まれます。つまり毎回 トークン（AIが処理する文字の単位。多いほど料金も時間もかかる） を消費する。長ければ長いほど、毎セッション課金されると思ってください。だらだら書かない。目安はせいぜい数十〜150行くらい。


命令形で、実行できるコマンドを書く。 「テストするといいです」より「pnpm test を実行する」。AIは曖昧な希望より、具体的な動詞で動きます。


実例は3〜10行の短いコードで。 「こう書いてほしい」は、文章よりサンプルコードのほうが100倍伝わります。ただし長すぎると①に反するので、短く。


段階的に開示する。 全部をAGENTS.mdに詰め込まない。詳細は別ファイルに逃がして、「詳しくは docs/agent/testing.md を見て」と参照だけ置く。エージェントは必要なときにそれを読みに行きます。本体は薄く、詳細は外に。


living documentation（生きた文書）として扱う。 AGENTS.md は一度書いて終わりじゃない。コードを変えたら、同じPRの中でAGENTS.mdも直す。古いAGENTS.mdは、ないより害になる ことすらあります（嘘の文脈を毎回AIに刷り込むから）。




モノレポ戦略 — 「家のルール」と「部屋のルール」
少し大きめのプロジェクトの話をします。モノレポ という言葉、聞いたことありますか。ひとつのリポジトリの中に、複数のパッケージ（たとえば api、web、shared みたいな小プロジェクト）が同居している構成のことです。
このとき、AGENTS.md を1枚だけルートに置くと、「APIの規約」と「フロントの規約」が混ざってカオスになります。そこで使うのが nested AGENTS.md（入れ子のAGENTS.md） です。
さっきの「最寄りが勝つ」ルールが、ここで効いてきます。各パッケージに専用のAGENTS.mdを置いておけば、そのパッケージで作業するときは、そのローカルなAGENTS.mdが優先される。家全体の共通ルールはルートに、各部屋の事情は各部屋に。

コード例② モノレポでの配置イメージ
my-monorepo/
├── AGENTS.md              # 家全体の共通ルール（言語・コミット規約・全体の境界）
├── packages/
│   ├── api/
│   │   ├── AGENTS.md      # APIだけのルール（DB接続・認証・テスト方針）
│   │   └── src/
│   ├── web/
│   │   ├── AGENTS.md      # フロントだけのルール（UI規約・状態管理）
│   │   └── src/
│   └── shared/
│       └── src/           # ここはルートのAGENTS.mdが効く

どれくらいの規模で使われているかというと、公式サイトいわく、OpenAI のメインリポジトリには88個のAGENTS.md があるそうです。大きくなればなるほど、この入れ子構成が効いてくる、ということですね。



書く内容
どこに置く？




言語・コミット規約・全体の禁止事項
ルートの AGENTS.md


そのパッケージ固有のコマンド・規約
各パッケージの AGENTS.md


長い詳細手順（テスト設計など）

docs/agent/*.md に逃がして参照





境界設計 — AIに任せること / 人間が握ること
ここ、僕がいちばん大事だと思っているところです。
AIは賢い。賢いからこそ、境界線がないと「良かれと思って」踏み込んできます。 頼んでないリファクタ、勝手なファイル削除、ついでの本番設定変更。悪気はないんです。でも事故は事故。
だから、踏んじゃいけない場所は、先に文字にしておく。 これが Boundaries セクションの役割です。
特に、やり直しがきかない操作（不可逆な操作） は、AGENTS.md に「実行しない、提案だけする」と明記して、必ず人間のゲート（確認の関所）を通すようにします。

本番環境へのデプロイ
データの削除、DBの破壊的なマイグレーション
課金・決済に関わる処理
外部への公開・送信（SNS投稿、メール送信など）

ここで役割分担を表にしておきます。AGENTS.md は、この表を「ファイルとして固定する」装置だと思ってください。



領域
人間が握る
AIに任せる




何を作るか（What）
◎ 決める
提案はする


なぜ作るか（Why）
◎ 決める
—


境界・禁止事項
◎ 定義する
従う


実装（How）
レビューする
◎ 手を動かす


テスト作成
観点を決める
◎ 書く・実行する


不可逆な操作
◎ 最終承認
提案・準備まで



ひとつ注意があります。公式の仕様で、AGENTS.md にテストコマンドを書いておくと、エージェントはそれを自動で実行してくれる とされています。これは便利な反面、裏を返すと 「AGENTS.mdに書いたコマンドは自動で走りうる」 ということ。だから、間違っても破壊的なコマンドを気軽に書かないでください。書くのは「安全に何度でも実行できるコマンド」だけ。これも立派な境界設計です。


やりがちな落とし穴6つ
良かれと思ってやると、かえって逆効果になるパターンを6つ、症状と対策で並べます。



#
症状（やりがち）
なぜダメか
対策




1
とにかく全部盛りで長文化
毎セッション読まれてトークン浪費・要点が埋もれる
数十〜150行に圧縮。詳細は別ファイルへ


2
READMEを丸ごとコピペ
AIが推論できる情報はノイズ
「推論できないこと」だけ残す


3
AIに生成させたまま放置
それっぽいだけの定型文が混ざる
人間が読んで、嘘・不要を削る


4
古くなって嘘になる
嘘の文脈を毎回AIに刷り込む
同じPRで更新。CIで陳腐化を検知


5
境界（禁止事項）が無い
AIが踏み込んで事故る
Boundaries を必ず書く


6
秘密情報・個人情報を書く
コミット＝漏洩。公開リポジトリなら即アウト
絶対に書かない（下記）



6番だけは、別格に危険なので独立させます。

⚠️ AGENTS.md は git にコミットされ、公開リポジトリならそのまま世界に公開されます。
APIキー、トークン、パスワード、社内の固有ID、個人情報、未公開のURL……これらを 絶対に書かないでください。
秘密情報は .env（＋ .gitignore）やシークレット管理サービスに置き、AGENTS.md には「環境変数は .env.example を正とする」のように 置き場所だけ を書く。中身は書かない。

ここは事故ったときの被害が桁違いなので、何度でも言います。AGENTS.md に書いていいのは、人に見られても困らないことだけ。


そのまま使えるプロンプト例3本
AGENTS.md は、AIに作らせて、AIに点検させて、AIに更新提案させる、という回し方ができます。ただし 最終的に消す・残すを決めるのは人間 です。AIには「材料出し」をさせて、判断は握る。これも Context Engineering の作法です。

プロンプト1：AGENTS.md の初稿を作らせる
ゼロから書くのはしんどいので、まずリポジトリを調べさせて叩き台を作らせます。
あなたはこのリポジトリの構成を調査し、AGENTS.md の初稿を作ってください。

手順:
1. package.json / 設定ファイル / ディレクトリ構成を読み、
   使用言語・パッケージマネージャ・テスト/ビルド/Lintのコマンドを特定する。
2. 次のセクションで AGENTS.md を作る:
   Project overview / Commands / Testing / Code style / Boundaries / Git & PR / Gotchas
3. 「コードを見れば分かること」は書かない。推論できないことだけ書く。
4. 全体は120行以内。各コマンドは実際に動く形で。

重要:
- 推測で書いた箇所、確認が必要な箇所には「# TODO: 要確認」を付ける。
- APIキー・個人情報・固有IDは絶対に書かない。
最後に、このファイルに入れなかったが人間に確認すべき項目を箇条書きで出す。


プロンプト2：既存 AGENTS.md の健康診断
すでにあるAGENTS.mdが「長すぎ・古い・推論可能な情報だらけ」になってないか点検させます。
このリポジトリの AGENTS.md をレビューしてください。判断はせず、指摘だけ出す。

観点:
- 長すぎないか（毎セッション読まれる前提で、削れる行はどれか）
- 「コードを見れば分かること」が書かれていないか（=削除候補）
- コマンドや記述が実態とズレていないか（陳腐化）
- Boundaries（禁止事項・不可逆操作）が抜けていないか
- 秘密情報・個人情報・固有IDが混入していないか（最優先）

出力フォーマット:
| 行/箇所 | 種別(冗長/陳腐化/欠落/危険) | 指摘 | 提案 |
最後に「人間が判断すべき項目」を分けて列挙。削除や変更は提案までにとどめる。


プロンプト3：セッション後の更新提案
これがいちばん効きます。作業のあとで「今回ハマったこと」をAGENTS.mdに還元させる。
今回のセッションで、あなたが詰まった点・誤解した点・私が途中で訂正した点を振り返り、
AGENTS.md に1〜3行追記すべき内容を提案してください。

条件:
- 「次回また同じミスをしないため」の文脈だけに絞る。
- 既存の記述と重複しない。120行の上限を超えそうなら、何を削るかも提案する。
- 追記は diff 形式（+ で始まる行）で示す。
最終的に追記するかどうかは私が決めます。あなたは提案まで。

3本とも、最後に 「判断は人間」 と書いているのがポイントです。AIに全部任せると、AGENTS.md がAI生成の定型文で太っていく（落とし穴3番）。発散はAI、収束は人間。


CIで「陳腐化」と「太りすぎ」を自動で見張る
落とし穴の4番（古くなって嘘になる）と1番（長すぎ）は、人間の意志だけだと必ず崩れます。なので、機械に見張らせましょう。

コード例③ AGENTS.md の健全性チェック（Node.js）
下は、AGENTS.md が「長すぎないか」「書いてあるコマンドが本当に package.json に存在するか」を確認する、依存ゼロの小さなスクリプトです。CIに組み込めば、AGENTS.mdが嘘をつき始めた瞬間に気づけます。
// scripts/check-agents-md.mjs
// 使い方: node scripts/check-agents-md.mjs
import { readFileSync } from "node:fs";

const MAX_LINES = 150; // 太りすぎ防止のしきい値
const errors = [];

const md = readFileSync("AGENTS.md", "utf8");
const lines = md.split("\n");

// 1) 行数チェック（毎セッション読まれるので長すぎは害）
if (lines.length > MAX_LINES) {
  errors.push(`AGENTS.md が ${lines.length} 行。${MAX_LINES} 行以内に圧縮を。`);
}

// 2) 本文中の `pnpm xxx` / `npm run xxx` が package.json に実在するか
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const scripts = new Set(Object.keys(pkg.scripts ?? {}));
const referenced = [...md.matchAll(/`(?:pnpm|npm run|yarn)\s+([a-zA-Z:_-]+)`/g)]
  .map((m) => m[1])
  .filter((name) => name !== "install" && name !== "dev"); // 既定コマンドは除外

for (const name of referenced) {
  if (!scripts.has(name)) {
    errors.push(`AGENTS.md が "${name}" を参照しているが package.json に無い（陳腐化）`);
  }
}

// 3) 秘密情報っぽい文字列の混入を雑に検知（完全ではない最終防波堤）
if (/(api[_-]?key|secret|password|token)\s*[:=]\s*\S+/i.test(md)) {
  errors.push("秘密情報らしき記述を検知。AGENTS.md に秘密は書かない。");
}

if (errors.length) {
  console.error("AGENTS.md チェック失敗:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("AGENTS.md OK");

これをGitHub Actionsから呼べば、PRのたびに自動で番をしてくれます。「人間が頑張って守る」を「仕組みが勝手に守る」に変える。 これも明日の自分へのプレゼントです。

コード例④ 旧ファイルからの移行（後方互換）
すでに CLAUDE.md や .cursorrules を持っている人も多いと思います。捨てなくて大丈夫。AGENTS.md を正にして、旧ファイルはシンボリックリンク（中身は同じで名前だけ別、というショートカットのこと） にしておけば、古いツールも新しいツールも、同じ実体を読みます。
# 例: 既存の CLAUDE.md を AGENTS.md に一本化して、旧名はリンクで残す
mv CLAUDE.md AGENTS.md
ln -s AGENTS.md CLAUDE.md      # CLAUDE.md は AGENTS.md を指すだけになる

# 中身は1か所（AGENTS.md）を直せば、両方に反映される

これで「ツールごとにメンテ」から「1枚を育てる」に移行できます。
なお、AGENTS.md は他の手法と競合しません。むしろ相性がいい。たとえば、機能ごとの仕様を書く Spec-Driven Development（仕様駆動開発）や、出力品質を測る評価（Eval）と組み合わせると、「リポジトリ全体の作法は AGENTS.md、機能ごとの仕様は spec、品質は eval」 という、きれいな三層になります。AGENTS.md はその土台、いちばん下に常駐する文脈です。


今週の最初の一歩（4ステップ）
理屈はもう十分です。完璧を目指さず、まず動かしましょう。65点でいい。


リポジトリのルートに AGENTS.md を新規作成する。 まずは空でいい。

10行だけ書く。 Commands（install / dev / test）と、Boundaries を1〜2行（「src/legacy/ は触らない」など）。これだけで効きます。

次のセッションで、プロンプト3（更新提案）を使う。 AIが詰まったポイントを1〜2行ずつ足していく。

1週間後、プロンプト2（健康診断）で点検する。 長すぎ・陳腐化・秘密混入をチェックして、削る。

これだけで、来週のあなたは「毎回の説明」から解放されています。


おわりに — AGENTS.md は、明日の自分への置き手紙
最後に、ちょっとだけ僕の思っていることを。
AGENTS.md って、技術的には「AIに読ませる設定ファイル」なんですけど、本質はもっと優しいものだと思っているんです。
READMEが人間への手紙なら、AGENTS.md は、明日の自分・明日のチーム・明日のAIセッションへの置き手紙 です。今日10行書いておくだけで、明日の自分が、同じ説明をしなくて済む。新しく入る人が、いきなり戦力になれる。AIが、いきなり作法どおりに動いてくれる。
僕がいつも自分に問いかけている軸があって、それは 「この選択、明日の自分があざっす（ありがとう）って言ってくれるかな？」 というものなんです。AGENTS.md を10行書くのは、まさにそれ。今日のちょっとした一手間が、明日の自分への「あざっす」になる。
そしてこれは、AI時代のエンジニアの役割の変化そのものでもあります。コードを1行ずつ手で打つ人から、What（何を）と Why（なぜ）と境界を設計して、How（どう実装するか）をAIに渡す人 へ。AGENTS.md は、その「文脈を設計する力」を、誰でも今日から持てる形にしてくれます。文脈はコードと同じで、ちゃんと書けば資産になる。育てれば育てるほど、勝手に効いてくれる資産に。
完璧じゃなくていいんです。まずは10行。あなたのリポジトリに、明日のための置き手紙を、1枚置いてみませんか。
明日のあなたが、きっと「あざっす」って言ってくれます。

---

## 38. [Claude × Codex × Gemini を"併用"する設計 ─ セカンドオピニオン運用フレーム #AI - Qiita](https://qiita.com/nogataka/items/b2b4a84ba611ccaf8447)
- **優先度**: High
- **スコア**: 85
- **解析日時**: 2026/5/4
- **AI要約**:
  Claude、Codex、Geminiの強みを活かした役割分担と、相互補完的な運用設計を定義
  タスク種別・速度・コストに基づいた棲み分けマップにより、最適なツール選択の判断基準を提示
  Claude Codeから他ツールを呼び出すSkillの実装例と、実務での合議・判断ルールを解説
- **今読む理由**: AI駆動開発における単一ツールの限界を補う具体的な運用ルールと、Claude CodeのSkillを用いた自動化への統合手法が示されており、開発効率向上に直結するため。
- **タグ**: #AI駆動開発, #ClaudeCode, #LLMオーケストレーション, #自動化パイプライン

### 本文
はじめに
Claude Code、Codex CLI、Gemini CLI の比較記事は、ここ半年で一気に増えました。
多くは「どれが最強か」を問う記事です。読むと参考になる一方、結局どれか 1 つを選ばされる構図になりがちで、実務の体感とは少しずれます。私の手元では、3 ツールは互いに"置き換え"ではなく"補完"の関係で並んでいます。
本記事では「どれが最強か」ではなく、「3 ツールを併用する前提で、どう役割分担させるか」を設計する視点でまとめます。具体的には、以下を扱います。

各ツールの強みを中立的に整理
タスク種別 × 速度 × コスト × 品質で見た棲み分けマップ
セカンドオピニオンを呼ぶ条件の運用ルール化
Claude Code から Codex / Gemini を呼ぶ Skill の疑似コード
ユースケース 5 例とコスト試算

「1 つに統一したほうが楽では？」という声にも触れつつ、使い分ける側の設計コストと、得られる精度・速度のトレードオフを中立に見ていきます。
特定ベンダー推しの記事ではない、という前提でお読みください。


各ツールの強み（中立に整理）
まずは 3 ツールの得意領域を、あえてフラットに並べます。どれも弱点はあるので、そこも含めて書きます。

Claude Code（Anthropic）

対話型ターミナル CLI
長時間セッションでの設計思考・リファクタに強い
Skills / Hooks / Subagents / Agent Teams / MCP / Plugins と拡張機構が充実
CLAUDE.md によるプロジェクト文脈の持ち込みが洗練されている
弱点: 長時間運用するとコンテキストが膨らみ、auto-compact で品質が落ちる場面がある

設計を詰める、アーキテクチャの判断基準を議論する、レビュー観点を整理する、といった"考える系"のタスクで手触りが安定する印象です。

Codex CLI（OpenAI）

対話型のターミナル CLI として、codex コマンドから同期的に質問・壁打ち・コード生成ができる

resume / fork / review など、既存のセッションに途中介入して軌道修正するためのサブコマンドが揃っている
GPT-5 系のモデル更新と足並みが揃っている
弱点: Skill / Hook 的な高レベルの拡張機構は Claude Code と比べると薄めで、エコシステム面では後発感がある

対話でさくっとセカンドオピニオンを取る用途や、まとまった粒度のコード生成タスクに向いています。

Codex Cloud（OpenAI）

Codex CLI とは別の機能として、クラウド側でタスクを非同期実行するワークフローが提供されている
「タスクを投げて、一定時間後に PR として結果を受け取る」fire-and-forget 型の使い方はこちらが担う
弱点: 非同期実行中の途中介入は限定的で、完成形のタスク記述が前提になりやすい

CLI と Cloud は別レイヤーとして整理しておくと、役割分担を設計しやすくなります。本記事で「Codex」と書く場合は、断りがない限り Codex CLI を指します。

Gemini CLI（Google）

長文コンテキスト（1M トークン級）の受け取りがデフォルト感覚
マルチモーダル対応（画像・PDF・音声の扱い）が素直
無料枠が比較的広く、試し打ちのコストが低い
Agent Skills / Hooks / Subagents / MCP といった拡張機構が一通り揃いつつあり、CLI 周辺のエコシステムは急速に整備されている

「大きな資料を丸ごと渡して要約させる」「画像込みの仕様書を解釈させる」「雑な質問でまず当たりをつける」といった用途に向いています。

誤解されがちな点

「Claude Code は一番賢いから他は不要」という主張も見かけますが、ベンチマークは切り口次第で順位が変わります
「Gemini は無料だから品質が低い」は単純化しすぎで、長文理解や画像扱いでは優位に立つ場面があります
「Codex は PR を勝手に作るから危ない」という評価は Codex Cloud の非同期実行を指していることが多く、Codex CLI 単体の動作と混同されがちです。CLI と Cloud を切り分けて評価するのが前提になります

どれも一面的な評価だと取りこぼしが出る、という認識からスタートします。


3 ツールの棲み分けマップ
ここからは、自分の手元で運用しているマトリクスを共有します。あくまで「筆者の環境と案件傾向ではこう落ち着いた」という一例です。

タスク種別 × ツール



タスク種別
Claude Code
Codex CLI
Gemini CLI




アーキテクチャ検討
主
セカンドオピニオン
素材投入の下処理


実装・リファクタ
主
並列バッチ処理
使わないことも多い


PR レビュー
主
並列レビュー
追加視点として任意


長文コード理解
部分的に
副次
主（長文コンテキスト）


画像・PDF の解釈
条件付き
弱い
主


論文・仕様書の要約
セカンドオピニオン
副次
主


バグ再現と切り分け
主
並列検証
追加仮説の提示


ドキュメント整形
主
副次
下書きの雑打ち



"主"は自分のデフォルト、"セカンドオピニオン"は別視点を取りに行く用途、"並列"は同じタスクを同時に走らせる用途、というニュアンスです。

速度 × コスト × 品質の軸



軸
Claude Code
Codex CLI
Gemini CLI




応答速度（対話）
中〜速
中〜速（CLI は同期、Cloud は非同期）
速い


応答品質（設計系）
高い傾向
高い傾向
中〜高（タスク依存）


応答品質（長文要約）
中〜高
中〜高
高い傾向


実行コスト
中〜高
中〜高
低〜中（無料枠あり）


オフライン化
不可
不可
不可



数字を断定しないのは、契約プラン・タスク複雑度・プロンプト設計で順位が簡単に入れ替わるためです。「自分の案件では概ねこう」という目安として扱うのが現実的だと思います。

併用の副作用
併用には副作用もあります。

CLI を 3 本切り替えることで、思考のコンテキストスイッチコストが上がる
結果のフォーマットが揃わず、比較に手間がかかる
"意見が割れたときにどう決めるか"のルールを事前に決めておかないと、合議が機能しない

後半で運用ルールに触れますが、併用が無条件で優れているわけではなく、1 ツールに統一するほうが合う案件も普通にあります。


セカンドオピニオンを呼ぶ条件
3 ツールを常時並列で走らせるのは現実的ではないため、「どのタイミングで別ツールを呼ぶか」を条件化します。自分のルールは以下の通りで、あくまで叩き台として紹介します。

必須で呼ぶタイミング

資料・成果物を作成した後（記事、レポート、提案書、分析結果）
重要な意思決定の前（技術選定、アーキテクチャ判断、事業方針）

この 2 つだけは、自分への戒めとして強制しています。自画自賛を避けるためです。

推奨で呼ぶタイミング

アプローチが 2 回以上失敗したとき（視点を変える）
複数の選択肢で迷ったとき（トレードオフの整理）
専門外の領域に踏み込むとき（壁打ち）
バグの原因が特定できないとき（再現手順と試行内容を伝えて分析依頼）


呼ばなくてよいタイミング

単純なファイル操作やコマンド実行
ユーザーが明確に手順を指定している作業
既に確立されたパターンの繰り返し

ここは"呼ばない勇気"の話でもあります。セカンドオピニオンは便利ですが、軽微な作業まで三重チェックにかけると速度が崩れます。線引きを決めておくのが実務寄りの工夫です。

回答の扱い方

セカンドオピニオンはあくまでセカンドオピニオン。最終判断は自分（もしくはユーザー）が行う
指摘が妥当な場合は、修正案としてメインエージェントに差し戻す
メインの判断と別ツールの見解が割れた場合は、両方の根拠を並べて提示する

「割れたら合議で決める」ではなく、「割れたら人間の判断に戻す」を基本にしています。AI 同士の多数決は、意外なほど当てになりません。


実装例: Claude Code から Codex / Gemini を呼ぶ Skill
Claude Code を主（オーケストレーター）にして、必要なときに Codex / Gemini を叩く構成を採っています。Skill はプロジェクト配下の .claude/skills/ などに置いて、Claude Code 内から呼べるようにします。
以下は疑似コードです。実装の細部はご自身の環境に合わせて調整してください。

注意: SKILL.md は Claude Code 自身への指示書であり、shell スクリプトとして自動実行されるものではありません。以下のコード例は「Claude Code がこの Skill を参照したとき、最終的にどんな CLI 呼び出しへ落ちるか」を示した疑似コードです。実際の Skill 定義は Claude Code がプロンプトとして解釈し、必要な CLI コマンドを組み立てて実行します。


/task-query-codex の疑似コード
---
name: task-query-codex
description: |
  OpenAI Codex CLI をセカンドオピニオンとして呼び出す。
  「Codexに聞いて」「別のAIの意見も聞きたい」「セカンドオピニオン」などで発火。
---

# 使い方
1. Claude Code で作業中に、セカンドオピニオンが必要と判断したら本 Skill を発火する
2. 質問テンプレートを埋めて `codex` CLI に投入する
3. 返答を Markdown として受け取り、そのまま会話に戻す

# 実行イメージ（bash 擬似）
cat <<'PROMPT' | codex exec --model gpt-5-codex
以下の資料をレビューしてください。

## 目的
{{ purpose }}

## 対象読者
{{ audience }}

## 確認してほしい観点
- 内容の正確性
- 論理の一貫性
- 抜け漏れ
- {{ extra_points }}

## 資料
{{ material }}
PROMPT

実体は単なる CLI 呼び出しですが、Skill として登録しておくと、Claude Code 側のセッションから自然に「Codex にも聞いてみて」と指示できるのが便利です。

/task-query-gemini の疑似コード
---
name: task-query-gemini
description: |
  Google Gemini CLI に対して壁打ち・長文要約・マルチモーダル質問を投げる。
  「Geminiに聞いて」「長文を要約して」「画像を読んで」などで発火。
---

# 使い方
1. 長文・画像・PDF を含む質問や、無料枠で試したい雑打ちに使う
2. `gemini` CLI に対してプロンプトとファイル添付を渡す
3. 返答を Markdown として受け取る

# 実行イメージ（bash 擬似）
# Gemini CLI は `-m` でモデル指定、`-p` でプロンプト、`@<path>` でファイル参照する書式
gemini -m gemini-2.5-pro -p "$(cat <<'PROMPT'
@{{ attachment_path }}

{{ question }}

## 観点
- {{ viewpoint }}

## 出力形式
Markdown の箇条書き
PROMPT
)"

本記事では Claude Code をオーケストレーター、Codex / Gemini を呼ばれる側とする一方向の依存に絞り、「Claude Code から呼ぶ相手」として /task-query-codex と /task-query-gemini の 2 つだけを扱います。逆向きに Codex / Gemini 側から Claude を呼ぶ構成も作れますが、運用がカオス化しやすいため、本稿の範囲からは外します。

ルールファイルとの接続
Skill と併せて、.claude/rules/ 配下に運用ガイドラインを置いておくと、Claude Code が自動で参照してくれます。筆者の場合は以下のような要点をテキストで書いています。

セカンドオピニオンを呼ぶ条件（上述）
呼ばないケース
回答の扱い方（最終判断は人間）
依頼テンプレート（レビュー用・相談用）

Skill と rules の二段構えにしておくと、「いつ・どうやって・何を」叩くかがプロジェクト横断で揃う、という使い方もできます。


ユースケース 5 例
ここからは、実際に 3 ツールを併用したシナリオを 5 件紹介します。どれも「Claude Code が主、Codex / Gemini が副」という構成で書きます。

1. アーキテクチャ選定

Claude Code で要件を整理し、候補 A / B / C を出す
各候補のトレードオフを表にまとめる
ここで重要判断の前のルールが発火し、/task-query-codex を呼ぶ
Codex が「候補 B は運用コストが跳ねる」と指摘した場合、根拠を付き合わせて最終判断を人間に戻す

"自分の推し案の粗を AI に探させる"という使い方です。Claude Code 単体だと、どうしても直近の会話に引きずられる場面があり、別モデルの目が効く局面です。

2. PR レビュー

PR の diff を Claude Code に読ませ、観点ごとのレビューコメントを生成
必要に応じて Codex にも同じ diff を渡し、別視点のレビューを取る
長大な変更や横断影響が気になる場合のみ、Gemini に「既存ドキュメントへの影響」を長文コンテキストで読ませる
複数の結果が出た場合は、マージして投稿用ドラフトに落とす

3 ツール並列レビューはトークンコストと運用負荷が一気に跳ね上がるため、常用はおすすめしません。デフォルトはメイン 1 本、重要度が高い PR に限って 2 本目を足す、という階段式の使い方が現実的です。軽い PR は Claude Code 単体で十分、という割り切りをしています。

3. 長文コード理解

レガシー repo（10 万行規模）をまず Gemini CLI に丸ごと渡して概要を得る
その概要を Claude Code に渡して、気になる箇所だけピンポイントに読み込む
詳細解析で詰まったら Codex にも同じ箇所を渡し、別視点の説明を取る

長文を最初から Claude Code に渡すと、コンテキストが膨らんで auto-compact が発火しやすくなります。最初の当たりを Gemini に取らせて、そのサマリをメインに渡す、という流れが相性良いです。

4. バグ切り分け

Claude Code で再現手順とスタックトレースを整理
2 回試しても原因が特定できない場合、/task-query-codex または /task-query-gemini を発火
セカンドオピニオン側に「試したこと」と「仮説」を渡し、別の切り口の仮説を 3 つ提案させる
仮説のうち 1 つが当たっていたら、Claude Code に戻して修正

失敗 2 回で別ツールに投げる、という閾値を決めておくと、沼にハマる時間を抑えられます。Codex と Gemini のどちらを呼ぶかはケースバイケースで、コード寄りの切り分けなら Codex、ログや資料を丸ごと読ませたいなら Gemini、という使い分けにしています。

5. 論文・仕様書の要約

論文 PDF を Gemini にそのまま渡し、章立てごとの要約を取る
重要な章だけ Claude Code で深掘り（疑問点の洗い出し、実装可能性の評価）
必要なら Codex に「擬似コード化」を依頼

「要約は Gemini、設計解釈は Claude、コード化は Codex」という役割分担に落ち着くことが多いです。もちろん、論文や業務ドメインによっては Claude 単体のほうが早い、というケースもあります。


コストの考え方（筆者環境の参考）
ここは具体金額ではなく、筆者が実際に採っている「課金モデルの組み合わせ方」だけを共有します。各サービスはサブスクリプション（定額）／API 従量／無料枠の組み合わせで提供されており、金額はプラン・為替・使用頻度で大きく変わります。最新の料金は各公式ページで確認してください。

筆者の課金モデルの組み合わせ



ツール
採用している課金モデル
主な用途




Claude Code
サブスクリプション型の上位プラン
主・長時間運用


Codex CLI
ChatGPT 上位プラン付帯の利用枠を中心に、必要に応じて API 従量を併用
対話でのセカンドオピニオン、コード生成


Gemini CLI
無料枠を中心に、重いタスクのみ有料プラン／API 従量を併用
長文要約・画像解析



課金モデルがサブスクと従量で混在している点は注意が必要です。「全部サブスクで常時契約」にすると固定費が積み上がるため、筆者はメインを 1 本サブスク、残りは従量 or 無料枠、という組み合わせに寄せています。

コスト最適化の考え方


主を 1 つに固定: メインの対話先を絞ると、コンテキストスイッチと課金の両方が減る

セカンドは条件発火: 前述の必須・推奨条件に合致したときだけ呼ぶ

無料枠を下見に使う: Gemini の無料枠は雑打ちの場として有用、という使い方もあります

非同期に振れるものは振る: Codex 的な fire-and-forget は、同期応答を待たないぶん思考時間を取り戻しやすい

「3 ツール契約＝生産性 3 倍」にはなりません。増えるのは選択肢であって、生産性はルール設計で決まる、という前提で試算するのが健全だと思います。


運用ルールの設計
ここまでの内容を、実際に回す運用ルールに落とし込みます。参考までに、自分が使っている簡易ルールを共有します。

デフォルト動線

すべての作業は Claude Code で開始する
作業中に「必須」条件（資料作成後・重要判断前）に触れたら、Codex か Gemini を呼ぶ
作業中に「推奨」条件（2 回失敗・選択肢に迷う・専門外・バグ原因不明）に触れたら、状況に合う別ツールを呼ぶ
セカンドオピニオンの結果を Claude Code に戻し、最終案を人間がレビューする


ツール選択のヒューリスティック

対話で別視点の批判がほしい → Codex CLI
非同期で PR まで自動生成したい → Codex Cloud（本記事では深追いしない）
長文・マルチモーダルの下処理 → Gemini
設計議論・リファクタ・長時間運用 → Claude Code
迷ったら Claude Code で十分

上記はあくまで筆者の手元での寄せどころで、Codex や Gemini を主役に据える構成も十分あり得ます。
「迷ったら Claude Code」にしているのは、運用を Claude Code 中心に組んでいる、というだけの事情です。Codex や Gemini を主に据える選択肢も十分あり得ます。

やりすぎないための工夫

1 タスクに対して呼ぶ AI は最大 2 つまで（メイン＋セカンド）
3 つ並列が必要と感じたら、タスクが分割不足のサイン
セカンドオピニオンの結果は「採用／不採用／保留」のどれかを明示する
会議ではなく人間の意思決定に戻す

「多ければ多いほど良い」ではない、という点は繰り返しておきます。


注意点
併用フレームを運用していて、気になった点を率直に書きます。

コンテキスト切り替えコスト
3 ツールをまたぐと、プロンプトの書き方・結果フォーマット・ショートカットキーなどが微妙に異なり、思ったより脳のリソースを食います。筆者の体感では、「どのツールを呼ぶべきか」を考える時間そのものが、作業時間の 5〜10% ほどを占める感触です。

意見が割れたときの扱い
Claude と Codex で意見が割れたとき、「どっちを信じるか」を AI 同士に決めさせるのは避けたほうが無難です。両方の根拠を人間が読み、第三の案に着地するほうが、結果として失敗が少ない印象があります。

使わない選択肢
この記事の主張と一見矛盾しますが、「1 ツールに統一する」という選択肢も十分合理的です。たとえば以下のようなケースは、併用より単一運用のほうが相性が良いと感じます。

短期の案件・MVP 開発で、ルール設計の時間が惜しい
チーム構成員のスキルがバラバラで、ツール数を絞ったほうがオンボーディングが楽
予算制約が厳しく、課金対象を 1 本に絞りたい

併用は"選択肢"であって"正解"ではありません。向き不向きで選ぶのが健全だと思います。

ベンダーロックの分散とその裏返し
3 ツール併用はベンダーロックを分散させる効果もあります。ただしその裏返しで、どのツールが廃止・値上げになっても部分的に影響を受けます。分散はリスク低減であると同時にリスクの面積を広げる、とも言えるので、このあたりも含めて中立に見るべき論点です。


まとめ

3 ツールは「最強決定戦」より「併用の設計」として捉えるほうが、実務の肌感に近いと感じています
各ツールの強みはフラットに把握し、タスク種別と速度・コスト・品質で棲み分けるのが基本線
セカンドオピニオンは「必須条件」「推奨条件」「呼ばない条件」で運用ルール化すると、やりすぎを防げます
Claude Code を主に据えて、Codex / Gemini を Skill 経由で呼ぶ構成は 1 つの選択肢です
併用は無条件に優れているわけではなく、1 ツール統一のほうが向く案件もあります

最後に、本記事はあくまで筆者の環境で落ち着いたフレームの一例です。各ツールは短いスパンでアップデートされており、半年後には棲み分けが変わっている可能性も十分あります。自分の手元で試して、自分のルールを書き直していくのが、結局のところ一番効くのではないかと思います。
同じように 3 ツール併用で運用している方のフィードバックや、「自分はこう棲み分けている」という知見もぜひ伺いたいです。

---

## 39. [毎回プロンプトで頑張らないためのPromptOps Templates｜hirokaji](https://note.com/tasty_dunlin998/n/n68eb27bc3b59)
- **優先度**: High
- **スコア**: 85
- **解析日時**: 2026/5/7
- **AI要約**:
  AIへの指示を棚卸しし、常設ファイル・Hook・Skill・Subagentへ分離する運用戦略を提示
  完了条件を定義する「Done when」テンプレートにより、AIによる自己評価と出力精度を改善
  CLAUDE.mdを肥大化させず、AIとの作業契約として最小限に保つための具体的な構成案を解説
- **今読む理由**: Claude Code等のAIエージェント導入時に直面する、プロンプトの冗長化や設定ファイルの肥大化を解決する実戦的なYAML形式のテンプレートと設計原則が含まれているため。
- **タグ**: #PromptOps, #AI駆動開発

### 本文
Claude Code / Codexで使う、Done when・Hook・Skill・承認境界の実務テンプレート前回のDaily記事では、AIが賢くなったことで、昔ながらのプロンプト術が少しずつ変わってきている、という話をしました。昔は、AIにうまく働いてもらうには、人間が長く、詳しく、丁寧に説明することが重要でした。もちろん今でも、丁寧な説明は大事です。ただ、Claude Code や Codex のように、AIがファイルを読み、コマンドを実行し、テストし、差分を確認できる環境では、毎回プロンプトで頑張るよりも、AIが動ける環境を整える方が効く場面が増えています。この記事は、その実務テンプレートです。扱うのは、次の7つです。Done when テンプレートCLAUDE.md / AGENTS.md 棚卸しチェックリストHook化候補リストSkill化候補リストSubagent分離判断メモApproval / Sandbox 境界設計メモCLI化できる作業の棚卸しワークシート目的はひとつです。毎回プロンプトでお願いしていることを、再利用できる実行環境へ移すことです。まず、毎回お願いしていることを書き出す最初にやることは自動化ではなく、毎回AIに言っている依頼を見える化し、置き場を分けること。いきなりHookやSkillを作ろうとすると、だいたい重くなります。最初にやるべきことは、自分がAIに毎回言っていることを棚卸しすることです。たとえば、こういうものです。最後にテストして変更ファイルを列挙して勝手に本番へつながないでまず関連ファイルを読んで実装前に方針を出して既存の文体に合わせてセキュリティ観点も見てやったことと不安点を最後にまとめて変更前に影響範囲を確認して形式が崩れていないか確認してこうした依頼は、毎回チャットに書くよりも、常設ファイル、Hook、Skill、Subagent、承認境界へ分けた方が安定します。まずは、次のメモをコピーして使ってください。routine_prompt_inventory:
  repeated_requests:
    - request: ""
      example_phrase: ""
      happens_every_time: false
      important_for_quality: false
      important_for_safety: false
      can_be_checked_deterministically: false
      needs_human_judgment: false
      should_be:
        - prompt
        - claude_md_or_agents_md
        - hook
        - skill
        - subagent
        - approval_boundary
        - cli_pipeline
      note: ""書き方の例です。routine_prompt_inventory:
  repeated_requests:
    - request: "変更後にテストを実行してほしい"
      example_phrase: "最後に npm test を実行して、結果を書いてください"
      happens_every_time: true
      important_for_quality: true
      important_for_safety: false
      can_be_checked_deterministically: true
      needs_human_judgment: false
      should_be:
        - hook
        - cli_pipeline
      note: "コード変更がある場合だけ必須にする"

    - request: "認証まわりはセキュリティ観点でレビューしてほしい"
      example_phrase: "token handling と session 周りも見てください"
      happens_every_time: false
      important_for_quality: true
      important_for_safety: true
      can_be_checked_deterministically: false
      needs_human_judgment: true
      should_be:
        - skill
        - subagent
      note: "特定領域に触れた時だけ発火させる"この棚卸しの時点で、すべてを自動化しようとしなくて大丈夫です。むしろ最初は、「これは毎回書く必要があるのか」「これは環境側に逃がせるのか」「これは人間が判断すべきなのか」を分けるだけで十分です。Template 1：Done when テンプレート曖昧な依頼は、完了条件に変換する。何をするかより、何を満たせば完了かを先に揃える。まず一番使いやすいのが、Done when、つまり完了条件です。AIに仕事を頼むとき、「何をするか」だけを書くと、完了判断が曖昧になります。一方で、「何を満たせば完了か」を渡すと、AIは自分で確認しやすくなります。基本形はこれです。以下の作業を行ってください。

目的:
- 

対象範囲:
- 

制約:
- 

完了条件:
- 
- 
- 

作業後に返すもの:
- 変更した内容の要約
- 変更ファイル一覧
- 実行した確認コマンド
- 確認結果
- 残っている不安点コード作業なら、こうです。以下のバグを修正してください。

目的:
- ログイン後にセッション更新が失敗する問題を直す

対象範囲:
- src/auth/
- tests/auth/

制約:
- 認証方式そのものは変えない
- 既存のAPIレスポンス形式は変えない
- 影響範囲が広がる場合は、実装前に一度止める

完了条件:
- 再現テストが追加されている
- 既存テストが通る
- セッション更新の正常系と異常系が確認されている
- 変更ファイルを最後に列挙している
- 実行した確認コマンドを書いている

作業後に返すもの:
- 原因
- 修正内容
- 変更ファイル
- 実行した確認コマンド
- テスト結果
- まだ不安が残る点文章作業なら、こうです。以下の記事本文をレビューしてください。

目的:
- note向けに読みやすくする
- 主張の流れを明確にする
- AIっぽい言い回しを減らす

対象範囲:
- 本文全体
- 見出し
- 導入と結論

制約:
- 主張の芯は変えない
- 文体は論考調を維持する
- 表形式にはしない
- 過剰な箇条書きにしない

完了条件:
- 導入で読者メリットが伝わる
- 見出しが結論に必要な部品だけになっている
- 1段落1役割に近づいている
- 文末に次の行動がある
- 不自然なAI定型句が減っている

作業後に返すもの:
- 修正方針
- 修正文
- 迷った点
- 追加で改善できる点Done when は、軽いプロンプト改善のように見えます。しかし実際には、AIに小さな評価回路を渡しているのに近いです。完了条件があると、AIは自分の出力を照らし合わせやすくなります。だから、最初にテンプレ化するなら、HookよりもSkillよりも、まずDone whenです。Template 2：CLAUDE.md / AGENTS.md 棚卸しチェックリストCLAUDE.md / AGENTS.md は百科事典ではなく作業契約。毎回守ることだけを残し、長い手順や確認は別の部品へ逃がす。次に見るべきなのが、CLAUDE.md や AGENTS.md のような常設ファイルです。ここに何でも書くと、すぐ太ります。常設ファイルに残すべきなのは、毎回守らないと壊れることです。逆に、特定作業だけで使う長い手順は、Skillへ逃がします。毎回起きてほしい確認は、Hookへ逃がします。人間が判断すべき境界は、Approvalへ逃がします。まずはこのチェックリストで見直します。persistent_contract_audit:
  file:
    - CLAUDE.md
    - AGENTS.md

  keep_if:
    - "毎回の作業で必要"
    - "このプロジェクト固有"
    - "守らないと壊れる"
    - "短く書ける"
    - "更新責任者が明確"

  move_to_skill_if:
    - "特定作業でだけ使う"
    - "手順が長い"
    - "入力と出力が決まっている"
    - "再利用するワークフローである"

  move_to_hook_if:
    - "毎回確認したい"
    - "機械的に判定できる"
    - "忘れると品質や安全性が落ちる"
    - "人間の判断を待たずに検査できる"

  move_to_approval_if:
    - "失敗時の影響が大きい"
    - "本番環境や外部送信に触れる"
    - "秘密情報や権限に関わる"
    - "破壊的な操作を含む"

  remove_if:
    - "一般論すぎる"
    - "古い"
    - "今の運用と矛盾している"
    - "誰も守っていない"
    - "他の場所に正本がある"常設ファイルの最小形は、これくらいで十分です。# Project Working Contract

## Purpose

このプロジェクトでAIが作業するときの最小契約を定義する。

## Always

- 変更前に対象範囲を確認する
- 既存の設計方針と矛盾する変更を避ける
- 不明点が成果物の品質に影響する場合は、実装前に確認する
- 作業後に変更内容、変更ファイル、確認結果をまとめる

## Commands

- lint: `npm run lint`
- test: `npm test`
- typecheck: `npm run typecheck`

## Before Editing

- 関連ファイルを読む
- 既存テストを確認する
- 影響範囲が広い場合は、実装前に変更方針を出す

## Do Not

- 本番環境へ接続しない
- secretやcredentialを出力しない
- 破壊的な操作を承認なしに実行しない
- 仕様が不明なまま大きな設計変更をしない

## Output

作業後は、以下を返す。

- 変更内容
- 変更ファイル
- 実行した確認コマンド
- 確認結果
- 残るリスクポイントは、ここに全部を書かないことです。常設ファイルは、AIに読ませる百科事典ではありません。毎回守るべき作業契約です。ここまでで、毎回プロンプトでお願いしていたことを、Done when と常設ファイルへ分けるところまで整理しました。ここから先は、さらに一段実務寄りです。毎回の確認を Hook にする。再利用する手順を Skill にする。調査やレビューを Subagent に分ける。危ない操作を Approval / Sandbox で止める。定型作業を CLI へ流す。つまり、AIにお願いする文章を整えるだけではなく、AIが動く環境そのものを整えていきます。PromptOps Templates では、こうした実務テンプレートを、そのまま自分の環境へ写せる形で蓄積していきます。Claude Code / Codex を、毎回のチャット相手ではなく、再現性のある実行環境として育てたい方は、ここから先のテンプレートもぜひ活用してください。

---

## 40. [AIエージェントは「増やす」と壊れる｜hirokaji](https://note.com/tasty_dunlin998/n/n969899421173)
- **優先度**: High
- **スコア**: 85
- **解析日時**: 2026/5/7
- **AI要約**:
  Sub-Agentは役割分担ではなく、親の文脈を汚さず探索・調査結果を圧縮して戻す隔離膜として機能する
  Agent Teamは共有タスクリストとメッセージングを用い、状態を管理しながら協調する実行組織である
  分割基準は職能（実装・テスト等）ではなく、同じ設計意図を共有すべきかという文脈の境界で判断する
- **今読む理由**: AI駆動開発において、エージェントを増やすことで発生する「文脈の汚染」や「伝言ゲームによる情報劣化」を防ぐための具体的な設計原則が示されているため。Claude Codeの最新仕様に基づいたSub-AgentとTeamの使い分けは、即座に自動化パイプラインの構築に適用できる。
- **タグ**: #AIエージェント設計, #ClaudeCode, #マルチエージェント, #コンテキスト管理

### 本文
PromptOps Runtime Tips #5 Sub-AgentとAgent Teamを分ける基準は、役割ではなく「文脈の境界」ですSub-Agent と Agent Team は、見た目はどちらも「複数AIを使う構成」に見えます。でも実際には、扱っている問題が違います。Sub-Agent は、文脈を汚さずに探索・検査・調査を外へ逃がす仕組みです。Agent Team は、複数の実行主体が、共有状態を見ながら協調する仕組みです。ここを取り違えると、AIシステムは一気に壊れます。1. Sub-Agent は「小さな部下」ではなく、文脈圧縮装置ですSub-Agent を単なる「専門家AI」と見ると、少し浅いです。本質は、メインエージェントの作業文脈を汚さず、外側で探索させ、最後に圧縮された結果だけを戻すことです。Claude Code の公式ドキュメントでも、Sub-Agent は「検索結果・ログ・ファイル内容などでメイン会話をあふれさせたくない副作業」を、自分の文脈で処理し、要約だけを返すものとして説明されています。各 Sub-Agent は独自の context window、system prompt、tool access、permissions を持ちます。つまり Sub-Agent の価値は、主に3つです。1つ目は、探索の隔離です。コードベース全体を grep する。大量のログを読む。複数資料を横断する。セキュリティ観点だけで見る。性能劣化の原因だけを探す。こういう作業は、途中経過が大量に出ます。そのまま親エージェントの文脈に入れると、メインの判断空間が汚れます。Sub-Agent に渡せば、泥臭い探索は外で行われ、親に返るのは「結論・根拠・残課題」だけになります。2つ目は、認知の分離です。1つのエージェントに、「実装もして」「セキュリティも見て」「性能も見て」「テスト観点も見て」「ドキュメントも整えて」と詰め込むと、注意が散ります。Sub-Agent を使うと、各エージェントに明確な観点を与えられます。セキュリティ担当はセキュリティだけを見る。性能担当は性能だけを見る。仕様整合性担当は仕様だけを見る。これは、人間の組織で言えば専門分業ですが、AIの場合はさらに重要です。なぜなら、AIは文脈内の情報に強く引っ張られるため、観点を混ぜると評価軸が濁りやすいからです。Anthropic のマルチエージェント研究でも、Sub-Agent は別々の context window で異なる観点を探索し、重要な情報だけを lead agent に返すことで、検索・調査の圧縮として機能すると説明されています。(Anthropic)3つ目は、権限の分離です。Sub-Agent ごとに使えるツールを制限できます。たとえば、調査専用 Sub-Agent は Read / Grep / Glob だけDB確認 Sub-Agent は SELECT だけレビュー Sub-Agent は編集不可実装 Sub-Agent は対象ディレクトリだけ編集可という切り方ができます。Claude Code の Sub-Agent でも、tools / disallowedTools / model / permissionMode / memory / isolation などを設定できます。さらに、description は「いつその Sub-Agent に委譲すべきか」を判断するルーティング信号として使われます。(Claude API Docs)ここが重要です。Sub-Agent は「AIを増やす仕組み」ではありません。親の文脈・注意・権限・コストを守るための分離膜です。2. Agent Team は「複数 Sub-Agent」ではなく、共有状態を持つ実行組織ですAgent Team はまったく別物です。Sub-Agent は基本的に、親から仕事を受けて、親に結果を返します。一方、Agent Team は、複数の Claude Code インスタンスがチームとして動き、共有タスク、エージェント間メッセージ、中央管理を使って協調します。Claude Code の Agent Teams は現時点で実験的機能として扱われ、共有 task list、inter-agent messaging、team lead、teammates を持つ構成として説明されています。この違いは大きいです。Sub-Agent は、基本的にこうです。親 → 作業者 → 親Agent Team は、こうです。Lead↕Shared Task List↕ ↔ ↕Teammate A / Teammate B / Teammate Cここで初めて、共有状態が出てきます。誰が何を担当しているか。どのタスクが pending か。どれが in progress か。何が completed か。どのタスクが他のタスクに依存しているか。誰が誰にメッセージを送るか。Claude Code の Agent Teams では、task list が pending / in progress / completed を持ち、依存関係のあるタスクはブロックされ、複数 teammate が同じタスクを claim しないよう file locking も使われると説明されています。つまり Agent Team は、単なる「並列実行」ではありません。状態管理つきの協調実行です。ここが Sub-Agent との決定的な違いです。3. 判断軸は「独立して進められるか」では足りませんよくある判断は、「独立タスクなら Sub-Agent」「依存タスクなら Team」です。これは方向性としては正しいです。ただ、実務ではまだ粗いです。本当に見るべきなのは、次の5つです。① 文脈結合度その作業は、同じ前提・同じ判断理由・同じ設計意図を共有し続ける必要があるか。必要があるなら、分けない方がよいです。たとえば、仕様理解実装方針テスト観点例外処理エラー設計が密接につながっているなら、「Planner」「Implementer」「Tester」に分けると危険です。Planner が考えた理由が Implementer に落ちない。Implementer が入れた判断が Tester に伝わらない。Tester は表面だけ見て、設計意図を外したテストを書く。これが、図にある “telephone game” です。AIの分業で一番よく起きる事故です。② 成果物の境界同じファイル、同じAPI、同じ仕様、同じ画面を触るなら、分けるほど衝突します。Agent Team の公式ドキュメントでも、同じファイルを複数 teammate が編集すると上書きが起きるため、ファイル所有範囲を分けるよう注意されています。つまり、並列化できるかどうかは「担当ロール」では決まりません。成果物の所有境界で決まります。Frontend / Backend / Test Writer のように分けても、全員が同じ API 仕様に依存しているなら、共有状態なしでは壊れます。一方で、auth/billing/notification/admin-ui/のように文脈と成果物が切れているなら、分けやすいです。③ 変更の同期頻度作業中に頻繁に「そっち変わった？」が発生するなら、Sub-Agent ではきついです。Sub-Agent は基本的に、途中で他 Sub-Agent と相談しません。Claude Code の比較でも、Sub-Agent は結果を main agent に返すだけで、Agent Teams は teammates 同士が直接メッセージし、shared task list で自己調整すると整理されています。つまり、同期頻度が高い作業は Team 向きです。たとえば、API構造が変わるDBスキーマが変わるフロントとバックエンドが相互に調整するテスト観点が実装中に変わる仕様の穴を見つけたら別担当に即共有したいこの場合は、Sub-Agent の「結果だけ返す」モデルでは遅いです。共有 task list と direct message が必要になります。④ 途中成果の価値途中経過が親にとって不要なら、Sub-Agent でよいです。たとえば、「このモジュールの脆弱性を洗って、重要度付きで返して」なら、途中の grep 結果は親に不要です。一方で、「仕様が固まりきっていない新機能を、フロント・バックエンド・テストを調整しながら作って」なら、途中の発見が全体設計に影響します。この場合、途中成果が共有状態になります。だから Team が必要になります。⑤ 失敗時の封じ込めSub-Agent の良さは、失敗が局所化しやすいことです。Security Reviewer が変な指摘をしても、親が採用しなければ終わりです。しかし Agent Team は、状態を共有します。間違った前提が shared task list や team message に流れると、チーム全体に伝播します。つまり Team は強いですが、失敗も増幅します。この意味で、Team は「高性能な協調構造」であると同時に、誤った状態を広げる回路にもなります。だから、Team を使うなら quality gate、plan approval、task ownership、evidence logging が必要です。Agent Teams でも、teammate の plan approval、task completed hook、quality gate などの制御が用意されています。4. 「役割で分けるな。文脈で分けろ」が本質です図の一番大事なところはここです。間違った分け方は、PlannerImplementerTesterです。一見、自然です。でも、これは人間組織の職能分解を、そのまま AI に持ち込んでいます。AIでは、この分け方がよく壊れます。なぜなら、AIにとって重要なのは「職能」ではなく、必要な文脈の集合だからです。たとえば、ある機能を作るとします。この機能には、実装テストエラー処理型定義ドキュメント軽いリファクタが必要です。これを職能で分けると、実装 Agentテスト Agentドキュメント Agentレビュー Agentになります。でも、本当はこう見るべきです。この機能を正しく作るために、同じ設計意図を共有すべき作業はどれか。実装とテストは、多くの場合、同じ文脈に入れるべきです。なぜなら、テストは実装の外側にある作業ではなく、仕様理解と例外設計をコード化する作業だからです。実装 Agent が「なぜこうしたか」を持っているなら、そのままテストも書いた方が、意図が落ちにくい。一方で、Auth Agent のように、まったく別のセキュリティ境界や権限境界を扱うものは分けた方がいい。つまり、分ける基準はこうです。同じ判断理由を共有するなら同じ Agent。違う文脈・違う権限・違う成果物なら分ける。これが、Sub-Agent / Agent Team 設計の中心原理です。5. 5つのパターンは「エージェント種別」ではなく、制御パターンです提示文にある5パターンは重要です。ただし、これらは「全部マルチエージェントにしろ」という話ではありません。Anthropic の “Building Effective Agents” でも、Prompt Chaining、Routing、Parallelization、Orchestrator-workers、Evaluator-optimizer は再利用可能な workflow pattern として整理されています。さらに、複雑な agentic system は必要になったときだけ追加すべきで、まず単純な構成から始めるべきだと述べられています。ここを誤解しない方がいいです。5パターンは、AIシステムの制御部品です。Pattern 1: Prompt Chainingこれは、直列パイプラインです。例：要件を整理する設計案を作るレビューする修正する最終出力するこれは Agent Team ではありません。むしろ、もっとも堅い workflow です。向いているのは、工程があらかじめ分かっている作業です。記事執筆なら、主題抽出構成案本文編集タイトルハッシュタグのような流れです。これは Team より Prompt Chaining の方が安定します。Pattern 2: Routingこれは、分類して適切な処理へ送る仕組みです。例：簡単な質問 → 軽量モデル難しい設計判断 → 高性能モデルセキュリティ関連 → Security ReviewerUI関連 → UI Contract Agent事実確認 → Research AgentClaude Code の Sub-Agent でも、description が「いつ委譲するか」の判断材料になります。Routing は、AIハーネス設計でいうと、かなり重要です。なぜなら、すべてを同じAIに渡すのではなく、仕事の性質に応じて処理面を変えるからです。Pattern 3: Parallelizationこれは、独立作業を並列に走らせるパターンです。例：セキュリティレビュー性能レビュー可読性レビューテストカバレッジレビュー反論・弱点探しAnthropic は Parallelization を、独立サブタスクを分ける sectioning と、同じタスクを複数回走らせて多様な出力を得る voting の2種類で整理しています。複数観点を分けることで、各 LLM call が1つの観点に集中できるとも説明されています。ここで使うのが Sub-Agent です。ただし、独立している場合だけです。Pattern 4: Orchestrator–Workerこれは、親が動的にタスクを分解し、Worker に割り振り、結果を統合するパターンです。Anthropic は Orchestrator-workers を、中央の LLM がタスクを動的に分解し、worker LLM に委譲し、結果を統合する workflow として説明しています。特に、事前にサブタスクを予測しにくい複雑なコーディングや探索タスクに向いています。これは Sub-Agent にも Team にもなり得ます。Worker 同士が話さなくていいなら Sub-Agent。Worker 同士が途中で調整する必要があるなら Agent Team。ここが分岐点です。Pattern 5: Evaluator–Optimizerこれは、生成と評価を分けるループです。Generator が作るEvaluator が評価するOptimizer が修正する基準を満たすまで回すAnthropic は Evaluator-optimizer を、生成する LLM call と評価・フィードバックする LLM call をループさせる workflow として整理し、明確な評価基準があり、反復改善に価値がある場合に有効だと述べています。これは、わたしの文脈でいうと「思考タスクのテスト」にかなり近いです。コードにはテストがある。文章には編集基準がある。要件には妥当性評価がある。AIハーネスには evaluation circuit がある。Evaluator–Optimizer は、評価回路の基本形です。6. Sub-Agent と Agent Team を、AIハーネスの4回路＋証跡基盤で見るこの話は、かなりきれいに「4回路＋証跡基盤」に乗ります。状態回路Sub-Agent は、状態を基本的に親へ持ち帰りません。親に戻るのは、圧縮された結果です。つまり、Sub-Agent は「状態を増やさないための設計」です。一方で Agent Team は、状態を共有します。shared task list、task dependency、message、progress、ownership が存在します。つまり、Agent Team は「状態を明示的に持つ設計」です。ここが根本差です。制御回路Sub-Agent の制御は親に集中します。親が投げる。Sub-Agent が作業する。親が採用・棄却する。Agent Team の制御は分散します。Lead が全体を見ますが、teammate は task list を見て自己 claim したり、互いに message したりします。Claude Code の Agent Teams でも、lead assigns と self-claim の両方が説明されています。つまり、Sub-Agent は中央制御。Agent Team は中央制御＋分散実行です。接続回路Sub-Agent の接続は、親との接続だけです。親から入力され、親へ返す。Agent Team は、teammate 間の connection を持ちます。ここで重要になるのが、接続面の設計です。誰が誰に何を伝えてよいか。何を shared task list に書くか。何を direct message にするか。何を lead に戻すか。何を証跡として残すか。これを決めないまま Team を動かすと、会話が増えすぎて、coordination cost が爆発します。Agent Teams は、単一セッションより token を大きく使い、active teammate の数に応じて token usage が増えると公式ドキュメントでも説明されています。評価回路Sub-Agent では、親が評価者になります。結果を見て、採用するか判断します。Agent Team では、評価も構造化しないと危険です。たとえば、Plan approvalTask completed hookLint / test gateEvidence requiredReviewer teammateLead synthesis checkが必要になります。Claude Code の Agent Teams では、TaskCreated / TaskCompleted / TeammateIdle などの hook によって、タスク作成や完了時に品質ゲートを差し込める設計が説明されています。ここまで入れて、ようやく Team は「実務に耐える協調構造」になります。証跡基盤Sub-Agent の証跡は、主に「結果レポート」です。Agent Team の証跡は、もっと重いです。task listdependenciesmessagesownershipplan approvalsfile changestest resultsfinal synthesisrejected assumptionsまで残す必要があります。これがないと、後から「なぜこの判断になったのか」が追えません。つまり Agent Team は、証跡基盤なしで運用すると危険です。7. 実務での使い分け単一 Agent でよいケースまず、単一 Agent で足りるなら、それが一番強いです。作業が短い文脈が1本で済む出力が1つ途中分岐が少ない評価基準が明確大量探索がないこの場合、エージェントを増やすと逆に悪化します。Anthropic も、最初から複雑な agentic system を組むのではなく、まず単純な prompt から始め、評価で必要性が示されたときだけ複雑さを足すべきだと述べています。Sub-Agent が効くケースSub-Agent が効くのは、探索・検査・観点分離・圧縮が必要なときです。たとえば、大きなコードベースの探索セキュリティレビューパフォーマンス調査ドキュメント整合性チェック反論・リスク洗い出し事実確認競合サービス調査大量資料の要点抽出記事本文の弱点レビュープロンプトテンプレの穴探しこの場合、Sub-Agent は非常に強いです。なぜなら、親に返ってくるのは「使える信号」だけだからです。Agent Team が効くケースAgent Team が効くのは、並列探索だけでなく、途中で協調が必要なときです。たとえば、フロント・バックエンド・テストが同時に変わる複数ファイル群を別々に担当するAPI設計の変更が複数担当に波及する仮説検証を複数方向で走らせ、途中で互いに反証する新規モジュールを複数パートに分けて作るPRレビューで複数観点が互いに指摘を突き合わせるClaude Code の Agent Teams も、research and review、新規モジュールや機能、競合仮説による debugging、frontend/backend/tests をまたぐ cross-layer coordination などを適用例として挙げています。ただし、Team は重いです。Agent Teams の公式ドキュメントでも、coordination overhead と token cost が増えるため、sequential tasks、same-file edits、依存が多い作業では single session や subagents の方がよいとされています。8. よくある設計ミスミス1：複雑そうだから、すぐマルチエージェントにするこれは危険です。複雑なタスクには、まず構造化が必要です。いきなり複数エージェントにすると、複雑さが減るのではなく、複雑さが分散して見えなくなることがあります。本来やるべき順番は、単一 Agent で文脈を保つ固定工程なら Prompt Chaining にする分類できるなら Routing を入れる独立探索なら Sub-Agent を使う協調が必要なら Agent Team にする継続運用するなら Harness にするです。ミス2：役職名で分けるPlanner / Developer / Tester は、見た目はきれいです。でも、文脈境界としては雑です。実装とテストが同じ判断理由を共有しているなら、分けない。逆に、セキュリティ監査のように観点も権限も違うなら、分ける。このように、役職ではなく知るべき情報の範囲で切るべきです。ミス3：Team にしたのに、shared task list が弱いAgent Team で一番重要なのは、会話ではありません。共有タスクです。会話だけで協調すると、状態が流れます。「さっき言った」「誰かがやると思った」「どのタスクが終わったか曖昧」「依存関係が分からない」こうなります。Team を使うなら、最低でも次が必要です。task:
  id: api-contract-update
  owner: backend-agent
  status: in_progress
  depends_on:
    - schema-review
  output:
    - updated_openapi_schema
    - migration_notes
  evidence:
    - changed_files
    - test_results
    - unresolved_questionsこのくらいまで落とすと、ようやく共有状態になります。ミス4：Sub-Agent に文脈を渡しすぎるSub-Agent に大量文脈を渡すと、本来の利点が消えます。Sub-Agent は、親文脈を丸ごとコピーするためのものではありません。必要なのは、目的対象範囲非対象範囲使用可能ツール出力形式根拠の出し方不確実性の扱いです。これだけで動くようにするのが理想です。なお Claude Code には forked subagent という形もあり、これは親会話を引き継ぐため説明コストは減りますが、入力分離は弱まります。公式ドキュメントでも、fork は通常の Sub-Agent と違って会話履歴を継承するため、入力隔離が落ちると説明されています。つまり、便利ですが乱用すると「文脈をきれいに保つ」という利点が減ります。ミス5：評価役を最後に置くだけEvaluator を最後に置くのは悪くありません。でも、それだけだと遅いです。本当に必要なのは、工程ごとの gate です。依頼を受けた時点で、曖昧さを評価する設計前に、前提不足を評価する実装前に、影響範囲を評価する完了前に、テストと証跡を評価する出力前に、読者・利用者にとっての妥当性を評価するEvaluator–Optimizer は最後の校正装置ではなく、途中でズレを検知する制御回路として使うべきです。ここまでで、Sub-Agent と Agent Team の違いはかなり見えてきたと思います。大事なのは、AIを何体に増やすかではありません。どこで文脈を切るか。 どこまでを同じAIに持たせるか。 どこから先を別の実行単位に逃がすか。 そして、共有状態を持たせるなら、どのように管理するか。ここを間違えると、マルチエージェント構成は一見すごそうに見えても、実務ではすぐに壊れます。ここから先は、メンバーシップ向けに、この記事の考え方をそのまま使える形へ落とします。具体的には、Sub-Agent を設計するときの contract。 Agent Team を組むときの shared task list 設計。 「単一Agent / Sub-Agent / Agent Team / Harness」の使い分けチェックリスト。 そして、note記事制作・コード開発・調査業務に応用するための実務テンプレート。考え方で終わらせず、実際に自分のAI運用へ組み込めるところまで整理します。メンバーシップでは、こうしたAIハーネス設計・プロンプト設計・実務テンプレート化の話を、より具体的な形で積み上げています。興味がある方は、ここから先も読んでみてください。

---

## 41. [Gemini CLI で Subagents を活用し、ブログ執筆を Orchestrate してみた(情報収集→執筆→ファクトチェック→修正 をサイクリックに) #GoogleCloud - Qiita](https://qiita.com/hirosait/items/d43936339965618cafef)
- **優先度**: High
- **スコア**: 85
- **解析日時**: 2026/5/7
- **AI要約**:
  Gemini CLIのSubagents機能を使い、情報収集から執筆、検閲までを行う多段階自動化フローを構築。
  エージェントごとにツール権限やプロンプトを定義し、ファイル経由で工程間の情報を引き継ぐ設計を提示。
  ファクトチェックの結果に応じてエラー判定エージェントが前工程へ差し戻す、自律的なサイクルを実現。
- **今読む理由**: AI駆動開発において重要なマルチエージェント・オーケストレーションの具体的な定義ファイル（YAML形式）と、エラー時の差し戻しを含む動的パイプラインの構築手法が明記されているため。
- **タグ**: #AgenticWorkflow, #GeminiCLI

### 本文
🤖 AI 利用について：本記事は生成 AI と共同で執筆しています。また、スクリーンショット以外の画像は生成 AI によって作成されたものです。


はじめに
この記事は、別記事の Gemini CLI にSubagents がやってきた。機能やメリット纏め。の続きのような形で記載しています。
Gemini CLI にサブエージェントがやってきた。機能やメリット纏め。
本記事では、上記に続いて、Subagents を使って Multi Agents Pipeline の解説と組み方例を纏めていきたいと思います。
せっかく Gemini CLI 使うので、テーマは「Google Cloud Next '26 の速報ブログをSubagents で自動生成する」フローにしようかなと思います。
※この記事公開時点では Google Next 26 が開催中でしたが、現在は終了しております。
今回の Subagents 活用でこのような記事が、校正、ファクトチェックを行ったうえで、ポン出しできます。
生成されたブログ抜粋
# 「Agentic」が完全に現実になった！ Google Cloud Next '26 速報レポート

## はじめに

今年もやってきました Google Cloud Next '26 です。ラスベガスの会場は熱気に包まれていますが、発表内容の熱量も非常に高いものとなっています。今回のイベントで、至るところで耳にするキーワードが「Agentic（エージェンティック）」です。

これまでの AI は「質問に答えてくれるもの」でしたが、これからは「自律的にタスクを完結させてくれるエージェント」へと完全にシフトしたことが明確になりました。Day 1 と Day 2 で発表された主要なアップデートを、事実に基づいた視点で纏めてお届けします。

（本記事の内容は 2026 年 4 月時点の速報に基づいています）

## Vertex AI が「Gemini Enterprise Agent Platform」へ進化

まず大きな衝撃を与えたのがこの発表です。Google Cloud の AI 基盤として親しまれてきた Vertex AI が、新たに「Gemini Enterprise Agent Platform」へとリブランドされました。
...





今回作るもの
速報ブログには相反する2つの要件があります。「早く出す」と「正確に出す」です。人間のチームで言うと、情報収集して、精査して、書いて、確認して、問題があれば差し戻したり修正する、という流れが必要になります。これをそのままサブエージェントに置き換えるとこんな設計になるかなと思います。
orchestrator
│
├── Phase 1（並列）
│   ├── researcher_official  : 公式ブログ・プレスリリースから収集 → report/01_official.md
│   ├── researcher_sessions  : セッション情報を収集              → report/01_sessions.md
│   └── researcher_news      : テックメディア・SNS速報を収集      → report/01_news.md
│
├── Phase 2
│   └── google_ai_specialist : 収集情報を精査・キュレーション     → report/02_curated.md
│
├── Phase 3
│   └── tech_writer          : 速報ブログを執筆                  → draft/03_blog.md
│
├── Phase 4
│   └── fact_checker         : ソース証跡と照合・ファクトチェック  → review/04_factcheck.md
│
└── Phase 5（NG時のみ・最大2サイクル）
    └── error_router         : 情報収集 or 執筆、差し戻し先を判定 → review/05_reroute.md

可愛くするとこんな感じです。

設計のポイントとしては、
ファクトチェック → 差し戻しのサイクルを組み込んでいます。ライターが書いたブログをファクトチェッカーがソース証跡と照合し、NGなら error_router が「情報収集の問題か執筆の問題か」を切り分けて差し戻します。最大2サイクルで、それでも解決しなければ人間にエスカレーションする設計です。
各エージェントはコンテキストが独立しているため、フェーズをまたいだ情報の引き継ぎはファイル経由で行います。どこかで意図と違う結果になっていた場合も中間ファイルを確認すればすぐに気づけるので、お気に入りな仕組みです。


Google Cloud Next '26 速報ブログ作成フローを実際に組んでみる
それでは先程のフローの簡易版として、おおよそのサブエージェント定義、簡易オーケーストレーター書いていきます。

前提

Gemini CLI がインストール済みであること
Google アカウントで認証済みであること


Step 1: ディレクトリを作成する
mkdir -p .gemini/agents report draft review evidence


Step 2: agents を定義する
5つのエージェント定義ファイルを .gemini/agents/ に作成します。それぞれ frontmatter でツールを絞り込み、本文にシステムプロンプトを書く形式です。
リサーチャー系の定義例（researcher_official.md）はこんな感じです。
---
name: researcher_official
description: Google Cloud Next '26 の公式ブログ・プレスリリース・Cloud Nextサイトから Agentic 関連情報を収集するエージェント。公式発表のみを対象とする。
tools:
  - google_web_search
  - web_fetch
  - write_file
temperature: 0.1
max_turns: 40
timeout_mins: 20
---

あなたは Google Cloud の公式情報を専門に収集するリサーチャーです。
Google Cloud Next '26 Day 1 に関する公式ソースから「Agentic」に関連する情報を収集し、
./report/01_official.md に保存してください。
（以下、収集対象・出力形式の指示が続く）

精査・執筆担当はツールを読み書きだけに絞るとこんな感じです。
---
name: google_ai_specialist
description: 収集された Agentic 関連情報を精査・キュレーションするエージェント。重要度・信頼性を評価し、ブログに使える情報を整理する。
tools:
  - read_file
  - write_file
---

あなたは Google AI プロダクトに精通したスペシャリストです。
収集された情報の重要度・新規性・信頼性を評価してください。

収集済みの情報ファイルを読み込み、以下の観点で精査した結果を ./report/02_curated.md にまとめてください。
(以下、観点を記載していく)

---
name: tech_writer
description: キュレーション済みの情報をもとに速報技術ブログを執筆するエージェント。
tools:
  - read_file
  - write_file
---

./report/02_curated.md を読み込み、Google Cloud Next '26 Day 1 Agentic 速報ブログを ./draft/03_blog.md に執筆してください。

ファクトチェッカーや error_router も同じ形式で定義します。
---
name: fact_checker
description: 執筆されたブログの内容をソース証跡と照合してファクトチェックするエージェント。事実誤認・誇張・出典不明の記述を検出する。
tools:
  - read_file
  - write_file
---

./draft/03_blog.md の内容を ./report/ 配下の収集済みファイルと照合し、
事実誤認・誇張・出典が確認できない記述をチェックして ./review/04_factcheck.md に保存してください。
チェック結果は OK / NG と、NG の場合は該当箇所と理由を明記してください。

error_router はこんな感じです。
---
name: error_router
description: ファクトチェックがNGだったとき、問題の原因が情報収集にあるか執筆にあるかを判定して差し戻し先を決めるエージェント。
tools:
  - read_file
  - write_file
---

./review/04_factcheck.md を読み込み、NGの原因を分析してください。
情報収集の不足・誤りが原因であれば Phase 1（researcher）への差し戻しを、
執筆の表現・解釈の問題であれば Phase 3（tech_writer）への差し戻しを判定し、
結果と差し戻し理由を ./review/05_reroute.md に保存してください。


Step 3: オーケストレーターを作成する
フロー全体の制御はオーケストレーター（orchestrator.md）に書きます。各フェーズで @エージェント名 を使って明示的に呼び出す形です。簡易版はこんな構成になります。
# Google Cloud Next '26 Agentic ブログ作成

## Pre-Phase: ディレクトリ作成

mkdir -p ./report ./draft ./review

## Phase 1: 情報収集

@researcher_official Google Cloud Next '26 Day 1 の Agentic 関連情報を公式ソースから収集して ./report/01_official.md に保存して。

## Phase 2: 専門家精査

@google_ai_specialist ./report/01_official.md を精査して重要情報をキュレーションし ./report/02_curated.md に保存して。


## Phase 3: ブログ執筆

@tech_writer ./report/02_curated.md をもとに Google Cloud Next '26 Day 1 Agentic 速報ブログを執筆して ./draft/03_blog.md に保存して。

## Phase 4: ファクトチェック

@fact_checker ./draft/03_blog.md の内容を ./report/ 配下のソース証跡と照合してファクトチェックし ./review/04_factcheck.md に保存して。

## Phase 5: 差し戻し判定（NG時のみ・最大2サイクル）
<!-- ./review/04_factcheck.md を確認して NG だった場合のみ実行する -->

@error_router ./review/04_factcheck.md を読んで原因を判定し、差し戻し先と理由を ./review/05_reroute.md に保存して。

./review/05_reroute.md を読んで、差し戻し先が researcher なら Phase 1 を、tech_writer なら Phase 3 を再実行して。


各フェーズの成果物はファイルに書き出して次フェーズに引き継ぐファイルリレー方式です。

Step 4: Gemini CLI を起動して実行する
gemini

起動後に /agents list でエージェントが読み込まれていることを確認してから、オーケストレーターに一言投げるだけです。
> orchestrator.md を読んで、Google Cloud Next '26 Day 1 の Agentic ブログ作成を開始して。

Phase 1 から始まり、精査 → 執筆 → ファクトチェックと流れて、問題があれば自動で差し戻しサイクルが回ります。記載結果は冒頭のとおりです。


まとめ
Suagents を使った Multi Agents Pipelineを実際に組んでみました。
改めて感じたのは、フローをファイルリレーで設計するというアプローチの堅牢さです。コンテキストが独立しているぶん、エージェント間の引き継ぎはファイル経由でやってみましたが、「どのフェーズで何が起きたか」を追いやすくしてくれました。今回のように差し戻しがあるような場合、人間の追うことができますね。
並列実行(今回は実施していない)・フィードバックループと、シングルエージェントでは難しかった構成が Markdown ファイルでコントロールして、仮想チームのように、人員、役割を決めて、フローを決めて、チームを組めるのは、使っていて面白いし、可能性がかなり広がるなと思いました。今後も色々と活用シーン考えていきたいです。


参考

Gemini CLI Subagents ドキュメント
Gemini CLI コマンドリファレンス（/agents）

---

