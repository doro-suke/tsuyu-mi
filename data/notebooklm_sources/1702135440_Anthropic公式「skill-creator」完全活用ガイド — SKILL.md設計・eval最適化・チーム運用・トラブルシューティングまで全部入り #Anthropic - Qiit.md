---
title: "Anthropic公式「skill-creator」完全活用ガイド — SKILL.md設計・eval最適化・チーム運用・トラブルシューティングまで全部入り #Anthropic - Qiita"
source: "Qiita"
url: "https://qiita.com/TaichiEndoh/items/8b8ed06bb76a80bb34c2"
date: "2026-05"
domain: "other"
tags: ["Agent Skills", "skill-creator", "SKILL.md", "Progressive Disclosure", "run_loop.py"]
score: 92
core_rule: "Agent SkillsはProgressive Disclosure（メタデータ約100語常時 → SKILL.md本体500行以内 → リソース必要時読込）で設計し、descriptionはトリガーキーワードと強制表現を明記して run_loop.py のtrain/test評価（60/40分割・最大5反復で80%以上）で最適化する。"
anti_pattern: "曖昧なdescriptionを書いてスキルがundertrigger（未発火）になったり、ネガティブケースや除外条件を定義せず誤トリガーを放置すること。"
---

## 1. 解決する課題（Problem）
- プロンプトの都度コピペやチーム内の依頼方法のばらつき、さらに作成したスキルが呼ばれない（undertrigger）・関係ない場面で誤発火する問題を、Agent Skills標準とeval最適化ループで解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** `SKILL.md` を設計する場合 **THEN** 本体は500行以内に抑え、詳細資料は `references/`、後処理スクリプトは `scripts/`、テンプレートは `assets/` に分離する。
- **IF** YAMLフロントマターの `description` を書く場合 **THEN** スキル概要＋トリガーキーワード3つ以上＋「必ずこのスキルを使うこと」等の強制表現＋除外条件を明記する。
- **IF** スキルのトリガー精度を改善する場合 **THEN** ポジティブ10件以上・ネガティブ5件以上（推奨30件以上）のevalセットを用意し、`scripts/run_loop.py`（60%学習/40%テスト分割・最大5反復）でトリガー率80%以上まで磨く。
- **IF** 外部スキルを導入する場合 **THEN** `SKILL.md`・`scripts/`・画像等の全バンドルファイルを監査し、意図しないネットワーク通信やファイルアクセスがないか確認する。
- **IF** プラットフォーム別に運用する場合 **THEN** Claude.ai（.skill zip）・Claude Code（`~/.claude/skills`）・API（`/v1/skills`）間で自動同期されない点に留意し個別配布する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 控えめで曖昧なdescriptionを書き、Claudeのundertrigger傾向によってスキルが一切呼ばれない状態を放置すること。
- 1つの巨大なSKILL.mdに複雑ワークフローをすべて詰め込み、`agents/` への分割や `references/` 外出しを行わないこと。
- セッション継続中にSKILL.mdを書き換えて即反映されると誤認すること（セッション開始時に読み込まれるため新規セッション開始が必要）。
- 外部から入手したスキルをバンドルファイル監査なしでそのまま実行すること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```yaml
---
name: blog-writer
description: |
  技術ブログ記事を執筆するスキル。ユーザーがブログ記事、技術記事、
  Qiita、Zennについて言及したら必ずこのスキルを使うこと。
  ただし、コードの質問、バグ修正、コードレビューには使わない。
version: 1.0.0
---
```

```bash
# eval最適化ループ（低コストモデルで反復テスト）
python scripts/run_loop.py \
  --skill-dir ./my-skill \
  --eval-file evals.json \
  --max-iterations 3 \
  --delay 2.0 \
  --model claude-haiku-4-5
```
