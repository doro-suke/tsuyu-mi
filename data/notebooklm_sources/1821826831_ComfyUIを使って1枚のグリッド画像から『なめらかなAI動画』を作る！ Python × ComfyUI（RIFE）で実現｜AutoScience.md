# ComfyUIを使って1枚のグリッド画像から『なめらかなAI動画』を作る！ Python × ComfyUI（RIFE）で実現｜AutoScience
- **Source URL**: https://note.com/auto_science/n/n1f971a30c744
- **Score**: 82
- **Suggested Tags**: #ComfyUI, #Python, #自動化パイプライン
- **Processed Date**: 2026/8/26

---

## 本文
Stable DiffusionやNovelAIなどの画像生成AIで「動きのつながった連続画像」を出力するとき、4×4のグリッド画像（スプライトシート）にまとめて出力する手法がよく使われます。しかしこのグリッド画像から動画を作ろうとすると、すぐに2つの技術的な壁にぶつかります。1. 白枠ノイズ（チカチカ）が発生するグリッドの境界線を単純なピクセル等分割で切り出すと、割り切れなかった端数や境界の白い線が少しだけ映り込んでしまいます。動画にしたとき、キャラの端がチカチカと光るノイズになります。2. コマ数が少なくてカクカクする4×4グリッドから切り出せるのはわずか16枚。普通に再生すると、パラパラ漫画のようにぎこちない動きになってしまいます。解決方法本記事では、この2大問題をプログラミング（Python + NumPy + Pillow + FFmpeg + ComfyUI API）で解決し、1枚のグリッド画像から自動で滑らかな30fps動画を書き出すパイプラインの仕組みを、実際のコードを交えて解説します。動作確認環境| 項目 | バージョン / 環境 ||------|--------------|| OS | Ubuntu 22.04（WSL2） || Python | 3.13 || ライブラリ | Pillow, NumPy, requests, subprocess（標準） || 外部ツール | FFmpeg, ComfyUI（Windows側） || AIモデル | RIFE 4.7（`rife47.pth`） |💡 制作を通じて気づいたこと詳細に入る前に、今回の取り組みで改めて実感したのは、、「アニメつくるの、めちゃくちゃ大変💦」普段何気なく見ているアニメですが、いざ作ろうとすると、画像の連続性だったり、それらの接続（アニメ化）だったり、全然上手くいきませんでした。自分のやり方が悪いだけかもしれませんが、AIやAI自動化で行うのはかなり大変ですね。。。ちなみに、グリッド画像生成はComfyUIでは連続性がうまく出せず、結局nanobananaを使いました。画像の接続だけComfyUIを使ってます。そして、「アニメ制作に携わっている方々は、本当にすごいですね！！」昔からアニメ見て育った人間としては、頭が上がりません。それでは本題のプログラム的なお話です。パイプラインの全体フロー本パイプラインは4つのステップで構成されています。【画像処理】 NumPyで被写体を検出し、Pillowで精密クロップ　　　　（画像境界の白枠などを可能な限り除去）【動画化】 FFmpegによる10fpsベース動画の作成＋暗転用黒ベタ挿入【AI補完】 WSL2からWindows上のComfyUI APIへRIFE 4倍補完を依頼【自動化】 APIの進捗監視とローカルへの自動ダウンロード次から、各ステップの具体的なコードと技術的な仕組みを説明します。共通設定値各ステップで共通して使用する定数をあらかじめまとめておきます。# ---- 出力サイズ・アスペクト比 ----
TARGET_W      = 688                      # 出力動画の幅（px）
TARGET_H      = 384                      # 出力動画の高さ（px）
TARGET_ASPECT = TARGET_W / TARGET_H      # ≈ 1.792（16:9 に近い値）

# ---- フレームレート ----
FPS = 10  # ベース動画のフレームレート（RIFE補完前）

# ---- ComfyUI への接続先 ----
# WSL2 環境からは Windows ホストの IP（通常 172.x.x.x）でアクセスする
# 実際の IP は `ip route show | grep default` で確認してください
base_url = "http://172.x.x.x:8188"

