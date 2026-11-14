# Dynamic Workflowsを大名システムへ組み込んでみた - Qiita
- **Source URL**: https://qiita.com/tanaka_taro_JP_KYUSYU/items/b2efbc628053b643a8d8
- **Score**: 88
- **AI Summary**:
  - 大名システムにDynamic Workflowsを組み込み、エージェントの並列起動をスクリプトで制御。
  - 承認が必要な対話フェーズと並行可能なWorkflowフェーズを分離し、作業の効率化と待ち時間削減を実現。
  - 難易度に応じてモデルとeffortをスクリプトで固定し、口頭ルールに頼らないコスト最適化を機械的に保証。
- **Read Now Reason**: Claude CodeのAgent SDKを利用した複数エージェントの並行制御、worktreeによるコンテキスト隔離、および検証フェーズにおける『敵対的検証（Sonnetで広く拾い、Opusで反証する）』の実装コードが具体的に示されており、現在のAI駆動開発パイプラインの設計に即時適用できるため。
- **Suggested Tags**: #AI駆動開発, #Claude-Code, #Agent-SDK, #マルチエージェント, #コスト最適化
- **Processed Date**: 2026/6/20

---

## 本文
はじめに
Claude Code の Agent 機能で組んだ「大名システム」に、Dynamic Workflows を導入してみた話。
役割分担・承認フロー・コスト最適化を、戦国の軍勢に例えながら整理します。

私は Claude Code のサブエージェントを 四層ピラミッド（マスター / 殿 / 家老 / 足軽） で運用する「大名システム」というワークフレームを用いて開発をしている。
そこへ Dynamic Workflows（決定論的にサブエージェントをファンアウトする仕組み）を組み込む修正を行った。
ポイントは「全部を置き換えない」こと。承認ゲートのあるフェーズ（軍議）は対話のまま残し、ファンアウトが効くフェーズ（出陣・検分）だけ Workflow 化した。
モデル（Opus / Sonnet / Haiku）と推論強度（effort）をスクリプトで固定できるようになり、コスト最適化が「口頭ルール」から「機械的保証」へ格上げされた。
ただしこれはトークン削減ではなくコスト削減。この区別を最初に押さえておくと期待値を間違えない。


1. 大名システムとは

何度目かですが、所見の人もたくさんいてくれるだろうと期待し、何度でも説明します。

複数の Claude エージェントを、戦国の指揮系統になぞらえた四層構造で動かす運用ルールです。



役職
実体
責務




マスター（天上人）
人間（私）
大方針の決定・最終承認


殿（PM）
メインの Claude セッション
軍議の主催・采配・とりまとめ。直接コーディングはしない



家老

Explore / Plan サブエージェント
偵察・設計・タスク分解・レビュー


足軽
Agent(isolation:"worktree")
個別タスクの実装・テスト






なぜこんな仕組みにしているのか
最大の理由は git worktree による物理隔離 です。
足軽は isolation: "worktree" で起動され、.claude/worktrees/agent-xxxxx/ という別ディレクトリで作業します。これにより、複数の Claude セッションを並行で走らせても HEAD の衝突（作業中ファイルの消失・コミット前修正の巻き戻し）が起きません。本陣（メインの作業ディレクトリ）は常に無傷です。
開発フローは「三つの儀」で進みます。



2. 何が課題だったのか
大名システムはよく機能していましたが、/出陣 と /検分 には改善余地がありました。


足軽の起動・回収を殿が手動で采配していた。並列度の調整や、どの足軽の完了を待ってから次を起動するか、を殿が毎回考える。

モデルの振り分けが「口頭ルール」頼みだった。「機械的なタスクは Sonnet、難所は Opus」という方針はあるものの、強制力がなく、足軽が無自覚に高価なモデルを引くことがあった。

待ち時間のロス。逐次に起動すると、速い足軽が遅い足軽を待ってアイドルする。

これを改善するため Dynamic Workflows を組み込みました。

