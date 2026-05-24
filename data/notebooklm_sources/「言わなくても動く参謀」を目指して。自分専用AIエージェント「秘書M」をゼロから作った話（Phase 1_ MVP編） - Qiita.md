# 「言わなくても動く参謀」を目指して。自分専用AIエージェント「秘書M」をゼロから作った話（Phase 1: MVP編） - Qiita
- **Source URL**: https://qiita.com/Lifect/items/a78081bd585bd6f2142f
- **Score**: 78
- **AI Summary**:
  - FastAPIとClaude API、LINE、各種Google APIを連携したAIエージェントのMVP実装。
  - Railway等のクラウド環境におけるOAuth認証トークン管理の実践的な解決策の提示。
  - APSchedulerのタイムゾーン設定やGoogle OAuthのエラー対策など具体的なトラブル解決法。
- **Read Now Reason**: LINEと各種Google API（Gmail、Calendar）を仲介するFastAPIの実装方法や、クラウド環境（Railway）でのOAuth認証情報保持、タイムゾーン設定を伴う定期実行など、AI駆動開発や自動化パイプラインに直結する具体的コードと解決策が豊富に含まれているため。
- **Suggested Tags**: #AIエージェント, #FastAPI, #LINE-API, #OAuth, #Railway
- **Processed Date**: 2026/5/24

---

## 本文
「言わなくても動く参謀」を目指して。自分専用AIエージェント「秘書M」をゼロから作った話（Phase 1: MVP編）

はじめに
こんにちは、SHOWGO（@lifectai）です。
福祉施設の管理職をしながら、AIエンジニアへの転職を目指して個人開発を続けています。
今回は自分専用のAIエージェント**「秘書M」**のPhase 1（MVP）が完成したので、設計・実装・失敗・学びを全部まとめます。


なぜ作ったのか
きっかけは漫画・ドラマ『スタンドUPスタート』に登場する「秘書M」というキャラクターです。
AI COO＋戦略参謀＋秘書という役割を持つそのキャラクターを見て、「これを現実に作れないか」と思ったのが始まりです。
ただ、世の中にある「AIアシスタント」は正直どれも物足りなかった。



項目
普通のAIアシスタント
秘書M（目指すもの）




主な役割
言ったことをやる
言わなくても動く


記憶
会話が終わると忘れる
全てを永続蓄積・成長する


判断
指示通り実行
自分の軸で先読み・警告


自発性
呼んだ時だけ応答
定時ブリーフィング・緊急通知



「正解を出すのではなく、自分が正解を出せる環境をつくる」
それが秘書Mのコンセプトです。


システムアーキテクチャ（5層構造）
将来の拡張を見越して、最初から5層構造で設計しました。

Phase 1ではまず「動く秘書M」を作ることに集中し、1層・4層・5層を実装しました。Phase 2以降で2層（記憶・蓄積）・3層（デジタルツイン）を追加し、Phase 3〜5で音声入力・SaaS化・マネタイズまで段階的に拡張していく設計です。


技術スタック



役割
技術
選定理由




バックエンド
Python / FastAPI
シンプル・LINEのWebhookに最適


AI
Claude API（claude-sonnet-4-6）
日本語理解の精度が高い


メッセージング
LINE Messaging API
スマホから気軽に話しかけられる


メール
Gmail API
個人メールに直接アクセスできる


カレンダー
Google Calendar API
予定の読み書きが容易


DB
Supabase
無料枠あり・PythonSDKが使いやすい


デプロイ
Railway
簡単・GitHubと連携して自動デプロイ


定期実行
APScheduler
朝ブリーフィングの自動送信に使用





実装したPhase 1の機能

機能一覧
LINEで話しかけるだけで以下が全部できます。



機能
使い方（例）
動き




Claudeと会話
「おはよう！」
秘書Mとして返答


Gmail未読確認
「メール確認して」
未読5件を重要度付きで要約


Gmail返信代行
「〇〇に返信して：検討します」
返信文生成→Gmail下書き保存→送信


