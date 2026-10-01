# Claude Opus 5.5 vs Opus 5：回答は同じ、出力 token は半分 - Qiita
- **Source URL**: https://qiita.com/Synthorai/items/ffb007c86981fcb9e39d
- **Score**: 82
- **Suggested Tags**: #Claude, #LLM, #コスト最適化
- **Processed Date**: 2026/10/1

---

## 本文
この記事は Synthorai ブログの記事 Claude Opus 5.5 vs Opus 5：回答は同じ、出力 token は半分 の転載です。原文（多言語対応）はリンク先をご覧ください。


Claude Opus 5.5 の定価は Claude Opus 5 より 20% 安い。入力 100 万 token 当たり $4、出力 100 万 token 当たり $20 で、Opus 5 はそれぞれ $5 と $25 だ。この 20% はモデルの挙動に関係なく得られる。確認すべきなのは、単価差を除いたあとにどれだけコストが下がるかだ。各モデルの default 設定で 13 件の single-shot タスクを実行したところ、Opus 5.5 の請求額は 65% 少なく、同じ単価で計算しても 56% 安かった。multi-hop tool loop では差が小さくなり、請求額では 37%、同じ単価では 22% 安かった。
TL;DR

採点した 468 回の call では、Opus 5.5 の task 当たりコストは $0.0072、Opus 5 は $0.0204 だった。どちらも全 task に正解した。
同じ単価で計算しても、Opus 5.5 は 56% 安かった。平均出力 token は 341 で、Opus 5 は 799 だった。
4 問の tool loop では、同じ単価での差が 22% まで縮まった。入力 token がコストの大半を占め、両モデルが同じ file を読むためだ。

max effort の Opus 5.5 は、この loop で自身の default の 3.3x のコストがかかったが、追加で解けた問題はなかった。

tool_choice を any または特定の tool に設定すると、現在は HTTP 400 が返る。Opus 5 はどちらも受け付ける。

Anthropic は 2026-09-22 に Opus 5.5 をリリースし、一般的な workload では Opus 5 より「実行コストが 40% 低い」と説明した。この主張のうちモデルの挙動に左右されるのは、task 当たりの token が減るという部分だけだ。そこで今回は、その部分を測定した。

Claude Opus 5.5 では何が変わったのか？
価格より大きな変更は、thinking の切り替えがなくなったことだ。adaptive thinking では、回答前にどこまで reasoning するかをモデル自身が決める。API から内容を確認できなくても、reasoning token は出力として課金される。Opus 5.5 では常にこの mode が有効で、調整できるのは effort だけだ。low から max まで 5 段階あり、thinking に使える量を request parameter で指定する。
Opus 5 では thinking: {"type": "disabled"} を指定できた。Opus 5 の測定 で請求額を Opus 4.8 と同水準まで下げられたのは、この設定だけだった。Opus 5.5 では使えない。




Opus 5
Opus 5.5




定価（入力／出力、MTok 当たり）
$5 / $25
$4 / $20


Thinking
adaptive、effort が high 以下なら無効化可能
adaptive、常に有効


Default effort
high
medium


Tool の強制使用
受け付ける
400 error（実測）


Context window／最大出力
1M / 128K
1M / 128K


Knowledge cutoff
2026 年 5 月
2026 年 6 月


リリース日
2026-07-24
2026-09-22


Tool call 間の text

text block

thinking block、default の表示設定では空


Safeguard の category
cybersecurity
cybersecurity と biology、reasoning 抽出要求の拒否



表の中でも、特に 2 点が重要だ。default effort は high から medium に 1 段階下がった。effort field を送らない request は、Opus 5 と同じ深さでは実行されない。進捗表示の変更も通知なく起きる。以前は tool call 間に短い text が出力されていたが、現在は thinking block として届く。明示的に要求しない限り text は空なので、進捗を streaming 表示する UI は error を出さずに何も表示しなくなる。

リリース時の benchmark はどうだったか？
Anthropic が公開したリリース時の表では、Opus 5.5 が coding と knowledge work の全 benchmark で Fable 5.1 を上回り、大半で GPT-6 Astra も上回った。以下は Anthropic が公開した数値で、adaptive thinking と max effort を使用している。Terminal-Bench の行だけは xhigh で実行されている。



