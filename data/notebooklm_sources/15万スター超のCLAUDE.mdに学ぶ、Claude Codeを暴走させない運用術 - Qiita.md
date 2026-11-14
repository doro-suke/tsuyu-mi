# 15万スター超のCLAUDE.mdに学ぶ、Claude Codeを暴走させない運用術 - Qiita
- **Source URL**: https://qiita.com/4q_sano/items/dc26f7468dcd39fbe62f
- **Score**: 85
- **AI Summary**:
  - Claude Codeの暴走を防ぐため、行動制約ファイルCLAUDE.mdの運用が極めて重要。
  - Andrej Karpathy氏のリポジトリに学ぶ、行動を制御するための4つの基本原則を解説。
  - グローバルとプロジェクト固有の設定を分離し、安全かつ効率的なAI開発環境を構築する手法。
- **Read Now Reason**: 現在進行中のAI駆動開発において、Claude Codeが勝手なリファクタリングや巨大な差分を作って暴走するのを防ぐ具体的な設定（~/.claude/CLAUDE.md）と、4つの行動原則（思考・単純・局所・ゴール駆動）を今すぐプロジェクトに導入できるため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #CLAUDE.md, #プロダクション運用
- **Processed Date**: 2026/5/29

---

## 本文
Claude Code を使っていて、最近かなり重要だと感じているのが CLAUDE.md の運用です。
Claude Code は非常に強力ですが、既存コードベースで長時間動かすと、次のような問題が起きやすくなります。
勝手にリファクタする
関係ないファイルまで変更する
巨大diffを作る
過剰に抽象化する
曖昧な要件を勝手に解釈して実装する

これは「AIの能力が低い」というより、AI Coding Agent に明確な行動制約を与えていないことが原因です。
そこで参考になるのが、GitHubで16万スターを超えている multica-ai/andrej-karpathy-skills です。
正確には、スターが付いているのは CLAUDE.md ファイル単体ではなくリポジトリです。ただし、このリポジトリの中心は「Claude Code の挙動を改善するための単一の CLAUDE.md」です。
つまり、巨大なツールではなく、AI Coding Agent の行動原則をまとめたファイルがこれだけ注目されている、という点が重要です。

CLAUDE.mdとは何か
CLAUDE.md は、Claude Code に読み込ませる永続的な指示ファイルです。
公式ドキュメントでも、CLAUDE.md は Claude に永続的なコンテキストを与えるための指示として説明されています。
参考: Claude があなたのプロジェクトを記憶する方法
ざっくり言うと、Claude Code 用の README です。
人間向けの README が「このプロジェクトの使い方」を説明するものだとすれば、CLAUDE.md は「このプロジェクトで Claude Code がどう振る舞うべきか」を説明するものです。

CLAUDE.md は強制設定ではなく、あくまでコンテキストとして読み込まれます。
書けば必ず守る魔法のファイルではありません。
だからこそ、長く曖昧に書くより、短く具体的に書く方が効きます。


なぜCLAUDE.mdが重要なのか
AI Coding Agent の問題は、もはや「コードを書けるか」ではありません。
今の問題は、次の段階に移っています。
安全に長時間動かせるか
既存設計を壊さないか
レビューしやすいdiffを出せるか
人間が意図していない変更をしないか

Claude Code は、ファイルを読み、コードを編集し、コマンドを実行できます。
これは便利ですが、裏を返すと、行動制約が弱いまま使うと「良かれと思って」余計な変更をしやすいということです。
特に業務コードでは、AIが生成したコードそのものより、AIが触らなくてよかった場所を触ってしまうことの方が危険です。

andrej-karpathy-skillsの中核思想

andrej-karpathy-skills の CLAUDE.md は、Claude Code の典型的な失敗を抑えるための行動原則として設計されています。
このリポジトリは、Andrej Karpathy 氏が指摘した LLM コーディングの典型的な失敗パターン（勝手な前提で進める、過剰に複雑にする、関係ないコードまで触る）に対応するため、4つの原則に整理しているのが特徴です。
中心にあるのは、次の4つです。
Think Before Coding
Simplicity First
Surgical Changes
Goal-Driven Execution

それぞれの意味はシンプルです。

Think Before Coding
実装前に考える、という原則です。
Claude Code は、曖昧な要件があると、それを勝手に解釈して進めることがあります。
人間なら「ここは確認した方がいい」と判断する場面でも、AIはもっともらしい前提を置いて実装を始めがちです。
そのため、実装前に次を明示させることが重要です。
何を達成するのか
どのファイルを触るのか
どんな前提で進めるのか
曖昧な点は何か