# ---- 出力ファイルパス ----
output_final = "/home/user/output/final.mp4"  # 完成動画の保存先（WSL内）💡 `base_url` について：WSL2 からは `localhost` ではなく Windows ホスト側の IP アドレスを使って ComfyUI にアクセスします。`ip route show | grep default` コマンドで表示されるアドレスに書き換えてください。STEP 1：NumPyで被写体を検出し、Pillowで精密クロップ等分割による白枠の映り込みを防ぐため、単純なピクセル分割ではなく「キャラクターの位置を検出して、その中心から安全マージンを取って切り出す」アプローチをとります。1-1. `get_content_bbox` による被写体範囲の自動特定キャラクターの背景が「白（または明るい色）」であることを利用して、キャラクターが存在する正確な範囲（バウンディングボックス）をNumPyで計算します。def get_content_bbox(image, threshold=240):
    """背景の白を無視してキャラクターの範囲（Bounding Box）を特定する"""
    # 1. 画像をモノクロ（グレースケール）に変換してNumPy配列化
    arr = np.array(image.convert('L'))
    
    # 2. 閾値より暗いピクセル（キャラクター部分）をTrueとするマスクを作成
    mask = arr < threshold
    
    # 3. True（キャラクター部分）のインデックス（Y座標, X座標）をすべて抽出
    coords = np.argwhere(mask)
    
    if coords.size > 0:
        # 4. Y, Xそれぞれの最小値と最大値から、被写体を囲む外枠を特定
        top, left = coords.min(axis=0)
        bottom, right = coords.max(axis=0)
        return (left, top, right, bottom)
    
    return None💡 コードの技術解説`image.convert('L')`：画像を輝度（モノクロ）情報に変換します。各ピクセルは `0`（黒）〜 `255`（白）の値になります。`arr < threshold`（デフォルト `240`）：背景の白やグリッド線は `240〜255` という高い値を持ちます。キャラクターが描かれた領域はそれより暗いため `240` 未満になります。この条件式で「キャラクター部分だけが `True`、白背景が `False`」のマスク画像がNumPy配列上に生成されます。`np.argwhere(mask)`：マスクの中で `True` になっているすべてのピクセルの座標（行=Y, 列=X）を配列として取得します。`coords.min(axis=0)` / `max(axis=0)`：全座標の中から、一番上（Y最小）・一番左（X最小）・一番下（Y最大）・一番右（X最大）を1行で一気に計算します。これがキャラクターを囲む四角形（バウンディングボックス）になります。1-2. 安全マージンを加味した16:9クロップ割り出した被写体の中心位置から、動画用の画角（16:9）に補正して切り出します。ここではPillowを活用しています。# 1. 理論的なセル（4x4の1マス分）を切り出し
grid_w, grid_h = w / 4, h / 4
l, t, r, b = int(col*grid_w), int(row*grid_h), int((col+1)*grid_w), int((row+1)*grid_h)
cell = img.crop((l, t, r, b))

# 2. セル内でキャラクターの範囲を特定
bbox = get_content_bbox(cell)
if bbox:
    c_l, c_t, c_r, c_b = bbox
    center_x, center_y = (c_l + c_r) / 2, (c_t + c_b) / 2
    
    # 被写体が収まるサイズに15%の余白（安全マージン）を足す
    extract_w = (c_r - c_l) * 1.15
    extract_h = (c_b - c_t) * 1.15
    
    # 画角（16:9）に合わせて縦横比を補正
    if extract_w / extract_h > TARGET_ASPECT:
        extract_h = extract_w / TARGET_ASPECT
    else:
        extract_w = extract_h * TARGET_ASPECT
    
    # グリッドの白境界線に絶対に触れないよう、内側に「2pxのガード」を設ける
    crop_coords = (
        max(2, center_x - extract_w/2),
        max(2, center_y - extract_h/2),
        min(cell.size[0]-2, center_x + extract_w/2),
        min(cell.size[1]-2, center_y + extract_h/2)
    )
    final_crop = cell.crop(crop_coords)💡 コードの技術解説`TARGET_ASPECT`（≈ 1.792）：出力サイズ `688 ÷ 384` から算出した横縦比です。被写体の縦横どちらが大きくても、この比率に合わせて切り出し範囲を補正します。`extract_w = (c_r - c_l) * 1.15`：被写体ギリギリで切り出すと窮屈な絵面になるため、左右上下に15%の余白を持たせて自然な構図にします。`max(2, ...)` / `min(cell.size[0]-2, ...)`：セルの最外周（0ピクセル目や `width` ピクセル目）には、グリッド画像自体の境界白線が走っています。切り出し座標がここに触れると動画の端に白いノイズになってしまいます。そのため、切り出し座標がセルの端から「必ず2px以上内側」に収まるよう制限をかけることで、白枠を可能な限り除去しています。STEP 2：FFmpegによる10fpsベース動画の作成切り出した16枚のフレーム画像（`frame_001.png`〜`frame_016.png`）をFFmpegで結合し、一旦カクカクした状態の動画を作ります。この動画が、次のAI補完のインプットになります。2-1. ベース動画の生成def build_base_video(frames_dir, output_video):
    """FFmpegで10fpsのベース動画を作成"""
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),                 # 1秒間に何フレーム進めるか (10)
        "-i", f"{frames_dir}/frame_%03d.png",   # 入力ファイルのパターン
        "-c:v", "libx264",                      # H.264でエンコード
        "-pix_fmt", "yuv420p",                  # ピクセルフォーマットの指定
        output_video
    ]
    subprocess.run(cmd, check=True)💡 コードの技術解説`-framerate 10`：1秒あたり10フレームで動画を作成します。16枚の画像があるため、約1.6秒のカクカクした短い動画ができあがります。`-pix_fmt yuv420p`：これは超重要な設定です。FFmpegのデフォルトでは元のPNGの品質に合わせて `yuv444p` などで出力されることがあります。しかし一般的なスマホやブラウザ、多くのAIツールは `yuv420p`（4:2:0クロマサブサンプリング）形式でないとデコードエラーを起こす場合があります。どんな環境でも確実に再生できるよう、この設定を明示しています。2-2. 【応用】黒ベタフレームの挿入によるシーン切り替えこの節は、複数のカットをつなぐ場合や、ループの切れ目に自然な暗転を入れたいときに有効な追加テクニックです。単一のアニメーションループであればスキップしてかまいません。RIFEは非常に優秀なフレーム補完モデルですが、全く異なる絵柄のフレームを直接つなごうとすると、顔や背景が不自然にモーフィングしてしまいます。そこで「黒ベタ画像を2枚差し込む」という解決策が有効です。RIFEに「ここで場面が切り替わる」という文脈を与えることで、フレーム補完がモーフィングではなく自然な暗転として処理されます。import glob
