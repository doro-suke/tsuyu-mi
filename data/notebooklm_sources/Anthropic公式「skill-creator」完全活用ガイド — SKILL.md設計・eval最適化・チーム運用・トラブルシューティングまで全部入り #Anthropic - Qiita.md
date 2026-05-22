# Anthropic公式「skill-creator」完全活用ガイド — SKILL.md設計・eval最適化・チーム運用・トラブルシューティングまで全部入り #Anthropic - Qiita
- **Source URL**: https://qiita.com/TaichiEndoh/items/8b8ed06bb76a80bb34c2
- **Score**: 92
- **AI Summary**:
  - Anthropic公式のスキル構築支援ツール「skill-creator」の設計と運用の詳細解説
  - スキルの自動評価（eval）機能により、トリガー率向上や品質改善のループを自動化可能
  - APIやClaude Codeとの連携、MCPとの役割分担、セキュリティ監査手法までを網羅
- **Read Now Reason**: 2025年12月リリースの最新仕様に基づき、AI駆動開発におけるエージェントの挙動を制御する「Agent Skills」の具体的な実装・評価・最適化手法が網羅されており、即座にプロジェクトへ適用可能なため。
- **Suggested Tags**: #Anthropic, #AgentSkills, #ClaudeCode, #LLMOps, #自動化パイプライン
- **Processed Date**: 2026/5/7

---

## 本文
この記事のポイント（3行要約）


skill-creatorはAnthropic公式が配布する「スキルを作るためのスキル」。Claudeに自分専用の作業手順を教え込める
2025年12月18日にAgent Skillsとして正式リリース。Claude.ai、Claude Code、APIで共通して使える
「フォルダにSKILL.mdを置くだけ」で作れる。コード不要でも始められるが、評価（eval）機能まで使うと本格的なカスタマイズが可能


はじめに — なぜ今「スキル」なのか
ChatGPTを使っていて、こんな経験はないだろうか。

「この書き方でブログを書いて」と毎回長いプロンプトを貼り付ける
プロジェクトごとに前提ルールを説明し直す
チームで「Claudeへの頼み方」がバラバラ

Anthropicが2025年12月にリリースした**Agent Skills（以下Skills）**は、これを解決する仕組みだ。Claudeはスキルを使って特定のタスクのパフォーマンスを向上させることができ、スキルは指示・スクリプト・リソースを含むフォルダで、必要なときにClaudeが読み込む。
そしてそのスキルを作るためのスキルが、今回紹介するskill-creatorだ。


🔰 初心者向け — そもそもスキルって何？

スキル = Claudeへの「マニュアル集」
想像してほしい。新入社員が入ってきたとき、あなたは何を渡すだろうか？

業務マニュアル
報告書のテンプレート
「うちの会社ではこう書く」という暗黙のルール集

Claudeにおけるスキルは、まさにこれと同じだ。
my-skill/
├── SKILL.md       ← マニュアル本体（必須）
├── scripts/       ← 自動化スクリプト（任意）
├── references/    ← 参考資料（任意）
└── assets/        ← テンプレート・画像（任意）

SKILL.mdには、「こういう場面で、こういう手順で仕事をしてね」という指示を書く。それだけだ。

スキルの魔法：必要なときだけ呼び出される
Claudeはタスクに関連するときだけスキルにアクセスする。つまり、10個のスキルを入れておいても、ブログ執筆を頼めばブログ執筆スキルだけが呼び出され、他のスキルは邪魔しない。
これは**Progressive Disclosure（段階的開示）**と呼ばれる仕組みで、3階層で動いている：



レベル
内容
常に読み込まれる？




1. メタデータ
name + description（約100語）
常時


2. SKILL.md本体
マニュアル（500行以内推奨）
スキルが呼び出されたとき


3. バンドルリソース
scripts/references/assets
必要なときだけ



たとえ話： 会社の全マニュアルを机に広げっぱなしにはしない。タイトルだけ目次で見て、必要な章だけ開く。スキルもそれと同じだ。

skill-creator = マニュアルを作るためのマニュアル
じゃあ「そのSKILL.mdってどう書けばいいの？」という問いに答えるのが、skill-creatorだ。
Anthropic公式の説明：

Create new skills, modify and improve existing skills, and measure skill performance.
（新しいスキルを作り、既存のスキルを修正・改善し、スキルのパフォーマンスを測定する）

つまり、skill-creatorをインストールしてClaudeに「スキルを作りたい」と話しかければ、Claudeが対話形式で一緒にスキルを作ってくれる。skill-creatorスキルはインタラクティブなガイダンスを提供し、Claudeがワークフローについて質問し、フォルダ構造を生成し、SKILL.mdファイルをフォーマットし、必要なリソースをバンドルする。手動でのファイル編集は不要。


