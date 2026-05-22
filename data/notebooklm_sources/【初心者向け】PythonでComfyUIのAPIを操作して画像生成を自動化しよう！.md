# 【初心者向け】PythonでComfyUIのAPIを操作して画像生成を自動化しよう！
- **Source URL**: https://zenn.dev/sunwood_ai_labs/articles/12085336e9d1ab
- **Score**: 78
- **AI Summary**:
  - ComfyUIをPythonから制御し、画像生成を自動化する具体的な手順とメリットを解説。
  - GUIで作成したワークフローをAPI形式のJSONで書き出し、外部プログラムから呼び出す手法を詳述。
  - SD3等のモデルを含むワークフロー定義の具体例があり、自動化パイプラインの実装に即時転用可能。
- **Read Now Reason**: 現在のプロジェクトである「自動化パイプライン構築」に直結しており、ComfyUIをプログラムから制御するための具体的かつ実践的な実装方法が示されているため。
- **Suggested Tags**: #ComfyUI, #Python, #API連携, #画像生成自動化
- **Processed Date**: 2026/5/13

---

## 本文
ComfyUIは、Stable Diffusionをベースにした強力な画像生成ツールですが、GUI操作だけでなくAPIを通じてプログラムから制御することも可能です。
この記事では、Pythonを使ってComfyUIのAPIを操作し、画像生成を自動化する方法を、初心者の方でも理解できるように丁寧に解説していきます。

 なぜComfyUIのAPIを使うのか？
ComfyUIのAPIを使うメリットは、以下のような点が挙げられます。


自動化による作業効率の向上:  画像生成のプロンプトやパラメータ設定をコードで記述することで、大量の画像生成を自動化できます。

複雑なワークフローの実現:  APIを通じてComfyUIの様々なノードを組み合わせた、より複雑な画像生成ワークフローを構築できます。

外部システムとの連携:  Webアプリケーションやその他のシステムと連携し、動的に画像生成を行うことができます。


 準備
まずは、APIを利用するための準備を行いましょう。

 ComfyUIのインストール
まだComfyUIをインストールしていない場合は、公式GitHubからダウンロードしてインストールしてください。


 ComfyUIの起動
インストールが完了したら、ComfyUIを起動し、APIが利用可能な状態にしてください。デフォルトではhttp://127.0.0.1:8188でAPIが待ち受け状態になります。
D:\Prj\new_ComfyUI_windows_portable_nvidia_cu121_or_cpu\ComfyUI_windows_portable>.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build
[START] Security scan
[DONE] Security scan
## ComfyUI-Manager: installing dependencies done.
** ComfyUI startup time: 2024-07-15 12:53:42.989443
** Platform: Windows
** Python version: 3.11.8 (tags/v3.11.8:db85d51, Feb  6 2024, 22:03:32) [MSC v.1937 64 bit (AMD64)]
** Python executable: D:\Prj\new_ComfyUI_windows_portable_nvidia_cu121_or_cpu\ComfyUI_windows_portable\python_embeded\python.exe
** Log path: D:\Prj\new_ComfyUI_windows_portable_nvidia_cu121_or_cpu\ComfyUI_windows_portable\comfyui.log

Prestartup times for custom nodes:
   0.6 seconds: D:\Prj\new_ComfyUI_windows_portable_nvidia_cu121_or_cpu\ComfyUI_windows_portable\ComfyUI\custom_nodes\ComfyUI-Manager-main

Total VRAM 24564 MB, total RAM 130911 MB
pytorch version: 2.3.1+cu121
Set vram state to: NORMAL_VRAM
Device: cuda:0 NVIDIA GeForce RTX 4090 : cudaMallocAsync
VAE dtype: torch.bfloat16
Using pytorch cross attention
### Loading: ComfyUI-Manager (V2.38)
### ComfyUI Revision: 2243 [1ddf512f] | Released on '2024-06-12'

Import times for custom nodes:
   0.0 seconds: D:\Prj\new_ComfyUI_windows_portable_nvidia_cu121_or_cpu\ComfyUI_windows_portable\ComfyUI\custom_nodes\websocket_image_save.py
   0.0 seconds: D:\Prj\new_ComfyUI_windows_portable_nvidia_cu121_or_cpu\ComfyUI_windows_portable\ComfyUI\custom_nodes\ComfyUI_UltimateSDUpscale
   0.2 seconds: D:\Prj\new_ComfyUI_windows_portable_nvidia_cu121_or_cpu\ComfyUI_windows_portable\ComfyUI\custom_nodes\ComfyUI-Manager-main

