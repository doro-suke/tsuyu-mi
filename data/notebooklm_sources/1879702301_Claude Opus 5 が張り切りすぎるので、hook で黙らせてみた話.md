# Claude Opus 5 が張り切りすぎるので、hook で黙らせてみた話
- **Source URL**: https://zenn.dev/zelda_link/articles/4551124e62c49f
- **Score**: 78
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #プロンプトエンジニアリング
- **Processed Date**: 2026/10/9

---

## 本文
この記事は実質陳腐化しました (2026/09/24 追記)
2026年9月22日に Opus5.5 がローンチされました。
X上では「Opus4.6の応答スタイルが返ってきた」という見解が多く見られるだけでなく、モデルが持つ本来の性能を含め、Opus5.5の評判は上々のようです。私個人も「とても良い感触」という印象を持って使ってみています。
この記事の投稿から2ヶ月も経たず（Opus5からもほぼ2ヶ月）で対応されるというのはAI自体の進化にも驚きですが、いずれにしても、Opus5.5の登場により、 Opus5 を使う理由はほぼなくなったと言えるため、この記事は実質陳腐化したことをお伝えします。

 この記事でやること
Claude Opus 5 に移行したら、応答が長い・頼んでいない作業をする・勝手にファイルを消す、といった摩擦が出た。公式ガイドを読んで設定で抑え込んだので、その記録を残す。
結論から言うと、新しい能力を活かす設定ではなく、以前の応答スタイルに戻す設定を数時間かけて書いた。そこが本題でもある。
なお、この記事自体も Opus 5 に書かせている。制限をかけた状態で、制限のかけ方について書かせるという構図になっている。設定が効いているかどうかは、この記事の長さで判断してほしい。


 何が起きたか
Opus 5 に切り替えて最初に気づくのは、応答が長いことだ。次に気づくのは、頼んでいないことをやることだ。
（投稿者本人（人間）による補足：実際にはOpus4.7 , Sonnet 5 以降といえる。後述。）
公式ガイドにこう書いてある。

Claude Opus 5 は、タスクのスコープを拡大し、要求されていないステップを追加したり、タスクがどうあるべきかについて独自の判断を適用したりすることもあります。

Anthropic 自身が既知の挙動として書いている。そして対処法として、システムプロンプトに貼るべき英文スニペットが列挙されている。
実際、この記事のもとになったセッションでは、こんなことが起きた。

「2つの hook を統合して」と頼んだら、統合したうえで統合元のファイルを削除した
README から、参考用に載せていた設定サンプルを削除した

1.の統合元を消すのはまだわかる。だが2.についての、READMEに記載してあった参考用の設定サンプルは統合元ですらない。
その README には「使わなくなったスクリプトは参考として残している」とまで明記してある。書いてあることを消されたわけだ。
以前からAIの削除系挙動については問題視されるところだが、それに輪をかけた動きになりかねない。そこで設定を見直すことにした。

 公式ガイドはあるが、置き場所が書いていない
Claude Opus 5 のプロンプティング に推奨事項がまとまっている。ただしこのドキュメントは API を直接叩く前提で書かれていて、「システムプロンプトに書け」としか言っていない。
Claude Code にはシステムプロンプトを直接編集する口がない。相当する置き場所は4つある。



機構
注入先
永続性




Output Style
システムプロンプト
選択中のみ


--append-system-prompt
システムプロンプト末尾
起動オプション


CLAUDE.md
user turn（冒頭）
常時


hook の additionalContext

user turn（毎回末尾）
常時



CLAUDE.md と hook はシステムプロンプトではなく会話側に入る。効き方が違うので、項目ごとに使い分ける必要がある。
ここの判断がまず一手間だった。

 どれに何を置くか
最終的にこう振り分けた。



ガイドの項目
置き場所
理由




応答の長さ
Output Style
応答形式そのものの規定


進捗更新のペース
Output Style
対話の型の定義


タスクスコープ
Output Style
本体システムプロンプトと同じ層に置いて競合を制御


サブエージェント抑制
Output Style
同上


修正のナレーション
Output Style
応答の書き方


成果物ドキュメントの長さ
hook (PreToolUse)

書き込む直前に注入するのが最も効く


思考無効時の対策
不要
Claude Code は thinking 有効が前提



hook が有利なのは、発火タイミングが行為の直前だという点だ。CLAUDE.md に書いた指示は会話が長くなるほど薄れるが、PreToolUse は Write の直前に必ず入る。

 設定その1: Output Style
