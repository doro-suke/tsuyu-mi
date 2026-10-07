# 会社 PC で月次シフト表を Python が作る：祝日連動 + Excel カレンダー出力（fudebako ハンズオン） #業務効率化 - Qiita
- **Source URL**: https://qiita.com/yonaka15/items/066a15a775faca6a6767
- **Score**: 78
- **AI Summary**:
  - ブラウザ完結のPython環境を用いた、インストール不要の業務自動化ツールの構築手法
  - 数理最適化（MILP）を用いた公平なシフト割り当てロジックと具体的な実装コードの解説
  - 祝日データの統合から制約条件の定義、色付きExcel出力までの一連のパイプライン
- **Read Now Reason**: 数理最適化ライブラリ（scipy.optimize.milp）を用いた具体的なリソース配分アルゴリズムがコードレベルで詳解されており、自動化パイプライン構築のコア技術として即時応用可能であるため。
- **Suggested Tags**: #数理最適化, #Python, #業務自動化, #Pyodide
- **Processed Date**: 2026/5/7

---

## 本文
毎月のシフト表作りに 2-3 時間かけていませんか？
私はかつて 100人のアルバイトのシフト表を Excel で組んでいました。人員配分・連続勤務上限・希望休をすべて手動でチェックし、月初の作業日が来るたびに気が重く、ミスも頻発していました。
この記事では、私も開発に関わっている fudebako（HTML 1 枚でブラウザだけで動く Python 環境）を使って、会社 PC でシフト表を最適化する手順をハンズオン形式で解説します。Microsoft アカウントも、AI コーディングアシスタントも、専門ソフトも要りません。

fudebako は REPL（読み込み・評価・出力ループ）型の Python 環境です。1 セル書く → 実行する → ワークスペースで結果を確認する → 次のセルへ、というサイクルで進めます。本記事もこの順番で読み進めてください。各セルのコードは短く、すべて 10 行前後です。

この記事でつくるもの

コールセンター 8 名 × 2026 年 5 月（GW 4 連休あり）のシフトを 5 秒で出力する
個人別の希望休（A さんは水曜 NG など）を反映させる
曜日別の必要人数（月・金は早番 2 名のピーク対応）を反映させる
「希望休を出していない人が一番少ない勤務日数」という皮肉な偏りを、数式 1 行で解消する
2^744 通りの組み合わせを数秒で解く「数理最適化」の仕組みを理解する
結果を色付き Excel カレンダーで出力して現場に配布する

検証はすべて fudebako（v0.3.3、約 60 MB の HTML 1 ファイル）で行いました。手元で同じ手順をすぐ再現できます。


0. fudebako のセットアップ
fudebako のリリースページ から fudebako-v0.3.3.html をダウンロードして、ダブルクリックでブラウザに開きます。インストール不要、外部通信不要、サインイン不要です。
詳しくは前の記事 会社 PC に Python が入れられない人へ：ブラウザだけで動く秘密道具「fudebako」 を参照してください。
開いたら、左に Python 入力エディタ、右に ワークスペース（変数の中身が見られるタブ）と ドライブ（ファイル保存先）があります。これから書くコードのたびに、右のワークスペースで何が増えたかを確認していきます。



セル 1：ライブラリを準備する
scipy は同梱されているので、追加が必要なのは openpyxl（Excel 出力用）だけ。
import micropip
await micropip.install("openpyxl")
print("openpyxl OK")

→ ワークスペースに micropip モジュールが現れます。コンソールに openpyxl OK と出ます。

ワンポイント: micropip は Pyodide 用の pip クライアントです。fudebako 起動時にインターネット接続があれば、ここでパッケージを取りに行きます。1 回入れれば、以後ブラウザを閉じてもキャッシュに残るので、次回からはオフラインで動きます。



セル 2：祝日データを置く（通信不要）
外部 API は使いません。内閣府の祝日 CSV を見て、必要な祝日を Python の dict として埋め込みます。
HOLIDAYS_2026 = {
    "2026-05-03": "憲法記念日",
    "2026-05-04": "みどりの日",
    "2026-05-05": "こどもの日",
    "2026-05-06": "振替休日",
    # 他の月の祝日も同様に追加できますが、5 月分だけで動きます
}
print(f"5 月の祝日: {len(HOLIDAYS_2026)} 件")

