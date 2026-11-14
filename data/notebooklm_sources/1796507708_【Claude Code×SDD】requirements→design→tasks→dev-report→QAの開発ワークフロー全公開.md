---
title: "【Claude Code×SDD】requirements→design→tasks→dev-report→QAの開発ワークフロー全公開"
source: "Zenn"
url: "https://zenn.dev/emuni/articles/claude-code-sdd-workflow-guide"
date: "2026-07"
domain: "other"
tags: ["ClaudeCode", "AI駆動開発", "ナレッジ・情報整理"]
score: 92
core_rule: "vibe coding（雑な指示・行き当たりばったり実装）を排し、CLAUDE.mdに「requirements → design → tasks → development → dev-report → test(QA)」の6フェーズと人間によるReviewゲートを焼き込んで仕様をリポジトリ資産として蓄積する。"
anti_pattern: "仕様や背景をドキュメント化せずClaude Codeにいきなりコードを書かせ、チャット履歴の消滅とともに仕様が失われ、実装完了後に手戻りやレビュー不能に陥ること。"
---

## 1. 解決する課題（Problem）
- 会話ログにしか仕様が残らず、後から機能の意図や挙動の理由が追えなくなる
- 要件のすり合わせをしないまま実装が走り、実装完了後に「思ってたのと違う」と大幅な手戻りが発生する
- セッション終了時やチームメンバーへの引き継ぎ時にコンテキストを渡せない
- 差分だけ見ても元々の作成意図が分からずコードレビューが形骸化する

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```markdown
## SDDドキュメント運用ルール
- 仕様ドキュメントはすべて docs/spec-driven-dev/ 配下で管理する
  - requirements/ : 要件定義書 (REQ-001-<topic>.md 形式、番号は自動採番)
  - design/       : 設計書     (DES-001-<topic>.md 形式)
  - tasks/        : タスクリスト (TASK-001-<topic>.md 形式)
  - dev-reports/  : 開発レポート (DR-001-<topic>.md 形式)
- 新機能の開発は必ず requirements → design → tasks → development
  → dev-report → test(QA) の順で進める
- 各ドキュメントの冒頭に、関連ドキュメントへの相互リンクを必ず張る
  (REQ ↔ DES ↔ TASK ↔ DR が互いに辿れる状態にする)
- 各フェーズの成果物は、私(人間)がレビュー・承認するまで
  次のフェーズに進まない
- 実装(development)はTASKのチェックリストに沿って進め、
  完了したタスクにはチェックを入れて更新する
```
