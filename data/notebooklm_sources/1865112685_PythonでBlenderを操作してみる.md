# PythonでBlenderを操作してみる
- **Source URL**: https://zenn.dev/hotcocoa/articles/5c5ab06c40862b
- **Score**: 15
- **Suggested Tags**: #Blender, #Python, #3DCG
- **Processed Date**: 2026/9/27

---

## 本文
法政大学 Advent Calendar 2021 12日目担当のほっとここあです。
学年問わず皆クオリティが高い記事ばかりで僕書いていいんかって気持ちしかないですが去年同様せっかくなので参加します。

 Blenderとは
皆さんはBlenderという3DCGソフトはご存じでしょうか。
高機能でありながら無料で使えるというチートソフトです。
基本的な使い方はyoutubeなどで解説動画が多くありますし、細かいショートカットなどは僕のブログにまとめたりしてるのでもしよかったら見て下さい。
実はBlender、pythonで簡単に操作できるように設計されています。
特に環境構築なども不要で、簡単な処理だったらサッと書けるようです。

 Blenderダウンロード+Pythonでいじる準備
まずは普通にBlenderをダウンロードします。

Blenderを開きます。
上に「Scripting」ワークスペースがあるのでクリックします。

以下のように表示されます。

「+ 新規」を押して新しいpythonファイルを作成します。

これでpythonで操作できる準備ができました。Blenderはデフォルトでpythonが入っているため事前にBlender以外をダウンロードする必要はないようです。

 早速いじってみる
試しに以下のコードをコピペしてください。
# Blender import
import bpy
import math
import bmesh

# すべてのオブジェクト削除
for item in bpy.data.meshes:
    bpy.data.meshes.remove(item)
for item in bpy.data.materials:
    bpy.data.materials.remove(item)

# Add cone object
bpy.ops.mesh.primitive_cone_add(location=(0,0,0),vertices=10,radius1=0.5,radius2=1,depth=3, rotation=(0, 0, 0))
# 編集モードに切り替え
bpy.ops.object.mode_set(mode='EDIT')
# 全てのメッシュを非選択状態にする
bpy.ops.mesh.select_all(action='DESELECT')
# 面モードに設定.
bpy.ops.mesh.select_mode(type="FACE")

# bmesh オブジェクトのインスタンス化
b_mesh = bmesh.from_edit_mesh(bpy.context.object.data)
# これを呼び出すと面の操作ができるようになる
b_mesh.faces.ensure_lookup_table()
# 7番目の面を選択
b_mesh.faces[7].select = True
# 押し出し
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":[ -1.0 , 0 , 0]} )
右上の実行ボタンを押します。

円柱のメッシュが生成されて、かつ面の一部が押し出されていることが分かります。

何をやったかというと
①既存のメッシュを削除(「A」→「X」)
②円柱メッシュの作成(「Shift」+「A」)
③編集モードに切り替え(「Tab」)
⑤面選択モードに切り替え(「3」)
⑥選択をすべて解除
⑦面を選択
⑧押し出し(「E」→「X」→「-1」)

を上のコードで行っています。
さらにZ軸方向に2倍大きくして、X軸周りに30°回転、Z軸方向に4m移動させる処理を追加します。
# Blender import
import bpy
import math
import bmesh

pi = 3.141592

# すべてのオブジェクト削除
for item in bpy.data.meshes:
    bpy.data.meshes.remove(item)
for item in bpy.data.materials:
    bpy.data.materials.remove(item)

# Add cone object
bpy.ops.mesh.primitive_cone_add(location=(0,0,0),vertices=10,radius1=0.5,radius2=1,depth=3, rotation=(0, 0, 0))
# 編集モードに切り替え
bpy.ops.object.mode_set(mode='EDIT')
# 全てのメッシュを非選択状態にする
bpy.ops.mesh.select_all(action='DESELECT')
# 面モードに設定.
bpy.ops.mesh.select_mode(type="FACE")

# bmesh オブジェクトのインスタンス化
b_mesh = bmesh.from_edit_mesh(bpy.context.object.data)
# これを呼び出すと面の操作ができるようになる
b_mesh.faces.ensure_lookup_table()
# 7番目の面を選択
b_mesh.faces[7].select = True
# 押し出し
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":[ -1.0 , 0 , 0]} )

########### 追加 ###########
# オブジェクトモードに切り替え
bpy.ops.object.mode_set(mode='OBJECT')
# 図形のスケール(Z方向に2倍)
bpy.ops.transform.resize(value=(1,1,2))
# 図形の回転(X軸周りに30°回転)
bpy.ops.transform.rotate(value=pi/6 ,orient_axis='X')
# 図形の移動(Z軸方向に4m移動)
bpy.ops.transform.translate(value=(0,0,4))
############################

できました。次は赤っぽい色を設定していきます。プリンシプルBSDFを設定します。
# Blender import
import bpy
import math
import bmesh

pi = 3.141592

