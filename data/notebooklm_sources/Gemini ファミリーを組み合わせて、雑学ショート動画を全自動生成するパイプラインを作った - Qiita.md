# Gemini ファミリーを組み合わせて、雑学ショート動画を全自動生成するパイプラインを作った - Qiita
- **Source URL**: https://qiita.com/yongyong/items/9c034177f4330ca1899f
- **Score**: 85
- **Suggested Tags**: #自動化パイプライン, #Gemini, #マルチモーダルAI
- **Processed Date**: 2026/8/25

---

## 本文
TL;DR


Gemini 3.0 Pro でスクリプト生成＆科学的検証（誤情報防止）

Gemini 3.0 Pro Image でサムネイル生成

Gemini TTS でナレーション生成

Whisper で単語レベルのタイムスタンプ取得

Gemini 3.0 Pro で動画構成を決定（2.5 Proでは使い物にならなかった）

MoviePy + PIL で動画レンダリング
完成した動画は YouTube / TikTok / Instagram で公開中





完成した動画の例

はじめに
個人開発で料理アプリ「CookForYou」を作っています。
マーケティングの一環として、漫画の自動生成に加えて料理の科学を伝える雑学ショート動画を作ることにしました。

なぜ豚肉とにんにくを一緒に食べるとスタミナがつくのか？
なぜトマトは加熱すると栄養価が上がるのか？
なぜ野菜は蒸すと栄養が逃げにくいのか？

こういった「料理の科学」を知ると、レシピを丸暗記するのではなく、自分で応用できるようになります。料理が「作業」から「知的な遊び」に変わる瞬間です。
ただ、動画を1本ずつ手作りしていては時間がかかりすぎる。そこで考えたのが 「Geminiファミリー総動員で動画を量産するパイプライン」 です。

なぜ今Geminiなのか
2024年末〜2025年にかけて、Geminiファミリーの能力が劇的に向上しました。


Gemini 3.0 Pro: 長文の論理的な生成・検証が得意、動画構成の決定も高精度

Gemini 3.0 Pro Image: 高品質な画像生成

Gemini TTS: 自然な日本語音声

これらを組み合わせることで、テキスト入力だけで動画が完成するパイプラインが現実的になりました。

実際に生成した動画
このパイプラインで作成した動画がこちらです👇

このプレイリストの動画は、人の手が一切入っていません。 完全自動生成です。

全体アーキテクチャ


入力: 「こんなネタで動画を作りたい」というテキストファイル1つ。 豚肉とにんにくの組み合わせが最強の疲れ会話付など
出力: 動画ファイル＋各SNS用の投稿文・タグ

各コンポーネントの詳細

Step 1: スクリプト生成（Gemini 3.0 Pro）
入力テキストから、ショート動画用の台本を生成します。
ショート動画は最初の1秒が勝負。視聴者の興味を引き、テンポよく情報を伝え、最後に行動を促す。この構成をプロンプトで指示しています。
SCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "description": "動画タイトル（25文字以内、キャッチーで興味を引く）"
        },
        "script": {
            "type": "string",
            "description": "ナレーション原稿（話し言葉、テンポ良く）"
        },
        "description": {
            "type": "string",
            "description": "動画説明文（100-150文字、ハッシュタグ含まない、SEO考慮）"
        },
        "tags": {
            "type": "object",
            "properties": {
                "youtube": {"type": "array", "items": {"type": "string"}},
                "tiktok": {"type": "array", "items": {"type": "string"}},
                "instagram": {"type": "array", "items": {"type": "string"}},
                "x": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["youtube", "tiktok", "instagram", "x"]
        }
    },
    "required": ["title", "script", "description", "tags"]
}


Step 2: 科学的検証（Gemini 3.0 Pro）
ここが個人的にこだわったポイントです。
料理の科学を伝えるコンテンツで、科学的に間違った情報を流すわけにはいきません。LLMが生成したスクリプトの科学的な正当性を、別のLLMが検証する仕組みを入れています。
検証でNGが出たら、そこでパイプラインは停止。動画は生成されません。
一方、誇張表現についてはWarning扱いにしています。ショート動画という媒体の性質上、ある程度のキャッチーさは必要だからです。「劇的に」「驚異的に」といった表現が検出された場合はWarningを出し、最終的には私が確認して判断しています。
VALIDATION_SCHEMA = {
    "type": "object",
    "properties": {
        "is_valid": {
            "type": "boolean",
            "description": "科学的に正しいかどうか"
        },
        "has_exaggeration": {
            "type": "boolean",
            "description": "誇張表現が含まれているかどうか"
        },
        "issues": {
            "type": "array",
            "items": {"type": "string"},
            "description": "発見された問題点のリスト"
        },
        "reason": {
            "type": "string",
            "description": "検証結果の詳細な理由"
        }
    },
    "required": ["is_valid", "has_exaggeration", "issues", "reason"]
}

科学的正確性がNGの場合は生成を停止、誇張表現はWarningのみで続行という設計です。

