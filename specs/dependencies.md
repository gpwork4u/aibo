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

---

# Sprint 7 依賴圖譜

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-021 | 前端基礎（Next.js + Layout + 共用元件） | P0 | 大 |
| F-022 | API Keys 管理頁 | P0 | 中 |
| F-023 | Entries + Inbox 頁面 | P0 | 大（核心頁面 + Markdown） |
| F-024 | Categories + LLM Providers 管理頁 | P0 | 中 |
| F-025 | 全文搜尋頁 | P0 | 中 |

## 依賴關係

```
後端 API（Sprint 1-6 已完成）
      │
      ▼
F-021 前端基礎（Next.js + shadcn/ui + TanStack Query + API client + Layout）
      │
      ├── F-022 API Keys 管理頁
      ├── F-023 Entries + Inbox 頁面
      ├── F-024 Categories + LLM Providers 管理頁
      └── F-025 全文搜尋頁
```

## 依賴說明

- **F-021 必須先行**：所有頁面共用的 layout / shadcn/ui setup / API client / TanStack Query / Toaster / 共用元件（PageHeader / DataTable / TagInput / MarkdownViewer / EmptyState）都在 F-021 建立
- **F-022/023/024/025 互相獨立**：四個頁面無跨頁依賴，可完全並行開發

## 拓撲排序

### Wave 0（先行，blocking）
- **F-021**: 前端專案初始化 + Layout + 共用元件

### Wave 1（F-021 完成後並行）
- **F-022**: API Keys 管理頁
- **F-023**: Entries + Inbox 頁面
- **F-024**: Categories + LLM Providers 管理頁
- **F-025**: 全文搜尋頁

### QA
- QA 與 Wave 0 同步撰寫 Playwright e2e test script
- Wave 1 PR merge 後執行完整 browser test

## 並行策略

```
時間線 ->

Wave 0:  [F-021 前端基礎 ──────────────────]
         [QA 撰寫 Playwright test ───────────────────────]

Wave 1:                      [F-022 API Keys ─────────]
                             [F-023 Entries + Inbox ──────────]
                             [F-024 Categories + LLM Providers]
                             [F-025 Search ───────────]

Code Review:         [逐 PR 審查 ────────────────────────────]
```

## 關鍵路徑

F-021 -> max(F-022, F-023, F-024, F-025)

F-023 工作量最大（列表 + 詳情 + 編輯 + Markdown），預期為 Wave 1 最後完成者。

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| Tailwind v4 + shadcn/ui 相容性 | 樣式錯亂 | F-021 中儘早驗證，使用官方 CLI 產生元件 |
| 後端缺 CORS middleware | 前端無法呼叫 API | F-021 中同步新增 CORS middleware 到後端 |
| Next.js App Router + TanStack Query hydration | SSR 錯誤 | 查詢以 "use client" component 觸發 |
| Docker compose frontend depends on api | 啟動失敗 | 使用 depends_on + healthcheck，client-side fetch 重試 |
| F-023 Markdown 渲染 XSS | 安全風險 | 使用 react-markdown（預設禁 raw HTML）+ 不用 dangerouslySetInnerHTML |

---

## Sprint 8：行事曆基礎

### 依賴來源
- 沿用 Sprint 3 F-009（Google Calendar OAuth + token refresh）的 `GcalService` / `GcalIntegrationRepository`
- 沿用 Sprint 7 前端 foundation（`ApiClient`、TanStack Query provider、`app-sidebar`、shadcn/ui 元件庫）
- 沿用 `EntryRepository`（新增 `ListByDateRange`）與 `entries.source_type='gcal' + source_ref=event.id` 關聯慣例

### Feature 拆分（Sprint 8）

Backend（F-026 拆三）：
- **F-026a**：Migration 012 + `EntryRepository.ListByDateRange` + `dto/calendar.go`（共用型別）
- **F-026b**：`GET /api/v1/calendar` + `GET /api/v1/calendar/days/:date`（含 tz / degraded / cache）
- **F-026c**：`POST /api/v1/calendar/events/:gcal_id/to-entry`（event → entry 轉換）

