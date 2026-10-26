# 【Stable Diffusion WebUI】Pythonから直接実行するには？[webuiapi] - AI教科書.net
- **Source URL**: https://www.kyoukasho.net/entry/webuiapi
- **Score**: 50
- **Suggested Tags**: #StableDiffusion, #Python, #画像生成AI
- **Processed Date**: 2026/10/26

---

## 本文
Stable Diffusion WebUIの本体の描画機能をPythonからコールして実行する方法です。

    Stable Diffusion WebUI、Pythonから実行するには？
            利用モデルは？
            ConnectionRefusedError: [WinError 10061] 対象のコンピューターによって拒否されたため、接続できませんでした。？
        
    

Stable Diffusion WebUI、Pythonから実行するには？
Stable Diffusion WebUIは便利ですが、プロンプトを変えて出力を自動化したい場合はPythonからそれを直接コールできた方が楽です。

webuiapiというライブラリを使うと、Pythonコードも楽です。

GitHub - mix1009/sdwebuiapi: Python API client for AUTOMATIC1111/stable-diffusion-webui

(1)
まずはインストール。

pip install webuiapi


(2)
次にWebUIの起動バッチを修正。
APIが利用できるように引数に--apiを付けます。


(3)
ではWebUIを起動します。

(4)
WebUIのあるフォルダにpythonファイルを作成。
以下はプロンプトの内容で「test.png」を作成するというものです。

import webuiapiapi = webuiapi.WebUIApi()PROMPT="1girl, simple white background"result1 = api.txt2img(prompt=PROMPT)result1.image.save("test.png")


(5)
つくったPYファイルを実行。
問題なければWebUIの実行プロンプトの方で画像生成のバーが出現。


終わると「test.png」も作成されていました。


利用モデルは？
現在WebUIで使用しているモデルがそのまま反映されます。
たぶん指定可能。

ConnectionRefusedError: [WinError 10061] 対象のコンピューターによって拒否されたため、接続できませんでした。？
最初はPYファイルを実行すると接続できないエラーがでました。

これはどうやらPYファイルが
Stable Diffusion WebUIの実行オブジェクトに接続できなかったというもののようです。

何度かやっているうちに直ったのでどれが効果あるかわかりませんが、
・先にWebUIを起動しておく
・PYのほうのプロンプトを管理者権限で実行しておく
など試してみましょう。

下記記事ではControlNetの利用にも対応しています。
参考：
もうすぐ実写AITuber登場。Stable Diffusionでリアルタイム画像生成をしてみた | さくらのナレッジ
SOOS • webuiapi • Python • Package
