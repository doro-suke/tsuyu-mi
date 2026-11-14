---
title: "もうプロンプトを書くな──「Loop Engineering」という新しいパラダイムの正体"
source: "Zenn"
url: "https://zenn.dev/acrosstudioblog/articles/38509c0473683a"
date: "2026-11"
domain: "other"
tags: ["AI駆動開発", "ClaudeCode", "AIエージェント", "自動化パイプライン"]
score: 90
core_rule: "人間が直接プロンプトを書くのではなく、エージェントを自律稼働させるシステム（目標契約・証拠フィードバック・停止条件・記憶還元）を「Loop Engineering」として設計し、客観的証拠で自律実行させる。"
anti_pattern: "AIの「完了しました」という自己申告（done）を信じて証拠検証を省略すること、および停止条件やコスト上限を決めずにループを放置してComprehension Debt（理解の負債）やCognitive Surrender（認知的降伏）に陥ること。"
---

## 1. 解決する課題（Problem）
- 人間がプロンプトの前に張り付き続けなければならずスケーラビリティに限界がある
- AIが「できました」と自己申告した内容にミスや未達成が潜み、無人ループで検証の死角が生じる
- スムーズに回るループほど自分で書いたコードが理解できなくなる「Comprehension Debt（理解の負債）」や、AIの出力を無批判に受け入れる「Cognitive Surrender（認知的降伏）」に陥る
- 外部記憶がないと毎日のループがコールドスタートになり同じ事故を繰り返す

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```markdown
# .claude/skills/build.md
# Build Skill
- 依存関係インストール: `pnpm install --frozen-lockfile`
- 型チェック: `pnpm typecheck`
- テスト: `pnpm test --coverage`
- 受け入れ基準: カバレッジ80%以上、tsc エラー0件
- 過去の罠: monorepo 内で `npm` を使うと lockfile が壊れる
```
