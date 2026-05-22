# Claude Code でスマホアプリ個人開発を加速する実践ガイド【React Native / Expo】 #Firebase - Qiita
- **Source URL**: https://qiita.com/similarmetal/items/9847e0b0b85024a29179
- **Score**: 92
- **AI Summary**:
  - CLAUDE.mdを活用したプロジェクト規約の自動定義により、生成AIの回答精度と一貫性を向上させる手法
  - tasksフォルダとMarkdownを用いた自律実行システムを構築し、AIによるセッション跨ぎの進捗管理を実現
  - 独自のスラッシュコマンド（.claude/commands/）を実装し、定型コード生成やセキュリティレビューを標準化
- **Read Now Reason**: AI駆動開発におけるエージェントの自律性を高めるための、具体的かつ再利用可能な設定ファイル構成（CLAUDE.mdやカスタムコマンド）が網羅されており、開発効率を劇的に改善できるため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #自動化パイプライン, #React Native, #生産性向上
- **Processed Date**: 2026/5/14

---

## 本文
はじめに
Claude Code（以下 CC）を使ってスマホアプリ（React Native + Expo）を個人開発した経験から、「CCをどう使えばスマホアプリ開発が加速するか」の実践的なノウハウをまとめます。
対象読者は React Native の経験がある方で、Claude Code を開発に取り入れたい方 です。CC の基本的な使い方は既知の前提で、スマホアプリ開発特有の活用パターンに絞って解説します。
環境は Windows + VSCode + Claude Code 拡張 ですが、Mac でもほぼ同じ考え方が使えます。


なぜ CC はスマホアプリ開発と相性がいいのか
Web 開発と比較したとき、React Native アプリは「何をどこに置くか」のルールが明確です。
src/hooks/      ← Firebaseデータ取得・ビジネスロジック
src/screens/    ← 画面コンポーネント
src/components/ ← 再利用UIパーツ
src/store/      ← 状態管理（Zustand等）
functions/src/  ← Cloud Functions（バックエンド処理）

この構造の明確さが CC への指示精度を大幅に上げます。
# 曖昧な指示（精度が低い）
「タスク管理の機能を作って」

# 具体的な指示（精度が高い）
「src/hooks/useTasks.ts を作成してください。
 onSnapshot でリアルタイム取得し、
 loading / error / data の3状態を返してください」

「どこに作るか」を明示するだけで、CC が余計なリファクタリングをしなくなります。


1. CLAUDE.md をプロジェクト憲法として使う
CC はプロジェクトルートの CLAUDE.md をセッション開始時に自動で読み込みます。ここにプロジェクトのルールを書いておくことで、毎回同じことを説明しなくても CC がプロジェクトの文脈を理解した状態で作業してくれます。

書くべき内容
# MyApp — Claude Code プロジェクトルール

## 技術スタック
React Native (Expo Managed Workflow)
TypeScript strict: true 必須
Zustand — 状態管理
Firebase SDK (modular v9+)

## ファイル配置ルール
| 作るもの           | 置き場所                    |
|------------------|---------------------------|
| 画面コンポーネント | src/screens/{role}/        |
| データ取得hook     | src/hooks/useXxx.ts        |
| バックエンド処理   | functions/src/             |

## セキュリティ必須事項（違反厳禁）
⛔ API Key をクライアントコードに書かない
⛔ 子どものデータをクライアントから直接 Firestore に書き込まない
⛔ any 型の使用禁止

## Gitルール
- デフォルトブランチは main（master 禁止）
- Conventional Commits 形式（feat/fix/chore等）


書かない方がいい内容

秘密情報（API Key・プロジェクトID等）
頻繁に変わる情報（バージョン番号等）
長すぎる説明（CC のコンテキストを圧迫する）


ポイント：セキュリティルールは CLAUDE.md に書く
セキュリティ上の制約（「子どものデータはクライアントから直接書き込まない」等）を CLAUDE.md に明記しておくと、CC が自動でセキュアなコードを生成してくれます。書いていないと、CC は最短経路（クライアントから直接書き込む）を選んでしまいます。


2. tasks/ フォルダによる自律実行システム

CC で開発を進めるときの最大の悩み
長期開発で CC を使っていると、必ずこの問題にぶつかります。


セッションをまたぐと文脈がリセットされる → 毎回「今どこまで進んでいるか」を説明しなければならない

複数タスクの管理が煩雑 → 「次は何をすればいいか」を人間が管理しなければならない