Frontend（F-027 拆三）：
- **F-027a**：`/calendar` 路由 + `CalendarPage` 容器 + `CalendarToolbar` + 月視圖 + sidebar 新增項
- **F-027b**：週視圖 + 日視圖 + 鍵盤快捷鍵 + 手機版 fallback
- **F-027c**：`DayDetailSheet`（Sheet + entry list + event list + 轉 entry 按鈕）+ banner / toast

設計（D-08）：
- Calendar grid / DayCell / EventChip / EntryBadge / DayDetailSheet mocks + tokens

QA（QA-08）：
- Playwright e2e 對應全部 scenarios + backend API 整合測試

### 依賴圖（Sprint 8）

```
D-08 (UI Design)  ┐
                  ├─── F-027a (CalendarPage + MonthView + sidebar)
F-026a (migration + repo + DTO)                          │
  ├── F-026b (GET /calendar, /calendar/days/:date) ─────┤
  │     │                                                │
  │     └──► F-027a / F-027b / F-027c 依賴之             │
  └── F-026c (POST .../to-entry) ───────► F-027c
                                           │
QA-08 (test skeleton，Wave 0 起跑) ◄──── 全部 feature merge 後再補完整 e2e
```

### 拓撲排序 / Wave

**Wave 0（並行起跑）**
- **F-026a**：migration + repo + DTO 型別（純後端，無依賴）
- **D-08**：UI Design（純設計，無依賴）
- **QA-08**：建立 Playwright 測試骨架、撰寫 e2e scenario 清單（不需等 feature 完成）

**Wave 1（Wave 0 完成後）**
- **F-026b**：彙整 API（依賴 F-026a 的 repo + DTO）
- **F-026c**：event → entry（依賴 F-026a 的 `uq_entries_gcal_ref` unique index）
- **F-027a**：月視圖 + 路由 + sidebar（依賴 F-026b 的 API + D-08 的 tokens）

**Wave 2（Wave 1 完成後）**
- **F-027b**：週視圖 + 日視圖（依賴 F-027a 的 CalendarPage 容器 + toolbar）
- **F-027c**：DayDetailSheet + 轉 entry 動作（依賴 F-026b 的 `/days/:date` + F-026c 的 POST）

**Wave 3**
- QA-08 補齊完整 e2e 並執行 docker compose 完整測試

### 並行策略

```
時間線 ->

Wave 0:  [F-026a migration + repo + DTO ────]
         [D-08  UI Design tokens + mocks ────]
         [QA-08 test skeleton ──────────────────────────────────]

Wave 1:                   [F-026b /calendar GET ────────]
                          [F-026c /to-entry POST ───]
                          [F-027a CalendarPage + MonthView ─────]

Wave 2:                                         [F-027b Week + Day ─────]
                                                [F-027c DayDetailSheet ──]

Wave 3:                                                            [QA-08 完整 e2e ──]

Code Review:  [逐 PR 審查 ─────────────────────────────────────────────────────]
```

### 關鍵路徑

F-026a → F-026b → F-027a → F-027c → QA-08 完整 e2e

### 風險項目（Sprint 8）

| 風險 | 影響 | 緩解 |
|------|------|------|
| 自幹 calendar grid 時間軸計算 bug（週/日視圖跨日 event） | UX 錯位 | 先寫 util 純函式 + 單測，再畫 UI |
| Timezone 分桶錯誤 | entry 歸錯日 | 後端 `X-Timezone` header；單測覆蓋 Asia/Taipei 跨日 scenario |
| Gcal upstream 不穩 | 整頁失敗 | Degraded response（HTTP 200 + `X-Degraded: gcal`） |
| Migration 012 unique index 與既有 gcal entries 衝突 | migration 失敗 | up.sql 前置 cleanup query 保留最早一筆 |
| 使用者尚未連 gcal 每次 424 | 首次體驗差 | 前端以 `include_gcal=false` 預查一次、後端 422 改用 200 + `gcal_connected=false` flag（保留 424 給明確要 include_gcal=true 時） |

---

# Sprint 13 依賴圖譜：Visual Foundation

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-035 | Design Tokens & Theme | P0 | 中（CSS variables + ThemeProvider） |
| F-038 | shadcn Primitives | P0 | 中（12 primitives 主題覆蓋） |
| F-039 | API SSE Auth | P0 | 大（DB migration + middleware + handlers） |
| F-036 | App Shell + Routing | P0 | 大（route group + parallel routes + layout） |
| F-037 | Command Palette Skeleton | P0 | 小（cmdk + 導航 actions） |

