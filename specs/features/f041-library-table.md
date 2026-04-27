# F-041: Library Table

## Status: active
## Sprint: 14
## Priority: P0
## GitHub Issues: 待開

## 使用者故事
As a user, I want a Library page with a sortable, filterable table of all knowledge entries, so that I can browse, search, and manage my knowledge base efficiently.

## 設計決策
- 延伸 F-023 的基礎，以 editorial design system 重新設計視覺
- TanStack Table v8（headless，自行樣式）+ TanStack Query（資料管理）
- 虛擬化滾動（tanstack-virtual）處理大量資料
- 支援多欄排序、多欄過濾、全文搜尋
- URL search params 同步過濾/排序狀態（深連結）

## UI 架構

```
/library
├── LibraryPage
│   ├── LibraryToolbar
│   │   ├── SearchInput（全文搜尋）
│   │   ├── FilterBar（status / category / tags / date range）
│   │   ├── SortDropdown（built_at, title, confidence, updated_at）
│   │   └── ViewToggle（table / card）
│   ├── LibraryTable（TanStack Table + 虛擬化）
│   │   ├── columns: checkbox | title | category | tags | status | confidence | updated_at | actions
│   │   └── row actions: Edit / Archive / Delete
│   └── EntryDetailSheet（點選 row 展開 Sheet）
```

## API Contract

### `GET /api/v1/entries`
Auth：cookie session 或 API Key

Query params：
| Param | Type | Description |
|-------|------|-------------|
| q | string | 全文搜尋 query |
| status | string | `library` / `inbox` / `archived`（可多值，逗號分隔） |
| category_id | UUID | 分類過濾 |
| tags | string | 標籤過濾（逗號分隔，AND 邏輯） |
| sort_by | string | `updated_at`（預設）/ `created_at` / `title` / `confidence` |
| sort_dir | string | `desc`（預設）/ `asc` |
| page | integer | 分頁，預設 1 |
| per_page | integer | 20（預設），最大 100 |

Response 200:
```json
{
  "items": [{
    "id": "uuid",
    "title": "string",
    "summary": "string",
    "category": { "id": "uuid", "name": "string" },
    "tags": ["string"],
    "status": "library",
    "confidence": 0.85,
    "source_type": "manual",
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
  }],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

## Business Rules
1. Library 頁預設 `status=library`，可手動切換顯示 inbox / archived
2. 全文搜尋透過後端 F-005 LLM 同義詞展開（有 LLM 設定時），否則直接 FTS
3. URL search params 映射：`?q=keyword&status=library&sort=confidence&dir=desc`
4. 多欄排序：前端 UI 支援，後端目前只支援單欄排序（多欄排序為 future work）
5. 批次操作（同 F-040）：最多 50 筆，支援 archive / delete

## Scenarios

### Happy Path

#### Scenario: 載入 Library 預設視圖
GIVEN 系統中有 30 筆 status=library 的 entries
WHEN 使用者瀏覽 /library
THEN 顯示第 1 頁 20 筆
AND 依 updated_at DESC 排序
AND pagination 顯示 "1-20 of 30"

#### Scenario: 全文搜尋
GIVEN Library 中有 entry 含 "machine learning"
WHEN 使用者在 SearchInput 輸入 "ml"
THEN URL 更新 ?q=ml
AND 列表重新載入，顯示 LLM 同義詞展開後的結果
AND "machine learning" 相關 entries 出現

#### Scenario: 依 confidence 降序排序
WHEN 使用者點擊 "Confidence" 欄位標頭
THEN sort_by=confidence, dir=desc
AND URL 更新 ?sort=confidence&dir=desc
AND 高 confidence 的 entries 排在最前

#### Scenario: 點選 row 展開詳情 Sheet
GIVEN Library 列表顯示中
WHEN 使用者點選某 row
THEN 右側 Sheet 展開，顯示完整 entry 詳情（title + content + tags + metadata）

### Error Handling

#### Scenario: 搜尋 API 失敗
GIVEN 使用者輸入搜尋詞
WHEN 後端 /api/v1/entries 回傳 500
THEN 顯示 error state（"Failed to load. Retry?"）
AND 保留上一次成功結果（stale-while-revalidate）

### Edge Cases

#### Scenario: URL 直接含過濾參數
GIVEN URL = /library?status=archived&sort=created_at
WHEN 頁面載入
THEN FilterBar 顯示 status=archived 已選中
AND 列表以 created_at 排序

#### Scenario: 清空搜尋
GIVEN URL = /library?q=test
WHEN 使用者清空 SearchInput
THEN URL 移除 q 參數
AND 列表顯示全部 library entries
