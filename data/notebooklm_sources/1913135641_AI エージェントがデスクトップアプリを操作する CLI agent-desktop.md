# AI エージェントがデスクトップアプリを操作する CLI agent-desktop
- **Source URL**: https://azukiazusa.dev/blog/agent-desktop-computer-use-cli/
- **Score**: 85
- **Suggested Tags**: #AI駆動開発, #ClaudeCode, #AIエージェント
- **Processed Date**: 2026/11/6

---

## 本文
AI エージェントに Web フロントエンドを実装させるとき、agent-browser や Playwright MCP を渡しておけば、エージェントは自分でブラウザを開いて動作を確認できます。一方で、SwiftUI や WinUI で作ったネイティブアプリはブラウザのようにエージェントが直接操作できる API がなく、動作確認の手段が限られます。
デスクトップアプリを操作する手段として、Claude の Computer Use のように、スクリーンショットを撮ってモデルにクリックする座標を推定させる方式があります。この方式は画面に表示されるものなら何でも扱える反面、操作のたびに画像をモデルに渡し、モデルが画像からボタンの位置を読み取って座標を決める必要があるため、動作に時間がかかり、トークンを多く消費するという課題があります。
agent-desktop は、画像の代わりに OS のアクセシビリティツリーを使う CLI です。ボタンやテキストフィールドを役割と名前を持つ構造化データとして読み取り、エージェントは要素に割り当てられた ref を指定して操作します。Playwright MCP や agent-browser がアクセシビリティツリーのスナップショットと ref でブラウザを操作するのと同じ考え方を、デスクトップアプリに持ち込んだものです。
この記事では agent-desktop の基本的な使い方を確認したうえで、SwiftUI で作った架空の経費アプリの動作確認を Claude Code に任せ、エージェントがバグを見つけて修正するまでを紹介します。
Noteこの記事の内容は 2026 年 11 月 3 日時点で、macOS 26.6.2 と agent-desktop 1.0.2 を使って確認しています。
agent-desktop とは
agent-desktop は、macOS、Windows、Linux のデスクトップアプリを AI エージェントが読み取り、操作するための CLI と C ライブラリです。Rust で書かれており、各 OS 向けのネイティブバイナリとして配布されています。各 OS のアクセシビリティ API からアプリの UI を取得します。



OS
使用する API




macOS
Accessibility API（AX）


Windows
UI Automation（UIA）


Linux
AT-SPI



アクセシビリティ API は、本来はスクリーンリーダーなどの支援技術がアプリの UI を読み取るための仕組みです。ボタンであれば「ボタン」という役割（role）と「追加」のような名前（name）、無効かどうかなどの状態（state）が取得できます。agent-desktop はこれを JSON に変換し、操作できる要素ごとに ref を割り当てます。
Noteagent-desktop はもともと lahfir 氏の個人リポジトリとして公開されていました。Show HN の投稿では、Codex や Claude Code などのエージェントが行う Computer Use の多くがスクリーンショットとピクセル座標の推定に頼っていることを問題として挙げています。作者はこの方式を、遅くてトークンを多く消費し、UI のわずかな変化で壊れると説明しています。着想元は agent-browser とされており、2026 年 10 月 28 日の 1.0.0 で Linux に対応したあと、10 月 30 日に vercel-labs の organization に移管されました。
インストールと権限の設定
agent-desktop は npm パッケージとして配布されています。各 OS 向けのネイティブバイナリが同梱されており、Node.js のランチャーを経由して起動されます。
npm install -g agent-desktop
agent-desktop version
{"command":"version","data":{"os":"macos","target":"aarch64","version":"1.0.2"},"ok":true,"version":"2.5"}
すべてのコマンドは、このように 1 つの JSON を出力します。ok が true なら data に結果が入り、false なら error に失敗の理由が入ります。最後の version は JSON の形式のバージョンです。
Notenpm の設定でインストールスクリプトが無効になっている場合、ネイティブバイナリへのリンクが作られず、Node.js のランチャーを経由して起動されます。このとき 1 回の呼び出しごとに約 125ms の遅延が加わる旨の通知が標準エラーに表示されます。
macOS では、agent-desktop を起動するアプリにアクセシビリティの権限が必要です。permissions --guide を実行すると、システム設定の該当する画面と、どのアプリを一覧に追加すればよいかを示すガイドが表示されます。
agent-desktop permissions --guide

