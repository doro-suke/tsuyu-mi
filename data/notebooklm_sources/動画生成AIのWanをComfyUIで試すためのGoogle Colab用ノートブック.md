# 動画生成AIのWanをComfyUIで試すためのGoogle Colab用ノートブック
- **Source URL**: https://gist.github.com/safa-dayo/e6b02ace505d323fe6a502873b09a0cf
- **Score**: 45
- **Suggested Tags**: #動画生成AI, #ComfyUI, #Google Colab
- **Processed Date**: 2026/8/31

---

## 本文
# #@title Environment Setup
        
        
          
          

        
        
          
          ### setup ComfyUI ###
        
        
          
          from pathlib import Path
        
        
          
          

        
        
          
          OPTIONS = {}
        
        
          
          

        
        
          
          USE_GOOGLE_DRIVE = False  #@param {type:"boolean"}
        
        
          
          UPDATE_COMFY_UI = True  #@param {type:"boolean"}
        
        
          
          USE_COMFYUI_MANAGER = True  #@param {type:"boolean"}
        
        
          
          INSTALL_CUSTOM_NODES_DEPENDENCIES = True  #@param {type:"boolean"}
        
        
          
          OPTIONS['USE_GOOGLE_DRIVE'] = USE_GOOGLE_DRIVE
        
        
          
          OPTIONS['UPDATE_COMFY_UI'] = UPDATE_COMFY_UI
        
        
          
          OPTIONS['USE_COMFYUI_MANAGER'] = USE_COMFYUI_MANAGER
        
        
          
          OPTIONS['INSTALL_CUSTOM_NODES_DEPENDENCIES'] = INSTALL_CUSTOM_NODES_DEPENDENCIES
        
        
          
          

        
        
          
          current_dir = !pwd
        
        
          
          WORKSPACE = f"{current_dir[0]}/ComfyUI"
        
        
          
          

        
        
          
          if OPTIONS['USE_GOOGLE_DRIVE']:
        
        
          
              !echo "Mounting Google Drive..."
        
        
          
              %cd /
        
        
          
          

        
        
          
              from google.colab import drive
        
        
          
              drive.mount('/content/drive')
        
        
          
          

        
        
          
              WORKSPACE = "/content/drive/MyDrive/ComfyUI"
        
        
          
              %cd /content/drive/MyDrive
        
        
          
          

        
        
          
          ![ ! -d $WORKSPACE ] && echo -= Initial setup ComfyUI =- && git clone https://github.com/comfyanonymous/ComfyUI
        
        
          
          %cd $WORKSPACE
        
        
          
          

        
        
          
          if OPTIONS['UPDATE_COMFY_UI']:
        
        
          
            !echo -= Updating ComfyUI =-
        
        
          
          

        
        
          
            # Correction of the issue of permissions being deleted on Google Drive.
        
        
          
            ![ -f ".ci/nightly/update_windows/update_comfyui_and_python_dependencies.bat" ] && chmod 755 .ci/nightly/update_windows/update_comfyui_and_python_dependencies.bat
        
        
          
            ![ -f ".ci/nightly/windows_base_files/run_nvidia_gpu.bat" ] && chmod 755 .ci/nightly/windows_base_files/run_nvidia_gpu.bat
        
        
          
            ![ -f ".ci/update_windows/update_comfyui_and_python_dependencies.bat" ] && chmod 755 .ci/update_windows/update_comfyui_and_python_dependencies.bat
        
        
          
            ![ -f ".ci/update_windows_cu118/update_comfyui_and_python_dependencies.bat" ] && chmod 755 .ci/update_windows_cu118/update_comfyui_and_python_dependencies.bat
        
        
          
            ![ -f ".ci/update_windows/update.py" ] && chmod 755 .ci/update_windows/update.py
        
        
          
            ![ -f ".ci/update_windows/update_comfyui.bat" ] && chmod 755 .ci/update_windows/update_comfyui.bat
        
        
          
            ![ -f ".ci/update_windows/README_VERY_IMPORTANT.txt" ] && chmod 755 .ci/update_windows/README_VERY_IMPORTANT.txt
        
        
          
            ![ -f ".ci/update_windows/run_cpu.bat" ] && chmod 755 .ci/update_windows/run_cpu.bat
        
        
          
            ![ -f ".ci/update_windows/run_nvidia_gpu.bat" ] && chmod 755 .ci/update_windows/run_nvidia_gpu.bat
        
        
          
          

        
        
          
            !git pull
        
        
          
          

        
        
          
          !echo -= Install dependencies =-
        
        
          
          !pip3 install accelerate
        
        
          
          !pip3 install einops transformers>=4.28.1 safetensors>=0.4.2 aiohttp pyyaml Pillow scipy tqdm psutil tokenizers>=0.13.3
        
        
          
          !pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
        
        
          
          !pip3 install torchsde
        
        
          
          !pip3 install kornia>=0.7.1 spandrel soundfile sentencepiece
        
        
          
          

        
        
          
          if OPTIONS['USE_COMFYUI_MANAGER']:
        
        
          
            %cd custom_nodes
        
        
          
          

        
        
          
            # Correction of the issue of permissions being deleted on Google Drive.
        
        
          
            ![ -f "ComfyUI-Manager/check.sh" ] && chmod 755 ComfyUI-Manager/check.sh
        
        
          
            ![ -f "ComfyUI-Manager/scan.sh" ] && chmod 755 ComfyUI-Manager/scan.sh
        
        
          
            ![ -f "ComfyUI-Manager/node_db/dev/scan.sh" ] && chmod 755 ComfyUI-Manager/node_db/dev/scan.sh
        
        
          
            ![ -f "ComfyUI-Manager/scripts/install-comfyui-venv-linux.sh" ] && chmod 755 ComfyUI-Manager/scripts/install-comfyui-venv-linux.sh
        
        
          
            ![ -f "ComfyUI-Manager/scripts/install-comfyui-venv-win.bat" ] && chmod 755 ComfyUI-Manager/scripts/install-comfyui-venv-win.bat
        
        
          
          

        
        
          
            ![ ! -d ComfyUI-Manager ] && echo -= Initial setup ComfyUI-Manager =- && git clone https://github.com/ltdrdata/ComfyUI-Manager
        
        
          
            %cd ComfyUI-Manager
        
        
          
            !git pull
        
        
          
          

        
        
          
          %cd $WORKSPACE
        
        
          
          

        
        
          
          if OPTIONS['INSTALL_CUSTOM_NODES_DEPENDENCIES']:
        
        
          
            !echo -= Install custom nodes dependencies =-
        
        
          
            !pip install GitPython
        
        
          
            !python custom_nodes/ComfyUI-Manager/cm-cli.py restore-dependencies
        
        
          
          

        
        
          
          # ModuleNotFoundError: No module named 'av'がでるため、あらかじめavをインストール
        
        
          
          !pip install av
        
        
          
          

        
        
          
          ### setup Wan ###
        
        
          
          

        
        
          
          !mkdir -p {WORKSPACE}/models/checkpoints
        
        
          
          

        
        
          
          #@markdown ---
        
        
          
          #@markdown ## モデル選択
        
        
          
          

        
        
          
          #@markdown ### Wan 2.2 T2Vモデル 14B
        
        
          
          use_wan2_2_t2v_a14b = False  #@param {type:"boolean"}
        
        
          
          

        
        
          
          #@markdown ### Wan 2.2 I2Vモデル 14B
        
        
          
          use_wan2_2_i2v_a14b = False  #@param {type:"boolean"}
        
        
          
          

        
        
          
          #@markdown ### Wan 2.2 TI2Vモデル 5B
        
        
          
          use_wan2_2_ti2v_5b  = False  #@param {type:"boolean"}
        
        
          
          

        
        
          
          WAN22_REPO="https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files"
        
        
          
          

        
        
          
          # T2V‑A14B
        
        
          
          if use_wan2_2_t2v_a14b:
        
        
          
            !wget -c "$WAN22_REPO/diffusion_models/wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget -c "$WAN22_REPO/diffusion_models/wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors"  \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget -nc "$WAN22_REPO/vae/wan_2.1_vae.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/vae
        
        
          
          

        
        
          
          # I2V‑A14B
        
        
          
          if use_wan2_2_i2v_a14b:
        
        
          
            !wget -c "$WAN22_REPO/diffusion_models/wan2.2_i2v_high_noise_14B_fp16.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget -c "$WAN22_REPO/diffusion_models/wan2.2_i2v_low_noise_14B_fp16.safetensors"  \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget -nc "$WAN22_REPO/vae/wan_2.1_vae.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/vae
        
        
          
          

        
        
          
          # TI2V‑5B
        
        
          
          if use_wan2_2_ti2v_5b:
        
        
          
            !wget -c "$WAN22_REPO/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget -c "$WAN22_REPO/vae/wan2.2_vae.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/vae
        
        
          
          

        
        
          
          #@markdown ### Wan 2.2 S2V（音声駆動） 14B
        
        
          
          use_wan2_2_s2v_14b = False  #@param {type:"boolean"}
        
        
          
          

        
        
          
          WAN22_REPO = "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files"
        
        
          
          

        
        
          
          if use_wan2_2_s2v_14b:
        
        
          
            !mkdir -p {WORKSPACE}/models/audio_encoders
        
        
          
            !wget -c "{WAN22_REPO}/diffusion_models/wan2.2_s2v_14B_fp8_scaled.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget -nc "{WAN22_REPO}/diffusion_models/wan2.2_s2v_14B_bf16.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget -nc "{WAN22_REPO}/audio_encoders/wav2vec2_large_english_fp16.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/audio_encoders
        
        
          
            !wget -nc "{WAN22_REPO}/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/text_encoders
        
        
          
            !wget -nc "{WAN22_REPO}/vae/wan_2.1_vae.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/vae
        
        
          
            !apt-get update -qq && apt-get install -y -qq ffmpeg
        
        
          
          

        
        
          
            #@markdown Lightning LoRA 4-step を使って高速化する
        
        
          
            #@markdown （S2V向けに学習されたLoRAではないため動きや画質が低下します。不要ならバイパスして利用してください）
        
        
          
            !wget -nc "{WAN22_REPO}/loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/loras
        
        
          
          

        
        
          
          #@markdown ### Wan 2.2 Animate 14B
        
        
          
          use_wan2_2_animate_14b = False  #@param {type:"boolean"}
        
        
          
          if use_wan2_2_animate_14b:
        
        
          
            WAN22_REPACK="https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files"
        
        
          
            !wget -c "{WAN22_REPACK}/diffusion_models/wan2.2_animate_14B_bf16.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget -nc "{WAN22_REPACK}/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/text_encoders
        
        
          
            !wget -nc "{WAN22_REPACK}/vae/wan_2.1_vae.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/vae
        
        
          
          

        
        
          
            !mkdir -p {WORKSPACE}/models/wan_animate/process_checkpoint/det
        
        
          
            !mkdir -p {WORKSPACE}/models/wan_animate/process_checkpoint/pose2d
        
        
          
            !mkdir -p {WORKSPACE}/models/wan_animate/process_checkpoint/sam2
        
        
          
            # YOLO (人物・物体検出)
        
        
          
            !wget -c "https://huggingface.co/Wan-AI/Wan2.2-Animate-14B/resolve/main/process_checkpoint/det/yolov10m.onnx" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/wan_animate/process_checkpoint/det
        
        
          
            # ViTPose (全身キーポイント)
        
        
          
            !wget -c "https://huggingface.co/Wan-AI/Wan2.2-Animate-14B/resolve/main/process_checkpoint/pose2d/vitpose_h_wholebody.onnx" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/wan_animate/process_checkpoint/pose2d
        
        
          
            # SAM 2 (セグメンテーション - small / base+ / large)
        
        
          
            !wget -c "https://huggingface.co/Wan-AI/Wan2.2-Animate-14B/resolve/main/process_checkpoint/sam2/sam2_hiera_small.pt" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/wan_animate/process_checkpoint/sam2
        
        
          
            !wget -c "https://huggingface.co/Wan-AI/Wan2.2-Animate-14B/resolve/main/process_checkpoint/sam2/sam2_hiera_base_plus.pt" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/wan_animate/process_checkpoint/sam2
        
        
          
            !wget -c "https://huggingface.co/Wan-AI/Wan2.2-Animate-14B/resolve/main/process_checkpoint/sam2/sam2_hiera_large.pt" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/wan_animate/process_checkpoint/sam2
        
        
          
          

        
        
          
            # Lightx2v LoRA（I2V 14B 480p distill rank64, bf16）
        
        
          
            !wget -c -O {WORKSPACE}/models/loras/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors \
        
        
          
              "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors"
        
        
          
          

        
        
          
            # WanAnimate relight LoRA（fp16）
        
        
          
            !wget -c -O {WORKSPACE}/models/loras/WanAnimate_relight_lora_fp16.safetensors \
        
        
          
              "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/LoRAs/Wan22_relight/WanAnimate_relight_lora_fp16.safetensors"
        
        
          
          

        
        
          
            # Wan 2.2 Animate 14B（Kijai fp8_e4m3fn_scaled版）
        
        
          
            !wget -c -O {WORKSPACE}/models/diffusion_models/Wan2_2-Animate-14B_fp8_e4m3fn_scaled_KJ.safetensors \
        
        
          
              "https://huggingface.co/Kijai/WanVideo_comfy_fp8_scaled/resolve/main/Wan22Animate/Wan2_2-Animate-14B_fp8_e4m3fn_scaled_KJ.safetensors"
        
        
          
          

        
        
          
          # 共通：T5 テキストエンコーダ
        
        
          
          !wget -nc "$WAN22_REPO/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" \
        
        
          
                --directory-prefix={WORKSPACE}/models/text_encoders
        
        
          
          

        
        
          
          #@markdown ### WAN 2.2 Rapid AIO 14B Mega v7（Phr00t）
        
        
          
          #@markdown ワークフローは[Mega v3用](https://huggingface.co/Phr00t/WAN2.2-14B-Rapid-AllInOne/resolve/main/Mega-v3/Rapid-AIO-Mega.json)のものを利用します
        
        
          
          

        
        
          
          use_wan22_rapid_mega_v7 = False      #@param {type:"boolean"}
        
        
          
          use_wan22_rapid_mega_v7_1_nsfw = False #@param {type:"boolean"}
        
        
          
          

        
        
          
          WAN22_RAPID_AIO_REPO = "https://huggingface.co/Phr00t/WAN2.2-14B-Rapid-AllInOne/resolve/main"
        
        
          
          

        
        
          
          # Mega v7 通常版
        
        
          
          if use_wan22_rapid_mega_v7:
        
        
          
            !wget -c "{WAN22_RAPID_AIO_REPO}/Mega-v7/wan2.2-rapid-mega-aio-v7.safetensors" --directory-prefix={WORKSPACE}/models/checkpoints
        
        
          
            
        
        
          
          # Mega v7.1 NSFW 版
        
        
          
          if use_wan22_rapid_mega_v7_1_nsfw:
        
        
          
            !wget -c "{WAN22_RAPID_AIO_REPO}/Mega-v7/wan2.2-rapid-mega-aio-nsfw-v7.1.safetensors" --directory-prefix={WORKSPACE}/models/checkpoints
        
        
          
          

        
        
          
          #@markdown ### WAN 2.2 Rapid All-In-One 14B（Phr00t）
        
        
          
          use_wan22_rapid_aio_t2v = False  #@param {type:"boolean"}
        
        
          
          #@markdown ※ワークフローは[T2V版](https://huggingface.co/Phr00t/WAN2.2-14B-Rapid-AllInOne/resolve/main/wan2.2-t2v-rapid-aio-example.json)のものを利用します
        
        
          
          use_wan22_rapid_aio_i2v = False  #@param {type:"boolean"}
        
        
          
          #@markdown ※ワークフローは[I2V版](https://huggingface.co/Phr00t/WAN2.2-14B-Rapid-AllInOne/resolve/main/wan2.2-i2v-rapid-aio-example.json)のものを利用します
        
        
          
          

        
        
          
          if use_wan22_rapid_aio_t2v:
        
        
          
            # Text-to-Video 版
        
        
          
            !wget -c "{WAN22_RAPID_AIO_REPO}/wan2.2-t2v-rapid-aio.safetensors" --directory-prefix={WORKSPACE}/models/checkpoints
        
        
          
          

        
        
          
          if use_wan22_rapid_aio_i2v:
        
        
          
            # Image-to-Video 版
        
        
          
            !wget -c "{WAN22_RAPID_AIO_REPO}/wan2.2-i2v-rapid-aio.safetensors" --directory-prefix={WORKSPACE}/models/checkpoints
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 I2Vモデル 480p 14B
        
        
          
          use_i2v_480p_14b = False #@param {type: "boolean"}
        
        
          
          if use_i2v_480p_14b:
        
        
          
            !wget "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_i2v_480p_14B_bf16.safetensors" --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 I2Vモデル 720p 14B
        
        
          
          use_i2v_720p_14b = False #@param {type: "boolean"}
        
        
          
          if use_i2v_720p_14b:
        
        
          
            !wget "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_i2v_720p_14B_bf16.safetensors" --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 T2Vモデル 1.3B
        
        
          
          use_t2v_1_3b = False #@param {type: "boolean"}
        
        
          
          if use_t2v_1_3b:
        
        
          
            !wget "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_t2v_1.3B_bf16.safetensors" --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 T2Vモデル 14B
        
        
          
          use_t2v_14b = False #@param {type: "boolean"}
        
        
          
          if use_t2v_14b:
        
        
          
            !wget "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_t2v_14B_bf16.safetensors" --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 ani_Wan2_1_14B_fp8_e4m3fn T2Vモデル 14B
        
        
          
          #@markdown [公式ページ](https://civitai.com/models/1626197)
        
        
          
          use_ani_wan2_1_14b_fp8_e4m3fn_t2v = False #@param {type: "boolean"}
        
        
          
          if use_ani_wan2_1_14b_fp8_e4m3fn_t2v:
        
        
          
            !wget "https://civitai.com/api/download/models/1840561" --content-disposition --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 ani_Wan2_1_14B_fp8_e4m3fn I2Vモデル 14B
        
        
          
          #@markdown [公式ページ](https://civitai.com/models/1626197)
        
        
          
          use_ani_wan2_1_14b_fp8_e4m3fn_i2v = False #@param {type: "boolean"}
        
        
          
          if use_ani_wan2_1_14b_fp8_e4m3fn_i2v:
        
        
          
            !wget "https://civitai.com/api/download/models/1852433" --content-disposition --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 ani_Wan2_1_14B_fp8_e4m3fn T2Vモデル 1.3B
        
        
          
          #@markdown [公式ページ](https://civitai.com/models/1626197)
        
        
          
          use_ani_wan2_1_1_3b_fp8_e4m3fn_t2v = False #@param {type: "boolean"}
        
        
          
          if use_ani_wan2_1_1_3b_fp8_e4m3fn_t2v:
        
        
          
            !wget "https://civitai.com/api/download/models/1842026" --content-disposition --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 VACE FP16 14B
        
        
          
          use_vace_14b = False      #@param {type:"boolean"}
        
        
          
          

        
        
          
          #@markdown ### Wan 2.1 VACE FP16 1.3B
        
        
          
          use_vace_1_3b = False    #@param {type:"boolean"}
        
        
          
          

        
        
          
          #@markdown ### Wan2.1 1.3B + CausVid LoRA
        
        
          
          use_causvid_lora_13b = False  #@param {type:"boolean"}
        
        
          
          

        
        
          
          VACE_REPO = "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models"
        
        
          
          

        
        
          
          #@markdown ### Wan2.1-Fun-Control-14B from Kijai
        
        
          
          #@markdown [公式ページ](https://huggingface.co/Kijai/WanVideo_comfy)
        
        
          
          use_wan_fun_control_14b = False  #@param {type: "boolean"}
        
        
          
          if use_wan_fun_control_14b:
        
        
          
            !wget https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2.1-Fun-Control-14B_fp8_e4m3fn.safetensors --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors --directory-prefix={WORKSPACE}/models/clip_vision
        
        
          
            !wget https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/umt5-xxl-enc-bf16.safetensors --directory-prefix={WORKSPACE}/models/text_encoders
        
        
          
            !wget https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1_VAE_bf16.safetensors --directory-prefix={WORKSPACE}/models/vae
        
        
          
          

        
        
          
          install_wan_nodes = use_vace_14b or use_vace_1_3b or use_wan_fun_control_14b
        
        
          
          

        
        
          
          #@markdown ### Wan2.1-Fun-Control-14Bを用いたオススメワークフロー
        
        
          
          #@markdown - [Wan_Restyledfirstframe_workflow]((https://civitai.com/models/1376578?modelVersionId=1588367)
        
        
          
          

        
        
          
          #@markdown ### GGUFモデル
        
        
          
          

        
        
          
          #@markdown ### I2Vモデル 14B Q6
        
        
          
          use_gguf_i2v_14b_q6 = False #@param {type: "boolean"}
        
        
          
          if use_gguf_i2v_14b_q6:
        
        
          
            !wget "https://huggingface.co/city96/Wan2.1-I2V-14B-720P-gguf/resolve/main/wan2.1-i2v-14b-720p-Q6_K.gguf" --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          # GGUFモデルが有効化されている場合は対応する拡張機能も併せてダウンロードする
        
        
          
          if use_gguf_i2v_14b_q6:
        
        
          
            %cd $WORKSPACE/custom_nodes
        
        
          
            !git clone https://github.com/city96/ComfyUI-GGUF
        
        
          
            !pip install -r requirements.txt
        
        
          
            !pip install gguf
        
        
          
            %cd $WORKSPACE
        
        
          
          

        
        
          
          # CausVid LoRA
        
        
          
          if use_causvid_lora_13b:
        
        
          
            !wget -c "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan21_CausVid_bidirect2_T2V_1_3B_lora_rank32.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/loras
        
        
          
          

        
        
          
          # VACE関連のセットアップ
        
        
          
          if use_vace_14b:
        
        
          
            !wget -c "$VACE_REPO/wan2.1_vace_14B_fp16.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          if use_vace_1_3b:
        
        
          
            !wget -c "$VACE_REPO/wan2.1_vace_1.3B_fp16.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
          

        
        
          
          !wget -nc "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" \
        
        
          
                --directory-prefix={WORKSPACE}/models/text_encoders
        
        
          
          !wget -nc "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors" \
        
        
          
                --directory-prefix={WORKSPACE}/models/vae
        
        
          
          

        
        
          
          if install_wan_nodes:
        
        
          
            %cd $WORKSPACE/custom_nodes
        
        
          
          

        
        
          
            # WanVideoWrapper
        
        
          
            !git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git
        
        
          
            %cd ComfyUI-WanVideoWrapper
        
        
          
            !pip install -r requirements.txt
        
        
          
            %cd ..
        
        
          
          

        
        
          
            # KJNodes
        
        
          
            !git clone https://github.com/kijai/ComfyUI-KJNodes.git
        
        
          
            %cd ComfyUI-KJNodes
        
        
          
            !pip install -r requirements.txt
        
        
          
            %cd ..
        
        
          
          

        
        
          
            # VideoHelperSuite
        
        
          
            !git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
        
        
          
            %cd ComfyUI-VideoHelperSuite
        
        
          
            !pip install -r requirements.txt
        
        
          
            %cd ..
        
        
          
          

        
        
          
            # ControlNet Aux
        
        
          
            !git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git
        
        
          
            %cd comfyui_controlnet_aux
        
        
          
            !pip install -r requirements.txt
        
        
          
            %cd ..
        
        
          
          

        
        
          
            # Essentials
        
        
          
            !git clone https://github.com/cubiq/ComfyUI_essentials.git
        
        
          
            %cd ComfyUI_essentials
        
        
          
            !pip install -r requirements.txt
        
        
          
            %cd ..
        
        
          
          

        
        
          
            # download text_encoders
        
        
          
            !wget -nc "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/umt5-xxl-enc-bf16.safetensors" --directory-prefix={WORKSPACE}/models/text_encoders
        
        
          
          

        
        
          
            %cd {WORKSPACE}
        
        
          
          

        
        
          
          #@markdown ### Smartphone Snapshot Photo Reality LoRA (Wan2.1 T2IV 14B)
        
        
          
          #@markdown [公式ページ](https://civitai.com/models/1763826)
        
        
          
          use_snapshot_photo_reality = False  #@param {type:"boolean"}
        
        
          
          

        
        
          
          if use_snapshot_photo_reality:
        
        
          
            !wget -c "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_t2v_14B_fp8_e4m3fn.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/diffusion_models
        
        
          
            !wget "https://civitai.com/api/download/models/1996092" \
        
        
          
                  --content-disposition \
        
        
          
                  --directory-prefix={WORKSPACE}/models/loras
        
        
          
            !wget -c "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan21_T2V_14B_lightx2v_cfg_step_distill_lora_rank32.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/loras
        
        
          
            !wget -c "https://huggingface.co/vrgamedevgirl84/Wan14BT2VFusioniX/resolve/main/FusionX_LoRa/Wan2.1_T2V_14B_FusionX_LoRA.safetensors" \
        
        
          
                  --directory-prefix={WORKSPACE}/models/loras
        
        
          
            # install custom nodes
        
        
          
            %cd $WORKSPACE/custom_nodes
        
        
          
            !git clone https://github.com/ClownsharkBatwing/RES4LYF.git
        
        
          
            %cd RES4LYF
        
        
          
            !if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
        
        
          
            %cd $WORKSPACE
        
        
          
          

        
        
          
          #@markdown ---
        
        
          
          

        
        
          
          !wget -nc "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" --directory-prefix={WORKSPACE}/models/text_encoders
        
        
          
          !wget -nc "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/clip_vision/clip_vision_h.safetensors" --directory-prefix={WORKSPACE}/models/clip_vision
        
        
          
          !wget -nc "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors" --directory-prefix={WORKSPACE}/models/vae
        
        
          
          

        
        
          
          ### start comfyui ###
        
        
          
          !wget -P ~ https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        
        
          
          !dpkg -i ~/cloudflared-linux-amd64.deb
        
        
          
          

        
        
          
          import subprocess
        
        
          
          import threading
        
        
          
          import time
        
        
          
          import socket
        
        
          
          import urllib.request
        
        
          
          

        
        
          
          def iframe_thread(port):
        
        
          
            while True:
        
        
          
                time.sleep(0.5)
        
        
          
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        
        
          
                result = sock.connect_ex(('127.0.0.1', port))
        
        
          
                if result == 0:
        
        
          
                  break
        
        
          
                sock.close()
        
        
          
            print("\nComfyUI finished loading, trying to launch cloudflared (if it gets stuck here cloudflared is having issues)\n")
        
        
          
          

        
        
          
            p = subprocess.Popen(["cloudflared", "tunnel", "--url", "http://127.0.0.1:{}".format(port)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        
          
            for line in p.stderr:
        
        
          
              l = line.decode()
        
        
          
              if "trycloudflare.com " in l:
        
        
          
                print("This is the URL to access ComfyUI:", l[l.find("http"):], end='')
        
        
          
              #print(l, end='')
        
        
          
          

        
        
          
          

        
        
          
          threading.Thread(target=iframe_thread, daemon=True, args=(8188,)).start()
        
        
          
          

        
        
          
          !python main.py --dont-print-server
