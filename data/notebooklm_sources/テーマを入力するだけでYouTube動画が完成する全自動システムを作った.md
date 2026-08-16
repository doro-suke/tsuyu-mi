# テーマを入力するだけでYouTube動画が完成する全自動システムを作った
- **Source URL**: https://zenn.dev/sns_tool/articles/28f993528bf3a7
- **Score**: 88
- **Suggested Tags**: #自動化パイプライン, #Remotion, #LLM
- **Processed Date**: 2026/8/16

---

## 本文
この記事について
個人開発で「テーマを入力 → 台本生成 → 音声合成 → 動画編集 → YouTube投稿」を全自動で行うシステムを作りました。
本記事では、その技術的なアーキテクチャと実装のポイントを解説します。


 技術スタック



レイヤー
技術




フロントエンド & API
Next.js + TypeScript


AI（台本・画像）
Google Gemini 2.5 Flash / Claude


音声合成
Edge TTS / Google Cloud TTS / VOICEVOX / Gemini TTS


動画合成
Remotion（React → MP4）


動画投稿
YouTube Data API v3


DB
PostgreSQL（Neon）


インフラ
Xserver + ConoHa VPS（Docker）




 全体の処理フロー
ユーザー入力（テーマ・ペルソナ・尺）
    │
    ▼
┌──────────────────────┐
│ 1. 台本生成（AI）      │  Gemini 2.5 Flash
│    JSON形式で構造化出力  │  フォールバック: Claude
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 2. 音声合成（TTS）     │  Edge TTS / Google Cloud TTS
│    + ワードタイミング   │  / VOICEVOX / Gemini TTS
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 3. 素材生成            │  Gemini画像生成
│    画像 / サムネイル     │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 4. 動画レンダリング     │  Remotion（VPS）
│    字幕同期 / BGM合成   │  H.264 / 24fps / 1080p
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 5. YouTube投稿         │  YouTube Data API v3
│    サムネ / 字幕 / 予約  │  OAuth2認証
└──────────────────────┘
テーマ入力からYouTube公開まで、所要時間はおよそ 15〜45分 です。


 1. 台本生成 ― AIにJSON構造で台本を書かせる

 構造化出力が必要な理由
AIに自由形式で台本を書かせると、後続の処理（音声合成・字幕生成・画像配置）でパースが面倒になります。
そこで、セクション単位のJSONで出力させるようにしました。
// AIに要求する出力フォーマット（簡略化）
interface ScriptOutput {
  title: string
  sections: {
    type: "hook" | "intro" | "main" | "summary" | "ending"
    heading: string
    content: string        // ナレーション本文
    visualHint: string     // 画像生成のヒント
    durationSec: number    // 推定秒数
  }[]
  tags: string[]
}
こうしておくと、セクションごとに音声合成 → 画像生成 → 動画合成が独立して処理できます。

 尺のコントロール
日本語のナレーション速度は1分あたり約300文字。これを基に、指定された動画尺に応じた文字数を計算してプロンプトに組み込みます。
const targetChars = durationSeconds * 5  // 300文字/60秒

// セクション配分
// Hook: 5% → Intro: 8% → Main: 72% → Summary: 10% → Ending: 5%

 「AIっぽさ」の排除
YouTubeの視聴者はAIが書いた文章に敏感です。以下のような定型表現をプロンプトで明示的に禁止しています。
❌ 禁止: 「〜について解説します」「いかがでしたでしょうか」
❌ 禁止: 「〜という方も多いのではないでしょうか」

✅ 推奨: 「正直、最初は半信半疑だったんだけど…」
✅ 推奨: 「これ知った時は本当にビビった」
さらにキャラクターペルソナとして、一人称・語尾・口癖・禁止ワードを定義し、一貫したスタイルを維持させます。

 マルチモデルのフォールバック
Geminiが失敗した場合、自動的にClaudeへ切り替えます。
try {
  result = await generateWithGemini(prompt)
} catch {
  console.warn("Gemini失敗、Claudeにフォールバック")
  result = await generateWithClaude(prompt)
}
どちらか一方が障害を起こしても、ユーザー側の操作に影響が出ない設計です。


 2. 音声合成 ― 4つのTTSプロバイダーと字幕同期

 プロバイダーの使い分け



プロバイダー
コスト
品質
特徴




Edge TTS
無料
高
ワード単位のタイミングデータを取得可能


VOICEVOX
無料
高
キャラクターボイス（ずんだもん等）


Google Cloud TTS
従量課金
非常に高
Neural2モデルで自然な発話


Gemini TTS
従量課金
最高
感情表現が豊富



ユーザーが用途やコスト感に合わせて自由に選択できます。

 ワード単位のタイミングデータ
このシステムの肝は音声と字幕の正確な同期です。
Edge TTSはWebSocket経由で音声合成中にWordBoundaryイベントを返すので、各単語の開始・終了時刻をミリ秒精度で取得できます。
interface WordBoundary {
  text: string    // "こんにちは"
  start: number   // 開始（ミリ秒）
  end: number     // 終了（ミリ秒）
}
このデータを .timings.json として音声ファイルと一緒に保存し、Remotion側で字幕同期に使います。

 チャンク分割と結合
