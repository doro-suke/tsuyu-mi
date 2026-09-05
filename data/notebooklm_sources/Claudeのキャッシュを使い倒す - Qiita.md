# Claudeのキャッシュを使い倒す - Qiita
- **Source URL**: https://qiita.com/cvusk/items/7f149b4ef5e1e71dd039
- **Score**: 92
- **Suggested Tags**: #Claude, #プロンプトキャッシュ, #LLM
- **Processed Date**: 2026/9/5

---

## 本文
Claudeのキャッシュを使い倒す
Claude APIの請求額を眺めると、その大半が「毎回同じ内容を送り直している入力トークン」であることに気づきます。長いシステムプロンプト、ツール定義、参照ドキュメント、積み上がる会話履歴——これらはリクエストのたびにフルプライスで再処理されています。
プロンプトキャッシュ(prompt caching)は、この重複部分の計算結果を再利用する仕組みです。うまく使えば入力コストは最大約90%削減、レイテンシ(特にTTFT: 最初のトークンが返るまでの時間)も大きく改善し、さらにキャッシュヒットはレート制限に計上されないため実効スループットまで伸びます。一方で、仕組みを誤解したまま使うと「書き込み課金だけ払い続けてヒットはゼロ」という最悪のパターンに陥ります。
この記事では、公式ドキュメントの仕様を土台に、仕組みの正確な理解 → 損益の算数 → 設計プラクティス → TTL戦略 → ユースケース別レシピ → 運用 → 応用テクニック → 落とし穴の順で、プロンプトキャッシュを「使い倒す」ための知識を整理します。サンプルコードはPython(公式 anthropic SDK)です。

注意: 本記事の料金・最小トークン数・モデル名・仕様は2026年8月時点のものです。変わりやすい値なので、実装前に必ず公式ドキュメントで最新情報を確認してください。



第1章 仕組みを正しく理解する

1.1 本質は「プレフィックスの再利用」
プロンプトキャッシュの実体は、プロンプトのプレフィックス(先頭からの連続部分)に対するモデル内部のKV計算結果の再利用です。ここで重要なのは、キャッシュ対象が常に「先頭から cache_control を付けたブロックまでの全体」だという点です。
プロンプトは tools → system → messages の順で1本のプレフィックスを構成します。「このブロックだけキャッシュされる」という理解は誤りで、ブレークポイントより前のすべて(ツール定義を含む)が対象になります。逆に言えば、上流を1バイトでも変えると下流のキャッシュもすべて無効になります。

1.2 有効化は2方式
有効化の方法は2つあります。
① 自動キャッシュ: リクエストのトップレベルに cache_control を1つ置くだけです。システムが「最後のキャッシュ可能ブロック」にブレークポイントを自動配置し、会話が伸びるたびに前進させてくれます。マルチターン会話の第一選択です。
② 明示的ブレークポイント: 個々のコンテンツブロックに cache_control を直接置きます。変更頻度の異なるセクションを分けてキャッシュしたい場合や、細かい制御が必要な場合に使います。
まずは最小構成のコードです。usage の読み方が全体の基礎になるので、表示ヘルパーもここで定義しておきます。
import anthropic

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY を環境変数で設定

def print_usage(label, usage):
    """usage の読み方(超重要):
    - input_tokens                = 最後のブレークポイント「以降」の非キャッシュ入力のみ
    - cache_creation_input_tokens = 今回キャッシュに書き込んだトークン(write)
    - cache_read_input_tokens     = キャッシュから読んだトークン(read)
    - 総入力 = read + write + input_tokens
    """
    write = usage.cache_creation_input_tokens or 0
    read = usage.cache_read_input_tokens or 0
    fresh = usage.input_tokens
    total = write + read + fresh
    print(f"[{label}] write={write:,} read={read:,} fresh={fresh:,} "
          f"hit={read / total:.1%}")

# --- ② 明示的ブレークポイント ---
resp = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,
    system=[{
        "type": "text",
        "text": LONG_INSTRUCTIONS,  # 静的な指示・ナレッジ(後述の最小トークン数以上)
        "cache_control": {"type": "ephemeral"},  # ← ここ「まで」がキャッシュ対象
    }],
    messages=[{"role": "user", "content": "返品ポリシーを教えてください"}],
)
print_usage("1回目", resp.usage)  # write が立つ。同じ構成の2回目で read が立つ

# --- ① 自動キャッシュ(トップレベルに1つ置くだけ) ---
resp = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,
    cache_control={"type": "ephemeral"},  # ブレークポイントは自動で末尾に置かれ、前進する
    system=LONG_INSTRUCTIONS,
    messages=history + [{"role": "user", "content": user_text}],
)

なお自動キャッシュにはいくつかのエッジケースがあります。最後のブロックに同一TTLの明示 cache_control があればno-op、異なるTTLなら400エラー、明示ブレークポイントがすでに4つあれば400、最後のブロックが対象外なら黙って後方の適格ブロックまで遡ります。また旧Bedrock統合(Opus 4.6以前)ではトップレベル指定が使えないため明示方式を使います。

1.3 書き込みは「点」、読み込みは「線」——20ブロックのlookback
ここが最も誤解されやすい機構です。3つの原則で整理できます。


書き込みはブレークポイント位置でのみ発生します。 そのブロックまでのプレフィックス全体の累積ハッシュが、1つのエントリとして書かれます。手前の位置にエントリが自動生成されることはありません。

読み込みは後方に遡って「過去の書き込み」を探します。 ブレークポイント位置のハッシュが一致しなければ、1ブロックずつ後方に遡り、以前のリクエストが書いたエントリを探します。

遡れるのは最大20ブロックです。 ブレークポイント自身を1つ目として20位置まで確認し、見つからなければそこで打ち切りです(次の明示ブレークポイントがあればそこから再開)。

この仕組みのおかげで、会話が伸びていく場合は「毎リクエスト、最後のブロックにブレークポイントを置く」だけで増分キャッシュが成立します。前ターンの書き込み位置がlookback窓の中にあるからです。逆に、1ターンで20ブロック以上増えるような重いエージェントでは窓を外れてヒットを逃すため、中間ブレークポイントをあらかじめ置いておく必要があります(第3章)。


