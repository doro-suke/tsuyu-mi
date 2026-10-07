# マルチエージェントの協調パターン5選——Anthropic公式ブログを実装視点で読み解く #ClaudeCode - Qiita
- **Source URL**: https://qiita.com/tatematsu-k/items/8bae05136e805f7c54e2
- **Priority**: high
- **AI Summary**:
  - Anthropic提唱の5つのマルチエージェント設計パターンを、具体的な実装コードや判断基準と共に解説。
  - Pythonによる検証ループ実装や、Claude Codeを用いたエージェント並列実行の具体例を提示。
  - 持続的ワーカーによるドメイン知識蓄積や、git worktreeを利用した競合回避など実用的な運用術を詳述。
- **Read Now Reason**: AI駆動開発や自動化パイプライン構築に直結する5つの設計パターンが、実装コードとトレードオフの観点から具体的に示されており、誤ったアーキテクチャ選定による大幅な工数ロスを即座に回避できるため。
- **Suggested Tags**: #マルチエージェント, #Anthropic, #AI駆動開発
- **Processed Date**: 2026/5/4

---

## 本文
マルチエージェントの協調パターン5選——Anthropic公式ブログを実装視点で読み解く

はじめに
LLMエージェントを複数組み合わせて動かす「マルチエージェントシステム」の設計パターンを、Anthropicが公式ブログで5つに整理しました。

出典: Multi-Agent Coordination Patterns — Anthropic公式ブログ

本記事ではこの5パターンを、実装上の判断基準やトレードオフに焦点を当てて解説します。


5パターンの全体像


Generator-Verifier: 生成→検証のフィードバックループ

Orchestrator-Subagent: 親エージェントがタスク分解し、子に委譲

Agent Teams: 持続するワーカーが共有キューからタスクを取得

Message Bus: Pub/Subによるイベント駆動の疎結合通信

Shared State: 共有ストアを全エージェントが直接読み書き

Anthropicの推奨はOrchestrator-Subagentから始めること。これが最も多くのケースに対応でき、協調オーバーヘッドが最小です。


パターン1: Generator-Verifier（生成→検証ループ）

構造
User Request
    │
    ▼
┌──────────┐    output    ┌──────────┐
│ Generator ├─────────────► Verifier │
│  Agent    ◄─────────────┤  Agent   │
└──────────┘  feedback    └────┬─────┘
                               │ pass/fail
                               ▼
                          Final Output


生成エージェントが出力を作る
検証エージェントが評価基準に基づいてチェック
不合格ならフィードバック付きで差し戻し
合格 or 最大試行回数でループ終了


実装例：コード生成 + テスト検証
もっとも直感的な適用例は「コード生成 → テスト実行」のループです。
import anthropic

client = anthropic.Anthropic()

def generate_code(task: str, feedback: str = "") -> str:
    prompt = f"Task: {task}"
    if feedback:
        prompt += f"\n\nPrevious attempt failed. Feedback:\n{feedback}"
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",  # 執筆時点(2026-04)のモデル
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text

def verify_code(code: str) -> tuple[bool, str]:
    """テスト実行やlintで検証し、(合格, フィードバック)を返す"""
    # 実際にはsubprocessでpytest等を実行する
    ...

def generator_verifier_loop(task: str, max_retries: int = 3) -> str:
    feedback = ""
    for attempt in range(max_retries):
        code = generate_code(task, feedback)
        passed, feedback = verify_code(code)
        if passed:
            return code
    raise RuntimeError(f"Failed after {max_retries} attempts. Last feedback: {feedback}")

ポイントは検証が機械的に判定可能であること。テスト実行・lint・型チェックなど、合否が明確に出るものと相性が良い。「なんとなく良い文章か」のような曖昧な基準では機能しません。

適用判断

検証基準がプログラム的に定義可能 → 向いている
検証自体に生成と同等の推論が必要 → メリットが薄い（検証エージェントも同じくらい間違える）

最大試行回数の制限は必須。無限ループ防止のため



パターン2: Orchestrator-Subagent（指揮者→実行者）

