# Claude Code Hooks×Routines×Workflowで開発自動化パイプラインを構築する
- **Source URL**: https://zenn.dev/0h_n0/articles/3a4fdda1d5c743
- **Score**: 92
- **AI Summary**:
  - Claude Codeの自動化機能をHooks、Routines、Workflowsの3層で整理。
  - settings.jsonを用いたHooksの定義や、自動整形、危険コマンドブロックの具体コードを提示。
  - クラウド実行のRoutinesや、大規模向けのDynamic Workflowsの用途と制約を比較。
- **Read Now Reason**: AI駆動開発プロジェクトに即時適用可能な、Claude Codeの環境設定ファイル（settings.json）の具体的な記述、自動コード整形や破壊的コマンドのブロック処理など、堅牢なパイプライン構築に直結する実践的コードが網羅されているため。
- **Suggested Tags**: #ClaudeCode, #自動化パイプライン, #DevOps
- **Processed Date**: 2026/6/16

---

## 本文
Claude Code Hooks×Routines×Workflowで開発自動化パイプラインを構築する

 この記事でわかること

Claude Codeの自動化機能をHooks・Routines・Dynamic Workflowsの3層で整理し、使い分けの判断基準を理解できる

settings.jsonにHooksを設定して、コード整形・コマンドガード・通知を自動化する実装パターンを習得できる
Routinesでクラウド上のスケジュール実行・GitHubイベント駆動・API駆動の3トリガーを設定できる
Dynamic Workflowsでagent()/parallel()/pipeline()を使い、数十〜数百のサブエージェントをオーケストレーションできる
3層を組み合わせたCI/CDパイプラインの設計パターンを理解し、実プロジェクトに適用できる


 対象読者


想定読者: Claude Codeを日常的に使っている中級〜上級の開発者

必要な前提知識:

Claude Code v2.1.154以降の基本操作（ファイル編集、Bash実行）
Git/GitHubの基本的なワークフロー（ブランチ、PR、CI/CD）
JSONの読み書き、JavaScriptの基本構文
ターミナルでのシェルスクリプト操作




 結論・成果
Claude Codeの自動化機能は3つの層で構成されており、それぞれ異なるユースケースをカバーしています。Hooksはツール実行前後のガードレール、Routinesはクラウド上の定期実行、Dynamic Workflowsは大規模なマルチエージェントオーケストレーションを担います。
Anthropicの公式ドキュメントによると、これらを組み合わせることで以下の成果が報告されています。


Hooks: すべてのファイル編集に対してフォーマッタを自動適用し、手動のprettier/ruff実行をゼロにできる

Routines: GitHub PRへの自動レビュー、夜間バッチ処理、アラート対応を無人で実行（ランタイムコスト$0.08/時間）

Dynamic Workflows: Bun（JavaScriptランタイム）のZig→Rust移植で75万行のコードを11日で生成（公式ブログの事例）

ただし、Routinesは2026年6月時点でリサーチプレビュー段階であり、APIや挙動が変更される可能性があります。Dynamic Workflowsは2026年5月28日のリリースで一般提供（GA）となっていますが、大量のトークンを消費するため、本番環境への導入時はこれらの制約を理解したうえで段階的に適用してください。

 Claude Code自動化の3層アーキテクチャを理解する
Claude Codeの自動化は、用途と実行環境が異なる3つの層に分かれています。各層は独立して使えますが、組み合わせることで開発パイプライン全体をカバーできます。

 3層の全体像と使い分け



層
機能
実行環境
トリガー
典型的なユースケース




Hooks
ツール実行前後の決定論的ルール
ローカル（セッション内）
ライフサイクルイベント
コード整形、コマンドガード、通知


Routines
スケジュール・イベント駆動の自動実行
Anthropicクラウド
Cron/GitHub/API
PR自動レビュー、夜間バッチ、アラート対応


Dynamic Workflows
マルチエージェントオーケストレーション
ローカル（バックグラウンド）
ユーザー指示/ultracode
コード監査、大規模移行、リサーチ




 なぜ3層に分かれているのか
