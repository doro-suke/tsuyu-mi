# Claude Codeの「スキル」でAIマンガを作る完全ガイド — YAMLで設計し、Geminiで描く｜ささ＠小学校で働く
- **Source URL**: https://note.com/hiroki_sasazawa/n/n656892945089
- **Score**: 82
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #エージェント設計
- **Processed Date**: 2026/10/21

---

## 本文
はじめに →「絵が描けない」は、もう言い訳にならないかもしれませんこんにちは。小学校で働くささです。本業とは別に趣味でAIマンガを描いています。突然ですが、私は絵がうまく描けません。でも最近、AIで漫画を作るようになりました。「え、ChatGPTとかで絵は作れるでしょ？」と思った方、ちょっと待ってください。1枚の絵を作るのと「漫画」を作るのって、まったく別の話なんです。漫画には、コマ割りがあります。キャラクターの一貫性が必要です。セリフの配置、コマ間のリズム、カメラアングルの変化。これらを1枚の画像として成立させるのは、「綺麗な絵を描いて」とAIに頼むだけでは不可能だったりします。そこで私がやったのは、Claude Codeというツールに「漫画の作り方マニュアル」を仕込んで、対話しながら漫画を設計→生成する仕組みを作ることでした。いわゆる「スキルにする」ということです。この記事で、その仕組みをぜんぶ見せます。使ったYAML（漫画の設計図）、プロンプト、生成された画像、スクリプトのコード。出し惜しみなしです。「難しそうに見えるけど、やってることはこういうことだよ」という解説も入れていくので、コードに馴染みがない方もついてきてください。使っているものは3つだけです。Claude Code — AIと対話しながら作業を進めるCLIツール（パソコン版のAIチャットのようなものです）Gemini API (`gemini-3-pro-image-preview`) — Googleの画像生成AI→最近バナナ2が出た。Node.js — 上のAPIを呼び出すための小さなスクリプト（139行）ちなみに、Claude Codeって何？というところからていねいに説明していくので、「名前は聞いたことあるけど使ったことない」という方もぜひ読み進めてみてください。まずは完成品を見てくださいごちゃごちゃ説明する前に、できたものを見てもらったほうが早いです。4コマ漫画 →「NotebookLMで評価業務」175枚のワークシート評価に絶望する教員が、NotebookLMにPDFを投げ込んだら一瞬で終わった——という4コマです。実質、私の日常だったりします。4コマ漫画 →「AI勉強会への招待」教育者向けAI勉強会への招待漫画です。エッセイ漫画テイストで、軽いノリに仕上げました。4ページ漫画 →「届くを定義し直したら発信が変わった」これはnote記事を原作にした4ページ漫画です。無言コマ（セリフなしで絵だけで語るコマ）も入っています。これらはすべて、「漫画つくって」と指示する。または `/create-manga` とタイプするところから始まります。で、これどうやって作ったかという話です。そもそもClaude Codeって何ですか？ここ、ちゃんと説明させてください。ここがわからないと先に進めないので。「AIチャットのパソコン版」だと思ってくださいChatGPTやClaude（ブラウザ版）は、Webブラウザでチャットするものですよね。Claude Codeは、あれのパソコン版です。ターミナル（コマンドを打つ黒い画面）で動きます。私はVS CodeとかAnti-Gravityの中の拡張機能としてクロードコードを使っていますが。「え、わざわざ黒い画面で？ブラウザでよくない？」と思うかもしれません。画像は白いですけどね。ここがポイントなんですが、Claude Codeはブラウザ版と違って、あなたのパソコンのファイルを直接読んだり、書いたり、コマンドを実行したりできるんです。つまりブラウザのAIチャット → 「この画像を作って」→ 画像が表示される → 自分でダウンロードして保存Claude Code → 「この画像を作って、この場所に保存して」→ 指定したフォルダに自動で保存されるこの違い、漫画を作るときにめちゃくちゃ効いてきます。なぜClaude Codeで漫画を作ると嬉しいのかブラウザのAIチャットで漫画を作ろうとすると、こういう流れになります。プロンプトを手打ちする画像が生成されるダウンロードして保存する「もう1枚」と打つまた保存するフォルダを整理する次の漫画では、また最初からプロンプトを打ち直す毎回これです。しかも前回うまくいったプロンプトの書き方を忘れたりします。Claude Codeだとこうなります。`/create-manga` と打つ（これは事前に設定しておくSkill。後で説明します。）AIが対話形式で「どんな漫画にしますか？」と聞いてくる選択肢を選ぶだけで設定が決まるAIが設計図（YAML）を作って見せてくれる「OK」と言えば画像が自動生成され、指定フォルダに保存される設計図もセットで保存される（あとから修正・再生成できる）フィードバックを答えると、次回の漫画に学習が反映される実質、自分は「こんなストーリーで」と伝えて、「OK」を押すだけです。とはいえ、これだけだと「へー便利だね」で終わってしまうので、もう少し掘り下げます。ワークフロー全体がつながるのが本当の強みClaude Codeの真価は、他の作業と連携できるところです。たとえば私の場合、漫画を作った後にこんなことをしたいわけです。作った漫画をX（Twitter）の投稿案に組み込みたい投稿案をApproved（承認済み）にして、自動投稿システムに乗せたいnote記事の挿絵として使いたいClaude Codeはファイルを直接操作できるので、漫画を生成したあとに`drafts/x_posts/` に投稿案ファイルを作成フロントマターに `image: output/manga/...` を設定`approved: true` にして自動投稿の待ち行列に入れる……ということまで、1つの会話の流れの中でできてしまいます。漫画を作る → 投稿案を書く → 承認する → 自動投稿される。この一連の流れが、ターミナルから離れることなく完結します。ブラウザのAIチャットじゃ、ここまでは無理です。ファイルが作れて、フォルダに保存できて、別のスキル（後述）とつなげられる。この差がでかいんです。「スキル」という仕組み → AIへの作業マニュアルさっきから「スキル」って言葉が出てきていますよね。これ、説明しないと先に進めないので。スキルの正体 → ただのテキストファイルですClaude Codeには「カスタムスラッシュコマンド」という機能があります。プロジェクトの `.claude/commands/` というフォルダにMarkdown（テキスト）ファイルを置くと、それがコマンドとして呼び出せるようになります。.claude/commands/
  ├── create-manga.md    ← /create-manga で起動
  ├── generate-post.md   ← /generate-post で起動
  ├── daily-plan.md      ← /daily-plan で起動
  └── ... (計33個のスキル)私のプロジェクトには33個のスキルがあります。漫画を作るスキル、X投稿案を生成するスキル、Inboxを整理するスキル、日報を書くスキル……。全部、テキストファイルです。中身は「AIへの作業マニュアル」スキルファイルの中身はプログラミング言語ではありません。人間が読んでも理解できる、自然言語の作業手順書です。`create-manga.md` の冒頭はこうなっています。難しく書いてあるような感じなんですけれど、結局これもAIに書かせています。# AI漫画作成スキル