→ ワークスペースに HOLIDAYS_2026 (dict len=4) が現れます。クリックして展開すると 4 件の祝日が見えます。

ワンポイント: 年に 1 回、内閣府 CSV を見て書き換えるだけで OK。これで完全オフラインで動きます。



セル 3：5 月のカレンダーを作る
5 月 1 日 〜 31 日を順に作って、曜日と祝日 / 土日を判定します。
import datetime

n_days = 31
days_info = []
for d in range(1, n_days + 1):
    date = datetime.date(2026, 5, d)
    iso = date.isoformat()
    weekday = date.weekday()  # 月=0, 日=6
    days_info.append({
        "iso": iso, "day": d, "weekday_idx": weekday,
        "weekday": ["月","火","水","木","金","土","日"][weekday],
        "is_holiday": iso in HOLIDAYS_2026,
        "holiday_name": HOLIDAYS_2026.get(iso, ""),
        "is_special": (iso in HOLIDAYS_2026) or (weekday >= 5),
    })

print(days_info[0])   # 5/1
print(days_info[2])   # 5/3 = 憲法記念日（日曜）

→ ワークスペースに days_info (list len=31) が現れます。展開して各日の dict が確認できます。
{'iso': '2026-05-01', 'day': 1, ..., 'weekday': '金', 'is_holiday': False, ...}
{'iso': '2026-05-03', 'day': 3, ..., 'weekday': '日', 'is_holiday': True, 'holiday_name': '憲法記念日', ...}


ワンポイント: is_special が「土日 OR 祝日」を表すフラグです。これで「特別日は人員増し」のロジックを後で簡潔に書けます。



セル 4：必要シフト数を検算する
最適化を走らせる前に、手で計算した結果と一致するかを確認します。これが REPL の良さで、「あれ、思ってたのと違う」を早めに気づけます。
n_persons = 8
persons = ["A", "B", "C", "D", "E", "F", "G", "H"]

specials = sum(1 for di in days_info if di["is_special"])
normals = n_days - specials
total_shifts = normals * 2 + specials * 4  # 平日 早1+遅1、土日祝 早2+遅2

print(f"5 月: 平日 {normals} 日, 特別日 {specials} 日")
print(f"総シフト数: {total_shifts}")
print(f"8 人で割ると 1 人あたり {total_shifts / n_persons:.2f} 日勤務")

→ コンソール:
5 月: 平日 18 日, 特別日 13 日
総シフト数: 88
8 人で割ると 1 人あたり 11.00 日勤務

ピッタリ 11 日です。これが「全員 11 日均等」の理論値で、後の最適化結果と一致するはずです。


セル 5：最適化問題のサイズを決める
シフト割り当てを「0 か 1」の変数 x[p, d, s]（人 p、日 d、シフト s = 0 早 / 1 遅 / 2 休）として表現します。
import numpy as np

n_shifts = 3
n_x = n_persons * n_days * n_shifts  # 8 * 31 * 3 = 744 変数
n_vars = n_x + 1  # + W (公平性補助変数)
W_idx = n_x

def idx(p, d, s):
    return p * n_days * n_shifts + d * n_shifts + s

print(f"変数の総数: {n_vars} (うち 0/1 整数 {n_x} 個 + W 1 個)")

→ コンソール: 変数の総数: 745 (うち 0/1 整数 744 個 + W 1 個)
→ ワークスペースに idx (function) が現れます。これは「(人, 日, シフト) → 変数番号」の変換関数。

ワンポイント: なぜ 1 人 × 1 日に 3 つの 0/1 変数（早・遅・休）が必要かというと、「シフト = 早 or 遅 or 休」を「3 個のうち 1 個だけ 1」という単純な足し算で書けるからです。専門用語ではワンホット表現と言いますが、要するに「どれか一つだけ選ぶスイッチ」だと思っておけば十分です。



セル 6：目的関数を決める（公平性）
「全員の勤務日数を均等にする」を線形最適化で表現するテクニック：

補助変数 W を導入する
各人の勤務日数 ≤ W という制約を入れる（次のセルで書きます）
W を最小化する

