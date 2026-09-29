# 夜な夜なBlender生活の始め方
- **Source URL**: https://zenn.dev/con_ns_pgm/articles/f9eed41e33f933
- **Score**: 15
- **Suggested Tags**: #Blender, #Three.js, #フロントエンド
- **Processed Date**: 2026/9/29

---

## 本文
はじめに
Blender。めっちゃ楽しいです。
仕事が終わって帰ってきてから、ほぼ朝の時間までBlenderにひたすら打ち込んで
休日の大半もBlenderに捧げるような生活をここ3週間くらい続けてきました。
ここまでの学びの整理と、Blender布教のために
この記事に概要をまとめたいと思います。

 Blenderの世界観
Blenderを始めるにあたって、まず第一にぶち当たる壁として
「3Dソフト特有の概念」があると思います。
他の、3Dソフトを触ったことがある人はすんなり扱えるかもしれませんが、
僕はなかったので、概念理解にちょっと苦戦しました。
Blenderの世界を構成する主な要素として

シーン
オブジェクト
ライト
カメラ

これらが挙げられます。
シーンとは、
一つのBlenderファイル内に格納されている要素全てを包含する3Dワールドのようなものです。

オブジェクトとは、
一次元から、3次元のものまで、色んな種類や形がある物体のことです。
これはちょっと種類が多いので、気になる方は調べてみてください。

ライトとは、
そのままです。「サン」「エリア」「スポット」「ポイント」の四種類で、それぞれ特徴があります。

カメラとは
これもそのままです。Blenderの中での視点は、
俯瞰した位置からシーンを捉える視点と
カメラ視点でシーンを捉える視点の2種類あります。
カメラ視点にも、透視投影、平行投影、パノラマ状といった種類があります。



 基本的な制作の流れ
制作目的や制作物によって、フローは変わるようですが、
超シンプルな流れは以下です。
モデリング→マテリアル設定やテクスチャの設定→ライト、カメラの設定→レンダリング→コンポジット

 モデリング
3Dオブジェクトを生成する過程です。
Blenderでは、元々用意されている「立方体」や「球」などのオブジェクトの
「頂点」「辺」「面」を操作することで、様々形状を作成することができます。
操作の主となるのは、「移動」「スケール」「回転」です。

 マテリアル設定やテクスチャの設定
モデリングで形を作ったら、次は質感の設定を行います。
「マテリアル」とは、物体の質感の設定情報のことです。色や、透明度、光の反射、凹凸など、様々な設定が可能です。
これは、オブジェクトの「面」単位で設定できます。
「テクスチャ」とは、素材画像や動画などのことで、それらをオブジェクトに貼り付けることで見た目を調整します。

 ライト、カメラの設定
この過程で、光の当て方、影の出し方を調整します。
そして、最終的な結果となる見え方を、カメラの位置や方向を調整することで決めます。

 レンダリング
出来上がったシーンを書き出す作業です。静止画や、動画(アニメーション)で書き出すことができます。
但し、ここで書き出されるのは「カメラ視点」のものです。
きちんとカメラの視点を操作して、調整していないの何もレンダリングされません。

 コンポジット
レンダリングされた画像や、動画などの見え方を調整したり、複数を合成して馴染ませたりする過程です。
フォトリアルな作品を作るときは特に、必要不可欠な大事な作業になります。

 Webとの連携
Blenderで作成したデータを、webに組み込む方法を説明します。

 データをgltfで書き出す
まずは、作ったデータをwebで読み込める形式でエクスポートします。
レンダリングするのではなく、ファイル>エクスポート>gltf　から書き出します。


 Threejsで読み込む
読み込むのに使うのは、「GLTFLoader」です。
公式ドキュメントを参照して、読み込むことができます。

具体的に、Blenderでモデリングしたオブジェクトは以下です。
(レンダリングした画像)

これには、アニメーションもBlender側で作成して、それも含めてgltfで書き出し、
読み込んで、できたのが以下の動画です。
参考にさせて頂いたサイト:https://styleport.co.jp/　🙇‍♂️🙇‍♂️
このコードが以下です。
(整理できてなくてすいません🙏)

script.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gsap } from "gsap"

let winH = innerHeight;
let winW = innerWidth;

//シーン
const scene = new THREE.Scene();

//カメラ
let camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 1, 1000);
scene.add(camera);
camera.position.set(0, 0, -20);
camera.lookAt(0, 0, 0);

//レンダラー
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setClearColor('white');
renderer.physicallyCorrectLights = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setSize(winW, winH);
document.body.appendChild(renderer.domElement);
renderer.domElement.classList.add('blender-canvas');

const canvas = document.querySelector('.blender-canvas');

//ライト
const aLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(aLight);

//テクスチャ読み込み
// ベイク画像の設定
const textureLoader = new THREE.TextureLoader()
const bakedTexture = textureLoader.load('../assets/images/obj-bake.jpg')
bakedTexture.flipY = false
// bakedTexture.encoding = THREE.sRGBEncoding

// マテリアル設定 ベイク画像をマテリアルとして適用
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })

//ローダー定義
const loader = new GLTFLoader();

