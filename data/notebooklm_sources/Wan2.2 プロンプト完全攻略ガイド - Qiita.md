# Wan2.2 プロンプト完全攻略ガイド - Qiita
- **Source URL**: https://qiita.com/GeneLab_999/items/36bee7f2403131ae5ad0
- **Score**: 58
- **Suggested Tags**: #動画生成AI, #Wan2.2, #プロンプトエンジニアリング
- **Processed Date**: 2026/8/31

---

## 本文
Wan2.2 プロンプト完全攻略ガイド

動画生成の新時代：カメラワークと映像美を自在に操る


ねらい
Wan2.2は「動画生成モデル」ですが、実は画像生成にも使えます。でも、プロンプトの書き方はFluxやStableDiffusionとは全く異なります。この記事では、Wan2.2のプロンプトの書き方を、実例を交えて徹底解説します。

対象

動画生成AIに興味があるが、何から始めればいいかわからない方
FluxやStableDiffusionの経験はあるが、動画生成は初めての方
ComfyUIでWan2.2を使いたい方


ゴール
この記事を読み終える頃には、Wan2.2のプロンプトを自在に書けるようになり、カメラワークや映像スタイルを細かく制御できる状態になります。

TL;DR

Wan2.2は動画生成モデル（フレーム数=1で画像生成も可能）
プロンプトは80〜120単語が推奨（短すぎるとAIが勝手に補完する）
カメラワーク指示が超重要：Pan/Tilt/Dolly/Orbital/Craneなど
シネマティックな美学が強み：lighting、color-grade、lensを明確に指定
5Bモデルは8GB VRAMで動作、14Bモデルは高品質



1. Wan2.2とは？動画生成の新時代

モデル概要
Wan2.2は、Alibabaが開発したオープンソースの動画生成モデルです。Wan2.1からの大幅アップグレードにより、以下の特徴を持ちます。
アーキテクチャの進化：
Mixture-of-Experts（MoE）アーキテクチャを採用し、高ノイズモデルと低ノイズモデルの2つの専門家モデルで構成されています。これにより、ノイズ除去プロセスの各段階で最適なモデルが動作し、より高品質な動画を生成できます。
データセット規模：
Wan2.1と比較して画像データが+65.6%、動画データが+83.2%増加しており、モーション、セマンティクス、美学の全方面で汎化性能が大幅に向上しています。

モデルバリエーション
Wan2.2には3つのバリエーションがあります：



モデル
パラメータ数
用途
特徴




Wan2.2-TI2V-5B
5B
Text/Image → Video
8GB VRAMで動作、両タスク対応


Wan2.2-T2V-A14B
14B
Text → Video
高品質、美学とセマンティクス制御が強力


Wan2.2-I2V-A14B
14B
Image → Video
静止画から高忠実度の動画生成



どれを選ぶべき？

ローカル環境で試したい → 5Bモデル（8GB VRAMで動作）
最高品質が欲しい → 14Bモデル（20GB+ VRAM推奨）
画像生成もしたい → 5BモデルでFrames=1に設定



2. プロンプトの基本構造：80〜120単語が鉄則

なぜ長いプロンプトが必要なのか？
プロンプトを過度に省略すると、MoEが独自の「シネマティック」デフォルトで空白を埋めてしまい、結果がランダムになる傾向があります。
ダメな例（短すぎ）：
A cat sitting on a beach

→ AIが勝手に「夕焼け」「サングラス」「サーフボード」などを追加してしまう
良い例（80〜120単語）：
Summer beach vacation style, a white cat wearing sunglasses sits on a surfboard. 
The fluffy-furred feline gazes directly at the camera with a relaxed expression. 
Blurred beach scenery forms the background featuring crystal-clear waters, distant 
green hills, and a blue sky dotted with white clouds. The cat assumes a naturally 
relaxed posture, as if savoring the sea breeze and warm sunlight. A close-up shot 
highlights the feline's intricate details and the refreshing atmosphere of the seaside.


