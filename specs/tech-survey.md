# 技術選型調查報告

## 調查日期
2026-04-22

## 1. 後端框架：Golang + Gin

### 決策
選擇 **Gin v1.10+**

### 理由
- Gin 是 Go 生態中最成熟的 HTTP 框架，GitHub Stars 80k+，社群活躍
- 內建 middleware 機制適合 API Key 認證需求
- 高效能路由（基於 httprouter），適合 RESTful API 服務
- 豐富的 middleware 生態（CORS、Recovery、Logger）

### 專案結構（推薦）

```
dev/src/
├── main.go                  # 進入點
├── config/
│   └── config.go            # 環境變數 + 設定
├── middleware/
│   └── auth.go              # API Key 認證 middleware
├── handler/
│   ├── api_key.go           # API Key CRUD handlers
│   ├── entry.go             # Entry CRUD handlers
│   ├── category.go          # Category CRUD handlers
│   └── llm_provider.go      # LLM Provider CRUD handlers
├── service/
│   ├── api_key.go           # API Key business logic
│   ├── entry.go             # Entry business logic
│   ├── category.go          # Category business logic
│   └── llm_provider.go      # LLM Provider business logic
├── repository/
│   ├── api_key.go           # API Key DB operations
│   ├── entry.go             # Entry DB operations
│   ├── category.go          # Category DB operations
│   └── llm_provider.go      # LLM Provider DB operations
├── model/
│   ├── api_key.go           # ApiKey struct
│   ├── entry.go             # Entry struct
│   ├── category.go          # Category struct
│   ├── llm_provider.go      # LlmProvider struct
│   └── error.go             # 共用錯誤碼定義
├── dto/
│   ├── request.go           # Request DTOs
│   └── response.go          # Response DTOs
├── crypto/
│   └── aes.go               # AES-256-GCM 加解密
├── router/
│   └── router.go            # 路由設定
├── migration/
│   ├── 001_create_api_keys.up.sql
│   ├── 001_create_api_keys.down.sql
│   ├── 002_create_categories.up.sql
│   ├── 002_create_categories.down.sql
│   ├── 003_create_entries.up.sql
│   ├── 003_create_entries.down.sql
│   ├── 004_create_llm_providers.up.sql
│   └── 004_create_llm_providers.down.sql
├── Dockerfile
├── go.mod
└── go.sum
```

