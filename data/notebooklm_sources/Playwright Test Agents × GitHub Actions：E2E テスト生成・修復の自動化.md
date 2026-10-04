# Playwright Test Agents × GitHub Actions：E2E テスト生成・修復の自動化
- **Source URL**: https://zenn.dev/sun_asterisk/articles/e9b50f09839def
- **Score**: 90
- **Suggested Tags**: #Playwright, #GitHub Actions, #AI駆動開発
- **Processed Date**: 2026/10/4

---

## 本文
はじめに
Playwright 1.56 で追加された Playwright Test Agents は、E2E テストの計画・生成・修復を AI エージェントに任せる仕組みです。私たちは稼働中のプロジェクトで、このエージェントを GitHub Actions から無人で動かす仕組みを設計・実装し、検証しました。
本記事では、その設計と、どのプロジェクトでも試せる最小構成のサンプルを紹介します。次の順に進みます。

3 つのエージェントが何をするかを知る
承認と検証の流れを理解する
サンプル一式を用意する
既存のテストを実行する
生成と修復を試す
制限事項と検証状況を確認する

対象読者：Playwright でテストを書いたことがあり（test / expect / page.getByRole）、GitHub Actions のワークフローを読み書きできる方。AI テストエージェントの経験は不要です。


 用語



用語
この記事での意味




MCP（Model Context Protocol）
AI にツールを使わせるための共通プロトコル。Playwright は「ブラウザ操作」や「テスト実行」を MCP サーバーとして提供する


seed テスト
エージェントが操作を始める前の初期状態（ログイン済みなど）を作るテスト


Page Object
画面ごとに要素の探し方（ロケーター）と操作をまとめたクラス


アサーション
期待結果の検証。Playwright では expect(...)



AST（抽象構文木）
ソースコードを構文として解析した木構造。文字列検索ではなくコードの構造で検査できる


シャドーイング
同じ名前を定義し直して元のものを隠すこと。例: const expect = ...



トレース
Playwright が記録する実行ログ（操作・画面・通信）。trace.zip





 1. 3 つのエージェント



エージェント
役割
出力