3. Dynamic Workflows とは
Claude Code（および Agent SDK）の仕組みで、サブエージェントの起動を JavaScript スクリプトで決定論的に記述できます。要点だけ:


agent(prompt, opts) — サブエージェントを1体起動。opts で model / effort / isolation:'worktree' / schema を指定できる。

pipeline(items, stage1, stage2, ...) — 各アイテムを複数ステージに流す。ステージ間にバリアがないので、アイテムAがstage2の最中にアイテムBがstage1、という並行が成立する。待ち時間を潰せる。

parallel(thunks) — 全部を並行起動し、全完了を待つ（バリアあり）。

budget — 「このターンは合計◯トークンまで」という上限に、起動する足軽数を追従させられる。

つまり「足軽をどう並べ、どのモデルで、いくつまで」をコードで宣言できるわけです。大名システムの「家老の采配」を、決定論的なスクリプトに落とせる。

4. 設計：どこを Workflow 化し、どこを残すか
ここが今回いちばん頭を使ったところです。全フェーズを Workflow 化してはいけません。
理由は Workflow が「起動したら最後まで自走し、途中で人間の承認を待てない」 から。大名システムの肝は マスターの御裁可 という人間の承認ゲートです。これを Workflow の中に閉じ込めると、承認のために止まれません。
そこで判断基準を一つに絞りました：

フェーズの途中に人間承認ゲートを挟むか？ → 挟むなら対話のまま、挟まないファンアウトなら Workflow 化。




スキル
方針
理由




/軍議
対話のまま維持
末尾に御裁可ゲートがある。Workflow は停止できない


/出陣
Workflow 化（推奨）
独立足軽の並列実装＝pipeline + worktree の典型


/検分
Workflow 化（本命）
次元別レビュー→敵対的検証の find/verify が最も効く



/早馬（緊急バグ）
対話のまま
探索的で、決定論ファンアウトに乗りにくい



承認ゲートは Workflow の「外」に置き、複数 Workflow を殿が直列につなぐ形にしました。


各 Workflow は「足軽の大量のツール出力を殿のコンテキストに持ち込まず、構造化された結果だけ返す」ので、殿はフェーズ間の判断に集中できます。

5. モデル / effort 振り分け（コスト最適化の核心）
今回の最大の実利がこれです。agent() の model / effort をスクリプト定数に固定しました。



用途
model
effort
根拠




殿（采配・最終判断）
Opus
—
判断の質がボトルネック


家老（軍議・設計）
Opus
high
設計の質がボトルネック


足軽：機械的タスク（DTO量産・i18n・リネーム）
Haiku / Sonnet
low
単価が安く、浅い推論で足りる


足軽：通常実装
Sonnet
medium
デフォルト


足軽：難所（並行制御・認可・複雑ドメイン）
Opus
high
失敗コストが高い


検分：一次レビュー（広く拾う）
Sonnet
low
件数を稼ぐ


検分：敵対的検証（詰める）
Opus
high
偽陽性/偽陰性を潰す



「広く安く拾い、要所だけ高価なモデルで詰める」 という配分を、スクリプトで強制できるようになりました。家老の口頭指示に頼らず、足軽が勝手に Opus を引くことがなくなります。
軍議で作る「陣立て書」にも 推奨モデル/effort 列を新設し、そのまま出陣 Workflow の agent() に流し込めるようにしました。

6. 実装：Workflow 骨格

検分 Workflow（次元別レビュー → 敵対的検証）
export const meta = {
  name: 'kenbun',
  description: '差分を次元別にレビューし、各findingを敵対的に検証する',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}

const DIMENSIONS = [
  { key: 'compile',  prompt: '...コンパイル/型エラーの観点でレビュー' },
  { key: 'security', prompt: '...OWASP Top 10・認可漏れの観点でレビュー' },
  { key: 'spec',     prompt: '...仕様書との整合の観点でレビュー' },
  { key: 'reuse',    prompt: '...重複・簡素化の観点でレビュー' },
]

