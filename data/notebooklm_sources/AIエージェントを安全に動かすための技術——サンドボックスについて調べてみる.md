# AIエージェントを安全に動かすための技術——サンドボックスについて調べてみる
- **Source URL**: https://zenn.dev/layerx/articles/a99cd11af487fc
- **Score**: 78
- **AI Summary**:
  - AIエージェントの動的なツール呼出しに伴うセキュリティリスクと、実行環境の隔離（サンドボックス）の重要性を詳説
  - プロセス分離、gVisor、VM分離、WASMの4つの方式について、技術的境界、性能、代表的実装を体系的に比較
  - AWS FirecrackerやAzure Dynamic Sessionsなど主要各社の具体的な隔離実装手法を網羅
- **Read Now Reason**: AI駆動開発や自動化パイプライン構築において、LLMにコード実行を許可する際のセキュリティ設計（VM隔離かWASMか等）の判断基準が明記されており、設計ミスによる被害を防ぐために不可欠な知識であるため。
- **Suggested Tags**: #AIエージェント, #セキュリティ, #サンドボックス, #クラウドアーキテクチャ
- **Processed Date**: 2026/5/5

---

## 本文
皆さん、こんにちは。sotamakiと申します。
今日は、主にAIエージェント文脈で登場するサンドボックスについて学んだことをまとめていきたいと思います。

 前提：AIエージェントは”行動”する
最近のAIエージェントは、単に文章を生成するだけでなく、コードを書いて実行し、ブラウザを操作し、外部APIを叩き、ファイルを読み書きします。指示を受け取り、自ら判断しながら一連の操作を完結させます。
ユーザー入力
     ↓
┌─► LLM（思考・計画）
│    ↓ tool call
│   外部ツール / API / コマンド
│    ↓
└── 結果フィードバック
     ↓
 最終応答
この「自律的にツールを呼び出せる」という特性が、従来のWebアプリとは異なるリスクを生む可能性があります。
通常のアプリは「受け取った入力をどう処理するか」をコードに書きますが、エージェントは「何を実行するか」をLLMが動的に決めます。攻撃者が仕込んだ入力が、そのまま行動に変換されてしまう可能性があります。

 なぜ隔離が必要なのか
通常のアプリは「何をするか」をコードで決めますが、エージェントは「何をするか」をLLMが動的に決めます。意図しない操作や悪意ある指示が混入したとき、以下のような操作が予期せず実行される可能性があります。

ファイルシステムの読み書き・削除
任意コード・シェルコマンドの実行
外部ネットワークへのアクセス
ホスト環境の環境変数・認証情報の参照

これらが意図せず実行された場合、影響が実システムに及ぶ可能性があります。

機密ファイルの読み取りや改ざん
ホスト環境での任意操作
取得したデータや認証情報の外部送信

OWASP LLM Top 10 でも Excessive Agency（LLM06） や Sensitive Information Disclosure（LLM02） として同様のリスクが整理されています。
こうしたリスクをLLM側だけで完全に防ぐのは難しく、ロジックの不備や悪意ある入力があれば何らかの意図しない操作は起きえます。被害がどこまで広がるかは、実行環境の隔離の強さに依るところが大きいと思います。

 隔離の方式と強度
隔離の強さは、どこに境界を引くかで決まります。大きく4つの考え方があります。

 概念1：プロセス分離（Namespace + cgroup）
Linuxのnamespaceでプロセス・ネットワーク・ファイルシステムなどを隔離し、cgroupで使用できるリソースを制限します。ホストカーネルは共有されるため、カーネル脆弱性や設定ミスを突かれるとホストに影響が及ぶ可能性があります。seccompやAppArmor / SELinuxでsyscallや権限を絞って補強することが多いですが、根本的な境界はホストカーネル共有のままです。
代表実装: runc / crun
DockerではruncがデフォルトのOCI runtimeです。Kubernetesでは通常、containerdやCRI-OなどのCRI runtime経由でrunc等のOCI runtimeが使われます。

 概念2：gVisor（ユーザー空間カーネル）
