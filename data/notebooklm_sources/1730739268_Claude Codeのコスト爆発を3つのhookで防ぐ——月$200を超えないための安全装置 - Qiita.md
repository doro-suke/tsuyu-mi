---
title: "Claude Codeのコスト爆発を3つのhookで防ぐ——月$200を超えないための安全装置 - Qiita"
source: "Qiita"
url: "https://qiita.com/yurukusa/items/b79edb07bebc794a4a17"
date: "2026-05"
domain: "other"
tags: ["Hooks", "PreToolUse", "PostToolUse", "コスト制御", "rate-limiter"]
score: 92
core_rule: "自律実行時のコスト暴走を防ぐにはCLAUDE.mdへの記述ではなくプロセスレベルの3層Hook（瞬間: PreToolUseで1分30回超をexit 2遮断、セッション: 50/100/200/500回警告、日次: ログ記録＋前日比警告）を settings.json に組み込む。"
anti_pattern: "CLAUDE.mdに「コストを抑えろ」と書くだけで満足したり、--max-turns やプロセスレベルの遮断Hookなしで自律ループを放置すること。"
---

## 1. 解決する課題（Problem）
- Claude Code の自律モードで無限ツール呼び出しループや長時間セッションの累積課金が発生し、請求額が急騰する問題をプロセスレベルで確実に抑止する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** 暴走ループを即座に止めたい場合 **THEN** `PreToolUse` Hook（`tool-call-rate-limiter.sh`）で直近60秒の呼び出し回数を監視し、30回超過時に `exit 2` でブロックする（古いログは毎回prune）。
- **IF** 1セッションのじわじわした使いすぎを検知したい場合 **THEN** `PostToolUse` Hook（`session-quota-tracker.sh`）で `$$` 単位にカウントし、50/100/200/500回でstderrへ警告を出す（`exit 0`）。
- **IF** 複数セッションを跨いだ1日の総消費を監視したい場合 **THEN** `PostToolUse` Hook（`daily-usage-tracker.sh`）で `YYYY-MM-DD.log` にツール名を記録し、500回到達時に前日比較を出力する。
- **IF** コスト単価（出力は入力の5倍）を抑えたい場合 **THEN** `--max-turns 20` 等のターン上限指定、定期的な `/compact`、およびファイルの行範囲指定読み込みを徹底する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- ツール呼び出し制限をプロンプトやCLAUDE.mdの指示だけに頼ること（コンテキストが膨らめば埋もれて無視される）。
- 大きなファイルを丸ごと読み込ませて毎回入力トークンを浪費すること。
- 日次の累積トラッキングをせずセッションを再起動し続けて総消費を見失うこと。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```bash
# PreToolUse: 直近60秒で30回超えたら exit 2 でブロック
NOW=$(date +%s); CUTOFF=$((NOW - ${CC_RATE_LIMIT_WINDOW:-60}))
echo "$NOW" >> "$RATE_FILE"
RECENT=$(awk -v cutoff="$CUTOFF" '$1 >= cutoff' "$RATE_FILE" | wc -l)
awk -v cutoff="$CUTOFF" '$1 >= cutoff' "$RATE_FILE" > "${RATE_FILE}.tmp" && mv "${RATE_FILE}.tmp" "$RATE_FILE"
[ "$RECENT" -gt "${CC_RATE_LIMIT_MAX:-30}" ] && echo "BLOCKED: Rate limit exceeded" >&2 && exit 2
```