これで「W は全員の勤務日数の上限」になり、最大勤務者の日数が最小化されます。
c = np.zeros(n_vars)
c[W_idx] = 1.0  # W に 1、他は 0
# scipy.optimize.milp は最小化問題なので、c.x が最小化される
print(f"目的関数 c のうち非ゼロ: c[{W_idx}] = {c[W_idx]} (W のみ)")

→ ワークスペースに c (ndarray len=745) が現れます。


セル 7：制約を組み立てる
4 種類の制約をすべて足し算と不等式で書きます。
from scipy.optimize import LinearConstraint

constraints_list = []

# 制約 1: 各日の必要人数（平日 早1+遅1、土日祝 早2+遅2）
for d in range(n_days):
    is_special = days_info[d]["is_special"]
    req_early = 2 if is_special else 1
    req_late = 2 if is_special else 1
    for s, req in [(0, req_early), (1, req_late)]:
        row = np.zeros(n_vars)
        for p in range(n_persons):
            row[idx(p, d, s)] = 1.0
        constraints_list.append(LinearConstraint(
            row.reshape(1, -1), lb=[float(req)], ub=[float(req)]))

# 制約 2: 各人 1 日 1 シフトのみ
for p in range(n_persons):
    for d in range(n_days):
        row = np.zeros(n_vars)
        for s in range(n_shifts):
            row[idx(p, d, s)] = 1.0
        constraints_list.append(LinearConstraint(
            row.reshape(1, -1), lb=[1.0], ub=[1.0]))

# 制約 3: 連続 5 日のうち 早+遅 ≤ 4（5 連勤禁止）
for p in range(n_persons):
    for start_d in range(n_days - 4):
        row = np.zeros(n_vars)
        for d in range(start_d, start_d + 5):
            row[idx(p, d, 0)] = 1.0
            row[idx(p, d, 1)] = 1.0
        constraints_list.append(LinearConstraint(
            row.reshape(1, -1), lb=[0], ub=[4]))

# 制約 4: 各人の勤務日数 ≤ W（公平性）
for p in range(n_persons):
    row = np.zeros(n_vars)
    for d in range(n_days):
        row[idx(p, d, 0)] = 1.0
        row[idx(p, d, 1)] = 1.0
    row[W_idx] = -1.0
    constraints_list.append(LinearConstraint(
        row.reshape(1, -1), lb=[-np.inf], ub=[0]))

print(f"制約の総数: {len(constraints_list)}")

→ コンソール: 制約の総数: 534
→ ワークスペースに constraints_list (list len=534) が現れます。

ワンポイント: 534 個の制約を全部手で書いたら日が暮れます。同じ形の不等式を for ループで量産できるのが Python の利点。各制約は「左辺の係数行（長さ 745）+ 下限 + 上限」だけで決まる、地味な数学オブジェクトです。



セル 8：解く
from scipy.optimize import milp, Bounds

integrality = np.zeros(n_vars)
integrality[:n_x] = 1  # x のみ 0/1 整数、W は連続変数

bounds = Bounds(
    lb=np.zeros(n_vars),
    ub=np.array([1] * n_x + [n_days])
)

result = milp(c, constraints=constraints_list,
              integrality=integrality, bounds=bounds)

print(f"求解成功: {result.success}")
print(f"W (最大勤務日数) = {result.x[W_idx]:.0f}")

→ コンソール（5 秒くらいで返ってきます）:
求解成功: True
W (最大勤務日数) = 11

→ ワークスペースに result (OptimizeResult) が現れます。展開すると result.x (ndarray len=745) に最適解が入っています。
セル 4 で計算した「8 人で割ると 1 人 11 日」と一致しました。


セル 9：結果を読み出す
result.x の中身を「人 × 日」の表に展開します。
schedule = {}
for p in range(n_persons):
    for d in range(n_days):
        for s in range(n_shifts):
            if result.x[idx(p, d, s)] > 0.5:
                schedule[(p, d)] = s
                break

work_count = [
    sum(1 for d in range(n_days) if schedule.get((p, d), 2) != 2)
    for p in range(n_persons)
]
print(dict(zip(persons, work_count)))
print(f"max-min = {max(work_count) - min(work_count)}")

→ コンソール:
{'A': 11, 'B': 11, 'C': 11, 'D': 11, 'E': 11, 'F': 11, 'G': 11, 'H': 11}
max-min = 0

