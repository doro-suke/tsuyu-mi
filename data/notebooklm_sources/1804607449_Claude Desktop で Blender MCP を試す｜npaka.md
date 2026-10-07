# Claude Desktop で Blender MCP を試す｜npaka
- **Source URL**: https://note.com/npaka/n/n060bf656cf01
- **Score**: 35
- **AI Summary**:
  - Claude DesktopとBlenderをMCP連携し自然言語で3D操作を行う手順を解説。
  - Blender公式MCPサーバーをドラッグ＆ドロップで導入するセットアップ方法を網羅。
  - プロンプト指示によりキャラクターの3Dモデル作成や調整を行う実践例を提示。
- **Read Now Reason**: MCP（Model Context Protocol）を活用した外部GUIツール制御の具体的な手順と設定フローを把握できるため。
- **Suggested Tags**: #MCP, #Blender, #Claude Desktop, #AIツール連携
- **Processed Date**: 2026/7/30

---

## 本文
「Claude Desktop」で「Blender MCP」を試してみたのでまとめました。1. Blender MCP「Blender MCP」を使うと、Claude Desktopとの会話からBlenderを操作できます。例えば、次のような処理を自然言語で指示できます。・オブジェクトの作成・移動・削除・マテリアルやモディファイアの設定・カメラやライトの配置・既存シーンの分析と整理・Blender Python APIを使った処理「Blender MCP」には、次の2種類があります。・Blender公式MCPサーバー：Blender Labが提供する公式版・BlenderMCP：コミュニティ版本記事では、Blender公式MCPサーバーを利用します。2. セットアップ2-1. インストール(1) Claude DesktopとBlenderのインストール。・Claude Desktop・Blender 5.1以降Claude Desktopは、通常のチャットやデスクトップ作業に対応する「ホーム」と、開発作業向けの「Code」を統合したデスクトップアプリです。本記事では、「Code」を利用します。2-2. Claude Desktop のセットアップ(1) 「Claude Desktop」の「＋ → コネクタ → コネクタを参照」を選択。(2) 「Blender」を検索して「＋」をクリック。(3) 「インストール」をクリック。(4) 「有効」であることを確認して「設定」をクリック。(5) 「読み取り専用ツール」と「書き込み/削除ツール」を「常に許可」。編集してもらいたいので「常に許可」にしてます。(6) モードで「自動」を選択。長時間作業してもらいたいので「自動」にしています。2-3. Blender公式MCPサーバーのセットアップ(1) 「Blender MCP Server」のページを開き、そのページ内にあるインストールリンク（Drag and Drop into Blender）を「Blender」のウィンドウにドラッグ&ドロップ。(2) 新規エクステンションリポジトリを追加するように促されるので、「Add Repository」と「作成」をクリック。(3) 同じリンクをもう一度Blenderにドラッグ&ドロップすると、エクステンションのインストールを促されるので「OK」をクリック。(4) 「Claude Desktop」で動作確認。Blenderを起動してる状態で、Claude DesktopでBlenderと繋がっているか確認。Blenderと繋がってる？3. Claude Desktop で Blender MCP を試す(1) 指示を入力。Blenderで添付のキャラクターの3Dモデルを作成して顔や模様はテクスチャで(2) 作成結果を確認。1回でうまくいかなくても追加指示すれば調整してくれます。関連