Googleが開発したOSSのコンテナランタイムです。内部コンポーネント Sentry（ユーザー空間カーネル）がコンテナ内プロセスのsyscallを捕捉・処理し、ホストカーネルへの直接露出を大幅に減らします。コンテナAPIとの互換性を狙いながら、通常のLinuxコンテナより強い隔離を提供します。ただし、公式ドキュメントが明記しているとおり、Linuxのsyscallをすべてカバーするわけではなく、一部のsyscallやサブシステム（例：io_uringはデフォルト無効）には非対応・制限があります。
OCI runtime実装: runsc

 概念3：VM分離（ハイパーバイザー）
各ワークロードが専用のゲストカーネルを持ちます。ハードウェア仮想化によりホストとの境界が明確で、隔離強度はフルVMに近くなります。microVMは、Firecrackerが公式に謳うとおり、サーバーレスやマルチテナント用途向けに、エミュレートするデバイスの種類を絞って高速起動・低オーバーヘッドを狙う軽量VMです。
代表実装: Firecracker / Kata Containers
FirecrackerはmicroVMを作るVMM（Virtual Machine Monitor）そのもので、AWS LambdaやFargateでも採用されています。Kata ContainersはFirecracker・QEMU・Cloud HypervisorなどのVMMを裏で使い、コンテナと同じI/FでVM級の隔離を提供するOSSのコンテナランタイムです。Kubernetes CRIに対応しており、AIエージェント向けのKubernetes Agent Sandboxも「VM-grade isolation」の選択肢としてKata Containersを明示しています。

 概念4：言語/バイトコード分離（WASM）
WebAssemblyをサンドボックスとして使うアプローチです。Wasmtimeのセキュリティドキュメントでは「外部とのやり取りはすべてimports/exportsを通じて行われ、syscallや他のI/Oへの直接アクセスはない」と説明されており、設計段階からサンドボックスとして作られています。
WASIはcapability-based securityを採用しており、明示的に渡されたファイルやディレクトリのみアクセス可能です。syscallを使わないためホストカーネルの攻撃面を原理的に持ちません。VMより軽量で起動が速い傾向があり、プラグイン、エッジ、サーバーレス、AIエージェントのツール実行環境などで注目されています。一方で、一般的なLinuxコンテナの全面代替としては、互換性やエコシステムの面で用途が選ばれます。
代表実装: Wasmtime、WasmEdge
変わり種として、ブラウザ上でAIエージェントを動かすアプローチもあります。Mozilla.aiのWasm-agentsは、PythonランタイムのPyodideをWasmで動かし、エージェントをHTMLファイル1枚として配布できる仕組みです。サンドボックスはブラウザのWasm実行環境そのものであり、サーバーを必要としない点が特徴です。
表にまとめると大体こんな感じです。



概念
主な境界
代表実装
向くケース
注意点




プロセス分離
Linux namespace / cgroup / seccomp等
runc, crun
信頼度が比較的高い通常ワークロード、低権限・読み取り中心タスク
ホストカーネルを共有するため、カーネル脆弱性や設定ミスの影響を受けうる


gVisor
ユーザー空間カーネル（Sentry）
runsc
未信頼コード実行、マルチテナント、サーバーレス
syscall互換性・性能に制約が出る場合がある


VM分離
ハイパーバイザー + ゲストカーネル
Kata Containers + Firecracker / QEMU / Cloud Hypervisor
強いテナント分離、コード実行基盤、マルチテナント環境
起動時間・メモリ・運用コストは通常コンテナより重い


言語/バイトコード分離
WebAssembly runtime + WASI capabilities
Wasmtime, WasmEdge
プラグイン、軽量ツール実行、エッジ、限定APIの未信頼コード
Linuxコンテナ互換ではなく、既存アプリをそのまま動かす用途には向きにくい




 各社はどう実装しているか
隔離技術の選択は、各社のサービス設計にそのまま現れています。

 AWS — Firecracker / Bedrock AgentCore
