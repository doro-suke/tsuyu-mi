# 【コピペで完了】Claude Codeの最初に入れる安全設定2つ：「危険コマンド」と「機密ファイル」を拒否する - Qiita
- **Source URL**: https://qiita.com/4q_sano/items/41e6bf158f06d199c6b9
- **Score**: 85
- **AI Summary**:
  - Claude Codeの安全性を高めるため、グローバル設定で危険コマンドと機密ファイルのアクセスを制限
  - settings.jsonにコピペで適用できる、実行拒否（deny）ルールの具体的なコード例を提示
  - 全プロジェクトへの影響を考慮し、制限が強すぎないバランスの取れたルール選定基準を解説
- **Read Now Reason**: AI駆動開発でClaude Codeを安全に導入するために必須の設定です。この記事に記載された設定を適用しない場合、AIエージェントが誤って破壊的なコマンドを実行したり、.envなどの機密情報を漏洩させたりする深刻なリスクがあるため、開発環境の構築時に即座に適用する必要があります。
- **Suggested Tags**: #Claude-Code, #AI駆動開発, #セキュリティ, #設定ファイル
- **Processed Date**: 2026/7/6

---

## 本文
🧭 本記事は Claude Code実務運用シリーズ の STEP 1「安全に使う」です。
Claude Code導入初日に、コピペ2箇所で「危険コマンド」と「機密ファイル」を止めます。
シリーズ全体の地図と読む順は 親記事 にまとめています。



2026-07-03 追記: 公開後、自分のグローバル設定を全面監査する機会があり、その実戦経験を反映しました。①危険コマンド deny に rm -rf ~ / git reset --hard / git clean -f を追加、②「MCPサーバーを使い始めたら：3つ目のdeny」の節を新設。監査では、セッションごとの使い捨て許可が約50行堆積し、MCPのワイルドカード許可が本番データの削除まで無確認にしていました——denyの価値は理論ではなく実感です。


はじめに
Claude Code を使い始めると、こういう不安が出てきます。
- 危険なコマンドを実行してしまわないか
- .env や秘密鍵などの機密ファイルを読ませてしまわないか
- 全プロジェクト共通で最低限の安全対策を入れられないか

ここで使えるのが、Claude Code の settings.json です。
設定スコープの考え方は、公式ドキュメントの Claude Code settings にまとまっています。
個人の全プロジェクトに適用される設定は、ここに置きます。
~/.claude/settings.json

ただし、ここに何でも入れればよいわけではありません。
~/.claude/settings.json は全プロジェクトに効くので、設定を広げすぎると、プロジェクトによっては必要な作業まで止まってしまいます。
なので、初心者がまず入れるなら、次の2つに絞るのがおすすめです。
1. 危険コマンドの deny
2. 機密ファイルの Read deny

この記事では、この2つをグローバル設定に入れる方法を紹介します。

この記事の設定は、Claude Code の settings.json に依存します。バージョンや環境によって挙動が変わる場合があるため、最終的な確認は手元の環境でお願いします。


この記事でやること
設定するのは、以下の2つです。
危険コマンドの deny
  → Claude Code に実行させたくない危険なコマンドを止める

機密ファイルの Read deny
  → .env や秘密鍵などを Claude Code に読ませない

どちらも、最終的には ~/.claude/settings.json の permissions.deny にルールを追加します。

先に結論
最低限入れるなら、これです。
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "deny": [
      "Bash(sudo rm*)",
      "Bash(sudo /bin/rm*)",
      "Bash(rm -rf ~*)",
      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -f*)",
      "Bash(chmod 777*)",
      "Bash(chmod -R 777*)",
      "Bash(eval*)",

      "Read(.env)",
      "Read(.env.*)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Read(**/*.p12)",
      "Read(**/*.pfx)",
      "Read(**/*.token)",
      "Read(~/.aws/credentials)",
      "Read(~/.ssh/**)",
      "Read(~/.config/gh/hosts.yml)",
      "Read(~/.npmrc)",
      "Read(~/.netrc)"
    ]
  }
}