const results = await pipeline(
  DIMENSIONS,
  // 一次レビュー: 広く安く拾う
  d => agent(d.prompt, { phase: 'Review', model: 'sonnet', effort: 'low',
                         schema: FINDINGS_SCHEMA }),
  // 各findingを敵対的に検証: Opusで反証を試みる
  review => parallel(review.findings.map(f => () =>
    agent(`次の指摘を敵対的に検証し、本物か反証せよ: ${f.title}`,
          { phase: 'Verify', model: 'opus', effort: 'high', schema: VERDICT_SCHEMA })
      .then(v => ({ ...f, verdict: v }))))
)

return results.flat().filter(Boolean).filter(f => f.verdict?.isReal)

pipeline なので、security 次元の検証が走っている間に reuse 次元のレビューが並行します。待ち時間ゼロ。さらに「指摘が本物か」を別の Opus に反証させることで、AIにありがちな「もっともらしいが実在しないバグ」を弾けます（検証スキーマに「該当ファイル:行の実在」を必須項目として持たせるのがコツ）。

出陣 Workflow（並列実装 → 自己ビルド）
const tasks = args // 陣立て書 [{ scope, model, effort, prompt }]

const built = await pipeline(
  tasks,
  // 実装: worktree隔離必須。難易度でモデルを振り分け
  t => agent(t.prompt, { phase: 'Implement', isolation: 'worktree',
                         model: t.model, effort: t.effort, schema: IMPL_SCHEMA }),
  // 各worktreeで自己ビルド/テスト
  (impl, t) => agent(`${t.scope} のworktreeでビルド・テストを通せ`,
                     { phase: 'Build', isolation: 'worktree',
                       model: 'sonnet', effort: 'low', schema: BUILD_SCHEMA })
)
return built.filter(Boolean)


7. 新旧比較





観点
旧（手動 Agent 采配）
新（Workflow）




足軽の並列制御
殿が手動で起動・回収

pipeline / parallel で宣言


待ち時間
逐次起動でアイドル発生
ステージ間バリアなしで詰められる


モデル振り分け
口頭ルール（強制力なし）
スクリプトで固定（機械的保証）


コンテキスト隔離
あり（Agent 経由）
あり（同等）


予算上限への追従
なし

budget で自動スケール


偽バグ対策
レビュアー次第
敵対的検証ステージで構造化


承認ゲート
対話で保持
対話で保持（変えない）




8. 正直な評価：トークン削減 ≠ コスト削減
ここは誤解しやすいので強調しておきます。


コンテキスト隔離による節約（足軽のツール出力を殿のコンテキストに入れない）は、旧来の Agent 経由の大名システムでもすでに得られていました。Workflow 化で上積みされる分は小さい。
Workflow が上乗せする価値は 「コスト削減（安価モデル＋低 effort の強制）＋決定論制御＋予算上限」 です。

モデル切替は「トークン削減」ではなく「コスト削減」。Haiku / Sonnet は Opus より単価が安いだけで、消費トークン量そのものが減るわけではありません。

最大の費用対効果は、機械的フェーズを Haiku/Sonnet・低 effort に固定し、Opus を「難所」と「最終検証」だけに集中させる運用にあります。逆に、難所に安価モデルを当てて差し戻しが増えれば、再実行コストでむしろ高くつくので、配分は実績でチューニングする前提です。

9. まとめ

大名システム（四層エージェント運用）に Dynamic Workflows を部分的に組み込んだ。

承認ゲートのあるフェーズは対話のまま、ファンアウトが効くフェーズだけ Workflow 化するのが肝。「全部 Workflow 化」は承認が止められず破綻する。
モデル/effort をスクリプトで固定でき、コスト最適化が口頭ルールから機械的保証へ。
ただしトークン削減ではなくコスト削減＋暴走防止である点を取り違えないこと。

「家老の采配」を決定論スクリプトに落とし、「殿の判断」と「マスターの承認」は人間（と対話）に残す——責務の境界をそのまま Workflow の境界として残せたため、既存の大名システムのブラッシュアップにつながる設計となりました。
3Go to list of users who liked3Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
