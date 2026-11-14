# Claude Designでポートフォリオサイトをリデザインしてみた: エンジニアが1時間程度で和モダン化 #ClaudeCode - Qiita
- **Source URL**: https://qiita.com/rf_p/items/a8b5929c14367e9dc584
- **Score**: 85
- **AI Summary**:
  - Anthropicの新ツール「Claude Design」を用いて既存コードからデザインシステムを抽出し、リデザインする実例紹介
  - GitHubやFigmaから資産を読み込み、複数案の生成からClaude Codeへの実装引き継ぎ（Handoff）までを1時間で完結
  - デザイン経験の少ないエンジニアでも、ブランド刷新のたたき台作成からコード実装までをAI駆動で完結できるワークフロー
- **Read Now Reason**: AI駆動開発の最新ツール（Claude Design × Claude Code）の具体的な連携フローが示されており、UI実装の生産性を劇的に向上させる実証データが含まれているため。
- **Suggested Tags**: #Claude Design, #Claude Code, #AI駆動開発, #UI/UXプロトタイピング
- **Processed Date**: 2026/5/8

---

## 本文
はじめに
2026/4/18に Anthropic Labs から Claude Design がリサーチプレビューとして公開されました1。Claudeとの会話でデザイン、インタラクティブプロトタイプ、スライド、ワンページャーを作れるプロダクトです

発表直後に触ってみたら、公式発表記事に書かれていた「handoff bundle で Claude Code に流せる」というフレーズの実体がはっきりつかめたので共有します。題材は自分の既存ポートフォリオサイト（ryu's Blog）で、microCMSの公式ブログテンプレートをほぼそのまま流用したシンプルな構成。Next.js + TypeScript + microCMS + React で、デザインに凝っているわけではない、よくある個人ブログです
そのシンプルな題材に対して、GitHub URL を1本渡してデザインシステムを自動抽出 → そのシステムをベースに和モダン3バリエーションで再デザイン → Claude Code にhandoffしてローカル実装 までのフローを一通り走らせました
ちなみに自分はバックエンド寄りのエンジニアで、業務としてデザインをやっているわけではなく、Figmaも普段触りません。それでも 既存サイトをガラッと和モダンに作り替えるところまでが、1時間程度で完結 したので、「デザインを本業にしていないエンジニアがブランド刷新のたたき台を自分で一本作る」という用途に向いています
加えてpptxファイルの出力もできるので、デザイナー・エンジニア以外の幅広い職種にも使えるプロダクトだと感じました
対象読者:

Claude Pro / Max / Team / Enterprise を契約していて、デザイン系の作業にClaudeを使いたい人
エンジニアやPMで、デザイナーに渡す前のワイヤー・プロトタイプを自分で組みたい人
Claude Code と組み合わせて、デザインから実装までワンストップで回したい人


ざっくり結論


既存のブランド資産（GitHubリポジトリ / ローカルコード / .fig ファイル / フォント・ロゴ / テキスト記述）からデザインシステムを自動抽出 し、以降のプロジェクトに自動継承する仕組みがコア。Figma利用者もそのまま .fig を渡して始められる
抽出したシステムが 以降のプロジェクトに自動継承 されるので、「自分のブランドで3バリエーション作って」という指示が現実的な粒度で通る（バリエーション数は 1〜6 から選択、初期値は3）

Draw機能でキャンバスに丸を書いて「ここにアイコン追加」と指示できるのが直感的。インラインコメントより早い場面がある

Handoff to Claude Code は URL + 指示文をワンクリックでコピーできる形式で、Claude Code のセッションにそのまま貼るだけで実装が走った
対象プランは Pro / Max / Team / Enterprise、基盤モデルは Claude Opus 4.71


Claude Design は Claude Code 等とは別建ての「週間枠」を持つ。Max 5倍プランで、既存サイトのリデザイン1本（デザインシステム抽出 + 3バリエーション生成 + 微修正 + Claude Codeへhandoff）で Claude Design 側の週間枠の42% を消費した（Claude Codeの枠には影響なし）