カレンダー確認
「今日の予定は？」
今日の予定一覧を返答


カレンダー登録
「明日10時にミーティングを追加して」
Googleカレンダーに自動追加


タスク登録
「〇〇をタスクに追加して」
重要度×緊急度で自動分類してSupabaseに保存


タスク提案
「何やる？」
重要度・緊急度順にTop3を提案


タスク完了
「〇〇を完了にして」
Supabaseのstatusを更新


進捗確認
「進捗どう？」
完了・進行中・未着手の件数を返答


締切警告
自動（1時間ごと）
締切24時間以内のタスクをLINEに通知


朝ブリーフィング
自動（毎朝7時）
予定・タスク・メールをまとめてLINEに送信





開発プロセス（Issue駆動開発）
個人開発ですが、チーム開発の作法を最初から取り入れました。
Issue作成 → ブランチ作成 → 実装 → Push → PR → マージ → ブランチ削除

なぜ一人でIssueとPRを使うのか？

開発プロセスをポートフォリオとして見せるため
コミットの粒度・PRの書き方を身につけるため
「何を作っているか」を常に言語化するため

Issue一覧（Phase 1）：



#
タイトル
状態




#1
開発基盤の整備
✅


#2
RailwayデプロイとURL取得
✅


#3
LINE Webhook設定
✅


#4
LINEでClaudeと会話
✅


#5
Gmail API連携・未読取得・要約
✅


#6
Gmail返信代行
✅


#7
Google Calendar API連携
✅


#8
タスク管理DB構築
✅


#9
タスク締切警告・APScheduler
✅


#10
朝ブリーフィング自動送信
✅


#11
Phase 1統合テスト
✅





実装のポイント

1. LINEとFastAPIの連携
LINEからのメッセージはWebhook（HTTPのPOSTリクエスト）で届きます。キーワードで処理を振り分けています。

@app.post("/webhook")
async def webhook(request: Request):
    signature = request.headers.get("X-Line-Signature", "")
    body = await request.body()
    handler.handle(body.decode("utf-8"), signature)
    return "OK"

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    user_message = event.message.text

    if "メール確認" in user_message:
        reply_text = get_unread_emails()
    elif "返信して" in user_message:
        reply_text = create_reply_draft(user_id, user_message)
    elif "今日の予定" in user_message:
        reply_text = get_today_events()
    elif "タスクに追加" in user_message:
        reply_text = add_task(user_message)
    else:
        # キーワードが一致しない場合はClaudeで会話
        response = claude.messages.create(...)
        reply_text = response.content[0].text


2. Gmail OAuth認証のRailway対応
GmailのOAuth認証はローカルで実行してtoken.jsonを生成し、その内容をRailwayの環境変数として渡します。token.jsonはGitHubにアップできないため、この方法が必要です。
def get_gmail_service():
    token_json = os.getenv("GOOGLE_TOKEN_JSON")
    if token_json:
        # Railway環境：環境変数からtoken情報を読み込む
        creds = Credentials.from_authorized_user_info(
            json.loads(token_json), SCOPES)
    elif os.path.exists('token.json'):
        # ローカル環境：ファイルから読み込む
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)


3. Gmail返信代行のフロー
「〇〇に返信して」というLINEのメッセージから、実際にGmailの下書きを作成するまでの流れです。

① LINEで「〇〇に返信して：検討します」
        ↓
② ClaudeでGmail検索キーワードを抽出（「subject:〇〇」など）
        ↓
③ Gmail APIで該当メールを検索
        ↓
④ Claudeで丁寧な返信文を生成
        ↓
⑤ drafts().create() でGmailの下書きフォルダに保存
        ↓
⑥ LINEに下書き内容を表示
        ↓
⑦ 「送信して」→ drafts().send() で実際に送信

ポイント： 「送信して」と言うまで送信されない安全な設計。下書きはGmailでも確認できる。

