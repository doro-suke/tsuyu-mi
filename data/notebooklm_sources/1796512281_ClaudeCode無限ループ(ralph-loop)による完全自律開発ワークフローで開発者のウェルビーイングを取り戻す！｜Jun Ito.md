---
title: "ClaudeCode無限ループ(ralph-loop)による完全自律開発ワークフローで開発者のウェルビーイングを取り戻す！｜Jun Ito"
source: "note"
url: "https://note.com/jujunjun110/n/n0903bad8b2f2"
date: "2026-11"
domain: "other"
tags: ["AI駆動開発", "ClaudeCode", "AIエージェント", "UI・デザイン"]
score: 92
core_rule: "自律開発ループ（ralph-loop）は「マイルストーン（機能縦割り）> ウェーブ（並列順）> タスク」で分解し、Planner・Builder・Verifierの3エージェント分業とworktree並列化、実ブラウザ動作（動画記録）の完了条件強制で品質を担保する。"
anti_pattern: "モックやスタブによる完了偽装、レイヤー横割り設計（ウォーターフォール）、全体の一括全設計、オーケストレーションスクリプトへの過剰な分岐ロジック記述。"
---

## 1. 解決する課題（Problem）
- 素朴なralph-loop（直列自律ループ）では、LLMが試行錯誤に詰まるとモックやスタブを使ってテストを通し、見かけ上完了扱いにしてしまう。
- セッションごとにテストの書き方や品質のブレが大きく、直列実行のため一定規模のアプリ開発で時間がかかりすぎる。
- 最初にプロジェクト全体を一括設計させると、コンテキスト消費により後半の設計品質が低下し矛盾が発生する。

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```markdown
# ループの流れ（本質を取り出した疑似コード）
milestones = load("milestones.json")

for milestone in milestones.where(done == false):
    # ① Planner: LLM が設計ドキュメントとタスク分割を生成
    if milestone.tasks is empty:
        claude(prompt_planner(milestone.goal))
        # → milestones.json にタスク一覧と plan_doc パスが書き込まれる

    # ② ③ Wave ループ（wave = 依存のないタスク群）
    while has_undone_tasks(milestone):
        wave = next_wave(milestone)            # 同一 wave 番号のタスクは並行実行可能

        # ② Builder: タスクごとに worktree を切って並列実行
        for task in wave (parallel, max=8):
            worktree = git_worktree_create(task.id)
            claude(prompt_builder(task, plan_doc),
                   cwd=worktree)               # worktree 内でコード生成＆コミット

        wait_all()

        # ③ Verifier: コミットのあるブランチをまとめて検証・マージ
        branches = [t.branch for t in wave if has_new_commits(t)]
        claude(prompt_verifier(branches, milestone))
        # → develop へマージ, milestones.json の done フラグ更新
```