🧭 Planner
アプリを操作して探索し、テスト計画を作る
Markdown のテスト計画（specs/*.md）


🛠 Generator
計画の手順をブラウザで確かめながらテストを書く
テストファイル（*.spec.ts）


🩹 Healer
失敗したテストを再実行・調査して修正する
修正されたテスト



エージェントの実体は「指示文」と「Playwright の MCP サーバー」の組み合わせです。npx playwright init-agents で生成できます。

 公式が提供するもの・この記事で追加するもの
公式の Healer は、ロケーターを直すだけではありません。 Playwright 1.56.1 が生成する Healer の指示文には、次のように書かれています。


Updating selectors to match current application state
Fixing assertions and expected values
If the error persists and you have high level of confidence that the test is correct, mark this test as test.fixme() so that it is skipped during the execution.


つまり公式の Healer は、期待値を書き換えたり、test.fixme() でテストをスキップしたりすることもあります（公式ドキュメントにも同様の説明があります）。対話的に使うなら便利ですが、無人で動かすと、プロダクトのバグをテストの修正で隠してしまうおそれがあります。そこで次の制限を独自に追加します。




Playwright が提供
この記事で追加




エージェント定義・MCP サーバー
✅



CI での非対話実行とツール権限の制限

✅ scripts/run-agent.mjs



変更できるファイルの制限、skip などの禁止

✅ scripts/guard.mjs



Healer が変更できるのは既存の Page Object ファイルだけ（テストファイルは変更不可）

✅ ガード


失敗を「Healer に渡すか、人間に返すか」に分ける

✅ scripts/classify.mjs



人間の承認（要件のマージ・PR レビュー）

✅ ワークフローと GitHub の設定




 2. 承認と検証の流れ

 人間が判断するのは 2 か所


Gate 1：エージェントに渡すのは、PR レビューを経て main にマージされた要件ファイル（requirements/*.md）だけです。

Gate 2：生成・修復の結果は必ず Draft PR になり、人間のレビューを経てマージされます。


 エージェントの出力は信頼せず、別のジョブで検証する
エージェントにはファイルの書き込みを許可するので、作業ディレクトリにあるスクリプトや node_modules を書き換えることも理屈の上では可能です。そこでジョブを分け、判定はトークンも書き込み権限も持たないクリーンなジョブで行います。



ジョブ
Copilot のトークン
書き込み権限
役割




agent（修復側は heal）
エージェントのステップだけ
なし
エージェントを動かしてパッチを作る


verify
なし
なし
新しい環境でパッチを検査・実行する。ここの結果を正とする


pull-request
なし

contents / pull-requests の write
検証済みのパッチで Draft PR を作る



すべてのジョブは actions/checkout に ref: ${{ github.sha }} を指定し、実行を開始した時点の同じコミットを使います。

 main 以外からは実行させない
workflow_dispatch は、実行時に任意のブランチを選べます。そして使われるのは選んだブランチにあるワークフロー定義です（GitHub Docs）。つまり、ワークフロー内に「main 以外なら止める」と書いても、別のブランチでその行を消せば回避できます。
そこで、境界は GitHub の設定で守ります。


Environment e2e-dev のデプロイ元を main に限定する（Settings → Environments → Deployment branches and tags → Selected branches: main）。Copilot のトークンやテスト用アカウントはこの Environment のシークレットにしているので、main 以外で実行されたジョブはシークレットを使えず、Environment を使うジョブは開始前に拒否されます。

main ブランチを保護し、マージに PR のレビューを必須にする。これが Gate 1 の実体です。

ワークフローの最初のジョブにも確認のステップを入れていますが、これは早い段階で分かりやすく止めるためのものです。

.github/workflows/e2e-generate.yml
# 承認済みの要件 = main にマージ済みのもの。main 以外からの手動実行は拒否する
# （workflow_dispatch は任意のブランチを選んで実行でき、そのブランチのワークフロー定義が使われる。
#   そのため本当の境界は Environment の「main のみ」設定。この確認は早期に止めるためのもの）
- name: main ブランチからの実行か確認
  if: github.ref != 'refs/heads/main'
  run: |
    echo "::error::main ブランチからのみ実行できます（実行元: $GITHUB_REF）"
    exit 1



 3. サンプル一式を用意する
サンプルのファイルは、付録 A にすべて全文を掲載しています（npm install と init-agents が生成するファイルを除く）。次の順に作成してください。順番に意味があります。



手順
理由




① .gitignore と package.json を最初に置く

node_modules やテスト結果を Git に含めないため。ガードは「無視されていないファイル」をすべて検査対象にする


② エージェント定義を生成して名前を変える
生成されるファイル名に絵文字とスペースが入り、スクリプトで扱いにくいため


③ 残りのファイルを作る
生成物の上書きを避けるため、init-agents の後に作る


④ すべてをコミットし、作業ツリーがきれいなことを確認する
ガードは「最後のコミットとの差分」を検査する。エージェントを動かす前に、完全な状態をコミットしておく必要がある




 動作確認した環境（2026-09-25）



ソフトウェア
バージョン
備考




Node.js
ローカル 25.9.0 / ワークフロー 22
Copilot CLI の npm 版は Node.js 22 以上が必要


@playwright/test
1.56.1
本記事は 1.56.1 のファイル形式（.github/chatmodes/）で統一


@github/copilot
1.0.78
自動更新を無効化して使う（付録 B-1）


typescript
5.9.3
ガードで AST を解析する




 手順
mkdir e2e-agents-example && cd e2e-agents-example

# ① 付録 A の .gitignore と package.json を作成してから
npm install
npx playwright install chromium

# ② エージェント定義を生成し、扱いやすい名前に変える
npx playwright init-agents --loop=vscode
mv ".github/chatmodes/ 🎭 planner.chatmode.md" .github/chatmodes/planner.chatmode.md
mv ".github/chatmodes/🎭 generator.chatmode.md" .github/chatmodes/generator.chatmode.md
mv ".github/chatmodes/🎭 healer.chatmode.md" .github/chatmodes/healer.chatmode.md
rm seed.spec.ts   # seed テストは付録 A の tests/seed.spec.ts を使う

# ③ 付録 A の残りのファイルをすべて作成する

# ④ ベースラインをコミットする
git init -b main
git add -A
git commit -m "baseline: e2e agents example"
git status --porcelain   # 何も表示されなければ OK
init-agents の出力は次のとおりです（1.56.1）。planner のファイル名は先頭にスペースが入っています。
Writing file: .github/chatmodes/🎭 generator.chatmode.md
Writing file: .github/chatmodes/🎭 healer.chatmode.md
Writing file: .github/chatmodes/ 🎭 planner.chatmode.md
Writing file: .vscode/mcp.json
Writing file: seed.spec.ts
.vscode/mcp.json は VS Code から使うときの設定で、CI では run-agent.mjs が別に MCP の設定を作ります。
完成したディレクトリ構成です（node_modules などを除く）。
e2e-agents-example/
├── .github/
│   ├── actions/setup/action.yml     # Node.js・依存・Chromium のセットアップ
│   ├── chatmodes/                   # init-agents が生成（名前を変更）
│   └── workflows/
│       ├── e2e-generate.yml         # 要件 → 計画 → テスト生成 → Draft PR
│       └── e2e-heal.yml             # E2E 実行 → 分類 → 修復 → Draft PR
├── .gitignore
├── .vscode/mcp.json                 # init-agents が生成（このサンプルでは未使用）
├── demo-app/server.mjs              # テスト対象の最小デモアプリ
├── package.json / package-lock.json
├── playwright.config.ts
├── prompts/                         # エージェントへの依頼文（plan / generate / heal）
├── requirements/logout.md           # 承認済みの要件（Gate 1 の入力）
├── scripts/
│   ├── run-agent.mjs                # Copilot CLI を権限を絞って非対話実行
│   ├── guard.mjs                    # エージェントの変更を検査
│   ├── classify.mjs                 # テスト結果を pass / heal / escalate に分類
│   ├── check-base-url.mjs           # 接続先 URL の確認
│   └── test/tools.test.mjs          # ガードと分類のテスト
├── specs/.gitkeep                   # Planner が計画を書き出す場所
└── tests/
    ├── pages/                       # Page Object（Healer が変更できる唯一の場所）
    ├── support/credentials.ts       # テスト用アカウント（人間が管理）
    ├── login.spec.ts
    └── seed.spec.ts

 4. 既存のテストを実行する
テスト対象は、ログイン → ダッシュボード → ログアウトだけのデモアプリです。環境変数 DEMO_MODE で「UI の変更」や「プロダクトのバグ」をわざと起こせます（renamed / status-role / bug-500 / reworded-error / bug-no-logout）。
npm run test:e2e     # Playwright のテスト
npm run test:tools   # ガードと分類のテスト
  4 passed
...
ℹ pass 26
ℹ fail 0
テストの書き方には、ガードと分類のための約束が 2 つあります。
1. ロケーターは Page Object に集約する。 テストファイルには page.getByRole(...) などを書きません。UI の変更で直す場所が Page Object に集まるので、「Healer は既存の Page Object ファイルだけを変更できる」というルールを作れます。

tests/pages/LoginPage.ts
export class LoginPage {
  constructor(private readonly page: Page) {}

  readonly username = this.page.getByLabel('ユーザー名');
  readonly password = this.page.getByLabel('パスワード');
  readonly submit = this.page.getByRole('button', { name: 'ログイン' });
  readonly errorMessage = this.page.getByRole('alert');

2. 期待どおりのエラー応答は注釈で宣言する。 誤ったパスワードでの 401 のように、エラー応答そのものが正しい動作である場合です。分類スクリプトはこの注釈を読みます。

tests/login.spec.ts
test('誤ったパスワードではエラーが表示される', {
  // このテストでは 401 が「期待どおりの応答」。分類スクリプトに伝えるための注釈
  annotation: { type: 'expected-http', description: '401 /api/login' },
}, async ({ page }) => {

Playwright の設定では、分類に使う JSON レポートと失敗時のトレースを出力します。

playwright.config.ts
retries: 0, // 失敗の分類に使うため、リトライはワークフロー側で制御する
reporter: [['list'], ['json', { outputFile: 'test-results/report.json' }]],
use: {
  baseURL,
  trace: 'retain-on-failure', // 失敗時のトレースを分類の証拠に使う



 5. 生成と修復を試す

 5-1. AI を使わずに流れを確かめる
まずはトークンも費用もかからない範囲で、分類とガードの動きを確かめます。以下は 2026-09-25 に、手順 3 で作ったベースラインの上で実行した結果です。
# UI の変更（ボタンの文言変更）を再現して分類する
DEMO_MODE=renamed npx playwright test --timeout 5000; code=$?
node scripts/classify.mjs test-results/report.json --test-exit-code "$code"
#   → "decision": "heal"

# Healer の代わりに、手で Page Object を直す
sed -i.bak "s/name: 'ログイン' })/name: 'サインイン' })/" tests/pages/LoginPage.ts && rm tests/pages/LoginPage.ts.bak
node scripts/guard.mjs --actor healer
#   → "ok": true, "checked": ["M tests/pages/LoginPage.ts"]（既存ファイルの変更として扱われる）
DEMO_MODE=renamed npx playwright test
#   → 4 passed

# 元に戻す（ガードは git add を実行するので、HEAD から戻す）
git reset -q --hard HEAD && git status --porcelain

# プロダクトのバグ（API が 500）を再現して分類する
DEMO_MODE=bug-500 npx playwright test --timeout 5000; code=$?
node scripts/classify.mjs test-results/report.json --test-exit-code "$code"
#   → "decision": "escalate"（想定外の HTTP エラー: 500 /api/login）
--timeout 5000 は、失敗するテストを早く終わらせるためだけに付けています。

 ガード：エージェントの変更を検査する
scripts/guard.mjs は、最後のコミットとの差分を列挙し、TypeScript の AST を解析して検査します。役割ごとに変更できるファイルは次のとおりです。

scripts/guard.mjs
const PATH_RULES = {
  generator: { status: 'A', allowed: [/^specs\/[a-z0-9-]+\.md$/, /^tests\/(?!seed\.spec\.ts$)[a-z0-9/-]+\.spec\.ts$/, /^tests\/pages\/[A-Za-z0-9]+\.ts$/] },
  healer: { status: 'M', allowed: [/^tests\/pages\/[A-Za-z0-9]+\.ts$/] },
};




検査すること
Generator
Healer




変更できるファイル

specs/*.md・tests/**/*.spec.ts・tests/pages/*.ts の新規追加のみ


tests/pages/*.ts の既存ファイルの変更のみ




test.skip / only / fixme / fail の追加、test['skip'] のような書き方
禁止
禁止



expect / test の別名・再定義
禁止
禁止


Node.js 組み込みモジュール、require()・動的 import()・eval()・fetch()、process / globalThis

禁止
禁止


テストファイルでの page.getByRole(...) などの直接のロケーター
禁止
―（テストファイルは変更不可）


各 test() の本体に expect(...) の呼び出しが書かれていること
必須
―


Page Object 内の expect

禁止
禁止



ガードで検査できる範囲とできない範囲は、6-1 にまとめています。

 分類：pass / heal / escalate
scripts/classify.mjs は、テストの終了コードと JSON レポート、トレースから結果を 3 つに分けます。pass と heal 以外はすべて人間に返します。
最初の確認が重要です。例えば、テストファイルの構文エラーや「No tests found」では、失敗したテストが 1 件も記録されません。失敗したテストだけを見ていると、これを「失敗なし＝成功」と誤判定してしまいます。

scripts/classify.mjs
function runIssues(report, testExitCode) {
  const issues = [];
  if (!Number.isInteger(testExitCode)) issues.push('テストコマンドの終了コードが不明');
  if (!report || !Array.isArray(report.suites) || !report.stats) return [...issues, 'レポートの形式が不正'];
  for (const error of report.errors || []) issues.push(`実行全体のエラー: ${(error.message || '').replace(ANSI, '').split('\n')[0]}`);
  const { expected = 0, unexpected = 0, flaky = 0 } = report.stats;
  if (expected + unexpected + flaky === 0) issues.push('実行されたテストが 1 件もない');
  return issues;
}

修復ワークフローでは、テストの終了コードを記録してから分類し、pass と heal 以外はジョブを失敗させます。

.github/workflows/e2e-heal.yml
- name: E2E を実行（終了コードを記録して次へ進む）
  id: e2e
  run: |
    rm -rf test-results # 前回のレポートを読まないように消しておく
    set +e
    npx playwright test --retries=0
    echo "exit-code=$?" >> "$GITHUB_OUTPUT"
- name: 結果を分類（成功時も含めて必ず実行）
  id: classify
  env:
    TEST_EXIT_CODE: ${{ steps.e2e.outputs.exit-code }}
  run: |
    node scripts/classify.mjs test-results/report.json --test-exit-code "$TEST_EXIT_CODE" > classification.json
    cat classification.json
    echo "decision=$(node -p 'require("./classification.json").decision')" >> "$GITHUB_OUTPUT"
- name: 判定（pass と heal 以外はすべて失敗扱い）
  env:
    DECISION: ${{ steps.classify.outputs.decision }}
  run: |
    case "$DECISION" in
      pass) echo "すべてのテストが成功しました" ;;
      heal) echo "Healer に渡します" ;;
      *)
        { echo "## 🚨 自動修復の対象外です。人間の確認が必要です"; echo '```json'; cat classification.json; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
        exit 1 ;;
    esac

この 3 ステップを Actions と同じ bash -e で手元で実行し、次の結果になることを確認しました。



状況
分類
ジョブの結果




すべて成功
pass
成功（修復は行わない）


ボタンの文言変更（renamed）
heal
成功 → heal ジョブへ


API が 500（bug-500）
escalate
失敗


テストファイルの構文エラー
escalate
失敗


テストが 1 件も見つからない
escalate
失敗


設定ファイルが壊れていてレポートが出ない
escalate
失敗




 エージェントに渡すコマンドを確かめる
scripts/run-agent.mjs は、init-agents が生成した VS Code 用の定義（.chatmode.md）を Copilot CLI のカスタムエージェント（.github/agents/e2e-<role>.agent.md）に変換し、ツールの許可を絞って起動します。Copilot CLI は -p で非対話実行できますが、非対話モードでは事前に許可していない操作は拒否されます（公式ドキュメント）。そのため、エージェントが使うツールを 1 つずつ許可しています。

scripts/run-agent.mjs
const cliArgs = [
  '-C', ROOT,
  '--agent', agentName,
  '--prompt', prompt,
  '--model', model,
  '--additional-mcp-config', `@${mcpFile}`,
  '--max-ai-credits', process.env.E2E_AGENT_MAX_CREDITS || '30',
  `--available-tools=${scope.available.join(',')}`, // モデルに見せるツールを限定
  ...scope.allow.map((rule) => `--allow-tool=${rule}`), // 確認なしで使ってよいツールを限定
  '--deny-tool=shell', // シェルコマンドは実行させない
  '--no-ask-user', // 質問で止まらない
  '--no-auto-update', // 固定したバージョンのまま動かす
  '--disable-builtin-mcps', // 組み込みの GitHub MCP サーバーを無効化
  '--secret-env-vars=COPILOT_GITHUB_TOKEN', // シェル / MCP サーバーの環境から除去し、出力でも伏せる
  '--no-color',
];

これらのオプションは、1.0.78 の --help に存在することを確認しています。--dry-run を付けると、Copilot CLI を起動せずに組み立てたコマンドと依頼文を表示します。
E2E_AGENT_MODEL=claude-sonnet-5 node scripts/run-agent.mjs --role planner --prompt prompts/plan.md \
  --var NAME=logout --var REQUIREMENT_PATH=requirements/logout.md \
  --var-file REQUIREMENT=requirements/logout.md --dry-run

 5-2. ローカルで AI エージェントを動かす（このサンプルでは未実行）

export COPILOT_GITHUB_TOKEN=<Copilot Requests 権限を持つトークン>
export E2E_AGENT_MODEL=<利用できるモデル名>
node demo-app/server.mjs &   # MCP のブラウザが接続するアプリを起動しておく

# 生成: Planner → Generator → ガード → 実行
node scripts/run-agent.mjs --role planner --prompt prompts/plan.md \
  --var NAME=logout --var REQUIREMENT_PATH=requirements/logout.md \
  --var-file REQUIREMENT=requirements/logout.md
test -f specs/logout.md
node scripts/run-agent.mjs --role generator --prompt prompts/generate.md --var NAME=logout
node scripts/guard.mjs --actor generator
npx playwright test tests/logout --retries=0 --repeat-each=3
git reset -q --hard HEAD && git clean -fdq -- specs tests   # 試したあとに戻す
受け渡しはファイルで行います。Planner は計画を specs/<name>.md に保存し、Generator はそれを読んでテストを書きます。2 回目以降の Generator には、ガードの違反やテストの失敗ログを {{FEEDBACK}} として渡します（ワークフローでは最大 3 回）。依頼文は付録 A の prompts/ にあります。
修復は、分類結果を依頼文に入れて Healer を実行します。分類結果の JSON は、ガードの検査対象にならない test-results/（.gitignore 済み）に置きます。
kill %1; DEMO_MODE=renamed node demo-app/server.mjs &
npx playwright test --timeout 5000; code=$?
node scripts/classify.mjs test-results/report.json --test-exit-code "$code" > test-results/classification.json
node scripts/run-agent.mjs --role healer --prompt prompts/heal.md --var-file CLASSIFICATION=test-results/classification.json
node scripts/guard.mjs --actor healer
npx playwright test --retries=0

 5-3. GitHub Actions で動かす（このサンプルでは未実行）
リポジトリに push したら、次を設定します。



種類
名前・場所
内容




Environment
e2e-dev

Deployment branches を main のみに限定。以下のシークレット・変数をここに置く


シークレット
COPILOT_PAT
Copilot CLI の認証用トークン（下記）


シークレット

E2E_USER / E2E_PASSWORD

検証環境専用のテスト用アカウント（デモアプリなら未設定で可）


変数
E2E_AGENT_MODEL
利用できるモデル名


変数

E2E_BASE_URL / E2E_ALLOWED_HOSTS

テスト対象の URL と許可するホスト（未設定ならデモアプリを起動）


変数
DEMO_MODE
デモアプリのモード（実アプリでは不要）


ブランチ保護
main
マージに PR のレビューを必須にする（Gate 1）


Actions の設定
Settings → Actions → General
「Allow GitHub Actions to create and approve pull requests」を有効にする



gh workflow run e2e-generate.yml --ref main -f requirement=logout
gh workflow run e2e-heal.yml --ref main
トークン：Copilot CLI は COPILOT_GITHUB_TOKEN・GH_TOKEN・GITHUB_TOKEN の順にトークンを探します。現在の公式ドキュメント（2026-09-24 確認）では、Actions の GITHUB_TOKEN（permissions に copilot-requests: write、組織のポリシーで許可）と、「Copilot Requests」権限だけを付けた Fine-grained PAT の 2 つが案内されています。サンプルは、私たちが動作を確認できた PAT を使う形にしています。GITHUB_TOKEN を使う場合は、agent / heal ジョブに copilot-requests: write を追加し、COPILOT_GITHUB_TOKEN: ${{ github.token }} に置き換えてください（私たちが遭遇した問題は付録 B-2）。
トークンは、エージェントを動かすステップの env: にだけ渡しています。GitHub Actions の env: はワークフロー・ジョブ・ステップのどの単位でも書けるので、ステップ単位にすれば同じジョブのほかのステップからは読めません。


 6. 制限事項と検証状況

 6-1. ガードが保証すること・しないこと
ガードが機械的に保証するのは、「変更は既存の Page Object ファイルに限られ、テストファイルは変更されない」（Healer）、「追加できるのは許可された場所の新規ファイルだけ」（Generator）と、5-1 の表の既知のパターンが含まれないことです。
Healer の本来の役割はロケーターの修正ですが、ガードが強制しているのはファイル単位の制限です。既存の Page Object ファイルの中であれば、メソッドの中身も変更できます。そのため、次のことは保証しません。


テストの意味が変わっていないこと。 例えば、消えたログアウトボタンの代わりに getByRole('button').first() を指すよう Page Object を書き換えれば、テストファイルは同じままテストを通せます。構文として正しいので、ガードでは検出できません（tools.test.mjs の「限界」ケースで確認しています）。

Page Object のメソッドが同じ動作をすること。 login() からクリックを消す、といった変更もファイルの制限内です。

アサーションについては、3 つを区別してください。




内容




エージェントへの指示
「各テストに expect を 1 つ以上書く」（prompts/generate.md）


ガードが機械的に確認すること
各 test() の本体に expect(...) の呼び出しが書かれているか（構文上の確認のみ）


人間がレビューで確認すること
その expect が実行されるか（到達しない分岐や、呼ばれない関数の中に書かれていないか）、妥当な期待値か




生成したテストを 3 回連続で実行するのは、不安定なテストを見つけるためです。成功したからといって、アサーションが実行されていることや、テストの品質が十分なことは示しません。


 6-2. 分類はヒューリスティック
デモアプリの各モードで E2E を実行し、分類した結果です（2026-09-25）。



DEMO_MODE
起こした変化
本来の扱い
分類結果




renamed
ログインボタンの文言が変わる
テストを直す
✅ heal


status-role
エラー表示の role が変わる（401 を伴う）
テストを直す
✅ heal（注釈あり）／注釈を外すと escalate


bug-500
ログイン API が 500 を返す
人間に返す
✅ escalate


reworded-error
エラーメッセージの文言が変わる
人間が判断する
✅ escalate（期待値の不一致）


bug-no-logout
ログアウトボタンが消える（HTTP エラーなし）
人間に返す
❌ heal（誤分類）




HTTP エラーを伴わないバグ（ボタンが消えるなど）は、「ロケーターが見つからない失敗」と区別できません。 この場合に働く対策は次のとおりですが、どれも完全ではありません。

Healer の依頼文で「同じ役割の要素がなければ修正せず ESCALATE: と出力する」よう指示している（AI が従うかは未検証）
Healer はテストファイルを変更できないので、直せなければ再実行が失敗して人間に返る
それでも Page Object を別の要素に向けて通してしまう可能性は残る（6-1）。そのため修復結果は必ず Draft PR にし、PR 本文でロケーターとメソッドの確認を求めている

分類は「Healer に渡さなくてよいものを減らす」ためのもので、「Healer に届くのはロケーターの問題だけ」と保証するものではありません。証拠がない・読めない・矛盾する場合は escalate に倒します。

 6-3. 安全対策の範囲



対策
防げること
防げないこと




ジョブの分離と、パッチ適用前のガードの退避
エージェントが作業ディレクトリのスクリプトや node_modules を書き換えても、verify の判定に影響しない
パッチに含まれる tests/・specs/ の中身の妥当性（6-1）


Environment を main に限定
main 以外のブランチからの実行でシークレットを使うこと
main にマージされた内容そのものの誤り（それは Gate 1 のレビューで防ぐ）


ツールの許可を最小限にし、シェルを禁止
任意のコマンドの実行
許可したブラウザ操作の範囲での行動（browser_evaluate によるページ内での JavaScript 実行を含む）


ガードでの Node.js API・fetch・process の禁止
テストコードからのファイル操作・環境変数の読み取り・Node.js からの直接の通信
ブラウザを経由した外部への通信（ページ遷移やページ内のスクリプト）



BASE_URL の確認（check-base-url.mjs）
設定ミスで本番を開始地点にすること
リダイレクトや、その後の別サイトへの移動。本番を操作させたくない場合は、ネットワーク構成と「本番の認証情報を渡さない」ことで担保する


トークンをステップの env: だけで渡し、子プロセスの環境変数を絞る
同じジョブのほかのステップからの参照
エージェントを起動したプロセス自体からの参照。--secret-env-vars はシェル・MCP サーバーの環境から除くと --help に書かれているが、効果は未測定


Draft PR と人間のレビュー
上記の取りこぼしを最後に確認する
レビューの見落とし




 6-4. 検証状況
実プロジェクトで意図した受け入れ条件：①要件からテストが生成され検証環境で成功する、②Draft PR として届く、③壊したロケーターを Healer が修復する、④仕込んだプロダクトのバグは Healer に渡されずエスカレーションされる、⑤検証用のリソースが残らない。




確認できたこと
確認できていないこと




実プロジェクト・ローカル（2026-09-10、Playwright 1.56.1 / Copilot CLI 1.0.78）
高リスクの要件（認証まわり）で Planner が計画を作らずにエスカレーションした。通常の要件では Planner が検証環境を操作して計画を作った。Generator のテストがガードに拒否され（process.env の参照）、フィードバックを受けて再生成し、ガードを通過した。そのテストが検証環境で 3 回連続成功した
Healer の実行


実プロジェクト・GitHub Actions（2026-09-10〜11、CLI 1.0.78）
起動・入力の確認・接続先の確認・固定版 CLI の起動まで成功した

MCP サーバーがブロックされ、生成は完了しなかった（付録 B-2）。対策の PAT はローカルでのみ確認


このサンプル・ローカル（2026-09-25）
付録 A から作成した新しいディレクトリで、手順 3〜5-1 の実行。テスト 4 件・ツールのテスト 26 件の成功。上記の分類結果。修復ワークフローの判定 3 ステップの手元での実行。パッチ作成 → クリーンな環境への適用 → 退避したガード → テスト実行の流れ（エージェントの出力は手書きのファイルで代用）。ワークフローの構文チェック（actionlint）
AI エージェントの実行（5-2）、GitHub Actions での実行（5-3）、Environment の制限の実際の動作



受け入れ条件のうち、③と④をエンドツーエンドで確認したことはありません。

 まとめ


公式のエージェントができることを把握し、自分で制限を足す：公式の Healer は期待値の修正やテストのスキップもあり得る。無人で動かすなら、許す範囲を決めて機械的に強制する

エージェントの出力は信頼せず、別の環境で検証する：判定はトークンも書き込み権限もないジョブで行い、実行の境界は Environment とブランチ保護で守る

失敗した実行を成功に見せない：テストの終了コードとレポートの整合を確認し、分からないものは人間に返す

限界を明文化し、人間のレビューにつなぐ：ガードは既知のパターンしか検出できず、分類はヒューリスティック。できないことをテストとして残し、Draft PR のレビューで確認する


 参考

Playwright Test Agents（Playwright 公式ドキュメント）
Installing GitHub Copilot CLI（GitHub Docs）
Using GitHub Copilot CLI in GitHub Actions（GitHub Docs）
Events that trigger workflows: workflow_dispatch（GitHub Docs）



 付録 A：ファイル全文
手順 3 の ① と ③ で作成するファイルです。package-lock.json・.github/chatmodes/*・.vscode/mcp.json は、npm install と init-agents が生成します。
.gitignore
.gitignore
node_modules
test-results/
playwright-report/
.github/agents/
agent-output/


package.json
package.json
{
  "name": "e2e-agents-example",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "app": "node demo-app/server.mjs",
    "test:e2e": "playwright test",
    "test:tools": "node --test scripts/test/tools.test.mjs"
  },
  "devDependencies": {
    "@github/copilot": "1.0.78",
    "@playwright/test": "1.56.1",
    "typescript": "5.9.3"
  }
}


playwright.config.ts
playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests',
  retries: 0, // 失敗の分類に使うため、リトライはワークフロー側で制御する
  reporter: [['list'], ['json', { outputFile: 'test-results/report.json' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure', // 失敗時のトレースを分類の証拠に使う
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // BASE_URL を指定しない場合だけ、ローカルのデモアプリを起動する
  webServer: process.env.BASE_URL ? undefined : {
    command: 'node demo-app/server.mjs',
    url: baseURL,
    reuseExistingServer: true,
  },
});


demo-app/server.mjs
demo-app/server.mjs
// 検証用の最小デモアプリ（ログイン → ダッシュボード → ログアウト）
// DEMO_MODE で「UI 変更」「プロダクトのバグ」を再現できる:
//   normal          : 通常
//   renamed         : ログインボタンの文言を変更（テスト側の修正で直すべき変化）
//   bug-500         : ログイン API が 500 を返す（プロダクトのバグ）
//   bug-no-logout   : ログアウトボタンが消える（HTTP エラーを伴わないプロダクトのバグ）
//   reworded-error  : エラーメッセージの文言が変わる（仕様変更か不具合かは人間が判断すべき変化）
//   status-role     : エラー表示の role が alert → status に変わる（ロケーターの修正で直せる変化）
import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const MODE = process.env.DEMO_MODE || 'normal';
const USER = process.env.E2E_USER || 'demo';
const PASSWORD = process.env.E2E_PASSWORD || 'demo-pass';

const page = (title, body) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${title}</title></head>
<body><main>${body}</main></body></html>`;

const loginPage = () => page('ログイン', `
  <h1>ログイン</h1>
  <form id="login">
    <label>ユーザー名 <input name="username" autocomplete="username"></label>
    <label>パスワード <input name="password" type="password" autocomplete="current-password"></label>
    <button type="submit">${MODE === 'renamed' ? 'サインイン' : 'ログイン'}</button>
  </form>
  <p id="error" role="${MODE === 'status-role' ? 'status' : 'alert'}" hidden></p>
  <script>
    document.getElementById('login').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      if (res.ok) { location.href = '/dashboard'; return; }
      const error = document.getElementById('error');
      error.textContent = res.status === 401 ? '${MODE === 'reworded-error' ? '認証に失敗しました' : 'ユーザー名またはパスワードが違います'}' : 'エラーが発生しました';
      error.hidden = false;
    });
  </script>`);

const dashboardPage = () => page('ダッシュボード', `
  <h1>ダッシュボード</h1>
  <p>ようこそ、${USER} さん</p>
  ${MODE === 'bug-no-logout' ? '' : '<form method="post" action="/api/logout"><button type="submit">ログアウト</button></form>'}`);

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  const loggedIn = (req.headers.cookie || '').includes('session=ok');
  const html = (status, body) => { res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }); res.end(body); };

  if (req.method === 'GET' && req.url === '/') return html(200, loginPage());
  if (req.method === 'GET' && req.url === '/dashboard') {
    if (!loggedIn) { res.writeHead(302, { location: '/' }); return res.end(); }
    return html(200, dashboardPage());
  }
  if (req.method === 'POST' && req.url === '/api/login') {
    if (MODE === 'bug-500') { res.writeHead(500); return res.end('internal error'); }
    let body = {};
    try { body = JSON.parse(await readBody(req)); } catch { /* 空のまま */ }
    if (body.username === USER && body.password === PASSWORD) {
      res.writeHead(200, { 'set-cookie': 'session=ok; HttpOnly; Path=/; SameSite=Lax', 'content-type': 'application/json' });
      return res.end('{"ok":true}');
    }
    res.writeHead(401, { 'content-type': 'application/json' });
    return res.end('{"ok":false}');
  }
  if (req.method === 'POST' && req.url === '/api/logout') {
    res.writeHead(303, { 'set-cookie': 'session=; Max-Age=0; Path=/', location: '/' });
    return res.end();
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => console.log(`demo app (${MODE}) on http://127.0.0.1:${PORT}`));


