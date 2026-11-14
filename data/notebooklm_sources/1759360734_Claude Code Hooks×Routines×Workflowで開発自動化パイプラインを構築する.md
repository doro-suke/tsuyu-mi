---
title: "Claude Code Hooks×Routines×Workflowで開発自動化パイプラインを構築する"
source: "Zenn"
url: "https://zenn.dev/0h_n0/articles/3a4fdda1d5c743"
date: "2026-06"
domain: "other"
tags: ["Hooks", "Routines", "Dynamic Workflows", "settings.json", "worktree"]
score: 92
core_rule: "Claude Codeの自動化は「Hooks（ローカル決定論ガード）」「Routines（クラウド定期/GitHub/API駆動、$0.08/時間）」「Dynamic Workflows（最大16並列・総1,000エージェントの大規模実行）」の3層で使い分け、まずHooksから段階導入する。"
anti_pattern: "Hooksのcommand内にシングルクォートを書いてJSON構文エラーを起こしたり、Workflow内でDate.now()等の非決定的関数や読み取り専用タスクへのworktree隔離を使うこと。"
---

## 1. 解決する課題（Problem）
- コード整形・危険コマンド阻止（ローカル）、PRレビュー・夜間バッチ（無人クラウド）、数百ファイル移行（大規模並列）をどの自動化機構で実装すべきかの設計指針を確立する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** 決定論的ガードや自動整形を行いたい場合 **THEN** `.claude/settings.json` の `PreToolUse`（破壊的コマンド検知で `exit 2`）や `PostToolUse`（`$CLAUDE_TOOL_INPUT_FILE_PATH` へのフォーマッタ実行）を設定する。
- **IF** Hookの `command` が複雑になる場合 **THEN** JSON内のシングルクォート混入エラーを防ぐため外部 `.sh` スクリプトへ分離し `jq . .claude/settings.json` で検証する。
- **IF** 無人の定期実行やPR自動レビューを行いたい場合 **THEN** `Routines`（`/schedule` または `claude.ai/code/routines`）を使う。なお `/schedule` は `ANTHROPIC_API_KEY` を外し claude.ai ログイン状態で実行する。
- **IF** `Dynamic Workflows` で並列ファイル編集を行う場合 **THEN** `isolation: "worktree"` を指定し（読み取り専用分析にはオーバーヘッド200〜500msのため不使用）、`Date.now()` 等の非決定的関数は使わず `args` で渡す。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- パターンマッチで十分なHookに `type: "prompt"` を使い、不要なモデル呼び出しレイテンシを増やすこと。
- 読み取り専用の分析エージェントに `isolation: "worktree"` を付けて無駄なセットアップ遅延を発生させること。
- `Dynamic Workflows` を最初から500ファイル全体に走らせ、1ディレクトリ単位の試験なしでトークンを大量消費すること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```json
// PreToolUse 危険コマンドブロック例 (.claude/settings.json)
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -qE 'git\\s+push\\s+.*--force|git\\s+reset\\s+--hard' && echo 'BLOCKED' >&2 && exit 2 || exit 0"
      }]
    }]
  }
}
```