この分離には設計上の理由があります。
Hooksは「何があっても必ず実行される」決定論的なルールです。LLMの判断に依存せず、シェルコマンドで確実にルールを強制します。たとえば、「Claude Codeがファイルを編集したら必ずPrettierを実行する」というルールは、LLMが忘れることなく毎回適用されます。
Routinesはラップトップを閉じても動き続けるクラウド実行環境です。GitHub PRが作成されたタイミングでレビューを走らせたり、毎晩3時にバックログを整理したりする処理は、開発者のローカル環境に依存すべきではありません。
Dynamic Workflowsは「1つのコンテキストウィンドウに収まらないタスク」を扱うための仕組みです。数百ファイルのセキュリティ監査を1エージェントで行うと、コンテキストがあふれます。Workflowsはタスクを分割し、中間結果をスクリプト変数に保持することで、この制約を回避します。

注意: 3つの層すべてを使う必要はありません。多くのプロジェクトではHooksだけで十分な自動化が実現できます。Routinesは複数人チームでの運用、Workflowsは大規模なコードベース操作で初めて必要になるケースがほとんどです。


 Hooksで決定論的な自動化ルールを設定する
Hooksは、Claude Codeのライフサイクルイベントに紐づくシェルコマンドです。LLMに「コード整形してね」と毎回お願いする代わりに、settings.jsonに書いた設定で確実に実行されます。

 Hooks設定の基本構造
Hooksは.claude/settings.json（プロジェクト単位）または~/.claude/settings.json（ユーザー単位）に設定します。
{
  "hooks": {
    "<イベント名>": [
      {
        "matcher": "<対象ツール名のパターン>",
        "hooks": [
          {
            "type": "command",
            "command": "<実行するシェルコマンド>"
          }
        ]
      }
    ]
  }
}
matcherはツール名のパターンで、Write|Editのようにパイプで複数指定できます。環境変数$CLAUDE_TOOL_INPUT_FILE_PATHや$CLAUDE_TOOL_INPUTでツールの入出力を参照できます。

 主要なライフサイクルイベント
実際の開発で使う頻度が高いイベントは以下の4つです。



イベント
発火タイミング
用途




PreToolUse
ツール実行前

コマンドガード、引数の書き換え


PostToolUse
ツール実行後

自動整形、ログ記録、検証


SessionStart
セッション開始時
環境チェック、リマインダー表示


PostResponse
Claude応答完了後
デスクトップ通知、要約記録



公式ドキュメントでは31種のライフサイクルイベントが定義されていますが（2026年6月時点）、上記4つで大部分のユースケースをカバーできます。

 実装パターン1: ファイル保存時の自動フォーマット
Claude Codeがファイルを編集するたびに、言語に応じたフォーマッタを自動実行します。
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "filepath=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; case \"$filepath\" in *.py) ruff format \"$filepath\" 2>/dev/null;; *.ts|*.tsx|*.js|*.jsx) npx prettier --write \"$filepath\" 2>/dev/null;; *.rs) rustfmt \"$filepath\" 2>/dev/null;; esac; exit 0"
          }
        ]
      }
    ]
  }
}
なぜこの実装を選んだか:


PostToolUseを使うことで、Claudeのファイル編集が完了した直後にフォーマッタが走る

case文で拡張子に応じたフォーマッタを選択するため、多言語プロジェクトでも1つの設定で対応できる

2>/dev/nullとexit 0で、フォーマッタが未インストールの言語でもエラーにならない


 実装パターン2: 危険なコマンドのブロック
rm -rf /やDROP TABLEのような破壊的なコマンドをClaude Codeが実行しようとした場合にブロックします。
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -qiE 'rm\\s+-rf\\s+/|DROP\\s+TABLE|FORMAT\\s+C:|>(\\s+)/dev/sd' && echo 'BLOCKED: destructive command detected' >&2 && exit 2 || exit 0"
          }
        ]
      }
    ]
  }
}
exit 2は特別な終了コードで、「ツール実行をブロックし、フィードバックメッセージをClaudeに返す」ことを意味します。exit 0は「問題なし、ツール実行を続行」です。

 実装パターン3: セッション開始時の環境チェック
セッション開始時にプロジェクトのセットアップ状態を自動チェックします。
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '---'; command -v node >/dev/null && echo \"Node.js: $(node -v)\" || echo 'WARNING: Node.js not found'; command -v uv >/dev/null && echo \"uv: $(uv --version)\" || echo 'WARNING: uv not found'; test -f .env || echo 'WARNING: .env file missing'; echo '---'"
          }
        ]
      }
    ]
  }
}

 Hooksの3タイプ: command・prompt・agent
