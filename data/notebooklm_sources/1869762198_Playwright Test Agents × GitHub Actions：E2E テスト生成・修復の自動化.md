---
title: "Playwright Test Agents × GitHub Actions：E2E テスト生成・修復の自動化"
source: "Zenn"
url: "https://zenn.dev/sun_asterisk/articles/e9b50f09839def"
date: "2026-10"
domain: "other"
tags: ["MCP・外部連携", "プログラミング・インフラ", "AI駆動開発", "自動化パイプライン"]
score: 90
core_rule: "E2EテストのAIエージェント（Planner/Generator/Healer）をCIで無人実行する場合、AIの出力を信頼せず、①Healerの変更範囲を既存Page Objectのみに限定しテスト本体の改ざんやskip/fixmeをASTガードで禁止する、②テスト失敗原因を分類しAPIエラーや不整合は即人間にエスカレーションする、③トークン・書込権限を持たないクリーンなverifyジョブで検証しDraft PRで人間レビューを挟む。"
anti_pattern: "公式Healerをそのまま無人実行し、プロダクトのバグに対して期待値を書き換えたりtest.fixme()でスキップさせてテストを通過させること、エージェント実行ジョブで直接検証やマージを行うこと、テスト失敗時にレポートの件数だけを見て終了コードや実行全体のエラーを無視すること。"
---

## 1. 解決する課題（Problem）
- Playwright公式Healerは期待値修正やtest.fixme()によるスキップを行うため、無人実行するとプロダクトのバグをテストの隠蔽でパスさせてしまう
- テストファイルの構文エラーや『No tests found』では失敗テストが0件と集計され、失敗テスト件数のみを監視していると成功と誤判定される
- エージェントに書き込み権限を与えると、作業ディレクトリのスクリプトやnode_modules、ワークフロー自体を改ざんして検証を偽装突破するリスクがある
- HTTPエラーを伴わない要素消失バグ（ボタン消滅等）はロケーターエラーと区別がつかず、別の無関係な要素を指すように書き換えて偽のパスを生む

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```javascript
// scripts/guard.mjs: 役割ごとのファイル変更制限とAST検査
const PATH_RULES = {
  generator: { status: 'A', allowed: [/^specs\/[a-z0-9-]+\.md$/, /^tests\/(?!seed\.spec\.ts$)[a-z0-9/-]+\.spec\.ts$/, /^tests\/pages\/[A-Za-z0-9]+\.ts$/] },
  healer: { status: 'M', allowed: [/^tests\/pages\/[A-Za-z0-9]+\.ts$/] },
};
const BLOCKED_MODIFIERS = new Set(['skip', 'only', 'fixme', 'fail']);
const NODE_BUILTINS = new Set(['fs', 'child_process', 'os', 'net', 'http', 'https', 'dns', 'vm', 'worker_threads', 'process']);
```
