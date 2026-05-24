# Claude Codeのコスト爆発を3つのhookで防ぐ——月$200を超えないための安全装置 - Qiita
- **Source URL**: https://qiita.com/yurukusa/items/b79edb07bebc794a4a17
- **Score**: 92
- **AI Summary**:
  - Claude Codeの暴走によるコスト急増を3層のプロセスレベルhookで確実に防ぐ手法を提示
  - 即時遮断、セッション監視、日次累積追跡を行う3つの具体的なBashスクリプトと動作原理を解説
  - settings.jsonへの設定例が明記され、ツール呼び出し回数を指標とした実用的な制御が可能
- **Read Now Reason**: AI駆動開発においてClaude Code導入時の最大の懸念である「自律ループによるコスト爆発」を、即時適用可能なコードと設定ファイルで確実に防止できるため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #コスト最適化, #Bash
- **Processed Date**: 2026/5/24

---

## 本文
Claude Codeを自律モードで走らせると、コスト爆発が起きる。GitHubのIssue #38335には80以上のthumbsupがついており、「一晩放置したら請求額が跳ね上がった」という報告が相次いでいる。
CLAUDE.mdに「コストを抑えろ」と書いても意味がない。コンテキストが膨らめば指示は埋もれる。プロセスレベルで動くhookだけが確実にコストを止められる。
この記事では、コスト爆発を3層で防ぐhookを紹介する。



レイヤー
hook名
防ぐもの




瞬間
tool-call-rate-limiter
暴走ループ（1分30回超）


セッション
session-quota-tracker
1セッションの使いすぎ


日次
daily-usage-tracker
1日の累積使いすぎ




hook 1: tool-call-rate-limiter — 暴走ループを即座に止める
Claude Codeがループに入ると、同じツールを1分に数十回呼び出す。トークン消費は指数的に増える。このhookは1分あたりのツール呼び出し回数を監視し、上限を超えたらブロックする。

コード
#!/bin/bash
# tool-call-rate-limiter.sh — Prevent runaway tool calls
# TRIGGER: PreToolUse
# MATCHER: (empty — all tools)

RATE_FILE="${HOME}/.claude/rate-limiter.log"
MAX_CALLS="${CC_RATE_LIMIT_MAX:-30}"
WINDOW="${CC_RATE_LIMIT_WINDOW:-60}"

mkdir -p "$(dirname "$RATE_FILE")"

NOW=$(date +%s)
CUTOFF=$((NOW - WINDOW))

# タイムスタンプを記録
echo "$NOW" >> "$RATE_FILE"

# ウィンドウ内の呼び出し数をカウント
RECENT=$(awk -v cutoff="$CUTOFF" '$1 >= cutoff' "$RATE_FILE" 2>/dev/null | wc -l)

# 古いエントリを削除（ファイル肥大化防止）
awk -v cutoff="$CUTOFF" '$1 >= cutoff' "$RATE_FILE" > "${RATE_FILE}.tmp" 2>/dev/null
mv "${RATE_FILE}.tmp" "$RATE_FILE" 2>/dev/null

if [ "$RECENT" -gt "$MAX_CALLS" ]; then
    echo "BLOCKED: Rate limit exceeded — $RECENT tool calls in ${WINDOW}s (max: $MAX_CALLS)." >&2
    echo "This usually means Claude is stuck in a loop. Check the task." >&2
    exit 2
fi

exit 0


仕組み


PreToolUseトリガーなので、ツール実行の前に走る

/tmp/にタイムスタンプを蓄積し、直近60秒の呼び出し数をカウント
30回を超えたらexit 2でブロック。Claudeは操作を実行できない
古いエントリは毎回pruneするのでファイルが肥大化しない


settings.jsonへの追加
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/tool-call-rate-limiter.sh"
          }
        ]
      }
    ]
  }
}


カスタマイズ
環境変数で閾値を調整できる:
# 1分20回まで（デフォルト: 30）
export CC_RATE_LIMIT_MAX=20

