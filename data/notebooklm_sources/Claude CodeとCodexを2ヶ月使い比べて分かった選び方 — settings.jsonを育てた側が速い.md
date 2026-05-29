# Claude CodeとCodexを2ヶ月使い比べて分かった選び方 — settings.jsonを育てた側が速い
- **Source URL**: https://zenn.dev/playpark/articles/claude-code-vs-codex-comparison
- **Score**: 72
- **AI Summary**:
  - Next.jsプロジェクトでClaude CodeとCodexを2ヶ月運用比較した実証レポート。
  - Claude Codeは設定とSkillsの育成、Codexは大規模変更やCI/CD連携に強みがある。
  - CLAUDE.mdの肥大化を避け、暗黙のパターン学習とsettings.jsonを育てる設計を推奨。
- **Read Now Reason**: CLAUDE.mdの肥大化によるコンテキスト圧迫を防ぐ設計アプローチや、日常開発と大規模マイグレーションにおけるAIツールの使い分け基準など、AI駆動開発の効率を最大化する知見が詰まっているため。
- **Suggested Tags**: #AI駆動開発, #Claude_Code, #Codex, #生産性向上
- **Processed Date**: 2026/5/29

---

## 本文
「どっちが速いの？」という問いへの正直な答え
AIコーディングツールを検討するとき、誰もが最初に聞く。「Claude CodeとCodex、実際どっちが速い？」
ベンチマークや機能表は世の中に溢れている。でも「同じプロジェクトに両方投入した体感」をレポートしている記事はあまり見かけない。自分はNext.js 16 + React 19のプロジェクト（TypeScript、約120ファイル）で2ヶ月間、同じタスクに両方を投入して使い比べた。その結果を共有する。
先に結論を言うと、**「設定を育てたClaude Codeが速い」**というのが正確な表現だ。ツールの性能というより、どれだけ設定に投資したかが速度を決める。


 Claude Codeの「速さ」はどこから来るか
日常的なコード修正・機能追加では、Claude Codeの方が体感で速い。ただし条件がある。
settings.jsonとSkillsをちゃんと育てた場合に限る、という条件だ。
よくある誤解として、「CLAUDE.mdに細かいルールを書けば良くなる」がある。実際はその逆で、CLAUDE.mdはコンテキストウィンドウを圧迫するので最小限にすべきだ。代わりにsettings.jsonのpermissions設定と、Skillsによるワークフロー定義に投資する。
# 設定済みのClaude Codeに投げた場合
> "BlogCardコンポーネントにタグフィルター機能を追加して"

→ @/components/BlogCard.tsx を正しく特定
→ 既存のimportパターンに従ったコードを生成
→ Skillsで定義した命名規則・ファイル配置に従って出力
この「最初のプロンプトから既存コードベースに馴染んだコードが出てくる」体験が、設定なしのCodexとの差になる。
// Claude Codeが生成したコード例
// 既存の getPostBySlug パターンを踏襲した形式
export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter((post) =>
    post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}
コードが「このプロジェクトの人間が書いたように見える」のは、長いコンテキストでプロジェクト全体を把握しているからだ。

 なぜこう書くか
CLAUDE.mdに命名規則を書くのではなく、既存コードをコンテキストに含めてパターンを学習させる方が再現性が高い。CLAUDE.mdに書くと「明示的なルール」として扱われるが、既存コードは「暗黙のパターン」として扱われ、後者の方が一貫性が出やすい体感がある。



アプローチ
メリット
デメリット




CLAUDE.mdにルール記載
明示的で管理しやすい
コンテキスト圧迫、更新が必要


既存コードからパターン学習
自然な一貫性
意図しないパターンも学習する可能性


Skillsで定型化
再現性が高い
初期設定コストが高い





 Codexが上回る場面：大規模変更とGitHub統合
一方でCodexに分があるのは大規模変更だ。Next.js 15から16へのマイグレーションを行ったとき、差を実感した。



タスク
Claude Code
Codex




単一ファイルのバグ修正
約30秒
約45秒


3ファイルの機能追加
約2分
約2.5分


20ファイルのAPI変更
約8分

約5分（Cloud並列）


50ファイルのimport整理
約15分

約7分（Cloud並列）



※ 体感値。プロジェクトの複雑度・ネットワーク状況で変動する。
Claude Codeは数十ファイルの変更をローカルで処理するため、ターミナルがビジーになる。Codexのクラウド並列実行は「投げたら待つだけ」で、コーヒーを淹れに行ける。この差は意外と大きい。
もう一つの強みがGitHub統合だ。
# PRに @codex でコメントするだけで自動レビュー起動
@codex このPRのパフォーマンス問題を指摘してください

# CI失敗時にCodexが修正提案を自動作成（Automations設定後）
「設定を育てる」というより「GitHubに接続する」だけで即戦力になるのがCodexの設計思想だ。


 コード品質の差：「良さの方向性」が違う
どちらが良いコードを出すかは一概に言えない。方向性が違うからだ。
Claude Codeは既存コードベースとの一貫性が高い。変数の命名、エラーハンドリングのパターン、コメントのスタイルまで、周囲のコードに合わせてくる。
Codexはベストプラクティスに忠実。同じ機能でもCodexはこう書く：
/**
 * Retrieves blog posts matching the specified tag.
 * @param tag - The tag to filter by (case-insensitive)
 */
export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  if (!tag || typeof tag !== 'string') {
    return [];
  }
  const normalizedTag = tag.toLowerCase().trim();
  const posts = await getAllPosts();
  return posts
    .filter((post) =>
      post.tags.some((t) => t.toLowerCase().trim() === normalizedTag)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
防御的で型安全で、テスト網羅性も高い。ただしプロジェクト固有の慣習よりも「一般的に良いコード」に寄る。
プロジェクトのフェーズで選ぶのが現実的だ。初期開発ではCodexの防御的なコードが安全。運用フェーズでは既存コードとの一貫性を保つClaude Codeが楽。


 実践で気づいたこと：コスト感は「初日で回収」の感覚
2ヶ月使って一番変わったのは、コストへの感覚だ。
現在は Claude Code Max 20x（$200/月）+ Codex ChatGPT Plus（$20/月）で$220。「高い」と感じた時期もあったが、今は「Claude Codeなしで手動でやっていた作業を時給換算したら、$220は初日で回収できる」が正直な感覚だ。
「1つだけ選ぶなら」という問いへの答えは Claude Code になる。理由は単純で、日常開発の時間の方が長いから。大規模リファクタリングは月に数回だが、日常のコード修正は毎日ある。


 まとめ：自分はこう使っている


Claude Code: 日常開発全般。settings.jsonとSkillsを育てた分だけ速くなる

Codex: PRの自動レビューと大規模一括変更。GitHubに接続するだけで動く

両方: 月$220で日常開発 + PR自動レビューの体制が組める

「どちらが良いか」ではなく「どの作業に向いているか」で選ぶのが2ヶ月使った結論だ。初期設定に時間をかけたくないならCodexから始めるのが正直なアドバイスになる。


 元記事
この記事は Claude Code vs Codex 料金・性能 — 実プロジェクトで使い比べてわかった選び方 のコア部分を再構成したものです。元記事ではさらに：

カスタマイズ性（settings.json + Skills + Hooksの三位一体）の詳細設計
Codex Automationsを使ったCI/CD連携の実装パターン
Skills共有リポジトリで両ツールを統一管理する方法

を扱っています。

この記事は playpark Blog からの転載です。
