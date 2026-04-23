# F-014: Tags 分層 + 多維度搜尋

## 功能描述

將目前平坦的 `tags TEXT[]` 升級為結構化的 tag 分層架構：
- `domains TEXT[]` — 技術領域標籤（如 golang, postgresql, docker）
- `context JSONB` — 多維度情境標籤，包含 languages、frameworks、pattern 等

同時升級搜尋 API，支援按 domain 和 context 維度過濾。

## 使用者故事

As a 開發者, I want 知識條目能按技術領域和情境維度分類, so that 我可以快速找到特定技術棧的知識。

## 背景

目前 `tags TEXT[]` 是平坦的字串陣列，所有標籤混在一起（如 `["golang", "gin", "middleware", "auth"]`），無法區分哪些是「領域」、哪些是「框架」、哪些是「模式」。

升級後：
- `domains`: `["golang", "postgresql"]`
- `context`: `{"languages": ["go"], "frameworks": ["gin"], "pattern": "middleware"}`

原有的 `tags` 欄位保留，作為向下相容的平坦標籤（不刪除，但後續 LLM 分類將同時產生 domains + context）。

## Data Model 變更

### 新增欄位

```sql
ALTER TABLE entries ADD COLUMN domains TEXT[] DEFAULT '{}';
ALTER TABLE entries ADD COLUMN context JSONB NULL;
```

### context JSONB 結構

```json
{
  "languages": ["go", "python"],
  "frameworks": ["gin", "fastapi"],
  "pattern": "middleware",
  "environment": "docker",
  "use_case": "authentication"
}
```

context 的 key 不做 schema 限制，由 LLM 自由產生，但常見 key 為：
- `languages` — 程式語言
- `frameworks` — 框架
- `pattern` — 設計模式 / 架構模式
- `environment` — 執行環境（docker, kubernetes, local）
- `use_case` — 應用場景

### 索引

```sql
-- domains GIN 索引
CREATE INDEX idx_entries_domains ON entries USING GIN (domains);

-- context GIN 索引（支援 @> 包含查詢）
CREATE INDEX idx_entries_context ON entries USING GIN (context jsonb_path_ops);
```

### 全文搜尋索引更新

```sql
-- 更新 FTS 索引：加入 domains 到權重 A
DROP INDEX IF EXISTS idx_entries_fts;
CREATE INDEX idx_entries_fts ON entries USING GIN (
  (setweight(to_tsvector('simple', coalesce(summary, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(array_to_string(domains, ' '), '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(content, '')), 'B'))
);
```

## API Contract

### Entry CRUD 變更

建立/更新 Entry 時新增可選欄位：

```json
// POST /api/v1/entries
// PATCH /api/v1/entries/:id
{
  "domains": ["golang", "postgresql"],
  "context": {
    "languages": ["go"],
    "frameworks": ["gin"],
    "pattern": "middleware"
  }
}
```

回應中新增欄位：

```json
{
  "id": "uuid",
  "domains": ["golang", "postgresql"],
  "context": {
    "languages": ["go"],
    "frameworks": ["gin"],
    "pattern": "middleware"
  },
  "tags": ["golang", "gin", "middleware"]
}
```

### 搜尋 API 變更

#### 簡單搜尋新增過濾參數

```
GET /api/v1/search/simple?q=middleware&domain=golang&context.languages=go
```

新增 query parameters：
- `domain` — 按 domain 過濾（精確匹配，支援多個：`domain=golang&domain=docker`）
- `context.{key}` — 按 context 子欄位過濾（如 `context.languages=go`）

#### 智慧搜尋新增過濾參數

```json
// POST /api/v1/search
{
  "query": "middleware authentication",
  "domains": ["golang"],
  "context_filter": {
    "languages": ["go"],
    "frameworks": ["gin"]
  },
  "limit": 10
}
```

### Entry 列表新增過濾參數

```
GET /api/v1/entries?domain=golang&context.languages=go
```

## LLM 分類 Prompt 變更

更新 classifySystemPrompt，讓 LLM 同時產生 domains 和 context：

```json
{
  "category": "Backend Development",
  "tags": ["middleware", "auth"],
  "domains": ["golang"],
  "context": {
    "languages": ["go"],
    "frameworks": ["gin"],
    "pattern": "middleware"
  },
  "title": "...",
  "summary": "...",
  "detail": "...",
  "action": "..."
}
```

## Scenarios

### S-014-1: 建立 Entry 帶 domains + context

```
GIVEN API Key 認證通過
WHEN POST /api/v1/entries
  {
    "content": "Using Gin middleware for JWT auth",
    "domains": ["golang"],
    "context": {"languages": ["go"], "frameworks": ["gin"], "pattern": "middleware"}
  }
THEN 回傳 201
  AND domains = ["golang"]
  AND context = {"languages": ["go"], "frameworks": ["gin"], "pattern": "middleware"}
```

### S-014-2: 按 domain 過濾搜尋

```
GIVEN 有 3 筆 entries，其中 2 筆 domains 包含 "golang"
WHEN GET /api/v1/search/simple?q=middleware&domain=golang
THEN 只回傳 domains 包含 "golang" 的 2 筆結果
```

### S-014-3: 按 context 子欄位過濾

```
GIVEN 有 entries 的 context.frameworks 包含 "gin"
WHEN GET /api/v1/search/simple?q=auth&context.frameworks=gin
THEN 只回傳 context.frameworks 包含 "gin" 的結果
```

### S-014-4: LLM 分類自動產生 domains + context

```
GIVEN Entry 內容為 "Using Gin middleware for JWT authentication in Go"
WHEN POST /api/v1/entries/:id/classify
THEN LLM 回傳結果包含 domains 和 context
  AND entry 的 domains 和 context 欄位被更新
```

### S-014-5: 向下相容 — tags 欄位保留

```
GIVEN 現有 entries 只有 tags 沒有 domains/context
WHEN GET /api/v1/entries/:id
THEN domains = []（空陣列）
  AND context = null
  AND tags 保持原值
```

### S-014-6: 多 domain 過濾（AND 邏輯）

```
GIVEN Entry A: domains=["golang","docker"], Entry B: domains=["golang"]
WHEN GET /api/v1/entries?domain=golang&domain=docker
THEN 只回傳 Entry A（domains 包含全部指定 domain）
```

### S-014-7: 智慧搜尋支援 context_filter

```
GIVEN 有 entries，部分 context.languages 包含 "go"
WHEN POST /api/v1/search
  {"query": "authentication", "context_filter": {"languages": ["go"]}}
THEN 只回傳 context.languages 包含 "go" 的結果
```

## Migration 編號

`008_add_tags_hierarchy.up.sql` / `008_add_tags_hierarchy.down.sql`