## 概要

ユーザーからストーリーを聞き取り、構造的YAMLで漫画の設計図を作成し、
Gemini API（Nano Banana Pro）で白黒少年漫画の画像を生成する。

## 呼び出し方

- `/create-manga` — 対話形式で漫画を作成
- `/create-manga ストーリーの概要` — ストーリーを直接指定して開始
- `/create-manga おまかせ` — ストーリーからAIが全自動で設定を選ぶどうでしょう。日本語で書かれた「やることリスト」ですよね。Claude Codeはこのマニュアルを読んで、書かれた手順どおりにファイルの読み書きやコマンド実行を自分で進めてくれます。作業手順書と言えばいいでしょうか。プログラムでもなく、チャットのプロンプトでもない。「AIが読んで自分で動いてくれる手順書」です。スキルにする意味 →「知識が腐らない」「毎回プロンプトを手打ちすればいいのでは？」と思うかもしれません。スキルにしておくと何が嬉しいか。まず、再現性。同じ品質の漫画を何度でも作れます。「あのプロンプトなんだっけ」がなくなります。それから知識の蓄積。過去の失敗や成功がスキルファイル自体に残っていきます。そして進化できること。スキルファイルをちょっと書き足すだけで、次から全体の流れが良くなります。実際、`create-manga.md` は最初100行程度でした。制作を繰り返すうちに「こうしないと失敗する」というルールが増えて、今は542行です。作業をしていくとうまくいかないところとかってありますよね。それをこういう風に改善してみたいな感じで、クラウド上でやり取りした後、さっきの手順を教訓としてスキルに追加してみたいな形で伝えると、このスキルがどんどんアップデートされるんですよね。ハマりポイントが見つかるたびにルールを追加していく。すると次に作るときは、そのハマりポイントにハマらなくなる。スキルファイルが「成長する」感覚は、ちょっと面白いです。全体像 → 漫画ができるまでの流れcreate-mangaスキルの流れは、ざっくりこうです。初期確認（APIキーがあるかチェック）
  ↓
モード選択 → ヒアリング（おまかせ / お気に入り / カスタマイズ）
  ↓
YAML設計図の生成（漫画の「設計図」をAIが作る）
  ↓
ユーザー承認（★ここを通過しないと画像生成に進めない★）
  ↓
画像生成（Gemini APIで実際に描く）
  ↓
レビュー・修正（気に入らなければ直す）
  ↓
