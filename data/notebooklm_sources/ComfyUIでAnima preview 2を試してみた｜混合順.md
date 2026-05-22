# ComfyUIでAnima preview 2を試してみた｜混合順
- **Source URL**: https://note.com/kongo_jun/n/n3dfb9a83c5c0
- **Score**: 45
- **AI Summary**:
  - Anima preview 2がリリースされ、言語理解とキャラクター再現性が向上した。
  - ComfyUIへの導入には、専用のモデル、Text Encoder、VAEの3種の配置が必要。
  - RTX 4090で生成45秒、VRAM 9GBと具体的なリソース消費量を確認できる。
- **Read Now Reason**: 最新の画像生成モデルをComfyUIで動かすための具体的なファイル構成と、VRAM消費量などのリソース要件を即座に確認できるため。
- **Suggested Tags**: #ComfyUI, #Anima2, #画像生成AI
- **Processed Date**: 2026/5/14

---

## 本文
Anima 2がリリースされました。以前、紹介したAnimaを作りなおして言語理解やキャラクターの理解を高めたようなモデルです。解像度が上がったようなアップデートは入っていません。動画でも解説してます。環境OS:Windows 11GPU:GeForce RTX 4090CPU:i9-13900KFmemory:128G構築手順基本的な構築手順は以下と同じです。モデルanima-preview2.safetensorsをダウンロードして「ComfyUI\models\diffusion_models」に配置qwen_3_06b_base.safetensorsをダウンロードして「ComfyUI\models\text_encoders」に配置qwen_image_vae.safetensorsをダウンロードして「ComfyUI\models\vae」に配置ワークフローワークフローは以下です。生成結果生成結果は以下です。生成時間は45秒で、VRAMは9GBです。個人的にですが、前回はillustriou感を感じましたが、今回はSDXLのbaseモデルに近い感じがします。感想ライセンス的にも拡張機能の不足具合てきにも、まだまだ使いづらさが残ってますね。もう少し色々そろってほしいですね。とりあえずプレビューが完了するのを待つ感じになります。
