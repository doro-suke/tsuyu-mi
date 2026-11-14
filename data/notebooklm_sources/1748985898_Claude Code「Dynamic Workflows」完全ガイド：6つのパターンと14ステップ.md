---
title: "Claude Code「Dynamic Workflows」完全ガイド：6つのパターンと14ステップ"
source: "Zenn"
url: "https://zenn.dev/aria3/articles/claude-code-dynamic-workflows-6-patterns"
date: "2026-06"
domain: "other"
tags: ["Dynamic Workflows", "parallel()", "pipeline()", "Adversarial verification", "Quarantine"]
score: 92
core_rule: "単一コンテキストで起きる3つの失敗（怠慢・自己優先バイアス・目標ドリフト）を防ぐため、失敗モードに合わせて6パターン（Classify-and-act / Fan-out / Adversarial verification / Generate-and-filter / Tournament / Loop until done）を選び、/goal と明示トークン予算を付与してオーケストレーションする。"
anti_pattern: "5分で終わる通常タスクにワークフローを使ったり、トークン予算や /goal なし・作業者と検証者を同一コンテキストで走らせたり、信頼できない外部入力を高権限エージェントに直接読ませること。"
---

## 1. 解決する課題（Problem）
- 長時間稼働・大規模並列・敵対的検証が必要なタスクで単一Claudeセッションが崩壊する（途中放棄・自己甘口採点・制約忘却）課題を構造的に解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** 次のステージ前に全アイテムの結果集約や重複除去が必要な場合 **THEN** バリア同期の `parallel()` を使い、各アイテムが独立して後続ステージへ進める場合 **THEN** コスト・スループットに優れる `pipeline()` を使う。
- **IF** 自己優先バイアス（Self-preferential bias）を排除したい場合 **THEN** 作成者と検証者を別コンテキストに分離し、検証者には誰が作ったかを知らせずルーブリックと成果物だけを渡す（Adversarial verification）。
- **IF** 1,000件等の順位付けや停止時期不明の探索を行う場合 **THEN** 絶対スコアではなくペアワイズ比較の `Tournament`、または停止条件＋`/goal` をコードで制御する `Loop until done` を使う。
- **IF** ユーザー投稿やスクレイピング等の信頼できない入力を扱う場合 **THEN** 読み取り専用のリーダーエージェントに隔離（Quarantine）し、高権限アクションは生データに触れない別エージェントに実行させる。
- **IF** ワークフローを起動する場合 **THEN** プロンプトに明示的なトークン予算（例: `5kトークン使って`）を指定し、有効だったものは `~/.claude/workflows` に保存してSkill内でテンプレートとして再利用する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 従来の短いコーディングタスクに過剰なマルチエージェントワークフローを使うこと。
- トークン上限や `/goal` を指定せず、期待値の5〜10倍の消費や早期ソフト終了を起こすこと。
- `parallel()` と `pipeline()` を区別なく混同すること。
- 1,000件の並び替えを1プロンプトの絶対スコアで実行させること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```javascript
// Fan-out-and-synthesize 例 (Haikuで並列レビュー → Opusで統合)
const reviews = await parallel(
  files.map(file => () => agent(`${file}のセキュリティ問題をレビューして`, { model: "haiku", schema: IssueList }))
);
const report = await agent(`優先度付きレポートに統合:
${JSON.stringify(reviews)}`, { model: "opus" });
```