この問題を解決するのが tasks/ フォルダによる自律実行システム です。

仕組み
プロジェクト内に tasks/ フォルダを作り、フェーズ・タスクごとにファイルを置きます。
tasks/
├── ph0/
│   └── STATUS.md       ← 完了済みフェーズの記録
├── ph1/
│   ├── T101_auth.md    ← 認証実装タスク
│   ├── T102_profile.md ← プロフィール実装タスク
│   └── T103_ai.md      ← AI機能実装タスク
└── ph2/
    ├── T201_payment.md
    └── ...

各タスクファイルの構造：
# T101 — 認証基盤

status: pending
phase: ph1
priority: CRITICAL
cc_mode: 全自動

## このタスクで作るもの
- `src/api/auth.ts`（新規）
- `src/store/authStore.ts`（新規）
- `src/hooks/useAuth.ts`（新規）

## CC への指示（そのまま実行する）
認証基盤を実装してください。

src/api/auth.ts: signInWithGoogle, signOut, onAuthStateChanged
src/store/authStore.ts: Zustand（user, isAuthenticated, isLoading）
src/hooks/useAuth.ts: authStore ラップ・各種チェック込み

## 完了後に更新
status: done と書き換えて次のタスクへ進む


CLAUDE.md に自律実行ルールを追記する
## 自律実行モード

**起動時に必ず以下を実行してください：**

1. `tasks/` フォルダを読み込む
2. `status: pending` のうち最初のタスクを探す
3. そのタスクの内容をユーザーに提示して「実行しますか？(Y/N)」と確認する
4. Y なら実行 → 完了後に `status: done` を更新 → 次のタスクへ
5. N なら次のタスクを提示する
6. 「現在地を確認して」と言われたら tasks/ を読んで進捗を一覧表示する


使い方
CC を起動したらこれだけ言えば動きます：
tasks/ フォルダを読んで、次に実行するタスクを教えてください

あとは Y/N で判断するだけ。CC が自分でタスクファイルを読み、実装し、status: done に更新して次へ進みます。

このシステムの最大のメリット
「今どこまで進んでいるか」を CC が自分で把握できる点です。
セッションをまたいでも、CC が tasks/ を読めば現在地を自分で判断できます。人間が毎回説明する必要がありません。また、実装済みのファイルとタスクの対応が明確になるため、「このファイルはどのタスクで作ったものか」が追跡できます。


3. スラッシュコマンドで指示を標準化する
.claude/commands/ フォルダにファイルを置くと、CC 内で /project:コマンド名 として呼び出せます。
.claude/commands/
├── gen-hook.md        → /project:gen-hook
├── gen-screen.md      → /project:gen-screen
├── gen-function.md    → /project:gen-function
├── gen-test.md        → /project:gen-test
├── review-security.md → /project:review-security
└── review-coppa.md    → /project:review-coppa


gen-hook.md の例
# /project:gen-hook — カスタムhook生成

以下のルールに従ってカスタムhookを生成してください。

## 生成ルール
1. `src/hooks/` に配置する
2. ファイル名は `use{機能名}.ts`
3. TypeScript strict で記述する
4. loading / error / data の3状態を返す
5. useEffect のクリーンアップを必ず実装する

## テンプレート
```typescript
export function use{機能名}(): Use{機能名}Return {
  const [data, setData] = useState<{型} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(/* ... */, 
      (snapshot) => { setData(snapshot.data()); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
    return () => unsubscribe(); // クリーンアップ必須
  }, []);

  return { data, loading, error };
}


生成してほしい hook の仕様を入力してください
$ARGUMENTS

使い方：


/project:gen-hook タスク一覧を取得する useTasks hook

スラッシュコマンドの最大の効果は **「いつも同じルールで生成される」** ことです。プロジェクトのコーディング規約を毎回指示しなくても、コマンド側に組み込まれているため一貫性が保たれます。

### review-security.md の例

```markdown
# /project:review-security — セキュリティレビュー

以下のチェックリストで提示されたコードをレビューしてください。

## チェック項目
- [ ] API Key・シークレットがクライアントコードに含まれていないか
- [ ] 子どものデータをクライアントから直接 write していないか
- [ ] ポイント操作に Firestore Transaction が使われているか
- [ ] 認証チェックが Cloud Functions に実装されているか
- [ ] .env ファイルが Git 管理外になっているか

## レビュー対象コード
$ARGUMENTS