フィードバック記録（次回に活かす学習データを保存）順番に見ていきます。まずはAPIキーの確認まず `.env` ファイルの `GEMINI_API_KEY` を確認します。これがないと画像生成できないので、最初にチェックして止まる設計です。「.envファイルって何？」という方へ。パスワードやAPIキー（サービスを使うための合言葉のようなもの）を保存しておくファイルです。Gemini APIを使うにはGoogleのAI Studioで無料のAPIキーを取得して、このファイルに書いておく必要があります。モード選択 → ヒアリングここが面白いところで、制作モードが3つ用意してあります。使っていくうちにこうするといいなっていうことで増えていきました。おまかせモードAIがストーリーの内容を分析して、コマ数・スタイル・トーン・キャラクター・レイアウトをすべて自動決定してくれます。もちろん、ここが漫画作りの面白いとこだよっていう意見もあるのはわかるんですが。面白いのは、`favorites.yaml` という学習データを参照するところです。過去に「これ良かった！」と評価したスタイルの組み合わせを覚えていて、次回も優先的に選んでくれます。使えば使うほど好みに近づくわけですね。育てていくっていう感じです。`favorites.yaml` お気に入りをどんどん追加していくお気に入りモード`favorites.yaml` に保存されたスタイル設定をベースにします。追加で聞かれるのは「キャラクター」「背景」「焦点」「レイアウト」の4つだけです。カスタマイズモード細かく自分で設定したい場合はこちらです。3回の対話で決めていきます。第1回（基本設定）— 「どんな漫画にしますか？」コマ数（1コマ / 2コマ / 3コマ / 4コマ）スタイル系統（リアル系 / ソフト系 / コミカル系 / 教材系）トーン系統（重め / 軽め / 熱い / 静か）セリフの有無第2回（詳細設定）— 「もう少し詳しく」スタイル詳細（例 → リアル系なら少年漫画 / 青年漫画 / 劇画 / カイジ風）トーン詳細（例 → 軽めならほのぼの / コミカル / 爽やか）キャラクター選択（フォルダ内の参考画像から複数選択）背景・舞台第3回（レイアウト）— 「どう配置しますか？」漫画の焦点（ストーリーのどこを切り取るか）コマ割りレイアウト（参考画像を見てから選ぶ）ここで重要なのは、コマ割りレイアウトは参考画像を先に見せてから選ばせるところです。「koma4-4」と言われてもわからないですよね。実際の画像を見て「あ、この配置がいい」と選べるようになっています。全部選択肢をポチポチ選ぶだけなので、プロンプトを考える必要がないんです。素材の準備 → 2種類の「お手本画像」ここから先に進む前に、事前に用意しておくものが2つあります。1. キャラクター参考画像フォルダにキャラクターの参考画像を入れておきます。60_AImanga/characters/
  ├── ささ_三面図_白黒.png   ← 主人公の三面図（正面・横・背面）
  ├── ささ_休日.jpg          ← 服装バリエーション
  ├── ゆい.png             ← サブキャラ
  ├── ゆい_表情.png        ← 表情パターン集
  ├── ゆい_三面図.png
  └── ... (計11ファイル)三面図（正面・横・背面を1枚にまとめた絵）が一番大事です。これをAIに「お手本」として渡すことで、「このキャラクターをこの見た目で描いてね」と伝えます。ちなみに、このキャラクター画像自体もAIで作れます。Geminiに「この人物の三面図を作って」と指示すれば、正面・横・背面を1枚にまとめた画像が生成されます。つまり「絵が描けない」は本当に言い訳にならないんです。2. コマ割りテンプレート「コマをどう配置するか」の参考画像も用意しておきます。60_AImanga/コマ割り/
  ├── koma1-1.jpg    ← 1コマ（一枚絵）
  ├── koma2-1.jpg    ← 2コマ レイアウト1
  ├── koma3-1.jpg    ← 3コマ レイアウト1
  ├── koma4-1.jpg    ← 4コマ レイアウト1
  │   ... (7パターンも！)
  ├── koma5-1.jpg 〜 koma5-5.jpg
  ├── koma6-1.jpg
  └── koma7-1.jpg    ← 全20パターン中身は白い枠線だけのシンプルな画像です。「このレイアウトでコマを割ってね」という、AIへの視覚的な指示書ですね。テキストで「上に大きいコマ、下に2つ小さいコマ」と書いてもAIは正確に従えません。お手本画像を見せることで、レイアウトの再現性が劇的に上がります。このテンプレート画像も、画像生成AIに「manga panel layout, 4 panels」と指示すれば作れますし、好みの漫画をスクリーンショットして参考にしてもOKです。実践 → 4コマ漫画を1本作ってみるここからは「NotebookLMで評価業務」という4コマを作ったときの話を、そのまま追いかけてもらいます。ストーリーを伝えて、モードを選ぶターミナルで `/create-manga` と打つと、スキルが起動します。ストーリーとして「175枚のワークシート評価にNotebookLMを使ったら一瞬で終わった」と伝え、「おまかせモード」を選びました。するとClaude Codeが自動で以下を決定してくれました。コマ数 → 4（起承転結のテンポが合う）スタイル → エッセイ漫画（日常体験ベースのストーリーに最適）トーン → コミカル（「一瞬で終わった」のオチに合う）キャラクター → ささ（主人公の教員キャラ）背景 → 職員室焦点 → 絶望からの一瞬解決のギャップレイアウト → koma4-4（上が大きく、中2分割、下が大きい配置）自分は「こんなストーリーで」と伝えただけです。あとはAIが全部考えてくれました。YAML設計図が生成されるここが核心です。Claude Codeが「漫画の設計図」をYAMLで吐き出してくれます。YAMLってなんぞや、という方へ。字下げ（インデント）で構造を表す、人間にも読めるデータ形式です。プログラミング言語じゃなくて、設定ファイルによく使われるやつです。長いですが、生成されたものをそのまま載せます。「ふーん、こういうこと書いてあるんだ」くらいで大丈夫です。comic_story:
  title: "NotebookLMで評価業務"
  created: "2026-02-22"
  source: "X投稿ネタから着想"
  style: "エッセイ漫画"
  tone: "コミカル"
  color_mode: "白黒"
  aspect_ratio: "3:4"
  generated_images: []

  art_style:
    line: "シンプルで柔らかい線画"
    shadow: "控えめ、最小限のスクリーントーン"
    background: "簡素だが場面がわかる程度"
    facial_expression: "コミカルに誇張した表情"
    monologue_style: "四角の囲み"

  character_infos:
    - name: "ささ"
      description: "小学校教員。175枚の評価に追われる主人公"
      appearance: "黒髪短髪の若い男性教師、水色シャツ、茶色パンツ、IDカードのネックストラップ"
      base_prompt: >-
        Young male teacher, short black hair, light blue dress shirt,
        brown pants, ID card on lanyard around neck.
        Earnest and sincere expression.

  comic_pages:
    - page_number: 1
      layout_instructions: "4コマ構成"
      layout_reference: "60_AImanga/コマ割り/koma4-4.jpg"
      panels:
        - number: 1
          page_position: "top"
          description: >-
            ささが175枚のワークシートの山に埋もれて呆然としている
          background: "職員室、デスク、薄暗い照明"
          camera_angle: "ミディアムショット、アイレベル"
          effects: "魂が抜ける演出、頭から縦線"
          characters:
            - name: "ささ"
              emotion: "絶望"
              expression: "目が死んでいる、疲労困憊"
              pose: "ワークシートの山に埋もれて目だけ見える"
              monologue: "175枚…ひとりずつ読んで…評価…"

        - number: 2
          page_position: "middle-right"
          description: >-
            【無言コマ】PDFファイルをNotebookLMにドラッグ＆ドロップしている手元
          background: "ノートPCの画面"
          camera_angle: "極端なクローズアップ（手元）、アイレベル"
          characters:
            - name: "ささ"
              emotion: "冷静・行動"

        - number: 3
          page_position: "middle-left"
          description: >-
            【無言コマ】NotebookLMの画面にAI分析結果が表示されている
          background: "ノートPCの画面、キラキラエフェクト"
          camera_angle: "クローズアップ、軽い俯瞰"
          effects: "画面が光る、キラキラ"

        - number: 4
          page_position: "bottom"
          description: >-
            ささが口をあんぐり開けて唖然。
            机の上のワークシートが消えてきれいになっている
          background: "職員室、きれいなデスク"
          camera_angle: "ミディアムショット、軽いアオリ"
          effects: "おばけ演出、?マーク"
          characters:
            - name: "ささ"
              emotion: "衝撃・困惑"
              expression: "口あんぐり、目が点"
              speech: "…え、もう終わった？"この設計図、何が書いてあるの？ざっくり3つの層があります。第1層 → 全体設定 — タイトル、スタイル（エッセイ漫画）、トーン（コミカル）、画風の方針など。ここが漫画の「雰囲気」を決めます。第2層 → キャラクター情報 — 外見を日本語と英語の両方で書いてあります。`base_prompt`（英語の外見描写）は、画像生成時にそのまま使われます。「Young male teacher, short black hair...」の部分ですね。第3層 → コマ設計 — ここが一番重要です。各コマごとに、場面描写・カメラアングル・キャラの感情・セリフが細かく指定されています。ここで見てほしいのが `camera_angle` の部分です。4コマでアングルがぜんぶ違っています。コマ1 — ミディアムショット、アイレベル正面から普通に見せる。「日常」の構図です。コマ2 — 極端なクローズアップ（手元）手元だけを超アップで見せる。言葉なしで「何をしてるか」を伝えます。コマ3 — クローズアップ、軽い俯瞰ちょっと上から覗き込む感じ。PC画面を見る視点です。コマ4 — ミディアムショット、軽いアオリ下から見上げる構図。驚きを強調します。同じアングルが2コマ連続していません。これはスキルに書かれた「アングル変化の鉄則」に基づいて、AIが自動設計しています。それから、コマ2とコマ3は無言コマ（セリフなし）です。4コマのうち2コマが無言。これも意図的で、「絵だけで語る」ことでテンポが生まれて、最後の「…え、もう終わった？」のインパクトが際立つようになっています。こういう構成ルールがスキルファイルに入っているから、AIが勝手にやってくれるんです。私が考えたわけじゃないです。ユーザー承認Claude Codeは生成した設計図を見せてくれた上で、セリフのプレビューも表示してくれます。--- 1ページ目 ---
