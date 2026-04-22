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

---

# Sprint 2 依賴圖譜

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-003 | LLM 自動分類 | P0 | 大 |
| F-005 | LLM 同義關鍵字搜尋 | P0 | 中 |

## 依賴關係

```
Sprint 1 已完成基礎設施
├── Entry CRUD（F-001）
├── Category CRUD（F-004）
├── LLM Provider 管理（F-007）
└── API Key 認證（F-010）

Sprint 2 新功能
├── F-003 LLM 自動分類
│   ├── 依賴 Entry CRUD（讀取/更新 entry）
│   ├── 依賴 Category CRUD（查詢/建立 category）
│   ├── 依賴 LLM Provider（取得 active provider、解密 API Key）
│   └── 新增 LLM Client 模組（go-openai）
│
└── F-005 LLM 同義關鍵字搜尋
    ├── 依賴 Entry Repository（全文搜尋查詢）
    ├── 依賴 LLM Provider（取得 active provider、解密 API Key）
    └── 共用 LLM Client 模組（與 F-003 共用）
```

## 依賴說明

### Data Model 依賴
- **F-003 -> Entry + Category**：分類結果更新 entry.category_id / tags / title，可能自動建立 category
- **F-005 -> Entry**：搜尋 Entry 的 tsvector index，無寫入操作

### 共用模組依賴
- **F-003, F-005 -> LLM Client**：兩者都需要呼叫 LLM API，共用 LlmService（封裝 go-openai client、rate limiter）
- **F-003, F-005 -> LLM Provider**：兩者都透過 GetActiveProvider 取得可用 provider

### 互相獨立
- **F-003 與 F-005 無直接依賴**：分類修改 entry 的 category/tags，搜尋只讀取 entry 內容，兩者可並行開發

## 拓撲排序

### Wave 0（共用模組，先行）
- **LLM Client 模組**（LlmService）：封裝 go-openai client 建立、LLM 呼叫、rate limiting、錯誤處理
  - 新增 `dev/src/service/llm.go`
  - 新增 `dev/src/dto/llm.go`（ClassifyResult、SynonymResult 等內部 DTO）

### Wave 1（Wave 0 完成後，可並行）
- **F-003: LLM 自動分類** — 背景 worker + classify API + auto-classify on create
- **F-005: LLM 同義關鍵字搜尋** — search API + synonym expansion + degradation

### QA
- QA 與 Wave 0 同時開始撰寫 test script

## 並行策略

```
時間線 ->

Wave 0:  [LLM Client 模組（LlmService）]
         [QA 撰寫 test script ────────────────────]

Wave 1:       [F-003 LLM 自動分類 ──────────────]
              [F-005 LLM 同義關鍵字搜尋 ─────────]

Code Review:            [逐 PR 審查 ──────────────]
```

## 關鍵路徑

LLM Client 模組 -> F-003 / F-005（並行）

由於 F-003 和 F-005 可完全並行，Sprint 2 的關鍵路徑長度 = LLM Client 模組 + max(F-003, F-005)。

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| LLM Client 模組延遲 | F-003 和 F-005 都阻塞 | 最高優先級完成，介面先定義好讓 F-003/F-005 可 mock 開發 |
| LLM 回傳品質不穩定 | 分類/搜尋結果不佳 | 防禦性 parse + 降級策略 |
| 背景 worker 穩定性 | 分類任務丟失 | channel buffer + graceful shutdown |

---

# Sprint 3 依賴圖譜

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-008 | Git 整合 | P2 | 中 |
| F-009 | Google Calendar 整合 | P2 | 大（含 OAuth2 flow + DB migration） |

## 依賴關係

```
Sprint 1/2 已完成基礎設施
├── Entry CRUD（F-001）— 匯入的 commit/event 儲存為 Entry
├── API Key 認證（F-010）— 所有 import API 需認證
└── AES-256 加密模組（crypto/aes.go）— F-009 token 加密

Sprint 3 新功能
├── F-008 Git 整合
│   ├── 依賴 Entry Repository（建立 entry、source_ref 去重查詢）
│   ├── 依賴 API Key 認證 middleware
│   ├── 新增 go-git 依賴
│   └── 無 DB migration（直接使用 Entry model）
│
└── F-009 Google Calendar 整合
    ├── 依賴 Entry Repository（建立 entry、source_ref 去重查詢）
    ├── 依賴 API Key 認證 middleware
    ├── 依賴 AES-256 加密模組（token 加密儲存）
    ├── 新增 DB migration（gcal_integrations table）
    ├── 新增 Google OAuth2 依賴
    └── 新增 Google Calendar API 依賴
```

## 依賴說明

### F-008 與 F-009 互相獨立
- F-008 使用 go-git 讀取本機 repo，F-009 使用 Google API 讀取 Calendar
- 兩者都匯入為 Entry，但 source_type 不同（"git" vs "gcal"）
- 無共用模組需先建立，可完全並行開發

### 對 Sprint 1/2 既有模組的依賴
- **Entry Repository**：兩者都使用 `source_ref` 欄位做去重查詢，需確認 Entry model 已有 source_type/source_ref/source 欄位
- **AES-256 加密**：F-009 需使用既有的 crypto 模組加密 OAuth token
- **Auth Middleware**：所有新 endpoint 都經過 API Key 認證

## 拓撲排序

### Wave 0（可完全並行）
- **F-008: Git 整合** — 無 DB migration，只依賴既有 Entry CRUD
- **F-009: Google Calendar 整合** — 含 DB migration（gcal_integrations）+ OAuth2 flow
- **QA: 撰寫 E2E test script** — 根據 spec scenarios 撰寫測試案例

### 無 Wave 1
- F-008 和 F-009 無互相依賴，全部在 Wave 0 並行

## 並行策略

```
時間線 ->

Wave 0:  [F-008 Git 整合 ────────────────────]
         [F-009 Google Calendar 整合 ─────────────────────]
         [QA 撰寫 test script ────────────────────────────]

Code Review:         [逐 PR 審查 ─────────────────────────]
```

## 關鍵路徑

F-009（Google Calendar 整合）為最長路徑，因為包含：
1. DB migration（gcal_integrations table）
2. OAuth2 授權流程（auth + callback）
3. Token 加密儲存
4. Calendar 事件匯入

F-008 相對簡單，預計先完成。

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| Entry model 缺少 source_type/source_ref 欄位 | 需補 migration | 確認 Sprint 1 的 Entry schema 已包含這些欄位 |
| Docker 容器無法存取宿主機 Git repo | F-008 功能受限 | 文件說明 volume mount 方式 |
| Google OAuth redirect URL 設定 | 授權流程失敗 | 環境變數配置 + 文件說明 |
