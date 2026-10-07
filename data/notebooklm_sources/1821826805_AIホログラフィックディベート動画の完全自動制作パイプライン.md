# AIホログラフィックディベート動画の完全自動制作パイプライン
- **Source URL**: https://zenn.dev/yoshi_katakura/articles/321db5409ba653
- **Score**: 88
- **Suggested Tags**: #自動化パイプライン, #マルチエージェント, #動画生成
- **Processed Date**: 2026/9/7

---

## 本文
「アインシュタインAIと現代の理論物理学者AIが、量子重力の最前線で議論する」
この動画を、人間のナレーションも、撮影も、手動編集もなく、AIだけで6幕シリーズ（Act 1〜6）として制作しました。
本記事では、ゼロから動画が完成するまでの完全自動パイプラインを解説します。


 パイプライン全体像
①座談会生成       Soul-Twin (Claude claude-haiku-4-5)
        ↓
②音声合成         ElevenLabs TTS API
        ↓
③アバター動画生成  HeyGen Talking Photo API
        ↓
④動画編集         FFmpeg（Python スクリプト）
        ↓
⑤YouTube公開     手動アップロード


 ① 座談会生成：Soul-Twin の役割
Soul-Twin は複数のAIエンティティ（TWIN）が議論する座談会プラットフォームです。
各TWINにはペルソナ（人格・知識・話し方）が定義されており、Celeryタスクで順番に発言を生成します。
# roundtable_tasks.py の核心部分
def _call_roundtable_ai(client, speaker, all_infos, history, topic, turn, ...):
    # HPS スキーマ（後述）でシステムプロンプトを構築
    schema = build_roundtable_schema(
        twin_id=speaker.twin_id,
        persona_prompt=speaker.persona_prompt,
        role=speaker.role,
        language=speaker.language,  # "en" で英語強制
    )
    system_prompt = SchemaRenderer().render_prompt(schema, role=role_label)
    
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=700,
        system=system_prompt,
        messages=[{"role": "user", "content": user_msg}],
    )
Act 6（最新）では Einstein v2.2、KATAKURA、Maldacena v1.2 の3者がde Sitter宇宙論について10ターン議論します。


 ② 音声合成：ElevenLabs TTS
各発言テキストをElevenLabsで音声変換します。スピーカーごとに声を使い分けます：
VOICE_IDS_EN = {
    "einstein":  "uWjgUwvlRVb9s2zMRz8v",  # Markus - ドイツ語訛り
    "katakura":  "Lci8YeL6PAFHJjNKvwXq",  # Yusuke - Asian male
    "maldacena": "IP2syKL31S2JthzSSfZH",  # Ivan Rodriguez - スペイン語訛り
}

VOICE_SETTINGS_EN = {
    "einstein": {"stability": 0.60, "similarity_boost": 0.75, "style": 0.35},
    "maldacena": {"stability": 0.68, "similarity_boost": 0.72, "style": 0.22},
}
Act 6 は英語ディベートなので eleven_multilingual_v2 モデルを使用。21発言で約5〜8分。
重要な実装ポイント：座談会の出力テキストから所作描写（*こめかみに指を当てる*）や絵文字行を除去してTTSに渡す必要があります：
def parse_debate_file(filepath):
    # *...* の所作描写を除外
    if stripped.startswith("*") and stripped.endswith("*"):
        continue
    # 📋💬👥 の絵文字行は発言終端シグナル → break
    if re.match(r"^[📋💬👥⚖️✦]", stripped):
        break


 ③ アバター動画生成：HeyGen Talking Photo API
音声ファイルを HeyGen の Talking Photo API に送り、イラストに口パクを付けた動画を生成します。
# 音声をMinIOにアップロードして公開URL取得
audio_url = upload_audio_to_minio(audio_path)

# HeyGen API 呼び出し
payload = {
    "video_inputs": [{
        "character": {
            "type": "talking_photo",
            "talking_photo_id": avatar_id,
            "talking_style": "stable",
        },
        "voice": {"type": "audio", "audio_url": audio_url},
        "background": {"type": "color", "value": "#1a1a2e"},
    }],
    "dimension": {"width": 1280, "height": 720},
}
ハマりポイント：

HeyGenはUIクレジットとAPIクレジットが別。UIで確認できる残高はAPI利用に使えません
音声URLはHeyGenからアクセス可能な公開URLが必要（MinIOのpresigned URLを使用）
動画生成には1本あたり1〜3分かかるため、21本で約30〜60分



 ④ 動画編集：FFmpeg
生成した21本のMP4を結合し、オープニング・ラベル・エンディングを追加します。
def normalize_clip(src, dst, speaker, label, turn):
    """各クリップを1280x720に正規化しラベルオーバーレイ"""
    color = SPEAKER_COLORS.get(speaker, "ffffff")
    drawtext = (
        f"drawtext=text='{label}':fontsize=32:fontcolor=#{color}:"
        f"x={label_x}:y=h-th-20:box=1:boxcolor=black@0.6:boxborderw=8,"
        f"drawtext=text='Turn {turn}':fontsize=24:fontcolor=white:"
        f"x=w-tw-20:y=20:box=1:boxcolor=black@0.5:boxborderw=6"
    )
    cmd = ["ffmpeg", "-y", "-i", src, "-vf", f"scale=1280:720,setsar=1,{drawtext}", ...]
FFmpegのハマりポイント：

drawtext でアポストロフィ（'）やコロン（:）はエスケープが必要

force_original_aspect_ratio=pad の構文はバージョンによって動作しない
SSH経由の長時間実行はタイムアウト → docker exec -d で解決



 コスト概算（Act 6、21発言）



サービス
用途
概算コスト




Claude Haiku
座談会生成（10ターン）
約 $0.10


ElevenLabs
音声合成（21ファイル）
約 $0.30


HeyGen API
動画生成（21本）
約 $10〜15


AWS/MinIO
音声ファイル保存
ほぼ無料



最大のコストはHeyGen。1本あたり約$0.5〜0.7。


 まとめ
このパイプラインで Act 1〜6 の6シリーズ（計126発言分）の動画を制作しました。
技術的なチャレンジは：


英語発話の強制（Society Layer 2 の日本語デフォルトとの競合）

HeyGen と MinIO の連携（直接音声URLを渡すと404）

FFmpeg の SSH タイムアウト（docker exec -d で解決）

コードはすべて Soul-Twin GitHub の backend/scripts/ 以下にあります。

関連：Soul-Twin NEWS TOP10 / YouTube ホログラフィックディベート
