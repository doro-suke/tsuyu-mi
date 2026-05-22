---
name: dashboard-curator
description: Raindrop.ioから情報を収集し、内容の解析（要約・スコアリング）を行い、ダッシュボードを自動生成・更新する。
---

# Dashboard Curator Skill

## 概要
このスキルは、プロジェクト「つゆみ」のコアとなる自動化パイプラインを実行する。

## 手順 (Self-Execution)
1. **Fetch**: `raindrop-specialist` エージェント（または直接curl）を使用して、Raindrop.ioの特定のコレクションから未読記事を取得する。
2. **Scrape & Summarize**: `web_fetch` を使用して各URLの内容を取得し、Geminiの能力で「3行要約」と「読むべき理由」を抽出する。
3. **Score**: ユーザーの関心事に基づき、優先度(1-5)を決定する。
4. **Update Data**: `data/bookmarks.json` に結果を保存する。既存のデータがある場合はマージし、重複を避ける。
5. **Build UI**: 最新のJSONデータを元に、`index.html` を生成または更新する。

## 成功の定義
- `data/bookmarks.json` が最新の状態に更新されていること。
- `index.html` がブラウザで閲覧可能な状態で、正しく優先度順に並んでいること。