権限を与える対象は agent-desktop を起動するアプリです。ターミナルから実行する場合はターミナル.app や iTerm2 に権限を与えます。
agent-desktop status で権限が granted になっていることを確認できます。
agent-desktop status
計算機アプリで基本的なループを試す
agent-desktop の基本的な使い方は、スナップショットで UI を観察し、ref を指定して操作し、もう一度スナップショットを取って結果を確認するループです。macOS の計算機アプリで 7 + 3 = を計算してみましょう。
snapshot コマンドでアプリのアクセシビリティツリーを取得します。-i は操作できる要素だけに絞り込むオプションです。
agent-desktop launch Calculator
agent-desktop snapshot --app 計算機 -i
Notelaunch はアプリの英語名やバンドル ID（com.apple.calculator）を受け付けますが、--app にはシステムの言語設定に応じた表示名を指定します。日本語環境では計算機アプリの表示名が「計算機」になるため、launch と --app で異なる名前を使っています。
出力の一部を抜き出すと、次のようになります。
{
  "command": "snapshot",
  "ok": true,
  "version": "2.5",
  "data": {
    "app": "計算機",
    "window": { "id": "w-170347", "title": "計算機" },
    "snapshot_id": "s2rvnrswp147na",
    "ref_count": 26,
    "complete": true,
    "tree": {
      "role": "window",
      "name": "計算機",
      "children": [
        { "role": "button", "name": "7", "ref_id": "@s2rvnrswp147na:e6", "native_id": { "kind": "ax_identifier", "value": "Seven" }, "available_actions": ["Click", "SetFocus"] },
        { "role": "button", "name": "加算", "ref_id": "@s2rvnrswp147na:e17", "native_id": { "kind": "ax_identifier", "value": "Add" }, "available_actions": ["Click", "SetFocus"] },
        { "role": "button", "name": "計算実行", "ref_id": "@s2rvnrswp147na:e21", "native_id": { "kind": "ax_identifier", "value": "Equals" }, "available_actions": ["Click", "SetFocus"] }
      ]
    }
  }
}
各ボタンが role と name を持ち、ref_id が割り当てられています。@s2rvnrswp147na:e6 の s2rvnrswp147na の部分はスナップショットの ID で、e6 がそのスナップショット内での要素の番号です。available_actions には、その要素に対してアクセシビリティ API で実行できる操作が並びます。
ref はそのスナップショットにだけ属します。UI が変わって ref の指す要素が見つからなくなると、操作は STALE_REF で拒否されます。条件に一致する要素が複数ある場合も AMBIGUOUS_TARGET で拒否されるため、別の要素が誤って操作されることを防げます。その場合は新しいスナップショットを取り、その ref を使います。
ref を指定して click を実行します。
agent-desktop click @s2rvnrswp147na:e6   # 7
agent-desktop click @s2rvnrswp147na:e17  # 加算
agent-desktop click @s2rvnrswp147na:e16  # 3
agent-desktop click @s2rvnrswp147na:e21  # 計算実行
それぞれ次の結果が返ります。
{"command":"click","data":{"disposition":{"delivery":"delivered_unverified","retry":"unsafe"}, ...},"ok":true,"version":"2.5"}
disposition は、操作がアプリに届いたかどうかと、同じ操作をやり直してよいかを表します。delivered_unverified はクリックは送ったものの効果までは確かめていないという意味で、retry が unsafe なので、同じクリックをもう一度送ると二重に押す可能性があります。やり直してよいのは、delivery が何も送っていないことを示す not_delivered で、retry が safe のときだけです。結果を確かめるには、もう一度スナップショットを取ります。
agent-desktop snapshot --app 計算機
表示部分は次のように変わっていました。
{ "role": "statictext", "name": "\u200e7\u200e+\u200e3", "value": "\u200e7\u200e+\u200e3" },
{ "role": "statictext", "name": "\u200e10", "value": "\u200e10" }
7+3 の結果として 10 が表示されていることがわかります（\u200e は文字の向きを示す不可視の制御文字です）。
ここまでの操作は、すべて headless で実行されています。headless とは、物理的な入力を使わずにアクセシビリティ API の操作だけで UI を動かすことを指します。click はボタンが公開している押下のアクションを呼び出すため、マウスカーソルは動かず、計算機のウィンドウがフォーカスを奪うこともありません。エージェントが操作している間も、人は別のアプリで作業を続けられます。
ダブルクリックやドラッグ、ホバーのようにカーソルの移動が必要な操作は、アクセシビリティ API では代替できません。グローバルオプションの --headed を付けたときだけ許可されます。--headed を付けると、click や type も対象のウィンドウにフォーカスを移したうえで、実際のクリックやキー入力として送られます。headless で失敗した操作を --headed で再実行すると、意図しないウィンドウの切り替えや入力が起こる可能性があるため、同梱のドキュメントでもエージェントが自分の判断で headed に切り替えないよう指示されています。
動作確認の対象にする Keihi アプリ
それでは実際にエージェントに agent-desktop を使わせて、アプリの動作確認をさせてみましょう。架空の経費メモアプリ「Keihi」を SwiftUI で作り、その動作確認を Claude Code に任せます。

