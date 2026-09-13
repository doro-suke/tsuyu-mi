# ComfyUIで動画生成AIのWan2.2をGGUFで動かす - きしだのHatena
- **Source URL**: https://nowokay.hatenablog.com/entry/2026/01/02/145417
- **Score**: 45
- **Suggested Tags**: #ComfyUI, #動画生成AI, #ローカルLLM
- **Processed Date**: 2026/9/13

---

## 本文
動画生成のWanというのがいいというのは知ってたけど導入がめんどくさそうで試してなかったのを年末にGGUFで試してたのでまとめ。




生成結果

ということで、まずは14BのQ4_K_Mで試した動画を先に。

Wan 2.2で「the man drinking beer」を指定して3分くらいでこれ。ビールが減ってないけど。


1年半前のOpen Soraだと2時間半待ったものがこれ。ハードウェアが同じなのにすごい。


Open Soraを使っておうちのWindowsで動画生成する - きしだのHatena

Google ColabのA100を使ってOpen Solaで2分で「japanese maiko is dancing」で生成したのがこれ。


それがWan 2.2ならおうちのRTX 4060 Ti 16GBで2分でこれです。


FramePackも5秒動画を30分で作ってくれてました。
少ないVRAMで長い動画を生成できるFramePackを試す - きしだのHatena

つまりFramePackはこの動画を1時間半で。


それが、Wan 2.2は6分でこれ。


FramePackはもともと破綻しにくかったけど、生成時間が短くなりました。




インストール

ComfyUIのインストールはこちら
https://comfyui-wiki.com/ja/install/install-comfyui

インストールのあと、GGUF用のノード「ComfyUI-GGUF」をインストールしておく必要があります。

右上の「Manager」を押す。


ComfyUI Managerの「Custom Nodes Manager」を押す。


GGUFで検索して出てくる「ComfyUI-GGUF」をインストールします。(ここではすでにインストール済み)


「Restart Required」になります。


左下の「Restart」ボタンで再起動。




Wan2.2ではテキストプロンプトのみから動画生成のT2V(Text to Video)と、画像+テキストから動画生成のI2V(Image to Video)があります。

T2V
https://huggingface.co/bullerwins/Wan2.2-T2V-A14B-GGUF/tree/main

I2V
https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/tree/main

さらにそれぞれ量子化が違うものがhigh_noiseとlow_noiseあります。


VRAM容量にあわせた量子化を選んで、high_noiseとlow_noiseの両方をダウンロードします。
ダウンロードしたggufはComfyUI/models/unetに保存します。

たぶん同じ量子化である必要はないけど変える必要もあまりなさそう。
言語モデルと違って、画像動画モデルでは生成が進むにしたがって重みデータを読み込むということができるので、VRAMに入りきる必要はないです。ただし、メインメモリには載る必要があります。

ワークフローの読み込み

テンプレートでWan2.2で絞り込むといろいろテンプレートが出てきます。ここで「Wan 2.2 14Bテキストからビデオ」と「Wan 2.2 14B画像からビデオ」の好きなほうを選びます。
※ 「画像から動画へ(新)」はGGUFが使えないので見なかったことにします。


必要なモデルが表示されるので、diffusion_models以外をダウンロードします。diffusion_modelsは代わりにGGUFを使います。


そして左上に書かれているように配置。


こんな感じのワークフローが読み込まれますが、下半分は不要なので消して大丈夫。diffusion_modelsの読み込みが表示され続けるので、「拡散モデルの読み込み」だけでも消しておくのがいいです。


GGUFの設定

左上のほうにある「拡散モデルを読み込む」を選んでゴミ箱アイコンを押して削除します。High NoiseとLow Noiseがあるので両方削除します。


右クリックして「ノードを追加 > bootleg > Unet Loader(GGUF)」を選んでGGUFノードを追加します。


モデルのところで適切なGGUFを選びます。


そしたら、GGUFのノードの「モデル」からLoRAローダーの「モデル」を結びます。High noise側もLow noise側もそれぞれ結び付けます。  


試してみる

Step2のところで画像を選んで、Step 3のところでサイズと長さ、Step 4にポジティブプロンプトとネガティブプロンプトを指定します。


FPSに16fpsが指定されてるので、81なら5秒ですね。ネガティブプロンプトは常識的なものが入ってるのでそのまま。気になるなら翻訳して不要そうなものを消したりしてください。

「実行する」ボタンで生成開始。


コンソールに進行具合が出ます。High Noiseが走って、Low Noise、そのあとVAEが走るというふうになってます。


そして右下に完成動画。


なんか動きました。


まとめ

Open Soraがでて1年半でここまで至るのはすごいですね。
ただ、この後オープンモデルが進化するかというと、Wan 2.5、2.6はクローズドになってるようだし、どんどん非公開になりそうな気配。
