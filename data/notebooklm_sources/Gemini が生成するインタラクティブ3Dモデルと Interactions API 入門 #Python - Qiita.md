# Gemini が生成するインタラクティブ3Dモデルと Interactions API 入門 #Python - Qiita
- **Source URL**: https://qiita.com/kai_kou/items/35462df3d5455433de75
- **Score**: 78
- **AI Summary**:
  - Geminiの3Dシミュレーション生成機能と、開発者向けのInteractions APIを技術解説
  - Interactions APIはサーバー側で状態管理を行い、冗長な履歴送信を省く新設計を採用
  - Python SDKによる実装例や、Deep Researchエージェントの非同期呼び出し手法を提示
- **Read Now Reason**: AIエージェントのマルチターン会話において、トークン消費と実装の複雑さを抑えるサーバー側ステート管理（previous_interaction_id）への移行設計が学べるため。
- **Suggested Tags**: #Gemini_API, #Python, #AIエージェント, #マルチターン会話, #Interactions_API
- **Processed Date**: 2026/5/5

---

## 本文
はじめに
2026年4月、Google は Gemini アプリにインタラクティブな3Dモデル・シミュレーション機能を追加しました。テキストの質問に対して、操作可能な物理シミュレーションや分子モデルをチャット内で直接生成できるようになっています。
同時期に開発者向けの Interactions API（公開ベータ）も拡充されており、こうした高度なマルチターン・エージェント連携をアプリに組み込むための新しい統合インターフェースとして注目されています。
本記事では、エンジニア目線でこの2つの機能をまとめて解説します。

この記事で学べること

Gemini のインタラクティブ3Dモデル・シミュレーション機能の概要と使い方
競合（ChatGPT・Claude）との機能比較
Interactions API の仕組みと、従来の generateContent との違い
Python による Interactions API の基本実装例


対象読者

Gemini API を使ったアプリ開発に興味のあるエンジニア
AI チャットボット・エージェントのインタラクティブ化を検討している方



TL;DR


Gemini の Pro モデル（gemini.google.com）でインタラクティブな3Dシミュレーション・分子モデル・チャートを生成できるようになった
「show me」「help me visualize」などのトリガーフレーズで起動、スライダーで変数をリアルタイム操作可能
開発者向けの Interactions API（ベータ）は generateContent に代わるマルチターン・エージェント向けの新インターフェース
Python の client.interactions.create() でサーバー側ステート管理のマルチターン会話が実現



Gemini インタラクティブ3Dモデル機能の概要

2026年春、主要AIチャットツールは相次いでインタラクティブなビジュアライゼーション機能を追加しました。



AI
リリース日
特徴




ChatGPT
2026-03-10
数学・理科教育向けの動的ビジュアル説明


Claude
2026-03-12
オンデマンドのインタラクティブビジュアライゼーション


Gemini
2026年4月
Proユーザー全体向けロールアウト（最大の対象規模）



Gemini のリリースは最後発ながら、公式ブログ によると一般ユーザー全体（EducationとWorkspaceアカウントを除く）への展開という点で最も広い対象規模となっています。


生成できるビジュアライゼーションの種類
現時点で確認されている生成タイプは以下の4種類です。

1. 物理シミュレーション
軌道力学や振り子など、物理パラメータを変数として操作できるシミュレーションを生成します。
例：月の軌道シミュレーション

重力強度・初速度のスライダーをリアルタイム操作
安定軌道・不安定軌道の違いを即座に確認
軌道パスの表示/非表示トグル
物理演算の一時停止・再開

例：二重振り子

カオス的な動きをパラメータ操作しながら観察
感度の高さ（初期値のわずかな違いで軌跡が大きく変わる）を体感


2. 3D分子モデル
化学分子の3Dモデルを生成し、クリック＆ドラッグで任意の角度から確認できます。結合の種類（単結合・二重結合）や原子の種類も視覚的に区別されます。

3. インタラクティブチャート
データをグラフやチャートとして可視化し、ズーム・フィルタリングなどの操作が可能です。

4. 空間的な概念の図示
宇宙のスケール比較、DNA の二重らせん構造など、静止画では伝わりにくい空間的な概念を立体で表現します。


アクセス方法と使い方


必要な条件


URL: gemini.google.com


モデル: Pro モデルを選択（プロンプトバーで変更可能）

アカウント: 一般 Google アカウント（Education/Workspace は現時点で非対応）


効果的なトリガーフレーズ
"show me how [概念] works"
"help me visualize [トピック]"
"create an interactive simulation of [物理現象]"
"generate a 3D model of [分子名]"

具体例:
help me visualize how a double slit experiment works
show me an interactive model of the Moon orbiting the Earth
create a 3D model of water (H2O)
simulate a double pendulum


注意点

フィーチャーは段階的ロールアウト中のため、表示されない場合がある
モバイルアプリより Web 版（gemini.google.com）での動作が確実
複雑な計算が必要な場合はレスポンスに数秒かかることがある