4. 朝ブリーフィング（APScheduler）
毎朝7時に予定・タスク・メールを自動でLINEに送信します。
from briefing_service import send_morning_briefing

# 1時間ごとに締切チェック
scheduler.add_job(check_task_deadlines, 'interval', hours=1)

# 毎朝7時にブリーフィング送信（日本時間）
scheduler.add_job(
    send_morning_briefing,
    'cron',
    hour=7,
    minute=0,
    timezone='Asia/Tokyo'  # ← これが重要
)
scheduler.start()

重要： RailwayのサーバーはUS West（UTC-8）にあります。timezone='Asia/Tokyo'を指定しないと日本時間の7時に送られません。

5. タスク管理（Supabase）
タスクは重要度×緊急度の2軸で自動分類してSupabaseに保存します。
tasksテーブル
┌────────────────────────────────────────────────┐
│ id │ title │ priority │ urgency │ status │ deadline │
│ UUID │ TEXT │ 1〜5 │ 1〜5 │ TEXT │ TIMESTAMP │
└────────────────────────────────────────────────┘

status の種類：未着手 / 進行中 / 完了 / 期限切れ


つまづいたこと5選（失敗談）

① OAuth認証で redirect_uri_mismatch

症状： ブラウザに「エラー400: redirect_uri_mismatch」が出てGmail認証が完了できない。
原因： port=0（ランダムポート）を使っていたため、Google Cloud Consoleに登録したリダイレクトURIと一致しなかった。
解決：
# NG
creds = flow.run_local_server(port=0)

# OK
creds = flow.run_local_server(port=8080)



② Railway障害でデプロイが進まない
症状： PRをマージしてもRailwayのデプロイがInitializationのまま進まない。Railwayのステータスページは「Fully Operational」と表示しているのに動かない。
原因： Railway内部のネットワークタイムアウト（Railway側の障害）。
解決： 空コミットでpushして再デプロイをトリガーする。
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main

学び： Railway自体のステータスページが「正常」でも内部障害は起きる。デプロイが進まない時は空コミットで再トリガーが有効。


③ タイムゾーンエラー
症状： 締切チェック時にcan't subtract offset-naive and offset-aware datetimesエラー。
原因： Supabaseから取得した日時にタイムゾーン情報がある場合とない場合が混在していた。
解決： 両方のパターンに対応する。
deadline_str = task["deadline"]
if "+" not in deadline_str and "Z" not in deadline_str:
    # タイムゾーン情報がない → UTCとして扱う
    deadline = datetime.fromisoformat(deadline_str).replace(tzinfo=timezone.utc)
else:
    # タイムゾーン情報がある → そのまま変換
    deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))



④ Gmail下書きの Invalid To header エラー
症状： 下書き作成時にHttpError 400: Invalid To headerが出てGmailに保存できない。
原因： Gmailから取得したFromヘッダーが"名前 <email@example.com>"という形式になっていて、そのままMIMEメッセージのToに入れていた。
解決： 正規表現でメールアドレスだけ取り出す。
import re
sender_raw = next((h['value'] for h in headers if h['name'] == 'From'), '')
match = re.search(r'<(.+?)>', sender_raw)
sender = match.group(1) if match else sender_raw



⑤ 締切済みタスクが1時間ごとに通知されてLINEでブロックされた
症状： テスト用に作った締切済みタスクが1時間ごとに通知され続け、秘書MをLINEでブロックする羽目になった。
原因： check_task_deadlines()に「締切を過ぎた場合の処理」が存在しなかった。diff.total_seconds() < 0のケースを考慮していなかった。
解決： 締切を過ぎたタスクは「期限切れ」ステータスに自動更新する。
diff = deadline - now

if 0 < diff.total_seconds() < 86400:
    # 締切まで24時間以内 → 警告通知
    warning_tasks.append(task)
elif diff.total_seconds() <= 0:
    # 締切を過ぎている → 期限切れに更新（繰り返し通知を防ぐ）
    supabase.table("tasks").update(
        {"status": "期限切れ"}
    ).eq("id", task["id"]).execute()