書き込みはブレークポイントという「点」だけに発生し、読み込みはそこから後方最大20ブロックの「線」を遡って過去のエントリを探す——この非対称性が、増分キャッシュの成立条件そのものです。

1.4 TTLの正確な理解——起点は「リクエスト開始」
デフォルトのTTLは5分で、キャッシュが使われるたびに追加費用なしでリフレッシュされます。つまりトラフィックが5分以内の間隔で流れ続ける限り、キャッシュは無料で生き続けます。追加料金(2倍)を払えば1時間TTLも選べます(第4章)。
見落とされがちな罠が、TTLの起点です。寿命は「レスポンス終了時」ではなく「そのエントリを読み書きしたリクエストの開始時点」から計測されます。応答のストリーミングに4分かかった場合、同じプレフィックスを使う次のリクエストは応答完了から約1分以内に開始しないと失効します。長時間の生成を行うエージェントでは要注意です。

1.5 スコープと安全性


分離: キャッシュはClaude API・Claude Platform on AWS・Microsoft Foundryではワークスペース単位、BedrockとGoogle Cloudでは組織単位で分離されます。組織を跨いだ共有は一切ありません。

完全一致: ヒットにはテキスト・画像を含め100%のバイト一致が必要です。

出力への影響なし: キャッシュの有無でレスポンス内容は変わりません。品質面のトレードオフはゼロです。

データ保持: ZDR(Zero Data Retention)適格です。プロンプトの生テキストは保存されず、KVキャッシュ表現と暗号学的ハッシュはメモリ上のみに保持され、TTL経過後は速やかに削除されます。



第2章 料金と損益分岐——「いつ得か」を数式で持つ

2.1 掛け率と価格表
課金は3種類の掛け率で決まります。5分キャッシュ書き込みは基本入力の1.25倍、1時間書き込みは2倍、読み取りは0.1倍です。これらはBatch API割引などの他の価格修飾子と重ねがけできます。
主要モデルの実額($/MTok、2026年8月時点)は次のとおりです。



モデル
基本入力
5分書込(×1.25)
1h書込(×2)
読取(×0.1)




Claude Fable 5
$10
$12.50
$20
$1.00


Claude Opus 5 / Opus 4.8
$5
$6.25
$10
$0.50


Claude Sonnet 5
$2
$2.50
$4
$0.20


Claude Sonnet 4.6
$3
$3.75
$6
$0.30


Claude Haiku 4.5
$1
$1.25
$2
$0.10




2.2 損益分岐は「5分=2回目、1時間=3回目」
プレフィックスの非キャッシュ処理コストを P、TTL内での利用回数を N とすると、キャッシュありの総コストは「1回のwrite + (N−1)回のread」です。
def cached_cost(n, write_mult, read_mult=0.1):
    return write_mult + read_mult * (n - 1)  # 単位は P 倍

# 5分:   1.25 + 0.1(n-1) < n  →  n=2 で回収(2回目時点で 1.35P < 2.00P、約32%安)
# 1時間: 2.00 + 0.1(n-1) < n  →  n=3 で回収(2回目は 2.1P > 2.0P でわずかに損)

N が大きくなるほど1回あたりコストは 0.1P に漸近し、削減率は90%に近づきます。「2回以上使うプレフィックスは原則キャッシュする」が結論です。
具体例として、Sonnet 4.6で10万トークンの固定プレフィックス(システム+文書)を1日1,000回、常にTTL内で使う場合を計算すると、非キャッシュで約$300/日、キャッシュありで約$30/日となり、約90%の削減です。

2.3 最小キャッシュ長という「見えない床」
各モデルには最小キャッシュ可能トークン数があり、これ未満のプレフィックスは cache_control を付けてもエラーなしで黙って無視されます。



最小トークン数
モデル




512
Opus 5 / Fable 5 / Mythos 5


1,024
Opus 4.8 / Sonnet 5 / Sonnet 4.6 / Sonnet 4.5


2,048
Mythos Preview / Opus 4.7 / Haiku 3.5


4,096
Opus 4.6 / Opus 4.5 / Haiku 4.5



Haiku 4.5の4,096は意外に高いハードルで、短めのシステムプロンプトは丸ごと素通りします。キャッシュされたかどうかは usage で検証できます(cache_creation_input_tokens と cache_read_input_tokens が両方0なら未キャッシュです)。
公式ドキュメント自身が「閾値にわずかに届かない場合は、キャッシュ対象を拡張して閾値に到達させる方が割に合うことが多い」と明言しています。パディングするなら無意味な文字列ではなく、few-shot例の追加が一石二鳥です。実測には count_tokens が使えます。
n = client.messages.count_tokens(
    model=MODEL,
    system=system_text,
    messages=[{"role": "user", "content": "x"}],  # 測定用ダミー
).input_tokens

if n < MIN_CACHEABLE[MODEL]:
    print("このままでは黙ってキャッシュされません。few-shot例の追加など"
          "『意味のある内容』で閾値まで拡張する価値があります")



第3章 設計の基本プラクティス

3.1 静的→動的の一方向レイアウト
大原則は「変わらないものを前に、変わるものを後ろに」です。ツール定義・システム指示・固定ナレッジ・few-shot例を先頭に置き、タイムスタンプ・ユーザー固有情報・検索結果・今回の質問は末尾に置きます。上流の変更は下流をすべて無効化するため、可変要素が1つ前方に紛れ込むだけで全体が毎回キャッシュミスになります。

3.2 ブレークポイントは「リクエスト間で不変な最後のブロック」へ
公式ドキュメントが挙げる典型的な失敗例がこれです。
now = datetime.datetime.now().isoformat()  # ← 毎回変わる毒