構造
         User Request
              │
              ▼
      ┌───────────────┐
      │  Orchestrator  │
      └──┬─────┬────┬─┘
         │     │    │
    spawn│     │    │spawn
         ▼     ▼    ▼
      ┌────┐┌────┐┌────┐
      │Sub1││Sub2││Sub3│  ← 各サブは独立コンテキスト
      └──┬─┘└──┬─┘└──┬─┘
         │     │     │
  result │     │     │ result
         ▼     ▼     ▼
      ┌───────────────┐
      │  Orchestrator  │ ← 結果を統合
      └───────────────┘


オーケストレータがタスクを分解し、サブエージェントに委譲
各サブエージェントは独立したコンテキストウィンドウで作業
サブエージェントは1タスク完了で終了（状態を持ち越さない）


実装例：Claude Code Agent tool
Claude CodeのAgentツールがまさにこのパターンの実装です。
// Claude Codeの内部的な動作イメージ
// メインエージェント（Orchestrator）がサブエージェントをspawnする

// サブエージェント1: セキュリティチェック
const securityResult = await spawnAgent({
  prompt: "Check this PR for security vulnerabilities: ...",
  tools: ["Read", "Grep", "Glob"],
});

// サブエージェント2: テストカバレッジ確認（並行実行可）
const coverageResult = await spawnAgent({
  prompt: "Analyze test coverage for changed files: ...",
  tools: ["Read", "Bash"],
});

// オーケストレータが結果を統合
const review = synthesize(securityResult, coverageResult);

AnthropicのClaude Agent SDKでもサブエージェントの起動が可能です。

トレードオフ


長所: タスク分解が明確なら実装がシンプル。サブタスクの並行実行でレイテンシ改善

短所: オーケストレータがボトルネック。サブエージェントの結果が要約されて戻るため、詳細が落ちることがある

注意: 並行実行を明示的に設計しないと、順次実行になりトークンコストだけ増えて速度が出ない



パターン3: Agent Teams（持続するワーカー）

構造
      ┌──────────────┐
      │ Coordinator   │
      └──────┬───────┘
             │ assign
    ┌────────┼────────┐
    ▼        ▼        ▼
┌───────┐┌───────┐┌───────┐
│Worker1││Worker2││Worker3│  ← 持続するプロセス
│(svc-A)││(svc-B)││(svc-C)│  ← ドメイン知識を蓄積
└───────┘└───────┘└───────┘
    │        │        │
    ▼        ▼        ▼
 Shared Task Queue（共有キュー）

Orchestrator-Subagentとの最大の違いはワーカーが持続すること。


サブエージェント: 1タスク完了で終了。コンテキストが消える

ワーカー: 複数タスクを受けながら存続し、ドメイン知識を蓄積


具体的なユースケース
大規模コードベースのフレームワーク移行が典型例です。

Worker1 → service-authの移行を担当
Worker2 → service-paymentの移行を担当
Worker3 → service-notificationの移行を担当

各ワーカーが担当サービスの依存更新・コード書き換え・テスト修正を自律的に進行。担当サービスへの「慣れ」（コンテキスト蓄積）がパフォーマンスに直結します。
Claude CodeではAgentツールにisolation: "worktree"を指定することで、各ワーカーがgit worktreeで独立した作業コピーを持てます。これにより同じファイルへの同時書き込み競合を回避できます。

適用判断

サブタスクが独立していること（ワーカー間の相互依存が少ない）
各タスクが複数ステップの長い作業であること

注意: 同一リソースへの同時アクセスが起きる設計は避ける。git worktreeやブランチ分離で対処



パターン4: Message Bus（Pub/Subによる疎結合通信）

構造
┌─────────┐  publish   ┌───────────┐  deliver  ┌─────────┐
│ Agent A  ├───────────►│  Router   ├──────────►│ Agent C │
└─────────┘            │ (topic    │           └─────────┘
┌─────────┐  publish   │  matching)│  deliver  ┌─────────┐
│ Agent B  ├───────────►│           ├──────────►│ Agent D │
└─────────┘            └───────────┘           └─────────┘