🔧 中級者向け — skill-creatorの構成と使い方

インストール方法（Claude.ai）

Claude.aiの設定画面で「Skills」機能をオンにする
Anthropic公式のskill-creatorをインストール
チャットで「〇〇するスキルを作って」と話しかける


skill-creatorのフォルダ構成
実際のskill-creatorを開くと、以下の構成になっている：
skill-creator/
├── SKILL.md                     ← メイン指示書
├── agents/                      ← 専門サブエージェント
│   ├── analyzer.md              ← 結果分析担当
│   ├── comparator.md            ← A/B比較担当
│   └── grader.md                ← 採点担当
├── assets/
│   └── eval_review.html         ← レビュー画面
├── eval-viewer/
│   ├── generate_review.py       ← レビュー画面生成
│   └── viewer.html              ← ビューア
├── references/
│   └── schemas.md               ← JSON構造の仕様書
└── scripts/
    ├── aggregate_benchmark.py   ← ベンチマーク集計
    ├── generate_report.py       ← レポート生成
    └── run_loop.py              ← 最適化ループ実行


標準的なスキル作成プロセス（6ステップ）
skill-creatorが案内してくれる流れはこうだ：


意図のヒアリング — 何をさせたいスキルか、いつトリガーさせたいか

ドラフト作成 — SKILL.mdを書く

テストケース作成 — 2〜3個のリアルなユーザープロンプトを用意

評価（eval）の実行 — スキルありvs.なしでテストし、結果を比較

改善ループ — 結果をレビューしてSKILL.mdを修正

パッケージング — .skillファイルとして配布可能にする


description（説明文）が命
YAMLフロントマターのdescriptionは、Claudeがそのスキルを呼び出すかどうかを判断する唯一の手がかりだ。ここで手を抜くと、せっかく作ったスキルが呼び出されない。
skill-creator自身が自分のSKILL.mdで警告している：

Note: currently Claude has a tendency to "undertrigger" skills -- to not use them when they'd be useful. To combat this, please make the skill descriptions a little bit "pushy".

意訳すると「Claudeはスキルを遠慮して呼ばない傾向がある。だから説明文は少し押しつけがましいくらいでちょうどいい」。



NG（遠慮がちな書き方）
OK（しっかりトリガーされる書き方）




「社内データのダッシュボードを作るスキル」
「社内データのダッシュボードを作るスキル。ユーザーがダッシュボード、データ可視化、社内メトリクス、会社データの表示について言及したら必ずこのスキルを使うこと」




評価（eval）機能で品質を測る
skill-creatorの最大の特徴は、スキルの品質を定量的に測定できること。
scripts/run_loop.pyを実行すると、次のことが自動で行われる：

評価セットを60%が学習用、40%がテスト用に分割
各クエリを3回ずつ実行してトリガー率を計測
Claude自身が失敗パターンを分析してdescription改善案を提示
最大5回の改善ループを回す
過学習を防ぐため、テストスコアで最良版を選択


これは機械学習の世界でいうtrain/test splitの発想そのものだ。


🚀 上級者向け — アーキテクチャと応用

スキルの配布形式とエコシステム
2025年12月のリリースで、AgentSkillsはオープンスタンダードとして公開され、クロスプラットフォームのポータビリティが実現した。
配布方法は以下の3つ：



方法
対象
特徴





.skillファイル（zip）
Claude.ai
GUIでアップロード可能


ファイルシステム
Claude Code

~/.claude/skillsに配置


API
Claude API

/v1/skillsエンドポイント



Claude.aiはプリビルトのAgent Skillsとカスタムスキルの両方をサポート。Claude Codeはカスタムスキルのみサポート。APIではプリビルトスキルはskill_id（例：pptx、xlsx）で参照し、カスタムスキルは/v1/skillsエンドポイントでアップロード・管理できる。

APIでの使用（エンジニア向け）
APIで使う場合、事前に/v1/skillsエンドポイントでアップロードし、MessagesAPIリクエストに含める。SkillsはCode Execution Tool betaを必要とし、これがスキルの実行に必要な安全な環境を提供する。

MCPとSkillsの違い・使い分け
似た概念にMCP（Model Context Protocol）があるが、役割は明確に異なる：



観点
MCP
Skills




提供するもの
外部データ・ツールへのアクセス
ワークフローの知識・手順


実行タイミング
ツールが呼ばれたとき
関連するタスクに出会ったとき


内容
APIコール・データ取得
マニュアル・テンプレート