### 參考資料
- [Go 官方 Gin Tutorial](https://go.dev/doc/tutorial/web-service-gin)
- [Production-Ready Go Project Structure](https://medium.com/@gitesky14/production-ready-go-folder-structure-88c1bd0f5a07)

---

## 2. 資料庫：PostgreSQL + 全文搜尋

### 決策
選擇 **PostgreSQL 16**，使用 `simple` configuration + `pg_trgm` 擴展

### 搜尋架構

| 方案 | 優點 | 缺點 | CJK 支援 |
|------|------|------|---------|
| tsvector (simple) | 內建、零額外依賴、支援權重 | 不做語言分析 | 需注意：simple 按空格分詞 |
| pg_trgm | 模糊匹配、LIKE/ILIKE 加速 | 3-byte trigram 對中文效果有限 | 需設定 Collate != C |
| pg_cjk_parser | CJK 2-gram 分詞 | 需安裝擴展 | 原生支援 |
| PGroonga | 全語言支援 | 額外依賴 | 原生支援 |

### 決策
**Sprint 1 使用 simple + pg_trgm 組合**。理由：
1. 個人知識庫的內容以英文技術筆記為主，simple 分詞足夠
2. pg_trgm 提供模糊匹配能力，補充精確搜尋的不足
3. 避免引入額外擴展，降低部署複雜度
4. Sprint 2 可視搜尋品質決定是否升級為 pg_cjk_parser

### GIN Index 設定
```sql
-- 全文搜尋索引
CREATE INDEX idx_entries_fts ON entries
  USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')));

-- pg_trgm 模糊搜尋索引
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_entries_trgm ON entries
  USING GIN ((coalesce(title,'') || ' ' || coalesce(content,'')) gin_trgm_ops);

-- Tags 索引
CREATE INDEX idx_entries_tags ON entries USING GIN (tags);
```

### 搜尋權重
- title: 權重 A（最高）
- tags: 權重 A（等同 title）
- content: 權重 B

### 參考資料
- [PostgreSQL pg_trgm 官方文件](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Full-Text Search with GIN Indexes in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-full-text-search-gin-postgresql/view)
- [pg_cjk_parser](https://github.com/huangjimmy/pg_cjk_parser)

---

## 3. ORM / DB Client

### 候選方案

| 方案 | GitHub Stars | 優點 | 缺點 | 適用場景 |
|------|-------------|------|------|---------|
| pgx v5 | 11k+ | 效能最佳、原生 PG 型別支援（JSONB、TEXT[]）、連線池內建 | 需手寫 SQL | PG-only 專案 |
| sqlx | 16k+ | 輕量、struct scanning、保留 SQL 控制力 | 無 PG 原生型別支援 | 多 DB 專案 |
| GORM | 37k+ | Auto-migration、關聯管理、開發速度快 | 效能較差（reflection）、複雜查詢不直觀 | 快速原型 |
| Ent | 16k+ | 型別安全、Graph schema | 學習曲線高、生成程式碼 | 複雜 domain |

### 決策
選擇 **pgx v5**（搭配 pgxpool 連線池）

### 理由
1. **效能最佳**：Benchmark 顯示 pgx 在高吞吐場景比 sqlx 快 30-50%，比 GORM 快更多
2. **原生 PostgreSQL 型別支援**：TEXT[]（tags）、JSONB（LLM config）、TIMESTAMPTZ 等直接映射 Go 型別
3. **內建連線池**：pgxpool 提供完整的連線池管理，無需額外依賴
4. **專案只用 PostgreSQL**：不需要多 DB 相容性
5. **SQL 控制力**：對全文搜尋、GIN index 等進階功能有完整控制

### 參考資料
- [pgx GitHub](https://github.com/jackc/pgx)
- [Go Database Patterns: GORM, sqlx, pgx Compared](https://dasroot.net/posts/2025/12/go-database-patterns-gorm-sqlx-pgx-compared/)
- [Comparing Go ORMs (2026)](https://encore.cloud/resources/go-orms)

---

## 4. API Key 認證

### 決策
使用 **SHA-256 + constant-time comparison** 實作 Gin middleware

### 實作要點

1. **Key 生成**：`aibo_` + 32 chars（crypto/rand），共 37 字元
2. **Hash 儲存**：`crypto/sha256` 產生 hex digest，只存 hash
3. **比對方式**：`crypto/subtle.ConstantTimeCompare()` 防止 timing attack
4. **Middleware 流程**：
   - 從 `X-API-Key` header 取得 key
   - SHA-256 hash
   - 查 DB 比對 key_hash
   - 檢查 is_active + expires_at
   - 非同步更新 last_used_at
5. **Bootstrap 偵測**：COUNT(api_keys) = 0 時允許免認證建立

### 參考資料
- [Implementing a safe and sound API Key authorization middleware in Go](https://dev.to/caiorcferreira/implementing-a-safe-and-sound-api-key-authorization-middleware-in-go-3g2c)
- [Go API Key Authentication](https://oneuptime.com/blog/post/2026-01-07-go-api-key-authentication/view)

---

## 5. AES-256 加密（LLM Provider API Key）

### 決策
使用 **AES-256-GCM**（Galois/Counter Mode）

### 理由
- GCM 提供 authenticated encryption（同時保證機密性和完整性）
- 不需要手動 padding（相比 CBC 模式）
- Go 標準庫 `crypto/aes` + `crypto/cipher` 原生支援
- 每次加密使用隨機 nonce（12 bytes），確保同一明文產生不同密文

### 實作要點
1. **加密金鑰**：32 bytes，從環境變數 `AIBO_ENCRYPTION_KEY` 讀取
2. **Nonce**：12 bytes，使用 `crypto/rand` 生成
3. **儲存格式**：`base64(nonce + ciphertext + tag)` 存入 VARCHAR(500)
4. **金鑰輪替**：預留接口，但 Sprint 1 不實作

### 參考資料
- [Encrypt and Decrypt Data in Go with AES-256 (Twilio)](https://www.twilio.com/en-us/blog/developers/community/encrypt-and-decrypt-data-in-go-with-aes-256)
- [Secret Key Encryption with Go using AES](https://dev.to/breda/secret-key-encryption-with-go-using-aes-316d)

---

## 6. 前端 UI 元件庫

### 候選方案

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|---------|
| shadcn/ui | 元件原始碼複製到專案、高度客製、Tailwind 原生 | 需逐一安裝元件 | 管理介面 |
| Ant Design | 企業級元件齊全、中文文件好 | Bundle 大、風格固定 | 企業應用 |
| Chakra UI | 語義化 API、Accessibility 好 | 元件數量較少 | 通用應用 |
| MUI | Material Design、元件最多 | 重量級、學習曲線 | 大型應用 |

### 決策
選擇 **shadcn/ui + Tailwind CSS v4 + Next.js App Router**

### 理由
1. 2025-2026 年 Next.js 管理介面的主流選擇
2. 元件原始碼直接在專案中，完全可控
3. 基於 Radix UI primitives，Accessibility (WCAG 2.1 AA) 內建
4. 搭配 TanStack Table v8 做 DataTable 元件
5. 輕量，按需引入，不會整包打包

### 需要的元件
- Button、Input、Select、Checkbox、Radio
- Dialog / Modal
- DataTable（TanStack Table）
- Form（react-hook-form + zod）
- Toast / Sonner
- Sidebar / Navigation
- Card、Badge、Dropdown Menu

### 參考資料
- [8 Best Next.js Admin Dashboards With shadcn/ui (2026)](https://adminlte.io/blog/nextjs-admin-dashboards-shadcn/)
- [How to Build an Admin Dashboard with shadcn/ui and Next.js](https://adminlte.io/blog/build-admin-dashboard-shadcn-nextjs/)

---

## 7. Docker Compose

### 決策
三個服務：PostgreSQL + Golang API + Next.js Frontend

### 架構

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: aibo
      POSTGRES_USER: aibo
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aibo"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./dev/src
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgres://aibo:${DB_PASSWORD}@db:5432/aibo?sslmode=disable
      AIBO_ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8080:8080"

  frontend:
    build:
      context: ./dev/src/frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api:8080
    depends_on:
      - api
    ports:
      - "3000:3000"

volumes:
  pgdata:
```

### 關鍵配置
- PostgreSQL 使用 `alpine` 映像，體積小
- API 服務使用 multi-stage build（builder + runtime）
- Next.js 使用 `output: "standalone"` 減少映像體積
- 服務間使用 Docker 網路通訊（service name 作為 hostname）
- 使用 healthcheck 確保 DB 先啟動

### 參考資料
- [Full Stack App: Next.js 14, Go, Postgres, Docker](https://www.youtube.com/watch?v=XDHDTGoZ_68)
- [Go + TypeScript full stack web app](https://dev.to/francescoxx/go-typescript-full-stack-web-app-with-nextjs-postgresql-and-docker-42ln)

---

## 8. DB Migration Tool

### 候選方案

| 方案 | GitHub Stars | 優點 | 缺點 | 適用場景 |
|------|-------------|------|------|---------|
| golang-migrate | 15k+ | 語言無關、CLI + Library、廣泛採用 | 無 drift detection | 通用 |
| goose | 7k+ | 支援 Go 寫 migration、輕量 | 無 linting | 小中型專案 |
| Atlas | 6k+ | Declarative schema、drift detection、linting | 學習曲線較高 | 大型專案 |

### 決策
選擇 **golang-migrate**

### 理由
1. **最廣泛採用**：被 5,000+ Go 專案引用，社群資源豐富
2. **CLI + Library 雙用**：可嵌入 Go 程式碼啟動時自動執行 migration
3. **簡單直接**：up/down SQL 檔案，容易理解和 review
4. **適合專案規模**：個人知識庫不需要 drift detection 或 declarative schema
5. **與 pgx 相容**：可搭配使用

### Migration 命名規則
```
{sequence}_{description}.up.sql
{sequence}_{description}.down.sql
```

### 參考資料
- [golang-migrate GitHub](https://github.com/golang-migrate/migrate)
- [Database migrations in Go with golang-migrate](https://betterstack.com/community/guides/scaling-go/golang-migrate/)

---

## 9. 其他 Library

| 用途 | 選擇 | 替代方案 | 選擇理由 |
|------|------|---------|---------|
| UUID | google/uuid | gofrs/uuid | Google 維護、最廣泛使用 |
| 環境變數 | joho/godotenv | viper | 簡單場景足夠、不過度設計 |
| 驗證 | go-playground/validator | ozzo-validation | Gin 生態原生整合 |
| 日誌 | slog (標準庫) | zerolog, zap | Go 1.21+ 標準庫內建，不需額外依賴 |
| HTTP Client | net/http (標準庫) | resty | LLM health check 用，不需要第三方 |
| 測試 | testing + testify | gomock | 簡單直觀 |

---

## 10. 技術風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| pg_trgm 對中文搜尋效果有限 | 搜尋品質不佳 | Sprint 2 評估後可換 pg_cjk_parser |
| AES 加密金鑰管理 | 金鑰洩漏 | 環境變數注入、不進 git |
| Bootstrap 機制安全性 | 首次部署窗口 | 建立第一把 key 後立即關閉 |
| pgx 手寫 SQL 的維護成本 | 開發速度 | 建立 repository 抽象層，統一管理 |

---

# Sprint 2 技術選型補充調查

## 調查日期
2026-04-22

## 11. OpenAI-Compatible API Client（Golang）

### 候選方案

| 方案 | GitHub Stars | 版本 | Go 版本需求 | 優點 | 缺點 |
|------|-------------|------|------------|------|------|
| sashabaranov/go-openai | 10.6k+ | 持續更新 | Go 1.18+ | 社群最廣泛採用、支援自訂 BaseURL、API 簡潔直觀 | 非官方維護 |
| openai/openai-go | 3.2k+ | v3.32.0 | Go 1.22+ | OpenAI 官方維護、原生 Structured Output 支援 | 仍在 beta、Go 版本需求較高、文件尚不完善 |

### 決策
選擇 **sashabaranov/go-openai**

### 理由
1. **自訂 BaseURL 支援成熟**：aibo 需要支援 LM Studio 等 OpenAI-compatible provider，go-openai 透過 `config.BaseURL` 即可切換 endpoint，已被大量社群驗證
2. **社群採用度高**：10.6k stars，Go 生態中最廣泛使用的 OpenAI client，遇到問題容易找到解法
3. **Go 版本相容**：專案目前使用 Go 1.23，go-openai 只需 1.18+，無相容性問題
4. **API 設計簡潔**：`openai.DefaultConfig()` + `config.BaseURL` 即可完成設定，與現有 LlmProvider model 的 endpoint_url 直接對應
5. **功能完整**：支援 Chat Completions、Streaming、Function Calling 等，滿足分類和搜尋需求

### 使用方式

```go
import openai "github.com/sashabaranov/go-openai"

// 從 LlmProvider 建立 client
config := openai.DefaultConfig(decryptedApiKey)
config.BaseURL = provider.EndpointURL + "/v1"  // 或直接使用 provider.EndpointURL
client := openai.NewClientWithConfig(config)

resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
    Model: provider.ModelName,
    Messages: []openai.ChatCompletionMessage{
        {Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
        {Role: openai.ChatMessageRoleUser, Content: userPrompt},
    },
    ResponseFormat: &openai.ChatCompletionResponseFormat{
        Type: openai.ChatCompletionResponseFormatTypeJSONObject,
    },
})
```

### 參考資料
- [sashabaranov/go-openai GitHub](https://github.com/sashabaranov/go-openai)
- [openai/openai-go GitHub](https://github.com/openai/openai-go)
- [go-openai custom BaseURL issue #266](https://github.com/sashabaranov/go-openai/issues/266)

---

## 12. LLM Structured Output 策略

### 候選方案

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|---------|
| response_format: json_object | 強制 JSON 輸出、大部分 OpenAI-compatible 支援 | 需在 prompt 中說明 schema、不保證 schema 一致 | 通用 JSON 輸出 |
| response_format: json_schema | 嚴格 schema 驗證、保證欄位完整 | 僅 OpenAI GPT-4o+ 支援、LM Studio 不一定支援 | OpenAI 專用 |
| Prompt engineering + JSON parse | 無 API 限制、任何 model 都支援 | 需自行驗證、可能有格式錯誤 | 廣泛相容 |
| instructor-go | 型別安全、自動 retry | 額外依賴、學習曲線 | 複雜 schema |

### 決策
採用 **response_format: json_object + Prompt engineering + Go struct 驗證** 三層策略

### 理由
1. **相容性優先**：aibo 支援多種 OpenAI-compatible provider（LM Studio、第三方），json_schema 不一定都支援，json_object 相容性更好
2. **防禦性設計**：即使 LLM 回傳格式不完全正確，Go 層的 json.Unmarshal + 驗證邏輯可以攔截
3. **不引入額外依賴**：使用 Go 標準庫 encoding/json 即可，不需要 instructor-go

### 實作策略

```go
// 1. Prompt 中明確要求 JSON 格式
const classifySystemPrompt = `你是一個知識分類助手。根據提供的內容，回傳 JSON 格式：
{"category": "分類名稱", "tags": ["tag1", "tag2"], "title": "建議標題"}
只回傳 JSON，不要包含任何其他文字。`

// 2. 使用 response_format: json_object
ResponseFormat: &openai.ChatCompletionResponseFormat{
    Type: openai.ChatCompletionResponseFormatTypeJSONObject,
},

// 3. Go struct 驗證
type ClassifyResult struct {
    Category string   `json:"category"`
    Tags     []string `json:"tags"`
    Title    string   `json:"title"`
}

func parseClassifyResult(raw string) (*ClassifyResult, error) {
    var result ClassifyResult
    if err := json.Unmarshal([]byte(raw), &result); err != nil {
        return nil, fmt.Errorf("LLM 回傳格式無效: %w", err)
    }
    if result.Category == "" {
        return nil, fmt.Errorf("LLM 回傳缺少 category 欄位")
    }
    return &result, nil
}
```

### 參考資料
- [OpenAI Structured Outputs Guide](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Constraining LLMs with Structured Output](https://www.glukhov.org/post/2025/09/llm-structured-output-with-ollama-in-python-and-go/)
- [instructor-go GitHub](https://github.com/jxnl/instructor-go)

---

## 13. 背景任務 / Goroutine 管理

### 決策
使用 **context.Context + sync.WaitGroup + channel** 原生模式

### 理由
1. **不過度設計**：aibo 是個人知識庫，背景任務只有「新 entry 建立後自動分類」和「批次分類」兩個場景，不需要完整的 job queue（如 asynq、machinery）
2. **Go 原生工具足夠**：context 傳遞取消信號、WaitGroup 等待完成、channel 控制並發
3. **graceful shutdown**：利用 signal.NotifyContext 監聽 SIGINT/SIGTERM，確保進行中的分類任務完成後才關閉

### 架構設計

```go
// ClassificationWorker 背景分類 worker
type ClassificationWorker struct {
    llmService      *LlmService
    entryService    *EntryService
    categoryService *CategoryService
    taskCh          chan uuid.UUID    // entry ID channel
    wg              sync.WaitGroup
    ctx             context.Context
    cancel          context.CancelFunc
}

// Start 啟動背景 worker
func (w *ClassificationWorker) Start() {
    w.wg.Add(1)
    go func() {
        defer w.wg.Done()
        for {
            select {
            case entryID := <-w.taskCh:
                w.classifyEntry(w.ctx, entryID)
            case <-w.ctx.Done():
                return
            }
        }
    }()
}

// Enqueue 將 entry 加入分類佇列（非阻塞）
func (w *ClassificationWorker) Enqueue(entryID uuid.UUID) {
    select {
    case w.taskCh <- entryID:
        slog.Info("entry enqueued for classification", "entry_id", entryID)
    default:
        slog.Warn("classification queue full, skipping", "entry_id", entryID)
    }
}

// Shutdown 優雅關閉
func (w *ClassificationWorker) Shutdown() {
    w.cancel()
    w.wg.Wait()
}
```

### 關鍵設計決策
- **Channel buffer size**：設定為 100，足夠個人使用場景的 burst
- **單一 worker goroutine**：批次分類序列執行（spec 要求），不需要 worker pool
- **非阻塞 enqueue**：使用 select + default 避免 channel 滿時阻塞 API handler
- **graceful shutdown**：main.go 中監聽系統信號，呼叫 worker.Shutdown() 等待進行中任務完成

### 參考資料
- [Graceful Shutdown in Go: Patterns Every Production Service Needs (2026)](https://dev.to/young_gao/graceful-shutdown-in-go-patterns-every-production-service-needs-3l9c)
- [A Guide to Graceful Shutdown in Go with Goroutines and Context](https://medium.com/@karthianandhanit/a-guide-to-graceful-shutdown-in-go-with-goroutines-and-context-1ebe3654cac8)

---

## 14. Rate Limiting（LLM API 呼叫）

### 決策
使用 **golang.org/x/time/rate** 標準庫 + 序列處理

### 理由
1. **批次分類已是序列執行**：spec 明確要求「批次分類（classify-all）序列執行，逐筆處理」，天然避免了並發過載
2. **可配置速率**：透過 LlmProvider 的 config JSON 欄位設定 rate limit 參數
3. **標準庫品質**：golang.org/x/time/rate 是 Go 官方擴展庫，token bucket 演算法，穩定可靠

### 實作策略

```go
import "golang.org/x/time/rate"

// LlmService 內建 rate limiter
type LlmService struct {
    providerSvc *LlmProviderService
    crypto      *crypto.AESCrypto
    limiter     *rate.Limiter  // 全域 rate limiter
}

func NewLlmService(providerSvc *LlmProviderService, aesCrypto *crypto.AESCrypto) *LlmService {
    return &LlmService{
        providerSvc: providerSvc,
        crypto:      aesCrypto,
        limiter:     rate.NewLimiter(rate.Every(time.Second), 5), // 每秒最多 5 個請求，可配置
    }
}

func (s *LlmService) callLLM(ctx context.Context, ...) (...) {
    // 等待 rate limiter 許可
    if err := s.limiter.Wait(ctx); err != nil {
        return nil, fmt.Errorf("rate limit wait cancelled: %w", err)
    }
    // 執行 LLM API 呼叫
    ...
}
```

### 關鍵設計決策
- **預設速率**：每秒 5 個請求（burst = 5），適合 LM Studio 本地推理的吞吐量
- **可配置**：未來可從 LlmProvider.Config 讀取自訂速率
- **與序列處理互補**：batch classify 序列執行 + rate limiter 雙重保護

### 參考資料
- [golang.org/x/time/rate 官方文件](https://pkg.go.dev/golang.org/x/time/rate)
- [Go Wiki: Rate Limiting](https://go.dev/wiki/RateLimiting)
- [How to Rate Limit HTTP Requests in Go](https://www.alexedwards.net/blog/how-to-rate-limit-http-requests)

---

## 15. Sprint 2 新增依賴

| 用途 | Package | 選擇理由 |
|------|---------|---------|
| OpenAI-compatible client | github.com/sashabaranov/go-openai | 社群最廣泛、支援自訂 BaseURL |
| Rate limiting | golang.org/x/time/rate | Go 官方擴展庫、token bucket |

Sprint 2 僅新增 2 個依賴，維持專案精簡。

---

## 16. Sprint 2 技術風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| LM Studio 不支援 response_format: json_object | LLM 回傳非 JSON 格式 | Prompt 中強調 JSON 格式 + Go 層 parse 失敗時 entry 保持原狀 |
| LLM 分類品質不穩定 | 分類結果不準確 | category 比對使用 case-insensitive、tags 合併而非取代 |
| LLM 同義詞展開 timeout | 搜尋延遲或失敗 | 10 秒 timeout + 自動降級為原始 query 搜尋 |
| 背景 goroutine 記憶體洩漏 | 服務不穩定 | context 取消 + WaitGroup + channel buffer 限制 |
| 批次分類大量 entries 時耗時過長 | 使用者等待 | 202 非同步回應 + 序列處理 + rate limiting |

---

# Sprint 3 技術選型補充調查

## 調查日期
2026-04-22

## 17. Git 操作方式：go-git vs exec git command

### 候選方案

| 方案 | GitHub Stars | 優點 | 缺點 | 適用場景 |
|------|-------------|------|------|---------|
| go-git v5 | 6k+ | 純 Go 實作、無需系統 git 二進位、跨平台、可直接存取 commit object | 不支援所有 git 功能（如 merge porcelain）、記憶體使用較高 | 讀取 repo 資訊、遍歷 commits |
| exec.Command("git", ...) | N/A | 完整 git 功能、效能好（原生 C 實作）、輸出格式熟悉 | 依賴系統安裝 git、需解析 CLI 輸出、跨平台差異、需防範 command injection | 完整 git 操作 |

### 決策
選擇 **go-git v5**（`github.com/go-git/go-git/v5`）

### 理由
1. **純 Go 無外部依賴**：aibo 透過 Docker 部署，使用 go-git 不需要在容器中安裝 git binary，減少映像體積
2. **API 直接存取 commit object**：可直接取得 commit hash、message、author、parent count 等結構化資料，不需解析 CLI 輸出
3. **F-008 需求完全匹配**：只需讀取 commit log（PlainOpen + Log + ForEach），go-git 的讀取功能成熟穩定
4. **安全性**：避免 exec.Command 的 command injection 風險，repo_path 來自使用者輸入
5. **測試友善**：可用 go-git 的 memory storage 建立測試用 repo，不需要檔案系統

### 使用方式

```go
import (
    git "github.com/go-git/go-git/v5"
    "github.com/go-git/go-git/v5/plumbing/object"
)

// 開啟本地 repo
repo, err := git.PlainOpen(repoPath)

// 取得 commit log
logIter, err := repo.Log(&git.LogOptions{
    From:  ref.Hash(),   // 從指定 branch HEAD 開始
    Order: git.LogOrderCommitterTime,
})

// 遍歷 commits，手動過濾 date/author
err = logIter.ForEach(func(c *object.Commit) error {
    // 過濾日期範圍
    if c.Committer.When.Before(since) || c.Committer.When.After(until) {
        return nil
    }
    // 過濾 author
    if author != "" && c.Author.Email != author && c.Author.Name != author {
        return nil
    }
    // 過濾 merge commit（多個 parent）
    if c.NumParents() > 1 {
        skipped = append(skipped, ...)
        return nil
    }
    // 處理 commit...
    return nil
})
```

### 注意事項
- go-git LogOptions 沒有內建 date/author filter，需在 ForEach 中手動過濾
- 使用 `git.LogOrderCommitterTime` 確保按時間排序
- 指定 branch 需先 resolve reference：`repo.Reference(plumbing.NewBranchReferenceName(branch), true)`

### 參考資料
- [go-git GitHub](https://github.com/go-git/go-git)
- [go-git v5 Package Documentation](https://pkg.go.dev/github.com/go-git/go-git/v5)
- [Git Book: Embedding Git - go-git](https://git-scm.com/book/en/v2/Appendix-B:-Embedding-Git-in-your-Applications-go-git)

---

## 18. Google Calendar API Go Client

### 決策
選擇 **google.golang.org/api/calendar/v3**（Google 官方 Go client）

### 理由
1. **Google 官方維護**：googleapis/google-api-go-client 是 Google 官方的 Go API client，穩定可靠
2. **功能完整**：Events.List 支援 timeMin/timeMax/calendarId 等所有 F-009 需要的過濾參數
3. **與 OAuth2 無縫整合**：搭配 golang.org/x/oauth2 使用，token 管理自動化
4. **型別安全**：Event struct 直接對應 Calendar API 的 JSON schema

### 使用方式

```go
import (
    "google.golang.org/api/calendar/v3"
    "google.golang.org/api/option"
)

// 使用 OAuth2 token 建立 Calendar service
srv, err := calendar.NewService(ctx, option.WithHTTPClient(oauthClient))

// 列出事件
events, err := srv.Events.List(calendarID).
    TimeMin(since.Format(time.RFC3339)).
    TimeMax(until.Format(time.RFC3339)).
    SingleEvents(true).         // 展開 recurring events
    OrderBy("startTime").
    MaxResults(500).
    Do()
```

### 參考資料
- [Google Calendar API Go Package](https://pkg.go.dev/google.golang.org/api/calendar/v3)
- [Google Calendar API Quickstart for Go](https://developers.google.com/workspace/calendar/api/quickstart/go)
- [googleapis/google-api-go-client GitHub](https://github.com/googleapis/google-api-go-client)

---

## 19. Google OAuth2 in Go

### 決策
使用 **golang.org/x/oauth2** + **golang.org/x/oauth2/google**（Go 官方 OAuth2 擴展庫）

### 理由
1. **Go 官方擴展庫**：golang.org/x/oauth2 是 Go 官方的 OAuth2 實作，持續維護
2. **Google endpoint 內建**：`google.Endpoint` 預設提供 Google OAuth2 的 auth/token URL
3. **Token 自動 refresh**：oauth2.Config.Client() 返回的 HTTP client 自動在 access_token 過期時使用 refresh_token 更新
4. **與 Calendar API 無縫整合**：產生的 oauth2.Token 直接用於建立 Calendar service

### OAuth2 Flow 設計

```
使用者                  aibo API                    Google
  |                       |                          |
  |-- POST /gcal/auth --> |                          |
  |                       |-- 產生 auth_url -------->|
  |<- { auth_url } -------|                          |
  |                                                  |
  |-- 瀏覽器開啟 auth_url ----->                     |
  |                              <-- 授權同意 ------->|
  |                              <-- redirect callback|
  |                       |                          |
  |    GET /gcal/callback?code=xxx&state=yyy         |
  |                       |-- exchange code --------->|
  |                       |<- access + refresh token -|
  |                       |-- 加密儲存 token          |
  |<- { connected } ------|                          |
```

### 實作要點

```go
import (
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/google"
)

oauthConfig := &oauth2.Config{
    ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
    ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
    RedirectURL:  "http://localhost:8080/api/v1/integrations/gcal/callback",
    Scopes:       []string{calendar.CalendarReadonlyScope},
    Endpoint:     google.Endpoint,
}

// 產生授權 URL（含 state 防 CSRF）
state := generateRandomState()
authURL := oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)

// Callback 中交換 token
token, err := oauthConfig.Exchange(ctx, code)
// token.AccessToken, token.RefreshToken, token.Expiry

// 使用 token 建立 HTTP client（自動 refresh）
client := oauthConfig.Client(ctx, token)
```

### 安全考量
1. **State 參數**：使用 crypto/rand 產生隨機 state，存入記憶體（或 DB），callback 時驗證防止 CSRF
2. **Token 加密儲存**：access_token 和 refresh_token 使用既有的 AES-256-GCM 加密後存入 DB
3. **Scope 最小化**：只請求 `calendar.CalendarReadonlyScope`（唯讀），不請求寫入權限
4. **AccessTypeOffline**：確保取得 refresh_token，支援長期使用

### 參考資料
- [golang.org/x/oauth2 Package](https://pkg.go.dev/golang.org/x/oauth2)
- [golang.org/x/oauth2/google Package](https://pkg.go.dev/golang.org/x/oauth2/google)
- [OAuth 2.0 Implementation in Golang](https://dev.to/siddheshk02/oauth-20-implementation-in-golang-3mj1)
- [Google OAuth2 Authentication in Golang](https://www.loginradius.com/blog/engineering/google-authentication-with-golang-and-goth/)

---

## 20. Sprint 3 新增依賴

| 用途 | Package | 選擇理由 |
|------|---------|---------|
| Git 操作 | github.com/go-git/go-git/v5 | 純 Go 實作、無需系統 git binary、API 直接存取 commit object |
| Google Calendar API | google.golang.org/api/calendar/v3 | Google 官方 Go client、型別安全 |
| Google OAuth2 | golang.org/x/oauth2 + golang.org/x/oauth2/google | Go 官方擴展庫、自動 token refresh |

Sprint 3 新增 3 個依賴（go-git、google-api-go-client、oauth2）。

---

## 21. Sprint 3 技術風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| go-git 開啟大型 repo 記憶體使用高 | 匯入大型 repo 時 OOM | 500 commits 上限 + 日期範圍過濾減少遍歷量 |
| Google OAuth callback URL 設定錯誤 | 授權流程失敗 | 從環境變數讀取 redirect URL、文件說明 Google Console 設定步驟 |
| Google API quota 限制 | Calendar 事件列表被拒 | 單次最多 500 events、使用 singleEvents=true 避免重複請求 |
| Refresh token 過期或被撤銷 | 匯入失敗 | GCAL_TOKEN_EXPIRED 錯誤碼引導使用者重新授權 |
| Docker 容器內無法存取宿主機 Git repo | F-008 功能受限 | 文件說明需掛載 volume、或使用 host network |
