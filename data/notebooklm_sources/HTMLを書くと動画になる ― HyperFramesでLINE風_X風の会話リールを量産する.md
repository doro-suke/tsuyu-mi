# HTMLを書くと動画になる ― HyperFramesでLINE風/X風の会話リールを量産する
- **Source URL**: https://zenn.dev/my_agent_works/articles/hyperframes-sns-conversation-reels
- **Score**: 82
- **Suggested Tags**: #自動化パイプライン, #HyperFrames, #動画生成
- **Processed Date**: 2026/8/25

---

## 本文
なぜ動画編集ソフトではなくコードで作るのか
SNSの縦型ショート動画(リール)を継続運用しようとすると、編集ソフトでの手作業がボトルネックになります。特に「LINE風のトーク画面」「X(Twitter)風のスレッド」のようなUI再現系の演出は、動画編集ソフトで作ると素材づくりが大変で、テキスト差し替えのたびに作業が発生します。
そこで「HTMLを書けば動画になる」アプローチです。UIの再現はWebフロントの得意分野で、CSSなら実機同等の見た目を数十行で作れます。テキスト差し替え＝HTML編集なので、量産にも向きます。

 HyperFramesとは
HyperFramesはHeyGenが公開しているOSS(Apache 2.0)で、HTML+CSS+JSのコンポジションをフレーム単位でキャプチャしてMP4に書き出すツールです。Node 22+とFFmpegがあれば動き、アカウント登録も不要です。
npx hyperframes init myreel
npx hyperframes check myreel   # レイアウト/コントラスト/決定論の検査
npx hyperframes render myreel  # MP4書き出し
コンポジションの契約はシンプルで、ルート要素に寸法と長さを宣言し、時間管理された要素にclass="clip"を付けます。
<div id="root" data-composition-id="main"
     data-start="0" data-duration="30"
     data-width="1080" data-height="1920">
  <div class="clip scene" data-start="0" data-duration="19" data-track-index="0">
    <!-- LINE風トーク画面 -->
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true }); // pausedが必須(シーク駆動)
  tl.from("#m1", { opacity: 0, y: 26, scale: .9, duration: .44 }, 0.7);
  window.__timelines["main"] = tl;
</script>
ポイントは**決定論(deterministic)**であること。レンダラーは任意の時刻へシークしてキャプチャするため、Date.now()やMath.random()、無限ループは使えません。

 LINE風UIを再現するコツ
「本物っぽさ」は細部で決まります。実装して効果が大きかった順に:


端末ステータスバー(時刻・Wi-Fi・電池)を最上部に置く
吹き出しの左右非対称の角丸(相手側は左上だけ小さく)

既読・時刻を吹き出し脇に小さく
返信前にタイピングインジケータ(3点ドットのバウンス)を挟む
新着のたびにフィード全体をtranslateYで押し上げる(スクロール感)
最下部に入力バー(カメラ・テキスト欄・送信ボタン)

日本語フォントは@font-faceでlocal()を指定しないと検査に引っかかります。
@font-face { font-family: "Yu Gothic UI"; src: local("Yu Gothic UI"), local("游ゴシック"); }

 実運用で踏んだ罠3選
1. GSAPのrepeat: -1は使えない。 無限リピートはシーク駆動を壊すためcheckがエラーにします。総尺から逆算した有限回数にします(repeat: Math.floor(total/cycle) - 1)。
2. コントラスト検査は本物の色を許してくれない。 LINEの送信バブル緑(#06C755)に白文字はWCAG比3:1を割ります。#0a8f45程度まで暗くすると検査を通り、視聴側の体感はほぼ変わりません。
3. 音入れのalimiterはauto-levelを切る。 FFmpegでSFXを合成する際、alimiterはデフォルトで出力を持ち上げる(level=enabled)ため、-1dB狙いでも0dBに張り付きます。alimiter=limit=0.89:level=0のように明示的に無効化します。
# メッセージ着信音をビートマップ通りに焼き込む例
ffmpeg -i reel.mp4 -i pop.wav -filter_complex \
 "[1:a]adelay=2350[d1];[0:a][d1]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=0[a]" \
 -map 0:v -map "[a]" -c:v copy out.mp4
効果音自体もFFmpegのaevalsrcでサイン波から合成すれば権利フリーです。

 量産アーキテクチャ
1本完成させたHTMLはテンプレートになります。会話の中身(吹き出しのテキスト配列)だけ差し替えれば、check→renderの約90秒で新しい1本が出てきます。CIに載せればテーマリストからの全自動量産も可能です。
実例として、宅建試験の学習アプリ宅建BOOSTのSNS運用では、この構成でLINE風/X風/Instagram DM風の3プラットフォーム版を同一シナリオから生成しています(シナリオ共通・UIレイヤーだけ差し替え)。

 まとめ

HyperFramesは「HTML→MP4」を無料・ローカルで実現するOSS
UI再現系のショート動画はコードで作ると差し替え・量産が圧倒的に楽
決定論制約(repeat:-1禁止など)とWCAG検査を先に知っておくとハマらない
音はFFmpeg合成で権利フリーにできる(alimiterのauto-levelに注意)


筆者は宅建士試験の学習アプリ「宅建BOOST」を開発しています。開発知見を今後も投稿しますので、フォローいただけると励みになります。
X: https://x.com/takkenboost