# すべてのオブジェクト削除
for item in bpy.data.meshes:
    bpy.data.meshes.remove(item)
for item in bpy.data.materials:
    bpy.data.materials.remove(item)

# Add cone object
bpy.ops.mesh.primitive_cone_add(location=(0,0,0),vertices=10,radius1=0.5,radius2=1,depth=3, rotation=(0, 0, 0))
# 編集モードに切り替え
bpy.ops.object.mode_set(mode='EDIT')
# 全てのメッシュを非選択状態にする
bpy.ops.mesh.select_all(action='DESELECT')
# 面モードに設定.
bpy.ops.mesh.select_mode(type="FACE")

# bmesh オブジェクトのインスタンス化
b_mesh = bmesh.from_edit_mesh(bpy.context.object.data)
# これを呼び出すと面の操作ができるようになる
b_mesh.faces.ensure_lookup_table()
# 7番目の面を選択
b_mesh.faces[7].select = True
# 押し出し
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":[ -1.0 , 0 , 0]} )

# オブジェクトモードに切り替え
bpy.ops.object.mode_set(mode='OBJECT')
# 図形のスケール(Z方向に2倍)
bpy.ops.transform.resize(value=(1,1,2))
# 図形の回転(X軸周りに30°回転)
bpy.ops.transform.rotate(value=pi/6 ,orient_axis='X')
# 図形の移動(Z軸方向に4m移動)
bpy.ops.transform.translate(value=(0,0,4))

########### 追加 ###########
# RGBを決める
r = 0.7
g = 0.1
b = 0.3
color = (r,g,b,1)
# マテリアル（材質）新規作成
material = bpy.data.materials.new("hoge1")
# ノードを使用をTrueにする
material.use_nodes = True
# プリンシプルBSDFノードをbsdfに設定
bsdf = material.node_tree.nodes["Principled BSDF"]
# 色を設定
bsdf.inputs[0].default_value = color
# マテリアルのリストに追加
bpy.context.object.data.materials.append(material)
############################

色が付きました。ちなみにbsdf.inputsのインデックスは以下のように対応しているようです。

最後に粗さと伝播を調整してガラスっぽくしてみます。
# Blender import
import bpy
import math
import bmesh

pi = 3.141592

# すべてのオブジェクト削除
for item in bpy.data.meshes:
    bpy.data.meshes.remove(item)
for item in bpy.data.materials:
    bpy.data.materials.remove(item)

# Add cone object
bpy.ops.mesh.primitive_cone_add(location=(0,0,0),vertices=10,radius1=0.5,radius2=1,depth=3, rotation=(0, 0, 0))
# 編集モードに切り替え
bpy.ops.object.mode_set(mode='EDIT')
# 全てのメッシュを非選択状態にする
bpy.ops.mesh.select_all(action='DESELECT')
# 面モードに設定.
bpy.ops.mesh.select_mode(type="FACE")

# bmesh オブジェクトのインスタンス化
b_mesh = bmesh.from_edit_mesh(bpy.context.object.data)
# これを呼び出すと面の操作ができるようになる
b_mesh.faces.ensure_lookup_table()
# 7番目の面を選択
b_mesh.faces[7].select = True
# 押し出し
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":[ -1.0 , 0 , 0]} )

# オブジェクトモードに切り替え
bpy.ops.object.mode_set(mode='OBJECT')
# 図形のスケール(Z方向に2倍)
bpy.ops.transform.resize(value=(1,1,2))
# 図形の回転(X軸周りに30°回転)
bpy.ops.transform.rotate(value=pi/6 ,orient_axis='X')
# 図形の移動(Z軸方向に4m移動)
bpy.ops.transform.translate(value=(0,0,4))

# RGBを決める
r = 0.7
g = 0.1
b = 0.3
color = (r,g,b,1)
# マテリアル（材質）新規作成
material = bpy.data.materials.new("hoge1")
# ノードを使用をTrueにする
material.use_nodes = True
# プリンシプルBSDFノードをbsdfに設定
bsdf = material.node_tree.nodes["Principled BSDF"]
# 色を設定
bsdf.inputs[0].default_value = color
########### 追加 ###########
# 粗さの設定（表面がピカピカになる）
bsdf.inputs[7].default_value = 0
# 伝搬の設定
bsdf.inputs[15].default_value = 0
############################
# マテリアルのリストに追加
bpy.context.object.data.materials.append(material)

ガラスっぽくなりました。

 感想
ネタがなくてマジで大したこと書いてないです。
今回は本当に基本的な部分しか触りませんでしたが、思ったよりも複雑ではなかったと思う人が多いのではないでしょうか。
もっと色々なことができると思うので、色んなサイトの実装を眺めてみようと思います。皆さんもこれを機に挑戦してみるとよいのではないでしょうか。
見てくれてありがとうございました。もしよかったら僕のイラストポートフォリオサイトも見てくれると嬉しいです。

 参考資料
