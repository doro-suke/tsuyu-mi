# STATE — Vesper の現在地（30行以内・上書き式）

最終更新: 2026-11-15 / 更新者: Claude Code（vesper-e1 Wrap-up）

## 概要
- Raindrop.io ブックマーク（**751件**）を AI で構造化要約・スコア付けし、PWA ダッシュボード（`index.html`）と NotebookLM / カテゴリ別 Markdown に反映。毎日 09:00(JST) に GitHub Actions（`sync.yml`）で自動同期。
- 他プロジェクト横断ナレッジ基盤 **`vesper-kb`**（`scripts/search_kb.js`）と専属司書 **`vesper-librarian`** が稼働中。
- 構造化Markdown移行は **47 / 751件**（残り704件、原本は `data/backups/notebooklm_sources_raw/`）。

## 直近のコミット
- 210faa1 docs: update STATE.md for 2026-11-14 wrap-up
- c3324b6 docs: WIP.mdに構造化Markdown移行進捗（47/751件）を記録

## 今回（2026-11-15）の動き
- 司書として並行セッションへ参照提供（詳細は WIP.md）。
- 六花 V／広報の依頼で、設計理由（記録で裏付く分のみ）を回答。キー露出（curl 引数）の改善案と YouTube 本文欠落時の挙動を評価して回答。コード変更なし。

## 次回課題・既知の課題
- キー露出対策（curl -K - 化）の実装可否は V の判断待ち。未コミットの scripts/sync.js（redact）の扱いもユーザー判断。
- 未追跡の `data/kb_feedback.json`（司書の feedback 記録）の扱いをユーザーが判断。
- 動画・X の知見が薄い → ウェブ検索等で補うかユーザー判断。
- 未構造化記事 704件の段階変換（`scripts/convert_structured.js`）。
- 戻し方: 今回コード・データ変更なし。`data/kb_feedback.json` は削除で戻せる。

## 外部との接点
- `node scripts/install_skills.js` で `~/.gemini/config/` と `~/.claude/` の `vesper-kb` / `vesper-librarian` を更新。
- 他セッションから `feedback <id> --useful|--miss [--query "..."]` で `data/kb_feedback.json` に記録。
- `git push` はオーナー承認後のみ（今回は未実行）。
