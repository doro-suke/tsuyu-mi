# VS Code 時代は終わった？「Google Antigravity & Agent Studio」による自律開発の夜明け
- **Source URL**: https://zenn.dev/hokanco28/articles/320965c0115075
- **Score**: 45
- **AI Summary**:
  - Google Antigravityは、エージェント管理を主軸に据えたVS Codeベースの新しい自律型開発プラットフォームである
  - Agent Studioにより、MCPサーバー経由でツールを拡張し、エージェントの権限やワークフローを厳格に統治可能
  - 開発者の役割はコード記述から、エージェントが生成した計画の承認やアーキテクチャの全体統制へと移行する
- **Read Now Reason**: AIエージェントによる自律開発（Agentic Workflow）の最新トレンドと、MCPやSLSAを組み合わせたガバナンスの設計思想を早期に把握できるため。
- **Suggested Tags**: #AI駆動開発, #エージェントワークフロー, #GoogleCloud, #MCP
- **Processed Date**: 2026/5/12

---

## 本文
はじめに
2026年、私たちの開発スタイルは劇的な転換点を迎えました。Google Cloud が打ち出した 「Antigravity」 と 「Agent Studio」 は、従来の「人間がコードを書く」という行為を、「人間がエージェントの計画を承認する」という行為へとアップデートしました。
この「エージェント・ファースト」な開発環境がもたらす衝撃を解説します。

 1. Google Antigravity：IDE ではなく「ミッション・コントロール」
Antigravity は、VS Code の基盤をフォークしつつも、ユーザー体験を「テキスト編集」から「エージェント管理」へと再定義した開発プラットフォームです。


Agent-First Workflow: 右側の「Agent Manager」が主役です。エージェントはコード、ターミナル、ブラウザを自在に操り、複雑なマイグレーションを自律的に完結させます。

Planning & Execution: 人間が「Swift アプリのプロトタイプを作って」と命じると、エージェントが**タスクリスト（計画）**を作成。承認すれば、エージェントが全ファイルを書き換え、ビルドし、バグを修正します。

バイブコーディングの極致: 75% の新規コードが AI 生成される Google 社内でも使われており、従来の 6 倍の速さでコード移行を完了させます。


 2. Agent Studio：エージェントを「統治」する場所
Gemini Enterprise Agent Platform の中核を成すのが Agent Studio です。


ローコード・構築: 自然言語でエージェントの「性格」と「ツール（MCP サーバー等）」を定義。

Agent Identity: エージェントに固有の ID を付与し、どのエージェントがどのリソースを操作したかを厳格に管理。

Skills & Triggers: スケジュールや特定のイベント（GitHub の PR 作成など）をトリガーに、エージェントを自動起動させるワークフローをノーコードで設計できます。


 3. エージェントとの「整い」
アーキテクトとして、この環境をどう乗りこなすべきか。


SLSA との親和性: Antigravity が生成したコードの「血統（Provenance）」を、デプロイ時にどう検証するか。

MCP による拡張: 独自の BigQuery 分析ツールや Firestore 操作ツールを MCP サーバーとして公開し、エージェントに「最強の手足」を与える。
開発者はもはや「ジュニアの面倒を見る」のではなく、「有能なデジタルタスクフォースの司令官」 として、全体のアーキテクチャを「整える」役割へシフトしています。


 おわりに
Google Antigravity は、私たちがサウナでリラックスしている間に、レガシーコードの refactoring を終わらせてくれるパートナーです。
連休明け、まずは Antigravity で手元の古いリポジトリを「整えて」みませんか？
参考・引用元:


Cloud Next '26: Building the Agentic Enterprise (2026/04/22)
https://cloud.google.com/blog/ja/topics/google-cloud-next/welcome-to-google-cloud-next26?hl=ja


Google Antigravity Documentation | Getting Started
https://antigravity.google/docs/get-started?hl=ja-JP
