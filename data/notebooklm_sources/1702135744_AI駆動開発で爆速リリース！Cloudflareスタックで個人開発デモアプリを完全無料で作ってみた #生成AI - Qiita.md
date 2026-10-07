# AI駆動開発で爆速リリース！Cloudflareスタックで個人開発デモアプリを完全無料で作ってみた #生成AI - Qiita
- **Source URL**: https://qiita.com/t0hara/items/949b9dd2940d455aa938
- **Score**: 78
- **AI Summary**:
  - CloudflareのPages, Workers, D1, Workers AIを統合したフルスタック構成の解説
  - Llama-3.1-8bを活用したWorkers AIによる自然言語処理の実装フローを具体化
  - 独自JWT認証とHttpOnly Cookieを組み合わせた、サーバーレス環境での認証基盤構築手順
- **Read Now Reason**: AI駆動開発と自動化パイプラインの構築において、Cloudflareの無料枠のみでDB、認証、LLM実行まで完結させる極めて効率的なアーキテクチャ設計が示されており、現在のプロジェクトのコスト・速度向上に即適用可能です。
- **Suggested Tags**: #Cloudflare, #AI駆動開発, #WorkersAI, #Hono, #サーバーレスアーキテクチャ
- **Processed Date**: 2026/5/7

---

## 本文
Cloudflareの無料スタック（Pages / Workers / D1 / Workers AI）と生成AIを活用し、Next.js × Hono構成で個人開発アプリを構築しました。
JWT認証や自然言語コメント生成など、実際に使えるAI駆動開発のプロセスを紹介します。

1. 🔰はじめに

この記事で伝えたいこと
先日、社内のエンジニア・デザイナー向け勉強会で「個人開発のすすめ」というテーマで登壇しました。生成AIやクラウドサービスを活用すれば、個人でも驚くほど手軽にアプリを作れる時代です。この発表が好評だったこともあり、今回はその内容をベースに Qiita で記事を書くことにしました。
技術の進化によって、個人開発のハードルは劇的に下がっています。
副業や技術ポートフォリオとして注目される中、「0→1の開発を体験してみたい」「今っぽい構成でサービスを作ってみたい」と感じている方も多いのではないでしょうか。
本記事では、Cloudflare の無料枠（Pages / Workers / D1 / Workers AI）を活用し、生成AIとともに爆速で個人開発を進めたプロセスを紹介します。
この記事が、「これなら自分でもできそう」と一歩を踏み出すきっかけになれば嬉しいです。

対象読者

個人開発に興味がある方
お金をかけずにWebアプリを作ってみたい方
Cloudflareのスタックを試してみたい方
AIを使った開発やバイブコーディングに興味がある方
とにかく「爆速で0→1」をやってみたい方


デモアプリの概要
学習ログを記録し、過去の履歴に応じてAIがモチベーションコメントを自動生成してくれるアプリです。
ユーザーごとにログインして記録を管理できる、シンプルながらも実用性のある構成になっています。
学習ログ


2. 🧠なぜAI駆動開発なのか？
個人開発は、企画から設計、実装、デプロイ、運用に至るまで、すべてを一人でこなす必要があります。これは大きなやりがいがある一方で、技術的な知識の壁にぶつかりやすく、決してラクな道ではありません。
さらに、個人開発においてもう一つ大きな課題になるのが「まとまった時間の確保」です。本業の合間を縫って開発する中では、調べ物や試行錯誤にかける時間がどうしても限られてしまいます。
この「知識」と「時間」の2つのハードルを一気に下げてくれる存在が、今の生成AIです。
企画段階の壁打ちから、設計支援、コード生成、レビューまで幅広く活用できるAIを相棒として使うことで、よりスムーズかつ高速に開発を進めることが可能になります。

3. 🏗️アプリの全体構成と技術スタック
今回のデモアプリでは、Cloudflareの無料枠をフル活用し、以下のような構成で開発・公開を行いました。Next.jsでUIを構築し、APIやDB、AI連携まで、1円もかけることなくすべてCloudflare上で完結させています。

技術構成（役割と選定理由）



技術
用途




Next.js（Pages Router、SSG）
フロントエンドの構築（静的生成＋一部クライアント呼び出し）


Tailwind CSS
UIスタイリング


Cloudflare Pages
Next.jsアプリのホスティング