Claude Designとは
claude.ai/design でアクセスできる Anthropic Labs の新プロダクト。Claude Code とは別URLで、UIは左ペインにチャット、右ペインにキャンバスという2画面構成です2
Claude Code が「コーディング特化のクライアント」なら、Claude Design は「ビジュアル成果物に特化したクライアント」という棲み分け。基盤モデルは Claude Opus 4.7、対象プランは Pro / Max / Team / Enterprise、Enterprise はデフォルトでオフで管理者がOrganization settingsから有効化する設計です1
作れる成果物はサポート記事によると以下2:

デザイン、インタラクティブプロトタイプ
プレゼンテーション、ワンページャー
ランディングページ、マーケ素材、SNSアセット
ダッシュボード、モバイルアプリのオンボーディングフロー、社内ツール、フィードバックフォーム

ここから先は、実際に触った流れに沿って機能を紹介します


ステップ1: 既存ポートフォリオサイトからデザインシステムを自動抽出
触る前は「チャットでゼロからデザインを作るツール」という印象だったのですが、実際に使ってみると デザインシステムの下書きを先に作り、それをベースに以降のプロジェクトを回す という流れが用意されていました。既存コードベースから抽出する・Figmaから持ち込む・まっさらな状態からテキストでブランドを起こす、といった複数のルートがあり、この記事ではそのうち 既存のコードベースを渡してブランドを学習させる → 以降のプロジェクトは全部そのブランドで出てくる というパターンを試しています

Step 1.1: Set up your design system
ホームから Set up your design system のフォームに入ります。このフォームが Claude Design の入り方の広さがひと目で把握できる画面 で、実際の入力欄はこんな構成になっていました
Set up your design system。Provide examples of your design system and products セクションの右肩に (all optional) と明記されており、GitHub URL / ローカルフォルダ / .figファイル / フォント・ロゴ / 自由記述のどれか1つでも渡せば始められる



入力欄
内容




Company name and blurb
会社名・サービス名と一文紹介（プレースホルダー: e.g. Mission Impastabowl: fast-casual pasta restaurant with in-store touchscreen kiosk, mobile app and website）


Link code on GitHub
GitHubリポジトリURLを貼って Add



Link code from your computer
ローカルフォルダをドラッグ&ドロップ


Upload a .fig file

Figmaファイル。ブラウザ内でローカルパースされ、アップロードされない


Add fonts, logos and assets
フォント・ロゴ・画像アセット


Any other notes?
自由記述（プレースホルダー: e.g. We use a warm, earthy color palette with rounded corners. Our brand voice is playful but professional.）



重要なのは 見出しの右肩に all optional と書かれていること。どれか1つだけ渡しても抽出は立ち上がるので、手元にある素材に合わせて入り方を選べる設計になっています。想定されていそうなパターンを並べるとこんな感じ


エンジニア: GitHub URL を貼るだけ（この記事のパターン）

Privateリポジトリを持っている人や、モノレポから特定サブディレクトリだけ切り出して渡したい人: ローカルフォルダをドラッグ&ドロップ

デザイナー: .fig ファイルをそのまま渡す。Figmaから移行したいときの標準ルート

ブランドアセットだけ持っているチーム: フォント・ロゴ・画像を渡す

コードもデザインファイルも無い段階: Any other notes? にブランドの方向性を文章で渡す

この記事はエンジニアが既存コードからリデザインする実験なので GitHub URL を使っていますが、Claude Design 自体は Figma ファイルやアセット単体からも同格に立ち上がる プロダクトだという点は強調しておきたいところです。特に .fig のローカルパース仕様は、Figmaファイルが外部サービスにアップロードされないまま Claude Design がデザインシステムを読み取る構造になっているので、社内ブランドファイルを渡すときのコンプライアンス要件と相性が良い設計です
自分の場合は Link code on GitHub に既存ポートフォリオサイトのGitHubリポジトリURLを貼って Add を押しただけでした。他の欄は空のまま。フォームには親切な注意書きがあり、

