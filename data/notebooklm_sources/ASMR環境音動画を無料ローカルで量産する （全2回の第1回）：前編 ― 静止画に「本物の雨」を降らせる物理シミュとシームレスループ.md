# ASMR環境音動画を無料ローカルで量産する （全2回の第1回）：前編 ― 静止画に「本物の雨」を降らせる物理シミュとシームレスループ
- **Source URL**: https://zenn.dev/bokuwalily/articles/asmr-factory-local-1
- **Score**: 88
- **AI Summary**:
  - ComfyUIとPython、ffmpegを統合したASMR動画自動生成パイプラインのアーキテクチャを提示。
  - 物理シミュレーションによる変位マップをキャッシュ化し、GPUコストゼロでループ動画を生成する手法を解説。
  - launchdを用いた無人運用におけるリトライ処理や冪等性設計が施されたシェルスクリプトを明記。
- **Read Now Reason**: 自動化パイプラインの構築に不可欠なリトライ処理、冪等性設計、ComfyUIの自動起動など、具体的なシェルスクリプトとPythonの実装パターンが明記されており、現在のプロジェクトに直接応用可能なため。
- **Suggested Tags**: #自動化パイプライン, #ComfyUI, #シェルスクリプト, #ffmpeg, #冪等性設計
- **Processed Date**: 2026/7/17

---

## 本文
大学2年のとき月10万だった収入が、掛け持ちで60万になり、会社都合で一瞬ゼロに落ちた。そこから半年でClaude Codeを中心とした自律環境を組み上げ、今は月商120万。そのスケールを支えている柱のひとつが、何もしなくても毎日YouTubeにASMR動画が投稿されていく仕組みです。

 なぜこの仕組みが効くのか
ASMRチャンネルには他のジャンルと決定的に違う特性があります。1視聴あたりの再生時間が異常に長いのです。眠れない夜にかけっぱなしにする、勉強中にずっと流す。30分動画を最後まで見てもらえれば、広告収益の計算式が根本から変わります。同じ登録者数でも、短尺エンタメ系チャンネルの2〜4倍の収益になることは珍しくありません。
問題は供給コストでした。ASMRで成果を出しているチャンネルのほとんどは毎日投稿しています。30分動画を毎日手作業で編集するのは現実的ではない。AI動画生成（Sora、Runway Gen-3など）でリアルな雨を描こうとすると1本あたり数百円〜数千円かかります。月商の柱にするには毎日30本以上ストックしておきたいので、その金額は論外でした。
転換点になった気づきは単純です。**ASMR動画に求められているのは「ダイナミックなカット割り」ではなく「窓の雨粒がゆっくり流れる静けさ」**です。カメラは動かない。シーンも切り替わらない。必要なのは、静止した室内風景の中で雨粒だけがじわじわ動いている、その質感です。
これは静止画で作れます。
RealVisXL（ローカルのComfyUIに乗せた画像生成モデル）が出した1枚の静止画に、Pythonで書いた雨粒の物理シミュレーションから変位マップを生成し、ffmpegのdisplaceフィルターで合成する。動画生成モデルは使わない。GPU代ゼロ。生成にかかるのはCPU時間だけです。
もうひとつの核心がシームレスループです。~/dev/asmr-factory/daily.shの実装ではLOOPSEC=16、すなわち16秒のループ動画をmake_full.shで30分にタイルしています。16秒で1周するということは、30分動画の中に継ぎ目が約112回発生するということです。この継ぎ目が目立てばコメント欄はクレームで埋まる。だから変位マップは先頭フレームと末尾フレームの変位量が完全に一致するよう周期設計されています。これが単純な「ランダム雨粒アニメ」と根本的に違うところで、全連載を通じて最も重要な技術的肝です。

 「暖色光源＋窓」構図に絞った理由
READMEに「テーマ: 7種・全て暖色光源+窓室内構図で統一」と書いてあります。なぜ統一するのか。
自動マスク（lib/auto_masks.py）が窓領域と炎領域を自動検出して、雨エフェクトと炎ゆらぎの適用範囲を決めます。この自動検出は構図が安定していないと精度が落ちます。「カフェの窓際」「暖炉のある書斎」「雨の見える和室」など、テーマは7種ありますが、窓は必ず画面に映っていて暖色光源があるという制約に絞ることで、マスク精度が実用レベルに安定しました。テーマを絞ることが美的な判断ではなく、自動化を成立させる設計判断だったわけです。

 無人運用の実績
~/dev/asmr-factory/のlaunchd設定（com.lily.asmr-daily）は毎朝7:00と14:00にdaily.shを起動します。朝7時分の生成が完走すれば14時はスキップされます（冪等性設計）。私がやることは翌朝にYouTube Studioを開いて公開ボタンを押すだけ。それ以外は完全に自動です。

 全体の流れ
パイプライン全体の構成です。
ComfyUI (RealVisXL @ 127.0.0.1:8188)
    │  still.png ─ 1024×576px
    ▼
lib/auto_masks.py
    │  win_mask.png  (窓領域マスク)
    │  fire_mask.png (炎領域マスク・テーマによりスキップ)
    ▼
lib/gen_rain_glass_map.py      ← ★ 今回の主役
    │  maps/daily_16s/map_0001.png
    │  maps/daily_16s/map_0002.png
    │  … (24fps × 16s = 384枚)
    │  ※ 初回生成後はキャッシュ使い回し
    ▼
lib/render_loop.sh             ← ★ 今回の主役
    │  loop.mp4 (16秒シームレスループ)
    ▼
