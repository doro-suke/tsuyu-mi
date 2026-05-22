# たった1枚の画像からボンボンドロップ風シールを作るプロンプト｜まと｜デザイン×AI
- **Source URL**: https://note.com/mato_note/n/n73a30ccf833b
- **Score**: 25
- **AI Summary**:
  - Google Geminiを用いて1枚の画像から多バリエーションのシール画像を生成するプロンプトの紹介
  - 画像解析による被写体の自動判別と、表情差分や擬人化を組み合わせた生成プロセスを定義している
  - 質感の微細な指定やアスペクト比の固定など、実用的な画像生成AIの制御手法が記載されている
- **Read Now Reason**: 画像生成プロンプトにおける「段階的指示（Step-by-step）」の構成は、AIへの高度な指示出しの参考になるため
- **Suggested Tags**: #PromptEngineering, #Gemini
- **Processed Date**: 2026/5/13

---

## 本文
このプロンプトを作ったきっかけ前回のプロフィールカードに続き、SNSプロフィールのスクリーンショットからボンボンドロップシールがなんと2日で100万インプを超え、4日目で300万インプを超えました！次はコレだぁぁ!!Xの民よ…ボンドロシールを知っているか…！？アクリルプロフカードがおかげさまでたくさんの方につくってもらって感謝です！またまた楽しめるプロンプトをつくったのでみなさんぜひ試してください！ボンボンドロップシール（風）にするプロンプト誰でも簡単につくれます！… pic.twitter.com/XrRHSHAPE2— まと｜AI×デザイン (@MatoToushi) March 24, 2026


たくさんの企業様が制作してくれたことがうれしすぎたとある企業さまが作ってくれたのをキッカケに、そこから名だたる大企業の公式アカウントが公式アカウントのボンボンドロップシールを制作！載せきれないほど引用＋作成して頂きました！中には１枚ずつスクショを並べてから作ってくれる企業様もhttps://x.com/agfcm2/status/2037366424482857228?s=20キャラ絵をコツコツ並べてから作ってみた！というポストも見かけるようになり、それならポン出しで自分のキャラやペット、子どものシール風画像を作れたら楽しいのでは？と思うように。手間を省いて楽しんでもらいたい今回のプロンプトも・ポン出しで・画像１枚で・完成度高くこの３つを意識して開発しました！実際に作ってみた画像がこちら私のイラストアイコン（ロングヘアバージョン）赤ちゃんの写真から表情差分ペットの写真からこんなバリエーションもお菓子のパッケージなど「モノ」でもOK！これは架空のお菓子パッケージですｗ生成手順を解説！使い方はとっても簡単。スマホの写真フォルダにある画像１枚さえあれば、すぐに作れます。動画で見たい方はこちらGeminiの画像生成画面がちょっと今のものと違ってますが、見るところは同じなのでこちらを参考にしてください！https://www.loom.com/share/25b2659ae752411092d45219e6077e30動画が見れない人向けにテキストでも解説1. Google Gemini を開く ブラウザで gemini.google.com を開き、Googleアカウントでログイン。 スマホの方はアプリ版Geminiをダウンロード。iPhoneアプリ：App StoreAndroidアプリ：Google Play ストアご自身のGoogleアカウント等で必ずログインまたは新規でアカウント作成をしてください。2. 画像生成モードを確認する アプリを開いたら「思考モード」と「画像を作成」に切り替え。 思考モードは1日3〜5回まで。使い切ると高速モードに自動で切り替わります。（2026/3現在） 高速モードでも十分キレイに作れます。3. スクリーンショットをアップロードする ① 入力欄左の「＋」ボタンをタップ ② 「写真や動画を追加」を選択 ③ プロフィールのスクリーンショットを選んでアップロード4. プロンプトを入力して送信する 画像がアップロードされた状態で、下のプロンプトを貼り付けて送信。 5. 生成された画像を保存する 生成された画像の右下にある「ダウンロード」ボタンをタップして保存。うまく画像が生成されない時の対処法チャットを毎回切り替えるAIはチャットを切り替えると頭が切り替わるように、生成結果をリセットしてくれます。同じチャットで同じプロンプトを使っていると、ひとつ前に生成した画像に引っ張られたりするので、写真を変える時は必ず新規チャットを開いてみてください。プロンプトを変えたい時は？プロンプトの変更は自由に行ってもらってOKです！例えば色やネイルを変えたいなど。その場合はプロンプトをコピーしたあと、メモアプリ等に貼り付けて、指示してある文章を変更します。その変更したプロンプトを全文コピーし、AIのチャット欄に貼り付けて生成してみてください。ここを変えるとどんなふうに変わるかな？と試しながらやってみるのも面白いです！ボンドロ風シールのプロンプトはこちら！添付した画像を分析し、以下の手順に従って画像を生成してください。