# NG: 可変ブロック(時刻入り)にブレークポイントを置く
#     プレフィックスのハッシュが毎回変わるため、毎回 write だけ発生して
#     read は一生ゼロ。lookback は「過去に書かれたエントリ」しか探さない
#     (手前の安定コンテンツを勝手にキャッシュしてはくれない)
messages=[{"role": "user", "content": [
    {"type": "text", "text": BIG_DOC},
    {"type": "text", "text": f"現在時刻: {now}\n質問: {q}",
     "cache_control": {"type": "ephemeral"}},        # ← NG位置
]}]

# OK: 安定部分(文書)の末尾に置き、可変要素はその後ろへ
messages=[{"role": "user", "content": [
    {"type": "text", "text": BIG_DOC,
     "cache_control": {"type": "ephemeral"}},        # ← 安定部分の末尾
    {"type": "text", "text": f"現在時刻: {now}\n質問: {q}"},
]}]

NGパターンは何回実行しても read=0 のまま、書き込み課金(1.25倍)だけを払い続けます。自動キャッシュも「最後のブロックが毎回変わる」構造では同じ罠にはまるため、その場合は明示ブレークポイントを使ってください。

3.3 会話ボットの基本形は「自動キャッシュ+明示system」の併用
自動キャッシュに会話履歴の追従を任せ、systemには明示ブレークポイントを置く構成が基本形です(自動キャッシュは4枠あるブレークポイントの1つを消費します)。
SYSTEM_BLOCKS = [{
    "type": "text",
    "text": "あなたはKabochaストアのサポートAIです。\n" + KNOWLEDGE_BASE,
    "cache_control": {"type": "ephemeral"},   # system はリリース単位でしか変わらない
}]

messages = []
for user_text in incoming_turns:
    messages.append({"role": "user", "content": user_text})
    resp = client.messages.create(
        model=MODEL,
        max_tokens=256,
        cache_control={"type": "ephemeral"},  # 自動: 会話履歴の末尾を追従
        system=SYSTEM_BLOCKS,
        messages=messages,
    )
    print_usage("turn", resp.usage)
    # 期待値: turn1 = 全部 write / turn2 以降 = 前ターンまでが read、新規分のみ write
    messages.append({"role": "assistant", "content": resp.content})


3.4 最大4つのブレークポイントで「変更頻度レイヤリング」
ブレークポイントは1リクエストに最大4つ置け、それ自体に追加コストはありません(課金は実際のwrite/read/非キャッシュ入力のみ)。変更頻度の異なる層で分けるのが定石です。
# L1: tools(ほぼ不変)        → tools 配列の「最後のツール」に置く
# L2: system + 固定ナレッジ    → リリース単位で変わる
# L3: セッション固有の文書     → セッション単位で変わる
# L4: 会話の最新ブロック       → ターンごとに前進させる(または自動キャッシュに任せる)
tools=[..., {**last_tool, "cache_control": {"type": "ephemeral"}}]           # L1
system=[{"type": "text", "text": INSTRUCTIONS + KB,
         "cache_control": {"type": "ephemeral"}}]                            # L2
messages=[
    {"role": "user", "content": [{"type": "text", "text": SESSION_DOC,
        "cache_control": {"type": "ephemeral"}}]},                           # L3
    *history,
    {"role": "user", "content": [{"type": "text", "text": user_text,
        "cache_control": {"type": "ephemeral"}}]},                           # L4
]

注意点として、各ブレークポイント時点の累積プレフィックスが最小キャッシュ長未満の場合、その点は黙ってスキップされます(害はありません)。また、1ターンで20ブロック以上増える会話では末尾のlookback窓が前回の書き込み位置に届かなくなるため、中間ブレークポイント(L3のような位置)が保険として効きます。


上から下がそのままプレフィックス上の並び順(前→後)です。変更頻度が低い層ほど前に置くことで、上位層の再利用率を最大化します。

3.5 バイト単位の決定論を守る
ヒット条件は100%のバイト一致です。つまり、空白の揺れ・JSONのキー順・改行コード・ロケール依存の整形がすべて敵になります。公式のトラブルシューティングにも「SwiftやGoなど一部言語はJSON変換時にキー順をランダム化するため、tool_use ブロックのキー順が安定しているか確認せよ」という注意があります。
動的データを埋め込むときはcanonical JSON(キーソート+固定セパレータ)で直列化し、静的プレフィックスは定数として凍結します。
import json

