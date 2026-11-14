---
title: "Claude Codeを使い倒すための設定術：CLAUDE.md・自動メモリ・コンテキスト管理の3本柱"
source: "Zenn"
url: "https://zenn.dev/tamai_hideyuki/articles/claude-code-config-best-practices"
date: "2026-11"
domain: "other"
tags: ["ClaudeCode", "AI駆動開発", "プロンプト・コンテキスト"]
score: 90
core_rule: "CLAUDE.md（チーム共有の常識・コードに書けない背景/制約）、自動メモリ（個人固有の学習/指摘履歴）、コンテキスト管理（/compactと/clearの使い分け）の3層を分離・連携させて文脈を管理する。"
anti_pattern: "CLAUDE.mdや自動メモリにコードを読めばわかる関数名やディレクトリ構造、陳腐化の早いスプリント情報を詰め込み、コンテキストウィンドウを圧迫・汚染すること。"
---

## 1. 解決する課題（Problem）
- セッションを開くたびにプロジェクト構成や規約、禁止事項を再説明する準備コストが発生する
- 長時間セッションや多数のファイル参照でコンテキスト上限に達し、序盤の指示が無視されたり回答に矛盾が生じる
- 自動メモリに古い指摘や誤った学習が蓄積し、リファクタリング後に誤ったコード配置を参照してしまう

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```text
# .claude/rules/ を使ってルールを分割するディレクトリ構成例
.claude/
  rules/
    articles.md      # 記事の執筆ガイドライン
    api.md           # API設計規約
    testing.md       # テスト戦略

# コンテキスト管理のコマンド使い分け
/compact  # 大きなタスクの区切りで要約圧縮して継続したいとき
/clear    # 全く新しいタスクに切り替えるとき
```