Cloudflare Workers + Hono
APIサーバ（ログ操作・認証・AI連携など）


Cloudflare D1
SQLiteベースのクラウドDB（学習ログ、ユーザー情報）


Cloudflare Workers AI
コメント生成用の自然言語AIエンドポイント




💡なぜこの構成にしたのか？

すべてCloudflare上で完結できる → 管理がシンプルで無料枠でも充分
Next.js（SSG）× Hono（API） → 表と裏の責務分離が明確で開発しやすい
D1（SQLite互換） → 手軽に扱えてスキーマ設計も直感的
Workers AI → 独自にモデルを用意しなくても文章生成がすぐに使える


※構成図は筆者が生成AIで作成

4. 🧱実装のポイント
今回のデモアプリでは、「学習ログの記録」「AIによるコメント生成」「ログイン状態の維持」といったシンプルかつ最小限の機能を中心に実装しました。個人開発ではMVP（Minimum Viable Product）を意識し、まずは動くものをリリースすることが重要です。
以下ではそれぞれの要点を簡単に紹介します。

4.1 学習ログの登録と取得（Cloudflare D1）
Cloudflare D1を使い、SQLiteライクなスキーマでログとユーザー情報を管理します
-- 学習ログテーブル
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  duration INTEGER NOT NULL,
  memo TEXT,
  ai_comment TEXT,
  created_at TEXT NOT NULL
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  password_hash TEXT
);


4.2 コメント生成（Cloudflare Workers AI）
Cloudflare Workers AIを使うとCloudflare Workers（API）から簡単に生成AIのモデルを利用することができます。単なるCRUDのデモアプリでは面白みに欠けると感じたため、生成AIを使って学習ログの内容に対する一言コメントを生成して学習ログと共に登録する機能にしました。コストゼロで自然言語生成ができる点は、Workers AIの大きな魅力です。
今回は日本語生成が可能なモデルを使いたかったため、@cf/meta/llama-3.1-8b-instruct-fastを採用しました。プロンプトには過去5件の学習ログと今回の内容を含め、ユーザーを励ます一言コメントを生成する構成にしています。
Prompt 例：
const prompt = `
これまでの学習内容:
${history}

今回の学習内容:
${content}

ユーザーを励ます一言コメントを日本語で1文で生成してください。丁寧でやさしい口調でお願いします。
`


4.3 ユーザー認証（独自JWTベース）
ユーザー認証には、独自実装のJWT（JSON Web Token）方式を採用しています。ログイン時にJWTを発行し、HttpOnly Cookieとして保存することで、以降のAPIリクエストに対する認証を実現しています。
今回フロントエンドはNext.js（SSG）で構成し、Cloudflare Pagesにホスティングしているため、どのように認証処理を挟むかのイメージが最初は持てていませんでした。
その課題に対して生成AIに相談したところ、このJWT ＋ Cookie方式を提案され、採用することにしました。
実はJWTについて深く理解していなかったのですが、実装を通じて学びの多い仕組みでもありました。
ざっくりとした認証の流れは以下のとおりです：

ログイン時に、入力されたパスワードを照合
問題なければ、Hono側（Cloudflare Workers）で署名付きJWTを生成
JWTを HttpOnly Cookie にセットし、クライアントに返す
以降のAPIリクエストではCookie経由でJWTを自動送信
API側ではJWTを検証し、認証されたユーザー情報をリクエストに紐づけて処理を実行


5. 🚀デプロイと無料枠での運用
今回のアプリは、すべてCloudflareの無料枠だけで完結しています。
個人開発レベルであれば、費用を一切かけずにここまでできるというのは大きな魅力です。

商用利用や高負荷が必要でなければ、Cloudflareの無料枠で十分に運用可能です。

Cloudflare Pages / WorkersはGitHub連携によるCI/CDにも対応していますが、今回は最小構成＆手動デプロイ（CLI）ベースで構築しました。
以下にその手順を紹介します。

🛠️デプロイ手順（CLI）
0. Cloudflareアカウントへの認証
まずはwranglerコマンドをインストールし、Cloudflareアカウントと紐づけます。
npm install -g wrangler
wrangler login

1. Next.js（Pages Router / SSG）をCloudflare Pagesにデプロイ
※Next.jsプロジェクトをPages Routerで作成されており、SSGの最低限の設定が済んでいる前提とします

