---
title: "Xで話題の、原文を芋づる式にたどるスキル「imozuru」でドメイン知識を仕入れて、普通のAI検索と比べてみた - Qiita"
source: "Qiita"
url: "https://qiita.com/inoyu-qiita/items/4fc91ba7f67d6763960e"
date: "2026-11"
domain: "other"
tags: ["imozuru", "Claude Code", "ドメイン知識", "情報収集", "Agent Skills"]
score: 85
core_rule: "知らない分野の調査時はAIに直接要約させず、専門用語・中心人物・原文（論文や公式資料）を芋づる式に収集してローカルに証跡（map.md/sources等）として残すべきである。"
anti_pattern: "検索上位の要約だけを鵜呑みにし、専門家の判断基準や一次情報の根拠を確認せずに資料作成や実装を進めること。"
---

## 1. 解決する課題（Problem）
- 普通のAI検索では検索上位の要約や一般的な解説しか得られず、専門家の判断基準や一次情報の根拠が不足して信頼性の高い資料に利用できないボトルネックを解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** 1つの事実確認や単発の答えが必要な場合 **THEN** 普通のAI検索を使用する。
- **IF** その界隈の専門用語・判断基準・一次資料（論文や公式ドキュメント）まで深く把握したい場合 **THEN** `imozuru` などのスキルを用いて原文を芋づる式に収集する。
- **IF** 調査を行う場合 **THEN** 要約を行わず `map.md`（論点・用語）、`sources/`（原文）、`log.md`（取得ログ）に証跡を分けて保存する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- AIに自信満々に出力された検索結果の要約をそのまま信頼し、原文の有無や一次情報を確認しないこと。
- 取得失敗した資料（403エラー等）を無視して読んだことにし、推測で回答を組み立てること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```bash
# Claude Codeマーケットプレイスからの追加
/plugin marketplace add MaryCache/imozuru
/plugin install imozuru@imozuru

# skills CLIからの追加
npx skills add MaryCache/imozuru
```
