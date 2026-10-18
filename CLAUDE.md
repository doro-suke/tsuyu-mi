# CLAUDE.md — Vesper（未読消化・PWA情報ハブ）

プロジェクトの基本方針・作業規律は [GEMINI.md](GEMINI.md) と `docs/lessons.md` が正本（Gemini 向けに書かれているが、Claude Code も同じ規律で動く）。

## フォルダ間の引き継ぎ（2026-10-18 追加）
- **開始時**: `STATE.md`（現在地）→ `WIP.md` の末尾40行 → `docs/lessons.md` → `git log --oneline -10` の順に読む。
- **終了時**: 変えた内容・戻し方・次回課題を `WIP.md` に追記し、`STATE.md` を上書きする（30行以内）。
- **六花デジタルスタジオ側から編集した場合も**、記録は六花の `docs/WORKLOG.md` だけでなく、このフォルダの `STATE.md` に必ず書く（双方向）。

## 注意
- `.env`（API キー）は読まない・出力しない・コミットしない。
- `git push` は GitHub Actions の毎日09:00(JST)同期と本番ページに影響する。push はオーナー承認後に限る。
- 未追跡の `data/notebooklm_sources/` の記事ファイルは自動生成物か手動追加か未確認。自分で消さない。