tests/pages/LoginPage.ts
tests/pages/LoginPage.ts
import type { Page } from '@playwright/test';

// Page Object: 画面の要素の探し方（ロケーター）と操作をここに集約する。
// テスト本体（*.spec.ts）には page.getBy... を直接書かない。
export class LoginPage {
  constructor(private readonly page: Page) {}

  readonly username = this.page.getByLabel('ユーザー名');
  readonly password = this.page.getByLabel('パスワード');
  readonly submit = this.page.getByRole('button', { name: 'ログイン' });
  readonly errorMessage = this.page.getByRole('alert');

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }
}


tests/pages/DashboardPage.ts
tests/pages/DashboardPage.ts
import type { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  readonly heading = this.page.getByRole('heading', { name: 'ダッシュボード' });
  readonly logoutButton = this.page.getByRole('button', { name: 'ログアウト' });
}


tests/support/credentials.ts
tests/support/credentials.ts
// テスト用アカウント（人間が管理するファイル。エージェントには変更させない）
// 本番の権限を持たない、検証環境専用のアカウントを使うこと
export const testUser = {
  username: process.env.E2E_USER || 'demo',
  password: process.env.E2E_PASSWORD || 'demo-pass',
};


tests/seed.spec.ts
tests/seed.spec.ts
// seed テスト: エージェントがブラウザ操作を始める前の「初期状態」を作る。
// Planner / Generator はこのテストを実行してから探索・生成を始める。
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { testUser } from './support/credentials';