上記の例はすべてtype: "command"（シェルコマンド直接実行）ですが、より高度な判断や外部連携が必要な場合は4つの追加タイプが使えます。



タイプ
判断方法
ユースケース




command
シェルの終了コード
パターンマッチ、フォーマット、通知


http
HTTPエンドポイントへのPOST
外部サービス連携、Webhook通知


mcp_tool
接続済みMCPサーバーのツール呼び出し
MCP経由の検証・記録


prompt
Claudeモデルに入力を評価させる
コードレビュー、セキュリティチェック


agent
サブエージェントがツールを使って検証
複雑な条件の多段階検証（実験的機能）



promptタイプの例として、SQLインジェクションの可能性があるコードの検出があります。
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Does this code change introduce a potential SQL injection vulnerability? If yes, respond with exit_code 2 and explain the risk. If no, respond with exit_code 0."
          }
        ]
      }
    ]
  }
}
promptタイプはClaudeの小型モデルを呼び出して評価するため、commandよりレイテンシが大きくなります。パターンマッチで十分なケースではcommandタイプを優先してください。

ハマりポイント: Hooksのcommand内でシングルクォートを使うとJSON解析エラーになります。シェルコマンド内の文字列は必ずダブルクォートでエスケープするか、外部スクリプトファイルを呼び出す形にしてください。


 Routinesでクラウド上の定期実行を設定する
Routinesは2026年4月にリリースされた機能で、Claude Codeのセッションをクラウド上で自動実行します。ラップトップを閉じても動作し続けるため、「毎晩3時にPRレビュー」「PRが作られたら自動でコードレビュー」といったユースケースに対応します。

 Routinesの3つのトリガー



トリガー
説明
設定方法




Schedule
cron式に基づく定期実行（最小間隔: 1時間）
CLI /schedule またはWeb UI


GitHub Event
PR作成、Release公開などのリポジトリイベント
Web UIのみ


API
HTTP POSTで任意のタイミングで起動
Web UIでトークン発行後、curl等で呼び出し



1つのRoutineに複数のトリガーを組み合わせることも可能です。たとえば「毎晩のPRレビュー + 新規PR作成時のレビュー」を1つのRoutineで実現できます。

 CLIからRoutineを作成する
# 毎朝9時にPRレビューを実行するRoutineを作成
/schedule daily PR review at 9am

# 1回限りのスケジュール実行
/schedule tomorrow at 9am, summarize yesterday's merged PRs

# 既存Routineの管理
/schedule list      # 一覧
/schedule update    # 更新
/schedule run       # 即時実行
/scheduleはCLIからのScheduleトリガー専用です。GitHub EventトリガーやAPIトリガーの設定はclaude.ai/code/routinesのWeb UIから行います。

 GitHub Eventトリガーの設定例: 自動PRレビュー
Web UIでRoutineを作成し、以下のように設定します。


プロンプト: レビュー指示を記述

Review the pull request according to our team's code review checklist:
1. Check for security vulnerabilities (SQL injection, XSS, etc.)
2. Verify error handling covers edge cases
3. Ensure test coverage for new logic
4. Flag any API breaking changes
Leave inline comments for issues found and a summary comment.


リポジトリ: レビュー対象のGitHubリポジトリを選択

トリガー: GitHub Event → pull_request.opened を選択

フィルター: is_draft = false（ドラフトPRを除外）


 APIトリガーの設定例: アラート対応の自動化
監視ツール（Datadog、PagerDutyなど）からのアラートでRoutineを起動し、自動で原因調査を行う例です。
curl -X POST \
  https://api.anthropic.com/v1/claude_code/routines/trig_XXXX/fire \
  -H "Authorization: Bearer sk-ant-oat01-xxxxx" \
  -H "anthropic-beta: experimental-cc-routine-2026-04-01" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"text": "Error rate spike in payment-service: 5xx at 15% for 10 minutes"}'
レスポンスにはセッションURLが含まれ、ブラウザでリアルタイムにClaudeの調査過程を確認できます。
{
  "type": "routine_fire",
  "claude_code_session_id": "session_01HJKLMNOPQRSTUVWXYZ",
  "claude_code_session_url": "https://claude.ai/code/session_01HJKLMNOPQRSTUVWXYZ"
}

 Routinesの制約と注意点
コスト面:

通常のClaude APIレート + ランタイム$0.08/時間

45秒のRoutineで約$0.001（ランタイム分のみ。トークン費用は別途）

制約事項:

ローカルファイルへのアクセス不可（毎回リポジトリをクローン）
リサーチプレビュー段階のため、APIの挙動が変更される可能性がある
日次の実行回数上限あり（プランにより異なる）
MCP Connectorの認証はclaude.ai側のアカウントに紐づく

セキュリティ上の注意点:

Routineが実行するアクション（commit、PRコメント等）はあなたのGitHubアカウントとして実行される
デフォルトではclaude/プレフィックスのブランチにのみpush可能。制限解除は明示的に設定が必要


よくある間違い: /scheduleコマンドがCLIで見つからない場合、ANTHROPIC_API_KEY環境変数が設定されていないか確認してください。/scheduleはclaude.aiサブスクリプションログインが必要で、Console APIキーやBedrock/Vertex認証では動作しません。


 Dynamic Workflowsで大規模マルチエージェントを実行する
Dynamic Workflowsは2026年5月28日に一般提供（GA）された機能で、JavaScriptスクリプトによるサブエージェントのオーケストレーションを実現します。1つのコンテキストウィンドウに収まらない大規模タスクを、数十〜数百のエージェントに分散して実行できます。

 Workflowsの基本構造
Workflowsの核心は、Claudeが動的に生成する（またはユーザーが保存する）JavaScriptスクリプトです。
export const meta = {
  name: 'security-audit',
  description: 'Audit API endpoints for auth and injection vulnerabilities',
  phases: [
    { title: 'Scan', detail: 'Find all API endpoints' },
    { title: 'Audit', detail: 'Check each endpoint for vulnerabilities' },
    { title: 'Verify', detail: 'Adversarially verify findings' }
  ]
}

phase('Scan')
const endpoints = await agent(
  'List all API route handlers under src/routes/. Return file path and HTTP method for each.',
  { label: 'scan-routes', schema: {
    type: 'object',
    properties: {
      routes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            method: { type: 'string' },
            path: { type: 'string' }
          }
        }
      }
    }
  }}
)

phase('Audit')
const findings = await pipeline(
  endpoints.routes,
  (route) => agent(
    `Audit ${route.file} (${route.method} ${route.path}) for:
     1. Missing authentication/authorization checks
     2. SQL injection via unsanitized input
     3. Missing rate limiting
     Report each issue with severity (critical/high/medium/low).`,
    { label: `audit:${route.path}`, phase: 'Audit', schema: FINDING_SCHEMA }
  )
)

phase('Verify')
const verified = await pipeline(
  findings.filter(Boolean).flatMap(f => f.issues),
  (issue) => agent(
    `Adversarially verify this finding. Try to prove it is a false positive:
     File: ${issue.file}, Issue: ${issue.description}
     Default to confirmed=true if you cannot disprove it.`,
    { label: `verify:${issue.file}`, phase: 'Verify', schema: VERDICT_SCHEMA }
  )
)

return verified.filter(Boolean).filter(v => v.confirmed)

 4つの基本プリミティブ



プリミティブ
役割
同期モデル




agent(prompt, opts?)
サブエージェント1体を実行

awaitで結果を取得


parallel(thunks[])
複数タスクを同時実行し、全完了を待つ

バリア同期


pipeline(items, ...stages)
各アイテムをステージ順に処理（バリアなし）
ストリーム型


phase(title)
進捗表示のフェーズ区切り
表示のみ



pipeline()とparallel()の使い分けが重要です。
pipeline()では、item Aのstage3が実行中にitem Bはまだstage1にいる可能性があります。各アイテムは独立してステージを進むため、最も遅いアイテムの処理時間がウォールクロック時間になります。
一方、parallel()はバリア同期です。すべてのタスクが完了するまで次の処理に進めません。
// parallel()が正当なケース: 全結果を集約してから重複除去する必要がある
const allFindings = await parallel(
  dimensions.map(d => () => agent(d.prompt, { schema: FINDINGS }))
)
const deduped = deduplicateByKey(allFindings.filter(Boolean).flatMap(r => r.items))
判断基準: 次のステージが他のアイテムの結果を参照する必要があるならparallel()、そうでなければpipeline()を使ってください。

 Workflowsの起動方法