# ウィンドウを120秒に（デフォルト: 60）
export CC_RATE_LIMIT_WINDOW=120

コード生成のような高速タスクでは30回/分は正常な場合もある。自分の使い方に合わせて調整する。

hook 2: session-quota-tracker — セッション単位の累積監視
ループではないが、長時間セッションでじわじわとトークンを消費するパターンもある。このhookはセッション累計のツール呼び出し数を追跡し、段階的に警告する。

コード
#!/bin/bash
# session-quota-tracker.sh — Track cumulative tool calls per session
# TRIGGER: PostToolUse
# MATCHER: (empty — all tools)

SESSION_FILE="/tmp/cc-quota-tracker-$$"

# カウンターをインクリメント
if [ -f "$SESSION_FILE" ]; then
  COUNT=$(cat "$SESSION_FILE")
  COUNT=$((COUNT + 1))
else
  COUNT=1
fi
echo "$COUNT" > "$SESSION_FILE"

# 閾値で警告
case "$COUNT" in
  50)  echo "[Session: 50 tool calls. Consider saving work.]" >&2 ;;
  100) echo "[Session: 100 tool calls. Token usage may be high.]" >&2 ;;
  200) echo "[Session: 200 tool calls. Check your usage dashboard.]" >&2 ;;
  500) echo "[Session: 500 tool calls. Consider starting a new session.]" >&2 ;;
esac

exit 0


仕組み


PostToolUseトリガーなので、ツール実行の後に走る（ブロックではなく通知目的）

$$（シェルのPID）をファイル名に使うため、セッションごとに別カウンター
50 / 100 / 200 / 500回で段階的に警告メッセージを出力

exit 0なので操作はブロックしない。あくまで「気づき」を与える


settings.jsonへの追加
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/session-quota-tracker.sh"
          }
        ]
      }
    ]
  }
}


なぜツール呼び出し数なのか
Claude Codeはトークン使用量をhookに渡さない（2026年3月時点）。直接のコスト計算はできないが、ツール呼び出し数はトークン消費と強く相関する。1回のツール呼び出しで数千〜数万トークンを消費するため、呼び出し数は実用的なプロキシ指標になる。

hook 3: daily-usage-tracker — 日次の累積を見張る
セッションを何度も立ち上げ直す場合、セッション単位のトラッカーでは累積が見えない。このhookは1日のツール呼び出し総数を記録し、異常を検知する。

コード
#!/bin/bash
# daily-usage-tracker.sh — Track daily tool call count
# TRIGGER: PostToolUse
# MATCHER: (empty — all tools)

DAILY_DIR="${HOME}/.claude/daily-usage"
mkdir -p "$DAILY_DIR"

TODAY=$(date +%Y-%m-%d)
TODAY_FILE="${DAILY_DIR}/${TODAY}.log"
WARN_THRESHOLD="${CC_DAILY_WARN:-500}"

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)

# 呼び出しを記録
echo "$(date +%H:%M:%S) $TOOL" >> "$TODAY_FILE"

# 今日の呼び出し数をカウント
TODAY_COUNT=$(wc -l < "$TODAY_FILE" 2>/dev/null || echo 0)

# マイルストーンで通知
case "$TODAY_COUNT" in
    100|250|500|1000)
        echo "Daily usage: $TODAY_COUNT tool calls today ($TODAY)" >&2
        ;;
esac

# 閾値超過で警告
if [ "$TODAY_COUNT" -eq "$WARN_THRESHOLD" ]; then
    YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null)
    YESTERDAY_FILE="${DAILY_DIR}/${YESTERDAY}.log"
    YESTERDAY_COUNT=0
    [ -f "$YESTERDAY_FILE" ] && YESTERDAY_COUNT=$(wc -l < "$YESTERDAY_FILE")
    echo "Daily usage warning: $TODAY_COUNT calls today (yesterday: $YESTERDAY_COUNT)" >&2
fi

exit 0


仕組み


