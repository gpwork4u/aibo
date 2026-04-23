# F-012: 知識結構升級

## 功能描述

為 Entry model 新增 summary / detail / action 三個結構化欄位。LLM 自動分類時同時拆解產生這三個欄位。為未來的「人格代理」打基礎 -- summary 用來快速回答，detail 用來深入解釋，action 用來代表使用者行動。

## 使用者故事

As a 開發者, I want 我的知識被自動拆解成 summary/detail/action, so that LLM 能更精準地代表我回答問題和做決策。

## Data Model 變更

### entries table 新增欄位

```sql
ALTER TABLE entries ADD COLUMN summary TEXT NULL;
ALTER TABLE entries ADD COLUMN detail TEXT NULL;
ALTER TABLE entries ADD COLUMN action TEXT NULL;
```

### Entry struct 更新

```go
type Entry struct {
    ID         uuid.UUID  `json:"id"`
    Title      *string    `json:"title"`
    Content    *string    `json:"content"`
    Summary    *string    `json:"summary"`    // 新增：摘要（一句話概括）
    Detail     *string    `json:"detail"`     // 新增：詳細說明
    Action     *string    `json:"action"`     // 新增：可執行的建議/行動
    CategoryID *uuid.UUID `json:"category_id"`
    Source     *string    `json:"source"`
    SourceType *string    `json:"source_type"`
    SourceRef  *string    `json:"source_ref"`
    Tags       []string   `json:"tags"`
    IsArchived bool       `json:"is_archived"`
    CreatedAt  time.Time  `json:"created_at"`
    UpdatedAt  time.Time  `json:"updated_at"`
}
```

## API Contract

### 變更 1: Entry 回應新增欄位

所有回傳 Entry 的 endpoint 新增 summary, detail, action 欄位：

```
GET /api/v1/entries/:id
POST /api/v1/entries
PATCH /api/v1/entries/:id
```

回應新增：
```json
{
  "id": "uuid",
  "title": "...",
  "content": "...",
  "summary": "一句話摘要",
  "detail": "詳細說明...",
  "action": "建議行動：...",
  "category_id": "uuid",
  "tags": ["tag1"],
  "..."
}
```

### 變更 2: PATCH 支援手動更新

```
PATCH /api/v1/entries/:id
```

Request body 新增可選欄位：
```json
{
  "summary": "手動修改的摘要",
  "detail": "手動修改的詳細說明",
  "action": "手動修改的行動建議"
}
```

### 變更 3: 搜尋結果新增 summary

```
POST /api/v1/search
GET /api/v1/search/simple
```

搜尋結果每筆新增 summary 欄位：
```json
{
  "entry_id": "uuid",
  "title": "...",
  "summary": "一句話摘要",
  "content_preview": "...",
  "tags": [],
  "relevance": 0.85
}
```

### 變更 4: 列表結果新增 summary

```
GET /api/v1/entries
```

列表結果每筆新增 summary 欄位（summary 比 content_preview 更有價值）：
```json
{
  "id": "uuid",
  "title": "...",
  "summary": "一句話摘要",
  "content_preview": "...",
  "..."
}
```

## DB Migration

### 006_add_knowledge_structure.up.sql

```sql
-- 新增知識結構欄位
ALTER TABLE entries ADD COLUMN summary TEXT NULL;
ALTER TABLE entries ADD COLUMN detail TEXT NULL;
ALTER TABLE entries ADD COLUMN action TEXT NULL;

-- 更新全文搜尋索引：summary 權重最高 (A)
DROP INDEX IF EXISTS idx_entries_fts;
CREATE INDEX idx_entries_fts ON entries USING GIN (
  (setweight(to_tsvector('simple', coalesce(summary, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(content, '')), 'B'))
);

-- 更新 pg_trgm 索引：加入 summary
DROP INDEX IF EXISTS idx_entries_trgm;
CREATE INDEX idx_entries_trgm ON entries USING GIN (
  (coalesce(summary,'') || ' ' || coalesce(title,'') || ' ' || coalesce(content,'')) gin_trgm_ops
);
```

### 006_add_knowledge_structure.down.sql

```sql
-- 還原全文搜尋索引
DROP INDEX IF EXISTS idx_entries_fts;
CREATE INDEX idx_entries_fts ON entries USING GIN (
  (setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(content, '')), 'B'))
);

DROP INDEX IF EXISTS idx_entries_trgm;
CREATE INDEX idx_entries_trgm ON entries USING GIN (
  (coalesce(title,'') || ' ' || coalesce(content,'')) gin_trgm_ops
);

ALTER TABLE entries DROP COLUMN IF EXISTS action;
ALTER TABLE entries DROP COLUMN IF EXISTS detail;
ALTER TABLE entries DROP COLUMN IF EXISTS summary;
```

## LLM 分類 Prompt 更新

### 原始 prompt

```
回傳格式：{"category": "...", "tags": [...], "title": "..."}
```

### 新 prompt

