# WebBigData
- **Source URL**: https://webbigdata.jp/post-21381/
- **Score**: 82
- **AI Summary**:
  - Colab-CLIを用いてローカルからColab T4 GPU上にLLM環境を自動デプロイする手法を解説。
  - Speculative Decodingの活用で、Gemma 4 12Bを毎秒22トークンの実用速度で動作可能にする。
  - cloudflaredにより、構築したLLMサーバーをローカル環境から安全にAPI接続する構成を示す。
- **Read Now Reason**: Colab-CLIによる自動デプロイスクリプトと、Speculative Decoding・Cloudflareトンネルを組み合わせたLLM推論環境の構築手法が具体的に示されており、AI駆動開発の検証用ローカルAPIサーバーとして即時流用可能であるため。
- **Suggested Tags**: #Colab-CLI, #Gemma-4, #llama.cpp, #Cloudflare-Tunnel, #Speculative-Decoding
- **Processed Date**: 2026/6/17

---

## 本文
１．Gemma4 12BをColab-CLIの力を借りてMacBook Airや非力なマシンで動かす方法まとめ
・Googleが無料公開してくれたLLMであるgemma4は非常に高性能だが高いスペックのPCとGPUがないと動かす事が難しい
・gemma-4-12B-it-qat-UD-japanese-imatrixなどのGGUF量子化版を使えば必要スペックは下げれるがそれでも数世代前のPCでは重い
・Colab-Cli使えばコマンドラインからColabのGPUが利用可能になり低スペックPCでもgemma-4を利用する事が可能
２．GPUがないPCでGemma 4 12Bを利用する方法
Googleが公開してくれたgoogle/gemma-4-12B-itは23.9GBなので、そのままではRTX 5090などの個人向けGPUではフラグシップモデルでも動きません。日本語解釈能力が高く保持されているdahara1/gemma-4-12B-it-qat-UD-japanese-imatrixなどの量子化版であれば7.37GB(gemma-4-12B-it-qat-ja-UD-Q4_K_XL.gguf)と10GB以下のサイズになるので比較的動かしやすくなりますが、それでも私のM1 MacBook Air（16GB）では超高熱を出しながらも生成速度は5-7token/秒と低速でした。
本記事では、２０２６年６月にリリースされたGoogle Colab Cli(Googleが無料で提供してくれているGPU)を使って、Google Colab の T4 GPU をローカル環境のターミナルから直接操作することで、Gemma 4 12B クラスのモデルを利用する方法を検証しました。
この記事ではその手順を丸ごと紹介します。

３．Colab-CLIの凄さ
画像生成AIであるStable Diffusionが大流行していた頃、公式のブラウザGUI経由でなければColabは操作してはいけないという規約が追加されてAutomatic 1111などのGUIツールにColabを利用する事が規制された時代がありました。
しかし、Colab-CLIはGoogle公式ツールなのですが「ローカルPCのターミナルからコマンド一発でT4 GPUインスタンスを無料でデプロイしてローカルから利用！」なんて事ができてしまうんです。
え？そんな事やっていい時代になったんだ！と驚いたのですが、AIエージェント時代対応と言う事でしょうか。
google-colab-cli を使うと、ローカルのターミナルから colab exec でコードを流し込めます。ブラウザ不要、スクリプトで完結するため再現性が高く、手元のマシンスペックに依存しません。
残念ながらまだWindowsには正式対応しておらず、MacかLinuxのみですが、今回のスクリプトは作りがシンプルなので応用は出来ると思います。
構成の概要
ローカルMac/Linux
  └─ colab exec (colab-cli)
       └─ Google Colab T4 GPU （無料版GPU)
            ├─ llama-server (llama.cpp ビルド済みバイナリ CUDA 12.8)
            │    ├─ メインモデル: Gemma 4-12B Q4_K_XL (HFから自動DL)
            │    └─ ドラフトモデル: Gemma 4-423M Q4_0 (Speculative Decoding用)
            └─ cloudflared トンネル
                 └─ https://xxxx.trycloudflare.com  ← ローカルから叩く

メインモデルに Speculative Decoding 用のドラフトモデルを組み合わせることで、T4 でも 22トークン/秒程度の実用的な速度が出ます。

前提

Python / uv がインストール済み
Google アカウント（Colab の無料枠で OK）
Hugging Face アカウントと アクセストークン


セットアップ
1. colab-cli のインストール
mkdir colab-cli
cd colab-cli
uv init
uv tool install google-colab-cli