【ステップ1：画像の判別】
添付画像が以下のどちらに該当するか判別してください。
A）生き物（人物アイコン（イラスト・実写どちらも含む）、動物アイコン）
B）無機物（お菓子のパッケージ、文房具、ガジェット、食品、雑貨など、生き物以外すべて）

【ステップ2：9つのバリエーション作成】

■ Aの場合（生き物）：
添付画像のキャラクター／人物／動物の見た目を完全に維持したまま、以下の9つの表情差分を作成してください。実写の写真が入力された場合は、イラスト化やデフォルメをせず、実写のリアルな質感をそのまま忠実に再現してください。
1. cute neutral pose（かわいいニュートラルポーズ）
2. laughing hard（大笑い）
3. surprised（驚き）
4. shy / blushing（はにかみ）
5. angry（怒り）
6. crying（泣き顔）
7. shocked（ショック）
8. sleepy（眠そう）
9. excited（興奮）

■ Bの場合（無機物）：
添付画像の対象物を分析し、以下の9つのバリエーションを作成してください。
1. 元の画像そのままの姿
2〜4. この対象物の自然で魅力的なバリエーションを3つ考えて作成（例：複数並べる、積み上げる、開封する、使用中のシーンなど、対象物に最も合うものをAIが判断）
5. 対象物を擬人化したキャラクター（スタンダードポーズ）
6. 擬人化キャラクターの「喜」の表情
7. 擬人化キャラクターの「怒」の表情
8. 擬人化キャラクターの「哀」の表情
9. 擬人化キャラクターの「楽」の表情

【ステップ2.5：ロゴ・テキストの確認】
添付画像内にロゴ、ブランド名、商品名などのテキスト要素がある場合は、それを追加の1枚のシールとして作成し、合計10個のシールにしてください。ロゴやテキストがない場合は9個のままで進めてください。

【ステップ3：以下のプロンプトで画像を生成】

---IMAGE GENERATION PROMPT---

A single hand of a woman holding a transparent clear film sticker sheet from the bottom edge only, gripping just the lower corner of the sheet between thumb and fingers. The hand stays at the very bottom of the frame and does not wrap around or cover any stickers. All stickers on the sheet are fully visible and unobstructed. The hand has beautifully designed nail art — the nail color and design should be inspired by the color palette and visual motifs of the attached image, creating a harmonious match.

On the transparent film sheet, the die-cut "puku-puku" puffy stickers are arranged in a balanced, natural layout with no stickers overlapping each other. Each sticker represents one of the variations created in Step 2 (and the logo sticker from Step 2.5 if applicable).

Every sticker has:
- A transparent clear base with glossy, soft, raised gel texture
- Rounded puffy edges with visible thickness
- Subtle light reflections emphasizing the dimensional, squishy "puku-puku" appearance
- A soft holographic rainbow sheen on the clear film backing with delicate white light streaks

The stickers preserve the original colors, details, and character of the attached image faithfully. Each variation is clearly distinct and recognizable as a separate sticker piece on the sheet. If the input image is a real photograph, maintain photorealistic quality — do not stylize, cartoonize, or deform the subject in any way.

The scene is set in a bright, clean white photography studio with soft natural daylight streaming in from a window. Gentle window light casts soft, natural shadows and light patterns across the scene. The background shows a subtly blurred white wall and a hint of a white surface, creating a professional product photography atmosphere. The lighting is natural and airy, making the prismatic reflections on the stickers sparkle vividly.

Ultra-detailed, high resolution, soft shadows, 8K quality. No text, no watermark, no lettering on any sticker. IMPORTANT: The output image MUST be exactly 4:5 aspect ratio (vertical portrait orientation), regardless of the aspect ratio of the input reference image. The input image is reference only — do not match its proportions.作成したものを紹介する時はこちらのnoteのリンクか投稿を引用してくださいアレンジも自由なのでちょっとだけ引用元やメンションくれると嬉しいです！noteのリンクはこちらを使ってください！▼https://note.com/mato_note/n/ndb3c7a4d33a2https://note.com/mato_note/n/ndb3c7a4d33a2