Claude はリポジトリ全体をアップロードせず、必要なファイルだけコピーする
大規模コードベースの場合は フロントエンド特化のサブフォルダ を渡す方が推奨

.fig ファイルは ブラウザ内でローカルパースされる（アップロードされない）

という点が入力欄のすぐ下に明記されていました

Step 1.2: Review draft design system
10-15分程度かけて抽出が終わると Review draft design system 画面が立ち上がり、Claudeが解釈したデザインシステムの下書きがカード単位で並びます

Review draft design system。最上部に Missing brand fonts の警告、各カードに Looks good / Needs work... のフィードバックボタンが配置されている。UI Kit — Blog のカードには ryu's Blog の記事一覧レイアウトが、Claude Design によるサンプル記事・タグ込みで描画されている（#Next.js #TypeScript #microCMS #React は、リポジトリの技術スタックから推論されたそれっぽいタグ）
自分のポートフォリオサイトからは以下のようにカテゴリ分けされて出てきました:


Type（Body / Display / Mono の3系統）

Colors（Neutrals / Text）

Spacing（Borders & Elevation / Radii / Spacing scale）

Components（Article list item、Meta、Pagination、Profile、Search、Tag）

Brand（Iconography、Logo）

UI Kit — Blog（記事一覧ページのレシピ。Homeやアーカイブ、タグ、検索、404まで網羅）

UI Kit — Blogを展開したところ。Type / Colors / Spacing / Components / Brandの各セクションに具体的な項目が並び、Article list item カードにはダミーの記事データが差し込まれて描画されている
各カードに Looks good / Needs work... のボタンが並んでいて、違和感のあるところだけピンポイントでフィードバックできる 仕組み。自分の場合は最上部に Missing brand fonts. Claude is rendering typography with substitute web fonts. という警告が出ていて、Upload fonts ボタンがそのまま横に配置されていました
Components のカードには Article list item の描画プレビューが埋まっていて、以下のような記事が並んでいます
Next.js 15 App Router で ISR を使う
#Next.js #React
2026/4/12

一見すると自分のリポジトリの本番データに見えますが、microCMS の本番 CMS を確認してもこの記事は存在せず、ソースコード内にもハードコードされていません（実際にリポジトリを全文検索して確認済み）。つまりこれは Claude Design がプレビュー用に生成したダミー記事 です
Claude Design はコードベースの構造・CSS変数・コンポーネント定義は読み込む一方、microCMSのような外部 API から取得するランタイムデータまではフェッチしない設計のようで、代わりにリポジトリの技術スタック（Next.js / TypeScript / microCMS / React）から「ありそうな記事タイトル・タグ・日付」を推論してプレビューに差し込んでいます。タグやタイトルの方向性がリポジトリに沿っているので パッと見の違和感が無く実データに見えてしまう のですが、これはあくまでダミーという点は覚えておくポイントです
色も実コードから Neutrals と Text の系統に自動分類されていて、「既存サイトのCSS変数の使われ方をかなり正確に拾ってきている」という手応えがあります
繰り返しになりますが、このサイトはmicroCMSテンプレートほぼそのままの地味な構成です。それでも Article list item / Meta / Pagination / Profile / Search / Tag という部品単位にまで自動で分解され、各部品にリポジトリの文脈に沿ったダミーが差し込まれた状態でプレビューされる のは普通にすごい。テンプレート流用サイトでも、デザインシステムとして再構成できるだけの情報は十分に持っている、というのが意外な発見でした
このデザインシステムを Published のトグルでON、さらに Default にしておくと、以降のプロジェクトが自動的にこのブランドで出てくる ようになります1。これが次のステップで活きてきます


ステップ2: 抽出したデザインシステムを使って新デザインを起こす
デザインシステムが用意できた状態で、新しいプロジェクトを作って再デザインに入ります。既に自分のブランドが Default で登録されているので、プロンプトで「ブランドを守って」と細かく指示する必要はありません

