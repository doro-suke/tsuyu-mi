# Claude Codeを社内に安全に導入する：システムエンジニアのためのセキュリティ実践ガイド
- **Source URL**: https://zenn.dev/nocodesolutions/articles/f71479fa5711fe
- **Score**: 85
- **AI Summary**:
  - Claude Codeを安全に社内導入するための権限制御や多層防御策を解説している。
  - 開発者が上書きできないManaged Settingsによる組織ポリシーの強制手法を提示している。
  - 機密ファイルアクセス拒否やSIEM連携など、具体的な設定ファイル記述例を掲載している。
- **Read Now Reason**: AI駆動開発を推進するにあたり、Claude Codeを開発環境や自動化パイプラインへ安全に導入するための具体的な設定ファイル記述（Managed Settingsや.env等の読込拒否ルール）と多層防御アーキテクチャが明記されているため。未対策での導入による認証情報の漏洩や破壊的コマンドの実行リスクを即座に回避できます。
- **Suggested Tags**: #Claude-Code, #AI駆動開発, #DevSecOps, #セキュリティ統制
- **Processed Date**: 2026/5/24

---

## 本文
はじめに
Claude Codeは「AIがリポジトリを読み、ファイルを編集し、シェルを叩く」ツールです。便利な反面、コードベースへの自律的アクセス・シェル実行・外部API通信という広い攻撃面を抱えており、「開発チームが使いたいと言っている。でも社内のセキュリティ要件を満たせるのか？」という問いは、情報システム部門・SRE・セキュリティ担当者にとって、いま避けて通れないものになっています。何をどこまで許可し、誰が監査するのか。設計をミスれば、便利さと引き換えに事故を招きます。
幸いClaude Codeは、権限制御・OSサンドボックス・Managed Settings・OpenTelemetry監査を組み合わせた多層防御を備えています。本記事では公式ドキュメント準拠で、社内導入可否の判断から導入後のガードレール設計まで、安全な導入・運用の具体的な指針をまとめます。
この記事で分かること


どんなリスクがあるか：プロンプトインジェクション（外部から取り込んだコード・README・Web記事などに仕込まれた指示文でAIを操る攻撃）・データ漏洩・権限暴走など特有の脅威

どう統制するか：権限管理4階層、Sandboxing（OSレベルでBash実行を隔離する仕組み）、Managed Settings（IT管理者だけが配布できる組織用ポリシーファイル。ユーザーから上書き不可）によるポリシー強制

どう監査するか：OpenTelemetry（メトリクス・ログ・トレース収集の業界標準規格）連携で社内SIEMへ集約

導入時に何を確認するか：チェックリストと推奨settings.json雛形



 最低限これだけは：絶対に外せない3つの設定
この3つが入っていない時点でセキュリティ統制は成立しません。詳細は本文で解説します。



#
設定
何を防ぐか




1

disableBypassPermissionsMode: "disable"（Managed Settings）
全権限プロンプトをスキップするbypassPermissionsモードを開発者個人で有効化できないよう封じる。AIの暴走を防ぐ最後の砦