特に既存コードでは、「正しそうな実装」より「既存の設計意図に沿った実装」の方が重要です。

Simplicity First
必要最小限で実装する、という原則です。
AIは放っておくと、必要以上に汎用化したり、将来の拡張を見越した抽象化を作ったりします。
しかし、業務コードでは「将来使うかもしれない抽象化」は負債になることがあります。
例えば、単純なバリデーションを追加するだけなのに、新しい共通クラスや設定オブジェクトを作り始めるようなケースです。
Simplicity First は、そうした過剰設計を抑えるためのルールです。
要求されていない機能は追加しない
一度しか使わないものを抽象化しない
既存の書き方に合わせる
複雑にできる場面でも、まず単純に解く

Claude Code にこの原則を常に意識させるだけで、diffのノイズはかなり減ります。

Surgical Changes
必要な場所だけを変更する、という原則です。
個人的には、これが一番重要だと思っています。

Claude Code の危険な挙動の一つが「ついで修正」です。
バグ修正を頼んだだけなのに、周辺の命名、コメント、フォーマット、古いコードまで勝手に直すことがあります。
一見親切ですが、レビュー側から見ると本来の修正と無関係な差分が混ざり、どこにリスクがあるのか分かりにくくなります。

Surgical Changes では、次のように制約します。
依頼に直接関係するファイルだけ触る
関係ないリファクタをしない
既存のコメントやフォーマットを勝手に変えない
未使用コードを見つけても、依頼されていなければ削除しない

AI Coding Agent を業務で使うなら、この原則は必須だと思います。

Goal-Driven Execution
作業を「指示」ではなく「検証可能なゴール」に変換する、という原則です。
例えば、単にこう頼むより、
バグを直して

次のようにした方が安定します。
このバグを再現するテストを追加し、そのテストが通るように修正して

AIは、明確な成功条件があるとかなり強くなります。
逆に、成功条件が曖昧だと、雰囲気で実装してしまいます。
Claude Code に任せるときは、次のような形にするのが有効です。
修正対象
期待する結果
確認方法
触ってよい範囲
触ってはいけない範囲

これにより、Claude Code は単なるコード生成ツールではなく、検証ループを回すエージェントとして使いやすくなります。

pluginとCLAUDE.mdの違い
このリポジトリでは、Claude Code plugin として導入する方法も提示されています。
参考: andrej-karpathy-skills README
ここで混同しやすいのが、plugin と CLAUDE.md の役割です。
自分は次のように整理しています。
plugin / skills = 能力追加
CLAUDE.md       = 行動制御

plugin や skills は、Claude Code に特定の作業手順や知識を追加するものです。
一方で CLAUDE.md は、Claude Code がどのように振る舞うべきかを制御するものです。
つまり、skillsだけ入れても、Claude Code の行動が安全になるとは限りません。
むしろ、能力が増えたぶん、制約が弱いと暴走範囲も広がります。
そのため、実運用では次の組み合わせが強いです。
CLAUDE.mdで行動原則を固定する
skills/pluginで作業能力を拡張する


グローバルCLAUDE.mdに入れるべき理由
CLAUDE.md はプロジェクトごとに置くこともできますが、全プロジェクト共通で使いたい行動原則はグローバルに置くのが便利です。
Claude Code では、ユーザー指示として次の場所に CLAUDE.md を置けます。
~/.claude/CLAUDE.md

公式ドキュメントでも、ユーザー指示のスコープは ~/.claude/CLAUDE.md と説明されています。
参考: Claude があなたのプロジェクトを記憶する方法
グローバルに置くべきなのは、プロジェクトに依存しない原則です。
例えば、次のようなものです。
推測で実装しない
最小diffにする
関係ないファイルを触らない
既存設計を尊重する
不要なリファクタをしない
新しい依存関係を勝手に追加しない


次のような内容はグローバルに置くべきではありません。

特定プロジェクトのビルドコマンド
API仕様
ディレクトリ構成
ブランチ運用
iOSやReact Nativeなどの個別ルール

これらはプロジェクト直下の CLAUDE.md に書く方が安全です。
グローバル側に混ぜると、別プロジェクトでも同じ前提で動こうとしてしまいます。


おすすめの構成
個人的には、次の構成が扱いやすいです。
~/.claude/
├── CLAUDE.md
├── settings.json
├── skills/
└── commands/

