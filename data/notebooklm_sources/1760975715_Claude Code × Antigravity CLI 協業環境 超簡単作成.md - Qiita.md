# Claude Code × Antigravity CLI 協業環境 超簡単作成.md - Qiita
- **Source URL**: https://qiita.com/fallout/items/d699df3d6931c07eb38d
- **Score**: 85
- **AI Summary**:
  - Claude CodeからAntigravity CLIへ協業を可能にするMCP環境構築手順の解説
  - Windows特有のPATH継承問題を解決する具体的なコード改修方法とMCP登録手順の提示
  - 従量課金の回避策やsettings.jsonによるモデル固定など、実運用における注意点を網羅
- **Read Now Reason**: AI駆動開発プロジェクトにおいて、Claude CodeとAntigravity CLI（Gemini）を連携させる具体的なMCP連携手順と、Windows環境で確実に発生するPATHエラーの回避コードが明記されており、即座に開発へ統合できるため。
- **Suggested Tags**: #Claude-Code, #Antigravity-CLI, #MCP-Server, #Gemini, #Windows-PowerShell
- **Processed Date**: 2026/6/17

---

## 本文
0Go to list of users who liked3Share on X(Twitter)Share on FacebookAdd to Hatena BookmarkDelete articleDeleted articles cannot be recovered.Draft of this article would be also deleted.Are you sure you want to delete this article?Claude Code を司令塔に、Antigravity CLI（Gemini 3.5 Flash）を実装役として使う の記事に興味を持った人向けに、初心者でも簡単に環境を構築するためのマークダウンを作ってみました。
以下のマークダウンをそのままClaude Codeに読ませれば、後は良しなにやってくれると思います。

CLIとかよく分からない！という人でも、Claude公式サイトからインストーラーをダウンロード > インストール > アプリ実行 > Codeタブ…からマークダウンを読ませてあげれば、もし Python 等がインストールされてない環境であっても、インストール方法を聞けば教えてくれますし、インストール自体をお任せする事もできると思います。



Claudeに読んでもらうマークダウン
# Antigravity CLI 協業ブリッジ — 環境構築

Claude Code から Antigravity CLI（`agy` / Gemini 3.5 Flash (High)）へ実装を委譲する協業環境のセットアップ手順。
**実機検証日時（2026-06-13 / agy 1.0.8 / Windows 11）。**

> **Claude が読んで実行する想定**。各手順はコマンドベース。Windows / PowerShell 前提。

---

## 前提条件

| 項目 | 確認コマンド | 備考 |
|---|---|---|
| Antigravity CLI | `agy --version` | 未導入なら手順0でインストール。AI Ultra/Pro で **OAuth ログイン済み**であること |
| Python 3.10+ | `python --version` | 未導入環境では導入方法を案内すること |
| git | `git --version` | ブリッジの clone に使用 |

### ⚠️ 最重要：従量課金を避ける
`GEMINI_API_KEY` / `ANTIGRAVITY_API_KEY` を**環境変数に設定しないこと**（設定すると OAuth サブスク枠をバイパスして従量課金になる）。すべて `(未設定)` を確認:
```powershell
foreach ($n in 'GEMINI_API_KEY','ANTIGRAVITY_API_KEY','GOOGLE_API_KEY') {
  foreach ($s in 'Process','User','Machine') {
    $v = [Environment]::GetEnvironmentVariable($n,$s)
    "{0,-22}{1,-8}: {2}" -f $n,$s,$(if($v){'★設定あり'}else{'(未設定)'})
  }
}
```

---

## 0. Antigravity CLI（`agy`）のインストール（未導入の場合）

導入済みなら読み飛ばす。未導入なら **公式（Google 所有ドメイン）** から:
```powershell
irm https://antigravity.google/cli/install.ps1 | iex
```
- インストール先: `%LOCALAPPDATA%\agy\bin\agy.exe`（= `C:\Users\<ユーザー名>\AppData\Local\agy\bin`）
- PATH が変わるのでターミナル（および Claude Code）を再起動
- 初回に `agy` を起動して認証 ── **Google OAuth** を選び **AI Ultra/Pro アカウント**でログイン
- 確認: `agy --version`

