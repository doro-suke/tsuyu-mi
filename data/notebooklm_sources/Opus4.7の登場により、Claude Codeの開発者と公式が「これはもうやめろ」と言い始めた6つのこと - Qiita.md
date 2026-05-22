# Opus4.7の登場により、Claude Codeの開発者と公式が「これはもうやめろ」と言い始めた6つのこと - Qiita
- **Source URL**: https://qiita.com/ot12/items/06420caf41a34a910c53
- **Score**: 92
- **AI Summary**:
  - Opus 4.7への刷新に伴い、指示を細かく出す『ペアプロ型』から目標完結型の『委譲型』への転換が必要
  - Effortレベルはmaxではなくxhighが推奨され、過学習を防ぐ設計と自律実行性能の向上が図られた
  - Stop Hookを利用した自動テスト連携やAuto Mode導入による、完全自律実行の最適化手法を提示
- **Read Now Reason**: 4.6以前の「細かく指示する」手法が4.7では逆効果になるため、プロンプト設計の即時修正が必要です。また、APIの破壊的変更や検証ループ自動化の具体的コード（hooks設定）が含まれており、開発効率に直結します。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #プロンプトエンジニアリング, #Anthropic, #自動化パイプライン
- **Processed Date**: 2026/5/12

---

## 本文
2026年4月16日、AnthropicがClaude Opus 4.7をリリースしました。
同時に公式ブログ「Best Practices for Using Claude Opus 4.7 with Claude Code」が公開され、Claude Code作者のBoris CherneyもXで「6つの新技」を投下しています。
両方を通してAnthropic公式が言っているのは「これまでのClaude Codeの使い方は、今日でやめろ」です。
4.6までは正解だった作法が、4.7では逆効果になることもあるようです
↓Claud CodeはもはやただのAIコーディングツールではなく、誰もがアプリで稼げるようになる収益化ツールです！
よければこちらのツイートも見てみてください！


「ペアプロ（細かく指示する）」のはもうやめろ

4.6までの「細かく指示するほど賢く動く」という感覚は、4.7では逆に性能を下げます。公式ブログの冒頭で明言されています。

"Treat Claude more like a capable engineer you're delegating to than a pair programmer you're guiding line by line."
（一行ずつ指導するペアプログラマー相手ではなく、任せられるエンジニアとして扱え）

4.6までは、「プロンプトを送る」→「返ってきたコードを見て修正を出す」→「また返ってきたコードを見て…」という往復型が標準でした。4.7はこの前提を捨てています。
初回プロンプトに Goal（目的）／Constraints（制約）／Acceptance criteria（完了条件） を全部入れる。そのあと途中介入を減らす方が、4.7は自律実行の性能を発揮します。

設計思想の変化
4.6と4.7の違いを、公式は3点で説明しています。

ツール呼び出しより 推論を優先する

Subagentの呼び出しに より慎重になる（自己完結できるなら呼ばない）

長期自律実行 の性能が向上

ここまで来ると「細かく指示するほど賢く動く」という従来の感覚は逆効果になります。指示が細かいほど、自律判断の余地が減るからです。Claude Codeでの正解プロンプト様式は、4.7を境に180度逆になったと言っていいです。

「Effort Levelをmaxに常用する」のはもうやめろ

「一番上のmaxが一番賢い」は、今日で捨ててください。Claude CodeのEffort Levelは5段階、公式が指定する推奨デフォルトはmaxではなくxhighです。



Level
公式の使いどころ




low
短く、レイテンシ重視、知性不要


medium
コスト重視で知性を多少犠牲にできる


high
バランス型


xhigh
Opus 4.7の推奨デフォルト。大半のコーディングで最良


max
要求の高いタスク用。overthinking傾向あり



注目すべきは max の扱い。「上のレベルほど賢い」は正しくありません。公式は max について「overthinking傾向がある」と明記しています。考えすぎで遅くなる、逆に精度が落ちるケースがあるということです。Borisも「ほぼ全タスクで xhigh、最難関でだけ max」と投稿しています。

仕様上の重要な変更
以下は Anthropic公式API Docs「What's new in Claude Opus 4.7」 の "Breaking changes" 節に明記されています。Messages API限定で、Claude Managed Agents使用時は非該当です。