作成難度
サーバー実装が必要
Markdownだけでも可能




If you already have a working MCP server, you've done the hard part. Skills are the knowledge layer on top.
（MCPサーバーがすでに動いているなら難しい部分は終わっている。スキルはその上にある知識層だ）

MCPが「手」なら、Skillsは「段取り書」。両方組み合わせるのが強い。

セキュリティ上の注意
Anthropicは信頼できるソース（自分で作成したものやAnthropicから入手したもの）からのスキルのみを使用することを強く推奨している。スキルは指示とコードを通じてClaudeに新しい機能を提供するため、悪意のあるスキルはデータ持ち出し・不正アクセス・その他のセキュリティリスクにつながる可能性がある。
医療・業務データを扱う場面では特に重要で、以下を確認する：

SKILL.md、scripts、画像など、バンドルされた全ファイルを監査
予期しないネットワーク呼び出し・ファイルアクセスパターンの有無を確認
スキルの謳っている目的と一致しない操作がないかチェック


compatibilityフィールドの活用
スキルが特定のプラットフォーム機能に依存する場合、YAMLフロントマターで明示できる：
---
name: my-skill
description: ...
compatibility:
  required_tools:
    - code_execution
  platforms:
    - claude.ai
---

スキルはClaude.ai、Claude Code、APIで同一に動作する。一度作れば変更なしにすべての環境で動く。ただしスキルによっては特定プラットフォームの機能を最大限活用するよう設計されているものもあり、作者はcompatibilityフィールドでその旨を示せる。


実際に使ってみての所感
筆者（臨床工学技士 × AIエンジニア）は、自分の執筆スタイルをスキル化している。

三階層構成（🔰初心者/🔧中級者/🚀上級者）
一次情報出典の徹底
法的チェックリスト

これをSKILL.mdに書いてskill-creatorに読ませ、改善ループで磨き上げた。結果、毎回同じ品質で記事ドラフトが生成されるようになった。チーム内でスタイルを統一したい場合にも有効だ。
一方で注意点も：


スキルが増えすぎるとトリガー競合が起きる → 定期的な整理が必要

description次第で呼ばれない問題 → run_loop.pyでの最適化が実質必須

Claude.ai / Claude Code / APIで同期しない → カスタムスキルはサーフェス間で同期しない。Claude.aiにアップロードされたスキルはAPIに別途アップロードが必要で、API経由でアップロードされたスキルはClaude.aiで利用できない

この最後の点は運用上けっこうハマるポイントなので、配布計画時に考慮しておきたい。


📝 ハンズオン — SKILL.mdの書き方テンプレート

最小構成のSKILL.md
コード不要で動く最小のスキルはこれだけだ。
name: blog-writer
description: |
  技術ブログ記事を執筆するスキル。ユーザーがブログ記事、技術記事、
    Qiita、Zennについて言及したら必ずこのスキルを使うこと。
    version: 1.0.0
    ---

    # ブログ執筆スキル

    ## 目的
    技術記事を一定のフォーマットで高品質に執筆する。

    ## 構成テンプレート
    1. **導入** — 読者の課題感に共感する（3〜5行）
    1. 2. **本論** — 3〜5つのセクションに分けて説明
    1. 3. **コード例** — 動作確認済みのサンプルを必ず含める
    1. 4. **まとめ** — 箇条書きで要点を整理

## 文体ルール
- 口語的だが技術的に正確
- - 一文50字以内
- - 専門用語は初出時に説明する

