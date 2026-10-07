# これがいいとは言わないが。私が普段 Vibe Coding で実際に投入しているPromptを晒す - Qiita
- **Source URL**: https://qiita.com/dahatake/items/ef5cb2ad8d0e27dd976a
- **Score**: 82
- **AI Summary**:
  - AIのオーバーエンジニアリングを防ぎ、YAGNIを徹底させる具体的なプロンプトを提示。
  - タスクを最小単位に分解し、直列・並列の依存関係を考慮した実装プランをAIに作らせる手法。
  - VS CodeでのCopilot Chatを前提とし、コンテキストウィンドウを効率化する運用フローの解説。
- **Read Now Reason**: AI駆動開発において課題となる「AIのオーバーエンジニアリング（過剰な汎用化・抽象化・ハルシネーション）」を直接防ぐための、即時コピー＆ペースト可能な指示書テンプレートが含まれているため。タスクを最小化してコンテキスト消費を抑えるアプローチは、自動化パイプライン設計や日々のコーディング速度向上に直結します。
- **Suggested Tags**: #AI駆動開発, #GitHub-Copilot, #プロンプトエンジニアリング, #生産性向上
- **Processed Date**: 2026/5/29

---

## 本文
背景
ツールの使い方やら、「xxx Engineering」の方法論を多く目にしていますが。
具体性に欠けることもあるため、実際Copilot君を目の前にすると「何を入力すればいい?」と躊躇される方も多く目にしています。つまり実用性に欠けることもあります。
ここでは「例」として、この数週間(ここがポイント!)、私がVibe Codingで使っているPromptを共有します!

大きな背景
数か月前までは、最初にメッチャPromptを考えていました。それこそPrompt EngineeirngやらのBest Practicesをとりいれて。Promptの投入前にPromptを作り直して、それから本編投入をしたり。と。
ところが、このところ。いつからかは覚えていませんが、Copilot君のツール側で、とてもきれいなPromptの再作成 = Prompt Rewrite を行ってくれるので、私がPromptを綺麗にせずとも、望ましい結果が得られることが増えました。
であれば、もっと Why/What だけに焦点を当て、how-toばかりの話は価値が少ないと思ったわけです。

あくまで、Blog Post時点での私の作業です。
おそらく数週間で変わるでしょう


このBlog記事は、私個人の見解であり、所属している企業や組織の見解ではありません。


毎回決まりきったことのように、これらを行うことは推奨しません。

Context Windowサイズが増え
料金は増え
実行時間も増え
レビューする時間も増え
になります。

しっかりご自分なりの経験値を積んでください。
文章化を試みているのがこのBlogですが....


知っておきたい事
Visual Studio Codeの GitHub Copilotに Chat Debugの機能がついています。
これは熟読してください。

GitHub Copilot君が、私たちの1度のPromptの裏側で:

LLMへどんなPromptをsubmitしているのか?
Context Window1 size
使われたTools: ファイル検索の効率性なども見えてくる



フロー
これです。




項目
やる判断
例




やる事/やらないこと
毎回
「xxxをyyyに置換して」「zzzは絶対にやらないで」


実行プラン作成
ほぼ毎回 (体感90%)
「詳細な実装プランを作成してください。 」


質問票作成
ほぼ毎回 (体感90%)
「不明点をリストアップしてください」


レビュー (事前)
超重たい処理 (体感50%)
「敵対的レビューを行ってください」


タスクの実行
毎回
作成した実装プランに基づいてタスクを実行してください


レビュー (事後)
超重たい処理 (体感50%)
「敵対的レビューを行ってください」




1. 「内容」 = やって欲しいことはxxx
まず、何をして欲しいかを書きます。
例ですね。
現象:
開発中のアプリにバグがありました。
下の方を見てください...酷い...

で、スクリーンショットと共に、この状況を頑張って説明するわけです。
`Workbench`のStep 2 実行中の画面の[エクスプローラー]に
新規にアイテムを追加した際だと思いますが(要調査)、
何もないアイテムが表示されてます。
添付のスクリーンショットだと、
`/docs/catalog/use-cse-skelton.md`は、作成されたファイルですが、
その下に1行、何も文字が入っていないデータが追加されています。
別ステップで実行された`/docs/usecase`も
2つ目の画像で添付します。
こちらは何も文字が入っていないデータが多くあります。