Step 3: サムネイル生成（Gemini 3.0 Pro Image）
画像生成AIを使って、視聴者の興味を引くサムネイルを自動生成します。
from google.genai import types
from google import genai

def generate_image(
    prompt: str,
    aspect_ratio: str = "9:16",
    image_size: str = "1K",
) -> dict | None:
    client = genai.Client(vertexai=True, project="your-project", location="global")

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=image_size,
            ),
        ),
    )

    result = {"data": None, "text": None}
    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data:
            result["data"] = part.inline_data.data
        elif hasattr(part, "text") and part.text:
            result["text"] = part.text

    return result


生成結果




Step 4: ナレーション生成（Gemini TTS）
テキストから音声を生成します。スクリプトの長さに応じて話すスピードを自動調整し、ショート動画の尺（60秒以内）に収まるようにしています。
from google.genai import types

def generate_speech(
    text: str,
    voice: str = "Algenib",
    style: str | None = None,
) -> bytes | None:
    client = genai.Client(vertexai=True, project="your-project", location="us-central1")
    
    if style:
        contents_text = f"{style}: {text}"
    else:
        contents_text = text
    
    config = types.GenerateContentConfig(
        temperature=1,
        response_modalities=["audio"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice
                )
            )
        ),
    )
    
    audio_chunks = []
    for chunk in client.models.generate_content_stream(
        model="gemini-2.5-pro-preview-tts",
        contents=contents_text,
        config=config,
    ):
        # ... 音声チャンクを収集
    
    return merged_audio

スクリプトが350文字を超える場合は「fast and energetic tone」、それ以下は「warm and friendly tone」で生成しています。

Step 5: イラスト素材の取得
ナレーションの内容に合わせて、いらすとや等のフリー素材を自動で取得します。
ILLUSTRATION_PROMPT_TEMPLATE = """あなたはショート動画の映像構成アシスタントです。

以下のスクリプトを意味的な区切りで分割し、各セクションに必要なイラスト（いらすとや風）の検索キーワードを提案してください。

## スクリプト
{script}

## 要件
- スクリプトをなるべくたくさんの意味的なセクションに分割
- 各セクションに対して、いらすとやで検索するキーワードをなるべく多く
- イラスト屋には専門用語が難しいので、専門用語は入れないでください
  - 例えば、ミラーニューロンは出ないけど、脳細胞やニューロンだと出る
- キーワードは「料理 提供」など、簡単な言葉の組み合わせで
"""


Step 6: 動画構成の決定（Whisper + Gemini 3.0 Pro）
ここが最も苦労したポイントです。
音声ファイルを解析して単語レベルのタイムスタンプを取得し、「どのタイミングで」「どのイラストを」「どの文字を」「どの位置に」配置するかをLLMが決定します。

Whisperを使う理由
Geminiは動画や音声を解析できると言われていますが、実際に試してみるとタイムスタンプの精度が十分ではありませんでした。「だいたいこのあたりで話している」くらいはわかるのですが、単語レベルで正確な時間を取得するには至らなかった。
結局、タイムスタンプの取得にはWhisper APIを使うことにしました。Whisperは単語単位で正確な開始・終了時間を返してくれるので、音声と映像をピッタリ同期させることができます。
def transcribe_audio(audio_path: Path) -> dict | None:
    client = OpenAI(api_key=api_key)
    
    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment", "word"],
        )
    
    return {
        "text": transcript.text,
        "duration": transcript.duration,
        "segments": [...],
        "words": [
            {"word": word.word, "start": word.start, "end": word.end}
            for word in transcript.words
        ],
    }




Gemini 2.5 Proでは使い物にならなかった
最初はGemini 2.5 Proで動画構成を生成していたのですが、結果は散々でした。


イラストの選択がめちゃくちゃ: スクリプトの内容と全く関係ないイラストを選んでくる

配置がおかしい: 画面の端に寄りすぎたり、重要な部分が見切れたり

字幕の位置が変: 読みにくい場所に字幕を配置する

タイミングがズレる: ナレーションと映像の同期が取れない

正直、生成された動画は見るに耐えないレベルでした。

Gemini 3.0 Proで劇的に改善
Gemini 3.0 Proに切り替えたところ、品質が劇的に向上しました。

イラストの選択が的確になった
配置のバランスが良くなった
字幕が読みやすい位置に配置される
タイミングの同期精度が上がった

def run(project_dir: str) -> dict | None:
    model_id = "gemini-3-pro-preview"  # ← ここが重要！2.5では使い物にならない
    
    # Whisper APIで音声から時間情報を取得
    whisper_result = transcribe_audio(audio_path)
    
    # 時間情報をフォーマット
    segments_text = "\n".join(
        f"- セグメント {seg['id']}: {seg['start']:.2f}秒～{seg['end']:.2f}秒 - \"{seg['text']}\""
        for seg in whisper_result["segments"]
    )
    
    # プロンプト生成
    prompt = VIDEO_COMPOSITION_PROMPT.format(
        script=script_data["script"],
        materials=materials_text,
        timing_info=timing_info,
    )
    
    result = call_llm_json(prompt, VIDEO_COMPOSITION_SCHEMA, model=model_id)
    return result

