# IT未経験の20代がAIを使ってGitHubトレンドを毎日自動解説するサイトを作った話 #Python - Qiita
- **Source URL**: https://qiita.com/vivi5151/items/bb7f96618be2272a8413
- **Score**: 65
- **AI Summary**:
  - GitHub Actionsを活用したトレンド取得から静的サイト生成、デプロイまでの自動パイプライン構成
  - GroqやGemini等の無料枠AIを優先順位付きで切り替える、エラー耐性の高いAPI連携実装
  - GitHub Actionsの書き込み権限(403)やpush競合を解消する、具体的で実用的な設定例
- **Read Now Reason**: 現在のプロジェクトである自動化パイプライン構築に直結する、GitHub Actionsと複数のAI APIを組み合わせた具体的なワークフローがコード付きで解説されているため。
- **Suggested Tags**: #GitHubActions, #Python, #AI自動化, #CI/CD, #Vercel
- **Processed Date**: 2026/5/9

---

## 本文
はじめに
こんにちは！
仕事でコードを書きながら「もっと技術トレンドをキャッチアップしたい」と思い続けていたのですが、GitHubのトレンドページって英語で読むのがしんどい...
そこで「だったら自分で作ろう！」と思い立ち、GitHubのトレンドリポジトリをAIが毎日自動で日本語解説してくれるサイトを作りました。
👉 GitHub トレンド日本語解説



作ったもの
GitHub トレンド日本語解説というサービスです。
毎朝7時にGitHubのトレンドリポジトリを自動取得して、AIが日本語でわかりやすく解説してくれます。

機能一覧

毎日自動更新（GitHub Actions で毎朝7時に実行）
AIによる日本語タイトル・要約・詳細解説の自動生成
言語フィルター（Python、Go、Rustなど絞り込み可能）
難易度バッジ（🌱初心者向け / 📈中級者向け / 🚀上級者向け）
関連するUdemyコースのリンク表示
過去のトレンドアーカイブ（日別・週別）



技術スタック



カテゴリ
使用技術
料金




スクレイピング
Python + BeautifulSoup
無料


AI解説生成
Groq / Gemini / Cerebras
無料


静的サイト生成
Jinja2
無料


自動実行
GitHub Actions
無料


ホスティング
Vercel
無料


アフィリエイト
Udemy (Impact.com)
無料



運営コスト：月0円です！ 全部無料サービスだけで動いています。


システムの流れ
毎日こんな感じで動いています。
GitHub Actions（毎朝7時）
    ↓
① GitHubトレンドをスクレイピング
    ↓
② AI（Groq）でリポジトリを日本語解説
    ↓
③ 関連するUdemyアフィリエイトリンクを付与
    ↓
④ Jinja2で静的HTMLを生成
    ↓
⑤ GitHubにコミット＆Vercelに自動デプロイ

コードで書くとこんな感じです。
# main.py（パイプラインの核心部分）
def run():
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Step1: GitHubトレンドを取得
    fetcher.run(date)

    # Step2: AIで日本語解説を生成
    explainer.run(date)

    # Step3: アフィリエイトリンクを付与
    affiliate.run(date)

    # Step4: 静的サイトを生成
    site_generator.run(date)



AIは全部無料で使える！
最初はOpenAIを使おうとしたのですが、API料金がかかることに気づいて断念...
調べてみると無料で使えるAI APIがいくつかあることがわかりました。



サービス
特徴




Groq
超高速・無料枠が太っ腹


Gemini
Googleの最新モデルが無料


Cerebras
大容量の無料枠あり



優先度をつけて、失敗したら次に切り替える形で実装しました。
# ai_client.py（優先順位付きでAPIを切り替える）
def generate(prompt: str) -> str:
    # まずGroqを試す → 失敗したらGeminiへ → それも失敗したらCerebrasへ
    for provider in [_groq, _gemini, _cerebras]:
        try:
            return provider(prompt)
        except Exception:
            continue
    raise RuntimeError("すべてのAI APIが失敗しました")



ハマったところ

その1：GitHub Actions のプッシュ権限エラー
GitHub Actionsから自動でコミット＆プッシュしようとしたら403エラーが出ました。
remote: Write access to repository not granted.

原因は2つあって、


permissions: contents: write をyamlに追加
git pushのURLをトークン付きに変更

# .github/workflows/daily.yml
jobs:
  update:
    permissions:
      contents: write   # ← これを追加！
    steps:
      - name: Commit generated files
        run: |
          git push https://x-access-token:${{ secrets.GH_TOKEN }}@github.com/...

これで解決しました。同じエラーで詰まる人が多そうなので書いておきます。

その2：git push が rejected される
GitHub Actionsが自動コミットした後でローカルからpushしようとすると弾かれることがありました。
! [rejected] HEAD -> main (non-fast-forward)

これは git pull --rebase && git push で解決。当たり前といえば当たり前なんですが、最初はパニックになりました笑


工夫した点

言語フィルター
カード上部に言語フィルターを配置しました。JavaScriptだけで実装していてサーバー不要です。
function filterLang(lang) {
  document.querySelectorAll('.repo-card').forEach(card => {
    const show = lang === 'all' || card.dataset.lang === lang;
    card.style.display = show ? '' : 'none';
  });
}


難易度バッジの自動判定
AIが生成した「こんな人におすすめ」テキストから難易度を自動判定してバッジ表示します。


recommended_for に「初心者」「入門」が含まれる → 🌱 初心者向け（緑）
「中級」が含まれる → 📈 中級者向け（黄）
「上級」「経験者」が含まれる → 🚀 上級者向け（赤）



収益化の仕組み
個人開発でも稼げるようにしたいと思って、最初から収益化を考えて設計しました。
現在は Udemyのアフィリエイト（Impact.com） を導入しています。
リポジトリの言語に応じて関連するUdemyコースを自動で表示するようにしました。例えばPythonのリポジトリには「Python完全習得コース」、Rustなら「Rustプログラミング完全入門」といった具合です。
まだ審査待ちですが、将来的にはGoogle AdSenseも申請予定です。


今後やりたいこと


UI改善

カスタムドメイン取得



おわりに
IT未経験から始めて、最初はHello Worldで感動していた自分が、こういうサービスを作れるようになりました。
「作りたいものを作る」というのが一番の勉強になると実感しています。
同じようにトレンドを追いたい方、ぜひ使ってみてください！
👉 GitHub トレンド日本語解説

「こんな機能があったら便利」「UIここが見づらい」などのご意見、大歓迎です！
コメント欄か、サイト下部の 「💬 サイトの改善のご意見・ご要望はこちら」 からお気軽にどうぞ。一人で開発しているので、フィードバックが本当に励みになります🙏