~/.claude/output-styles/opus5.md を作る。中身はガイドのスニペットをほぼそのまま。
---
name: Opus 5 Prompting
description: Opus 5 プロンプティングガイドの推奨を適用する
keep-coding-instructions: true
---

# Response length

Keep responses focused, brief, and concise. Keep disclaimers and caveats short,
and spend most of the response on the main answer. When asked to explain
something, give a high-level summary unless an in-depth explanation is
specifically requested.

# Progress updates

Before your first tool call, say in one sentence what you're about to do. While
working, give a brief update only when you find something important or change
direction. When you finish, lead with the outcome: your first sentence should
answer "what happened" or "what did you find," with supporting detail after it
for readers who want it.

# Task scope

Deliver what was asked, at the scope intended. Make routine judgment calls
yourself, and check in only when different readings of the request would lead to
materially different work. If the request seems mistaken or a better approach
exists, say so in a sentence and continue with the task as asked rather than
quietly narrowing, widening, or transforming it. Finish the whole task, and stop
short of actions that are clearly beyond what was asked.

The default above assumes the user is not waiting on you. Once you receive an
interruption, a mid-task message, or a correction, treat the user as watching:
break the work into small steps and end every turn with a report. Ending a turn
is not the same as waiting for input — on turns where you did not ask a
question, continue without waiting for further instructions.

# Subagents

Delegate to a subagent only for large tasks that are genuinely independent and
parallelizable, such as a wide multi-file investigation. Do not delegate work you
can finish yourself in a handful of tool calls, and do not use subagents to
verify or double-check your own work. If one subagent can complete the task, use
one rather than several, and keep spawn counts low.

# Corrections

Only correct an earlier statement when the error would change the user's code,
conclusions, or decisions. State corrections plainly and briefly, then continue
the task. For slips that change nothing for the user, make the fix and move on
without noting it.

<tone_preference>
Keep outputs reasonably concise.
</tone_preference>

 日本語訳
英語のままだと読みづらいので訳を載せておく。設定ファイル自体は英語のまま使う。本体のシステムプロンプトが英語なので、言語を揃えたほうが既存記述との対応が取りやすい。



節
訳




Response length
応答は焦点を絞り、短く簡潔にする。免責や但し書きは短く抑え、応答の大半を本題に充てる。説明を求められたときは、詳細な説明を明示的に要求された場合を除き、概要レベルで答える。


Progress updates
最初のツール呼び出しの前に、これから何をするかを一文で述べる。作業中は、重要なことを見つけたときと方針を変えるときだけ短く報告する。完了時は結果から書く。最初の一文で「何が起きたか」「何が分かったか」に答え、詳細はその後に置く。


Task scope
求められたものを、意図された範囲で届ける。日常的な判断は自分で下し、依頼の読み方が変わると作業内容が大きく変わる場合にだけ確認する。依頼に誤りがある、あるいはより良い方法があると思う場合は、それを一文で述べたうえで、依頼どおりに進める。黙って範囲を狭めたり広げたり作り変えたりしない。タスクは最後まで仕上げ、明らかに依頼の範囲を超える行為はしない。


Task scope（2段落目）
上の既定は、ユーザーが応答を待っていない場合を前提とする。途中の発話・interrupt・訂正を受けたら、以後ユーザーは見ているものとして扱い、作業を小さく区切って各ターンを報告本文で終える。ただしターンを終えることと、返答を待って止まることは別である。質問を書いていないターンは、次の指示を待たずに続きへ進んでよい。


Subagents
サブエージェントへの委任は、複数ファイルにまたがる広範な調査のように、真に独立していて並列化できる大きな作業に限る。自分が数回のツール呼び出しで終えられる作業は委任しない。自分の作業の検証や再確認にサブエージェントを使わない。一体で足りるなら複数使わず、起動数は低く抑える。


Corrections
以前の発言の訂正は、その誤りがユーザーのコード・結論・判断を変える場合にだけ行う。訂正は率直かつ簡潔に述べ、そのままタスクを続ける。ユーザーにとって何も変わらない些細な誤りは、黙って直して先へ進む。


<tone_preference>
出力は相応に簡潔に保つ。




 補足1: Task scope に足した2段落目
ガイドの原文は「異なる解釈で作業が大きく変わる時だけ確認しろ」= 自律寄りだ。だが対話的に使っているときは、毎ターン報告してほしい。
そこで切り替え条件を観測可能な事象に置いた。「interrupt や訂正を受けたら、以後は見ているものとして扱う」なら、モデル自身が判定できる。作業の種類を推測させるより確実だ。
さらに「ターンを終えることと、返答を待つことは別」と明記している。これを書かないと、報告のたびに止まって動かなくなる。

 投稿者本人（人間）による さらなる補足
