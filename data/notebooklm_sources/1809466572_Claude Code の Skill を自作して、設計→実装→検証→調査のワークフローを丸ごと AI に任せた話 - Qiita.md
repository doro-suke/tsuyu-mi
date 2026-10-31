# Claude Code の Skill を自作して、設計→実装→検証→調査のワークフローを丸ごと AI に任せた話 - Qiita
- **Source URL**: https://qiita.com/N-i-ke/items/b87d1d144ef6eef9d257
- **Score**: 90
- **Suggested Tags**: #AI駆動開発, #ClaudeCode, #ワークフロー自動化
- **Processed Date**: 2026/10/31

---

## 本文
はじめに
副業で Web 開発をしていると、ひとりで「要件整理 → 設計 → 実装 → 動作確認 → 不具合調査」を全部回す時間が、コードを書く時間と同じくらい消えていきます。
特に副業案件は「夜にちょっとずつ」しか触れないので、前回の自分の文脈をどう引き継ぐか が常に課題でした。
その答えとして最近落ち着いたのが、Claude Code の Skill（旧 Slash Command の上位概念）を自作する という選択肢です。
今回は自作プラグイン nike-skills を題材に、

Claude Code の Skill とは何か
自作するとどんな利点があるか
AI に「丸投げ」しないための設計思想

をまとめます。

Claude Code の Skill とは
ざっくり言うと、Claude Code に「特定のタスクの作法」を覚え込ませる仕組み です。
実体は skills/<name>/SKILL.md というマークダウン1枚で、YAML frontmatter に name と description を書き、本文に「いつ使うか・どういう手順で進めるか」を自然言語で記述します。
---
name: design
description: ソフトウェア機能の要件定義・基本設計・詳細設計を体系的に作成する。
---

# design — 要件定義・基本設計・詳細設計

## このスキルの役割
1. 要件定義 — 「何を作るか」「なぜ作るか」を確定する
2. 基本設計 — システム全体の構造と振る舞いを設計する
3. 詳細設計 — 実装に必要なクラス・関数・スキーマレベルの設計を行う
...

ユーザーが「設計して」と頼んだとき、Claude Code はマッチする Skill を勝手に見つけて、その手順書通りに動いてくれます。
プロンプトを毎回手書きしなくていい し、チームで再現性を担保できる のが効きます。

なぜ自作したか — 「AI に全部投げる」が雑すぎた問題
最初は素の Claude Code に「この機能を実装して」と投げていたのですが、すぐに困りごとが出てきました。

要件があいまいなまま実装に入って、後から作り直し
セッションを跨ぐと前回の意図を忘れる
テストや lint をその場で言わないと走らない
不具合調査と修正が混ざって、結局なにを直したか分からない

要するに 「人間の段取り」が抜け落ちる わけです。
そこで「設計 → 実装 → 検証 → 調査」を独立した Skill に切って、それぞれがファイルとして成果物を残す 形にしました。
この成果物が次のセッションへの引き継ぎになるので、夜10分しか触れなくても文脈が消えません。

nike-skills の全体像
公開しているのはこの4つの Skill と、それを支える nike CLI です。



Skill
役割
主な成果物




design
要件定義・基本設計・詳細設計を作成
docs/design/<feature>/{requirements,basic-design,detailed-design}.md


implement
設計ドキュメントに基づき実装
ソースコード + implementation-log.md



verify
完成した機能を自動検証
verification-report.md


investigate
不具合・脆弱性の調査
docs/investigations/<slug>/report.md



ポイントは、4つの Skill が docs/ ディレクトリ経由でバトンを渡している ことです。
design が書いた requirements.md を implement が読み、implement の成果物を verify が読む。
全部 AI 任せにせず、ファイルというストレージに分業の境界を引いた、というイメージ。

設計思想：AI に判断を、CLI に決定的処理を
ここがいちばん書きたかった話。
Skill を素直に書くと、AI に「テンプレを書き出して」「ファイル一覧を取って」「テストを走らせて」まで全部やらせる 形になりがちです。
これをやるとトークンを馬鹿食いするうえに、決定的な処理（毎回同じ結果になるべき処理）まで AI が「微妙に違うやり方」で再発明してしまいます。
そこで nike CLI（Python 標準ライブラリのみ・1ファイル）を作って、AI と決定的処理を分離 しました。
nike init <slug>              # テンプレ3点を一括生成
nike status                   # feature ごとの進行状況を JSON で返す
nike parse-requirements <slug># requirements.md から FR/AC を構造化抽出
nike validate <slug>          # 設計ドキュメントの lint
nike impl-init <slug>         # FR をタスク化したログを seed
nike verify-init <slug>       # AC 表入りレポートを生成
nike detect                   # package.json 等から lint/test コマンドを推定
nike checks                   # 検出したコマンドをまとめて実行
nike scan                     # npm audit / pip-audit / semgrep などを一括

