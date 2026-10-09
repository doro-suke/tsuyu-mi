# どのAIを使うかをJevで自動選択する「Jev Router」が登場、タスク難易度から適切なAIモデルを瞬時に判断可能でOpenRouterの既存ルーターより高精度
- **Source URL**: https://gigazine.net/news/20260928-openrouter-jev-router/?utm_source=x&utm_medium=sns&utm_campaign=x_post&utm_content=20260928-openrouter-jev-router
- **Score**: 58
- **Suggested Tags**: #OpenRouter, #LLMルーティング, #AIエージェント
- **Processed Date**: 2026/9/30

---

## 本文
2026年09月28日 13時20分
    AI
  
  





Introducing typesafe/jev-router: a cache-aware model router powered by Jev and @typesafeaiThe Jev Router picks the best model and reasoning effort for each request, balancing quality, speed, and cost.Here's how it works 👇🏻 pic.twitter.com/qHAAA44Iy6— OpenRouter (@OpenRouter) September 25, 2026
You've never routed like this before.@OpenRouter is bringing Jev to all of your LLM calls, so your agentic workflows never have to waste a token again.As always, faster, cheaper, more intelligent. Go build the future. https://t.co/OEqoIe0jxh— TypeSafe AI (@typesafeai) September 25, 2026


Jevは2026年9月15日に登場と同時に大きな注目を集め、世界中の開発者がJevの活用方法を模索しています。こうした流れの中で、AIゲートウェイサービスを展開するOpenRouterがJevを用いたモデルルーター「Jev Router」の提供を開始しました。

OpenRouterは数多くのAIモデルのAPIを扱っており、ユーザーは目的に沿ったAIモデルやモデルプロバイダーを単一のプラットフォームで管理することができます。使用するモデルは人間が手動で選択するだけでなく、ルーターと呼ばれる自動選択システムに任せることも可能。ルーターはユーザーが実行しようとしている処理の種類を分析して適切なAIモデルを割り当てます。

しかし、ルーターは「タスクの種類」は分析できても「タスクの難度」は分析していないとのこと。このため、簡単なタスクも難しいタスクも同一モデルに処理させることとなり、無駄が生じてしまいます。


Jev Routerでは、ユーザーのプロンプトをJevに入力して難度と精度を判断し適切なモデルを割り当てます。これにより、「簡単なタスクは安価な小規模モデルに割り当て」「難しいタスクは高価な最先端モデルに割り当て」というルーティングを高精度に実行することができます。


Jev Routerはユーザーのプロンプトを読み取ってルーティングを実行しますが、プロンプトは保存されず、学習に使われることもないとのこと。
Jev reads the conversation text only to pick the model and effort.It runs under zero data retention (ZDR) terms, so nothing is stored or trained on. Attachments are never sent to Jev, and requests with "zdr: true" work with Jev Router.— OpenRouter (@OpenRouter) September 25, 2026


Jev RouterとOpenRouter製ルーターの「Auto Router」に「4種類のAIエージェントベンチマークのタスク」をルーティングさせた結果、Jev Routerの方が82％多くのタスクを達成できたとのこと。


また、Jev Routerは最初のトークンを出力するまでの時間も高速であることが確かめられています。






















  












・関連コンテンツ
















































  
    
  << 次の記事Appleが新型Apple Vision Proを開発中との報道前の記事 >>大手SNSがイーロン・マスクのドキュメンタリー映画の広告掲載を拒否、MetaとYouTubeは後に許可
