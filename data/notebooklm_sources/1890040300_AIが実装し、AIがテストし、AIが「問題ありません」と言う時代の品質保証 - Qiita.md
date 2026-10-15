# AIが実装し、AIがテストし、AIが「問題ありません」と言う時代の品質保証 - Qiita
- **Source URL**: https://qiita.com/y0us91/items/2feffd2cc6c672717973
- **Score**: 78
- **Suggested Tags**: #AI駆動開発, #品質保証, #AIエージェント
- **Processed Date**: 2026/10/15

---

## 本文
はじめに
Coding Agentの進化によって、ソフトウェア開発の形が大きく変わり始めています。
少し前までAIによる開発支援といえば、

コード補完
コード生成
リファクタリング
テストコード生成

など、「人間が主体で、AIが支援する」使い方が中心でした。
しかし現在のCoding Agentは、単にコードを生成するだけではありません。
仕様を読み、Repositoryを調査し、実装し、テストを書き、失敗すれば原因を分析して修正する。
そしてテストがGreenになるまで、このループを自律的に回せるようになってきました。


これは非常に強力です。
しかし、ここで一つ重要な疑問が生まれます。

AIが実装し、AIがテストを作り、AIがそのテストを通るまで修正したとき、そのGreenは何を保証しているのでしょうか。

この記事で考えたいのは、まさにこの点です。


「テストがGreenだから正しい」は、もともと成立しない
まずAI以前の話から整理します。
当然ですが、
All Tests Passed ≠ Software is Correct
です。
テストがGreenというのは、

現在存在するテストに対して、観測した結果が期待値と一致した

ことを意味します。
それ以上でも、それ以下でもありません。
例えば、次のコードを考えます。
function calculatePrice(price, quantity) {
    return price * quantity;
}

そしてテストが、
price = 100
quantity = 2
expected = 200

だけだったとします。
当然Greenになります。
しかし、

quantity = 0
quantity < 0
price = null
price = undefined
非数値
最大値
Overflow
Currency precision

については何も保証していません。
つまりテストの価値は、
Greenになったかどうか
だけでは決まりません。
その前に、

何を保証するために、そのテストが存在するのか

が必要です。


AI時代に変わったのは「実装と検証の距離」
ここからが本題です。
従来の開発では、完全に独立しているわけではないものの、実装と検証の間にはある程度の距離がありました。


もちろん、開発者自身がUnit Testを書くこともあります。
そのため、実装と検証が完全に分離されているわけではありません。
それでも、

Code Review
Static Analysis
CI
Integration Test
E2E
Production Monitoring

など、異なる観点から実装を見る仕組みがありました。
重要なのは「誰がテストしたか」ではありません。
実装とは異なる評価軸が存在していたことです。
ところがAgentic Codingでは、容易に次のような構造になります。


AI Agentが、
実装する。
テストを書く。
失敗を分析する。
修正する。
Greenになるまで繰り返す。
ここまでを一つのFeedback Loopの中で完結できます。
つまり、

実装者と検証者が、同じ最適化ループの中に入る

ということです。
これは「AIだから危険」という話ではありません。
人間でも同じです。
自分が実装したコードについて、

自分でテストケースを考える
自分でテストを書く
自分で修正する
自分で「全部通ったので問題ない」と判断する

これだけで十分な品質保証になるとは、通常考えないでしょう。
AIでも原理は同じです。
問題なのは、AIが実装することでも、AIがテストを書くことでもありません。

実装と、その実装を評価する基準まで、同じ最適化ループの中で作られてしまうこと

です。
このときGreenは、
仕様を満たしたことの証明ではなく、そのAgentが参照している評価基準を満たしたこと
に過ぎない可能性があります。


Agentは「正しいコード」ではなく「成功条件」を目指す
Software AgentにはGoalがあります。
例えば、

Issueを解決してください。

というGoalを与え、成功判定として、
npm test

を利用しているとします。
するとAgentにとって強いFeedback Signalは、
Failed / Passed
です。


これは非常に合理的な動作です。
問題は、

PassedとSpecification Complianceが同じとは限らない

ことです。


「テストを通す」と「仕様を満たす」は違う
2026年、この問題はCoding Agentの研究でも扱われています。
SpecBenchでは、
Visible Validation Tests
と、
Held-out Tests
を分離してCoding Agentを評価します。


つまり、

Agentから見えるテスト
Agentから見えない評価用テスト

を分離します。
なぜでしょうか。
見えているテストをPassすることと、本来のSpecificationを満たすことを区別するためです。
Agentが嘘をついているわけではありません。
Agentは与えられたFeedbackを利用して、合理的にGoalを達成しようとしています。
問題なのは、

こちらが与えた評価関数が、本当に「正しさ」を表現できているのか

です。


Reward Hackingという問題
Machine Learningには、Reward Hackingという概念があります。
簡単に言えば、

