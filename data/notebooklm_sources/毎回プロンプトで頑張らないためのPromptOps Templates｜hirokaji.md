# 毎回プロンプトで頑張らないためのPromptOps Templates｜hirokaji
- **Source URL**: https://note.com/tasty_dunlin998/n/n68eb27bc3b59
- **Score**: 85
- **AI Summary**:
  - AIへの指示を棚卸しし、常設ファイル・Hook・Skill・Subagentへ分離する運用戦略を提示
  - 完了条件を定義する「Done when」テンプレートにより、AIによる自己評価と出力精度を改善
  - CLAUDE.mdを肥大化させず、AIとの作業契約として最小限に保つための具体的な構成案を解説
- **Read Now Reason**: Claude Code等のAIエージェント導入時に直面する、プロンプトの冗長化や設定ファイルの肥大化を解決する実戦的なYAML形式のテンプレートと設計原則が含まれているため。
- **Suggested Tags**: #PromptOps, #AI駆動開発
- **Processed Date**: 2026/5/7

---

## 本文
Claude Code / Codexで使う、Done when・Hook・Skill・承認境界の実務テンプレート前回のDaily記事では、AIが賢くなったことで、昔ながらのプロンプト術が少しずつ変わってきている、という話をしました。昔は、AIにうまく働いてもらうには、人間が長く、詳しく、丁寧に説明することが重要でした。もちろん今でも、丁寧な説明は大事です。ただ、Claude Code や Codex のように、AIがファイルを読み、コマンドを実行し、テストし、差分を確認できる環境では、毎回プロンプトで頑張るよりも、AIが動ける環境を整える方が効く場面が増えています。この記事は、その実務テンプレートです。扱うのは、次の7つです。Done when テンプレートCLAUDE.md / AGENTS.md 棚卸しチェックリストHook化候補リストSkill化候補リストSubagent分離判断メモApproval / Sandbox 境界設計メモCLI化できる作業の棚卸しワークシート目的はひとつです。毎回プロンプトでお願いしていることを、再利用できる実行環境へ移すことです。まず、毎回お願いしていることを書き出す最初にやることは自動化ではなく、毎回AIに言っている依頼を見える化し、置き場を分けること。いきなりHookやSkillを作ろうとすると、だいたい重くなります。最初にやるべきことは、自分がAIに毎回言っていることを棚卸しすることです。たとえば、こういうものです。最後にテストして変更ファイルを列挙して勝手に本番へつながないでまず関連ファイルを読んで実装前に方針を出して既存の文体に合わせてセキュリティ観点も見てやったことと不安点を最後にまとめて変更前に影響範囲を確認して形式が崩れていないか確認してこうした依頼は、毎回チャットに書くよりも、常設ファイル、Hook、Skill、Subagent、承認境界へ分けた方が安定します。まずは、次のメモをコピーして使ってください。routine_prompt_inventory:
  repeated_requests:
    - request: ""
      example_phrase: ""
      happens_every_time: false
      important_for_quality: false
      important_for_safety: false
      can_be_checked_deterministically: false
      needs_human_judgment: false
      should_be:
        - prompt
        - claude_md_or_agents_md
        - hook
        - skill
        - subagent
        - approval_boundary
        - cli_pipeline
      note: ""書き方の例です。routine_prompt_inventory:
  repeated_requests:
    - request: "変更後にテストを実行してほしい"
      example_phrase: "最後に npm test を実行して、結果を書いてください"
      happens_every_time: true
      important_for_quality: true
      important_for_safety: false
      can_be_checked_deterministically: true
      needs_human_judgment: false
      should_be:
        - hook
        - cli_pipeline
      note: "コード変更がある場合だけ必須にする"

    - request: "認証まわりはセキュリティ観点でレビューしてほしい"
      example_phrase: "token handling と session 周りも見てください"
      happens_every_time: false
      important_for_quality: true
      important_for_safety: true
      can_be_checked_deterministically: false
      needs_human_judgment: true
      should_be:
        - skill
        - subagent
      note: "特定領域に触れた時だけ発火させる"この棚卸しの時点で、すべてを自動化しようとしなくて大丈夫です。むしろ最初は、「これは毎回書く必要があるのか」「これは環境側に逃がせるのか」「これは人間が判断すべきなのか」を分けるだけで十分です。Template 1：Done when テンプレート曖昧な依頼は、完了条件に変換する。何をするかより、何を満たせば完了かを先に揃える。まず一番使いやすいのが、Done when、つまり完了条件です。AIに仕事を頼むとき、「何をするか」だけを書くと、完了判断が曖昧になります。一方で、「何を満たせば完了か」を渡すと、AIは自分で確認しやすくなります。基本形はこれです。以下の作業を行ってください。

目的:
- 

対象範囲:
- 

制約:
- 

完了条件:
- 
- 
- 

作業後に返すもの:
- 変更した内容の要約
- 変更ファイル一覧
- 実行した確認コマンド
- 確認結果
- 残っている不安点コード作業なら、こうです。以下のバグを修正してください。

目的:
- ログイン後にセッション更新が失敗する問題を直す