lib/freesound_fetch.py  +  lib/mix_audio.sh
    │  bed.wav (CC0音源 / loudnorm -20LUFS / 2分尺)
    ▼
lib/make_full.sh
    │  video.mp4 (30分・ループをタイル)
    ▼
lib/make_thumb.py  +  lib/make_meta.py
    │  thumbnail.png (1280×720) / youtube.md
    ▼
lib/youtube_upload.py
       YouTube「非公開」アップ (公開は人間が確認して押す)
各ステップをdaily.shのコードと合わせて読んでいきます。

 ステップ1: ComfyUI画像生成
SEEDBASE=$(( $(date -j -f "%Y-%m-%d" "$DATE" +%s 2>/dev/null \
               || date -d "$DATE" +%s) % 100000 ))
ok=0
for att in 0 1 2; do
  SEED=$(( SEEDBASE + att*777 ))
  log "comfy_gen attempt $att seed=$SEED"
  if python3 "$LIB/comfy_gen.py" \
       --prompt "$PROMPT" --seed "$SEED" --out "$STILL" \
       --timeout 300 >>"$LOG" 2>&1; then
    ok=1; break
  fi
  sleep $(( (att+1)*10 ))
done
[ "$ok" -eq 1 ] || die "image generation failed after retries"
（daily.sh L101–111より）
シード値は日付のUNIXタイムスタンプを100000で割った余りをベースにしています。リトライのたびに+777ずつずらすことで、同一日付でも再試行ごとに別シードになります。ComfyUI自体が落ちていた場合はdaily.shのL50–60にあるensure_comfyui()関数が自動起動を試みます。150回（＝約10分）試行して立ち上がらなければdieで安全に中断します。

 ステップ2〜3: マスク検出と変位マップ生成
# ---- 3. 雨マップ(サイズ固定なのでキャッシュ流用) ----
LOOPSEC=16
MAPDIR="$ROOT/maps/daily_${LOOPSEC}s"
if [ ! -f "$MAPDIR/map_0001.png" ]; then
  log "generating rain map (cache)"
  mkdir -p "$MAPDIR"
  python3 "$LIB/gen_rain_glass_map.py" \
    --w 1024 --h 576 --fps 24 --seconds "$LOOPSEC" \
    --drops 46 --out "$MAPDIR" --seed 7 >>"$LOG" 2>&1 \
    || die "rain map gen failed"
fi
（daily.sh L121–127より）
ここが今回の連載で最も重要な箇所です。if [ ! -f "$MAPDIR/map_0001.png" ] という条件分岐を見てください。変位マップの生成は生涯で1回だけ走り、2回目以降はmaps/daily_16s/ディレクトリ全体を使い回します。
パラメータの意味：


--fps 24 --seconds 16 → 合計384枚の変位マップを生成（24×16＝384）

--drops 46 → 画面内に同時存在する雨粒の数。46は密度と処理速度のバランスを取った値

--seed 7 → 毎回同じマップを再現する（決定論的・再現性保証）

--w 1024 --h 576 → ComfyUIの出力解像度と揃える（揃えないとdisplaceがずれる）

gen_rain_glass_map.pyが何をしているかの詳細は後編で掘り下げますが、一言で言うと「窓ガラス表面の物理モデルを使って、384枚のGrayscale PNG（先頭と末尾の変位量が一致するよう周期的に設計された変位マップ）を生成する」スクリプトです。

 ステップ4: render_loop.sh でffmpeg合成
# ---- 4. ループ動画(モーション) ----
LOOP="$WORK/loop.mp4"
WIN_MASK_ENV=""; FIRE_MASK_ENV=""
[ "$HAS_RAIN" = "True" ] && WIN_MASK_ENV="$WORK/win_mask.png"
[ "$HAS_FIRE" = "True" ] && FIRE_MASK_ENV="$WORK/fire_mask.png"
WIN_MASK="$WIN_MASK_ENV" FIRE_MASK="$FIRE_MASK_ENV" RAIN_OP=0.8 \
  bash "$LIB/render_loop.sh" "$STILL" "$MAPDIR" "$LOOPSEC" "$LOOP" \
    >>"$LOG" 2>&1 || die "render_loop failed"
（daily.sh L129–135より）
RAIN_OP=0.8は雨エフェクトの不透明度です。1.0にすると変位量が強くなりすぎてガラスが歪んで見え、0.6だと雨が薄すぎる。実験の結果0.8が最も自然に見えました。render_loop.shはこれを環境変数として受け取り、ffmpegのdisplaceフィルターのパラメータに展開します。
HAS_RAINとHAS_FIREはthemes.jsonのテーマ定義から来ています。「暖炉の書斎」テーマならHAS_FIRE=TrueかつHAS_RAIN=False、「雨のカフェ」ならHAS_RAIN=TrueかつHAS_FIRE=False、「雨の暖炉」なら両方Trueです。マスクファイルが存在するかどうかで処理が分岐し、余計なフィルターは噛まない設計になっています。

 ステップ5〜6: CC0音源と30分化
for lic in cc0 any; do
  if timeout 90 python3 "$LIB/freesound_fetch.py" \
       --query "$Q" --minlen 25 --license "$lic" \
       --out "$SRC" >"$WORK/fs_${i}.json" 2>>"$LOG"; then
    fetched=1; break
  fi
