# Agent Skills で AI への依頼を設計する
- **Source URL**: https://zenn.dev/genda_jp/articles/2026-05-28-agent-skills-ai-interaction
- **Score**: 85
- **AI Summary**:
  - AIエージェントへの共通指示をAgent Skillsとして切り出し、再利用する設計手法の解説。
  - 普通のドキュメントと異なり、起動条件、手順、検証、引き継ぎに特化した記述を推奨。
  - Wazaを用いたトリガーテストの自動化やCopilot等を用いた評価検証フローの具体例を紹介。
- **Read Now Reason**: 現在のAI駆動開発プロジェクトに即時適用できる、AIエージェント向け指示のモジュール化手法（Agent Skills）や、Wazaによるテスト自動化パイプラインの具体的なコード、設定ファイルの記述例が含まれているため。
- **Suggested Tags**: #AI駆動開発, #AgentSkills, #Waza, #GitHubCopilot
- **Processed Date**: 2026/6/1

---

## 本文
1. はじめに
AI コーディングエージェントに任せる作業が増えると毎回似たようなことを頼んでいることに気づきます。

このリポジトリではどの確認コマンドを使うのか
ドキュメントではどの書き方を守るのか
変更してはいけない範囲はどこか
完了報告にはどの証跡を入れてほしいのか

毎回プロンプトに全部書くと長いですが、一方で省略すると、AI は足りない前提を推測で埋めます。
この記事では Agent Skills を、単なる便利機能ではなく、AI への依頼をどう設計するかという観点で整理します。


 2. 弱いプロンプト
弱いプロンプトとは短いプロンプトのことではありません。
必要な判断材料が外に出ていないプロンプトです。



足りないもの
起きること




前提
どの前提で作業するか推測される


作業手順
作業順序が毎回変わる


制約
やってはいけないことが漏れる


確認方法
確認せずに完了したことになる


証跡
何を根拠に完了したか残らない



たとえば この記事を直して だけでも、相手が人間なら暗黙の前提を汲んでくれるかもしれません。
しかし AI エージェントにとっては、どの文体に寄せるのか、どのファイルを触ってよいのか、確認は何を通せばよいのか、報告には何を含めるべきかが曖昧です。
そこで、繰り返し必要になる判断材料を再利用できる運用知識として外に出します。
Agent Skills はその運用知識を小さなまとまりとして持つ方法の1つです。

 3. Agent Skills は何をまとめるのか
Agent Skills はAI エージェント向けの小さな専門手順書と考えると分かりやすいです。
最低限は SKILL.md を置きます。
SKILL.md の frontmatter に名前と説明を書きます。
本文には実際に作業するときの手順や制約を書きます。
たとえば最小形はこんなイメージです。

skills/example/SKILL.md
---
name: example
license: MIT
description: |
  USE FOR: Documentation authoring in this repository.
  DO NOT USE FOR: Build failures, release safety, or unrelated writing.
---

# Example

## Workflow

1. Inspect the relevant files.
2. Read only the needed references.
3. Make the smallest scoped change.
4. Run the nearest validation.
5. Report changed files, evidence, and residual risk.

ここは混乱しやすいので、仕様、カタログ、検証ツール、配布ツールという4つの役割を分けて見ておきます。



観点
役割




Agent Skills 仕様

SKILL.md、frontmatter、references/ などの形


OpenAI / Codex の Skill 一覧
利用できる Skill を AI が選ぶためのカタログ


Waza
Skill の形、説明、token、eval などの確認


gh skill
GitHub CLI からの search / install / publish



Agent Skills 仕様は、Skill をどう置くかの話です。
Codex CLI のような実行環境では、利用できる Skill の一覧がカタログとして見え、その説明をもとに必要な SKILL.md を読む流れになります。
Waza や gh skill は、その Skill を作った後に確認したり配布したりするための別レイヤーです。
大事なのは、Agent Skills をドキュメント置き場として扱わないことです。
普通のドキュメントは、背景理解や詳細説明に向いています。
Agent Skills は、作業時に AI が使う判断材料に向いています。



