# ClaudeCode × Video use 完全解説｜動画編集を半自動にするbrowser-use 発の新Skills Claude Code OpenClaw Antigravity Codex O｜Claude Code Codex クドクラ@ AI駆動Craft
- **Source URL**: https://note.com/kudoucraft/n/n2abc11e75e27
- **Score**: 88
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #自動化パイプライン
- **Processed Date**: 2026/10/19

---

## 本文
こんにちはクドクラです 動画編集は「会話」になる【保存版】AI時代、動画編集は「会話」になるBrowser-useがClaude Codeで動画編集を全自動にできるオープンソースSkills「Video Use」をリリース。生動画をフォルダに放り込むだけでClaudeCodeで「編集して」と指示するだけで自動処理するAIエージェント。主なスキル：… pic.twitter.com/I5pUJRjMTW— KudouCraft＠AI駆動開発 (@KudouCraft) April 18, 2026


AIによる動画編集ツールは雨後の筍のように登場しました。自動カット、自動字幕、BGM 自動調整、被写体追尾、色補正 ―― それぞれの領域で「SaaS が人間を置き換える」と喧伝されてきました。しかし実際に編集者がツールを使ってみると、多くが同じ壁にぶつかります。プリセットが先にあり、自分の映像のトーン に合わない「ここだけ手動で直したい」という 繊細な差し戻しができない1カットずつタイムラインを開き直すため、作業の往復が減らない書き出した mp4 が「なんか違う」。でも どこをどう直したか覚えていないそんな編集者の閉塞感を、根本から覆そうとするオープンソースプロジェクトが video-use です。"Drop raw footage in a folder, chat with Claude Code, get `final.mp4` back."（素材を1つのフォルダに入れ、Claude Code と会話するだけで `final.mp4` が返ってくる）ブラウザ自動化で 6 万スター超を誇る browser-use チーム（Gregor Žunič 氏）が、同じ思想 ―― 「LLM にピクセルを見せるな、構造化された情報を渡せ」 ―― を動画編集に持ち込んだ結果、"タイムラインを開かない動画編集" という新しいパラダイムが生まれました。この記事では、video-use の設計思想、12個の絶対ルール、環境構築、ディレクトリ構造、核心スクリプト群、字幕とアニメーションオーバーレイの組み立て方、そして実際の会話フローまで、徹底的に解説します。対象読者は、動画クリエイター、YouTuber、テックプレゼンを量産するエンジニア、Claude Code をさらに実用的に使いたい方、そして「AI 動画編集ツールにいまひとつ納得できていない」すべての人です。おすすめ記事↓メンバーシップ記事↓1. video-use とは何か ― browser-use が生んだ"動画編集 Skill"video-use は、Claude Code の Agent Skill として動作する、オープンソースの会話型ビデオ編集フレームワークです。GitHub リポジトリは `browser-use/video-use`。基本機能は次の通りです。フィラー語（「あー」「えー」）や無音区間の自動カットセグメントごとのカラーグレーディングカット境目の 30ms 音声フェード（プチノイズ防止）字幕焼き込み（スタイル指定可）Manim / Remotion / PIL によるアニメーションオーバーレイの自動生成レンダリング後のカット境界を自己評価（visual jump / 音声ポップ / 字幕被りを自動検出）セッション記憶を `project.md` に永続化重要なのは、video-use が Claude Code に読み込ませるスキル一式 であるという点です。単独のアプリではありません。素材を置いたフォルダで `claude` を起動し、「これを launch video に編集して」と話しかければ、裏で ElevenLabs の文字起こし → 編集計画 → EDL 生成 → レンダリング → 自己検査 → preview.mp4 出力、という一連のパイプラインが走ります。2. 設計思想 ― なぜ"動画フレームを見ない"のかvideo-use の最大の特徴は、LLM に 動画フレームを直接見せない ことです。README は次のように言い切ります。30,000 frames × 1,500 tokens = 45M tokens of noise.Video Use: 12KB text + handful of PNGs.つまり、1時間のフッテージ（30fps × 3600 秒 = 108,000 フレーム）を LLM の視覚入力に放り込むと、文字通り 数千万〜億単位のトークン が生まれるその大半は「変化していないフレーム」「カット判断に無関係な背景」LLM は "情報密度" の低い入力に埋もれ、判断がぶれるvideo-use の答えは、二層構造のメディア読解：Layer 1：音声文字起こし（主）ElevenLabs の Scribe API で、ソース動画全件をバッチ処理。単語レベルのタイムスタンプ、話者ダイアライゼーション、音声イベントを取得します。これらを `takes_packed.md`（約 12KB）に詰め直し、LLM の 第一の視界 とします。Layer 2：視覚タイムライン（従・オンデマンド）カット境界の判断、曖昧な無音、ポスト・テイク比較など "必要な瞬間だけ" に `timeline_view` で フィルムストリップ + 波形 + 単語ラベル を合成した PNG を生成し、LLM に渡します。この考え方は、browser-use が Web 自動化で「スクリーンショットではなく、整理された DOM を LLM に渡す」方針と地続きです。ピクセル走査ではなく、意味のある構造 を渡す。これが video-use のすべての基盤です。3. プログラムフロー ― 会話から final.mp4 までの8ステップraw_footage/ に素材を置く
          ↓
  ┌─────────────────────┐
  │ 1. Inventory        │ ffprobe 全ソース走査
  │                     │ transcribe_batch.py（4並列）
  │                     │ pack_transcripts.py → takes_packed.md
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ 2. Pre-scan         │ 言い間違い・抜けを先読み
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ 3. Conversation     │ "どんな映像にしたい？" を人間に質問
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ 4. Strategy Proposal│ 4〜8文で編集方針を提示 → 承認待ち
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ 5. Execute          │ EDL 生成 + アニメ並列生成 + grade
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ 6. Preview          │ render.py --preview（720p 高速）
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ 7. Self-Evaluation  │ timeline_view で境目を自動検査
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ 8. Iterate + Persist│ 会話で差し戻し → project.md へ追記
  └──────────┬──────────┘
             ↓
       final.mp4 完成この一連の流れを、ユーザーは 一度も「タイムラインを開かない」 まま走らせられます。タイムライン的な判断は Claude Code が `takes_packed.md` と `timeline_view` を読んで代行し、人間は "こうしたい" をテキストで伝え続けるだけ。編集作業の重心が「操作」から「対話」へ完全に移ります。4. 12の絶対ルール（Hard Rules）video-use の SKILL.md が定める、芸術的判断と切り離された"正しさ"の制約 です。どの編集スタイルでも必ず守られます。| # | ルール | 目的 ||---|--------|------|| 1 | 字幕は最後に焼く（フィルターチェーンの最後） | オーバーレイで字幕が隠れるのを防ぐ || 2 | セグメント単位で `-c copy` concat。シングルパスのフィルターグラフ禁止 | 二重エンコードによる画質劣化を防ぐ || 3 | セグメント境界に必ず 30ms の音声フェード（`afade`） | "プチッ" というポップノイズ防止 || 4 | オーバーレイは `setpts=PTS-STARTPTS+T/TB` で先頭フレームを揃える | アニメが ずれて始まるのを防ぐ || 5 | マスター SRT は 出力タイムライン基準：`output_time = word.start - segment_start + segment_offset` | カット後も字幕タイミングが合う || 6 | 単語の途中でカットしない。必ず単語境界にスナップ | 音節が切れて不自然になるのを防ぐ || 7 | カット境界に 30〜200ms のパディング | 文字起こしの 50〜100ms ドリフトを吸収 || 8 | 単語レベル verbatim ASR のみ。SRT/phrase モード禁止 | サブ秒の間を保ち、編集判断材料を失わない || 9 | ソースファイルが変わらない限り再文字起こししない（キャッシュ必須） | API コストと待ち時間の無駄を排除 || 10 | 複数アニメは Agent ツールで並列サブエージェント。逐次禁止 | 生成時間を劇的に短縮 || 11 | 実行前に必ずプレーン英語で戦略を確認 | ユーザーが意図と違う編集を止められる || 12 | すべての成果物は `<videos_dir>/edit/` 配下。プロジェクトディレクトリを汚さない | 素材と出力が混ざらない |この12項目は、"タイムラインを開かない編集" という無茶を失敗させずに 実現するための、品質保証の骨格です。5. 環境構築必要環境| 項目 | 内容 ||------|------|| OS | macOS / Linux / Windows（WSL2 推奨） || Python | 3.10 以上 || CLI | Claude Code || Homebrew 系 | ffmpeg（必須） / yt-dlp（任意、オンライン動画用） || API キー | ElevenLabs（文字起こし用） |5-1. Claude Code のインストールnpm install -g @anthropic-ai/claude-code5-2. video-use を clone して Skill に登録git clone https://github.com/browser-use/video-use