Benchmark
Opus 5.5
Fable 5.1
Opus 5
GPT-6 Astra




Terminal-Bench 4.0（agentic coding）
66.4%
55.8%
52.3%
57.9%


FrontierCode v1.1
54.4%
50.3%
48.0%
53.3%


CursorBench 4.0
57.8%
51.8%
46.6%
未公表


GDPval-AA v2.1（knowledge work、Elo）
1846
1735
1708
1542


AutomationBench（business workflow）
40.0%
31.4%
26.9%
41.4%


Terminal-Bench-Science 0.1
58.7%
52.6%
29.0%
64.6%


OSWorld 2.0（computer use）
81.8%
80.7%
74.0%
未公表



Anthropic 自身も、この表には珍しい注意書きを付けている。この水準では「benchmark の差は、実環境での差を判断する指標として以前ほど信頼できない」とし、実際の Fable 5.1 との差は score ほど大きくないと説明している。数値を引用する前に確認すべき脚注も 2 つある。AutomationBench は Zapier が fallback model なしで実行しており、safeguard が介入するたびに失敗として数えている。また、表全体で本番用 safeguard が有効になっている。classifier が介入した場合、cybersecurity task は Opus 4.8 に、biology task は Opus 5 に渡されている。
ただし、この表から task のコストは分からない。そこで実測した。

Single-shot でも本当に安いのか？
安い。しかも、その大半は単価差ではなく実効効率によるものだ。single-shot は 1 request、1 answer、tool なしの処理を指す。200 step の反復 rule や、通行不可の cell を含む grid 上の経路数など、算術と count の問題を使った。13 件の task を各 3 回、5 段階すべての effort と default で Opus 5.5 と Opus 5 に実行させた。採点対象は合計 468 call だ。実行前に全問の正解を Python で brute-force し、各 prompt には一意の random string を付けた。これにより、モデルまでのいずれかの layer が cache 済みの重複 request に回答することを防いだ。task 当たりのコストは response の値ではなく、各 call で課金された token と Anthropic の定価から計算した。thinking も含まれる。



Effort
Opus 5.5 の出力中央値
Opus 5.5 の $/task
Opus 5 の出力中央値
Opus 5 の $/task




default
193
0.0072
448
0.0204


low
185
0.0060
439
0.0201


medium
218
0.0085
538
0.0200


high
223
0.0094
542
0.0206


xhigh
233
0.0111
525
0.0197


max
762
0.0240
532
0.0220




default では両モデルとも正答率 100% だった。ほかの level でも 97% 以上で、3 件の不正解はそれぞれ異なる task と level に分散していた。低い level に集中してはいない。この task set では正答率が急落する地点はなく、差はすべてコストに表れた。
effort ごとの変化は、2 つのモデルで異なる。Opus 5 は low から max まで $0.0197-$0.0220 で、差は 12% に収まる。Opus 5.5 は $0.0060-$0.0240 と 4x の幅がある。Opus 5.5 では effort が実際に効くが、Opus 5 ではほぼ no-op だ。移行時に同じ設定をそのままコピーすると、以前とは大きく異なる挙動になる可能性がある。
難度が最も高い 5 task では差がさらに広がった。default の Opus 5.5 は task 当たり $0.0113、Opus 5 は $0.0375 だった。出力 token の中央値は 585 対 1,145 だった。

Agent の請求が積み上がる tool loop ではどうなるか？
loop でも削減効果は残るが、倍率は小さくなる。Opus 5.5 と Opus 5 を比較するなら、tool loop が実態に近い。1 turn は 1 request だ。モデルが tool を要求し、code が実行し、会話履歴全体をモデルへ送り直す。5 turn の会話なら、増え続ける履歴に 5 回分の料金がかかる。請求額を左右するのは token 単価ではなく turn 数だ。小規模な synthetic service を用意し、両モデルに 3 つの tool を与えた。file 一覧、file 読み込み、検索だ。問題は 4 問で、回答には 3 または 4 file にまたがる call chain を追う必要がある。同じ surface、tool、prompt を使い、各条件を 12 回ずつ実行した。