> ⚠️ 必ず **公式ドキュメント**（[antigravity.google/docs/cli-install](https://antigravity.google/docs/cli-install)）で最新を確認。macOS / Linux 版も公式に記載。
> 📝 日本語の詳しい解説（スクショ・PATH 設定・課金体系）: [Antigravity CLI セットアップ解説（note）](https://note.com/hantani/n/nee2e9179c67b)

---

## 手順

### 1. agy のモデルを High に固定
`%USERPROFILE%\.gemini\antigravity-cli\settings.json` を読み、`"model"` キーを追加する（既存キーは保持）:
```json
{
  "model": "Gemini 3.5 Flash (High)"
}
```
→ 素の `agy -p` でも High が適用される。`--model` フラグは `-p` と順序依存で不安定なので使わない。

### 2. ブリッジを clone
```powershell
$dest = "$env:USERPROFILE\tools\agy-mcp-bridge"
git clone https://github.com/SinanTufekci/Claude-Code-Antigravity-CLI-MCP-Server.git $dest
```

### 3. server.py を確認し、AGY_BIN 対応に改修
clone 後、`server.py` を必ず目視確認し精査すること（標準ライブラリ + fastmcp のみ / subprocess は引数リスト渡し / `~/.gemini` 配下の読み取り中心 / 不審な外部送信なし）。

**続けて、PATH 問題を予防する改修を入れる**（Windows では MCP サーバーが起動時の古い PATH を継承し agy を見失うため）:
1. import 群の近くにモジュール変数を追加: `_AGY_BIN = os.environ.get("AGY_BIN") or "agy"`
2. agy 呼び出し2箇所を置換: `["agy", …]` → `[_AGY_BIN, …]`（`_get_agy_version` と `_run_agy` 内）

> ⚠️ 注意: `agy -p` は承認ゲート無しでファイル書込み・コマンド実行・ネット送信する自律エージェント。運用は SKILL.md（テキスト提案／コミット前に `git diff`／未信頼テキストを流さない）。

### 4. venv 作成 + fastmcp
```powershell
python -m venv "$dest\.venv"
& "$dest\.venv\Scripts\python.exe" -m pip install fastmcp
```

### 5. スモークテスト（AGY_BIN 設定下で。agy を1〜2回呼ぶ＝クレジット消費）
末尾【付録】の `agy_smoke_min.py` を `%TEMP%` に作成し、**AGY_BIN を設定して**実行:
```powershell
$env:AGY_BIN = "$env:LOCALAPPDATA\agy\bin\agy.exe"
& "$dest\.venv\Scripts\python.exe" "$env:TEMP\agy_smoke_min.py"
```
`agy_ask`→`'PONG'`、`agy_continue`→`'PING'` が数秒で返れば成功（= server.py の AGY_BIN 改修も効いている確証）。

### 6. Claude Code に登録（AGY_BIN 付き・user scope）
```powershell
# 設定をバックアップ
Copy-Item "$env:USERPROFILE\.claude.json" "$env:USERPROFILE\.claude.json.bak" -Force
# AGY_BIN 付きで登録（PATH 継承問題を予防）
claude mcp add agy -s user -e AGY_BIN="$env:LOCALAPPDATA\agy\bin\agy.exe" -- "$dest\.venv\Scripts\python.exe" "$dest\server.py"
# 確認（"agy: ... √ Connected"）
claude mcp list
```
※ このプロジェクト限定にするなら `-s user` を `-s project` に。

### 7. Claude Code を再起動
再起動後、`mcp__agy__agy_ask` / `agy_continue` / `agy_image` / `agy_status` が使える。まず `mcp__agy__agy_status` で `agy CLI [ok]` を確認（疎通診断・quota 消費なし）。

---

## ハマりどころ（背景・検証で判明したこと）
- `agy -p` は **stdout に応答を出さない**（公式 issue #76）→ ブリッジが transcript（`brain/<id>/.system_generated/logs/transcript.jsonl`）の `PLANNER_RESPONSE` を読む。
- 非対話実行は **stdin 閉じ必須**（ブリッジは `subprocess.DEVNULL` 実装済み。手動なら `$null | agy -p "..."`）。
- High は **settings.json** で固定（`--model` フラグは順序依存で不安定）。
- **PATH 継承問題**（手順3・6 の AGY_BIN で予防済み）: 再起動後、MCP サーバーが古い PATH を継承し agy を見失う。User PATH に `agy\bin` があっても起きる。

## トラブルシュート
- **`agy_status` で `agy CLI [!!] not found on PATH`** → AGY_BIN が効いていない。手順3の改修（`_AGY_BIN`）と手順6の `-e AGY_BIN` を確認し、`agy.exe` の実パス（`%LOCALAPPDATA%\agy\bin\agy.exe`）が正しいか確認 → 再登録 → 再起動。
- `mcp__agy__*` が出ない → Claude Code を再起動したか / `claude mcp list` で Connected か。
- 応答が空 → `mcp__agy__agy_status` で診断。settings.json・brain dir を確認。
- **応答が別実行のものに見える／混在する** → agy を IDE 等で並行起動していないか確認。ブリッジは「最新の brain フォルダ＝自分の実行」前提のため、同時起動で transcript が混在する。検証中は他の agy を閉じる。
- agy 更新で壊れた → server.py は agy 1.0.7 の state-file 前提。将来 SQLite 形式へ完全移行すると transcript 読みが壊れる（server.py docstring 参照）。

---

## 【付録】最小スモークスクリプト（`%TEMP%\agy_smoke_min.py`）

```python
"""最小スモーク: ブリッジ経由で agy_ask / agy_continue を実行（画像はスキップ）。"""
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
BRIDGE = os.path.expanduser(r"~\tools\agy-mcp-bridge")
sys.path.insert(0, BRIDGE)
from server import agy_ask, agy_continue

print("smoke1 agy_ask     :", agy_ask(prompt="Reply with exactly one word: PONG", workspace=BRIDGE))
print("smoke2 agy_continue:", agy_continue(prompt="Now reply with exactly one word: PING", workspace=BRIDGE))
print("ALL PASS")
```



結果（Claudeの応答を一部抜粋）
まずこのマシンの現状を把握します。前提条件と既存のセットアップ状態をまとめて確認します。

現状を把握しました。

**整っているもの:** agy ✅ / Python ✅ / git ✅ / agy.exe ✅ / settings.json 存在 ✅ / **環境変数すべて未設定**（従量課金リスクなし）✅

**未完了:** ブリッジ未clone ❌ / venv 未作成 ❌ / MCP 未登録 ❌

なので **手順1〜7** を進めます（手順0 インストールは不要）。まず手順1の settings.json 確認と、手順2の clone を並行で開始します。

手順2の clone 成功（server.py 確認済み）。settings.json には `model` キーが無いので追加します（手順1）。同時に server.py を読んでセキュリティ確認します（手順3）。

## 手順3: server.py のセキュリティ確認

目視確認しました。**問題なし** ✅
- **import:** 標準ライブラリ（json, logging, os, re, shutil, subprocess, threading, time, pathlib, typing）+ `fastmcp` のみ
- **subprocess:** すべて引数リスト渡し（`["agy", ...]`）、`shell=True` なし、`stdin=DEVNULL` 実装済み
- **ファイルアクセス:** `~/.gemini/antigravity-cli/` 配下の読み取り中心
- **外部送信:** 不審なネットワーク送信なし（agy を呼ぶのみ）

続けて **AGY_BIN 改修**（PATH 継承問題の予防）を入れ、**手順4の venv + fastmcp** も開始します。

手順3・4 完了（**fastmcp 3.4.2** インストール済み）。

残るは **手順5 スモークテスト**（agy を1〜2回呼ぶ＝**クレジットを少量消費**します）と **手順6 MCP登録** です。スモークテストは AGY_BIN 改修が効いている確証を得る重要ステップなので、続行します。まず %TEMP% のパスを確定します。

スモークテストを実行します（AGY_BIN を設定下で。ここで agy が応答すれば AGY_BIN 改修も効いている確証になります）。

スモークテスト **成功** ✅（`PONG` / `PING` / `ALL PASS`）。AGY_BIN 改修も効いている確証が取れました。

最後に **手順6: MCP 登録**（`.claude.json` をバックアップしてから AGY_BIN 付き・user scope で登録）。

セットアップ完了しました 🎉 `agy: ... √ Connected` を確認。**手順1〜6 すべて成功**です。

## 実施結果

| 手順 | 内容 | 結果 |
|---|---|---|
| 0 | agy インストール | 不要（1.0.8 導入済み） |
| 1 | settings.json を High 固定 | ✅ `"model": "Gemini 3.5 Flash (High)"` 追加 |
| 2 | ブリッジ clone | ✅ `~\tools\agy-mcp-bridge` |
| 3 | server.py 確認 + AGY_BIN 改修 | ✅ セキュリティOK / `_AGY_BIN` 変数 + 2箇所置換 |
| 4 | venv + fastmcp | ✅ fastmcp 3.4.2 |
| 5 | スモークテスト | ✅ `PONG` / `PING` / `ALL PASS` |
| 6 | MCP 登録（AGY_BIN付き・user scope） | ✅ `√ Connected` |

## 残り: 手順7（あなたの操作が必要）

MCP ツールは**起動時にロード**されるため、登録だけではこの実行中セッションには反映されません。**Claude Code を再起動**してください。

再起動後、新しいセッションで疎通確認（quota 消費なし）:
- `mcp__agy__agy_status` を実行 → `agy CLI [ok]` が出れば完了
- 以降 `mcp__agy__agy_ask` / `agy_continue` / `agy_image` が使えます

再起動後に動作確認まで一緒にやりましょうか？

再起動後に、「動作確認よろしく！」とでも投げれば、作業は終わりです。
再起動後、`mcp__agy__*` ツールが利用可能になっています。まずツールスキーマをロードします。

スキーマをロードしました。まず疎通診断（quota 消費なし）を実行します。

全項目 `[ok]` / **Overall: OK** ✅。AGY_BIN も効いています（`agy CLI [ok] v1.0.8`）。

次に実際の往復応答を確認します（agy を1回呼ぶので quota を少量消費します）。

**完璧に動きました** 🎉 エンドツーエンドで疎通確認できました。

## 動作確認の結果

| 確認項目 | 結果 |
|---|---|
| 再起動後の MCP ツールロード | ✅ `mcp__agy__*` が利用可能に |
| `agy_status`（診断・quota 消費なし） | ✅ 全項目 `[ok]` / Overall: OK |
| `agy_ask`（実応答・往復確認） | ✅ 日本語で正常応答（Gemini 3.5 Flash / Antigravity） |

これで **手順1〜7 すべて完了**、このマシンでのセットアップは完全に終わりです。AGY_BIN 改修も効いており、PATH 継承問題も予防済みです。

## 使えるツール
- `mcp__agy__agy_ask` — 新規会話で質問・委譲
- `mcp__agy__agy_continue` — workspace に紐づく会話の継続
- `mcp__agy__agy_image` — 画像生成
- `mcp__agy__agy_status` — 疎通診断（quota 消費なし）

> ⚠️ 注意（server.py の警告）: `agy -p` は**承認ゲート無し**でファイル書込み・コマンド実行・ネット送信する自律エージェントです。委譲時は**信頼できるプロンプト・信頼できる内容**のみ流し、生成物はコミット前に `git diff` で確認してください。

実際の協業ワークフロー（役割分担・委譲・検証フロー）は `agy-collaboration` スキルにまとまっています。さっそく何か agy に委譲して試してみますか？


最後の、「agy-collaboration スキル」というのは、前回の記事内でも紹介した、AI駆動開発に特化させた独自フレームワーク（Lattice）を使ったSKILLの事ですので、詳細は割愛します。
試しに、「簡単な日記作って！」とお願いしましたが、Latticeの規約を完璧に守ったCRUDを、すぐに作ってくれました。
その程度の事ならFWなんか要らないだろ！と思われるかもしれませんが、そう思う人は、「個人の趣味範囲であれば」特にこだわる必要も無いと思います。※ただし、そのレベルで業務アプリを作るのはやめましょう。
いやはや…凄い時代になったものですね。。。
0Go to list of users who liked3Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up0Go to list of users who liked3Delete articleDeleted articles cannot be recovered.Draft of this article would be also deleted.Are you sure you want to delete this article?
