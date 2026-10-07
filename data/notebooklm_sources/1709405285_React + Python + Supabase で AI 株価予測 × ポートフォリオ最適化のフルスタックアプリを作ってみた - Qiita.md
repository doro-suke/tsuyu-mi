# React + Python + Supabase で AI 株価予測 × ポートフォリオ最適化のフルスタックアプリを作ってみた - Qiita
- **Source URL**: https://qiita.com/tetsu3-accord/items/6807dc6c7d2543ac19d3
- **Score**: 82
- **AI Summary**:
  - Amazon Chronos-Boltを用いたゼロショット時系列予測の実装と性能を解説。
  - GitHub ActionsとSupabaseを組み合わせた日次データパイプラインの構築手法を明記。
  - 平均分散最適化（MVO）を用いたポートフォリオ構築の数理モデルと実装例を紹介。
- **Read Now Reason**: Amazonの時系列基盤モデルを用いた推論をGitHub Actionsで自動実行し、Supabaseへ格納するパイプライン構成は、現在の自動化プロジェクトに即時適用可能な構成であるため。
- **Suggested Tags**: #Chronos-Bolt, #GitHub-Actions, #時系列予測, #Supabase, #Python-Pipeline
- **Processed Date**: 2026/5/9

---

## 本文
開発の背景
はじめまして, 私は普段、メガベンチャーのSenior DataScientistとして働いているTetsu3です。本業では小売の時系列予測モデルの開発、需要予測やダイナミックプライシングで機械学習による商品の値付けをしています。現在はバックエンドだけでなくフロントエンドも含めたアプリ開発を学ぶために経験者専門プログラミングスクールJISOUで体系的なアプリ開発を学んでいます。
今回、Reactの個人開発プロジェクトとして、株式投資用のアプリStockForecastを作成しました。簡単に開発の背景をお話しします。昨今、NISAによる資産運用が幅広い世代の注目を集めています。NISAユーザーの多くの方は信託報酬の低さと安定したパフォーマンスが期待できることからインデックスファンドeMaxis Slim 全世界株式(通称オルカン)を購入される方が多いと思います。
ただ、中には投資信託から一歩進んで個別株にもチャレンジしてみたい、そう思う人も少なからずいるでしょう。この場合、自分でポートフォリオを組む必要が出てくるので途端にハードルが上がります。例えば、株式投資の知識が必要だったり、日本株、米国株、債券などの組み合わせ方、実際のポートフォリオの価値はどう推移しそうなのか、いろいろなことを考える必要が出てくるからです。
そこで今回、個別株にもチャレンジしてみたい、個別株でポートフォリオを組んでみたいという方向けに、StockForecatを開発しました。StockForecastは株式投資をもっと身近にをコンセプトにアプリで上で個別株価の予測やポートフォリオの構築支援を行うアプリケーションです。

注意:このアプリはあくまで金融リテラシー向上を目的としたシミュレーション用のアプリです。投資助言ではありません。実際の投資判断はご自身の責任で行ってください。



StockForecastは次のような3つの特徴を持っています。

米国株、日本株、債券、実物資産の代表的な76の銘柄を中心に個別銘柄の株価予測を行う
ポートフォリオを組んで価値の時系列予測を行う
選択した銘柄で戦略を選択して銘柄の保有比率を最適化する


使い方

銘柄ごとの株価の予測


ポートフォリオの予測


ポートフォリオ最適化


技術スタック
使用した技術スタックは以下の通りで、Frontend部分はReact(TS)をベースとしています。

今回はフロントエンドとバックエンドに加えて、Pythonによる機械学習パイプラインが含まれています。この機械学習パイプラインでは対象の銘柄に対して、Amazonの時系列基盤モデルであるChronos Boltを使ったゼロショット予測をバッチジョブとして、GitHub Actions上で定期実行しています。
これをSupabase上に保存し、予測結果として読み出すことでUI上ではスムーズに予測結果を表示することが可能です。



レイヤー
採用技術




フロントエンド
React / TypeScript / Vite / Tailwind CSS / Recharts


バックエンド (API)
Supabase


データベース
PostgreSQL


認証
Supabase Auth


データパイプライン / ML
Python (yfinance + Chronos-Bolt) on GitHub Actions


数値計算 (クライアント側)
MVO (勾配降下法)


CI/CD
GitHub Actions


デプロイ
Vercel (Frontend) / Supabase (DB)




今回挑戦したこと
普段はデータサイエンティストとして時系列予測や数理最適化を行っていることもあり、今回のアプリにも本業のデータサイエンスの知識を取り入れた開発を行いました。ここではいくつかご紹介します。

① Amazon Chronos-Bolt による時系列予測
株価予測には Amazon Research が公開している Chronos-Bolt を使用しました。これは時系列特化の Transformer ベースの基盤モデルで、ファインチューニング不要で多様な時系列に zero-shot で予測ができるのが特徴です。
from chronos import ChronosBoltPipeline
import torch, yfinance as yf

# 過去730日の価格を取得
df = yf.download("AAPL", period="730d")
prices = df["Close"].values

pipeline = ChronosBoltPipeline.from_pretrained(
    "amazon/chronos-bolt-small", torch_dtype=torch.float32
)

# 60日先まで予測 (中央値・5%・95%分位)
context = torch.tensor(prices.astype("float32")).unsqueeze(0)
out = pipeline.predict(context, prediction_length=60)[0].numpy()