【1コマ目】ささが175枚のワークシートの山に埋もれて呆然
  モノローグ(ささ): 175枚…ひとりずつ読んで…評価…
【2コマ目】【無言コマ】PDFをNotebookLMにドラッグ＆ドロップ
【3コマ目】【無言コマ】AI分析結果が表示
【4コマ目】ささが口をあんぐり。机がきれい
  セリフ(ささ): …え、もう終わった？「この構成でよろしいですか？」と聞かれるので、OKなら進みます。「セリフを変えたい」「アングルを変えたい」と言えば、設計図が修正されます。承認されるまで絶対に画像生成に進まない——これはスキルに明記されたルールです。「勝手に画像作っちゃった、やり直し」を防ぐガードレールですね。画像生成 — ここでGemini APIの出番ですOKを出した瞬間、Claude Codeが設計図（YAML）からプロンプトを自動で組み立てて、画像生成スクリプトを走らせます。実際に実行されるコマンドターミナルで実行されたコマンドがこれです。長いですが全文いきます。これ、私は1文字も書いていません。スキルが勝手に組み立てたやつです。node 60_AImanga/generate_manga_image.js \
  --prompt "Japanese black and white manga, essay manga style, simple clean lines, casual warm atmosphere, everyday life. comedic, lighthearted, funny, upbeat, playful.

Aspect ratio 3:4. Reading order: right to left, top to bottom (Japanese manga style).
EXACTLY 4 panels. Do NOT add extra panels.
Follow the reference image layout precisely for panel arrangement.

