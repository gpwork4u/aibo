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

---

# Sprint 4 依賴圖譜

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-011 | MCP Server 模式 | P0 | 大（獨立 binary + 5 個 tools） |
| F-012 | 知識結構升級 | P0 | 中（DB migration + model/service/handler 修改） |
| F-013 | 信心度機制 | P0 | 中（DB migration + 新 API endpoint） |

## 依賴關係

```
F-012 (知識結構升級)  -- 無前置依賴
F-013 (信心度機制)    -- 無前置依賴

F-011 (MCP Server)
├── F-012 (query tool 需要 summary/detail/action 欄位)
└── F-013 (confirm/flag tool 需要對應 API)
```

## 依賴說明

### F-012 與 F-013 互相獨立
- F-012 修改 Entry model 新增 summary/detail/action 欄位 + 更新 LLM prompt + 搜尋索引
- F-013 修改 Entry model 新增 confidence 欄位 + 新增 entry_flags table + confirm/flag API
- 兩者操作不同欄位，migration 序號不同（006 和 007），可並行開發

### F-011 依賴 F-012 + F-013
- F-011 的 `aibo_query` tool 需要搜尋結果包含 summary/detail/action（F-012 產出）
- F-011 的 `aibo_confirm` / `aibo_flag` tool 需要 POST /api/v1/entries/:id/confirm 和 POST /api/v1/entries/:id/flag API（F-013 產出）
- F-011 作為獨立 binary 透過 HTTP 呼叫 API，不直接依賴程式碼層級

## 拓撲排序

### Wave 0（先行，可並行）
- **F-012**: 知識結構升級（DB migration + model/dto/repository/service/handler 修改）
- **F-013**: 信心度機制（DB migration + 新 API endpoint）
- **QA**: 撰寫 E2E test script

### Wave 1（Wave 0 完成後）
- **F-011**: MCP Server 模式（獨立 binary，呼叫 F-012 + F-013 的 API）

## 並行策略

```
時間線 ->

Wave 0:  [F-012 知識結構升級 ────────────]
         [F-013 信心度機制 ──────────────]
         [QA 撰寫 test script ──────────]

Wave 1:                    [F-011 MCP Server ──────────────]
                           [QA 執行完整測試 ───────────────]

Code Review:         [逐 PR 審查 ─────────────────────────]
```

## 關鍵路徑

max(F-012, F-013) -> F-011

F-012 和 F-013 並行，取較長者完成後開始 F-011。

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| F-012 和 F-013 同時修改 Entry model | 合併衝突 | 操作不同欄位，衝突小；先 merge 的 PR 另一邊 rebase |
| mcp-go SDK API 不穩定 | MCP server 需修改 | 封裝 tool handler，隔離 SDK 細節 |
| LLM prompt 變長導致回應品質下降 | summary/detail/action 品質不佳 | 調整 prompt、測試多種 LLM provider |
| 搜尋排序公式影響使用體驗 | 新 entry 排名過低 | confidence 預設 0.5，確保基本曝光 |

---

# Sprint 5 依賴圖譜

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-014 | Tags 分層 + 多維度搜尋 | P0 | 大（DB migration + model/dto/repository/service/handler 修改 + LLM prompt 更新） |
| F-015 | 知識生命週期 | P0 | 中（新 API endpoint + 循環檢測邏輯 + lifecycle_status 計算） |
| F-016 | 中文分詞優化 | P0 | 中（Docker image 自訂 + migration + 搜尋 SQL 修改） |

## 依賴關係

```
Sprint 1-4 已完成基礎設施
├── Entry CRUD（F-001）+ 知識結構（F-012）+ 信心度（F-013）
├── LLM 分類（F-003）+ 智慧搜尋（F-005）
├── MCP Server（F-011）
└── 搜尋架構：simple tsvector + pg_trgm

Sprint 5 新功能

F-016 (中文分詞優化)  ── 無前置依賴（獨立的 DB 擴展 + 索引變更）
    └── 自訂 Docker image（pg_bigm）
    └── 修改搜尋 SQL（repository/search.go, repository/entry.go）

F-014 (Tags 分層 + 多維度搜尋)
    ├── 依賴 F-016 完成：搜尋 SQL 同時修改，避免重複重建索引
    ├── 修改 Entry model/dto/repository/service/handler
    └── 更新 LLM 分類 prompt（service/llm.go）

F-015 (知識生命週期)  ── 無前置依賴（superseded_by 欄位已存在）
    ├── 新增 handler/service 方法
    └── 修改搜尋結果 DTO（新增 lifecycle_status）
```

## 依賴說明

### F-014 和 F-016 的搜尋層重疊
- F-014 需更新 FTS 索引（加入 domains 到權重 A）
- F-016 需替換 pg_trgm 索引為 pg_bigm 索引
- 兩者都修改 `repository/search.go` 和 `repository/entry.go` 的搜尋 SQL
- **建議 F-016 先完成**（基礎設施層），F-014 在此基礎上加入 domains/context 過濾

### F-015 獨立
- F-015 使用已存在的 superseded_by 欄位，不需新的 migration
- 只新增 API endpoint 和業務邏輯
- 搜尋結果新增 lifecycle_status 是計算欄位，不影響搜尋 SQL 結構

### 互相影響
- F-014 和 F-015 都修改搜尋結果 DTO（SearchResultItem）：F-014 加 domains/context，F-015 加 lifecycle_status
- 但兩者操作不同欄位，合併衝突風險低

## 拓撲排序