本来達成してほしい目的ではなく、評価指標そのものを攻略してしまう

ことです。
Software Engineeringでも、同じ構造が起こり得ます。


本来達成したいのは、
「ユーザーが期待する仕様を満たす」
ことです。
しかしAgentが直接観測できる成功条件が、
「TestをGreenにする」
だけなら、Specificationそのものではなく、Visible Testsへ最適化される可能性があります。
極端な例なら、
if input == "known-test-value":
    return expected_value

でもテストは通ります。
もちろんCoding Agentが常にこのようなコードを書く、という話ではありません。
重要なのは、

評価基準と本来の目的がズレれば、Agentはそのズレまで最適化できる

ということです。


ではAIにテストを書かせてはいけないのか
ここで、

だったらAIにテストを書かせるべきではない

という結論に行くのも違います。
AIによるテスト生成は非常に有用です。
例えば、

Boundary Valueの列挙
Regression Test生成
Unit Test生成
Integration Test生成
Fixture生成
Mock生成
Failure Log解析
Coverage不足箇所の探索

など、多くの作業を高速化できます。
問題なのはAIがTestを書くことではありません。
問題なのは、次の構造です。


AIにテストを書かせることと、
AIが作った評価基準を、そのまま最終的なQuality Gateにすること
は別問題です。


実際のAgent生成PRでも「テストされている」とは限らない
Agentがテストを生成できることと、
Agentによる変更が適切にテストされていること
も分けて考える必要があります。
2026年に公開されたAgent生成Pull Requestの分析では、4,882件のPRが調査されています。
Production Codeを変更したPRのうち、テスト変更を含んでいたものは約半数でした。
さらに既存テストによるAgent変更行のCoverageを見ると、特にPythonでは十分とは言い難い結果が報告されています。
また、

try
catch
error handling

といった異常系のコードは、特にテストされにくい傾向が確認されています。
AIによる開発では、

正常系が動いた

ことを確認する速度は非常に上がります。
だからこそ、

どこが壊れたら困るのか

を考えるRisk Analysisが重要になります。


Coverageを100%にすれば解決するのか
では、

AgentにCoverage 100%を要求すればいい

のでしょうか。
これも違います。
Coverageが示しているのは基本的に、
Codeが実行されたか
です。
正しいAssertionが存在するか
ではありません。


例えば、
expect(response).toBeDefined();

だけでも対象コードを実行できます。
しかし本当に確認したかったことが、
status === "completed"

なのか、
DBに正しい値が保存されたこと
なのか、
同じ処理が二重実行されていないこと
なのかは別問題です。

Coverageは観測範囲の指標であって、Oracleの品質そのものではありません。



Test Oracleという考え方
Software Testingには、Test Oracleという考え方があります。
簡単に言えば、

実行結果が正しいかどうかを判断する基準

です。
単純な例なら、
Input:
100円の商品を2個購入

Expected:
200円

なので、Oracleは 200円 です。
しかし実際のシステムはもっと複雑です。
例えば、
Retryが発生しても同一ユーザーへ二重配信されない
ことを保証したいとします。


この場合、単に HTTP 200 を確認するだけでは不十分です。
必要なのは、

DB State
Queue State
External API Request

など、複数の観測点かもしれません。
重要なのは、

テストコードを書けることと、正しいOracleを設計できることは別能力

だということです。


AI時代に人間が持つべき役割
では、人間がすべてのテストケースを書くべきでしょうか。
私はそうは思いません。
それではAgentic Developmentのメリットを大きく失います。
人間の役割を、
Codeを書く人
から、
正しさを定義する人
へ移すべきだと考えています。


Agentに、

テストを書いてください

とだけ指示するのではありません。
例えば、

この変更で最も重要なRiskはこれである


この状態遷移を保証する必要がある


この境界では二重処理を許してはいけない


このFailureはCI Blockingとする

といったQuality Constraintを先に定義する。
その上で実装やテスト生成をAgentに任せます。


Independent Verificationをどう作るか
ここで重要になるのが、Independent Verificationです。
これは必ずしも、

別の人間が全部確認する

という意味ではありません。
例えば、次のような構造も考えられます。


あるいは、


重要なのは、

実装Agent自身の「成功しました」という自己申告だけをQuality Gateにしないこと

です。


Testing TrophyはAgentic Codingでも有効
AIがテストを生成できるようになると、

全部E2Eで確認すればいい

という方向にも行きやすくなります。
しかし、Agentic Codingだからといって各Test Layerの性質が変わるわけではありません。


Static AnalysisにはStatic Analysisの役割があります。
Unit TestにはUnit Testの役割があります。
Integration TestにはIntegration Testの役割があります。
E2EにはE2Eの役割があります。
重要なのはテストの本数ではありません。

Failure Modeに対して、最も適切なTest Layerを選択する

ことです。