test.describe('seed', () => {
  test('seed', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(testUser.username, testUser.password);
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});


tests/login.spec.ts
tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { testUser } from './support/credentials';

test.describe('ログイン', () => {
  test('正しい認証情報でダッシュボードに遷移する', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(testUser.username, testUser.password);
    await expect(new DashboardPage(page).heading).toBeVisible();
  });

  test('誤ったパスワードではエラーが表示される', {
    // このテストでは 401 が「期待どおりの応答」。分類スクリプトに伝えるための注釈
    annotation: { type: 'expected-http', description: '401 /api/login' },
  }, async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(testUser.username, 'wrong-password');
    await expect(login.errorMessage).toHaveText('ユーザー名またはパスワードが違います');
    await expect(page).toHaveURL(/\/$/);
  });

  test('ログアウトするとログイン画面に戻る', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(testUser.username, testUser.password);
    await new DashboardPage(page).logoutButton.click();
    await expect(login.submit).toBeVisible();
  });
});


requirements/logout.md
requirements/logout.md
# ログアウト

## 前提
- テスト用アカウントでログイン済みであること（seed テストで準備される）

## 受け入れ条件
- AC-1: ダッシュボードで「ログアウト」を押すと、ログイン画面に戻る
- AC-2: ログアウト後に /dashboard を直接開くと、ログイン画面に戻される


prompts/plan.md
prompts/plan.md
あなたは承認済みの要件だけを根拠にテスト計画を作成します。

## 要件（{{REQUIREMENT_PATH}}）
{{REQUIREMENT}}

## 指示
- seed テストは tests/seed.spec.ts です。最初に planner_setup_page を実行してください。
- 上記の「受け入れ条件」だけを対象にしてください。書かれていない期待結果を追加しないでください。
- 各シナリオの見出しに、対応する受け入れ条件の番号（例: AC-1）を書いてください。
- 計画は specs/{{NAME}}.md に 1 ファイルだけ保存してください。ほかのファイルは作成・変更しないでください。


prompts/generate.md
prompts/generate.md
specs/{{NAME}}.md のテスト計画から Playwright テストを生成します。

## ルール（違反するとガードで拒否されます）
- テストは tests/{{NAME}}/ 配下に、シナリオごとに 1 ファイル（*.spec.ts）で作成する
- 要素の探し方（ロケーター）はテスト本体に書かず、tests/pages/ の Page Object を使う
  - 既存の Page Object を優先して再利用する。足りない場合だけ tests/pages/ に新しいファイルを追加する（既存ファイルは変更しない）
- テスト用アカウントは tests/support/credentials.ts の testUser を使う（process.env を直接読まない）
- test.skip / test.only / test.fixme / test.fail を使わない
- 各テストに expect を 1 つ以上書く

{{FEEDBACK}}


prompts/heal.md
prompts/heal.md
次のテストが失敗しています。失敗の分類結果（機械判定）は以下のとおりです。

{{CLASSIFICATION}}

## ルール（違反するとガードで拒否されます）
- 変更してよいのは tests/pages/ 配下の既存の Page Object だけ。テスト本体（*.spec.ts）は変更しない
- アサーション（expect）の追加・削除・変更をしない。test.fixme / test.skip を使わない
- 画面上に「同じ役割の要素」が見つからない場合は修正せず、最後に `ESCALATE: <理由>` と出力して終了する
  （例: ボタン自体が消えている → テストではなくアプリの問題の可能性がある）


scripts/run-agent.mjs
scripts/run-agent.mjs
#!/usr/bin/env node
// Playwright のエージェント定義（.github/chatmodes/<role>.chatmode.md）を
// Copilot CLI のカスタムエージェントに変換し、許可するツールを絞って非対話で実行する。
//
// 使い方（リポジトリのルートで実行）:
//   node scripts/run-agent.mjs --role planner --prompt prompts/plan.md \
//     --var NAME=logout --var-file REQUIREMENT=requirements/logout.md --var REQUIREMENT_PATH=requirements/logout.md
//   --dry-run を付けると Copilot CLI を起動せず、実行するコマンドだけを表示する
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = { vars: {}, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--dry-run') { args.dryRun = true; continue; }
    const value = argv[++i];
    if (key === '--role') args.role = value;
    else if (key === '--prompt') args.prompt = value;
    else if (key === '--var' || key === '--var-file') {
      const [name, ...rest] = value.split('=');
      const raw = rest.join('=');
      args.vars[name] = key === '--var-file' ? (fs.existsSync(raw) ? fs.readFileSync(raw, 'utf8') : '') : raw;
    } else throw new Error(`unknown option: ${key}`);
  }
  if (!['planner', 'generator', 'healer'].includes(args.role)) throw new Error('--role は planner / generator / healer');
  if (!args.prompt) throw new Error('--prompt が必要です');
  return args;
}

// chatmode の tools（VS Code 向けの名前）を Copilot CLI のツール名と許可ルールに変換する
const VSCODE_TO_CLI = {
  'search/fileSearch': 'glob', 'search/listDirectory': 'glob', 'search/textSearch': 'grep', 'search/readFile': 'view',
  'edit/createFile': 'create', 'edit/createDirectory': 'create', 'edit/editFiles': 'edit',
};

export function toolScope(chatmodeTools) {
  const available = new Set();
  const allow = new Set();
  for (const tool of chatmodeTools) {
    if (VSCODE_TO_CLI[tool]) {
      available.add(VSCODE_TO_CLI[tool]);
      if (['create', 'edit'].includes(VSCODE_TO_CLI[tool])) allow.add('write'); // ファイル書き込み（作業ディレクトリ内）
    } else if (/^playwright-test\/[a-z_]+$/.test(tool)) {
      available.add(tool);
      allow.add(tool.replace(/^playwright-test\/(.+)$/, 'playwright-test($1)')); // MCP ツールは 1 つずつ許可
    } else {
      throw new Error(`未対応のツール: ${tool}`);
    }
  }
  return { available: [...available], allow: [...allow] };
}

