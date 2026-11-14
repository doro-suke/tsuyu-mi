# テキストから動画まで全部ローカルで繋いだAI動画生成エージェントを作った
- **Source URL**: https://zenn.dev/610birth/articles/51c6ce27e94ff0
- **Score**: 82
- **Suggested Tags**: #AIエージェント, #ComfyUI, #ローカルLLM
- **Processed Date**: 2026/8/16

---

## 本文
TL;DR


自宅PCだけで「テキスト→画像→動画→1本の映像」を全部やるパイプラインを作った話
LM Studio（Qwen3.6-35B）+ A1111 + ComfyUI（Wan2.2）をすべてローカルLAN内で接続
クラウドAPIコスト0円、月額0円で動画生成し放題
ComfyUIのノードID動的解決・Windows PHP exec()問題・ブラウザキャッシュ問題のハマりポイントあり

前編：ローカルLLM + Stable Diffusionで日本語→画像生成エージェントを自作した


 パイプライン全体
ブラウザ (index.php)
    │
    ├─ チャット ─────────────► api
    │   (絵コンテ生成)          │
    │                          LM Studio (Qwen3.6-35B)
    │                          system prompt: 映像ディレクター
    │
    ├─ 画像生成 ─────────────► api/generate_image.php
    │   (キーフレーム)          LM Studio(プロンプト変換) + A1111
    │
    ├─ 動画生成 ─────────────► api/generate_video.php
    │   (i2v)                   ComfyUI (Wan2.2 i2v ワークフロー)
    │
    ├─ ポーリング ───────────► api/check_video.php
    │                           GET /history/{prompt_id}
    │
    ├─ ラストフレーム取得 ───► api/fetch_frame.php
    │                           ComfyUI → uploads/ に保存
    │
    └─ 結合 ─────────────────► api/concat_video.php
                                 ffmpeg -f concat -c copy


 技術スタック



項目
採用




サーバー言語
PHP 8


LLMモデル
Qwen3.6-35B（LM Studio経由、ローカル）


キーフレーム生成
Stable Diffusion WebUI（AUTOMATIC1111）


動画生成
ComfyUI + Wan2.2 Image-to-Video


動画結合
ffmpeg（concat demuxer、-c copy）


ComfyUI連携

/prompt（ジョブ投入）+ /history（完了確認）


フロント
Vanilla JS + CSS3





 実装の詳細

 1. LLMを「映像ディレクター」として定義
chat.phpのsystem promptで絵コンテをJSON形式で返すよう指示。
$systemPrompt = <<<EOT
あなたはプロの映像ディレクターです。
ユーザーが説明した映像のコンセプトに対して、以下のJSON形式で絵コンテを返してください。

{
  "title": "映像タイトル",
  "scenes": [
    {
      "id": "1-1",
      "description": "シーンの日本語説明（ト書き）",
      "prompt": "Wan2.2向け英語プロンプト（動きを具体的に記述）",
      "duration": 5
    }
  ]
}

制約：
- 1シーン = 5秒
- シーンIDは「1-1」「1-2」形式
- promptはWan2.2 i2v向けに動きを英語で具体的に記述
EOT;
フロント側でLLMの返答からJSONブロックを抽出してテーブルに展開。
function extractScenesFromResponse(text) {
    const match = text.match(/```json\n([\s\S]+?)\n```/);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch (e) {
        return null;
    }
}

 2. ComfyUIへのジョブ投入
// api/generate_video.php
function submitToComfyUI(string $imageFilename, string $prompt): string {
    $workflow = json_decode(
        file_get_contents(__DIR__ . '/../workflows/wan22_i2v.json'),
        true
    );

    // ノードIDを動的に解決（後述）
    $imageNodeId  = resolveNodeId($workflow, 'LoadImage',        'Load Keyframe');
    $promptNodeId = resolveNodeId($workflow, 'WanImageToVideo',  'Wan2.2 i2v');

    $workflow[$imageNodeId]['inputs']['image']   = $imageFilename;
    $workflow[$promptNodeId]['inputs']['positive'] = $prompt;

    $payload = json_encode(['prompt' => $workflow]);
    $ch = curl_init('http://192.168.20.12:8188/prompt');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    ]);
    $res  = curl_exec($ch);
    $data = json_decode($res, true);
    return $data['prompt_id'];
}

 3. ComfyUIのノードIDを動的解決する
ComfyUIのワークフローJSONはノードに数値IDが振られている。同じワークフローを別の環境にインポートするとIDが変わるため、ハードコードすると環境依存になる。
// class_type + title でノードを動的に探す
function resolveNodeId(array $workflow, string $classType, string $title): string {
    foreach ($workflow as $nodeId => $node) {
        if (!isset($node['class_type'])) continue;
        if ($node['class_type'] !== $classType) continue;
        if (isset($node['_meta']['title']) && $node['_meta']['title'] === $title) {
            return $nodeId;
        }
    }
    // titleが一致しなくてもclass_typeだけで一意なら返す
    $found = [];
    foreach ($workflow as $nodeId => $node) {
        if (($node['class_type'] ?? '') === $classType) {
            $found[] = $nodeId;
        }
    }
    if (count($found) === 1) return $found[0];
    throw new RuntimeException("Node not found: {$classType} / {$title}");
}

 4. ポーリングで完了を検知