Starting server

To see the GUI go to: http://127.0.0.1:8188

 Python環境のセットアップ
Pythonの開発環境をまだ構築していない場合は、構築してください。
(base) C:\Prj\OASIS>python -V  
Python 3.12.1

 workflow_api.jsonの準備
ComfyUI上で希望する画像生成ワークフローを作成し、「Save (API Format)」ボタンを押してworkflow_api.jsonという名前で保存してください。
{
  "11": {
    "inputs": {
      "clip_name1": "clip_g.safetensors",
      "clip_name2": "clip_l.safetensors",
      "clip_name3": "t5xxl_fp16.safetensors"
    },
    "class_type": "TripleCLIPLoader",
    "_meta": {
      "title": "TripleCLIPLoader"
    }
  },
  "13": {
    "inputs": {
      "shift": 3,
      "model": [
        "252",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "ModelSamplingSD3"
    }
  },
  "67": {
    "inputs": {
      "conditioning": [
        "71",
        0
      ]
    },
    "class_type": "ConditioningZeroOut",
    "_meta": {
      "title": "ConditioningZeroOut"
    }
  },
  "68": {
    "inputs": {
      "start": 0.1,
      "end": 1,
      "conditioning": [
        "67",
        0
      ]
    },
    "class_type": "ConditioningSetTimestepRange",
    "_meta": {
      "title": "ConditioningSetTimestepRange"
    }
  },
  "69": {
    "inputs": {
      "conditioning_1": [
        "68",
        0
      ],
      "conditioning_2": [
        "70",
        0
      ]
    },
    "class_type": "ConditioningCombine",
    "_meta": {
      "title": "Conditioning (Combine)"
    }
  },
  "70": {
    "inputs": {
      "start": 0,
      "end": 0.1,
      "conditioning": [
        "71",
        0
      ]
    },
    "class_type": "ConditioningSetTimestepRange",
    "_meta": {
      "title": "ConditioningSetTimestepRange"
    }
  },
  "71": {
    "inputs": {
      "text": "lowres, bad anatomy, bad hands, text, error, missing fingers, cropped, worst quality, low quality,normal quality, blurry, lowres,\n",
      "clip": [
        "11",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "135": {
    "inputs": {
      "width": 1024,
      "height": 600,
      "batch_size": 1
    },
    "class_type": "EmptySD3LatentImage",
    "_meta": {
      "title": "EmptySD3LatentImage"
    }
  },
  "231": {
    "inputs": {
      "samples": [
        "271",
        0
      ],
      "vae": [
        "252",
        2
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "233": {
    "inputs": {
      "images": [
        "267",
        0
      ]
    },
    "class_type": "PreviewImage",
    "_meta": {
      "title": "Preview Image"
    }
  },
  "252": {
    "inputs": {
      "ckpt_name": "sd3_medium_incl_clips.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "267": {
    "inputs": {
      "upscale_by": 2,
      "seed": 601337636939994,
      "steps": 15,
      "cfg": 5,
      "sampler_name": "dpmpp_2m",
      "scheduler": "sgm_uniform",
      "denoise": 0.15,
      "mode_type": "Chess",
      "tile_width": 1024,
      "tile_height": 1024,
      "mask_blur": 8,
      "tile_padding": 32,
      "seam_fix_mode": "None",
      "seam_fix_denoise": 1,
      "seam_fix_width": 64,
      "seam_fix_mask_blur": 8,
      "seam_fix_padding": 16,
      "force_uniform_tiles": true,
      "tiled_decode": false,
      "image": [
        "231",
        0
      ],
      "model": [
        "13",
        0
      ],
      "positive": [
        "283",
        0
      ],
      "negative": [
        "69",
        0
      ],
      "vae": [
        "252",
        2
      ],
      "upscale_model": [
        "269",
        0
      ]
    },
    "class_type": "UltimateSDUpscale",
    "_meta": {
      "title": "Ultimate SD Upscale"
    }
  },
  "269": {
    "inputs": {
      "model_name": "4x-UltraSharp.pth"
    },
    "class_type": "UpscaleModelLoader",
    "_meta": {
      "title": "Load Upscale Model"
    }
  },
  "270": {
    "inputs": {
      "images": [
        "231",
        0
      ]
    },
    "class_type": "PreviewImage",
    "_meta": {
      "title": "Preview Image"
    }
  },
  "271": {
    "inputs": {
      "seed": 601337636939994,
      "steps": 28,
      "cfg": 4.5,
      "sampler_name": "dpmpp_2m",
      "scheduler": "sgm_uniform",
      "denoise": 1,
      "model": [
        "13",
        0
      ],
      "positive": [
        "283",
        0
      ],
      "negative": [
        "69",
        0
      ],
      "latent_image": [
        "135",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "273": {
    "inputs": {
      "filename_prefix": "ComfyUI_low",
      "images": [
        "231",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  "274": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": [
        "267",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  "281": {
    "inputs": {
      "image": "a-surreal-watercolor-painting-that-depicts-an-ethe-OCZsfWFSTAegBYtFL86cnw-kGl0UMLaRSedOQY1GSxx4A.jpeg",
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "282": {
    "inputs": {
      "clip_l": "anime, Kawaii, (masterpiece:1.3),(best quality:1.1),(highres:1.1),(very aesthetic:1.1),1girl,(black hair:1.2), (messy hair:0.3), (medium hair:1.1), (swept bangs:1.1),(blue eyes:1.2), (upturned eyes:1.1),eyelashes, (pantyhose:1.1), light smile, upper body,\n",
      "clip_g": "anime, Kawaii, (masterpiece:1.3),(best quality:1.1),(highres:1.1),(very aesthetic:1.1),1girl,(black hair:1.2), (messy hair:0.3), (medium hair:1.1), (swept bangs:1.1),(blue eyes:1.2), (upturned eyes:1.1),eyelashes, (pantyhose:1.1), light smile, upper body,\n",
      "t5xxl": "anime, Kawaii, (masterpiece:1.3),(best quality:1.1),(highres:1.1),(very aesthetic:1.1),1girl,(black hair:1.2), (messy hair:0.3), (medium hair:1.1), (swept bangs:1.1),(blue eyes:1.2), (upturned eyes:1.1),eyelashes, (pantyhose:1.1), light smile, upper body,\n",
      "empty_padding": "none",
      "clip": [
        "11",
        0
      ]
    },
    "class_type": "CLIPTextEncodeSD3",
    "_meta": {
      "title": "CLIPTextEncodeSD3"
    }
  },
  "283": {
    "inputs": {
      "text": "This image is a digital art piece depicting a owl with striking features that are commonly found in anime or manga illustrations. \n\nowl has large, expressive blue eyes . ",
      "clip": [
        "11",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  }
}


 Pythonコードの実装
それでは、Pythonコードを使ってComfyUIのAPIを操作してみましょう。ここでは、先ほど準備したworkflow_api.jsonを読み込み、CLIPTextEncodeノードのテキストとKSamplerノードのシードを変更して画像生成を実行する例を紹介します。
import json
from urllib import request
import random
import os
from typing import Dict, Any, Optional

class ComfyUIPromptGenerator:
    """ComfyUIのプロンプトを生成し、サーバーにキューイングするクラス"""

    def __init__(self, server_address: str = "127.0.0.1:8188", workflow_path: Optional[str] = None):
        """
        コンストラクタ: クラスの初期化を行います
        
        :param server_address: ComfyUIサーバーのアドレス（デフォルトは localhost の 8188 ポート）
        :param workflow_path: ワークフローJSONファイルへのパス（デフォルトはNone）
        """
        # ComfyUI サーバーのアドレスを保存
        self.server_address = server_address
        
        # workflow_path が指定されていない場合、デフォルトのパスを使用
        if workflow_path is None:
            self.workflow_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'workflow_api.json')
        else:
            self.workflow_path = workflow_path
        
        # ワークフローを読み込み、プロンプトとして保存
        self.prompt = self._load_workflow()

    def _load_workflow(self) -> Dict[str, Any]:
        """
        ワークフローJSONファイルを読み込むプライベートメソッド
        
        :return: 読み込まれたワークフローの辞書
        :raises FileNotFoundError: ワークフローファイルが見つからない場合
        :raises ValueError: JSONの解析に失敗した場合
        """
        try:
            # ファイルを開いて JSON として読み込む
            with open(self.workflow_path, 'r') as file:
                return json.load(file)
        except FileNotFoundError:
            # ファイルが見つからない場合はエラーを発生
            raise FileNotFoundError(f"Workflow file not found: {self.workflow_path}")
        except json.JSONDecodeError:
            # JSON の解析に失敗した場合はエラーを発生
            raise ValueError(f"Invalid JSON in workflow file: {self.workflow_path}")

    def set_clip_text(self, text: str, node_id: str = "283") -> None:
        """
        CLIPTextEncodeノードのテキストを設定するメソッド
        
        :param text: 設定するテキスト
        :param node_id: CLIPTextEncodeノードのID（デフォルト: "283"）
        """
        # 指定された node_id の inputs -> text にテキストを設定
        self.prompt[node_id]["inputs"]["text"] = text

    def set_random_seed(self, node_id: str = "271") -> None:
        """
        KSamplerノードのシードをランダムに設定するメソッド
        
        :param node_id: KSamplerノードのID（デフォルト: "271"）
        """
        # 1 から 1,000,000 までのランダムな整数を生成し、シードとして設定
        self.prompt[node_id]["inputs"]["seed"] = random.randint(1, 1_000_000)

    def queue_prompt(self) -> None:
        """
        プロンプトをComfyUIサーバーにキューイングするメソッド
        
        :raises ConnectionError: サーバーへの接続に失敗した場合
        """
        # プロンプトを JSON 形式にエンコード
        data = json.dumps({"prompt": self.prompt}).encode('utf-8')
        
        # サーバーへのリクエストを作成
        req = request.Request(f"http://{self.server_address}/prompt", data=data,  headers={'Content-Type': 'application/json'})
        try:
            # リクエストを送信
            request.urlopen(req)
        except Exception as e:
            # 接続に失敗した場合はエラーを発生
            raise ConnectionError(f"Failed to queue prompt: {str(e)}")

    def generate_and_queue(self, clip_text: str) -> None:
        """
        プロンプトを生成し、キューイングするメソッド
        
        :param clip_text: CLIPTextEncodeノードに設定するテキスト
        """
        # CLIPTextEncodeノードのテキストを設定
        self.set_clip_text(clip_text)
        # ランダムシードを設定
        self.set_random_seed()
        # プロンプトをキューイング
        self.queue_prompt()

# このスクリプトが直接実行された場合にのみ以下のコードを実行
if __name__ == "__main__":
    # デフォルトのワークフローパスを使用してComfyUIPromptGeneratorのインスタンスを作成
    default_generator = ComfyUIPromptGenerator()
    default_generator.generate_and_queue("3D low poly model")

    # カスタムワークフローパスを指定してComfyUIPromptGeneratorのインスタンスを作成
    custom_workflow_path = "workflow_api.json"
    custom_generator = ComfyUIPromptGenerator(workflow_path=custom_workflow_path)
    custom_generator.generate_and_queue("Photorealistic landscape")

 コードの解説


必要なライブラリのインポート:  json、urllib.request、random、osをインポートします。

ComfyUIPromptGeneratorクラスの定義:  ComfyUIとのやり取りを管理するためのクラスを定義します。


__init__メソッド:  サーバーアドレス、ワークフローファイルのパスなどを初期化します。

_load_workflowメソッド:  ワークフローファイルを読み込みます。

set_clip_textメソッド:  指定されたノードIDのCLIPTextEncodeノードのテキストを変更します。

set_random_seedメソッド:  指定されたノードIDのKSamplerノードのシードをランダムに変更します。

queue_promptメソッド:  変更したプロンプトをComfyUIサーバーに送信します。

generate_and_queueメソッド:  CLIPTextEncodeノードのテキストを変更し、ランダムシードを設定してプロンプトをキューイングします。



if __name__ == "__main__":ブロック:  スクリプトが直接実行された場合のみ実行されます。

デフォルトとカスタムのワークフローパスを使用してComfyUIPromptGeneratorのインスタンスを作成し、それぞれ画像生成を実行します。




 スクリプトの実行

 まとめ
この記事では、PythonでComfyUIのAPIを操作し、画像生成を自動化する方法を解説しました。
APIを活用することで、より高度な画像生成ワークフローを構築し、ComfyUIのポテンシャルを最大限に引き出すことができます。ぜひ、自分自身のプロジェクトに活用してみてください。
Discussion
