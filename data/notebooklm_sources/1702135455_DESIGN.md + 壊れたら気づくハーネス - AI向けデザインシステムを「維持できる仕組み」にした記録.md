# DESIGN.md + 壊れたら気づくハーネス - AI向けデザインシステムを「維持できる仕組み」にした記録
- **Source URL**: https://zenn.dev/tsubotax/articles/7f0d3693f70e2f
- **Priority**: high
- **AI Summary**:
  - AIエージェントが正確なUIを生成・維持するための3層構造（憲法・仕様・検証）の設計手法を解説。
  - ドキュメントと実装の乖離を防ぐため、仕様をJSONで構造化し自動検証する「ハーネス」の重要性を提示。
  - CLAUDE.mdからデザイン原則を分離し、Cursor等の他ツールでも再利用可能な設計への移行を推奨。
- **Read Now Reason**: AIを活用したUI開発において、プロンプトの肥大化や品質の劣化を即座に解決できる具体的かつ実践的なステップ（Step 1-3）が示されているため。
- **Suggested Tags**: #AI駆動開発, #デザインシステム, #ClaudeCode, #フロントエンド
- **Processed Date**: 2026/5/3

---

## 本文
AI-Readyなデザインシステムmelta UIを作った
melta UIは、AIエージェント（Claude Code、Cursor等）がUI生成時に参照するためのデザインシステム。Tailwind CSSベースで、28コンポーネント・99デザイントークン・MCPサーバーを備えている。OSSとして公開中。

普通のデザインシステムとの違いは「AIが読んで、正しいUIを書ける」ことを前提に設計している点。トークンやコンポーネントの仕様を機械可読な形で持ち、禁止パターンを明示し、MCPツール（Claude CodeなどのAIエージェントがプログラムとして呼び出せるAPI）で検索・検証できる。


 先に結論を書く
DESIGN.mdを導入して、CLAUDE.md 1枚だった仕組みを3層構造に作り変えた。A/Bベンチマークでスコアを比較した結果がこれ。



プロンプト
旧（CLAUDE.md 1枚）
新（DESIGN.md + contracts）




顧客一覧テーブル
95
90


ネオンダッシュボード（red-team）
95
95


巨大シャドウ（red-team）
90
90


平均
93
92



僕のケースでは、生成品質はほぼ同じだった。
ただしこれは、旧版のCLAUDE.mdを18KBかけてかなり丁寧に作り込んでいたから。Quick ReferenceにTailwindクラスを全部書き、禁止パターンを76項目列挙し、コンポーネント仕様もインラインで記述していた。ここまでやれば、AIはMarkdownの禁止ルールもちゃんと守る。
一般的には、CLAUDE.mdやカーソルルールにここまでの解像度で書いている人は多くないと思う。DESIGN.mdとして設計原則・Quick Reference・禁止パターンを構造化するだけで、生成品質が目に見えて上がるケースの方が多いはず。
僕の場合、DESIGN.mdを伴う生成品質の向上も大事だけど、サービス開発で使っていくために「今日の品質」ではなく「半年後も品質が落ちない仕組み」を 作っていく必要がある。

 1ファイルに全部入りの限界
