# ComfyUIでFlux AIを使う方法：詳細ガイド
- **Source URL**: https://zenn.dev/sunwood_ai_labs/articles/using-flux-ai-with-comfyui-detailed-guide
- **Score**: 72
- **AI Summary**:
  - ComfyUIでFLUX.1-devモデルを利用するための具体的な導入手順とシステム要件を提示
  - モデル、CLIP、VAEの各ファイルのダウンロード先および適切なフォルダ配置場所を明示
  - 32GB未満のRAM環境向けに、FP8量子化や特定のノード設定によるメモリ最適化手法を解説
- **Read Now Reason**: FLUX.1は最新の高性能モデルであり、メモリ消費が激しいため、FP8設定や特定ファイルの配置ミスによる大幅な時間ロスを避けるための具体的設定値が不可欠です。
- **Suggested Tags**: #ComfyUI, #Flux.1, #画像生成AI, #環境構築, #メモリ最適化
- **Processed Date**: 2026/5/13

---

## 本文
はじめに
Flux AIは、高品質な画像生成を可能にする強力なAIモデルです。本記事では、ComfyUI上でFlux AIを使用するための詳細な手順を解説します。初心者の方でも理解しやすいよう、ステップごとに丁寧に説明していきます。

 必要なシステム要件
まず、Flux AIを使用するには、十分なシステムリソースが必要です。


最低30GB以上のRAM
💡 ポイント: Flux AIは高性能なモデルであるため、メモリ使用量が多くなります。30GB未満のRAMでは正常に動作しない可能性があります。



 必要なファイルのダウンロード
Flux AIをComfyUIで使用するには、いくつかのファイルをダウンロードし、適切な場所に配置する必要があります。

 モデルファイルのダウンロード


ファイル名: flux1-dev.sft

サイズ: 23.8 GB

ダウンロード先: Hugging Face - FLUX.1-dev


配置場所: ComfyUI/models/unet/


💡 ポイント: このファイルは Flux AI の核となるモデルです。大容量なので、ダウンロードに時間がかかる場合があります。

 CLIPモデルのダウンロード
CLIPモデルは、テキストと画像の関連性を理解するために使用されます。以下のファイルをダウンロードしてください：


t5xxl_fp16.safetensors (9.79 GB)

clip_l.safetensors (246 MB)

t5xxl_fp8_e4m3fn.safetensors (4.89 GB) - オプション（32GB未満のRAMの場合）



ダウンロード先: Hugging Face - flux_text_encoders


配置場所: ComfyUI/models/clip/


💡 ポイント:

t5xxl_fp16.safetensors は高精度ですが、メモリを多く使用します。
RAM が 32GB 未満の場合、t5xxl_fp8_e4m3fn.safetensors を使用すると良いでしょう。
clip_l.safetensors は補助的なモデルで、必ず必要です。


 VAE（Variational AutoEncoder）のダウンロード
VAEは、生成された画像の品質向上に役立ちます。


ファイル名: ae.sft

サイズ: 335 MB

ダウンロード先: Hugging Face - FLUX.1-schnell


配置場所: ComfyUI/models/vae/



 ファイルの配置
ダウンロードしたファイルを正しい場所に配置することが重要です。


ComfyUI/models/unet/ フォルダに flux1-dev.sft を配置

ComfyUI/models/clip/ フォルダに CLIPモデルファイルを配置

ComfyUI/models/vae/ フォルダに ae.sft を配置

💡 ポイント: フォルダが存在しない場合は、手動で作成してください。

 ComfyUIの設定
ファイルを正しく配置したら、ComfyUIでFlux AIを使用するための設定を行います。

ComfyUIを起動
ワークフローエディタを開く
「Load Diffusion Model」ノードを追加し、Flux AIモデルを選択
CLIPモデルとVAEモデルを適切なノードで設定

💡 ポイント: 具体的なワークフローの設定は、ComfyUIの公式ドキュメントやコミュニティリソースを参照すると良いでしょう。

 メモリ使用量の最適化
Flux AIは高性能なモデルであるため、メモリ使用量が多くなります。以下の方法でメモリ使用量を最適化できます：

「Load Diffusion Model」ノードの weight_dtype を fp8 に設定

メリット: メモリ使用量を半減
デメリット: 画質が若干低下する可能性あり



💡 ポイント: メモリ不足のエラーが出る場合は、この設定を試してみてください。

 画像生成の実行
すべての設定が完了したら、以下の手順で画像生成を行います：

プロンプトを入力
必要なパラメータを調整
「Generate」ボタンをクリック

💡 ポイント: 最初は簡単なプロンプトから始め、徐々に複雑なものに挑戦するのがおすすめです。

 まとめ
この記事では、ComfyUIでFlux AIを使用するための詳細な手順を説明しました。必要なファイルのダウンロードから、適切な配置、ComfyUIの設定、そしてメモリ最適化のコツまで、幅広くカバーしています。
Flux AIは非常に強力なツールですが、適切なセットアップが必要です。この記事の手順に従って、素晴らしいAI生成画像の世界を体験してください！
最後に、常に最新の情報を確認し、ComfyUIやFlux AIの公式ドキュメントも参照することをおすすめします。技術は日々進化しているため、新しい機能や最適化の方法が追加される可能性があります。
Happy creating with Flux AI on ComfyUI!

 参考サイト


<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