import os
from PIL import Image

def insert_black_frames(frames_dir, insert_after, count=2):
    """
    指定フレームの直後に黒ベタ画像を挿入する。

    Args:
        frames_dir  : フレーム画像が格納されたディレクトリ
        insert_after: 挿入位置（このフレーム番号の「後」に黒を差し込む）
        count       : 挿入する黒フレームの枚数（デフォルト2枚）
    """
    # 1. 後ろ側のフレームを後ろから連番リネーム（番号がズレないよう後ろから処理）
    all_frames = sorted(glob.glob(f"{frames_dir}/frame_*.png"), reverse=True)
    for frame_path in all_frames:
        # "frame_016.png" → 16 を取り出す
        num = int(os.path.splitext(os.path.basename(frame_path))[0].split("_")[1])
        if num > insert_after:
            new_path = f"{frames_dir}/frame_{num + count:03d}.png"
            os.rename(frame_path, new_path)

    # 2. 黒フレームを生成して挿入位置に配置
    sample = Image.open(f"{frames_dir}/frame_001.png")
    black  = Image.new("RGB", sample.size, (0, 0, 0))
    for j in range(count):
        black.save(f"{frames_dir}/frame_{insert_after + 1 + j:03d}.png")

# 使用例：16枚目（最終フレーム）の後に黒ベタを2枚追加
insert_black_frames("frames", insert_after=16, count=2)💡 コードの技術解説後ろから処理する理由：ファイルをリネームする際、前から順に処理すると「`frame_017.png` にリネームしようとしたら既にそのファイルが存在する」という衝突が起きます。後ろから処理することでこの問題を回避しています。黒を2枚にする理由：RIFEの4倍補完では2フレーム間に3枚の中間フレームが生成されます。黒が1枚だけだと、中間フレームの影響でじわじわとフェードするような補完になってしまいます。2枚以上にして暗部を安定させることで、スパッと切れるような自然な暗転が実現します。STEP 3：ComfyUI APIを叩いて「RIFE 4倍AI補完」を実行WSL（Linux環境）で作成したベース動画を、Windowsホスト側で稼働している「ComfyUI」のAPIへ渡し、AIによる高精度な中間フレーム生成（RIFE補完）を行います。ライブラリの使い分けについて：このステップでは `urllib`（Python標準）と `requests`（外部ライブラリ）の両方を使用しています。ファイルアップロードのマルチパート組み立ては標準ライブラリのみで実装し、ワークフローの送信・完了確認などJSON を扱う API 呼び出しには可読性の高い `requests` を使用する方針です。3-1. Windows側のComfyUIへ動画をアップロードdef upload_file(file_path, server_url):
    """マルチパートフォームデータとして動画ファイルをComfyUIのinputフォルダにアップロードする"""
    import random
    import string
    
    # 1. 境界文字列（boundary）をランダム生成して定義
    boundary = '----WebKitFormBoundary' + ''.join(random.sample(string.ascii_letters + string.digits, 16))
    parts = []
    
    # 2. HTTP POSTに必要なマルチパートの構造を組み立てる
    parts.append('--' + boundary)
    parts.append('Content-Disposition: form-data; name="image"; filename="{}"'.format(os.path.basename(file_path)))
    parts.append('Content-Type: video/mp4')
    parts.append('')
    with open(file_path, 'rb') as f:
        parts.append(f.read())
    parts.append('--' + boundary + '--')
    parts.append('')
    
    # 3. バイト列に結合
    body = b''
    for part in parts:
        if isinstance(part, bytes):
            body += part + b'\r\n'
        else:
            body += part.encode('utf-8') + b'\r\n'
            
    headers = {
        'Content-Type': 'multipart/form-data; boundary={}'.format(boundary),
        'Content-Length': str(len(body))
    }
    
    # 4. HTTPリクエストを送信してレスポンスをJSONとして受け取る
    req = urllib.request.Request(f"{server_url}/upload/image", data=body, headers=headers)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))💡 コードの技術解説`multipart/form-data` の手動構築：Pythonの標準ライブラリ（`urllib`）のみでファイルをアップロードするために、ブラウザが送信する形式と同じマルチパートデータをバイト単位で正確に組み立てています。ComfyUIの `/upload/image` エンドポイントへ動画を投げると、ComfyUIの作業フォルダ内にある `input` ディレクトリに動画が格納され、ワークフローから名前で指定できるようになります。アップロードが成功すると、レスポンスのJSONに `{ "name": "base_video.mp4", ... }` 形式でサーバー上のファイル名が返ってきます。これを次の工程で `uploaded_name` として使用します。upload_result = upload_file(base_video_path, base_url)
