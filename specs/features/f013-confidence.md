# F-013: 信心度機制

## 功能描述

為知識條目新增「信心度」評分。透過 confirm（確認有用）和 flag（標記問題）操作動態調整。信心度影響搜尋排序，讓高品質的知識排在前面。

## 使用者故事

As a 開發者, I want 知識條目有信心度評分, so that 常被使用且正確的知識排名更高，有問題的知識被降權。

## Data Model

### entries table 新增欄位

```sql
ALTER TABLE entries ADD COLUMN confidence REAL NOT NULL DEFAULT 0.5;
ALTER TABLE entries ADD COLUMN confirmations INTEGER NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN flags_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN superseded_by UUID NULL REFERENCES entries(id) ON DELETE SET NULL;
```

### 新增 entry_flags table

```sql
CREATE TABLE entry_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    reason VARCHAR(20) NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flag_reason CHECK (reason IN ('outdated', 'inaccurate', 'incomplete', 'duplicate'))
);

CREATE INDEX idx_entry_flags_entry ON entry_flags (entry_id);
```

### Entry struct 更新

```go
type Entry struct {
    // ... 既有欄位 ...
    Confidence   float32    `json:"confidence"`     // 信心度 0.0-1.0，預設 0.5
    Confirmations int       `json:"confirmations"`  // 確認次數
    FlagsCount   int        `json:"flags_count"`    // 標記次數
    SupersededBy *uuid.UUID `json:"superseded_by"`  // 被取代的 entry ID
}
```

### EntryFlag struct

```go
type EntryFlag struct {
    ID        uuid.UUID `json:"id"`
    EntryID   uuid.UUID `json:"entry_id"`
    Reason    string    `json:"reason"`    // outdated, inaccurate, incomplete, duplicate
    Note      *string   `json:"note"`
    CreatedAt time.Time `json:"created_at"`
}
```

## API Contract

### POST /api/v1/entries/:id/confirm

確認知識有用。

Request: 無 body

Response (200):
```json
{
  "entry_id": "uuid",
  "confidence": 0.65,
  "confirmations": 3,
  "message": "已確認"
}
```

### POST /api/v1/entries/:id/flag

標記知識問題。

Request:
```json
{
  "reason": "outdated",
  "note": "Go 1.24 已改變此行為"
}
```

- reason 必填，enum: outdated, inaccurate, incomplete, duplicate
- note 可選

Response (200):
```json
{
  "entry_id": "uuid",
  "confidence": 0.35,
  "flags_count": 2,
  "message": "已標記"
}
```

### GET /api/v1/entries/:id/flags

查看 entry 的所有 flag 記錄。

Response (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "entry_id": "uuid",
      "reason": "outdated",
      "note": "Go 1.24 已改變此行為",
      "created_at": "2026-04-22T10:00:00Z"
    }
  ],
  "total": 1
}
```

### Entry 回應新增欄位

所有回傳 Entry 的 endpoint 新增 confidence, confirmations, flags_count, superseded_by 欄位。

## 信心度計算公式

```
confidence = base + (confirmations * confirm_boost) - (flags_count * flag_penalty)
```

- base = 0.5（新建 entry 預設）
- confirm_boost = 0.05（每次確認 +0.05）
- flag_penalty = 0.1（每次標記 -0.1）
- 上限 = 1.0
- 下限 = 0.0

### 範例

| 操作 | confirmations | flags_count | confidence |
|------|---------------|-------------|------------|
| 新建 | 0 | 0 | 0.50 |
| confirm x1 | 1 | 0 | 0.55 |
| confirm x3 | 3 | 0 | 0.65 |
| flag x1 | 3 | 1 | 0.55 |
| confirm x10 | 10 | 0 | 1.00 (上限) |
| flag x5 | 0 | 5 | 0.00 (下限) |

## 搜尋排序更新

原始排序：`ORDER BY ts_rank DESC`

新排序：`ORDER BY (ts_rank * confidence) DESC`

```sql
-- 搜尋結果排序
ORDER BY ({ts_rank_expr} * e.confidence) DESC, e.created_at DESC
```

## DB Migration

### 007_add_confidence.up.sql

```sql
-- Entry 信心度欄位
ALTER TABLE entries ADD COLUMN confidence REAL NOT NULL DEFAULT 0.5;
ALTER TABLE entries ADD COLUMN confirmations INTEGER NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN flags_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN superseded_by UUID NULL REFERENCES entries(id) ON DELETE SET NULL;

-- 信心度索引（搜尋排序用）
CREATE INDEX idx_entries_confidence ON entries (confidence);

-- Entry flags table
CREATE TABLE entry_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    reason VARCHAR(20) NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flag_reason CHECK (reason IN ('outdated', 'inaccurate', 'incomplete', 'duplicate'))
);