fixed thinking budget モードは非サポート（thinking: {type: "enabled", budget_tokens: N} は400エラー）
adaptive thinking は デフォルトOFF。thinking: {type: "adaptive"} を明示する必要あり

temperature / top_p / top_k の非デフォルト値も400エラーになる（プロンプトで挙動制御する方針）
トークナイザー刷新：同じテキストで1.0〜1.35倍のトークン数になり得る。max_tokens にヘッドルームを持たせる
思考内容（thinking content）はデフォルトで省略。必要なら display: "summarized" で戻す

調整手段は effort（Claude Codeなら /effort）と task_budget（beta）の2系統に集約されています。
Claude Codeのバージョン要件も変わりました、バージョンが新しくなければ Opus 4.7 を呼び出せません。古いバージョンのままでは新モデルの恩恵を受けられないので、まず更新を確認してください。
claude --version
# 2.1.110 以下なら更新


「--dangerously-skip-permissions」を常用するのはもうやめろ
--dangerously-skip-permissions を常用する運用は、2026年4月時点で時代遅れです。Borisが同日Xで出した「6つの新技」のうち、権限プロンプト撲滅系が2つ、これを安全に置き換えます。

Auto Mode

Claude Codeを使っていて誰もが経験する、「Allow?」の連打問題。これを解決するのが Auto Mode です。
起動は単純です。
CLIで Shift+Tab、または Desktop/VSCodeのドロップダウンで選択
Max / Team / Enterprise プラン限定の Research Preview 機能ですが、--dangerously-skip-permissions の正しい代替として位置づけられています。

/fewer-permission-prompts


同時に追加された新しいSkillです。

セッション履歴を分析し、許可リストの追加候補を提案

何度も同じコマンドを承認している状態を検知
提案を受け入れると、次から自動通過

/permissions で手動ホワイトリスト化していた作業を、半自動化してくれる機能です。Auto Modeが使えない Pro プランでも利用できます。

プラン別の可用性



機能
Pro
Max
Team
Enterprise




Auto Mode
×
○
○
○


/fewer-permission-prompts
○
○
○
○


/permissions
○
○
○
○



上記の通り、Auto Mode が安全かつ同等の体験を提供します。

「長時間セッションを横で見守り続ける」のはもうやめろ
4.7は自律実行が長くなります。横で1行ずつ見守り続ける運用はやめて、結果だけ受け取る体制に切り替えてください。Boris本人がXで紹介したUI側の2つがこれを支援します。

Focus Mode（/focus）

/focus

最終結果のみを表示し、途中の思考・ツール使用ログを隠すモードです。/focus off で元に戻せます。委譲モデルと相性がよく、「任せたら結果だけ見る」という使い方を支えます。

Recaps

長時間セッションから復帰したとき、サマリーを自動表示する機能です。Borisは「エージェントが何をしたか、次は何をするかを準備する」UIとして紹介しています。/loop で何時間も回していたタスクに戻っても、「何をどこまでやったか」を即座に把握できます。
この2つは 4.7の長期自律実行が前提になったUIです。Anthropicは「見守る必要がない」ことを可視化で支援する、というスタンスを取っています。

「Subagentを毎回呼ぶ」のはもうやめろ

4.6までの「積極的にsubagentを切れ」は捨ててください。4.7の公式ブログは真逆のことを書いています。

"More judicious about when to delegate work to subagents."
（サブエージェントへの委譲タイミングには、より慎重になること）


いつ明示的に呼ぶか
公式が明示している基準は2つだけです。


fanning out across files（複数ファイルへの並列作業）

independent items（独立した複数タスク）

それ以外は Claude 自身が判断します。従来のように「subagent使って」と毎回指示を入れると、逆に性能が下がるケースが出てきます。4.7は自分で判断する前提で訓練されているからです。

「検証機構なしで任せる」のはもうやめろ

6つの「やめろ」の最後、そして公式が最も効果の高い施策と明記しているのがこれです。

"Include tests, screenshots, or expected outputs so Claude can check itself. This is the single highest-leverage thing you can do."
（テスト・スクリーンショット・期待出力を与えてClaude自身が検証できるようにせよ。これが最も効果の高い施策）

モデルが賢くなっても、検証機構を渡さない限り品質は上がりません。