開発者向け: Interactions API とは
インタラクティブ3Dモデル機能の裏側を支える技術基盤の一つが Interactions API です。これは generateContent API の課題を解消するために設計された、マルチターン・エージェント向けの新しい統合インターフェースです（2025年12月より公開ベータ）。

generateContent との比較



特徴
generateContent
Interactions API




ステート管理
クライアント側（history 配列）
サーバー側


マルチターン実装
history 配列を毎回送信

previous_interaction_id のみ


エージェント対応
限定的
ネイティブサポート


本番安定性
✅ 安定（GA）
⚠️ ベータ


対応モデル
全 Gemini モデル
Gemini 3 系（ベータ期間）


バックグラウンド実行
❌
✅


組み込みパーシスタンス
❌
✅



generateContent の課題：
従来、マルチターン会話では history 配列を毎リクエストに含める必要があり、会話が長くなるほどペイロードが肥大化しました。ツール呼び出し（Function Calling）のループ管理も複雑でした。
Interactions API の解決策：
ステートをサーバー側に保持し、previous_interaction_id で前の応答を参照するだけで会話を継続できます。

公式ドキュメント

Interactions API リファレンス
Google AI Studio での使い方



Interactions API Python 実装例

セットアップ
pip install google-genai


基本的な単発生成
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")

interaction = client.interactions.create(
    model="gemini-3-flash-preview",
    input="Tell me a short joke about programming."
)

print(interaction.outputs[-1].text)


マルチターン会話（サーバー側ステート管理）
generateContent では毎回 history 配列を渡す必要がありましたが、Interactions API では previous_interaction_id を使うだけです。
# ターン1
interaction1 = client.interactions.create(
    model="gemini-3-flash-preview",
    input="こんにちは。私の名前は Taro です。"
)

# ターン2 — previous_interaction_id で前の応答を参照
interaction2 = client.interactions.create(
    model="gemini-3-flash-preview",
    input="私の名前は何ですか？",
    previous_interaction_id=interaction1.id
)

print(interaction2.outputs[-1].text)
# → "あなたの名前は Taro です。"


ストリーミング応答
stream = client.interactions.create(
    model="gemini-3-flash-preview",
    input="Pythonでフィボナッチ数列を生成する方法を教えてください。",
    stream=True
)

for chunk in stream:
    if chunk.event_type == "content.delta":
        print(chunk.delta.text, end="", flush=True)


Gemini Deep Research エージェントの呼び出し
Interactions API では、Deep Research エージェントも同じインターフェースで呼び出せます。
interaction = client.interactions.create(
    model="deep-research-pro-preview-12-2025",  # Deep Research エージェントのモデルID
    input="2026年のAIエージェントフレームワークの主要プレイヤーを調査してください。",
    background=True   # バックグラウンド実行（長時間タスクに必要）
)

# ステータス確認 → 完了後にアウトプット取得
print(interaction.status)          # "running" or "completed"
print(interaction.outputs[-1].text)



generateContent から Interactions API への移行ポイント
既存の generateContent コードを Interactions API に移行する際の主な変更点は以下の通りです。
# 【Before】generateContent でのマルチターン
history = []
history.append({"role": "user", "parts": [{"text": "こんにちは"}]})
response = model.generate_content(history)
history.append({"role": "model", "parts": [{"text": response.text}]})

# 【After】Interactions API でのマルチターン
interaction = client.interactions.create(
    model="gemini-3-flash-preview",
    input="こんにちは"
)
# ← history 管理不要。interaction.id だけ保持する

next_interaction = client.interactions.create(
    model="gemini-3-flash-preview",
    input="続きの質問",
    previous_interaction_id=interaction.id
)


ベータ版の注意点
Interactions API は現時点で公開ベータであり、破壊的な変更が加わる可能性があります。レイテンシ重視の本番ワークロードでは引き続き generateContent の使用が推奨されています。



まとめ

Gemini は2026年4月から、Pro モデルでインタラクティブな3Dシミュレーション・分子モデル・チャートをチャット内生成できるように
「help me visualize」などのトリガーフレーズで起動、スライダー操作でリアルタイムにパラメータを変更可能
ChatGPT・Claude に続くリリースだが、一般ユーザー全体への展開という規模では最大
開発者向けには Interactions API（ベータ）が登場。previous_interaction_id によるサーバー側ステート管理でマルチターン実装が大幅に簡素化
本番利用には generateContent が引き続き安定選択肢だが、エージェント開発では Interactions API の活用が加速する見込み



参考リンク


Generate 3D models and interactive charts with the Gemini app — Google公式ブログ（2026-04）

Interactions API ドキュメント — Google AI for Developers

Google AI Studio's Interactions API for Gemini models and agents — Google 開発者ブログ

Gemini Adds Interactive 3D Models and Simulations — gHacks Tech News（2026-04-13）
