---
title: "ComfyUI × 動画生成AI × Codex で、ゲーム用スプライトアニメを量産するパイプラインを作った話 - Qiita"
source: "Qiita"
url: "https://qiita.com/archeleeds/items/2efad73069b54288deb4"
date: "2026-07"
domain: "video-pipeline"
tags: ["ComfyUI", "Wan2.2", "Codex CLI", "LoRA", "ControlNet"]
score: 92
core_rule: "ゲーム用スプライト自動化では、キャラ同一性をLoRA、ポーズをControlNet、モーションを動画AIで担当させ、非決定的で高価な生成工程と決定的な後処理（透過・正規化）を別ワークフローに分離するべきである。"
anti_pattern: "高価な生成工程と調整用の後処理を同一ワークフローに同居させ、パラメータ調整や再起動で良品画像の再抽選ロスを引き起こすこと。"
---

## 1. 解決する課題（Problem）
- キャラクターアセット（複数モーション・複数フレーム）を従量課金サービスや手動で大量生成する際の、非効率性・デザインの揺れ・コスト増大のボトルネックを解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** 画像生成AIや動画AIでアセットを量産する場合 **THEN** キャラ同一性はプロンプトではなく学習済みLoRAで担保し、ポーズとデザインの役割分離プロンプト（例: ポーズはImage B、デザインはImage A）を適用すること。
- **IF** 生成AIの出力サイズや位置がズレる場合 **THEN** プロンプトで抑制せず、変換後に元フレームとのbbox中心を用いた平行移動やスケール補正を機械的に行うこと。
- **IF** 高コスト・非決定的な生成工程（LLMエージェントによるドット絵変換など）を扱う場合 **THEN** 生成物を必ずディスクへ永続キャッシュし、後処理（透過・正規化・クロップ）とは別ワークフローに分離すること。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 1つの巨大な指示ファイルや単一ワークフローにすべての生成・後処理工程を混在させてキャッシュや実行制御を失うこと。
- 終点指定型（FLF）の動画生成を安易に採用し、終点側の崩壊に起因する全体破綻を招くこと。
- 透過処理にAIセグメンテーション（RMBG系）をそのまま適用し、キャラ内部の白い武器装飾やハイライトまで誤って透過させること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```python
# Codex CLI を ComfyUI ノードとして安全に非対話実行するパターン
cmd = [
    codex, "exec",
    "--skip-git-repo-check", "--ephemeral",
    "-C", work_dir,
    "-s", "workspace-write",
    "-i", image_a_path,
    "-i", image_b_path,
    "-"
]
proc = subprocess.run(
    cmd,
    input=prompt.encode("utf-8"),
    capture_output=True,
    timeout=timeout
)
```