「interrupt や訂正を受けたら、以後は見ているものとして扱う」 について。Opus 5 は、自身の前に人間は居ないものであるという前提で振る舞うというものです。これが自律の大きなポイントといえるでしょう。
なので「interrupt や訂正を受ける」事で、Opus 5 は人間を相手にしているという事を意識させる事にした、というわけなのですが、こちらは

のPostからの、コチラの記事が大変参考になりました。ありがとうございます。


 補足2: 末尾の <tone_preference> は何なのか
Markdown の中に唐突に XML タグが出てくるが、これはガイドの原文どおりだ。

長いシステムプロンプトでは、プロンプトの終わり近くに短いリマインダーを添えて指示をペアにします

タグ名が識別子になり、前方の Response length と同じ話だとモデルに伝わる。地の文で書くと独立した新しい要求に見えて、前半を強化する働きが弱まる。
モデルはプロンプトを Markdown として構文解析していないので、見出しと XML タグが混在しても問題ない。むしろ Anthropic の標準的な書き方だ。

 設定その2: hook で文書の長さを抑える
ガイドにはこう書いてある。

Claude Opus 5 がディスクに書き込むファイル（レポート、Markdown ドキュメント、要約）は、以前のモデルよりも長くなることがよくあります

~/.claude/hooks/opus5-artifact-length.sh:
#!/bin/bash
set -uo pipefail

. "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/lib-opus5-guard.sh"

STDIN_JSON=$(cat) || exit 0
opus5_is_active "$STDIN_JSON" || exit 0

jq -n '
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "Match the length of written documents to what the task needs: cover the substance, but do not pad with filler sections, redundant summaries, or boilerplate."
  }
}
'
注入している文の訳:

書き出す文書の長さは、そのタスクに必要な分量に合わせる。内容は押さえたうえで、埋め草の節・重複した要約・定型文で膨らませない。

settings.json への登録:
"PreToolUse": [
  {
    "matcher": "Write",
    "hooks": [
      {
        "type": "command",
        "command": "~/.claude/hooks/opus5-artifact-length.sh",
        "if": "Write(**/*.md)"
      }
    ]
  },
  {
    "matcher": "Edit",
    "hooks": [
      {
        "type": "command",
        "command": "~/.claude/hooks/opus5-artifact-length.sh",
        "if": "Edit(**/*.md)"
      }
    ]
  }
]

 .md に限定する理由
コードに適用すると危ない。注入文の do not pad with filler sections の「filler」を、コードでは冗長なエラーハンドリングや防御的コードと解釈されうる。実装の網羅性を削る方向に働くと困る。
ガイドが挙げている対象も「レポート、Markdown ドキュメント、要約」であってコードではない。
なお if はツール名を含む構文なので、Write と Edit はエントリを分ける必要がある。ここは地味にハマった。

 設定その3: 毎ターンのリマインダー
長い会話では、システムプロンプトの指示が薄れる。UserPromptSubmit で毎ターン注入する。
~/.claude/hooks/opus5-response-reminder.sh:
#!/bin/bash
set -uo pipefail

. "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/lib-opus5-guard.sh"

STDIN_JSON=$(cat) || exit 0
opus5_is_active "$STDIN_JSON" || exit 0

jq -n '
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "[Respond first] Before any tool call, answer this message in prose.\n[Questions] Ask only when the answer changes what you do next. Never phrase a report or an aside as a question.\n[Brevity] Keep it short and easy to reply to. Use bullets or a table for parallel items.\n[Turns] The user is always watching. End every turn with a report. Ending a turn is not the same as waiting: stop for input only on turns where you asked a question, and otherwise continue."
  }
}
'
注入している4項目の訳:



項目
訳




[Respond first]
ツールを呼ぶ前に、この発話への返答を本文で書く。


[Questions]
質問は、その回答で次の行動が変わる時だけにする。報告や補足を疑問形にしない。


[Brevity]
短く、打ち返しやすく書く。並ぶものは箇条書きか表にする。


[Turns]
ユーザーは常に見ているものとして扱う。各ターンを報告で終える。ターンを終えることと返答を待つことは別で、質問を書いていないターンは待たずに続ける。




 英語で書く理由
最初は日本語で書いていた。英語にしたらトークンが3分の1になった。



版
実測
概算トークン




日本語
409 文字
約 300〜400


英語
57 語
約 75〜85



日本語は 1 文字あたりほぼ 1 トークン、英語は 1 語あたり約 1.3 トークン。毎ターン注入されるものなので、この差は効く。
指示の言語と応答の言語は独立している。settings.json の language 設定がシステムプロンプトの # Language 節として注入されるため、英語で指示しても応答は日本語のままだ。

 [Questions] を入れた理由
