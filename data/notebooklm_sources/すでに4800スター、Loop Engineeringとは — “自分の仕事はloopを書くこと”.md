# すでに4800スター、Loop Engineeringとは — “自分の仕事はloopを書くこと”
- **Source URL**: https://zenn.dev/acntechjp/articles/0c63b5b08bbdb9
- **Score**: 68
- **AI Summary**:
  - 従来の都度指示から「自動で指示・検証を繰り返すループを設計する」役割への転換を提唱。
  - スケジューリング、隔離空間、検証者などLoop Engineeringを構成する6つの要素を定義。
  - 自律エージェントの暴走や理解負債を防ぐため、人間による検証と設計の重要性を強調。
- **Read Now Reason**: AI駆動開発において、個別プロンプトの実行から自動パイプライン（自律ループ）への移行を検討する際、検証（Verifier）や隔離（Isolation）など、実装上の致命的失敗を避けるための必須設計要件が体系的に学べるため。
- **Suggested Tags**: #AI駆動開発, #Loop-Engineering, #自動化パイプライン, #AIエージェント
- **Processed Date**: 2026/7/6

---

## 本文
Loop Engineeringは完全自律への「橋」となる

コードが人間の読解速度を超えて生成され続ける——気づいた頃には、誰も全体を把握していないコードベースだけが残る。理解負債は、後から返済できる技術的負債とは違う。負債が積み上がった時点で、返済に必要な"理解"そのものが失われている。

 TL;DR

Claude Code責任者Boris Chernyの「My job is to write loops.」発言から"Loop Engineering"が広まった
「都度プロンプトを打つ」から「指示・検証・引き継ぎを行う小さなプログラム(loop)を設計する」への転換
構成要素は6つ：スケジューリング、ゴール条件、隔離ワークスペース、Verifier、永続メモリ、コネクタ

cobusgreyling/loop-engineeringはこの考え方を実践するCLIツール群(loop-init/loop-audit/loop-costなど)を提供
SNS上の「Anthropic engineer」発言には出典不明のものもあり、Cherny本人の発言・公式文書とは信頼度を分けて扱うべき
Anthropicは"Loop Engineering"を公式採用していないが、"agentic loop"自体はClaude Code / Agent SDKに元々組み込まれた概念


 きっかけはBoris Chernyの一言
2026年6月、Claude Codeの開発を率いるAnthropicのBoris Chernyが、自身のワークフローについて語った内容がXやポッドキャストのクリップを通じて一気に広まりました。要旨はシンプルです。

「My job is to write loops.（自分の仕事はloopを書くことだ）」

彼はもはやClaudeに対して逐一プロンプトを打つのではなく、Claudeにプロンプトを送り、結果を判断し、必要なら再度プロンプトを送る「loop」という小さなプログラムを書いて、それを回すようになったと述べています。この発言はOpenAIのPeter SteinbergerやGoogleのAddy Osmaniらの投稿と共鳴し、"Loop Engineering" という名前が付いて一気に広がりました。Addy Osmaniはこの流れを次のように整理しています。

Prompt Engineering → Context Engineering → Harness Engineering → Loop Engineering


「何を指示するか」から「何を渡すか」「どう仕組み化するか」「いつ・どう回すか」へと、扱う対象の解像度が段階的に上がっていくイメージです。


Prompt Engineering: 一回の指示文(言葉選び)を磨く

Context Engineering: 指示文に加えて、渡す情報(文脈)全体を設計する

Harness Engineering: 一回のやり取りではなく、エージェントを動かす仕組み(枠組み)自体を設計する

Loop Engineering: その仕組みを時間軸で回し続ける「ループ」として設計する


 Loop Engineeringとは何か
一言で言うと、「エージェントに指示を出す人」から「指示を出し続けるシステムを設計する人」への役割転換です。
従来のワークフロー:
Loop Engineeringのワークフロー:
Chernyが例に挙げているのが、Claude Codeの/loopコマンドによる次のような指示です。

「自分のPRを全部見守って、ビルドが壊れたら自動修正して、レビューコメントが来たらworktreeエージェントで対応して」

ここでChernyが書いたのは具体的な作業手順ではなく、目的（intent）と停止条件だけです。実装の詳細はloop自身がその都度判断します。

 生の声を一次情報の確からしさ付きで見る
SNSでは「Anthropic社員が〜と言った」という要約ツイートが大量に出回りますが、誰が・いつ・どこで言ったのかが曖昧なまま広まっているものも少なくありません。ここでは発言の出どころをできるだけ区別して紹介します。

 1. Boris Cherny本人の発言(複数の独立した場で確認できる)
Chernyの発言は、Acquired podcastでの対談や、2026年6月2日にWorkOSが主催した「Acquired Unplugged」でのトーク、CNBCのインタビューなど、複数の独立したメディア・場で内容が一致した形で報じられています。「Acquired Unplugged」での発言は次のように記録されています。

「My job is to write loops.」

CNBCのインタビュー(Business Insider経由)でも、プロンプトを自分で書かなくなったという趣旨は一貫しています。同じ主張が独立した複数の場で繰り返されている点で、信頼度が比較的高い一次情報と言えます。
参考: techtimes.com記事

 2. 匿名の「Anthropic engineer」発言(要注意)
X上では、肩書きだけで「Anthropic engineer」と紹介される次のような発言も拡散しました。

「You're not supposed to prompt Claude.」

