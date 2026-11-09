# Claude Code エージェント管理を全自動化するパイプラインを作った - Qiita
- **Source URL**: https://qiita.com/noujiru/items/eb346d22aef782ee8619
- **Score**: 92
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #自動化パイプライン
- **Processed Date**: 2026/11/9

---

## 本文
Claude Code エージェント管理を全自動化するパイプラインを作った
Claude Code のエージェント（サブエージェント）管理は、放置するとすぐカオスになる。どれを信頼すればいいかわからない。使用頻度を追っていないから要らないエージェントが残る。チームに配布する仕組みがない。
スキル管理と完全対称な自動化パイプラインを作って全部解決した。発見 → 取り込み → 品質監視 → 使用追跡 → ランク管理 → チーム同期の6段階を紹介する。

TL;DR

エージェントも「スキルと同じ管理基準」を当てはめることで品質が安定する
6本のフックで発見から同期まで全自動化できる
Boris Cherny 式の自己改善ループを組み込むと、Claude が同じミスを繰り返さなくなる



前提：エージェントとは
Claude Code のエージェントは ~/.claude/agents/ に置く Markdown or JSON ファイルだ。Task ツールで呼び出すと、独立したコンテキストで動く専門 Claude として機能する。
---
name: code-reviewer
description: |
  4-pass code review specialist. Use when reviewing PRs or code changes.
  Do not trigger for simple typo fixes.
model: claude-opus-4-6
---
コードレビューのルール...

コードレビュー専門・DB 解析専門・テスト専門など、役割ごとに分けて使う。

問題：手動管理はすぐ限界になる
エージェントが増えると、こんな問題が出てくる。

品質がバラバラ（description が雑なものが混ざる）
使用頻度を追っていないから、使われていないエージェントが残り続ける
チームへの配布が手動で漏れが出る

スキルで同じ問題を乗り越えた経験から、エージェント管理も同じパイプラインで解決できると考えた。

パイプライン全体像
6本のフックで自動化している。
[発見]    agent-discovery.py      ← SessionStart・24h毎
             ↓ GitHub を自動スキャン → agent-queue.md に候補追記
[取り込み] agent-importer スキル   ← 手動トリガー
             ↓ セキュリティ vetting → 品質スコアリング → 最適化
[品質監視] agent-audit-check.py   ← SessionStart
             ↓ 全エージェントをスキャン → 70点未満を通知
[使用追跡] agent-usage-tracker.py ← PostToolUse(Task)
             ↓ agent-usage.jsonl に記録
[ランク管理] update-agent-ranks.py ← SessionStart
             ↓ N → N-C → N-B → N-A → N-S → 30日未使用はパーキング候補
[チーム同期] agent-sync.py         ← PostToolUse(Edit|Write)
             ↓ チームリポジトリに自動 git commit


ステージ 1：発見（agent-discovery.py）
SessionStart フックで1日1回、信頼できる GitHub リポジトリをスキャンする。
# 高信頼度リポジトリ → 自動同期
HIGH_TRUST = ["TrailOfBits", "anthropics"]
# 中信頼度リポジトリ → agent-queue.md に候補追記（人間が判断）
MEDIUM_TRUST = ["community-repo-1", "community-repo-2"]

新着エージェントが見つかると agent-queue.md に追記される。毎朝セッションを開いたときに「新着候補 N件」と通知が来る仕組みだ。
信頼度によって「自動インストール」か「確認してからインストール」かを分けている。全部自動は怖い。

ステージ 2：取り込み（agent-importer スキル）
/agent-scout または agent-importer スキルで取り込む。8点のセキュリティチェックが走る。



チェック項目
判定




プロンプトインジェクション疑惑
CRITICAL


外部 URL へのデータ送信
CRITICAL


危険コマンド（rm -rf 等）
HIGH


過度な権限要求
HIGH


description の品質
INFO



CRITICAL が1つでもあればインストールをブロックする。コミュニティスキルを何も考えずに入れると、プロンプトインジェクション付きのスキルを踏む可能性がある。実際に事後監査をしたときに数件引っかかった。
取り込み後は自動で品質スコアリングと日本語最適化（description の翻訳）をかけている。

ステージ 3：品質監視（agent-audit-check.py）
SessionStart で全エージェントのスコアを計算する。100点満点の基準はこれ。