全員 11 日勤務、ピッタリ均等です。検算：5 月の必要シフト数は、平日 18 日 × (1+1) + 特別日 13 日 × (2+2) = 88 シフト。8 名 × 11 日 = 88 でぴったり一致します。

→ ワークスペースに schedule (dict len=248) が現れます。(0, 0): 2 のような形で、(人 0 = A, 日 0 = 5/1) → 2 (休) のように記録されています。


コラム：なぜ 2^744 通りを数秒で解けるのか
ここで「え、待って。744 個の 0/1 セル、全パターンって 2^744 ≈ 10^224 通り。総当たりじゃ宇宙の年齢でも終わらないのに、なぜ 5 秒で解けるの？」と思った方へ。原理を 3 層で説明します。

1. そもそもシフト表は「0 か 1 か」の表にすぎない
        5/1  5/2  5/3  ...  5/31
A 早番   0    0    0          0
A 遅番   0    1    0          1
A 休     1    0    1          0
B 早番   ...

全部足し算と不等式で書ける。ここまでで分かったとおりです。

2. なぜ総当たりではダメなのか
744 個の 0/1 = 2^744 ≈ 10^224 通り。観測可能な宇宙の原子数（10^80）より圧倒的に多い。総当たりでは絶対に解けません。

3. 「魔法」の正体：MILP（整数線形計画法）の仕組み
scipy.optimize.milp の中身は HiGHS という最先端ソルバー（オープンソース、無料）で、「Branch and Bound」というアルゴリズムを使っています：


緩和: まず「0/1 整数」の制約を捨てて、「0.7 シフト」のような小数解も許す問題を解く（これは LP 緩和、瞬時に解ける）

枝刈り: 緩和解の値が「現在ベストの整数解」より悪ければ、その分岐は捨てる（その先の数百万通りを探索せずに済む）

整数化: 0.7 になった変数を「0 か 1」に分岐させて再帰

収束: 探索木の全枝が枝刈り or 整数解に到達するまで繰り返す

これで 2^744 通りの空間が、実際には数千〜数万ノードの探索木になり、数秒で最適解（しかも数学的に「これより良い解は存在しない」と証明されたもの）を見つけられます。

「魔法」の正体



見た目
実態




Python が魔法でシフトを作った
ただの 0/1 配置問題、ぜんぶ足し算


AI が判断している
違う。決定論的アルゴリズムが最適解を数学的に証明



5 秒で解けるなんて
1947 年の Simplex 法から始まる 70 年の最適化研究の蓄積、いまの HiGHS はその最先端



専門ソフトでは IBM CPLEX や Gurobi が有名ですが、同等の HiGHS を scipy.optimize.milp 経由で無料で呼べて、しかもそれが fudebako という1枚の HTML の中で動いてしまう。この恩恵を借りるだけで、業務のシフト作りが一瞬で終わります。


セル 10：応用 1 — 個人別の希望休を加える
実務では「A さんは水曜固定休（子供の習い事送迎）」「B さんは 5/15-16 で旅行」のような個人事情があります。
PREFERENCES = {
    "A": {"weekly_off": [2]},                          # 水曜は休
    "B": {"date_off": ["2026-05-15", "2026-05-16"]},  # 5/15-16 連休
    "C": {"weekly_off": [5]},                          # 土曜は休
    "E": {"date_off": ["2026-05-20"]},                # 5/20 通院
    "G": {"weekly_off": [4]},                          # 金曜は休
}
print(f"希望休のある人: {len(PREFERENCES)} 名")

→ ワークスペースに PREFERENCES (dict len=5) が現れます。


セル 11：希望休を bounds で表現する
該当する x[p, d, 早] と x[p, d, 遅] の上限を 0 にして、強制的に「休」に固定します。
bounds_ub = np.ones(n_vars)
bounds_ub[W_idx] = float(n_days)

forced_off = 0
for p, p_name in enumerate(persons):
    prefs = PREFERENCES.get(p_name, {})
    weekly_off = prefs.get("weekly_off", [])
    date_off = prefs.get("date_off", [])
    for d in range(n_days):
        di = days_info[d]
        is_off = di["weekday_idx"] in weekly_off or di["iso"] in date_off
        if is_off:
            bounds_ub[idx(p, d, 0)] = 0
            bounds_ub[idx(p, d, 1)] = 0
            forced_off += 1