SSG生成

npm run build


デプロイ

npx wrangler pages deploy out --project-name=<プロジェクト名>

2. API（Hono + Cloudflare Workers）をデプロイ
npx wrangler deploy


wrangler.toml（またはwrangler.json/wrangler.jsonc）でname, compatibility_date, d1_databases, routes等が正しく定義されている必要があります。

3. D1（CloudflareのサーバレスSQLite）にマイグレーションを適用
3.1 任意のWorkersプロジェクトでD1を作成
wrangler d1 create <DB名>

3.2 D1とWorkersプロジェクトを紐づけ（d1_databases）
[[d1_databases]]
binding = "DB"
database_name = "<DB名>"
database_id = "<DB作成時に払い出されるid>"

3.3 マイグレーションを実行
wrangler d1 migrations create DB init-schema-and-seed
wrangler d1 migrations apply <DB名> --remote


6. 💡やってみてよかったこと・詰まったこと
個人開発アプリをCloudflareの無料スタック＋AI駆動で実装してみて、想像以上にスムーズに開発を進めることができました。その中で感じたこと、学びになったこと、そして多少ハマったことも含めて振り返ります。

✅ やってよかったこと


生成AIを開発のパートナーとして活用
デモアプリのブレストから始まり、仕様を整理したり、設計の壁打ちをしたり、コードスニペットを一緒に書いたりと、生成AIを「ペアプロ相手」として活用できたことで、短期間でデモアプリを公開することができました。特に初めて使う技術（D1やJWTなど）での疑問点の解消が早かったのが印象的です。


Cloudflareスタックの統一感と速さ
UI（Pages）、API（Workers + Hono）、DB（D1）、AI（Workers AI）がすべてCloudflareで完結しており、デプロイもCLIコマンド1発 or GitHub連携で即反映なので、運用面も含めて負荷が抑えられたと思います。そしてエッジ実行 × 静的配信の恩恵が受けられるため、アプリのパフォーマンスも爆速でした。
この「全部入り感」と「サクサク感」は、個人開発と相性がいいと感じました。


無料でここまでできる安心感
初期コストとランニングコストゼロでUI・API・DB・AIを含むフルスタックアプリを本番運用できるのは、趣味開発・ポートフォリオ作成・検証用プロダクトにおいて非常に魅力的です。



🤕 詰まったこと・ハマりどころ


Cookieベースの認証処理（Workers × Next.js）に悩んだ
SSG＋クライアント側fetchとの相性を考えると、どのタイミングでCookieを見るかを設計する必要がありました。Hono側でJWTを扱いつつ、フロントでは「ログイン状態をどう判定するか」の設計に少し悩みました。

日本語対応のAIモデル選定に手間取った
Workers AIのモデルは複数ありますが、日本語で自然な文を生成できるモデルが限られており、選定にやや時間がかかりました。当初試したモデルでは英語寄りの出力になってしまい、調整が必要でした。最終的には@cf/meta/llama-3.1-8b-instruct-fastを選びました。


7. 📚まとめ

Cloudflareは"全部入りサーバレス"として非常に優秀：無料、速い、楽
AI駆動開発は、技術的な課題と開発工数の課題を解決してくれる
個人開発ではMVP（Minimum Viable Product）を意識し、まずは動くものをリリースしよう


🔗補足・リンク
デモアプリ：学習ログ
https://learning-log-app.pages.dev/



GitHubリポジトリ
https://github.com/tohara811/learning-log-app
https://github.com/tohara811/learning-log-app-api
参考リンク
https://www.cloudflare.com/ja-jp/
https://www.cloudflare.com/ja-jp/developer-platform/products/workers-ai/
https://hono.dev/

KIYOラーニング株式会社について
当社のビジョンは『世界一「学びやすく、分かりやすく、続けやすい」学習手段を提供する』ことです。革新的な教育サービスを作り成長させていく事で、オンライン教育分野でナンバーワンの存在となり、世界に展開していくことを目指しています。


プロダクト


スタディング：「学びやすく・わかりやすく・続けやすい」オンライン資格対策講座

スタディングキャリア：資格取得者の仕事探しやキャリア形成を支援する転職サービス

AirCourse：受け放題の動画研修がついたeラーニングシステム（LMS）


KIYOラーニング株式会社では一緒に働く仲間を募集しています