コミット前に /project:review-security を実行するだけで、毎回同じチェックが走ります。


4. CCへの効果的な指示の書き方

良い指示の3要素
① 作成先のパスを明示する
# ❌ 悪い例
「タスク管理のhookを作って」

# ✅ 良い例
「src/hooks/useTasks.ts を作成してください」

② 参照すべきファイルを明示する
# ✅ 良い例
「src/hooks/useTasks.ts を作成してください。
 src/types/firestore.ts の Task 型を使ってください。
 src/constants/limits.ts の FREE_LIMITS.MAX_TASKS を参照してください」

③ 制約を明示する
# ✅ 良い例
「functions/src/tasksManager.ts に Cloud Function として実装してください。
 クライアントから直接 Firestore に書き込まないこと。
 TypeScript strict で記述し、any 型は使用しないこと」


「全部一気に作って」は使い方次第
開発が軌道に乗ったら CC に一気に走らせることもできます：
tasks/ フォルダの未完了タスクを全て実装してください。
全タスク完了後にサマリーを表示してください。

ただし コミット前には必ず人間がレビューする ことが前提です。型チェックとセキュリティレビューは CC に任せてはいけません。


5. アンチパターン：やってはいけないこと

① セキュリティを CC に任せっぱなしにする
CC はセキュアなコードを生成しようとしますが、人間のレビューは必須です。特にスマホアプリでは以下を必ず人間が確認してください：
# コミット前の必須チェック
npx tsc --noEmit        # 型エラー 0 件
npm run lint            # ESLint エラー 0 件
npm run test:unit       # テスト PASS

さらに以下を目視確認：

API Key がクライアントコードに含まれていないか
ネイティブモジュール（AdMob 等）の初期化に try-catch があるか


② コミットせずにセッションをまたぐ
CC が生成したコードはこまめにコミットしてください。
# タスク完了のたびにコミット
git add -A
git commit -m "feat: T101 認証基盤実装"

コミットしておけば git reset --hard でいつでも戻れます。CC が間違ったコードを生成しても安心です。

③ Expo Go で開発を続ける
React Native でネイティブモジュール（AdMob・RevenueCat・通知等）を使う場合、Expo Go では動きません。最初から Development Build を使うことを強くお勧めします。
# Development Build を一度作ればあとはホットリロードで開発できる
eas build --profile development --platform android


Expo Go で開発を始めてしまうと、後でネイティブモジュールを追加したときに Expo Go では動かないことに気づき、Development Build に移行する手間が発生します。最初から Development Build で始めることで、この問題を回避できます。


④ EAS Build をリビルドしすぎる
EAS Build の無料枠は 月30ビルドまで です。JS のコード変更だけであれば OTA Update で対応できます。
リビルドが必要な変更
  → app.json の変更（plugin 設定・権限等）
  → ネイティブモジュールの追加・削除

リビルド不要（OTA Update で対応）
  → ソースコードの変更（ほとんどの場合これ）
  → 画面・ロジックの変更



6. まとめ：CC を使うと何が変わるか
今回の開発で得た実感として、CC を使うことで変わったのは以下の点です：
変わること

フェーズ単位の実装スピードが大幅に上がる
定型的なコード（hook・テスト等）の品質が安定する
セキュリティチェックの抜け漏れが減る

変わらないこと

アーキテクチャの設計判断は人間がする
セキュリティのレビューは人間がする
デバッグ・クラッシュ対応は人間がする

CC は「優秀なペアプログラマー」です。最終的な判断は常に人間が行う前提で使うのがベストプラクティスです。


おわりに
この記事で紹介した仕組み（CLAUDE.md・tasks/・スラッシュコマンド）は、スマホアプリ開発に限らず、どんなプロジェクトにも応用できます。特に tasks/ フォルダによる自律実行システム は、長期プロジェクトでの CC 活用において最も効果を実感した手法です。
次の記事では Windows 環境での Development Build 構築とクラッシュデバッグのベストプラクティス を解説します。

この記事は実際のスマホアプリ個人開発の経験をもとに書いています。プロジェクト固有の内容（アプリ名・API Key 等）はすべて除外しています。


補足：なぜ React Native / Expo を選んだのか
この記事を書くにあたって「なぜ React Native を選んだのか」という疑問が出たので、正直に振り返ります。技術選定の判断と、実際に開発してみた結果の乖離は、次に同じ構成で始める方の参考になると思います。