function readChatmode(role) {
  const dir = process.env.E2E_CHATMODES_DIR || path.join(ROOT, '.github/chatmodes');
  const text = fs.readFileSync(path.join(dir, `${role}.chatmode.md`), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error('chatmode の frontmatter が読めません');
  const description = /description:\s*(.+)/.exec(match[1])[1].trim();
  const tools = JSON.parse(/tools:\s*(\[.*\])/.exec(match[1])[1].replaceAll("'", '"'));
  return { description, tools, body: match[2] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const model = process.env.E2E_AGENT_MODEL;
  if (!model) throw new Error('E2E_AGENT_MODEL（使用するモデル名）を指定してください');

  let prompt = fs.readFileSync(args.prompt, 'utf8');
  for (const [name, value] of Object.entries(args.vars)) prompt = prompt.replaceAll(`{{${name}}}`, value);
  prompt = prompt.replace(/\{\{[A-Z_]+\}\}/g, ''); // 未指定のプレースホルダーは空にする

  const chatmode = readChatmode(args.role);
  const scope = toolScope(chatmode.tools);
  const agentName = `e2e-${args.role}`;

  // Copilot CLI はリポジトリの .github/agents/<name>.agent.md をカスタムエージェントとして読み込む
  const agentFile = path.join(ROOT, '.github/agents', `${agentName}.agent.md`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-agent-'));
  const mcpFile = path.join(tmp, 'mcp.json');
  fs.mkdirSync(path.dirname(agentFile), { recursive: true });
  fs.writeFileSync(agentFile, `---\nname: ${agentName}\ndescription: ${JSON.stringify(chatmode.description)}\ntools: ${JSON.stringify(scope.available)}\n---\n${chatmode.body}`);
  // Playwright の MCP サーバー。作業ディレクトリをリポジトリのルートに揃える（相対パスのずれを防ぐ）
  fs.writeFileSync(mcpFile, JSON.stringify({
    mcpServers: {
      'playwright-test': {
        command: path.join(ROOT, 'node_modules/.bin/playwright'),
        args: ['run-test-mcp-server', '--headless', '--config', path.join(ROOT, 'playwright.config.ts')],
        cwd: ROOT,
      },
    },
  }, null, 2));

  const cliArgs = [
    '-C', ROOT,
    '--agent', agentName,
    '--prompt', prompt,
    '--model', model,
    '--additional-mcp-config', `@${mcpFile}`,
    '--max-ai-credits', process.env.E2E_AGENT_MAX_CREDITS || '30',
    `--available-tools=${scope.available.join(',')}`, // モデルに見せるツールを限定
    ...scope.allow.map((rule) => `--allow-tool=${rule}`), // 確認なしで使ってよいツールを限定
    '--deny-tool=shell', // シェルコマンドは実行させない
    '--no-ask-user', // 質問で止まらない
    '--no-auto-update', // 固定したバージョンのまま動かす
    '--disable-builtin-mcps', // 組み込みの GitHub MCP サーバーを無効化
    '--secret-env-vars=COPILOT_GITHUB_TOKEN', // シェル / MCP サーバーの環境から除去し、出力でも伏せる
    '--no-color',
  ];

  // 子プロセスに渡す環境変数を明示的に絞る
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    CI: process.env.CI || '',
    COPILOT_GITHUB_TOKEN: process.env.COPILOT_GITHUB_TOKEN || '',
    COPILOT_AUTO_UPDATE: 'false',
    COPILOT_HOME: path.join(tmp, 'copilot-home'),
    BASE_URL: process.env.BASE_URL || '',
    E2E_USER: process.env.E2E_USER || '',
    E2E_PASSWORD: process.env.E2E_PASSWORD || '',
  };
  for (const key of Object.keys(env)) if (env[key] === '') delete env[key];

  try {
    if (args.dryRun) {
      console.log(JSON.stringify({ agentFile: path.relative(ROOT, agentFile), cli: 'node_modules/.bin/copilot', args: cliArgs.map((a) => (a === prompt ? '<prompt>' : a)), envKeys: Object.keys(env) }, null, 2));
      console.log('--- prompt ---\n' + prompt);
      return 0;
    }
    if (!env.COPILOT_GITHUB_TOKEN) throw new Error('COPILOT_GITHUB_TOKEN が必要です');
    const result = spawnSync(path.join(ROOT, 'node_modules/.bin/copilot'), cliArgs, { cwd: ROOT, env, stdio: 'inherit' });
    return result.status ?? 1;
  } finally {
    fs.rmSync(agentFile, { force: true });
    if (!fs.readdirSync(path.dirname(agentFile)).length) fs.rmdirSync(path.dirname(agentFile));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`run-agent: ${error.message}`);
  process.exitCode = 1;
}


scripts/guard.mjs
scripts/guard.mjs
#!/usr/bin/env node
// エージェントが作業ツリーに加えた変更（HEAD との差分）を機械的に検査するガード。
// テストの「意味」が保たれていることは証明できない。検出できるのは下記の既知パターンだけで、
// 最終判断は Draft PR のレビュー（Gate 2）で人間が行う。
// 例: 各 test() の本体に expect 呼び出しが「書かれているか」は見るが、それが実行されるか・妥当かは見ない。
//
// 使い方: node guard.mjs --actor generator|healer   （リポジトリのルートで実行）
// 終了コード: 0 = 通過 / 1 = 違反あり（違反内容は標準出力に JSON で出力）
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ts = createRequire(path.join(process.cwd(), 'package.json'))('typescript');

// 役割ごとに「触ってよいファイル」と「許す変更の種類」（A=追加 / M=変更）を決める
const PATH_RULES = {
  generator: { status: 'A', allowed: [/^specs\/[a-z0-9-]+\.md$/, /^tests\/(?!seed\.spec\.ts$)[a-z0-9/-]+\.spec\.ts$/, /^tests\/pages\/[A-Za-z0-9]+\.ts$/] },
  healer: { status: 'M', allowed: [/^tests\/pages\/[A-Za-z0-9]+\.ts$/] },
};
const SPEC = /\.spec\.ts$/;
const PAGE_OBJECT = /^tests\/pages\//;
const BLOCKED_MODIFIERS = new Set(['skip', 'only', 'fixme', 'fail']);
const NODE_BUILTINS = new Set(['fs', 'child_process', 'os', 'net', 'http', 'https', 'dns', 'vm', 'worker_threads', 'process']);
const DIRECT_LOCATOR = /^(locator|getBy[A-Z]\w*|\$\$?)$/;

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

// 作業ツリーの変更を HEAD と比較して列挙する（.gitignore 対象は含まない）
export function collectChanges() {
  git(['add', '-A']);
  const tokens = git(['diff', '--cached', '--name-status', '--no-renames', '-z', 'HEAD']).split('\0').filter(Boolean);
  const changes = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const [status, file] = [tokens[i], tokens[i + 1]];
    const before = status === 'A' ? null : git(['show', `HEAD:${file}`]);
    const after = status === 'D' ? null : fs.readFileSync(file, 'utf8');
    changes.push({ status, file, before, after });
  }
  return changes;
}

// TypeScript の構文木（AST）を走査して、禁止パターンを探す
export function analyze(source, file) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = { modifiers: [], aliases: [], forbidden: [], directLocators: [], expectCalls: 0, tests: 0, testsWithoutExpect: [] };
  const line = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const isExpectCall = (node) => ts.isCallExpression(node) && (
    (ts.isIdentifier(node.expression) && node.expression.text === 'expect')
    || (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'expect'));
  const containsExpect = (node) => isExpectCall(node) || Boolean(ts.forEachChild(node, (child) => containsExpect(child) || undefined));

  function visit(node) {
    // import { expect as check } / import { test as t } … 別名で差し替えられるのを防ぐ
    if (ts.isImportDeclaration(node)) {
      const moduleName = node.moduleSpecifier.text;
      const bare = moduleName.replace(/^node:/, '').split('/')[0];
      if (moduleName.startsWith('node:') || NODE_BUILTINS.has(bare)) found.forbidden.push(`import '${moduleName}' (L${line(node)})`);
      for (const el of node.importClause?.namedBindings?.elements || []) {
        const imported = el.propertyName?.text;
        if (imported === 'expect' || imported === 'test') found.aliases.push(`${imported} as ${el.name.text} (L${line(node)})`);
      }
    }
    // const check = expect / let expect = … / function expect() … … シャドーイング（同名で上書き）や別名
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isParameter(node)) && node.name && ts.isIdentifier(node.name)) {
      if (['expect', 'test'].includes(node.name.text)) found.aliases.push(`${node.name.text} を再定義 (L${line(node)})`);
    }
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.initializer) && ['expect', 'test'].includes(node.initializer.text)) {
      found.aliases.push(`${node.initializer.text} を別名に代入 (L${line(node)})`);
    }
    // test.skip / test.describe.only / test['fixme'] など
    if (ts.isPropertyAccessExpression(node) && BLOCKED_MODIFIERS.has(node.name.text) && /^test(\.describe)?$/.test(node.expression.getText(sf))) {
      found.modifiers.push(`${node.getText(sf)} (L${line(node)})`);
    }
    if (ts.isElementAccessExpression(node) && /^test(\.describe)?$/.test(node.expression.getText(sf))) {
      found.modifiers.push(`計算プロパティ ${node.getText(sf)} (L${line(node)})`);
    }
    // require() / import() / eval() / process.* … 実行環境の操作や情報の持ち出し経路
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword) found.forbidden.push(`動的 import (L${line(node)})`);
      if (ts.isIdentifier(callee) && ['require', 'eval', 'fetch'].includes(callee.text)) found.forbidden.push(`${callee.text}() (L${line(node)})`);
      if (isExpectCall(node)) found.expectCalls += 1;
      // test('名前', async () => { ... }) の本体ごとに expect 呼び出しが書かれているか（構文上の確認のみ）
      if (ts.isIdentifier(callee) && callee.text === 'test') {
        found.tests += 1;
        const body = [...node.arguments].reverse().find((arg) => ts.isFunctionLike(arg));
        if (!body || !containsExpect(body)) found.testsWithoutExpect.push(`L${line(node)}`);
      }
      // page.getByRole(...) などをテスト本体に直接書かない（ロケーターは Page Object に集約）
      if (ts.isPropertyAccessExpression(callee) && callee.expression.getText(sf) === 'page' && DIRECT_LOCATOR.test(callee.name.text)) {
        found.directLocators.push(`${callee.getText(sf)} (L${line(node)})`);
      }
    }
    if (ts.isIdentifier(node) && ['process', 'globalThis'].includes(node.text)) found.forbidden.push(`${node.text} の参照 (L${line(node)})`);
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return found;
}

export function guard(changes, actor) {
  const rule = PATH_RULES[actor];
  if (!rule) throw new Error(`unknown actor: ${actor}`);
  const violations = [];
  for (const { status, file, before, after } of changes) {
    if (status !== rule.status || !rule.allowed.some((re) => re.test(file))) {
      violations.push(`${actor} は ${file} を変更できない（status=${status}）`);
      continue;
    }
    if (!file.endsWith('.ts') || after == null) continue;
    const a = analyze(after, file);
    const b = before == null ? null : analyze(before, file);
    for (const item of a.aliases) violations.push(`${file}: expect/test の別名・再定義: ${item}`);
    for (const item of a.forbidden) violations.push(`${file}: 禁止された API: ${item}`);
    if (a.modifiers.length > (b?.modifiers.length || 0)) violations.push(`${file}: skip/only/fixme/fail の追加: ${a.modifiers.join(', ')}`);
    if (SPEC.test(file)) {
      if (a.directLocators.length) violations.push(`${file}: テスト本体に直接ロケーター: ${a.directLocators.join(', ')}`);
      if (a.tests === 0) violations.push(`${file}: test() が 1 つもない`);
      if (a.testsWithoutExpect.length) violations.push(`${file}: expect を含まない test(): ${a.testsWithoutExpect.join(', ')}`);
    }
    if (PAGE_OBJECT.test(file) && a.expectCalls > 0) violations.push(`${file}: Page Object にアサーションは書けない`);
  }
  return { ok: violations.length === 0, actor, checked: changes.map((c) => `${c.status} ${c.file}`), violations: [...new Set(violations)] };
}

// シンボリックリンク経由（macOS の /tmp など）でも「直接実行された」と判定できるよう実パスで比較する
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const actor = process.argv[process.argv.indexOf('--actor') + 1];
  const changes = collectChanges();
  const result = changes.length ? guard(changes, actor) : { ok: false, actor, checked: [], violations: ['変更がない'] };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}


scripts/classify.mjs
scripts/classify.mjs
#!/usr/bin/env node
// 失敗したテストを「Healer に渡してよいか」「人間にエスカレーションするか」に振り分ける。
// これはヒューリスティック（経験則）であり、テスト側の問題とプロダクトのバグを完全には区別できない。
// 迷ったら（証拠がない・読めない・想定外の形式）エスカレーション側に倒す。
//
// 使い方: node scripts/classify.mjs test-results/report.json --test-exit-code 1 > classification.json
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Playwright のエラーメッセージのうち「要素が見つからない / 待ちきれない」系
const LOCATOR_LIKE = /(locator\.|waiting for|timeout|timed out|element.*(not found|detached))/i;
// 要素は見つかったが値が違う（= 期待値の不一致）。Web-first アサーションは待機するため
// タイムアウト系の文言も含むが、これはロケーターの問題ではない
const VALUE_MISMATCH = /unexpected value/i;
const ANSI = /\u001b\[[0-9;]*m/g;

// テストに付けた注釈 { type: 'expected-http', description: '401 /api/login' } を読む
function expectedResponses(annotations = []) {
  return annotations
    .filter((a) => a.type === 'expected-http')
    .map((a) => {
      const [status, path] = String(a.description || '').trim().split(/\s+/);
      return { status: Number(status), path };
    });
}

// トレース（zip）内の *.network から HTTP 4xx/5xx を抜き出す
export function httpFailuresFromTrace(tracePath) {
  if (!tracePath || !fs.existsSync(tracePath)) return null;
  const list = spawnSync('unzip', ['-Z1', tracePath], { encoding: 'utf8' });
  if (list.status !== 0) return null;
  const entries = list.stdout.split('\n').filter((name) => name.endsWith('.network'));
  if (!entries.length) return null;
  const failures = [];
  for (const entry of entries) {
    const out = spawnSync('unzip', ['-p', tracePath, entry], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
    if (out.status !== 0) return null;
    for (const line of out.stdout.split('\n')) {
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); } catch { return null; }
      const status = event.snapshot?.response?.status;
      const url = event.snapshot?.request?.url;
      if (typeof status === 'number' && status >= 400) failures.push({ status, path: url ? new URL(url).pathname : '?' });
    }
  }
  return failures;
}