エージェント間の通信をPub/Subに抽象化。新しいエージェントの追加時に既存の接続を変更する必要がありません。

マイクロサービスとの類似性
このパターンは、バックエンドエンジニアには馴染み深い構造です。

Kafka / RabbitMQ / Amazon SNS+SQS のトピックベースルーティング
EventBridge のイベントバスパターン

違いは、ルーターがLLMベースになりうる点です。トピックマッチングをルールベースで書けるなら従来のメッセージブローカーと同じ。LLMで動的にルーティングする場合は、ルーター自体が新たな障害点になります。

適用判断

イベント駆動のパイプライン（「X発生時にYを実行」の連鎖）→ 向いている
エージェントの種類が将来増える → 疎結合のメリットが大きい

注意: トレーサビリティが難しい。分散トレーシング（OpenTelemetry等）のような仕組みが必要



パターン5: Shared State（共有ストアによる協調）

構造
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Agent A  │     │ Agent B  │     │ Agent C  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │ read/write     │ read/write     │ read/write
     ▼                ▼                ▼
┌──────────────────────────────────────────┐
│          Shared Store                     │
│  (DB / file system / document)            │
└──────────────────────────────────────────┘

中央のコーディネータなし。全エージェントが同じストアを読み書きし、他のエージェントの発見をリアルタイムに活かします。

実装上の懸念
このパターンは最も強力ですが、最も制御が難しい。


創発的な振る舞い: トップダウンで設計した挙動ではなく、各エージェントの自律行動から結果が生まれる。再現性・デバッグが困難

リアクティブループ: A書き込み → B反応 → A反応 → ...の連鎖がトークンを消費し続ける

終了条件の設計が最重要: 時間制限、収束閾値、判定エージェントの指定など、「いつ止めるか」を事前に決めないと無限に動き続ける

# 終了条件の設計例
TERMINATION_CONFIG = {
    "max_duration_seconds": 300,      # 時間制限
    "max_total_tokens": 500_000,      # トークン上限
    "convergence_threshold": 0.95,    # ストアの変更率が閾値以下で収束とみなす
    "judge_agent": "synthesizer",     # 最終判定を行うエージェント名
}


適用判断

エージェント間で発見のリアルタイム共有が必須 → 向いている
単一障害点を排除したい → 中央コーディネータがない構造のメリット

注意: 最初に選ぶパターンとしては推奨されない。他のパターンでは対応できない場合に検討



パターン選択のフローチャート
Start
  │
  ├─ 品質保証が最優先？ 評価基準を機械的に定義可能？
  │   └─ Yes → Generator-Verifier
  │
  ├─ タスクを明確に分解でき、各サブタスクは短く完結？
  │   └─ Yes → Orchestrator-Subagent（ほとんどのケースはここ）
  │
  ├─ サブタスクが複数ステップの長い作業？ コンテキスト蓄積が有効？
  │   └─ Yes → Agent Teams
  │
  ├─ イベント駆動？ エージェントの種類が今後増える？
  │   └─ Yes → Message Bus
  │
  └─ エージェント間でリアルタイムに発見を共有する必要？
      └─ Yes → Shared State

迷ったらOrchestrator-Subagentから始める。 問題が顕在化してから他のパターンに進化させれば十分です。


パターンの組み合わせ
本番システムでは複数パターンの組み合わせが一般的です。

全体はOrchestrator-Subagentで構成し、協調性が高いサブタスクだけShared Stateで処理
イベントの流れをMessage Busでルーティングし、各イベントの処理をAgent Teamsのワーカーに任せる

最初から複合パターンを設計する必要はありません。シンプルなパターンで始めて、ボトルネックが見えた箇所だけ切り替えていく。ソフトウェア設計の原則と同じです。


参考


Multi-Agent Coordination Patterns — Anthropic公式ブログ（原文）

Building effective agents — Anthropic（シングルエージェント設計の基礎）

Claude Code: Sub-agents — Orchestrator-Subagentパターンの実装例

6Go to list of users who liked4Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
