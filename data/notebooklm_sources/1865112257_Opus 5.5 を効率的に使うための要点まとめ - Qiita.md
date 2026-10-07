# Opus 5.5 を効率的に使うための要点まとめ - Qiita
- **Source URL**: https://qiita.com/suisuina/items/64f8c1fc184a75370cef
- **Score**: 85
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #プロンプトエンジニアリング
- **Processed Date**: 2026/9/30

---

## 本文
Opus 5.5 を効率的に使うための要点まとめ


以下を読みたくない方はmodelをopus5.5にして以下のコマンド叩いてください
/claude-api prompt-audit


まず試す3つのこと

タスク全体を一度に渡し、何をもって完了とするかを書く

「よく考えて」などの指示は消す（Opus 5.5 は返答前に必ず考えるため不要。消すと返答が早く始まり、品質は落ちない）

実行中でも追加の指示を送れる（やり直しのコストがかからない）



1. 頼み方

完了条件を書く

何をもって完了とするかを書くと、止めるタイミングを自分で判断できる
止めて質問させる条件も書いておく

Migrate the payment endpoints from the old client to the new one.
Done means: every endpoint uses the new client, the old client is
deleted, and the test suite passes.
Stop and ask me only if a test fails for a reason you can't explain.


デザインは「使ってほしくないパターン」を具体的に挙げる

「ありきたりな見た目は避けて」より、避けたい要素を具体的に挙げるほうが効く

Build a personal website with placeholder content.
Don't use a cream or off-white background, italic accent words in
headings, numbered "01 / 02 / 03" section labels, monospace labels, or
pill-shaped buttons.



2. Claude Code で長時間動かすとき

止めるか続けるかのルールを CLAUDE.md に書く
When a step doesn't need my input, keep going. Put status notes in the
same message as your next action.
Stop and ask only when you can't continue without me, or before anything
destructive: deleting data, force-pushing, or changing anything outside
this repository.


⚠️ データ削除などの破壊的な操作には、必ず許可プロンプトが出る設定のままにしておく



大きな作業はサブエージェントに分ける

監査や移行作業を、単位ごとに別々のサブエージェントへ振る
返ってきた報告は、根拠を確認してから採用させる

Audit every service in services/ for the retry bug in the linked issue.
Give each service to its own subagent. When a subagent reports back,
check its evidence before you accept it.
Finish with one table: service, affected yes or no, and the evidence.


タスクリストはファイル（TASKS.md）で管理する

コンテキストがいっぱいになって要約された後でも、進み具合を追える



3. 結果の確認

自分の対応待ちの項目から先に見る

報告の最後の形式を CLAUDE.md で決めておくと見やすい

End every run with three headings: Blocked on me, Changed, Found.


マージ前にコードレビューさせる

記事によると、Opus 5.5 は effort を低くしても、Opus 5 の effort 高以上のレビュー品質が出る

Review the diff on this branch against main.
List only problems you'd block the merge for. For each one, give the
file and line, why it's wrong, and how to show it fails.


確認できなかったことを書かせる

調査の回答では、確認できなかった点を「could not confirm」とはっきり書かせる



4. Claude アプリで使うとき


グラフ・図・スクリーンショットはそのまま添付する（数値を打ち直す必要はない。読み取り精度が上がっている）


長い資料の矛盾チェック
Check this deck for anything that contradicts itself: numbers, dates and
names. Quote each problem and say where it is.



アウトラインではなく、すぐ使えるファイル（スプレッドシート・文書）を頼む


長く続くプロジェクトでは、答え済みの内容を蒸し返させない（プロジェクト指示に書く）
Once you have answered something, treat that answer as done. Focus on
what I'm asking now, and don't go back over an earlier answer unless I
ask about it or point out a problem with it.


※ 後の段階で前の答えを直す必要がある長い分析には使わない





5. メッセージにフラグが付いたとき
フラグが付くと、自動で前の世代のモデルに切り替わる。



環境
対処




Claude アプリ
モデル選択で Opus 5.5 を選び直す / 新しいチャットを始める / 設定 → 機能で自動切り替えをオフにする


Claude Code

/model で戻す / Esc を2回押して直前のメッセージを編集 / /config で自動切り替えの設定を変える / 誤判定なら /feedback で報告





内部の推論をそのまま再現させる頼み方は、フラグの対象になる

代わりに: Explain why you chose this approach in three sentences（この方法を選んだ理由を3文で説明させる）





6. 速度（Fast Mode）

Claude Code のやり取り中心の作業向け（リサーチプレビュー）
テキストが速く出るが、トークン単価は標準より高く、追加の使用枠が必要
起動: /fast




✅ チェックリスト
頼むとき


完了条件を書いた

「よく考えて」などの指示を入れていない

デザインで避けたいパターンを具体的に挙げた

図やスクリーンショットは打ち直さず添付した

Claude Code で長時間動かすとき


CLAUDE.md に止める条件と続ける条件を書いた

破壊的な操作で許可プロンプトが出る設定のまま

大規模な監査はサブエージェントに分けた

タスクリストをファイルで管理している

結果を確認するとき


自分の対応待ちの項目から先に見た

マージ前にコードレビューさせた

確認できなかった点を明記させた

フラグが付いたとき


モデルの戻し方を知っている（モデル選択 / /model）

自動切り替えの設定を確認した


出典: Getting the most out of Opus 5.5（Addy Osmani / 2026-09-22）

0Go to list of users who liked0Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