## 品質チェックリスト
- [ ] コードは実際に動作するか
- [ ] - [ ] 外部リンクは一次情報か
- [ ] - [ ] まとめは本文と対応しているか
- [ ] ```

### description設計のコツ

前述の通り、descriptionがトリガーを決める命綱だ。以下の要素を含めると精度が上がる。

| 要素 | 例 |
|---|---|
| **スキル名（何をするか）** | 「技術ブログ記事を執筆するスキル」 |
| **トリガーキーワード** | 「ブログ記事、Qiita、Zenn、記事について言及したら」 |
| **必須度の明示** | 「必ずこのスキルを使うこと」 |
| **除外条件（あれば）** | 「コードレビューや質問応答には使わない」 |

### 実用ユースケース別スキル例

Qiitaエンジニアが実際に使えるスキルのアイデアをいくつか挙げる。

**コードレビュースキル**
```markdown---
name: code-reviewer
description: |
  コードレビューを行うスキル。PR、コードの改善点、バグ検出、
    セキュリティチェックについて言及されたら必ずこのスキルを使うこと。
    ---
    # レビュー観点
    1. バグ・エラーハンドリングの抜け
    1. 2. セキュリティ（SQL injection, XSS, 認証漏れ）
    1. 3. パフォーマンス（N+1クエリ、不要なループ）
    1. 4. 可読性・命名規則
    1. 5. テスト網羅率
    1. ```

**議事録スキル**
```markdown---
name: meeting-minutes
description: |
  会議の議事録を作成するスキル。ミーティング、議事録、
    会議メモについて言及されたら必ずこのスキルを使うこと。
    ---
    # 出力フォーマット
    ## 日時・参加者
    ## 決定事項（アクション付き）
    ## 議論のポイント
    ## 次回アジェンダ
    ```

    ---

    ## 🔬 eval（評価）機能の詳細

    ### なぜevalが重要か

    SKILL.mdを書いたはいいが、「本当にちゃんと呼ばれているか？」「期待通りのアウトプットが出ているか？」を測定しないと、スキルの品質は主観的評価に留まる。

    skill-creatorの`scripts/run_loop.py`は、これを**自動化**する。

    ### evalセットの設計

    evalは「テストケース」の集まりだ。各ケースは以下の3要素で構成される。

    ```json
    {
      "id": "test_001",
        "query": "Pythonのリスト内包表記について記事を書いて",
          "expected_behavior": "ブログ執筆スキルがトリガーされ、構成テンプレートに沿った記事が生成される",
            "success_criteria": [
                "スキルがトリガーされている",
                    "導入・本論・まとめの構成になっている",
                        "コードサンプルが含まれている"
                          ]
                          }
                          ```

                          **設計のポイント：**
                          - ポジティブケース（スキルが呼ばれるべきケース）とネガティブケース（呼ばれるべきでないケース）の両方を用意する
                          - - 最低10件、できれば30件以上用意するとrun_loop.pyの精度が上がる
                          - - リアルなユーザーの言い回しを使う（「記事を書いて」「ブログにまとめて」など揺らぎを含める）

### 改善ループの見方

run_loop.pyを実行すると、以下のようなレポートが出力される。


Iteration 1/5
Trigger rate: 62% (18/29 queries triggered the skill)
Top failure patterns:
- "まとめて"という表現でトリガーされない (5件)
-     - 英語クエリでトリガーされない (3件)
-       Suggested description improvement:
-           → "記事、ブログ、まとめ、article、writeについて言及したら..."
Iteration 2/5
Trigger rate: 83% (24/29 queries triggered the skill)
...
```
このフィードバックを見ながら、descriptionを育てていく。**5回のループで80%以上のトリガー率を目標にするとよい。**

---


🏢 チームでの活用 — スキルを組織資産にする

なぜチームでスキルを共有するのか
個人がスキルを作るだけでは「属人化の再発明」にすぎない。スキルをチームで共有することで、Claudeへの頼み方の標準化とベストプラクティスの蓄積が実現する。
想定効果：

オンボーディング時間の短縮（スキルが「Claudeへの操作マニュアル」になる）


アウトプット品質のばらつき解消




「あの人はどうやってClaudeに頼んでいるの？」という暗黙知の形式知化




チーム導入の3ステップ
Step 1: スキルリポジトリを作る
GitHubにプライベートリポジトリを用意し、スキルを一元管理する。
team-skills```├── README.md              ← スキル一覧と使い方
├── blog-writer```│   ├── SKILL.md
│   └── references```│       └── style-guide.md
├── code-reviewer```│   └── SKILL.md
├── incident-report```│   └── SKILL.md
└── release-notes```    ├── SKILL.md
    └── assets```        └── template.md
    ```

    **Step 2: スキルのバージョン管理とリリースフロー**

    ```yaml
    # SKILL.mdのYAMLフロントマター例（チーム向け）
    ---
    name: code-reviewer
    version: 2.1.0
    description: |
      コードレビューを行うスキル。PR、コードの改善点、バグ検出、
        セキュリティチェックについて言及されたら必ずこのスキルを使うこと。
        author: backend-team
        last_updated: 2025-12-20
        changelog:
          - v2.1.0: Rustのレビュー観点を追加
          -   - v2.0.0: セキュリティチェックリストを刷新
          -     - v1.0.0: 初版
          -     ---
          -     ```

バージョン管理の方針：
- `MAJOR`: スキルの目的や出力形式が大きく変わる
- - `MINOR`: 観点・チェックリストの追加
- - `PATCH`: 誤字・表現の修正

**Step 3: スキルのレビュープロセス**

個人が作ったスキルをチームに展開する前に、以下のレビューを推奨する。

