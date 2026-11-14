# プロジェクト進捗管理 (WIP)

## 進捗状況: 全フェーズ完了・運用フェーズへ移行

### フェーズ 1: コンテンツ抽出と NotebookLM 連携 (完了)
- [x] `@mozilla/readability` と `jsdom` を使った本文抽出ロジックの実装
- [x] ノイズ（広告等）を除去したクリーンな本文の取得
- [x] NotebookLM 用 Markdown（メタデータ＋本文）の自動生成機能
- [x] `data/notebooklm_sources/` へのファイル保存とファイル名サニタイズ

### フェーズ 2: ダッシュボードの高度化 (完了)
- [x] Tailwind CSS を使用したカード型 UI の実装
- [x] リアルタイム検索機能（タイトル・要約）の実装
- [x] 優先度別フィルタ（High / Mid / Low）の実装
- [x] タグによる絞り込み機能の実装
- [x] 各記事から NotebookLM 用 Markdown へのリンク機能追加

### フェーズ 3: 全自動パイプライン統合と精度向上 (完了)
- [x] 統合実行スクリプト `scripts/sync.js` の作成
- [x] Raindrop からの最新データ取得機能の組み込み
- [x] 取得 -> 抽出 -> 要約 -> Markdown生成 -> HTML生成 の一気通貫実行
- [x] ターミナルでの詳細な進捗ログ出力の実装
- [x] 堅牢なエラーハンドリング（リトライ・スキップ処理）の完成
- [x] 優先度判定（High/Medium/Low）の厳格化プロンプトの実装
- [x] タグの表記揺れ正規化ロジックの導入
- [x] ダッシュボードへの既読・未読管理 UI の追加（localStorage対応）

### フェーズ 3.5: 運用基盤整備 (完了)
- [x] 未処理のブックマークの AI 解析とダッシュボード反映（計203件完了、最新分まで同期済み）
- [x] ダッシュボード上でのステータス変更を `bookmarks.json` に永続化する仕組み（`scripts/update_status.js`）の実装
- [x] 定期実行（GitHub Actions）の導入
- [x] GitHub Actions の Node.js 24 対応（将来の非推奨化リスク排除）

---

## 運用フェーズのタスク
- [ ] 収集された NotebookLM ソースを活用したナレッジベース構築
- [ ] 定期的なダッシュボードの閲覧と「今読むべき」記事の消費

---

## 履歴

### [2026-05-23] 
- **インフラ構築完遂**: Node.js 24 移行対応を含む GitHub Actions のセットアップが完了。手動実行での正常動作（Success）を確認。
- **リスク管理**: 指示に含まれていたハルシネーション（不正パス）を検知・修正。
- **ステータス**: プロジェクト構築フェーズをクローズ。日常的な自動同期運用へ移行。

### [2026-08-16]
- **反映漏れリスクの根本的解消**: 差分同期の早期中断（Early Break）を刷新し、複数ページ（最大500件）をスキャンして未処理記事を確実にキュー化する仕組みを構築。10件以上の大量追加時でも次回以降の実行で自動的に順次消化され、取りこぼしが完全になくなる設計へ移行。
- **Gemini API の超軽量化 ＆ コスト削減**: 要約生成を廃止し、「重要度スコア（0〜100）とタグ分類」のみに特化した超軽量プロンプトを導入。出力トークンを約90%削減し、処理速度とAPIコスト効率を大幅に向上。
- **UI & Markdownの最適化**: ダッシュボードのカードUIをスリム化し、タイトル・スコア・タグ・各種アクション（記事を読む / AI用ソース）が際立つシックな表示に最適化。

### [2026-09-22]
- **ブックマーク42件の安全削除と多層防御**: 不要となったブックマーク42件の削除を実施。レッドチーム監査により特定された「ローカルのみ削除による次回同期時のゾンビ復活（再スクレイピングによるAPI枯渇）」を防ぐため、Raindrop.io API によるゴミ箱移動（29件）、ローカルデータのクリーンアップ（3件）、パストラバーサル防御、事前完全バックアップ（`data/backups/`）を一気通貫で行う `scripts/safe_prune.js` を実装・実行。
- **ダッシュボード最新化**: ダッシュボード（`index.html`）および NotebookLM マスターソース（`notebooklm_master.md`）を即座に再生成し、整合性を完全に担保。
### [2026-10-09]
- **Linuxファイル名長上限超過の根本解消**: 10/7のID付与移行後、日本語タイトルによりファイル名バイト長がLinuxの255バイト制限を超過（最長258バイト）し、GitHub Actionsがチェックアウト段階でクラッシュしていた問題を修正。
- **バイト長ベース安全化**: `truncateByBytes` を導入し、UTF-8バイト長でタイトル最大180バイト（ファイル名全体で最大194バイト）に安全に切り詰めるように `scripts/sync.js`, `scripts/summarize_all.js`, `scripts/migrate_md_filenames.js` を改修。既存の41件を一括リネームし、`bookmarks.json` も更新。全522件で欠落ゼロを検証済み。
- **APIエラー耐性向上**: Gemini APIの負荷スパイク（503）および候補空レスポンスに対する指数バックオフ自動リトライを実装。
- **未反映ブックマークの消化**: 10/8〜10/9に追加された直近記事から順次取り込みを実行（5件消化、残りは日次定期実行で順次消化）。
- **バックアップ除外**: `data/backups/` を `.gitignore` に追加。

