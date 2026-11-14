# AIエージェントの精度を高めるファイル構造設計【前編】 事実、長期、短期
- **Source URL**: https://zenn.dev/cscloud_blog/articles/3ce3eb7f5231f4
- **Priority**: high
- **AI Summary**:
  - AIエージェント向けに情報を「事実（AGENTS.md）」「長期（instructions.md）」「短期（SKILL.md）」の3階層で構造化する設計案を提示。
  - GitHub Copilotの新機能やClaudeのルール設定に準拠し、プロジェクト全体、ディレクトリ固有、タスク固有で指示を分離する。
  - 具体的なファイル記述例を通じて、ビルド手順からコーディング規約、特定バグの対処法までのコンテキスト管理手法を詳述。
- **Read Now Reason**: AI駆動開発におけるコンテキスト過負荷を防ぎ、GitHub Copilot等の精度を即座に改善するための具体的なファイル配置ルールと記述テンプレートが含まれているため。
- **Suggested Tags**: #AI駆動開発, #GitHubCopilot, #コンテキスト設計
- **Processed Date**: 2026/5/4

---

## 本文
テーマ「GitHub Copilot 活用選手権」
 はじめに
こんにちは。株式会社サイバーセキュリティクラウド SIDfm開発部門の大谷です。
当社ではAI活用を積極的に進めており、脆弱性管理システム「SIDfm」の開発においても、GeminiやGitHub Copilotを積極的に利用しています。
本記事では、AIエージェント向けファイルの構造案「事実、長期、短期」について、GitHub Copilot向けの実例を交えながら紹介します。


 Point

 対象ユーザー

AIエージェントを活用して、日々開発を行っている方。
現在のAIエージェントの出力精度に課題を感じている方。
これまで作成した指示やプロンプト、スキルの整理を行いたい方。



 得られる効果

AIエージェントが出力するコマンド、コードに一貫性を持たせられます。
AIエージェントが文脈と関係のないコマンド、コードを出力する確率が減ります。
AIエージェントと人間の両方にとって大事な知識を整理できます。



 実装方法


事実をAGENTS.mdに記載します。
例えば、概要やビルド手順など、プロジェクトの土台となる共通認識を記載します。

AGENTS.mdとは
主にプロジェクトルートに配置する、AIエージェント向けのREADME.mdのようなファイルです。

AGENTS.md complements this by containing the extra, sometimes detailed context coding agents need: build steps, tests, and conventions that might clutter a README or aren’t relevant to human contributors.
AGENTS.mdは、ビルド手順やテスト、規約といった、READMEには不適切、または人間のコントリビューターには無関係な、コーディングエージェント向けの詳細なコンテキストを補完します。

引用元: AGENTS.md



長期的内容を*.instructions.mdに記載します。
例えば、コーディング規約やアーキテクチャなど、特定の領域で常に守るべきルールを記載します。