bounds_with_pref = Bounds(lb=np.zeros(n_vars), ub=bounds_ub)
print(f"強制休セル: {forced_off}")

result2 = milp(c, constraints=constraints_list,
               integrality=integrality, bounds=bounds_with_pref)

# 結果展開
schedule2 = {}
for p in range(n_persons):
    for d in range(n_days):
        for s in range(n_shifts):
            if result2.x[idx(p, d, s)] > 0.5:
                schedule2[(p, d)] = s
                break
work_count2 = [sum(1 for d in range(n_days) if schedule2.get((p, d), 2) != 2)
               for p in range(n_persons)]
print(dict(zip(persons, work_count2)))

→ コンソール:
強制休セル: 17
{'A': 11, 'B': 11, 'C': 11, 'D': 11, 'E': 11, 'F': 11, 'G': 11, 'H': 11}

5 名に希望休（合計 17 セル分の強制休）を入れても、全員 11 日均等を維持できました。
特に注目すべきは 5/16（土） で、B さん（旅行）と C さん（土曜固定休）が同時に休、それでも土曜の必要人数 4 名を残り 6 名でカバーできています。手作業で詰めるのは至難の業ですが、MILP は数秒で解いてくれます。



セル 12：応用 2 — 曜日別の必要人数
コールセンターは「月曜は週初の問い合わせ多」「金曜は週末前のピーク」という業務量の偏りがあります。
WEEKDAY_REQUIREMENTS = {
    0: (2, 1),  # 月: 早 2 / 遅 1（週初ピーク）
    1: (1, 1),  # 火
    2: (1, 1),  # 水
    3: (1, 1),  # 木
    4: (2, 2),  # 金: 早 2 / 遅 2（週末前ピーク）
}

制約 1（必要人数）の計算を曜日別に分岐させて、再構築します。
constraints_v2 = []

# 制約 1' を変えるだけ、他は同じ
for d in range(n_days):
    di = days_info[d]
    if di["is_special"]:
        req_early, req_late = 2, 2
    else:
        req_early, req_late = WEEKDAY_REQUIREMENTS[di["weekday_idx"]]
    for s, req in [(0, req_early), (1, req_late)]:
        row = np.zeros(n_vars)
        for p in range(n_persons):
            row[idx(p, d, s)] = 1.0
        constraints_v2.append(LinearConstraint(
            row.reshape(1, -1), lb=[float(req)], ub=[float(req)]))

# 制約 2-4 は同じものを使い回し（ループから 1 つ目だけ取って差し替え）
constraints_v2 += constraints_list[n_days * 2:]  # 前から「制約 1」分をスキップして残りを連結

result3 = milp(c, constraints=constraints_v2,
               integrality=integrality, bounds=bounds_with_pref)

# 結果
work_count3 = []
for p in range(n_persons):
    days = sum(1 for d in range(n_days) for s in [0, 1]
               if result3.x[idx(p, d, s)] > 0.5)
    work_count3.append(days)
print(dict(zip(persons, work_count3)))

→ コンソール:
{'A': 13, 'B': 13, 'C': 13, 'D': 13, 'E': 13, 'F': 13, 'G': 11, 'H': 12}

総シフト数が 88 → 101 に増えたので、各人の勤務日数も 11 → 12-13 に。

…ここで結果をもう一度よく見てください。
A=13 B=13 C=13 D=13 E=13 F=13 G=11 H=12

A-F の 6 名は 13 日、G は 11 日、H だけ 12 日です。希望休を出していたのは A, B, C, E, G の 5 名。希望休を出していない H と D / F を比べると、D / F は 13 日、H は 12 日。
つまり「希望休なしの H が、希望休なしの D / F よりも 1 日少なく働いている」結果になっています。これは皮肉ですよね。希望休を出した人を優遇したわけではないのに、運悪く H が割を食う形に。