done
（daily.sh L146–152より）
音源はFreesound APIからCC0ライセンスを優先して取得します（cc0 → anyの順でフォールバック）。timeout 90はFreesoundのプレビューDLにタイムアウトがないため手動でかけています。取得した複数の音源はmix_audio.shでloudnorm -20LUFSに統一ミックスされます。LUFSを統一しないと動画をまたいで音量が暴れるので、これは省けない工程です。
make_full.shはループ動画と音源を受け取って30分（デフォルトMIN=30）にタイルします。ループ動画16秒×約112.5回＝30分。ffmpegの-stream_loopオプションで動画を繰り返し、音源は-shortestではなく明示的にMIN分で切り出します。

 ステップ7〜9: サムネ・メタ・検証
# ---- 9. 検証 ----
DUR=$(ffprobe -v error -show_entries format=duration \
       -of csv=p=0 "$VIDEO" 2>/dev/null | cut -d. -f1)
WANT=$((MIN*60))
[ -n "$DUR" ] && [ "$DUR" -ge $((WANT-3)) ] && \
  [ "$DUR" -le $((WANT+3)) ] || die "duration check failed ($DUR != $WANT)"
STREAMS=$(ffprobe -v error -show_entries stream=codec_type \
           -of csv=p=0 "$VIDEO" 2>/dev/null | sort | tr '\n' ',')
echo "$STREAMS" | grep -q "audio" && echo "$STREAMS" | grep -q "video" \
  || die "missing stream ($STREAMS)"
TW=$(python3 -c \
  "from PIL import Image;print('x'.join(map(str,Image.open('$THUMB').size)))")
[ "$TW" = "1280x720" ] || die "thumb size $TW != 1280x720"
[ -s "$META" ] || die "meta empty"
（daily.sh L179–186より）
出力前に4点の検証をかけます。①動画尺が30分±3秒以内、②映像ストリームと音声ストリームが両方存在する、③サムネが1280x720、④メタファイルが空でない。どれか1つでも失敗すればdieでプロセスが落ち、後述のatomic moveが実行されないためDesktopには何も届きません。「壊れた動画がYouTubeに上がる」という最悪ケースをここで防いでいます。

 ステップ10: atomic stockと冪等性
# ---- 10. atomic stock ----
STAGE="$WORK/_deliver"; mkdir -p "$STAGE"
cp "$VIDEO" "$STAGE/video.mp4"
cp "$THUMB" "$STAGE/thumbnail.png"
cp "$META"  "$STAGE/youtube.md"
cp "$STILL" "$STAGE/scene.png"
mkdir -p "$DEST"
rm -rf "$FINAL"
mv "$STAGE" "$FINAL"
（daily.sh L189–197より）
作業ディレクトリ内の_deliver/に成果物を集めてからmv（atomic）でFinal destに移動します。コピー途中でプロセスが死んでも半端なディレクトリがDesktopに残りません。
冪等性はL86–88の判定で担保されています。
EXIST=$(find "$DEST" -maxdepth 1 -type d \
         -name "${DATE}_*" 2>/dev/null | head -1)
if [ -n "$EXIST" ]; then
  log "already stocked for $DATE ($EXIST); skip (idempotent)"
  exit 0
fi
当日分が1本でも存在すればテーマが違っても即exitします。launchdが7:00と14:00の2回起動しても二重生成は起きません。

 ステップ12: YouTubeへの非公開アップロード
media = MediaFileUpload(
    spec["video"],
    chunksize=8 * 1024 * 1024,   # 8MBチャンク
    resumable=True,
    mimetype="video/mp4"
)
req = yt.videos().insert(
    part="snippet,status", body=body, media_body=media
)
resp = None
while resp is None:
    status, resp = req.next_chunk()
    if status:
        print(f"  upload {int(status.progress()*100)}%",
              file=sys.stderr)
（lib/youtube_upload.py L73–80より）
resumable uploadを使っているので、途中で回線が切れても再開できます。chunksize=8 * 1024 * 1024（8MB単位）は30分動画（約800MB〜1GB）を安定して送るための設定です。アップロード成功後にYouTube Studio URLをログに吐き（L91: https://studio.youtube.com/video/{vid}/edit）、coverage.csvのレコードをOK+uploadedに更新します。
重要なのは、アップロードが失敗してもstock（~/Desktop/ASMR/の成果物）は一切消えないことです（daily.sh L206–226）。トークンが切れていた、ネットが落ちていた、どんな理由でもローカルのvideo.mp4は残ります。後からpython3 lib/youtube_upload.py --upload upload.jsonを手動実行すれば済みます。

次回はlib/gen_rain_glass_map.pyの物理シミュレーション本体（粒の生成・重力・窓ガラス表面張力モデル・384枚を周期的に結ぶ数学的設計）と、lib/render_loop.shのffmpeg displaceフィルター構文を詳しく掘り下げます。

 実装の詳細

 変位マップの「RGB3層構造」がなぜ必要か
