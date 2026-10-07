# Obsidian x Gemini CLIで最強執筆環境を作ろう｜Naoki |電電猫猫
- **Source URL**: https://note.com/electrical_cat/n/n5db5f038a391
- **Score**: 42
- **Suggested Tags**: #Obsidian, #Gemini, #AIツール
- **Processed Date**: 2026/9/12

---

## 本文
目標：CursorみたいにObsidianを改造ObsidianはMarkdownのViewerとして最強だ！でもAIとのコラボレーションはまだまだ弱い．ツールチェインとかがないからAIに記事を修正させるとかはまだまだ難しい…．というのは以前の話で今回はObsidian Terminal & Gemini CLIで最強執筆環境を設定していこう．最終的な地点便利な点はここらへんかなファイル整理を自動でさせられるタイトル設定をファイルの中身を読んで自動で変更するとかできる執筆でAIによる編集などをさせられるDeepSearch的に調べた内容をまとめさせるGemini CLIを有能な司書としてObsidianのメモのメンテナーとしつつ，雑に探し物を調べさせる秘書としても扱うことができるのである．環境を作っていくterminalをいじる必要がでてくるのでちょっとめんどい．まあできるだけ簡単に教えていくのでみんなもやってみよう！今回はmacOSを想定しているよ！Gemini CLIの導入ここは省略するので各自ググってくれ．Terminalを導入今回導入するプラグインTerminalのプラグインを入れていこう．まずは設定＞コミュニティプラグイン＞閲覧"Terminal"で検索インストールの後に有効化（インストールしただけでは有効にならないよ！）インストールのボタンを押した後に有効化のボタンに切り替わる有効化したら「オプション」をクリックして詳細設定に入っていきます．Obsidian Terminalの設定オプションをクリックするとこのように表示されます．設定画面を開いて下のほうにスクロールしても表示することができます．"Profiles"をクリックすると次のように表示されます．darwinintegratedDefaultしか使わないので確認して他は削除してもいいです．僕邪魔なので削除しました．これでホームに戻るとパネルに次のようにアイコンが表示されます．クリックするProfile選択があるのでdarwinIntegratedDefaultをクリックするとターミナルが表示されますこの画面でgeminiが呼び出せれば設定は終わりです．エラーが出る場合は次へ．（必要なら）zshrcの設定通常のターミナルを開きます．which node上のコマンドでnodeのpathをチェックします．これを実行すると、/opt/homebrew/bin/node のようなパスが表示されるはずです。このパスの、末尾の/nodeを除いたディレクトリ部分（例: /opt/homebrew/bin）をコピーしておきます。次にzshrcを編集します．VSCodeが入ってれば次のようにして編集画面を開けます．code ~/.zshrczshrcの1番上にさっきコピーしたpathを書きます．export PATH="/opt/homebrew/bin:$PATH"この後Obsidianを再起動します．Gemini CLIを呼び出してみよう先ほどの方法でパネルからTerminalを呼び出しましょう．"gemini"を実行し，これで準備OK．これで完成です！では使ってみましょう．今回はこんな感じでAI Glassesのリストを書きます．今回はこれを直接編集してもらって調査記事を書いてもらいます．頑張ってくれてます．できたらしい.こういう調査の蓄積とかではすげー便利．Obsidianと調査の記録がすごい相性がいい．では皆さんも良いObsidian Lifeを！Claude Codeでも同様にできるよ\
