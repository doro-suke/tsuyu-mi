---
title: "Claude Code「ralph-loop」解説｜hirokaji"
source: "note"
url: "https://note.com/tasty_dunlin998/n/n411f62ec3c26"
date: "2026-10"
domain: "other"
tags: ["ClaudeCode", "AI駆動開発", "AIエージェント", "プログラミング・インフラ"]
score: 90
core_rule: "ralph-loopでは、Claude CodeのStop hookによる自律反復を安全に回すため、必ずコスト安全弁として `--max-iterations` を小さく（5〜10回程度）設定し、完了判定の `--completion-promise` には『用途+日付+乱数』を組み合わせたユニークな長文トークンを指定して『成功条件を満たした最終行のみに出力する』ルールを厳格に指示する。"
anti_pattern: "completion-promiseに『DONE』『完了』などの短い一般的な語句を使うこと（ログや途中出力への混入で誤停止、または一致せず無限ループ）、max-iterationsを設定しない／過大にすること、『いい感じにして』といった主観的で収束しない曖昧なタスクをループさせること、Windowsネイティブ環境でbash前提スクリプトを動かすこと。"
---

## 1. 解決する課題（Problem）
- Claude Codeは通常1回の指示・実行で終了してしまい、lintエラーゼロやテスト合格まで自律的に収束させることが難しい
- Stop hookを用いたループで完了判定（completion-promise）の設計が甘いと、途中ログ混入による誤停止や一致失敗による無限ループ（コスト爆発）が起きる
- Windowsでの/bin/bash不在やmacOS zshのパースエラー、Stop hook常時発火によるレスポンス低下など環境起因のトラブルが発生する

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```bash
/ralph-loop "
あなたのタスク:
- 対象: src/utils 以下
- 目的: ESLint エラーを 0 にする（挙動変更なし）

手順:
- npm run lint を実行してエラーを確認
- エラーを修正
- 再度 npm run lint を実行して確認

成功条件:
- npm run lint がエラー0
- 変更差分を要約

出力ルール:
- 最終行にだけ <promise>RALPH_DONE__LINT__20260123__X9Q</promise> を出力
- それ以外（途中経過・引用・コード・ログ）にはこの文字列を絶対に含めない
" --max-iterations 8 --completion-promise "RALPH_DONE__LINT__20260123__X9Q"
```