3つの起動方法があります。
# 方法1: プロンプトに "ultracode" を含める
ultracode: audit every API endpoint under src/routes/ for missing auth checks

# 方法2: effortレベルを設定（セッション全体に適用）
/effort ultracode

# 方法3: 保存済みWorkflowをコマンドとして実行
/security-audit
/effort ultracodeを設定すると、セッション内のすべてのタスクに対してClaudeがWorkflowの使用を自動判断します。トークン消費が増加するため、大規模タスクが終わったら/effort highに戻すことを推奨します。

 Workflowsの保存と再利用
一度実行したWorkflowを保存して、コマンドとして再利用できます。
# 実行中または完了したWorkflowを保存
/workflows
# → ワークフローを選択して "s" キーを押す
# → 保存先を選択:
#   .claude/workflows/  (プロジェクト共有)
#   ~/.claude/workflows/ (個人用)
保存したWorkflowは/<名前>で実行でき、argsパラメータで入力を渡せます。

 制約事項



制約
値
理由




同時実行エージェント数
最大16（CPUコア数-2）
ローカルリソースの上限


総エージェント数/実行
最大1,000
暴走ループの防止


ファイルシステム直接アクセス
不可（エージェント経由）
スクリプトはオーケストレーションに専念


実行中のユーザー入力
不可（権限プロンプトのみ）
中断なしの自動実行を保証



Date.now()等の非決定的関数
使用不可
レジューム時の再現性を保証




トレードオフ: Dynamic Workflowsは大量のトークンを消費します。500ファイルの監査で数百エージェントを起動すると、1回の実行でセッション数時間分のトークンを使うことがあります。まず小さいスコープ（1ディレクトリ、1モジュール）で試してからスケールアップしてください。


 3層を組み合わせた実践パイプラインを設計する
ここまで紹介した3つの自動化層を組み合わせて、実際の開発パイプラインを構築するパターンを見ていきましょう。

 パターン1: PR品質ゲートの自動化
PRのライフサイクル全体にわたる品質チェックを自動化する構成です。



フェーズ
使用する層
処理内容




コード編集時

Hooks (PostToolUse)
自動フォーマット、lint実行


PR作成時

Routines (GitHub Event)
自動コードレビュー、セキュリティチェック


複雑なPR

Workflows (手動起動)
マルチ観点レビュー（セキュリティ・パフォーマンス・テストカバレッジ）



{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "filepath=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; case \"$filepath\" in *.py) ruff check --fix \"$filepath\" 2>/dev/null && ruff format \"$filepath\" 2>/dev/null;; *.ts|*.tsx) npx eslint --fix \"$filepath\" 2>/dev/null && npx prettier --write \"$filepath\" 2>/dev/null;; esac; exit 0"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -qE 'git\\s+push\\s+.*--force|git\\s+reset\\s+--hard' && echo 'BLOCKED: force push/hard reset requires manual confirmation' >&2 && exit 2 || exit 0"
          }
        ]
      }
    ]
  }
}
Routines側では、GitHub Event トリガーで新規PRに対する自動レビューを設定します。
Review the pull request changes:
1. Security: Check for injection, auth bypass, data exposure
2. Performance: Flag N+1 queries, missing indexes, large payloads
3. Tests: Verify new logic has test coverage
4. Breaking changes: Flag public API modifications

Leave inline comments for each issue and a summary with severity counts.

 パターン2: 夜間バッチ処理パイプライン
毎晩、コードベースの健全性をチェックするRoutineの構成例です。
# Routineプロンプト（毎晩3時に実行）
Check the repository health:
1. Review all open PRs - leave review comments if stale (>3 days)
2. Scan for TODO/FIXME comments added in the last week
3. Check if dependencies have known vulnerabilities (npm audit / pip-audit)
4. Summarize findings in a new issue with the label "nightly-report"
このRoutineはclaude.ai/code/routinesから作成し、Scheduleトリガーを「Daily at 3:00 AM」に設定します。

 パターン3: 大規模リファクタリングのWorkflow
レガシーコードの段階的なリファクタリングにWorkflowsを活用する例です。
export const meta = {
  name: 'modernize-error-handling',
  description: 'Replace callback-style error handling with async/await',
  phases: [
    { title: 'Discover', detail: 'Find callback patterns' },
    { title: 'Transform', detail: 'Convert to async/await' },
    { title: 'Test', detail: 'Verify no regressions' }
  ]
}