セル 13：なぜこうなったか — 目的関数の死角
なぜこうなったか。実は、これまでの設定だと「最大値 (W_max) さえ抑えれば、最小値がいくら低くても構わない」という計算になっていたからです。
HiGHS の気持ちになると、「max が 13 で抑えられるなら、min は 11 だろうが 12 だろうが知ったことか」というわけです。min は野放しだったので、運悪く H が 12 日に流れ着いてしまった。
直し方はシンプルで、最少勤務者の日数 (W_min) も式に入れて縛るだけです。


セル 14：W_min を追加してもう一段公平に
補助変数 W_min を追加し、目的関数を「W_max を最小化 + W_min を最大化」に変えます。線形最適化では「最大化」は「マイナスを最小化」で書けるので：
n_vars_v3 = n_x + 2  # x + W_max + W_min
W_max_idx = n_x
W_min_idx = n_x + 1

c_v3 = np.zeros(n_vars_v3)
c_v3[W_max_idx] = 1.0   # W_max を最小化
c_v3[W_min_idx] = -1.0  # W_min を最大化（= -W_min を最小化）

# 制約 4a: 各人の勤務日数 ≤ W_max（既存）
# 制約 4b: 各人の勤務日数 ≥ W_min（新規追加）
for p in range(n_persons):
    row = np.zeros(n_vars_v3)
    for d in range(n_days):
        row[idx(p, d, 0)] = 1.0
        row[idx(p, d, 1)] = 1.0
    row[W_min_idx] = -1.0
    constraints_v3.append(LinearConstraint(
        row.reshape(1, -1), lb=[0], ub=[np.inf]))

# （他の制約 1, 2, 3, 4a は応用 2 と同じ）

result_v3 = milp(c_v3, constraints=constraints_v3,
                 integrality=integrality_v3, bounds=bounds_v3)

求解結果：
W_max = 13, W_min = 12
{'A': 13, 'B': 13, 'C': 12, 'D': 13, 'E': 12, 'F': 12, 'G': 13, 'H': 13}
max-min = 1

G さん（金曜全休）も 13 日働ける解が見つかりました。希望休のある C / E と、希望休のない F が 12 日、その他は 13 日。全員が 12 か 13 のどちらかに収まり、H も 13 日に戻りました。

数式 1 行を足しただけで、解そのものが論理的に変わる。**この「微調整の効きやすさ」**が、手作業や単純な自動割付にはない最適化のメリットです。
ちなみに、総シフト 101 を 8 名で割った理論値は 12.625。整数解では全員を 12 か 13 に収めるのが数学的な限界で、今回はその限界ギリギリの最も公平なパターンを引き当てたことになります。

ワンポイント: ここで constraints_v2 を作ったとき、制約 2-4 は前のリストから流用しました。REPL なので前のセルで作った変数がそのまま使えるのが効率的です。専用ソフトを立ち上げて設定ファイルを書き直すより、Python の dict と list を数行弄って即実行する方が、現場の感覚には合っているはずです。



セル 15：Excel カレンダーに出力する
openpyxl で色付き Excel に：
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "2026年5月"

fills = {
    "早": PatternFill(start_color="FFF9C4", end_color="FFF9C4", fill_type="solid"),  # 黄
    "遅": PatternFill(start_color="C5E1A5", end_color="C5E1A5", fill_type="solid"),  # 緑
    "休": PatternFill(start_color="E0E0E0", end_color="E0E0E0", fill_type="solid"),  # 灰
}
weekend_fill = PatternFill(start_color="FFE4E1", end_color="FFE4E1", fill_type="solid")
holiday_fill = PatternFill(start_color="FFD180", end_color="FFD180", fill_type="solid")
preferred_off_fill = PatternFill(start_color="B3E5FC", end_color="B3E5FC", fill_type="solid")

# 1 行目: 日付ヘッダー
ws.cell(row=1, column=1, value="従業員").font = Font(bold=True)
for d in range(n_days):
    di = days_info[d]
    label = str(di["day"]) + "(" + di["weekday"] + ")"
    cell = ws.cell(row=1, column=d+2, value=label)
    cell.font = Font(bold=True)
    cell.alignment = Alignment(horizontal="center")
    if di["is_holiday"]:
        cell.fill = holiday_fill
    elif di["is_special"]:
        cell.fill = weekend_fill