Step 2.1: Questions で方向性を絞る
プロジェクトを作って「ページをもっとかっこよく作り直したい」と雑に投げると、Claudeは Questions（質問）タブ に選択肢を並べた質問カードを返してきました。ここが最初の驚きで、自由記述のチャットではなく ボタンUIで回答できる質問票 になっていました

左のチャットで雑なプロンプトを投げると、右のQuestionsタブに選択肢付きの質問カードが並ぶ。ページ対象・かっこよさの方向性（和モダン等）・バリエーション数スライダー・カラーパレット・タイポグラフィまでがボタンUIで用意されている
Claudeから返ってきた質問（抜粋）:


どのページをリデザインしますか: ホーム（記事一覧）/ 記事詳細ページ / タグページ / 検索ページ / 404ページ / 全部 / Other

どんな方向性の「かっこよさ」が好みですか: ブルータリスト / ターミナル・エディタ風 / エディトリアル / スイス・ミニマル / Y2K / 和モダン / ダークモード中心モダン / Other

バリエーションはいくつ欲しいですか: 1〜6のスライダー

カラーパレットの方針: モノクロ維持（現状のまま）/ モノクロ+1アクセントカラー / ダークテーマ中心 / カラフルに振り切る / Decide for me / Other
タイポグラフィの方針
モーション・レイアウト・言語ミックス等

自分の回答をまとめるとこうなりました:

pages: ホーム（記事一覧）
aesthetic: 和モダン（漢字・縦書き・墨）
variations: 3
color: モノクロ維持（現状のまま）
typography: 日本語ウェブフォント（Noto Sans JP / Zen Kaku Gothic など）
motion: 中程度（スクロール連動・カーソル追従）
layout: 中央1カラム維持
language_mix: 日英バイリンガルな見出し（日本語メインに英語を装飾で添える）
tweaks: テーマ（ライト/ダーク）

プロンプト力がなくてもブレない方向に誘導してくれる のが良かったポイント。自由記述だけだと「かっこいい」の解像度が上がらないまま生成されがちですが、選択肢UIで枠がハマってから生成に進むので、初回の出力が当たり外れしづらいです

Step 2.2: Progress で生成タスクが見える化
Questions に答えると、Claudeが実行計画を Progress 0/7 のチェックリスト形式で提示してくれました
Questions answeredの下に Progress 0/7 のチェックリストが並ぶ。Set up folder + copy assets から Verify with done + fork verifier まで、3バリエーションとライト/ダーク調整が工程として見える

Set up folder + copy assets
Write shared data + chrome components
Variation 1: 墨 — classic wamodan, vertical tategaki accent
Variation 2: 判子 — asymmetric modernist with red hanko accent
Variation 3: 縞 — editorial with thin line grid + Zen Old Mincho
Light/Dark tweak + variation switcher
Verify with done + fork verifier

Claude Codeで見慣れたTodoWrite系のタスク表示に近い感覚で、いま何番目を作っているか がリアルタイムに追えます
3バリエーション（墨 / 判子 / 縞）の設計が順に進んでいるところ。Copying → Writing がステップごとに流れるのでフリーズしているかどうかがひと目で分かる
ここが見えるだけで「待っている間の不安」がかなり減ります

Step 2.3: バリエーションが同時に並ぶ（今回は3案）
Step 2.1 のスライダーでバリエーション数を 3 に指定したので、ここで3案が並んでいます。スライダーは 1〜6 の範囲で動かせ、初期値は 3（実機確認）。「1案だけ徹底的に詰めたい」「6方向を一気に見たい」という使い方も同じフローで可能です
完成物はキャンバス上に表示され、ヘッダーのタブで 墨 Sumi / 判子 Hanko / 縞 Shima を切り替えられる形になっていました