Panel 1 (top, large):
A young male teacher with short black hair, light blue dress shirt, brown pants, ID card on lanyard, sitting at his desk in the staff room. He is buried under a mountain of 175 worksheets, only his dead eyes visible above the pile. Soul leaving body effect, vertical despair lines above head. Medium shot, eye level.
Draw a LARGE white rectangular thought box with the Japanese text 「175枚…ひとりずつ読んで…評価…」 written clearly inside it, placed at the top of the panel.

Panel 2 (middle-right, small):
SILENT PANEL - NO TEXT. Extreme close-up of hands dragging a PDF file icon toward a laptop screen showing NotebookLM interface. The same young male teacher's hands. Eye level, extreme close-up of hands only.

Panel 3 (middle-left, small):
SILENT PANEL - NO TEXT. Close-up of laptop screen showing AI analysis results with sparkle effects. The screen is glowing. Slight high angle looking down at the screen.

Panel 4 (bottom, large):
The same young male teacher with short black hair, light blue dress shirt, brown pants, ID card on lanyard. His mouth is wide open in shock, eyes are dots of disbelief. The desk is now clean - all worksheets have disappeared. Staff room background, clean desk. Ghost/shock effect, question marks floating. Medium shot, slight low angle looking up.
Draw a LARGE white speech bubble with the Japanese text 「…え、もう終わった？」 written clearly inside it, placed near the character's mouth.

CRITICAL: Character appearance MUST match the reference images exactly. The character is a young male teacher with short black hair, light blue dress shirt, brown pants, and an ID card on a lanyard around his neck.
Do NOT add any labels, panel numbers, or text other than the specified dialogue/thought bubbles.
Black and white manga style only, no color." \
  --output "60_AImanga/output/2026-02-22_NotebookLMで評価業務/NotebookLMで評価業務.png" \
  --reference "60_AImanga/コマ割り/koma4-4.jpg" \
  --reference "60_AImanga/characters/ささ_三面図_白黒.png"英語がずらっと並んでいますが、やってることは単純で「YAMLに書いてあった内容を英語に変換した」だけです。`--output` で保存先を指定し、`--reference` で「コマ割りのお手本画像」と「キャラのお手本画像」を添付しています。画像を生成するスクリプト → generate_manga_image.jsGemini APIを叩くスクリプトの全文です。139行。プログラミングやらない方は「裏でこんな小さいプログラムが動いてるんだな」くらいの気持ちで眺めてください。#!/usr/bin/env node

// Gemini API を使った漫画画像生成スクリプト
// やっていること:
//   1. コマンドの引数（プロンプト、出力先、参考画像）を受け取る
//   2. 参考画像をBase64（テキスト形式）に変換する
//   3. Gemini APIに送信する
//   4. 返ってきた画像をファイルに保存する

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { prompt: "", output: "", references: [] };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--prompt":
        parsed.prompt = args[++i];
        break;
      case "--output":
        parsed.output = args[++i];
        break;
      case "--reference":
        parsed.references.push(args[++i]);
        break;
    }
  }
  return parsed;
}

function imageToBase64(filePath) {
  const absPath = path.resolve(filePath);
  const buffer = fs.readFileSync(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const mimeMap = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  const mimeType = mimeMap[ext] || "image/png";
  return { mimeType, data: buffer.toString("base64") };
}

async function generateImage({ prompt, output, references }) {
  if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY が .env に設定されていません");
    process.exit(1);
  }

  // 参考画像を先にパーツに追加
  // （コマ割り画像を最初に渡すと、レイアウトの再現性が上がります）
  const parts = [];
  for (const ref of references) {
    if (!fs.existsSync(ref)) {
      console.error(`Warning: 参考画像が見つかりません: ${ref}`);
      continue;
    }
    const { mimeType, data } = imageToBase64(ref);
    parts.push({ inlineData: { mimeType, data } });
  }

  // テキストプロンプトを追加
  parts.push({ text: prompt });

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],  // ← 「テキストと画像の両方を返して」
    },
  };

  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();

  // レスポンスから画像を探して保存
  for (const part of result.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      const outputPath = path.resolve(output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, buffer);
      console.log(`画像を保存しました: ${outputPath}`);
    }
  }
}

const args = parseArgs();
generateImage(args);やってることは「画像とプロンプトを受け取って、APIに投げて、返ってきた絵をファイルに保存する」。それだけです。レビュー画像ができると、Claude Codeがそのまま表示してくれます。「どうですか？」と聞かれるので、気に入らないコマがあれば「2コマ目の表情をもっと驚いた感じに」と言えばOK。そこだけ直して再生成してくれます。フィードバック — 「学習する」仕組み最後に「今回の漫画、どうでしたか？」と聞かれます。良かった！ → スタイル×トーンの組み合わせが `favorites.yaml` に保存されますまあまあ → 記録なし微妙だった → 改善コメント付きで記録されます実際の `favorites.yaml` はこうなっています。# お気に入りスタイル（「良かった！」で自動登録）
favorite_style:
  style: "エッセイ漫画"
  tone: "コミカル"
  panels: 4
  dialogue: true
  registered_date: "2026-02-22"

