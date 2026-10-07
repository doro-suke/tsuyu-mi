# Remotion×ショート動画量産——個人で月300本のYouTube動画を回す完全ワークフロー｜HIROKI
- **Source URL**: https://note.com/douga_hanbai/n/n8e43312dacb3
- **Score**: 85
- **Suggested Tags**: #Remotion, #動画自動生成, #自動化パイプライン
- **Processed Date**: 2026/8/24

---

## 本文
はじめに「ショート動画で稼ぎたい。でも編集が間に合わない」——この悩み、ここ二年でぼくの周りでも本当に増えました。YouTubeショート、TikTok、Instagram Reels、どのプラットフォームも「投稿頻度」が最重要KPIになっていて、週1本では絶対に伸びない。最低でも1日1本、できれば1日3本。月にすれば90本から100本がスタートラインで、本気で収益化を狙うなら月300本という数字すら現実的なラインに入ってきます。ところが、Premiere Proでカット編集して、字幕を打って、BGMを入れて、画像を差し替えて……というのを愚直にやっていると、1本に2時間はかかる。月300本だと600時間。物理的に無理。だからほとんどの個人クリエイターは「量を諦める」か「外注して赤字になる」か、どちらかの選択肢しか持っていない状況になります。この記事では、その状況を技術で解決する話をします。主役はぼくHIROKIと、相棒のプログラマーAOI。彼女が提案してくれたのは、ReactでできているプログラマブルなビデオエンジンRemotionと、JSONシナリオ駆動のワークフロー、音声AI（AivisSpeech）と画像AI（gpt-image-2）を組み合わせた「コードで動画を量産するパイプライン」でした。最初は「コードで動画？難しそう」と思いますよね。ぼくも完全に同じ感想でした。でも、実際にやってみるとAdobeのソフトを覚えるよりよっぽど楽だし、なにより「一度組んだら永遠に同じクオリティで自動量産できる」という、編集者には絶対真似できない強みが手に入る。この記事は2万字超えの長丁場ですが、コピペで動くコードと、実際にぼくが月300本回している運用ノウハウを全部公開します。Remotionに触れたことがない人でも、第1章から順番に読めば「自分でも組める」とイメージできるように構成しました。それでは、HIROKIとAOIの会話形式で、ショート動画量産の世界に飛び込んでいきましょう。第1章 なぜいま「コードで動画を作る」のかHIROKI「AOI、聞いてくれよ。ショート動画ってさ、毎日投稿しないと全然伸びないんだよ。それは分かってるんだけど、毎日編集してる時間なんてないって。本業もあるし、子どもの面倒もあるし」AOI「分かる。でもね、HIROKIが今ぶつかってる壁は、たぶん『編集ソフトを使い続ける限り絶対に超えられない壁』だと思う」HIROKI「どういうこと？」AOI「Premiere ProとかDaVinci Resolveって、結局GUIで一つ一つ操作するソフトでしょ。クリップを並べて、テキストを打って、トランジションを引っ張って。あれって便利だけど、再現性がゼロなんだよね。同じことを毎日繰り返す『量産』には向いてない」HIROKI「言われてみれば確かに。テンプレートを使っても、結局毎回テキストは打ち直すし、音声を差し替えるし……」AOI「そう。じゃあ発想を変えて、『動画を関数の出力として扱う』ってアプローチがあるんだけど、興味ある？」HIROKI「関数の出力？」AOI「うん。入力としてJSONを渡したら、その内容に応じてシーン構成・テキスト・音声・画像・BGMが組み上がって、最終的にmp4が出てくる。そういうパイプラインを組むってこと。1本目を作るときだけ大変だけど、2本目以降はJSONを差し替えるだけで動画ができる」HIROKI「えっ、それマジでできるの？」AOI「できる。React製のRemotionっていう動画エンジンがあるんだ。コンポーネントとして動画を書ける。Reactが書けるなら、テキストアニメーションもKen Burnsズームもクロスフェードトランジションも、全部TSXでさらっと表現できる」HIROKI「React書けないけど……」AOI「大丈夫。最初はテンプレを丸ごとコピペで動かして、徐々に触れる部分を増やしていけばいい。1週間あれば自分用テンプレが組める。問題は『コードを書くこと』じゃなくて、『動画を関数化するという発想に慣れること』だと思う」ここでひとつ大事な前提を整理しておきます。コードで動画を作る最大のメリットは、「変更が一瞬で全動画に反映される」ことです。たとえば、200本作った後に「やっぱりロゴの位置を10px下にずらしたい」と思ったとします。Premiereなら200本を開き直して手作業。Remotionなら、ロゴコンポーネントのstyleを1行書き換えて、レンダリングコマンドを叩くだけ。そして二つ目のメリットは、ストックとしての価値です。一度組んだテンプレートは、台本JSONを差し替える限り永遠に再利用できる。半年経って「あのテンプレ、もう一回回したいな」と思ったときも、何も思い出さずに同じクオリティの動画が出てくる。これは編集ソフトでは絶対に手に入らない資産です。HIROKI「分かった。でも、なんでみんなやらないの？こんなにメリットあるなら」AOI「単純に『プログラミング』っていう言葉に拒否反応が出るからだと思う。実際にはコードを書く時間より、シナリオを考える時間のほうがずっと長くなる。コードはむしろ『動画を考える時間』を増やしてくれるツールなんだけど、それが伝わってない」HIROKI「なるほど。じゃあ、ぼくはまず何から始めればいい？」AOI「Remotionをインストールして、Helloワールドを出すところから。次の章でやってみよう」第2章 Remotion 4系の環境構築とHello WorldAOI「まず、Node.jsの20以上を入れておいて。Remotion 4はNode.js 18以上が必須で、5系の機能を一部使うなら20推奨」HIROKI「Node入ってる。バージョンは20.11.0」AOI「OK。じゃあプロジェクトを作るよ。ターミナルでこれを実行して」bash
npx create-video@latest my-shorts
```AOI「途中でテンプレートを聞かれるから、『Hello World』を選んで。TypeScriptはYesでお願い」HIROKI「できた。`cd my-shorts && npm run dev`で起動するんだよね？」AOI「うん、ブラウザでhttp://localhost:3000が開いて、左にコンポジション一覧、中央にプレビュー、右にタイムラインが出る。これがRemotion Studio」ここで、Remotionの中核概念を整理します。Remotionではすべての動画をCompositionという単位で扱います。1つのCompositionは、`durationInFrames`（総フレーム数）、`fps`、`width`、`height`を持つ単独の動画。コードで書くと次のようになります。tsx
// src/Root.tsx
import { Composition } from 'remotion';
import { MyShort } from './MyShort';export const RemotionRoot: React.FC = () => {  return (    <Composition      id="MyShort"      component={MyShort}      durationInFrames={900} // 30秒（30fps × 30）      fps={30}      width={1080}      height={1920}    />  );};```HIROKI「これだけ？解像度1080×1920って、もうショート動画のサイズになってる！」AOI「そう。プレビューで縦画面が立ち上がるはず。次に中身の`MyShort.tsx`を書こう」tsx
// src/MyShort.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';export const MyShort: React.FC = () => {  const frame = useCurrentFrame();  const opacity = interpolate(frame, [0, 30], [0, 1], {    extrapolateRight: 'clamp',  });  return (    <AbsoluteFill style={{ backgroundColor: '#0e1117', justifyContent: 'center', alignItems: 'center' }}>      <h1 style={{ color: 'white', fontSize: 96, opacity }}>こんにちは、ショート動画</h1>    </AbsoluteFill>  );};```AOI「`useCurrentFrame`が今のフレーム番号を返してくれる。`interpolate`はフレームに応じて値を補間する関数。30fpsなら、frame=0で透明、frame=30で完全表示になる、つまり1秒かけてフェードインするテキストになる」HIROKI「これがアニメーションの基礎？」AOI「そう。Remotionのアニメーションは全部この組み合わせ。`spring()`を使えばバネ的な動きも作れるし、`Sequence`で時間軸をずらせる。すごくシンプルだけど、これだけでショート動画の演出はほぼカバーできる」HIROKI「フォントサイズは96pxか。1080×1920の縦動画だとそれくらいないと読めないんだよね？」AOI「うん。ぼくが運用してるルールは、フックや大タイトルは64〜96px、中見出し50〜72px、本文44〜56px、最小30pxっていう感じ。100pxを超えると逆にスマホで見たときに画面からはみ出すことがあるから注意して」HIROKI「了解。Hello Worldが出た！次は？」AOI「ここからが本番。シナリオをJSONで書いて、そのJSONからシーンを組み立てるシステムを作る」第3章 JSONシナリオ駆動設計——動画を「データ」として持つAOI「ぼくが運用してる量産パイプラインの心臓部は、JSONシナリオなんだ。動画のあらゆる情報——テキスト、画像パス、音声パス、シーン時間、トランジション、フォントサイズ——を全部JSONに書く」HIROKI「全部？」AOI「全部。だってそうしないと、台本を書き換えるたびにTSXを触ることになるでしょ。それじゃ量産にならない」具体的なJSONシナリオの構造は次のような形になります。json
{
  "title": "副業初心者がやりがちな失敗5選",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "bgm": "audio/bgm/420_BPM108.mp3",
  "bgmVolume": 0.2,
  "scenes": [
    {
      "id": "hook",
      "image": "images/hook01.png",
      "voice": "audio/voice/aivis-888753760-001-hook.wav",
      "text": "副業で月5万、本当に大事なのは……",
      "fontSize": 80,
      "duration": 120,
      "kenBurns": { "from": 1.0, "to": 1.12, "direction": "topLeft" },
      "transition": "fade"
    },
    {
      "id": "problem",
      "image": "images/problem01.png",
      "voice": "audio/voice/aivis-888753760-002-problem.wav",
      "text": "ほとんどの人がここで挫折します",
      "fontSize": 64,
      "duration": 150,
      "kenBurns": { "from": 1.0, "to": 1.10, "direction": "topRight" },
      "transition": "wipe"
    }
  ]
}
```HIROKI「これだけで動画になるの？」AOI「うん。JSONを読み込んで、Composition側でこのscenes配列を回して、各sceneを`Sequence`にして並べる。それだけ」ここで、JSONドリブンにする最大の利点を補足します。シナリオがJSONで独立して存在することで、「シナリオ生成だけをChatGPT/Geminiにやらせる」という分業ができるようになります。たとえば「30秒の副業ネタを5本書いて」とAIに頼んで、出てきた台本を即JSONに変換すれば、5本分の動画ソースが一気に出来上がる。JSONを受け取って動画を組み立てる側のコードは、こんなイメージになります。tsx
// src/ScenarioRenderer.tsx
import { Series } from 'remotion';
import { Scene } from './Scene';
import scenario from './scenarios/sample.json';export const ScenarioRenderer: React.FC = () => {  return (    <Series>      {scenario.scenes.map((scene) => (        <Series.Sequence key={scene.id} durationInFrames={scene.duration}>          <Scene {…scene} />        </Series.Sequence>      ))}    </Series>  );};```AOI「`Series`は順番にコンポーネントを並べてくれるユーティリティ。`Series.Sequence`で各シーンの長さを指定すれば、自動的に時間軸が組まれる」HIROKI「すげー。JSONを書き換えれば動画が変わる」AOI「これが量産の基本。次は、各Sceneの中身をどう作るか。画像のKen Burnsズームと、テキストのフェードインを実装する」tsx
// src/Scene.tsx
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate } from 'remotion';type SceneProps = {  image: string;  voice: string;  text: string;  fontSize: number;  kenBurns: { from: number; to: number; direction: string };  duration: number;};export const Scene: React.FC<SceneProps> = ({ image, voice, text, fontSize, kenBurns, duration }) => {  const frame = useCurrentFrame();  const scale = interpolate(frame, [0, duration], [kenBurns.from, kenBurns.to]);  const textOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });  return (    <AbsoluteFill style={{ backgroundColor: '#000' }}>      <Img        src={staticFile(image)}        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }}      />      <Audio src={staticFile(voice)} />      <AbsoluteFill style={{ justifyContent: 'flex-end', padding: 80 }}>        <h2 style={{ color: 'white', fontSize, opacity: textOpacity, textShadow: '0 0 12px #000 ' }}>{text}</h2>      </AbsoluteFill>    </AbsoluteFill>  );};```HIROKI「これでKen Burns効果も付いてる。シンプルだね」AOI「これがベース。あとはここに、トランジションや吹き出し、BGMミキシングを足していくだけ。ちなみに`staticFile()`は`public/`配下のファイルを参照する関数。画像も音声もここに置けばいい」第4章 音声を自動生成する——AivisSpeech連携HIROKI「画像とテキストはJSONに書けばいいって分かった。音声はどうするの？まさか自分で吹き込むんじゃないよね？」AOI「もちろん違う。AivisSpeechっていうローカル音声合成エンジンを使う。商用利用OKで、感情表現付きの日本語音声が無料で出せる神ツール」HIROKI「AivisSpeechって、VOICEVOXの後継みたいな？」AOI「方向性は近い。VOICEVOXより感情豊かで、自然な抑揚が出る。ぼくの推奨スピーカーは女性なら『まお ノーマル』、男性なら『阿井田 茂 ノーマル』。これだけで90%のユースケースをカバーできる」AivisSpeechのAPI呼び出しは、Next.js側でラップしておくと使いやすくなります。例として、ぼくが運用している`/api/audio/aivis`エンドポイントを示します。ts
// pages/api/audio/aivis.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';export default async function handler(req: NextApiRequest, res: NextApiResponse) {  const { text, speakerId = 888753760, fileName } = req.body;  // audio_queryでクエリ生成  const queryRes = await fetch(    `http://127.0.0.1:10101/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,    { method: 'POST' },  );  const query = await queryRes.json();  // パラメータ調整  query.speedScale = 1.15;  query.pauseLengthScale = 0.3;  query.intonationScale = 1.0;  query.prePhonemeLength = 0.05;  query.postPhonemeLength = 0.05;  // 合成  const synthRes = await fetch(`http://127.0.0.1:10101/synthesis?speaker=${speakerId}`, {    method: 'POST',    headers: { 'Content-Type': 'application/json' },    body: JSON.stringify(query),  });  const buf = Buffer.from(await synthRes.arrayBuffer());  const outPath = path.join(process.cwd(), 'public', 'audio', 'voice', fileName);  fs.writeFileSync(outPath, buf);  res.status(200).json({ path: `audio/voice/${fileName}` });}```HIROKI「`speedScale 1.15`って早口にしてるんだ」AOI「うん。ショートは秒で印象が決まるから、1.0だとちょっと遅すぎる。1.15くらいが今のトレンドにフィット。あと`pauseLengthScale 0.3`で単語間の不要な間を削る。これで60秒に詰め込める文字数が一気に増える」HIROKI「これって、各シーンの台本ぶんを順番にAPIに投げて、wavを生成すればいいだけ？」AOI「そう。だからJSONシナリオを書く→シナリオの各シーンのtextを取り出して→順番にAivisSpeechに投げて→wavを保存→JSONのvoiceフィールドにファイル名を入れる、という流れを一発でやるスクリプトを書いておくと最高に楽」ts
// scripts/generate-voices.ts
import scenario from '../src/scenarios/sample.json';
import fs from 'fs';
import path from 'path';(async () => {  for (let i = 0; i < scenario.scenes.length; i++) {    const scene = scenario.scenes[i];    const fileName = `aivis-888753760-${String(i + 1).padStart(3, '0')}-${scene.id}.wav`;    const res = await fetch('http://localhost:3005/api/audio/aivis', {      method: 'POST',      headers: { 'Content-Type': 'application/json' },      body: JSON.stringify({ text: scene.text, speakerId: 888753760, fileName }),    });    const { path: audioPath } = await res.json();    scene.voice = audioPath;    console.log(`生成完了: ${fileName}`);  }  fs.writeFileSync(    path.join(process.cwd(), 'src/scenarios/sample.json'),    JSON.stringify(scenario, null, 2),  );})();```HIROKI「これで音声ファイルとJSONが同時に更新されるのか」AOI「うん。あと、生成したwavの長さをffprobeで測って、その秒数をJSONの`duration`にフィードバックするのも自動化すると、シーン長を手で調整しなくて済むよ」bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 audio.wav
```AOI「これで秒数が出るから、30をかけてフレーム数にして、JSONの`duration`に書き戻す。これでナレーションがブツ切りされない動画が組める」HIROKI「全自動だ……すごい」第5章 画像を自動生成する——gpt-image-2の使い方HIROKI「次は画像か。ぼく、Midjourneyとか触ってきたけど、日本語テキストが入った画像って全然きれいに出ないんだよね」AOI「だからこそ`gpt-image-2`なんだよ。OpenAIが2026年春に出した画像モデルで、日本語テキストが99%の精度で入る。漫画の吹き出しも、看板の文字も、ボタンのラベルも、全部正確に出る」HIROKI「マジで？それ大ニュースじゃん」AOI「うん。ショート動画の世界が変わったレベル。あとはサイズも柔軟で、3:1から1:3まで好きな比率で生成できる。縦動画なら`1024x1536`、横なら`1536x1024`、正方形なら`1024x1024`、noteバナーは`1280x670`が推奨」OpenAIの`gpt-image-2`を呼び出すNext.jsのAPIラッパーは次のような形になります。ts
// pages/api/image/generate.ts
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });export default async function handler(req, res) {  const { prompt, size = '1024x1536', quality = 'medium', fileName } = req.body;  const result = await client.images.generate({    model: 'gpt-image-2',    prompt,    size,    quality,    n: 1,  });  const b64 = result.data[0].b64_json;  const buf = Buffer.from(b64, 'base64');  const outPath = path.join(process.cwd(), 'public', 'images', fileName);  fs.writeFileSync(outPath, buf);  res.status(200).json({ path: `images/${fileName}` });}```HIROKI「`quality: 'medium'`って約9セントなんだっけ」AOI「うん。medium 1枚9円、low 1枚1円、high 1枚20円。1動画で12枚使うとmediumで108円、lowで12円。lowでも普通に綺麗だから、量産ならlowでまったく問題ない」HIROKI「ちなみにプロンプトはどう書けばいいの？」AOI「ショート動画は『縦長』『キャラクターを画面下寄り』『上部にテキストが入る余白を空ける』っていう構図の指定が大事。あと『ぼかしすぎない』『シネマティックライティング』『フラットイラスト』とか、画風を一貫させる単語を必ず入れる」参考までに、ぼくが使うプロンプトテンプレートを公開しておきます。
A vertical 9:16 illustration in flat anime style.
Subject: 30-year-old Japanese man HIROKI sitting at a desk, looking surprised, holding a laptop.
Composition: subject placed in the lower two-thirds of the frame, leaving the top third empty for text overlay.
Lighting: warm desk lamp from the right, soft cinematic atmosphere.
Color palette: navy blue background, orange accent on the laptop.
Style: clean linework, light shading, manga-inspired.
Text in image: なし
```AOI「テキストを画像に焼き込む場合は最後の行に『Text in image: "ここに表示したい文字列"』って書く。漢字でもひらがなでもOK。99%の確率で正しく出る」HIROKI「魔法だ……」AOI「次は、JSONシナリオの各シーンに対して画像プロンプトを書いて、まとめて生成するスクリプト。これも音声と同じ要領で一括化できる」ts
// scripts/generate-images.ts
import scenario from '../src/scenarios/sample.json';
import fs from 'fs';
import path from 'path';(async () => {  for (let i = 0; i < scenario.scenes.length; i++) {    const scene = scenario.scenes[i];    if (!scene.imagePrompt) continue;    const fileName = `${scene.id}-${String(i + 1).padStart(3, '0')}.png`;    const res = await fetch('http://localhost:3005/api/image/generate', {      method: 'POST',      headers: { 'Content-Type': 'application/json' },      body: JSON.stringify({        prompt: scene.imagePrompt,        size: '1024x1536',        quality: 'medium',        fileName,      }),    });    const { path: imagePath } = await res.json();    scene.image = imagePath;    console.log(`生成完了: ${fileName}`);  }  fs.writeFileSync(path.join(process.cwd(), 'src/scenarios/sample.json'), JSON.stringify(scenario, null, 2));})();```HIROKI「これで画像も全自動だ。30秒動画なら12枚、60秒なら20枚、ぼくが過去にやってきた『1枚を5分かけてPhotoshopで修正する』みたいなのが完全に過去のものになる」AOI「うん。あと地味に大事なのが画像の枚数ルール。30秒動画なら最低12枚、60秒動画なら20枚以上、っていう基準を必ず守る。シーン1枚じゃなくて『フレーズに1枚』。約5秒に1枚が目安」HIROKI「12枚……結構多いな」AOI「でもこれをやらないと『退屈な動画』になる。スマホで縦スクロールしてる視聴者は、3秒同じ絵だと指が動く。だから絵を頻繁に切り替えることで『止まらない』動画になる」第6章 TransitionSeriesとKen Burnsで「動き」をつけるAOI「画像と音声が揃ったら、次は『動き』をつけるフェーズ。Remotionには`@remotion/transitions`っていう専用パッケージがあって、wipe・slide・flip・fadeとか主要なトランジションが全部入ってる」HIROKI「これでフラッシュもできる？」AOI「フラッシュは禁止。ユーザーが目を痛めるし、なによりイライラする。クロスフェードを使う」HIROKI「了解、禁止ね。覚えとく」`TransitionSeries`の基本的な使い方は次の通りです。tsx
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { slide } from '@remotion/transitions/slide';
import { Scene } from './Scene';export const TransitionShort: React.FC = () => {  return (    <TransitionSeries>      <TransitionSeries.Sequence durationInFrames={120}>        <Scene {…sceneProps[0]} />      </TransitionSeries.Sequence>      <TransitionSeries.Transition        presentation={fade()}        timing={linearTiming({ durationInFrames: 15 })}      />      <TransitionSeries.Sequence durationInFrames={150}>        <Scene {…sceneProps[1]} />      </TransitionSeries.Sequence>      <TransitionSeries.Transition        presentation={wipe({ direction: 'from-left' })}        timing={linearTiming({ durationInFrames: 12 })}      />      <TransitionSeries.Sequence durationInFrames={120}>        <Scene {…sceneProps[2]} />      </TransitionSeries.Sequence>    </TransitionSeries>  );};```HIROKI「`Series`じゃなくて`TransitionSeries`を使うんだ」AOI「うん。`TransitionSeries`は`Sequence`の間に`Transition`を挟める。トランジションは前後のSequenceから時間を借りる仕組みだから、durationの計算は自動でやってくれる」HIROKI「トランジションの種類はどれくらい使えばいい？」AOI「演出が単調にならないように3種類以上をローテーション。fade、wipe、slide、flipあたりを順番に回す。同じトランジションを連続で使うと『手抜き感』が出るから、JSONに`transition`フィールドを入れて自動で違う種類を割り当てると楽」ts
const transitions = [fade(), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), flip()];
const pickTransition = (i: number) => transitions[i % transitions.length];
```AOI「次にKen Burns。これは画像にゆっくりズーム＋パンをかける演出。すべての背景画像に必ず付ける。動かない画像が連続するとユーザーの目が離れるから」tsx
import { AbsoluteFill, Img, useCurrentFrame, interpolate, staticFile } from 'remotion';export const KenBurns: React.FC<{ src: string; from: number; to: number; direction: string }> = ({  src,  from,  to,  direction,}) => {  const frame = useCurrentFrame();  const scale = interpolate(frame, [0, 150], [from, to]);  const panMap: Record<string, [number, number]> = {    topLeft: [-20, -20],    topRight: [20, -20],    bottomLeft: [-20, 20],    bottomRight: [20, 20],    center: [0, 0],  };  const [tx, ty] = panMap[direction] ?? [0, 0];  const x = interpolate(frame, [0, 150], [0, tx]);  const y = interpolate(frame, [0, 150], [0, ty]);  return (    <AbsoluteFill>      <Img        src={staticFile(src)}        style={{          width: '100%',          height: '100%',          objectFit: 'cover',          transform: `scale(${scale}) translate(${x}px, ${y}px)`,        }}      />    </AbsoluteFill>  );};```HIROKI「シーンごとにパン方向を変えるのがポイント？」AOI「うん。シーン1は左上、シーン2は右上、シーン3は左下、みたいに方向を変えると視覚的な動きが分散して飽きにくくなる。これだけでクオリティが2段階上がる」HIROKI「テキストアニメーションは？」AOI「これも3種類以上ローテ。フェードイン、タイプライター風（一文字ずつ出る）、スプリング系（バネで弾むように出る）。spring関数を使うとバネは超簡単」tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';const { fps } = useVideoConfig();const frame = useCurrentFrame();const bounce = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });const translateY = interpolate(bounce, [0, 1], [50, 0]);```HIROKI「ぼよんって出るやつ、こんなに簡単に書けるのか」AOI「Remotionのアニメーションは『お絵描き』じゃなくて『数式と関数』。一度コツを掴むと、After Effectsより圧倒的に速く作れるようになる」第7章 BGM・字幕・セーフゾーン——「完成度」を引き上げる細部HIROKI「動画らしくはなってきた。でも、なんか『最後の一押し』が足りない感じがする」AOI「うん、それはたぶん『細部』。BGM、字幕、セーフゾーン、ブランドウォーターマーク——プロっぽさを決めるのはこの辺り。地味だけど絶対必要」まずBGM。`<Audio>`タグを使い、`loop`属性を必ず付ける（動画がBGMより長い場合に途切れない）。ナレーション付きの場合は`volume`を0.2〜0.3に下げる。tsx
<Audio src={staticFile('audio/bgm/420_BPM108.mp3')} volume={0.2} loop />
```AOI「BGMを足したら必ずffmpegで音量チェック。`ffmpeg -i input.mp3 -af volumedetect -f null -`でmean_volumeを見て、-30dB以下のBGMは無音扱いだから捨てる」HIROKI「ぼく、無料素材サイトからダウンロードしたBGMが小さすぎて聞こえない事故、何回かやった……」AOI「あるある。だからチェックは絶対」次にセーフゾーン。ショート動画はプラットフォーム側のUI（いいねボタン、コメント欄、ユーザー名）が画面下と右に重なる。bottom 160px、right 80px、top 80px、left 40pxは必ず空けておく。tsx
export const shortsSafePadding = {
  paddingTop: 80,
  paddingRight: 80,
  paddingBottom: 160,
  paddingLeft: 40,
};<AbsoluteFill style={{ …shortsSafePadding, justifyContent: 'flex-end' }}>  <h2 style={{ color: 'white', fontSize: 56 }}>本文</h2></AbsoluteFill>```AOI「これを守らないと、いいねボタンに字幕が隠れる。投稿してから気づくと地獄だから、テンプレ段階で必ず入れる」
