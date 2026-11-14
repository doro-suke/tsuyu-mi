# Claude Code を司令塔に、Antigravity CLI（Gemini 3.5 Flash）を実装役として使う環境構築【従量課金ゼロ】 - Qiita
- **Source URL**: https://qiita.com/fallout/items/5097f0575b58f4c69b81
- **Score**: 88
- **AI Summary**:
  - Claude CodeからMCP経由でAntigravity CLIを呼び出す環境構築手順を解説。
  - agyの標準出力バグを回避するため、transcriptを読むPythonブリッジを採用。
  - Windows環境でのフリーズ、モデル固定失敗、PATHの不具合に対する具体的な解決策を提示。
- **Read Now Reason**: AI駆動開発において、Claude Codeと無料枠Geminiを連携させる具体的なMCP設定に加え、agy CLIの致命的なバグである「標準出力が空になる問題」や「対話フリーズ」を回避するためのPythonブリッジの構成・設定手順が網羅されており、構築時の大幅な時間ロスを即座に防げるため。
- **Suggested Tags**: #Claude Code, #Gemini, #Antigravity CLI, #MCP, #AI駆動開発
- **Processed Date**: 2026/6/16

---

## 本文
はじめに

当初は Claude Fable 向けに記事を書いていたのですが、環境構築中にClaude Fable が使えなくなるという大事件 が発生してしまいました(笑) ※Claude Opus でも問題なく使える方法ですので、ご参考ください。


それなりに反響があるようですので、Claude Code × Antigravity CLI 協業環境 超簡単作成.md を公開しました。内容に冗長なところもありますが、これを使えば、初心者の方でも比較的簡単に環境を構築できると思います。


「設計とレビューは Claude、コード生成は爆速の Gemini 3.5 Flash に任せる」── この役割分担をローカルで実現する環境を構築したので、手順とハマりどころを共有します。
ポイントは3つです。


Claude Code を司令塔にし、Google の Antigravity CLI（agy）を MCP 経由でサブエージェントとして呼び出す
実装役は Gemini 3.5 Flash (High)（速くて安い、エージェント型コーディング向け）

従量課金ゼロ ── API キーではなく AI Ultra/Pro のサブスク枠（OAuth） で動かす


この記事は実際に構築してハマった罠と解決策が本体です。同じ構成を試す方の時間を節約できれば幸いです（2026年6月13日時点 / agy 1.0.8 / Windows 11）。



なぜこの構成なのか



担当
役割
理由




Claude Fable or Opus
設計・仕様策定・生成コードの検証・確定
規約適合やセキュリティ等を正確に検証できる


Gemini 3.5 Flash (High)
コード生成の主力（実装・テスト）
生成が爆速。まとまった実装を一気に出せる




Antigravity は MCP の "クライアント" 側
Antigravity（agy）自身は、外部 MCP サーバーを呼び出して使う"クライアント"側の製品です。そのため Claude Code から直接 MCP で繋ぐことはできず、agy を呼び出すブリッジを挟む構成になります。
Claude Code ──(MCP)──▶ ブリッジ server.py ──(subprocess)──▶ agy -p ──(OAuth)──▶ Gemini 3.5 Flash (High)
                                                                  ▲ AI Ultra/Pro 枠（従量課金なし）


なぜ「ブリッジ」が必要なのか（← ここが今回の肝）
「agy を Claude Code から呼ぶだけなら、コマンドを叩く単純な MCP サーバーで十分では？」と思うはずです。ところが、それでは動きません。 理由は agy 側のバグです。
agy -p "プロンプト"（非対話モード）には、モデルとの往復は完了しているのに、応答を標準出力に一切返さないというバグがあります（公式 issue #76。exit code は 0、stderr も空という厄介な挙動）。
つまり、コマンドの標準出力をそのまま受け取る素朴な連携では、応答がまったく取れません。しかし、実際の応答は agy 自身が書き出す transcript ファイル
~/.gemini/antigravity-cli/brain/<会話ID>/.system_generated/logs/transcript.jsonl