### [2026-10-07]
- **9/22削除分のリモート反映**: 未プッシュだった削除をリモート最新版（536件）に対して再実行。ダッシュボードから13件を除去し523件に。Raindrop上の残存1件をゴミ箱へ移動。
- **md欠落の修復**: mdファイルが欠けていた4件（ゼロ幅スペース始まりのタイトル3件、ファイル名衝突の `Watch.md`）を再生成。
- **safe_prune.js 修正**: ゴミ箱内アイテムを削除対象から除外（完全削除の防止）。起動時に origin/main より遅れていれば停止（`--allow-stale` で上書き）。
- **md ファイル名に記事IDを付与**: `{id}_{タイトル}.md` 形式へ523件を移行（`scripts/migrate_md_filenames.js`）。sync.js / summarize_all.js も新形式。全件実在・重複なしを検証済み。
- **重複ブックマーク2件を削除**: 1702129677・1821826896（同一URLの二重登録）。記事数 521、md 全件実在。
- **prune_bookmarks.js 廃止**: 実行すると safe_prune.js へ案内して終了。
- 反映: `00728f3` まで push 済み。

#### 未完了（次回引き継ぎ）
- リモートへの push 後、初回の GitHub Actions 同期・Pagesビルドが成功したか確認する（Actions のログ）。
- 残りの未処理記事（Raindrop上の古い未登録分）は、日次クォータ回復後に毎朝の定期実行で順次自動消化される予定。
- 片付け（任意）: `git stash` の破棄、不要スクリプト（`sync.js.bak` 等）の整理。
- YouTube 記事は本文がほぼ取得できない（字幕取得などの検討余地）。
- curl 引数に API キーが載る実装（`fetch` 置換で解消可能）。

### [2026-11-14]
- **プロジェクト横断ナレッジベース (vesper-kb) 構築とスキル配布**:
  - `scripts/search_kb.js`（CLI 検索・参照・統計・フィードバックツール）を開発。
  - Antigravity および Claude Code 向けに `templates/vesper_kb_skill.md` を作成し、`scripts/install_skills.js` により各エージェントのスキルディレクトリへ自動配布する仕組みを構築。
- **タグタクソノミーの策定と全件正規化**:
  - 19個の標準タグタクソノミー（`scripts/tag_taxonomy.js`）を策定。
  - 既存記事データを新タグ体系へ正規化（`scripts/normalize_tags.js`）。
  - 各種エージェントの専門領域ごとに7つの個別カテゴリ Markdown を `data/categories/` に分割出力（`scripts/export_categories.js`）。
- **広報プロジェクトからの改善要望（REQUEST_from_koho）の完全反映**:
  - 提案1（使用結果の書き戻し）: `feedback` コマンドを追加し、`data/kb_feedback.json` に評価を記録。
  - 提案2（品質スコアの加味）: `search --sort relevance|score` および `--unread` オプションを追加。
  - 提案3（低品質のみヒット時の明示）: 平均スコアが低い場合に警告文を表示。
  - 提案4（収集方針・守備範囲の注記）: `overview` コマンド内に「薄いが対象」「収集対象外」「早期打ち切り推奨」を明記。
  - 提案5（外部入力の安全境界）: スキル定義に間接プロンプトインジェクション防御の行動制約を最優先ルールとして追加。
- **フィードバック懸念（減点非対称性・他クエリへの波及）の解消**:
  - 全体評価（`query` なし）時の `--miss` 減点を `-20` から `-4` にマイルド化（加点 `+3` と対称化）。
  - クエリ文脈評価オプション `--query "検索語"` を新設。文脈に合わない記事は特定クエリの検索時のみ減点（`-15` / 加点 `+5`）し、他クエリの検索順位を巻き込まないスコープ分離を実現。
  - スキル定義を更新し、`scripts/install_skills.js` で Antigravity / Claude Code 両環境へ即時再配布完了。
- **Git リポジトリ完全修復＆リモート最新統合 (751件)**:
  - クラウド同期競合ファイル（`.git` 内の残骸含む）を完全クリーンアップ。
  - GitHub Actions が更新していたリモート最新（751件）をリベース統合。
  - 全751件のタグ正規化、ダッシュボード再構築、NotebookLMソース同期を行い、`origin/main` への push を完了（作業ツリー clean）。