ただし、すでに ~/.claude/settings.json がある場合、この内容をそのまま上書きするのは危険です。
既存の allow、deny、hooks、その他の設定が消える可能性があります。
そこで後半では、既存設定を消さずに permissions.deny へ追記するコマンドを紹介します。

Claude Codeの設定ファイルの考え方
Claude Code の設定スコープは、主に次の3つです。
User スコープ
  ~/.claude/settings.json
  自分の全プロジェクトに適用される

Project スコープ
  .claude/settings.json
  そのリポジトリに適用される

Local スコープ
  .claude/settings.local.json
  自分だけ、かつ、そのリポジトリだけに適用される

今回使うのは User スコープです。
~/.claude/settings.json

全プロジェクトに効くので便利ですが、影響範囲が広いぶん、入れるルールは慎重に選ぶ必要があります。

なぜグローバル設定は絞ったほうがよいのか
たとえば、こういう設定をグローバルに入れたとします。
{
  "permissions": {
    "deny": [
      "Bash(git push*)"
    ]
  }
}

業務リポジトリでは安全かもしれません。
でも個人リポジトリでは、Claude Code に作業ブランチを作らせて、そのまま push まで任せたいことがあります。
このとき、git push をグローバルで禁止していると邪魔になります。
つまり、プロジェクトによって判断が変わるものは、グローバル設定に向きません。
グローバルに入れるべきなのは、こういうものです。
- どのプロジェクトでも危険な操作
- どのプロジェクトでも読ませたくない情報
- 例外がほぼないもの

この条件に当てはまりやすいのが、今回の2つです。
1. 危険コマンドの deny
2. 機密ファイルの Read deny


1. 危険コマンドの deny
危険コマンドの deny は、Claude Code に実行してほしくない Bash コマンドを止める設定です。
権限ルールの考え方は、公式ドキュメントの Configure permissions が参考になります。
止めたいのは、たとえばこういう操作です。
- 管理者権限でファイルを削除する
- ホームディレクトリを一括削除する
- Git履歴を壊す強制pushを行う
- 未コミットの作業を無警告で消す
- chmod 777 で権限を広げすぎる
- eval で文字列をコマンドとして実行する

どれも、どのプロジェクトでも Claude Code に自動実行させたくない操作です。だからグローバル設定に向いています。

危険コマンドdenyの設定例
{
  "permissions": {
    "deny": [
      "Bash(sudo rm*)",
      "Bash(sudo /bin/rm*)",
      "Bash(rm -rf ~*)",
      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -f*)",
      "Bash(chmod 777*)",
      "Bash(chmod -R 777*)",
      "Bash(eval*)"
    ]
  }
}


各ルールの意味



ルール
止めたいこと
理由




Bash(sudo rm*)
管理者権限での削除
OSや重要ファイルを壊す可能性がある


Bash(sudo /bin/rm*)

/bin/rm を直接指定した管理者権限での削除

sudo rm の別パターンを防ぐ


Bash(rm -rf ~*)
ホームディレクトリ直撃の一括削除
復元不能な事故の典型。通常の開発で使うことがない


Bash(git push --force*)
強制push
Git履歴を壊す可能性がある


Bash(git push -f*)
強制pushの短縮形

--force と同じ事故を防ぐ


Bash(git reset --hard*)
未コミット変更の破棄
作業中の変更を無警告で消す。AIに自動実行させる場面がほぼない


Bash(git clean -f*)
未追跡ファイルの一括削除

reset --hard と同種の「作業消失」事故を防ぐ


Bash(chmod 777*)
全員に全権限を付与
セキュリティ上避けるべき


Bash(chmod -R 777*)
再帰的に全員へ全権限を付与
影響範囲が広く危険


Bash(eval*)
文字列をコマンドとして実行
意図しないコマンド実行につながりやすい




rm -rf* は入れないのか
危険コマンドと聞いて真っ先に思いつくのは rm -rf だと思います。
ただ、rm -rf を丸ごと止めるのは少し強すぎます。
"Bash(rm -rf*)"

理由は、通常の開発でもこういう削除をするからです。
rm -rf node_modules
rm -rf build
rm -rf DerivedData
rm -rf .next

そこでこの記事では、中間の答えを採っています。ホームディレクトリを直撃するパターンだけ止める方法です。
"Bash(rm -rf ~*)"

