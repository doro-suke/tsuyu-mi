# Claude Opus 4.8 のプロンプティング・ベストプラクティス — 公式ガイドの要点 - Qiita
- **Source URL**: https://qiita.com/y-morimatsu/items/ea44baec84417d36b85d
- **Score**: 85
- **AI Summary**:
  - Opus 4.8のAPIは、effortパラメータで知能とコストのトレードオフを5段階に厳格に制御する
  - adaptive thinkingパラメータの導入により、複雑さに応じた思考プロセスの動的制御が可能
  - ツール使用やsubagentの起動は控えめなため、プロンプトでの明示的な指示や設定調整が推奨される
- **Read Now Reason**: AI駆動開発プロジェクトにおいて、最新のClaude Opus 4.8 API（effortやadaptive thinking）を適用するための具体的なコード移行例と、推論・ツール利用の制御方法が明記されているため、即座に実装に反映できる。
- **Suggested Tags**: #Claude-Opus-4.8, #Prompt-Engineering, #AI駆動開発, #Anthropic-API
- **Processed Date**: 2026/6/4

---

## 本文
グラレコ


はじめに 🎯
Anthropic が公開しているプロンプトエンジニアリングの公式ガイドに、Claude Opus 4.8 向けのベストプラクティス がまとまっています。このモデルは long-horizon agentic（長期にわたる自律作業）・knowledge work・vision・memory といったタスクに強く、しかも Opus 4.7 のプロンプトをそのまま使ってもよく動く とされています。
ただ、「そのまま動く」と「最適化されている」は別の話です。Opus 4.8 には、前の世代とは少し違う挙動のクセがいくつかあります。effort（労力）への反応がこれまで以上に大きかったり、指示を文字通り受け取る傾向が強かったり、subagent を控えめに spawn したり——こうした特徴を知らずに旧来のプロンプトを使い続けると、本来の性能を出しきれないことがあります。
この記事では、公式ガイドの中から Opus 4.8 に固有のチューニングポイント を中心に、実務で効く順に整理していきます。Claude API や Claude Code を業務で使っていて、4.8 にアップグレードしてプロンプトを見直したい方を想定しています。
この記事でわかること:

🎚️ effort（労力）パラメータの使い分け — 4.8 で最重要のレバー
🤔 thinking（思考）の制御と adaptive thinking
🔧 tool use・subagent の挙動チューニング
📝 応答の長さ・文体・「文字通り解釈する」クセへの対処
🎨 デザイン生成・コードレビューといった用途別のコツ



まず全体像 🗺️
Opus 4.8 のプロンプティングで意識すべきポイントを、ざっくり地図にするとこうなります。


この図は、4.8 に移行したときに見直す価値のあるポイントを一覧にしたものです。読み取ってほしいのは、いちばん効くレバーが effort である という点です。公式も「effort はこれまでのどの Opus よりも重要なので、アップグレード時には積極的に実験してほしい」と明言しています。順番に見ていきます。


effort（労力）の使い分け 🎚️
Opus 4.8 のプロンプティングで、まず押さえたいのが effort パラメータ です。これは「知能（賢さ）」と「トークン消費（コスト・速度）」のトレードオフを調整するレバーです。effort を上げれば賢くなりますが、トークンを多く使い、遅くなります。
公式の出発点はシンプルです。

coding・agentic な用途は xhigh から始める
知能が重要な用途は最低でも high

effort には5段階あります。それぞれの位置づけを整理します。



effort
位置づけ




max
知能要求の高いタスク向け。ただしトークンを増やしても逓減することがあり、overthinking（考えすぎ）に陥りやすい場面も


xhigh
coding・agentic 用途のベスト設定


high
トークンと知能のバランス。知能が重要なら最低ここ


medium
コスト重視。知能を多少犠牲にしてトークンを減らす


low
短くスコープの限定されたタスク、レイテンシ重視で知能をあまり要さない処理向け





この図は、effort を低い順に並べたものです。読み取ってほしいのは、「とりあえず max」ではなく、用途に応じて中央寄り（high〜xhigh）を基本にする という設計思想です。max は強力ですが、考えすぎてかえって遅くなることがあります。

Opus 4.8 は effort を「厳格に」守る
ここが前世代と違う、重要なクセです。Opus 4.8 は effort レベルを 厳格に守ります。特に low や medium では、「言われたことだけ」をやり、それ以上のことに踏み込みません。これはレイテンシとコストには良いのですが、中程度に複雑なタスクを low で回すと、考えが浅くなる（under-thinking）リスク があります。
複雑な問題で推論が浅いと感じたら、プロンプトで小細工するより effort を high か xhigh に上げる のが正攻法です。ただ、レイテンシの都合でどうしても low を維持したい場合は、ピンポイントの指示を足します。
This task involves multi-step reasoning. Think carefully through the problem before responding.