- **高密度構造化Markdownパイプラインの統合と既存記事変換バッチの構築**:
  - 共通アセンブラ＆パーサー（`scripts/structured_md.js`）を新設し、YAMLフロントマター（`domain`, `core_rule`, `anti_pattern`, `score`, `tags` 等）＋4セクション構成のMarkdown生成と新旧両フォーマットの本文抽出（`extractMdBody`）を統一。
  - `prompts/summarize_prompt.txt` と `scripts/sync.js` を刷新し、1記事1回の Gemini API 呼び出し（`response_schema` 強制・`gemini-flash-lite-latest` プライマリ化＆フォールバック・`curl` タイムアウト保護）で構造化Markdown生成とスコア・タグ分類を統合。
  - 既存記事変換バッチ（`scripts/convert_structured.js`）を実装し、`data/backups/notebooklm_sources_raw/` への自動原本退避とスコア上位からの段階的変換（2件テスト変換完了・残り749件）を実現。
  - 下流ツール（`search_kb.js`, `generate_dashboard.js`, `export_categories.js`）を新旧フォーマット両対応へ改修。
- **ダッシュボード タグフィルター機能の修正**:
  - 上部タグフィルターで大文字・小文字の不一致により絞り込みが 0 件になっていた不具合（`currentTag` 未小文字化）を解消。
  - 各記事カード内のタグを `<span>` からクリック可能な `<button>`（`.card-tag-btn`）へ変更し、カード内のタグクリックで即座に絞り込み・ハイライトできるよう改善。
  - 選択中タグの再クリックによる解除（トグル動作）および折りたたみ領域外タグの自動表示を追加。
- **`vesper-kb` 他プロジェクト還元・品質ゲート対応 (`checklist` コマンド実装)**:
  - `scripts/search_kb.js` の検索・ランキング共通処理を `queryArticles()` に抽出し、新コマンド `checklist`（既定 `--tier high`・`--limit 10`・`--tier all` 対応）および `extractArticleTakeaways()` を実装（`core_rule`/`anti_pattern`、構造化MDセクション、`summary`、`bodyText` 本文抽出の3世代スキーマ全対応）。
  - `templates/vesper_kb_skill.md` に Step 1.5（`checklist`）、パターンA（Generator-Verifier 分離による敵対的品質レビュー）、パターンB（Distill & Merge の4原則＋人間承認ゲート＋`bookmarks.json` 未読保護）を追記し、`scripts/install_skills.js` で Antigravity / Claude Code グローバルスキルへ同期完了。
- **専属司書エージェント（`vesper-librarian`）＆ Agent-as-a-Tool アーキテクチャ構築**:
  - `templates/vesper_librarian_agent_agy.md`（`model: flash`）および `templates/vesper_librarian_agent_claude.md`（`model: sonnet`）を新規作成し、`scripts/install_skills.js` で Antigravity / Claude Code 両環境へスキル＋エージェントを一括配布できる構成に拡張。
  - 作業側のコンテキスト汚染を防ぐため、「文脈翻訳レファレンス → 上位精読 → 3点処方箋（適用ルール・NG行動・最小スニペット / 300〜500字）のみ返却」および `feedback --useful` 自律記録プロトコルを確立。
  - `templates/vesper_kb_skill.md`（司書サブエージェント委任・`claude -p` ワンショット呼び出し）と `GEMINI.md`（2画面手動プロトタイピング用 Librarian Mode）を更新・同期完了。
- **雑な指示からの自動前提変換（Auto-Prompt Expansion）＆自動フィードバック対応**:
  - 人間が細かい条件（`【目的】` `【制約】` 等）を添えなくても、作業側エージェントがプロジェクト資料から目的・KPI・技術制約を自動抽出して司書へ構造化渡しし、採用分だけ自動で `feedback --useful` を記録するルールを `vesper-kb` / `vesper-librarian` / `GEMINI.md` に実装・同期完了。
- **既存記事の構造化Markdown移行（エージェント経由・APIレス一括変換）**:
  - スコア上位の既存未構造化記事 45件（15件＋追加30件）を外部APIを使わずエージェント経由で構造化Markdownへ変換し、`data/backups/notebooklm_sources_raw/` への原本退避・`bookmarks.json` 更新・ダッシュボード＆カテゴリパック再生成を完了（構造化済み **47 / 751 件**・残り **704 件**）。

【現在のステータス】
システムは完全に自律動作可能な状態です。毎日 09:00 (JST) に自動実行され、未処理のブックマークが確実に「Vesper」のダッシュボードへ反映されます。同時に、NotebookLMにロード可能な統合ナレッジファイルも毎朝最新に自動生成されます。