## 依賴關係

```
F-035 (Design Tokens)  ─── 無前置依賴（純 CSS）
  └──► F-038 (shadcn Primitives)  ─── 依賴 F-035 CSS variables
         └──► F-036 (App Shell)   ─── 依賴 F-038 Button/Badge 等
                └──► F-037 (CmdK) ─── 依賴 F-036 shell layout + F-038 Command primitive

F-039 (API SSE Auth)   ─── 無前置依賴（後端，與前端並行）
```

## 拓撲排序

### Wave 0（並行起跑）
- **F-035**: Design Tokens（純 CSS，無依賴）
- **F-039**: API SSE Auth（純後端，無依賴）
- **D-13**: UI Design Dataset（根據 token 定義設計元件規格）
- **QA-13**: 撰寫 e2e skeleton

### Wave 1（F-035 完成後）
- **F-038**: shadcn Primitives（依賴 F-035 CSS variables）

### Wave 2（F-038 完成後）
- **F-036**: App Shell + Routing（依賴 F-038 元件）

### Wave 3（F-036 完成後）
- **F-037**: Command Palette Skeleton（依賴 F-036 shell layout）

## 並行策略

```
時間線 ->

Wave 0:  [F-035 Design Tokens ──────]  [F-039 API SSE Auth ──────────────────]
         [D-13 UI Design ──────────────────────────────]
         [QA-13 e2e skeleton ─────────────────────────────────────────────────]

Wave 1:               [F-038 shadcn Primitives ──────]

Wave 2:                              [F-036 App Shell ─────────────]

Wave 3:                                                 [F-037 CmdK ──]

Code Review:  [逐 PR 審查 ─────────────────────────────────────────────────────]
```

## 關鍵路徑

F-035 → F-038 → F-036 → F-037

F-039 為後端，可與前端 wave 完全並行。

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| Tailwind v4 @theme 語法與 shadcn CLI 不相容 | 元件樣式錯亂 | F-035 完成後立即驗證 shadcn CLI 輸出 |
| Next.js parallel routes HMR 不穩定 | 開發效率下降 | 先完成靜態 layout，最後才加 parallel routes |
| CookieAuth middleware 與既有 X-API-Key 衝突 | 現有 API 中斷 | middleware 採 fallback 策略，不改變現有行為 |
| F-039 router wiring 未在 Sprint 13 完成 | SSE 端點無法呼叫 | 標記為 skeleton，Sprint 14 補上 router wiring |

---

# Sprint 14 依賴圖譜：Core Views

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-040 | Inbox Triage | P0 | 大（新後端 batch API + 前端改造） |
| F-041 | Library Table | P0 | 大（TanStack Table + 虛擬化 + URL 同步） |
| F-042 | Today Dashboard | P0 | 中（聚合多資料源，無新後端） |
| F-043 | Saved Views & Filter Bar | P1 | 中（新後端 saved_views + 前端 sidebar） |

## 依賴關係

```
Sprint 13 已完成：
├── F-035 Design Tokens（CSS variables）
├── F-036 App Shell（shell layout + 路由）
├── F-037 CmdK（skeleton）
├── F-038 shadcn Primitives（Button/Input/Sheet/Select 等）
└── F-039 API SSE Auth（skeleton，router wiring 待補）

Sprint 14 功能依賴：

F-040 (Inbox Triage)
├── 前端：依賴 F-036 shell / F-038 primitives
└── 後端：新增 POST /api/v1/entries/batch endpoint（migration 不需要）

F-041 (Library Table)
├── 前端：依賴 F-036 shell / F-038 primitives
└── 後端：沿用既有 GET /api/v1/entries（無新 API）

F-042 (Today Dashboard)
├── 前端：依賴 F-036 shell / F-038 primitives
└── 後端：沿用現有 journal/calendar/tasks/entries API（無新 API）

F-043 (Saved Views)
├── 前端：依賴 F-036 shell（sidebar 新增 Views 區塊）
└── 後端：新增 saved_views table（migration 018）+ CRUD API
```

## 依賴說明