ComfyUIは非同期なので、フロント側でポーリング。
async function pollVideoStatus(promptId, sceneId) {
    const interval = setInterval(async () => {
        const res  = await fetch(`api/check_video.php?prompt_id=${promptId}`);
        const data = await res.json();

        if (data.status === 'done') {
            clearInterval(interval);
            updateSceneVideo(sceneId, data.video_url);
        } else if (data.status === 'error') {
            clearInterval(interval);
            showError(sceneId, data.message);
        }
        // status === 'pending' なら継続ポーリング
    }, 2500);
}
// api/check_video.php
$promptId = $_GET['prompt_id'] ?? '';
$res = file_get_contents("http://192.168.XX.XX:XXXX/history/{$promptId}");
$data = json_decode($res, true);

if (empty($data[$promptId])) {
    echo json_encode(['status' => 'pending']);
    exit;
}

$outputs = $data[$promptId]['outputs'] ?? [];
foreach ($outputs as $nodeOutput) {
    if (!empty($nodeOutput['videos'])) {
        $filename = $nodeOutput['videos'][0]['filename'];
        // ComfyUI output → サーバーのuploads/にダウンロード保存
        $saved = downloadFromComfyUI($filename);
        echo json_encode(['status' => 'done', 'video_url' => '../uploads/' . $saved]);
        exit;
    }
}
echo json_encode(['status' => 'pending']);

 5. ラストフレーム連鎖
動画の最終フレームを次のシーンのキーフレームとして使うことで、シーン間の映像が自然につながる。
// api/fetch_frame.php
// ffmpegでラストフレームを取り出して uploads/ に保存
function extractLastFrame(string $videoPath, string $outputPath): bool {
    $ffmpeg = '/bin/ffmpeg';
    $cmd = win_quote($ffmpeg)
         . ' -sseof -0.1 -i ' . win_quote($videoPath)
         . ' -vframes 1 -q:v 2 '
         . win_quote($outputPath)
         . ' 2>&1';
    exec($cmd, $output, $returnCode);
    return $returnCode === 0;
}
フロント側では「ラストフレームを取得」ボタン → APIが保存したフレーム画像URLを返す → 次のシーンの keyframe に自動セット。

 6. ffmpegによる全シーン結合
// api/concat_video.php
function win_quote(string $str): string {
    return '"' . str_replace('"', '\\"', $str) . '"';
}

// concat用リストファイルを作成
$listContent = '';
foreach ($videos as $videoPath) {
    $absPath = realpath($uploadsDir . DIRECTORY_SEPARATOR . basename($videoPath));
    $listContent .= "file '" . str_replace("'", "'\\''", $absPath) . "'\n";
}
file_put_contents($listFile, $listContent);

// ffmpeg -c copy で再エンコードなし結合
$cmd = win_quote($ffmpeg)
     . ' -y -f concat -safe 0 -i ' . win_quote($listFile)
     . ' -c copy ' . win_quote($outFile)
     . ' 2>&1';
exec($cmd, $output, $returnCode);


 🔴 ComfyUIのノードIDが環境ごとに変わる
前述の resolveNodeId() で対応。class_type + _meta.title での動的解決により、ワークフローJSONをそのまま配布できるようになりました。


 動画生成のコスト感



比較項目
画像生成（A1111）
動画生成（Wan2.2）




生成時間
10〜30秒
2〜5分


VRAM消費
6〜8GB
16GB以上


出力サイズ
1〜5MB
20〜80MB


品質安定性
比較的安定
プロンプト依存でブレる



1シーン5秒の生成が2〜5分かかる。クラウドサービス（RunwayGen-3など）なら即時返却だが月額コストがかかる。ローカル実行は時間をコストに換算する考え方になる。


 まとめ

ComfyUIはノードIDが環境依存なため、class_type+titleで動的解決するのが配布可能なワークフロー実装の定石
Windows PHP環境でのffmpeg呼び出しは**フルパス必須 + win_quote()**でダブルクォートを明示
JS/CSS更新後のキャッシュ問題は**filemtime()クエリパラメータ**で確実に解消できる
ラストフレーム連鎖はi2vの特性（入力画像が動画の出発点）を利用したシーン連続性の確保に有効
ffmpegの -c copy 結合は同一コーデック・解像度が前提だが、速度が桁違いに速い



 参考

ComfyUI

Wan2.2（Wan2.2はWan2.1の後継）
LM Studio
AUTOMATIC1111 / stable-diffusion-webui