2
Read(./.env) / Read(~/.ssh/**) / Read(~/.aws/**)をdenyに追加
機密ファイル・認証情報をコンテキストに混入させない。.gitignoreだけでは不十分（ローカルには実在するため）


3

CLAUDE_CODE_ENABLE_TELEMETRY=1（OpenTelemetry有効化）
社内SIEMに監査ログを集約。監査証跡なしではインシデント追跡もコスト統制も成り立たない




残りの設定（Sandboxing、ドメイン制限、MCP（Model Context Protocol：LLMが外部ツール・データに接続する標準プロトコル）承認制等）は、これら3つを土台に積み上げる発展形です。


 1. 社内導入で押さえるべき5つのセキュリティリスク
従来のIDEプラグインにはなかった種類のリスクが、エージェント型ツールであるClaude Codeには存在します。社内導入前に押さえるべき5つは以下のとおり。



#
リスク
起きること
主な対策




1
プロンプトインジェクション
外部から取り込んだコード・READMEなどに仕込まれた命令でAIが操られる
Sandboxing、curl/wget自動ブロック、Trust verification


2
機密情報の漏洩

.env等の明示的な機密ファイルだけでなく、ログ・テストデータ・設定ファイル内コメント等に紛れ込んだ機密が、コンテキスト（AIに渡されるファイル・会話文脈）経由でAPI送信される
Read deny rules、事前スキャン、Sandboxingのファイル隔離、読み込み範囲の最小化、ZDR（Zero Data Retention：送信データを学習・保持に使わない契約）


3
権限の暴走

rm -rf 等の破壊的コマンドが意図せず実行される
Bash deny rules、Plan mode（読み取り専用で計画立案だけ行うモード）、bypassPermissions禁止


4
サプライチェーン汚染
信頼できないMCPサーバー・Plugin（Claude Codeに機能を追加する拡張パッケージ）が社内環境に持ち込まれる
Managed Settingsで許可リスト固定


5
監査証跡の欠如
「誰が何をしたか」を後追いできず、インシデント調査に支障
OpenTelemetry連携でSIEMへ集約




 全体アーキテクチャ：脅威と防御層
複数の防御層を持ち、1層が破られても次の層で食い止める設計です。
「すべての層を強制力のあるレベルで設定する」のがエンタープライズ運用の基本方針です（第5章のプロンプトインジェクション対策は、これら多層防御の総合運用にあたります）。


 2. 権限管理の4階層：統制の基本構造
Claude Codeの権限管理は、4つの設定スコープが優先度順に重なる仕組みです。社内統制の中核になるので最初に押さえます。

 2-1. 設定ファイルの優先順位



優先度
スコープ
パス
上書き可能か




1（最強）
Managed settings

/Library/Application Support/ClaudeCode/managed-settings.json（macOS）等
❌ ユーザーから上書き不可


2
コマンドライン引数

--allowedTools 等
一時的


3
ローカルプロジェクト
.claude/settings.local.json
✅


4
共有プロジェクト
.claude/settings.json
✅（Git管理）


5（最弱）
ユーザー設定
~/.claude/settings.json
✅



Managed settingsで定義したdenyルールは、開発者がどう設定しても解除できません。これが社内統制の要です。

 2-2. allow / ask / deny の3つのルール
Claude Code内で /permissions を実行すると、現在のルールがタブ別に確認できます。

/permissions Allowタブ（自動承認されるツールの一覧）
/permissions Askタブ（毎回確認を要するツールの一覧）
/permissions Denyタブ（必ず拒否されるツールの一覧）

権限ルールは deny → ask → allow の順で評価され、deny が常に勝ちます。
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git commit *)",
              "Read(./src/**)",
      "Edit(./src/**)"
    ],
    "ask": [
      "Bash(git push *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(~/.ssh/**)",
      "Edit(./.github/workflows/**)"
    ]
  }
}

💡 deny rulesでよく指定する対象：.env系の機密ファイル、SSH鍵、CI/CDワークフロー定義（GitHub Actionsなど）、本番環境スクリプト、rm -rf系の破壊コマンド。「読み取られて困るもの」「編集されて困るもの」を網羅的に並べます。

実際にプロジェクトレベルで .claude/settings.json を作る最小例と、その適用結果は次のとおりです。

ターミナルで .claude/settings.json を作成する実演（ヒアドキュメントで deny / ask ルールを書き込む）
作成後の /permissions Askタブ（Bash(git push *)、Bash(npm publish *) が反映済み）
作成後の /permissions Denyタブ（rm -rf 系・.env・~/.ssh/ などのdenyルールが反映済み）


⚠️ Bash(curl * | sh) / Bash(wget * | sh) について：これはプロジェクトレベルの最小例で、「パイプして即時シェル実行されるケースだけ」を狭くdenyしています。社内全体に強制したい場合は次節以降で扱う Managed Settings（4-3章）で Bash(curl *) ／ Bash(wget *) の全ブロックを推奨します（理由は2-3章を参照）。


 2-3. Bash権限のワイルドカード仕様
Bashコマンドのパターンマッチで引数の制限は脆弱、と公式が警告しています。



パターン
マッチ例
マッチしない例




Bash(npm run *)
npm run build

npm install、pnpm run build



Bash(curl http://github.com/ *)
curl http://github.com/foo

curl -L ...、curl https://...



Bash(git * main)
git checkout main
git push origin develop




⚠️ 引数ベースの制限はバイパスされやすい：たとえばBash(curl http://github.com/ *)を許可（または拒否）ルールに設定しても、以下のような書き換えで簡単に外せてしまいます。
# ① オプションを前置するとマッチしない
curl -X GET http://github.com/foo

# ② シェル変数経由でURLを隠す
URL=http://github.com && curl $URL/foo

①は「curl の直後がURLでない」、②は「実行時までURLが確定しない」ため、いずれも文字列パターンの単純照合では補足できません。ネットワーク通信を絞るならcurl/wgetを一括deny、WebFetch（Claude Code内蔵のWeb取得ツール）側でドメイン許可リストを設定するのが堅牢です。


 2-4. Permission Modes：実行モードによる挙動切替



モード
挙動
推奨ユース




default
初回利用時に都度承認
通常利用


acceptEdits
ファイル編集を自動承認
信頼できるリポジトリでの作業


plan
読み取りのみ、変更不可
コードレビュー・調査タスク


dontAsk
allow rulesで明示許可されたもの以外は自動拒否
高セキュリティ環境（推奨）


bypassPermissions
すべての権限プロンプトをスキップ
❌ 社内導入では禁止すべき




⚠️ bypassPermissionsは組織ポリシーで無効化を：Managed settingsに以下を追加すれば、開発者個人が有効化できなくなります。
{
  "permissions": {
    "disableBypassPermissionsMode": "disable",
    "disableAutoMode": "disable"
  }
}




 3. Sandboxing：OSレベルの自動防御
PermissionsだけではプロンプトインジェクションでAIが操られた場合の防御が不十分。そこでOSレベルでBash実行を隔離するSandboxing機能を併用します。

 3-1. Sandboxingの仕組み



OS
利用する仕組み




macOS

Seatbelt（OSビルトイン）


Linux／WSL2

bubblewrap（要 apt install bubblewrap socat 等）


WSL1
❌ 非対応



ファイルシステム隔離：書き込みは作業ディレクトリ配下のみ。~/.ssh/・/etc/等のシステム領域はOSレベル保護。ネットワーク隔離：許可リストのドメインのみ通信可、データ持ち出し経路を物理遮断。

 3-2. 有効化と推奨設定
# Linux/WSL2は事前に依存パッケージをインストール
sudo apt-get install bubblewrap socat
[Claude Codeセッション内]
> /sandbox

/sandbox のMode設定画面。デフォルトは No Sandbox（current）になっており、明示的に Auto-allow または Regular permissions を選ばないと有効化されない

settings.jsonでの恒久設定例：
{
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "filesystem": {
      "denyRead": ["~/.ssh/", "~/.aws/", "~/.gnupg/"],
      "allowWrite": ["./build", "/tmp/claude-work"]
    },
    "network": {
      "allowedDomains": [
        "api.anthropic.com",
        "registry.npmjs.org",
        "github.com",
        "*.githubusercontent.com"
      ]
    }
  }
}

💡 failIfUnavailable: trueの意味：依存パッケージが入っていない・サポート外OSでサンドボックスが起動できない場合、Claude Codeは警告を出すだけでサンドボックス無しで動きます。これをハードフェイルにしてセキュリティゲートを徹底できるのがこの設定です。


 3-3. Sandboxingが防げないこと（重要）



防げる
防げない




作業ディレクトリ外への書き込み
作業ディレクトリ内の機密データ


許可ドメイン外への通信
TLSの中身（プロキシは中身を見ない）



~/.ssh/等のシステム領域読取
広く許可したgithub.com経由のドメインフロンティング


サブプロセスからの逸脱

dangerouslyDisableSandboxの利用


—
コンテキスト経由のAPI送信（Sandboxingは正規通信を阻害しない）




⚠️ 「正規通信」経由の漏洩は別問題：Sandboxingは通信先ドメインしか見ず、送信内容（ペイロード）は検査しません。設定ファイルのコメント、テストフィクスチャ、ログ、git履歴等に紛れ込んだ機密が、許可済みのapi.anthropic.com経由でそのまま外部送信されるリスクが残ります。対策は3層で組むのが原則：①Read権限の最小化（Read(./src/**)等の限定指定）、②gitleaks／trufflehog等での事前スキャン、③ZDR契約の検討。


⚠️ dangerouslyDisableSandboxは無効化推奨：サンドボックス内で動かないツールに対するエスケープハッチですが、社内ポリシーで無効化すべきです。
{
  "sandbox": {
    "allowUnsandboxedCommands": false
  }
}




 4. Managed Settings：組織ポリシーの強制
ここまでの設定を「開発者個人に任せる」のはNG。Managed Settingsで組織ポリシーとして配布・強制します。

 4-1. 配布方法



方法
適している環境




MDM/OS-levelポリシー
Jamf、Intune等で管理されたデバイス


Managed settingsファイル直接配置

/Library/Application Support/ClaudeCode/managed-settings.json（macOS）、/etc/claude-code/managed-settings.json（Linux）、C:\ProgramData\ClaudeCode\managed-settings.json（Windows）


Server-managed settings
サーバーから動的取得（fail-closed運用可）




 4-2. Managed-only設定（管理者のみが指定可能）
Managed settingsでのみ効く社内統制の中核キー：



設定
効果




disableBypassPermissionsMode: "disable"
bypassPermissionsモードを使用不可に


allowManagedPermissionRulesOnly: true
Managed以外のallow/ask/denyルールを無効化


allowManagedMcpServersOnly: true
Managedで定義したMCPサーバーのみ許可


sandbox.network.allowManagedDomainsOnly: true
Managedで定義したドメインのみ通信許可


forceRemoteSettingsRefresh: true
リモート設定の取得失敗時にClaude Code起動を阻止


strictKnownMarketplaces
許可されたマーケットプレイスのみPlugin導入可




 4-3. 推奨Managed Settings雛形
社内配布用テンプレートの出発点：
{
  "permissions": {
    "disableBypassPermissionsMode": "disable",
    "disableAutoMode": "disable",
    "deny": [
      "Bash(rm -rf /*)",
      "Bash(rm -rf ~*)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(* > /dev/sda*)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Edit(./.github/workflows/**)",
      "Edit(./terraform/production/**)"
    ]
  },
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "network": {
      "allowManagedDomainsOnly": true,
      "allowedDomains": [
        "api.anthropic.com",
        "registry.npmjs.org",
        "pypi.org",
        "files.pythonhosted.org",
        "github.com",
        "*.githubusercontent.com"
      ]
    }
  },
  "strictKnownMarketplaces": "allowlist",
  "allowManagedMcpServersOnly": true,
  "forceRemoteSettingsRefresh": true,
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://otel-collector.internal.example.com"
  }
}

 4-4. 自社カスタマイズ時に変えるべき箇所
上の雛形はそのまま使うのではなく、自社環境に合わせて以下を必ず置き換えてください。


permissions.deny：社内固有の機密パス（Read(./db-scripts/**)、Edit(./terraform/**/prod/**)等）を追加

sandbox.network.allowedDomains：社内パッケージリポジトリ（Verdaccio／Artifactory／社内GitLab等）を追記

env.OTEL_EXPORTER_OTLP_ENDPOINT：自社OpenTelemetry Collectorのエンドポイントに置換

env.OTEL_RESOURCE_ATTRIBUTES：department=xxx,team.id=yyy,cost_center=zzzで部門・コストセンター識別子を付与

allowedMcpServers：社内承認済みMCPサーバー名のみを列挙（未承認サーバーへの接続を阻止）

特にdeny rulesは「自社で何が機密か」を棚卸ししてから埋めるのが鉄則。テンプレ流用だけでは漏れが出ます。


 5. プロンプトインジェクション対策
Claude Codeには、プロンプトインジェクションを前提とした多層防御が組み込まれています。設定で有効・無効を切り替える性質のものではなく、デフォルトで動いています。



対策
内容




コマンドブロックリスト

curl・wget等、Webから任意コンテンツを取得するコマンドをデフォルトでブロック



Trust verification（信頼性確認）
初回リポジトリ・新規MCPサーバーは利用前に明示確認が必要



Isolated context windows（コンテキスト分離）
WebFetchは別コンテキストで動作（悪意ある内容がメインに混ざらない）



Command injection detection（コマンド注入検知）
怪しいBashコマンドは許可リスト済みでも再度手動承認を要求


Fail-closed matching
許可リストにマッチしないものは自動拒否




💡 Fail-closedとは：判定に失敗・該当なしが出たときに「安全側（＝拒否）」へ倒す設計思想です。逆に通してしまう設計を fail-open と呼びます。セキュリティ機構は fail-closed が原則。


新規フォルダを開いた際のTrust verification（信頼性確認）ダイアログ。「Yes, I trust this folder」を選ぶまで Claude Code はファイル操作を実行しない。プロンプトインジェクションを"フォルダを開く瞬間"に食い止める最初の関門


 推奨される追加対策


VM/Dev Container内で実行：外部Webサービス連携処理は隔離環境で

信頼できないコンテンツをパイプで流さない：cat untrusted.md | claude 等は避ける

重要ファイルへの変更提案は必ずレビュー：CI設定、認証ロジック、暗号化キー周辺は人間確認


⚠️ Windowsの注意点：WebDAV関連パス（\\* のようなUNCパス）はClaude Codeから利用させない設定にしてください。WebDAV経由で権限システムをバイパスしたネットワーク通信が発生するリスクがあります（公式警告）。



 6. 監査ログとOpenTelemetry連携
監査証跡は社内統制の前提。Claude CodeはOpenTelemetry経由でメトリクス・ログ・トレースを社内SIEM／Splunk／Datadog等に集約できます。

 6-1. 有効化
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.internal.example.com:4317
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer $TOKEN"

 6-2. 取得できるデータ



種別
内容




メトリクス
セッション数、ツール使用回数、トークン消費、コスト


ログ／イベント
プロンプト送信、ツール実行、権限承認・拒否、エラー


トレース（Beta）
プロンプト→API呼び出し→ツール実行→子プロセスの全リクエストフロー



トレース有効化はCLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1とOTEL_TRACES_EXPORTER=otlpを追加。

 6-3. チーム別／部門別の属性付与
コスト分析・アラート設定用に属性を付与：
export OTEL_RESOURCE_ATTRIBUTES="department=engineering,team.id=platform,cost_center=eng-123"

⚠️ 属性値にスペースは不可：team.id=Platform Teamは無効。アンダースコア・キャメルケース（Platform_Team / PlatformTeam）を使うこと。


 6-4. ダッシュボード化の例
「コスト統制 × ポリシー違反検知 × 異常検知 × 外部接続監視」の4軸で組むと、情シス・セキュリティ・財務それぞれの観点が1画面に収まります。実装ツールは Grafana／Datadog／Splunk／Honeycomb など問いません。



監視項目
目的
取得元（OTel）




部門別トークン消費量
コスト按分・予算アラート

claude_code.llm_request の token系 × OTEL_RESOURCE_ATTRIBUTES



ツール拒否率
ポリシー違反試行の検知

claude_code.tool.blocked_on_user の decision: reject



異常なエラー頻度
プロンプトインジェクション兆候検知

claude_code.tool.execution の success: false



MCP接続先の偏り
想定外の外部サービス利用検知
tool spans + mcp__* ツール名



4タイルを1画面に配置するレイアウトイメージ：



タイル
主要メトリクス（例）
状態




部門別トークン消費（月次）
Engineering: 4.2M / Product: 1.8M / Data Science: 1.1M ／ 月次予算70%使用
✅ 緑


ツール拒否率（24h）
denied 合計 12件（deny rule: 8 / user reject: 4）／ 閾値 50/h
✅ 正常


異常エラー頻度（1h）
エラー 3件（timeout: 2 / sandbox_violation: 1）／ 急増アラートなし
✅ 正常


MCP接続先分布（週次）
github: 68% / internal-jira: 22% / internal-db: 10% / 未承認: 0%
✅ 正常



部門別利用量を円グラフ化したい場合の表示イメージ（コスト按分の根拠資料にそのまま使えます）：

💡 異常検知のしきい値設計のコツ：「tool.blocked_on_user で reject が時間あたり通常の5倍以上」「sandbox_violation が新規発生」「未承認MCPサーバーへの接続試行」。この3つをプッシュ通知（Slack/Teams）連動にしておくと、攻撃の兆候を見逃しません。



 7. 社内導入チェックリスト
承認プロセスや運用設計でそのまま使える形にまとめます。

 7-1. 導入前評価


 利用予定プラン（Team／Enterprise／Console推奨、無料プランは非対応）を確定

 Anthropic Trust CenterでSOC 2 Type 2／ISO 27001認証を確認

 法務とCommercial Terms／Privacy Policyをレビュー


 7-2. 環境構築


 Managed Settings配布経路（MDM／直接配置／Server-managed）を決定

 OSサポート確認：macOS 13+／Linux（要bubblewrap）／WSL2（WSL1は非対応）

 Managed settings雛形を社内リスクに合わせカスタマイズ

 OpenTelemetry Collectorの社内エンドポイントを準備

 リポジトリ内の機密情報混入を gitleaks／trufflehog 等で事前スキャン

 本番データを含むテストフィクスチャの存在確認とマスキング

 Read 権限を最小範囲に設定（Read(./src/**) のような限定指定）

 ZDR（Zero Data Retention）契約の検討（Enterprise／Console）


 7-3. ポリシー設計


 disableBypassPermissionsMode: "disable" を必ず設定

 sandbox.enabled: true ＋ failIfUnavailable: true ＋ allowUnsandboxedCommands: false


 denyリスト最低限：rm -rf系・curl/wget・.env・~/.ssh/・CI設定

 許可ドメインを最小化（api.anthropic.com＋必要なパッケージリポジトリのみ）

 MCP/Plugin制限（strictKnownMarketplaces、allowManagedMcpServersOnly）


 7-4. 監査・運用


 OpenTelemetryでメトリクス・ログを社内SIEMへ集約

 部門別属性（OTEL_RESOURCE_ATTRIBUTES）でコスト按分の仕組みを設計

 ダッシュボード化（トークン消費・拒否率・異常エラー頻度）

 インシデント対応フローに「Claude Code経由の事故」を追加

 開発者向けトレーニング（プロンプトインジェクション、Plan mode、/feedback）


 7-5. 継続運用


 Managed Settingsを四半期レビュー

 Anthropic HackerOneで脆弱性情報をウォッチ

 リリースノート確認（特にデフォルト挙動の変更）



 8. よくある質問（FAQ）

 Q1. 個人のClaude Pro/Maxアカウントを業務利用しても大丈夫？
非推奨。個人プランはデフォルトで学習データに利用される設定で、ユーザー全員が手動で「学習に使わない」をオンにする必要があります。設定リセット事故も実例があり、運用負荷が高い。5名以上のチームならTeam以上を推奨します。

 Q2. Zero Data Retention（ZDR）はどう契約する？
Claude Enterpriseプラン、またはAnthropic Console（API課金）契約時にZDRオプションを有効化します。SOC 2 Type 2／ISO 27001の認証取得情報含め、Anthropic Trust Centerに資料一式があり、法務・調達部門のレビュー資料として直接使えます。

 Q3. .claude/settings.jsonをGit管理するとセキュリティリスクは？
問題なし、むしろ推奨。settings.jsonに書くのはポリシー（denyルール等）であって機密値そのものではありません。リポジトリにコミットしてチーム全員に同じガードレールを適用するのが正解。機密値は.envや秘密管理サービスへ、settings.jsonには絶対に書かないこと。

 Q4. 開発者がmacOSのSeatbeltやmanaged-settings.jsonを自分で無効化できる？
Managed Settingsを正しく配布していれば不可。/Library/Application Support/ClaudeCode/managed-settings.jsonはroot所有・読み取り専用配置にし、Jamf等のMDM経由で配布するのが原則。forceRemoteSettingsRefresh: trueと組み合わせれば、ファイル削除時にClaude Code起動を阻止できます。

 Q5. deny rulesで.envを保護していれば、機密情報の漏洩は防げる？
不十分です。deny rulesはファイルパスのブラックリストなので、他のファイルに紛れ込んだ機密（設定ファイルのコメント、マスキング忘れのテストデータ、ログ等）は守れません。対策は ①gitleaks等での事前スキャン、②Read権限の最小化、③ZDR契約 の3層で組むのが原則です。

 Q6. WSL1環境ではどうしたら？
WSL2への移行が必須。Sandboxingはbubblewrapを使い、WSL1ではカーネルプリミティブが揃わないため動作しません。WSL2移行が困難な場合は、該当ユーザーには Claude Code 利用を許可しない運用ポリシーが現実解です。


 9. まとめ


多層防御が前提：Permissions・Sandboxing・Managed Settings・OpenTelemetryのいずれか1層では足りず、組み合わせて初めて社内基準を満たせる

「個人任せ」が一番の地雷：Managed Settingsで強制力を持たせるのが鉄則。開発者個人のsettings.jsonに頼ってはいけない

監査は導入前に設計：OpenTelemetry連携を後付けするとログの空白期間ができるため、最初からSIEM集約を組み込む

Claude Codeは設計レベルで企業利用を意識した堅牢な防御を備えていますが、デフォルトのままでは不十分。Managed Settingsで強制ポリシーを敷くことが鍵です。本記事のチェックリストと雛形を出発点に、自社環境に合わせた運用設計を進めてください。


 参考文献

Claude Code Security（公式）
Claude Code Permissions（公式）
Claude Code Sandboxing（公式）
Claude Code Monitoring（公式）
Claude Code Settings（公式）
Anthropic Trust Center
Sample Settings Configurations（GitHub）


 最後に
私たちは、単にシステムを組むだけの開発会社ではありません。低コストで高品質なAIツールの構築から、ROI（投資対効果）を最大化する導入ロードマップの策定、社内スタッフが自らAIを運用・改善できる体制の構築まで、AI導入の成功に必要なすべてを最初から最後まで丸ごと支援いたします。
実は、ご相談いただく方のほとんどが「何が分からないかも分からない」という状態からのスタートです。構想段階でも、ただのアイデアベースでも構いません。
まずは、あなたのお困りごとをそのまま聞かせていただけませんか？貴社のビジネスを加速させるパートナーとして伴走いたします。
👉 無料オンライン相談で、最適な導入プランを相談する