cd video-use
ln -s "$(pwd)" ~/.claude/skills/video-useシンボリックリンクで登録するのがポイント。`git pull` するだけで全環境に反映されます。5-3. Python 依存をインストールpip install -e .ローカル開発モードで導入されるため、スクリプトの改造もそのまま反映されます。5-4. ffmpeg / yt-dlp の導入macOS：brew install ffmpeg
brew install yt-dlp   # オンライン動画からクリップする場合のみUbuntu / WSL：sudo apt install ffmpeg
pip install yt-dlpWindows（ネイティブ）：winget install Gyan.FFmpeg
winget install yt-dlp.yt-dlp5-5. ElevenLabs API キーを設定cp .env.example .env
# .env を開き、ELEVENLABS_API_KEY=sk_xxx を記入`ELEVENLABS_API_KEY` がないとスキルは起動時に鍵を要求してきます。指示に従って入れても OK です。5-6. 起動cd /path/to/your/videos
claudeあとは、Claude Code のプロンプトに次のように書くだけ。> edit these into a launch video6. ディレクトリ構造 ― edit/ 以下にすべてが集約video-use は 絶対に素材ディレクトリを汚さない というポリシーを持っています。生成物はすべて `<videos_dir>/edit/` の下に積み上がります。<videos_dir>/
├── C0101.MP4                 ← 素材はそのまま
├── C0102.MP4
├── C0103.MP4
└── edit/
    ├── project.md            ← セッション記憶（追記型）
    ├── takes_packed.md       ← LLM の主視界（約 12KB）
    ├── edl.json              ← カット決定書
    ├── transcripts/
    │   ├── C0101.json        ← Scribe 生 JSON（キャッシュ）
    │   ├── C0102.json
    │   └── C0103.json
    ├── animations/
    │   └── slot_1/
    │       ├── source.py     ← Manim / Remotion / PIL のコード
    │       ├── render.mp4    ← 生成アニメ
    │       └── reasoning.md  ← サブエージェントの判断メモ
    ├── clips_graded/         ← カラグレ + 音声フェード済みセグメント
    ├── master.srt            ← 出力タイムライン基準の SRT
    ├── downloads/            ← yt-dlp の出力（該当時）
    ├── verify/               ← 自己評価用フィルムストリップ PNG
    ├── preview.mp4           ← 720p 承認用プレビュー
    └── final.mp4             ← 完成品この一覧そのものが、video-use の仕事の「履歴」 になります。やり直したいとき、どのファイルを再生成すれば足りるかが一目で分かる。これは伝統的な NLE（ノンリニア編集ソフト）にはない、ファイルシステム・ネイティブな編集観 です。7. 核心ファイル解説7-1. takes_packed.md ― LLM の「第一の視界」`pack_transcripts.py` が、すべての Scribe JSON を読み込み、無音 ≥0.5s または話者切替 でフレーズを切って出力します。## C0103  (duration: 43.0s, 8 phrases)
  [002.52-005.36] S0 Ninety percent of what a web agent does is completely wasted.
  [006.08-006.74] S0 We fixed this.
  ...`[start-end]` は単語境界まで丸めた秒数。`S0` が話者ラベル。LLM はこれを読むだけで、「どのテイクのどの句が使えるか」を判断できます。生 JSON の冗長さを抑えつつ、必要なメタ情報はすべて残っているのがポイントです。7-2. timeline_view ― オンデマンドの視覚タイムラインpython timeline_view.py C0103.MP4 4.2 8.7指定した区間のフィルムストリップ（等間隔サムネ）、音声波形、単語ラベルを 1 枚の PNG に合成します。LLM は カット境界を確定する直前にだけ この PNG を参照します。常時スキャンしない ―― だからコストも待ち時間も抑えられる。7-3. EDL（edl.json）― カット決定書{
  "version": 1,
  "sources": {"C0103": "/abs/path/C0103.MP4"},
  "ranges": [
    {"source": "C0103", "start": 2.42, "end": 6.85,
     "beat": "HOOK", "quote": "Ninety percent...", "reason": "opens strong"}
  ],
  "grade": "warm_cinematic",
  "overlays": [
    {"file": "edit/animations/slot_1/render.mp4",
     "start_in_output": 0.0, "duration": 5.0}
  ],
  "subtitles": "edit/master.srt",
  "total_duration_s": 87.4
}`ranges`：どの素材のどの秒数を抜くか（`beat`、`quote`、`reason` で意図を残す）`grade`：適用するカラーグレードのプリセット名`overlays`：アニメ合成の時刻と継続`subtitles`：マスター SRT のパスこの EDL は 人間が読めばそのまま映像が想像できる 設計。差し戻しが来ても、対話でこの JSON を編集し直せばレンダーから再開できます。7-4. master.srt ― 出力タイムライン基準の字幕ルール5に従い、字幕のタイミングは 出力されたタイムラインの t=0 を基準にします。output_time = word.start - segment_start + segment_offset`word.start`：元素材での単語開始時刻`segment_start`：そのセグメントの元素材内での始点`segment_offset`：出力動画でのそのセグメントの始点この式のおかげで、フレーズごとに素材を抜いて繋いでも、字幕は正確に出続けます。7-5. project.md ― セッション記憶編集を繰り返すと、`project.md` に毎回の意思決定が追記されていきます。## 2026-04-18 launch video v2