lib/gen_rain_glass_map.py の冒頭コメントを読むと、出力PNGの構造が明文化されています。
R = x-displacement  (128 = neutral, refraction toward droplet center)
G = y-displacement  (128 = neutral)
B = specular highlight (0 = none, bright = glint on the droplet)
一般的な変位マップはGrayscale1枚で「明るいほど押し出す」表現をしますが、それでは横方向と縦方向を同時に制御できません。このパイプラインではRチャンネルとGチャンネルを独立した変位軸に割り当て、Bチャンネルに光の反射（スペキュラーグリント）を同梱することで、1枚のPNGに3つの物理量を詰め込んでいます。
render_loop.sh でこれを展開する処理がここです。
[1:v]setsar=1,split=3[m1][m2][m3];
[m1]extractplanes=r[xm];
[m2]extractplanes=g[ym];
[m3]extractplanes=b,format=gbrp[spec];
[todisp][xm][ym]displace=edge=smear,format=gbrp[disp];
[disp][spec]blend=all_mode=screen:all_opacity=0.85,format=gbrp[raineff];
（lib/render_loop.sh L36–41より）
split=3 で同じフレームを3系統に分岐し、extractplanes=r/g/b でそれぞれのチャンネルをグレースケールとして取り出します。R（xm）とG（ym）がffmpegの displace フィルターのX・Y変位源になり、B（spec）は blend=all_mode=screen で上から加算合成して光の白いハイライトになります。
format=gbrp の指定が随所に出てくることに気づいたでしょうか。ffmpegの displace フィルターはYUV系の色空間を嫌います。GBRPという「Gチャンネル・Bチャンネル・Rチャンネルをプレーナー配置した非圧縮フォーマット」を要求するためで、ここを省略すると実行時に [Parsed_displace] incompatible pixel format が出て止まります（後述）。

 シームレスループを成立させる数学
見た目のなめらかさより重要なのが「16秒で厳密に一周して継ぎ目がゼロになること」です。これを成立させている核心が gen_rain_glass_map.py L38–44の速度設計です。
for _ in range(args.drops):
    n = int(rng.integers(1, 3))        # full wraps over T -> loop
    r = float(rng.uniform(3, 9))
    drops.append(dict(
        ...
        speed=n * span / T,
        ...
    ))
（lib/gen_rain_glass_map.py L37–44より）
span = H + 2 * args.margin（576 + 80 = 656ピクセル）が画面縦幅に上下マージンを加えた「1周分の移動距離」です。n は1または2の整数。speed = n * span / T なので、16秒後に各雨粒が移動した距離は speed * T = n * span になります。
フレームごとの位置計算を見てください。
cy = (d["y0"] + d["speed"] * t) % span - args.margin
（lib/gen_rain_glass_map.py L71より）
t = T のとき d["speed"] * T = n * span なので、モジュロ演算の結果は d["y0"] % span と等しくなります。つまり t=0 と t=T の位置が完全に一致する。これがシームレスループの数学的根拠です。
「速度をランダムにすれば雨粒がバラバラに動いてリアルになるのでは？」と最初に思うかもしれません。私もそう思って試しました。結果は惨憺たるものでした。継ぎ目で雨粒がテレポートする。詳しくは後の「詰まった話」で書きます。

 横揺れ（wobble）も周期制約を満たす
窓ガラスを伝う雨粒は直線では落ちません。表面張力の偏りで左右に蛇行します。これを再現するのが wobamp と wobn パラメータです。
cx = d["x0"] + d["wobamp"] * math.sin(
    2 * math.pi * d["wobn"] * t / T + d["wobph"]
)
（lib/gen_rain_glass_map.py L72より）
t = 0 のとき位相は d["wobph"]、t = T のとき位相は 2 * pi * d["wobn"] * 1 + d["wobph"] です。wobn は1または2の整数なので、2 * pi * wobn は 2π または 4π。sin関数の周期は 2π なので、t=0 と t=T のX座標が必ず一致します。初期位相 wobph は [0, 2π) でランダムにばらつかせて粒ごとに異なる蛇行に見せているわけです。

 ヒーロードロップとトレイルで「ASMR感」を作る