- **F-040、F-041、F-042 可完全並行**：三者無互相依賴，只共用 Sprint 13 基礎
- **F-043 略有依賴**：Saved Views 的 Filter 參數格式與 F-041 Library 過濾一致，建議 F-041 介面先定義，F-043 後跟進
- **F-039 router wiring** 需在 Sprint 14 Wave 0 補上，才能讓前端 cookie auth 正常運作

## 拓撲排序

### Wave 0（先行）
- **F-039 router wiring**：補上 Sprint 13 未完成的 router 註冊（small fix，blocking for cookie auth）
- **QA-14**: 撰寫 e2e skeleton

### Wave 1（F-039 wiring 完成後，可並行）
- **F-040**: Inbox Triage（後端 batch API + 前端改造）
- **F-041**: Library Table（前端改造，無新後端）
- **F-042**: Today Dashboard（前端聚合，無新後端）

### Wave 2（F-041 介面定義後）
- **F-043**: Saved Views（後端 migration + CRUD + 前端 sidebar）

## 並行策略

```
時間線 ->

Wave 0:  [F-039 router wiring ──]
         [QA-14 e2e skeleton ──────────────────────────────────────────]

Wave 1:           [F-040 Inbox Triage ──────────────────────]
                  [F-041 Library Table ────────────────────────────────]
                  [F-042 Today Dashboard ────────────────]

Wave 2:                    [F-043 Saved Views ─────────────────────]

Code Review:  [逐 PR 審查 ─────────────────────────────────────────────]
```

## 關鍵路徑

F-039 wiring → F-041（最長）→ F-043

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| TanStack Virtual + 大量資料效能 | Library 卡頓 | 先實作非虛擬化版本，確認功能後再加虛擬化 |
| Today Dashboard 多 API 並行失敗處理 | 部分 section 白屏 | 各 section 獨立 error boundary |
| F-043 filter JSON schema 不夠彈性 | 未來擴展困難 | JSONB 無固定 schema，保留彈性 |

---

# Sprint 15 依賴圖譜：Knowledge Graph

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-044 | Entry Links Backend | P0 | 中（migration + CRUD API） |
| F-045 | Canvas Graph View | P1 | 大（React Flow + ELK layout + graph API） |
| F-046 | Relation Editor | P1 | 中（UI 嵌入 entry detail + Combobox 搜尋） |

## 依賴關係

```
F-044 (Entry Links Backend)  ─── 無前置依賴（新 DB table + API）
  ├──► F-045 (Canvas Graph View)  ─── 依賴 F-044 + 新 GET /api/v1/graph endpoint
  └──► F-046 (Relation Editor)    ─── 依賴 F-044 CRUD API

F-045 和 F-046 互相獨立（F-044 完成後可並行）
```

## 拓撲排序

### Wave 0（先行）
- **F-044**: Entry Links Backend（migration 019 + CRUD API）
- **QA-15**: 撰寫 e2e skeleton

### Wave 1（F-044 完成後，可並行）
- **F-045**: Canvas Graph View（新增 GET /api/v1/graph + React Flow 前端）
- **F-046**: Relation Editor（嵌入 entry detail，使用 F-044 CRUD API）

## 並行策略

```
時間線 ->

Wave 0:  [F-044 Entry Links Backend ──────────]
         [QA-15 e2e skeleton ──────────────────────────────────────────]

Wave 1:                  [F-045 Canvas Graph View ─────────────────────]
                         [F-046 Relation Editor ───────────────────────]

Code Review:  [逐 PR 審查 ─────────────────────────────────────────────]
```

## 關鍵路徑

F-044 → F-045（React Flow 工作量最大）

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| ELK.js WASM 在 Next.js 載入慢 | Canvas 首次渲染延遲 | 動態 import + loading skeleton |
| React Flow 大節點數效能（> 100） | 圖譜卡頓 | limit=50 預設，超過 200 降級 dot-only |
| entry_links ENUM 未來擴展 | 需要 migration | 預先在 ENUM 中保留 related_to 作為通用 fallback |

---

# Sprint 16 依賴圖譜：Copilot & Power UX

## 功能總覽