これなら rm -rf ~ や rm -rf ~/ は止まり、rm -rf node_modules は通ります。
ちなみに「rm -rf /* も止めればいいのでは」と思うかもしれませんが、これは入れていません。deny のパターンは前方一致なので、Bash(rm -rf /*) は rm -rf /tmp/work のような正当な絶対パス指定の削除まで止めてしまうからです。パターンを1つ足すときは「何が巻き添えになるか」まで考える——これが deny 設計の基本です。
それ以上の細かい制御（特定ディレクトリの保護など）は、慣れてから PreToolUse hook などで追加するのが現実的です。

curl | bash は入れないのか
外部スクリプトをそのまま実行する curl | bash や wget | bash も危険です。
ただ、Bash のパターンだけで curl | bash のような複合コマンドを正確に制御するのは難しいことがあります。
なので、初心者向けの最低限設定では、明確に止めやすい危険操作に絞っています。
もし curl や wget の実行自体を強く制限したいなら、こういう deny を足す選択肢もあります。
{
  "permissions": {
    "deny": [
      "Bash(curl *)",
      "Bash(wget *)"
    ]
  }
}

ただし、これを入れると、API確認やドキュメント取得など、通常の開発で使う curl / wget も止まりやすくなります。
最初からグローバルに入れるより、必要に応じてプロジェクト単位の設定や PreToolUse hook で制御するほうが扱いやすいです。

2. 機密ファイルの Read deny
機密ファイルの Read deny は、Claude Code に読ませたくないファイルをブロックする設定です。
対象はたとえばこういうファイルです。
- .env
- 秘密鍵
- 証明書
- AWS認証情報
- SSH鍵
- GitHub CLI の認証情報
- npm の認証情報
- APIトークン

ここで大事なのは、.gitignore とは役割が違うということです。
.gitignore
  → Git にコミットしないための設定

permissions.deny の Read(...)
  → Claude Code に読ませないための設定

.gitignore に .env を書いていても、作業ディレクトリに .env があれば、Claude Code が読める可能性があります。
読ませたくないファイルは、Read(...) で明示的に deny します。

機密ファイルRead denyの設定例
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Read(**/*.p12)",
      "Read(**/*.pfx)",
      "Read(**/*.token)",
      "Read(~/.aws/credentials)",
      "Read(~/.ssh/**)",
      "Read(~/.config/gh/hosts.yml)",
      "Read(~/.npmrc)",
      "Read(~/.netrc)"
    ]
  }
}


各ルールの意味



ルール
止めたいもの
理由




Read(.env)
.env
APIキーやDB接続情報を含むことが多い


Read(.env.*)

.env.local など
ローカル・本番系の環境変数を含むことが多い


Read(**/*.pem)
PEM形式の鍵・証明書
秘密鍵の可能性がある


Read(**/*.key)
秘密鍵系ファイル
認証情報の可能性が高い


Read(**/*.p12)
iOS証明書など
署名用証明書の可能性がある


Read(**/*.pfx)
証明書ファイル
認証情報の可能性がある


Read(**/*.token)
トークンファイル
APIトークンを含む可能性がある


Read(~/.aws/credentials)
AWS認証情報
アクセスキーを含む


Read(~/.ssh/**)
SSH鍵・設定
秘密鍵を含む可能性が高い


Read(~/.config/gh/hosts.yml)
GitHub CLI認証情報
GitHubトークンを含む可能性がある


Read(~/.npmrc)
npm設定ファイル
npmトークンを含む場合がある


Read(~/.netrc)
認証情報ファイル
外部サービスのログイン情報を含む場合がある




Read(.env) と Read(**/.env) の違い
.env をブロックしたいなら、まずはこれで十分です。
"Read(.env)"

これは、現在の作業ディレクトリ以下にある .env を対象にします。
より明示的に書くなら、こうも書けます。
"Read(**/.env)"

公式ドキュメントによると、bare filename は gitignore semantics に従うため、Read(.env) と Read(**/.env) は同等で、現在ディレクトリ以下の .env をブロックします。
一方、ファイルシステム全体の .env を対象にしたいなら、絶対パス基準でこう指定します。
"Read(//**/.env)"

