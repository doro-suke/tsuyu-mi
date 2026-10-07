# 白黒動画をカラー動画へ ~AIモデル DeOldify~ - Qiita
- **Source URL**: https://qiita.com/GL-Kageyama/items/34a0602d1a1d210e525a
- **Score**: 20
- **Suggested Tags**: #DeOldify, #画像処理, #動画生成
- **Processed Date**: 2026/9/3

---

## 本文
最近は、静止画の白黒画像ならば、フリーでカラー化してくれるサービスが一般的になって来ています。
しかし、動画の場合は、そうは行きません。動画の場合は、パラパラ漫画みたいに、画面ごとに白黒画像をカラー化していくわけですが、カラー化する枚数が多すぎて無償のサービスにするわけには、なかなか行きません。
AIモデル自体は、無償で公開されている場合が多いですが、環境構築に手間がかかるため、自分で環境を作成する方法も一般的ではありません。
ですが、亜細亜新聞CHさんの記事を見て実行してみた所、Web上の実行環境では、驚くほどスムーズに実行出来ました😲
https://note.com/asianews_ch/n/n39a2ab6f0bc9
その際に使用していたAIモデルは、DeOldifyというものです。
https://github.com/jantic/DeOldify

そこで、この実行コードを、私の持っているGPU搭載のLinuxマシンで実行してみました。
やはり、GPU搭載のローカル環境の方が、遥かに処理速度が速いです❗️
少し手こずりましたが、白黒動画のカラー化をローカル環境にて、実行することが出来ました。
こちらが、私がローカル環境で実行したコードです。
https://github.com/GL-Kageyama/DeOldify_ExecutionEnvironment
マリリン・モンローが歌っている動画のカラー化が一番上手く行ったので、貼っておきますね😉
https://www.youtube.com/watch?v=0ASyKfArVU0

こちらが、元にした白黒動画です。
https://www.youtube.com/watch?v=5eDHlgnRuaM
AIの進歩は、日進月歩なので、これよりも優れたAIも登場してくることでしょう。
今から楽しみです😄