2. Colab セッションを起動
colab new --gpu T4

初回はブラウザ経由のGoogle アカウントの認証が求められます。


起動スクリプト
以下をそのままターミナルに貼り付けて実行してください。モデルのダウンロードからサーバー起動、トンネル生成まで全自動です。
HuggingFaceのアカウントを持っている場合、'YOUR_HF_TOKEN'にご自分のアカウントのトークンを設定しておくとダウンロード時間が短縮されるそうです。
cat << 'EOF' | colab exec --timeout 1800
import os
import re
import subprocess
import time
import socket

def find_free_port():
    for port in range(8100, 8200):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', port))
                return port
            except OSError:
                continue
    raise RuntimeError('No free port found')

PORT = find_free_port()
print(f'Using port: {PORT}')

# llama.cpp ビルド済みバイナリ (CUDA 12.8) のダウンロード・展開
if not os.path.exists('/content/cuda-12.8/llama-server'):
    print('Downloading pre-built llama.cpp binary (CUDA 12.8)...')
    subprocess.run([
        'wget', '-q',
        'https://github.com/ai-dock/llama.cpp-cuda/releases/download/b9628/llama.cpp-b9628-cuda-12.8-amd64.tar.gz',
        '-O', '/content/llama.cpp.tar.gz'
    ], check=True)
    subprocess.run(['tar', '-xzf', '/content/llama.cpp.tar.gz', '-C', '/content/'], check=True)
    subprocess.run(['chmod', '+x', '/content/cuda-12.8/llama-server'], check=True)
else:
    print('llama-server already exists, skipping download.')

os.environ['HF_TOKEN'] = 'YOUR_HF_TOKEN'  # ← 自分のトークンに変更
os.environ['HF_HUB_DISABLE_PROGRESS_BARS'] = '1'

LIB_PATH = '/content/cuda-12.8'
SERVER_BIN = f'{LIB_PATH}/llama-server'

# Speculative Decoding 用ドラフトモデルを事前DL
# (llama-server の -hf フラグはドラフトモデルのHF直接DLに非対応のため)
print('Pre-downloading draft model...')
from huggingface_hub import hf_hub_download
draft_model_path = hf_hub_download(
    repo_id='dahara1/gemma-4-12B-it-qat-assistant',
    filename='gemma-4-423M-12b-it-qat-unquantized-assistant-Q4_0.gguf'
)
print(f'Draft model: {draft_model_path}')

