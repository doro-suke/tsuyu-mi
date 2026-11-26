---
title: "AIでリバースエンジニアリング？「REA（Reverse Engineer Anything）」を調べてみた - Qiita"
source: "Qiita"
url: "https://qiita.com/shuichi-takatsu/items/9aa2e5e14a3acd926d93"
date: "2026-11"
domain: "other"
tags: ["REA", "リバースエンジニアリング", "MCPサーバー", "AIコーディングエージェント"]
score: 45
core_rule: "ソースコードのないアプリケーションの調査には、AIエージェントから解析機能を利用できるツール（REAなど）を活用し、結果の正確性は必ず動作と照合すべきである。"
anti_pattern: "AIが説明したリバースエンジニアリングの解析結果を裏付けなしに絶対的なものとして鵜呑みにすること。"
---

## 1. 解決する課題（Problem）
- ソースコードが手元にないネイティブアプリやWebサイト、バイナリ等の仕組みを調査する際のボトルネックを解消する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** ソースコードのないアプリケーションや実行ファイルを調査する場合 **THEN** Node.js環境で `npx rea-agents setup` を実行し、AIエージェントと連携可能なMCPサーバーとしてセットアップする。
- **IF** ネイティブバイナリの詳細な解析を行う場合 **THEN** Ghidraなどの外部解析エンジンを併用する。
- **IF** 解析結果やエージェントの出力を利用する場合 **THEN** 必ず根拠となる情報や実際の動作と照合して検証する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- ソースコードを完全に復元できるツールと誤認して依存すること。
- ソフトウェアの利用規約やライセンス、解析権限を確認せずに解析を行うこと。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
npx rea-agents setup