uploaded_name  = upload_result["name"]  # サーバー上のファイル名を取り出す3-2. RIFE補完ワークフローのJSON定義と送信アップロードした動画をもとに、ComfyUIで「動画読み込み → RIFE補完 → 動画保存」を行うカスタムワークフローを定義し、APIへ送信します。workflow = {
    # 1. ビデオ読み込みノード (VHS_LoadVideo)
    "1": {
        "inputs": {
            "video": uploaded_name,             # アップロードされた動画のファイル名
            "force_size": "Custom",
            "custom_width": TARGET_W,           # 688
            "custom_height": TARGET_H,          # 384
            "frame_load_cap": 0,                # 0 = 全フレームを読み込む
            "skip_first_frames": 0,
            "select_every_nth": 1
        },
        "class_type": "VHS_LoadVideo"
    },
    # 2. RIFEフレーム補完ノード (RIFE VFI)
    "2": {
        "inputs": {
            "ckpt_name": "rife47.pth",           # 補完に使用するモデルのチェックポイント
            "clear_cache_after_n_frames": 10,
            "multiplier": 4,                    # 4倍（コマ数を4倍に増やす）
            "fast_mode": True,
            "ensemble": True,
            "scale_factor": 1.0,
            "frames": ["1", 0]                  # LoadVideoノード(1)の出力を入力とする
        },
        "class_type": "RIFE VFI"
    },
    # 3. ビデオ結合・書き出しノード (VHS_VideoCombine)
    "3": {
        "inputs": {
            "images": ["2", 0],                 # RIFEノード(2)の出力を入力とする
            "frame_rate": 30,                   # 完成動画のフレームレートを30fpsに
            "format": "video/h264-mp4",
            "pix_fmt": "yuv420p",
            "crf": 18,                          # 画質（値が小さいほど高画質）
            "save_output": True,
            "filename_prefix": "aki_final"
        },
        "class_type": "VHS_VideoCombine"
    }
}

