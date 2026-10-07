# Claude Code拡張を47個試して5個に絞った話 ── 残した理由と捨てた基準
- **Source URL**: https://zenn.dev/kenimo49/articles/claude-code-extensions-47-to-5-narrowing
- **Score**: 82
- **AI Summary**:
  - 47個の拡張による競合とループ発生から、3ヶ月の運用を経て実用的な5個に厳選したプロセス。
  - 起動ログの分析による機械的削減と、機能重複の統合によるコンテキストノイズの最小化手法。
  - 残すべき基準として、使用頻度、事故防止、不可逆性、認知コスト、独自ドメインの5軸を提示。
- **Read Now Reason**: AI駆動開発（Claude Code）におけるツールの競合や無限ループなどの暴走リスクを防ぎ、トークン消費を抑えて開発効率を最大化するための、実践的なツール選定・運用原則が明記されているため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #ツール最適化, #エージェント設計
- **Processed Date**: 2026/5/26

---

## 本文
先週は Skills / MCP / Hooks / Plugins の4つの拡張を用語整理として書きました。今週は実体験編です。
私は最初、Skill を 47個入れて「47人のアシスタントを雇った」気分でした。実態は「47回 hooks が暴発した」でした。いいねね。
3か月運用したら、生き残ったのはたった 5個 でした。本記事は、その絞り込みの過程と判定軸を残しておく実践記です。

47個 → 12個 → 5個 へ。各段階で何を切ったか

 なぜ47個も入れたのか
最初の動機は単純で、「困ったときに使えそうなものは全部入れておきたい」でした。Claude Code Skills は SKILL.md という単一フォーマットなので、追加コストはほぼゼロに見える。
しかも 2026年3月時点で、Anthropic 公式の frontend-design Skill は 277,000インストールを超えていますし、コミュニティ集約サイト LobeHub の Agent Skills Marketplace には数万件規模のスキルが並びます。GitHub で公開されている marketplace リポジトリだけでも、netresearch/claude-code-marketplace、alirezarezvani/claude-skills(263+)、ComposioHQ/awesome-claude-skills など、数十リポジトリが活発に更新されています。
選択肢が多すぎるので、見つけたら片っ端から入れていた。これが間違いの始まりでした。

 47個の内訳:カテゴリ別の代表例
棚卸ししたら、こんな構成でした。



カテゴリ
入れた Skill の例
数




コードレビュー系
code-review, security-review, refactor-helper, lint-fixer
7


Git/PR 操作
gh-cli, pr-summary, branch-protector, conventional-commit
6


ドキュメント
slide-design, readme-generator, diagram-renderer, blog-writer
5


検索/RAG
web-search, kg-builder, context-loader, semantic-search
5


OCR/画像
screenshot-ocr, figure-extractor, ui-mockup
4


業務系
meeting-notes-summarizer, calendar-glue, gmail-triage
5


デプロイ/CI
aws-deployer, vercel-pusher, docker-scan
4


その他お試し
tarot, joke-generator, daily-fortune など
11



最後のカテゴリを見れば、私が浮かれていたのが分かります。
「tarot ってお前、業務で何をするつもりだったんだ」と過去の私に問い詰めたいのですが、当時の言い分は「面白くいこうぜ」だったはずです。面白さで仕事は進まないことを、その後 3か月で痛感します。

 暴発の話:hooks が hooks を呼んだ夜
転機は、ある夜のデバッグ中でした。
PostToolUse の hook で lint をかける Skill と、PreCommit で test を走らせる Skill と、SaveFile で format をかける Skill。3つが同時に発火して、ファイル保存のたびに 8秒待たされる地獄になりました。
しかも format がコードを書き換えると、lint が再発火し、test が走り直し、format がまた走る。これに、screenshot-ocr が「画像が更新されたから OCR します」と乱入してきました。
そのときの私の Claude Code は、自分の出力を自分で書き換え続けるループに入っていて、TPM が普段の 4倍に跳ねていました。

「47人のアシスタントを雇った」は誇張表現ではありません。47人が同時に「私がやります」と挙手して椅子を倒し合う、その光景そのものでした。

 一次絞り込み:30日間0回起動を切る