CREATE INDEX idx_entry_flags_entry ON entry_flags (entry_id);
```

### 007_add_confidence.down.sql

```sql
DROP TABLE IF EXISTS entry_flags;

DROP INDEX IF EXISTS idx_entries_confidence;

ALTER TABLE entries DROP COLUMN IF EXISTS superseded_by;
ALTER TABLE entries DROP COLUMN IF EXISTS flags_count;
ALTER TABLE entries DROP COLUMN IF EXISTS confirmations;
ALTER TABLE entries DROP COLUMN IF EXISTS confidence;
```

## Business Rules

1. 新建 entry 預設 confidence = 0.5
2. confirm 操作：confirmations += 1，重算 confidence
3. flag 操作：flags_count += 1，建立 entry_flags 記錄，重算 confidence
4. confidence 範圍 0.0 - 1.0，超出範圍自動 clamp
5. 搜尋排序 = ts_rank * confidence
6. superseded_by 用於標記「被新版本取代」的條目（F-013 只預留欄位，不實作 UI flow）
7. 同一個 API Key 可多次 confirm 同一筆 entry（不做去重，簡化設計）
8. flag 記錄不可刪除（audit trail）

## Scenarios

### S-013-01: confirm entry

```
WHEN 使用者 POST /api/v1/entries/:id/confirm
  AND entry 存在且 confidence = 0.5, confirmations = 0
THEN confirmations = 1
  AND confidence = 0.55
  AND 回傳 200 + 更新後的 confidence
```

### S-013-02: 多次 confirm

```
WHEN 使用者對同一 entry confirm 5 次
THEN confirmations = 5
  AND confidence = 0.75
```

### S-013-03: flag entry

```
WHEN 使用者 POST /api/v1/entries/:id/flag
  WITH reason = "outdated", note = "已過時"
  AND entry 存在且 confidence = 0.5, flags_count = 0
THEN flags_count = 1
  AND confidence = 0.4
  AND entry_flags table 新增一筆記錄
  AND 回傳 200 + 更新後的 confidence
```

### S-013-04: flag 必填 reason

```
WHEN 使用者 POST /api/v1/entries/:id/flag
  WITHOUT reason
THEN 回傳 400 INVALID_INPUT
  AND message = "reason 為必填"
```

### S-013-05: flag 無效 reason

```
WHEN 使用者 POST /api/v1/entries/:id/flag
  WITH reason = "invalid_reason"
THEN 回傳 400 INVALID_INPUT
  AND message = "無效的 reason，允許值：outdated, inaccurate, incomplete, duplicate"
```

### S-013-06: confidence 影響搜尋排序

```
GIVEN entry A: ts_rank=0.8, confidence=0.9 (score=0.72)
  AND entry B: ts_rank=0.9, confidence=0.3 (score=0.27)
WHEN 使用者搜尋
THEN entry A 排在 entry B 前面（0.72 > 0.27）
```

### S-013-07: confidence 上限

```
WHEN entry 被 confirm 20 次
THEN confidence = 1.0（不超過上限）
  AND confirmations = 20
```

### S-013-08: confidence 下限

```
WHEN entry 被 flag 10 次
THEN confidence = 0.0（不低於下限）
  AND flags_count = 10
```

### S-013-09: confirm 不存在的 entry

```
WHEN 使用者 POST /api/v1/entries/:id/confirm
  AND entry 不存在
THEN 回傳 404 NOT_FOUND
```

### S-013-10: 查看 flag 記錄

```
WHEN 使用者 GET /api/v1/entries/:id/flags
  AND entry 有 2 筆 flag 記錄
THEN 回傳 200 + 2 筆 flag 記錄
  AND 每筆包含 reason, note, created_at
```

### S-013-11: Entry 回應包含信心度欄位

```
WHEN 使用者 GET /api/v1/entries/:id
THEN 回應包含 confidence, confirmations, flags_count, superseded_by 欄位
```

## 需要修改的檔案

```
dev/src/
├── model/entry.go               # Entry struct 新增信心度欄位
├── model/entry_flag.go           # 新增 EntryFlag struct
├── dto/entry.go                  # Request/Response DTO 新增欄位
├── dto/confidence.go             # 新增 ConfirmResponse, FlagRequest, FlagResponse
├── repository/entry.go           # CRUD SQL 新增欄位
├── repository/entry_flag.go      # 新增 EntryFlagRepository
├── repository/search.go          # 搜尋排序加入 confidence
├── service/entry.go              # Confirm, Flag 業務邏輯
├── service/confidence.go         # 信心度計算邏輯
├── handler/entry.go              # 新增 Confirm, Flag, ListFlags handler
├── router/router.go              # 新增路由
├── migration/
│   ├── 007_add_confidence.up.sql
│   └── 007_add_confidence.down.sql
```

## 依賴

- 無前置依賴（可與 F-012 並行）
- 被 F-011 MCP Server 依賴（confirm/flag tool 需要對應 API）