if not os.path.exists('/content/cloudflared'):
    print('Installing cloudflared...')
    subprocess.run(['wget', '-q', 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64', '-O', '/content/cloudflared'])
    subprocess.run(['chmod', '+x', '/content/cloudflared'])

env = {
    **os.environ,
    'LD_LIBRARY_PATH': f'{LIB_PATH}:{os.environ.get("LD_LIBRARY_PATH", "")}',
    'HF_TOKEN': os.environ['HF_TOKEN'],
}

server_log_path = '/content/server.log'
server_log = open(server_log_path, 'w')
print(f'Starting llama-server on port {PORT}...')
server_proc = subprocess.Popen(
    [
        SERVER_BIN,
        '-hf',         'dahara1/gemma-4-12B-it-qat-UD-japanese-imatrix:gemma-4-12B-it-qat-ja-UD-Q4_K_XL',
        '-md',         draft_model_path,
        '--spec-type', 'draft-mtp',
        '--reasoning', 'on',
        '--port',      str(PORT),
        '--host',      '0.0.0.0',
        '-ngl',        '-1',
        '--temp',      '1.0',
        '--top-p',     '0.95',
        '--top-k',     '64',
        '--min-p',     '0.0',
        '--ctx-size',  '32000',
        '--jinja',
    ],
    stdout=server_log,
    stderr=subprocess.STDOUT,
    env=env
)

# モデルロード完了まで待機
print('Waiting for model to load', end='', flush=True)
for _ in range(600):
    if os.path.exists(server_log_path):
        with open(server_log_path, 'r') as f:
            if 'all slots are idle' in f.read():
                break
    print('.', end='', flush=True)
    time.sleep(1)
else:
    print('\nTimeout waiting for model load.')
    server_proc.terminate()
    exit(1)
print('\nModel loaded!')

# Cloudflare トンネル起動
print('Starting Cloudflare Tunnel...')
log_filepath = '/content/tunnel.log'
if os.path.exists(log_filepath):
    os.remove(log_filepath)

tunnel_proc = subprocess.Popen(
    ['/content/cloudflared', 'tunnel', '--url', f'http://localhost:{PORT}', '--logfile', log_filepath],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)

print('Generating API URL...')
tunnel_url = None
for _ in range(150):
    if os.path.exists(log_filepath):
        with open(log_filepath, 'r') as f:
            match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', f.read())
            if match:
                tunnel_url = match.group(0)
                break
    time.sleep(0.1)

if tunnel_url:
    print('\n====================================================================')
    print('  SUCCESS! SERVER IS READY!')
    print(f'  {tunnel_url}')
    print('====================================================================\n')
else:
    print('Failed to get tunnel URL.')
    server_proc.terminate()
    tunnel_proc.terminate()
EOF

SUCCESS! SERVER IS READY! と URL が表示されたら、その時点でリクエストを投げられます。モデルファイルのダウンロード、及び暖気運転がふくまれるので起動までには数分かかると思います。下記の画像の赤枠URLでllama-serverが動いているのでColabのセッション制限内であれば自由に使えます。
なお、公式情報によれば無料版は
１）12時間ハードリミット → 回避不可、最大12時間で必ず切れる ⚠️
２）GoogleによるVM強制終了 → 稀に発生、再起動が必要 ⚠️
で２）の条件はまだ今ひとつよくわかりませんが、切断されてしまう事はありましたので様子を見つつ運用してください。


ローカルから叩く
from openai import OpenAI
import time

client = OpenAI(
    base_url="https://xxxx.trycloudflare.com/v1",  # ← 前手順で赤枠で表示された URL に変更
    api_key="dummy"
)

for i in range(60):
    try:
        response = client.chat.completions.create(
            model="gemma-4-12B-it-qat-ja-UD-Q4_K_XL.gguf",
            messages=[{"role": "user", "content": "こんにちは！Gemma 4の特徴を簡潔に教えてください。"}]
        )
        print(response.choices[0].message.content)
        break
    except Exception as e:
        print(f"[{i}] waiting... {e}")
        time.sleep(10)


llama-server側のログ

出力サンプル

ハマりどころまとめ
llama-cpp-python ではなく llama-server バイナリを使う理由
python -m llama_cpp.server は Pythonバインディング版のサーバーで、llama.cpp 本体の CLI フラグ（--jinja、--spec-type、--reasoning など）の多くが未実装でした。今回使いたいオプションをフルに使うには、llama.cpp ネイティブの llama-server バイナリが必要です。
Colab 上でビルドするとタイムアウトするため、ai-dock/llama.cpp-cuda のビルド済みバイナリを使っています。
LD_LIBRARY_PATH を通す
ai-dock 版のバイナリは .so ファイルがバイナリと同じディレクトリにフラットに置かれています。そのまま実行すると libllama-server-impl.so: cannot open shared object file エラーになるので、LD_LIBRARY_PATH=/content/cuda-12.8 を環境変数に設定してから Popen に渡す必要があります。
ポートの衝突
colab exec は実行のたびに新しい Python セッションを立ち上げますが、Colab のランタイム自体は継続しています。前回起動したサーバープロセスがポートを押さえたままになるため、固定ポートだと couldn't bind HTTP server socket で落ちます。socket で空きポートを動的に探す方法で回避できます。
URL が出てもすぐ叩かない
-hf フラグはサーバー起動後にモデルのダウンロードを開始します。URL が表示された直後はまだロード中で、リクエストを投げると 503 Loading model が返ります。server.log に all slots are idle が出るまで待機してから URL を表示するようにしています。

おわりに
画像認識、音声認識などその他のGemma4の動かし方はdahara1/gemma-4-12B-it-qat-UD-japanese-imatrixのモデルカードを参考にしてください。
今回の手順を実行する事によって、手元のマシンが非力でもGoogle ColabのGPUをターミナルからスクリプトで操作してGemma 4-12B クラスのモデルを API として使えます。アイディア次第で、毎晩特定の小タスクをGemma 4 12Bに実行してもらうなど、AIエージェントとの相乗効果も見込めます。
Colab の無料枠は時間制限があるので長時間の運用には向きませんが、検証や開発用途には十分実用的ですし、必要に応じて有料版のL4やA100を使ってもよいでしょう。
有り難い時代になったものです。Google Colab、Gemma4開発チームに感謝します。