条件
正解
Turn 中央値
Tool call 中央値
出力 token 中央値
$/run




Opus 5.5、default
12/12
4
5
427
0.0326


Opus 5.5、low

12/12
4.5
5
430
0.0330


Opus 5.5、max

12/12
5
12
3,124
0.1087


Opus 5、default
11/12
5
7
666
0.0519




default 同士では、Opus 5.5 の run 当たりコストが Opus 5 より 37% 少なかった。turn は 12%、出力 token は 30% 少ない。Opus 5 は 1 run 失敗したため、正解 1 問当たりでは差が 43% に広がる。vendor が示した「実行コストが 40% 低い」という数値に近く、実際の請求書にもこの差が出る。
一方で、この workload では単価差の寄与が大きい。理由は明確だ。loop は turn ごとに履歴を再送し、両モデルは同じ file を読む。出力 token は 30% 減っても、総 token は 19% しか減らなかった。最もコストがかかる workload ほど、出力を短くする効果は小さい。次の section で、この差を数値に分ける。
loop で Opus 5.5 を low に下げてもコストは減らなかった。平均で 1 turn 多く要求し、再送する履歴の追加分が token 削減を打ち消した。single-shot では素直に効いた effort の調整も、loop では効果がなくなる。請求額を決めるのは reasoning の深さではなく turn 数だからだ。

削減額のうち、単価引き下げによる分はどれくらいか？
workload の形によって、7 分の 1 から 5 分の 2 まで変わる。下表の中央列は、実測した Opus 5.5 の token を Opus 5 の単価で再計算している。Opus 5 と同じ単価に固定したとき、Opus 5.5 が出力を減らすことでどれだけ節約できるかを示す。



Workload
請求額の差
同じ単価での差
出力 token




13 件の single-shot task、default
-65%
-56%
-57%


そのうち難度が最も高い 5 件
-70%
-62%
-63%


Multi-hop tool loop、default
-37%
-22%
-30%



single-shot の差は実効効率によるものだ。削減額のうち単価引き下げによる分は 14% だけで、残りはモデルの出力が短くなったことで生じている。運用計画では tool loop の行を重視すべきだ。agent traffic の多くがこの形になり、見かけ上の削減額のうち 41% は単価引き下げによる。

Effort を上げる価値はあるか？
今回の workload では価値がなく、コスト増も大きかった。Opus 5.5 の max は tool loop で run 当たり $0.1087 かかり、自身の default の 3.3x だった。解けた問題は同じ 12 問だ。追加の budget は tool call に使われた。中央値は default の 5 に対して 12、出力 token は 427 に対して 3,124 だった。single-shot task では、max だけが Opus 5 より高く、$0.0240 対 $0.0220 だった。
この budget は reasoning に使われる。単一回答の task では、Opus 5.5 の出力 token のうち thinking が占める割合は default で 98.4%、max で 99.6% だった。すべて出力単価で課金されるが、default の表示設定では内容を確認できない。Anthropic も max は frontier 問題に限定するよう案内している。実測結果は明確だ。すでに解ける task では、effort を上げるほどコストだけが増える。

Model ID を変更すると何が壊れるか？
Opus 5 で動く 2 種類の request が、Opus 5.5 では 400 を返す。どちらも既存 code で使われている可能性が高い。
tool の強制使用は拒否される。chat model から構造化 JSON を取得するために特定の tool call を固定している client では、次の error が返る。
tool_choice: type "tool" and "any" are not supported for this model.

同じ error は OpenAI-compatible client 経由でも発生する。こちらでは同じ request を tool_choice: "required" または特定の function として指定する。auto と none は引き続き使える。移行時は、どの条件で tool を使うかを prompt に明記し、schema-valid な JSON が必要なら strict tool schema または structured output を使う。
thinking も無効化できない。thinking: {"type": "disabled"} と手動の budget_tokens はどちらも失敗する。OpenAI-compatible surface でも、相当する reasoning_effort: "none" は拒否される。代わりに effort parameter を使う。
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=4096,
    messages=[{"role": "user", "content": "Summarize this incident report in five bullets."}],
    output_config={"effort": "low"},   # low | medium | high | xhigh | max; medium is the default
)