判子バリエーションのキャンバス表示。上部タブに 墨 Sumi / 判子 Hanko / 縞 Shima の切替、右上に Share / Export / Comment / Edit / Draw / Present のツールバー。縦書きの明朝体タイトルと 二〇二六年 四月 ｜ 第 八 号 ｜ Vol. 08 の装飾が和モダンの雰囲気を作っている

判子バリエーションをスクロールした先。Fukuda's Blog のタイトル、目次 — Contents の表組みに AI-Driven Dev / Engineering / Management / MBA / Team Building / Strategy の6カテゴリが配置されている。Recent Entries — 最新の記事 のセクションに 001 — AIエージェントと組む、新しい開発フローの作り方 の記事カードが和雑誌風レイアウトで表示されている

判子バリエーションの上部。赤い朱印風の「福」ロゴが右上に配置され、左に 福の記 の大きな明朝体タイトル、右のメタ情報に 著者: Fukuda / 主題: Eng / AI / Mgmt / MBA / 記事: 8 entries / 言語: 日本語 / English が縦書き風に並ぶ

縞バリエーション。作る。束ねる。そして考える。 の巨大な縦書き明朝タイトルに、英語のリード文と著者情報カードが組み合わされている。細い罫線ベースのエディトリアル系

ライト/ダークトグルで切り替えた墨バリエーションのダーク版。背景が黒になり、「福」ロゴや Notes on Engineering, AI & Management の装飾が暖色のサンドカラーで描かれる。目次テーブルも同じ配色で連動して切り替わる


墨バリエーション: 「福」の大きな漢字ロゴ、縦書きの Fukuda's Blog、細い罫線での目次

判子バリエーション: 朱色の正方形ハンコ風ロゴ、左右非対称モダン、太い明朝体の大見出し

縞バリエーション: 細い罫線グリッド + Zen Old Mincho、エディトリアル系

注目ポイントは、元のポートフォリオサイトから抽出した Article list item のコンポーネント構造（サムネイル + タイトル + タグ + 日付）が、3バリエーションすべてで継承されていた ことです。見た目は和モダンに化けているのに、記事カードの情報アーキテクチャは既存サイトと同じ。デザインシステムを先に仕込む効果がここではっきり見えました
3つを別々のプロジェクトとして作るのではなく、ひとつのキャンバスに同居 しているのがFigmaと違う感覚でした。さらに右上のタブで Tweaks: ライト/ダーク のトグルが付いており、同じバリエーションのダーク版にワンクリックで切り替えできます
「同時並行で最大6方向まで試作 + テーマ切替」が標準装備なので、バリエーション管理をFigma上でファイル分けして運用していた労力がそのまま省けます

Step 2.4: インラインコメントで「ここの文言を直して」
「福」の右にある「記」の意味が伝わらない気がしたので、キャンバス上の該当要素をクリックして インラインコメント を残しました

判子バリエーションの 福の記 の「記」をクリックすると、対象要素の横にコメントUIがポップアップ。「記」がblogの直訳として意味が分からないので、別のアイデアを出して と入力し、Send to Claude で送信
コメントUIは対象要素の横にポップアップで立ち上がり、Comment / Send to Claude の2ボタン。Send to Claude で送ると、Claudeが該当箇所だけを修正した新バージョンを出してくれました
ちなみに公式サポート記事には 「インラインコメントはClaudeが読む前に消えることがある。回避策としてコメントテキストをチャットに貼り付ける」 と注意書きがあります2。自分の検証中は消えませんでしたが、重要なフィードバックはチャット側にも残しておくのが安全そうです

Step 2.5: Draw機能で「ここに要素追加して」
文言修正より直感的だったのが Draw機能 です。画面上部のツールバーに Comment / Edit / Draw のタブがあり、Drawを選ぶとキャンバスに直接描画できます

Drawモードに切り替え、ハンコの左横に赤ペンで丸を描画。付箋に ここにもう一個アイコン追加したい と入力して送信する。下部のツールバーに Draw / Click / Type anywhere to add a note / Queue / Send が並ぶ
Claudeはその丸の位置と意味を読み取り、レイアウトを更新してくれました

