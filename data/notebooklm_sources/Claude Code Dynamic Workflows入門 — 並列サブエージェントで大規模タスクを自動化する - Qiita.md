# Claude Code Dynamic Workflows入門 — 並列サブエージェントで大規模タスクを自動化する - Qiita
- **Source URL**: https://qiita.com/kai_kou/items/fe9b0e65e2252af773c9
- **Score**: 90
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #マルチエージェント
- **Processed Date**: 2026/10/7

---

## 本文
はじめに
2026年5月28日、AnthropicはClaude Opus 4.8のリリースと同時に、Claude Codeの新機能 Dynamic Workflows をリサーチプレビューとして公開しました。
従来のClaude Codeは1つのチャットターンを起点に順番に処理を進めていましたが、Dynamic Workflowsは JavaScriptのオーケストレーションスクリプトを自動生成し、最大1,000のサブエージェントを並列実行 する仕組みです。コードベース全体の移行、セキュリティ監査、マルチソース調査といった大規模タスクを、コンテキストウィンドウを消費せずに実行できます。
本記事では、公式ドキュメントと公開情報をもとに、Dynamic Workflowsの仕組みと実際の使い方を解説します。

この記事で学べること

Dynamic Workflowsが通常のClaude Codeと何が違うのか
3つのトリガー方法（/deep-research、workflow キーワード、/effort ultracode）
実行フローとスクリプトの確認方法（Ctrl+G）
ワークフローの保存・再利用とコスト管理


対象読者

Claude Codeを日常的に使っているエンジニア
大規模コードベースの移行・監査・リサーチに活用したい開発者
Claude Codeの有料プランを契約している、または検討している方


前提環境

Claude Code v2.1.154以上（claude --version で確認）

すべての有料プラン（Pro / Max / Team / Enterprise）で利用可能。Proプランでは /config の Dynamic workflows 行から手動で有効化が必要
Dynamic Workflowsが /config で有効化されていること



TL;DR


Dynamic Workflows: Claude Codeがタスクを分析し、JavaScriptのオーケストレーションスクリプトを生成→最大1,000サブエージェントが並列実行

3つのトリガー: /deep-research（ビルトイン）、"workflow"キーワード、/effort ultracode


Ctrl+G: 実行前にスクリプトを確認・承認可能

/workflows: 実行中のフェーズ・エージェント数・トークン消費をリアルタイム監視

保存: 成功したワークフローをスラッシュコマンドとして再利用可能

注意点: トークン消費が通常の数倍〜数十倍になるため、スコープを絞って利用する



Dynamic Workflowsとは何か

通常のClaude Codeとの違い
通常のClaude Codeでは、ユーザーのメッセージを受け取ったClaudeが 1つの会話ターンの中で順番に処理 を進めます。ファイルを読む→コードを書く→テストを実行する、という流れはすべて直列です。大規模なコードベースを扱うと、ファイル読み込みだけでコンテキストウィンドウが圧迫されるという課題がありました。
Dynamic Workflowsは、この制約を次の仕組みで解消します。




項目
通常のClaude Code
Dynamic Workflows




実行モデル
シングルエージェント（直列）
マルチエージェント（並列）


中間結果の保存場所
コンテキストウィンドウ
スクリプト変数


最大エージェント数
1
1,000（同時16並列）


タスク規模
ファイル〜モジュール単位
コードベース全体


中断・再開
セッション依存
セッション内で再開可能




仕組みの概要
公式ドキュメント によると、Dynamic Workflowsの流れは以下のとおりです。


プロンプト受信: ユーザーがワークフローをトリガーするプロンプトを送信

スクリプト生成: ClaudeがタスクをJavaScriptのオーケストレーションスクリプトに変換

承認ステップ: 承認プロンプトが表示され、Ctrl+G でスクリプトをエディタで確認できる

並列実行: ワークフローランタイムがスクリプトを実行し、最大16サブエージェントが並列で作業

結果集約: 各サブエージェントの結果がスクリプト変数に集約され、最終レポートとしてセッションに返される



3つのトリガー方法

方法1: /deep-research（ビルトインワークフロー）
最も簡単に試せるのが、Claude Codeに同梱されたビルトインワークフローです。
/deep-research Claude Code Dynamic Workflowsの最新仕様と制限事項

