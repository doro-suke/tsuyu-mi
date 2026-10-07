# 売上予測ツールを個人開発してリリースした話——FastAPI + Prophet + React
- **Source URL**: https://zenn.dev/mecharhythm/articles/bf4df65cbadb87
- **Score**: 42
- **AI Summary**:
  - FastAPIとProphetを組み合わせた時系列予測Webアプリの構成と実装事例の紹介
  - フロントエンドにReact、バックエンドにRenderを活用した小規模なフルスタック構成
  - Prophetの季節性・祝日処理の利便性とFastAPIでのCORS設定に関する技術的記録
- **Read Now Reason**: AIモデル（Prophet）をAPI化してWebアプリに統合する際の最小構成と、Render/Vercelを用いた具体的なデプロイ構成を把握できるため。
- **Suggested Tags**: #FastAPI, #Prophet, #時系列予測, #個人開発
- **Processed Date**: 2026/5/5

---

## 本文
はじめに
売上・需要予測ができるWebアプリ「SalesCast」を個人で開発してリリースしました。

機械学習の予測モデルをブラウザから誰でも使えるようにする、というコンセプトで作りました。この記事では、開発の経緯・技術構成・ハマりどころを中心に書いていきます。


 なぜ作ったのか
需要予測・売上予測は、在庫管理や事業計画で実務的に使われる技術です。しかし既存のツールは高額だったり、専門知識がないと使いこなせなかったりすることが多い印象でした。
「CSVを貼り付けるだけで予測グラフが出てくる」レベルのシンプルさで作れば、非エンジニアでも使えるのではないか——そう思ったのが出発点です。


 技術構成



レイヤー
技術




フロントエンド
React + Vite + Recharts


バックエンド
FastAPI


予測モデル
Prophet（Meta製）


デプロイ
Vercel（フロント）+ Render（バック）




 Prophetを選んだ理由
時系列予測のライブラリはいくつかありますが、Prophetは季節性・祝日効果の自動処理が優秀で、パラメータ調整が少なくて済みます。CSVを受け取ってそのまま予測に流し込む設計と相性が良かったです。


 主な機能
SalesCastでできることをざっくり紹介します。

 予測範囲の指定と統計サマリー
アップロードした売上データに対して、表示したい期間を自由に指定できます。
指定した範囲内の統計情報がリアルタイムで計算されます：

平均値
最大値・最小値

「この四半期だけ見たい」「特定のキャンペーン期間を切り出して分析したい」という場面に対応しています。


 グラフの保存
表示中のグラフをそのままPNG形式でダウンロードできます。資料作成やチームへの共有に使えます。


 開発でハマったところ

 CORSの設定
FastAPIとVercelを別ドメインで動かすため、CORSの設定が必要でした。開発中はallow_origins=["*"]でごまかしていましたが、本番では明示的にVercelのURLを指定しています。

main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://salescast.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)



 まとめ
個人開発でゼロからリリースまで持っていけたのは、FastAPIとProphetの組み合わせがシンプルで扱いやすかったおかげでもあります。
実際に使ってみてフィードバックいただけるととても助かります👇


GitHubはこちら → @Mecharhythm
