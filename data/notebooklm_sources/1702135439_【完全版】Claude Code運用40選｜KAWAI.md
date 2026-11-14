---
title: "【完全版】Claude Code運用40選｜KAWAI"
source: "note"
url: "https://note.com/kawaidesign/n/nce2f82c62f1f"
date: "2026-05"
domain: "other"
tags: ["Plan Mode", "CLAUDE.md", "Hooks", "git worktree", "claude -p"]
score: 92
core_rule: "Claude Codeをチャットではなく自律作業環境として設計し、「同じミスを2回したらCLAUDE.mdへ追記・長文知識はSkillsへ分離・禁止事項はHookで阻止・大きな変更は成功条件付きPlan Mode＋別セッションレビュー」の順で段階導入する。"
anti_pattern: "「直して」と曖昧に頼み検証手段を渡さなかったり、禁止事項をプロンプトだけでお願いしてHookやPermissionsで強制しないこと。"
---

## 1. 解決する課題（Problem）
- Claude Codeを単なるチャット相手として扱い、説明の繰り返し・意図しないファイル編集・検証不足による手戻りが発生する課題を、設定・文脈・検証・自動化・並列化の6軸で解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** 複数ファイル変更や不確実な変更を行う場合 **THEN** Plan Modeから開始し、逆に誤字修正や1行変更にはPlan Modeを使わず直接実行する。
- **IF** 実装を依頼する場合 **THEN** 成功条件（通すべきテスト・期待出力・スクリーンショット差分なし）と既存実装パターンを先に渡し、エラーログは要約せず生ログを読ませる。
- **IF** 触れてほしくないファイル（migrationsや秘密鍵）がある場合 **THEN** プロンプトのお願いではなく `PreToolUse` Hook と `/permissions` のdeny設定で物理的にブロックする。
- **IF** 大規模ファイル移行や並列開発を行う場合 **THEN** `git worktree` で独立タスクを分離し、WriterとReviewerを別セッションに分け、大量ファイル処理は `claude -p` でfan-outする（まず2〜3ファイルで試験）。
- **IF** これから運用を整える場合 **THEN** 1週目は `CLAUDE.md`＋Plan Mode＋自己検証、2週目にPermissions/Hooks/Skills、次にSubagents/worktree/MCP/GitHub Actionsの順で導入する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 毎回読む必要のない長い手順までCLAUDE.mdに詰め込み、指示の効き目を落とすこと。
- MCPの巨大な出力を無制限にコンテキストへ流し込んで圧迫すること。
- 同じセッションに自分の実装をレビューさせてバイアスを残すこと。
- 1セッションに大規模移行を丸ごと抱え込ませたり、レビュー可能な上限を超えるworktreeを同時展開すること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```bash
# 非対話モードでのバッチ処理・CI実行例
claude -p "対象のログを解析して異常箇所を抽出してください" --output-format json
```