- Removed filler words (1min → 42sec)
- Warm cinematic grade on all clips
- Added 3 manim overlays (network diagram, metric reveal, logo)
- User requested: less "umm" left in final, increase subtitle size from 18 → 22
- Next session: re-render preview with V=28 margin次のセッションで Claude Code はこのファイルを読んで、前回の続きから対話を再開 できます。映像編集の "過去ログ" としても貴重な資産になります。8. 補助スクリプト一覧video-use のヘルパー群は `helpers/` 配下に集約されています。Claude Code は必要に応じてこれらをシェル呼び出しで走らせます。| スクリプト | 用途 ||-----------|------|| `transcribe.py <video>` | 単体文字起こし（キャッシュ済みならスキップ） || `transcribe_batch.py <videos_dir>` | 4並列で全素材を Scribe 文字起こし || `pack_transcripts.py --edit-dir <dir>` | `transcripts/*.json` → `takes_packed.md` || `timeline_view.py <video> <start> <end>` | フィルムストリップ + 波形 PNG 生成 || `render.py <edl.json> -o <out>` | セグメント抽出 → concat → オーバーレイ → 字幕 || `render.py <edl.json> --preview` | 720p 高速プレビュー生成 || `grade.py <in> -o <out>` | ffmpeg フィルタチェーンでカラグレ || `ffprobe` | 出力の尺と諸元検証 || `ffmpeg` | 中核のエンコード/フィルタ || `yt-dlp` | オンライン素材のダウンロード（lazy-install） || `manim` | アニメ生成（`skills/manim-video/SKILL.md` 参照） || `Remotion` | Web ベースアニメ（lazy-install） |lazy-install：必要になった時点でインストールを求めてくる設計。最初の環境構築を軽く保つ工夫です。9. 字幕スタイル ― 3軸で自在にカスタム字幕は chunking（1行あたりの単語数）／case（大文字小文字）／placement（下端余白） の3軸で設計します。9-1. プリセット：bold-overlay（ショート向け）2語/行、UPPERCASE、句読点で改行
フォント: Helvetica 18 Bold
白文字 + 黒縁取り、下端余白 V=35TikTok・Reels・YouTube Shorts のような テンポの速いテック動画 にぴったりです。9-2. プリセット：natural-sentence（ドキュメンタリー向け）4〜7語/行、文頭大文字、自然な区切り
下端余白 V=60〜80、大きめフォント、広めの最大幅語り を聞かせる長尺向け。字幕は読ませずに "読み上げを補う" 姿勢。9-3. 絶対のルールルール1：字幕はフィルタチェーンの 最後ルール5：出力タイムライン基準の SRT を必ず使う独自スタイルを作る場合でも、この2点は動きません。10. アニメーションオーバーレイ ― PIL / Manim / Remotion を使い分けるvideo-use は3種類のアニメツールを 用途に応じて自動選択 します。10-1. PIL + PNG シーケンス用途：シンプルなカード、数値カウンタ、タイプライター、バー伸長利点：高速反復、外部依存が少ないPython スクリプトで PNG 連番を生成 → `ffmpeg` で mp4 化10-2. Manim用途：数式、状態機械、グラフの変形、フォーマルな技術図利点：数理的な説明が美しい`skills/manim-video/SKILL.md` に詳細なガイドラインあり10-3. Remotion用途：タイポグラフィ重視、ブランドカラー、React/CSS レイアウト利点：Web ネイティブなデザインシステム流用10-4. 継続時間の目安| 場面 | 長さ ||------|------|| シンプルカードのナレーション同期 | 5〜7秒 || 複雑な図解 | 8〜14秒 || 音楽ビート同期 | 0.5〜2秒 || 最終フレームのホールド | カット前に 1秒以上 || ナレーション被り | ナレ長 + 1秒以上 |10-5. イージング線形（linear）は禁止。ロボット的に感じられます。代わりに、`ease_out_cubic`：シングル出現（着地がふんわり）`ease_in_out_cubic`：連続描画（自然な加減速）10-6. 並列サブエージェントで生成複数アニメは、Claude Code の Agent ツールで並列起動（ルール10）。それぞれに以下の仕様をテキストで渡します。1文のゴール絶対出力パス正確なスペック（解像度、fps、コーデック、`pix_fmt`、CRF、尺）カラーパレット（RGB／hex／参照画像）フォントパス（インデックス指定含む）フレーム単位のタイムラインとイージング禁止項目（不要な装飾、ロゴ、etc.）コードパターンの参照先納品チェックリスト「不明点は質問せず最善解で仕上げよ」との指示この テキスト仕様書 をサブエージェントに投げるだけで、1分以内に複数のアニメが同時に完成します。11. 自己評価ループ ― "プレビュー前の最終チェック"video-use は、ユーザーに preview.mp4 を見せる前に、Claude Code 自身が出力を検査 します。11-1. 検査対象のフレーム各カット境界の ±1.5秒冒頭 2秒末尾 2秒中間 2〜3ポイント11-2. 検査項目視覚的不連続（色飛び、光量ジャンプ）波形の急峰（30ms フェードを超える音声ポップ）字幕がオーバーレイに隠れていないか（ルール1違反）オーバーレイの位置ずれ／フレームずれ（ルール4違反）カラグレの一貫性字幕の読みやすさ11-3. 長さの一致確認`ffprobe` を再実行し、`edl.json` の `total_duration_s` と出力 mp4 の実際の尺が一致するか確認。サイレントな尺ズレは最もバレにくいバグ であり、ここで止めます。11-4. 3回の自己修復、ダメなら人間に3回自己評価しても問題が消えない場合、無限ループせずユーザーにフラグを立てる。エラーで止まるより、人間に判断を委ねる のが video-use の流儀です。12. 実行フロー（会話例）実際に Claude Code でどう対話するかを見てみましょう。You> edit these into a launch videoClaude Code（内部処理の要約）：1. ffprobe で 8 素材を走査
2. transcribe_batch.py を4並列起動（約2分）
3. pack_transcripts.py で takes_packed.md を生成
4. "8 takes, total 14m22s. 話者2名を検出。フィラー語 47個。" と報告ここでプレスキャンが走り、Claude Code が提案を返してきます。Claude> 以下の構成を提案します。

