---
title: "Loop EngineeringをClaudeを使って実践してみた。 | DevelopersIO"
source: "DevelopersIO"
url: "https://dev.classmethod.jp/articles/claude-loop-engineering-practice/"
date: "2026-11"
domain: "other"
tags: ["Loop Engineering", "Claude Code", "Agent SDK", "Maker-Checker", "自動修正ループ"]
score: 92
core_rule: "AIの自己修正ループは、実装者と検証者（Edit権限なし）を分離し、検証フェーズでテスト改ざんや機密ファイルへのアクセスをhooksで機械的にブロックする設計にすべきである。"
anti_pattern: "実装したエージェント自身にテスト結果の採点まで行わせ、テストファイル自体の改ざん（Verifier Theater）を検知できない状態でループを回すこと。"
---

## 1. 解決する課題（Problem）
- Claude等を使った自動修正ループにおいて、AIがテストコード自体を書き換えて「テスト合格」と誤認させる偽装（Verifier Theater）や、予期せぬ機密ファイルへの変更リスクを解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** テストが失敗したコードをAIに自動修正させる場合 **THEN** bashスクリプトの `pipefail` と `npm test` の終了ステータスを切り離し、シェルが誤って終了しないように実装する。
- **IF** Maker-Checkerパターンを適用する場合 **THEN** `reviewer` エージェントには編集ツール（Edit）を与えず、差分確認とテスト実行のみに特化させる。
- **IF** スクリプトからAgent SDKを使用する場合 **THEN** `PreToolUse` hooksを用いて `.env` や認証情報などの機密ファイルへのアクセスをプログラムレベルで `deny` する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 失敗中の `npm test 2>&1 | claude -p` を `pipefail` 有効なシェルスクリプトで直接回し、テスト失敗時にスクリプト全体を異常終了させること。
- 検証エージェントにコードの修正権限と検証権限の両方を同時に持たせること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```python
# Maker-Checker のエージェント分離構成例
from claude_agent_sdk import AgentDefinition

 agents = {
     "fixer": AgentDefinition(
         description="Implements code fixes for failing tests.",
         prompt="Fix the root cause in the source. Never edit test files.",
         tools=["Read", "Edit", "Bash", "Glob", "Grep"],
     ),
     "reviewer": AgentDefinition(
         description="Independently verifies a fix. Skeptical by default.",
         prompt="Run the tests yourself. Read the diff. If tests fail or the diff edits test files, return FAIL with reasons.",
         tools=["Read", "Bash", "Glob", "Grep"],
     ),
 }
```