Drawのフィードバックをもとに、Claudeが The user wants another seal/icon next to the existing hanko. Let me add a second small seal to the right hanko column. と考えながら二つ目のハンコを配置していく様子。右のキャンバスで左右に2つの朱印が並んだ状態（福 と 2024）が見える
チャットで「ハンコの右隣にもうひとつアイコンを追加して、EST 2024の朱印っぽく」と文字で説明するより、丸を1個書いて付箋1枚書く方が圧倒的に速い です
Figmaでレビューするときの「赤ペン入れ」をそのままClaudeに渡せる感覚で、これが一番Claude Designらしい体験かもしれません

Step 2.6: Editモードで色・フォント・サイズを直接調整
ツールバーの Edit をONにすると、右サイドに PAGE パネルが開き、公式情報で言及されていた adjustment knobs にあたる値を直接いじれます1

Editモード。右サイドに PAGE パネルが開き、Background: #f5f2ec / Font: Noto Sans JP / Base size: 16px の3項目が直接編集できる状態。上部には Reload for new version のバナーが出ており、チャット経由の更新とキャンバスの状態の同期を促している

Background（カラーピッカー + HEX入力）
Font（Noto Sans JP 等から選択）
Base size（数値入力）

チャットで「もう少し大きく」と投げるより、数値を直接いじった方が速い場面はこちらで対応する。対話で決めるレイヤーと、数値を直でいじるレイヤーが分離されている ので、どちらのやり方でも違和感なく作業を切り替えられます


ステップ3: Claude Codeへのhandoff
仕上がったら右上の Export を押します

Exportメニュー。Download project as .zip / Export as PDF / Export as PPTX... / Send to Canva... / Export as standalone HTML / Handoff to Claude Code... の6種類が並ぶ。右の R アバターはアカウントメニュー
メニューは以下:

Download project as .zip
Export as PDF
Export as PPTX
Send to Canva
Export as standalone HTML
Handoff to Claude Code

興味があるのは最後の Handoff to Claude Code です。クリックすると Send to local coding agent のモーダルが立ち上がり、Claude Code に貼り付ける用のコマンドが生成されます

Send to local coding agent モーダル。Claude Code のターミナル風プレビューに Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/<hash>?open_file=Redesign.html / Implement: Redesign.html のコマンドが表示される。Copy command ボタン、Download zip instead オプション、Give the agent more detail on what to implement の追加指示欄が並ぶ
生成されるコマンドはこんな形:
Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/<hash>?open_file=Redesign.html

Implement: Redesign.html

オプションで Download zip instead（ローカルにzipを落として、エージェントのチャットに手動ドロップする）と、Give the agent more detail on what to implement（追加指示を足せる自由記述欄）が用意されています
Copy command でコマンドをコピーし、ローカルのClaude Code CLIセッションに貼り付けるだけで、

指定URLから design file を fetch
同梱の readme を読む

Redesign.html に相当する実装を、既存のポートフォリオサイトのリポジトリに対して行う

という流れを Claude Code が自動で走らせてくれました

Claude Code CLI でコマンドを実行後、localhost に実装が反映された状態。左のCLI履歴には Footer (Components/Footer.tsx) ... / Header / Card / Pagination などのコンポーネント編集ログが並び、右のブラウザには和モダン版のポートフォリオサイトが表示されている。福の論 の大タイトルと Claude Code関連のアウトプット置き場 の記事一覧が、抽出したデザインシステムの構造をそのまま保ちつつ和モダンで描画されている
ポイントは、handoff bundle が「HTMLそのもの」ではなく「design fileへのURL + readme + 実装指示」というパッケージ になっていること。受け取るClaude Code側がデザインファイルの構造を理解した上で、既に存在する既存ポートフォリオサイトのコードベースに合う実装 を書くので、単にHTMLを持ち込んで繋ぎ込む作業よりは自然に既存コードに溶けます
ステップ1で「元のコードベースからデザインシステムを抽出」、ステップ3で「元のコードベースに新デザインを実装として戻す」という、同じリポジトリを入口と出口にする往復フロー が構造的に成立しているのが、Claude Designが他のAIデザインツールと一番違う部分です


