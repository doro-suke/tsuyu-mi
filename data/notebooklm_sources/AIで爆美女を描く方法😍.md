# AIで爆美女を描く方法😍
- **Source URL**: https://zenn.dev/z4q/articles/516bfb43eefa70
- **Score**: 45
- **AI Summary**:
  - ComfyUIとfluxgymを統合したDocker環境構築用設定ファイルの提供
  - GPUリソースを効率的に利用するためのコンテナ定義と各種ボリューム設定
  - LoRA学習から画像生成までを一貫して行うワークフローと環境構築手順
- **Read Now Reason**: ComfyUIと学習ツールを組み合わせたDocker環境の具体的な記述があり、GPUリソースを伴うコンテナ管理の実装例として参考にできる。
- **Suggested Tags**: #ComfyUI, #Docker, #GPU-Computing, #fluxgym, #環境構築
- **Processed Date**: 2026/5/13

---

## 本文
生成例




 必要なもの


VRAMが多いGPU(足りない場合はVRAM使用量を下げる方法調べてみてください)


 画像生成の方法
以下のworkflowをダウンロードして、ComfyUIで読み込んでください。足りないCustomNodesはComfyUI Managerからダウンロードできます。lora以外のモデルもComfyUI Managerでダウンロードできます。


 より具体的な説明

 ComfyUIの建て方

 Dockerfile
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/ComfyUI && \
    git clone https://github.com/comfyanonymous/ComfyUI.git /app/ComfyUI && \
    python -m venv --system-site-packages /app/ComfyUI/venv && \
    . /app/ComfyUI/venv/bin/activate && \
    pip install --no-cache-dir -r /app/ComfyUI/requirements.txt && \
    cd /app/ComfyUI/custom_nodes && \
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git && \
    deactivate

RUN mkdir -p /app/fluxgym && \
    git clone https://github.com/cocktailpeanut/fluxgym.git /app/fluxgym && \
    cd /app/fluxgym && \
    git clone -b sd3 https://github.com/kohya-ss/sd-scripts.git && \
    python -m venv --system-site-packages /app/fluxgym/venv && \
    . /app/fluxgym/venv/bin/activate && \
    cd sd-scripts && \
    pip install --no-cache-dir -r requirements.txt && \
    cd .. && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir voluptuous && \
    deactivate

ENV GRADIO_SERVER_NAME="0.0.0.0"

 docker-compose.yaml
services:
  imagegen:
    build: .
    command:
    - /bin/bash
    - -c
    - cd /app/ComfyUI && . venv/bin/activate && python main.py --listen 0.0.0.0 --port
      8188 & cd /app/fluxgym && . venv/bin/activate && python app.py
    deploy:
      resources:
        reservations:
          devices:
          - capabilities:
            - gpu
            count: all
            driver: nvidia
    ports:
    - 8188:8188
    - 7860:7860
    volumes:
    - comfyui_output:/app/ComfyUI/output
    - comfyui_models:/app/ComfyUI/models
    - comfyui_custom_nodes:/app/ComfyUI/custom_nodes
    - fluxgym_outputs:/app/fluxgym/outputs
    - fluxgym_models:/app/fluxgym/models
    - fluxgym_datasets:/app/fluxgym/datasets
volumes:
  comfyui_custom_nodes: {}
  comfyui_models: {}
  comfyui_output: {}
  fluxgym_datasets: {}
  fluxgym_models: {}
  fluxgym_outputs: {}
これらを同じ場所においてdocker compose upすれば立ち上がります。
http://localhost:8188を開くとComfyUIにアクセスできると思います。

 Lora学習
以下のUIでかんたんに学習できます

Dockerコンテナに含まれているのでhttp://localhost:7860にアクセスして学習してください。
A6000で1500ステップぐらいで1時間ぐらいかかりました。
symbolic link使うとComfyUIとfluxgymで同じモデルが共有でき容量を節約できます。

 ComfyUI公式のサンプルworkflow