ただ、これはかなり広い指定です。
ふだんは作業中のリポジトリ配下を守れれば十分なので、最初から広げすぎないほうがよいです。

2つをまとめた完成版
最低限入れるなら、この設定です。
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "deny": [
      "Bash(sudo rm*)",
      "Bash(sudo /bin/rm*)",
      "Bash(rm -rf ~*)",
      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -f*)",
      "Bash(chmod 777*)",
      "Bash(chmod -R 777*)",
      "Bash(eval*)",

      "Read(.env)",
      "Read(.env.*)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Read(**/*.p12)",
      "Read(**/*.pfx)",
      "Read(**/*.token)",
      "Read(~/.aws/credentials)",
      "Read(~/.ssh/**)",
      "Read(~/.config/gh/hosts.yml)",
      "Read(~/.npmrc)",
      "Read(~/.netrc)"
    ]
  }
}

次に、この設定を既存の ~/.claude/settings.json に追記する方法を紹介します。

導入手順：既存設定を上書きせずに追記する
すでに ~/.claude/settings.json がある場合、こういうコマンドは避けてください。
cat > ~/.claude/settings.json

> はファイルを上書きします。つまり、既存の allow、deny、hooks などが消える可能性があります。
ここでは、既存の permissions.deny に追記する形で設定します。

追記用コマンド

コマンドは macOS / Linux（bash・zsh）前提です。
Windows ネイティブ環境（PowerShell）の場合は、パスが %USERPROFILE%.claude\settings.json になり、追記用のPython ヒアドキュメントもそのままでは動きません。
Windows では WSL を使うか、スクリプトを .py ファイルに保存して実行してください。なお settings.json の中身（deny ルール）自体は全OS共通です。

下のコードブロックは、mkdir -p ~/.claude から最後の PY までを丸ごとコピーして、ターミナルに貼り付けて実行すればOKです。
このコマンドは、既存の ~/.claude/settings.json を読み込み、permissions.deny に必要なルールだけを追記します。
特徴はこちらです。
- 既存設定を上書きしない
- 同じルールがある場合は重複追加しない
- 既存ファイルがある場合はバックアップを作る
- JSONとして壊れている場合は処理を止める

mkdir -p ~/.claude

python3 <<'PY'
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

settings_path = Path.home() / ".claude" / "settings.json"

rules_to_add = [
    "Bash(sudo rm*)",
    "Bash(sudo /bin/rm*)",
    "Bash(rm -rf ~*)",
    "Bash(git push --force*)",
    "Bash(git push -f*)",
    "Bash(git reset --hard*)",
    "Bash(git clean -f*)",
    "Bash(chmod 777*)",
    "Bash(chmod -R 777*)",
    "Bash(eval*)",

    "Read(.env)",
    "Read(.env.*)",
    "Read(**/*.pem)",
    "Read(**/*.key)",
    "Read(**/*.p12)",
    "Read(**/*.pfx)",
    "Read(**/*.token)",
    "Read(~/.aws/credentials)",
    "Read(~/.ssh/**)",
    "Read(~/.config/gh/hosts.yml)",
    "Read(~/.npmrc)",
    "Read(~/.netrc)",
]

