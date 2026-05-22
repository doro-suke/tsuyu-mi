# SKILL.md AGENTS.md AgentSkills 完全整理ノート（備忘録）
- **Source URL**: https://zenn.dev/kodak_diary/articles/8fb30c071e9752
- **Priority**: high
- **AI Summary**:
  - AIエージェントへの指示ファイルを「常時ルール」「必要手順」「役割定義」の3層で分類し整理。
  - AGENTS.mdを共通ルールの正本とし、ツール固有ファイルは参照や補足に留める管理構成を提案。
  - 専門的な作業手順をSKILL.mdに外出しすることで、コンテキストの肥大化抑制と保守性を両立。
- **Read Now Reason**: AIコーディングツールの設定ファイルが乱立する中、管理の最適解を知ることで、開発環境のトークン節約と指示の精度向上が直ちに期待できるため。
- **Suggested Tags**: #AIエージェント, #GitHub, #開発プロセス効率化, #プロンプトエンジニアリング
- **Processed Date**: 2026/5/2

---

## 本文
エグゼクティブサマリー
この記事は、AIコーディングツールまわりで増えがちな AGENTS.md、CLAUDE.md、GEMINI.md、SKILL.md、agents系ファイルをどう分けるか、という話です。
結論はかなりシンプルで、「常に読ませるもの」「必要なときだけ読ませるもの」「役割を持つ別エージェント」を分けると扱いやすいです。
AGENTS.md を共通ルールの正本にしつつ、ツール固有ファイルは薄くし、手順は SKILL.md、役割分担は agents系ファイルに逃がす、という点です。
今回のキーメッセージはこれです。

常時ルールは AGENTS.md
ツール固有の入口は薄くする
手順は SKILL.md
役割分担は agents系ファイル


 結論
まずは、この理解で十分かなと思います。



書くもの
一言でいうと
向いている内容




AGENTS.md
AIエージェント向けREADME
共通ルール、ビルド、テスト、禁止事項


CLAUDE.md
Claude Code向けの常時メモリ
Claude固有の補足、または AGENTS.md 参照


GEMINI.md
Gemini CLI向けの常時コンテキスト
Gemini系の補足、または読み込む文脈の指定


SKILL.md
必要時だけ使う専門手順
レビュー手順、記事化手順、リリース手順


.codex/agents/*.toml
Codexのcustom agent
レビュアー、調査役、実装役など


.claude/agents/*.md
Claude Codeのsubagent
専門人格・専門役割


.agents/agents.md
チーム型エージェント定義の例
PM、Engineer、QAなどのペルソナ



常に守ってほしいルールは短く、毎回読ませる。長い手順や専門的な進め方は、必要になったときだけ読ませる。さらに「誰にやらせるか」は、agents系ファイルで役割として分ける。

 背景
AIコーディングツールを使っていると、似たような名前のファイルがどんどん出てきます。
AGENTS.md、CLAUDE.md、GEMINI.md、SKILL.md、.codex/agents、.claude/agents。名前だけ見ると、どれも「AIに何かを教えるファイル」に見えます。
ただ、実際には読むタイミングと役割が違います。ここを混ぜると、常時コンテキストが重くなったり、ツールごとに同じ内容を何回も管理することになります。
そこで今回は、「いつ読むか」と「何を担当するか」で整理しました。

 補足：背景や課題感
ざっくり分けると、こうです。



観点
役割
例




常時読む文脈
そのプロジェクトで常に守るルール

AGENTS.md、CLAUDE.md、GEMINI.md



必要時だけ読む手順
特定作業の進め方
SKILL.md


別エージェントの定義
調査役、レビュー役、実装役など

.codex/agents/*.toml、.claude/agents/*.md




常時読むファイルには、毎回必要なことだけを書きたいです。
たとえば、セットアップ、テストコマンド、コードスタイル、触ってはいけない設定。こういうものは、エージェントが毎回知っている方がよい情報です。
一方で、記事化手順、レビュー観点、リリース作業、長いチェックリストのようなものは、毎回読む必要はありません。必要な場面でだけ SKILL.md として読む方が、文脈が軽くなります。

 やったこと
今回整理したかったのは、ファイル名ごとの暗記ではなく、実務で迷わない分類です。
私が意識したいのは、次の3つです。

常時ルールは、できるだけ AGENTS.md に寄せる
ツール固有ファイルは、共通ルールへの入口か、固有の補足だけにする
長い手順と専門ロールは、常時ルールから外に出す

つまり、AGENTS.md を正本にして、CLAUDE.md や GEMINI.md は必要ならそれを参照する。SKILL.md は作業手順、agents系ファイルは担当者定義として扱う。

 補足：検討過程や却下案
最初に考えたのは、「全部 AGENTS.md に書けばいいのでは」という案でした。
でも、これはすぐ重くなります。レビュー手順、記事作成手順、リリース手順、媒体ごとの注意点まで全部入れると、毎回読むには情報が多すぎる状態になっている。
次に、ツールごとに完全に別ファイルで管理する案もあります。AGENTS.md、CLAUDE.md、GEMINI.md に同じようなルールをそれぞれ書く形です。
これも、最初は分かりやすいです。ただ、ルールを変えるたびに複数ファイルを直す必要があります。どこかだけ古くなる未来がかなり見えます。
最終的には、次のように考えるのがよさそうです。



目的
Codex
Claude Code
Gemini CLI / Antigravity系




常に守るルール
AGENTS.md
CLAUDE.md
GEMINI.md


共通ルールを横断運用する

AGENTS.md を正本にする

CLAUDE.md から AGENTS.md を参照する
設定や取り込みで共通ファイルに寄せる


必要時の手順を作る
SKILL.md
.claude/skills/*/SKILL.md
skills / workflows系