Keihi のコード
Package.swift// swift-tools-version: 6.0
import PackageDescription
 
let package = Package(
    name: "Keihi",
    platforms: [.macOS(.v15)],
    targets: [
        .executableTarget(name: "Keihi")
    ]
)
Sources/Keihi/KeihiApp.swiftimport AppKit
import SwiftUI
 
struct Expense: Identifiable {
    let id = UUID()
    let name: String
    let amount: Int
}
 
@main
struct KeihiApp: App {
    init() {
        // swift build で作った実行ファイルを通常のアプリとして Dock とウィンドウに表示する
        NSApplication.shared.setActivationPolicy(.regular)
    }
 
    var body: some Scene {
        WindowGroup("Keihi") {
            ContentView()
        }
        .windowResizability(.contentSize)
    }
}
 
struct ContentView: View {
    @State private var name = ""
    @State private var amountText = ""
    @State private var expenses: [Expense] = []
    @State private var total = 0
 
    private var amount: Int? {
        Int(amountText)
    }
 
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                TextField("項目名", text: $name)
                TextField("金額", text: $amountText)
                    .frame(width: 100)
                Button("追加") {
                    guard let amount else { return }
                    expenses.append(Expense(name: name, amount: amount))
                    total += amount
                    name = ""
                    amountText = ""
                }
                .disabled(name.isEmpty || amount == nil)
            }
 
            List {
                ForEach(expenses) { expense in
                    HStack {
                        Text(expense.name)
                        Spacer()
                        Text("¥\(expense.amount)")
                        Button("削除") {
                            expenses.removeAll { $0.id == expense.id }
                        }
                        .accessibilityLabel("\(expense.name)を削除")
                    }
                }
            }
            .frame(height: 200)
 
            Text("合計: ¥\(total)")
                .font(.headline)
        }
        .padding()
        .frame(width: 420)
    }
}

各行の削除ボタンには accessibilityLabel で「交通費を削除」のような名前を付けています。見た目のラベルはどの行も「削除」なので、名前を付けないとアクセシビリティツリー上ではどの行のボタンか区別できません。スクリーンリーダーの利用者にとってわかりやすい UI は、エージェントにとっても操作しやすい UI になります。
仕様は SPEC.md に書いておきます。
SPEC.md# Keihi の仕様
 
Keihi は経費をメモする macOS アプリです。
 
- 「項目名」と「金額」を入力して「追加」を押すと、一覧に経費が追加される
- 項目名が空、または金額が整数として解釈できない場合、「追加」ボタンは無効になる
- 追加すると入力欄は空に戻る
- 一覧の各行の「削除」ボタンを押すと、その経費が一覧から消える
- 「合計」には、一覧に表示されている経費の金額の和を表示する
 
## ビルドと起動
 
```bash
swift build
./.build/debug/Keihi &
```
ビルドして起動すると、次のウィンドウが表示されます。項目名と金額が空なので、「追加」ボタンは無効になっています。