# フィードバック履歴（蓄積される学習データ）
feedback_history:
  - date: "2026-02-22"
    title: "AI勉強会への招待"
    style: "エッセイ漫画"
    tone: "コミカル"
    rating: "good"
    comment: >-
      3コマ目の「コミュニティ」が「ニティ」に化けた以外は良い仕上がり
    layout_ref: "koma4-4.jpg"
    angles_used: >-
      eye level full body → slight low angle bust
      → high angle close-up → extreme low angle medium次に「おまかせモード」で作るとき、このデータを見て良かったパターンを優先してくれます。微妙だったパターンは避ける。使うほど、好みの漫画が出てくるようになります。漫画は「プロンプト」で作るんじゃなく、「設計」で作るここまで読んでなんとなく感じていると思うんですが、このシステムってプロンプトの書き方がうまいから漫画になる、という話ではないんです。勝負どころは「設計図（YAML）をどう作るか」のほう。で、その設計図を作るのにClaude Codeが効く。スキルファイルに漫画の構成セオリーを書き込んであるので、AIがそれを踏まえて「いい構成」を自分で組んでくれます。カメラアングルと感情の対応表スキルファイルには、こんな対応表が埋め込んであります。緊張・圧迫 → 下から見上げる + 顔アップ（汗、影）悲しみ・孤独 → 上から見下ろす + 引きの構図（広い余白、小さな人影）怒り・衝撃 → 傾いた構図 + 超クローズアップ（集中線、見開いた目）ほのぼの・日常 → 正面 + 腰上の構図（柔らかい光）決意・覚悟 → 下から見上げる + 胸上の構図（強い目線、風）余韻・切なさ → 引きの構図 + シルエット（逆光、広い空）Claude Codeは設計図を作るとき、この対応を踏まえて「このコマの感情は『絶望』だから、アイレベルで正面から」みたいに選んでくれます。映画の撮影技法と同じ発想です。怒りのシーンでは下から煽る、悲しみのシーンでは上から見下ろす。私はこういうの全然知らなかったんですが、スキルファイルに書いておけばAIが勝手にやってくれます。知識は自分の頭になくても、ファイルの中にあればいい。アングル変化の鉄則 → 同じアングルを2コマ続けない漫画で一番やってはいけないのは、同じ構図が連続することです。読者が飽きます。スキルには「核心ルール → 同じアングルを2コマ続けない」と書かれていて、4コマならこう配置します。コマ1（起） → 正面から安定した構図で日常を見せるコマ2（承） → 角度をちょっと変える。発展を受け取るコマ3（転） → ここが最大のポイント。思い切った構図にするコマ4（結） → 顔アップで感情を見せるか、引きの構図で余韻を残す漫画構成チェックリストこれ、地味にすごいんですが。AIが設計図を作った後、私に見せる前に自動チェックが走ります。テキスト密度 → 全コマにセリフを入れていないか？ 1ページに最低1コマは「無言コマ」を入れる無言コマの活用 → 表情のアップ、手元のアップで「間」を作っているかぶち抜き演出 → 感情のピークで使う。1作品で2〜3箇所が適切コマのリズム → 大→小小→大で緩急をつけるラストの余韻 → 結論より「問いかけ」で閉じるページめくりの設計 → 各ページ最終コマに「次が気になる」引きを作るプロの漫画家さんは、たぶんこれを無意識にやっています。私にはその感覚がないので、テキストで書き出してAIに渡しています。自分にないセンスをファイルで補える、って話です。4ページ漫画を作ったときの話 → 失敗と学び1ページ4コマはわりと安定します。問題は4ページ漫画です。やってみたらぜんぜん違う壁がありました。壁1 → キャラの顔が途中で変わる4ページを並行で画像生成したところ、Page 4で主人公の顔が別人になりました。理由はシンプルで、各ページは別々にAPIを叩いているので、AIには「Page 1〜3でどんな顔を描いたか」の記憶がないんです。解決策 → 参考画像を増やしました。三面図だけでなく正面図も `--reference` で渡したところ、一貫性がかなり改善されました。壁2 → セリフが多すぎて「漫画」にならない初稿では全14コマにテキスト（セリフかモノローグ）が入っていました。読み返してみると、「文章に絵を添えた感じ」で漫画になっていなかったんです。そこでチェックリストに照らして修正しました。テキスト要素 → 14個から9個に削減無言コマ → 0個から3個に追加ぶち抜き演出 → 1個から3個に追加ラスト → 「届くとは、相手の行動が変わること」（結論）を「誰に届けたいんだろう」（問いかけ）に変更「足し算」より「引き算」で漫画は良くなります。 これは最大の学びでした。で、この教訓をすぐチェックリストに書き足しました。次からは自動で適用されます。スキルがちょっと賢くなった瞬間です。完成した4ページ目のYAML（抜粋）最終ページの設計図を見てみてください。- page_number: 4
  layout_instructions: "3コマ構成"
  layout_reference: "60_AImanga/コマ割り/koma3-3.jpg"
  panels:
    - number: 1
      page_position: "top-right"
      description: "教室で一方的に語る。子どもたちZzz"
      camera_angle: "ロングショット、アイレベル"
      characters:
        - name: "ささ"
          emotion: "空回り"
          speech: "先生はこう思います！"

    - number: 2
      page_position: "top-left"
      description: "問いかけに変えた途端、子どもたちの目が輝く"
      camera_angle: "ミディアムショット、軽いアオリ"
      characters:
        - name: "ささ"
          emotion: "穏やかな問いかけ"
          speech: "みんなにとって、これってどう？"

    - number: 3
      page_position: "bottom"
      description: >-
        【ぶち抜き】夕暮れの帰り道。
        ささとゆいのシルエット
      camera_angle: "ロングショット、シルエット気味の逆光"
      effects: "夕焼け、広い余白、ぶち抜き"
      characters:
        - name: "ささ"
          emotion: "穏やかな確信"
          monologue: "誰に届けたいんだろう"
        - name: "ゆい"
          emotion: "安心・幸せ"最後は夕暮れのシルエット。引きの構図＋逆光。さっきの対応表でいう「余韻・切なさ → ロングショット + シルエット」そのままです。モノローグは「誰に届けたいんだろう」。結論じゃなくて「問い」で終わらせました。チェックリストの「ラストの余韻」ルールにしたがった結果、読み返したときの余韻がぜんぜん違いました。プロンプトの6つの鉄則 → これを知らないと失敗します何本か作る中で「これやらないとダメだわ」と気づいたことが6つあります。今はぜんぶスキルファイルに入れたので自動で守られますが、自分で仕組みを作りたい方は知っておいてください。鉄則1 → コマ割りの参考画像は必ず添付する# NG: テキストだけで指示
