# ComfyUI で FLUX 3 Image Klein を使う｜dskjal
- **Source URL**: https://note.com/dskjal/n/nc1ea2742395f
- **Score**: 45
- **Suggested Tags**: #ComfyUI, #FLUX, #画像生成AI
- **Processed Date**: 2026/10/21

---

## 本文
FLUX 3 Image Klein はプロンプトアップサンプラーを使うことが前提になっている（Do not use the model without a prompt upsampler）。商用を目的としないなら Qwen Image 2.1 がほぼすべての面で上回っている。RTX 3050 8 GB で１MP, 15 step, CFG 1 の推論に 13 秒しかかからない。INT8 ConvRot モデルでプロンプトアップサンプルにかかる時間は２～３分。w4a8 ならアップサンプルは 15 秒。低 VRAM 環境ではプロンプトアップサンプル後は、プロンプトアップサンプルを切って、生成されたプロンプトを手動編集すると速い。対応解像度は 4K。目次欠点ライセンス生成画像を商用利用する条件禁止事項モデルとワークフロー非公式モデル公式プロンプトアップサンプラーモデルプロンプト公式プロンプトアップサンプラーの tips編集プロンプト欠点実写は実用範囲内だが、イラストの性能が著しく低いイラストでは高確率で手が正しく描けない書けない漢字が意外とある性器や乳首は完全に検閲されているが、ヌードは可能そこそこの頻度で手や体の描画に大失敗するライセンスFLUX Kommunity License v.1.0関連企業を含む年間総収入が US$5,000,000 未満かつ以下の条件を満たせば、生成した画像は商用利用が可能。生成画像を商用利用する条件関連企業を含む年間総収入が US$5,000,000 未満（第1条 e 項）違法・危険・権利侵害コンテンツの生成などを防止するコンテンツフィルターを実装・維持する。または、配布・公開などの前に生成物の違法性・権利侵害をレビューする（第2条 e 項 i）適用法令で求められる場合、AIによって生成・編集されたことを開示する（第2条 e 項 ii）禁止事項商用サービスでモデルを本番稼働させる。ただし、適格ユーザーがOutputを生成する目的なら可能モデル自体を商用製品として再配布する生成画像を類似機能のAIモデルの改善に利用（第4条 b 項）モデルとワークフローComfyUI 用モデルを Black Forest Labs が配布している。


black-forest-labs/flux-3-image-klein-comfy · Hugging Face


We’re on a journey to advance and democratize artificial inte


huggingface.co




非公式モデルKijai のターボ LoRa


loras/flux3_klein_sd_lora_rank_256_bf16.safetensors · Kijai/flux3_experimental at main


We’re on a journey to advance and democratize artificial inte


huggingface.co




公式プロンプトアップサンプラーモデルqwen3.5_9b_flux3_prompt_upsampler_int8_convrot.safetensors。モデルは Qwen3.5-9B。VRAM８GB なら qwen3.5_9b_flux3_prompt_upsampler_w4a8.safetensors。システムプロンプトは公式ワークフローに内蔵されている。プロンプトBBOX の使い方は Bounding boxes を参照。GitHub に公式プロンプト例がある。公式プロンプトアップサンプラーの tips


black-forest-labs/flux-3-image-klein-pup · Hugging Face


We’re on a journey to advance and democratize artificial inte


huggingface.co




テキストを描画する場合はシングルクオートで囲むBBOX を渡す場合はプロンプトの後に渡す。BBOX は編集されない編集プロンプト


FLUX 3 Image Editing - Black Forest Labs


Edit an image with a written instruction, combine up to ten r


docs.bfl.ai




作例There is a piece of paper with "あいうえおアイウエオ
かきくけこカキクケコ
さしすせそサシスセソ
たちつてとタチツテト
なにぬねのナニヌネノ
はひふへほハヒフヘホ
まみむめもマミムメモ
やゆよヤユヨ
らりるれろラリルレロ
わをんワヲン" written on it.`ヲ`, `ふ`, `ほ`, `ホ` を間違えているが、日本語描画性能は高い
