# NotebookLMの学習ノート作成をAIで自動化する - Qiita
- **Source URL**: https://qiita.com/shin_takoyaki/items/0fb80d30daf31846a85f
- **Score**: 52
- **AI Summary**:
  - AIエージェントCodexとPlaywrightを使用し、NotebookLMのノート作成を自動化する手法の紹介。
  - テーマ入力から関連リソースの収集、ブラウザ自動操作によるNotebookLMへの追加までを一括実行する。
  - Google認証回避のため、既存のChromeプロファイルをPlaywrightに適用して起動する仕組みを解説。
- **Read Now Reason**: Playwrightを用いたGoogleログインの認証回避や、ブラウザ自動操作によるAPI非公開サービスの自動化プロセスは、UIベースの自動化パイプライン構築における実用的なTipsとして参考になるため。
- **Suggested Tags**: #Playwright, #NotebookLM, #Browser-Automation, #Codex
- **Processed Date**: 2026/5/23

---

## 本文
CodexでNotebookLMのリソース収集を自動化して、学習用ノートを作る

はじめに
NotebookLMの登場により、AIを使った新しい学習方法が少しずつ広がっています。
NotebookLMでは、PDF・Webページ・ドキュメントなどのリソースをもとに、AIと対話しながら学習できます。
単にAIへ質問するだけではなく、自分が用意した信頼できる資料をもとに学習できる点が大きな特徴です。
実際に、マサチューセッツ工科大学、MITの大学院生が、これまで勉強したことのない分野の資格試験に対してNotebookLMを活用し、48時間で合格したという事例も紹介されています。

参考：https://medium.com/ai-tomorrow/a-grad-student-at-mit-passed-a-qualifying-exam-on-a-subject-hed-never-studied-in-48-hours-c8bdd1571c21

一方で、NotebookLMを使ったことがある人なら感じたことがあると思いますが、
学習に使うリソースを集める作業がけっこう大変です。

公式ドキュメントを探す
関連する記事を探す
信頼できそうな資料を選ぶ
NotebookLMに追加する
学習しやすいノート名や構成にする

このあたりを毎回手作業でやるのは、地味に時間がかかります。
そこで本記事では、Codexを使ってNotebookLM用のリソース収集とノート作成を自動化する方法をまとめます。

この記事ではCodexを使っていますが、考え方としては他のAIエージェントでも応用できる想定です。



この記事でできるようになること
この記事の内容を実践すると、以下のような流れでNotebookLMの学習用ノートを作成できます。
まず、AIエージェントに対して学習したいテーマを入力します。

すると、NotebookLM上にリソースが追加された状態のノートが作成されます。

つまり、ざっくり言うと以下の作業を自動化します。

学習テーマの受け取り
関連リソースの収集
NotebookLMへのアクセス
新規ノートの作成
リソースの追加



事前準備
今回は、Codexのスキルを使って実現します。
そのため、まずはスキルを導入します。
今回使用するスキルは、以下のリポジトリで公開しています。
https://github.com/shin-takoyaki/learning-notebooklm-workflow
リポジトリをクローンした後、README.mdに従って初期セットアップを項番6まで行ってください。
git clone https://github.com/shin-takoyaki/learning-notebooklm-workflow

セットアップ手順の詳細はREADME.mdに記載しています。

注意点
今回の方法では、NotebookLMの公式APIを使うのではなく、Playwrightでブラウザを操作する形でノートを作成します。
そのため、以下の点には注意してください。

Googleアカウントへのログインが必要になる
初回実行時に認証が求められる
NotebookLMの画面仕様が変わると動かなくなる可能性がある
自動操作のため、実行内容を確認してから進める

特にGoogleログインまわりは環境によって挙動が変わる可能性があります。
README.mdに記載している注意点を確認したうえで実行してください。


使い方
Cursorを使用する場合
クローンしたスキルを画像のように配置し、
@SKILL.md スキル実行 と入力することで使用できます。



1. スキル一覧を開く
Codex上でスキル一覧を開きます。




2. learning-notebooklm-workflow を選択する
スキル一覧に learning-notebooklm-workflow が表示されます。

該当スキルを選択し、そのままEnterを押します。