わかります?
見たまま、話しているまま。そのまま書いています。範囲を絞るための記載はしていますが。この表現は必ずしも最良でなくても機能します。とにかく「やって欲しい事」「やって欲しくない事」を具体的に書く! これに尽きます。

Visual Studio CodeのGitHub Copilotを使っている場合。このPromptの結果を見てから「あーーー!!! これを書き忘れた!」という事への対応が容易です。
タスクの実行中でも、元のPromptのエリアをダブルクリックすると、再度編集ができて、再度 Submit できます!


ここが実は一番難しい

ここで定義したスコープで、Copilot君は作業をします。
ここで定義した変更を、Copilot君は行います。
この定義が、ビジネスの目的だったり、要件定義だったり、他の設計やコードとの整合性とずれているかどうかは、Copilot君はチェックしてくれません! 書いたところで、分量が多すぎたりするので難しい!

そのために、このリポジトリーの要点をまとめたドキュメントを作成することをおススメします





2. 実装プランの作成 + 質問票の作成

これは、毎回必要ではありません。が、体感90%の私のPromptでは使っています。

幾度かChatを重ねて、機能変更やらバグ修正やらの情報が集まってきたら、一度、「実装プラン」を作成させます。

1度に行うタスクは小さくしています。小さなタスクであれば比較的品質は高いためと、やり直しをしやすくなるようにです。Context Sizeと、Memoryの効率化にも役に立ちます。

質問票を作成させます。

オーバーエンジニアリングしがちです。

ハルシネーションも最小化

これまでの会話の内容から、詳細な修正プランを作成してください。

### 重要
- タスクの実行は、修正プランを私が確認した後で、私が作成の指示をします。
- タスクの粒度は、各タスクの実施時に成果物の品質を最大限高めるために、
  タスクを詳細に分析して、タスクを分割します。
  その際に、可能な限り小さなタスクにすることで、Context Window のサイズを可能な限り小さくします。
  また、各タスクの成果物の作成・編集するファイルを分割して、タスクをマッピングをします。
- タスクの実行の順番は、各タスクの入出力の依存関係で、直列実行、並列実行などを設計します。
- タスクの設計をする際に、少しでも不明瞭な点があれば、
  `不明点`/`選択肢`/`デフォルトの選択肢`/`デフォルトの選択肢を選んだ明確な理由`を
  作成して、私に提示してください。
- **オーバーエンジニアリングは絶対に禁止**です。以下を「オーバーエンジニアリング」とみなします:
  - 指示・要件にない汎用化・抽象化・将来予測による拡張点の先回り追加
  - YAGNI 違反（必要になるまで実装しない原則の逸脱）
  - 未使用の設定オプション・フラグ・抽象レイヤーの導入
  - 単発用途に対する Strategy/Factory 等のデザインパターン濫用
  - 過剰なログ出力・過剰なエラーハンドリングの予防的追加
  - 既存の最小実装で十分な箇所への不要な依存導入
- **捏造は絶対に禁止**です。存在しない問題を指摘してはいけません。


Copilot君は、常に小さなタスクの精度は良いです。Context Engineeringの一貫ですが、以下にタスクを小さく分割して、1つずつ実行させるかが大事です。
そのためのプランを、GitHub Copilot君は、ある程度やってくれますが... ここはそのうちお任せできるようになるでしょう。

さて。作成してくれた実装プランのモノホンを「例」として張りますね。
## 修正プラン（確定版）

Q1〜Q4 すべてデフォルト採用のため、前回プランから内容変更はありません。最終版として要点のみ提示します。

---

### 1. 根本原因（要約）
multi_root_model.py の `refresh_directory()` が、ディレクトリ変更 1 回ごとに「**全行 remove → 全行 insert**」の full reset を発行している。これを `_NameFilterProxy`（`QSortFilterProxyModel` + `setRecursiveFilteringEnabled(True)`、file_tree_panel.py）が短時間に連続受信すると、内部マッピングに **末尾 1 件の幻インデックス**が取り残される。結果として View 側 `rowCount` がソースより 1 多くなり、空名行（`display_name=None`）として描画される。Agent が UC-01〜UC-30 を逐次生成するようなシナリオで顕著化する。