対象範囲:
- src/auth/
- tests/auth/

制約:
- 認証方式そのものは変えない
- 既存のAPIレスポンス形式は変えない
- 影響範囲が広がる場合は、実装前に一度止める

完了条件:
- 再現テストが追加されている
- 既存テストが通る
- セッション更新の正常系と異常系が確認されている
- 変更ファイルを最後に列挙している
- 実行した確認コマンドを書いている

作業後に返すもの:
- 原因
- 修正内容
- 変更ファイル
- 実行した確認コマンド
- テスト結果
- まだ不安が残る点文章作業なら、こうです。以下の記事本文をレビューしてください。

目的:
- note向けに読みやすくする
- 主張の流れを明確にする
- AIっぽい言い回しを減らす

対象範囲:
- 本文全体
- 見出し
- 導入と結論

制約:
- 主張の芯は変えない
- 文体は論考調を維持する
- 表形式にはしない
- 過剰な箇条書きにしない

完了条件:
- 導入で読者メリットが伝わる
- 見出しが結論に必要な部品だけになっている
- 1段落1役割に近づいている
- 文末に次の行動がある
- 不自然なAI定型句が減っている

作業後に返すもの:
- 修正方針
- 修正文
- 迷った点
- 追加で改善できる点Done when は、軽いプロンプト改善のように見えます。しかし実際には、AIに小さな評価回路を渡しているのに近いです。完了条件があると、AIは自分の出力を照らし合わせやすくなります。だから、最初にテンプレ化するなら、HookよりもSkillよりも、まずDone whenです。Template 2：CLAUDE.md / AGENTS.md 棚卸しチェックリストCLAUDE.md / AGENTS.md は百科事典ではなく作業契約。毎回守ることだけを残し、長い手順や確認は別の部品へ逃がす。次に見るべきなのが、CLAUDE.md や AGENTS.md のような常設ファイルです。ここに何でも書くと、すぐ太ります。常設ファイルに残すべきなのは、毎回守らないと壊れることです。逆に、特定作業だけで使う長い手順は、Skillへ逃がします。毎回起きてほしい確認は、Hookへ逃がします。人間が判断すべき境界は、Approvalへ逃がします。まずはこのチェックリストで見直します。persistent_contract_audit:
  file:
    - CLAUDE.md
    - AGENTS.md

  keep_if:
    - "毎回の作業で必要"
    - "このプロジェクト固有"
    - "守らないと壊れる"
    - "短く書ける"
    - "更新責任者が明確"

  move_to_skill_if:
    - "特定作業でだけ使う"
    - "手順が長い"
    - "入力と出力が決まっている"
    - "再利用するワークフローである"

  move_to_hook_if:
    - "毎回確認したい"
    - "機械的に判定できる"
    - "忘れると品質や安全性が落ちる"
    - "人間の判断を待たずに検査できる"

  move_to_approval_if:
    - "失敗時の影響が大きい"
    - "本番環境や外部送信に触れる"
    - "秘密情報や権限に関わる"
    - "破壊的な操作を含む"

  remove_if:
    - "一般論すぎる"
    - "古い"
    - "今の運用と矛盾している"
    - "誰も守っていない"
    - "他の場所に正本がある"常設ファイルの最小形は、これくらいで十分です。# Project Working Contract

## Purpose

このプロジェクトでAIが作業するときの最小契約を定義する。

## Always

- 変更前に対象範囲を確認する
- 既存の設計方針と矛盾する変更を避ける
- 不明点が成果物の品質に影響する場合は、実装前に確認する
- 作業後に変更内容、変更ファイル、確認結果をまとめる

## Commands

- lint: `npm run lint`
- test: `npm test`
- typecheck: `npm run typecheck`

## Before Editing

- 関連ファイルを読む
- 既存テストを確認する
- 影響範囲が広い場合は、実装前に変更方針を出す

## Do Not

- 本番環境へ接続しない
- secretやcredentialを出力しない
- 破壊的な操作を承認なしに実行しない
- 仕様が不明なまま大きな設計変更をしない

## Output

作業後は、以下を返す。

- 変更内容
- 変更ファイル
- 実行した確認コマンド
- 確認結果
- 残るリスクポイントは、ここに全部を書かないことです。常設ファイルは、AIに読ませる百科事典ではありません。毎回守るべき作業契約です。ここまでで、毎回プロンプトでお願いしていたことを、Done when と常設ファイルへ分けるところまで整理しました。ここから先は、さらに一段実務寄りです。毎回の確認を Hook にする。再利用する手順を Skill にする。調査やレビューを Subagent に分ける。危ない操作を Approval / Sandbox で止める。定型作業を CLI へ流す。つまり、AIにお願いする文章を整えるだけではなく、AIが動く環境そのものを整えていきます。PromptOps Templates では、こうした実務テンプレートを、そのまま自分の環境へ写せる形で蓄積していきます。Claude Code / Codex を、毎回のチャット相手ではなく、再現性のある実行環境として育てたい方は、ここから先のテンプレートもぜひ活用してください。