観点
普通のドキュメント
Agent Skills




読み手
人間
AI エージェントと人間


目的
背景理解
作業時の判断と実行


起動条件
人間が探して読む
依頼に応じて agent が選ぶ


重要な項目
説明の網羅性
trigger、workflow、validation、handoff



Agent Skills は全部入りの資料ではなく入口です。
入口を小さくして、必要なら references/ や scripts/ を追加で読ませる形にすると扱いやすいです。

 4. プロンプトから外に出すもの
短いプロンプトを強くするには、情報を捨てるのではなく、毎回書かなくても読まれる場所に移します。



依頼文に残すもの
Agent Skills に移すもの




今回やってほしい作業
いつもの作業手順


今回の対象 file / scope
いつもの禁止事項と確認順


今回だけの判断
いつも必要な確認方法と報告の証跡



たとえば、毎回次のような依頼を書いているなら、後半は Agent Skills 側に寄せられます。
この記事を Zenn 向けに直してください。
既存の記事の文体に寄せてください。
Markdown の code fence は Zenn の通常形式にしてください。
作業後に rumdl を実行してください。
変更したファイルと確認結果を報告してください。
最後に残したいのは、もっと短い依頼です。
この記事を Zenn 向けに直してください。
これだけで済むようにするには、文体、Markdown ルール、検証コマンド、報告形式が別の場所にまとまっている必要があります。

 5. AI が決定論的な挙動になるわけではない
ここはかなり大事です。
Agent Skills を入れても、AI の出力が完全に決定論的な挙動になるわけではありません。
同じ入力に対して常に同じ答えを返す実行環境になるわけではないです。
ただし、毎回渡す判断材料を揃えることはできます。

どの前提を見るか
どの手順で進めるか
何を禁止するか
どの確認を走らせるか
何を証跡として返すか

目的は、完全に同じ答えを出すことではありません。
毎回同じ判断材料を渡すことです。
これだけでも、作業開始から完了報告までの揺れはかなり小さくなります。

 6. USE FOR と DO NOT USE FOR

Agent Skills では、AI が読むべき場面と読まない場面をはっきりさせるのが重要です。
私は description に USE FOR と DO NOT USE FOR を書く形が分かりやすいと思っています。
description: |
  USE FOR: Markdown authoring, code block style, and article checks.
  DO NOT USE FOR: Build failures, release safety, or unrelated prose editing.
これは Agent Skills 仕様や Waza が要求する構文ではなく、私が分かりやすいと思っている convention です。
ただし、Waza はこの形式を trigger / anti-trigger の signal として扱えるので、評価やテストとは相性がよいです。

 7. 日本語でどこまで書くか
日本語の記事や日本語の運用手順を扱うなら、本文や references/ は日本語の方が読みやすいです。
ただし、入口になるメタデータは英語寄りにした方が安定しやすいです。



場所
実務上のおすすめ




name
lowercase ASCII、digits、hyphen


description
English の USE FOR / DO NOT USE FOR を基本にする


本文
対象作業に合わせて日本語でもよい


references/
人間と AI が読む実務資料として日本語でもよい


評価用の依頼文
日本語の依頼を扱うなら日本語の依頼文ケースも入れる



ここでいう評価用の依頼文は、Skill が期待どおりに呼ばれるかを確認するためのテスト入力です。
Waza の trigger test なら、たとえば次のように呼ばれてほしい依頼と呼ばれてほしくない依頼を分けて書きます。

evals/markdown/trigger_tests.yaml
skill: markdown

should_trigger_prompts:
  - prompt: "Zenn の記事でコードブロックの書き方を確認して"
    reason: "Markdown の書き方に関する依頼"

