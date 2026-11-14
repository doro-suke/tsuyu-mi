---
title: "Claude Code Dynamic Workflows入門 — 並列サブエージェントで大規模タスクを自動化する - Qiita"
source: "Qiita"
url: "https://qiita.com/kai_kou/items/fe9b0e65e2252af773c9"
date: "2026-10"
domain: "other"
tags: ["ClaudeCode", "AI駆動開発", "AIエージェント", "自動化パイプライン"]
score: 90
core_rule: "Claude Code Dynamic Workflowsでは、大規模タスク（移行・監査・リサーチ）を直列会話で回さず、JavaScriptオーケストレーションスクリプトを自動生成させて中間結果を変数に集約し、最大1,000エージェント（同時16並列）で分散実行させ、Ctrl+Gによる事前スクリプト確認とスコープ明示で制御する。"
anti_pattern: "スコープや変更ポリシーを明示せず曖昧なプロンプトでworkflowを起動すること（サブエージェントが発散し大量トークンを浪費）、/effort ultracodeを常時ONにすること、単一ファイルの軽微な修正やインタラクティブな応答タスクにDynamic Workflowsを使うこと。"
---

## 1. 解決する課題（Problem）
- 通常のClaude Codeは1つのチャットターンで直列処理するため、大規模コードベースの読み込みだけでコンテキストウィンドウが急速に圧迫・枯渇する
- 大規模な移行や監査を手動で分割・指示する運用負荷が大きい
- マルチエージェント並列実行において、スコープや権限を曖昧にするとサブエージェントが収束せずトークンを爆発的に浪費し、予期せぬ破壊的変更を起こす

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```markdown
# 推奨プロンプト構成（コードベース移行）
Run a workflow to migrate [対象] from [旧バージョン] to [新バージョン].
- Scope: [ディレクトリ/ファイルパターン]
- Verification: Run [テストコマンド] after each file change
- Edit policy: Only modify files that fail verification
- Output: Summary of changed files and test results

# 読み取り専用監査プロンプト
Run a workflow to audit all API endpoints in src/api/ for:
1. Missing authentication middleware
2. Unsanitized input parameters
3. Exposed sensitive data in responses
For each finding, report: file path, line number, severity (high/medium/low), and recommended fix. Do not modify any files.
```
