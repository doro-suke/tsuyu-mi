# STATE — Vesper の現在地（30行以内・上書き式）

最終更新: 2026-11-15 / 更新者: Claude Code（vesper-e1）

## 概要
- Raindrop.io ブックマーク（**751件**）を AI で構造化要約・スコア付けし、PWA ダッシュボード（`index.html`）と NotebookLM / カテゴリ別 Markdown に反映。毎日 09:00(JST) に GitHub Actions（`sync.yml`）で自動同期。
- 他プロジェクト横断ナレッジ基盤 **`vesper-kb`**（`scripts/search_kb.js`）と専属司書 **`vesper-librarian`** が稼働中。
- 構造化Markdown移行は **47 / 751件**（残り704件、原本は `data/backups/notebooklm_sources_raw/`）。

## 直近のコミット
- eba2b61 fix(sync): POST 本文の DEL(U+007F) を JSON エスケープ表記へ置換
- 797f28a fix(security): curl のコマンド注入・キー露出とダッシュボード XSS を修正
- 8f61c37 fix(sync): redact() 追加

## 今回（2026-11-15）の動き
- 六花 V のレッドチーム指摘を本体で修正（push 済み）: sync.js の curl() を execFileSync＋`-K -` 化（キーは Gemini ヘッダ化）、http/https 限定、generate_dashboard.js の HTML エスケープ、件数引数検証・空 bookmarks 削除ガード・bookmarks.json 原子的書き込み。
- テスト `scripts/test_redteam_fixes.js`（偽キー＋ローカルサーバー、41 PASS）。差分・出力は `docs/redteam_2026-11-15/`。-f は未採用（429 再試行維持のため -w でステータス取得）。
- 同梱版（竹・梅）への反映は V が実施。設計理由回答・司書提供の詳細は WIP.md。

## 次回課題・既知の課題
- **未検証**: 修正後コードの実キー通し実行、GitHub Actions(Linux) 初回実行（push 後の 09:00 ログで `curl failed` を確認）、Mac/Linux、古い curl。
- 戻し方: `git revert eba2b61 797f28a`（sync.js / generate_dashboard.js が修正前に戻る）。
- summarize_all.js・safe_prune.js・check_new.js 等に同じキー露出構造が残る（同梱対象外）。
- 動画・X の知見が薄い → ウェブ検索等で補うか判断。未構造化記事 704件の段階変換（`scripts/convert_structured.js`）。

## 外部との接点
- `node scripts/install_skills.js` で `~/.gemini/config/` と `~/.claude/` の `vesper-kb` / `vesper-librarian` を更新。
- 他セッションから `feedback <id> --useful|--miss [--query "..."]` で `data/kb_feedback.json` に記録。
- `git push` はオーナー承認後のみ（11-15 は承認のうえ実行済み）。
