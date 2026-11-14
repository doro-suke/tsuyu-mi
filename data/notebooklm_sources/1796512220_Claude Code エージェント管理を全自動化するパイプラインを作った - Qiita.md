---
title: "Claude Code エージェント管理を全自動化するパイプラインを作った - Qiita"
source: "Qiita"
url: "https://qiita.com/noujiru/items/eb346d22aef782ee8619"
date: "2026-11"
domain: "other"
tags: ["ClaudeCode", "AI駆動開発", "自動化パイプライン", "AIエージェント"]
score: 92
core_rule: "Claude Codeのサブエージェントは野良増殖・品質劣化を防ぐため、スキルと同等の管理基準（発見・取り込み・品質監視・使用追跡・ランク管理・チーム同期の6段階パイプライン）とBoris Cherny式の自己改善ループ（lessons記録）で統制する。"
anti_pattern: "サブエージェントを手動管理・野放しにしてdescriptionが曖昧なものを放置し、セキュリティ検証なしに外部コミュニティから取り込んでプロンプトインジェクションを踏むこと。"
---

## 1. 解決する課題（Problem）
- エージェントを手動管理するとdescriptionが雑で信頼できないものが混ざり品質がバラバラになる
- 使用頻度を追跡しないため不要なエージェントが残り続けコンテキストや管理コストを圧迫する
- チームへの配布が手動依存になり同期漏れや環境差異が発生する
- 外部のコミュニティエージェントを無批判に取り込むとプロンプトインジェクションや危険コマンド実行のリスクがある

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```markdown
---
name: code-reviewer
description: |
  4-pass code review specialist. Use when reviewing PRs or code changes.
  Do not trigger for simple typo fixes.
model: claude-opus-4-6
isolation: worktree
---
```