全サブコマンドが JSON を stdout に吐く ので、AI 側は Bash ツールで一発呼ぶだけで構造化データを得られます。
たとえばフロントエンド案件なら nike detect が package.json を見て npm run lint / npm test / npm run build を勝手に検出してくれて、nike checks で全部叩いてくれる。
AI に「package.json を読んで scripts セクションを探して……」と言わせる必要がなくなり、1往復で結果が返ってくる。

「AI を呼ばない判断」をどれだけ仕込めるかが、Skill 自作のキモだと思っています。


実際のワークフロー
URL 短縮サービスを題材にした完成形のサンプル (examples/url-shortener/) を置いてあるので、雰囲気はそこを見てもらうのが早いです。
実際の流れはこうなります:
# 1. 設計
nike init user-auth --name "ユーザー認証"
# AI が3つのテンプレを Edit で埋めてくれる
# (要件定義 → 基本設計 → 詳細設計、フェーズごとに合意取りながら)

# 2. 実装
nike impl-init user-auth     # FR をタスク化したログを seed
nike detect                  # プロジェクトのコマンドを取得
# AI が設計に沿って実装、ログを更新
nike checks                  # 静的解析・テストを一括実行

# 3. 検証
nike verify-init user-auth   # AC 表入りレポートを生成
nike checks
# AI が AC ごとに PASS/FAIL を Edit で記入

# 4. 調査 (ad-hoc)
nike investigate-init search-xss --type security --title "検索フォームのXSS疑義"
nike scan
# AI が証拠を集めレポートを書く。修正は implement Skill に引き渡す

各 Skill は docs/design/<feature>/ か docs/investigations/<slug>/ を介して引き継ぐので、翌日に別セッションで再開しても文脈が落ちません。
これは副業エンジニアにとって本当にデカい。

受け入れ基準のフォーマット規約
地味ですがここが効きます。requirements.md の機能要件は、こう書く決まりにしています。
## 4. 機能要件
### FR-01: ログイン
**説明**: メールアドレスとパスワードでログインできる。

**受け入れ基準**:
- Given 未ログイン状態, When 正しい資格情報を送信, Then ホームへリダイレクトされる
- Given 未ログイン状態, When 誤った資格情報を送信, Then エラーメッセージが表示される

このフォーマットを nike parse-requirements が正規表現で構造化 JSON に変換し、
そのまま verify-init が AC 表に展開 してくれます。
AI に「要件から検証項目を作って」とやらせるとブレるので、フォーマットを縛って機械抽出する という割り切りです。

使ってみた所感

良かったこと


「夜の30分」で前進できる 感覚が戻った。前回の自分が docs に残してくれている
AI に「テスト走らせて」と言わなくても nike checks が走る
設計と実装をフェーズで切ったので、手戻りが減った（要件で詰めるべきことを実装中に発見しなくなった）
レビュー時に verification-report.md を見れば AC ごとの合格状況がそのまま分かる


微妙だったこと

フォーマット規約を厳しくしているので、雑に書きたい時に窮屈 に感じる瞬間はある
Skill を増やすと「どれが起動するか」が予測しづらくなる。description の書き分けが結構シビア
既存リポジトリへの後付けは、最初に docs/design/ 構造を受け入れてもらう必要があってちょっと面倒


おわりに
Skill 自作は、プロンプトエンジニアリングの延長というより「ワークフローのエンジニアリング」 です。
AI にどこまで任せて、どこから決定的処理（CLI）に渡すか、という線引きが本質。
今回は私のケースだと「設計 → 実装 → 検証 → 調査」という分割でうまくハマりました。
リポジトリは N-i-ke/nike-skills で公開しています。
/plugin marketplace add N-i-ke/nike-skills から Claude Code に取り込めるので、興味のある方はぜひ。
「自分のワークフローはこういう Skill に切るとハマりそう」というのを考えるところから、ぜひ一度遊んでみてください。
