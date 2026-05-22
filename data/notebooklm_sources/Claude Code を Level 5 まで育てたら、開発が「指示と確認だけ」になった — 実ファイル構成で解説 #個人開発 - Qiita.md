# Claude Code を Level 5 まで育てたら、開発が「指示と確認だけ」になった — 実ファイル構成で解説 #個人開発 - Qiita
- **Source URL**: https://qiita.com/teppei19980914/items/8da88b33ffa8cf88dfa2
- **Score**: 92
- **AI Summary**:
  - Claude Codeを5段階で進化させ、開発を指示と確認に集約する実用的なファイル構成を提示。
  - Hooks機能でテストやコード整形を自動化し、Agents機能で並行レビューを自動化する設計を詳述。
  - CLAUDE.mdやSkillsによるプロジェクト固有ルールの管理と、AIを育てる運用の要諦を解説。
- **Read Now Reason**: AI駆動開発におけるClaude Codeの具体的な自動化設定（Hooks/Agents）やフォルダ構造が明記されており、現在の開発環境へ即座に反映して劇的な効率化が見込めるため。
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #自動化パイプライン, #生産性向上
- **Processed Date**: 2026/5/5

---

## 本文
この記事は約5分で読めます。

筆者プロフィール: ソフトウェアエンジニア。「知った気にならない。いつまでも学び続ける」を信条に、業務と個人開発の両輪で技術を磨いています。AI 駆動開発で複数の個人開発アプリを構築・運用中。
👉 ポートフォリオ: 筆者ホームページ
Claude Code を使い始めたけど、毎回同じ指示を書いていませんか？ CLAUDE.md・Skills・Hooks・Agents の 5 段階で「育てる」ことで、人間の作業は「指示と確認だけ」になります。この記事では、実際のファイル構成とコードを添えて、その全過程をお見せします。

「AI にコードを書かせている」と「AI と開発している」は違う
Claude Code を導入した当初、私は毎回こんなプロンプトを書いていました。
UIテキストはハードコーディングしないでください。
src/i18n/ja.ts に追加してから使ってください。
テストも書いてください。
外部リンクには rel="noopener noreferrer" を付けてください。
コミット前に npx astro check と npm test を実行してください。

毎回、同じことを書く。 これは「AI にコードを書かせている」状態であり、「AI と開発している」とは言えません。
そこから約 1 か月の試行錯誤で、今の私の作業は 「何を作るか指示する」と「動作確認する」だけ になりました。


Claude Code 5 つのレベルの全体像



Level
追加要素
何が自動化されるか
人間がやること




1
素のプロンプト
なし
全指示を毎回手打ち


2
+ CLAUDE.md
プロジェクトルールの自動読み込み
ルール違反の指摘が不要に


3
+ Skills
手順書のオンデマンド注入
定型作業の手順説明が不要に


4
+ Hooks
品質チェックの自動実行
「テスト実行して」が不要に


5
+ Agents
並行レビューの自動実行
レビュー依頼が不要に



以下、各レベルを具体的に説明します。


Level 1: 素のプロンプト — 「毎回同じ説明」の苦痛
最初の状態です。Claude Code をインストールして claude と打つだけ。プロジェクト固有のルールを知らないため、UIテキストのハードコーディングや命名規則違反が発生し、毎回指摘する必要があります。
人間の作業: 指示 + ルール説明 + レビュー + 手動テスト + 手動デプロイチェック


Level 2: CLAUDE.md — 「プロジェクトの憲法」を持たせる
プロジェクトルートに CLAUDE.md を置くと、Claude Code が会話開始時に自動で読み込みます。これは 「プロジェクトの憲法」 です。
プロジェクトルート/
├── CLAUDE.md          ← これを追加
├── src/
├── package.json
└── ...

私の CLAUDE.md はこんな構成です（実物から抜粋）:
# HomePage - Claude Code 運用ガイド

## テキスト管理ルール（最重要）
- **UIテキストのハードコーディングは禁止**
- 多言語対応: ja / en の 2 言語を src/i18n/ja.ts / src/i18n/en.ts で管理
- 新しいテキストを追加する場合は必ず ja.ts に先に追加 → en.ts で翻訳

## コミットルール
- テストコードの追加・修正を伴わないソースコード変更はコミットしない

## コミット前チェック（毎回必須）
1. 横展開チェック — 同一パターンを検索し漏れなく対応
2. セキュリティチェック — XSS、外部リンク rel 属性、機密情報
3. パフォーマンスチェック — 未使用依存、CSS重複、ビルドサイズ
4. デプロイチェック — npx astro check → npm test → npm run build


CLAUDE.md による変化



Before (Level 1)
After (Level 2)




UI テキストをハードコーディングしてしまう

ja.ts に追加してから使うようになった