# 2 行目: 祝日名
for d in range(n_days):
    di = days_info[d]
    if di["is_holiday"]:
        cell = ws.cell(row=2, column=d+2, value=di["holiday_name"])
        cell.font = Font(italic=True, size=8, color="C04000")
        cell.alignment = Alignment(horizontal="center", wrap_text=True)

# 3 行目以降: 8 名のシフト
for p in range(n_persons):
    p_name = persons[p]
    ws.cell(row=p+3, column=1, value=p_name).font = Font(bold=True)
    prefs = PREFERENCES.get(p_name, {})
    for d in range(n_days):
        di = days_info[d]
        s = schedule2.get((p, d), 2)  # 応用 1 の結果を出力
        label = ["早", "遅", "休"][s]
        cell = ws.cell(row=p+3, column=d+2, value=label)
        cell.alignment = Alignment(horizontal="center")
        is_pref_off = (di["weekday_idx"] in prefs.get("weekly_off", [])
                       or di["iso"] in prefs.get("date_off", []))
        cell.fill = preferred_off_fill if (is_pref_off and s == 2) else fills[label]

ws.freeze_panes = "B3"
wb.save("shift_2026_05.xlsx")
print("Excel saved: shift_2026_05.xlsx")

→ コンソール: Excel saved: shift_2026_05.xlsx
→ ドライブ タブを開くと shift_2026_05.xlsx が現れます。クリックでダウンロードして、Excel で開けばそのまま現場配布できます。サイズは 7KB 程度なのでメール添付も問題なし。


セル 16：パラメタを変えて再計算してみる
ここまでで、シフト作成の土台が完成しました。あとは制約を変えて何度でも再実行できます。
# 「月曜の早番を 3 名にしたい」と思ったら:
WEEKDAY_REQUIREMENTS[0] = (3, 1)
# その後、セル 12 を再実行 → 5 秒で新しいシフト表

# 「H さんも金曜は休にしたい」と思ったら:
PREFERENCES["H"] = {"weekly_off": [4]}
# その後、セル 11 を再実行

# 「6 月のシフトを作りたい」と思ったら:
# year, month = 2026, 6
# n_days = 30
# HOLIDAYS_2026 に 6 月分を追加
# セル 3 から再実行

このサイクルが数十秒で回せるので、現場のフィードバックを取り込みながら調整できます。
fudebako のような REPL 環境で最適化を回すメリットは、この試行錯誤の速さです。専門ソフト（ライセンスは年間数百万円のこともあります）も AI コーディングアシスタント（月額サブスク）も使わずに、会社 PC のブラウザだけで完結します。


まとめ
会社 PC でシフト表を作る方法をまとめました：


fudebako で外部通信なしの Python 環境を起動（HTML 1 枚）

scipy.optimize.milp で 0/1 整数計画法を求解（70 年の最適化研究の蓄積）

openpyxl で色付き Excel カレンダーに出力（現場配布可能）
制約を 1 行変えるだけで再計算 → REPL 的に試行錯誤

「数理最適化」と聞くと専門家しか触らないイメージがありますが、scipy.optimize.milp は無料で、書き慣れた Python の dict と for ループだけで使えます。
この仕組みはいろんな業務に応用が効きます。看護師さんの 3 交代（日勤・準夜・深夜）に夜勤明け休を加えるパターンも、制約の形を少し変えれば組めます。配送ルートの最適化（巡回セールスマン問題）も同じ系統ですが、規模が大きいと別のアプローチが必要になります。会議室や席の割り当ては二項マッチングで済むことも多く、わざわざ MILP まで持ち出さなくてもよかったりします。
関連記事：

会社 PC に Python が入れられない人へ：ブラウザだけで動く秘密道具「fudebako」
Microsoft markitdown はどこまで使えるか — PDF / エクセル / 画像を fudebako で検証



動画化・転載歓迎
この記事の内容を YouTube 動画 / Podcast / 社内資料 等に転載される際は、自由にお使いください。素材（デモ動画 / スクショ / ロゴ）は GitHub の assets/press-kit/ に置いてあります（CC0 相当）。事前連絡は不要ですが、コメント欄や DM でお知らせいただけると今後の参考にさせていただきます。
fudebako のフィードバックや業務での使用例、コメント欄などでお寄せいただけると嬉しいです。
4Go to list of users who liked7Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