```markdown## スキルレビューチェックリスト

### descriptionチェック
- [ ] トリガーキーワードが3つ以上含まれているか
- [ ] - [ ] 「必ずこのスキルを使うこと」などの強制表現があるか
- [ ] - [ ] 除外ケースが明記されているか（誤トリガー防止）

### SKILL.md本体チェック
- [ ] 目的が1〜2文で明確に書かれているか
- [ ] - [ ] 手順が番号付きで順序立てて書かれているか
- [ ] - [ ] 出力フォーマットの例が含まれているか
- [ ] - [ ] 500行以内に収まっているか

### evalチェック
- [ ] ポジティブケースが10件以上あるか
- [ ] - [ ] ネガティブケース（誤トリガー防止）が5件以上あるか
- [ ] - [ ] run_loop.pyでトリガー率80%以上を達成しているか
- [ ] ```

### ロールごとのスキル活用例

| ロール | 活用スキル例 | 効果 |
|---|---|---|
| フロントエンド | コンポーネント仕様書生成、アクセシビリティチェック | レビュー前の自己チェック自動化 |
| バックエンド | API設計レビュー、DBスキーマレビュー | 設計段階でのフィードバック高速化 |
| テックリード | ADR（Architecture Decision Record）作成 | 意思決定の記録・標準化 |
| QA | テストケース生成、バグレポートテンプレート | テスト設計の品質向上 |
| PM | 要件定義テンプレート、スプリントレトロ | ドキュメント作成コスト削減 |
| DevOps | インシデントレポート、ポストモーテム | 障害対応ナレッジの蓄積 |

---

## 🐛 トラブルシューティング — よくあるハマりポイントと解決策

### Q1. スキルが全然呼ばれない

**症状：** スキルをインストールしても、関連するタスクを頼んでも無視される。

**原因と解決策：**

```markdown# NG: 曖昧すぎるdescription
description: コードを書くのに役立つスキル

# OK: 明確なキーワードと強制表現
description: |
  Pythonコードを書くスキル。ユーザーがPython、スクリプト、
    自動化、データ処理、pandas、FastAPI、Djangoについて
      言及したら必ずこのスキルを使うこと。他の言語の場合は使わない。
      ```

      **チェックリスト：**
      - descriptionに具体的なキーワードが含まれているか確認
      - - 「必ずこのスキルを使うこと」などの強制表現を追加
      - - `run_loop.py`でトリガー率を測定し、失敗パターンを特定

### Q2. 関係ないタスクでもスキルが呼ばれてしまう（誤トリガー）

**症状：** ブログ執筆スキルなのに、コードの質問をしても呼ばれる。

**原因と解決策：**