### 2. 修正方針
`refresh_directory()` を、追加分のみ `beginInsertRows` / 削除分のみ `beginRemoveRows` を出す **incremental diff** に置換する。既存 `_Node` インスタンスを名前で再利用し、展開済みサブツリーの状態を保持する副次効果も得る。

採用しない案：プロキシ層改造／デバウンス導入／bulk API 追加／inode 追跡（いずれも YAGNI）。

### 3. タスク分割（直列実行）

| # | タスク | 編集ファイル | 期待される出力 | 依存 |
|---|---|---|---|---|
| **T1** | 回帰テスト追加（**直接モデル経由 + プロキシ経由の 2 本**、Q1=A） | test_multi_root_model.py に追記 | 「`refresh_directory` を 30 回連続呼んだあと、(a) ソース `rowCount==30` (b) プロキシ越し `rowCount==30` (c) 全行 `display_name` 非空」を検証する 2 テスト。実装前は赤、T2 後に緑。 | — |
| **T2** | `MultiRootFileModel.refresh_directory()` を incremental diff に置換（リネームは `remove + insert` 維持、Q2=A） | multi_root_model.py の `refresh_directory` のみ差し替え | T1 が緑になる。差分対象は 1 関数（約 20 行） | T1 |
| **T3** | 既存テスト緑確認（デバウンス導入なし、Q3=A） | （実行のみ） | `pytest test_multi_root_model.py hve/gui/tests/test_file_tree_panel.py` 全件 PASS | T2 |
| **T4** | CHANGELOG.md の `## [Unreleased]` → **`### Fixed`** に 1 項目追記（Q4=A） | CHANGELOG.md | Keep a Changelog 規約準拠の 1 行。Workbench エクスプローラーで空ファイル行が表示される問題の修正を記載 | T3 |

並列化余地なし。各タスクの編集対象は 1 ファイル・差分 20〜40 行以内に収まり、Context Window は最小。

### 4. T2 具体差分の骨子（再掲）

multi_root_model.py の現行 full reset 部分を以下に置換：

```python
new_children = self._scan_children(node)
new_names = {c.display_name for c in new_children}

# 1) 消滅した行を末尾から個別 remove（行番号がズレないよう降順）
for r in sorted(
    [i for i, c in enumerate(node._children) if c.display_name not in new_names],
    reverse=True,
):
    self.beginRemoveRows(idx, r, r)
    del node._children[r]
    self.endRemoveRows()

# 2) ソート位置に合わせて不足行のみ個別 insert、既存 _Node は維持
existing_by_name = {c.display_name: c for c in node._children}
for target_row, nc in enumerate(new_children):
    cur = node._children[target_row] if target_row < len(node._children) else None
    if cur is not None and cur.display_name == nc.display_name:
        continue
    if nc.display_name in existing_by_name:
        old_row = node._children.index(existing_by_name[nc.display_name])
        self.beginRemoveRows(idx, old_row, old_row)
        moved = node._children.pop(old_row)
        self.endRemoveRows()
        self.beginInsertRows(idx, target_row, target_row)
        node._children.insert(target_row, moved)
        self.endInsertRows()
    else:
        self.beginInsertRows(idx, target_row, target_row)
        node._children.insert(target_row, nc)
        self.endInsertRows()

node._loaded = True
```

ファイル追加のみのケースでは `beginRemoveRows` は一切呼ばれず、プロキシは最小通知のみを受信する。

### 5. 検証計画
- T1 で追加した 2 テスト：PASS
- 既存 `test_refresh_directory_picks_up_new_files` 等：PASS
- `pytest test_multi_root_model.py hve/gui/tests/test_file_tree_panel.py` 全件 PASS

### 6. CHANGELOG エントリ案（T4 で追記する文面）
```
### Fixed
- Workbench のエクスプローラーで、Agent によるファイル連続生成時に実ファイル行の下に空名の幻行が表示される不具合を修正（`MultiRootFileModel.refresh_directory` を full reset から最小差分通知へ変更）。
```