動作確認（スクリーンショット）

① Claudeと会話
「おはよう！」と送ると、秘書Mとして返答してくれます。



② Gmail未読確認
「メール確認して」と送ると、未読メールを重要度付きで要約して返信してくれます。フィッシング詐欺の警告まで自動で出してくれます。




③ Gmail返信代行
「〇〇に返信して：内容」と送ると、返信文を生成してGmailの下書きフォルダに保存します。「送信して」で実際に送信されます。






④ Googleカレンダー確認
「今日の予定は？」と送ると、今日の予定一覧が返ってきます。



⑤ カレンダー予定追加
「明日10時にミーティングを追加して」と送ると、Googleカレンダーに自動追加されます。





⑥ タスク登録
「〇〇をタスクに追加して」と送ると、重要度×緊急度で自動分類してSupabaseに保存されます。





⑦ タスク提案
「何やる？」と送ると、重要度×緊急度のスコア順にTop3を提案してくれます。



⑧ タスク完了
「〇〇を完了にして」と送ると、Supabaseのstatusが「完了」に更新されます。




⑨ 進捗確認
「進捗どう？」と送ると、完了・進行中・未着手の件数をまとめて返答してくれます。



⑩ 朝ブリーフィング（毎朝7時・自動送信）
毎朝7時に予定・タスク・メールを自動でまとめてLINEに送信してくれます。話しかけなくても勝手に届きます。




⑪ 締切警告（自動通知）
締切24時間以内のタスクがあると、1時間ごとに自動でLINEに通知してくれます。





学んだこと

技術面


OAuth認証の仕組み：ユーザーがパスワードを教えずにアプリへのアクセスを許可する仕組み。個人のGmailにアクセスするには必須。

RailwayとローカルのAPIキー管理：どちらにも設定が必要。token.jsonのような機密ファイルは環境変数経由で渡す。

APSchedulerのintervalとcron：intervalは一定間隔、cronは特定の時刻に実行。タイムゾーンの指定を忘れずに。

Supabaseのテーブル設計：PythonのSDKで直感的に読み書きできる。RLSの設定は個人用なら無効でOK。

Gmail drafts API：drafts().create() → drafts().update() → drafts().send() の流れ。


開発プロセス面


Issue→PR→マージのサイクルを回すこと：個人開発でもIssueとPRを使うと、「何をやったか」が記録として残る。ポートフォリオとして見せやすい。

こまめにコミット・プッシュ：AIにコードを壊された時のロールバックポイントになる。

デプロイ完了を確認してからテスト：デプロイ前にテストして「直ってない！」と焦ることが何度かあった。RailwayのログでApplication startup complete.を確認してからテストする。

テストデータは必ず削除：締切済みのテストタスクを放置してLINEをブロックされた。テスト後のクリーンアップは大事。



ブラッシュアップ：実装の裏側

1. Claude APIのSystem Prompt（秘書Mとして振る舞わせる）
通常の会話はこのSystem Promptで秘書Mとして動かしています：
response = claude.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1000,
    system="あなたはSHOWGOさん専用の秘書Mです。簡潔に、具体的に答えてください。",
    messages=[{"role": "user", "content": user_message}]
)

シンプルに見えますが、「簡潔に、具体的に」 という指示が重要です。長文で曖昧な返答はLINEのUIに向いていないため、あえて短く絞っています。
各機能ごとにSystem Promptを使い分けているのもポイントです。



機能
System Prompt の要点




メール要約
3行以内・重要度（高/中/低）を判定・添付ファイルがあれば記載


返信文生成
丁寧・簡潔・プレーンテキストのみ（MarkdownやHTML禁止）


タスク抽出
JSONのみ返答・重要度・緊急度が不明なら3にする


タスク特定
IDのみ返答



特にタスク関連はJSONやIDのみ返答させることで、パースエラーを防いでいます。