phase('Discover')
const files = await agent(
  'Find all .ts files under src/ that use callback-style error handling ' +
  '(e.g., .then().catch(), callback(err, result)). Return the file paths.',
  { label: 'discover', schema: FILES_SCHEMA }
)

phase('Transform')
const results = await pipeline(
  files.paths,
  (filepath) => agent(
    `Convert callback-style error handling to async/await in ${filepath}. ` +
    'Preserve all existing behavior. Make minimal changes.',
    { label: `transform:${filepath}`, phase: 'Transform', isolation: 'worktree' }
  ),
  (transformResult, filepath) => agent(
    `Run the tests related to ${filepath}. Report pass/fail.`,
    { label: `test:${filepath}`, phase: 'Test' }
  )
)

const failures = results.filter(Boolean).filter(r => !r.passed)
if (failures.length > 0) {
  log(`${failures.length} files failed tests after transformation`)
}
return { transformed: results.filter(Boolean).filter(r => r.passed).length, failures }
isolation: 'worktree' を指定すると、各エージェントが独立したGit worktreeで作業するため、並列でファイルを編集しても競合しません。ただし、worktreeのセットアップに200〜500msのオーバーヘッドがかかるため、ファイルを変更しないタスク（読み取り専用の分析）には使わないでください。

 よくある問題と解決方法



問題
原因
解決方法




Hookが実行されない

settings.jsonのJSONフォーマットエラー

jq . .claude/settings.jsonで構文チェック



/scheduleが「Unknown command」
API key認証を使用している

ANTHROPIC_API_KEYを削除し、claude.aiログインに切り替え


Workflowが途中で停止
トークン上限に到達

/workflowsで進捗確認、小さいスコープで再実行


Routineのネットワークエラー
許可ドメインリストにホストがない
環境設定で「Allowed domains」にドメインを追加


Hookのcommand内でクォートエラー
JSON内のシングルクォート
外部スクリプトファイルに分離してbash script.shで呼び出し


WorkflowでDate.now()エラー
非決定的関数の使用制限

args経由でタイムスタンプを渡すか、Workflow完了後に付与




 まとめと次のステップ
まとめ:

Claude Codeの自動化は**Hooks（決定論的ルール）・Routines（クラウド定期実行）・Dynamic Workflows（マルチエージェント）**の3層で構成される
Hooksはsettings.jsonに設定するだけで、ファイル編集時の自動整形やコマンドガードを確実に実行できる
Routinesはcron/GitHubイベント/APIの3トリガーでクラウド上の無人実行を実現し、PRレビューやバッチ処理に適用できる
Dynamic Workflowsはpipeline()/parallel()/agent()で最大1,000エージェントをオーケストレーションし、大規模コードベース操作に対応する
3層は独立して使えるが、組み合わせることでPR品質ゲート→夜間バッチ→大規模リファクタリングまでカバーする開発パイプラインを構築できる

次にやるべきこと:

まずHooksから始める: .claude/settings.jsonにPostToolUseの自動フォーマットを設定し、1週間運用してみる
Routinesを試す: claude.ai/code/routinesで既存リポジトリに対するPRレビューRoutineを1つ作成する
Workflowsはスコープを絞って試す: ultracode: audit src/auth/ for security issuesのように1ディレクトリに限定して実行し、トークン消費量を確認する

関連記事

 参考

Automate actions with hooks - Claude Code Docs
Hooks reference - Claude Code Docs
Run prompts on a schedule - Claude Code Docs
Automate work with routines - Claude Code Docs
Orchestrate subagents at scale with dynamic workflows - Claude Code Docs
Introducing dynamic workflows in Claude Code - Anthropic Blog
Orchestrate teams of Claude Code sessions - Claude Code Docs



 関連する深掘り記事
この記事で紹介した技術について、さらに深掘りした記事を書きました：


Anthropicのマルチエージェントリサーチシステム設計解説 - tech_blog解説

長時間稼働エージェントのハーネス設計パターン解説 - tech_blog解説

Anthropicが提唱する効果的なAIエージェント設計パターン解説 - tech_blog解説

論文解説: SWE-agent — ACI設計によるソフトウェアエンジニアリング自動化 - arxiv解説

論文解説: ChatDev — マルチエージェント協調によるソフトウェア開発自動化 - arxiv解説