| 編號 | 名稱 | 優先級 | 工作量 |
|------|------|--------|-------|
| F-048 | Copilot Backend SSE | P0 | 大（DB migration + LLM streaming + context 組裝） |
| F-047 | Copilot Side Panel | P0 | 大（EventSource + streaming UI + zustand state） |
| F-049 | CmdK Power Actions | P0 | 中（延伸 F-037 + QuickCreateModal + AI actions） |
| F-050 | Keyboard Shortcuts | P1 | 小（hook + ShortcutsModal） |

## 依賴關係

```
F-048 (Copilot Backend SSE)  ─── 無前置依賴（後端，migration 020）
  └──► F-047 (Copilot Side Panel) ─── 依賴 F-048 完整 SSE（F-039 skeleton 已有 ping）

F-037 (CmdK Skeleton, Sprint 13)
  └──► F-049 (CmdK Power Actions) ─── 延伸 F-037

F-050 (Keyboard Shortcuts)  ─── 依賴 F-036 shell / F-040 Inbox / F-041 Library 介面已定義
```

## 依賴說明

- **F-047 與 F-048 強耦合**：前端 EventSource 串接後端 SSE token stream。F-048 需先完成，F-047 才能做完整 streaming 測試
- **F-047 可以 ping-only 模式先開發**：F-039 的 ping SSE 即可驗證 EventSource 連線邏輯
- **F-049 與 F-047 獨立**：CmdK power actions 中的 "AI actions" 只是開啟 Copilot Panel + 預填文字，不直接呼叫 SSE
- **F-050 完全獨立**：只依賴已完成的 UI 元件和路由

## 拓撲排序

### Wave 0（並行起跑）
- **F-048**: Copilot Backend SSE（migration + LlmService 串接 + streaming handler）
- **F-049**: CmdK Power Actions（延伸 F-037，前端，無後端依賴）
- **F-050**: Keyboard Shortcuts（純前端 hook）
- **QA-16**: 撰寫 e2e skeleton

### Wave 1（F-048 完成後）
- **F-047**: Copilot Side Panel（完整 EventSource + streaming UI）

## 並行策略

```
時間線 ->

Wave 0:  [F-048 Copilot Backend SSE ─────────────────────────────]
         [F-049 CmdK Power Actions ─────────────────]
         [F-050 Keyboard Shortcuts ──────────]
         [QA-16 e2e skeleton ──────────────────────────────────────────]

Wave 1:                        [F-047 Copilot Side Panel ─────────────]

Code Review:  [逐 PR 審查 ─────────────────────────────────────────────]
```

## 關鍵路徑

F-048 → F-047（完整 streaming 測試需要 F-048）

## 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| LLM streaming token 斷行 / Unicode 截斷 | 顯示亂碼 | 後端以 UTF-8 word boundary 分割 token |
| SSE 連線在代理（Nginx）後被 buffered | 前端無法即時收到 token | 後端設定 `X-Accel-Buffering: no` header |
| zustand state 跨路由 hydration 問題 | Panel 狀態重置 | store 初始化在 shell layout，非 page component |
| CmdK batch classify 大量 inbox items | 請求超時 | 後端非同步處理，前端 progress polling |

---

## Sprint 14 依賴圖譜（Inbox + Library + Today）

### 功能總覽

| 編號 | 名稱 | 優先級 | 後端需求 |
|------|------|--------|---------|
| F-040 | Inbox Triage View | P0 | 新增 `POST /api/v1/entries/batch` endpoint |
| F-041 | Library Table View | P0 | 沿用既有 API，無新後端 |
| F-042 | Today Dashboard | P0 | 沿用既有 API，無新後端 |
| F-043 | Saved Views + Filter Bar | P1 | 新增 `saved_views` table + CRUD API（migration 018） |

### Sprint 13 已完成依賴（可直接使用）

- Design tokens（editorial paper theme）
- shadcn/ui primitives
- App Shell + parallel routes `/dashboard` hub
- Command Palette skeleton（⌘K）
- Cookie session auth + SSE skeleton

### 依賴關係