項目
点




name + description 存在
20


"Use when" 記載
25


"Do not trigger" 記載
20


model 設定あり
20


isolation: worktree 設定
15



70点未満が出ると SessionStart 時に通知が来る。最初は 139体中 6体しか 70点を超えていなかった。fix_agents.py で一括補完して、現在は全 139体が 100点満点になっている。

ステージ 4：使用追跡（agent-usage-tracker.py）
PostToolUse(Task) フックで Task ツールの呼び出しを検知して記録する。
{"agent": "code-reviewer", "timestamp": "2026-03-02T10:30:00", "task_summary": "PR #42 review"}
{"agent": "test-engineer", "timestamp": "2026-03-02T11:15:00", "task_summary": "unit tests for auth"}

~/.claude/debug/agent-usage.jsonl に蓄積される。これがランク管理の入力になる。

ステージ 5：ランク管理（update-agent-ranks.py）
使用回数に応じてランクを計算する。スキルと同じ5段階だ。



ランク
使用回数
説明




N
0回
未使用


N-C
1〜4回
使い始め


N-B
5〜9回
定着中


N-A
10〜19回
主力


N-S
20回以上
エース



30日間未使用のエージェントはパーキング候補として通知される。使われていないエージェントが自然に見えてくる仕組みだ。

ステージ 6：チーム同期（agent-sync.py）
PostToolUse(Edit|Write) フックで ~/.claude/agents/ の変更を検知して、チームリポジトリに自動で git commit する。
# 自動で走るコミット例
git add agents/code-reviewer.md
git commit -m "エージェント更新: code-reviewer v2"

チームメンバーが git pull && ./setup.sh するだけで同じエージェント構成になる。手動での同期ミスが完全になくなった。

Boris Cherny 式の自己改善ループ
Claude Code の生みの親・Boris Cherny 氏が公開している CLAUDE.md の知見を参考に、自己改善ループを実装した。
ユーザーから修正・指摘を受ける
   ↓
lessons-recorder.py がキーワードを検知
   ↓
tasks/lessons.md にパターンを記録
   ↓
次の SessionStart でコンテキストに自動注入
   ↓
同じミスを繰り返さない

lessons-recorder.py は UserPromptSubmit フックで動く。「違う」「修正して」「ちがう」などのキーワードを検知したら、Claude 自身に「この修正を lessons.md に記録して」と指示を出す。
実際に3週間使っていると、最初は週に2〜3件記録されていたが、今は0〜1件になってきた。同じ指摘が減っているのが体感でわかる。

SessionStart の8段階
全部合わせると、セッション開始時にこれだけ走る。
1. project-skill-preset.py    ← プロジェクト固有スキルの有効化
2. update-skill-ranks.py      ← スキルのランク計算
3. workflow-audit.py          ← CLAUDE.md のワークフロー整合性チェック
4. env-orchestrator.py        ← ポリシー判定エンジン
5. agent-audit-check.py       ← エージェント品質チェック ←【今回追加】
6. update-agent-ranks.py      ← エージェントのランク計算 ←【今回追加】
7. agent-discovery.py         ← 新着エージェントのスキャン ←【今回追加】
8. session-start-context.sh   ← 環境サマリー表示

追加した3ステップのおかげで、毎朝「エージェントの状態が可視化された状態」でセッションを始められるようになった。

現在の状態



項目
数値




管理エージェント数
14体


品質スコア
全件 100/100 ✅


セキュリティ vetting
全件クリア ✅


主力エージェント（N-A以上）
5体


30日未使用（パーキング候補）
2体





まとめ
エージェント管理をスキル管理と同じ基準・同じパイプラインに乗せると、一気に整理される。


発見: GitHub を自動スキャンして候補を収集

取り込み: セキュリティ vetting → 品質スコアリング → 最適化

品質監視: SessionStart で全件チェック → 低品質を即通知

使用追跡: jsonl に記録 → ランク計算の入力に

ランク管理: 30日未使用は自動でパーキング候補に

チーム同期: 変更を即 git commit → pull するだけで全員同じ環境

一番効いたのは Boris Cherny 式の自己改善ループだ。Claude が自分のミスパターンを記録して、次のセッションから同じ間違いをしなくなる。これだけで作業のストレスがかなり減った。
