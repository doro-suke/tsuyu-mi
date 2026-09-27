# Opus 5.5 の並外れた 3D モデリング能力で理想の城を作る
- **Source URL**: https://zenn.dev/pnd/articles/claude-castles
- **Score**: 30
- **Suggested Tags**: #3Dモデリング, #LLMベンチマーク, #Blender
- **Processed Date**: 2026/9/27

---

## 本文
Opus 5.5 の結果
下の画像は、Opus 5.5 (effort: medium) がワンショットで作成した城の 3D モデルです。


以下の指示だけを与えており、既製のアセット等は全く利用していません。
Create a 3D model of historically authentic medieval castle.

- German/Bohemian style
- Concentric
- Asymmetric
- Built on top of steep hill
- Highly defensible. Use overhangings, machicolations, murder holes and others for proactive defense
- As realistic as possible, with details and textures

Use Blender.

 Fable 5.1 の結果
全く同じプロンプトを Fable 5.1 (effort: high) に与えた結果がこちらです。

全体的な質感や複雑さでも Opus 5.5 にかなり劣っていますが、それ以外にも、建物がめり込んでいる、門が石の壁で塞がっている、など構造的な欠陥が多く見受けられました。




 コスト比較
Opus 5.5 はレンダリング結果を念入りに自律検証して修正を繰り返したため、トークン消費量が多くなりました。
結果として Opus の方がクオリティが高くなりましたが、コストはむしろ Fable より安上がりになっています。




API 料金換算
キャッシュ読み込み
キャッシュ書き込み
出力




Opus 5.5
$9.62
14.5M
0.32M
0.21M


Fable 5.1
$12.35
3.81M
0.22M
0.14M




 リアルな城のモデリングは簡単ではない
現実の歴史上の城には色々な工夫が施されており、一つ一つの構造は単なるお飾りではなく意味があります。
例えば次の画像は、城壁を下からクローズアップして見たところですが、赤矢印が示す小さな隙間がたくさんあるのがわかるでしょうか。
これは machicolation と呼ばれ、城壁の真下に取り付く敵に対して矢を射ったり石を投げ落としたりするためのものです。

また Opus が設計した城では、内門が外門の反対方向にあります。攻撃者はその間の長い距離を矢に撃たれながら進むことになるため、防衛上とても堅い構造です。

こうした工夫を取り入れつつ、平坦ではない地形の上に複雑な非対称の城を設計するのは、かなりの推論能力や空間認識を必要とします。
Opus のセッションを観察すると、レンダリング前に壁同士の距離を数値で計算して狭すぎる箇所を直すなど、自己検証力の高さも伺えました。

 3D モデリングは最新 LLM のベンチマークに最適
LLM の非公式ベンチマークとして有名なのが、Simon Willison の「自転車に乗るペリカンの SVG を描かせる」テストです。単純ながら、モデル間の性能差が意外に大きく出ることでよく知られていました。
しかし最新のモデルはどれもそれなりのペリカンを描けるようになり、既にベンチマークとしては飽和してきています。
一方、複雑な 3D モデリングは最新の LLM でも明確にクオリティの差が出る上に、パッと見で良し悪しが分かりやすいため、ベンチマークとして適しています。