Strategy:
- Hook: C0103 2.42-6.85「Ninety percent...」(HOOK)
- Problem: C0101 12.4-21.8（3テイク中で最もクリア）
- Solution: C0102 5.2-18.9 + Manimで状態遷移図を 6秒オーバーレイ
- CTA: C0108 0.9-4.3
合計 約 42秒、warm_cinematic グレード、bold-overlay 字幕。
よろしいですか？You から `yes, but make the hook punchier` と返すだけで、Claude は EDL を書き換え、レンダーし、preview.mp4 を返してきます。Claude> edit/preview.mp4 を生成しました。
Self-eval: カット3点で問題なし、ffprobe尺一致。
修正したい箇所はありますか？あとは「字幕をもう少し大きく」「2:14 のあたりに空白を 0.3秒足して」など、自然文で差し戻す だけ。13. 活用事例（5パターン）13-1. Tech 系 YouTuber の"解説動画"量産技術解説を毎週1本出すクリエイターは、収録 → 文字起こし → カット → 図解挿入 → 字幕 を全自動化できます。Manim との親和性が高く、アルゴリズム解説や数式の可視化に特に強い。13-2. スタートアップの"launch video"プロダクト発表やピッチ動画。Hook → Problem → Solution → CTA という定型を takes_packed.md から切り出し、warm_cinematic グレードで統一感を出す。13-3. 教育コンテンツ / オンライン講座収録素材の冗長をカットし、Remotion で重要語句をタイポグラフィ強調。字幕 natural-sentence プリセットで読みやすさ重視。13-4. ポッドキャストの動画版音声主体のコンテンツを、"話している人のフィルムストリップ" と波形オーバーレイで視覚化。字幕焼き込みだけで立派な YouTube 素材に。13-5. 旅行 Vlog / 日常記録ハプニング映像の長尺を、対話で「ここの笑い声は残したい」と微調整しつつ、テンポ良く短編に変換。14. Tips ― 使いこなしの勘所`project.md` は絶対消さない。次回セッションの継続性が断絶するフィラー語を全部切らない。自然さを保ちたい発話は残す指示を Claude に出すカラグレは "ソース全体" で決める。セグメントごとに違うプリセットを混ぜると統一感を失うアニメの尺はナレーションに合わせる。payoff ワードの瞬間に着地フレームが来るよう計算preview.mp4 と final.mp4 の品質差を把握。preview は 720p、final は 1080p 以上yt-dlp はオプション。ローカル素材だけなら不要Windows ネイティブより WSL2。ffmpeg のパス問題を避けやすいElevenLabs クレジットを監視。長尺素材で意外と消費するtranscripts/*.json はバージョン管理対象外。`.gitignore` に必ず含める同じ素材を再編集するときは `edit/` を保持。キャッシュが効いて超高速15. トラブルシューティング15-1. `ELEVENLABS_API_KEY` を聞かれ続ける`.env` が video-use のルートに無い可能性。`cp .env.example .env` を再度確認。15-2. ffmpeg が見つからないPATH が通っていません。`ffmpeg -version` で確認し、WSL なら `which ffmpeg`、Windows なら `Get-Command ffmpeg` で場所を把握。15-3. 文字起こしが遅い`transcribe_batch.py` は4並列。ネットワーク帯域とレート制限 がボトルネックになる場合あり。ElevenLabs のプランを確認。15-4. Manim でレンダが落ちる`skills/manim-video/SKILL.md` に依存手順が記載。Manim のシステム依存（LaTeX、Cairo など）を満たしているか確認。15-5. final.mp4 で音声ポップが聞こえるルール3の 30ms フェードが適用されていない可能性。`clips_graded/` のセグメントを単体再生して境界をチェック。15-6. 字幕がオーバーレイに隠れるルール1違反。`render.py` のフィルタ順序を確認し、字幕焼き込みを最後に移動。16. video-use の哲学 ― "編集は対話である"伝統的な動画編集は、マウスとタイムラインによる空間的作業 でした。プロの編集者ほど、キーフレームの正確な配置、ペンツールでのマスク切り、わずかなレベル差の色調補正に、数十時間を捧げます。video-use が提示するのは、その正反対の世界です。空間的作業を 言語化された意図 に変換マウス操作を 「〜したい」という文 に変換タイムライン操作を EDL と takes_packed.md の読解 に変換これは、動画編集の "熟練者" を否定するものではありません。むしろ、熟練者の暗黙知を言語化するツール として機能します。「ここはもう一瞬早くカット」「Bロールを挟んで間を作って」「CTA の手前を半拍短く」―― そうした経験則は、Claude Code との対話で磨かれ、`project.md` に記録され、資産として残ります。browser-use チームの一貫した哲学は、「LLM を人間の使うツールに合わせるのではなく、LLM にとって読みやすい形にツールを再設計する」 ことです。Web を DOM で渡すように、動画を文字起こしで渡す。ビデオ編集 SaaS の大海原で、最もローテク に見えるアプローチが、結果として最も汎用的に動いています。16-a. browser-use との系譜 ― "ピクセルを見せない"思想の延長video-use を深く理解するには、開発元である browser-use の哲学を知る必要があります。browser-use は Web 自動化エージェントで、GitHub で 6 万を超えるスターを集めています。そのコア思想は一貫して次の1点に集約されます。LLM にスクリーンショットを見せるな。構造化された DOM を渡せ。従来の Web 自動化エージェントは、スクリーンショットを GPT-4V や Gemini に読ませ、ピクセル座標でマウス操作を生成していました。しかし、この方法には致命的な欠点がありました。ボタンの座標がわずかにずれるだけで失敗する解像度変化で一気に崩れるスクリーンショット1枚で数千トークンを食う"このボタンは何をするボタンなのか" という意味情報を LLM が得られないbrowser-use は、この問題に対して 「DOM を構造化してテキストに落とし込む」 という直球の解答を出しました。ボタンには `[12] click to submit form` といった番号付き意味ラベルを与え、LLM は「12番を押す」と指示するだけで良い。座標も解像度も関係なくなり、ワンショットで正しい操作が選べる ようになります。video-use は、この思想をそのまま動画編集に持ち込みました。| 領域 | browser-use | video-use ||------|-------------|-----------|| 従来アプローチ | スクリーンショット読解 | 全フレーム視覚解析 || 問題点 | ピクセル依存、トークン爆発 | 1時間で 45M トークン || 解決策 | DOM を構造化テキストに | 音声を word-level JSON に || LLM の主視界 | `[12] Submit` | `[002.52-005.36] S0 ...` || 視覚情報 | 必要時だけスクショ | 必要時だけ timeline_view |同じ開発チーム・同じ哲学から2つの巨大プロジェクトが生まれているのは偶然ではありません。"LLM にとって読みやすい形へツールを再設計する" という一貫した姿勢が、分野を越えて通用することの証左です。16-b. 制作現場での具体的メリットvideo-use の導入効果を、典型的な編集ワークフローと比較してみましょう。16-b-1. 従来の手動編集（Premiere Pro / DaVinci Resolve）| 工程 | 所要時間 ||------|---------|| 素材プロキシ生成 | 10〜30分 || 粗編（トランスクライブ or 目視） | 1〜3時間 || フィラーカット・無音詰め | 1〜2時間 || カラグレ統一 | 30分〜1時間 || 字幕生成・位置調整 | 1〜2時間 || オーバーレイ・図解作成 | 2〜5時間 || 書き出し・微調整ループ | 1〜2時間 || 合計 | 8〜15時間 |16-b-2. video-use + Claude Code| 工程 | 所要時間 ||------|---------|| `cd videos && claude` 起動 | 10秒 || 文字起こし（バックグラウンド） | 2〜5分 || 対話で戦略確定 | 3〜5分 || EDL 生成 + レンダ + 自己評価 | 5〜15分 || 差し戻し 2〜3サイクル | 10〜20分 || final.mp4 書き出し | 3〜10分 || 合計 | 約 30〜60分 |単純計算で 10〜20倍 の時短。しかも作業者はタイムラインを一度も開かない。空いた時間は、シナリオ構成や撮影の質向上に回せます。16-c. 実践上の注意点と限界一方で、video-use が万能ではない点も正直に伝えておきます。16-c-1. 得意なコンテンツトーク中心 の動画（プレゼン、解説、Podcast、インタビュー）ナレーション駆動 の映像（Vlog、ドキュメンタリー）定型構造 を持つ動画（Hook→Problem→Solution→CTA）16-c-2. 苦手なコンテンツ無音のビジュアル主体（MV、アート映像、アクション）高速編集が命のショート（一部は Claude Code も相談役として使えるが、フレーム単位の判断は人間主導）複雑なエフェクト合成（Fusion、After Effects 領域）多重音源のミキシング（音楽制作の領域）16-c-3. ElevenLabs の Scribe 以外に対応するか現時点では Scribe 前提 の実装です。Whisper や AssemblyAI に差し替えたい場合は `transcribe.py` を改造する必要があり、word-level timestamp と話者ダイアライゼーションの互換性を自前で確保する必要があります。16-c-4. ファイル名の文字化け日本語ファイル名は通る場合もあれば通らない場合もあります。半角英数の命名 を強く推奨します（例：`C0101.MP4`、`interview_01.mov`）。16-c-5. ライセンスと配布video-use 自体のライセンスは要確認（GitHub リポジトリを参照）。ElevenLabs、Manim、Remotion、yt-dlp はそれぞれ別ライセンスなので、商用利用時は各ツールの条件を確認しましょう。17. 先を見据えて ― video-use はどこへ向かうのかvideo-use はまだ黎明期のツールです。2026年4月時点で貢献者は実質的にメンテナー1名（`@gregpr07`）に集中しており、機能も日々進化しています。今後、以下のような拡張が現実味を帯びてきます。複数カメラソースの同期編集（マルチカム）BGM 自動挿入とダッキング（音楽と音声の連動レベリング）Whisper / AssemblyAI 等の別 ASR 差し替えFinal Cut Pro / DaVinci Resolve への XML エクスポートブラウザからのアップロード（Claude Code Web との連携）編集判断の A/B 版を自動生成 して比較プレビューどれも、いまの実装を大きく書き換えずに拡張できる余地があります。「word-level タイムスタンプ → EDL JSON → ffmpeg レンダー」 という疎結合な骨格が、これからの追加機能を素直に受け入れてくれるはずです。動画編集 SaaS 各社が "AI 編集" を謳いながらベンダーロック的なクラウド処理に閉じこもる中、video-use は ローカル、オープンソース、会話型 という3点セットで別の軸を提示しています。クリエイターが自分の素材とワークフローを自分で制御できる ―― この価値は、おそらく今後数年でより鮮明になるでしょう。そして最後に、大切な気付きがあります。タイムラインを開かない編集 は「手を抜く」ことではなく、「作業から思考への重心移動」だということです。Claude Code に戦略を説明するには、自分の作りたい映像を言語化する必要があります。その過程でシナリオが磨かれ、ストーリーの骨が通り、結果として出来上がる映像も良くなる。ツールの変化がクリエイターの思考様式を変える 典型例と言えます。video-use は、そのためのもうひとつの "対話相手" です。今日から、手元のフッテージで試してみてください。参考リンクvideo-use GitHubbrowser-use 本体Claude Code ドキュメントElevenLabs ScribeManim CommunityRemotionyt-dlpFFmpegおすすめ記事↓まとめこの記事を通じて見てきたことを整理します。video-use は browser-use 発のオープンソース動画編集 Skill素材フォルダに `claude` を起動し、会話で編集を完了ElevenLabs Scribe による文字起こし + `takes_packed.md` が LLM の主視界視覚タイムラインは カット判断の瞬間だけ 生成12の絶対ルールで "チャット編集" の品質を保証成果物はすべて `<videos_dir>/edit/` 配下に集約アニメは PIL / Manim / Remotion を並列サブエージェントで生成自己評価ループで preview 前に カット境界を自動検査`project.md` に決定履歴を永続化し、次セッションに引き継ぐこの仕組みにより、動画編集は次のフェーズへ進みます。作業効率向上：1時間素材を42秒に凝縮するような作業が、約5分で初稿まで到達意図の言語化：編集判断が `project.md` と EDL に残り、振り返り可能に再現性と反復：同じ素材からスタイル違いの動画を短時間で複数生成クリエイターの自由：ツール操作からの解放により、物語と伝え方に集中できるbrowser-use をインストールして Web を自動化したときと同じ衝撃を、あなたは video-use で動画編集領域に感じられるはずです。ぜひ今日、手元の素材を1つのフォルダに集め、`claude` を叩いてみてください。もし「便利そう！」「使ってみたい！」と思っていただけたら、以下の応援アクションをしていただけると嬉しいです。STEP 1: この記事への「スキ♡」STEP 2: noteで「クドクラ KudouCraft」をフォローSTEP 3: X（Twitter）での拡散メンバーシップ記事も更新していくので見てくれたら嬉しいです皆さんの感想や「こんな使い方してるよ！」という報告、お待ちしています！最後まで読んで頂きありがとうございますそれではまた次回の記事でお会いしましょう。