def canonical_json(obj):
    """同じデータなら必ず同じバイト列になる直列化"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":"))

日時を入れたい場合は、粒度を落とし(例: 日単位)、かつブレークポイントの後ろに置きます。

3.6 無効化マトリクスを頭に入れる
キャッシュは tools → system → messages の階層構造で、上位の変更は下位もすべて無効化します。主な変更と影響範囲は次のとおりです。



変更内容
tools
system
messages




ツール定義の変更(名前・説明・スキーマ・並び順)
✘
✘
✘


web検索・引用(citations)・speed設定のトグル
✓
✘
✘



tool_choice / 画像の有無 / disable_parallel_tool_use の変更
✓
✓
✘


thinking設定・output_config.effort の変更
モデル依存
モデル依存
✘



thinking設定(モードや budget_tokens)と effort はプロンプトにレンダリングされるため、変更すると常にmessagesキャッシュが無効化され、設定を前方にレンダリングするモデルではtools/systemも無効化されます。なお effort をモデルのデフォルト値に明示するのは省略と等価で、無効化は起きません。リクエストごとにこれらのパラメータを揺らすことが、気づきにくいヒット率低下の定番原因です。


第4章 TTL戦略——5分・1時間・プレウォーム

4.1 使い分けの原則
判断基準はシンプルです。


呼び出し間隔が5分以内 → 5分キャッシュ。利用のたびに無料でリフレッシュされるため、これが最安です。

間隔が5分超〜1時間以内 → 1時間キャッシュ。5分超かかるサイドエージェント、ユーザーがすぐ返信しない可能性の高いチャットの保存などが典型です。

それ以上の間隔 → 都度の損益計算(第2章のN=2/N=3ルール)で判断します。

もう1つ、1時間キャッシュの公式な推奨理由に「レート制限の利用効率」があります。キャッシュヒットはレート制限から控除されないため、キャッシュ率を上げること自体が実効スループットの引き上げになります。コスト削減だけでなく、同じレート制限枠で捌けるリクエスト数が変わる、という視点です。

4.2 keep-alive vs 1時間書き込みの算数
「5分キャッシュを空リクエストのピンで延命し続ける」戦略と「最初から1時間で書く」戦略はコスト比較できます。ピン間隔を失効マージン込みの4.5分とすると:
アイドル 10分: 5m+ピン=1.55P / 1h=2.00P → 5m+ピンの勝ち
アイドル 30分: 5m+ピン=1.95P / 1h=2.00P → ほぼ互角
アイドル 45分: 5m+ピン=2.25P / 1h=2.00P → 1hの勝ち
アイドル 60分: 5m+ピン=2.65P / 1h=2.00P → 1hの勝ち

短いアイドルは5m+ピン、長いアイドルは1hが有利です。そして実トラフィックが5分以内に来続けるなら、ピンすら不要で無料リフレッシュの5mが最安です。

4.3 混在TTL——1時間を5分より「前」に置く
1つのリクエストで両TTLを併用できますが、長いTTLのブロックは短いTTLのブロックより前に置くという制約があります。「安定コーパスは1h、会話の尻尾は5m」という王道構成は、この制約と自然に整合します。
resp = client.messages.create(
    model=MODEL, max_tokens=128,
    system=[{
        "type": "text",
        "text": "固定ナレッジ:\n" + CORPUS,
        "cache_control": {"type": "ephemeral", "ttl": "1h"},   # 1hが先
    }],
    messages=[{"role": "user", "content": [
        {"type": "text", "text": session_note,
         "cache_control": {"type": "ephemeral"}},               # 5m(デフォルト)は後
        {"type": "text", "text": question},
    ]}],
)
# usage.cache_creation の内訳(ephemeral_5m / ephemeral_1h)でTTL別の書込量を確認できる

課金はプロンプト内の3つの位置——A(最大ヒット位置)、B(Aより後の最大1hブレークポイント)、C(最後のブレークポイント)——で決まり、Aまでがread、B−Aが1h write、C−Bが5m writeとして計上されます。



4.4 プレウォーム: max_tokens: 0 でキャッシュだけ書く
max_tokens: 0 を指定すると、APIはプロンプトを読み込んでブレークポイントでキャッシュを書き、出力を一切生成せずに即座に返ります(contentは空、stop_reason は "max_tokens"、出力課金ゼロ)。初回ユーザーのキャッシュミス由来のTTFTペナルティを消せる、公式のプレウォーム手段です。
resp = client.messages.create(
    model=MODEL,
    max_tokens=0,                    # 出力ゼロ・出力課金ゼロでキャッシュだけ書く
    system=SYSTEM_BLOCKS,            # ブレークポイントは「共有プレフィックスの末尾」へ
    messages=[{"role": "user", "content": "warmup"}],  # 空白以外なら何でも可
)
assert resp.stop_reason == "max_tokens" and resp.content == []
print_usage("prewarm", resp.usage)   # 未キャッシュなら write が立つ

運用上の注意が3つあります。


ブレークポイントの位置: プレースホルダのuserメッセージではなく、後続リクエストと共有する最後のブロック(典型的にはsystemやツール定義)に置きます。自動キャッシュは末尾(=プレースホルダ)に置いてしまうため、プレウォームでは明示方式を使います。

設定を本番と揃える: thinking設定と output_config.effort はプロンプトにレンダリングされるため、これらが違うウォームアップは「本番が絶対にヒットしないエントリ」を書いてしまいます。

併用制約: stream: true・extended thinking・structured outputs・tool_choice のtool/any指定とは併用できず、Batchリクエスト内でも使えません。従来の max_tokens: 1 ワークアラウンドの正式な置き換えです。

アプリ起動時とデプロイ直後に発火し、5分キャッシュなら約4.5分間隔で再ウォーム(間隔が長いなら1hに切り替え)というのが定番パターンです。

4.5 並列ファンアウト前の「プライミング」
キャッシュエントリは「最初のレスポンスが開始した後」に有効化されます。同一文書への並列多観点分析などで最初から一斉射撃すると、全リクエストがキャッシュ未作成のままwriteに走る「スタンピード」が起きます。先に1本(プレウォームで十分)を通してから並列化します。
import asyncio, anthropic

aclient = anthropic.AsyncAnthropic()

async def fanout(questions):
    # 先にウォームを完了させる(エントリはレスポンス開始後に有効化されるため)
    await aclient.messages.create(
        model=MODEL, max_tokens=0, system=SYSTEM_BLOCKS,
        messages=[{"role": "user", "content": "warmup"}],
    )
    async def ask(q):
        return await aclient.messages.create(
            model=MODEL, max_tokens=128, system=SYSTEM_BLOCKS,
            messages=[{"role": "user", "content": q}],
        )
    return await asyncio.gather(*(ask(q) for q in questions))
    # → 全リクエストが read になる(先に一斉射撃すると全員が write するのと対照的)



第5章 ユースケース別レシピ

5.1 エージェントループ——最大の金脈
ツール呼び出しごとにAPIを叩き直すエージェントは、成長し続けるプレフィックスの再処理コストが支配的です。ここにキャッシュを効かせると効果が最も劇的に出ます。
明示方式では「静的なブレークポイント(tools・system)+最新の tool_result へ転がすブレークポイント」の構成にします。転がす際に古いマーカーを外し、常に4個以内に収めるのがポイントです(1イテレーションで増えるのは2〜3ブロックなので、lookbackの20ブロック窓内で前回位置のエントリに必ずヒットします)。
TOOLS = [
    {...},  # get_weather など
    {..., "cache_control": {"type": "ephemeral"}},  # 最後のツールに置く=tools全体をキャッシュ
]
SYSTEM = [{"type": "text", "text": AGENT_KNOWLEDGE,
           "cache_control": {"type": "ephemeral"}}]

messages = [{"role": "user", "content": question}]
rolling = None
while True:
    resp = client.messages.create(model=MODEL, max_tokens=512,
                                  tools=TOOLS, system=SYSTEM, messages=messages)
    print_usage(f"iter({resp.stop_reason})", resp.usage)
    if resp.stop_reason != "tool_use":
        break
    messages.append({"role": "assistant", "content": resp.content})
    results = [{
        "type": "tool_result",
        "tool_use_id": b.id,
        "content": run_tool(b.name, b.input),   # 埋め込むJSONも sort_keys で安定化
    } for b in resp.content if b.type == "tool_use"]
    if rolling:
        rolling.pop("cache_control", None)       # 古いマーカーは外して4個以内に
    results[-1]["cache_control"] = {"type": "ephemeral"}  # 最新結果へ転がす
    rolling = results[-1]
    messages.append({"role": "user", "content": results})

期待される挙動は「iter1はほぼ全てwrite、iter2以降は直前までがreadになり、追加分だけがwrite」です。なお、トップレベルの自動キャッシュを付ければこの転がしロジックは丸ごと不要になります。明示版が必要なのは、4枠の配分を自分で設計したい場合やlookback対策が要る場合です。


マーカーは常に最新の tool_result へ転がり、古いマーカーは外されます。累積プレフィックスがそのままread対象として積み上がっていくのが見どころです。
エージェント関連で知っておくべき仕様が2つあります。
① サーバーツールの自動5分ブレークポイント: キャッシュが有効なリクエストでweb検索・webフェッチ・コード実行などのサーバーツールが動くと、APIがエージェントループの次イテレーション前にツール結果へ自動的に5分TTLのブレークポイントを打ちます。自分が1hしか指定していなくても usage.cache_creation.ephemeral_5m_input_tokens に書き込みが現れますが、これは異常ではなく仕様です(キャッシュなしのリクエストには適用されません)。
② defer_loading はキャッシュを壊さない: ツールが何百個あっても、defer_loading: true のツールはシステムプロンプトのプレフィックスに含まれず、ツール検索で発見されると tool_reference ブロックとして会話内に追記されます。プレフィックスが不変のままなのでキャッシュは維持されます。ただしdeferredツールに cache_control は付けられない(400エラー)ため、ブレークポイントは非deferredツールに置きます。
tools = [
    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
    {"name": "get_weather", ...,
     "cache_control": {"type": "ephemeral"}},          # 非deferredツールに置く
    *[{**tool_def(i), "defer_loading": True}           # 100個増やしてもプレフィックス不変
      for i in range(100)],
]


5.2 文書・コードベースQA——「本と話す」
書籍・論文・コードベース・トランスクリプトの全文をプロンプトに載せ、1時間キャッシュで固定し、質問だけを末尾で差し替えるパターンです。長大プロンプトのTTFTはキャッシュヒットで大きく改善します。
追い風として、Claude 4.6以降とMythos Previewでは1Mトークンのコンテキストウィンドウが標準価格で使え、キャッシュとバッチの割引もウィンドウ全域に標準レートで適用されます。「巨大コンテキスト×キャッシュ」で、小規模な固定コーパスなら従来のRAG構成を丸ごと置き換える選択肢が現実的になりました。

5.3 RAG——検索チャンクはブレークポイントの「後ろ」へ
検索結果が毎回変わる本来のRAGでは、キャッシュ対象を「指示+few-shot」までに留め、チャンクはその後ろに置きます。
system=[{
    "type": "text",
    "text": "検索結果のみを根拠に回答し、根拠のチャンク番号を引用すること。\n"
            + MANY_SHOT_EXAMPLES,               # 指示+例示は不変 → ここまでキャッシュ
    "cache_control": {"type": "ephemeral"},
}],
messages=[{"role": "user", "content":
    [{"type": "text", "text": f"[chunk {i}] {c}"}   # 可変チャンクは非キャッシュ側
     for i, c in enumerate(chunks, 1)]
    + [{"type": "text", "text": f"質問: {question}"}],
}]


5.4 many-shot——キャッシュは品質への投資も解禁する
公式ドキュメントは「例を1〜2個ではなく、キャッシュがあるなら20個以上の高品質で多様な例を含めるとさらに性能が上がる」と推奨しています。キャッシュはコスト削減ツールであると同時に、「重いプロンプトを気兼ねなく使えるようにする」品質投資の解禁ツールでもあります。この再フレーミングが、本記事のタイトル『使い倒す』の核心です。

5.5 Batch APIとの重ねがけ——読取は実質0.05倍
Message Batches API(全トークン50%引き)とキャッシュ割引はスタックします。読取は基本価格の0.1×0.5=0.05倍まで落ちます。ただしバッチは非同期・並行処理のため、ヒットはベストエフォート(トラフィックパターンにより目安30〜98%)です。ヒット率を上げる公式の推奨は次の3点です。

全リクエストに同一の cache_control ブロックを含める(バイト一致が条件なので、共有部分は定数として凍結する)
処理が5分を超えうるバッチでは ttl: "1h" を使う
共有コンテンツ(system・文書)を最大化する

応用として、投入前にライブのプレウォームで同一プレフィックスを温めておくと、バッチ序盤のヒット率を底上げできます(max_tokens: 0 はバッチ「内」では使えませんが、バッチ「前」のライブ呼び出しは問題ありません)。
SHARED_SYSTEM = [{
    "type": "text",
    "text": "次の文書だけを根拠に答えること。\n" + SHARED_DOC,
    "cache_control": {"type": "ephemeral", "ttl": "1h"},   # バッチは1h推奨
}]

# (1) 投入前にライブでプレウォーム
client.messages.create(model=MODEL, max_tokens=0, system=SHARED_SYSTEM,
                       messages=[{"role": "user", "content": "warmup"}])

# (2) 同一 system + 同一 cache_control を全リクエストに含めてバッチ作成
batch = client.messages.batches.create(requests=[
    {"custom_id": f"q-{i}",
     "params": {"model": MODEL, "max_tokens": 128,
                "system": SHARED_SYSTEM,          # 定数を使い回して揺れを防ぐ
                "messages": [{"role": "user", "content": q}]}}
    for i, q in enumerate(QUESTIONS, 1)
])
# 結果は client.messages.batches.results(batch.id) で回収し、
# 各 usage の cache_read_input_tokens から実効ヒット率を集計する



第6章 運用に組み込む——計測・CI・デプロイ

6.1 ヒット率をKPI化し、「write偏重」を検知する
ヒット率は次の式でリクエストごとに計算できます。
def hit_rate(u):
    total = ((u.cache_read_input_tokens or 0)
             + (u.cache_creation_input_tokens or 0) + u.input_tokens)
    return (u.cache_read_input_tokens or 0) / total if total else 0.0

ダッシュボード化するKPIと典型的なアラート条件は次のとおりです。


ヒット率: read ÷ (read + write + fresh)。デプロイ直後の急落は「プレフィックスが変わった」証拠です。

write/read比: 数リクエスト続けて「readゼロ×write連発」なら、ブレークポイントが可変ブロックに乗っているか、プレフィックスが揺れています(3.2節の失敗パターンの症状)。

TTL別内訳: usage.cache_creation の5m/1h内訳。意図しない5m書込の増加はサーバーツールの自動ブレークポイント(5.1節)か設定ミスのどちらかです。

さらに、静的プレフィックスの内容ハッシュを「プロンプトのバージョンID」としてログに残すと、ヒット率悪化とデプロイの相関分析が一発でできます。
import hashlib, json, time

version = hashlib.sha256(STATIC_PREFIX.encode()).hexdigest()[:12]

log_line = {"ts": time.time(), "model": MODEL,
            "prompt_version": version,             # デプロイ相関分析の鍵
            "read": u.cache_read_input_tokens,
            "write": u.cache_creation_input_tokens,
            "fresh": u.input_tokens}

原因究明が難航するときは、連続する2リクエストをAPI側で比較して「プレフィックスがどこで分岐したか」を特定してくれるCache diagnostics(ベータ)が使えます。

6.2 CIで「キャッシュ破壊的変更」を検知する
プロンプト変更=キャッシュ全滅イベントです。静的プレフィックスを「レンダリング関数+内容ハッシュのスナップショット」で管理し、CIで意図しない差分(空白・キー順・改行コード)を落とします。
import hashlib
from pathlib import Path

def prefix_sha256():
    return hashlib.sha256(render_static_prefix().encode("utf-8")).hexdigest()

# CI: 前回リリースのスナップショットと比較。不一致 = キャッシュ破壊的変更
def test_static_prefix_unchanged():
    expected = Path("static_prefix.sha256").read_text().strip()
    assert expected == prefix_sha256(), (
        "静的プレフィックスが変わっています。意図した変更ならスナップショットを更新し、"
        "リリースノートへの記載とデプロイ後プレウォームを忘れずに。"
    )

ハッシュ更新を伴うリリースは「キャッシュ破壊的変更」として明記し、デプロイフックでプレウォーム(4.4節)を走らせてから切り替える——いわばプロンプトのブルーグリーンデプロイです。


第7章 一歩進んだ応用テクニック

7.1 会話途中のsystem指示追加をキャッシュを壊さずに行う
トップレベルの system を書き換えるとsystem以下がすべて無効化されますが、Claude Fable 5 / Mythos 5 / Opus 4.8 / Opus 5では、{"role": "system"} メッセージを messages に追記することで、system/messagesキャッシュを無効化せずに会話途中で指示を追加できます(Sonnet 5は非対応)。「モード切替のたびにキャッシュ全滅」問題への公式解です。
messages = [
    {"role": "user", "content": "返品ポリシーを教えてください。"},
    {"role": "assistant", "content": r1.content},
    {"role": "system",   # ← Fable 5 / Mythos 5 / Opus 4.8 / Opus 5 のみ
     "content": "ここからは箇条書きを使わず、2文以内で回答すること。"},
    {"role": "user", "content": "デジタル商品の場合は?"},
]
# トップレベル system は書き換えない = プレフィックス不変で read が維持される


7.2 マルチテナントの「プレフィックス・トライ」設計
キャッシュを「リクエスト群が共有するプレフィックス木」と捉えると、マルチテナントSaaSの設計指針が導けます。共有できる層ほど前に置く——全テナント共通→テナント共通→ユーザー固有→会話、の順です。キャッシュはワークスペース内で共有されるため、共通部分を前に寄せるほど組織全体のヒット率が上がります。TTLの制約(1hは5mより前)とも整合する並びです。
system=[
    {"type": "text", "text": GLOBAL_PREFIX,           # L1: 全テナント共通(ほぼ不変)
     "cache_control": {"type": "ephemeral", "ttl": "1h"}},
    {"type": "text", "text": TENANT_KB[tenant],       # L2: テナント共有
     "cache_control": {"type": "ephemeral", "ttl": "1h"}},
    {"type": "text", "text": user_profile,            # L3: ユーザー固有(5mは1hより後)
     "cache_control": {"type": "ephemeral"}},
],
messages=[*history,
    {"role": "user", "content": [{"type": "text", "text": user_text,
        "cache_control": {"type": "ephemeral"}}]},    # L4: 会話(転がす)
]
# 同一テナントの別ユーザーは L1+L2 が read になり、L3 以降だけ write になる



共有できる層(L1・L2)ほど木の根に近い位置に置くことで、テナント内の別ユーザーからのリクエストもL1+L2の時点でreadヒットします。ワークスペース内の全リクエストがこの木を辿るイメージを持つと、レイヤ設計の勘所が掴みやすくなります。

7.3 レート制限の実質拡張として使う
前述のとおりキャッシュヒットはレート制限から控除されず、usage 上の input_tokens もブレークポイント以降のみになります。つまりキャッシュ率の改善は、同じレート制限枠・同じ予算で捌けるリクエスト数を桁で変える施策です。コスト記事の枠を超えて、スループット改善の第一手として検討する価値があります。

7.4 モデルルーティングとの相性に注意する
KVキャッシュはモデル内部表現なので、モデルを跨いだヒットはありません。Haikuで振り分け→Sonnetで回答のような構成では、プレフィックスを両モデルでそれぞれウォームするか、振り分け側のプレフィックスを最小化する設計が必要です。

7.5 thinkingモデルの世代差を織り込む
thinkingブロックは cache_control を直接付けられませんが、前のassistantターンの一部として他コンテンツと一緒にキャッシュされます(読み出し時は入力トークンとして課金されます)。重要なのは世代差です。Opus 4.5以降とSonnet 4.6以降では、ツール結果以外のユーザー入力を足してもthinkingブロックがデフォルトで保持され、キャッシュは有効なままです。それ以前のOpus/Sonnetと全Haikuでは、thinkingブロックが剥がされて以降のキャッシュが無効になります。エージェントのモデル選定では、この「キャッシュ効率の世代差」も考慮に値します。

7.6 コンテキスト編集との折り合い
履歴の圧縮・トリム(compaction / context editing)はプレフィックスを書き換えるため、原理的にキャッシュと衝突します。トリムは「どうせミスするタイミング」——モデル切替・長時間アイドル明け・セッション区切り——に寄せるのが合理的です。なお公式のガイドは「安定したツール定義は初日からキャッシュせよ(書込の25%プレミアムは2リクエスト目のヒットで回収できる)、ツールが20個を超えたあたりでツール検索を足せ」という段階論を示しており、キャッシュ・ツール検索・コンテキスト編集は排他ではなく組み合わせる前提です。


第8章 ハマりどころチェックリスト
運用前・障害調査時のチェックリストとしてお使いください。


可変ブロックにブレークポイントを置いていないか(最頻の失敗。writeだけ課金されreadは一生ゼロ)

「writeばかりでreadゼロ」に気づける監視があるか(ヒット率とwrite/read比のKPI化)

ツール定義の微修正・並び替えで全階層を無効化していないか

web検索・引用・speed設定のトグル、tool_choice・画像の有無・disable_parallel_tool_use、thinking/effortの揺れを無効化マトリクスで確認したか

最小キャッシュ長未満で黙殺されていないか(特にHaiku 4.5の4,096。usage の2フィールドで検証)

JSONキー順・空白・改行コードのバイト揺れはないか(Swift/Goのキー順ランダム化に注意)

並列ファンアウトの初回スタンピードを起こしていないか(プライミング/プレウォームで回避)

1ターンで20ブロック超が追加され、lookback窓からエントリが外れていないか(中間ブレークポイントで保険)

長いストリーミング応答後の残TTLを見誤っていないか(起点はリクエスト開始)

サーバーツール利用時の ephemeral_5m_input_tokens を異常と誤認していないか(仕様です)

ワークスペースを跨いだリクエストにヒットを期待していないか(API/Claude Platform on AWS/Foundryはワークスペース分離)

バッチのヒットをアテにしすぎていないか(ベストエフォート、目安30〜98%)



第9章 実測ログ——4モデル横断で検証した結果
ここまでの説明は仕組みとしては正しいものですが、「本当にその通りに動くのか」は実際にAPIを叩いてusageを見るまで分かりません。本章では、Claude Sonnet 5 / Opus 5 / Fable 5 / Haiku 4.5の4モデルに対して、ここまでの各プラクティスをそのまま実行可能なスクリプトとして実装し(第9.4節参照)、実測した結果を記録します。

9.1 実行結果の概要
47本の実験(4モデル×約12本)を実行し、実行時エラーは0件。206件のcheckのうち204件がpassed(失敗2件は9.4節で述べる単一事象)。全体のヒット率はread 201,230 / write 199,945 / fresh 37,119トークンで45.91%、実測課金は$1.598602(キャッシュ無し想定$1.935495に対して$0.336893・17.4%の削減)でした。
17.4%という数値だけ見るとキャッシュの効果が薄く見えますが、これは実験スイート特有の事情です。各実験が短命な使い捨てプレフィックスに対して初回writeを払う構成になっているため、write投資の比率が通常運用より高くなります。第2章で示した「定常運用でのキャッシュ削減率89.9%」は05_ttl_offline(純粋な算数、API不使用)で別途検証済みで、実際にAPIを繰り返し呼ぶ定常運用ではこちらの数値が実態に近くなります。

9.2 主張ごとの再現結果(抜粋)



主張
実測




明示ブレークポイントのwrite→read遷移(1.2節)
Sonnet 5: 1回目 write=1,907/read=0 → 2回目 write=0/read=1,907。Haiku 4.5も write=4,197 → read=4,197 で同様に収束


アンチパターンはreadゼロのまま(3.2節)
全4モデルでbad1/bad2のwriteが完全同値(例: Sonnet 1,892/1,892)、read=[0,0]。goodは2回目でwrite=0/read=1,858(Sonnet)まで完全ヒット


最小キャッシュ長という「見えない床」(2.3節)
19トークンの短いsystemは512/1,024/4,096のいずれの閾値も下回り黙殺。make_big_text()はSonnet 1,862tok/Opus・Fable 1,259〜1,260tok/Haiku 4,154tokで各閾値を超過


マルチターンのread単調増加(3.3節)
Sonnet: turn2 read=1,900 → turn3 read=2,133、write は turn1=1,900 → turn3=275


転がしブレークポイント(5.1節)
Sonnet: iter1 write=2,331 → iter2 write=385/read=2,331


混在TTLの内訳(4.3節)
Sonnet: 1h write=1,870 / 5m write=23。1hブロックを5mより前に置く構成がusage上で分解して確認できた


損益分岐の算数(2.2節)
4モデル全てで5分=2回目・1時間=3回目で回収、削減率89.9%、keep-aliveの分岐点はアイドル30分(5m+ピン=1.95P vs 1h=2.0P)で一致



max_tokens: 0プレウォーム(4.4節)

stop_reason=max_tokens・content 0ブロック・output=0を確認。後続の並列ファンアウト4本は全てヒット


会話途中system追加(7.1節)
Opus 5: turn1 write=1,876 → turn2 write=0/read=1,876 → turn3も read=1,876 を維持。Fable 5も同様に3ターン維持



defer_loading+ツール検索(5.1節②)
ツール102個でもプレフィックス維持。Sonnet: turn1 write=2,620 → turn2 read=5,240/write=0


サーバーツールの自動5分ブレークポイント(5.1節①)
1hしか指定していないのに5m書込が出現(例: Sonnet 5m=6,435/1h=4,597)。仕様どおりの正常挙動


マルチテナントのプレフィックス共有(7.2節)
userAが共有層をwrite、userBはread(Sonnet 3,747)。userBのwriteはL3以降のみ(31tok)




9.3 モデル横断で見えたこと


ヒット率(%)で見るとモデル差はほとんど無い。 01_basicsはSonnet 73.99% / Opus 72.33% / Fable 73.48% / Haiku 74.23%、06_prewarmは82.5〜83.0%とほぼ横並びでした。一方でreadの絶対値は最小キャッシュ長にほぼ比例し、Opus/Fable 1,304〜1,305tok・Sonnet 1,907tok・Haiku 4,197tokと3倍以上開きます。モデル間比較は絶対トークン数ではなくヒット率で行うという2.3節の指針が実測で裏付けられました。

単価差がそのまま金銭差になる。 ほぼ同じトークン量・同じヒット率でも、Fable 5(基本入力$10/MTok)は実験群全体で$0.812909、Haiku 4.5(同$1/MTok)は$0.159576と5倍超の開きが出ました。象徴的なのが07_monitoringで意図的に発生させた「無駄write」で、同じ2,592トークンの無駄払いがFableでは$0.032400、Opusでは$0.016200とちょうど2倍の差になっています。単価の高いモデルほど、同じ設計ミスの金銭的な痛手が大きいため、Fable/Opusのような高単価モデルほどキャッシュ設計のレビューを優先すべきです。

10a(会話途中system追加)はOpus 5・Fable 5ともに3ターンにわたってread 1,876〜1,877を維持し、両モデル間で挙動差は見られませんでした。


9.4 実測中に見つかった「効かなかった」ケース
良いことばかりではありません。07_monitoring(claude-fable-5)で2件のcheck失敗を記録しました。正常系は「write→read→read」の3リクエスト構成を想定していましたが、実際には1回目・2回目とも write=1,269/read=0 となり、3回目で初めてread=1,269がヒットしました。書き込み直後のキャッシュ可視化にわずかなラグがあった可能性と、Fable 5がthinkingを常時ONにしていることでリクエスト間のプレフィックスに揺らぎが生じた可能性の両方が疑われますが、1試行のみでは断定できず、単独モデルでの再実行による再現性確認が次のステップです。
この「たまに効かないことがある」という事実そのものが、第6章で述べたヒット率のKPI化と監視の必要性を裏付けています。1回のミスが放置されずhealthy_hit_rate_in_bandのようなcheckで機械的に検知できたのは、監視を先に作り込んでおいたからです。


まとめ
最後に、本記事の要点を凝縮します。

キャッシュ対象は「ブレークポイントまでのプレフィックス全体」。書き込みは点(ブレークポイント位置のみ)、読み込みは線(後方20ブロックのlookback)です。
損益分岐は5分キャッシュ=2回目、1時間キャッシュ=3回目。2回以上使うプレフィックスは原則キャッシュ、が結論です。
設計の核心は「静的→動的の一方向レイアウト」と「リクエスト間で不変な最後のブロックにブレークポイントを置く」の2つ。バイト一致が条件なので、canonical JSONとプレフィックス凍結で決定論を守ります。
TTLは「間隔5分以内→5m(無料リフレッシュ)/5分〜1時間→1h/それ以上→損益計算」。max_tokens: 0 のプレウォームとファンアウト前プライミングで初回ペナルティも消せます。
効果が最も出るのはエージェントループと文書QA。Batch APIと重ねれば読取は実質0.05倍まで落ちます。
運用ではヒット率のKPI化とCIでのキャッシュ破壊的変更検知、デプロイ時のプレウォーム(プロンプトのブルーグリーン)までがセットです。
キャッシュはコスト削減だけの機能ではありません。レート制限に計上されない実効スループット向上であり、many-shotや全文投入といった「重いプロンプト」を解禁する品質投資でもあります。ここまで含めて、初めて「使い倒した」と言えるはずです。

本記事のサンプルコードは、基本(明示/自動)・レイアウト・会話・エージェントループ・TTL戦略・プレウォーム・監視・CIガード・バッチ・応用パターンの10本構成の実行可能スクリプト集として整理してあり、第9章の数値はすべてこのコードを4モデルで実行して得たものです。usage の write/read を実際に観察しながら、ぜひ手元で確かめてみてください。

サンプル実装
本記事の主張を裏付けるスクリプト一式(第9章の実測もこのコードで生成しています)は以下で公開しています。
https://github.com/shibuiwilliam/llm-cache-experiments/tree/main/claude


common.py: 実験対象4モデル(Sonnet 5 / Opus 5 / Fable 5 / Haiku 4.5)のケイパビリティ表(最小キャッシュ長・料金・機能サポート)と、print_usageなどの共通ヘルパー

01〜10: 本記事の各章に1対1で対応する10本の実験スクリプト(基本形/レイアウト/マルチターン/エージェントループ/TTL戦略/プレウォーム/監視/CIガード/バッチ/応用パターン)

run_all.py: 全実験を4モデル横断で実行し、usageをJSONに集約した上でLLMによる検証レポートを自動生成するハーネス

uv sync して uv run python run_all.py --api --all-models を叩けば、第9章と同じ手順でwrite/readの遷移を自分の手元でも再現できます(オフライン実験のみなら課金なしで試せます)。

参考リンク

Prompt caching(公式ドキュメント)
Tool use with prompt caching
Tool search tool
Batch processing
Pricing
Cache diagnostics(ベータ)
サンプル実装(GitHub)

(本記事の仕様・数値は2026年8月時点の公式ドキュメントに基づきます。)