※注意点として、イラストやの素材数は20個以下になるようにシステム的にチェックしてます。本雑学動画からの収益は一切考えておりませんが、念の為、商用利用の範囲を守ってます。イラスト屋の制限

Step 7: 動画レンダリング（MoviePy + PIL）
生成された構成データを元に、実際の動画ファイルを書き出します。
from moviepy.editor import ImageClip, concatenate_videoclips, AudioFileClip, CompositeAudioClip

def render_video(composition: dict, project_dir: Path, output_path: Path) -> str:
    font = load_font()
    clips = []

    for scene in composition["scenes"]:
        duration = scene["end_time"] - scene["start_time"]
        
        # フレーム作成（イラスト配置 + 字幕）
        frame = create_frame(scene, project_dir, font)
        frame_array = np.array(frame)
        
        clip = ImageClip(frame_array, duration=duration)
        clips.append(clip)

    # 連結
    video = concatenate_videoclips(clips, method="compose")
    
    # ナレーション + BGMを合成
    narration_audio = AudioFileClip(str(narration_path)).volumex(1.3)
    bgm_audio = AudioFileClip(str(bgm_path)).volumex(0.7)
    final_audio = CompositeAudioClip([narration_audio, bgm_audio])
    
    video = video.set_audio(final_audio)
    video.write_videofile(str(output_path), fps=30, codec="libx264")
    
    return str(output_path)


Step 8-12: メタデータ生成 & 記録
YouTube、TikTok、Instagram、Xそれぞれに最適化された投稿文とタグを生成し、Google Sheetsに自動記録して投稿を管理しています。
# Google Sheetsのヘッダー構成
headers = [
    "title",
    "youtube upload", "youtube title", "youtube description", "youtube tags",
    "x upload", "x content",
    "tiktok upload", "tiktok title", "tiktok description",
    "instagram upload", "instagram title", "instagram description",
]

各プラットフォームに最適化したタグを自動生成：


YouTube: 検索ワード寄り（shorts, 料理, レシピ, 簡単レシピ...）

TikTok: トレンド追従・バズ狙い（tiktokレシピ, バズレシピ, おすすめにのりたい...）

Instagram: コミュニティ重視（reels, 料理好きな人と繋がりたい...）

X: 拡散重視（Twitter家庭料理部, 今日のごはん...）


学び・課題

良かった点
✅ Geminiファミリーの統一感: 同じAPIクライアントで複数の機能を呼び出せるので、コードがシンプルに
✅ 科学的検証の安心感: 誤情報を流すリスクを大幅に減らせた
✅ 完全自動化: テキスト入力から動画完成まで、人の手が不要

課題
⚠️ モデルバージョンの重要性: Gemini 2.5 Proと3.0 Proで動画構成の品質が天と地ほど違った。モデル選定は慎重に
⚠️ Geminiのタイムスタンプ精度: 音声解析は苦手。Whisperとの併用が必須
⚠️ いらすとやの検索精度: 意図と違う素材が取得されることがある。手動での差し替えが必要な場合も
⚠️ 60秒の壁: ショート動画の尺制限に収めるためのスクリプト調整が難しい

なぜ「全自動」にこだわるのか
私は自動化の力を信じています。
どんなに細かく小さな仕事でも、そこに意識を向けて作業すると、思った以上に体力や精神力を使います。動画編集ソフトを開いて、テロップの位置を調整する。BGMのタイミングを合わせる。たとえ数分の作業でも、毎回やるのは想像以上に消耗します。
そしてもう一つ、大事にしている考え方があります。
渾身の一撃（完成度100%のつもりで作ったもの）を1発より、80%のクオリティを100回出せるシステムを作るほうが価値がある。
完成度100%だと思って出したものも、後で振り返ると85%くらいだったりするのが現実。だったら、80%を量産できる仕組みを作って、試行回数を増やしたほうがいい。

まとめ
「料理の科学」をもっと多くの人に届けたい。その手段として、Geminiファミリーを総動員したショート動画の全自動生成パイプラインを作りました。
CookForYouも、ぜひ試してみてください！



💼 開発・技術相談
このようなAIパイプラインの構築や、LINE Bot/LIFFアプリの開発について相談したい方へ：
フリーランスとして以下のサポートを提供しています：

🛠️ AI活用システム開発 - LLMを活用した自動化パイプラインの構築
📱 LINE Bot/LIFFアプリ開発 - CookForYouで培ったノウハウを活用
🚀 技術コンサルティング - アーキテクチャ設計、AI導入支援
📊 プロトタイプ開発 - アイデアを素早く形にする


お問い合わせ

X: https://twitter.com/Yoooongtae

Facebook: https://www.facebook.com/yongtaih1

Email: yong723.enjoy.everything@gmail.com


お気軽にご相談ください！💪
（複数媒体にご連絡いただけると確実です）
15Go to list of users who liked22Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
