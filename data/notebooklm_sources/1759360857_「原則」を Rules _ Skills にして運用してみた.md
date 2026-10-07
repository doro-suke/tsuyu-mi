# 「原則」を Rules / Skills にして運用してみた
- **Source URL**: https://zenn.dev/tingtt/articles/fc05c73f8265e4
- **Score**: 88
- **AI Summary**:
  - AIエージェント用の「原則」をRulesやSkillsのファイル構造として運用する具体的手法を提案
  - Markdown作成やコード設計の原則をSKILL.mdと関連ドキュメントに分割して定義する設定例を提示
  - 原則を構造化して参照させることでAIの自己判断や推測を防ぎ、コンテキストを適切に管理可能にする
- **Read Now Reason**: AI駆動開発において、プロンプトの記述量を削減しながらAIの出力品質を劇的に高めるための具体的な「SKILL.md」の設定と運用ディレクトリ構造が明記されており、今すぐプロジェクトに導入可能であるため。
- **Suggested Tags**: #AI駆動開発, #プロンプトエンジニアリング, #Cursor, #コンテキスト管理
- **Processed Date**: 2026/6/16

---

## 本文
Rules や Skills をメンテナンスするのが大変なので「実装例」をたくさんに用意するよりも「原則」を優先して Rules や Skills に起こして運用してみました。
同じように構成している方も多そうですが、感触が良かったので Agentic Coding の 1 例として紹介します。
特に 0 → 1 のあまりパターン化されていないドキュメント作成やコーディング作業に効きます。
品質やコストなど、何かしら理由があってドキュメントやコードにこだわる必要があるなら尚更おすすめします。

 構成例


「原則」の Rules/Skills：一番抽象度・視点が高い本当に共通の指針

ドキュメントの扱い
コード（プログラム）の扱い（責務分離の原則、境界の設計）
テストの扱い



「原則」を適用する Rules/Skills：ドキュメントの種類・言語・フレームワーク・アーキテクチャごと

DesignDoc ではどうする
CONTRIBUTING.md ではどうする
README.md ではどうする
コミットメッセージではどうする
Go ではどうする
React ではどうする



具体的な説明や指示をする Rules/Skills + AGENTS.md (CLAUDE.md)：プロジェクト・作業・ワークフローごと

パターンごとの実装方法
レビュー方法
テスト方法
コミットメッセージのフォーマット
プロジェクトの概要、目的、設計
他ワークフロー





 「原則」の Rules/Skills
0 → 1 のドキュメント作成やコーディングにおいて、「DesignDoc を作って」や「Clean Architecture で作って」と作るものの情報を 20〜30 行程度書いた上で指示すると出来上がるのはそこそこかそれ以下の出来だと感じることが多いです。
※こだわり強めの個人的な感覚
具体例やスタイルガイドを参照させても抜け落ちる部分がありますし、「追加情報や判断が必要な場合は質問して」と指示を入れると自分の手で大枠を作ったほうが早くなってしまう場合もあります。
つまり、AI Agent の出力に対する期待値に対してコンテキスト管理が不十分なのです。

 ドキュメントを作らせるときの困りごと
以下のプロンプトの構成では、何が足りないでしょうか。

情報を 20〜30 行程度
DesignDoc を作って
追加情報や判断が必要な場合は質問して

少し視点を変えて見る必要がありますが、以下は明確な指示がありません。

DesignDoc の役割は？
（一般的にではなくこのプロジェクトではどうなのか）
このプロジェクトにおいてドキュメントはどういう扱い？
（README・DesignDoc・ADR の使い分けは？）
誰が読む？（エンジニア？ 非エンジニア？ チーム内？）
どこまで書く？
どういう構成で書く？

明確な指示がないこれらは、質問攻めされて時間がかかるか、
勝手に判断・推測されて AI Agent やモデルの癖・特徴に引っ張られたものになります。

 ドキュメントに関する「原則」をスキルにする
以下の styleguide-markdown-document/SKILL.md と参照させている document.md が「原則」に当たります。
他は「原則」を適用するためのガイドのようなことを書いてあります。
styleguide-markdown-document/SKILL.md
---
name: styleguide-markdown-document
description: Write, review, and refactor Markdown documentation (README, PRD, DesignDoc, ADR, CONTRIBUTING) using the project's styleguide. Use when working on .md docs to enforce document boundaries, required sections, and link hygiene. Consult the referenced styleguide files under docs/styleguide/documents/*. Outputs are in English by default; also applicable to Japanese documents.
---

# Styleguide: Markdown Document

When writing or updating Markdown docs (README, PRD, DesignDoc, ADR, CONTRIBUTING), consult the corresponding styleguide file:

- **README**: ./README.md
- **PRD**: ./PRD.md
- **DesignDoc**: ./DesignDoc.md
- **ADR**: ./ADR.md
- **CONTRIBUTING**: ./CONTRIBUTING.md
- **Document System Guide**: ./document.md (Entry point and index for all document types and boundaries)

Follow the required sections, boundaries, and link hygiene defined in each styleguide file.
Apply the same structure for Japanese documents.
この「原則」と「原則を適用するガイド」を使用して作成した DesignDoc とプロンプト

 プロンプト
月単位で google calendar の予定を sync する機能の DesignDoc を作成してください。 
決めなければならないこと、分からないことは聞いてください。 

