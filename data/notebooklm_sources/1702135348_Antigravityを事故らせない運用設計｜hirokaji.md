# Antigravityを事故らせない運用設計｜hirokaji
- **Source URL**: https://note.com/tasty_dunlin998/n/n0dd53c5c4406
- **Score**: 92
- **AI Summary**:
  - RulesをGlobal/Workspace/Workflowの3層に分離し、コンテキスト肥大化による精度低下とコスト増を防ぐ設計手法。
  - Artifact（実施計画や成果物）を単なるログではなく、承認・検証が必須の「ゲート」としてDoDに組み込む運用指針。
  - サンドボックスでのドライラン、コマンド拒否リスト、並列数制限など、ツールの外側で構築すべき運用ハーネスの具体例。
- **Read Now Reason**: AIエージェント開発環境における事故防止と効率化のための具体的設定（YAML形式の階層構造やプロンプト）が明記されており、自動化パイプラインの設計に即座に適用可能なため。
- **Suggested Tags**: #AI駆動開発, #Antigravity, #自律エージェント, #運用設計, #リスク管理
- **Processed Date**: 2026/5/14

---

## 本文
Antigravityは強力ですが、Rules を増やせば安全になる道具ではありません。Workflows、実行ポリシー、Artifactレビューに加え、外側でドライランとCIゲートを敷くと、誤実行と運用負債をかなり減らせます。ルールは長く書くより、役割で分けたほうが効くAntigravity は、単なる補完ではなく、自律エージェントを複数走らせる agent-first の開発環境として設計されています。Rules はローカルまたはグローバルで効く制約で、Workflows は / で呼び出す保存済みプロンプトです。公式 codelab では、Rules と Workflows を明確に分け、さらに「毎回すべての rule や tool を文脈に載せると、tool bloat が起き、コスト・遅延・混乱が増える」とまで書いています。つまり、全部を global に押し込む設計は、整理不足というだけでなく、品質とコストの両方を悪化させやすい、ということです。 ここで効くのは、ルールを増やすことではなく、どこで効かせるか を分けることです。・グローバルには「秘密情報を出さない」「workspace外を書き換えない」のような普遍条件だけを置く。・リポジトリ固有の命名規則や編集対象ディレクトリは workspace rules に置く。・単体テスト生成やブラウザ回帰確認のように、毎回は不要だが時々強く効かせたい処理は workflow に逃がす。この分割をしておくと、関係ないタスクに重い指示がぶら下がりにくくなります。公式 codelab でも、unit test 生成は rule ではなく workflow に置いて、必要なときだけ /generate-unit-tests で呼ぶ例を示しています。 まずやるべき再配置は、次の3層です。rule_partition:
  global:
    - secretsを出力しない
    - workspace外を書き換えない
    - 破壊的コマンドは提案のみ
  workspace:
    - docs/ 配下のみ編集可
    - main.py はエントリだけに保つ
    - テスト名は test_ 接頭辞に統一
  workflows:
    - generate-unit-tests
    - browser-regression-check
    - release-note-draft本当に事故率を左右するのは、ルールの文面より権限の面積ですAntigravity には、Terminal Execution policy、Review policy、JavaScript Execution policy があります。端的に言えば、何を自動実行させるか と どこで止めるか を別々に決められます。特にブラウザ側は重要で、公式 codelab は JavaScript の Always Proceed について、最大の自律性を与える一方で、security exploits への露出が最も高い と明言しています。さらに、Secure mode と Review-driven development が用意されており、codelab は Review-driven development を推奨バランスとして紹介しています。ルールがどれだけ丁寧でも、実行権限が広すぎれば事故の半径は小さくなりません。この設計から読める実務上の含意ははっきりしています。・最初から Agent-driven で走らせるのではなく、既定値を Review-driven に寄せる。・ブラウザ検証が不要な作業では JavaScript を Disabled にする。・ターミナルは Request review を基本にし、deny list に破壊的コマンドを必ず入れる。これだけでも、ルール文の調整より先に、事故率をかなり下げられます。ブラウザ操作自体も Antigravity Browser Extension 前提で、Web 参照や操作の経路がはっきりしているので、レビュー点を作りやすい設計です。 Artifactはログではなく、ゲートに変えるAntigravity の強みは、結果だけでなく途中の考え方を Artifact として残せるところです。公式 docs では Artifact を、エージェントが作業を進めたり、人間に思考や成果を伝えたりするために作るものと定義しています。Implementation Plan は review policy に応じて人間レビューを要求し、Walkthrough にはブラウザ確認のスクリーンショットや録画が含まれます。codelab でも、コード生成後にブラウザで手動テストを行い、その内容を walkthrough file にまとめ、さらにそこへコメントして再修正する流れが示されています。ここでありがちな失敗は、Artifact を「あとで見るログ」として扱うことです。そうではありません。Implementation Plan を承認するまで実行させない、Walkthrough かテスト結果が揃うまで完了扱いにしない、というゲートに変えた瞬間に、Artifact は安全装置になります。ルールは行動方針ですが、Artifact は監査のための観測点です。観測点を DoD に埋め込むと、レビューが「気分で見るもの」から「通さないと進めないもの」に変わります。そのまま使える DoD の最小形は、これで十分です。完了条件