# APIにワークフローを送信
res_raw = requests.post(f"{base_url}/prompt", data=json.dumps({"prompt": workflow}).encode('utf-8'))
res = res_raw.json()
prompt_id = res["prompt_id"]💡 コードの技術解説`"multiplier": 4`：元動画のフレームとフレームの間に、AIが推測した「滑らかに変化する中間フレーム」を3枚ずつ生成して挿入します。元の16フレームが自動的に64フレームへ拡張されます。なお、入力は10fps・約1.6秒ですが、出力は64フレーム ÷ 30fps ≈ 約2.1秒になります。フレーム数と出力fpsの違いによる自然な尺の変化で、アニメーションの動き自体はRIFEが滑らかに補間するため破綻はありません。正確に1.6秒に揃えたい場合は `frame_rate` を `40`（64 ÷ 1.6）に設定してください。`"ckpt_name": "rife47.pth"`：動画のフレーム補完に特化したAIモデル「RIFE（Real-Time Intermediate Flow Estimation）4.7」を指定しています。動きベクトルを予測し、アニメ調の絵でも破綻しにくいのが特徴です。ノードの接続 `["2", 0]`：ComfyUI APIにおけるノード間の接続方法です。「ノードID『2』の『0』番目の出力ピン」を入力として接続するという指定になっています。STEP 4：進捗監視とローカルへの自動ダウンロードAIによる補完処理は重いため、完了まで数秒から数十秒かかります。スクリプト側で処理完了を監視（ポーリング）し、できあがった動画をローカルにダウンロードしてパイプラインを締めくくります。print(f"Waiting for AI interpolation (ID: {prompt_id})...")

MAX_WAIT_SECONDS = 600  # タイムアウトまでの最大待機時間（秒）
interval         = 5    # ポーリング間隔（秒）
elapsed          = 0

while elapsed < MAX_WAIT_SECONDS:
    time.sleep(interval)
    elapsed += interval

    # ComfyUIの履歴（history）を取得
    history = requests.get(f"{base_url}/history").json()

    # 自分が送信したタスクIDが履歴（完了リスト）に存在するかチェック
    if prompt_id in history:
        # 保存完了したノード(3)の出力ファイル名を取得
        # ※ ComfyUI API の仕様上、動画を含む全映像出力は "gifs" キーで統一されている
        out = history[prompt_id]["outputs"]["3"]["gifs"][0]["filename"]

        # サーバーからファイルをダウンロードしてローカルパスに保存
        urllib.request.urlretrieve(f"{base_url}/view?filename={out}&type=output", output_final)
        print(f"\n[Success] Final video ready at: {output_final}")
        break

    print(".", end="", flush=True)

else:
    print(f"\n[Error] Timeout: {MAX_WAIT_SECONDS}秒経過しても処理が完了しませんでした。")
    print("ComfyUI 側でエラーが発生していないか確認してください（GPUメモリ不足・モデルファイル未配置など）。")💡 コードの技術解説`/history` エンドポイントの監視（ポーリング）：ComfyUI APIは非同期設計です。処理を依頼（POST）すると即座に `prompt_id` が返ってきますが、処理そのものは裏でキューに入ります。そのため5秒ごとに `/history` にアクセスし、「自分のタスクが完了リストに入ったか」を確認しています。タイムアウト処理：ComfyUI 側でエラーが発生した場合（GPUメモリ不足、モデルファイル未配置など）、ジョブは永遠に完了しません。`elapsed` で経過時間を管理し、上限（600秒）を超えたら `else` 節でエラーメッセージを出して終了します。`"gifs"` キーについて：MP4 を出力しているにもかかわらず `"gifs"` というキーでアクセスしているのは、ComfyUI API の仕様によるものです。内部的に動画・GIF を問わず映像系の出力はすべて `"gifs"` キーに格納されます。誤字ではなく仕様なので、そのまま使用してください。`/view` エンドポイントからのファイル取得：処理が終わると、履歴の中に生成されたファイル名が格納されます。それを利用してComfyUIサーバーから完成した動画バイナリを取得し、ローカル（WSL内）に保存します。まとめ：このパイプラインがもたらす効果このスクリプトを使うことで、以下のすべてのプロセスがコマンド一発で完了するようになります。コマ画像が持つ「白枠」のギリギリ内側を自動検出＆除去FFmpegが一瞬でパラパラ漫画動画を作成ComfyUIにデータを転送し、AIフレーム補完を実施完成した「なめらかな30fps動画」が自動的に手元に戻ってくるRIFEは非常に優秀なフレーム補完モデルですが、全く異なるシーンをそのまま繋ごうとすると、顔や背景が不自然にモーフィングしてしまいます。STEP 2-2 で紹介した「黒ベタ画像を2枚挿入する」アプローチは、一見アナログな解決策ですが、これが非常に有効でした。AIに「ここで場面が切り替わる」という文脈を与えることで、自然な暗転として補完させることができたのです。これはアニメ制作における「カッティング」の重要性と、AIの特性が絶妙にマッチした好例だと感じています。AIイラスト・AIアニメーションに興味があるけどどうやったらいいか分からない方は、ぜひ試してみてください！nanobananaで作成したグリッド画像これを分割してつなげてつくった動画