逆に、max や xhigh で動かすときは、モデルが subagent やツール呼び出しをまたいで考え・動くための余地が必要です。max output token budget を大きめに取りましょう。公式は 64k トークンから始めて調整することを勧めています。
 
💡
effort は 4.8 で最も効くレバーです。「アップグレードしたらまず effort を振ってみる」を最初の一手にすると、手応えが掴みやすいと思います。
 


thinking（思考）の制御 🤔
effort と並んで重要なのが thinking（思考） の扱いです。Opus 4.8 では、thinking は デフォルトで off です。明示的に thinking: {type: "adaptive"} を設定したときだけ有効になります。adaptive thinking は、Claude が「いつ・どれだけ考えるか」を effort とクエリの複雑さから動的に判断してくれる仕組みです。


この図は、thinking パラメータの有無で挙動がどう分かれるかを示しています。読み取ってほしいのは、adaptive thinking にしておくと、簡単な質問では思考をスキップし、複雑な問題では深く考える という自動の使い分けが効く点です。multi-step のツール使用や長期の agent ループには、adaptive thinking が向いています。

思考しすぎるときの steer
大きく複雑な system prompt を使っていると、Opus 4.8 が思ったより頻繁に思考してしまうことがあります。その場合はプロンプトで方向づけできます。
Thinking adds latency and should only be used when it will meaningfully improve answer quality — typically for problems that require multi-step reasoning. When in doubt, respond directly.

逆に、medium で重いワークロードを回していて under-thinking（考えが足りない）を感じたら、まず最初に試すレバーはやはり effort を上げること です。それでも細かく制御したいときに、プロンプトで直接指示します。

extended thinking からの移行
旧モデルで budget_tokens を使った extended thinking を使っていた場合、4.8 では adaptive thinking + effort に移行します。以下は公式ドキュメントの移行例に倣ったもので、Before 側は旧来の Sonnet 4.5 を例に取っています（やることは Opus 4.8 への移行でも同じです）。
# Before（旧モデル・extended thinking）
client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=64000,
    thinking={"type": "enabled", "budget_tokens": 32000},
    messages=[{"role": "user", "content": "..."}],
)

# After（adaptive thinking）
client.messages.create(
    model="claude-opus-4-8",
    max_tokens=64000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},  # max / xhigh / medium / low も指定可
    messages=[{"role": "user", "content": "..."}],
)

budget_tokens で思考量を制御していたのを、effort に寄せるのがポイントです。なお extended thinking を使っていなかったなら、何も変更は要りません（thinking はパラメータを省けば off のままです）。


tool use と subagent の挙動 🔧
Opus 4.8 は、エージェント的な振る舞いのデフォルトが前世代と少し変わっています。

ツールより推論を好む
Opus 4.8 は ツール呼び出しよりも推論（reasoning）を好む 傾向があります。多くの場合、これでより良い結果が出ます。ただ、もっとツールを使ってほしい場面では、effort を上げる のが有効なレバーです。特に knowledge work（調べ物中心の作業）でこのレバーが効きます。high や xhigh にすると、agentic search やコーディングでのツール使用が大幅に増えます。
それでもツールを使ってくれないときは、「いつ・どうそのツールを使うべきか」を明示的に書きます。たとえば web 検索ツールが使われないなら、なぜ・どう使うべきかをはっきり説明します。

subagent は控えめに spawn する
Opus 4.8 は、デフォルトで subagent を少なめに spawn します。これも steer できるので、subagent が望ましい場面を明示的に伝えます。コーディング用途の例です。
Do not spawn a subagent for work you can complete directly in a single response (e.g. refactoring a function you can already see).
Spawn multiple subagents in the same turn when fanning out across items or reading multiple files.



この図は、subagent を使うかどうかの判断軸を示しています。読み取ってほしいのは、並列化・文脈の分離・独立した作業のときに subagent、それ以外は直接 という線引きです。Opus 4.8 は放っておくと控えめなので、ファンアウトしてほしい場面は明示的に促すのがコツです。

user 向けの進捗報告
Opus 4.8 は、長い agentic trace の中で 定期的に高品質な進捗報告 を出してくれます。もし「3回ツールを呼んだら要約する」のような足場（scaffolding）をプロンプトに仕込んでいたら、外してみる ことをおすすめします。モデル自身がうまくやってくれるからです。報告の長さや内容が用途に合わなければ、「こういう報告をしてほしい」と例つきで明示します。