```markdown# 除外条件を明示する
description: |
  技術ブログ記事を執筆するスキル。ユーザーがブログ記事、
    Qiita、Zenn、記事の執筆・構成について言及したら使うこと。
      ただし、コードの質問、バグ修正、コードレビューには使わない。
      ```

      ネガティブケースをevalセットに追加し、誤トリガーが減るまでrun_loop.pyで改善を回す。

      ### Q3. SKILL.mdを更新したのに反映されない

      **症状：** SKILL.mdを編集して保存したのに、Claudeの挙動が変わらない。

      **解決策：**

      | プラットフォーム | 対処法 |
      |---|---|
      | Claude.ai | スキルを一度削除して再アップロード |
      | Claude Code | `~/.claude/skills/`のファイルを更新後、新しいセッションを開始 |
      | API | `/v1/skills/{skill_id}`にPUTリクエストで更新 |

      **注意：** Claudeはセッション開始時にスキルを読み込む。同じセッション内でスキルを更新しても、そのセッションには反映されない。

      ### Q4. Claude.aiとAPIでスキルの挙動が違う

      **症状：** Claude.aiでは期待通りに動くのに、APIで使うと動作が異なる。

      **原因：** Claude.aiとAPIはスキルを別々に管理している。Claude.aiにアップロードしたスキルは自動的にAPIに反映されない。

      **解決策：**

      ```bash
      # APIにスキルをアップロード
      curl -X POST https://api.anthropic.com/v1/skills \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
          -H "anthropic-version: 2023-06-01" \
            -F "file=@my-skill.zip"
            ```

            APIでスキルを使う際は、MessagesAPIリクエストに`skill_ids`を含める：

            ```python
            import anthropic

            client = anthropic.Anthropic()

            response = client.beta.messages.create(
                model="claude-opus-4-5",
                    max_tokens=1024,
                        messages=[
                                {"role": "user", "content": "技術ブログ記事を書いて"}
                                    ],
                                        skill_ids=["your_skill_id_here"],
                                            betas=["skills-2025-12-18"]
                                            )
                                            ```

                                            ### Q5. run_loop.pyが途中でエラーになる

                                            **症状：** eval実行中に `RateLimitError` や `TimeoutError` が発生する。

                                            **解決策：**

                                            ```python
                                            # run_loop.py実行時の推奨オプション
                                            python scripts/run_loop.py \
                                              --skill-dir ./my-skill \
                                                --eval-file evals.json \
                                                  --max-iterations 3 \        # イテレーション数を減らす
                                                    --delay 2.0 \               # API呼び出し間隔を空ける
                                                      --model claude-haiku-4-5    # 高速・低コストモデルを使う
                                                      ```

                                                      evalの実行コストを抑えるため、本番前は`claude-haiku`でテストし、最終確認のみ`claude-opus`を使うのが効率的だ。

                                                      ### Q6. チームメンバーがスキルを「発見」できない

                                                      **症状：** スキルリポジトリを作ったが、メンバーがどのスキルが存在するか知らずに使われない。

                                                      **解決策：スキル一覧READMEの整備**

                                                      ```markdown
                                                      # チームスキル一覧

                                                      ## 📝 執筆・ドキュメント系
                                                      | スキル名 | トリガー例 | 担当 |
                                                      |---|---|---|
                                                      | blog-writer | 「ブログ記事を書いて」 | @alice |
                                                      | release-notes | 「リリースノートを作成して」 | @bob |
                                                      | adr-writer | 「ADRを書いて」 | @carol |

                                                      ## 🔍 レビュー系
                                                      | スキル名 | トリガー例 | 担当 |
                                                      |---|---|---|
                                                      | code-reviewer | 「コードをレビューして」 | @dave |
                                                      | pr-description | 「PR説明文を書いて」 | @eve |

                                                      ## 🚨 インシデント対応系
                                                      | スキル名 | トリガー例 | 担当 |
                                                      |---|---|---|
                                                      | incident-report | 「インシデントレポートを作成して」 | @ops-team |
                                                      | postmortem | 「ポストモーテムをまとめて」 | @ops-team |
                                                      ```

                                                      ---

                                                      ## ⚡ 上級テクニック — サブエージェントとスクリプト活用

                                                      ### サブエージェントでスキルを分割する

                                                      複雑なワークフローは、1つのSKILL.mdに詰め込まず、`agents/`ディレクトリにサブエージェントを置いて役割分担させる。

                                                      ```
                                                      complex-skill/
                                                      ├── SKILL.md           ← オーケストレーター（全体制御）
                                                      └── agents/
                                                          ├── researcher.md  ← 情報収集担当
                                                              ├── writer.md      ← 執筆担当
                                                                  └── reviewer.md    ← 品質チェック担当
                                                                  ```

                                                                  **SKILL.md（オーケストレーター）の書き方：**

                                                                  ```markdown
                                                                  ---
                                                                  name: deep-research-writer
                                                                  description: |
                                                                    深い調査が必要な技術記事を書くスキル。
                                                                      リサーチ、調査、詳細な技術記事について言及したら使うこと。
                                                                      ---

                                                                      # 深いリサーチ記事執筆スキル

                                                                      ## ワークフロー
                                                                      1. **researcher**エージェントに情報収集を依頼する
                                                                      1. 2. 収集した情報をもとに**writer**エージェントが記事を執筆する
                                                                      1. 3. **reviewer**エージェントが品質チェックを行い、修正点を列挙する
                                                                      1. 4. writerが修正を反映して最終版を出力する

## エージェントへの指示方法
各エージェントはagents/ディレクトリのmdファイルを参照すること。


scriptsでClaudeの出力を後処理する
scripts/ディレクトリにPythonスクリプトを置くと、Claudeが必要なときに実行できる。
# scripts/format_output.py
# Claudeが生成した記事をQiita/Zenn形式に変換する

import sys
import re

def convert_to_qiita_format(content: str) -> str:
    """Claudeの出力をQiita Markdown形式に変換する"""
        # コードブロックの言語指定を正規化
            content = re.sub(r'```(\w+)\n', lambda m: f'```{m.group(1).lower()}\n', content)

                    # 見出しレベルを調整（h1 → h2から開始）
                        lines = content.split('\n')
                            processed = []
                                for line in lines:
                                        if line.startswith('# ') and not line.startswith('## '):
                                                    line = '#' + line  # h1 → h2
                                                            processed.append(line)

                                                                    return '\n'.join(processed)

                                                                    if __name__ == '__main__':
                                                                        content = sys.stdin.read()
                                                                            print(convert_to_qiita_format(content))
                                                                            ```

                                                                            **SKILL.mdでスクリプトを参照する：**

                                                                            ```markdown
                                                                            ## 出力処理
                                                                            記事を執筆したら、scripts/format_output.pyを使ってQiita形式に変換してから出力すること。
                                                                            ```

                                                                            ### references/で参考資料を永続化する

                                                                            `references/`に置いたファイルは、スキルが呼ばれたときに必要に応じてClaudeが参照できる。

                                                                            活用例：
                                                                            - `references/style-guide.md` — チームの文体・表記ルール
                                                                            - - `references/tech-glossary.md` — 社内用語集・略語集
                                                                            - - `references/past-articles.md` — 過去記事の一覧とURLリスト
                                                                            - - `references/templates/` — 各種ドキュメントテンプレート