推奨プロンプト構造
[Opening Scene] → [Camera Movement] → [Motion Details] → [Visual Style] → [Lighting/Color]



3. カメラワーク指定：Wan2.2の真骨頂
Wan2.2の最大の強みは、カメラワークの詳細な制御にあります。Wan2.1では実現困難だったカメラモーションが、2.2では高精度で再現できます。

主要カメラワーク一覧



カメラワーク
英語表現
説明
使用例




パン
Pan left/right
左右への水平移動
"Camera pans left to reveal..."


チルト
Tilt up/down
上下への垂直移動
"Camera tilts up to sky"


ドリー
Dolly in/out
被写体に近づく/離れる
"Camera dollies out slowly"


オービタル
Orbital arc/360°
被写体を中心に回転
"Slow 360° orbital shot"


クレーン
Crane up/down
クレーンで上昇/下降
"Crane shot rising above city"


トラッキング
Tracking shot
被写体を追跡
"Steadily tracking forward"




カメラワーク実践例
トラッキングショット（Tracking Shot）：
Cinematic NYC alley chase: The camera starts shoulder-height behind a hooded man, 
steadily tracking forward as he weaves through crowds. Cold tones, high contrast, 
neon lights. Smooth glide with intense shake for immersive pursuer tension. 
Blurred steam and wet pavement. Lens flare, shallow depth of field.

ドリーアウト（Dolly Out）：
In the style of an American drama promotional poster, Iron Man sits in a sleek, 
futuristic metal chair inside a dimly lit industrial setting. He is fully suited 
in his iconic red and gold armor, the arc reactor glowing in his chest. Camera 
dollies out slowly. The background shows an abandoned factory with light filtering 
through the windows. A medium shot with a straight-on close-up of the character.

360度オービタル（Orbital 360°）：
An orca breaches in crystal-clear Arctic waters. Slow 360° orbital shot around 
the soaring whale as droplets hang suspended. Soft polar sunset lights the scene 
in pastel pinks and blues; cinemagraphic HDR.

パンレフト（Pan Left）：
A low angle shot of a young man in dappled sunlight. Backlighting, warm 
low-saturation tones. Slow-motion glide with handheld tremor for dreamy nostalgia. 
Blurred foliage for emotional focus. Camera pans left to low angle shot of a cute girl.



4. モーション表現：スピード感と深度を制御

スピード表現



表現
効果




slow-motion
スローモーション効果


whip-pan
高速パン（モーションブラー）


time-lapse
タイムラプス


handheld tremor
手持ちカメラの揺れ


smooth glide
滑らかな移動




深度表現（Depth Cues）
前景・中景・背景の動きを明示的に指定することで、立体感を演出できます：
Foreground grass sways gently while mountains remain still in the background


モーション実践例
スローモーションの水しぶき：
A diver plunges into crystal-clear pool water. Slow-motion capture shows water 
droplets suspended mid-air, backlit by golden hour sunlight. Camera follows the 
descent with a gentle downward tilt. Volumetric lighting creates god rays through 
the splashing water.

高速チェイスシーン：
Fast-paced motorcycle chase through narrow city streets. Camera performs aggressive 
whip-pans following the bike's sharp turns. Motion blur on background buildings, 
neon signs streak past. Handheld camera shake adds kinetic energy. High contrast, 
teal-and-orange color grade.



5. ビジュアルスタイルタグ：映像美を定義する

ライティング表現
Wan2.2は、lighting、composition、color toneなどの詳細なラベルを持つシネマティックレベルの美学データで学習されています。
主要ライティングタグ：


volumetric dusk - ボリューメトリックな夕暮れ

harsh noon sun - 強い正午の太陽光

neon rim light - ネオンによるリムライト

soft backlight - 柔らかな逆光

god rays - ゴッドレイ（光芒）

studio key light - スタジオのキーライト


カラーグレーディング



スタイル
効果




teal-and-orange
ティール&オレンジ（映画的）


bleach-bypass
ブリーチバイパス（彩度低下）


