---
title: "Claude Code に「同じ指摘を二度させない」仕組みを hook で作った"
source: "Zenn"
url: "https://zenn.dev/nozomi720/articles/claude_code_hooks_feedback"
date: "2026-09"
domain: "other"
tags: ["ClaudeCode", "AI駆動開発", "プロンプト・コンテキスト", "AIエージェント"]
score: 92
core_rule: "指摘を1指摘=1ファイルのフィードバック（~/.claude/feedback/<topic>.md）として永続化し、指摘回数（count）に応じてUserPromptSubmit（注入）・PreToolUse（事前停止）・Stop（終了阻止）の3段hookで強制力を段階的（warn→ask→deny）に引き上げる。"
anti_pattern: "人間が同じ指摘を何度もチャットで口頭注意する、CLAUDE.mdの肥大化でルール形骸化を招く、初回の指摘から一律でツール実行を完全禁止（deny）して誤検知で作業不能にする。"
---

## 1. 解決する課題（Problem）
- 「テストを先に書いて」「Bashで手動実行しないで」など、同じ注意を何度も繰り返して人間が消耗する。
- CLAUDE.mdにルールを追記してもセッションが長くなると効き目が薄れ、何回指摘したかも把握できなくなる。
- ルールが増えすぎて毎ターンのコンテキストを圧迫し固定費が跳ね上がる。
- AIが「今回は特別だから」と自分勝手な理屈（言い訳）をつけてルールを回避しようとする。
- hook自体のスクリプトエラーでユーザーの作業が完全にストップしてしまう。

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```markdown
# ~/.claude/feedback/tdd.md の例
---
name: tdd
description: 実装前にテストを書くTDDアプローチを必ず取ること
type: feedback
count: 6
enforce:
  - event: pre_edit
    path: '**/*.ts'
    absent_sibling: '{stem}.test.ts'
    message: 'TDD: 実装ファイルを書く前にテストファイル(Red)を先に書くこと。'
    severity: ask
---
実装を始める前に必ずテストを先に書くこと。
**Why:** ユーザーはTDDを要求しており、テストなしの実装は受け入れられない。
**How to apply:** リファクタリング時も必ずテストファイルを先に書いてからプロダクションコードを書く。
**言い訳:** 「大量のファイルを一括変更したから壊れていないか確認したい」等は正当に見えるが例外扱いの逃げ道そのもの。
```

```json
// settings.json の hook 設定例
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "python3 \"$HOME/.claude/hooks/feedback-inject.py\"" }] }
    ],
    "PreToolUse": [
      { "matcher": "Bash|Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "python3 \"$HOME/.claude/hooks/feedback-guard.py\"" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "python3 \"$HOME/.claude/hooks/feedback-stop-check.py\"" }] }
    ]
  }
}
```