実装パターン
バックエンド：テストスイートを Stop Hook に繋ぐ。npm test が通るまで Claude が自動でもう1周する構成です。.claude/settings.json にこう書きます。
{
  "hooks": {
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "npm test" }]
      }
    ]
  }
}

フロントエンド：Playwright / Puppeteer で E2E、またはChrome拡張。Boris本人はChrome拡張を「毎回使う」と発言しています。

4.7固有の事情
4.7は自律実行が長くなるので、途中で誰も見ていない時間が増えます。検証機構がなければ、誤った方向で走り続けるリスクも比例して上がります。
推奨される組み合わせは、xhigh × 長期自律 × 検証機構の3点セット。品質が上がるかどうかは、モデルの差ではなく検証機構を渡しているかどうかで決まります。

今日やる実務設定チェックリスト
ここまでの同日公開内容を、設定項目に落とし込みます。
1. Claude Code を v2.1.111 以上に更新
claude --version

2. モデルを Opus 4.7、Effort を xhigh に
/model opus
/effort xhigh

3. 初回プロンプトの型を整える
Goal: <達成したいこと>
Constraints: <守るべき制約>
Acceptance criteria: <完了の判定基準>

4. Verification Loop を組む

バックエンド：テストを Stop Hook に
フロントエンド：Playwright か Chrome拡張

5. Auto Mode を試す（Max以上）
claude --permission-mode auto

チェックボックスで整理するとこうなります。


Claude Code v2.1.111 以上を確認

Opus 1M context が有効（Max / Team / Enterprise なら自動適用）

Effort は xhigh をデフォルトに

初回プロンプトに Goal / Constraints / Acceptance criteria を一括提示する癖をつける

Stop Hook で検証機構を組む

/fewer-permission-prompts で許可リストを整理する


同日登場の他の見逃せない新機能
Opus 4.7 リリースと同時に入った、ベストプラクティス記事の本筋ではないものの実務で効く新機能を3つ。

/ultrareview コマンド（Claude Code）
4.7 にあわせて Claude Code に追加されたレビュー用コマンド。複数視点でコードを厳しめに点検するモードで、PR前の最終チェックに向きます。

Task budgets（beta）
エージェントループ全体のトークン予算をモデルに 目安として 伝えられる新機能です。max_tokens が単発リクエストの上限を設ける仕組みなのに対し、task budget はエージェントが自分でペース配分するための助言的上限です。
response = client.beta.messages.create(
    model="claude-opus-4-7",
    output_config={
        "effort": "high",
        "task_budget": {"type": "tokens", "total": 128000},
    },
    betas=["task-budgets-2026-03-13"],
    ...
)


高解像度画像サポート
画像の最大解像度が 2576px / 3.75MP に拡張されました（従来は1568px / 1.15MP）。スクリーンショット解析・ドキュメント理解・computer useでの改善が期待できます。加えて、モデルの座標系と実ピクセルが1:1に揃ったので、座標変換の計算が不要になっています。

まとめ
2026年4月16日に Anthropic が公式ブログで出したベストプラクティスと、Claude Code 作者 Boris Cherny が同日にXで投下した6つの新技は、合わせてこれまでのClaude Codeの使い方は今日で卒業しろの一点に収束します。
ペアプロ、max常用、--dangerously-skip-permissions、Subagent毎回呼び出し、検証機構なしの自律実行、長時間セッションの横付き見守り。4.6までは正解だった6つが、4.7では全部「やめろ」に変わりました。
4.7の真価は、途中で介入しないことで初めて出てきます。6つの旧作法をやめて、任せる前提で設定を整えてみてください。
↓Claud CodeはもはやただのAIコーディングツールではなく、誰もがアプリで稼げるようになる収益化ツールです！
よければこちらのツイートも見てみてください！


参考

Best Practices for Using Claude Opus 4.7 with Claude Code（Anthropic公式、2026-04-16）
What's new in Claude Opus 4.7（Anthropic公式 API Docs）
Introducing Claude Opus 4.7（Anthropic公式発表、2026-04-16）
Boris Cherny「6つの新技」X投稿（2026-04-16）
Boris Cherny 6 tips アーカイブ（GitHub）
Claude Code 公式ドキュメント