UI構成まとめ
実際に触って把握できたClaude DesignのUI構成を整理します



エリア
役割




左: Chat / Comments / Questions タブ
Claudeとの会話、質問票、生成タスクのProgress表示、インラインコメント一覧


右: Design Files / キャンバス
生成された成果物の表示。バリエーションタブで切替、ライト/ダークトグル


上部ツールバー
Comment / Edit / Draw の3モード切替 + Tweaks（ライト/ダーク等）


右サイド（Edit時）
PAGE パネル（Background / Font / Base size 等のadjustment knobs）


右上
Share / Export ボタン



チャットとキャンバスの 2ペイン基本 + モードで右パネルが切り替わる というのが基本レイアウトです。Claude Codeで見慣れたチャット駆動型UIに、Figma的な直接操作レイヤーが乗った、という見え方になります


料金・アクセス条件



項目
内容




URL

claude.ai/design1



対象プラン
Pro / Max / Team / Enterprise21



Free
言及なし


基盤モデル
Claude Opus 4.71



使用量
サブスク上限を消費。extra usage を有効にすれば上限超過も継続1



週間枠

Claude Code 側の週間枠とは独立した、Claude Design 専用の週次クォータ（実機確認）。Claude Design の枠を使い切っても Claude Code 側は通常通り使えるし、逆も同じ


Enterprise
デフォルトでオフ。Admin が Organization settings で有効化1



ステータス
リサーチプレビュー



料金の具体的な数値や日次上限は、現時点の公式記事内に記載なし

実測: 1サイト分のリデザインで週間枠の42%を消費（Max 5倍プラン）
実測ベースの内訳です（記事冒頭のポートフォリオサイト1本に対するフル工程。Max 5倍プランで、Claude Design 専用の週間枠に対する消費率）:



工程
週間枠の消費




既存リポジトリからデザインシステムを抽出（Step 1）
大きく消費


ホームページのデザインを3バリエーション生成（Step 2.1 〜 2.3）
大きく消費


インラインコメント / Draw / Editでの微修正（Step 2.4 〜 2.6）
数%程度


Claude Codeへのhandoff（Step 3）
数%程度


合計
約42%



大きく消費するのはデザインシステムの初回抽出と、ページ全体のバリエーション生成 の2工程。微修正や部分的な書き換えはほとんど消費しないので、「初期の生成にコストが寄っていて、仕上げは軽い」 というコスト構造です
ただし今回の42%は ホーム1ページのみを3バリエーションで作ったときの数字 です。記事詳細・タグ・検索・404ページなど複数ページをセットで作り込むと、ページの数だけ生成コストがかさむので、消費率はさらに大きくなります。デザインシステム抽出は初回だけなので2サイト目以降は若干軽くなる見込みはありますが、サイト全体を通しでリデザインするなら extra usage の有効化を前提にしておいた方が安全 です。リサーチプレビュー中のため枠と実測値は随時変わる可能性があり、この数字は参考値として置いておく程度が妥当です


既知の制限事項
公式サポート記事で言及されている既知の問題2:


インラインコメントの消失: Claudeが読む前にコメントが消えることがある。回避策として「コメントテキストをチャットに貼り付ける」

コンパクトビューの保存エラー: コンパクトレイアウトモードで保存エラーが起きうる。フルビューに切り替えて再試行

大規模コードベースのラグ: モノレポ全体をリンクするとラグ・ブラウザ問題を引き起こしうる。特定サブディレクトリをリンク するのが推奨

チャットアップストリームエラー: 発生時は同じプロジェクト内で新しいチャットタブを起動