melta UIを最初は「CLAUDE.md 1枚に全部入り」で作っていた。
設計原則、Quick Reference、禁止パターン76項目、コンポーネント仕様28個、テーマ設定、デプロイ手順。全部まとめて18KB。AIがこの1ファイルを読めば、DS準拠のUIが書ける。
実際、動いていた。でも運用していくと3つの問題が見えてきた。
ルールの分散。 禁止パターンはMarkdownの表に76項目書いてあるのに、MCPサーバーで自動検出できるのは19件だけ。残り57件は「AIがMarkdownを読んで自主的に守る」ことに依存していた。
数値のズレ（ドリフト）。 ショーケースサイトに「76項目の禁止パターン」と手書きしているが、実は88項目に増えている。誰も気づかない。components.jsonの手書きデータとMarkdownの記述がズレても検知する仕組みがない。ドキュメントの数値と実態が静かに乖離していく、この現象を「ドリフト」と呼んでいる。
拡張性。 コンポーネントを追加するたびに、CLAUDE.mdのQuick Reference、components.jsonのメタデータ、components/*.mdの仕様書の3箇所を手動で更新する必要がある。1つ忘れたら整合が崩れる。
別のプロジェクトでも同じことを経験した。DSの定義ファイルは充実しているのに、AIが読むと精度が落ちる。ドキュメント間の数値がいつの間にかズレる。「定義はあるのにAIが使えない」問題と「ドキュメントは嘘をつく」問題。

 3層に分けた
1ファイルに入っていた情報を3つの層に分離した。
Layer 1: 憲法（DESIGN.md）。 AIが最初に読む入口。ブランドの思想、絶対に守る7つの原則、すぐにコードが書けるQuick Reference。8.6KB。これだけで基本的なUIが生成できる。CLAUDE.mdと違ってClaude専用ではないので、CursorやCopilotでもそのまま使える。
Layer 2: 仕様（contracts/）。 コンポーネントと禁止ルールの仕様をJSONで構造化した。全28コンポーネントのバリアント・サイズ・アクセシビリティ要件、89件の禁止ルール。曖昧さがない、唯一の真実（Single Source of Truth）。
Layer 3: 検証（harness）。 Layer 2の整合性を自動検証するスクリプト群とテスト。GitHub ActionsでPRのたびに自動実行される。
CLAUDE.mdは18KBから5.5KBになった。デザイン仕様は全部DESIGN.mdに移して、CLAUDE.mdは「Claude Codeでの作業手順」だけを書く場所にした。
DESIGN.mdを作ること自体は難しくない。大事なのは Layer 2 と 3 がセットであること。DESIGN.md だけ作って終わると、結局 CLAUDE.md 時代と同じ問題（ドリフト、分散、手動更新）が形を変えて再発する。仕様を構造化して、壊れたら気づく仕組みを入れて、初めて「維持できるDS」になる。

 自分のプロジェクトで始めるなら
3層構造と聞くと大げさに聞こえるが、段階的に始められる。melta UIでも最初から全部作ったわけではない。

 Step 1: DESIGN.mdを1枚書く
CLAUDE.mdにデザイン仕様を書いている人は、まずそれをDESIGN.mdに分離する。CLAUDE.mdにはClaude Codeの作業手順だけ残す。
最低限こんな形。
# DESIGN.md

## 原則
1. semantic colorを使う（bg-blue-500ではなくbg-primary-500）
2. shadow-sm〜shadow-mdまで。shadow-lg以上はモーダル限定
3. アクセシビリティはデフォルト（WCAG 2.1 AA）

## Quick Reference
カード: bg-white rounded-xl border border-slate-200 p-6 shadow-sm
ボタン: inline-flex items-center justify-center h-10 px-4 bg-primary-500 text-white rounded-lg
入力欄: w-full px-3 py-2 border border-slate-300 rounded-lg

## 禁止パターン
- text-black → text-slate-900
- shadow-lg → shadow-sm
- border-t-4（カラーバー）→ border border-slate-200
CLAUDE.mdにはこういうことだけ残す。
# CLAUDE.md

## 最初に読むファイル
- デザイン仕様: DESIGN.md
- 作業手順: このファイル

## 作業ルール
1. UI生成時は DESIGN.md を読む
2. 完了前に npm run design:check を走らせる
3. generated file は直接編集しない

## npm scripts
npm run design:check   # ルール検証
npm run design:build   # JSON再生成
「何を作るか」はDESIGN.md、「どう作業するか」はCLAUDE.md。この分離だけで、DESIGN.mdをClaude以外のAI（Cursor、Copilot）でもそのまま使えるようになる。

 Step 2: 禁止ルールをJSONにする
Markdownの表からJSONに移すだけで、MCPやスクリプトから参照できるようになる。
[
  { "id": "NO_TEXT_BLACK", "pattern": "text-black", "alternative": "text-slate-900" },
  { "id": "NO_SHADOW_LG", "pattern": "shadow-lg", "alternative": "shadow-sm" }
]
5件からでいい。AIが実際に破ったルールを追加していけば、自然と育つ。

 Step 3: 壊れたら気づく仕組みを1つ入れる
DESIGN.mdに書いた禁止パターンの件数と、JSONの実件数を突き合わせるだけで十分。数値がズレたら教えてくれる。それだけで「ドキュメントが嘘をつく」問題の半分は解決する。
contracts（コンポーネントの構造化JSON）やPlaywrightテストは、プロジェクトが育ってからでいい。
ここからは、melta UIで実際にStep 2と3をどこまで作り込んだかの話。

 Layer 2の詳細 — contractsと禁止ルールregistry

 コンポーネントのcontract化
コンポーネントの仕様をMarkdownからJSONに変えた。
以前はこう。
## Button
| バリアント | Tailwind |
|-----------|---------|
| contained | inline-flex items-center justify-center gap-2 h-10 px-4 ... |
今はこう。
{
  "id": "button",
  "variants": {
    "contained": {
      "tokenRefs": { "bg": "color.primary.500", "radius": "radius.md" },
      "tailwind": "inline-flex items-center justify-center gap-2 h-10 px-4 ..."
    }
  },
  "rules": [
    { "id": "SPACE_NO_PY_05_BTN", "severity": "error" },
    { "id": "BTN_ICON_ONLY_ARIA_REQUIRED", "severity": "error" }
  ]
}
tokenRefsでデザイントークンへのパスを明示し、rulesで守るべきルールをID参照する。Markdownを「解釈」するのではなく、JSONを「参照」する。値が一意に決まる。
28コンポーネント全部をこの形にした。最初に7つを手作業で作り、残り21は既存のJSONデータをseedにして自動変換した後、Markdown仕様書を読んで肉付けした。
metadata/components.json（MCPサーバーが返すデータ）はcontractsから100%自動生成される。手書きデータはゼロ。

 禁止ルールのregistry化
禁止パターンの管理が一番変わった。
以前はMarkdownの表に76件、MCPサーバーのコードに19件がハードコードされていた。ズレの温床。
今はrules.jsonに89ルール。全部にIDがある。
{
  "id": "AI_NO_CARD_COLOR_BAR_TOP",
  "severity": "error",
  "detector": "tailwind-class",
  "pattern": "border-t-4",
  "alternative": "border border-slate-200 のみでカードを構成"
}
detectorフィールドで自動検出できるもの（tailwind-class）と手動チェックが必要なもの（manual）を区別している。MCPサーバーはこのJSONを読み込んで、32パターンを自動検出する。19件から32件に。
人間向けの解説Markdown（prohibited.md）はまだ残している。JSONだけだと「なぜこれが禁止なのか」の背景がわからない。人間のオンボーディングにはMarkdownの方が向いている。ただし正規版はrules.json。

 Layer 3の詳細 — 壊れたら気づく仕組み
定義を作っても壊れる。壊れたときに気づけるかどうか。ここがハーネスの本質だと思う。

 静的検証（design:check）
contractsのJSONがSchemaに合っているか、ルールIDが重複していないか、参照先が実在するかをチェックする。
実際にルールの参照先を壊すと、こう出力される。
❌ ERROR: button.contract.json: ルール参照 "NONEXISTENT_RULE" が rules.json に存在しません

=== Summary ===
  Errors: 1
  ❌ FAILED

 ドリフト検出（design:drift）
ドキュメントに書いてある数値と実データを突き合わせる。DESIGN.mdの「89件」とrules.jsonの実件数、ショーケースの「28コンポーネント」とcontractsのファイル数、package.jsonのバージョンとショーケースの表示。ズレたら教えてくれる。

 リアルタイム検出（hook）
Claude Codeには「ファイルを書き込んだ直後にスクリプトを自動実行する」hookという機能がある。HTMLファイルを保存した瞬間にrules.jsonの32パターンでクラスをチェックする。
違反があれば「⚠️ shadow-lg detected → shadow-smを使ってください」とClaudeに警告が返る。違反がなければ何も起きない。トークン消費もゼロ。

 CI
全部GitHub ActionsでPRのたびに走る。contractを変更してPRを出す → CIが検証 → 通ればマージ。このサイクルで整合性が維持される。

 品質は「仕様書の良さ」ではなく「検証の仕組み」で決まる
冒頭のベンチマーク結果に戻る。
18KBのCLAUDE.mdを丁寧に書けば、AIの生成品質は高い。これは事実。でも「良い仕様書」だけでは解決しない問題がある。

仕様書に書いた数値と実態がズレる（ドリフト）
禁止ルールがMarkdownとコードに分散する
3箇所の手動更新を1つでも忘れると整合が崩れる
Claude以外のAIでは読めない

これは仕様書の品質の問題ではなく、検証の仕組みの問題。
スコアが上がる仕組みではなく、スコアが下がらなくなる仕組み。
DSの運用は長い。1.0でも今日は正しく動く。でも半年後にコンポーネントが50個に増えて、ルールが150件になって、3人がそれぞれ別のAIエージェントで触るようになったとき、手書きの一枚岩が持ちこたえるかは分からない。
contracts + harness + CIは、そのときのための保険だと思っている。

melta UIのリポジトリは公開している。
