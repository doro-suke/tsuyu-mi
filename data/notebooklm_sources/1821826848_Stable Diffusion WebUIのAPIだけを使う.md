# Stable Diffusion WebUIのAPIだけを使う
- **Source URL**: https://zenn.dev/myonie/articles/84952069d8d1ef
- **Score**: 68
- **Suggested Tags**: #StableDiffusion, #画像生成AI, #Python
- **Processed Date**: 2026/8/21

---

## 本文
背景
オープンソースの画像生成AIとして大成功を収めているStable Diffusion。利用するには、Stability AI社が提供する公式ウェブアプリDreamStudioもありますが、AUTOMATIC1111氏が開発したWebUIが大きな広がりを見せています。

 やりたいこと
さて、WebUIは様々なプラグインも用意されており、叡智の集結の様相を呈している一方で、さすがにごちゃごちゃしており、やりたい画像加工がワンパターン化してくると、それ独自のアプリを作りたくなります。親切なことに、WebUIはAPI onlyモードで起動することができます。ただ、APIのドキュメントは整備されていないようなので、手探りで触ってみる必要があります。その調査をまとめます。一部となりますが主要なAPIについてはカバーしています。

 API起動方法
WebUIのGitレポジトリ https://github.com/AUTOMATIC1111/stable-diffusion-webui をCloneしてできるフォルダ stable-diffusion-webuiにて、
python run.py --ui-config-file ui-config.json --ui-settings-file config.json\
--no-download-sd-model --skip-version-check --xformers\
--nowebui --listen
最後のオプション2つが重要です。それ以外は私個人のオプションなので、必ずしも真似しなくて大丈夫です。


--nowebuiによってAPI onlyモードでの起動となります。デフォルトでポートは7681で起動されます。

--listenは外部にAPIを公開したい場合に必要です。このオプションをつけないとlocalhost内からのリクエストにしか応えられません。

APIサーバはFastAPIで実装されているようなので、ブラウザで http://localhost:7861/docs を開くことでドキュメント兼playground環境にアクセスできます。そこで自分の使いたいAPIを探してみると良いでしょう。


 各種API
以下、Pythonでの利用例を示します。HTTP通信モジュールとしてはurllibを使います。PythonでHTTP通信と言えばrequestsが人気ですが、敢えて使わない理由は、後々AWSのLambdaから呼び出すことを想定しており、Lambdaでは標準でurllibしかインストールされていないからです。
まずは準備です。
import base64
import json
from urllib import request
from PIL import Image, ImageOps
from io import BytesIO

base_url = "http://localhost:7861"

 設定取得
疎通確認も兼ねて、設定一覧を取得してみましょう。
url = base_url  + "/sdapi/v1/options"
req = request.Request(url)
with request.urlopen(req) as res:
    body = json.loads(res.read())

print(body)