リサーチプレビュー段階なので、このあたりは今後解消されると見ています。特にデザインシステム抽出でモノレポ全体を渡すと重くなる件は、最初から特定ディレクトリだけリンクする運用 で回避するのが一番安全です


使い分けの目安



やりたいこと
おすすめ




既存サイトのブランドを崩さず新ページを起こす

Claude Design（デザインシステム自動抽出 + 継承）


ワイヤー・プロトタイプを対話で組む
Claude Design


デッキ・ランディングページを短時間で起こす
Claude Design


提案資料・社内ドキュメントをPPTXで仕上げる

Claude Design（デザイン骨格・PPTXテンプレを作成）＋ Claude Cowork or Claude Code（テキスト原稿を作成）を組み合わせる分業が現実的


デザインから実装まで一気通貫
Claude Design → Handoff to Claude Code → Claude Code


コードの編集・レビュー・PR自動化
Claude Code


チームに配るスライドの仕上げ
Claude Design → Send to Canva






まとめ
触る前は「AnthropicがFigma対抗のデザインツールを出した」くらいの解像度だったのですが、実際に触ってみると 「既存コードベースを入口にしてブランドを学習させ、そのブランドで新規デザインを起こし、同じコードベースに実装を戻す」 という往復構造こそがClaude Designの本体でした。チャットで対話してデザインを作るだけなら他のAIツールでもできますが、そのデザインが既存のコードベースのブランドを自然に継承している という点が、既に動いているプロダクトを持っている人にとっての一番大きな違いです
個人的に自分が使いそうなパターンはこのあたり:


既存サイトや社内ツールの派生ページを、ブランドを崩さずに増やす（デザインシステム自動抽出が活きる）

PMがデザイナーに渡す前のワイヤーを、モックレベルまで自分で作っておく（最大6バリエーション同時生成）

デザインから実装まで Anthropic の製品で完結させる（Handoff to Claude Code）

提案資料や社内ドキュメントをPPTXで仕上げる（デザイン骨格は Claude Design、テキスト原稿は Claude Cowork / Claude Code に分担させて組み合わせる）

加えて PPTX / PDF / Canva 出力が標準で揃っているので、Claude Cowork / Claude Code で作ったテキスト原稿を持ち込んで、Claude Design でデザイン骨格と組み合わせる使い方ができます。「デザインツール」のラベルだけで判断せずに、対話でビジュアルアウトプットを作りたい人は職種を問わず触ってみる価値があります
一方で、リサーチプレビュー段階なのでコメント消失や保存エラーなどの既知の問題があり、最初からチームのクリティカルなデザインワーク全部を載せるのは時期尚早。個人プロジェクトや社内ツールから試すのが無難です
コスト面では、ホーム1ページ分のリデザインで週間枠の42% を消費したので、サイト全体（記事詳細・タグ・検索・404等）を通しで作り込むなら extra usage の有効化が現実的な選択肢です。リサーチプレビュー後の本番運用で枠と料金がどう落ち着くかは未確定なので、現時点の数字は参考値として置いておく程度に留めるのが無難です
最後に、この記事自体もClaude Codeで書きました。流れとしては、Claude Designを操作しているときに撮ったスクリーンショット18枚と、Anthropicの公式ブログ・サポートドキュメントのURL2本をClaude Codeに渡して構成と下書きを対話で組み立てる 形。つまり 登場人物が実質 Claude Code と Claude Design の2製品だけで完結している 記事で、リデザインそのものから記事化までのワークフローがAnthropicの製品内で閉じています
「デザインの下書きはClaude Designで、実装と文章はClaude Codeで」という棲み分けが、記事1本を通してそのまま実証された形になりました。しばらく自分の中ではこの棲み分けで回しそうです


参考リンク



Claude Design from Anthropic Labs（Anthropic News, 2026/4/17） ↩ ↩2 ↩3 ↩4 ↩5 ↩6 ↩7 ↩8 ↩9 ↩10


Claude Designを始める（Claude Help Center, 日本語） ↩ ↩2 ↩3 ↩4 ↩5
