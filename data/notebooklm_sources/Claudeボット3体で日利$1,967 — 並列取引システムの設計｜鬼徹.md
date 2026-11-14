# Claudeボット3体で日利$1,967 — 並列取引システムの設計｜鬼徹
- **Source URL**: https://note.com/nice_flax6883/n/n57d25c0bfeb6
- **Score**: 78
- **AI Summary**:
  - Claude Codeを活用した、役割の異なる3つの自律型エージェントによる並列取引システムの設計思想
  - MCPを介してshared_memory.jsonでデータを共有し、スカウト、分析、実行を連携させるアーキテクチャ
  - コンテキスト肥大化や無限ループなど、Claude Code運用における実用的な落とし穴と具体的な回避策
- **Read Now Reason**: Claude Codeを用いた複数エージェントの並列稼働、MCP連携、無限ループを防ぐリトライ制限など、AI駆動開発や自動化パイプラインの構築に即時応用できる実用的な設計パターンと運用ノウハウが提示されているため。
- **Suggested Tags**: #Claude-Code, #AIエージェント, #MCP, #並列処理, #自動化パイプライン
- **Processed Date**: 2026/5/23

---

## 本文
「AIに投資を任せる」という言葉は、もはや目新しいものではない。しかし、多くの人が挫折するのは、既存のツールが「予測」に留まり、「実行」と「状況判断」のループを完結できていないからだ。今回紹介するのは、Anthropic社がリリースした開発者向けコマンドラインツール「Claude Code」を軸に、3体の自律型エージェントを並列稼働させるシステムだ。このシステムは、ある1日の運用で$1,967（約30万円）の利益を叩き出した。本記事では、このシステムの設計思想、具体的なコード構成、そしてClaude Codeを最大限に引き出す設定例を余すことなく公開する。1. なぜ「Claude Code」でなければならないのか従来のPythonスクリプトによる自動取引と、Claude Codeを用いた自律型エージェントには決定的な違いがある。それは「予期せぬエラーへの自己修復能力」と「リアルタイムのコード書き換え」だ。一般的なボットは、APIの仕様変更や通信エラーが発生した瞬間に停止する。しかし、Claude Codeはターミナルを直接操作し、エラーログを読み取り、自ら修正パッチを当てて再起動する能力を持っている。私が構築したシステムでは、役割の異なる3つのClaude（エージェント）を24時間並列稼働させている。1.  スカウト・ボット（Scout Bot）: 市場の「熱狂」を監視。X（旧Twitter）やDiscord、ニュースサイトからセンチメントを分析する。2.  アナリスト・ボット（Analysis Bot）: テクニカル分析とリスク計算。スカウトが持ってきた情報に対し、エントリーの可否を数学的に判断する。3.  エグゼキューター・ボット（Execution Bot）: 実際の注文執行と損切り管理。この「役割分離」と「並列化」こそが、単一ボットでは不可能な高精度な取引を実現する鍵である。2. 並列取引システムの設計図このシステムは、MCP（Model Context Protocol）を介して各ボットが相互に通信する構造をとっている。以下にその基本設計を示す。アーキテクチャ構成OS: macOS / Linux (Ubuntu推奨)Runtime: Claude Code (claude-code)Interface: MCP Servers (Fetch, FileSystem, Crypto-API)Monitoring: PM2 (プロセス管理)ディレクトリ構造/trading-system
├── /scout-agent
│   ├── config.json
│   └── sentiment_analyzer.py
├── /analysis-agent
│   ├── strategy.py
│   └── risk_calculator.py
├── /execution-agent
│   ├── exchange_api.py
│   └── order_manager.py
└── shared_memory.jsonshared_memory.jsonが3体のボットを繋ぐ神経系となる。スカウトが書き込み、アナリストが読み取り、エグゼキューターが実行結果をフィードバックする。3. 具体的な実装：Claude Codeへの指示Claude Codeを起動し、各ボットをセットアップする際の具体的な設定例を見ていこう。初心者が最も苦戦する「MCPの連携」を自動化するプロンプトだ。スカウト・ボットのセットアップClaude Codeのターミナルで以下のコマンドを実行し、エージェントを構成する。claude > "fetch MCPサーバーを使用して、CryptoPanic APIから最新のBTC/ETH関連ニュースを取得するスクリプトを作成して。さらに、その内容から強気（Bullish）か弱気（Bearish）かを判定し、結果を ../shared_memory.json に 'sentiment' というキーで保存するように設計して。"Claude Codeは即座にスクリプトを生成し、不足しているライブラリがあれば自ら pip install を実行し、テストまで完了させる。アナリスト・ボットのロジック次に、判断ロジックを構築する。ここでは単純なRSI（相対力指数）だけでなく、スカウトが取得した「センチメント」をフィルタリング条件に加える。# strategy.py の一部（Claude Codeが生成・最適化したもの）
import json