3. 学習したいテーマを入力する
入力を求められるので、学習したい内容を入力します。

例えば、以下のようなテーマを指定できます。
Laravel 13のAI SDKについて学習したい

TransformerのSelf-Attentionについて学習したい

コーヒー焙煎におけるメイラード反応について学習したい

学習テーマを入力すると、AIエージェントが関連リソースを探し、NotebookLM用のノート作成を進めます。


4. Playwrightスクリプトの実行を許可する
今回は、Playwrightを使ってブラウザを直接操作します。
そのため、途中で以下のような確認が表示されます。
Playwrightのスクリプトを実行して良いですか？

問題なければ Yes を選択します。
GitHubのREADME.mdにも記載している通り、初回実行時はGoogleにアクセスするための認証が求められます。
ここは注意点があるため、README.mdを確認してから進めてください。



補足. Google認証で弾かれた場合
環境によっては、Playwright経由でNotebookLMへアクセスした際に、Googleログインの認証で弾かれる場合があります。
その場合は、Playwrightで使用しているChromeプロファイルを指定して、通常のChromeを一度起動します。（以下コマンドを実行）
/usr/bin/google-chrome \
    --user-data-dir=/home/<user>/projects/create-notebooklm/.notebooklm-playwright-profile \
    --no-first-run \
    https://notebooklm.google.com/

Chromeが起動したら、以下の流れで対応します。

上のコマンドで開いた通常ChromeでGoogleログインする
NotebookLMトップ画面に入れることを確認する
Chromeを完全に閉じる
その後、アップロード自動化を再実行する

node /home/<user>/.codex/skills/learning-notebooklm-workflow/scripts/notebooklm_web_upload.mjs \
    --output-dir learning-output \
    --notebook-title Cloudflare \
    --browser-channel chrome

ポイントは、--user-data-dir に指定しているプロファイルです。
ここでログイン状態を作っておくことで、再実行時にPlaywright側でも同じChromeプロファイルを使えるようになります。
ただし、Googleの認証まわりはアカウントや環境によって挙動が変わるため、必ずしもこの方法ですべて解決するとは限りません。


5. ブラウザが起動し、NotebookLMのノートが作成される
スクリプトを実行すると、自動的にブラウザが立ち上がります。
その後、NotebookLM上で新しいノートが作成され、収集したリソースが追加されます。
実行後、NotebookLM上で新しいノートが作成されていることを確認できます。


作成したノートでの学習方法
ノートが作成されたら、あとはNotebookLMを使って学習を進めます。

自分の場合は、以下のような流れで使っています。

まずは動画解説を生成して、全体像をつかむ
クイズを生成して、理解できているか確認する
わからない点があれば、その場でNotebookLMに質問する

NotebookLMは、追加したリソースをもとに回答してくれるため、通常のチャットAIよりも学習内容をコントロールしやすいです。
特に、公式ドキュメントや一次情報をリソースとして追加しておくと、学習の土台が安定します。


リソースの信頼性について
今回のスキルでは、基本的に一次情報や公式情報を優先して収集するようにしています。
そのため、一般的なブログ記事だけを集めるよりも、学習に使いやすいノートを作りやすくなります。
ただし、完全に自動で収集している以上、すべてのリソースが常に正しいとは限りません。
特に以下のような情報は、自分でも確認するのがおすすめです。

バージョンによって変わる仕様
法律・制度・規約に関する情報
医療・金融など専門性が高い情報
古い記事と新しい記事で内容が違う情報

AIにリソース収集を任せる場合でも、最終的には人間が確認する前提で使うのが安全です。


まとめ
本記事では、Codexを使ってNotebookLMのリソース収集とノート作成を自動化する方法を紹介しました。
NotebookLMは学習ツールとして非常に便利ですが、毎回リソースを集める作業には時間がかかります。
そこでAIエージェントを使って、以下の作業を自動化しました。

学習テーマの受け取り
関連リソースの収集
NotebookLMへのノート作成
リソースの追加

これにより、学習を始めるまでの準備時間をかなり短縮できます。
個人的には、NotebookLM単体で使うよりも、
AIエージェントでリソースを集める → NotebookLMで学習する
という流れのほうが、かなり実用的だと感じています。