--prompt "4 panels, top large, bottom two small..."

# OK: 参考画像を添付
--reference "60_AImanga/コマ割り/koma4-4.jpg"テキストだけだと、AIが「ここにもう1コマ入れた方がいいな」と勝手に判断してレイアウトを変えてしまいます。お手本画像を渡すと劇的に安定します。鉄則2 → セリフは「この日本語を書いて」と指示する# NG: 「セリフ用のスペースを空けて」
[Speech bubble space for dialogue]

# OK: 「この日本語テキストを吹き出しの中に書いて」
Draw a LARGE white speech bubble with the Japanese text
「175枚…ひとりずつ読んで…評価…」 written clearly inside it.Geminiは日本語を画像の中に直接描けるんです。でも「スペースを空けて」と言うと空っぽの吹き出しだけ描きます。書くべき文字を具体的に指定する必要があります。鉄則3 → 吹き出しは「LARGE」と明記するサイズ指定がないと、切手くらい小さい吹き出しが生成されます。`LARGE` の一語を足すだけで読めるサイズになります。鉄則4 → コマ数を強調するEXACTLY 4 panels. Do NOT add extra panels.この2文がないと、AIが親切心で5コマ目を追加したりします。「これ以上描くな」と明言するのが大事です。鉄則5 →「起承転結」という文字をプロンプトに入れない# NG: 起承転結ラベル付き
Panel 1 (起):
Panel 2 (承):