~/.claude/daily-usage/YYYY-MM-DD.logに時刻とツール名を記録

jqでstdinからツール名を抽出（PostToolUseはJSON入力を受け取る）
100 / 250 / 500 / 1000回でマイルストーン通知
閾値到達時に前日との比較を出力（異常検知の参考）


ログの活用
記録されたログは後から分析できる:
# 今日のツール別呼び出し回数
awk '{print $2}' ~/.claude/daily-usage/$(date +%Y-%m-%d).log | sort | uniq -c | sort -rn

# 過去7日間の推移
for f in ~/.claude/daily-usage/*.log; do
  echo "$(basename $f .log): $(wc -l < $f) calls"
done


3つを組み合わせた完全なsettings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/tool-call-rate-limiter.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/session-quota-tracker.sh"
          },
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/daily-usage-tracker.sh"
          }
        ]
      }
    ]
  }
}


セットアップ手順
# 1. hookディレクトリを作成
mkdir -p ~/.claude/hooks

# 2. 各スクリプトを配置（上記のコードをコピー）
chmod +x ~/.claude/hooks/tool-call-rate-limiter.sh
chmod +x ~/.claude/hooks/session-quota-tracker.sh
chmod +x ~/.claude/hooks/daily-usage-tracker.sh

# 3. settings.jsonに追加（上記のJSON）
# ~/.claude/settings.json を編集


コスト計算のTips
hookを設定したうえで、コスト感覚も持っておくとより効果的。

トークン単価（Claude 4 Sonnet）



種別
単価




入力トークン
$3 / 1Mトークン


出力トークン
$15 / 1Mトークン



出力は入力の5倍高い。Claudeが長文を生成するタスクほどコストが跳ね上がる。

コストを抑える実践的テクニック


/compactを定期的に実行 — コンテキストウィンドウをリセットし、入力トークンを削減

--max-turnsで上限を設定 — claude --max-turns 20で自律実行の回数を制限

大きなファイルを丸ごと読ませない — 必要な行だけ指定して読ませる

ループが疑われたらすぐCtrl+C — hookが効く前に自分で止めるのも有効


月$200に収めるには
Max（月$200）プランの場合、公式のUsage dashboardでリアルタイム消費を確認できる。hookの警告が来たらダッシュボードをチェックする習慣をつける。

ワンコマンドでセットアップする
手動で3つのhookを配置するのが面倒なら、cc-safe-setupでまとめて導入できる:
npx cc-safe-setup

446個のhookテンプレートから必要なものを選んでインストールできる。6,099テストで動作を検証済み。
コスト関連の3つのhookに加えて、rm -rfブロック、git push --force防止、secret漏洩検知など、安全hookも一括で入る。

もっと詳しく知りたい人へ


Claude Code実践ガイド（Zenn Book） — hookの仕組みから運用設計まで体系的に解説

npx cc-health-check — 無料の20項目診断。スコア80未満なら改善の余地あり


継続の更新の経路 (関連の資源)
本記事の3つの hook は直近の30日間で型を最小限に絞った版。 利用者の集まりの中で月単位で新しい cost spike の事故と修正が発見されるため、 継続的な更新の経路として CC Safety Lab Founder Membership (Ko-fi、 ¥500/月) を運営している。 月次で incident roundup と新しい hook と settings.json の regression alert を配信。 6月15日の claude -p の課金の分離 (Pro $20、 Max 5x $100、 Max 20x $200) の前の準備の点検表も含む。


CC Safety Lab Founder Membership (Ko-fi、 ¥500/月)
過去の cost spike の事故の事例
実機の cost spike の事故の整理は Claude Code Incident Postmortems (Gumroad、 ¥4,350) に集約。 10件の事故、 累計約 $24,000 の影響を、 発火の時の log と修正の経路で解説。 本記事の hook は予防の経路、 本書は事後の検視の経路。
Claude Code Incident Postmortems (Gumroad、 ¥4,350)

1Go to list of users who liked2Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
