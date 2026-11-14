---
title: "n8nで「三権分立AIエージェント」を構築したら、寝ている間にバグのないコードが勝手に完成した話 #LLM - Qiita"
source: "Qiita"
url: "https://qiita.com/YushiYamamoto/items/9a53b6f957f809089881"
date: "2026-05"
domain: "other"
tags: ["n8n", "E2B", "三権分立エージェント", "コスト最適化", "DLQ"]
score: 92
core_rule: "実装（Writer）・レビュー（Critic）・サンドボックス実行検証（Judge+E2B）の三権分立ループを組み、修正時はモデル階級分け・Diffのみ伝達・最大リトライ3回制限とDLQ退避を徹底することで、API破産を防ぎながら自律コード生成を成立させる。"
anti_pattern: "全プロンプトにソースコード全量と履歴コンテキストを毎度付与して無限ループさせ、APIコストを暴走させること。"
---

## 1. 解決する課題（Problem）
- 単一LLMによるVibe Codingでは人間がレビューと指示出しのボトルネックになり、さらに複数モデルを無策でループさせるとトークン肥大化で1日約5万円（月150万円ペース）のAPIコストが発生する課題を解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** 自律コーディングループを組む場合 **THEN** Writer（生成）・Critic（エッジケース/セキュリティ攻撃レビュー）・Judge（E2Bサンドボックス実実行＋70点以上判定）の3役を別モデルに分離する。
- **IF** Critic指摘後の微修正ループを回す場合 **THEN** 上位モデルではなく安価な高速モデル（Haiku等）へSwitch Nodeでフォールバックする。
- **IF** 修正プロンプトをWriterへ渡す場合 **THEN** ソースコード全量ではなく直前コードとのDiff（差分）のみを抽出して渡す。
- **IF** リトライ回数 `attempt` が `3` に達した場合 **THEN** ループを強制終了し、ペイロードをDLQ（Dead Letter Queue）へ退避して人間へエスカレーションする。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 1つのLLMに実装と自己レビューの両方を任せてハルシネーションや手抜きを見逃すこと。
- 修正ループのたびに全ソースコードと全会話履歴をプロンプトへ再投入すること。
- リトライ上限（MAX_RETRIES）を設けずAI同士の議論を無限ループさせること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```javascript
// n8n Codeノード：Criticの指摘とDiffの抽出
const prevCode = $('Writer').first().json.code || "";
const currentCode = $('E2B_Test').first().json.current_code || "";
const criticFeedback = $('Critic').first().json.feedback;

const prevLines = prevCode.split('\n');
const currLines = currentCode.split('\n');
const diffSnippet = currLines
  .filter((line, index) => line !== prevLines[index])
  .join('\n');

return [{
  json: {
    system_prompt: "You are resolving a specific bug. Only output the fixed functions.",
    diff_context: diffSnippet,
    critic_notes: criticFeedback,
    attempt_count: $('Retry_Counter').first().json.count || 1
  }
}];
```
