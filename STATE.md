# STATE — Vesper の現在地（30行以内・上書き式）

最終更新: 2026-11-14 / 更新者: Antigravity（Vesper セッション Wrap-up）

## 概要
- Raindrop.io ブックマーク（現在 **751件**）を AI で構造化要約・スコア付けし、PWA ダッシュボード（`index.html`）と NotebookLM / カテゴリ別 Markdown に反映。毎日 09:00(JST) に GitHub Actions（`sync.yml`）で自動同期。
- 他プロジェクト横断ナレッジ基盤 **`vesper-kb`**（`scripts/search_kb.js`：段階的開示・`checklist`・クエリ別 `feedback`）および専属司書サブエージェント **`vesper-librarian`** を Antigravity / Claude Code グローバルへ配布・稼働中。
- 高密度構造化 Markdown パイプライン（`scripts/structured_md.js` / `sync.js` / `convert_structured.js`）稼働中。既存記事の構造化移行は上位 **47 / 751件** 完了（原本は `data/backups/notebooklm_sources_raw/` に退避済）。

## 直近のコミット（`git log --oneline -5`）
- c3324b6 docs: WIP.mdに構造化Markdown移行進捗（47/751件）を記録
- a00419b chore(kb): 既存30件の記事を構造化Markdownへ変換（計47/751件）
- 35b8f15 chore: rewrite top 15 high-score articles into structured markdown
- 7e701b4 chore: wrap up structured markdown pipeline test batch and code block guard
- 9835f16 feat: add auto-context expansion and auto-feedback to vesper-kb and librarian

## 次回課題・既知の課題
- 既存未構造化記事（残り **704件**）のスコア順・段階的変換（`scripts/convert_structured.js` またはエージェントバッチ）。
- YouTube 記事は本文がほぼ取得できない（字幕取得等の検討余地）。
- `curl` 引数に API キーが載る実装（将来的な置換検討）。
- 戻し方: 構造化変換前の原本 `.md` は `data/backups/notebooklm_sources_raw/`、ブックマークは `data/backups/` から復元可能。

## 外部との接点
- グローバル配布先: `node scripts/install_skills.js` で `~/.gemini/config/` および `~/.claude/` の `vesper-kb` / `vesper-librarian` を一括更新。
- 広報プロジェクト等から `feedback <id> --useful|--miss [--query "..."]` で `data/kb_feedback.json` に学習記録。