「文字通り解釈する」クセへの対処 📝
Opus 4.8 のもうひとつの大きな特徴が、指示を文字通り・明示的に解釈する ことです。特に低い effort で顕著になります。具体的には、1つの項目への指示を黙って他の項目に一般化しませんし、頼んでいないことを推測して実行することもありません。
これは 精度の高さ・無駄な手戻りの少なさ につながり、API 用途・構造化抽出・予測可能性を求めるパイプラインでは特に良く働きます。一方で、「全体に適用してほしい」ときは scope（範囲）を明示する 必要があります。
Apply this formatting to every section, not just the first one.

「最初のセクションだけでなく、すべてのセクションに」と書く。これだけで挙動が安定します。「言わなくても察してくれるだろう」が通じにくくなった、と捉えると分かりやすいです。

応答の長さも自動調整される
Opus 4.8 は、応答の長さを タスクの複雑さに応じて自動調整 します。固定の冗長さを持たないので、簡単な照会には短く、オープンな分析には長く答えます。もし製品が特定の文体や長さに依存しているなら、プロンプトでチューニングします。冗長さを減らす例です。
Provide concise, focused responses. Skip non-essential context, and keep examples minimal.

ここでひとつコツがあります。「〜するな」というネガティブな指示や禁止より、「適切な簡潔さで書けている例」を見せるポジティブな例のほうが効きやすい とされています。

文体は直接的・意見を持つ方向にシフト
Opus 4.8 の散文スタイルは、直接的で意見を持ち、過度な同調（validation-forward な言い回し）を控え、絵文字も控えめ な方向に寄っています。もし製品がもっと温かい・会話的な声を必要とするなら、明示的に指定します。
Use a warm, collaborative tone. Acknowledge the user's framing before answering.



用途別のコツ 🎨
ここからは、特定の用途で効くチューニングを見ていきます。

デザイン・フロントエンド
Opus 4.8 には 強いデザイン本能 があり、放っておくと一貫したハウススタイルが出てきます。具体的には、暖かいクリーム/オフホワイトの背景（だいたい #F4F1EA）、serif の見出しフォント（Georgia、Fraunces、Playfair）、イタリックの語強調、テラコッタ/琥珀のアクセント——こういう組み合わせです。
これは editorial・hospitality・portfolio のようなブリーフには合います。でも dashboard・dev tool・fintech・healthcare・enterprise アプリには、正直しっくり来ません。しかもこのデフォルトは 持続的 で、「クリームを使うな」「クリーンでミニマルに」のような汎用的な指示だと、別の固定パレットに移るだけで、バリエーションは生まれにくいです。
確実に効く方法は2つあります。
1. 具体的な代替を指定する。 モデルは明示的なスペックを正確に守ります。
The visual direction should come from a cold monochrome atmosphere using pale silver-gray tones that gradually deepen into blue-gray and near-black...
Color palette should stay within this range:
#E9ECEC, #C9D2D4, #8C9A9E, #44545B, #11171B.

2. 構築前にオプションを提案させる。 これがデフォルトを崩し、ユーザーに選択権を与えます。以前 temperature でデザインのばらつきを出していたなら、この方法が代わりになります。
Before building, propose 4 distinct visual directions tailored to this brief (each as: bg hex / accent hex / typeface — one-line rationale). Ask the user to pick one, then implement only that direction.

なお Opus 4.8 は、以前のモデルより 少ないプロンプトで「AI slop（AIっぽい量産型デザイン）」を回避 できます。汎用フォント（Inter、Roboto、Arial）や紫グラデーションの定番を避けるよう促すスニペットが、上記の手法とよく噛み合います。
<frontend_aesthetics>
NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white or dark backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character. Use unique fonts, cohesive colors and themes, and animations for effects and micro-interactions.
</frontend_aesthetics>


コードレビューのハーネス
Opus 4.8 は、バグ発見が前世代より明確に上手 です。内部評価では recall（取りこぼしの少なさ）も precision（誤検出の少なさ）も上がっています。ただ、旧モデル向けに調整したコードレビューのハーネスを使っていると、最初は recall が下がって見えることがあります。これは能力の後退ではなく、ハーネス側の効果です。
理由が面白いところです。「high-severity な問題だけ報告して」「保守的に」「細かい指摘はするな」といった指示を、Opus 4.8 は前世代より 忠実に守ります。つまり、コードを同じ深さで調査してバグを見つけても、「あなたが言った基準より下」と判断したものは報告しなくなるのです。結果として、調査の深さは同じなのに報告件数が減る、という形で現れます。precision は上がるのに、測定上の recall は下がって見える、というわけです。
対策として推奨されているプロンプトがこちらです。
Report every issue you find, including ones you are uncertain about or consider low-severity. Do not filter for importance or confidence at this stage - a separate verification step will do that. Your goal here is coverage: it is better to surface a finding that later gets filtered out than to silently drop a real bug. For each finding, include your confidence level and an estimated severity so a downstream filter can rank them.

ポイントは、「発見」の段階では coverage（網羅）に専念させ、フィルタリングは別の段階に分ける ことです。