*.instructions.mdとは
主に.github/instructionsに配置する、パス固有の指示ファイルです。
Claudeの.claude/rules/*.mdにあたります。

By using path-specific instructions you can avoid overloading your repository-wide instructions with information that only applies to files of certain types, or in certain directories.
パス固有の指示を使用することで、特定のディレクトリやファイルにだけ特定の指示を適用できるため、指示の過負荷を避けられます。

引用元: About customizing GitHub Copilot responses



短期的内容をスキルに記載します。
例えば、バグ修正やテスト生成など、特定のタスクをこなすための手順や知識を記載します。

スキル（SKILL.md）とは
各AIエージェントの対応しているディレクトリに配置する、知識セットです。
AIエージェントが必要と判断した際に自動で読み込まれますが、ユーザーによる呼び出しも可能です。

Agents are increasingly capable, but often don’t have the context they need to do real work reliably. Skills solve this by giving agents access to procedural knowledge and company-, team-, and user-specific context they can load on demand.
AIエージェントにできることが増えても、実際に業務をするためのコンテキストは持っていないことがよくあります。スキルは、AIエージェントへ必要に応じて、企業固有、チーム固有、ユーザー固有の手続き的な知識を与えることで、この問題を解決します。

引用元: Agent Skills



 Reason

 なぜこの構造にすべきか
AGENTS.md、*.instructions.md、SKILL.mdにはそれぞれの特性があります。

 AGENTS.md
AGENTS.mdは、プロジェクトのルートディレクトリに配置され、エージェントが一番最初にアクセスする「プロジェクト全体の共通認識」を配置する場所です。
そのため、ここには特定のドメインや機能に偏った知識ではなく、プロジェクトの存在意義や、ビルド・テストの実行コマンドといった「プロジェクト全体に関わる土台の情報」を記載するのに適しています。

 *.instructions.md
*.instructions.mdは、指定したパスのファイルをエージェントが触る際、背景情報として常に自動で読み込まれます。
つまり、エージェントに「作業中ずっと意識しておいてほしいこと」を指示するためのファイルです。
そのため、特定のバグ対応のようなピンポイントな情報よりも、セキュリティ要件やフレームワークのコーディング規約といった「その領域で常に守るべきルール」を配置場所として最適です。

 SKILL.md
SKILL.mdは、ユーザーが明示的に呼び出した場合や、エージェントが今のタスクに必要だと判断した際にのみ「オンデマンド」で読み込まれます。
他のファイルが「常に意識すべきルール」を提供するのに対し、SKILL.mdは「特定のタスク（バグ修正やテスト生成など）を遂行するための手順書」という役割を持ちます。
必要に応じてスクリプトやテンプレートファイルを同梱できるため、複雑なワークフローをパッケージ化して配置しておくのに適した場所です。

 Example
以上をふまえて、私が実際に使用しているAGENTS.md、*.instructions.md、スキルの一部を紹介します。


 AGENTS.md

AGENTS.md
# AGENTS.md — My App
...

## 起動・基本運用

### サーバー起動

```bash
app-start.sh
```

### SMTP 設定（認証なし）

```bash
docker exec myapp /manage_mailer noauth smtp.example.com 25 example.com
```
...

AGENTS.mdには、客観的事実（コマンドやビルド手順など）のみに留めます。
ドメインが絡む背景情報は、*.instructions.mdなどの他のファイルに分離しましょう。

 *.instructions.md

*.instructions.md
---
description: 'リポジトリの開発ガイドライン。機能仕様、DB 設定の絶対ルールを含む。'
applyTo: '**/my-app/**'
---

# My App
- `ROR`とは`Ruby on Rails`の略。

## src ディレクトリ
- リポジトリの`src`フォルダ内のRailsアプリが、コンテナ上で動作します。
- 起動手順は `AGENTS.md` を参照します。

## SMTPサーバ
- メール通知システムを利用するためには、SMTPサーバの設定が必要です。
- ログイン認証無し設定の実行コマンドは `AGENTS.md` を参照してください。
...

## 他アプリとの連携に関する制限事項について
主に、システム負荷およびセキュリティ上の理由から制限している部分があります。
- SMTPサーバ設定は変更できません。
...

*.instructions.mdには、AIエージェントが常に覚えていてほしい情報を記載します。
略語の解説、見えにくい部分の仕様、クラウドでの制約など、背景情報を入れましょう。

 スキル（SKILL.md）

SKILL.md
---
name: fix-my-app
description: My App で発生するバグ・デプロイ問題の修正手順を提供します。「aarch64-linux のプラットフォームエラーが出た」「bundle config set --local frozen true の使い方を知りたい」といった場面で使用してください。
---

# fix-my-app: バグ修正スキル

my-app（`myapp` コンテナ）で発生するバグ・デプロイ問題の修正手順を提供します。

## バグ一覧

| バグ | 詳細 |
|---|---|
...

### Gemfile 変更後に Gemfile.lock 未再生成 (exit code 16)

`Gemfile` を変更したが `Gemfile.lock` を再生成せずに `build.sh` を実行すると以下のエラーでビルドが失敗する。

```
Run `bundle install` elsewhere and add the updated Gemfile.lock to version control.
exit code: 16
```

**対処:** `AGENTS.md`の「🚨 Gemfile 変更時の必須手順 🚨」のコマンドを実行して `Gemfile.lock` を再生成してから再ビルドすること。

スキルには、バグの対処方法、ログの調査方法などを書きましょう。
descriptionの部分は、AIエージェントが自動で読み込むかを判断する唯一の情報源となるため、丁寧に書きましょう。
/referencesなどに置いたファイルを表で紐づけると、拡張と破棄が容易になります。

 Point
AIエージェントの出力精度を高めるためには「信頼できる唯一の情報源」が不可欠です。

プロジェクトの揺るがない事実や、基となるドメイン知識（全体）
特定のタスクでのみ必要になる手順や、オンデマンドなノウハウ（局所）

これらの情報源を明確に分離し、信頼性を構造的に担保することで、より高精度なAIエージェントによる開発が可能になります。

 おわりに
この記事では、各AIエージェント向けファイルの役割分けによる構造化を行いました。
後半の「AIエージェントの精度を高めるファイル構造設計【後編】」では、各AIエージェント向けファイルで、内容の順番による構造化を行います。
「世界中の人々が安心安全に使えるサイバー空間を創造する」 この理念を掲げ、世界有数のサイバー脅威インテリジェンスとAI技術を活用した、WEBアプリケーションのセキュリティサービスを全世界に向けて提供しています。
