---
title: "Loop Engineering入門：AIコーディングエージェントを動かすシステムを設計する"
source: "Zenn"
url: "https://zenn.dev/suwash/articles/loop-engineering_20260610"
date: "2026-06"
domain: "other"
tags: ["AI駆動開発", "AIエージェント", "ClaudeCode", "セキュリティ・品質"]
score: 92
core_rule: "エージェントを手動で逐次プロンプトするのではなく、再帰的ゴール・Maker-Checker分離・外部状態（STATE.md）・厳格な停止条件と自律ティア（L1→L2→L3）を備えたループ（自律システム）として設計する。"
anti_pattern: "停止条件やトークン予算を設計せずに無人実行（L3）を走らせたり、実装エージェントに自己成果物をレビューさせて確証バイアスによる見逃し（Verifier Theater）を起こすこと。"
---

## 1. 解決する課題（Problem）
- 単一セッションで完結しない複雑なタスクで逐次プロンプトを続けると非効率で人間の介在コストが限界に達する
- 実装者が自分の成果物を検証すると自己採点バイアスによりバグや規約違反を見逃す
- 停止条件や試行上限のないループが無限リトライに陥りトークンコストが二次関数的に急増する
- 自動化速度にコード理解が追いつかないComprehension Debt（理解負債）やチームの認知的降伏（Cognitive Surrender）が発生する

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```markdown
<!-- 実装者エージェント (Implementer) -->
---
isolation: worktree
---
You are an implementer sub-agent for loop-engineering.
Apply only the specific fix described in the task.
Do not self-merge. Signal the verifier when done.

<!-- 検証者エージェント (Verifier) -->
You are an adversarial reviewer.
Run the test suite, check the diff against CONVENTIONS.md,
and reject anything that is not verifiably done.
Use a fresh context — do not share memory with the implementer.
Report APPROVE or REJECT with reasons.
```