Firecracker はAWSが開発し、OSSとして公開しているmicroVM技術です。AWS LambdaやAWS Fargateの基盤として使われており、サーバーレス環境でのマルチテナント隔離を支えています。AWSは、microVMを約125msで起動でき、メモリオーバーヘッドはmicroVMあたり約5MiBと説明しています。microVM方式を代表する実装の一つです。
AIエージェント向けのマネージドサービスとしては、Amazon Bedrock AgentCoreがあります。Runtime（セッション分離付きのサーバーレス実行環境）とCode Interpreter（Python・JavaScript・TypeScriptを実行できる隔離サンドボックス）を提供しています。内部の隔離実装は公開されていません。

 Microsoft — Azure Container Apps Dynamic Sessions
Azure Container Apps Dynamic Sessions は、Hyper-V isolationを使ったマネージドなサンドボックス環境です。セッションプールによりprewarmedな環境を用意し、新しいセッションをミリ秒単位で割り当てることで起動レイテンシを抑えます。Microsoftは、LLM生成スクリプトやユーザー投稿コードの安全な実行を代表的な用途として挙げています。

 Google Cloud — GKE Sandbox
GKE Sandbox はgVisorベースです。Google Cloudは、GKE Sandboxを「未知または未信頼コードがホストカーネルに影響することを防ぐ追加のセキュリティ層」と説明しており、gVisorのユーザー空間カーネルによってホストカーネルへの直接アクセスを制限します。
なお、Gemini API / Vertex AIのコード実行機能もPythonコードの実行環境を提供していますが、少なくとも公式ドキュメント上は、その内部隔離実装がgVisorであるとは明記されていません。

 OpenAI — Code Interpreter / Codex Sandbox
OpenAIには2つの異なるサンドボックス実装があります。
Code Interpreter は、Responses API・Chat Completions API・Assistants APIで利用できるビルトインツールです。Pythonコードを実行し、データ分析、グラフ生成、ファイル処理などに対応しています。コンテナはautoモード（リクエスト時に自動生成）とexplicitモード（/v1/containers APIで事前作成）の2種類があり、メモリは1GB（デフォルト）・4GB・16GB・64GBから選択できます。20分間操作がなければ自動で期限切れになり、コンテナ内のデータは復元できません。
公式ドキュメントは実行環境を「fully sandboxed virtual machine」と説明しています。内部実装の詳細は公開されていません。
Sandbox は、Codexのアプリ・IDE拡張・CLIがローカルでコマンドを実行するときに使うサンドボックスです。クラウドのコンテナではなく、OSネイティブの隔離機構を使います。macOSではSeatbelt、LinuxとWSL2ではbubblewrap（unprivileged user namespace）、Windows（PowerShell）ではWindows Sandboxです。gitやパッケージマネージャなど、Codexが起動する子プロセスにも同じ境界が適用されます。
サンドボックスモードは3段階です。


workspace-write（デフォルト）: ワークスペース内の読み書きとルーティンなコマンド実行を許可

read-only: ファイル参照のみ、編集・コマンド実行は承認が必要

danger-full-access: 制限なし

Sandbox Agents は、OpenAI Agents Python SDKが提供するサンドボックスエージェントの抽象です。エージェントにファイルシステム・シェル・ポートを持つ独立した実行環境（サンドボックス）を与えます。
設計上の特徴として、ハーネス（エージェントループ・モデル呼び出し・ツールルーティング・承認・トレース）とコンピュート（ファイル操作・コマンド実行・ポート公開）を明示的に分離しています。ハーネスは自前のインフラで動かしつつ、コンピュートだけをサンドボックスプロバイダーに委譲できます。
サンドボックスクライアントはプラグイン式で、Unix-local・Docker・E2B・Modal・Cloudflare・Vercel・Daytona・Runloop・Blaxelなど複数のプロバイダーに対応しています。同じSandboxAgent定義のまま、実行先だけを切り替えられます。現時点ではPython Agents SDKのみで利用可能です。

 Docker — Docker Sandboxes
