# Nano Banana 2 / Pro API実践ガイド — GA版Gemini画像生成をPythonで使いこなす - Qiita
- **Source URL**: https://qiita.com/kai_kou/items/57913a30305d2e9ca7ae
- **Score**: 75
- **AI Summary**:
  - Gemini画像生成モデルのGA版移行に伴い、プレビュー版が2026年6月にシャットダウンされること
  - Python SDKによるアスペクト比・解像度指定や、マルチターン画像編集の具体的な実装コード
  - Flashモデル限定で、動画URLから映画ポスターやサムネイルなどの画像を自動生成する新機能を紹介
- **Read Now Reason**: 2026年6月25日のプレビュー版APIシャットダウンに伴う移行コード（サフィックスの削除）と、動画からサムネイルを自動生成するパイプライン構築に直結するPython実装が具体的に開示されているため。
- **Suggested Tags**: #Gemini-API, #Python-SDK, #画像生成, #API移行
- **Processed Date**: 2026/6/4

---

## 本文
はじめに
2026年5月28日、Google AI for Developers の Gemini API において、ネイティブ画像生成モデル gemini-3.1-flash-image（コードネーム Nano Banana 2） と gemini-3-pro-image（Nano Banana Pro） が一般提供（GA）に到達しました1。これまで -preview 付きのプレビュー版として提供されていたモデルが正式版となり、プロダクションでの利用が前提になります。
この記事では、GA版の2モデルを google-genai Python SDK から呼び出して画像を生成・編集する手順を、公式ドキュメントに基づいて解説します。

この記事で解決できること

GA版モデルID（gemini-3.1-flash-image / gemini-3-pro-image）への移行ポイントの把握
Python SDK での画像生成・編集の実装方法の習得
アスペクト比・解像度の指定方法の理解
2モデルの使い分け方針の整理


対象読者

Gemini API で画像生成を実装したいエンジニア
プレビュー版から GA版へ移行したい方
AI画像生成をアプリに組み込みたい方


前提環境

Python 3.9 以上

google-genai SDK
Gemini API キー（Google AI Studio で取得）


TL;DR


gemini-3.1-flash-image（Nano Banana 2）= 高速・低コスト。高ボリューム用途向け

gemini-3-pro-image（Nano Banana Pro）= 高品質。テキスト描画やインフォグラフィック向け
プレビュー版（-preview）は 2026年6月25日にシャットダウン されるため、GA版IDへの移行が必須
SDK は from google import genai。image_config でアスペクト比・解像度を制御


1. GA移行で押さえるべき変更点
最も重要なのはモデルIDの変更です。プレビュー版からGA版へは、IDの -preview サフィックスを外すだけで移行できます。



用途
プレビュー版（停止予定）
GA版（推奨）




高速・低コスト
gemini-3.1-flash-image-preview
gemini-3.1-flash-image


高品質
gemini-3-pro-image-preview
gemini-3-pro-image




プレビュー版の2モデル（gemini-3.1-flash-image-preview / gemini-3-pro-image-preview）は 2026年6月25日にシャットダウン されます1。それまでにGA版IDへ切り替えてください。

料金は解像度（1K / 2K / 4K）によって変動します。正確な金額は公式の料金ページを参照してください2。

2. 準備

2-1. SDKのインストール
pip install -U google-genai pillow


2-2. APIキーの設定
環境変数 GEMINI_API_KEY にAPIキーを設定しておくと、クライアントが自動的に読み込みます。
export GEMINI_API_KEY="your-api-key"


3. テキストから画像を生成する
最小構成のコードは以下の通りです。from google import genai でSDKを読み込み、generate_content にモデルIDとプロンプトを渡します。
from google import genai

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image",
    contents="A cute cat programmer working on a laptop, flat design illustration",
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("generated_image.png")

レスポンスの parts にはテキストと画像が混在しうるため、part.as_image() で画像パートだけを取り出して保存します3。as_image() は画像データ（inline_data）を持たないパートに対しては None を返すため、上記のように戻り値で分岐できます。

公式ドキュメントでは if part.inline_data is not None: で画像パートを判定してから part.as_image() を呼ぶパターンも示されています。どちらでも動作しますが、「画像が含まれるのは inline_data を持つパートだけ」という点を押さえておくと分岐を理解しやすくなります。


4. アスペクト比・解像度を指定する
config に types.ImageConfig を渡すことで、アスペクト比と解像度を制御できます。
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image",
    contents="An infographic explaining the architecture of a web application",
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="2K",
        ),
    ),
)