```
Sprint 13 成果（design tokens + shadcn + shell layout + cookie auth）
│
├── F-040 Inbox Triage View
│   ├── 沿用：GET /api/v1/entries?status=inbox（F-001/F-002 已實作）
│   ├── 沿用：PATCH /api/v1/entries/:id（狀態更新）
│   ├── 沿用：DELETE /api/v1/entries/:id（軟刪除）
│   └── 新增：POST /api/v1/entries/batch（批次操作）
│
├── F-041 Library Table View
│   ├── 沿用：GET /api/v1/entries（含 q / status / category_id / tags / sort params）
│   └── 依賴：nuqs（URL state sync）
│
├── F-042 Today Dashboard
│   ├── 沿用：GET /api/v1/journal/:date
│   ├── 沿用：GET /api/v1/calendar/days/:date
│   ├── 沿用：GET /api/v1/tasks?due_date=today&status=pending
│   └── 沿用：GET /api/v1/entries?updated_since=today_start&per_page=5
│
└── F-043 Saved Views + Filter Bar
    ├── 新建：migration 018 `saved_views` table
    ├── 新增：GET / POST / PATCH / DELETE /api/v1/views
    ├── 新增：PATCH /api/v1/views/reorder
    └── UI 整合：sidebar 連結至 F-041 Library filter 狀態

UI Design（Inbox 卡片、Library table chrome、Today sections、SavedViews chip）
├── F-040 依賴（InboxCard 樣式）
├── F-041 依賴（LibraryTable column header chrome）
├── F-042 依賴（Today section cards）
└── F-043 依賴（SavedViews chip 元件）

QA 與 Wave 0 同步開始撰寫 e2e test scripts
```

### 依賴說明

**Data Model 依賴**
- F-043 需先完成 migration 018（`saved_views` table），其他 feature 無新 migration
- F-040、F-041、F-042 全部沿用既有 DB schema

**API 依賴**
- F-040 的批次操作 endpoint 為新增後端，但前端 UI 可先 mock 開發，不阻塞
- F-043 後端 API 新增，前端 UI 依賴後端，但可先以 localStorage mock

**UI 依賴**
- 所有 4 個 features 均依賴 UI Design 提供的元件規格（InboxCard、TableChrome、TodaySectionCard、SavedViewChip）
- UI Design 需先完成才能實作最終樣式，但不阻塞功能骨架開發

### 拓撲排序

#### Wave 0（立即並行啟動）
- **UI Design**：Inbox 卡片、Library table chrome、Today sections、SavedViews chip
- **F-040 Inbox Triage View**（後端 batch endpoint 可先 mock）
- **F-042 Today Dashboard**（全部沿用既有 API，無依賴）
- **QA**：開始撰寫 F-040~F-043 e2e test scripts

#### Wave 1（F-043 後端 migration 完成後）
- **F-041 Library Table View**（依賴 nuqs，不依賴後端 migration）
- **F-043 Saved Views**（依賴 migration 018）

> 實務上 F-041 不依賴 F-043 的 migration，可與 Wave 0 同步啟動。
> F-043 的後端（migration 018）最早可完成，前端整合為 Wave 1。

### 並行甘特圖

```
Week 1:
UI Design:  [Inbox卡片 + Table chrome + Today sections + SavedViews chip ─────]
F-040:      [批次 endpoint + Inbox UI + 鍵盤快捷鍵 ──────────────────────────]
F-042:      [Today 聚合視圖 + 各 section 獨立 loading ───────────────────────]
QA:         [撰寫 F-040~F-043 e2e scenarios ────────────────────────────────]

Week 2:
F-041:      [TanStack Table + Virtual + nuqs URL sync ────────────────────────]
F-043:      [migration 018 + saved_views CRUD + sidebar chip ────────────────]
Code Review:[逐 PR 審查 ─────────────────────────────────────────────────────]
```

### 關鍵路徑

migration 018（F-043 後端）→ F-043 前端整合

### 風險項目

| 風險 | 影響 | 緩解 |
|------|------|------|
| TanStack Virtual 與 shadcn Table 樣式衝突 | Layout 破版 | 使用 `div` 替代 `table` element，或 spacer-based virtualization |
| nuqs 與 Next.js App Router RSC 水合不一致 | URL state 閃爍 | 使用 `NuqsAdapter` 包裹 layout，`shallow: true` 避免 server re-render |
| Today Dashboard 4 個 API 同時請求 | 頁面載入慢 | TanStack Query `Promise.all` 平行請求 + Suspense boundary per section |
| 批次操作 partial success UX 混亂 | 使用者不知道哪些失敗 | toast 明確列出 failed ids 數量 |