最初にやったのは、機械的な足切りでした。Claude Code のセッションログから、各 Skill の起動回数を 30日間で集計します。
# セッションログから skill の発火回数を抽出する例
jq -r '.events[] | select(.type=="skill_invoke") | .skill_name' \
  ~/.claude/sessions/*.json \
  | sort | uniq -c | sort -rn
結果は残酷でした。

月 20回以上起動: 6個
月 5-19回: 6個
月 1-4回: 14個
0回: 21個

つまり半分弱は、入れただけで一度も呼ばれていなかった。tarot が動いていないのは妥当として、aws-deployer すら 0回でした。理由は単純で、デプロイは GitHub Actions に既にあって、Claude Code から呼ぶ理由がなかったからです。
ここで 21個を一気に削除し、残り 26個。

 二次絞り込み:競合とドメイン重複
次に効いたのは「同じ用途に複数 Skill がある」問題です。
たとえばコードレビュー系は 7個入れていましたが、実際に発火していたのは code-review と security-review の 2個だけ。他の 5個は「似たことをするが微妙に違う」状態で、Claude Code が選び迷う原因になっていました。
選択肢が多すぎると、Claude が最適な Skill を選べない。これは context engineering の基本で、ツールが多いほど判断ノイズが増えます。



統合前
統合後
削った理由




code-review, refactor-helper, lint-fixer, formatter, polish-skill
code-review 1本
機能が 80% かぶる


gh-cli, pr-summary, branch-protector, conventional-commit
gh-cli + pre-push-guard
gh-cli が PR系をカバー


web-search, semantic-search, context-loader
kg-builder 1本
自分のKG優先



ここで 14個に絞れました。残り 12個。さらに 1ヶ月運用してみて、起動はするが「なくても困らない」ものを 7個削り、最終的に 5個に。

 残した 5個と、その判定軸
ここからが本題です。私が残した 5個を、判定軸の順で並べます。

 1. 毎日使う:code-review

判定軸は 使用頻度 です。週に 5回以上起動するなら残す、そうでなければ削る。これだけです。
code-review は、コミット前に diff を投げて 3分で返ってくる、軽量な相棒です。重い security-review と分けたのが正解で、毎日使うものは軽くないと続きません。
体感ですが、レビューを Skill 化してから、PR の指摘が 4割減りました。レビュアーが「LGTM」を押すまでの時間も体感半分です。具体数字は取り損ねたので、後悔ポイントとして書いておきます。

 2. 致命的事故防止:secrets-scan

判定軸は 失敗時の致命度 です。月に 1回しか動かなくても、その 1回で会社が傾くなら残します。
secrets-scan は、ファイル保存時の hook として動き、.env、API キーらしき文字列、AWS の access key パターンを検出します。私は過去、GitHub に Stripe のテストキーを push して 1時間で revoke される事件をやらかしたことがあり、それ以来「秒で気づく仕組み」を一番上に置いています。
被害規模で判定 するカテゴリは、絶対に削ってはいけません。頻度が低くても、被害が致命的なら残します。

 3. 不可逆作業の安全弁:pre-push-guard

判定軸は 不可逆性 です。やり直しが効かない操作には、必ず Skill か hook で確認層を挟みます。
pre-push-guard は、git push --force や git push origin main を検出して、Claude Code に「本当に押しますか」と確認させます。Claude Code 自体が main に直 push しようとしたケースを、これで 3回止めました。
「Claude が止めるんじゃなくて、Claude を止める」発想です。AI を信用するからこそ、AI が暴走する経路に栓をします。

 4. 認知コスト削減:meeting-notes-summarizer

判定軸は 自分の脳のリソース です。毎週やる作業で、頭を使うわりに価値が低いものは Skill 化します。
私は週 4本くらいオンラインミーティングがあり、文字起こしを毎回手で整形するのは面倒でした。この Skill は、Zoom/Meet の transcript を投げると、決定事項と TODO だけ抜いて Markdown で返します。
1回あたり 8分の節約 × 週 4本 = 月 128分。これだけで Claude Code Max プランの元が取れます。

 5. 競合不在:独自ドメインの kaori-knowledge

判定軸は 代替が世の中に存在しないか です。
私は香料会社の役員もやっていまして、香料の知識(IFRA 規制、希釈率、ノートピラミッド構造)を扱うドメイン Skill を自作しています。これは公式 marketplace にも GitHub にも存在しない、自分の業務でしか需要がない知識です。
世の中にある汎用 Skill は、いつ誰かが上位互換を作るか分かりません。一方、自分のドメイン Skill には競合がいないので、メンテすれば一生使えます。これが一番「資産化」しやすいカテゴリでした。

 捨てた 42個の典型例と、捨てた理由
逆に、捨てた 42個の典型例を残しておきます。



捨てた Skill
捨てた主因




slide-design
月 2回しか発表しない。CLI で作る価値が薄い


screenshot-ocr
macOS の標準OCRで十分


kg-builder
context-forge を直接叩く方が速い


tarot
(語るまでもなく)


aws-deployer
GitHub Actions が既存


diagram-renderer
Mermaid を直書きする方が速い


joke-generator
Wit は自分で言うから面白い



「Skill にする価値があるか」は「自分のワークフローで毎日触る道具か」で判定するのが結論です。SNS で話題になった Skill に飛びついても、自分の業務にフィットしないものは 1ヶ月で死蔵します。

 5本主義のメリット
5個に絞ってから、観測できた変化を 3つ。
1. コンテキストウィンドウが軽くなった
Claude Code は起動時に有効な Skill の SKILL.md を読み込みます。47個あった頃は、起動だけで 15,000トークン近く食っていました。5個になって 2,000トークン台に落ち、毎セッションのコスト感が明らかに下がりました。
2. 「どの Skill が動いているか」が常に把握できる
47個の頃は、Claude が何を考えて何を呼んだのか追えませんでした。5個なら、ログを見るまでもなく全部頭に入ります。デバッグが圧倒的に楽です。
3. メンテナンスが回るようになった
5個なら、月1で SKILL.md をレビューして改善できます。47個では、改善対象が多すぎて結局誰も触らない放置 Skill が大半でした。 メンテできない資産は資産ではなく負債 です。

 5本選定のチェックリスト
明日から自分でやる人のために、判定フローを書き残します。
[ステップ 1] セッションログから 30日間の起動回数を集計
[ステップ 2] 起動 0回の Skill を全削除
[ステップ 3] 残った Skill を以下の 5軸で評価
   - 軸1: 週 5回以上使うか?
   - 軸2: 失敗したら致命的か?
   - 軸3: 不可逆操作の安全弁か?
   - 軸4: 自分の脳リソースを節約するか?
   - 軸5: 競合が世の中に不在か?
[ステップ 4] 5軸のいずれにも該当しないものを削除
[ステップ 5] 1ヶ月後に再評価。新陳代謝を回す
ステップ 5 が地味に重要です。残した 5個も、半年後には別の 5個になっている可能性があります。Skill は流動資産として扱い、半年単位で入れ替えていきます。

 Q2 2026 の plugin 動向と、絞り込み戦略の補強
2026年5月時点で、Claude Code 本体の plugin 機構にもいくつか地味な改善が入っています。


claude plugin disable が依存関係を検知し、依存先 plugin の連鎖無効化を提案する

/plugin marketplace browse に コンテキスト消費の予測トークン数 が表示される

/skills に type-to-filter の検索ボックスが追加され、長いリストでもスクロール不要
plugin の zip 配布が --plugin-dir でサポート

特に注目すべきは 2つ目です。Anthropic 公式が「この Skill を入れるとコンテキストをこれだけ食います」と表示するようになった。これは「47個入れる」運用に対する、運営側からの牽制でもあります。
公式が「コストを見せる」方向に動いた以上、私たち利用者も コストに見合う Skill だけ残す 方向に進むのが筋です。

 まとめ:絞り込みは技術ではなく姿勢
47個から 5個へ、という具体的な数字を出しましたが、本質は数ではありません。

多ければ多いほど良いという発想を捨てる
自分の業務に合わない Skill は 1ヶ月で削る
競合の少ない自作 Skill を資産化する
hooks の暴発リスクを設計時点で考える
公式 plugin のコスト表示を判定に使う

道具は人を助けるためにあって、人が道具を世話するためにあるのではない。これは Claude Code に限らない、全ツールに共通する話だと思います。
それでは、面白くいきましょう。


 関連記事


Skills/MCP/Hooks/Plugins Claude Code 4つの拡張 (用語整理編)

1年前の自分へ Claude Codeはこう始めろ (実践記シリーズ)
