# Claude Code と Gemini CLI による全自動コードレビューループ
- **Source URL**: https://zenn.dev/azumag/articles/a0d375832747fb
- **Score**: 92
- **AI Summary**:
  - Claude CodeのStop Hookを利用し、Gemini CLIを自動起動してコードレビューを完結させる手法の提案
  - transcript(JSONL)からClaudeの最終出力を抽出し、Geminiにgit diffと併せて渡すシェルスクリプトを公開
  - レートリミット対応やタイムアウト管理、文字数制限など、自動ループを安定させるための実用的な実装例
- **Read Now Reason**: AI駆動開発と自動化パイプライン構築に直結する内容であり、Claude CodeとGeminiを連携させる具体的なコードとフックの設定が明記されているため、即座に実装に適用できる。
- **Suggested Tags**: #ClaudeCode, #GeminiCLI, #自動レビュー, #AIエージェント, #シェルスクリプト
- **Processed Date**: 2026/5/5

---

## 本文
Claude Code の Stop Hook をトリガーに、Gemini CLI を呼んで自動でコードレビューしてもらいたいと思ってました。なぜ Stop なのか？ CLAUDE.md や途中の Hooks で Gemini CLI に対して対話を指示することもコード品質をあげる上で有効ですが、Claude Code の作業はそれはそれで一旦完結させて、その結果をレビューし、レビュー結果を Claude Code に戻して... というループを作って、人間が寝ている間にコードを洗練していって欲しい、実際はそんなにはうまくいかないだろうけれど、そんなロマンを追い求めたのです。

細かいセットアップはリポジトリを参照のこと。長いですが一応 hooks で呼ぶシェルスクリプトは以下です。
#!/bin/bash

# Cleanup function for temporary files
cleanup() {
    [ -n "$TEMP_STDOUT" ] && rm -f "$TEMP_STDOUT" 
    [ -n "$TEMP_STDERR" ] && rm -f "$TEMP_STDERR"
}

# Function to extract last assistant message from JSONL transcript
extract_last_assistant_message() {
    local transcript_path="$1"
    local line_limit="${2:-0}"  # 0 means no limit
    
    if [ ! -f "$transcript_path" ]; then
        return 1
    fi
    
    local jq_input
    if [ "$line_limit" -gt 0 ]; then
        jq_input=$(tail -n "$line_limit" "$transcript_path")
    else
        jq_input=$(cat "$transcript_path")
    fi
    
    echo "$jq_input" | jq -r --slurp '
        map(select(.type == "assistant")) |
        if length > 0 then
            .[-1].message.content[]? |
            select(.type == "text") |
            .text
        else
            empty
        end
    ' 2>/dev/null
}

# Set trap for cleanup on script exit
trap cleanup EXIT

INPUT=$(cat)

TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path')
if [ -f "$TRANSCRIPT_PATH" ]; then
    LAST_MESSAGES=$(extract_last_assistant_message "$TRANSCRIPT_PATH" 100)
    if [ -n "$LAST_MESSAGES" ] && echo "$LAST_MESSAGES" | grep -q "REVIEW_COMPLETED"; then
        exit 0
    fi
    if [ -n "$LAST_MESSAGES" ] && echo "$LAST_MESSAGES" | grep -q "REVIEW_RATE_LIMITED"; then
        exit 0
    fi
fi

PRINCIPLES=$(cat << 'EOF'
## 原則
Gemini のレビューにて改善点を指摘された場合は、その改善点に従って修正せよ。
Gemini から、これ以上の改善点は特に無しとレビューをもらったときのみ「REVIEW_COMPLETED」とだけ発言せよ。
Gemini の Rate Limit で制限された場合は 「REVIEW_RATE_LIMITED」とだけ発言せよ。
----
EOF
)

