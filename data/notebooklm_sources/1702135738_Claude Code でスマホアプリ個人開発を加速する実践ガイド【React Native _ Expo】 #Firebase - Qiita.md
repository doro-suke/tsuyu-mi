---
title: "Claude Code でスマホアプリ個人開発を加速する実践ガイド【React Native / Expo】 #Firebase - Qiita"
source: "Qiita"
url: "https://qiita.com/similarmetal/items/9847e0b0b85024a29179"
date: "2026-05"
domain: "other"
tags: ["React Native", "Expo", "Firebase", "tasks/", "Development Build"]
score: 92
core_rule: "CLAUDE.mdにディレクトリ配置・セキュリティ厳禁事項を定義し、tasks/ フォルダのタスクファイル（status: pending/done）と .claude/commands/ でセッション跨ぎの自律実行を回しつつ、ネイティブ実装は最初からExpo GoではなくDevelopment Buildで行う。"
anti_pattern: "セキュリティ制約をCLAUDE.mdに書かずAIにクライアント直接Firestore書き込みを許したり、ネイティブモジュール開発でExpo Goを使い続けたり、EAS BuildをJS変更ごとに無駄打ちすること。"
---

## 1. 解決する課題（Problem）
- 長期開発でセッションを跨ぐと文脈と進捗がリセットされる問題、および React Native + Expo + Firebase 環境特有のクラッシュやビルド制限による手戻りを解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** セッションを跨ぐ長期開発を行う場合 **THEN** `tasks/phX/TXXX.md` にタスク単位の仕様と `status: pending/done` を定義し、起動時に未完了先頭タスクを自動検知・更新させる。
- **IF** セキュリティやファイル配置の一貫性を守りたい場合 **THEN** `CLAUDE.md` に配置表と禁止事項（API Key直書き・クライアントからの直接Firestore書込・`any` 型）を明記し、`.claude/commands/` に `gen-hook` や `review-security` を置く。
- **IF** AdMob・RevenueCat・通知などネイティブモジュールを使う場合 **THEN** Expo Go を使わず最初から `eas build --profile development` で Development Build を作成し、JS変更のみなら OTA Update で EAS Build 無料枠（月30回）を温存する。
- **IF** Windows 環境や Firebase SDK でビルド・起動エラーが出る場合 **THEN** `.npmrc` に `legacy-peer-deps=true`、`metro.config.js` に `.mjs` 拡張子追加を設定し、JS起動前クラッシュは `adb logcat` で原因特定する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 「タスク管理を作って」と作成先パス・参照型・制約を指定せずに曖昧な指示を出すこと。
- 型チェック（`tsc --noEmit`）・Lint・セキュリティ目視レビューをAI任せにしてコミットせずにセッションを跨ぐこと。
- CLIオプションだけで `--legacy-peer-deps` を渡し、`.npmrc` に書かず EAS Build クラウド環境で再発させること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```markdown
# T101 — 認証基盤 (tasks/ph1/T101_auth.md)
status: pending
phase: ph1
## このタスクで作るもの
- `src/api/auth.ts`（新規）
## 完了後に更新
status: done と書き換えて次のタスクへ進む
```

```ini
# .npmrc (EAS Build でも有効にする)
legacy-peer-deps=true
```
