# 初めてで、BlenderをClaude Codeで操り、3Dモデルを作った ─ bpyスクリプトからMCPまで
- **Source URL**: https://zenn.dev/personal/articles/ad6d29913e1d79
- **Score**: 78
- **Suggested Tags**: #ClaudeCode, #MCP, #Blender
- **Processed Date**: 2026/9/27

---

## 本文
はじめに
今日、AIでBlender使う勉強会参加しました。
始まるちょっと前から、Blender をたぶん触ったことがない状態から、AI(Claude Code)に Python コードを書いてもらって 3D モデルを作るところまで試してみました。
やったことは 2 段階です。


bpy スクリプト方式:AI が Blender 用の Python スクリプトを書き、それを Blender で実行して「ロボットの学習机」を作る

MCP 方式:AI が起動中の Blender を直接操作して、「バスケットボール」「女の子」「猫」を会話しながら作る

最終的にできたのがこちらです。すべて球・円柱・円錐などの基本図形の組み合わせで、手作業のモデリングはしていません。


 Blender って何?(超ざっくり)
Blender は無料・オープンソースの 3DCG ソフトです。形を作る(モデリング)、色や質感を付ける、光を当てて画像にする(レンダリング)、アニメーションなど、3D に必要なことがひと通りできます。

最初に覚えておくと楽な言葉はこれくらいです。



言葉
ざっくり言うと




3D ビューポート
画面中央の大きな領域。ここで 3D 空間を見る・動かす


オブジェクト
空間に置かれた 1 つ 1 つの物(球、箱、カメラ、ライトなど)


アウトライナー
右上のリスト。シーンにあるオブジェクトの一覧


マテリアル
物の色や質感の設定


レンダリング
カメラから見たシーンを 1 枚の画像にすること


bpy
Blender を Python から操作するためのライブラリ(Python API)



ポイントは最後の bpy です。Blender は画面でマウス操作する以外に、Python のコードでもほぼすべての操作ができます。たとえば次の 3 行で箱が 1 つできます。
import bpy
bpy.ops.mesh.primitive_cube_add(size=1)
bpy.context.object.name = "Desk_top"
AI は文章でコードを書くのが得意なので、「AI に bpy のコードを書いてもらう」のが今回の作戦です。

 環境と全体の構成



項目
内容




PC
Windows / Core i5-1235U / RAM 16GB / Intel Iris Xe(内蔵 GPU)


Blender
5.2.2 LTS(Windows に直接インストール)


AI
Claude Code(VS Code の Dev Container = Docker 内の Ubuntu で実行)


共有
Windows の作業フォルダをコンテナにマウントして両方から読み書き



Blender は画面や GPU を使うので Windows 側、Claude Code はコンテナ側という分担です。今回試した 2 つの方式は、つなぎ方が違います。
方式1:bpy スクリプト(ファイルでつなぐ)
方式2:MCP(起動中の Blender に直接つなぐ)
どちらの方式でも、最終的に形を作っているのは bpy です。違うのは「コードをどうやって Blender に届けるか」だけです。

 Blender のインストール

Windows 版をダウンロードします(今回は 5.2 LTS。LTS は長期サポート版で安定しています)
インストーラーを実行し、デフォルトのままインストール
起動して、最初からある立方体をマウスで回転・移動して保存できたので OK

今回の構成では、コマンドラインからも使うので blender.exe の場所を覚えておきます。

 方式1:bpy スクリプトで「ロボットの学習机」を作る

 流れ

Claude Code に「ロボットが勉強している机を作って」と頼む
Claude Code が create_model.py(bpy スクリプト、約 390 行)を書く
Windows 側で PowerShell スクリプトを実行し、Blender を画面なしのバックグラウンドで動かす

output/ に .blend(Blender のデータ)と確認用 PNG が出力される
画像を見て「ランプを左に」「目を大きく」などと直してもらう → 3 に戻る

実行用の PowerShell はこれだけです。--background で画面を出さずに実行し、--python でスクリプトを渡します。
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
    --background --python-exit-code 1 --python create_model.py

 スクリプトの中身(抜粋)
