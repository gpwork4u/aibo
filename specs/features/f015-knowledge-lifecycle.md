# F-015: 知識生命週期

## 功能描述

實作知識的 superseded_by 追蹤機制：
- 舊知識可以指向新版本（superseded_by 欄位已在 007 migration 中建立）
- 舊知識不刪除，只降低搜尋權重
- 搜尋結果中標示知識的生命週期狀態
- 提供 API 設定和查詢 supersede 關係

## 使用者故事

As a 開發者, I want 當知識過時時能指向新版本, so that 搜尋到舊知識時能自動導向最新版本，而不是刪除舊知識。

## 背景

目前 `entries` table 已有 `superseded_by UUID NULL REFERENCES entries(id)` 欄位（在 007 migration 中建立），但尚未有對應的 API 和業務邏輯。

生命週期狀態定義：
- **active** — 正常狀態（superseded_by IS NULL AND confidence > 0.0）
- **superseded** — 已被取代（superseded_by IS NOT NULL）
- **degraded** — 信心度低（confidence <= 0.2 AND superseded_by IS NULL）

## API Contract

### 設定 Supersede 關係

```
POST /api/v1/entries/:id/supersede
{
  "new_entry_id": "uuid"
}
```

回應：
```json
{
  "old_entry": {
    "id": "uuid",
    "superseded_by": "new-entry-uuid",
    "confidence": 0.2
  },
  "new_entry": {
    "id": "new-entry-uuid"
  }
}
```

行為：
1. 設定 old_entry.superseded_by = new_entry_id
2. 降低 old_entry.confidence 為 min(current_confidence, 0.2)
3. 驗證 new_entry_id 存在且不是自己
4. 驗證不會形成循環引用（A->B->A）

### 取消 Supersede 關係

```
DELETE /api/v1/entries/:id/supersede
```

回應：
```json
{
  "id": "uuid",
  "superseded_by": null
}
```

行為：
1. 清除 superseded_by
2. confidence 不自動恢復（需手動 confirm 恢復）

### 查詢知識版本鏈

```
GET /api/v1/entries/:id/history
```

回應：
```json
{
  "entry_id": "uuid",
  "status": "superseded",
  "chain": [
    {"id": "v1-uuid", "title": "...", "status": "superseded", "created_at": "..."},
    {"id": "v2-uuid", "title": "...", "status": "superseded", "created_at": "..."},
    {"id": "v3-uuid", "title": "...", "status": "active", "created_at": "..."}
  ],
  "latest": {
    "id": "v3-uuid",
    "title": "..."
  }
}
```

chain 從最舊到最新排列，最多追蹤 10 層。

### Entry 回應新增 lifecycle_status 欄位

所有回傳 Entry 的 API（GET /entries/:id、搜尋結果等）新增：

```json
{
  "lifecycle_status": "active",
  "superseded_by": null
}
```

lifecycle_status 為計算欄位（非 DB 儲存），依據：
- superseded_by IS NOT NULL -> "superseded"
- confidence <= 0.2 AND superseded_by IS NULL -> "degraded"
- 其他 -> "active"

### 搜尋排序變更

已被 supersede 的 entry，搜尋排序公式不變（ts_rank * confidence），但因 confidence 被降至 <= 0.2，自然排在後面。

搜尋結果新增 lifecycle_status 欄位：

```json
{
  "entry_id": "uuid",
  "title": "...",
  "lifecycle_status": "superseded",
  "superseded_by": "newer-uuid",
  "relevance": 0.05
}
```

### Entry 列表新增過濾

```
GET /api/v1/entries?lifecycle_status=active
GET /api/v1/entries?lifecycle_status=superseded
```

## Scenarios

### S-015-1: 設定 Supersede 關係

```
GIVEN Entry A 存在，Entry B 存在
WHEN POST /api/v1/entries/{A}/supersede {"new_entry_id": "{B}"}
THEN 回傳 200
  AND A.superseded_by = B.id
  AND A.confidence <= 0.2
```

### S-015-2: 循環引用檢測

```
GIVEN Entry A superseded_by B
WHEN POST /api/v1/entries/{B}/supersede {"new_entry_id": "{A}"}
THEN 回傳 409 Conflict
  AND error.code = "CIRCULAR_SUPERSEDE"
```

### S-015-3: 不能 supersede 自己

```
WHEN POST /api/v1/entries/{A}/supersede {"new_entry_id": "{A}"}
THEN 回傳 400
  AND error.code = "INVALID_INPUT"
```

### S-015-4: 查詢版本鏈

```
GIVEN A -> B -> C（A superseded_by B, B superseded_by C）
WHEN GET /api/v1/entries/{A}/history
THEN chain = [A, B, C]
  AND latest = C
  AND A.status = "superseded", B.status = "superseded", C.status = "active"
```

### S-015-5: 搜尋結果中 superseded entry 排名降低

```
GIVEN Entry A (active, confidence=0.8) 和 Entry B (superseded, confidence=0.2)
  AND 兩者都匹配搜尋關鍵字
WHEN POST /api/v1/search {"query": "..."}
THEN A 排在 B 前面
  AND B 的 lifecycle_status = "superseded"
```

### S-015-6: 取消 Supersede

```
GIVEN Entry A superseded_by B
WHEN DELETE /api/v1/entries/{A}/supersede
THEN A.superseded_by = null
  AND A.confidence 維持不變（不自動恢復）
```

### S-015-7: 按 lifecycle_status 過濾列表

```
GIVEN 有 active、superseded、degraded 三種狀態的 entries
WHEN GET /api/v1/entries?lifecycle_status=active
THEN 只回傳 lifecycle_status 為 "active" 的 entries
```

### S-015-8: new_entry_id 不存在

```
WHEN POST /api/v1/entries/{A}/supersede {"new_entry_id": "non-existent-uuid"}
THEN 回傳 404
  AND error.code = "NOT_FOUND"
  AND error.message 提示 new_entry_id 不存在
```

## Migration

不需要新的 migration，superseded_by 欄位已在 007_add_confidence 中建立。