for part in response.parts:
    if image := part.as_image():
        image.save("infographic.png")

指定できる値は公式ドキュメントで以下のように定義されています3。



パラメータ
指定可能な値




aspect_ratio

1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 ほか


image_size

1K, 2K, 4K（gemini-3.1-flash-image は 512 も指定可）




image_size のデフォルトは 1K です。高解像度（4K）ほど生成コストとレイテンシが上がるため、用途に応じて選択してください。


5. 既存画像を編集する（image-to-image）
contents にプロンプトと画像を一緒に渡すと、画像編集（image-to-image）として動作します。PIL.Image で読み込んだ画像をそのまま渡せます。
from google import genai
from PIL import Image

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image",
    contents=[
        "Change the background to a starry night sky",
        Image.open("input.png"),
    ],
)

for part in response.parts:
    if image := part.as_image():
        image.save("edited.png")


マルチターンで対話的に編集する
client.chats.create を使うと、会話の文脈を保ったまま段階的に画像を編集できます。
from google import genai
from google.genai import types

client = genai.Client()

chat = client.chats.create(
    model="gemini-3.1-flash-image",
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
    ),
)

response = chat.send_message("Generate a logo for a coffee shop")
# 続けて修正指示を送ると、直前の生成結果を踏まえて編集される
response = chat.send_message("Make the color warmer and add a coffee bean icon")


6. 動画からサムネイル・ポスターを生成する（Flash限定）
GAリリースで追加された注目機能が、動画をマルチモーダルコンテキストとして渡す 機能です。直接アップロードした動画ファイルや公開YouTube URLを入力し、サムネイル・映画ポスター・サマリーインフォグラフィックを生成できます。この機能は gemini-3.1-flash-image 限定 で提供されます1。
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image",
    contents=types.Content(
        parts=[
            types.Part(
                file_data=types.FileData(
                    file_uri="https://www.youtube.com/watch?v=xxxxxxxxxxx"
                )
            ),
            types.Part(text="Generate a cinematic movie poster summarizing this video"),
        ]
    ),
)

for part in response.parts:
    if image := part.as_image():
        image.save("poster.png")


7. 2モデルの使い分け



観点

gemini-3.1-flash-image（Nano Banana 2）

gemini-3-pro-image（Nano Banana Pro）




位置づけ
高速・低コスト・高ボリューム向け
高品質・テキスト描画重視


動画→画像
対応
非対応


解像度 512

指定可
不可


想定用途
大量生成、プロトタイピング、ラフ案
最終成果物、インフォグラフィック、ポスター



まずは gemini-3.1-flash-image で素早く試作し、品質が求められる最終出力で gemini-3-pro-image に切り替える、という段階的な使い方が現実的です。

トラブルシューティング

Q1: part.as_image() が None を返す
A: レスポンスにテキストパートしか含まれていない可能性があります。response_modalities に "IMAGE" が含まれているか確認してください。config を指定しない場合でも画像は返りますが、明示しておくと確実です。

Q2: プレビュー版IDで 404 や非推奨警告が出る
A: GA版ID（-preview を外したID）へ移行してください。プレビュー版は2026年6月25日に停止されます1。

Q3: アスペクト比を指定しても反映されない
A: image_config ではなくトップレベルの引数に渡していないか確認してください。types.GenerateContentConfig(image_config=types.ImageConfig(...)) の形でネストする必要があります。

まとめ


gemini-3.1-flash-image（Nano Banana 2）/ gemini-3-pro-image（Nano Banana Pro）が 2026年5月28日に GA 到達
プレビュー版は2026年6月25日に停止 → GA版IDへの移行が必須

image_config でアスペクト比・解像度を制御できる
画像編集は contents に画像を渡すだけ。マルチターン編集は chats.create を使う
動画→画像生成は gemini-3.1-flash-image 限定の新機能

高速・低コストの Flash と高品質の Pro を用途で使い分けることで、画像生成パイプラインを効率的に構築できます。

参考リンク


Release notes | Gemini API — GA到達・preview停止日の出典

Image generation | Gemini API — SDKコード・パラメータの出典

Gemini API Pricing — 解像度別料金

Google Gen AI SDK documentation — google-genai SDKリファレンス




Release notes | Gemini API | Google AI for Developers（2026-05-28 のエントリ） ↩ ↩2 ↩3 ↩4


Gemini API Pricing | Google AI for Developers ↩


Image generation | Gemini API | Google AI for Developers ↩ ↩2



0Go to list of users who liked0Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
