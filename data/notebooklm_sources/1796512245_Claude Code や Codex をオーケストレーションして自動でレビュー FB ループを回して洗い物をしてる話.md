---
title: "Claude Code や Codex をオーケストレーションして自動でレビュー FB ループを回して洗い物をしてる話"
source: "Zenn"
url: "https://zenn.dev/nrs/articles/db4120beb0e601"
date: "2026-11"
domain: "other"
tags: ["AI駆動開発", "ClaudeCode", "AIエージェント"]
score: 90
core_rule: "実装エージェントとレビューエージェント（edit: false）のコンテキストを分離（1エージェント1責務）し、YAMLの「宣言的オーケストレーション」によってレビュー合格まで修正ループをプログラム的に強制する。"
anti_pattern: "1つのAIセッションに実装とレビューの両方を兼任させたり、プロンプトやSkillのお願いベースでレビュー実行を指示してAIに手順を自己判断でスキップさせること。"
---

## 1. 解決する課題（Problem）
- 動けばいいという場当たり的なコード（不要な後方互換サポート、DRY違反のコピペ増殖）が出てきて人間が全行レビューする必要がある
- 人間が画面に張り付いてチェック・承認・軌道修正を繰り返す「AIのベビーシッター」状態になり自分の時間が奪われる
- 単一セッションではLost in the MiddleやContext Rot、compactionにより制約ルールが中盤以降に薄まり無視される
- 「実装したらレビューしてね」と頼んでもAIが自己判断で手順をスキップする

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```yaml
movements:
  - name: implement
    persona: coder
  - name: review
    persona: reviewer
    edit: false              # コードを編集できない
    rules:
      - condition: 問題なし
        next: COMPLETE
      - condition: 修正が必要
        next: fix            # fix に強制遷移
  - name: fix
    persona: coder
    rules:
      - condition: 修正完了
        next: review         # review に戻る
```