Opus 5 は疑問形を多用する。しかもその多くが、答えても次の行動が変わらない確認だ。
「〜ということでよろしいでしょうか？」と聞かれても、こちらは「はい」としか言えない。それは報告であって質問ではない。
なので判定基準を明示した。「回答で自分の次の行動が変わるか」。変わらないなら平叙文で書け、と。

 モデル判定: 4.6 に戻したときに誤爆させない
これらの設定は Opus 5 専用だ。/model で 4.6 に戻したときに効いてしまうと、今度は逆方向におかしくなる。
問題は、hook の stdin にモデル情報が入っていないこと。公式ドキュメントに明記がある。

Only SessionStart hooks can receive a model field, and it is not guaranteed to be present. There is no $CLAUDE_MODEL environment variable.

settings.json の model は "opus" というエイリアスなのでバージョンが分からない。将来 Opus 6 が出ても同じ "opus" だ。
そこで transcript から読むことにした。hook の stdin には transcript_path が渡ってくる。
~/.claude/hooks/lib-opus5-guard.sh:
#!/bin/bash
# Opus 5 で動作しているかを判定する。
# transcript の最終 assistant 行の model を見るため、/model による切り替えにも追従する。
# 判定できない場合は不成立とする（別モデルへの誤適用を避けるため）。

opus5_is_active() {
  local input="$1" transcript model

  transcript=$(printf '%s' "$input" | jq -r '.transcript_path? // empty' 2>/dev/null) || return 1
  [ -n "$transcript" ] && [ -r "$transcript" ] || return 1

  model=$(tac "$transcript" 2>/dev/null | grep -m1 -oE '"model":"[^"]+"' | cut -d'"' -f4)

  case "$model" in
    *opus-5*) return 0 ;;
    *) return 1 ;;
  esac
}
transcript の JSONL には assistant 行ごとに "model":"claude-opus-5" が入っている。tac で末尾から読み、grep -m1 で最初の一致で打ち切る。

 性能
45MB の transcript でも 9ms だった。ファイルサイズに影響されない。



対象
実測




通常の transcript (424KB)
9 ms


巨大な transcript (45MB)
9 ms



tac が末尾から読むので、行数に関係なく一定になる。

 フォールバックを入れなかった理由
最初は「transcript から取れなければ settings.json の model を見る」というフォールバックを書いていた。だがこれを消した。
4.6 を使っているのに1度でもこの設定が適用されると、おかしなことになりかねない。判定できないなら適用しない、という方針にした。セッション冒頭の1発話目は assistant 行がないので効かないが、2発話目以降は正しく効く。

 結果
毎発話の注入量はこうなった。



項目
変更前
変更後




応答リマインダー
約 350 トークン
約 110 トークン


文書長リマインダー
40 トークン（全ファイル）
40 トークン（.md のみ）



実行時間は hook 1本あたり 9ms。モデルの応答時間に対して誤差だ。

 で、これは何をやっていたのか
冷静に振り返ると、数時間かけて Opus 5 の会話応答スタイルを 4.6 相当に近づけるという作業である。
新しい能力を引き出す設定ではない。ガイドを読み、置き場所を判別し、hook を書き、モデル判定のガードを実装し、トークン量を測って圧縮した。そして以前の応答スタイルが確実に得られるというものでもない。
さらに一度作れば終わりではない。lib-opus5-guard.sh を書いたのは、次のモデルで自動的に外れるようにするためだ。モデルが変わるたびに同じ作業が発生する前提で設計している。（投稿者本人（人間）補足：同じ5系でも、例えば噂されている Opus 5.5 が出たときには、その時に判断するしかない。）

 設定項目にできないのか
effortLevel という前例がある。思考量はパラメータで調整できるのに、応答スタイルはプロンプトで書けという非対称がある。
ガイド自身がこう書いている。

エフォートパラメータは、モデルがどれだけ発言するかではなく、どれだけ思考するかを制御します。エフォートを下げると思考量は減りますが、目に見える応答を確実に短くすることはできません。

分担が意図的なのは分かる。だが responseStyle: concise のような設定が1行あれば済む話でもある。技術的な難易度ではなく、どちらを既定にするかの選択だ。
チューニングの狙いは理解できる。長時間の自律作業で完遂率を上げるなら、スコープを広めに取って積極的に動く方向に振るのは合理的だし、ベンチマークもそれを評価する。
問題は、その既定値が対話的な用途にも一律で適用されていることだ。開発内容はもちろん開発者の好みもあろう。ただいずれにせよ用途が違えば最適な既定値も違うのに、切り替え手段はユーザー自身が開発しなければならないプロンプトである。
あれだけの分量のガイドを読ませて、置き場所を判断させて、スニペットをコピーさせている時点で、設定項目として提供できる内容だと認めているようなものではないか。

 おわりに
