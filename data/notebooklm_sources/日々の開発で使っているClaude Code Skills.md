# 日々の開発で使っているClaude Code Skills
- **Source URL**: https://zenn.dev/remitaid/articles/4f9dc787b6c191
- **Score**: 75
- **AI Summary**:
  - Claude Codeを実務に導入し、開発プロセスを効率化する各種Skillの活用法を解説
  - リサーチ・計画・実装に分け、計画に人間が注釈を入れて合意後に実装させる仕組みを提唱
  - 計画成果物をディレクトリ管理し、差分レビューやコミット作成までAIに担わせる実践例を提示
- **Read Now Reason**: AI駆動開発において、Claude Codeを30分以上自律稼働させるための「計画・レビュー・自動実装」のプロセス設計が具体的に示されており、AIパイプライン構築の設計原則として即時応用できるため。
- **Suggested Tags**: #Claude-Code, #AI駆動開発, #自律型エージェント, #開発プロセス自動化
- **Processed Date**: 2026/5/24

---

## 本文
こんにちは。ソフトウェアエンジニアの inari111 です。
弊社ではClaudeを全社で使っており、エンジニアはClaude Codeを用いて日々の開発を行っています。
本記事では、私が開発時に使っているClaude Code Skillsについて紹介します。

 superpowers

よく使っているのは brainstorming, subagent-driven-development, executing-plans です。
brainstorming
質問を通して案を検討し、設計書を保存するSkillです。
「計画したものは {プランを保存するpath} にマークダウンで出力してほしい」とプラン出力用のディレクトリを指定しています。
subagent-driven-development, executing-plans
出力されたプランに沿って実装を行ってくれます。
プランには具体的な実装まで書いてもらっているので実装が終わるところまで止まることなく進んでくれることが多いです。
READMEではThe Basic Workflowとしてこのように紹介されているので、他のSkillも合わせて使うほうがより安定して動いてくれそうです。
brainstorming
↓
using-git-worktrees
↓
writing-plans 
↓
subagent-driven-development or executing-plans
↓
test-driven-development
↓
requesting-code-review 
↓
finishing-a-development-branch

 dig, decomposition

dig
AskUserQuestionToolを使って再帰的に質問を行ってくれるSkillです。
これを使うようになってから要件の考慮漏れが少なくなったように思います。
decomposition
/dig で計画が終わった後にタスクを分割します。
decompositionを実行した後に実装を依頼すると30分〜40分くらい連続して動かすことができました。
auto modeを使っているわけではない状態で、30分くらい自走してくれるのは非常に助かります。

 drawio

Goアプリケーションのアーキテクチャ図などを生成するときに使っています。
自分で作成するよりも簡単に出力できるので気に入っています。
Draw.ioのMCPは使ったことがないので比較はできないのですが、このSkillで満足しています。
最終的にコードで書き出したものと画像として出力したもの両方をGit管理しています。

 自作Skills
ここからは自作のSkillについて紹介します。
各Skillの具体的なSKILL.mdは載せませんが、 /skill-creator で自分好みのものを作成できるので、試してみてください。

 feature-dev
borisさんが書いた How I Use Claude Code をSkill化したものです。
ほとんどこのブログの内容の通りのSkillにしているので、詳細はブログを参照してください。
このSkillは3つのフェーズに分かれていて、概要は以下の通りです。

フェーズ1: リサーチ
フェーズ2: 計画
フェーズ3: 実装

フェーズ1は、計画の前にリサーチ結果を research.md として書き出します。
書き出させる理由は、人間がレビューするためであり、リサーチが間違っていれば計画も実装も間違うからだとブログに書かれています。
フェーズ2では、プランを plan.md として書き出します。
人間はそのプランをチェックし、インラインで注釈を書き込んだ後、Claudeにフィードバックします。
インライン注釈は下記のように書き込みます。
`<!-- NOTE: コメント -->` — 補足・提案
`<!-- REJECT: 理由 -->` — この部分を却下
`<!-- QUESTION: 質問 -->` — 質問・確認事項
このサイクルを複数回繰り返し、プランが完成するまでは実装をさせません。
そして、プランが完成したら粒度の細かい実装に分割し、TODOをチェックリスト方式でplan.md内に残します。
フェーズ3では、フェーズ2で作成したプランのTODOを順に実装していきます。
SKILL.mdのフェーズ3のところには下記のように書いています。
1. `plan.md` のTODOチェックリストを上から順に実装
2. 各タスク完了時に plan.md の該当チェックボックスを `[x]` にマーク
3. **中断せず継続する** — 判断が必要な場合のみ停止して確認
4. 継続的にビルド・型チェック・lintを実行して早期にエラーを発見
5. 全TODO完了後にプロジェクトのlint・テストを実行
このSkillを使い始めてわかったことは、リサーチと計画を洗練することに時間をかけ、Claudeは計画に従ってただ実装するだけの状態にすることが大切ということです。
複数のClaude Codeを起動し、並行で開発していると早くコードを書かせたい。早くPull Requestを出して次のタスクに取り掛かりたいと焦りが生じますが、前提が正しいのか、詳細まで計画できていて、細かいTODOにまで分割されているか。これらを丁寧に行わないとアウトプットのクオリティが低くなってしまいます。
ブログの中でborisさんは下記のように述べています。

I want implementation to be boring. The creative work happened in the annotation cycles. Once the plan is right, execution should be straightforward.


Even though I delegate execution to Claude, I never give it total autonomy over what gets built. I do the vast majority of the active steering in the plan.md documents.


 codex
当初は公式Skillが存在しなかったため、 Claude CodeとCodexの連携をMCPからSkillに変えたら体験が劇的に改善した を参考に自作したSkillです。
Claudeで実装後 /codex 差分をレビューしてください のように呼び出してレビューしてもらうもので、プラン作成時には気づけなかったことを指摘してくれるので助かっています。
現在は公式の openai/codex-plugin-cc も登場したため、自作Skillと併用しています。

 commit-message
コミットメッセージを考えてもらうためのSkillです。
ざっくり以下のことをやってくれます。

git add しているファイルがあれば、そのファイルを対象にコミットメッセージを考える
git add しているファイルがなければ、コミットの粒度まで含めて考える
ブランチのコミットを参照しfixupできそうか考える


 AIに計画してもらった結果をどこに置くか
余談ですが、プランは下記のように専用のディレクトリの下に置くようにしていて k1LoW/mo を使ってブラウザで見ています。
mo なしの状態には戻れなくなりました。
最近はHTMLで書き出してもらう例もX上で見かけるので、試してみたいなと思っています。
- product A repository
- product B repository
- plans
  - product A
    - 001_hoge
      - plan.md
    - 002_fuga
      - research.md
      - plan.md
  - product B
    - 001_xxx
      - plan.md

 おわりに
開発時に使っているClaude Skillsについて紹介しました。
Claude Codeを使った開発において欠かせないものです。
他のSkillもいろいろ試してみたいので、おすすめがあればぜひ教えてください。
Podcast 「RemiTalk」を配信していますので、よければ聴いてみてください。

RemitAid は「テクノロジーで国際決済の”新たな道”を創る」をミッションに、コストの高さや着金タイミングの不透明さなど、国際送金に関わる課題を解決する「ラクヤス決済 振込」と、海外の展示会・見本市で活用できるクレジットカード決済サービス「ラクヤス決済 クレジットカード」を提供しているスタートアップです。
