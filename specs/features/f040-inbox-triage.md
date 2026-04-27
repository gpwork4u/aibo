# F-040: Inbox Triage

## Status: active
## Sprint: 14
## Priority: P0
## GitHub Issues: 待開

## 使用者故事
As a user, I want a redesigned Inbox page that shows unprocessed entries in a triage layout, so that I can quickly review and act on incoming knowledge items using the editorial paper design system.

## 設計決策
- Inbox 資料來自既有後端 `GET /api/v1/entries?status=inbox`（F-001/F-002 已實作）
- Sprint 14 重點：視覺改造（editorial tokens）+ 新互動（批次操作 / 快速 action）
- 鍵盤優先：J/K 上下選擇，A Archive，D Delete，E Edit，Enter 展開詳情
- 三欄 triage layout：entry list + preview pane + action bar

## UI 架構

```
/dashboard/inbox（parallel route 或 /dashboard/inbox 深連結）
├── InboxPage
│   ├── InboxToolbar（過濾：全部 / 未分類 / 今日 + 批次選擇）
│   ├── InboxList（虛擬化列表）
│   │   └── InboxCard（title + summary + tags + created_at + source badge）
│   ├── EntryPreviewPane（右側 preview，可收合）
│   └── InboxActionBar（Archive / Move to Library / Delete / Classify）
```

## API Contract（沿用既有，無新後端）

### `GET /api/v1/entries`
Auth：cookie session 或 API Key
Query params（新增/確認）：
| Param | Type | Description |
|-------|------|-------------|
| status | string | `inbox`（過濾 inbox 項目） |
| page | integer | 分頁，預設 1 |
| per_page | integer | 每頁筆數，預設 20，最大 100 |

### `PATCH /api/v1/entries/:id`
用於更新 `status`（inbox → library / archived）

### `DELETE /api/v1/entries/:id`
軟刪除（F-001 已實作）

### 批次操作（新 endpoint）
`POST /api/v1/entries/batch`

Request Body:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| ids | []string(UUID) | yes | 1-50 筆 |
| action | string | yes | `archive` / `move_to_library` / `delete` / `classify` |

Response 200:
```json
{
  "succeeded": ["uuid1", "uuid2"],
  "failed": [{"id": "uuid3", "error": "NOT_FOUND"}]
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | ids 為空或超過 50 筆 |
| 400 | INVALID_ACTION | action 不在允許值內 |
| 401 | UNAUTHORIZED | 未登入 |

## Data Model（沿用 F-001 entries table，無 migration）

entry 的 `status` 欄位：
- `inbox`：待處理
- `library`：已加入知識庫
- `archived`：已封存

## Business Rules
1. Inbox 僅顯示 `status = 'inbox'` 的 entries，按 `created_at DESC` 排序
2. 批次操作最多 50 筆，超過回傳 400
3. 批次操作部分成功時整體回傳 200（partial success）
4. 鍵盤快捷鍵：J（下一筆）/ K（上一筆）/ A（archive）/ D（delete）/ E（edit）
5. 批次選擇：Space 選取/取消，Shift+Click 範圍選取

## Scenarios

### Happy Path

#### Scenario: 載入 Inbox 列表
GIVEN 系統中有 5 筆 status=inbox 的 entries
WHEN 使用者瀏覽 /dashboard/inbox
THEN 顯示 5 筆 entry cards
AND 依 created_at DESC 排序

#### Scenario: Archive 單筆 entry
GIVEN Inbox 中有一筆 entry #1
WHEN 使用者點擊 Archive 按鈕（或按 A）
THEN entry #1 status 更新為 archived
AND 從 Inbox 列表移除（樂觀更新）
AND toast 顯示 "Archived"

#### Scenario: 批次 Archive 3 筆
GIVEN 使用者選取 3 筆 entries（Space）
WHEN 點擊 Batch Archive 或按 A
THEN POST /api/v1/entries/batch { action: "archive", ids: [3 UUIDs] }
AND response 200，succeeded = 3 筆
AND 3 筆從列表移除

#### Scenario: 觸發 LLM 分類
GIVEN Inbox 中有未分類的 entry #1
WHEN 使用者點擊 Classify 按鈕
THEN 觸發 LLM 分類（POST /api/v1/entries/:id/classify）
AND entry card 顯示 loading 狀態
AND 分類完成後 tags 更新顯示

### Error Handling

#### Scenario: 批次操作超過 50 筆
WHEN POST /api/v1/entries/batch with 51 ids
THEN response status = 400
AND code = "INVALID_INPUT"

#### Scenario: 網路錯誤時還原樂觀更新
GIVEN 使用者點擊 Archive（樂觀更新：entry 從列表消失）
WHEN 後端回傳 500
THEN entry 重新出現於列表
AND toast 顯示 "Action failed, please retry"

### Edge Cases

#### Scenario: Inbox 為空時 empty state
GIVEN 系統中無 status=inbox 的 entries
WHEN 使用者瀏覽 /dashboard/inbox
THEN 顯示 empty state（"Your inbox is clear"）
AND 提供 "Browse Library" CTA