---

実装開始の指示をいただければ T1 → T4 を順に実行します。

「わかんない事は、聞いて」が、質問票です。
こんな感じで、質問票を作成してくれます。
3. 不明点 / 選択肢
Q1：T1 の回帰テストは「直接モデル」だけで足りるか、それとも「プロキシ越し」も入れるか？
選択肢 A：直接モデル + プロキシ越し、両方追加（デフォルト）
選択肢 B：プロキシ越しテストのみ追加
選択肢 C：直接モデルのみ追加
デフォルト A を選んだ理由：今回の根本原因はプロキシ越しでしか露見しないため、
プロキシ越しテストは必須。一方、直接モデルのレベルでも
「無駄な remove/insert を出さない」契約を固定したいので
両方付ける方が再発防止に効く。
テスト 2 本（既存 test_multi_root_model.py への追記）で済むため過剰ではない。

Q2：refresh_directory 内で、リネーム（旧名 → 新名）を dataChanged で表現するか、
remove + insert のままにするか？
選択肢 A：remove + insert のまま（デフォルト）
選択肢 B：同一 inode 検出して dataChanged を発火
デフォルト A を選んだ理由：YAGNI。inode 追跡のためにスナップショット形式を拡張する必要があり、
今回の症状とは無関係。
os.scandir ベースでは inode を安定取得できない Windows もある。

Q3：FileTreePanel._on_directory_changed 側の連続発火デバウンスを入れるか？
選択肢 A：入れない（デフォルト）
選択肢 B：QTimer で 50ms デバウンスを追加
デフォルト A を選んだ理由：T2 の incremental diff で症状が解消されることを優先確認したい。
デバウンス追加は「UX 上のなめらかさ」目的で別タスクとして検討するほうが筋。今回スコープ外。

Q4：CHANGELOG エントリの分類は Fixed でよいか？
選択肢 A：### Fixed の下に追記（デフォルト）
選択肢 B：### Changed の下に追記
デフォルト A を選んだ理由：見た目のバグ（幻の空行）を直す修正であり、
ユーザー観点では明確に Fix。

この質問の回答例は以下ですね。
不明点は以下を採用してください。

Q1: A
Q2: A
Q3: A
Q4: A

これらの回答を採用して、作成した修正プランを再作成してください。


質問票に、Visual Studio Code の GitHub Copilotで質問に答える際には [Shift] + [Enter]で改行を行うのが便利です。


3. レビュー : 敵対的レビュー
モデル云々は、いったん脇に置かせてください。
これは、より複雑なタスクの場合です。

冒頭の「作成した修正プランについて」の部分は、適時編集してください。
会話が長くなってきた場合に、「どれ」を指すのかは作成している文章を章立てて、名前を付けることが大事です。
名前だけは雑に指定しない!!!

作成した修正プランについて、あなたは今から **敵対的レビュアー** として振る舞ってください。
あなたはこの成果物の作成者 **ではありません**。
作成者の意図に共感せず、問題の発見に集中してください。

私のタスクの目的を確認し、以下の5つの検証軸で問題を問題点を15～100個リストアップをして
網羅的に検出してください。

## 検証軸

1. **目的適合性**: 対象物が、与えられた目的・依頼内容・期待成果に適合しているか。
  抜け漏れや過不足はないか
2. **内容の妥当性**: 記述内容・判断・構成・ロジック・前提に誤りや不自然さがないか
3. **整合性**: 対象物の内部、関連資料、既存ルール、用語、前後の記述との間に矛盾がないか
4. **品質・運用性**: 可読性・明確性・保守性・再利用性・安全性・検証容易性の観点で問題がないか
5. **根拠性・不確実性管理**: 根拠が不明な断定、未確認事項の確定表現、推測の事実化、
  必要な留保や注記の欠落がないか

## 重大度

- **Critical**: 要件未達・データ破損リスク・セキュリティ脆弱性（修正必須）
- **Major**: 設計上の懸念・整合性問題・テスト漏れ（修正推奨）
- **Minor**: 表記揺れ・改善提案・スタイル（任意修正）

## 出力フォーマット（必須）