この記事は、上記の設定が全部効いている状態の Opus 5 に書かせた。
opus5-artifact-length.sh が .md の書き込み直前に「埋め草の節・重複した要約・定型文で膨らませない」と注入している。つまり制限をかけた状態で、制限のかけ方について書かせたわけだ。
長さについては、まあ、これで抑えられているほうだと思ってほしい。
設定なしで書かせたバージョンも作ってみたが、そちらは「はじめに」と「まとめ」と「参考リンク」が増え、各節に前置きが付き、最後に「いかがでしたでしょうか」的な段落が生えた。載せないでおく。

参考

Claude Opus 5 のプロンプティング
Claude Code Hooks



 ここからは、正真正銘、投稿者本人（人間）による補足です。

 この文章を書かせた時の指示
さすがに記事である以上、読みやすさは大事なので、以下の指示をだしています。

Zenn に載せるという前提で、読みやすさも意識すること

そして、制限をかけた側には以下の追加指示をしています

読みやすさのため、自虐的なものを含めジョークを入れても良い


 対象が Opus 4.6 の理由
主観バリバリですが、Claude の各モデルは、Opus 4.6 , Sonnet 4.5 まで、会話に対する応答に大きな変化はなかったかと感じています。なおHaikuは使わないので対象外。
その応答スタイルですが、Opus 4.7 から若干変化を見ることができ、Opus 4.8 に至っては「お前は何を言ってるのだ（AA略）」であることがしばしば。
Opus 5 は 4.8よりはまだマシだとは思いますが…
実は後述するところに、その変化の理由を見て取れるのですが、そんな理由で Opus 4.6 を基準にしました。

 この本文の評価

設定なしで書かせたバージョンも作ってみたが、




項目
差分




文字数
30%増


見出し数
60%増


コードブロック
それぞれ10箇所で変わらず



生えたものは報告通りで「はじめに」「対象読者」「動作環境」「まとめ」が付き、各節に前置きが入り、〆に「いかがでしたでしょうか？」（ここがジョークの一種みたいな一文ですが、でも事実だったんだよなぁ…）。
まあ、お前はコロナ渦前のアフィブログか。とツッコミを入れられる文書にはなりましたね。
で、さて。
コードブロックが同数というのが、この比較で一番はっきりした点だと思います。載せている設定ファイルに何も変化はない。増えたのは表の前置きと、結論の言い換えと、判断の正当化だけ。
なんというか、体裁は整っているんだけれど、ぶっちゃけあろうがなかろうが…　いや、むしろその記述要る？余計な話だよね？ っていう、多分 Claude Code で Opus 5 と対話、分析結果表示 等々で使っていると、多くの人は感じるのではないかという文章 になっているんですね。

 トークンの話と重ねると
ここで思い出してほしいのが、Sonnet 5 や Opus 4.7 で導入された新トークナイザーとやらです。同じプロンプトでもトークン消費が最大35%増。またコミュニティ報告ではありますが、技術文書で文章量が最大1.47倍増という計測が報告されています。

今回計測したのは日本語の文字数であってトークン数ではないし、比較したのは Opus 5同士なのでトークナイザーは同一です。そして「トークナイザーでトークン使用が30%増えた」ことと「文字数が30%増えた」ことに、直接の因果関係は無い、はず。
でも、この2つは重なります。トークナイザーで3割、出力量も3割。しかも増えた分が「その記述要る？」な内容で占められているとしたら…
もちろん、この新トークナイザーのおかげで正確性や性能が増している可能性も否定はできませんから、有益性について一概に論じられないのが難しいところなのですが。
AIの利用形態は様々です。ただ対話スタイルで進めていく利用形態の場合、人間に無駄を省かせるという無駄 を強いる進化は、本当に有益なものなのでしょうか？
本文中にもありますが、せめて簡易な設定項目を用意してほしいところです。

 投稿者（人間）からのアドバイス
実はたった1設定で、効く方法があります。Opus 5 の実力を試すことはできませんが、本当に仕事で困るかというと、案外そうでもないのではないかと。
環境変数に以下の1行を足すだけです。
ANTHROPIC_DEFAULT_OPUS_MODEL="claude-opus-4-6"
これからも良い Claude Codeとのお付き合いを。
