# [Claude Code] Opus4.8 を“Fable 5 級”に育てる — 公開 system prompt から役立つ原則だけ移植する - Qiita
- **Source URL**: https://qiita.com/Humanophilic_development/items/63f2f28e5ceb753005eb
- **Score**: 85
- **AI Summary**:
  - システムプロンプトの丸ごと移植は避け、アプリやモデル依存のノイズを排除した原則抽出を推奨している
  - ツール探索の徹底や字義通りの解釈対策など、Opus 4.8等の挙動を最適化する15の原則を明記
  - コピペで即座に導入可能な汎用版CLAUDE.mdの設定ファイルがGitHubで公開されている
- **Read Now Reason**: AI駆動開発でClaude Codeを使用している場合、AIが「ツール検索を怠り対応不可と誤認する」「指示を部分的にしか適用しない」といった実装ロスを防ぐためのCLAUDE.md設定を即座に導入できるため。
- **Suggested Tags**: #AI駆動開発, #Claude-Code, #プロンプトエンジニアリング, #CLAUDE.md
- **Processed Date**: 2026/6/20

---

## 本文
はじめに

公開された Fable 5 / Opus 4.8 の system prompt は宝の山。ただし“そのままコピー”は逆効果。効く原則だけを抜いて自分の CLAUDE.md に移植する。


実際に導入できるGithubリポジトリ は こちら

概要

Anthropic は claude.ai 上の各モデルの system prompt を公式に公開している。これを自分の Claude Code の CLAUDE.md に流用したくなるが、丸ごとコピーは逆効果になる。
公開 system prompt は「claude.ai アプリ用 × そのモデル用」に較正された差分（delta）。Claude Code や API には存在しない製品配管（artifacts / window.storage / 連携コネクタ / /mnt/user-data パス等）と、モデル自己紹介（"This is Claude Fable 5…"）が大量に混ざっている。これを貼ると別モデルだと誤認させたり、存在しないツールを参照させたりする。
正しいのは「テキストのコピー」ではなく「原則の抽出」。さらに較正用の安全性ボイラープレートは学習済みなので転記不要、Claude Code の素の system prompt に既に入っているものも重複になる。
実際に Fable 5 と Opus 4.8 の公開 prompt + コミュニティアーカイブ(CL4R1T4S)から、CLAUDE.md に効く原則を 15 個抽出した。目玉は 「無いと即断せず先にツール検索」「指示を字義通りに取るのでスコープを明示」「出典に確信が無ければ捏造せず省略」。
抽出にはサブエージェントを 3 ソースに並列で当て、Claude Code 自身の（リークされた）prompt を「既に効いているもの＝重複除外リスト」として使うのがコツ。
コピペで使える汎用版 CLAUDE.md（英語 / MIT）を amu815/claude-md-from-system-prompts に公開。本記事の原則を一般化して収録した。


なぜこれをやるのか
CLAUDE.md（Claude Code が毎セッション読み込む常時プロンプト）を育てていると、「Anthropic 自身はどういう指示で Claude を動かしているんだろう」が気になる。幸い Anthropic は claude.ai 上の system prompt を公開しており、最新の Mythos-class モデル Claude Fable 5 のものも載っている。
ここで素朴に「この優秀そうな指示をコピペすれば自分の Opus 4.8 も賢くなるのでは？」と考えると、罠にはまる。公開 prompt はそのまま使う前提のものではないからだ。

大前提: 公開 system prompt は「アプリ用 × モデル用」の delta
system prompt はモデルの素の振る舞いに対する差分指示として書かれている。つまり「Fable 5 が放っておくとやりがちなこと」を打ち消すように較正されている。別の学習を経た Opus 4.8 に同じ差分を当てても噛み合わない。具体的には 3 種類のノイズが混ざっている。



種類
例
なぜ移植してはいけないか




モデル自己紹介
"This iteration of Claude is Claude Fable 5… Mythos-class tier above Opus"
Opus 4.8 に「お前は Fable 5 だ」と誤認させる