2. タスクの「重要度×緊急度」自動分類ロジック
「〇〇をタスクに追加して」というLINEの自然文から、ClaudeがJSONを生成してSupabaseに保存する流れです。
def add_task(instruction):
    # Claudeに重要度・緊急度を判断してもらう
    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        system="""タスク追加の指示から以下をJSON形式で抽出してください。
{
  "title": "タスク名",
  "priority": 重要度(1-5の数字),
  "urgency": 緊急度(1-5の数字)
}
重要度・緊急度が不明な場合は3にしてください。JSONのみ返答してください。""",
        messages=[{"role": "user", "content": instruction}]
    )

    raw = response.content[0].text.strip()
    raw = raw.replace('```json', '').replace('```', '').strip()

    task_info = json.loads(raw)

    # Supabaseに保存
    supabase.table("tasks").insert({
        "title": task_info["title"],
        "priority": task_info["priority"],
        "urgency": task_info["urgency"],
        "status": "未着手"
    }).execute()

提案時は重要度×緊急度のスコアでTop3を出します。
def suggest_task():
    tasks = supabase.table("tasks").select("*").in_(
        "status", ["未着手", "進行中"]
    ).execute().data

    # 重要度×緊急度でスコアを計算してソート
    for task in tasks:
        task["score"] = task["priority"] * task["urgency"]

    tasks.sort(key=lambda x: x["score"], reverse=True)
    top_tasks = tasks[:3]

例えば「重要度5・緊急度5」のタスクはスコア25で最優先。「重要度1・緊急度1」はスコア1で後回し。シンプルですが実用的です。


3. Phase 2のデジタルツイン：AIに「自分の価値観」を学習させる
Phase 2で実装予定の最も重要な機能がデジタルツインです。
自分の価値観・判断パターン・現在地をJSONで構造化し、会話のたびに自動更新します。
{
  "values": [
    "本質志向・表面的なものを嫌う",
    "消耗したくない",
    "納得しないと動かない"
  ],
  "decision_patterns": [
    "浅い提案には即座に気づく",
    "理想から逆算して考える",
    "まず2週間で動くものを作る"
  ],
  "goals": {
    "income": "年収840万以上",
    "career": "AIフリーランス・福祉×AI"
  },
  "emotional_state": {
    "energy": 0.8,
    "motivation": 0.9,
    "stress": 0.3
  }
}

このデジタルツインをClaude APIに渡すことで、「SHOWGOさんならこう判断する」を推定できるようになります。
技術的には以下の構成で実装予定です：
会話履歴 → Supabase（pgvector）に保存
        ↓
会話終了後 → Claudeが重要情報を自動抽出
        ↓
デジタルツインJSON を自動更新
        ↓
次回の提案精度が上がる

pgvectorはSupabaseに組み込まれているベクトル検索エンジンです。過去の会話を意味ベースで検索できるため、「先週話した転職の話」も文脈として参照できるようになります。
Phase 2が完成したとき、秘書Mは初めて「参謀」と呼べる存在になります。

今後の展望（Phase 2・3）

Phase 2（参謀機能）

会話履歴の永続蓄積（Supabase + pgvector）
RAG実装（過去の文脈を参照して回答）

デジタルツイン：自分の価値観・判断パターン・目標をJSONで構造化し、自動更新
参謀判断ロジック：「それはSHOWGOさんの軸に合いません」と言えるAI


Phase 3（完全版）

Whisper APIで音声入力対応
議事録の自動生成
転職活動サポート（書類添削・企業リサーチ）
ダッシュボード（Streamlit）



リポジトリ



おわりに
福祉施設の管理職からAIエンジニアへの転職を目指して、「言うだけでなく作る」ために始めたプロジェクトです。
Phase 1を通して、「AIを使ったことがある」から「AIエージェントを設計から実装まで一人でやりきった」というステージに上がれた気がしています。
失敗も全部書きましたが、その分リアルな学びが詰まっています。
Phase 2も記事にします。もし参考になったり共感していただけたら、LGTMやフォローをいただけると励みになります！