専門エージェントを作る
.codex/agents/*.toml
.claude/agents/*.md

.agents/agents.md など


ツール固有設定
Codex config
.claude/settings.json

.gemini/settings.json など



公式ドキュメント上の細かい挙動も、この分類とだいたい相性がよいです。

Codexは、グローバルやプロジェクト階層の AGENTS.md 系ファイルを読み、近い階層の指示ほど後に効く形で扱います。
CodexのSkillsは、最初から全文を読むのではなく、名前・説明・パスを見て、必要になったときに SKILL.md 本文を読む設計です。
Codexのcustom agentsは、個人用なら ~/.codex/agents/、プロジェクト用なら .codex/agents/ にTOMLで置く形です。
Claude Codeは、CLAUDE.md をメモリとして扱い、@path で別ファイルを取り込めます。
Claude Codeのsubagentsは、.claude/agents/ などにMarkdownファイルとして置きます。
Gemini CLIは、標準では GEMINI.md をコンテキストとして扱い、設定で読み込むファイル名を変えられます。

このあたりを見ると、「常時読む入口」と「必要時に読む専門手順」を分ける考え方は、かなり現実的に使えます。

 最終形
複数ツールを使うなら、まずは AGENTS.md を正本にするのが楽です。
おすすめ構成は、たとえばこうです。
repo/
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── .codex/
│   └── agents/
├── .claude/
│   ├── skills/
│   └── agents/
├── .agents/
│   └── skills/
└── src/
AGENTS.md には、プロジェクト共通のルールだけを書きます。
# AGENTS.md

## Setup
- 依存関係: `uv sync`
- 起動: `uv run app.py`

## Test
- `uv run pytest`

## Code style
- 既存の命名規則を優先する
- 型注釈を付ける

## Do not
- 本番設定を変更しない
- 秘密情報をログに出さない
CLAUDE.md は、共通ルールを読み込ませたうえで、Claude Code固有の補足だけにします。
@AGENTS.md

## Claude Code
Claude Code固有の補足だけをここに書く。
GEMINI.md も同じ考え方で、Gemini CLI / Antigravity系に必要な補足だけに寄せると管理しやすいです。
@AGENTS.md

## Gemini
Gemini系でだけ意識したい補足を書く。
長い手順は SKILL.md に分けます。
Codexのリポジトリ内Skillsなら .agents/skills、Claude Codeなら .claude/skills のように、ツールごとの置き場へ寄せます。
my-skill/
├── SKILL.md
├── scripts/
├── references/
└── assets/
SKILL.md には「いつ使うか」「どう進めるか」だけを書く。長い仕様、サンプル、テンプレート、スクリプトは、references/ や scripts/ に逃がす方が読みやすいです。
役割を分けたいときは、agents系ファイルに寄せます。
name = "reviewer"
description = "Correctness, security, and test coverage focused reviewer."
developer_instructions = """
Review code like an owner.
Prioritize bugs, regressions, and missing tests.
"""
これは AGENTS.md とは別物です。
AGENTS.md は「このプロジェクトで守ること」。agents系ファイルは「誰にどんな役割を持たせるか」。ここを混ぜないのがポイントです。

 補足：構成・手順・注意点
実務で使うなら、次の順番で整えると迷いにくいです。

まず AGENTS.md に、全ツール共通のルールを書く

CLAUDE.md や GEMINI.md には、共通ルールの参照と固有補足だけを書く
レビュー、記事化、リリースなどの長い手順は SKILL.md に分ける
レビュアー、調査役、実装役のような役割は agents系ファイルに分ける
迷ったら、「これは毎回読ませたいか？」で判断する

判断基準は、かなり単純でよいです。



判断したいこと
置き場所




毎回守ってほしい
AGENTS.md


Claude Codeでだけ必要
CLAUDE.md


Gemini CLIでだけ必要
GEMINI.md


特定作業の手順として使いたい
SKILL.md


別人格・別担当として動かしたい
agents系ファイル



私が一番大きかった気づきは、「ルール」と「手順」と「担当者」を同じファイルに置こうとすると、だんだん曖昧になるということです。
ルールは短く、手順は必要時だけ、担当者は別定義へ。これくらい割り切ると、AIにも人間にも読みやすくなります。

 最後に
覚え方は、これでよさそうです。

常に守ることは AGENTS.md
Claude固有は CLAUDE.md
Gemini系固有は GEMINI.md
手順化できるものは SKILL.md
役割分担は agents系ファイル

全部をひとつのファイルに詰め込むより、「常時読むもの」と「必要なときだけ読むもの」を分ける。
地味ですが、ここを分けるだけで、エージェントも人間もかなり扱いやすくなると思います。