/deep-research は複数の角度から情報を並列検索し、ソースのクロスチェックを行った後、引用付きの統合レポートを生成します。単なる検索ではなく、情報の信頼性を複数エージェントが相互検証する点が特徴です。

方法2: "workflow"キーワード
プロンプトに "workflow" という単語を含めるだけでDynamic Workflowsが起動します。
Run a workflow to audit every API endpoint under src/routes for missing auth checks.

Migrate the authentication module from Express 4 to Express 5 using a workflow. 
Verify all tests pass at each stage.

ポイントは スコープ、出力形式、検証ルール、編集ポリシーを明示すること です。「アプリを改善して」のような曖昧なプロンプトでは、サブエージェントが収束せずトークンを無駄に消費します。

方法3: /effort ultracode

/effort ultracode

このコマンドを実行すると、Claude Codeが実質的な処理量を持つタスクに対して 自動的にWorkflowsを起動するかどうかを判断 するようになります。xhigh推論と組み合わせた自動オーケストレーションモードです。

/effort ultracode を常時有効にするとトークン消費が大幅に増加します。重要なタスクに限定して使用することが推奨されています。



実行フロー：ステップバイステップ


ステップ1: バージョンと設定を確認
claude --version
# v2.1.154 以上であることを確認

Claude Code内から設定を確認します。
/config
# Dynamic Workflows が有効になっていることを確認

/usage
# 現在のトークン消費量を確認（実行前のベースラインとして）


ステップ2: プロンプトを送信
ワークフローをトリガーするプロンプトを送信します。Claudeがタスクを分析し、実行計画を提示します。
Run a workflow to find all TypeScript files in src/ that use deprecated React 
lifecycle methods (componentWillMount, componentWillReceiveProps, 
componentWillUpdate), list them with line numbers, then replace each with 
the modern equivalent. Verify the test suite stays green after each file change.


ステップ3: スクリプトを確認（Ctrl+G）
承認プロンプトが表示されます。Ctrl+G を押すとスクリプトをエディタで開いて確認できます。不要なファイル変更や過剰なスコープが含まれていないかチェックした後、承認メニューから「Yes, run it」を選択してください。
// Claudeが生成するオーケストレーションスクリプトのイメージ（例）
const files = await findFiles("src/**/*.ts", { grep: "componentWill" });
const phases = chunk(files, 4); // 4ファイルずつ並列処理

for (const phase of phases) {
  await Promise.all(phase.map(file => 
    agent({ task: "migrate_lifecycle", file, verifyTests: true })
  ));
}
return summarize(results);

スクリプトを承認すると、ワークフローランタイムが起動します。

ステップ4: 進行状況を監視
/workflows

/workflows パネルで以下をリアルタイムに確認できます。

実行中のフェーズ番号
アクティブなサブエージェント数（最大16）
累計エージェント数（最大1,000）
トークン消費量

異常を検知した場合は /workflows パネルから実行を停止できます。

ステップ5: 結果を受け取る
すべてのサブエージェントが完了すると、集約された最終レポートがセッションに返されます。コンテキストウィンドウには中間データが蓄積されていないため、大規模なコードベースでも結果が明確に表示されます。


ワークフローの保存・再利用
成功したワークフローは、スラッシュコマンドとして保存して再利用できます。
/workflows
# 完了した実行を選択 → 's' キーで保存メニューを開く

保存先は2種類あります。



保存先
パス
適用範囲




プロジェクト共有
.claude/workflows/
チーム全員で共有


個人用
~/.claude/workflows/
自分のClaude Code環境のみ



保存後は /audit-routes のようにスラッシュコマンドとして呼び出せます。定期的なセキュリティ監査やリグレッションチェックに同じワークフローを再利用する用途に適しています。


コスト管理と安全な使い方

トークン消費の目安
Dynamic Workflowsは複数のサブエージェントが並列実行されるため、通常のClaude Code使用と比べてトークン消費が大幅に増加します。公式ドキュメントでは、ワークフローは通常の会話処理より大幅に多くのトークンを消費する可能性があることが明記されています。
実行前に /usage でベースラインを確認し、実行後に消費量を把握する習慣をつけることが重要です。