TTS APIには文字数制限があるため、テキストを文の境界で分割し、個別に合成してから結合します。
const chunks = splitTextAtSentenceBoundaries(text, MAX_CHUNK_SIZE)
let cumulativeOffset = 0

for (const chunk of chunks) {
  const { audio, timings } = await synthesizeChunk(chunk)
  // タイミングデータに累積オフセットを加算
  timings.forEach(t => {
    t.start += cumulativeOffset
    t.end += cumulativeOffset
  })
  cumulativeOffset += audioDuration(audio)
}



 3. 動画合成 ― RemotionでReactを動画にする

 Remotionの概要
Remotion は、Reactコンポーネントで動画を定義し、サーバーサイドでMP4にレンダリングできるライブラリです。
動画のすべての要素（画像スライド、字幕、BGM、プログレスバー、キャラクターオーバーレイ）をReactコンポーネントとして記述します。
export const YouTubeVideo: React.FC<Props> = ({
  sections, audioUrl, images, timings
}) => {
  return (
    <AbsoluteFill>
      <Audio src={audioUrl} />
      <ImageSlide sections={sections} images={images} />
      <ProfessionalSubtitle timings={timings} />
      <CharacterOverlay character={character} />
      <ProgressBar total={totalFrames} />
    </AbsoluteFill>
  )
}

 字幕同期の実装
TTSから取得したワードバウンダリーを使い、現在のフレームに対応する字幕をハイライト表示します。
const ProfessionalSubtitle: React.FC<{ timings: WordBoundary[] }> = ({
  timings
}) => {
  const frame = useCurrentFrame()
  const currentTimeSec = frame / fps

  // 現在の再生位置に対応するワードを特定
  const activeWord = timings.find(
    t => currentTimeSec >= t.start && currentTimeSec < t.end
  )

  return (
    <div style={{ position: "absolute", bottom: 80, textAlign: "center" }}>
      {currentSentence}
    </div>
  )
}
これにより、ナレーションと完全に同期した字幕が実現できます。

 レンダリングサーバーの分離
Remotionのレンダリングは CPU集約型 で、10分の動画に5〜20分かかります。
共有ホスティング（Xserver）の制限に引っかかるため、ConoHa VPS（4コア / 4GB RAM） 上のDockerコンテナで専用のレンダリングサーバーを動かしています。
メインサーバー（Xserver）
    │
    │ HTTP POST /api/render
    ▼
レンダリングサーバー（ConoHa VPS / Docker）
    │
    │ Remotion renderMedia()
    │ concurrency: 4（全コア使用）
    │ 所要時間: 5〜20分
    ▼
MP4完成 → メインサーバーがダウンロード
// レンダリングサーバー（Express）
app.post("/api/render", async (req, res) => {
  const jobId = generateId()
  renderInBackground(jobId, req.body)  // 非同期で開始
  res.json({ jobId, status: "queued" })
})

async function renderInBackground(jobId, props) {
  const composition = await selectComposition({ id: props.compositionId })
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: `/tmp/renders/${jobId}.mp4`,
    concurrency: cpuCount,
  })
}
メインサーバーは5秒おきにステータスをポーリングし、完了後にMP4をダウンロードします。
// フロント: 5秒間隔でポーリング
useEffect(() => {
  const interval = setInterval(async () => {
    const { progress, status } = await fetchStatus(videoId)
    setProgress(progress)
    if (status === "COMPLETED") clearInterval(interval)
  }, 5000)
  return () => clearInterval(interval)
}, [videoId])


 4. YouTube自動アップロード

 OAuth2認証
YouTube Data API v3を利用するため、ユーザーのGoogleアカウントでOAuth2認証を行います。
ユーザー → "YouTubeを接続" クリック
    ▼
Google OAuth同意画面 → 認可コード発行
    ▼
サーバーで access_token + refresh_token に交換
    ▼
DBのChannelテーブルに保存
refresh_token を保持しておくことで、トークンの有効期限が切れても自動的に更新できます。

 アップロード処理
動画・サムネイル・字幕を一括でアップロードします。
async function uploadToYouTube(video: Video, channel: Channel) {
  const youtube = google.youtube({ version: "v3", auth: oAuth2Client })

  // 1. 動画ファイルをアップロード
  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: video.title,
        description: video.description,
        tags: video.tags,
        categoryId: "22",
      },
      status: {
        privacyStatus: video.scheduledAt ? "private" : "public",
        publishAt: video.scheduledAt?.toISOString(),
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: true,  // AI生成の明示
      },
    },
    media: { body: fs.createReadStream(video.videoPath) },
  })

  // 2. サムネイル（2MB以下に圧縮して設定）
  await youtube.thumbnails.set({
    videoId: res.data.id,
    media: { body: compressedThumbnail },
  })

  // 3. SRT字幕をアップロード
  if (video.srtPath) {
    await youtube.captions.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          videoId: res.data.id,
          language: "ja",
          name: "日本語",
        },
      },
      media: { body: fs.createReadStream(video.srtPath) },
    })
  }
}



 5. インフラ構成