の PLANNER_RESPONSE エントリに入っています。
そこで、「agy -p を実行しつつ、応答は stdout ではなく transcript ファイルから読み取る」という一手間が必要になります。
これを肩代わりしてくれるのが今回のブリッジで、単なる薄いラッパーではなく stdout バグを回避するための実装になっているわけです。今回は OSS の SinanTufekci/Claude-Code-Antigravity-CLI-MCP-Server を利用しました。

つまり「MCP を使う理由」は2段構えです。①Claude Code の拡張は MCP が標準だから。②agy -p が応答を返さないので、transcript を読む特殊なサーバー（ブリッジ）が必要だから。



前提条件



項目
確認コマンド
備考




Antigravity CLI
agy --version
1.0.8 で検証。AI Ultra/Pro で OAuth ログイン済みであること


Python
python --version
3.10+


git
git --version
ブリッジの取得に使用




補足：Google の Gemini CLI（gemini）は、Antigravity CLI（agy）へ移行しました。個人の AI Pro/Ultra ユーザーは agy を使います。



Antigravity CLI（agy）のインストール
すでに導入済みなら読み飛ばしてください。未導入の場合は 公式（Google 所有ドメイン） からインストールします。
Windows（PowerShell）:
irm https://antigravity.google/cli/install.ps1 | iex


インストール先: C:\Users\<ユーザー名>\AppData\Local\agy\bin

PATH が変更されるので、ターミナル（および Claude Code）を再起動する
初回に agy を起動して認証 ── Google OAuth を選び、AI Ultra/Pro アカウントでログイン（これがサブスク枠 ＝ 従量課金ゼロの起点）
確認: agy --version



⚠️ インストールは必ず 公式ドキュメント（antigravity.google/docs/cli-install）で最新を確認してください（CLI 導入はシステムに変更を加えるため、出所が 公式ドメインであることが重要。macOS / Linux 版も公式に記載があります）。


構築手順

0. 【重要】従量課金を避ける設定確認
agy の認証は --api-key フラグ → 環境変数 → OAuth の順に解決されます。GEMINI_API_KEY などが設定されていると、サブスク枠の OAuth をバイパスして従量課金 API に流れます。
まず全スコープで未設定を確認します（すべて「未設定」になればOK）。
'GEMINI_API_KEY','ANTIGRAVITY_API_KEY' | %{ $n=$_; 'Process','User','Machine' | %{ "{0,-20}{1,-8}: {2}" -f $n,$_,$(if([Environment]::GetEnvironmentVariable($n,$_)){'★設定あり'}else{'未設定'}) } }


1. モデルを High に固定
%USERPROFILE%\.gemini\antigravity-cli\settings.json に "model" を追記します。
{
  "model": "Gemini 3.5 Flash (High)"
}


後述しますが、--model フラグではなくこの settings.json 方式がオススメです。


2. ブリッジを取得

"$env:USERPROFILE\tools\agy-mcp-bridge" は、環境に合わせて任意の場所に変更してください。

$dest = "$env:USERPROFILE\tools\agy-mcp-bridge"
git clone https://github.com/SinanTufekci/Claude-Code-Antigravity-CLI-MCP-Server.git $dest


clone 後、server.py の中身は必ず目視確認を。2026年6月13日時点では、標準ライブラリ + fastmcp のみで、~/.gemini 配下を読むだけの薄い実装でした（ただし後述のセキュリティ注意あり）。


3. 仮想環境 + fastmcp
python -m venv "$dest\.venv"
& "$dest\.venv\Scripts\python.exe" -m pip install fastmcp


4. Claude Code に登録
claude mcp add agy -s user -- "$dest\.venv\Scripts\python.exe" "$dest\server.py"
claude mcp list   # "agy: ... ✓ Connected" を確認


5. Claude Code を再起動
再起動後、mcp__agy__agy_ask / agy_continue / agy_status などのツールが使えるようになります。※agy_status はクレジット消費ゼロの診断ツールです。