export function classifyTest(test, { readTrace = httpFailuresFromTrace } = {}) {
  const reasons = [];
  const last = test.results.at(-1) || {};
  const messages = (last.errors || []).map((e) => (e.message || '').replace(ANSI, ''));
  const tags = test.tags || [];

  if (tags.includes('@no-heal')) reasons.push('@no-heal タグ付きのテスト');
  if (test.status === 'flaky') reasons.push('リトライで成功した（不安定なテスト）');
  if (!messages.length) reasons.push('エラー情報がない');
  else if (messages.some((m) => VALUE_MISMATCH.test(m))) reasons.push('要素は見つかったが期待値と一致しない');
  else if (!messages.every((m) => LOCATOR_LIKE.test(m))) reasons.push('ロケーター/タイムアウト以外のエラーを含む');

  const trace = last.attachments?.find((a) => a.name === 'trace')?.path;
  const httpFailures = readTrace(trace);
  if (httpFailures === null) reasons.push('トレースがない、または読めない');
  else {
    const expected = expectedResponses(test.annotations);
    const unexpected = httpFailures.filter((f) => !expected.some((e) => e.status === f.status && e.path === f.path));
    if (unexpected.length) reasons.push(`想定外の HTTP エラー: ${unexpected.map((f) => `${f.status} ${f.path}`).join(', ')}`);
  }
  return { action: reasons.length ? 'escalate' : 'heal', reasons };
}

function collectTests(suite, file = suite.file) {
  const own = (suite.specs || []).flatMap((spec) => spec.tests.map((test) => ({ ...test, file: spec.file, title: spec.title, tags: spec.tags })));
  return [...own, ...(suite.suites || []).flatMap((child) => collectTests(child, file))];
}

// 実行全体として信頼できる結果か（テストが実際に走り、レポートと終了コードが矛盾しないか）を先に確認する
function runIssues(report, testExitCode) {
  const issues = [];
  if (!Number.isInteger(testExitCode)) issues.push('テストコマンドの終了コードが不明');
  if (!report || !Array.isArray(report.suites) || !report.stats) return [...issues, 'レポートの形式が不正'];
  for (const error of report.errors || []) issues.push(`実行全体のエラー: ${(error.message || '').replace(ANSI, '').split('\n')[0]}`);
  const { expected = 0, unexpected = 0, flaky = 0 } = report.stats;
  if (expected + unexpected + flaky === 0) issues.push('実行されたテストが 1 件もない');
  return issues;
}

export function classifyReport(report, { testExitCode, ...options } = {}) {
  const issues = runIssues(report, testExitCode);
  if (issues.length) return { decision: 'escalate', runIssues: issues, results: [] };

  const tests = report.suites.flatMap((s) => collectTests(s));
  const failed = tests.filter((t) => t.status !== 'expected' && t.status !== 'skipped');
  const unexpected = failed.filter((t) => t.status === 'unexpected').length;
  if (unexpected !== report.stats.unexpected) issues.push('レポート内の失敗件数が集計と一致しない');
  if (testExitCode !== 0 && failed.length === 0) issues.push('終了コードは失敗なのに、失敗したテストが見つからない');
  if (testExitCode === 0 && unexpected > 0) issues.push('終了コードは成功なのに、失敗したテストがある');
  if (issues.length) return { decision: 'escalate', runIssues: issues, results: [] };

  const results = failed.map((t) => ({ file: t.file, title: t.title, ...classifyTest(t, options) }));
  return {
    // 1 件でもエスカレーション対象があれば、全体を人間に返す（部分的に直して「成功」に見せない）
    decision: results.length === 0 ? 'pass' : results.every((r) => r.action === 'heal') ? 'heal' : 'escalate',
    runIssues: [],
    results,
  };
}

// 使い方: node scripts/classify.mjs <report.json> --test-exit-code <playwright test の終了コード>
// 結果（decision: pass / heal / escalate）を JSON で出力する。レポートを読めない場合も escalate を出力する
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [reportPath] = process.argv.slice(2);
  const flag = process.argv.indexOf('--test-exit-code');
  const raw = flag > 0 ? process.argv[flag + 1] : undefined;
  const testExitCode = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : undefined;
  let result;
  try {
    result = classifyReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), { testExitCode });
  } catch (error) {
    result = { decision: 'escalate', runIssues: [`レポートを読めない: ${error.message}`], results: [] };
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}


scripts/check-base-url.mjs
scripts/check-base-url.mjs
#!/usr/bin/env node
// エージェントが最初に開く URL（BASE_URL）が検証環境であることを確認する。
// 確認できるのは「開始地点」だけ。リダイレクトや、エージェントがその後にブラウザで
// 別のサイトへ移動することまでは防げない。
// 使い方: BASE_URL=... E2E_ALLOWED_HOSTS=dev.example.com,127.0.0.1 node scripts/check-base-url.mjs
const raw = process.env.BASE_URL || 'http://127.0.0.1:3000';
const allowed = (process.env.E2E_ALLOWED_HOSTS || '127.0.0.1,localhost').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
let url;
try { url = new URL(raw); } catch { console.error(`BASE_URL が URL ではありません: ${raw}`); process.exit(1); }
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
  console.error(`BASE_URL の形式が不正です: ${raw}`); process.exit(1);
}
if (!allowed.includes(url.hostname.toLowerCase())) {
  console.error(`BASE_URL のホスト ${url.hostname} は許可リストにありません`); process.exit(1);
}
console.log(`BASE_URL OK: ${url.origin}`);


scripts/test/tools.test.mjs
scripts/test/tools.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { guard } from '../guard.mjs';
import { classifyReport, classifyTest } from '../classify.mjs';

const GOOD_SPEC = `import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
test('ログアウト', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await expect(login.submit).toBeVisible();
});
`;

const add = (file, after) => ({ status: 'A', file, before: null, after });
const modify = (file, before, after) => ({ status: 'M', file, before, after });

test('generator: 規約どおりの新規テストは通過する', () => {
  assert.equal(guard([add('tests/logout/logout.spec.ts', GOOD_SPEC)], 'generator').ok, true);
});

for (const [name, source] of [
  ['test.skip', GOOD_SPEC.replace("test('", "test.skip('")],
  ['計算プロパティ test["only"]', GOOD_SPEC.replace("test('", "test['only']('")],
  ['expect の別名 import', GOOD_SPEC.replace('{ test, expect }', '{ test, expect as check }')],
  ['expect のシャドーイング', GOOD_SPEC.replace("test('ログアウト'", 'const expect = (v) => ({ toBeVisible: async () => {} });\ntest(\'ログアウト\'')],
  ['process.env の参照', GOOD_SPEC.replace('await login.goto();', 'await login.goto(); console.log(process.env.E2E_PASSWORD);')],
  ['Node 組み込みモジュール', `import fs from 'node:fs';\n${GOOD_SPEC}`],
  ['テスト本体の直接ロケーター', GOOD_SPEC.replace('login.submit', "page.getByRole('button')")],
  ['アサーションなし', GOOD_SPEC.replace('  await expect(login.submit).toBeVisible();\n', '')],
  ['expect のない test() が混ざっている', `${GOOD_SPEC}test('空のテスト', async ({ page }) => {\n  await page.goto('/');\n});\n`],
  ['test() が 1 つもない', "import { test, expect } from '@playwright/test';\n"],
]) {
  test(`generator: ${name} を拒否する`, () => {
    const result = guard([add('tests/logout/logout.spec.ts', source)], 'generator');
    assert.equal(result.ok, false, JSON.stringify(result));
  });
}

test('generator: 既存ファイルの変更・対象外パスへの追加を拒否する', () => {
  assert.equal(guard([modify('tests/login.spec.ts', GOOD_SPEC, GOOD_SPEC + '\n')], 'generator').ok, false);
  assert.equal(guard([add('.github/workflows/x.yml', 'on: push')], 'generator').ok, false);
  assert.equal(guard([add('tests/support/credentials.ts', 'export {}')], 'generator').ok, false);
});

const PAGE = `import type { Page } from '@playwright/test';
export class LoginPage {
  constructor(private readonly page: Page) {}
  readonly submit = this.page.getByRole('button', { name: 'ログイン' });
}
`;

test('healer: Page Object のロケーター修正は通過する', () => {
  const after = PAGE.replace("name: 'ログイン'", "name: 'サインイン'");
  assert.equal(guard([modify('tests/pages/LoginPage.ts', PAGE, after)], 'healer').ok, true);
});

test('healer: テスト本体の変更と Page Object へのアサーション追加を拒否する', () => {
  assert.equal(guard([modify('tests/login.spec.ts', GOOD_SPEC, GOOD_SPEC.replace('toBeVisible', 'toBeAttached'))], 'healer').ok, false);
  const withExpect = PAGE.replace("import type { Page } from '@playwright/test';", "import { expect, type Page } from '@playwright/test';")
    .replace('  readonly submit', '  async check() { await expect(this.submit).toBeVisible(); }\n  readonly submit');
  assert.equal(guard([modify('tests/pages/LoginPage.ts', PAGE, withExpect)], 'healer').ok, false);
});

test('限界: Page Object の中で別の要素を指すように変えても、ガードは検出できない', () => {
  // 「ログアウト」ボタンが消えたのに、別のボタンを指すよう書き換えてテストを通す — 意味は変わるが構文上は正当
  const before = PAGE.replace("name: 'ログイン'", "name: 'ログアウト'");
  const after = PAGE.replace("getByRole('button', { name: 'ログイン' })", "getByRole('button').first()");
  assert.equal(guard([modify('tests/pages/LoginPage.ts', before, after)], 'healer').ok, true);
});

const failure = (message, extra = {}) => ({
  status: 'unexpected',
  annotations: [],
  results: [{ errors: [{ message }], attachments: [{ name: 'trace', path: 'trace.zip' }] }],
  ...extra,
});
const LOCATOR_TIMEOUT = "locator.click: Test timeout of 5000ms exceeded.\n  - waiting for getByRole('button', { name: 'ログイン' })";

test('classify: HTTP エラーのないロケーター待ちは heal', () => {
  assert.equal(classifyTest(failure(LOCATOR_TIMEOUT), { readTrace: () => [] }).action, 'heal');
});

test('classify: 想定外の 500 は escalate', () => {
  const r = classifyTest(failure(LOCATOR_TIMEOUT), { readTrace: () => [{ status: 500, path: '/api/login' }] });
  assert.equal(r.action, 'escalate');
});

test('classify: 注釈で宣言した 401 は想定内として扱い、宣言がなければ escalate', () => {
  const trace = { readTrace: () => [{ status: 401, path: '/api/login' }] };
  const annotated = failure(LOCATOR_TIMEOUT, { annotations: [{ type: 'expected-http', description: '401 /api/login' }] });
  assert.equal(classifyTest(annotated, trace).action, 'heal');
  assert.equal(classifyTest(failure(LOCATOR_TIMEOUT), trace).action, 'escalate');
});

test('classify: トレースがない・期待値の不一致・@no-heal は escalate', () => {
  assert.equal(classifyTest(failure(LOCATOR_TIMEOUT), { readTrace: () => null }).action, 'escalate');
  assert.equal(classifyTest(failure('expect(locator).toHaveText(expected) failed\n  - unexpected value "認証に失敗しました"'), { readTrace: () => [] }).action, 'escalate');
  assert.equal(classifyTest(failure(LOCATOR_TIMEOUT, { tags: ['@no-heal'] }), { readTrace: () => [] }).action, 'escalate');
});

