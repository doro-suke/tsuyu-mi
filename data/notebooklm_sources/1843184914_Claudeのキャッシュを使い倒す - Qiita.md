---
title: "Claudeのキャッシュを使い倒す - Qiita"
source: "Qiita"
url: "https://qiita.com/cvusk/items/7f149b4ef5e1e71dd039"
date: "2026-09"
domain: "other"
tags: ["生成AI・LLM", "プロンプト・コンテキスト", "プログラミング・インフラ"]
score: 92
core_rule: "プロンプトキャッシュは「静的→動的の一方向レイアウト」を守り、リクエスト間で不変な最後のブロックにブレークポイントを配置し、決定論的バイト一致を維持して2回以上の利用で最大90%のコスト削減とレイテンシ短縮を実現する。"
anti_pattern: "タイムスタンプや毎回の質問など可変ブロックにブレークポイントを配置したり、上流のツール定義・システムプロンプトを頻繁に変更して、1.25〜2倍の書き込み課金だけを支払い続けてヒット率ゼロに陥ること。"
---

## 1. 解決する課題（Problem）
- 長大なシステムプロンプト、ツール定義、参照文書、会話履歴を毎リクエスト送り直すことで入力トークンコストが膨大になり、レイテンシ（TTFT）悪化やレート制限の圧迫を招く。
- キャッシュの仕組みや最小トークン数（Haikuの4,096等）を誤解したまま導入すると、キャッシュ作成課金（write）のみが嵩みキャッシュヒット（read）がゼロになる。

## 2. 実践ルール・判断基準（Actionable Rules）
- 特記事項なし

## 3. 避けるべきアンチパターン（Anti-Patterns）
- 特記事項なし

## 4. 具体的なコード・構成テンプレート（Snippets / Examples）
```python
import anthropic

client = anthropic.Anthropic()

# 静的→動的レイアウトと明示ブレークポイント
resp = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,
    system=[{
        "type": "text",
        "text": LONG_STATIC_INSTRUCTIONS,
        "cache_control": {"type": "ephemeral"},
    }],
    messages=[{"role": "user", "content": f"質問: {question}"}],
)

# max_tokens: 0 によるプレウォーム
client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=0,
    system=[{"type": "text", "text": LONG_STATIC_INSTRUCTIONS, "cache_control": {"type": "ephemeral"}}],
    messages=[{"role": "user", "content": "warmup"}],
)
```