雨粒を46個すべて同じ小さなサイズにすると、画面がにぎやかすぎて視覚的に落ち着かなくなります。眠りに引き込む映像には「大きくゆっくり落ちる主役の雨粒」と「背景に張り付いた細かい水滴」のメリハリが必要です。
n_hero = args.hero if args.hero >= 0 else max(3, args.drops // 8)
for _ in range(n_hero):
    r = float(rng.uniform(14, 26))      # fat hero droplet
    drops.append(dict(
        ...
        r=r, speed=1 * span / T,        # n=1: one slow descent per loop
        strength=float(rng.uniform(1.3, 1.8)),
        trail=float(rng.uniform(0.8, 1.0)), glint=1.0,
    ))
（lib/gen_rain_glass_map.py L51–61より）
通常粒の半径が 3〜9px に対してヒーロー粒は 14〜26px。strength も 0.7〜1.1 に対して 1.3〜1.8 で、レンズ効果が強くかかります。--drops 46 で通常粒が46個、max(3, 46 // 8) = 5 でヒーロー粒が5個、合計51粒が画面に共存します。
ヒーロー粒特有の機能が trail（尾跡）です。
if d["trail"] > 0:
    tpad_x = max(0, int(cx - 2)); tpad_x1 = min(W, int(cx + 2))
    ty0 = max(0, int(cy - r * 6)); ty1 = max(0, int(cy))
    if tpad_x1 > tpad_x and ty1 > ty0:
        tsx = xx[ty0:ty1, tpad_x:tpad_x1] - cx
        tdist = np.abs(tsx)
        tfall = np.clip(1.0 - tdist / 2.0, 0, 1)
        vfade = np.clip((yy[ty0:ty1, tpad_x:tpad_x1] - (cy - r * 6)) / (r * 6), 0, 1)
        dx[ty0:ty1, tpad_x:tpad_x1] += -(np.sign(tsx)) * tfall * vfade * (args.disp * 0.25) * d["trail"]
（lib/gen_rain_glass_map.py L95–103より）
雨粒の真上に幅4px（cx±2）・高さ r*6 の細い柱を設定し、そこに微弱な横変位（disp * 0.25）をかけます。水が通った跡でガラス表面が薄く濡れ、光の屈折が微妙に残る状態を模倣しています。vfade は雨粒に近いほど変位量が大きく、遠ざかるにつれゼロに近づくグラデーションです。

 ffmpegフィルターグラフの動的組み立て
render_loop.sh で特徴的なのが、環境変数 WIN_MASK と FIRE_MASK の有無でフィルターグラフ文字列を動的に組み立てる設計です。
FC="[0:v]format=gbrp,setsar=1[still];"
CUR="still"

if [ -n "$WIN_IN" ]; then
  FC+="[1:v]setsar=1,split=3[m1][m2][m3]; ..."
  CUR="rained"
fi

if [ -n "$FIRE_IN" ]; then
  FC+="[${CUR}]split=2[fb][ff]; ..."
  CUR="lit"
fi

FC+="[${CUR}]geq=r='r(X,Y)*${GFLK}':... ,format=yuv420p[vout]"
（lib/render_loop.sh L30–54より）
CUR 変数がパイプラインの「現在の出力ラベル」を追跡します。雨エフェクトを挟めば CUR が still → rained に更新され、次の炎ゆらぎは rained を入力として受け取る。どちらもスキップすれば still にグローバルフリッカーだけ乗せて終わります。
グローバルフリッカーの式を見てください。
C1=$(awk "BEGIN{printf \"%d\", 3*${LOOPSEC}}")   # = 48
C2=$(awk "BEGIN{printf \"%d\", 7*${LOOPSEC}}")   # = 112
GFLK="(0.975+0.018*sin(2*PI*${C1}*T/${LOOPSEC})+0.010*sin(2*PI*${C2}*T/${LOOPSEC}))"
（lib/render_loop.sh L18–20より）
T はffmpegのフレーム時刻を表す組み込み変数です。C1 = 3 * 16 = 48、C2 = 7 * 16 = 112 という係数を使うことで、周波数3Hzと7Hzの正弦波の和で輝度を変調します。t = 0 と t = LOOPSEC = 16 でどちらの正弦波も完全に一周するため、フリッカーも継ぎ目なしで繋がります。振幅 0.018 と 0.010 は室内電球のごくわずかな明滅を表す値で、意識的に目が追わないギリギリの強度を実験で決めました。
炎ゆらぎは同じ周波数を使いながら振幅を大きくし、位相 1.7 をずらして変調に有機的なずれを作っています。
FFLK="(0.78+0.15*sin(2*PI*${C1}*T/${LOOPSEC})+0.07*sin(2*PI*${C2}*T/${LOOPSEC}+1.7))"
（lib/render_loop.sh L21より）
基準値 0.78 は炎の影響下にある領域を通常輝度の78%まで落とすための係数です。暖炉テーマでは画面の一部が揺れる炎の光で明暗が交互に切り替わる「息をするような」動きが生まれます。


 私が詰まった話

 詰まり1: format=gbrp を省いたら何も映らなかった
最初に書いた filter_complex はシンプルな構成でした。
[0:v][1:v][2:v]displace=edge=smear[out]
実行すると映像は出力されましたが、画面が暗緑色の単色に塗りつぶされていました。ログには何も出ません。-loglevel info に上げて調べると incompatible pixel formats in filter chain が流れていました。
原因は displace フィルターがYUV420Pのまま受け取れないことです。静止画はJPEG由来のYUV、変位マップはRGBのPNG、この2系統を混ぜてdisplaceに渡すとffmpegが内部でフォーマット交渉を試みて失敗します。
直し方は変位マップを読み込んだ直後に format=gbrp をかけ、静止画側も同様に変換してから displace に渡すことです。render_loop.sh L30の [0:v]format=gbrp,setsar=1[still] と、L36の [1:v]setsar=1 に続いてR/G/B展開する構造がその答えです。format=gbrp をかけないと静止画の色が緑に偏る現象が起き、かつ無音で失敗するので原因が非常に見つけにくい。

 詰まり2: ループの継ぎ目で雨粒がテレポートした
最初の実装では speed をランダムな浮動小数点数にしていました。rng.uniform(20, 80) ピクセル/秒のように設定し、「バラバラに動けばリアルだろう」という判断です。
生成した動画を30分版で確認すると、16秒ごとに全雨粒が瞬間移動しているのが明確にわかりました。視覚的には高速コマ落ちのような「ガクッ」という断絶が、静かな音楽の上に112回繰り返される最悪の結果でした。
原因は既に説明した通りで、t=0 と t=T で雨粒の位置が一致しないことです。speed = n * span / T という「整数倍全span移動」の制約を入れた瞬間に解決しました。
副作用として雨粒の速度バリエーションが n=1 か n=2 の2種類に限定されますが、半径のバラつき（3〜26px）と横揺れの振幅差でリアリティは十分補えています。

 詰まり3: maskedmerge でマスクの白黒が逆だった
auto_masks.py が出力するウィンドウマスクは「窓の部分が白、それ以外が黒」の想定で書いていました。しかし ffmpegの maskedmerge フィルターの仕様を確認すると、第3入力が白いほど第2入力（エフェクト側）を採用するという動作が正しい挙動です。
最初のテストでは窓ガラスの外（壁・天井）に雨粒変位が乗り、窓の中だけがエフェクトなしになっていました。見た目は「壁が歪んで窓が静止」という真逆の結果です。
auto_masks.py のマスク生成ロジックを確認して、窓領域を255（白）で塗り、非窓を0（黒）で塗っていることを確かめました。問題はffmpegへの渡し方ではなく、maskedmerge の引数順でした。
[base][raineff][winmask]maskedmerge
maskedmerge の入力は [ベース映像][エフェクト映像][マスク] の順です。私は最初 [raineff][base][winmask] の順で渡していたため、ベースとエフェクトが入れ替わった状態でマスク合成されていました。引数順を正しく直すだけで解決しました。ffmpegのドキュメントは引数順の説明が薄く、公式サンプルを読んでやっと気づきました。

 詰まり4: Freesoundのダウンロードが無限に止まった
音源取得の初期実装に timeout がなく、launchdから7:00に起動したジョブが昼過ぎまで止まっていたことがあります。原因はFreesoundのプレビューダウンロードURLがコンテンツを返し始めたあとサーバー側でセッションを維持したまま終端を送ってこないケースでした。requests.get はデフォルトでタイムアウトを設定しないので、ダウンロードが永遠に続きます。
daily.sh L148の timeout 90 はこれを防ぐためです。
if timeout 90 python3 "$LIB/freesound_fetch.py" \
     --query "$Q" --minlen 25 --license "$lic" \
     --out "$SRC" >"$WORK/fs_${i}.json" 2>>"$LOG"; then
（daily.sh L148より）
90秒でプロセスごと殺します。失敗した音源スロットは log "WARN: sound fetch failed: $Q" で記録し、他のスロットが1つでも成功していれば処理を継続します（L161の [ "$idx" -ge 1 ] チェック）。「音源ゼロの無音動画がYouTubeに上がる」だけは避けるための最低保証で、音源が1種類しか取れなくても出荷するという判断です。

 詰まり5: 変位マップを毎日再生成してCPUが詰まった
初期設計では雨マップをその日の静止画専用に再生成していました。「解像度は固定なのに毎回生成する必要があるのか？」と気づくまでに2週間かかりました。
384枚のPNGを生成するのに私のM1 MacBook（CPUモード）で約3分かかります。これが毎日の生成コストに加算され、全体が7〜8分かかっていました。さらに雨マップには静止画の内容は一切関係ありません。サイズ（1024×576）と尺（16秒）とシード（7）が同じであれば、どのテーマで生成しても出てくるマップは同じです。
daily.sh L123の if [ ! -f "$MAPDIR/map_0001.png" ] は初回生成後は条件が偽になりスキップされます。2日目以降のCPU負荷から3分が消えました。この変更後、daily.sh の実行時間は平均4分台になっています。

次回は lib/auto_masks.py のセグメンテーション実装と、lib/make_full.sh で16秒ループを30分にタイルする際の音ズレ対策、そして実際のチャンネル収益数字を明かします。

 つまずきポイント（追加編）
前段で詳述した5点（format=gbrp・ループ継ぎ目テレポート・maskedmerge引数順・Freesound無限ハング・変位マップ毎日再生成）に加えて、実運用で踏んだ地雷をまとめます。コードを読まずに動かすと高確率で詰まる箇所ばかりです。


launchdのPATHは /usr/bin:/bin:/usr/sbin:/sbin しかない。 daily.sh L8で export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 を最初にやっているのは、launchdの最小環境では日本語ログが文字化けするためです。PATHも同様で、HomebrewやnvmのPythonが入った /opt/homebrew/bin や /usr/local/bin はlaunchdから見えません。plistの EnvironmentVariables に <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string> を明示しないと ffmpeg: command not found が出てすべて落ちます。


クラッシュ後にロックディレクトリが残ると翌日以降が全滅する。 daily.sh L32–43のロック機構は「ロック保持PIDが kill -0 で死んでいれば奪取」する設計ですが、macOSの再起動を挟むとPIDが別プロセスに再利用されることがあります。その場合、死んだはずのロックが「生きているプロセスが持っている」と誤判定されて exit 0 し続けます。週次cronか手動で rm -rf ~/dev/asmr-factory/.daily.lock.d を仕込んでおくと保険になります。


macOSの date -j とLinuxの date -d は互換がない。 daily.sh L101と L66で date -j -f "%Y-%m-%d" "$DATE" +%s 2>/dev/null || date -d "$DATE" +%s というOR構文で両対応しています。このパターンを知らずに片方のOSで書いたスクリプトをもう片方に移植すると、日付変換で date: illegal option -- d または date: invalid option -- 'j' が出てシード計算が壊れます。


YouTube Data API v3は1日10,000クォータ。videos.insertは1回1,600消費なので1日6本が上限。 --force で再生成＋再アップを繰り返したり、別プロジェクトと同一APIプロジェクトを共用していると翌朝にクォータ超過（HTTP 403）が返ります。youtube_upload.py にリトライ処理はないため、このケースでは daily.sh L217の timeout 1200 python3 lib/youtube_upload.py ... が失敗し、L221の else ブランチが「WARN: YouTube upload failed (stockは保持)」を吐いてアップをスキップします。stock（~/Desktop/ASMR/）は失われないので後日手動アップは可能ですが、クォータは翌日まで回復しません。


初回 --auth を忘れると毎日のアップロードが全スキップされ気づきにくい。 daily.sh L207–208で [ -f "$HOME/.youtube/token.json" ] を確認しており、ファイルが存在しなければ「YouTube未認証→アップ省略」のWARNログを出して正常終了します。stock自体は作られるので生成は成功しているように見えますが、動画はずっとYouTubeに上がりません。初回だけインタラクティブセッションで python3 lib/youtube_upload.py --auth を実行してブラウザ同意を完了させてください。


YouTubeタイトルは100文字でPythonのスライスによりサイレントに切り捨てられる。 youtube_upload.py L63の spec["title"][:100] は例外を投げません。日本語の長いタイトルを make_meta.py で組んでも、API越しに送られるのは先頭100文字だけです。YouTube Studioで確認してはじめて末尾が消えていたことに気づく。タイトルは75文字以内を目安にするか、make_meta.py 側で assert len(title) <= 80 を入れると安心できます。


--minutes を増やすと mix_audio.sh の2分BED音源が不足する。 daily.sh L164の bash "$LIB/mix_audio.sh" "$BED" 120 ... は120秒（2分）のBEDを生成します。30分への拡張は make_full.sh がループ処理します。--minutes 60 に変えたとき make_full.sh の内部ループ実装によっては2分の音源が60分にうまく延びない場合があります。分数を変える際は mix_audio.sh の 120 も $MIN*60 に揃えて確認してください。


sed -i '' はmacOS専用で、Linuxでは sed: 1: "..." のエラーになる。 daily.sh L220の sed -i '' "s|,OK$|,OK+uploaded|" "$ROOT/coverage.csv" 2>/dev/null || true はmacOS版 sed 向けです。|| true でエラーをsilenceしているため、Linux環境に移植してもcoverage.csvが更新されないまま正常に見えます。Linux移植時は sed -i "s|..." に書き換えてください。


検証ステップが from PIL import Image を呼ぶため Pillow が必須。 daily.sh L184の python3 -c "from PIL import Image;print(...)" でサムネサイズを検証しています。Pillowが入っていない環境では ModuleNotFoundError で die します。launchdが呼び出すPython（通常Homebrew系）に pip3 install Pillow が済んでいるか確認してください。開発中は自分のvenvに入れていても、launchdが別のPythonを呼んでいて詰まるケースが実際にありました。


ComfyUIのCPUモードで --timeout 300（5分）は短すぎる。 daily.sh L53で nohup .venv/bin/python main.py --port 8188 --cpu として起動するため、M1 CPUで1024×576の画像生成に3〜8分かかります。comfy_gen.py --timeout 300 の上限に達してリトライが走り、att=0,1,2 の3回すべてで失敗すると die "image generation failed after retries" で止まります。CPU専用マシンでは --timeout 600 に延ばすか、launchd起動前にComfyUIを立ち上げておくことで安定します。


--still で既存画像を再利用するとき --force なしだと冪等チェックに弾かれる。 daily.sh L86–89の冪等チェックは FORCE=0 のとき当日分の成果物があれば即 exit 0 します。--still scene.png --theme-id X でリミックスしようとしても当日分が存在すれば何もせずに終わります。再生成・再ミックスを明示したいときは --force を必ず付けてください。




 ベストプラクティス
半年の無人運用で「これを守ると壊れない」と確認できた原則です。
1. 変位マップは初回1回だけ生成してキャッシュする
daily.sh L123の if [ ! -f "$MAPDIR/map_0001.png" ] がこれを実現しています。384枚のPNG生成（CPUで約3分）を初回限定にした結果、日次実行時間が7〜8分から4分台に落ちました。解像度（1024×576）とループ秒数（16秒）が変わらない限り、マップを再生成する理由はゼロです。
2. 雨粒の速度は n × span / T（nは整数）に固定してループを数学的に保証する
gen_rain_glass_map.py L38–44の speed = n * span / T（nは1または2）がシームレスループの根拠です。t=T で各粒が移動した距離は n * span の整数倍になり、モジュロ演算の結果が t=0 と完全に一致します。横揺れも wobn（1または2の整数）を使った正弦波なので t=T で一周します。速度バリエーションを2種に絞る代わりに半径（3〜26px）と振幅差で多様性を補う、このトレードオフが最重要設計です。
3. フィルターグラフには必ず format=gbrp を先頭に置く
render_loop.sh L30の [0:v]format=gbrp,setsar=1[still] は必須です。displace フィルターはYUV系を受け付けず、変換なしで渡すと画面が暗緑色になるか無言で落ちます。JPEG由来のYUV静止画とPNG変位マップを混合するすべての filter_complex にこのルールを適用してください。
4. エフェクト強度は環境変数で制御してハードコードを避ける
RAIN_OP=0.8（daily.sh L134）、GFLK、FFLK（render_loop.sh L18–21）はすべて環境変数または動的計算値です。強度の調整が数値1つを書き換えるだけで済むため、テーマごとに別スクリプトを持つ必要がありません。
5. 音源取得は timeout 90 ＋ cc0 → any フォールバックの2段構えにする
Freesoundのプレビュー配信は終端を送ってこないことがあるため requests.get だけでは永遠にハングします（daily.sh L148）。90秒タイムアウト・CC0優先・ライセンスフォールバックの3層で「音源ゼロの無音動画」を確実に防いでいます。
6. 出力前に4点検証を die で走らせてゲートを設ける
動画尺30分 ±3秒・映像と音声ストリームの両存在・サムネ 1280x720・メタファイル非空（daily.sh L179–186）。この検証ゲートを通った成果物だけが ~/Desktop/ASMR/ に届く設計です。「壊れた動画がYouTubeに上がる」最悪ケースを機械的に防ぎます。
7. 成果物の移動は _deliver/ へのコピー → mv （atomic）で行う
daily.sh L189–197のように _deliver/ に完成品を集めてから rm -rf "$FINAL"; mv "$STAGE" "$FINAL" で移動します。cp の途中でプロセスが死んでも中途半端なディレクトリがDesktopに残らず、古い成果物と新しい成果物が瞬間でも同時に存在しない設計です。
8. 冪等性は「日付で1本でも存在すればskip」で実装する
daily.sh L87–88の find "$DEST" -maxdepth 1 -type d -name "${DATE}_*" による判定です。テーマが変わっても同日2本目は生成しません。launchdが7:00と14:00に2回起動しても二重生成は起きない。--force で明示的に上書きできる設計にしておくことで、idempotencyと手動再生成の両方を1つのフラグで制御できます。
9. アップロード失敗でもstockを消さない。生成とアップロードを切り離す
daily.sh L221の else ブランチはWARNログを吐くだけで die しません。~/Desktop/ASMR/ の video.mp4 が残り、後から python3 lib/youtube_upload.py --upload upload.json で手動アップできます。ネット障害・トークン切れ・クォータ超過の影響範囲をアップロード工程だけに封じ込めた設計で、生成物の損失は起きません。
10. グローバルフリッカーは3Hzと7Hz（互いに素）の重ね合わせにする
render_loop.sh L18–20の GFLK が 3*LOOPSEC=48 と 7*LOOPSEC=112 という係数を使うのは、どちらもループ秒数の整数倍周期なので継ぎ目に影響しないためです（t=0 と t=T=16 でどちらの正弦波も一周する）。振幅は室内電球の微弱な明滅（0.018と0.010）に設定しており、意識的に目が追わないギリギリの強度です。単一周波数では人工的なちらつきに見え、ランダムノイズではループが割れます。
11. テーマを「暖色光源＋窓」に統一して自動マスク精度を安定させる
auto_masks.py の窓・炎領域検出は構図が安定していないと精度が落ちます。READMEに「テーマ: 7種・全て暖色光源+窓室内構図で統一」と明記してあるのは美的な統一感ではなく、自動化を成立させる設計上の制約です。テーマを追加するときも「窓が必ず映っている・暖色光源がある」を守ることでマスク精度と手動修正コストが両立します。
12. ヒーロードロップの半径は14〜26pxを上限にする
gen_rain_glass_map.py L58の r = float(rng.uniform(14, 26))。ここを30px超に広げると単体の雨粒が目立ちすぎて、30分ループで見ているとむしろ不自然に感じます。「ASMR映像として機能するのは雨粒が背景にいる質感」で、主役になってはいけない。26pxが実験で出した上限で、これを超えると視聴者コメントで指摘されるようになりました。
13. YouTube タイトルは75文字以内で組む。100文字はPythonスライスがサイレントに切り捨てる
youtube_upload.py L63の spec["title"][:100] は例外を投げません。make_meta.py でタイトルを組む際に75文字以内を目安にするか、assert len(title) <= 80 を入れておくと気づけます。
14. comfy_gen.py のタイムアウトはCPUモードに合わせて 600秒に延ばす
GPU前提の設計では300秒（daily.sh L106の --timeout 300）で足りますが、--cpu 起動（L53）の実機では1024×576の生成に3〜8分かかることがあります。CPU専用で運用するなら --timeout 600 に変更し、3回リトライ（att=0,1,2）を含めた最大待機時間が30分以内に収まるよう設計してください。


 まとめ
このパイプラインが成立している理由を突き詰めると、3つの設計判断に収束します。
「動く必要がないものは動かさない」。RealVisXLが出した静止画1枚を使い回し、変位マップも初回384枚のキャッシュだけで全テーマに対応します。GPUはComfyUIの画像生成にしか使わない。残りはCPUの数値計算とffmpegのフィルタ処理だけです。生成コストが実質ゼロになったのはここからです。
「数学的に正しいループ」でなければ量産できない。speed = n * span / T（nは整数）と wobn（1または2の整数）という2つの周期制約が、16秒ループの先頭と末尾を厳密に一致させます。この制約がなければ30分動画で112回繰り返される継ぎ目が視覚的な断絶になり、ASMRとして機能しません。「きれいに見せる」ためではなく「量産しても壊れない」ために数学があります。
「検証・冪等・atomic」の三原則で無人運用を守る。出力前4点検証（L179–186）、冪等チェック（L87–88）、atomic move（L189–197）は、人間が毎日確認しなくても壊れた動画が出荷されないための安全装置です。launchdが7:00に起動して4分後には ~/Desktop/ASMR/ に完成品が届いている。私がやることは翌朝YouTube Studioを開いて公開ボタンを押すだけです。
半年間この仕組みを回し続けて、ASMRチャンネルはいまも月次収益の安定した柱です。GPU代ゼロ、CC0音源のみ、ローカル完結。初期実装の週末2日を除けば、継続コストは電気代だけです。静止画1枚から本物の雨を降らせる技術は、思っていたよりずっとシンプルでした。

仕組みの全体像・月120万の内訳・30日手順は有料noteにまとめています。
📕 Claude Code自律環境で、実際どう稼ぐか ― 仕組み・実例・始め方・サポート


Lily（@bokuwalily）― 個人開発者。Claude Code で自動化基盤を組みながら、iOSアプリやWebサービスを量産しています

制作物・記事は bokuwalily.com にまとめています🖥️
AIで「寝てても回る仕組み」を作って月120万にした話は noteの有料記事 に💰
OSS: github.com/bokuwalily 🐙
最新情報・お問い合わせは X @bokuwalily へ🌍

皆さんの ❤️ やシェアが励みになります！