コスト最適化のポイント


スコープを絞る: src/routes/** のように対象ディレクトリを明示する

読み取り専用フェーズを分離: 最初のフェーズは分析のみ（変更なし）で実行し、結果を確認してから変更フェーズに進む

段階的に実行: 小規模なサブセットで検証してから全体に適用する

Ultracode常時ONを避ける: 必要なタスクの前後のみ有効化する


安全な実行のために


実行前に Ctrl+G でスクリプトを確認し、スコープが予期通りかチェックする
破壊的変更（ファイル削除、DB更新等）を含むワークフローは2段階プロセスに分割する

--dangerously-skip-permissions を使用している場合は特に慎重に




ユースケース別ベストプラクティス

コードベース移行
フレームワークのバージョンアップやライブラリの置き換えは、Dynamic Workflowsが最も威力を発揮するユースケースの一つです。
公開情報として、JavaScriptランタイム「Bun」の開発者Jarred Sumner氏がDynamic Workflowsを使用してBunをZigからRustへ書き直した事例があります。The Registerなどの複数メディアによると、6日間で約96万行 のコードを生成し、既存テストスイートの99.8%をパスしたと報告されています。
推奨プロンプト構成:
Run a workflow to migrate [対象] from [旧バージョン] to [新バージョン].
- Scope: [ディレクトリ/ファイルパターン]
- Verification: Run [テストコマンド] after each file change
- Edit policy: Only modify files that fail verification
- Output: Summary of changed files and test results


セキュリティ監査
Run a workflow to audit all API endpoints in src/api/ for:
1. Missing authentication middleware
2. Unsanitized input parameters
3. Exposed sensitive data in responses

For each finding, report: file path, line number, severity (high/medium/low), 
and recommended fix. Do not modify any files.

Do not modify any files を明示することで、読み取り専用の分析フェーズとして安全に実行できます。

深度調査（/deep-research）
技術選定や仕様調査には /deep-research が適しています。
/deep-research What are the performance differences between Bun, Node.js, and Deno 
for HTTP server workloads in 2026? Include benchmark sources and methodology.

複数の角度から並列検索し、情報の信頼性をクロスチェックした引用付きレポートが得られます。


注意点

現在の制限


リサーチプレビュー段階（2026年5月時点）: 仕様は今後変更される可能性があります

対応プラン: すべての有料プラン（Pro / Max / Team / Enterprise）。Proは /config でDynamic workflowsを有効化が必要

最小バージョン: Claude Code v2.1.154以上が必要

同時実行上限: 最大16エージェント（CPUコア数に応じてスケール）

累計上限: 1実行あたり最大1,000エージェント


向いていないユースケース

単一ファイルへの小規模な修正
即座の応答が必要なインタラクティブなタスク
明確なスコープ定義が難しい曖昧なタスク



まとめ
Claude Code Dynamic Workflowsは、コードベース全体の移行・監査・リサーチなど、これまで手動で分割していた大規模タスクを自動化するリサーチプレビュー機能です。


JavaScriptオーケストレーション: 自動生成されたスクリプトが最大1,000サブエージェントを協調実行

3つのトリガー: /deep-research（ビルトイン）、"workflow"キーワード、/effort ultracode


透明性: Ctrl+G でスクリプトを事前確認し、/workflows でリアルタイム監視

再利用性: 成功したワークフローをスラッシュコマンドとして保存

トークン消費が大きい点に注意しつつ、スコープを明確に絞ったプロンプトと組み合わせることで、大規模なコーディングタスクの自動化を実現できます。
なお、リサーチプレビュー段階のため仕様は今後変更される可能性があります。最新情報は公式ドキュメントでご確認ください。

参考リンク


Orchestrate subagents at scale with dynamic workflows — Claude Code Docs — Dynamic Workflows公式ドキュメント（制限・コスト・操作方法）

Introducing Claude Opus 4.8 — Anthropic — Claude Opus 4.8とDynamic Workflowsの公式発表

Anthropic's Bun Rust rewrite merged at speed of AI — The Register — Jarred Sumner氏のBun書き直し事例（96万行・6日間）

What's new — Claude Code Docs — 最新リリース情報

15Go to list of users who liked12Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