kodak portra
Kodak Portra風の暖色


cinemagraphic HDR
シネマグラフィックHDR


desaturated
彩度を落とした




レンズ・撮影スタイル



スタイル
効果




anamorphic bokeh
アナモルフィックボケ


16mm grain
16mmフィルムグレイン


shallow depth of field
浅い被写界深度


lens flare
レンズフレア


wide-angle distortion
広角レンズの歪み




ビジュアルスタイル実践例
ブレードランナー風のサイバーパンク：
A rainy night in a dense cyberpunk market, neon kanji signs flicker overhead. 
The camera starts shoulder-height behind a hooded courier, steadily tracking 
forward as he weaves through crowds of holographic umbrellas. Volumetric 
pink-blue backlight cuts through steam vents, puddles mirror the glow. 
Lens flare, shallow depth of field. Teal-and-orange color grade, moody 
Blade-Runner vibe.

ノスタルジックな夏の日：
Golden hour meadow scene, a young woman in a sundress walks through tall grass. 
Warm kodak portra color palette with soft backlight creating a halo effect. 
16mm film grain adds texture. Camera performs a slow orbital arc around her 
as she twirls. Dreamy, nostalgic atmosphere with lens flare kissing the edges.



6. ネガティブプロンプト：デフォルトで十分
Wan2.2では、ネガティブプロンプトは比較的シンプルです。
推奨ネガティブプロンプト（中国語デフォルト）：
模糊，丑陋，低质量，变形，扭曲

英語版：
blurry, ugly, low quality, distorted, deformed

Wan2.2ではネガティブプロンプトが前バージョンより確実に機能するようになっていますが、多くの場合デフォルトのままで十分な品質が得られます。


7. 画像生成モードでの使用
Wan2.2は動画生成モデルですが、フレーム数を1に設定することで静止画生成にも使えます。

設定方法
ComfyUIの場合：
Wan22ImageToVideoLatent node
├── length: 1  # フレーム数を1に設定
├── size: 1280*720 or 1920*1080
└── prompt: [通常の動画プロンプト]


画像生成時の注意点
動画モデルなので、静止画でも「動画の1フレーム」のような見た目になり、被写体が背景に貼り付けたように見えることがあるという報告があります。
対処法：

プロンプトにphotorealistic, natural depth, layered compositionを追加
カメラワーク指示を削除または最小限に

cinematic still frameを明示

画像生成用プロンプト例：
A medieval knight in ornate silver armor, polished and gleaming under radiant 
sunlight, riding a gigantic shimmering koi fish flying through the sky. 
Photorealistic style with natural depth and layered composition. Cinematic 
still frame. Ultra HD, detailed textures, volumetric lighting.



8. パラメータ設定ガイド

基本パラメータ



パラメータ
推奨値
説明




length
120（5秒）以下
Wan2.2は5秒以下のクリップで最高のパフォーマンス


size
960×540（下書き）1280×720（本番）
解像度、VRAMと相談


fps
24（デフォルト）16（高速プロトタイプ）
フレームレート


sampling steps
20〜50
ステップ数、多いほど高品質




Lightning LoRAで高速化
Lightx2v LoRAを使用すると、4ステップで高速生成が可能です：
# 4ステップ版
--lora Lightx2v/Qwen-Image-Lightning-4steps-V1.0
--steps 4


メモリ最適化
8GB VRAMでの動作：
--offload_model True --convert_model_dtype --t5_cpu

複数GPU使用：
torchrun --nproc_per_node=8 generate.py --dit_fsdp --t5_fsdp --ulysses_size 8



9. 実践プロンプトテンプレート集

Text-to-Video（T2V）
アクションシーン：
[カメラワーク] + [被写体の動作] + [環境] + [ライティング] + [カラーグレード]

例：
Tracking shot at shoulder height, a parkour athlete leaps between rooftops 
in an urban environment. Fast whip-pans follow sharp movements. Harsh afternoon 
sunlight creates dramatic shadows. Teal-and-orange grade with high contrast. 
16mm grain for gritty realism.