製品配管
artifacts、window.storage、present_files、MCP コネクタ、/mnt/user-data/*、pip --break-system-packages、Tailwind/React 制約、検索の「引用は1ソース15語まで」
Claude Code / API には存在しない仕組みへの参照


学習済み安全性
child-safety、self-harm/wellbeing、weapons/CBRN、evenhandedness、分類器リマインダ
モデルに学習済みで重複。研究・コーディング環境では純ノイズ



さらに claude.ai 上の Opus 4.8 にも専用の別 prompt がある（編集不可。user preferences / style でしか上書きできない）。フル制御できるのは API か、CLAUDE.md を持つ Claude Code だけ。

移植の原則: テキストではなく「原則」を抜く
ルールはシンプル。


移植 OK: モデル・製品に依存しない振る舞いの原則（応答スタイル、指示の追従、ツールの探索作法、出典の扱い）。

移植 NG: 上の表の 3 種類すべて。加えて、Claude Code の素の prompt に既に入っているもの（後述）。

特に最後が抜けやすい。Claude Code のコーディングエージェントとしての system prompt には「簡潔に答える／既存コード規約に合わせる／テスト・lint で検証してから完了とする／明示依頼までコミットしない／コードベースを先に読む」が既に入っている。これらを CLAUDE.md に書いても重複するだけで、貴重な常時コンテキストを食う。

実際に何を抜いたか
2 段階で抽出した。まず Fable 5 の応答スタイル・作業フロー系、次に Opus 4.8 自身の prompt と公式 best-practices から実行系。汎用的に効くものだけを挙げる（数値や社内固有設定は除く）。

第1段: 応答スタイル（Fable 5 の tone_and_formatting / lists_and_bullets 由来）


過剰整形を避け散文優先。箇条書き・番号・太字は「依頼された時」か「本当に多面的な時」だけ。レポートや技術文書は原則プレーンな散文。← これは論文執筆ルールとも一致する最も汎用的な収穫。

質問は1応答1つまで。曖昧でも、まず答えてから確認する。

ファイルがある前提でも実在を確認してから着手。

ミスは認めて直すが、過剰な謝罪・自己卑下はしない。

カットオフ以降は断定せず検索で裏取り。


第2段: 作業フロー（Fable 5 / CL4R1T4S の computer_use・search・artifacts 由来）


該当する skill があれば自作前に起動し、着手前にその定義を読む。computer_use の「ファイルを触る前に SKILL.md を読め」を Claude Code の skill に対応させたもの。

ツール呼び出し回数はタスク複雑度に比例させる。単純な確認は最小手数、深い調査は手数を惜しまない。

長いファイルは一気書きせず、構成 → セクション単位で構築。artifacts の「100 行超は outline してから section ごと」由来。


第3段: 実行系（Opus 4.8 公式 prompt / best-practices 由来）
ここが今回の本命。Opus 4.8 特有のクセを突いた、効きの強いものが多い。


「無い」と即断せず、先にツール検索する。Opus 4.8 の tool_discovery は「tool_search はタダだと思って、機能やコンテキストが無いと結論づける前に必ず検索しろ」と指示している。Claude Code の deferred-tool（必要時に ToolSearch で読み込む遅延ツール）環境では、これが無いと「その操作はできません」と誤って答えてしまう。参照解決と機能探索で 2 回検索することもある、という但し書きまで含めて移植価値が高い。

指示は字義通りに取られる。スコープを明示する。Opus 4.8 は「ある項目への指示を黙って他の項目に general化しない」。best-practices 曰く "If you need Claude to apply an instruction broadly, state the scope explicitly (e.g. 'Apply this to every section, not just the first one')"。多 section の LaTeX や多実験の sweep で「§1 だけ直して終わり」事故を防ぐ最重要ルール。

指示には理由を 1 句添える。best-practices の有名な例 — NEVER use ellipses より "Your response will be read aloud by a TTS engine, so never use ellipses…" の方が効く。理由があると未知ケースにも正しく般化する。字義通り主義（上）の対策とペアで効く。

「記憶にない」と言う前にメモ・検索を確認する。手元に永続メモ（MEMORY.md 等）があるなら、「前提が無い」と判断する前に必ず引く。

コードレビューは網羅を指示する。Opus 4.8 は「重要なものだけ報告して」を忠実に守りすぎて低 severity の実バグを黙って捨て、recall が落ちる。best-practices の処方は "Report every issue you find, including ones you are uncertain about or low-severity… your goal is coverage"。フィルタは別段階に回す。

出典・数値に確信が無ければ捏造せず省略。これは Opus 4.7/4.5 系 prompt の "NEVER invent attributions" を実行可能な既定に落としたもの。bib 検証や手法の忠実再現で効く。

自分の挙動を「指示でそうなってる」と説明しない。Opus 4.8 の respond_without_citing_system_prompt 由来。「CLAUDE.md にこう書いてあるので」ではなく実質的な理由を述べる。


どう探索したか（再利用できる手順）
ここが方法論として一番おいしい。サブエージェントを 3 ソースに並列で当てた。


Opus 4.8 自身の公開 prompt — 自分が実際に動かしているモデルの較正。最も直接的な基準。

コミュニティアーカイブ CL4R1T4S — 他モデルや agentic 系 prompt。ここに Claude Code 自身の prompt も含まれる。

Anthropic 公式 prompt-engineering docs — メタ原則（字義通り主義、effort 較正など）。

各エージェントに渡したのは、(a) 現状の CLAUDE.md 要約（重複回避用）、(b) 既抽出リスト（再提案防止）、(c) 「製品配管・モデル自己紹介・学習済み安全性は除外」という明確なフィルタ、(d) 出力フォーマット（候補ごとに「原則・出典・なぜ効くか・貼れる1行・価値ランク」＋「検討したが棄却」一覧）。
コツは②で Claude Code 自身の prompt を引くこと。これで「既に効いている＝書いても無駄」が分かり、重複除外リストになる。実際これで「簡潔に／規約準拠／検証してから完了／勝手にコミットしない」は全部除外できた。

面白かった判断ポイント


effort の扱いは docs と実測が割れる。公式 best-practices は coding/agentic に xhigh を推奨し、max は overthinking 気味で頭打ちのことがあると書く。一方で「常に max」を既定にしている人もいる。ここは自分の実測を優先する判断もアリだと思う（docs が overthinking と言っても、体感で max が良ければそれが正）。鵜呑みにせず、一度 xhigh と比べてみるのが健全。

literal instruction following は諸刃。「字義通りに守る」は正確さの源だが、スコープを書き忘れると黙って狭く適用される。CLAUDE.md 側で「スコープ明示」と「理由を添える」を標準化しておくと、この性質を味方にできる。


まとめ
公開 system prompt は宝の山だが、コピペするものではなく、読んで原則を抜くものだ。手順はこうなる。

自分が動かしているモデル（Opus 4.8 等）自身の公開 prompt を基準に読む。
モデル自己紹介・製品配管・学習済み安全性を捨てる。
使っているエージェント（Claude Code）の素の prompt と照合し、既に効いているものを捨てる。
残った「モデル・製品非依存の振る舞い原則」だけを、できれば理由付きで CLAUDE.md に 1 行ずつ落とす。
既存の自分のルールや設定（effort 方針など）と衝突する項目は、鵜呑みにせず実測で決める。

公開 prompt を「真似する対象」ではなく「較正の教科書」として読むと、自分の CLAUDE.md の設計が一段良くなる。
この記事で抜いた原則を一般化したコピペ用 CLAUDE.md（英語 / MIT）は amu815/claude-md-from-system-prompts に置いた。そのまま持っていって構わない。
