# ComfyUIでsdxs-1bを試してみた｜混合順
- **Source URL**: https://note.com/kongo_jun/n/n1816fa431d3d
- **Score**: 35
- **AI Summary**:
  - 高速軽量モデルsdxs-1bをComfyUIで動作させるための詳細な環境構築手順と実行結果の提示
  - Qwen 3.5をテキストエンコーダに採用しており、初回生成時は約23GBのVRAMを消費する特性を解説
  - 特定のリポジトリからのカスタムノード導入および特定バージョンのライブラリ更新が必須条件である点
- **Read Now Reason**: モデルの軽量化とテキストエンコーダの肥大化がリソース消費に与える影響を、実測値ベースで把握できるため。
- **Suggested Tags**: #ComfyUI, #sdxs-1b, #画像生成AI, #環境構築
- **Processed Date**: 2026/5/14

---

## 本文
sdxsという高速軽量モデルがリリースされたので、紹介します。こちらのページにサンプルがありますが、いい感じの画像が生成できなくもなさそうです。動画でも解説してます。環境OS:Windows 11GPU:GeForce RTX 4090CPU:i9-13900KFmemory:128G構築手順以下のコマンドでカスタムノードのインストールとモデルのダウンロードをして、ComfyUIを最新化してください。### カスタムノードのインストール
cd ComfyUI\custom_nodes
git clone https://github.com/customWF2026/CustomWFNodes.git

### モデルのダウンロード
cd ../..
cd ComfyUI\models\diffusers
git lfs install
git clone https://huggingface.co/AiArtLab/sdxs-1b AiArtLab--sdxs-1b最新化後、以下のコマンドでライブラリをインストールしてください。### ライブラリのインストール
.\python_embeded\python.exe -m pip uninstall -y diffusers transformers peft tokenizers torchao
.\python_embeded\python.exe -m pip install --no-cache-dir "transformers>=5.2.0" "diffusers>=0.36.1" "peft" "accelerate" "tokenizers"ワークフローワークフローは以下です。生成結果生成結果は以下です。生成時間は41秒で、VRAMは23.3GBでした。1BなのにVRAMが必要なのはtext encoderがQwen 3.5だからですね。モデルが読み込み済みの２回目以降は、５秒ぐらいで生成されます。指などの細部が安定することはないです。ただ、サンプルの画像のプロンプトを使うと、同じモデルと思えないぐらいの生成結果が出力されます。A young woman with striking blue eyes and pointed ears, adorned with a floral kimono and a tattoo. Her hair is styled in a braid, and she wears a pair of earsA young woman with striking blue eyes and adorned with a black sailor with black shirt. Her hair is black twin-tail, and she is big breasts.感想このモデルが得意な画像を生成する時は、想像以上にいい画像が生成されます。あと、生成速度が非常に速いです。細部の粗はかなり目立つので、そのまま使いづらいことは多いと思いますが、もう少し研究が進めばいい感じになっていく気はしますね。