### Wave 0（先行，可並行）
- **F-016: 中文分詞優化** -- Docker image 自訂 + pg_bigm migration + 搜尋 SQL 修改
- **F-015: 知識生命週期** -- 新 API endpoint + lifecycle_status 邏輯（與 F-016 無依賴）
- **QA: 撰寫 E2E test script** -- 根據 spec scenarios 撰寫測試案例

### Wave 1（F-016 完成後）
- **F-014: Tags 分層 + 多維度搜尋** -- 在 pg_bigm 索引基礎上加入 domains/context

## 並行策略

```
時間線 ->

Wave 0:  [F-016 中文分詞優化 ──────────────]
         [F-015 知識生命週期 ──────────────]
         [QA 撰寫 test script ────────────────────────]

Wave 1:                    [F-014 Tags 分層 ───────────────────]

Code Review:         [逐 PR 審查 ──────────────────────────────]
```

## 關鍵路徑

F-016 -> F-014

F-016 是 F-014 的前置（搜尋 SQL 基礎），F-015 獨立可並行。
Sprint 5 關鍵路徑長度 = F-016 + F-014。

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| pg_bigm Alpine 編譯失敗 | Docker image 無法建置 | 改用 postgres:16-bookworm + apt install |
| F-014 和 F-016 搜尋 SQL 合併衝突 | 開發延遲 | F-016 先 merge，F-014 基於 F-016 分支開發 |
| F-014 和 F-015 都修改搜尋結果 DTO | 合併衝突 | 操作不同欄位，衝突小；先 merge 的 PR 另一邊 rebase |
| LLM prompt 增加 domains/context 後品質下降 | 分類結果不佳 | 分離 prompt 或分步驟呼叫 LLM |

---

# Sprint 6 依賴圖譜

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-017 | LLM Client 連線池 | P0 | 小 |
| F-018 | Service Interface 化 | P0 | 中（影響檔案多，但每個改動小） |
| F-019 | 品質檢測（PII 偵測） | P1 | 中 |
| F-020 | 小項修復 | P1 | 中（多個獨立小項） |

## 依賴關係

```
Sprint 1-5 已完成基礎設施
├── LLM Service（llm.go）
├── Repository 層（所有 *Repository struct）
├── Classifier Service（classifier.go）
├── GCal Service（gcal.go）
└── Git Import Service（git_import.go）

Sprint 6 新功能（全部可並行）

F-017 (LLM Client 連線池)  ── 無前置依賴
    └── 修改 service/llm.go + service/llm_provider.go

F-018 (Service Interface 化)  ── 無前置依賴
    └── 新增 service/interfaces.go
    └── 修改所有 service/*.go 的構造函式

F-019 (品質檢測)  ── 無前置依賴
    └── 新增 service/quality.go
    └── 修改 service/classifier.go + model/entry.go

F-020 (小項修復)  ── 無前置依賴
    ├── 20-A: rate limiter per provider（由 F-017 涵蓋）
    ├── 20-B: OAuth state 持久化（修改 gcal.go + migration）
    ├── 20-C: env 啟動驗證（修改 config.go）
    ├── 20-D: repo_path 安全（修改 git_import.go + config.go）
    └── 20-E: Go 版本對齊（go.mod + Dockerfile）
```

## 依賴說明

### 四個 Feature 互相獨立
- F-017 修改 llm.go 的 client 建立邏輯
- F-018 修改所有 service 的構造函式簽名
- F-019 新增 quality.go，修改 classifier.go 的分類流程
- F-020 的各子項分別修改不同檔案

### 潛在合併衝突
- **F-017 和 F-018**：F-017 修改 LlmService struct，F-018 也修改 LlmService 的依賴型別。建議 F-017 先 merge，F-018 基於 F-017 調整。
- **F-018 和 F-019**：F-019 修改 classifier.go，F-018 也修改 classifier.go 的構造函式。衝突小，容易解決。
- **F-017 和 F-020-A**：F-020-A 的 per-provider rate limiter 已包含在 F-017 的設計中。

### 建議 merge 順序
1. F-020（獨立小項，風險最低）
2. F-017（LLM client 快取）
3. F-018（interface 化，影響最廣）
4. F-019（品質檢測，最後加入分類流程）

## 拓撲排序

### Wave 0（全部可並行）
- **F-017: LLM Client 連線池** -- 純 service 層重構
- **F-018: Service Interface 化** -- 純 service 層重構
- **F-019: 品質檢測** -- 新增 quality.go + migration
- **F-020: 小項修復** -- 多個獨立修改
- **QA: 撰寫 E2E test script** -- 根據 scenarios 撰寫

### 無 Wave 1
所有 feature 無互相依賴，全部在 Wave 0 並行開發。

## 並行策略

```
時間線 ->

Wave 0:  [F-017 LLM Client 連線池 ──────]
         [F-018 Service Interface 化 ──────────────]
         [F-019 品質檢測 ──────────────]
         [F-020 小項修復 ──────────]
         [QA 撰寫 test script ────────────────────]

Code Review:         [逐 PR 審查 ─────────────────]

Merge 順序:    F-020 → F-017 → F-018 → F-019
```

## 關鍵路徑

無嚴格的關鍵路徑。F-018 因影響檔案最多，預計開發時間最長。

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| F-018 影響所有 service | 合併衝突多 | 建議最早開始開發、最晚 merge |
| F-017 和 F-018 修改同一 struct | 合併衝突 | F-017 先 merge，F-018 rebase |
| F-019 migration 序號衝突 | migration 執行順序錯 | 統一分配序號：009=quality_flags, 010=oauth_states |
| 多個 PR 同時修改 classifier.go | 合併衝突 | F-018 和 F-019 協調 merge 順序 |
