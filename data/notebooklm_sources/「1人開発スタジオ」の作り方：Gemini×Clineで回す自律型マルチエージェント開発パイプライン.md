# 「1人開発スタジオ」の作り方：Gemini×Clineで回す自律型マルチエージェント開発パイプライン
- **Source URL**: https://zenn.dev/momoch/articles/88a825d0c374ea
- **Score**: 92
- **Suggested Tags**: #AI駆動開発, #マルチエージェント, #Cline
- **Processed Date**: 2026/9/24

---

## 本文
「AIにコードを書かせる時代」から、「AIにAIをマネジメントさせる時代」へ。
個人開発でコンテキスト爆発とハレーションに絶望した結果、ClineとGeminiで『3専門部門＋1ディレクター』の自律型開発スタジオを構築した実践記録です。


 AIマルチエージェント開発体制の設計思想と自動化パイプライン

 1. はじめに & 課題意識
MOTHER2ライクな2DレトロRPGを個人で開発するにあたり、AIエージェント（Cline / Gemini）をフル活用した開発体制を構築しました。
しかし、AI駆動開発を本格的に進める中で、誰もがぶつかる**「単一チャットセッションの限界」**に直面しました。

 単一セッション開発で直面する3つの壁


コンテキストの爆発と希釈: プログラムコード、シナリオテキスト、ドット絵規格、BGM構成を1つのプロンプト履歴に詰め込むと、あっという間にトークン上限に達し、精度が急降下する。

専門性の混ざり合い（ハレーション）: 「ストーリーを考えて」と頼んだのに、C#コードの命名規則を破壊するようなテキストキーを生成したり、UI仕様を無視したセリフを書き始めたりする。

重度の「記憶喪失」: 長期セッションになると、序盤に決めた統一ID規則（MSG_NPC_01 や FLAG_CH1_*）を忘れて勝手なフラグ名を捏造する。

これらの課題を克服するため、人間が直接コードやシナリオを書くのではなく、「3つの専門部門エージェント」と「全体を統括するAIディレクター」を編成し、ファイルを介して自律的に連携するマルチエージェント開発パイプラインを構築しました。


 2. 体制設計：3部門 ＋ 現場監督（ディレクター）
本プロジェクトでは、リポジトリルートに AGENTS.md（エージェント行動規約）を置き、明確な役割分担とアクセス権限を設けています。
Sternentor/
├── AGENTS.md                   # 全エージェント共通の行動規約
├── .scripts/
│   └── run_departments.py      # マルチエージェントオーケストレーター
├── docs/
│   ├── story/                  # ストーリー部門領域
│   ├── visual_audio/           # オーディオビジュアル(AV)部門領域
│   ├── system/                 # システム部門領域
│   ├── todos/                  # 各部門へのタスク指示書（ToDo）
│   └── logs/                   # 各部門から上がってくる進捗日誌
└── Assets/                     # Unity C#コード・アセット類

 部門ごとの役割と管理ディレクトリ



部門名
主な担当領域
主な管理・編集パス




ストーリー・演出部門
メインシナリオ、NPCセリフ、フラグ定義、アイテム/敵パラメータ

docs/story/, Assets/Data/Dialogue/



オーディオビジュアル(AV)部門
ドット絵規格、UI Prefab、サイケデリックシェーダー、AudioMixer

docs/visual_audio/, Assets/Art/, Assets/Audio/



システム部門
C#コアロジック（移動・カメラ・会話UI・ドラムロールHP・戦闘）

docs/system/, Assets/Scripts/



ディレクター部門（全体統括）
進行管理、部門間点検、ハレーション検知、次回ToDo発行

docs/director/, docs/todos/, docs/logs/





 なぜセッションを分けるのか？（コンテキストの清潔さ）
セッションを役割ごとに分離することで、システム担当には「C#設計とUnity 6 APIの文脈だけ」を、ストーリー担当には「世界観とテキストID規約だけ」を与えることができます。
これによりトークン消費量を数分の1に抑えつつ、各専門領域における出力精度を劇的に向上させることができました。


 3. 開発パイプラインの心臓部（ToDo・日誌・アーカイブ）