ただしこの発言は、第三者アカウントが伝聞として引用する形でしか確認できず、発言者本人のアカウントや、収録された講演・公式記録には辿り着けませんでした。Chernyの発言のように出典が特定できないため、「Anthropicの公式見解」ではなく「ある社員の発言についての伝聞」程度の信頼度として扱うのが妥当です。記事や発表を引用する際は、この区別を明示することをおすすめします。
参考: X (旧Twitter) の該当投稿

 3. Anthropic公式ドキュメント・ブログでの「loop」の扱い
会社としての一次情報に最も近いのが、公式ドキュメントとエンジニアリングブログです。

Claude Code公式ドキュメント「How the agent loop works」は、"agentic loop"を「Claudeがプロンプトを評価し、ツール呼び出しを行い、結果を受け取り、タスクが完了するまで繰り返す仕組み」として明確に定義しています。これはBoris Chernyの発言よりも前から、Claude Code / Agent SDKの設計思想として存在していた概念です。
Anthropic Applied AI Teamによるエンジニアリングブログ「Effective Context Engineering for AI Agents」は、loop状態で動き続けるエージェントほど、次のターンに持ち越す情報(コンテキスト)の取捨選択が難しくなるという課題を指摘しています。

ここから読み取れるのは、Anthropicは"Loop Engineering"という言葉自体を公式に採用しているわけではないものの、「agentic loop」という概念自体は同社のツール設計に以前から組み込まれていたという点です。Chernyの発言は、この社内的な設計思想を外部向けに平易な言葉で言い換えたものと理解すると腑に落ちます。

 Loop Engineeringを構成する主な要素
Loop Engineeringのイメージを掴む上で、cobusgreyling/loop-engineeringリポジトリのビジュアルがわかりやすいので紹介します。

(画像: cobusgreyling/loop-engineering より、MITライセンスの下で公開)
各種解説記事(Addy Osmaniの記事や関連コミュニティのまとめ)を総合すると、Loop Engineeringはおおむね以下の要素で構成されます。


スケジューリング(Trigger) — cronやClaude Codeの/schedule、/loopなど、いつ動くかを決める仕組み

ゴール条件(Goal) — /goalのように、達成条件を満たすまでエージェントを回し続ける仕組み

隔離されたワークスペース(Isolation) — git worktreeなどで複数エージェントの作業が衝突しないようにする

検証者(Verifier) — 「コードを書いたモデル自身に採点させない」ため、別モデル・別ロジックで結果を検証する

永続メモリ(Memory) — CLAUDE.mdやスキルファイルなど、セッションをまたいで学習内容を引き継ぐ仕組み

コネクタ(Connector) — GitHub・Slackなど外部システムとMCP経由でやり取りし、提案だけでなく実際に行動する

Osmaniはこれを「エージェントハーネス設計」のさらに一段上の抽象化だと位置づけています。

 実践的なツール: cobusgreyling/loop-engineering

こうした概念を実際に使えるパターン集・CLIツールとしてまとめたのが、こちらのリポジトリです。

READMEによると、Addy OsmaniとBoris Chernyの発言に触発され、以下のようなCLIツールを提供しています。


loop-audit — 既存のloop設計を採点する「Loop Readiness Score」CLI

loop-init — --pattern daily-triage --tool grok のように、パターンとツールを指定してloopの雛形を生成

loop-cost — loop運用のトークンコストを見積もる

loop-sync — STATE.mdとLOOP.mdのドリフト（乖離）を検知

Grok・Claude Code・Codex・Cursorなど複数のコーディングエージェントを対象にしている点も特徴です。

 注意点: Loop Engineeringは「判断力を増幅する」
このリポジトリのREADMEにも明記されていますが、Loop Engineeringには明確なリスクがあります。

サブエージェントや長時間loopでトークンコストが爆発しうる
検証(verification)の責任は依然として人間側にある
監視されていないloopは、監視されていない失敗を積み重ねる
loopが出したコードを読まなければ、「理解負債(comprehension debt)」が急速に積み上がる

Osmaniも同様に、「同じloopを使っても、理解した上で使う人と、理解を放棄した人とでは結果が正反対になる」と警告しています。Chernyの発言も、「エンジニアが不要になる」という意味ではなく、レバレッジのかけ所がプロンプトからloop設計に移ったという話である点に注意が必要です。

 まとめ

Loop EngineeringはBoris Chernyの「自分の仕事はloopを書くこと」という発言をきっかけに、Peter SteinbergerとAddy Osmaniによって名前が付き広まった概念
「都度プロンプトを打つ人」から「プロンプトを打ち続けるシステムを設計する人」への役割転換がコア
スケジューリング・ゴール条件・隔離ワークスペース・検証・メモリ・コネクタが典型的な構成要素

cobusgreyling/loop-engineering は、この概念を実際に使うためのCLIツール群(loop-init/loop-audit/loop-costなど)を提供している
ただし万能ではなく、コスト・検証・理解負債への意識が引き続き必要


 参考

AddyOsmani.com - Loop Engineering
The New Stack - Loop Engineering
cobusgreyling/loop-engineering (GitHub)
techtimes.com - Claude Code Loop Engineering
Anthropic公式ドキュメント - How the agent loop works
Anthropic Engineering Blog - Effective Context Engineering for AI Agents

アクセンチュア株式会社に所属する社員有志による運営です。アクセンチュアの社員による様々な発信をまとめています。なお、投稿内容は社員個人の見解であり、所属する組織を代表するものではありません。