# OK: ラベルなし
Panel 1 (top, large):
Panel 2 (middle-right, small):これは最初に驚いたんですが、「起承転結」とプロンプトに書くと、AIがそれをテキストとして画像の中に描いてしまうんです。漫画のコマの中に「起」とか「承」とか書かれてしまいます。構成理論は設計段階で使い、プロンプトには入れない。これが鉄則です。鉄則6 → キャラの参考画像を毎回渡すAIは「前のページでこのキャラをどう描いたか」を覚えていません。複数ページを作るなら、全ページのプロンプトに同じキャラ参考画像を渡す必要があります。さらに、三面図だけでなく正面図も追加で渡すと一貫性が上がります。4ページ漫画を作ったときに実感しました。スタイルとトーンの「語彙」→ こんなに変えられますスキルにはスタイル12種類、トーン12種類が入っています。同じストーリーでも、組み合わせを変えるだけでぜんぜん違う漫画になります。スタイル別プロンプト（一部抜粋）少年漫画`Japanese black and white manga, shonen aesthetic, dynamic action lines, bold line art, screentone shading.`劇画`Japanese black and white manga, gekiga aesthetic, heavy inking, dramatic shadows, noir atmosphere.`エッセイ漫画`Japanese black and white manga, essay manga style, simple clean lines, casual warm atmosphere.`カイジ風`Japanese black and white manga, Fukumoto Nobuyuki style, sharp angular faces, extreme close-ups of eyes and sweat drops, psychological tension.`少女漫画`Japanese black and white manga, shoujo aesthetic, delicate line art, floral screentone, sparkle effects.`絵本風`Japanese black and white illustration, picture book style, soft rounded lines, gentle warm atmosphere.`ギャグ`Japanese black and white manga, gag manga aesthetic, exaggerated expressions, chibi moments.`トーン別キーワード（一部抜粋）シリアス → `serious, tense, heavy atmosphere, dramatic lighting`コミカル → `comedic, lighthearted, funny, upbeat, playful`ノスタルジック → `nostalgic, wistful, dreamy, soft light, faded memories`静寂 → `quiet, contemplative, white space, poetic, minimal`熱血 → `passionate, intense, energetic, fiery, dynamic`切ない → `bittersweet, melancholic, poignant, lingering sadness`「エッセイ漫画 × コミカル」が私のお気に入りですが、同じストーリーを「劇画 × シリアス」に変えるだけで、まったく別の漫画になります。出力の設計 →「YAMLは漫画のソースコード」できあがったファイルは、こういう形で保存されます。60_AImanga/output/
  └── 2026-02-22_NotebookLMで評価業務/
        ├── NotebookLMで評価業務.yaml    ← 設計図（これがあれば再生成できる）
        ├── NotebookLMで評価業務.png      ← 生成画像
        └── NotebookLMで評価業務_v2.png   ← 修正版YAMLと画像がセットで残ります。つまり、あとからYAMLだけ直して再生成できる。プログラマーの方なら「ソースコード」って言えば伝わると思います。コードがあればプログラムを作り直せるように、YAMLがあれば漫画を作り直せます。YAMLは漫画のソースコードです。あと地味に助かるのが、Claude Codeが勝手にフォルダを作って整理してくれること。「あのYAMLどこだっけ？」にならないんです。ハマりポイント集 → 先に知っておくと幸せです私が実際にハマったやつを5つ書きます。全部もうスキルファイルにルールとして入れたので、今はもう踏まないんですが。同じようなことをやりたい方はぜひ先に読んでおいてください。1. 「コミュニティ」が「ニティ」になるGeminiの日本語描画はけっこう優秀なんですが、長いカタカナ語でたまにバグります。「コミュニティ」が「ニティ」になったりする。前半どこいった。対処法は、短い言い方に変えるか、「まあ読めるか」と割り切るか。私は後者です。2. コマが勝手に増える`EXACTLY 4 panels` を入れ忘れると、AIが5コマ目を追加します。これ、本当にやります。鉄則4で書いた通り、明確に禁止しましょう。3. 「起承転結」が画像の中に文字として描かれる鉄則5で詳しく書きましたが、最初は本当にびっくりしました。漫画のコマの中に堂々と「起」って書いてあるんです。4. 4ページ目でキャラが別人になる鉄則6です。参考画像を増やすのが最善策ですが、それでも完全一致は難しいので、「v2として再生成する」余地を最初から持っておくのがおすすめです。5. 吹き出しが小さすぎて読めない鉄則3です。`LARGE` の一語で解決します。最初に知りたかった。Claude Codeで漫画を作るメリット → まとめここまで読んで「結局、ブラウザのAIチャットと何が違うの？」と思っている方もいると思います。並べてみますね。普通のAIチャットとの違い漫画を作るブラウザAI → プロンプトを毎回手打ちClaude Code → `/create-manga` と打つだけ構成の品質ブラウザAI → 自分の知識に依存Claude Code → 構成理論がスキルに内蔵されているファイル保存ブラウザAI → 手動ダウンロード＆フォルダ整理Claude Code → 指定フォルダに自動保存設計図の保管ブラウザAI → チャット履歴に埋もれて見つからないClaude Code → YAMLファイルとして残る再生成ブラウザAI → 最初からやり直しClaude Code → YAMLを修正して再実行学習ブラウザAI → 自分の記憶だけClaude Code → favorites.yamlに自動で蓄積される他の作業との連携ブラウザAI → コピペ地獄Claude Code → X投稿案の作成→承認→自動投稿まで一気通貫最後の「連携」がいちばん大きいです。漫画を1枚作るだけなら、正直ブラウザのAIチャットでもなんとかなります。でも「作った漫画をXの投稿に組み込んで、自動投稿に乗せて、設計図は次も使える形で残す」まで考えると、Claude Codeじゃないと回らないです。必要なもの一覧「ちょっとやってみたい」と思った方へ。必要なものはこれだけです。Claude Code — Anthropicの公式サイトからインストールGemini API キー — Google AI Studioで無料取得キャラクター参考画像 — 三面図 + 正面図を推奨（AIで作れます）コマ割りテンプレート — 使いたいレイアウトの参考画像（これもAIで作れます）スキルファイル — `.claude/commands/create-manga.md`（この記事で公開した内容がベースです）再現用ファイル一覧`.claude/commands/create-manga.md` — スキル定義（ワークフロー全体）542行`60_AImanga/app-flow.md` — 設計思想・YAML仕様・構成理論 293行`60_AImanga/prompts.md` — プロンプトテンプレート集 383行`60_AImanga/generate_manga_image.js` — Gemini API呼び出しスクリプト 139行`60_AImanga/favorites.yaml` — 学習データ・お気に入りスタイル 34行`60_AImanga/コマ割り/*.jpg` — パネルレイアウトテンプレート 20ファイル`60_AImanga/characters/*.png` — キャラクター参考画像 11ファイルおわりに → AI漫画は「描く」ではなく「設計する」仕事ですここまで読んでくれた方、ありがとうございます。長かったですよね。私がやったことを一言で言うと、「漫画の作り方をテキストファイルに書いて、AIに渡した」です。それだけです。プロンプトを1行書いてAIに丸投げしても、できあがるのは「漫画っぽい何か」です。コマ割り、アングル、感情の配置、セリフの量——そういうのを先に設計しないと、漫画にはならない。でも、その「設計」を自分でできなくてもいいんです。スキルファイルに漫画のセオリーを書いておけば、AIがそのとおりに設計してくれる。私は「こんな話にしたい」と言って「OK」を押すだけ。スキルファイルは使うたびに育ちます。失敗したらルールを足す。うまくいったらパターンを記録する。最初100行だったファイルが542行になりました。経験が消えずに残る。これが個人的にはいちばん気に入っているところです。絵は描けません。たぶんこれからも描けません。でも漫画は作れます。必要なのは「何を伝えたいか」だけです。同じように「AIで何か作りたいけど、何からやれば……」と思っている方がいたら、この記事が最初の一歩になればうれしいです。タグ #AI漫画  #生成AI  #ClaudeCode  #Gemini  #AI活用  #画力ゼロ  #プロンプトエンジニアリング  #漫画制作  #AIイラスト  #やってみた