入力： 
- calendar id 
- 予定名 
- 期間 
- 追加する予定の名 (optional) 

結果：
- 該当する予定がカレンダーに sync される 
- 期間、予定名が該当する予定がカレンダーに全く同じものがなければ追加される 
- sync 元に全く同じ予定が無く、カレンダーにある場合は削除される
  （このツールで作成されたものかどうかを判定する必要あり。更新があれば変更ではなく置き換え処理を行う）

Usage
\```
# Login with Google
gcal-sync login

# Sync events to personal (or specified) calendar
gcal-sync <src calendar id> [--dest <dest calendar id>] [--name <sync event name>] [--all] [[--month YYYYMM]] [--next-month]
\```

Options と仕様
--dest, -d: イベントの同期先
--name: コピーするイベントの名前（完全一致）（指定なしの場合は警告を出して y/n をプロンプトで入力させる）
--all: --name で一致したイベントをすべて同期する（指定なしでその日以降で最近の合致イベントを同期する）
--month: イベントの同期範囲（月指定）
--next-month: --month の省略用


 成果物 (所要時間 20 分程度)
※ 上記のプロンプトに加えて 5 往復くらい訂正・追加指示はしています。



 コーディングさせるときの困りごと
DesignDoc や Plan にディレクトリ構成と共に「Clean Architecture を採用する。」や「DDD に準拠する。」とした場合も同様に不足している情報があります。

何を重視する？
何を無視する？
どう実装する？
DDD はどこまで？
レイヤー構成は？
テストはどこに重み？
キャッシュはどこ？
どう責務を分離する？

プロダクトや運用方針によって採用したアーキテクチャやデザインパターンの上で更に判断が必要なはずです。
ここを勝手に判断・推測されてしまっては困ります。

 コーディングに関する「原則」をスキルにする
以下の styleguide-sourcecodes/SKILL.md 及び参照させているファイルすべてが「原則」に当たります。
主に「責務の分離」「境界の設計」についてまとめています。
styleguide-sourcecodes/SKILL.md
---
name: styleguide-sourcecodes
description: Apply the repository's source-code design principles (separation of concerns, sliced iterations, root ownership) when designing, reviewing, or refactoring code. Use for any language to keep responsibilities thin, testable, and referencable.
---

# Styleguide: Source Codes

Use these design principles to shape code structure and reviews:

- **Separation of Concerns**: ./design-principles-separation-of-concerns.md
- **Sliced Iterations**: ./design-principles-for-sliced-iterations.md
- **Versioned Codebase Cleanup**: ./version-control-cleanup.md

Key expectations for agents:

- Treat a concern as a reason for change; assign one responsibility per concern.
- Keep state owned by a clear Root Owner; avoid scattered or ambient state.
- Prefer referential transparency; keep external dependencies thin at boundaries.
- Express cross-iteration concerns as sliced iterations with explicit boundaries; keep pure per-item work as non-iterative functions.
- Avoid invalid states by construction; push invariants to creation points.
- Use testability as a signal—if tests are hard, re-check concern separation and state ownership.

 「原則」の Rules/Skills による効果
判断材料・指針をしっかり原則としてまとめることができればその基準を使って不足情報を補完できるため、以下の流れで進めさせることができます。
原則 + コンテキスト → 判断 → 実装
特に DesignDoc の作成では、完成までの壁打ち回数が 10〜20 往復程度から 5〜10 往復程度まで減ることが多くなりました。
また、嬉しい誤算として Claude Sonnet 4.6 や GPT-5.4 mini などの比較的軽量なモデルでも不満を感じる場面が減りました。

 「原則」の言語化
もちろん、この「原則」を整理するためには相応の時間が必要です。
私の場合も、styleguide や Skills を作る段階では AI やチームメンバーとかなりの壁打ちを行いました。

 プロンプトの例
〇〇についての設計原則をドキュメント化してください。

### ゴール

以下の認識をチームメンバー及び AI Agent で合わせ、踏襲、応用が可能

- 〇〇
  - 何を重視するのか
  - 何を避けたいのか
  - どのような認知負荷を減らしたいのか
  - どのような変更容易性を得たいのか
  - どのようなテスト容易性を得たいのか
  - どのような責務分離を目指すのか

### あなたの役目

- 特定の技術やフレームワークに囚われない
- 背後にある設計意図や判断基準を抽出する
- 個別ルールではなく原則へ一般化する
- AI Agent が応用できるレベルまで抽象化する


 原則や考え方を書いた Rules/Skills をレビューする (2026/06/15 追記)
原則や考え方を書いた Rules/Skills についてはレビュー方法に少し工夫が必要でした。
「特定パターンで期待する判断をしてくれるか」は実際に動かして確認することができますが、「未知のパターンでどう判断するか」は直接確認することはできません。
私の場合は、代わりに「どう理解するか」「どう認識するか」を聞いて齟齬がないか確認する方法でレビューしました。
この確認作業は実際の業務で使用する AI Agent・モデルで行っておくと良いでしょう。

 プロンプト例
このドキュメントをレビューしてください。
AI や人間が読んだときにどのような理解・認識するかをまとめてください。

「書いてあるルールが守られるか」ではなく、
「どのように解釈されるか」を中心に評価してください。