| No. | 軸 | 重大度 | 指摘箇所 | 問題の説明 | 修正案 |
|-----|-----|--------|---------|-----------|--------|
| 1 | [軸名] | [Critical/Major/Minor] | [箇所] | [問題] | [修正案] |

### サマリー
- Critical: X件
- Major: Y件
- Minor: Z件
- 合格判定: PASS（Critical = 0）/ FAIL（Critical > 0）

## 修正実行（必須）
- Critical の指摘は **全て修正** してください。
- Major の指摘は修正を検討し、修正しない場合は **理由を記載** してください。
- Minor は任意ですが、修正可能なものは修正してください。
- 修正完了後、修正内容の概要を箇条書きで報告してください。

## 重要
- **オーバーエンジニアリングは絶対に禁止**です。以下を「オーバーエンジニアリング」
  とみなします:
  - 指示・要件にない汎用化・抽象化・将来予測による拡張点の先回り追加
  - YAGNI 違反（必要になるまで実装しない原則の逸脱）
  - 未使用の設定オプション・フラグ・抽象レイヤーの導入
  - 単発用途に対する Strategy/Factory 等のデザインパターン濫用
  - 過剰なログ出力・過剰なエラーハンドリングの予防的追加
  - 既存の最小実装で十分な箇所への不要な依存導入
- **捏造は絶対に禁止です。** 存在しない問題を指摘してはいけません。


4. タスクの実行
ここまでくると、タスクの実行プランも作成してくれています。
例:
修正後タスク表
#	タスク	編集ファイル	入力/前提	期待される出力	依存
T1a	回帰テスト追加（モデル直接、追加のみ 30 回）	test_multi_root_model.py に追記	既存 fixture を流用	test_refresh_directory_incremental_no_phantom_rows：ソース rowCount==30、全行 display_name 非空	—
T1b	回帰テスト追加（プロキシ + QTreeView.expand 経由、追加のみ 30 回）	test_file_tree_panel.py に追記	既存 fixture を流用	test_panel_no_phantom_rows_on_rapid_creation：panel._view.expand() 後にプロキシ rowCount==30、全行非空	—
T1c	削除回帰テスト追加（削除分岐の安全網）	test_multi_root_model.py に追記	既存 fixture を流用	test_refresh_directory_removes_missing_entries：2 件中 1 件削除後 rowCount==1	—
T2	MultiRootFileModel.refresh_directory() を incremental diff に置換 + docstring に「full reset 禁止」注意書き追加	multi_root_model.py の refresh_directory 関数のみ。差分 10〜20 行	T1a/T1b/T1c	T1a/T1b/T1c が緑	T1a, T1b, T1c
T3	テスト緑確認（広域）	（実行のみ）	—	pytest hve/gui/tests/ 全件 PASS	T2
T4	CHANGELOG.md 追記（現状確認 → 追記）	CHANGELOG.md	T3 緑	手順: ① ## [Unreleased] セクション有無確認、無ければ追加、② ### Fixed 小見出し有無確認、無ければ追加、③ §「CHANGELOG エントリ案」の文面を追記	T3

これらのプランのタスクを実行していきます。
全てのタスクを1つずつ実行をしてください。
1つのタスクが完了したら、必ず敵対的レビューを行って、
そのレビュー結果を必ず反映させてください。
レビューの反映を確認したら、次のタスクを実行してください。


5. 再度のレビュー
これは必要だったら...

まとめ
かなり荒くPromptの文字列だけを共有しています。
これも繰り返しなので、/skillsやら、/prompt やら、`/hook* やら使えば、良いのかもしれませんが。それは皆さんのやりやすいように...

おまけ
私はツールとしてはVisual Studio CodeのGitHub Copilotを使うのがお好みです。


チャットは常にエディットモード



画面右上の[エディターを右に分割]で、縦に並べる。



で、こう!


同じWindowの中で制御ができる。OS上の他のWindowと邪魔にならない
できれば、2nd 大型スクリーンにこれを映したい
作業しているChatのエディターのPrompt部分だけに注目

この1つのアプリで、複数縦表示でのWindow表示機能を各種ツールでも実装してもらいたいのが、私個人の好みです。