```
你是一個知識分類助手。根據使用者提供的內容，分析其主題並回傳 JSON 格式的分類結果。

回傳格式必須嚴格為：
{
  "category": "分類名稱",
  "tags": ["tag1", "tag2"],
  "title": "建議標題",
  "summary": "一句話摘要（30字以內）",
  "detail": "詳細說明（保留原始內容的關鍵資訊，100-300字）",
  "action": "可執行的建議或行動（如：使用 X 來解決 Y；在 Z 場景下採用此方案）"
}

規則：
1. category：選擇最適合的分類名稱，簡潔明確
2. tags：提取 2-5 個關鍵字作為標籤
3. title：根據內容產生一個簡潔的標題（不超過 50 字）
4. summary：用一句話概括這則知識的核心觀點
5. detail：萃取內容中的關鍵資訊、步驟或論點
6. action：如果內容包含可操作的建議，提取為行動指引；如果是純知識性內容，寫「供參考」

只回傳 JSON，不要包含任何其他文字、說明或 markdown 格式。
```

### ClassifyResult DTO 更新

```go
type ClassifyResult struct {
    Category string   `json:"category"`
    Tags     []string `json:"tags"`
    Title    string   `json:"title"`
    Summary  string   `json:"summary"`  // 新增
    Detail   string   `json:"detail"`   // 新增
    Action   string   `json:"action"`   // 新增
}
```

## 搜尋權重更新

原始權重：title(A) = tags(A) > content(B)

新權重：**summary(A) = title(A) = tags(A) > content(B)**

搜尋 SQL 中的 tsvector 需更新為包含 summary。

## Business Rules

1. summary/detail/action 都是 nullable -- 舊資料不會被影響
2. LLM 分類時同時產生 summary/detail/action
3. 如果 LLM 回傳的 JSON 缺少 summary/detail/action，不視為錯誤（向下相容）
4. 使用者可透過 PATCH 手動修改 summary/detail/action
5. 搜尋時 summary 參與全文搜尋，權重等同 title
6. 列表 API 回傳 summary（不回傳 detail/action，減少資料量）
7. 詳情 API 回傳完整的 summary + detail + action

## Scenarios

### S-012-01: 新建 entry 自動產生結構化欄位

```
WHEN 使用者建立新 entry
  WITH content = "Go 1.23 新增了 range over func 語法，可以用自訂的迭代器..."
THEN 觸發 LLM 自動分類
  AND LLM 回傳 category, tags, title, summary, detail, action
  AND entry 更新為包含所有欄位
  AND summary = "Go 1.23 支援 range over func 自訂迭代器語法"
  AND detail = "Go 1.23 引入了 range over func 語法..."
  AND action = "在需要自訂迭代器的場景使用 range over func 取代手動 iterator pattern"
```

### S-012-02: LLM 回傳缺少新欄位（向下相容）

```
WHEN LLM provider 只回傳 category, tags, title（舊格式）
THEN 分類仍然成功
  AND summary/detail/action 保持 NULL
  AND 不產生錯誤
```

### S-012-03: 手動更新結構化欄位

```
WHEN 使用者 PATCH /api/v1/entries/:id
  WITH { "summary": "自訂摘要" }
THEN summary 更新為 "自訂摘要"
  AND detail, action 不受影響
```

### S-012-04: 搜尋結果包含 summary

```
WHEN 使用者搜尋 "golang error"
THEN 搜尋結果每筆包含 summary 欄位
  AND summary 參與全文搜尋排序
```

### S-012-05: DB migration 向下相容

```
WHEN 執行 migration 006_add_knowledge_structure.up.sql
THEN 現有 entries 的 summary/detail/action 為 NULL
  AND 現有功能不受影響
  AND 全文搜尋索引更新為包含 summary
```

### S-012-06: 列表 API 包含 summary

```
WHEN 使用者 GET /api/v1/entries
THEN 每筆 entry 包含 summary 欄位
  AND 不包含 detail / action（減少資料量）
```

### S-012-07: 詳情 API 包含完整結構

```
WHEN 使用者 GET /api/v1/entries/:id
THEN 回傳包含 summary, detail, action 完整欄位
```

## 需要修改的檔案

```
dev/src/
├── model/entry.go               # Entry struct 新增 Summary, Detail, Action
├── dto/entry.go                  # Request/Response DTO 新增欄位
├── dto/llm.go                    # ClassifyResult 新增 Summary, Detail, Action
├── dto/search.go                 # SearchResultItem 新增 Summary
├── repository/entry.go           # CRUD SQL 新增欄位
├── repository/search.go          # 搜尋 SQL 新增 summary 權重
├── service/llm.go                # classifySystemPrompt 更新
├── service/classifier.go         # ClassifyEntry 處理新欄位
├── handler/entry.go              # handler 處理新欄位
├── handler/search.go             # 搜尋回應新增 summary
├── migration/
│   ├── 006_add_knowledge_structure.up.sql
│   └── 006_add_knowledge_structure.down.sql
```

## 依賴

- 無前置依賴（可與 F-013 並行）
- 被 F-011 MCP Server 依賴（query tool 需要 summary/detail/action）