should_not_trigger_prompts:
  - prompt: "Quarto のビルドエラーを直して"
    reason: "ビルド失敗の調査であり、Markdown の書き方ではない"

waza run evals/markdown/eval.yaml
この trigger test は、trigger_tests.yaml の各依頼文を waza run の実行時に agent へ投げ、対象 Skill が実際に呼ばれたかを比較します。
should_trigger_prompts は markdown Skill が呼ばれたら成功で、should_not_trigger_prompts は呼ばれなければ成功です。
この実行が AI、特に GitHub Copilot を使うかは eval.yaml の config.executor で決まります。
Waza の通常のプロジェクト設定では copilot-sdk executor が使われます。
これは単なる内部名ではなく、GitHub Copilot SDK / CLI を使う実行経路です。
GitHub Copilot をそのまま使う default provider では、local なら copilot login、CI などの token 実行では GITHUB_TOKEN が必要になります。
COPILOT_BASE_URL や COPILOT_PROVIDER_BASE_URL などで custom provider を指定した場合は、default の Copilot auth check は使われません。
agent の model は config.model や --model で選びます。
ただし、すべての Waza eval が Copilot を使うわけではありません。
executor: mock なら local の模擬実行なので、Copilot 認証は不要です。
これは、waza check のような frontmatter、token budget、eval.yaml の有無を見る静的確認とは別です。
採点側も一種類ではありません。
skill_invocation grader は記録された Skill invocation を deterministic に確認し、trigger grader は依頼文と Skill の対応を heuristic に score します。
prompt grader を使う場合だけ、config.judge_model や --judge-model の LLM judge で評価します。
ズレていたら、description の USE FOR / DO NOT USE FOR や本文の説明を直します。
大事なのは、英語の名前を覚えることではなく、実際に自分が投げそうな依頼文を残すことです。
日本語で使う Skill なら、日本語の依頼文をそのままケースにします。
理由は、name と description が最初に読まれるカタログだからです。
AI やツールが最初に見る入口は、検索性と trigger の安定性を優先した方が扱いやすいです。
本文や references/ は、作業に必要な言語で書けばよいと思っています。
日本語の文体を直す Skill なら、日本語の例や注意点を日本語で残した方が実用的です。

 8. ローカル例としての $skill-description-index

Agent Skills は、必要な Skill が選ばれて初めて効きます。
ただ、実際の作業では、最初に見えている Skill の一覧が短く圧縮されていたり、古かったり、説明が足りなかったりすることがあります。
私のローカル環境では、その穴を埋めるために $skill-description-index というパターンを使っています。
これは Agent Skills 仕様のフィールドではありません。
OpenAI や GitHub の公式コマンドでもありません。
あくまで、利用できる Skill の説明をディスク上の SKILL.md から取り直すためのローカルな補助です。
依頼文では、たとえば次のように書けます。
$skill-description-index

Issue 123 を実装してください。
先頭に Skill を選ばせる合図を置き、その下に短い作業依頼を書きます。
こうすると agent は動き出す前に、使うべき運用知識を取り戻しやすくなります。
たとえば Skill 側には、次のような責務だけを持たせます。

skills/skill-description-index/SKILL.md
---
name: skill-description-index
license: MIT
description: |
  USE FOR: Recover full skill descriptions from disk when descriptions are missing, truncated, or unclear.
  DO NOT USE FOR: unrelated tasks, broad rewrites outside the request, generated runtime outputs, or replacing repo-specific source of truth.
---

# Skill Description Index

Use this skill when the active skill catalog is too short to trust.

## Workflow

1. Inspect the relevant files, current repo conventions, and `git status`.
2. Read the preserved guidance before changing behavior.
3. Recover full skill descriptions from installed or repo-local `SKILL.md` files.
4. Report which source descriptions were used.