┌──────────────────────────────────┐
│  Xserver（共有ホスティング）       │
│                                  │
│  proxy.php → Node.js:3002        │
│              (Next.js standalone) │
│                                  │
│  storage/                        │
│   ├── audio/     (MP3)           │
│   ├── images/    (PNG/JPEG)      │
│   └── videos/    (MP4)           │
└──────────────────────────────────┘
          │ HTTP
          ▼
┌──────────────────────────────────┐
│  ConoHa VPS（4Core / 4GB）       │
│  Docker: render-server           │
│  Remotion + FFmpeg               │
│  Express.js:4000                 │
└──────────────────────────────────┘
          │ TCP
          ▼
┌──────────────────────────────────┐
│  Neon PostgreSQL                 │
│  サーバーレスPostgres             │
└──────────────────────────────────┘
レンダリングサーバーを分離した理由: Remotionの動画合成はCPU負荷が高く、数分〜数十分かかります。共有ホスティングの実行時間制限に収まらないため、VPSで独立して稼働させています。


 6. 自動化を支えるCronジョブ
node-cron によるスケジューラーで定期的にAPIエンドポイントを呼び出しています。
// 動画レンダリング: 毎日 02:00 JST
cron.schedule("0 2 * * *", () => {
  callEndpoint("/api/cron/process-videos")
}, { timezone: "Asia/Tokyo" })

// YouTube投稿: 10分おき
cron.schedule("*/10 * * * *", () => {
  callEndpoint("/api/cron/upload-videos")
})

// VPSヘルスチェック: 30分おき
cron.schedule("*/30 * * * *", () => {
  callEndpoint("/api/cron/vps-health-check")
})

// スタック検出 + 自動リトライ: 5分おき
cron.schedule("*/5 * * * *", () => {
  callEndpoint("/api/cron/render-watchdog")
})

 ウォッチドッグ
レンダリングが30分以上停滞した場合、自動でジョブをリセットして再試行します（最大3回）。VPS自体が応答しなくなった場合はアラートメールを管理者に送信します。


 7. 技術選定の判断基準



項目
採用技術
選定理由




AI
Gemini 2.5 Flash
速度・コスト・品質のバランスが最も良い


TTS
Edge TTS（メイン）
無料かつワードタイミングを取得できる唯一のプロバイダー


動画合成
Remotion
Reactで記述でき、プログラマブルに動画を定義可能


DB
Neon Postgres
サーバーレスで運用負荷ゼロ。無料枠で十分


レンダリング
ConoHa VPS
国内サーバーで低遅延。月額1,000円台で4コア確保



Edge TTSでワードタイミングを取る方法
Edge TTSはMicrosoftのニューラル音声エンジンで、WebSocket接続中にWordBoundaryイベントを送信します。npm パッケージ edge-tts を使えば、Node.jsから簡単に利用できます。
ポイントは、音声バイナリとタイミングイベントが同じWebSocket接続で混在して送られる点です。バイナリフレーム（音声）とテキストフレーム（タイミングJSON）を分けて処理する必要があります。



 つまずいたポイント

 1. TTSチャンク結合時のタイミングズレ
テキストを複数チャンクに分割してTTSに投げると、各チャンクの音声長が微妙に異なります。単純に結合すると字幕がだんだんズレていく問題が発生しました。
解決策: 各チャンクの実際の音声長を計測し、累積オフセットをタイミングデータに正確に反映させました。

 2. Remotionのサーバーサイドレンダリングがメモリを食う
10分超の動画をレンダリングすると、4GBのVPSでもメモリが逼迫します。
解決策: concurrency をCPUコア数に合わせ、同時レンダリングは1ジョブに制限。ジョブキュー方式で順番に処理しています。

 3. YouTubeサムネイルの2MB制限
Geminiで生成した高解像度サムネイルがYouTubeの2MB制限を超える場合があります。
解決策: sharpでJPEG品質を段階的に下げるリトライ処理を入れました（85 → 70 → 50）。


 まとめ
全自動YouTube動画生成システムのアーキテクチャを紹介しました。
要点は5つです。


台本生成 ― AIに構造化JSON（セクション分割）で出力させ、後続処理をスムーズにする

音声合成 ― ワード単位のタイミングデータで字幕を正確に同期させる

動画合成 ― Remotionを使い、Reactコンポーネントで動画を定義する

自動投稿 ― YouTube Data APIでサムネイル・字幕込みのアップロードを自動化する

インフラ ― CPU負荷の高い処理（動画レンダリング）は専用VPSに分離する

テーマを入力してから動画がYouTubeに公開されるまで、人間がやることはテーマを決めるだけです。
▼作ったツールはこちら

ここまで読んでいただきありがとうございました。質問やフィードバックはコメント欄へどうぞ。