マルチエージェントを自律駆動させる心臓部は、API呼び出しではなく**「ファイルベースの情報流通」**にあります。

 情報の循環ループ
[人間（プロデューサー）/ AIディレクター]
          │
          ▼ 1. docs/todos/{dept}-todo.md にタスク発行
[各部門サブエージェント（Story / AV / System）]
          │
          ▼ 2. 成果物生成 & docs/logs/{dept}-log.md にコンパクト日誌出力
[AIディレクター]
          │
          ▼ 3. 全部門の日誌・成果物を総点検＆矛盾チェック (director-log.md)
[人間（プロデューサー）]
          ▼ 4. 最終確認と Git Commit / Push 承認 (ヒューマン・イン・ザ・ループ)

 【重要ノウハウ1】ゾンビタスクを防ぐ「タイムスタンプ退避（YYYYMMDD_HHMMSS）」
非同期や繰り返しスクリプトを実行する際最大の敵となるのが、**「完了したはずの古いToDoをエージェントが何度も再実行してしまうゾンビタスク問題」**です。
これを防ぐため、次回サイクルを開始する直前に、消化済みの docs/todos/*.md を docs/todos/archive/YYYYMMDD_HHMMSS/ へタイムスタンプ付きで自動退避移動させ、常に活性状態のToDoファイルだけを最新に保つ運用を行っています。

 【重要ノウハウ2】仕様ハレーションの自動検知
例えば「ストーリー部門が新しいフラグ FLAG_CH2_FOUND_KEY を定義したが、システム部門のスクリプト側で FLAG_KEY_CH2 と実装してしまった」ようなハレーションが発生した場合、ディレクターが両部門の日誌と定義ファイルを突合・検出します。
ディレクター日誌 (director-log.md) に「システム部門へ：フラグ名がストーリー定義と喰い違っているため修正されたし」と指示を出すことで、破綻を未然に防ぎます。


 4. 現場を回すPythonオーケストレーター (run_departments.py)
エージェント群の並行実行と日誌回収は、Pythonスクリプト .scripts/run_departments.py が担っています。
google-genai SDKを使用し、各部門のプロンプトを構築して並列呼び出しを行います。

 run_departments.py のキー実装（抜粋）
import os
import glob
import time
from datetime import datetime
from dotenv import load_dotenv
from google import genai
from google.genai.errors import ServerError, APIError

load_dotenv() 
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

DEPARTMENTS = [
    {"id": "story", "name": "ストーリー部門", "todo": "docs/todos/story-todo.md", "log": "docs/logs/story-log.md"},
    {"id": "visual-audio", "name": "オーディオビジュアル部門", "todo": "docs/todos/visual-audio-todo.md", "log": "docs/logs/visual-audio-log.md"},
    {"id": "system", "name": "システム部門", "todo": "docs/todos/system-todo.md", "log": "docs/logs/system-log.md"},
]

def generate_with_retry(prompt, model="gemini-3.6-flash", max_retries=3):
    models_to_try = [model, "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-flash-lite"]
    for attempt_model in models_to_try:
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(model=attempt_model, contents=prompt)
                return response
            except (ServerError, APIError) as e:
                print(f"[{attempt_model}] API混雑。リトライ中 ({e})...")
                time.sleep(2)
    raise Exception("全モデルの試行に失敗しました")

def run_department(dept):
    todo_file = dept["todo"]
    log_file = dept["log"]
    today_str = datetime.now().strftime("%Y-%m-%d")

    if not os.path.exists(todo_file):
        return

    with open(todo_file, "r", encoding="utf-8") as f:
        todo = f.read()
    
    prompt = f"""あなたは「Sternentor」の【{dept['name']}】担当エージェントです。
以下のToDoを確認し、完了報告をコンパクトに日誌として記録してください。
【必須】日付は必ず「{today_str}」と記載すること。

【対象ToDo】
{todo}
"""
    
    response = generate_with_retry(prompt)
    
    existing_log = ""
    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            existing_log = f.read()

    header = f"# {dept['name']} 進捗日誌\n\n"
    content_body = existing_log[len(header):] if existing_log.startswith(header) else existing_log

    with open(log_file, "w", encoding="utf-8") as f:
        f.write(header + response.text.strip() + "\n\n" + content_body)
        
    print(f"[{dept['name']}] 完了・日誌出力ヨシ！ ({log_file})")
VS Code上のCline（親エージェント）からこのスクリプトをワンコマンドで呼び出すことで、「AIエージェント（Cline）が、他のAIエージェント群（Gemini API）のマネジメントと進捗点検を自動で回す」 という二重の自動化構造が実現します。


 5. モデル選定と運用・コストの知見（現場のリアル）
実際の開発現場で得られたモデル運用ノウハウと現実的なコスト感です。

 モデルの使い分け（ハイブリッド戦略）


平常運転（日常ループ）: Gemini 3.6 Flash / Gemini 2.5 Flash

圧倒的な爆速応答と超低コスト。ToDo消化・単体スクリプト生成・日誌出力の9割はFlashで完璧にこなせます。



マイルストーン（全体総点検・複雑な設計）: Gemini 3.7 / Gemini 2.5 Pro

各部門の成果物の整合性チェックや、ドラムロールHP×ターン制ステートマシンのような高度なアーキテクチャ設計時にはProモデルを投入します。




 API混雑・遅延時の立ち回り（フォールバック設計）
Gemini APIは時間帯によって一時的な 503 UNAVAILABLE やレート制限が発生することがあります。
スクリプト側で gemini-3.6-flash → gemini-2.5-flash → gemini-1.5-flash へ自動フォールバック＆指数バックオフ・リトライを実装しておくことで、開発ループが止まる事故を完全に防ぐことができます。

 ヒューマン・イン・ザ・ループ（人間の承認）
全自動だからといってすべてを放置するわけではありません。
ディレクターが全体点検を行った後、最後の git add / git commit / git push のトリガーは人間（プロデューサー）が確認して承認する設計にしています。これにより、予期せぬ破壊的変更がメインブランチに混入するリスクをゼロに抑えています。


 6. すぐ使える AGENTS.md テンプレート（抜粋）
自律型マルチエージェントを導入したい方向けの基本テンプレートです。
# AGENTS.md - AI Agent Guidelines

## 1. 役割分担ルール
各エージェントは自身が担当する専門領域以外のファイルを直接編集してはならない。
- **ストーリー部門:** `docs/story/`, `Assets/Data/`
- **AV部門:** `docs/visual_audio/`, `Assets/Art/`, `Assets/Audio/`
- **システム部門:** `docs/system/`, `Assets/Scripts/`
- **ディレクター:** `docs/todos/`, `docs/logs/` の進行管理専用

## 2. 命名・設計規約
- **クラス/メソッド:** PascalCase
- **プライベート変数:** _camelCase / [SerializeField] camelCase
- **ID規格:** MSG_{CATEGORY}_{NAME}, FLAG_{CATEGORY}_{NAME}

## 3. 日誌・報告ルール
作業完了時は必ず `docs/logs/{部門名}-log.md` の冒頭に指定フォーマット（JST日付明記）でコンパクトに追記すること。


 7. おわりに
このマルチエージェント体制を導入して最も大きかった変化は、自分自身の立ち位置が**「泥臭くコードとドキュメントを書き続ける作業員」から、「各部門に指示を出し、出来上がったゲームを評価・遊ぶプロデューサー」へシフトしたこと**です。
AIに専門性を持たせ、適切な組織構造とパイプラインを与えることで、個人開発の限界は大きく広がります。
「コンテキスト爆発に悩んでいる」「AIに大規模開発をさせたい」という方は、ぜひ「ファイルを介したマルチエージェント体制」を試してみてください！
安全確認ヨシ！制作がんばっていきましょう！
