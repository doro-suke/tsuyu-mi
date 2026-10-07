# 【AIミニゲーム開発 1日目】Streamlitでじゃんけんゲームを作ってみた（uv + Python） #個人開発 - Qiita
- **Source URL**: https://qiita.com/rokisan/items/04f5dab7cdc6696e6ee4
- **Score**: 25
- **AI Summary**:
  - uvとStreamlitを用いたPython開発環境の構築手順と最小構成のプロジェクトディレクトリ設計
  - Streamlitのsession_stateを利用した基本的な状態管理と勝敗判定ロジックの実装方法
  - 開発の継続性を重視し、将来的なAI機能追加を見据えたスモールスタートな設計思想の提示
- **Read Now Reason**: uvを使用したモダンなPython環境構築や、Streamlitによるプロトタイプ開発の最短手順を再確認したい場合にのみ参照価値があります。
- **Suggested Tags**: #Streamlit, #uv, #Python環境構築
- **Processed Date**: 2026/5/9

---

## 本文
0Go to list of users who liked0Share on X(Twitter)Share on FacebookAdd to Hatena BookmarkDelete articleDeleted articles cannot be recovered.Draft of this article would be also deleted.Are you sure you want to delete this article?
はじめに
現在のプロジェクトでPL（プロジェクトリーダー）業務が中心になりそうで、これまでのように日常的にコーディングする機会が減りそうな状況になります。
ただ、AIを活用した開発スキルや「手を動かす感覚」は維持していきたいので、AIと相談しながらちょっと簡単な開発をしてみることにします。
また、

小さい子供と一緒に楽しめるものを作りたい
IT系以外のエンジニアや初心者にも教えられる題材にしたい

という思いもあり、小さく楽しく続けられる個人開発を始めることに。

今回の取り組み

テーマ
AIミニゲーム開発シリーズ

1〜2週間で1つ作る
小さく完成させる
あとからAI要素を追加する

その第1弾として、今回は
👉 じゃんけんゲーム
を作りました。

なぜじゃんけんか？
じゃんけんを選んだ理由は以下の通り。

ルールがシンプル（誰でもわかる）
実装が簡単（すぐ完成する）
子供でも遊べる
プログラミング教材として優秀
後からAI要素（予測など）を追加しやすい

→　「最初の題材として最適」

技術スタック
今回使用した技術はこちら。

Python
Streamlit
uv（Pythonパッケージ管理）


完成したもの
以下のようなシンプルなじゃんけんゲームです。

機能

グー / チョキ / パー をボタンで選択
コンピュータがランダムで手を出す
勝ち / 負け / あいこ を表示
スコア（勝ち・負け・あいこ）を記録
スコアのリセット

まずは「遊べるものを最速で作る」ことを重視

ディレクトリ構成
janken-game/
├─ app.py
└─ src/
   ├─ __init__.py
   ├─ computer_player.py
   └─ game_logic.py



設計のポイント

① 責務を分ける


app.py → 画面表示（UI）

game_logic.py → 勝敗判定

computer_player.py → コンピュータの手

小さいながらも「設計」を意識

② シンプルに作る

最初からAIは入れない
UIは最低限
完成を優先

継続するために重要

③ 状態管理
Streamlitの session_state を使って

スコア
直近の結果

を保持。

実行方法
uv init
uv add streamlit
uv run streamlit run app.py


実際の画面


学べること（初心者向け）
このじゃんけんゲームでは以下が学べる。

if文（条件分岐）
関数
リスト
ランダム処理
状態管理（session_state）
UI操作（ボタン）

教材としても優秀

今後の拡張
次は以下を考えています。

① コンピュータを少し賢くする

プレイヤーの履歴を保存
よく出す手を分析
それに勝つ手を出す

ここでAI要素を追加予定

② 履歴表示

過去の手を表示
プレイの振り返り


③ 子供向けUI改善

表示をわかりやすく
メッセージを楽しく


まとめ
今回は 「まず完成させる」ことを最優先 で、シンプルなじゃんけんゲームを作成。
個人開発を継続するためには

小さく作る
完璧を目指さない
楽しさを優先する

が重要です！

次回
「AIがクセを読んでくるじゃんけん」
に進む予定です。
0Go to list of users who liked0Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up0Go to list of users who liked0Delete articleDeleted articles cannot be recovered.Draft of this article would be also deleted.Are you sure you want to delete this article?