```markdown
# references/style-guide.md

## 表記統一ルール
- 「ユーザー」（「ユーザ」ではない）
- - 「メール」（「E-mail」「email」ではない）
- - 英数字は半角（全角使用禁止）

## 見出しルール
- h2（##）: 大セクション（3〜5個まで）
- - h3（###）: サブセクション
- - h4以下は使わない

## コードブロックルール
- 言語を必ず指定する（```python, ```bash, ```yaml など）
- - 30行を超えるコードは分割して説明を挟む
- ```

---

## 🔢 APIでの高度な使い方

### スキルのアップロードと管理（完全なコード例）

```python
import anthropic
import zipfile
import os
from pathlib import Path

def package_skill(skill_dir: str) -> str:
    """スキルディレクトリをzipファイルにパッケージング"""
        skill_path = Path(skill_dir)
            zip_path = f"{skill_dir}.zip"

                    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                            for file_path in skill_path.rglob('*'):
                                        if file_path.is_file():
                                                        arcname = file_path.relative_to(skill_path.parent)
                                                                        zf.write(file_path, arcname)

                                                                                return zip_path

                                                                                def upload_skill(client: anthropic.Anthropic, skill_dir: str) -> str:
                                                                                    """スキルをAPIにアップロードしてskill_idを返す"""
                                                                                        zip_path = package_skill(skill_dir)

                                                                                                with open(zip_path, 'rb') as f:
                                                                                                        response = client.beta.skills.upload(file=f)
                                                                                                            
                                                                                                                os.remove(zip_path)  # 一時ファイルを削除
                                                                                                                    return response.skill_id
                                                                                                                    
                                                                                                                    def use_skill(client: anthropic.Anthropic, skill_id: str, prompt: str) -> str:
                                                                                                                        """スキルを使ってメッセージを送る"""
                                                                                                                            response = client.beta.messages.create(
                                                                                                                                    model="claude-opus-4-5",
                                                                                                                                            max_tokens=4096,
                                                                                                                                                    messages=[{"role": "user", "content": prompt}],
                                                                                                                                                            skill_ids=[skill_id],
                                                                                                                                                                    betas=["skills-2025-12-18"]
                                                                                                                                                                        )
                                                                                                                                                                            return response.content[0].text
                                                                                                                                                                            
                                                                                                                                                                            # 使用例
                                                                                                                                                                            client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
                                                                                                                                                                            
                                                                                                                                                                            # スキルをアップロード
                                                                                                                                                                            skill_id = upload_skill(client, "./blog-writer")
                                                                                                                                                                            print(f"Uploaded skill: {skill_id}")
                                                                                                                                                                            
                                                                                                                                                                            # スキルを使って記事生成
                                                                                                                                                                            result = use_skill(client, skill_id, "FastAPIの非同期処理について技術ブログ記事を書いて")
                                                                                                                                                                            print(result)
                                                                                                                                                                            ```
                                                                                                                                                                            
                                                                                                                                                                            ### 複数スキルの組み合わせ
                                                                                                                                                                            
                                                                                                                                                                            複数のスキルを同時に指定することで、それぞれのスキルが適切なタイミングでトリガーされる。
                                                                                                                                                                            
                                                                                                                                                                            ```python
                                                                                                                                                                            # 複数スキルを組み合わせる
                                                                                                                                                                            response = client.beta.messages.create(
                                                                                                                                                                                model="claude-opus-4-5",
                                                                                                                                                                                    max_tokens=4096,
                                                                                                                                                                                        messages=[
                                                                                                                                                                                                {"role": "user", "content": "このPRのコードをレビューして、レビューコメントをPR説明文にまとめて"}
                                                                                                                                                                                                    ],
                                                                                                                                                                                                        skill_ids=[
                                                                                                                                                                                                                "skill_code_reviewer_abc123",
                                                                                                                                                                                                                        "skill_pr_description_def456",
                                                                                                                                                                                                                            ],
                                                                                                                                                                                                                                betas=["skills-2025-12-18"]
                                                                                                                                                                                                                                )
                                                                                                                                                                                                                                ```
                                                                                                                                                                                                                                
                                                                                                                                                                                                                                ### プリビルトスキル（Anthropic公式）との組み合わせ
                                                                                                                                                                                                                                
                                                                                                                                                                                                                                AnthropicはPowerPoint生成（pptx）、Excel生成（xlsx）などのプリビルトスキルを提供している。
                                                                                                                                                                                                                                
                                                                                                                                                                                                                                ```python
                                                                                                                                                                                                                                # カスタムスキル + プリビルトスキルの組み合わせ
                                                                                                                                                                                                                                response = client.beta.messages.create(
                                                                                                                                                                                                                                    model="claude-opus-4-5",
                                                                                                                                                                                                                                        max_tokens=4096,
                                                                                                                                                                                                                                            messages=[
                                                                                                                                                                                                                                                    {"role": "user", "content": "月次レポートをPowerPointにまとめて"}
                                                                                                                                                                                                                                                        ],
                                                                                                                                                                                                                                                            skill_ids=["pptx"],           # Anthropicプリビルト
                                                                                                                                                                                                                                                                betas=["skills-2025-12-18"]
                                                                                                                                                                                                                                                                )
                                                                                                                                                                                                                                                                ```
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                ---
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                ## ❓ FAQ
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: スキルはどのくらいの数まで登録できるか？**
                                                                                                                                                                                                                                                                A: 公式に上限は明記されていないが、スキルが多すぎると選択精度が下がる。実用上は10〜15個程度に絞り、定期的に使われていないスキルを整理することを推奨。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: SKILL.mdはどの言語で書けばいいか？**
                                                                                                                                                                                                                                                                A: Claudeは多言語に対応しているため、日本語・英語どちらでも機能する。ただし、スキルを使う言語と同じ言語で書くと精度が上がりやすい。日本語でClaudeを使うなら日本語で書くのがベター。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: スキルの内容は他のユーザーに見られるか？**
                                                                                                                                                                                                                                                                A: カスタムスキルはプライベートで、他のユーザーからは見えない。Anthropic公式のプリビルトスキルはオープンスタンダードとして公開されている。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: スキルを作る際に、既存のシステムプロンプトと競合しないか？**
                                                                                                                                                                                                                                                                A: スキルとシステムプロンプトは併用できる。スキルはシステムプロンプトの補完として機能し、関連するタスクに対してのみ追加の指示を提供する。競合する可能性がある場合は、SKILL.md内に「システムプロンプトと矛盾する場合はシステムプロンプトを優先すること」と明記しておくと安全。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: run_loop.pyを使わずにevalだけ手動でできるか？**
                                                                                                                                                                                                                                                                A: できる。評価セット（JSONファイル）を用意して、スキルありとなしでClaudeに同じクエリを送り、結果を比較すれば同様の効果を得られる。run_loop.pyはそのプロセスを自動化しているだけだ。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                **Q: Claude Codeでスキルを使う場合、特別な設定は必要か？**
                                                                                                                                                                                                                                                                A: `~/.claude/skills/`ディレクトリにスキルフォルダを配置するだけで自動的に認識される。Claude.aiのようなGUIによるインストール操作は不要。
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                ---
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                





まとめ


skill-creatorはClaudeに「自分専用の仕事のやり方」を教えるための公式スキル

SKILL.mdというMarkdownファイル1枚から始められ、コード不要でも運用可能
評価機能（run_loop.py）まで使えば、定量的に品質を測って改善できる
Claude.ai / Claude Code / APIで共通の仕組みだが、同期はしないので要注意

MCPとは補完関係。MCP = 手、Skills = 段取り書

「毎回同じプロンプトを貼り付けている」「チームで品質をそろえたい」という悩みがあるなら、skill-creatorを一度試してみる価値は大いにある。


参考資料・出典

Anthropic公式

Introducing Agent Skills（2025/12/18）: https://www.anthropic.com/news/skills

Agent Skills API Docs: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

Claude Code Skills Docs: https://code.claude.com/docs/en/skills

GitHub公式リポジトリ: https://github.com/anthropics/skills

skill-creator SKILL.md（原文）: https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md

The Complete Guide to Building Skills for Claude: https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf



筆者関連リンク

公式サイト：taichiendoh.com
アイデア掲示板：taichiendoh.com/ideas
X：@endoh_taichi



22Go to list of users who liked22Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