AIに「自分の間違いを証明させる」
Agentへの指示も少し変えられます。
例えば、

この実装が正しいことを確認してください

ではなく、

この実装が間違っていることを証明するテストを作ってください

と考えます。
Confirmationではなく、Falsificationへ寄せるわけです。


AIの能力を、
正しいことを確認するためだけではなく、間違いを探すためにも使う
ということです。


「AIがレビューするから大丈夫」でもない
ここでも同じ問題があります。


工程を増やしても、

同じ仕様理解
同じContext
同じ評価基準

を共有していれば、同じBlind Spotを共有する可能性があります。
重要なのはAgentの数ではありません。

評価軸の独立性

です。


同じImplementationを、異なる観点から見ることが重要です。


EM・テックリードが設計すべきもの
Agentic Codingが広がると、EMやテックリードが設計すべきものも変わります。
これまでの、
「誰が実装するか」
だけではなく、
「どこまでAgentに委譲するか」
を考える必要があります。
そのためには、

Agentが変更してよい範囲
必須Test Layer
Required Checks
CI Blocking条件
Coverageの扱い
Mutation Testingの利用
Risk LevelによるQuality Gate
Human Reviewが必要な変更
Independent Verificationの方法

といったルールが必要になります。
つまり、

AI Coding Policyだけでなく、AI Quality Policyが必要になる

と考えています。

2026年10月追記：その保証をどこに置くのか
この記事を書いてから、Coding Agentを実際の開発フローで使う中で、もう一つ考えることが増えました。
この記事では、

「そのGreenは、何を保証しているのか？」

を中心に書きました。
ただ、その後もう一段気になったのが、

その保証を、どこに置くのか？

という問題です。
最近はCLAUDE.mdやAGENTS.md、Skillsなどを使って、AgentへRepositoryのルールやTest方針を伝えることが増えています。
これはかなり便利です。
一方で、
必ずテストしてください

とInstructionへ書くことと、
テストが通らなければMergeできない

ことは同じではありません。
前者はAgentへの要求で、後者はSystemによるControlです。
人間に対する「気をつけてください」をCIやRequired Checkへ移してきたのと同じように、AIに対しても、守られなければ困る条件はPromptだけに置かない方がいい。
この続きを、別の記事にまとめました。

AIは指示を無視する。だから品質保証をPromptに置いてはいけない

今回の記事が「何をもってGreenとするのか」という話なら、次の記事は「その保証をどこに配置するのか」という話です。

AI時代に価値が上がるQuality Engineering
AIによって、

Implementation Cost ↓
Test Generation Cost ↓
Refactoring Cost ↓
Investigation Cost ↓

になっていくでしょう。
これは歓迎すべきことです。
しかし同時に、
Change Volume ↑
になります。


1人のEngineerが1日に変更できるコード量が増えれば、当然、
検証しなければならない変更量も増えます。
そこで人間がすべて手動確認していてはScaleしません。
だからQuality Engineeringも、
Manual Verification
から、
Quality Architecture
へ移る必要があります。
つまり、

テストをする人

ではなく、

正しさを継続的に評価できるシステムを作る人

です。


最後に
AIがコードを書くことは問題ではありません。
AIがテストを書くことも問題ではありません。
AIがFailureを解析して、自分で修正することも問題ではありません。
むしろ積極的に使うべきだと思っています。
問題になるのは、


と考えてしまうことです。
Greenは品質そのものではありません。
Greenとは、

定義された評価基準を満たした

という結果です。
だから重要になるのは、
誰がGreenにしたかではなく、何をもってGreenと定義したのか。
AI時代、人間の役割はコードを書くことから少しずつ離れていくかもしれません。
テストコードを書くことからも離れていくかもしれません。
しかし、

何がRiskなのか


何を正しい状態とするのか


どのFailureを許容しないのか


どの境界で検証するのか


どのSignalなら信用できるのか

という問いは残ります。
むしろAIが大量のコードとテストを生成できるようになったことで、この判断の重要性は高くなります。
私はこれからのQuality Engineeringでは、

「テストを書く能力」以上に「正しさを評価する仕組みを設計する能力」が重要になる

と考えています。
AIが実装し、
AIがテストし、
AIが修正する。
そんな開発が当たり前になったとき、最後に問うべきなのは、

「テストはGreenか？」

だけではありません。

「そのGreenは、何を保証しているのか？」

こちらだと思います。


参考


SWE Atlas: Benchmarking Coding Agents Beyond Issue Resolution
https://arxiv.org/abs/2605.08366


Measuring Reward Hacking in Long-Horizon Coding Agents (SpecBench)
https://arxiv.org/abs/2605.21384


Test Coverage Analysis of Agentic Pull Requests
https://arxiv.org/abs/2607.18057


Are Coding Agents Generating Over-Mocked Tests? An Empirical Study
https://arxiv.org/abs/2602.00409
