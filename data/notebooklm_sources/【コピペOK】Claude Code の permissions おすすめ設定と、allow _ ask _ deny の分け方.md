# 【コピペOK】Claude Code の permissions おすすめ設定と、allow / ask / deny の分け方
- **Source URL**: https://zenn.dev/tmasuyama1114/articles/claude_code_permissions_recommended
- **Score**: 88
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #セキュリティ
- **Processed Date**: 2026/9/27

---

## 本文
settings.json の permissions は、Claude Code に確認なしで実行させる操作と、止めたい操作を書く場所です。
ただ、どこまで許してよいかの基準がないと、空のままにするか、誰かの設定を貼ったままになりがちです。
この記事は、その基準になる allow / ask / deny の分け方と、そのまま貼れるおすすめ設定をまとめたものです。

 忙しい人のための要約
設定を貼って使い始めるだけなら、次の点を押さえれば足ります。

取り返しがつく操作は allow、外に出る・消える操作は ask、触る理由が無いものは deny に入れる
deny と ask は、確認を減らす auto mode でも、確認を飛ばす bypassPermissions でも効く

~/.claude/settings.json に書くパスは / ではなく **/ で始める


 allow・ask・deny の役割と評価順
permissions には、次のルールを書けます。



種類
Claude Code の動き




allow
確認なしで実行する


ask
毎回、実行してよいか確認する


deny
実行させない



同じ操作が複数のルールに当たったときは、deny → ask → allow の順に評価され、最初に当たったものが適用されます。
公式ドキュメントの Permissions にも、"Rules are evaluated in order: deny, then ask, then allow."（ルールは deny、ask、allow の順に評価される）とあります。
ルールの細かさは、この順序に影響しません。
たとえば Bash(git push *) を ask に、Bash(git push --force *) を deny に書くと、通常の push は確認が出て、force push は止まります。
この順序があるので、allow は広めに書き、止めたいものだけを狭い ask と deny で重ねられます。

 線引きの基準
どのルールに入れるかは、その操作をあとから取り返せるかで決めています。

 allow に入れるもの
読むだけの操作、作るだけの操作、Git で戻せる操作は allow です。
ls や cat、git add や git commit、npm run * や npm test がここに入ります。
mv や cp、git checkout のように上書きの余地がある操作も、Git で戻せるので allow に置いています。
npm run * で通るのは自分のリポジトリにあるスクリプトだけなので、こちらも allow です。
一方で、どんなパッケージでもその場で落として実行できる npx は、どのルールにも書いていません。
実行してよいかは、そのときのモードの判断に任せています。

 ask に入れるもの
ask に入れるのは、外に出る操作と消える操作です。

外に出る: git push、gh pr create、gh pr merge、npm publish、curl、wget

消える: rm、git reset --hard、git clean


この2つに加えて、外からコードが入ってくる npm install も ask にしています。
rm -rf を deny ではなく ask にしているのは、deny だと必要な削除まで止まるからです。

 deny に入れるもの
deny は、Claude Code に触らせる理由が無いものだけに絞ります。

sudo

~/.ssh、.env、鍵やトークン、secrets ディレクトリ

rm -rf / と rm -rf ~


git push --force、git commit --no-verify


.git の中身と lockfile の直接編集

ただし、機密情報が入らないテンプレートの .env.example は、deny に入れていません。

 おすすめ設定
ここまでの線引きで組んだ permissions です。
~/.claude/settings.json に貼ると、すべてのプロジェクトに効きます。
{
  "permissions": {
    "defaultMode": "auto",
    "allow": [
      "Bash(mkdir *)",
      "Bash(touch *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(tree *)",
      "Bash(mv *)",
      "Bash(cp *)",
      "Bash(grep *)",
      "Bash(find *)",
      "Bash(echo *)",
      "Bash(npm run *)",
      "Bash(npm test)",
      "Bash(npm ci)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git pull *)",
      "Bash(git branch *)",
      "Bash(git checkout *)",
      "Bash(git status)",
      "Bash(git status *)",
      "Bash(git log)",
      "Bash(git log *)",
      "Bash(git diff)",
      "Bash(git diff *)",
      "Bash(git fetch *)",
      "Bash(gh pr view *)",
      "Bash(gh pr list *)",
      "Bash(gh pr diff *)",
      "Bash(gh pr checks *)",
      "WebFetch(domain:github.com)",
      "WebFetch(domain:npmjs.org)"
    ],
    "ask": [
      "Bash(rm *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(git push *)",
      "Bash(git merge *)",
      "Bash(git reset --hard *)",
      "Bash(git checkout -- *)",
      "Bash(git clean *)",
      "Bash(gh pr create *)",
      "Bash(gh pr merge *)",
      "Bash(npm install *)",
      "Bash(npm publish)",
      "Bash(npm publish *)",
      "Bash(gh release create *)",
      "Bash(gh workflow run *)"
    ],
    "deny": [
      "Bash(sudo *)",
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf /*)",
      "Bash(rm -rf ~/*)",
      "Bash(git push --force)",
      "Bash(git push --force *)",
      "Bash(git push -f)",
      "Bash(git push -f *)",
      "Bash(git commit --no-verify)",
      "Bash(git commit --no-verify *)",
      "Bash(git commit -n)",
      "Bash(git commit -n *)",
      "Read(~/.ssh/**)",
      "Edit(~/.ssh/**)",
      "Read(**/*.pem)",
      "Read(**/*.token)",
      "Read(**/token.json)",
      "Read(**/access_token*)",
      "Read(**/refresh_token*)",
      "Read(**/secrets/**)",
      "Edit(**/secrets/**)",
      "Read(**/.env)",
      "Edit(**/.env)",
      "Read(**/.env.local)",
      "Edit(**/.env.local)",
      "Read(**/.env.production)",
      "Edit(**/.env.production)",
      "Edit(**/.git/**)",
      "Edit(**/package-lock.json)"
    ]
  }
}
pnpm や yarn、bun を使っている場合は、npm の行を読み替えてください。
おすすめと書きましたが、最適な設定は人によって変わります。
とはいえ指針がないと決めにくいので、まずはこのまま使い、合わないところから自分用に変えてみてください。


 モードを変えても残る deny と ask