出力
{'samples_save': True, 'samples_format': 'png', ...(以下略)


 img2img (Inpaint)
img2imgの機能の一つである、画像の一部を加工するInpaintを使ってみましょう。

 画像準備
image = Image.open("test-image.jpg")
mask = Image.open("test-mask.png")

SHORTEST_TARGET = 512

def resize(image):
    width, height = image.size
    if width < height:
        new_width = SHORTEST_TARGET
        new_height = int(new_width / width * height)
    else:
        new_height = SHORTEST_TARGET
        new_width = int(new_height / height * width)

    return image.resize((new_width, new_height))

image = resize(image)
mask = resize(mask)
Stable Diffusionは(ver 1.0系では)、学習画像のサイズが512x512なので、少なくとも一辺は512にすることが好ましいため、そのようにスケーリングしています。
テスト画像はこんな感じです。

マスク画像です。このように黒地に白の2値画像として用意しましょう。白い部分がAIによって変わる部分です。


 リクエストBody
画像はbase64でエンコードした文字列としてリクエストbodyの中に入れ込んで送ります。その準備をしましょう。
buffered = BytesIO()
image.save(buffered, format="PNG")
img_str = base64.b64encode(buffered.getvalue()).decode()

buffered = BytesIO()
mask.save(buffered, format="PNG")
mask_str = base64.b64encode(buffered.getvalue()).decode()
上記画像文字列の他、各種パラメータをまとめたdictを用意します。WebUIを使い慣れていれば、各パラメータの意味はなんとなくわかると思いますが、後で一部解説はします。
こちらも参考に。 https://github.com/AUTOMATIC1111/stable-diffusion-webui/discussions/9739
ちなみに、生成に使うモデル(checkpoint)はここでは指定できません。全体設定を行うAPIを使いましょう (本記事では説明割愛)
data = {
  "init_images": [img_str], # 入力画像
  "resize_mode": 0,
  "denoising_strength": 0.75,
  "image_cfg_scale": 0,
  "mask": mask_str, # マスク画像
  "mask_blur": 4,
  "inpainting_fill": 1, # ※1
  "inpaint_full_res": False,
  "inpaint_full_res_padding": 0,
  "inpainting_mask_invert": 0,
  "initial_noise_multiplier": 0,
  "prompt": "beautiful pink flower",
  "negative_prompt": "",
  "styles": [
  ],
  "seed": -1,
  "subseed": -1,
  "subseed_strength": 0,
  "seed_resize_from_h": -1,
  "seed_resize_from_w": -1,
  "sampler_name": "Euler", # ※2
  "batch_size": 1,
  "n_iter": 1,
  "steps": 50, # ※3
  "cfg_scale": 7,
  "width": image.width,
  "height": image.height,
  "restore_faces": False,
  "tiling": False,
  "do_not_save_samples": False,
  "do_not_save_grid": False,
  "eta": 0,
  "s_min_uncond": 0,
  "s_churn": 0,
  "s_tmax": 0,
  "s_tmin": 0,
  "s_noise": 1,
  "override_settings": {},
  "override_settings_restore_afterwards": True,
  "script_args": [],
  "sampler_index": "Euler", # ※2
  "include_init_images": False,
  "script_name": "",
  "send_images": True,
  "save_images": False,
  "alwayson_scripts": {} # 後で使います
}

※1: Inpaintでは結構重要なパラメータで、元画像をどのくらい変えるかを仕切ります。ここを参考に0~3のどれかを指定しましょう。 https://onceuponanalgorithm.org/guide-stable-diffusion-inpaint-masked-content-options-explained/

※2: サンプラーの設定です。2箇所あるのがよくわかりませんが同じものを指定しておけば大丈夫と思います。
※3: stepsです。自分の環境では、なぜかここで指定した回数より幾分か少ない回数しかステップが動いていないように見えますが、よくわかりません。


 加工リクエスト
url = base_url  + "/sdapi/v1/img2img"
headers = {
    "Content-Type": "application/json"
}

with request.urlopen(request.Request(url, json.dumps(data).encode(), headers)) as res:
    body = json.loads(res.read())

out_image = Image.open(BytesIO(base64.b64decode(body["images"][0])))
out_image.save("out-image.png")

マスクやプロンプトがいい加減なので、あまりキレイな作品ではないですが、動作は確認できました。

 img2img + Controlnet
最後に、Controlnetで構図も指定してみましょう。Controlnetはプラグインなので、拡張フィールド的なところにリクエストを埋め込むことになります。順を追って説明します。
まず、Controlnetのパラメータを表すdictを作りましょう
cn_unit = {
    "input_image": img_str, # ※1
    "module": "canny",
    "model": "control_canny-fp16 [e3fe7712]",
    "weight": 1.0,
    "mask": "", # ※2
    "resize_mode": "Scale to Fit (Inner Fit)",
    "lowvram": False,
    "processor_res": SHORTEST_TARGET,
    "threshold_a": 0.0,
    "threshold_b": 255.0,
    "guidance": 1.0,
    "guidance_start": 0.0,
    "guidance_end": 1.0,
    "guessmode": False,
    "control_mode": 0, # ※3
}

※1: Controlnetに食わせる画像。殆どの場合は元画像を入れておけばよいでしょう。
※2: 元画像に加えてなにかマスクを使うControlnetの場合はこちらが必要になります。
※3: WebUIにもありますが、Controlnetかプロンプトのどちらを重視するかのモードで0, 1, 2の三通りです。

Controlnetのパラメータをメインのパラメータの一部に入れます。alwayson_scriptsというフィールドに入れます。
cn_args = {
    "alwayson_scripts": {
        "ControlNet": {
            "args": [
                cn_unit,
                {"enabled":False},
                {"enabled":False},
                {"enabled":False},
            ]
        }
    }
}
data.update(cn_args)
argsのところが長さ4の配列になっています。これは、私の設定ではControlnetのユニットを4つ用意しているためです。第一要素にcn_unitを入れ、残りの３つは使わないよという意味で{"enabled":False}を入れています。
加工リクエストは同じで、出来上がり画像がこちらです。かなり分かりにくくて恐縮ですが、Controlnetがちゃんと効いていて、Controlnet無しと比べ、花の中心層が元画像の構成とよく一致しており、花弁のエッジもよく捉えた画像になっています。


 ControlnetのPreprocessについて
ControlnetはPreprocessorとセットで行われます。Cannyならエッジを検出する処理が自動で入りますが、検出されたエッジ画像そのままではなく、ちょっと手を入れたいこともあろうかと思います。しかし残念ながら融通が効く作りにはなっていないようで、Cotrolnet側のコードを少し書き換える必要がありそうです。そのあたりはまた別の記事にしようと思います。