ハマりどころ4選（実装・運用の罠）

※ 最大の罠「agy -p が stdout に応答を返さない」は、前述（ブリッジが必要な理由）の通りです。ブリッジを使えば吸収されますが、自前で連携を組むなら transcript を読む実装が必須です。


① 【必須】非対話実行は stdin を閉じる
agy -p を stdin を開いたまま呼ぶと起動直後にフリーズします。
解決：subprocess なら stdin=subprocess.DEVNULL、シェルなら $null | agy -p "..." のように stdin を閉じます（ブリッジは実装済み）。

② High モデルは --model ではなく settings.json で
直感的には agy -p --model "Gemini 3.5 Flash (High)" "..." としたくなりますが、この順序だと無視され、会話すら作られません。※--model を -p の前に置くと効きます。
解決：手順1のとおり settings.json の "model" で固定するのが確実。これなら素の agy -p でも High が適用されます（実機で transcript の Model Selection ... to Gemini 3.5 Flash (High) を確認）。

③ 再起動後に agy が PATH から消える（Windows）
agy_status で agy CLI [!!] not found on PATH が出ました。調べると User 環境変数の PATH には agy\bin があるのに、MCP サーバーからは見えない。Claude Code が起動時の古い PATH を継承していて、既存プロセスは環境変数の変更を引き継がないためです（Windows でありがち）。
解決：PATH の反映に依存せず、agy のフルパスを明示します。


server.py の agy 呼び出しを環境変数対応にする（["agy", …] → [os.environ.get("AGY_BIN") or "agy", …]、2箇所）
env 付きで再登録：

claude mcp add agy -s user -e AGY_BIN="%LOCALAPPDATA%\agy\bin\agy.exe" -- "<python>" "<server.py>"


事前検証のコツ：$env:AGY_BIN="<フルパス>" を設定してスモークを走らせ、PASS すれば再起動後の MCP でも確実に動きます。


④ サブスク枠にもレート制限はある
AI Ultra/Pro 枠は追加課金なしですが、デイリー上限はあります。枯渇すると一時停止するので、重い生成を agy に寄せ、軽微な編集は司令塔（Claude）が直接やるといった配分が有効です。

⚠️ セキュリティ注意：agy -p は承認ゲートなしでファイル書き込み・コマンド実行・ネット送信を行う自律エージェントです。--sandbox も完全な境界にはなりません。信頼できるプロンプト・内容のみに使い、重要な変更はコミット前に git diff でレビューしましょう。



協業フローと実演
司令塔（Claude）に AI 協業ポリシーを SKILL.md として持たせ、こんな感じで回します。
① Claude が設計   →  ② agy が High で爆速生成  →  ③ 静的検査（テスト）  →  ④ Claude が精査  →  ⑤ 確定

筆者は、自作のAIコーディング特化 PHP フレームワークLattice （規約を静的検査テストで機械的に強制する自己検証型）で試しました。
「自動検査」を②と④の間に挟むのが強力で、agy の生成物が規約違反していれば即座に分かります。3層（爆速生成・自動検査・人間級レビュー）が噛み合うと、速くて正確な開発ループになります。


まとめ

Claude Code から Antigravity CLI を MCP ブリッジで呼び、Claude = 設計/検証・Gemini Flash = 生成の分業が実現できた

ブリッジが必要な理由は、agy -p の stdout バグ（公式 issue #76）── 応答は transcript から読む

従量課金ゼロ（OAuth サブスク枠、GEMINI_API_KEY を設定しないのが鍵）
運用の罠は stdin・モデル指定・PATH 継承・課金経路 の4つ
フレームワークの静的検査テストを協業ループに組み込むと、品質が機械的に担保される

API キーを使う「プロキシ方式」は、Google の ToS 違反で BAN 報告があるため不採用としました。サブスク枠を正規に使う本構成が、コスト面でも規約面でも安心です。