Chronos-BoltはChronosのシリーズでも軽量なモデルです。これを76銘柄分まわすと約12-15分。ある程度銘柄数を増やしてもスケールする計算時間です。もちろん、大きいモデルを使った方が予測精度は高くなるので実際にはバランスをとった方が良いです。

②ポートフォリオ最適化(MVO)の実装
ポートフォリオ作成のために銘柄を複数選択し、何にどれだけ投資するかを判断する必要があります。この最適化には平均分散最適化 (Mean-Variance Optimization, MVO)を用いています。これは直感的にいうと、リターンは高い方がいいが、リスクは低い方がいいというトレードオフを、数学的に定式化し、最適化する方法論です。詳細な理論については、Appendixに記しますが、簡単にいうとポートフォリオのリターンとリスクを計算し、その比を取った量(シャープレシオ（Sharpe Ratio）と呼ばれる)を最大化します。

③ Supabase + GitHub Actions による日次データパイプライン
このアプリでは単に今の株価を取得するだけでなく、Dailyで各株価をChronos-Boltで予測しています。
この予測はもちろん基盤モデルを使っているので一瞬で終わるわけではなく、バッチ処理する必要があります。そこで、毎日のデータ更新は GitHub Actions の cron で回しています。
on:
  schedule:
    - cron: "0 15 * * 1-5"   # JST 0:00 平日
  workflow_dispatch:
  push:
    paths: ["config/tickers.json", "scripts/**"]

config/tickers.json を変更すると 自動でワークフローが再実行される ようにしているので、銘柄を増やすときも config を編集して push するだけで全銘柄分の予測が再生成されます。
ワークフローの中身:

yfinance で過去価格取得
Chronos-Bolt で予測

Supabase の forecasts テーブルに upsert (フロントから一括 fetch)

JSON ファイルとしてリポジトリにコミット (フロントの履歴チャート用)


Appendix

ポートフォリオ最適化の理論
このアプリの中核となる 平均分散最適化 (Mean-Variance Optimization, MVO) の理論をまとめておきます。1952 年に Harry Markowitz が発表した古典理論で、彼はこの業績で 1990 年にノーベル経済学賞を受賞しています。

解こうとしている問題

「N 個の銘柄に どの比率で 投資すれば良いか?」

各銘柄に重み $w_i \in [0, 1]$ を配分し、$\sum w_i = 1$ を満たすベクトル $\mathbf{w} = (w_1, w_2, \ldots, w_N)$ を 何らかの基準 で最適化する問題です。

2つの基本統計量
① 期待リターン $\mu_i$
各銘柄 $i$ の期待リターン。本アプリでは Chronos の予測平均を年率換算した値を使用:
$$\mu_i = \frac{\hat{P}_T - P_0}{P_0} \cdot \frac{252}{H}$$
ここで $H = 60$ は予測期間 (営業日)、$252$ は年間営業日数。
ポートフォリオ全体の期待リターン:
$$\mu_p = \mathbf{w}^\top \boldsymbol{\mu} = \sum_{i=1}^{N} w_i \mu_i$$
→ 各銘柄リターンの加重平均。直感的。
② リスク (分散) $\sigma_p^2$
各銘柄のリターンのばらつき・銘柄間の連動性を 共分散行列 $\Sigma$ で表現:
$$\Sigma_{ij} = \mathrm{Cov}(R_i, R_j)$$
ポートフォリオ全体の分散:
$$\sigma_p^2 = \mathbf{w}^\top \Sigma \mathbf{w} = \sum_{i=1}^{N} \sum_{j=1}^{N} w_i w_j \Sigma_{ij}$$

(余談)なぜ分散投資が効くのか
2銘柄ポートフォリオで $\sigma_p^2$ を展開すると:
$$\sigma_p^2 = w_1^2 \sigma_1^2 + w_2^2 \sigma_2^2 + 2 w_1 w_2 \rho_{12} \sigma_1 \sigma_2$$
ここで $\rho_{12}$ は 相関係数 ($-1 \le \rho \le 1$)。



相関 $\rho_{12}$
リスク削減効果




$+1$
全くなし (両銘柄が同調)


$0$
中程度 (独立)


$-1$

完全に消せる (理論上)



→ 相関の低い銘柄を組み合わせる と $\sigma_p$ が小さくなる。よく株式投資をする際にポートフォリオを組むときは株式と債券みたいに値動きが反対のものを組み合わせると良いと言われますが、背後にはこのような理屈が潜んでいるわけですね。

ポートフォリオ戦略の数学的定式化
本アプリでは選ぶ目的関数によって異なる最適化問題を解くことになりますが、最も代表的なMax Sharpeについて解説します。
Max Sharpe (リスクあたりリターン最大化)
目的関数は以下の通りです。
$$\max_{\mathbf{w}} \frac{\mathbf{w}^\top \boldsymbol{\mu} - r_f}{\sqrt{\mathbf{w}^\top \Sigma \mathbf{w}}}$$
ここで $r_f$ は リスクフリーレート (ここでは、年率4%と仮定)。
分子はリスクなしで得られるリスクフリーレートと比較してどれだけリターンが生じたか、分母はポートフォリオの変動、つまり、リスクです。この比をとっているため、リスクあたりのリターンということになります。これを勾配降下法を使って、最適解を求めます。

JISOU のメンバー募集中！
プログラミングコーチング JISOU では、新たなメンバーを募集しています。
日本一のアウトプットコミュニティでキャリアアップしませんか？
興味のある方は、ぜひホームページをのぞいてみてください！
▼▼▼
JISOU | 経験者専門プログラミングスクール
https://projisou.jp
