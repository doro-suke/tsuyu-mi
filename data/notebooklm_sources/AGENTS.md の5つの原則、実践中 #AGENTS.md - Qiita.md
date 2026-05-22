# AGENTS.md の5つの原則、実践中 #AGENTS.md - Qiita
- **Source URL**: https://qiita.com/HinanoKawahori/items/cbf0c72cfa940e5c92bb
- **Priority**: high
- **AI Summary**:
  - AIエージェントへの指示を効率化し、開発を円滑にする「Agents.md」の5つの運用原則を解説。
  - 文脈優先、変更の最小化、明瞭さ、テスト・文書化、相談基準の5原則でAIの振る舞いを制御する。
  - Go言語のサンプルアプリを題材に、即座にプロジェクトへ転用可能な定義ファイルの構成例を提示。
- **Read Now Reason**: AIコーディングアシスタントの精度向上と説明コスト削減に直結する、具体的かつ即効性のあるノウハウであるため。
- **Suggested Tags**: #AIエージェント, #開発効率化
- **Processed Date**: 2026/5/3

---

## 本文
はじめに
IBM Bob に毎回同じ説明をするのは手間がかかりますよね。
プロジェクトごとに「Agents.md」を用意すると、エージェントが守るべき原則や作業方針を明文化できてやり取りが圧倒的にスムーズになります。
この記事では、Agents.md に書くべき 5つの原則 をまとめて、最後に実践してみました（途中）

5つの原則

1. Context First（まず文脈を読む）
コードを書く前に、関連ファイル・設計・API 仕様を読む。
推測で書かず、曖昧なら質問する。
「まず読む」だけで事故の大半は防げる。

2. Small, Safe, Reversible（小さく・安全に・戻せるように）
一度に大きく変えない。
差分は小さく、壊れにくく、すぐ戻せる形で進める。
PR は「小さくて読みやすい」が正義。

3. Clarity Over Cleverness（賢さより明瞭さ）
複雑なテクニックより、読みやすさ・保守性を優先する。
コメントは惜しまない。意図・前提・理由を書く。
「未来の自分が読んで理解できるか？」が基準。

4. Test & Docs Every Change（変更にはテストとドキュメント）
どんな小さな修正でもテストを追加し、ドキュメントも更新する。
コードと仕様を常に同期させる。
“動くけどテストがない”は負債の始まり。

5. Accountability & Escalation（責任と相談）
自信が 80% 未満なら相談する。
曖昧な仕様・セキュリティ・API 変更は必ずエスカレーション。
正しさをスピードより優先する。

実践

今回は、上記のアプリケーションをローカルにgit cloneして、go-sample-appを取り扱うためのAgents.mdを作る。
その際は、

上記の基本５原則だけ伝える。
Bobにファイルを読み込ませて、固有のAgents.mdを作ってもらう

で作成した。
以下、作成されたAgents.md
# Agents.md - Go OpenTelemetry Sample App

**Motto**: "Small, clear, safe steps — always grounded in real docs."

---

## 1. Context First（まず文脈を読む）

### このプロジェクトは何か
- Go の HTTP サンプルアプリ（AWS OTEL 動作確認用）
- Traces と Metrics を出力（Logs は実験的）
- 4つのエンドポイント: `/`, `/outgoing-http-call`, `/aws-sdk-call`, `/outgoing-sampleapp`

### 変更前に必ず読むファイル
```
README.md              # プロジェクト仕様、エンドポイント説明
main.go                # エントリーポイント（80行、シンプル）
collection/client.go   # OTEL初期化（絶対に壊すな）
config.yaml            # メトリクス設定
go.mod                 # 依存関係（勝手に変更禁止）
```

### プロジェクト構造
```
main.go              # HTTPサーバー起動
config.yaml          # 設定ファイル
collection/
  ├── client.go      # OTEL Provider初期化
  ├── config.go      # 設定読み込み（Viper）
  ├── http_traces.go # エンドポイントハンドラー
  ├── random_metrics.go    # ランダムメトリクス
  └── request_metrics.go   # リクエストメトリクス
```

### 外部仕様を確認する
- AWS OTEL Go SDK
- OpenTelemetry Go
- AWS X-Ray Trace ID フォーマット

---

## 2. Small, Safe, Reversible（小さく・安全に・戻せるように）

### 変更は小さく
- 1つのPRで1つの機能/修正のみ
- 差分は読みやすく（1ファイル50行以内推奨）
- main.go の大規模リファクタは禁止（80行維持）

### 触ってはいけない場所
```go
// collection/client.go
- TracerProvider/MeterProvider の初期化ロジック
- otel.SetTextMapPropagator(xray.Propagator{}) // X-Ray設定
- Exporter の endpoint/protocol 設定
- メトリクス instrument の型変更（Counter → Gauge等）
```

### 新しい依存は追加しない
- go.mod の変更は必ず相談

### すぐにロールバックできる形で
- Git履歴をクリーンに保つ
- コミットメッセージに変更理由を明記
- 問題発生時は即座に `git revert`

---

## 3. Clarity Over Cleverness（賢さより明瞭さ）

### Go標準ライブラリを優先
```go
// Good
import (
    "context"
    "net/http"
    "time"
)

// Bad: 不要な外部ライブラリ
import "github.com/fancy-lib/magic"
```

### 複雑な抽象化を避ける
```go
// Good
func (rqmc *requestBasedMetricCollector) AddApiRequest() {
    atomic.AddInt64(&rqmc.counter, 1)
}

// Bad
type MetricAdder interface {
    Add(context.Context, ...Option) error
}
```

### コメントは惜しまない
- 意図・理由・前提を書く
- TODOには Issue番号を紐付け

### ファイルは300行以内

---

## 4. Test & Docs Every Change（変更にはテストとドキュメント）

### テストを追加
```go
package collection

import (
    "net/http/httptest"
    "testing"
)

func TestAwsSdkCall(t *testing.T) {
    // テストロジック
}
```

### README.md を更新
- 新しいエンドポイント追加時
- 設定パラメータ変更時

---

## 5. Accountability & Escalation（責任と相談）

### 自信が80%未満なら相談
- OTEL設定変更
- AWS仕様が曖昧な場合
- 依存関係の変更

### エスカレーションが必要なケース
```go
- TracerProvider の Sampler 変更
- MeterProvider の Reader 設定変更
- Resource attributes の追加/削除
- go.mod の依存アップグレード
```

### 優先順位
正しさ > スピード > 最適化

---

## Quick Checklist

### 変更前
- README.md を読んだ
- collection/*.go を読んだ
- OTEL設定に触れないことを確認

### 実装中
- 変更は小さく
- 既存コードスタイルに従う
- コメントで意図を説明

### 完了後
- `go run main.go` が動作
- README.md 更新
- `go fmt` / `go vet` 実行
- テスト追加（可能であれば）

---

## プロジェクト固有メモ

### メトリクス種別
Random: time_alive, cpu_usage, total_heap_size, threads_active  
Request: total_bytes_sent, total_api_requests, latency_time

### config.yaml 設定
- TimeInterval: メトリクス生成間隔
- UpperBound系: ランダム値の上限

### 既知の制限
- Metrics は Beta
- Insecure Exporter（本番不可）

---

Plan → Read → Verify → Implement → Test + Docs → Reflect

9Go to list of users who liked9Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