箱や円柱を作る小さな関数を用意して、それを組み合わせて部品を作っています。
def box(name, size, loc, mat, coll, rot=(0, 0, 0), bevel=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(obj, name, mat, coll, bevel)

def cylinder_between(name, p1, p2, radius, mat, coll):
    """点 p1 から点 p2 までの円柱 (腕や脚に使う)。"""
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    rot = d.to_track_quat("Z", "Y").to_euler()
    return cylinder(name, radius, d.length, (p1 + p2) / 2, mat, coll, rot=rot, verts=16)
寸法や色はファイル冒頭に定数でまとめてあるので、DESK_W = 1.20 を変えれば机の幅が変わる、という具合に後から調整しやすくなっています。

 できあがり
同じデータを 3 方向から描画したものです。立体として作られていることがわかります。




正面から
横から











 方式2:MCP で Blender を直接操作する

 MCP とは
MCP(Model Context Protocol)は、AI アシスタントが外部のツールを使うための共通の仕組みです。Blender 用の MCP を入れると、Claude Code から「起動中の Blender」に対して

シーンに何があるか調べる
Python コードを実行する
画面のスクリーンショットを撮る

といった操作ができるようになります。スクリプトを保存して実行し直す必要がなく、会話しながらその場で形が変わるのが大きな違いです。

 必要なもの(2 つで 1 セット)



部品
置き場所
役割




MCP アドオン
Blender の中(Windows)
ポート 9876 で待ち受け、届いたコードを bpy で実行


MCP サーバー
Claude Code 側(コンテナ)
Claude Code と stdio で話し、アドオンに TCP で中継



今回は Blender 公式の実験プロジェクト Blender Lab の MCP(blender.org/lab/mcp-server)を使いました。

 1. Blender にアドオンを入れる
** アドオンがネットワーク(ローカルのソケット)を使うため、Preferences の Allow Online Access を有効にしておく
有効になると、Blender がポート 9876 で待ち受けます。

 2. Claude Code に MCP サーバーを登録する
Claude Code はコンテナ内なので、Windows 側の Blender へは host.docker.internal で接続します。サーバー本体は uvx が自動でダウンロードして起動してくれます。
claude mcp add blender -s local \
  -e BLENDER_MCP_HOST=host.docker.internal \
  -e BLENDER_MCP_PORT=9876 \
  -- uvx --from "git+https://projects.blender.org/lab/blender_mcp.git@v1.0.3#subdirectory=mcp" blender-mcp
登録したら Claude Code で /mcp を実行して、blender が接続済みになれば準備完了です。


 3. 話しかけて作る
あとは普通に日本語でお願いするだけです。実際に送ったのはこの 3 つです。

「バスケットボールを MCP 経由で作って」
「では MCP で可愛い女の子作って」
「隣に可愛い猫ちゃん作って」

Claude Code は裏で次のような MCP ツールを使っていました。



ツール
やっていること




get_objects_summary
シーンに何がどこにあるかを確認(置き場所を決めるため)


execute_blender_code
bpy のコードを Blender 内で実行して形を作る


jump_to_view3d_object_by_name
作ったものに視点を合わせる


get_screenshot_of_area_as_image
3D ビューを撮影して、AI 自身が出来栄えを確認



特に良かったのは、AI が自分でスクリーンショットを撮って確認するところです。バスケットボールを作ったとき、最初から置いてある立方体にボールが半分埋まっていることに AI が画像で気づき、「立方体を消す・隠す・ボールを動かす」のどれにするか聞いてくれました(今回は「隠す」を選択)。

 できあがり

バスケットボールは、オレンジの球に黒い輪(トーラス)を 4 本重ねて継ぎ目を表現しています。

女の子は 23 個、猫は 31 個の部品でできているとのこと。目は顔の表面に沿うように向きを計算して貼り付け、猫のしっぽはベジェ曲線に太さを付けて作っているとのこと。

 3D であることを確かめる(4 方向から)
1 枚の絵ではなく立体として作られているので、カメラを動かせば裏側も見えます。

後ろから見ると女の子の後ろ髪や猫のしっぽ、真上から見ると 3 つの配置がわかります。ちなみにボールは半径 1m(直径 2m)で作ったので、女の子と同じくらいの巨大ボールになっています。大きさを指定しなかったせいで、こうなりました。

 bpy 方式と MCP 方式の比較




bpy スクリプト
MCP




作り方
スクリプトを書いて実行
会話しながらその場で操作


結果の確認
実行後に出力画像を見る
AI がスクリーンショットで確認


再現性
◎ スクリプトが残る
△ 会話の中のコードは残りにくい


試行錯誤
△ 毎回実行し直し
◎ 1 か所ずつすぐ直せる


準備
Blender だけ
アドオン + MCP サーバー


向いていること
寸法を決めて作り込む
アイデア出し・ちょっとした修正



「MCP でざっと作って、気に入ったら bpy スクリプトとして保存する」という組み合わせが良さそうだと感じました。

 まとめ

Blender は Python(bpy)でほぼ全部操作できるので、AI にコードを書いてもらう方法と相性が良い

bpy スクリプト方式は Blender さえあればすぐ始められ、何度でも作り直せる

MCP 方式は会話しながら Blender をその場で動かせる。AI が自分で画面を見て確認してくれるのが便利
MCP は アドオンとサーバーを同じプロジェクトでそろえること。ここでつまずいた

Blender の操作をほとんど覚えないまま、ロボットや女の子・猫が作れたのは今のAI凄いな思いました。昔、Unityでは自作ゲームつくってたこともあるので、unity向けのアセット作っても面白そう！
後日談:どうやらUnityの世界からBlenderを呼んで、自ら拡張していくようなこともできるみたい。新世界誕生か！勉強会での発表してた！僕の理解ではあるが、質問、確認しそこねたけど、やってみたい。

 あとがき
記事よかったら、いいね♡　押してね！フォローも嬉しい！