このアプリには、仕様と異なる不具合を 1 つ仕込んでいます。Claude Code がそれを見つけられるかを確かめましょう。
Claude Code に動作確認を任せる
Claude Code に agent-desktop の使い方を教えるため、プロジェクトの CLAUDE.md に次の内容を書きます。この 2 行は、agent-desktop の README の For AI agents の節で「AGENTS.md に追加する内容」として紹介されているものをそのまま使っています。
CLAUDE.mdUse `agent-desktop` to see and operate desktop apps. Before the first use, run
`agent-desktop skills get desktop` and `agent-desktop skills get platform`, and follow them.
agent-desktop skills get は、バイナリに同梱されたエージェント向けのドキュメントを出力するコマンドです。desktop は観察・操作・確認のループや ref の扱いを、platform は実行中の OS 固有の注意点を説明しています。ドキュメントはバイナリと同じバージョンで配布されるため、古いドキュメントを読んだエージェントが存在しないオプションを使うことを防げます。skills.sh から npx skills add https://github.com/vercel-labs/agent-desktop --skill agent-desktop でエージェントスキルとしてインストールする方法も用意されています。
Keihi のディレクトリで、Claude Code を実行します。--allowedTools で、agent-desktop と Swift のビルド、アプリの起動、ファイルの読み書きだけを許可しています。
claude -p 'Keihi は SwiftUI 製の macOS アプリです。SPEC.md の仕様どおりに動くか、アプリをビルドして起動し、agent-desktop で実際に UI を操作して確かめてください。仕様と異なる挙動があれば原因を修正し、再ビルドして同じ操作で再確認してください。最後に、確認した操作と結果を報告してください。' \
  --allowedTools "Bash(agent-desktop *)" "Bash(swift build*)" "Bash(./.build/debug/Keihi*)" \
    "Bash(pkill *)" "Bash(sleep *)" "Read" "Edit" "Glob" "Grep"
Claude Code は 30 ターン、約 130 秒で、バグの再現から修正後の再確認までを終えました。Claude Code が実行した agent-desktop のコマンドを、実行記録から抜き出すと次のようになります。
# スキルを読む
agent-desktop skills get desktop
agent-desktop skills get platform
 
# 初期状態を観察する
agent-desktop snapshot --app Keihi -i
 
# 金額が整数でないとき「追加」が無効になることを確認する
agent-desktop focus @s1qowr2754q6t:e1 && agent-desktop type @s1qowr2754q6t:e1 "ランチ"
agent-desktop focus @s1qowr2754q6t:e2 && agent-desktop type @s1qowr2754q6t:e2 "abc"
agent-desktop snapshot --app Keihi -i --compact
 
# 金額を直して追加する
agent-desktop clear @s1dwnai59dp9id:e2
agent-desktop type @s1dwnai59dp9id:e2 "500"
# （中略: 再スナップショット）
agent-desktop click @s1l0qg3md6vyuz:e3
# （中略: 再スナップショットとコーヒー ¥300 の追加）
 
# 名前で削除ボタンを探して押し、合計を確認する
agent-desktop find --app Keihi --role button --name ランチを削除 --exact
agent-desktop click @sgi8v10b74mhf:e1
agent-desktop snapshot --app Keihi
 
# 修正後、アプリを終了して再ビルドする
agent-desktop close-app Keihi
swift build
find は、役割や名前を条件に要素を探すコマンドです。スナップショット全体から目的のボタンを探す代わりに、--name ランチを削除 --exact で一致する要素とその ref だけを受け取っています。
「ランチ ¥500」と「コーヒー ¥300」を追加して合計が ¥800 になったあと、「ランチを削除」を押すと、一覧にはコーヒーの行だけが残るのに合計は ¥800 のままでした。

Claude Code は原因を「total を別の @State で持っていて、追加時にしか加算していないこと」と判断し、total を expenses から計算する computed property に変更しました。
Sources/Keihi/KeihiApp.swift     @State private var expenses: [Expense] = []
-    @State private var total = 0
+
+    private var total: Int {
+        expenses.reduce(0) { $0 + $1.amount }
+    }
 
     private var amount: Int? {
         Int(amountText)
     }
Sources/Keihi/KeihiApp.swift                 Button("追加") {
                     guard let amount else { return }
                     expenses.append(Expense(name: name, amount: amount))
-                    total += amount
                     name = ""
                     amountText = ""
                 }
そのあと close-app でアプリを終了し、再ビルドして起動し直し、同じ操作を繰り返しています。合計は ¥800 から「ランチを削除」で ¥300、「コーヒーを削除」で ¥0 に変わりました。
実際に Claude Code が操作している様子は、次の動画で確認できます。

まとめ

agent-desktop は、OS のアクセシビリティ API からデスクトップアプリの UI を JSON で取得し、ref を指定して操作する AI エージェント向けの CLI である
ref は @<スナップショット ID>:e<番号> の形式で、UI が変わって要素が見つからない場合は STALE_REF を返す
ref による操作はデフォルトで headless に実行される。物理的な入力には --headed が必要
Claude Code は、SwiftUI アプリの動作確認からバグの修正、修正後の再確認までを agent-desktop で実行できた

参考

vercel-labs/agent-desktop
agent-desktop | Desktop Automation for AI
Show HN: Agent-desktop – Native desktop automation CLI for AI agents
vercel-labs/agent-browser