テストなしでコード修正する
テストなしの変更を自ら避けるようになった


毎回ルールを説明する
ルール説明が不要になった



コツ: 150 行以内に収め、優先度を明示し、具体的なパスやコマンドを書く。詳細な手順は Level 3（Skills）に分離する。
人間の作業: 指示 + レビュー + 手動テスト + 手動デプロイチェック


Level 3: Skills — 「手順書」をオンデマンドで注入する
CLAUDE.md にすべてを書こうとすると膨張します。そこで Skills を使います。Skills は .claude/skills/ に置いた Markdown ファイルで、Claude Code が必要に応じて参照する「手順書」です。
.claude/
└── skills/
    ├── fix-issue.md       ← 問題修正の手順書
    ├── create-blog.md     ← ブログ記事作成の手順書
    ├── analyze-trend.md   ← トレンド分析の手順書
    ├── check-deploy.md    ← デプロイ確認の手順書
    ├── release.md         ← リリースの手順書
    └── update-labels.md   ← ラベル更新の手順書

「ブログ記事を作って」と指示するだけで、Claude はスキルを参照してトレンド分析 → SEO 最適化 → 記事作成を自動実行します。人間が手順を説明する必要がなくなりました。
人間の作業: 指示 + レビュー + 手動テスト


Level 4: Hooks — 「品質チェック」を自動実行する
Skills は「Claude に手順を教える」仕組みですが、Hooks は 「自動で実行される仕組み」 です。.claude/settings.json に定義します。
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $(ファイルパス)"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx astro check && npm test"
          },
          {
            "type": "prompt",
            "prompt": "6つの観点で最終チェックを実施してください..."
          }
        ]
      }
    ]
  }
}

この設定で何が起きるか:



トリガー
自動実行される処理




ファイル保存時（PostToolUse）
Prettier でコード整形


会話終了時（Stop）
静的解析 + テスト実行 + 6 観点の品質チェック




Level 4 による変化



Before (Level 3)
After (Level 4)




「Prettier かけて」と言う
ファイル保存のたびに自動整形


「テスト実行して」と言う
会話終了時に自動実行


「横展開チェックして」と言う
Stop hook で自動チェック



「テスト実行して」と言う必要がなくなりました。
人間の作業: 指示 + 動作確認


Level 5: Agents — 「レビュー」を並行自動実行する
最後のレベルです。Agents は 独立したレビュワーを並行して走らせる 仕組みです。.claude/agents/ に定義します。
.claude/
└── agents/
    ├── label-checker.md       ← ハードコード文字列の検出
    ├── security-reviewer.md   ← セキュリティ観点のレビュー
    ├── performance-reviewer.md ← パフォーマンス観点のレビュー
    └── seo-reviewer.md        ← SEO 観点のレビュー


Level 5 で変わったこと
Claude Code がコードを書き終えた後、自動的に:


label-checker が UI テキストのハードコードを検出

security-reviewer が XSS やサニタイズ漏れをチェック

performance-reviewer がループ内 DB 問い合わせを検出

seo-reviewer がブログ記事の SEO を全件検査

これらが 並行して走る ので、人間がレビューする前にほとんどの問題が検出されます。
人間の作業: 指示 + 動作確認


「AI を育てる」という考え方
Level 1 から Level 5 まで、一気に構築したわけではありません。開発を進める中で「またこの指示を書いている」と気づいたら CLAUDE.md に追記し、「この手順を毎回説明している」と気づいたら Skills に分離し、「このチェックを忘れがち」と気づいたら Hooks で自動化する。
繰り返しの苦痛が、次のレベルへの動機になる。 これが「AI を育てる」ということだと思っています。
VibeCoding（バイブコーディング）に対して「品質が不安」という声をよく聞きます。Level 4 の Hooks と Level 5 の Agents があれば、品質チェックは人間が忘れても AI が自動で実行します。品質保証を仕組みに組み込めば、VibeCoding でも品質は担保できます。


まとめ: あなたの Claude Code は今、Level いくつですか？



あなたの状況
推奨レベル
最初にやること




Claude Code を使い始めたばかり
Level 2
CLAUDE.md にプロジェクトルールを書く


毎回同じ手順を説明している
Level 3

.claude/skills/ に手順書を分離する


「テスト実行して」と毎回言っている
Level 4

settings.json に Hooks を追加する


レビューで毎回同じ指摘をしている
Level 5

.claude/agents/ にレビュワーを追加する



Level 5 まで育てると、人間の役割は 「何を作るか決める」 と 「動作確認する」 だけになります。
Claude Code は「使うツール」ではなく「育てるパートナー」です。
あなたの Claude Code は今、Level いくつですか？


関連記事

マークダウン記法は奥深く、楽しい — テキストだけで「伝わるドキュメント」を作る技術
