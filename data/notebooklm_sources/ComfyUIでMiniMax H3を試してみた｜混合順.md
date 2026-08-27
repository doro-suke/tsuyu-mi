# ComfyUIでMiniMax H3を試してみた｜混合順
- **Source URL**: https://note.com/kongo_jun/n/n67569572604f
- **Score**: 55
- **Suggested Tags**: #ComfyUI, #MiniMax H3, #動画生成AI
- **Processed Date**: 2026/8/27

---

## 本文
ついにMiniMax H3がオープンソースでリリースされましたねぇ。謎の地域によってライセンス制限があったりしますが、日本ではとりあえず問題なく使えそうです。（細かくはライセンスを確認してください。）課金ノードで試した時は、一貫性が高くていい感じでしたが、どこまでローカルでも実現できるかですね。ワークフローは以下をベースにしています。動画でも解説してます。環境OS:Windows 11GPU:GeForce RTX 4090CPU:i9-13900KFmemory:128G構築手順ComfyUIを最新化してください。また、手元のマシーンスペックだとそのままでは動かないので、以下のComfyUIの起動batに「--reserve-vram 6.0」のオプションを追加しました。ComfyUI_windows_portable\run_nvidia_gpu.bat変更前.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build変更後.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --reserve-vram 6.0--reserve-vram 6.0：ComfyUI がモデルを載せるときに「使わずに空けておく」VRAM の量 (GB)。OS や他アプリのために取り置く枠。※既存のrun_nvidia_gpu.batとは別のrun_nvidia_gpu.batを作成するのがオススメです。モデルminimax_h3_fl2va_pruned_int8_convrot.safetensorsとminimax_h3_ref2va_pruned_int8_convrot.safetensorsをダウンロードして「ComfyUI\models\diffusion_models」に配置qwen3vl_32b_minimax_h3_int8_convrot.safetensorsをダウンロードして「ComfyUI\models\text_encoders」に配置（50X0シリーズなら、qwen3vl_32b_minimax_h3_nvfp4_awq.safetensorsも可）minimax_h3_audio_vae_fp32.safetensorsとminimax_h3_video_vae_fp16.safetensorsをダウンロードして「ComfyUI\models\vae」に配置ワークフロー（I2V）ワークフローは以下です。生成結果は以下です。生成時間は10分。CPUメモリ：90GBGPUメモリ：28GB（VRAM21GB+共有メモリ7GB）ワークフロー（I2V）ワークフローは以下です。生成結果は以下です。生成時間は11分。CPUメモリ：90GBGPUメモリ：29GB（VRAM22GB+共有メモリ7GB）感想生成結果自体はかなり高品質ですね。ただただ必要なメモリが大きい。現状だと完全に5090向けですね。解像度とかフレーム数を増やすと、必要なメモリが純増するので、4090でもかなり苦しいです。とはいえ、step数は20とかなので、これを削減するための仕組みや、更に量子化したモデルとかもリリースされると思うので、それに期待ですね。追加検証しましたが、CUDAを13にすると生成速度の向上が期待できます。興味がある方はご確認ください。
