# Claude Codeのスキルを書くときに便利だった3つの組み込みツール
- **Source URL**: https://zenn.dev/sonicgarden/articles/claude-code-skill-building-tools
- **Score**: 85
- **AI Summary**:
  - Claude Codeの挙動を安定させる3つの組み込みツールの使い方と指示プロンプト例を紹介。
  - TodoWriteやTaskツールを用い、手順のスキップやレビューの未実施を物理的に防止する。
  - Agentツールによる並列レビューと、PlanModeによる実装前のユーザー承認ゲートの構築手法。
- **Read Now Reason**: Claude Codeを用いた自律型開発パイプラインにおいて、エージェントの制御崩壊や手順スキップを防ぐ具体的な設定プロンプトとツール活用法が即座に適用できるため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #エージェント構築, #ワークフロー自動化
- **Processed Date**: 2026/5/27

---

## 本文
この記事は Claude on SonicGarden の記事です。ソニックガーデンのプログラマが、Claude Codeの活用について書いています。#claude_on_sonicgarden


 きっかけ
最近 claude-plugins でAgent Skillをいくつか作っていて、その中で便利だなと思った組み込みツールが3つあるので紹介します。

TodoWrite
Agent

EnterPlanMode / ExitPlanMode




 TodoWrite：言うことを聞かせたいフローを書き出させる
TodoWrite はタスクリストを作って進捗を管理するツールです。

 レビュー1回で終わらせる問題
dev-workflow という、計画 → レビュー（最大N回） → 実装 → チェック → コードレビュー（最大N回） → ルール更新、という流れでClaude Codeに開発をさせるスキルを書いています。
最初はMarkdownで「Step 1、Step 2、Step 3…」と並べて終わりにしていたのですが、これだと

レビューは1回だけして実装に進む
実装後のチェックを飛ばす
タスクが大きくなるとフェーズごと無視する

みたいなことが普通に起きます。手順書はあくまで参考資料で、最短ルートで終わらせにいく感じです。

 全フェーズをTodoWriteに登録させる
そこで、スキルの頭で全ステップを TodoWrite に登録させるようにしました。
Register all workflow phases with `TodoWrite`. Do NOT skip any phase:
- Step 2: Create Plan
- Step 3: Plan Review
- Step 3-1 through Step 3-N: Plan Review - iteration 1 through N
- Step 5: Implement
- Step 7: Check / Test
- Step 8: Code Review
- Step 8-1 through Step 8-N: Code Review - iteration 1 through N
- Step 9: Update Rules
TodoWriteを使ってからはかなり安定してワークフローを実行してくれています。
特にレビューのところは、「指摘がなくなるまで繰り返す」みたいな指示にするとなかなかうまく動いてくれなかったのがTodoWriteでかなり安定しました。
Claude Codeにワークフローを守ってもらいたい時はTodoWriteおすすめです。

追記: 最近のバージョンでは、タスクリスト用のツールが TodoWrite から Task* 系ツール（TaskCreate / TaskUpdate / TaskList / TaskGet）に変わっています。役割は同じで、進捗管理（pending → in_progress → completed）は TaskCreate + TaskUpdate でそのまま表現できます。Task* はタスク間の依存関係（blockedBy）も指定できるので、「フェーズを飛ばさせない」用途にはむしろ向いています。TodoWrite も後方互換で残っていますが、新しくスキルを作るなら Task* がよさそうです。



 Agent：並列化とコンテキスト分離
Agent はサブエージェントを起動するツールです。メインのClaude Codeとは別コンテキストで独立した作業をさせられます。
使いどころは並列化とコンテキスト分離の2つ。それぞれ別のスキルで使っています。

 並列化：rules-reviewで複数カテゴリを同時にチェック
rules-review は .claude/rules/ に書かれたルールにコード変更が違反していないかをチェックするスキルです。
ルールファイルが10個以上あると、全部を1回でチェックさせるには情報量が多すぎる。そこでルールをカテゴリごとにグループ分けして、それぞれを別の Agent に見させる構造にしました。各エージェントが見るルールと差分を絞ることでレビュー精度を上げるのが狙いです。
Launch one Agent per group **in parallel** (use a single message with multiple
Agent tool calls).

Before launching Agents, **prepare the data to embed in each prompt**:
- For each group, run `git diff <base-commit> -- <matched-files>` and capture
  the output
これを Agent で並列実行する（1メッセージに複数の呼び出しを入れる）ことで、3〜5グループに分けてもほぼ1回分の時間でチェックが終わります。責務を分けるとふつう時間が増えてしまうところを、並列化でほぼゼロコストにできるのが Agent のいいところです。

extract-rules の --from-conversation は、セッションの .jsonl（会話履歴の生データ）を解析してルールを抽出するモードです。これをメインでやると


.jsonl が数MB〜数十MBあってコンテキストを食う
解析後の結果だけあればいいのに、途中経過のログが残り続ける

ということになるので、重い処理は丸ごとAgentに投げる構造にしました。メインは「抽出しといて」と依頼するだけで、jsonl解析・分類・ルール追記は全部Agent側で完結し、返ってくるのはサマリーだけ。
この「重い処理はサブエージェントに丸投げしてサマリーだけ受け取る」パターン、スキルを書くときに一番よく使っているかもしれません。


 おまけ：EnterPlanMode / ExitPlanMode
正直よく使っているのは上の2つで、3つ目は記事的にちょっと物足りなかったので入れています。ただ、こういうこともできるよという紹介として。
EnterPlanMode / ExitPlanMode はスキルからPlan Modeへの出入りを制御するツールです。Plan Mode中は編集系ツールが使えなくなるので、「計画を作ってから実装に入る」という流れを強制できます。
dev-workflow では、計画作成のステップで EnterPlanMode させて、ユーザーが計画を承認するまで ExitPlanMode させない、という使い方をしています。
### Step 2: Create Plan
1. `EnterPlanMode`
2. Analyze the task and codebase, create implementation plan
3. **No code changes in this phase**

### Step 4: Finalize Plan (USER APPROVAL GATE)
1. Present the reviewed plan to the user
2. Wait for explicit user acceptance
3. After the user accepts, `ExitPlanMode` and begin implementation
「計画を作ってください」とだけ書くと、計画を出したそのまま実装に突入されがち。Plan Modeに入れておけば編集ツールが物理的に使えないので、その事故が起きなくなります。用途は限定的ですが、計画承認のゲートを挟みたいスキルでは便利です。


 まとめ



ツール
使うとき




TodoWrite
フローを守らせたいとき。反復回数を固定したいとき


Agent
責務を分けて精度を上げたいとき、メインのコンテキストを汚したくないとき



EnterPlanMode / ExitPlanMode

実装前にユーザー承認を挟みたいとき



ただ、これらを指定したからといって完璧に守られるわけではありません。TodoWrite に全部並べてあっても途中で脱線することはあるし、Agent に投げた処理が微妙に期待とズレて返ってくることもあります。それでも、Markdownだけで書いていたころと比べると挙動の安定感はだいぶ違います。

今回話に出たスキルは以下のリポジトリで公開しています。
hiroro-work/claude-plugins


dev-workflow: 計画 → レビュー → 実装 → チェックの流れを回すスキル

rules-review: .claude/rules/ に対する準拠性チェック

extract-rules: コードベース・会話・PRからルールを抽出


この記事はZenn/Qiitaにクロスポストしています
「いいソフトウェアをつくる」を追求するソニックガーデンのエンジニアによる技術発信。Claude Code等のAIエージェント活用、Rails・インフラ、個人ツールの自作、ドメイン設計など、現場で試したことを発信しています。