貼った設定には "defaultMode": "auto" が入っていますが、ルールの効き方はモードで少し変わります。

 モードごとの効き方
auto mode は、確認プロンプトの代わりに、分類器と呼ばれる別のモデルが操作を見て、通すか止めるかを決めるモードです。
一方の bypassPermissions は --dangerously-skip-permissions で入るモードで、確認も安全チェックも飛ばします。
ただし、どちらのモードでも deny と ask に書いたルールは効きます。
確認を飛ばす bypassPermissions でも、ask に書いた操作だけは確認が出ます。



モード
allow
ask
deny




default / acceptEdits
確認なしで実行
確認が出る
止まる


auto

npm test のような狭いルールは実行、npm run * のような広いルールは分類器へ
確認が出る
止まる


bypassPermissions
意味を持たない
確認が出る
止まる


dontAsk
確認なしで実行
拒否される
止まる



dontAsk は、確認を出さずに許可済みの操作だけを実行するモードです。
deny がどのモードでも止まることは、公式ドキュメントの Permission modes に "Deny rules block in every mode, including bypassPermissions." と書かれています。

 auto mode での allow の扱い
広いルールにあたるのは、Bash(npm run *) のようなパッケージマネージャの実行系の allow です。
auto mode の間はこの allow が外れ、実行してよいかは分類器が判断します。
外れた allow も、auto mode を抜ければ元どおり効きます。
なお、どのルールにも当たらない操作は、そのときのモードに従います。

 書くときの注意点
設定を足し引きするときに、間違えやすい点があります。

 パスは **/ で書く
~/.claude/settings.json に書いた /path は、~/.claude/path を指します。
Edit(/.git/**) と書いても、プロジェクトの .git は守れません。



書き方
指す場所




//path
ファイルシステムのルート


~/path
ホームディレクトリ


/path
設定ファイルの置き場所が基準


path
カレントディレクトリ



どのプロジェクトでも効かせたいルールは、Edit(**/.git/**) のように **/ で始めます。

 Bash のルールは文面で判定される
Bash のルールは、Claude Code が書いたコマンドの文面に当たるかどうかで判定されます。
Bash(git commit --no-verify *) を deny にしても、git commit -m x --no-verify のように引数の位置が変わると止まりません。
Permissions のドキュメントにも、Bash のルールは "isn't a security boundary around the program"（プログラムを囲むセキュリティの境界ではない）とはっきり書かれています。
permissions は、すり抜ける書き方がある前提で、普段の事故を減らすために書くものです。

 .env の deny が届く範囲
Read と Edit の deny は、Claude Code のファイル操作だけでなく、Bash の cat・head・tail・sed・tee とリダイレクトにも効きます。
Bash(cat *) を allow にしていても、cat .env は止まります。
一方で、Python や Node のスクリプトが自分でファイルを開く場合は防げません。
公式ドキュメントが対策として案内しているのは、OS のレベルでアクセスを塞ぐ sandbox です。
コマンドの中身を見て止めるなら、フック（hooks）も使えます。
どこまで守れるかは、別の記事で実際に確かめています。


 まとめ
allow・ask・deny は、その操作をあとから取り返せるかで分けます。
ask と deny に書いたルールは、どのモードに切り替えても残ります。
自分のコマンドを足すときも、同じ基準で振り分けてください。
パスは **/ で始めるのを忘れずに。
この分け方を順を追って身につけたい方は、私の本『Claude Codeで作って学ぶ AI駆動アプリ開発入門』の3.5節もどうぞ。

 Xをフォローいただけると嬉しいです！
AI駆動開発（特に Claude Code）のノウハウや Tips をよく発信しています！