//アニメーションミキサーをグローバルに定義
let mixer;

//3Dオブジェクトをグローバルに定義
let obj;

//クロックの定義
const clock = new THREE.Clock();

// Load a glTF resource
loader.load(
  // resource URL
  '../assets/obj/trace3.glb',
  // called when the resource is loaded
  function (gltf) {

    gltf.scene.traverse((child) =>
        {
            child.material = bakedMaterial
    })
    
    scene.add(gltf.scene);

    gltf.animations; // Array<THREE.AnimationClip>
    gltf.scene; // THREE.Group
    gltf.scenes; // Array<THREE.Group>
    gltf.cameras; // Array<THREE.Camera>
    gltf.asset; // Object

    //3dオブジェクト
    obj = gltf.scene.children[0];

    //クオータニオン
    let quaternion = obj.quaternion;
    const target = new THREE.Quaternion();
    let quo_X = quaternion._x;
    quo_X = 0;
    let quo_Y = quaternion._y;
    quo_Y = 0;
    let quo_Z = quaternion._z;
    //quo_Z = 0;
    let axis = new THREE.Vector3(quo_X,quo_Y,quo_Z).normalize();

    let degree =  0.5;
    let rad = Math.PI / 180 * degree;

    mixer = new THREE.AnimationMixer(gltf.scene);
    let animation = gltf.animations[0];
    let action = mixer.clipAction(animation);

    action.clampWhenFinished = true;

    //終了までの時間
    const duration = action._clip.duration;

    //現在の進捗時間
    let currentProgress = action.time;

    //ページ全体のスクロール量
    let scrollTotalNum = document.body.clientHeight - innerHeight;

    //現在のスクロール量を正規化した値
    let scrollNorm = scrollY / scrollTotalNum;

    //現在のrotationZの値
    let currentRotationZ = obj.rotation.z;

    //アニメーションを再生
    action.play();

    let progress;

    window.addEventListener('scroll', function () {
      currentProgress = action.time;
      scrollNorm = scrollY / scrollTotalNum

      currentRotationZ = obj.rotation.z;

      //アニメーションの進捗時間
      progress = scrollNorm * duration;

      //progressをduration範囲内にclampする
      if (progress < duration) {
        mixer.setTime(progress);
        obj.rotation.z = currentRotationZ;
      } else {
        //ちょうどdurationに到達すると最初に戻ってしまう
        progress = duration - 0.001;
        mixer.setTime(progress);
        obj.rotation.z = currentRotationZ;
      }
    })

    // アニメーションを再生するイベントを設定する
    renderer.setAnimationLoop(() => {
      target.setFromAxisAngle(axis,rad);
      quaternion.multiply(target);
      renderer.render(scene, camera);
  });
  },
  // called while loading is progressing
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
  },
  // called when loading has errors
  function (error) {
    console.log('An error happened');
  }
);

//カメラ操作
let mouseX, mouseY, normMouseX, normMouseY,adjustNum;
canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  adjustNum = 0.2

  normMouseX = ((e.clientX / winW) * 2 - 1) * adjustNum;
  normMouseY = ((e.clientY / winH) * 2 - 1) * adjustNum;

  
  gsap.to(camera.position, {
    x: normMouseX,
    y: normMouseY,
    z: -20,
    duration: 0.7
})
})


//カメラコントロール
// const controls = new OrbitControls(camera, renderer.domElement);

// GridHelper
const gridHelper = new THREE.GridHelper(200, 100);
// scene.add(gridHelper);

// AxesHelper
const axesHelper = new THREE.AxesHelper(180);
// scene.add(axesHelper);

// DirectionalLightHelper
const light = new THREE.DirectionalLight(0xffffff);
// const directionalLightHelper = new THREE.DirectionalLightHelper(light, 10);
// scene.add(directionalLightHelper);

//カメラヘルパー
// const helper = new THREE.CameraHelper( camera );
// scene.add( helper );

コードの中には、ヘルパーとかベイクとか、本筋とはあんまり関係ないことが書いてありますが
ご了承ください。
問題なのが
Blenderで作成したオブジェクトと、Threejsで読み込んだオブジェクトの見た目が
かなり違うことです。
このwebでの再現性を高める方法をいま模索中です。

 学習フロー
自分は、Youtubeのチュートリアル動画をひたすらやっています。
最初は概念を理解するのがとても難しかったので、
チュートリアルをやってみて、わからないことがあったら
都度調べて、の繰り返しです。
結局、ソフトに慣れることが最初の壁なので
手を動かすことを意識して、繰り返し何かを作ってみることが近道なんじゃないかと信じて
今も取り組んでいます。
以下におすすめ、参考サイトを掲載します。

CGbox
Vook
リファレンス

※様々なライブラリ同様に、Blenderもバージョンによって結構操作方法が変わったりしているので
情報を見るときは、バージョンに気をつけて確認した方がいいと思います。

 終わりに
全体的にとてもざっくりとした内容になりましたが、
概要理解の一助になれましたら幸いです。
現状の課題として、web上での描画の再現性が低いことがあるので、そこも含めて
また別の記事で詳しくまとめるか、この記事の内容を充実させて行きたいと思います。
