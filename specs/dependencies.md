# Sprint 1 依賴圖譜

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-010 | API Key 認證 | P0 | 中 |
| F-004 | 分類管理 | P1 | 中 |
| F-001 | 知識條目 CRUD | P0 | 大 |
| F-007 | LLM Provider 管理 | P0 | 中 |
| F-002 | Inbox 暫存區 | P0 | 極小（複用 F-001） |

## 依賴關係

```
基礎設施（DB Migration + Docker Compose）
│
├── F-010 API Key 認證（auth middleware，所有 API 依賴）
│   │
│   ├── F-004 分類管理（Category model，Entry 的 FK 依賴）
│   │   │
│   │   ├── F-001 知識條目 CRUD（Entry model，依賴 Category FK）
│   │   │   │
│   │   │   └── F-002 Inbox 暫存區（複用 F-001 API，僅前端 filter）
│   │   │
│   │   └── UI Design（需要 Category + Entry + Provider 頁面元件）
│   │
│   └── F-007 LLM Provider 管理（獨立 model，無其他 feature 依賴）
│
└── QA（與 Wave 0 同步開始撰寫 test script）
```

## 依賴說明

### Data Model 依賴
- **F-001 -> F-004**：Entry.category_id 是 Category.id 的 FK（ON DELETE SET NULL），必須先有 Category table
- **F-002 -> F-001**：Inbox 完全複用 Entry CRUD API，只是 query parameter 組合

### API 依賴
- **F-001, F-004, F-007 -> F-010**：所有 `/api/v1/*` endpoint 都經過 API Key 認證 middleware

### 基礎設施依賴
- **所有功能 -> DB Migration**：需要先建好 schema
- **所有功能 -> Docker Compose**：需要 PostgreSQL 環境

### UI 依賴
- **UI Design -> F-001, F-004, F-007 的 API Contract**：UI 需要知道 API 欄位才能設計介面

## 拓撲排序

### Wave 0（先行，可並行）
- **F-010: API Key 認證** — 含 DB migration (api_keys table)、auth middleware、Bootstrap 機制
- **F-007: LLM Provider 管理** — 獨立 model，只依賴 F-010 的 auth middleware（可在 F-010 完成後立即開始）
- **UI Design: Sprint 1 UI Components** — 根據 API Contract 設計元件，與後端並行
- **QA: 撰寫 E2E test script** — 根據 spec scenarios 撰寫測試案例

### Wave 1（Wave 0 的 F-010 完成後）
- **F-004: 分類管理** — 含 DB migration (categories table)、CRUD API
- **F-007: LLM Provider 管理**（如 Wave 0 未完成，在此 wave 繼續）

### Wave 2（Wave 1 的 F-004 完成後）
- **F-001: 知識條目 CRUD** — 含 DB migration (entries table)、全文搜尋索引、CRUD API
- **F-002: Inbox 暫存區** — 與 F-001 同步完成（只是查詢參數組合，無額外 API）

## 並行策略

```
時間線 →

Wave 0:  [F-010 API Key 認證]  [F-007 LLM Provider（部分）]
         [UI Design ────────────────────────────]
         [QA 撰寫 test ────────────────────────]

Wave 1:       [F-004 分類管理]  [F-007 完成]

Wave 2:            [F-001 知識條目 CRUD + F-002 Inbox]

Code Review:            [逐 PR 審查 ──────────]
```

## 關鍵路徑

F-010 -> F-004 -> F-001 -> F-002

此為最長路徑。F-007 可與 F-004 並行開發。

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| F-010 延遲 | 所有後續 feature 阻塞 | 最高優先級，先完成 middleware |
| 全文搜尋 index 設定 | F-001 完成時間 | 可先完成 CRUD，搜尋 index 後補 |
| AES 加密實作 | F-007 完成時間 | crypto 模組獨立開發，不阻塞其他 |