test('限界: ボタンが消えるバグ（HTTP エラーなし）は heal に分類されてしまう', () => {
  const noButton = "locator.click: Test timeout of 5000ms exceeded.\n  - waiting for getByRole('button', { name: 'ログアウト' })";
  assert.equal(classifyTest(failure(noButton), { readTrace: () => [] }).action, 'heal');
});

// --- 実行全体の判定（失敗した実行を「成功」に見せない） ---
const passedTest = { title: 'ok', file: 'a.spec.ts', tags: [], tests: [{ status: 'expected', annotations: [], results: [{ errors: [], attachments: [] }] }] };
const failedTest = { title: 'ng', file: 'a.spec.ts', tags: [], tests: [{ status: 'unexpected', annotations: [], results: [{ errors: [{ message: LOCATOR_TIMEOUT }], attachments: [] }] }] };
const report = (specs, stats, errors = []) => ({ suites: [{ file: 'a.spec.ts', specs, suites: [] }], stats, errors });
const noTrace = { readTrace: () => [] };

test('report: 全テスト成功・終了コード 0 だけが pass', () => {
  assert.equal(classifyReport(report([passedTest], { expected: 1, unexpected: 0, flaky: 0 }), { testExitCode: 0 }).decision, 'pass');
});

test('report: 「No tests found」（テスト 0 件＋実行全体のエラー）は escalate', () => {
  const r = classifyReport({ suites: [], stats: { expected: 0, unexpected: 0, flaky: 0 }, errors: [{ message: 'Error: No tests found.' }] }, { testExitCode: 1 });
  assert.equal(r.decision, 'escalate');
  assert.ok(r.runIssues.some((i) => i.includes('No tests found')));
});

test('report: 構文エラーなど実行全体のエラーがあれば、個々のテストが成功でも escalate', () => {
  const r = classifyReport(report([passedTest], { expected: 1, unexpected: 0, flaky: 0 }, [{ message: 'SyntaxError: x' }]), { testExitCode: 1 });
  assert.equal(r.decision, 'escalate');
});

test('report: 終了コードが失敗なのに失敗テストがない / 終了コード不明 / 形式不正は escalate', () => {
  const ok = report([passedTest], { expected: 1, unexpected: 0, flaky: 0 });
  assert.equal(classifyReport(ok, { testExitCode: 1 }).decision, 'escalate');
  assert.equal(classifyReport(ok, {}).decision, 'escalate');
  assert.equal(classifyReport({}, { testExitCode: 0 }).decision, 'escalate');
});

test('report: 終了コード 0 なのに失敗テストがある・件数が集計と合わない場合は escalate', () => {
  assert.equal(classifyReport(report([failedTest], { expected: 0, unexpected: 1, flaky: 0 }), { testExitCode: 0, ...noTrace }).decision, 'escalate');
  assert.equal(classifyReport(report([failedTest], { expected: 0, unexpected: 2, flaky: 0 }), { testExitCode: 1, ...noTrace }).decision, 'escalate');
});

test('report: ロケーター系の失敗だけで整合していれば heal', () => {
  assert.equal(classifyReport(report([passedTest, failedTest], { expected: 1, unexpected: 1, flaky: 0 }), { testExitCode: 1, ...noTrace }).decision, 'heal');
});


.github/actions/setup/action.yml
.github/actions/setup/action.yml
name: Setup E2E
description: Node.js 22 と依存パッケージ、Chromium をインストールする
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: npm
    - run: npm ci
      shell: bash
    - run: npx playwright install --with-deps chromium
      shell: bash
    - name: Copilot CLI のバージョンを確認（自動更新を無効にして固定版を使う）
      run: COPILOT_AUTO_UPDATE=false node_modules/.bin/copilot --no-auto-update --version
      shell: bash


.github/workflows/e2e-generate.yml
.github/workflows/e2e-generate.yml
# 承認済みの要件（requirements/<name>.md、main にマージ済み = Gate 1）から
# テスト計画とテストを生成し、検証を通ったものだけを Draft PR にする（Gate 2 へ）。
name: E2E generate

on:
  workflow_dispatch:
    inputs:
      requirement:
        description: 'requirements/ 配下の要件ファイル名（拡張子なし。例: logout）'
        required: true

permissions: {}

concurrency:
  group: e2e-agents
  cancel-in-progress: false

env:
  NAME: ${{ inputs.requirement }}
  DEMO_MODE: ${{ vars.DEMO_MODE }} # デモアプリ用（実アプリでは不要）

jobs:
  # 1. エージェントを動かすジョブ。成果物は「信頼しない」前提で、パッチとして次のジョブに渡す
  agent:
    runs-on: ubuntu-latest
    environment: e2e-dev
    permissions:
      contents: read
    timeout-minutes: 45
    env:
      BASE_URL: ${{ vars.E2E_BASE_URL }}
      E2E_USER: ${{ secrets.E2E_USER }}
      E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
      E2E_AGENT_MODEL: ${{ vars.E2E_AGENT_MODEL }}
    steps:
      # 承認済みの要件 = main にマージ済みのもの。main 以外からの手動実行は拒否する
      # （workflow_dispatch は任意のブランチを選んで実行でき、そのブランチのワークフロー定義が使われる。
      #   そのため本当の境界は Environment の「main のみ」設定。この確認は早期に止めるためのもの）
      - name: main ブランチからの実行か確認
        if: github.ref != 'refs/heads/main'
        run: |
          echo "::error::main ブランチからのみ実行できます（実行元: $GITHUB_REF）"
          exit 1
      - name: 入力を検証
        run: |
          [[ "$NAME" =~ ^[a-z0-9-]+$ ]] || { echo "::error::要件名が不正です: $NAME"; exit 1; }
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }} # すべてのジョブで同じコミットを使う
          persist-credentials: false
      - run: test -f "requirements/$NAME.md" || { echo "::error::requirements/$NAME.md がありません"; exit 1; }
      - uses: ./.github/actions/setup
      - name: 接続先 URL を確認
        env:
          E2E_ALLOWED_HOSTS: ${{ vars.E2E_ALLOWED_HOSTS }}
        run: node scripts/check-base-url.mjs
      - name: デモアプリを起動（E2E_BASE_URL 未設定のとき）
        if: vars.E2E_BASE_URL == ''
        run: |
          nohup node demo-app/server.mjs > "$RUNNER_TEMP/demo-app.log" 2>&1 &
          for _ in $(seq 30); do curl -sf http://127.0.0.1:3000/ >/dev/null && exit 0; sleep 1; done
          cat "$RUNNER_TEMP/demo-app.log"; exit 1

      - name: Planner（テスト計画を作成）
        env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_PAT }} # このステップだけに渡す
        run: |
          node scripts/run-agent.mjs --role planner --prompt prompts/plan.md \
            --var NAME="$NAME" --var REQUIREMENT_PATH="requirements/$NAME.md" \
            --var-file REQUIREMENT="requirements/$NAME.md"
          test -f "specs/$NAME.md" || { echo "::error::specs/$NAME.md が作成されませんでした"; exit 1; }

      - name: Generator（テスト生成 → ガード → 実行。最大 3 回）
        env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_PAT }}
        run: |
          # 作業ファイルはリポジトリの外（RUNNER_TEMP）に置く。リポジトリ内に置くとガードの検査対象になる
          fb="$RUNNER_TEMP/feedback.md"; : > "$fb"
          for attempt in 1 2 3; do
            echo "::group::attempt $attempt"
            node scripts/run-agent.mjs --role generator --prompt prompts/generate.md \
              --var NAME="$NAME" --var-file FEEDBACK="$fb" || true
            if ! node scripts/guard.mjs --actor generator > "$RUNNER_TEMP/guard.json"; then
              { echo "## 前回の出力はガードに拒否されました。次の違反を直してください"; cat "$RUNNER_TEMP/guard.json"; } > "$fb"
            elif ! npx playwright test "tests/$NAME" --retries=0 > "$RUNNER_TEMP/test.log" 2>&1; then
              { echo "## 前回生成したテストが失敗しました"; tail -n 60 "$RUNNER_TEMP/test.log"; } > "$fb"
            else
              echo "::endgroup::"; exit 0
            fi
            cat "$fb"; echo "::endgroup::"
          done
          echo "::error::3 回試しても条件を満たすテストを生成できませんでした"; exit 1

      - name: パッチを作成
        run: |
          git add -A specs tests
          git diff --cached --binary "$GITHUB_SHA" > agent.patch
          git diff --cached --stat "$GITHUB_SHA"
          test -s agent.patch
      - uses: actions/upload-artifact@v4
        with:
          name: agent-patch
          path: agent.patch
          retention-days: 3

  # 2. クリーンな環境で検証するジョブ（トークンなし）。ここでの判定を正とする
  verify:
    needs: agent
    runs-on: ubuntu-latest
    environment: e2e-dev # テスト用アカウントのため（Copilot のトークンは使わない）
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }} # すべてのジョブで同じコミットを使う
          persist-credentials: false
      - uses: ./.github/actions/setup
      - uses: actions/download-artifact@v4
        with:
          name: agent-patch
      - name: パッチを適用してガードを実行
        run: |
          cp -R scripts "$RUNNER_TEMP/trusted-scripts" # パッチ適用「前」のガードを使う
          git apply --index agent.patch && rm agent.patch
          node "$RUNNER_TEMP/trusted-scripts/guard.mjs" --actor generator
      - name: 接続先 URL を確認
        env:
          BASE_URL: ${{ vars.E2E_BASE_URL }}
          E2E_ALLOWED_HOSTS: ${{ vars.E2E_ALLOWED_HOSTS }}
        run: node "$RUNNER_TEMP/trusted-scripts/check-base-url.mjs"
      - name: 生成されたテストを 3 回連続で実行
        env:
          BASE_URL: ${{ vars.E2E_BASE_URL }}
          E2E_USER: ${{ secrets.E2E_USER }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
        run: npx playwright test "tests/$NAME" --retries=0 --repeat-each=3

  # 3. Draft PR を作るジョブ。書き込み権限はここだけに与える
  pull-request:
    needs: verify
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }}
      - uses: actions/download-artifact@v4
        with:
          name: agent-patch
      - name: Draft PR を作成
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          branch="e2e-agent/generate-$NAME-$GITHUB_RUN_ID"
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git switch -c "$branch"
          git apply --index agent.patch && rm agent.patch
          git commit -m "test(e2e): generate tests for $NAME"
          git push origin "$branch"
          gh pr create --draft --base main --head "$branch" \
            --title "[E2E agent] $NAME のテストを生成" \
            --body "要件: requirements/$NAME.md（コミット $GITHUB_SHA）
          実行: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID
          ガードと 3 回連続の実行を通過済み（品質の保証ではありません）。計画（specs/$NAME.md）と要件の対応、各アサーションの妥当性を確認してください。"


.github/workflows/e2e-heal.yml
.github/workflows/e2e-heal.yml
# E2E を実行し、失敗が「Healer に渡してよい」と分類された場合だけ修復を試みる。
# 修復結果は検証を通ったものだけを Draft PR にする。それ以外は人間にエスカレーションする。
name: E2E heal

on:
  workflow_dispatch:
  schedule:
    - cron: '0 1 * * 1-5' # 平日 10:00 JST

permissions: {}

concurrency:
  group: e2e-agents
  cancel-in-progress: false

