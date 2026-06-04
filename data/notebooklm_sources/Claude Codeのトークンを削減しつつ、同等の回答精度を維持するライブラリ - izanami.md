# Claude Codeのトークンを削減しつつ、同等の回答精度を維持するライブラリ - izanami
- **Source URL**: https://izanami.dev/post/ce82cdd3-cb71-4143-8528-7e552d2aa4c4
- **Score**: 68
- **AI Summary**:
  - LLMのコンテキストを圧縮するheadroomをClaude Codeに適用し実測検証した結果の紹介
  - 構造化JSONのツール出力では44.6%のトークン削減を達成した一方、冗長ログは0%削減と判明
  - ワークロードの特性によって削減効果が大きく異なり、万能な圧縮ツールではないという結論
- **Read Now Reason**: AI駆動開発においてClaude Codeの消費トークンとAPIコストを削減するための具体的なデータと、コンテキスト圧縮が有効なワークロードの判断基準が示されているため。
- **Suggested Tags**: #AI駆動開発, #トークン削減, #Claude-Code, #コスト最適化
- **Processed Date**: 2026/6/4

---

## 本文
LLMの手前でコンテキストを圧縮するheadroomをClaude Codeに入れて実測した。構造化JSONのツール出力は44.6%減ったが素の冗長ログは0%。ワークロードを選べば効く、何でも縮むツールではないという結論
