# Data Structure Rules

## bookmarks.json
記事データは以下のスキーマで管理すること。

```json
{
  "updated_at": "ISO8601形式",
  "articles": [
    {
      "id": "string (Raindrop ID)",
      "url": "string",
      "title": "string",
      "summary": "string (AIによる3行要約)",
      "priority": "number (1-5)",
      "tags": ["string"],
      "status": "unread | read | archived",
      "analyzed_at": "ISO8601形式"
    }
  ]
}
```

## index.html (Dashboard)
- **UI Framework**: Tailwind CSS (CDN経由) を使用し、モダンで清潔感のあるデザインにする。
- **Features**:
  - 優先度が高い順にカード形式で表示。
  - 要約をフロントに表示し、クリックで元記事へ遷移。
  - ステータス（未読/既読）のバッジ表示。