- Implementation Plan が作成され、承認済みである
- 変更ファイル一覧が scope 内に収まっている
- 破壊的コマンドが実行されていない
- テスト結果、または Walkthrough の要約が提出されている
- レビュー指摘に対する再実行履歴が残っている本番前に必要なのは、Antigravityの外側に置くプレフライトですここからは Antigravity の標準機能というより、チーム側の運用ハーネス の話です。公式に確認できるのは、Rules、Workflows、実行ポリシー、Artifact、Browser subagent、Planning と Fast のモードです。一方で、何時から何時まで実行してよいか、何並列まで許すか、どのレポジトリだけを触らせるか、どのサンプル課題で事前検証するか、といった運用境界は、チームが外側で持ったほうが扱いやすい。Antigravity は Agent Manager から複数エージェントを非同期に走らせられるので、便利さと同時に、並列数そのものが新しいリスク面 になります。 そのため、本番 workspace に入る前に、別の sandbox で dry-run する流れを先に作っておくと効きます。しかも dry-run は Planning モードで回すのがよい。公式 codelab でも、Planning は task groups を作り、Artifacts を多く出し、Fast は小さく局所的なタスク向けだと説明されています。まず Planning で計画と観測点を増やし、スコープが安定してから Fast を使う。この順番にすると、速さのために安全を捨てずに済みます。 以下は、そのまま流用できる最小の運用ハーネス例です。harness:
  target_workspace: apps/release-notes
  execution_window: "08:30-19:00 Asia/Tokyo"
  max_parallel_agents: 2

  default_mode:
    planning_mode: planning
    terminal_policy: request_review
    browser_js_policy: disabled
    artifact_review: request_review

  deny_commands:
    - "rm -rf"
    - "del /s /q"
    - "git push --force"
    - "sudo"

  dryrun:
    sandbox_clone: ".sandbox/release-notes"
    sample_tasks:
      - "docs/配下の更新履歴から週報ドラフトを作る"
      - "コード変更なしで差分要約だけ作る"
    accept_criteria:
      - "変更ファイルが scope 内"
      - "Implementation Plan が作成されている"
      - "破壊的コマンドが提案止まり"
      - "Walkthrough またはテスト結果がある"

  promotion_gate:
    - "dryrun 合格"
    - "人間レビュー完了"
    - "本番 workspace で再実行"大事なのは、これを「厳しすぎる儀式」にしないことです。導入初週は、まず3つだけで十分です。・既存ルールを global / workspace / workflow に分ける。・既定モードを Review-driven 相当に寄せる。・sandbox clone で sample task を2本だけ回す。この3つをやるだけで、だいぶ運用が締まります。そのまま使える実行プロンプトルールだけでは曖昧になりやすいので、実行時に毎回渡す短いプロンプトも持っておくと安定します。これは Antigravity の標準機能ではなく、運用を揃えるための補助です。あなたは Antigravity 上で作業するエージェントです。
次の順で進めてください。

1. まず Task List と Implementation Plan を作成する。
2. 変更予定ファイル、実行予定コマンド、必要なブラウザ操作を先に列挙する。
3. workspace外の書き込み、削除、権限変更、認証情報参照は提案のみとし、実行しない。
4. Browser JavaScript が必要な場合は、目的・対象URL・理由を示し、承認を待つ。
5. 実装後は、変更ファイル一覧、テスト結果、または Walkthrough の要約を返す。
6. 制約に触れる可能性が少しでもあれば停止し、代替案を3つ提示する。このプロンプトの狙いは単純です。Antigravity がもともと持っている Implementation Plan や Walkthrough を、単なる出力物ではなく、先に出させるもの に変えることです。人間が後追いで diff を眺めるより、先に「何を触るか」を出させたほうが、止める判断がしやすくなります。導入初週のチェックリスト最後に、明日から試せる最小チェックリストを置いておきます。□ global rules には普遍条件しか置いていない□ repo 固有の規約は workspace rules に分離した□ 重い処理は workflow に逃がした□ 既定の terminal policy は request review になっている□ browser JavaScript は必要時だけ有効にする□ dry-run 用の sandbox clone がある□ Implementation Plan を承認しない限り進めない□ Walkthrough かテスト結果を完了条件に入れた□ 破壊的コマンドを deny list に入れた□ 並列エージェント数をチームで決めたこの10個が埋まっていれば、Antigravity は「勢いで全部やらせる道具」から、「任せる範囲を切って増やせる道具」に変わります。まとめAntigravity の Rules は重要ですが、事故を止める主役ではありません。主役は、実行権限の絞り込み、Artifact をゲートに変える運用、そして 外側のプレフライト です。ルールを上手に書くより先に、どこで止めるかを決める。そこまで作ってはじめて、AIエージェントは速いだけでなく、任せやすくなります。
