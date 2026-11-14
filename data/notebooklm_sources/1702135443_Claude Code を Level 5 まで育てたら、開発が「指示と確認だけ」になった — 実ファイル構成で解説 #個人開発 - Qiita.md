---
title: "Claude Code を Level 5 まで育てたら、開発が「指示と確認だけ」になった — 実ファイル構成で解説 #個人開発 - Qiita"
source: "Qiita"
url: "https://qiita.com/teppei19980914/items/8da88b33ffa8cf88dfa2"
date: "2026-05"
domain: "other"
tags: ["CLAUDE.md", "Skills", "Hooks", "Agents", "settings.json"]
score: 92
core_rule: "同じ指摘や手順説明の繰り返しを契機として、Level 2（CLAUDE.md 150行以内）→ Level 3（Skills手順分離）→ Level 4（Hooks自動検証）→ Level 5（Agents並行レビュー）へと段階的に仕組み化し、人間の作業を「指示と動作確認」のみに集約する。"
anti_pattern: "CLAUDE.mdにすべての詳細手順を詰め込んで肥大化させたり、毎回チャットでテスト実行や整形を人間が指示し続けること。"
---

## 1. 解決する課題（Problem）
- Claude Code導入初期に毎回同じルール説明・定型手順・テスト実行・レビュー依頼を手打ちしなければならず、AIにコードを書かせるだけで開発の自律化が進まない課題を解決する。

## 2. 実践ルール・判断基準（Actionable Rules）
- **IF** 毎回同じプロジェクト規約（UIテキスト外出し等）を指摘している場合 **THEN** ルートの `CLAUDE.md` を150行以内に保ちつつ優先度・具体パス・コマンドを記載する。
- **IF** 定型作業の手順が長くなる場合 **THEN** `.claude/skills/` にMarkdown手順書として分離しオンデマンド読込させる。
- **IF** 整形やテスト実行を毎回手動指示している場合 **THEN** `.claude/settings.json` の `PostToolUse`（Write|Edit時Formatter）と `Stop`（静的解析・テスト・6観点チェック）Hooksで強制自動実行する。
- **IF** レビューで毎回同じ指摘をしている場合 **THEN** `.claude/agents/` に専門レビュワー（label/security/performance/seo）を定義して並行自動実行させる。

## 3. 避けるべきアンチパターン（Anti-Patterns）
- Level 1の素のプロンプトのまま毎回同じ制約事項を手入力し続けること。
- CLAUDE.mdに150行を超える詳細な作業手順まで抱え込ませて肥大化させること。
- HooksやAgentsを組まずに品質チェックを人間の記憶と都度指示に依存すること。

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "npx prettier --write $(ファイルパス)" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "npx astro check && npm test" },
          { "type": "prompt", "prompt": "6つの観点で最終チェックを実施してください..." }
        ]
      }
    ]
  }
}
```
