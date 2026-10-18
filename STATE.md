# STATE — Vesper の現在地（30行以内・上書き式）

最終更新: 2026-10-18 / 更新者: Claude Code（六花フォルダ側セッションから作成）。このセッションではコード・データは変更していない。

## 概要
- Raindrop.io のブックマークを AI で要約・優先度付けし、PWA ダッシュボード（`index.html`）と NotebookLM 用 Markdown に反映する。毎日09:00(JST)に GitHub Actions（`.github/workflows/sync.yml`）で自動同期。
- WIP.md の記述上は「完成・運用フェーズ」。六花側の棚卸し報告書でも「完成・本番運用中」。

## 直近のコミット（`git log --oneline -5`）
- c942115 Markdown ファイル名の UTF-8 バイト長制限、未同期ブックマークの同期（最終コミット日 2026-10-09）
- 00728f3 重複ブックマーク2件の削除（記事数 521）

## 未確認（実際の確認が必要）
- 10/9 以降の GitHub Actions 同期が成功しているか（Actions のログは未確認。WIP.md にも「初回同期・Pages ビルド成功の確認」が未完了と記載）。
- 未追跡の `data/notebooklm_sources/*.md` 6本（自動生成か手動追加か）。

## 既知の課題（WIP.md より）
- YouTube 記事は本文がほぼ取得できない。
- curl 引数に API キーが載る実装（`fetch` への置換で解消可能）。
- 不要スクリプト（`sync.js.bak` 等）の整理は任意。

## 外部との接点
- 六花側の資産台帳: `docs/OPERATIONS.md` ・ 棚卸し報告書。事業上の売上はなし（個人用ツール）。
- 六花側から編集したら、この STATE.md にも書く（CLAUDE.md の約束）。
