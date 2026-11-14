---
title: "Antigravityを事故らせない運用設計｜hirokaji"
source: "note"
url: "https://note.com/tasty_dunlin998/n/n0dd53c5c4406"
date: "2026-05"
domain: "other"
tags: ["Antigravity", "Rules 3層分離", "Review-driven", "Artifact Gate", "Pre-flight Harness"]
score: 92
core_rule: "AntigravityではRulesをGlobal（普遍条件）・Workspace（リポジトリ固有）・Workflows（オンデマンド処理）の3層に分け、既定をReview-driven＋Browser JS Disabled＋deny listに絞り、Implementation Plan承認とWalkthrough/テストを完了ゲート（DoD）に組み込む。"
anti_pattern: "すべてのルールをGlobalに詰め込んでtool bloatを起こしたり、最初からAgent-driven / JavaScript Always Proceedで実行し、Artifactを単なる事後ログとして放置すること。"
---

## 1. 解決する課題（Problem）
- Antigravity の複数エージェント並列・自律実行環境において、ルール肥大化によるコスト/遅延増（tool bloat）と、過剰な実行権限による破壊的誤操作を防ぐ運用設計を確立する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** Antigravity のルールを配置する場合 **THEN** Global（機密出力禁止・workspace外書換禁止等の普遍条件）、Workspace（命名規則・編集範囲）、Workflows（`/generate-unit-tests` 等オンデマンド処理）の3層に分離する。
- **IF** 実行ポリシーを設定する場合 **THEN** 既定値を Review-driven に寄せ、Terminal は Request review ＋ deny list（`rm -rf`, `git push --force`, `sudo` 等）、Browser JavaScript は不要時 Disabled にする。
- **IF** 作業の完了判定（DoD）を行う場合 **THEN** Artifact を単なるログにせず、「Implementation Plan 承認済み」「変更がscope内」「テスト結果または Walkthrough 要約提出済み」を通過必須のゲートにする。
- **IF** 新規タスクを本番 workspace へ投入する場合 **THEN** 並列数上限（例: `max_parallel_agents: 2`）を設け、まず `.sandbox/` クローン上で Planning モードの dry-run（サンプル2本）に通してから昇格させる。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- Global rules にリポジトリ固有規約や長大なテスト手順まで押し込んで文脈を汚染すること。
- ブラウザ検証が不要なタスクで JavaScript Execution を Always Proceed にしてセキュリティ露出を広げること。
- Implementation Plan の事前承認や Walkthrough の確認なしに完了扱いにすること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```yaml
# 最小運用ハーネス例
harness:
  max_parallel_agents: 2
  default_mode:
    planning_mode: planning
    terminal_policy: request_review
    browser_js_policy: disabled
    artifact_review: request_review
  deny_commands: ["rm -rf", "del /s /q", "git push --force", "sudo"]
```
