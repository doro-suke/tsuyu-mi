# Claude 開発ワークフロー — Explore → Plan → Code → Commit の4段階 - Qiita
- **Source URL**: https://qiita.com/teppei19980914/items/b1d48d9624831519cbbf
- **Score**: 85
- **AI Summary**:
  - Claude Code公式が推奨する探索・計画・実装・記録の4段階ワークフローを具体的に解説
  - 実装前にPlan Modeで変更計画を作成し人間が承認することで、AIによる誤った実装を防止
  - 複数ファイルへの影響や未知のコードベースでは計画を必須とし、軽微な修正は直接実行する判断基準を提示
- **Read Now Reason**: AI駆動開発における手戻りを防ぐ『探索と実行の分離』手法が具体化されており、プロジェクトの生産性に直結するため。
- **Suggested Tags**: #AI駆動開発, #Claude_Code, #プロンプトエンジニアリング
- **Processed Date**: 2026/5/9

---

## 本文
筆者プロフィール: ソフトウェアエンジニア。「知った気にならない。いつまでも学び続ける」を信条に、業務と個人開発の両輪で技術を磨いています。AI 駆動開発で複数の個人開発アプリを構築・運用中。
👉 ポートフォリオ: 筆者ホームページ

この記事は約3分で読めます。

Claude に「いきなりコードを書かせる」のは、なぜ危険なのか？ Claude Code 公式ベストプラクティスが提示する Explore → Plan → Code → Commit の4段階ワークフローを、公式の根拠とともに解説します。連載「Claude プロンプト術 完全ガイド」の第2回です。

いきなりコードは最悪のパターン 🟢
公式の警告:

Letting Claude jump straight to coding can produce code that solves the wrong problem. Use Plan Mode to separate exploration from execution.

探索と実行を分離しないと、間違った問題を解決するコードを量産する というのが公式の立場です。


推奨される4段階ワークフロー 🟢

① Explore（Plan Mode で探索）
Claude に既存コードを読ませ、理解させる段階。変更は一切しない。
read /src/auth and understand how we handle sessions and login.
also look at how we manage environment variables for secrets.


② Plan（実装計画を作らせる）
理解した上で、実装計画を出させる。Ctrl+G で計画をテキストエディタで直接編集できます。
I want to add Google OAuth. What files need to change?
What's the session flow? Create a plan.


③ Implement（Normal Mode で実装）
Normal Mode に切り替え、計画に沿って実装 + テスト。
implement the OAuth flow from your plan. write tests for the
callback handler, run the test suite and fix any failures.


④ Commit
説明的なメッセージでコミット + PR 作成。
commit with a descriptive message and open a PR



Plan Mode のスキップ条件 🟢
全てのタスクで Plan Mode が必要なわけではない と公式は明記:

For tasks where the scope is clear and the fix is small (like fixing a typo, adding a log line, or renaming a variable) ask Claude to do it directly. Planning is most useful when you're uncertain about the approach, when the change modifies multiple files, or when you're unfamiliar with the code being modified.


🔵 Plan Mode の要否判定（筆者まとめ）



状況
Plan Mode




一文で diff を説明できる修正
スキップ


複数ファイルに影響する変更
使用


不慣れなコードベースでの変更
使用


アプローチに迷いがある
使用


誤字修正・ログ追加・変数リネーム
スキップ



目安は「一文で diff を説明できるか」。できるなら Plan 不要、できないなら Plan から始める。


具体的なコンテキストを渡す 🟢
公式の原則:

The more precise your instructions, the fewer corrections you'll need.


🟡 公式の Before/After 例



戦略
❌ Before
✅ After




スコープを切る
"add tests for foo.py"
"write a test for foo.py covering the edge case where the user is logged out. avoid mocks."


情報源を指す
"why does ExecutionFactory have such a weird api?"
"look through ExecutionFactory's git history and summarize how its api came to be"


既存パターンを指す
"add a calendar widget"
"look at how existing widgets are implemented. HotDogWidget.php is a good example. follow the pattern..."


症状を描写する
"fix the login bug"
"users report that login fails after session timeout. check src/auth/, especially token refresh. write a failing test, then fix it"




🟡 リッチな情報を渡す方法（公式記載）


@ でファイル参照: ファイルの場所を説明する代わりに @path/to/file で直接参照

画像の貼り付け: コピペ・ドラッグで直接渡せる

URL を渡す: ドキュメント・API リファレンスを参照させる

データをパイプ: cat error.log | claude で直接送る



まとめ — ワークフロー定着のコツ



段階
意識すべきこと




Explore
変更せず、読んで理解だけ


Plan
Claude に計画を出させ、人間が承認


Implement
計画に沿って実装、テストで検証


Commit
1コミット = 1つの意図



いきなり書かせない。 これが Claude を使いこなす人の共通パターンです。

次回予告（水曜日・バズ候補 🔥）
次回は Claude プロンプト 開発編11パターン。コード実装・レビュー・デバッグなど、即コピペで使える実用プロンプト集をお届けします。水曜投稿（PV最大日）にタイミングを合わせる予定です。

参考（一次ソース）

Best Practices for Claude Code — Anthropic 公式


関連記事（連載「Claude プロンプト術 完全ガイド」全8回）

第1回: Claude プロンプト最重要3原則 

第2回（本記事）: Claude 開発ワークフロー
第3回: Claude プロンプト 開発編11パターン 
第4回: Claude に伝わる指示の書き方 
第5回: Claude Code 固有機能の使い分け 
第6回: Claude プロンプト 思考編13パターン 
第7回: Claude プロンプト 日常編18パターン 
第8回: Claude プロンプト術 完全ガイド — 全記事まとめ