if settings_path.exists():
    backup_path = settings_path.with_name(
        f"settings.json.bak-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    )
    shutil.copy2(settings_path, backup_path)

    try:
        with settings_path.open("r", encoding="utf-8") as f:
            settings = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: {settings_path} is not valid JSON.")
        print(e)
        print("A backup was created before parsing. Please fix the JSON manually.")
        sys.exit(1)
else:
    settings = {}

if not isinstance(settings, dict):
    print("Error: settings.json root must be a JSON object.")
    print("Please check ~/.claude/settings.json manually.")
    sys.exit(1)

settings.setdefault("$schema", "https://json.schemastore.org/claude-code-settings.json")
settings.setdefault("permissions", {})

if not isinstance(settings["permissions"], dict):
    print("Error: permissions is not an object.")
    print("Please check ~/.claude/settings.json manually.")
    sys.exit(1)

deny_rules = settings["permissions"].setdefault("deny", [])

if not isinstance(deny_rules, list):
    print("Error: permissions.deny is not an array.")
    print("Please check ~/.claude/settings.json manually.")
    sys.exit(1)

added_rules = []

for rule in rules_to_add:
    if rule not in deny_rules:
        deny_rules.append(rule)
        added_rules.append(rule)

tmp_path = settings_path.with_suffix(".json.tmp")

with tmp_path.open("w", encoding="utf-8") as f:
    json.dump(settings, f, ensure_ascii=False, indent=2)
    f.write("\n")

tmp_path.replace(settings_path)

print(f"Updated: {settings_path}")

if added_rules:
    print("Added rules:")
    for rule in added_rules:
        print(f"  - {rule}")
else:
    print("No new rules added. Already up to date.")
PY


設定確認
追記後、JSONとして壊れていないか確認します。
python3 -m json.tool ~/.claude/settings.json > /dev/null && echo "JSON OK"

JSON OK と出れば、JSON形式としては問題ありません。
中身を見たいときはこちらです。
cat ~/.claude/settings.json

permissions.deny に今回のルールが入っていれば完了です。

バックアップから戻す方法
追記コマンドは、既存の settings.json があるときにバックアップを作ります。
バックアップファイルの名前は、こんな形になります。
~/.claude/settings.json.bak-20260101123045

元に戻したいときは、対象のバックアップを確認してから、こう戻します。
cp ~/.claude/settings.json.bak-YYYYMMDDHHMMSS ~/.claude/settings.json

YYYYMMDDHHMMSS の部分は、実際に作られたバックアップファイル名に置き換えてください。

なぜ cat >> で追記しないのか
JSONファイルに対して、こういう単純追記は避けてください。
cat >> ~/.claude/settings.json

JSONは、配列やオブジェクトの構造を持つファイルです。
末尾に文字列を足すと、JSONとして壊れる可能性があります。
たとえば、こうなると不正なJSONです。
{
  "permissions": {
    "deny": []
  }
}
"Read(.env)"

permissions.deny にルールを足したいなら、Pythonや jq などでJSONとして読み込み、配列に要素を追加する必要があります。
この記事では、追加ツールを入れなくても使えるよう、Pythonだけで追記する方法にしています。

グローバルに入れないほうがよいもの
以下は、グローバルではなくプロジェクト単位で設定するほうが安全です。
- allow ルール
- 通常の git push deny
- npm run / npx / xcodebuild / fastlane などの許可
- WebFetch(domain:internal.example.com) のような社内ドメイン制限
- secrets/ や credentials/ などプロジェクト固有ディレクトリ
- GoogleService-Info.plist
- fastlane/.env
- config/credentials.json

理由は、プロジェクトによって扱いが変わるからです。
たとえば GoogleService-Info.plist は、Firebase設定として実装支援に必要なこともあります。
逆に、本番用設定や社内運用上の秘匿情報を含むなら、読ませないほうがよいです。
このようにプロジェクトごとに判断が変わるものは、グローバル設定ではなく .claude/settings.json 側に置くほうが安全です。

MCPサーバーを使い始めたら：3つ目のdeny
ここまでの2つは Bash と Read の話でしたが、permissions.deny は MCPツールにも効きます。ルールの形式はこうです。
mcp__<サーバー名>__<ツール名>

MCPサーバーを使い始めたら、この「3つ目のdeny」を検討してください。実体験から言うと、優先度は高いです。
自分のグローバル設定を監査したとき、一番危なかったのは Bash コマンドではなく、この1行でした。
"allow": [
  "mcp__firebase__*"
]

Crashlyticsのクラッシュレポートを読むために入れたワイルドカード許可が、同じサーバーのデータベース削除・プッシュ通知送信・Remote Config更新まで無確認にしていました。プロンプトの誤解釈1回で本番に触れる状態です。
対策は2つセットです。

allowはワイルドカードにせず、読み取り系ツールだけを列挙する

"allow": [
  "mcp__firebase__crashlytics_get_report",
  "mcp__firebase__crashlytics_list_events"
]


本番を書き換えられるツールを明示的にdenyする

"deny": [
  "mcp__firebase__firestore_delete_database",
  "mcp__firebase__firestore_delete_document",
  "mcp__firebase__messaging_send_message",
  "mcp__firebase__remoteconfig_update_template",
  "mcp__firebase__firebase_deploy"
]

例はFirebaseですが、考え方はどのMCPサーバーでも同じです。
読み取り系   → allow（ツール単位で列挙）
破壊・送信・デプロイ系 → deny
迷ったら     → 何も書かない（毎回確認される）

ツール名は claude mcp list の出力や、許可プロンプトに表示される名前で確認できます。
denyにしておく価値は、緩い許可モードで実行しているときや、将来allowを足しすぎたときの最後の砦になる点です。

使っていないMCPサーバーのdenyを先回りで書く必要はありません。サーバーを追加した時点で、そのサーバーの書き込み系ツールを確認してdenyを足す——この運用で十分です。


注意点1：denyは強い
Claude Code の権限設定では、deny に一致した操作はブロックされます。
公式ドキュメントの Configure permissions によると、広い deny ルールは、より狭い allow ルールよりも優先されます。
つまり、広い deny をグローバルに入れると、後からプロジェクト側で例外的に許可したくても扱いづらくなります。
初心者のうちは、グローバル設定にはこれだけ入れるのが安全です。
- どのプロジェクトでも危険な操作
- どのプロジェクトでも読ませたくない機密情報


注意点2：Read deny は万能ではない
Read(...) の deny は、Claude Code の通常の読み取りを防ぐための設定です。
ただし、OSレベルで完全にファイルアクセスを遮断するものではありません。
公式ドキュメントの Configure permissions でも、Read / Edit deny は Claude Code の組み込みファイルツールや、Claude Code が認識できる Bash の読み取りコマンドには適用される一方、Python や Node.js のスクリプトが内部でファイルを開くような任意のサブプロセスには適用されない、と説明されています。
なので、機密情報対策はこう考えるのが安全です。
Read deny
  → Claude Code の通常の読み取りを防ぐ

.gitignore
  → Git管理対象から外す

OSレベルの権限制御やsandbox
  → より強いアクセス制限を行う

そもそも秘密情報を作業ディレクトリに置かない
  → 最重要

Read deny は重要ですが、これだけで万全と考えないほうがよいです。

まとめ
Claude Code のグローバル設定は便利ですが、全プロジェクトに効きます。
最初から多くのルールを入れすぎると、プロジェクトごとの差分を吸収しにくくなります。
初心者がまず入れるなら、この2つに絞るのがおすすめです。
1. 危険コマンドの deny
2. 機密ファイルの Read deny

そして、MCPサーバーを使い始めたら「3つ目のdeny」を思い出してください。ワイルドカード許可の1行が、Bashのどの危険コマンドよりも大きな事故につながることがあります。
グローバル設定の役割は、全プロジェクト共通の最低限の安全装置です。
一方で、プロジェクト固有の開発ルール、技術スタック依存の許可、社内ドメイン制限、特定ファイルの扱いは、リポジトリごとの .claude/settings.json に分けるべきです。
基本方針はこうです。
グローバル設定
  → どのプロジェクトでも危険なものだけ止める

プロジェクト設定
  → そのリポジトリ固有のルールを管理する

この分け方にしておくと、Claude Code の便利さを残しながら、取り返しのつかない事故を防ぎやすくなります。

参考リンク


Claude Code settings
~/.claude/settings.json や .claude/settings.json など、設定スコープの考え方を確認できます。

Configure permissions
permissions.allow / permissions.ask / permissions.deny の考え方や、Bash(...)、Read(...) などの権限ルールを確認できます。



このシリーズの歩き方
Claude Code実務運用シリーズ ― 暴走させない、から仕組みにするまで。

▶ 次の記事: 18万スター超のCLAUDE.mdに学ぶ、Claude Codeを暴走させない運用術

🔍 あわせて読む: チームの AGENTS.md / CLAUDE.md が重すぎてAIエージェントが使い物にならないとき、自分の環境だけ守る方法 ― チームの指示ファイルが重い人はこちら
🗺 シリーズ全記事の地図(親記事)