各プロジェクト側には、必要に応じて次のように置きます。
project/
└── CLAUDE.md

役割は明確に分けます。
グローバルCLAUDE.md
  全プロジェクト共通の行動原則

プロジェクトCLAUDE.md
  そのリポジトリ固有のルール

skills / plugin
  再利用可能な作業手順や専門知識

commands
  よく使う定型タスク

この分離をすると、Claude Code の挙動が安定します。

グローバルにコピーする手順
macOS の場合は、まず Claude Code 用のディレクトリを作ります。
mkdir -p ~/.claude

次に、andrej-karpathy-skills の CLAUDE.md をグローバルにコピーします。
curl -L \
https://raw.githubusercontent.com/multica-ai/andrej-karpathy-skills/main/CLAUDE.md \
-o ~/.claude/CLAUDE.md

中身を確認します。
cat ~/.claude/CLAUDE.md

これで、Claude Code のユーザー共通指示として読み込まれるようになります。

既に ~/.claude/CLAUDE.md がある場合は、必ず上書き前にバックアップを取ってください。
グローバル指示は全プロジェクトに影響するため、消えると地味に痛いです。
cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak

既存の内容とマージしたい場合は、いきなり上書きせず、一度別名で保存してから確認します。
curl -L \
https://raw.githubusercontent.com/multica-ai/andrej-karpathy-skills/main/CLAUDE.md \
-o ~/.claude/CLAUDE.karpathy.md

その後、自分の既存ルールと統合します。


自分なら追記するルール
Karpathy系の CLAUDE.md をそのまま使うだけでも有効ですが、業務コードで使うなら、次のようなルールを追記しても良いと思います。
## Additional Rules

- Prefer minimal diffs.
- Avoid unnecessary refactors.
- Preserve existing architecture unless explicitly requested.
- Do not modify unrelated files.
- Ask before introducing new dependencies.
- Do not change public API behavior unless required by the task.
- Always explain verification steps after implementation.

特に Do not modify unrelated files は強いです。
AI Coding Agent にとって、無関係な修正をしないことは、人間が思っている以上に重要です。

使うときの注意点
CLAUDE.md は便利ですが、万能ではありません。
公式ドキュメントでも、Claude は CLAUDE.md を強制設定ではなくコンテキストとして扱うと説明されています。
つまり、書いたから必ず守るわけではありません。
そのため、実運用では次のように使うのが現実的です。
CLAUDE.mdで基本方針を固定する
重要な作業ではプロンプト側でも制約を再指定する
大きな変更の前には必ず計画を出させる
diffを確認してから次に進める

特に重要な修正では、最初にこう指示すると安定します。
実装前に、変更対象ファイル、実装方針、検証方法を説明してください。
関係ないファイルは変更しないでください。

これだけでも、AIの暴走はかなり抑えられます。

まとめ
Claude Code を使う上で重要なのは、単に「AIにコードを書かせること」ではありません。
これから重要になるのは、AI Coding Agent を安全に運用する設計です。
andrej-karpathy-skills が16万スターを超えているのは、まさにこの問題意識が多くのエンジニアに刺さっているからだと思います。
AIの能力は今後も上がります。
しかし、能力が上がるほど、制約設計も重要になります。
Claude Code を本気で使うなら、まず CLAUDE.md を整備する価値はかなり高いです。
特に既存コードベースでは、次の4つだけでも入れる価値があります。
Think Before Coding
Simplicity First
Surgical Changes
Goal-Driven Execution

Claude Code の品質を上げるというより、Claude Code を安全に使うための土台として、CLAUDE.md はかなり重要です。

続編はこちら
この記事では、andrej-karpathy-skills の CLAUDE.md から学べる基本思想を整理しました。
続編では、実務でClaude Codeをより安全に使うために、CLAUDE.md に追加したい安全運用ルールを3つに絞って紹介しています。

読んでいないコードについて推測しない
検証できない場合は、理由と手動確認手順を出す
勝手なGit操作や破壊的操作を禁止する

あわせて読むと、Claude Codeの運用ルールをより実務向けに強化できます。
▶ 続編: andrej-karpathy-skillsのCLAUDE.mdに足したい、Claude Codeの安全運用ルール3選

参考
GitHub - multica-ai/andrej-karpathy-skills
andrej-karpathy-skills / CLAUDE.md
Claude があなたのプロジェクトを記憶する方法
Claude Code の設定
