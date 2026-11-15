---
title: "Claude Code・Codex用に、超爆速で超安全なサンドボックスを作る方法 - Qiita"
source: "Qiita"
url: "https://qiita.com/Koukyosyumei/items/3bd4696237ea64c38971"
date: "2026-07"
domain: "other"
tags: ["Claude Code", "Codex", "h5i", "サンドボックス", "セキュリティ"]
score: 92
core_rule: "AIエージェントにシェルコマンドやネットワークアクセスを行わせる際は、OSレベルのサンドボックス（Bubblewrap等）や専用の分離ツール（h5i）を導入し、破壊的変更や機密情報の流出を物理的に防ぐべきである。"
anti_pattern: "制限のない状態でAIエージェントにBashツールを実行させ、誤削除や不正な外部送信を許すこと。"
---

## 1. 解決する課題（Problem）
- AIエージェントがファイル削除、機密情報の外部送信、CPU資源の過剰消費といった破壊的・非効率なコマンドを誤実行するリスクを防ぐ。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** Claude Codeを利用する場合 **THEN** `settings.json` の `sandbox` ブロックでネットワークアクセス先や認証情報（`GH_TOKEN`等）のマスクを設定する。
- **IF** ツールごとの権限を制御する場合 **THEN** `permissions` ブロックの `allow` と `deny` ルールを静的に定義する。
- **IF** より高度な環境分離が必要な場合 **THEN** 軽量サンドボックスツール `h5i` を用いて、専用のGit worktreeとリソース制限（メモリ・プロセス数）を適用した隔離環境を構築する。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- AIエージェントに無制限の危険な権限（`danger-full-access`相当）を常時与えること。
- 認証情報を保護せずにそのままエージェントの実行環境に露出させること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
{
  "sandbox": {
    "enabled": true,
    "network": {
      "tlsTerminate": {},
      "allowedDomains": ["*.github.com", "registry.npmjs.org"]
    },
    "credentials": {
      "envVars": [
        { "name": "GH_TOKEN", "mode": "mask", "injectHosts": ["api.github.com"] },
        { "name": "NPM_TOKEN", "mode": "mask" }
      ]
    }
  }
}