選定理由
① iOS / Android 両対応を1つのコードベースで実現できる
個人開発でプラットフォームごとにコードを書くのは現実的ではありません。React Native と Flutter が主な選択肢になりますが、TypeScript で書けること・Web 開発の知識が活きることから React Native を選びました。
② Expo + EAS Build で Windows から iOS ビルドができる
Mac を持っていなくても iOS 向けの配布ビルドが作れる点は大きな決め手でした。EAS Build がクラウドでビルドしてくれるため、Windows 環境でも App Store 申請まで完結します。
③ Firebase との相性が良い
Firebase SDK が React Native 向けにしっかり整備されており、Auth・Firestore・Cloud Functions・FCM を一気通貫で使えます。バックエンドを別途用意する必要がないため、個人開発のスピードが上がります。
④ CC（Claude Code）との相性
React Native はファイル構造のルールが明確なため、CC への指示が書きやすいです。「src/hooks/useXxx.ts を作成して」という指示で CC が迷わず実装できます。この点は開発を通じて実感しました。


実際に開発してみて発覚したデメリット
選定時には見えていなかった問題が、開発を進める中で出てきました。
① Expo Go ではネイティブモジュールが動かない
AdMob・RevenueCat・プッシュ通知など、ネイティブモジュールを使う機能は Expo Go では動作しません。開発初期に Expo Go で確認しようとして詰まりました。
Expo Go で動く       → JS のみの機能（画面・ロジック等）
Expo Go で動かない  → ネイティブモジュール全般
                       AdMob / RevenueCat / FCM / etc.

最初から Development Build を使うべきでした。 Expo Go は「React Native を体験する」ためのツールであり、本格的なアプリ開発には向いていません。
② peer dependency の競合が多い
複数のネイティブモジュールを組み合わせると peer dependency の競合が頻発します。
# インストール時にエラーが出る
npm install react-native-google-mobile-ads

# 解決策：.npmrc にこれを書く
legacy-peer-deps=true

この設定をローカルの npm install コマンドのオプションではなく .npmrc ファイルに書いておかないと、EAS Build（クラウド環境）でも同じエラーが発生します。
③ Firebase SDK の ESM 問題
Firebase SDK が .mjs ファイルを使用しているため、Metro Bundler（React Native のバンドラー）がデフォルトでは解決できないケースがあります。
// metro.config.js に追加が必要
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('mjs');
module.exports = config;

④ ネイティブモジュールのクラッシュは JS より先に起きる
最も時間を取られたのがこれでした。AdMob の App ID を app.json に設定し忘れると、アプリは Java レイヤーで即座にクラッシュします。JS（React Native）すら起動しないため、ターミナルにエラーが出ません。
# Android ログを取得して原因を特定
adb logcat | findstr "kidsreward|crash|FATAL"

# 出力例
FATAL EXCEPTION: main
Unable to get provider com.google.android.gms.ads.MobileAdsInitProvider:
java.lang.IllegalStateException

adb logcat でログを取得して初めて原因が特定できました。ターミナルにエラーが出ないクラッシュは adb logcat で確認する というのを最初から知っていればかなりの時間を節約できました。


Flutter と比較してどうか
後から振り返ると Flutter も十分な選択肢でした。




React Native + Expo
Flutter




言語
TypeScript（Web経験者に馴染みやすい）
Dart（学習コスト有）


ネイティブモジュール
peer dependency 競合が多い
pub.dev で比較的安定


Firebase
SDK が整備されている
FlutterFire が整備されている


Windows でのiOSビルド
EAS Build で可能
Codemagic 等で可能


CCとの相性
良い（構造が明確）
良い（構造が明確）



TypeScript の資産を活かしたい・Web 開発経験者が多いチームなら React Native。パフォーマンスやネイティブ品質を優先するなら Flutter、という判断になるかと思います。


まとめ：技術選定で後悔しないために
今回の経験から、スマホアプリ開発の技術選定で事前に確認すべきことをまとめます。
✅ 使いたいネイティブモジュールが Expo Managed Workflow で動くか確認する
✅ Development Build を最初から使う前提で計画する
✅ Windows 環境なら .npmrc に legacy-peer-deps=true を最初から書く
✅ firebase.json / app.json の plugin 設定を最初にまとめて設定する
✅ adb のパスを最初から通しておく

技術選定自体よりも、環境構築の初期設定を正しく行うことの方が、開発効率に大きく影響しました。