風景シーン：
[カメラワーク] + [自然現象] + [時間帯] + [ライティング] + [スタイル]

例：
Slow crane shot rising above misty mountain peaks at dawn. Clouds drift 
through valleys below. Soft golden hour light breaks through fog creating 
god rays. Desaturated color palette with subtle blue-green tones. 
Cinemagraphic, serene atmosphere.

ポートレート：
[ショットタイプ] + [被写体] + [表情/動作] + [背景] + [ライティング]

例：
Close-up shot of a woman's face as she slowly turns toward camera. Soft 
smile forms, eyes catch the light. Bokeh background with warm cafe ambiance. 
Soft key light from window creates natural skin tones. Kodak portra aesthetic 
with gentle film grain.


Image-to-Video（I2V）
画像から動きを追加：
[元画像の記述] + [追加する動作] + [カメラワーク] + [環境変化]

例：
She slowly rolls her shoulders in a sensual motion, leaning forward with a 
soft, surprised expression. Her mouth opens slightly, eyes wide with intrigue. 
The camera begins in a tight front view, then slowly zooms in while gently 
panning right. The scene feels intimate, with smooth motion and warm lighting 
enhancing her expressive movement.



10. トラブルシューティング

プロンプトが効かない
症状：カメラワークが指示と逆方向に動く

パンレフトを指示してもパンライトになる現象が報告されています
**対処法：**複数回生成して最良のものを選ぶ、またはプロンプトを強化

# 弱い表現
Camera pans left

# 強い表現
Camera performs a deliberate, smooth pan left across the scene, 
moving from right to left steadily


動画が茶色い霧だけになる
**原因：**VAEの読み込み失敗、またはモデルの不整合
対処法：

VAEファイル（wan2.2_vae.safetensors）が正しく配置されているか確認
ComfyUIを最新版に更新
モデルファイルを再ダウンロード


生成時間が長すぎる
14Bモデルの場合：

RTX 4090で5秒動画（120フレーム）が1時間20分程度

高速化オプション：

5Bモデルに切り替え（9分以下）
Lightning LoRA使用（4ステップ）
解像度を下げる（960×540）
フレーム数を減らす（60フレーム=2.5秒）



11. プロンプト拡張機能：AIがプロンプトを改善
Wan2.2には、プロンプトを自動で拡張・改善する機能があります。

使用方法
DashScope API使用（推奨）：
DASH_API_KEY=your_key python generate.py \
  --task t2v-A14B \
  --prompt "A futuristic city with flying cars" \
  --use_prompt_extend \
  --prompt_extend_method 'dashscope' \
  --prompt_extend_target_lang 'zh'

ローカルモデル使用：
python generate.py \
  --task t2v-A14B \
  --prompt "A futuristic city with flying cars" \
  --use_prompt_extend \
  --prompt_extend_method 'local_qwen' \
  --prompt_extend_model 'Qwen/Qwen2.5-7B-Instruct'

プロンプト拡張機能により、動画がより詳細で視覚的に魅力的になります。


まとめ
Wan2.2は、オープンソースの動画生成モデルの中でトップクラスの性能を持ちます。
Wan2.2プロンプトの5つの鉄則：


80〜120単語を目指す → 短すぎるとAIが勝手に補完

カメラワークを明確に → Pan/Tilt/Dolly/Orbitalなど

ライティングとカラーを指定 → volumetric dusk、teal-and-orange など

モーションを詳細に → slow-motion、whip-pan、depth cues

5秒以内に収める → 120フレーム以下が推奨

プロンプトエンジニアリングに慣れてくると、「映画監督になった気分」を味わえます。カメラワークを指示して、ライティングを選んで、色調を決める...この創造的な自由度こそが、Wan2.2の真の魅力です。


参考リンク

Wan2.2 公式GitHub
ComfyUI公式ドキュメント
Wan2.2-T2V-A14B Hugging Face
ViewComfy プロンプトガイド


4Go to list of users who liked1Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