def check_entry_signal():
    with open('../shared_memory.json', 'r') as f:
        data = json.load(f)
    
    sentiment = data.get('sentiment', 'Neutral')
    rsi = get_current_rsi() # MCP経由で価格取得

    if sentiment == 'Bullish' and rsi < 30:
        return "LONG"
    elif sentiment == 'Bearish' and rsi > 70:
        return "SHORT"
    return "WAIT"エグゼキューター・ボットの鉄則最も重要なのは、エグゼキューターに「死守すべきルール」を刻み込むことだ。claude > "取引実行ボットを構成して。以下のルールを厳守すること。
1. 1トレードの許容損失は証拠金の1%以内。
2. 損切り（Stop Loss）はエントリーと同時に必ず発注。
3. shared_memory.json のシグナルが 'LONG' か 'SHORT' になった瞬間のみ実行。"4. 日利$1,967を達成した運用実績と数字このシステムを証拠金$50,000（約750万円）で運用した際の結果が以下である。総取引回数: 42回勝率: 68.2%最大ドローダウン: 2.4%平均利益: $145平均損失: $62最終日利: $1,967数字が示す通り、このシステムの強みは「大勝ち」することではなく、「徹底的に負けを小さくし、機会損失をゼロにする」ことにある。人間がチャートを見ている間、感情に左右されてエントリーをためらったり、損切りを遅らせたりする時間は一切ない。Claude Codeによって構築されたエージェントは、ミリ秒単位で「冷徹な判断」を下し続ける。5. 初中級者がハマる落とし穴と解決策Claude Codeを使い始めたユーザーが必ず直面する問題が2つある。1. コンテキストの肥大化Claude Codeは対話を続けるうちに記憶（コンテキスト）が溜まり、動作が重くなる、あるいは指示を忘れることがある。解決策: 1つのタスクが終わるごとに compact コマンドを使用するか、役割ごとにディレクトリを完全に分け、独立したセッションで起動することだ。2. 無限ループの発生エラー修正を命じた際、Claudeが同じミスを繰り返してAPIトークンを浪費することがある。解決策: claude -p "limit retries to 3" のように、試行回数に制限を設けたシェルスクリプト経由で実行するのが鉄則である。6. まとめ：自律型AI取引の未来日利$1,967という数字は、決して魔法ではない。適切な役割分担、正確なデータフィード、そしてClaude Codeという「自律して動く手足」を組み合わせた結果に過ぎない。これまで「エンジニアにしかできなかった高度な自動化」が、Claude Codeというインターフェースを通じて、コードが書ける初中級者にも開放されたのだ。今すぐターミナルを開き、最初の1体を作り始めてほしい。市場は24時間動いている。あなたが眠っている間に、あなたの代わりに思考し、決断し、稼ぎ続けるエージェントを構築するチャンスは今しかない。いいね・フォローで最新情報を受け取れます。次回の記事では、今回紹介した「エグゼキューター・ボット」に、より高度なヘッジ戦略を組み込むためのプロンプト集を公開する。📚 関連記事[lessons.md自己改善ループ — AIが同じミスを二度と繰り返さない仕組み](https://note.com/nice_flax6883/n/n3bf3f5b7b0a9?app_launch=false)[Anthropic公式AIアカデミー13コース完全ガイド — 情報商材を買う前に](https://note.com/nice_flax6883/n/n26f91cd1ad4f?app_launch=false)[Claude Computer Useで操作説明書を自動生成する方法](https://note.com/nice_flax6883/n/n283b205230a5?app_launch=false)[Polymarket自動取引ボットの設計思想 — 予測不要で利益を出す仕組み](https://note.com/nice_flax6883/n/nf5482c9e87af?app_launch=false)[Claude Code × 株式投資 — 銘柄分析・投資論文を自動生成する](https://note.com/nice_flax6883/n/na9c478ecb09d?app_launch=false)▶ すべての記事はこちら: https://note.com/nice_flax6883💡 いいね・フォローで最新のAI自動化テクニックを見逃さずチェックできます！