# Thinking is billed as output whether or not you can read it.
print(response.usage.input_tokens, response.usage.output_tokens)

low は以前の thinking 無効化に最も近い。今回の single-shot set では最安で、正答率も維持した。ただし thinking がなくなるわけではない。モデルは引き続き thinking を実行し、その token は出力として課金される。

Prompt の token budget はそのまま使えるか？
token budget はそのまま引き継げる。同じ 4 種類の入力を両モデルで数えると、英語の文章は 1,277 対 1,275 token、Python は 583 対 581、JSON の tool argument blob は 482 対 480、中国語の文章は 500 対 498 だった。常に生じる 2 token の差は request framing によるもので、text によるものではない。Opus 5 向けに調整した context budget や chunking threshold を Opus 5.5 で再測定する必要はない。

いつ切り替えるべきか？
コストを重視するなら、上記 2 種類の request を修正し次第 Opus 5.5 に移行してよい。単価引き下げの効果を除いても、同じ正答率で single-shot は 56%、tool loop は 22% 安い。無視できる差ではない。多くの deployment が実際に経験するのも、default 同士の比較だ。
effort は引き継ぐのではなく、再調整する。default は high から medium に変わり、調整幅は Opus 5 の 4 倍になった。最適な level は workload の形で変わる。single-shot task では low が最安で正答率も維持したが、tool loop では default が low と max の両方を上回った。

FAQ
Claude Opus 5.5 は本当に Opus 5 より 40% 安いのか？
請求額では近い。今回の tool loop では Opus 5.5 の run 当たりコストが Opus 5 より 37% 少なく、single-shot task では 65% 少なかった。このうち 20 percentage point は、モデルの挙動に関係なく得られる単価差だ。単価差を除いた効率改善は、loop で 22%、single-shot task で 56% だった。
Opus 5.5 でも thinking を無効化できるか？
できない。thinking: {"type": "disabled"} と手動の token budget は、Opus 5.5 ではどちらも 400 を返す。代わりに output_config.effort を使う。最安の設定は low だ。どの level でも thinking token は出力として課金される。
Tool の強制使用は何に置き換えればよいか？
tool_choice: {"type": "auto"} を維持し、tool を使う条件を prompt に明記する。schema-valid な JSON が必要なら、strict tool schema または structured output を使う。Opus 5.5 は any と特定 tool の指定を暗黙に downgrade せず、400 で拒否する。誤った回答ではなく、request の失敗として表面化する。
Prompt size を再測定する必要はあるか？
ない。同じ text なら、文章、code、JSON、中国語のすべてで Opus 5 と Opus 5.5 の課金 token 数は同じだった。context budget は変更せずに引き継げる。
Opus 5.5 は Fable 5.1 の代わりになるか？
Anthropic 自身の benchmark 表では、Opus 5.5 は掲載されたすべての benchmark で Fable 5.1 を上回り、token 単価はその 40% だ。一方で Anthropic は、Fable 5.1 を高難度の reasoning と long-horizon agentic work 向けに位置付けたままで、実環境での差は score ほど大きくないとも説明している。表だけで判断せず、自分たちの eval を再実行するのが確実だ。
関連する測定結果：Claude Opus 5 と Opus 4.8 の比較、GPT-6 Astra の effort 別測定、vendor 別の thinking 制御。
測定日はリリース翌日の 2026-09-23。Claude API と OpenAI-compatible surface への gateway を経由した。採点対象の single-shot call は 468 回で、内訳は local で brute-force した正解付きの 13 task、各 3 回、6 種類の effort 設定、2 model。tool loop は 48 run で、内訳は 4 件の multi-hop 問題、各 3 回、4 条件。prompt には salt を付与し、各モデルは effort parameter を渡せる surface から実行した。コストは response の値ではなく、Anthropic の定価から計算した。