env:
  DEMO_MODE: ${{ vars.DEMO_MODE }} # デモアプリ用（実アプリでは不要）

jobs:
  # 1. テストを実行して失敗を分類する（トークンなし）
  test:
    runs-on: ubuntu-latest
    environment: e2e-dev
    permissions:
      contents: read
    outputs:
      decision: ${{ steps.classify.outputs.decision }}
    env:
      BASE_URL: ${{ vars.E2E_BASE_URL }}
      E2E_USER: ${{ secrets.E2E_USER }}
      E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
    steps:
      # 承認済みの要件 = main にマージ済みのもの。main 以外からの手動実行は拒否する
      # （workflow_dispatch は任意のブランチを選んで実行でき、そのブランチのワークフロー定義が使われる。
      #   そのため本当の境界は Environment の「main のみ」設定。この確認は早期に止めるためのもの）
      - name: main ブランチからの実行か確認
        if: github.ref != 'refs/heads/main'
        run: |
          echo "::error::main ブランチからのみ実行できます（実行元: $GITHUB_REF）"
          exit 1
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }} # すべてのジョブで同じコミットを使う
          persist-credentials: false
      - uses: ./.github/actions/setup
      - name: 接続先 URL を確認
        env:
          E2E_ALLOWED_HOSTS: ${{ vars.E2E_ALLOWED_HOSTS }}
        run: node scripts/check-base-url.mjs
      - name: E2E を実行（終了コードを記録して次へ進む）
        id: e2e
        run: |
          rm -rf test-results # 前回のレポートを読まないように消しておく
          set +e
          npx playwright test --retries=0
          echo "exit-code=$?" >> "$GITHUB_OUTPUT"
      - name: 結果を分類（成功時も含めて必ず実行）
        id: classify
        env:
          TEST_EXIT_CODE: ${{ steps.e2e.outputs.exit-code }}
        run: |
          node scripts/classify.mjs test-results/report.json --test-exit-code "$TEST_EXIT_CODE" > classification.json
          cat classification.json
          echo "decision=$(node -p 'require("./classification.json").decision')" >> "$GITHUB_OUTPUT"
      - name: 判定（pass と heal 以外はすべて失敗扱い）
        env:
          DECISION: ${{ steps.classify.outputs.decision }}
        run: |
          case "$DECISION" in
            pass) echo "すべてのテストが成功しました" ;;
            heal) echo "Healer に渡します" ;;
            *)
              { echo "## 🚨 自動修復の対象外です。人間の確認が必要です"; echo '```json'; cat classification.json; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
              exit 1 ;;
          esac
      # トレースには Cookie や入力値が含まれる。保存期間を短くし、共有範囲に注意する
      - uses: actions/upload-artifact@v4
        if: steps.classify.outputs.decision == 'heal'
        with:
          name: failure-evidence
          path: |
            classification.json
            test-results/
          retention-days: 3

  # 2. Healer を動かすジョブ（成果物は信頼しない）
  heal:
    needs: test
    if: needs.test.outputs.decision == 'heal'
    runs-on: ubuntu-latest
    environment: e2e-dev
    permissions:
      contents: read
    timeout-minutes: 30
    env:
      BASE_URL: ${{ vars.E2E_BASE_URL }}
      E2E_USER: ${{ secrets.E2E_USER }}
      E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
      E2E_AGENT_MODEL: ${{ vars.E2E_AGENT_MODEL }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }} # すべてのジョブで同じコミットを使う
          persist-credentials: false
      - uses: ./.github/actions/setup
      - uses: actions/download-artifact@v4
        with:
          name: failure-evidence
          path: ${{ runner.temp }}/evidence
      - name: デモアプリを起動（E2E_BASE_URL 未設定のとき）
        if: vars.E2E_BASE_URL == ''
        run: |
          nohup node demo-app/server.mjs > "$RUNNER_TEMP/demo-app.log" 2>&1 &
          for _ in $(seq 30); do curl -sf http://127.0.0.1:3000/ >/dev/null && exit 0; sleep 1; done
          cat "$RUNNER_TEMP/demo-app.log"; exit 1
      - name: Healer（最大 2 回）
        env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_PAT }}
        run: |
          for attempt in 1 2; do
            echo "::group::attempt $attempt"
            node scripts/run-agent.mjs --role healer --prompt prompts/heal.md \
              --var-file CLASSIFICATION="$RUNNER_TEMP/evidence/classification.json" || true
            if node scripts/guard.mjs --actor healer && npx playwright test --retries=0; then
              echo "::endgroup::"; exit 0
            fi
            echo "::endgroup::"
          done
          echo "::error::修復できませんでした。人間の確認が必要です"; exit 1
      - name: パッチを作成
        run: |
          git add -A tests
          git diff --cached --binary "$GITHUB_SHA" > agent.patch
          git diff --cached --stat "$GITHUB_SHA"
          test -s agent.patch
      - uses: actions/upload-artifact@v4
        with:
          name: agent-patch
          path: agent.patch
          retention-days: 3

  # 3. クリーンな環境で検証する（Copilot のトークンなし）
  verify:
    needs: heal
    runs-on: ubuntu-latest
    environment: e2e-dev
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }} # すべてのジョブで同じコミットを使う
          persist-credentials: false
      - uses: ./.github/actions/setup
      - uses: actions/download-artifact@v4
        with:
          name: agent-patch
      - name: パッチを適用してガードを実行
        run: |
          cp -R scripts "$RUNNER_TEMP/trusted-scripts"
          git apply --index agent.patch && rm agent.patch
          node "$RUNNER_TEMP/trusted-scripts/guard.mjs" --actor healer
      - name: 接続先 URL を確認
        env:
          BASE_URL: ${{ vars.E2E_BASE_URL }}
          E2E_ALLOWED_HOSTS: ${{ vars.E2E_ALLOWED_HOSTS }}
        run: node "$RUNNER_TEMP/trusted-scripts/check-base-url.mjs"
      - name: 全テストを実行
        env:
          BASE_URL: ${{ vars.E2E_BASE_URL }}
          E2E_USER: ${{ secrets.E2E_USER }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
        run: npx playwright test --retries=0

  # 4. Draft PR を作成する
  pull-request:
    needs: verify
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }}
      - uses: actions/download-artifact@v4
        with:
          name: agent-patch
      - name: Draft PR を作成
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          branch="e2e-agent/heal-$GITHUB_RUN_ID"
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git switch -c "$branch"
          git apply --index agent.patch && rm agent.patch
          git commit -m "test(e2e): heal page objects"
          git push origin "$branch"
          gh pr create --draft --base main --head "$branch" \
            --title "[E2E agent] Page Object の修復" \
            --body "実行: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID
          変更は既存の Page Object ファイルに限られ、テストファイルは変更されていません（ガード通過・全テスト成功）。
          ロケーターが元と同じ役割の要素を指しているか、メソッドの動作が変わっていないか、画面の変更が意図したものかを確認してください。"


specs/.gitkeep は空のファイルです（mkdir -p specs && touch specs/.gitkeep）。

 付録 B：ハマりどころ

 B-1. npm で固定したはずの Copilot CLI が、別のバージョンで動いた（2026-09-24）
$ node -p "require('./node_modules/@github/copilot/package.json').version"
1.0.78
$ ./node_modules/.bin/copilot --version
GitHub Copilot CLI 1.0.83.   # 以前ダウンロードされた新しい版が使われていた
$ COPILOT_HOME="$(mktemp -d)" COPILOT_AUTO_UPDATE=false ./node_modules/.bin/copilot --no-auto-update --version
GitHub Copilot CLI 1.0.78.
Copilot CLI には自動更新の仕組みがあります。サンプルでは、自動更新の無効化（環境変数とオプション）と、実行ごとに分けた COPILOT_HOME を指定しています。

 B-2. Actions の GITHUB_TOKEN で MCP サーバーがブロックされ、使えるモデルも限られた（2026-09-10〜11、CLI 1.0.78）
GITHUB_TOKEN（copilot-requests: write 付き）での認証は通りましたが、Playwright の MCP サーバーが「ポリシーによりブロック」されました。組織の MCP に関する設定はすべて有効でした。--log-level debug のログに原因が出ていました。
[WARNING] Failed to fetch MCP registry policy: 403 Forbidden.
Non-default MCP servers will be blocked until the policy can be fetched.
そのトークンでは組織の MCP ポリシーを取得できず、CLI が安全側に倒して標準以外の MCP サーバーをブロックしていました。また、候補のモデルを順に試すだけの使い捨てワークフローで調べたところ、当時の私たちの組織の設定では、そのトークンで使えるモデルは 1 種類だけでした。「Copilot Requests」権限だけの Fine-grained PAT に切り替えると、ローカルでは MCP サーバーも希望のモデルも使えました（Actions 上では未確認）。
現在の公式ドキュメントでは GITHUB_TOKEN での認証が正式に案内されており、新しいバージョンの CLI が必要とも書かれています。これは特定の時点・CLI のバージョン・組織の設定での観測結果なので、まず GITHUB_TOKEN で試し、同じ警告が出たら PAT を検討する、という順をおすすめします。PAT を使う場合は、権限を最小にし、有効期限を短くしてローテーションの手順を決めておきましょう。
モデルを調べるワークフローでは、ループの 1 つ目で失敗した時点でスクリプトが終了しました。Actions の run: はデフォルトで bash -e で実行されるためです。ループの前に set +e を入れて解決しました。

 B-3. ガードが「何もせずに成功」していた（サンプルの作成中に発見）
ガードを macOS の /tmp（実体は /private/tmp）にコピーして実行すると、何も出力せずに終了コード 0 で終わりました。「直接実行されたか」を import.meta.url と引数のパスの文字列比較で判定していたため、シンボリックリンク経由では一致せず、検査がまるごと飛ばされていました。今は実パス（fs.realpathSync）で比較しています。ガードをワークフローに組み込んだら、違反を含む変更で実際に失敗することを一度確かめることをおすすめします。

 B-4. 判定に使うガードと、変更中のガードは分けて考える
検証スクリプトを main から取得する構成では、ガード自体を変える PR も、main にある古いガードで判定されます。実プロジェクトでは、ワークフローのトークンの渡し方を変えたところ、main 側の検証テストがその書き方を許可せず、PR のチェックが失敗しました。変更中のガードも、PR のブランチでユニットテストを実行すればマージ前に確かめられます。ただ、それが判定に使われるのはマージ後からです。ルールを変えるときは「今のルールでも通る書き方で移行 → マージ → ルールを切り替える」という段階を踏む前提で計画しておくと安心です。

 B-5. その他

MCP サーバーの作業ディレクトリ（cwd）と Copilot CLI の作業ディレクトリ（-C）がずれていたとき、エージェントが書いたファイルが tests/uat/tests/uat/... のような二重のパスに作られました。サンプルでは両方をリポジトリのルートに揃えています。
Planner が計画の書式を独自に解釈し、後続の処理が期待する項目名と違う形で出力したことがありました。計画を機械的に扱うなら、依頼文に書式の例を載せておくのがおすすめです。
コスト削減のために検証環境を夜間に自動削除していると、エージェントを動かしたいときに環境がないことがあります。環境の作り直し手順を文書にし、接続先 URL を変数にしておくと追従しやすくなります。

Sun*は「誰もが価値創造に夢中になれる世界」をビジョンに掲げ、4カ国・6都市に拠点を置くデジタル・クリエイティブスタジオです。2026年3月末現在、2,000名以上のエンジニアやクリエイターが在籍しています。Discussion