Docker Sandboxes は、AIコーディングエージェントを隔離されたmicroVM内で実行する実験的機能です。各sandboxに専用のDocker daemon、ファイルシステム、ネットワークを持たせ、ホスト環境に触れずにコンテナビルド、パッケージインストール、ファイル変更を行えるようにします。
隔離モデルは Hypervisor / Docker Engine / Infrastructure（ファイルアクセスポリシー・ネットワーク制限・クレデンシャル注入）の3層です。Claude Code、Codex、Copilot、Gemini、Kiro、OpenCode、Droid、Docker Agentなどに対応しています。

 E2B — AIエージェント向けマネージドサンドボックス
E2B はAIエージェントのコード実行に特化したマネージドサンドボックスサービスです。Python・JavaScript SDKを提供し、隔離されたLinux環境をオンデマンドで起動できます。Claude Code、Codex、Amp、OpenCode、OpenAI Agents SDK、MCPなどとの統合ドキュメントが用意されており、自前でサンドボックス基盤を構築せずに始めたい場合の選択肢になります。

 Cloudflare — V8 isolatesによるエッジ隔離
Cloudflare Agents はTypeScript SDKで、Cloudflare Workersプラットフォーム上でステートフルなAIエージェントを構築できます。各エージェントインスタンスはDurable Object上で動作し、専用のSQLデータベース・WebSocket接続・スケジューラを持ちます。
Workersのセキュリティモデルによると、主要な隔離機構はV8 isolatesです。同一プロセス内でもisolateをまたいだメモリアクセスは不可能であり、Linux namespaces + seccompによるプロセスサンドボックスも組み合わせた多層構成です。実行できるコードはJavaScriptおよびWASMのみで、ネイティブバイナリは不可です。

 Anthropic — Code Executionツール
AnthropicはAPIのサーバーツールとしてCode Executionツールを提供しています（GA）。PythonおよびBashをAnthropicのインフラ上のサンドボックスコンテナで実行でき、データ分析・ファイル操作・コマンド実行に対応しています。利用者が実行環境を用意する必要はなく、Claude API（およびMicrosoft Azure AI Foundry）から直接利用できます。内部の隔離実装は公開されていません。
Claude Codeをサンドボックス内で動かす場合は、Docker Sandboxes・E2Bなど他社のサービスを使うことになります。

 まとめ
隔離の概念は大きく4つあります。プロセス分離・gVisor・VM分離・WASM（言語/バイトコード分離）です。各社がどの概念を使っているかを見ると、構造が見えてきます。


gVisor: GoogleはGKE SandboxにgVisorを採用

VM分離（microVM）: AWS（Firecracker）、Microsoft（Hyper-V）、Docker SandboxesはいずれもmicroVM系のアプローチ

内部実装が非公開: OpenAIのCode Interpreter（「fully sandboxed virtual machine」と説明）、AnthropicのCode Execution Tool、E2Bはいずれも内部の隔離実装を公開していない

公開されている情報を見る限り、強い隔離が求められるマネージドサービスではgVisorかmicroVMが選ばれる傾向があるようです。プロセス分離やWASMが見当たらないのは、未信頼コードの実行には境界として弱かったり、互換性・エコシステムの面でまだ選択肢になりにくかったりするからではないかと思います。
隔離だけで完結するわけではないので、最小権限・入出力検査・監査ログも合わせて設計に組み込むとよいと思います。

 参考リンク
隔離技術

gVisor
Firecracker microVM
Kata Containers
Wasmtime
Wasmtime Security
Wasm-agents: AI Agents Running in Your Browser（Mozilla.ai）

各社サービス

OpenAI Code Interpreter
OpenAI Codex Sandbox
OpenAI Agents SDK — Sandbox Agents
AWS Firecracker（公式サイト）
Amazon Bedrock AgentCore
Azure Container Apps Dynamic Sessions | Microsoft Learn
GKE Sandbox | Google Cloud
Docker Sandboxes ドキュメント
Why MicroVMs: The Architecture Behind Docker Sandboxes
E2B
Computer Use | Anthropic Docs
Code Execution Tool | Anthropic Docs
Cloudflare Agents
Cloudflare Workers Security Model

セキュリティ

OWASP LLM06:2025 Excessive Agency
OWASP LLM02:2025 Sensitive Information Disclosure

書籍

Liz Rice 著『Container Security』（O'Reilly、日本語版: インプレス）