CLAUDE_SUMMARY=""
if [ -f "$TRANSCRIPT_PATH" ]; then
    # Extract Claude's last summary from transcript (JSONL format)
    # NOTE: This depends on Claude Code's transcript JSONL structure
    # If Claude Code changes its output format, this may need updates
    CLAUDE_SUMMARY=$(extract_last_assistant_message "$TRANSCRIPT_PATH" 0)
    
    # Check if extraction was successful
    if [ -z "$CLAUDE_SUMMARY" ]; then
        echo "[gemini-review-hook] Warning: Failed to extract Claude summary from transcript (no assistant messages found)" >&2
    fi
    
    # Limit CLAUDE_SUMMARY to 1000 characters to avoid token limit
    if [ ${#CLAUDE_SUMMARY} -gt 1000 ]; then
        # Try to preserve important parts: first 400 chars + last 400 chars
        # Only if text is longer than 800 chars to avoid overlap
        if [ ${#CLAUDE_SUMMARY} -gt 800 ]; then
            FIRST_PART=$(echo "$CLAUDE_SUMMARY" | head -c 400)
            LAST_PART=$(echo "$CLAUDE_SUMMARY" | tail -c 400)
            CLAUDE_SUMMARY="${FIRST_PART}...(中略)...${LAST_PART}"
        else
            # For texts between 800-1000 chars, just truncate
            CLAUDE_SUMMARY=$(echo "$CLAUDE_SUMMARY" | head -c 1000)
            CLAUDE_SUMMARY="${CLAUDE_SUMMARY}...(truncated)"
        fi
    fi
fi

REVIEW_PROMPT=$(cat << EOF
作業内容をレビューして、改善点や注意点を指摘してください。
重要: 自分で git diff を実行して作業ファイルの具体的な変更内容も把握してからレビューを行ってください。

## Claude の最後の発言（作業まとめ）:
${CLAUDE_SUMMARY}
EOF
)

# Try Pro model first with timeout and process monitoring
TEMP_STDOUT=$(mktemp)
TEMP_STDERR=$(mktemp)
GEMINI_TIMEOUT=120

if command -v timeout >/dev/null 2>&1; then
    timeout ${GEMINI_TIMEOUT}s bash -c "echo '$REVIEW_PROMPT' | gemini -s -y" >"$TEMP_STDOUT" 2>"$TEMP_STDERR"
    GEMINI_EXIT_CODE=$?
else
    # Manual timeout management 
    echo "$REVIEW_PROMPT" | gemini -s -y >"$TEMP_STDOUT" 2>"$TEMP_STDERR" &
    GEMINI_PID=$!
    
    # Wait for process with timeout
    WAIT_COUNT=0
    GEMINI_EXIT_CODE=124 # default timeout
    while [[ $WAIT_COUNT -lt $GEMINI_TIMEOUT ]]; do
        if ! kill -0 $GEMINI_PID 2>/dev/null; then
            wait $GEMINI_PID
            GEMINI_EXIT_CODE=$?
            break
        fi
        sleep 1
        ((WAIT_COUNT++))
    done
    
    # Kill if timed out
    if [[ $WAIT_COUNT -ge $GEMINI_TIMEOUT ]]; then
        kill -TERM $GEMINI_PID 2>/dev/null || true
        sleep 2
        kill -KILL $GEMINI_PID 2>/dev/null || true
        wait $GEMINI_PID 2>/dev/null || true
        GEMINI_EXIT_CODE=124
    fi
fi

GEMINI_REVIEW=$(cat "$TEMP_STDOUT" 2>/dev/null)
ERROR_OUTPUT=$(cat "$TEMP_STDERR" 2>/dev/null)

# Check for rate limit errors
IS_RATE_LIMIT=false
if [[ $GEMINI_EXIT_CODE -eq 124 ]]; then
    # Timeout - treat as rate limit
    IS_RATE_LIMIT=true
elif [[ $GEMINI_EXIT_CODE -ne 0 ]] || [[ -z "$GEMINI_REVIEW" ]]; then
    if [[ "$ERROR_OUTPUT" =~ "status 429" ]] || \
       [[ "$ERROR_OUTPUT" =~ "rateLimitExceeded" ]] || \
       [[ "$ERROR_OUTPUT" =~ "Quota exceeded" ]] || \
       [[ "$ERROR_OUTPUT" =~ "RESOURCE_EXHAUSTED" ]] || \
       [[ "$ERROR_OUTPUT" =~ "Too Many Requests" ]] || \
       [[ "$ERROR_OUTPUT" =~ "Gemini 2.5 Pro Requests" ]]; then
        IS_RATE_LIMIT=true
    fi
fi

if [[ $IS_RATE_LIMIT == "true" ]]; then
    # Rate limited - try Flash model
    >&2 echo "[gemini-review-hook] Rate limit detected, switching to Flash model..."
    
    if command -v timeout >/dev/null 2>&1; then
        timeout ${GEMINI_TIMEOUT}s bash -c "echo '$REVIEW_PROMPT' | gemini -s -y --model=gemini-2.5-flash" >"$TEMP_STDOUT" 2>"$TEMP_STDERR"
        GEMINI_EXIT_CODE=$?
    else
        echo "$REVIEW_PROMPT" | gemini -s -y --model=gemini-2.5-flash >"$TEMP_STDOUT" 2>"$TEMP_STDERR" &
        FLASH_PID=$!
        
        WAIT_COUNT=0
        GEMINI_EXIT_CODE=124
        while [[ $WAIT_COUNT -lt $GEMINI_TIMEOUT ]]; do
            if ! kill -0 $FLASH_PID 2>/dev/null; then
                wait $FLASH_PID
                GEMINI_EXIT_CODE=$?
                break
            fi
            sleep 1
            ((WAIT_COUNT++))
        done
        
        if [[ $WAIT_COUNT -ge $GEMINI_TIMEOUT ]]; then
            kill -TERM $FLASH_PID 2>/dev/null || true
            sleep 2
            kill -KILL $FLASH_PID 2>/dev/null || true
            wait $FLASH_PID 2>/dev/null || true
            GEMINI_EXIT_CODE=124
        fi
    fi
    
    GEMINI_REVIEW=$(cat "$TEMP_STDOUT" 2>/dev/null)
    if [[ $GEMINI_EXIT_CODE -ne 0 ]] || [[ -z "$GEMINI_REVIEW" ]]; then
        GEMINI_REVIEW="REVIEW_RATE_LIMITED"
    fi
elif [[ $GEMINI_EXIT_CODE -ne 0 ]]; then
    # Other error
    exit 0
fi

ESCAPED_PRINCIPLES=$(echo "$PRINCIPLES" | jq -Rs .)
ESCAPED_REVIEW=$(echo "$GEMINI_REVIEW" | jq -Rs .)

# Note: Cleanup is handled by trap on script exit

COMBINED_REASON=$(echo -e "$GEMINI_REVIEW\n\n$PRINCIPLES" | jq -Rs .)
cat << EOF
{
  "decision": "block",
  "reason": $COMBINED_REASON
}
EOF
シェルじゃなくてもっと簡潔に書ける何かあっただろとは思うんですが、何かインストールするのもめんどいのでシェルで作りました。
基本的に以下記事の hooks の使い方を真似させていただきました。そこに Gemini レビュー固有の設定を入れていった感じです。


 重要ポイント

 Stop hooks の戻り値に "decision": "block" をつかう
詳しくは上記記事を参考にしたほうがわかりやすいのですが、これを使うと stop 時に claude が停止せず、 reason の指示をみて再度動いてくれます。この reason に gemini のレビューを入れることによって、フィードバックループを作り出します。

 Gemini　を呼び出すとき -s -y をつける
git diff を見て欲しい場合は必須になります。diff　がないと claude の作業報告に対してだけのレビューになるため、レビューの質が落ちるので見て欲しいのですが、-y オプションをつけないと、非対話モードでは「diffを見ます」だけ返ってきて終わることがよくありました。-y をつけると比較的ちゃんと diff をみてからレビューしてくれる様になります。 -s はサンドボックスモード。保険でつけときます。

 レートリミットに対応
gemini-2.5-pro のレートリミットに引っかかると、-p の非対話モードで呼び出したときの応答に時間がかかる様になり、最後にレートリミットエラーが返ってきます。この場合は　--model で gemini-2.5-flash を指定すれば回避可能なので、スクリプトの処理としてレートリミットを検知して、--model 指定するようにしてあります。そのためにちょっと複雑なプロセス監視をしています。

 プロンプト
微妙な違いで gemini は解釈をかえて意味わからない挙動をするので、試行錯誤の結果、今使っているプロンプトがそれなりによいですが、改善の余地ありです。なかなかレビューラリーが終了しない、というか無限ループに近いので、人によっては終了条件をゆるくするのもありかもしれません。

 動作例
わりかしうまくいっています。



 おわりに
寝ている間もレートリミットまで限界に自動で動かしたい、というケースはあまり多くないとは思いますし、朝起きて見てみたらとんでもない謎のものが出来上がってる可能性もあるのですが、ロマンを感じてやってみました。gemini レビューに限らず、この stop hook で decision block を使って再起的に claude を働かせる方法は、設定の仕方によっては、github の issue が空になるまで全自動で動かすこともでき,寝てても全部開発が実現するわけで、なかなか面白い試みかなと思っています。終了条件が LLM 頼りなのが怖すぎるところではありますが、まあ、stop hook は Esc でもキャンセルできるし、常用する hook でもないのはそうでしょう。
ではごきげんよう。