この図は、コードレビューを「発見」と「フィルタ」の2段階に分ける考え方を示しています。読み取ってほしいのは、バグを見つける段階で報告を絞らせない ことで、Opus 4.8 の高い発見能力を取りこぼさずに引き出せる、という点です。

対話的なコーディング製品
Opus 4.8 は、自律的（単一ターン）な使い方と対話的（複数ターン）な使い方 で、トークン消費や挙動が変わります。対話的な設定ではトークンを多めに使う傾向があります。user のターンのあとに、より多く推論するからです。これは長い対話セッションでの一貫性や指示追従、コーディング能力を高める一方、トークンも増やします。
性能とトークン効率を両立させるには、xhigh か high の effort を使い、auto mode のような自律機能を足し、ユーザーに求める操作の回数を減らす のが有効です。
そのうえで、最初の human ターンでタスク・意図・制約を明示する ことが鍵になります。Opus 4.8 は前世代より自律的なので、最初に明確で正確なタスク記述を与えると、自律性と知能を最大化しつつ、user ターン後の余計なトークン消費を抑えられます。逆に、曖昧な指示を複数ターンで小出しにすると、トークン効率も性能も相対的に落ちがちです。

computer use
computer use（コンピュータ操作）は、最大 2576px / 3.75MP の解像度まで対応します。内部テストでは 1080p が性能とコストのバランスが良い とされています。コスト重視なら 720p や 1366×768 が低コストで強い性能を出す選択肢です。


汎用の原則もおさらい 🧭
ここまでは Opus 4.8 固有の話でしたが、世代を問わず効く基本原則も、4.8 でそのまま有効です。手短に押さえておきます。


明確かつ直接的に: ゴールデンルールは「文脈をほとんど持たない同僚にプロンプトを見せて、混乱するなら Claude も混乱する」。期待する出力の形式・制約を具体的に書きます。

文脈（なぜ）を足す: なぜその振る舞いが重要かを説明すると、Claude が目的を理解して的を射た応答を返します。「絶対に省略記号を使うな」より「読み上げエンジンが読むので省略記号は使わないで」のほうが効きます。

例を使う: few-shot（3〜5個）が出力の形式・トーン・構造を安定させます。<example> タグで囲みます。

XML タグで構造化: 指示・文脈・例・入力が混ざるとき、<instructions> <context> <input> のようにタグで分けると誤解が減ります。

長文は上に、クエリは下に: 20k トークンを超える長文を扱うときは、長い文書を上に、質問・指示を下に置きます。テストでは最大30%の品質改善が見られたとのことです。



prefill が使えなくなった点に注意 ⚠️
移行で見落としがちな変更があります。最終 assistant ターンの prefill（応答の冒頭を埋めておく手法）は、Claude 4.6 系以降サポートされなくなりました。prefill 付きのリクエストは 400 エラーを返します。
これまで prefill で実現していたことは、次のように移行します。


出力フォーマットの固定（JSON/YAML 等） → Structured Outputs 機能を使う、もしくはまず素直にスキーマに従うよう指示する

前置き（"Here is..."）の除去 → system prompt で直接指示する、または XML タグ・structured outputs・tool calling を使う

不適切な拒否の回避 → 4.8 は適切な拒否が上手になっているので、user メッセージ内の明確なプロンプトで足りる

応答の継続 → 継続を user メッセージに移し、中断した応答の最後のテキストを含める

モデルの知能と指示追従が上がった結果、prefill の用途の多くはもう不要になった、という整理です。


まとめ 🏁
Claude Opus 4.8 のプロンプティングをひとことでまとめると、「賢くなった分だけ、指示を素直に・厳密に受け取るようになったので、こちらの意図を明示的に渡す」 に尽きます。
個人的にいちばんの変更は、effort  部分だと感じています。。4.8 では effort がこれまでのどの Opus よりも効きます。推論が浅いと感じたらプロンプトで小細工する前に effort を上げる、ツールをもっと使ってほしいなら effort を上げる——多くの悩みが、まず effort で解けます。
coding・agentic なら xhigh から、知能が要るなら最低 high。この点さえ覚えておけば、あとは手元のタスクで試しながら詰めていけます。
旧来のプロンプトをそのまま使っても動くからこそ、つい最適化を後回しにしがちです。でも、4.8 のクセを少し知って effort と scope の明示を足すだけで、同じモデルから引き出せる結果がだいぶ変わってきます。アップグレードしたら、まず重めのタスクを1つ選んで、effort を振りながら手応えを確かめてみてください。

参考


Prompting best practices — Anthropic 公式（platform.claude.com）

effort parameter — Anthropic 公式
adaptive thinking — Anthropic 公式
Migration guide — Anthropic 公式