この例で伝えたいのは、$skill-description-index という名前そのものではありません。
短い依頼を投げる前に、agent が使うべき運用知識を取り戻せる入口を持つ、という考え方です。
Skill が選ばれない失敗は、本文をどれだけ丁寧に書いても直りません。
その場合は一覧に出る name と description、隣接する Skill との重なり、依頼文のケースを見直す必要があります。

 9. waza と gh skill は補助輪として使う
Agent Skills の話をするとツールの話に寄りがちですが、主役はあくまで、AI に渡す判断材料です。
waza と gh skill は、その判断材料をまとめた後に形を確認する補助輪として見るのがよいと思います。
ざっくり分けるとこうです。



Tool
何を見るか
見ないもの




waza
Agent Skills の readiness、token budget、eval、grader の入口
GitHub release や install 先の package 管理


gh skill
GitHub CLI としての search / install / update / publish
trigger quality や eval の実行品質




 9.1. waza check

waza check は、Agent Skills を作った後の readiness check として使えます。
waza --no-update-check check skills/<name> --format json
確認した Waza 0.33.0 では、ready の gate は主に次のようなものです。

compliance score が Medium-High 以上か
spec check が落ちていないか
token budget を超えていないか
link や schema に blocking error がないか

Advisory checks は別枠の warning です。
procedure、body structure、progressive disclosure、scope などの改善材料にはなりますが、それだけで ready=false になるわけではありません。
Waza の公式 CLI reference でも waza check は compliance と readiness の確認として説明されています。
また、Waza の出力では scope reduction などの改善材料が advisory checks として分かれて出ます。

 9.2. gh skill publish --dry-run

gh skill は GitHub CLI の agent skills 用 command です。
この環境で確認した gh 2.92.0 では、独立した validate subcommand はありません。
validation-only の入口は gh skill publish --dry-run です。
gh skill --help
gh skill publish --dry-run
gh skill publish --dry-run は、Skill を配布できる形かどうかの validation として扱うのが安全です。
たとえば、skill name、directory match、required frontmatter、allowed-tools の型、install metadata などを確認します。
topic、tag、release 作成は dry-run 後の publish flow の話です。
dry-run 自体は validation-only として扱います。

 10. 依頼文のケースで選択を確認する
Agent Skills は作って終わりではありません。
実際の依頼文に近いケースで、期待した Agent Skills が読まれるかを見るのが大事です。
たとえば、次のような観点を残します。



見るもの
確認すること




依頼文のケース
実際の依頼文に近いか


Expected Agent Skills
読まれてほしい Agent Skills はどれか


Observed Agent Skills
実際に選ばれた Agent Skills はどれか


Result
pass / fail / blocked を記録できるか



Waza では、eval の grader として trigger や skill_invocation も用意されています。
最初から大きな eval suite を作る必要はありません。
まずは、自分がよく投げる短い依頼をいくつか並べて、想定どおりの Agent Skills が選ばれるかを見るだけでも十分役に立ちます。

 11. まとめ
Agent Skills は、AI との向き合い方を運用可能にする仕組みの 1 つです。
この記事で言いたかったことは次の通りです。

弱いプロンプトは、短いプロンプトではなく判断材料が外に出ていないプロンプト
繰り返す判断材料は、再利用できる運用知識として外に出す
Agent Skills は前提、作業手順、制約、確認方法、証跡をまとめられる
AI が決定的になるわけではないが、毎回渡す判断材料を揃えられる
Agent Skills 仕様、OpenAI / Codex 側のカタログ、Waza、gh skill は役割を分けて考える

USE FOR / DO NOT USE FOR は必須構文ではなく、Waza と相性のよい convention

waza と gh skill publish --dry-run は、作った Agent Skills の形を確認する補助輪

一撃必殺プロンプトは、魔法の一文ではありません。
短い依頼の裏側に、必要な判断材料がすでにまとまっている状態です。
AI への依頼が不安定だと感じたら、プロンプトをさらに長くする前に、何を再利用できる運用知識として外に出せるかを考えるとよさそうです。
