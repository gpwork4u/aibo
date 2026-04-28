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

---

# Sprint 4 技術選型補充調查

## 調查日期
2026-04-22

## 22. MCP Server SDK（Golang）

### 候選方案

| 方案 | GitHub Stars | 版本 | 維護者 | 優點 | 缺點 |
|------|-------------|------|--------|------|------|
| mark3labs/mcp-go | 8.6k+ | v1.0.0 | 社群（mark3labs） | 社群最廣泛採用、API 簡潔直觀、支援 stdio/SSE/StreamableHTTP、文件完善 | 非官方維護 |
| modelcontextprotocol/go-sdk | 4.4k+ | v1.5.0 | 官方 + Google | 官方維護、嚴格 spec 合規、型別安全 | 較新、社群範例較少、Go 版本需求較高 |
| metoro-io/mcp-golang | 2k+ | 持續更新 | 社群（metoro-io） | 型別安全的 tool argument structs、自動 schema 生成 | 社群較小 |

### 決策
選擇 **mark3labs/mcp-go**

### 理由
1. **社群最廣泛採用**：8.6k stars，Go 生態中 MCP SDK 的事實標準，遇到問題容易找到解法
2. **API 簡潔**：`server.NewMCPServer()` + `mcp.NewTool()` + `server.ServeStdio()` 三步完成，boilerplate 極少
3. **Transport 完整**：同時支援 stdio（Claude Code/Cursor 本地使用）、SSE、StreamableHTTP，未來擴展性好
4. **與專案技術棧一致**：純 Go 實作，不引入 CGO 或外部依賴
5. **實戰驗證**：已有大量 production MCP server 使用此 SDK

### MCP Server 架構決策

**獨立 binary 模式**：MCP server 作為獨立的 CLI binary（`aibo-mcp`），透過 HTTP 呼叫既有 aibo API。

理由：
- 不需要修改現有 Gin server 架構
- MCP server 只是一個「客戶端包裝」
- 分離關注點：API server 管資料，MCP server 管協定轉換
- 部署靈活：MCP binary 裝在使用者本機，API server 可在本機或遠端

### 使用方式

```go
import (
    "github.com/mark3labs/mcp-go/mcp"
    "github.com/mark3labs/mcp-go/server"
)

// 建立 MCP server
s := server.NewMCPServer(
    "aibo",
    "1.0.0",
    server.WithToolCapabilities(false),
)

// 註冊 tool
queryTool := mcp.NewTool("aibo_query",
    mcp.WithDescription("搜尋使用者的個人知識庫"),
    mcp.WithString("query", mcp.Required(), mcp.Description("搜尋查詢")),
    mcp.WithString("category", mcp.Description("限定分類")),
    mcp.WithNumber("limit", mcp.Description("回傳數量上限")),
)
s.AddTool(queryTool, queryHandler)

// stdio transport
server.ServeStdio(s)
```

### 參考資料
- [mark3labs/mcp-go GitHub](https://github.com/mark3labs/mcp-go)
- [MCP-Go Getting Started](https://mcp-go.dev/getting-started/)
- [modelcontextprotocol/go-sdk GitHub](https://github.com/modelcontextprotocol/go-sdk)
- [Build MCP Servers in Go - Complete Guide](https://mcpcat.io/guides/building-mcp-server-go/)

---

## 23. MCP Transport 選型

### 候選方案

| Transport | 適用場景 | Claude Code 支援 | Cursor 支援 | 部署要求 |
|-----------|---------|-----------------|------------|---------|
| stdio | 本地 CLI 工具 | 原生支援 | 原生支援 | binary 在本機 |
| SSE | Web 應用 | 需配置 | 需配置 | HTTP server |
| StreamableHTTP | 遠端服務 | 需配置 | 需配置 | HTTP server |

### 決策
選擇 **stdio** 作為主要 transport

### 理由
1. **Claude Code / Cursor 原生支援**：在 MCP 設定中指定 command 即可，零配置
2. **最簡部署**：只需一個 binary，不需要額外啟動 HTTP server
3. **安全性**：不開放網路端口，MCP server 跟 client 同機執行
4. **aibo 使用場景**：個人工具，本地執行為主，stdio 完全匹配

---

## 24. 知識結構 Migration 策略

### 需求
為 entries table 新增 summary/detail/action 三個 TEXT 欄位，不影響現有資料。

### 策略
使用 `ALTER TABLE ADD COLUMN ... NULL` -- PostgreSQL 中 ADD COLUMN with NULL default 是 O(1) 操作，不需要 rewrite table。

### 關鍵考量

| 考量 | 分析 | 決策 |
|------|------|------|
| 資料遷移 | 現有 entries 的 summary/detail/action 為 NULL | 不做資料回填，新建/重新分類時自動填入 |
| 索引更新 | 全文搜尋索引需包含 summary | DROP + CREATE INDEX（migration 中執行） |
| 向下相容 | 舊版 client 不認識新欄位 | JSON 回應新增欄位，舊 client 自動忽略 |
| LLM prompt | 分類 prompt 需同時產生 summary/detail/action | prompt 更新，但 parse 失敗時 fallback 為舊格式 |

### 注意事項
- PostgreSQL ALTER TABLE ADD COLUMN NULL 不會鎖表，對 production 安全
- DROP INDEX + CREATE INDEX 會短暫影響搜尋效能，但個人知識庫規模下可忽略
- 建議在低流量時段執行 migration

### 參考資料
- [PostgreSQL ALTER TABLE Performance](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Safe database migrations at scale](https://medium.com/paypal-tech/postgresql-at-scale-database-schema-changes-without-downtime-20d3749ed680)

---

## 25. 信心度搜尋排序策略

### 需求
搜尋排序需結合 ts_rank（文字相關度）和 confidence（信心度）。

### 候選公式

| 公式 | 優點 | 缺點 |
|------|------|------|
| ts_rank * confidence | 簡單直觀，信心度直接影響排序 | 新 entry（0.5）天然劣勢 |
| ts_rank * (0.5 + 0.5 * confidence) | 信心度影響較溫和（0.5-1.0 倍） | 稍複雜 |
| ts_rank + 0.2 * confidence | 加性模型，信心度是 bonus | 兩個量綱不同 |

### 決策
選擇 **ts_rank * confidence**

### 理由
1. **簡單直觀**：乘法模型意義明確 -- 信心度為 0 的條目永遠不會出現在搜尋結果最前面
2. **新 entry 不會太差**：預設 confidence = 0.5，只會把 rank 減半，不會完全消失
3. **符合直覺**：被多次 confirm 的知識排名自然上升，被 flag 的知識排名下降

---

## 26. Sprint 4 新增依賴

| 用途 | Package | 選擇理由 |
|------|---------|---------|
| MCP Server SDK | github.com/mark3labs/mcp-go | 社群最廣泛、API 簡潔、支援 stdio transport |

Sprint 4 僅新增 1 個依賴（mcp-go），用於 MCP server binary。主 API server 不新增依賴。

---

## 27. Sprint 4 技術風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| mcp-go API 不穩定（v1.0.0） | MCP server 需跟隨更新 | 封裝 tool handler，隔離 SDK 細節 |
| LLM 分類 prompt 變長導致回應品質下降 | summary/detail/action 品質不佳 | 先用現有 LLM provider 測試，品質不足時調整 prompt |
| stdio MCP server 偵錯困難 | 開發期除錯不便 | 增加 slog 日誌到 stderr、使用 mcp-go 的 InProcess transport 做 unit test |
| 搜尋排序 ts_rank * confidence 可能讓新 entry 排名過低 | 使用者找不到新加入的知識 | confidence 預設 0.5 而非 0，確保新 entry 有基本曝光 |
| ALTER TABLE 索引重建影響搜尋 | migration 期間搜尋變慢 | 個人知識庫規模小，影響可忽略；若有疑慮可用 CONCURRENTLY |

---

# Sprint 5 技術選型補充調查

## 調查日期
2026-04-22

## 28. PostgreSQL 中文分詞方案

### 候選方案

| 方案 | GitHub Stars | 分詞方式 | 外部依賴 | Docker 安裝難度 | 中文效果 | 維護狀態 |
|------|-------------|---------|---------|----------------|---------|---------|
| zhparser | 2.8k+ | SCWS 詞典分詞 | 需安裝 SCWS 詞典庫 | 高（需編譯 SCWS + zhparser） | 最佳（詞級分詞，如「資料庫」整詞識別） | 活躍，多個 fork 維護 |
| pg_cjk_parser | 200+ | 2-gram（CJK 字元） | 無（純 C 擴展） | 中（需從原始碼編譯） | 好（2-gram 覆蓋所有組合） | 較少更新，但穩定 |
| pg_bigm | 400+ | 2-gram（所有字元） | 無（純 C 擴展） | 低（支援 apt install） | 好（2-gram 對中文效果等同 pg_cjk_parser） | 活躍，正式版本釋出 |
| PGroonga | 3k+ | Groonga 全語言分詞 | 需安裝 Groonga 引擎 | 高（依賴鏈長） | 最佳（專業分詞引擎） | 活躍 |

### 方案分析

#### zhparser（SCWS 詞典分詞）
- **優點**：詞級分詞，精確度最高（能正確拆分「資料庫效能調優」為「資料庫/效能/調優」）
- **缺點**：
  - 需額外安裝 SCWS 詞典庫（約 30MB）
  - Docker 映像需自行編譯 SCWS + zhparser
  - 詞典可能需要更新（新詞覆蓋不足）
  - 只支援中文，不支援日韓文
- **Docker 方案**：社群有 `abcfy2/zhparser` 預建映像，但可能版本滯後

#### pg_cjk_parser（CJK 2-gram）
- **優點**：
  - 基於 PostgreSQL 內建 parser 修改，穩定性高
  - 支援 CJK（中日韓）三種語言
  - 無外部依賴
- **缺點**：
  - 需從原始碼編譯（需 postgresql-server-dev）
  - GitHub 活躍度較低
  - 2-gram 會產生較多噪音（如「資料」+「料庫」+「庫效」）

#### pg_bigm（bi-gram）
- **優點**：
  - 2-gram 索引，天然支援所有語言的子字串搜尋
  - 安裝最簡單（Debian/Ubuntu 可 `apt install postgresql-16-pg-bigm`）
  - 不需要特殊的 TEXT SEARCH CONFIGURATION，直接用 LIKE + GIN 索引
  - 與現有搜尋架構整合最容易（只替換 pg_trgm 的模糊搜尋部分）
- **缺點**：
  - 索引體積比 zhparser 大（所有 2-gram 組合）
  - 不是「詞級」分詞，精確度略低於 zhparser
  - 搜尋短字串（1-2 字）時可能有較多噪音

#### PGroonga
- **優點**：最全面的全語言搜尋支援
- **缺點**：依賴 Groonga 引擎，映像體積大，過度設計

### 決策
選擇 **pg_bigm**

### 理由
1. **安裝最簡單**：aibo 使用 Docker 部署，pg_bigm 可直接 apt install 或從原始碼快速編譯，不需要額外的詞典庫
2. **與現有架構互補**：simple tsvector 處理英文精確搜尋 + pg_bigm 處理中文/模糊搜尋，替換現有的 pg_trgm
3. **無維護成本**：不需要更新詞典（vs zhparser 的 SCWS 詞典），2-gram 是純演算法方案
4. **個人知識庫規模**：索引體積略大的缺點在小規模資料下可忽略
5. **保留升級路徑**：如果 pg_bigm 的精確度不足，未來可升級為 zhparser（替換索引即可，搜尋 SQL 結構不變）

### pg_bigm vs pg_trgm 關鍵差異

| 特性 | pg_trgm (3-gram) | pg_bigm (2-gram) |
|------|-------------------|-------------------|
| N-gram 大小 | 3 | 2 |
| 中文支援 | 差（3-byte trigram 跨字問題） | 好（2-gram 對中文字元自然對齊） |
| 索引體積 | 較小 | 較大 |
| 搜尋精確度 | 英文較好 | 中文較好 |
| 安裝方式 | PostgreSQL 內建 | 需額外安裝 |
| 運算子 | `%%` similarity | LIKE + GIN 索引加速 |

### 參考資料
- [pg_bigm GitHub](https://github.com/pgbigm/pg_bigm)
- [pg_bigm 文件](https://pgbigm.github.io/pg_bigm/pg_bigm_en.html)
- [PGroonga vs pg_bigm 比較](https://pgroonga.github.io/reference/pgroonga-versus-pg-bigm.html)
- [zhparser GitHub](https://github.com/amutu/zhparser)
- [pg_cjk_parser GitHub](https://github.com/huangjimmy/pg_cjk_parser)
- [abcfy2/zhparser Docker image](https://hub.docker.com/r/abcfy2/zhparser)

---

## 29. Tags 分層 — DB Schema 設計

### 候選方案

| 方案 | 優點 | 缺點 | 查詢效能 | 彈性 |
|------|------|------|---------|------|
| A: JSONB 單欄位 | 最靈活、一欄解決所有 | 統計困難、索引效率較低 | 中 | 高 |
| B: 獨立欄位（domains TEXT[] + context JSONB） | 結構清晰、常查欄位有專用索引 | 需 migration 加欄位 | 高 | 中高 |
| C: 關聯表（entry_tags + tag_types） | 正規化、統計方便、適合大規模 | JOIN 多、查詢複雜 | 中低 | 高 |

### 方案分析

#### 方案 A：全 JSONB

```sql
ALTER TABLE entries ADD COLUMN tag_data JSONB;
-- {"domains": ["golang"], "context": {"languages": ["go"], "frameworks": ["gin"]}, "tags": ["middleware"]}
```

- 最靈活但查詢效率差
- PostgreSQL JSONB 不保留欄位統計資訊，查詢規劃可能不佳

#### 方案 B：混合模式（推薦）

```sql
ALTER TABLE entries ADD COLUMN domains TEXT[] DEFAULT '{}';
ALTER TABLE entries ADD COLUMN context JSONB NULL;
-- 保留原有 tags TEXT[]
```

- `domains` 是常用過濾欄位，使用 TEXT[] + GIN 索引，查詢效率高
- `context` 是彈性欄位，使用 JSONB + jsonb_path_ops 索引，支援 `@>` 包含查詢
- `tags` 保留向下相容

#### 方案 C：完全正規化

```sql
CREATE TABLE tag_types (id UUID, name VARCHAR, ...);
CREATE TABLE entry_tags (entry_id UUID, tag_type_id UUID, value VARCHAR, ...);
```

- 適合大規模多租戶系統
- 對個人知識庫而言過度設計，JOIN 增加查詢複雜度

### 決策
選擇 **方案 B：混合模式（domains TEXT[] + context JSONB）**

### 理由
1. **查詢效能**：`domains` 作為獨立的 TEXT[] 欄位，GIN 索引對 `@>` 運算子的查詢效能最佳，比 JSONB 內嵌陣列快 2-3 倍
2. **彈性**：`context` JSONB 允許自由定義維度（languages、frameworks、pattern 等），不需要為每個新維度加欄位
3. **向下相容**：保留 `tags` 欄位，既有 API 和 MCP tools 不受影響
4. **簡單 migration**：只需 ADD COLUMN，O(1) 操作
5. **適合規模**：個人知識庫不需要完全正規化，混合模式在簡單和靈活之間取得平衡

### JSONB 索引策略

使用 `jsonb_path_ops` 而非預設的 `jsonb_ops`：
- `jsonb_path_ops` 只支援 `@>` 運算子，但索引體積小 2-3 倍，查詢快 2 倍
- aibo 的 context 查詢都是包含查詢（如 `context @> '{"languages": ["go"]}'`），完全匹配 `jsonb_path_ops`

### 參考資料
- [PostgreSQL JSONB Performance Best Practices](https://www.elysiate.com/blog/postgresql-jsonb-performance-best-practices)
- [When To Avoid JSONB In A PostgreSQL Schema](https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema)
- [PostgreSQL JSONB - Powerful Storage for Semi-Structured Data](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage)
- [PostgreSQL as a JSON database: Advanced patterns](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/)

---

## 30. Sprint 5 新增依賴

| 用途 | Package | 選擇理由 |
|------|---------|---------|
| 中文分詞 | pg_bigm (PostgreSQL extension) | 2-gram 索引、安裝簡單、無詞典依賴 |

Sprint 5 不新增 Go 程式碼依賴，只新增 PostgreSQL 擴展。Docker image 需自訂以包含 pg_bigm。

---

## 31. Sprint 5 技術風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| pg_bigm 在 Alpine Linux 上編譯失敗 | Docker image 無法建置 | 改用 postgres:16-bookworm + apt install；或提供預編譯 .so |
| pg_bigm 索引體積過大 | 磁碟佔用增加 | 個人知識庫規模小（< 10000 entries），2-gram 索引體積可控 |
| pg_bigm LIKE 查詢效能低於 pg_trgm %% | 搜尋變慢 | pg_bigm GIN 索引加速 LIKE，效能應相當；如不足可考慮 zhparser |
| domains + context 欄位增加 LLM prompt 複雜度 | 分類品質下降 | 分離 prompt：先分類 category/tags，再提取 domains/context |
| supersede 循環引用檢測效能 | 長鏈造成遞迴查詢慢 | 限制鏈長最多 10 層，WITH RECURSIVE + LIMIT |
| 現有 entries 的 domains/context 為空 | 搜尋按 domain 過濾找不到舊資料 | 提供批次 re-classify API 更新舊 entries 的 domains/context |

---

# Sprint 6 技術選型補充調查

## 調查日期
2026-04-22

## 32. LLM Client 連線池策略

### 候選方案

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|---------|
| A: 每次建立新 client | 簡單、無狀態 | 連線浪費、延遲高 | 低頻呼叫 |
| B: sync.Map 快取 | 原生 concurrent map、無需手動鎖 | 無法控制 eviction、型別不安全 | 簡單快取 |
| C: sync.RWMutex + map | 完全控制、可做 invalidation | 需手動管理鎖 | 需要 invalidation 的快取 |
| D: groupcache / ristretto | 功能豐富、TTL/LRU | 額外依賴、過度設計 | 大規模快取 |

### 決策
選擇 **方案 C：sync.RWMutex + map[uuid.UUID]*cachedClient**

### 理由
1. **Provider 數量少**（通常 1-5 個），不需要 LRU 或 TTL 機制
2. **需要主動 invalidation**：provider 設定更新時必須清除快取，sync.Map 不便操作
3. **不引入額外依賴**：Go 標準庫 sync.RWMutex 足夠
4. **configHash 偵測變更**：用 sha256(endpointURL + apiKey) 做快取 key 的一部分，自動偵測設定變更

### go-openai Client 連線復用分析
go-openai 內部使用 `net/http.Client`，而 Go 的 `http.DefaultTransport` 預設啟用 HTTP/1.1 keep-alive 連線池（MaxIdleConns=100, MaxIdleConnsPerHost=2）。因此重用 `openai.Client` 即可自動重用底層 TCP 連線。

---

## 33. Go Service Interface 設計慣例

### Go Interface 最佳實踐

| 原則 | 說明 | 本專案應用 |
|------|------|-----------|
| Consumer defines interface | Interface 定義在使用方（service），不是提供方（repository） | interface 放在 service package |
| Keep interfaces small | 每個 interface 只包含 consumer 需要的方法 | 不做一個大的 Repository interface |
| Accept interfaces, return structs | 構造函式接收 interface，回傳 concrete struct | NewClassifierService(repo EntryRepository) |
| Implicit satisfaction | Go 不需要 `implements` 關鍵字 | repository struct 不需修改 |

### Mock 策略

| 方案 | 優點 | 缺點 |
|------|------|------|
| 手動 struct mock | 簡單直觀、不引入工具 | 方法多時 boilerplate 多 |
| gomock/mockgen | 自動生成 mock | 額外依賴、generated code |
| testify/mock | assertion 整合好 | 需要學習 mock API |

### 決策
Sprint 6 使用**手動 struct mock**。理由：
1. Repository interface 方法數量適中（5-10 個），手動 mock 可接受
2. 不引入 mockgen 等工具鏈
3. 未來如方法增多，再考慮引入 mockgen

---

## 34. PII 偵測方案

### 候選方案

| 方案 | 優點 | 缺點 | 延遲影響 |
|------|------|------|---------|
| A: Regex pattern matching | 快速、無外部依賴、確定性 | 只能偵測已知 pattern | < 1ms |
| B: LLM 語意偵測 | 能偵測語意層級的敏感資訊 | 額外 LLM 呼叫、延遲高 | 1-5 秒 |
| C: 專用 NER model (spaCy/presidio) | 精確度高 | 需額外服務、Go 整合困難 | 100-500ms |
| D: Regex + LLM 二層 | 兼顧速度和深度 | 實作複雜 | 視層級 |

### 決策
Sprint 6 選擇 **方案 A：Regex pattern matching**

### 理由
1. **零延遲影響**：regex 檢測 < 1ms，不影響分類流程
2. **確定性**：pattern 命中即報告，無 false positive 的模型偏差
3. **不增加 LLM 成本**：不需要額外的 LLM API 呼叫
4. **可擴展**：未來可在 regex 層之上疊加 LLM 語意偵測（方案 D）
5. **個人知識庫場景**：最常見的 PII 洩漏是不小心貼入包含 email/API key 的內容，regex 足夠偵測

---

## 35. Sprint 6 不新增依賴

Sprint 6 所有改動使用現有依賴即可，不新增任何 Go module dependency。

---

## 36. Sprint 6 技術風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| F-018 interface 化影響範圍大 | 編譯錯誤多、影響所有 service | 逐個 service 修改，每改完一個確認編譯通過 |
| Client 快取 race condition | goroutine 安全問題 | sync.RWMutex 保護、unit test 驗證並發場景 |
| PII regex false positive | 正常內容被誤標 | 只標記不阻擋，使用者可忽略 warning |
| OAuth state DB migration | GCal OAuth 短暫中斷 | migration 是 ADD TABLE，不影響現有表 |
| repo_path 白名單限制太嚴 | 使用者無法匯入 repo | 未設定 ALLOWED_REPO_PATHS 時保持開放（向下相容） |

# Sprint 7 技術選型補充調查

## 調查日期
2026-04-23

## 37. 前端資料獲取：TanStack Query vs SWR

### 候選方案

| 方案 | Weekly DL | Bundle (gzip) | 優點 | 缺點 |
|------|-----------|---------------|------|------|
| TanStack Query v5 | 12.3M | 13.4KB | useMutation 完整、DevTools、細緻快取控制（staleTime/gcTime/refetchInterval）、optimistic updates 內建 | bundle 較大、App Router 需 HydrationBoundary |
| SWR v2 | 7.7M | 4.2KB | 輕量、與 Next.js 同 Vercel 生態整合緊密 | useSWRMutation 功能簡單、無 DevTools |

### 決策
選擇 **TanStack Query v5**（`@tanstack/react-query`）

### 理由
1. **管理介面多 mutation 場景**：API Keys / Entries / Categories / LLM Providers 都需要 CRUD，useMutation 的 optimistic updates、rollback、cache invalidation 直接解決樂觀 UI 需求
2. **DevTools 提升開發效率**：aibo 有 40+ API endpoints，DevTools 大幅簡化除錯
3. **細緻快取**：Inbox 需要即時更新（短 staleTime），Categories 變動少（長 staleTime），TanStack Query 可分 query key 配置
4. **bundle 差距可接受**：管理介面非公開 SPA，13KB 不是瓶頸
5. **社群成長**：2024 後已超越 SWR，生態更活躍

### 使用方式

```tsx
// QueryClient Provider
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

// Query
const { data, isLoading } = useQuery({
  queryKey: ["entries", { categoryId, sort }],
  queryFn: () => api.entries.list({ categoryId, sort }),
})

// Mutation with optimistic update
const mutation = useMutation({
  mutationFn: (id: string) => api.entries.delete(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entries"] }),
})
```

### 參考資料
- [TanStack Query vs SWR vs Apollo 2026](https://www.pkgpulse.com/blog/tanstack-query-vs-swr-vs-apollo-2026)
- [SWR vs TanStack Query 2026](https://dev.to/jake_kim_bd3065a6816799db/swr-vs-tanstack-query-2026-which-react-data-fetching-library-should-you-choose-342c)

---

## 38. 表單：React Hook Form + Zod

### 決策
選擇 **react-hook-form v7 + zod v3**，搭配 shadcn/ui `<Form>` 元件

### 理由
1. **shadcn/ui 官方推薦組合**：`<Form>` 元件本身就是 react-hook-form 的 FormProvider 包裝，無縫整合
2. **Zod schema 一次定義**：validation + TypeScript 型別共用，與後端 API DTO 對應清楚
3. **效能**：uncontrolled components 不會每次 keystroke re-render，適合 Entry 編輯等長表單
4. **CMS 慣例**：2026 年 Next.js 管理介面的事實標準組合

### 表單 Pattern

```tsx
const formSchema = z.object({
  name: z.string().min(1, "名稱為必填").max(50),
  description: z.string().max(200).optional(),
})

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { name: "", description: "" },
})

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="name" render={({ field }) => (
      <FormItem>
        <FormLabel>名稱 *</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </form>
</Form>
```

### 參考資料
- [React Hook Form - shadcn/ui](https://ui.shadcn.com/docs/forms/react-hook-form)
- [Master Form Handling with RHF + Zod + Shadcn UI](https://shadcnstudio.com/blog/react-hook-form-zod-shadcn-ui)

---

## 39. Markdown Renderer

### 候選方案

| 方案 | Stars | 優點 | 缺點 |
|------|-------|------|------|
| react-markdown | 13k+ | AST-based、安全（不使用 dangerouslySetInnerHTML）、remark/rehype plugin 生態 | 需自行配置 plugin |
| marked + DOMPurify | 34k+ | 超快 | 需手動 sanitize、plugin 生態較弱 |
| MDX | N/A | 支援 JSX | 過度複雜，runtime MDX 有風險 |

### 決策
選擇 **react-markdown** + **remark-gfm** + **rehype-highlight**

### 理由
1. **aibo entry content 是純 markdown**，不需要 JSX 混寫（MDX 太重）
2. **remark-gfm**：支援 GitHub Flavored Markdown（表格、任務清單、自動連結）
3. **rehype-highlight**：syntax highlighting（技術筆記常有 code block）
4. **安全**：react-markdown 預設不允許 raw HTML，避免 XSS
5. **Typography 整合**：搭配 `@tailwindcss/typography` 的 `prose` class 直接美化

### 參考資料
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown)
- [remark-gfm](https://github.com/remarkjs/remark-gfm)

---

## 40. 前端專案結構（Next.js App Router）

### 決策
前端 code 放在 `dev/frontend/`（與後端 `dev/src/` 同層，分離目錄）

### 目錄結構

```
dev/frontend/
├── app/
│   ├── layout.tsx              # Root layout + QueryClientProvider + Toaster
│   ├── page.tsx                # redirect /inbox
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + Header layout
│   │   ├── inbox/page.tsx
│   │   ├── entries/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── search/page.tsx
│   │   └── settings/
│   │       ├── api-keys/page.tsx
│   │       └── llm-providers/page.tsx
│   └── bootstrap/page.tsx      # 首次設定（無 API key 時）
├── components/
│   ├── ui/                     # shadcn/ui 元件
│   ├── app-sidebar.tsx
│   ├── page-header.tsx
│   ├── data-table.tsx
│   ├── tag-input.tsx
│   ├── markdown-viewer.tsx
│   └── forms/                  # 各種表單元件
├── lib/
│   ├── api/                    # API client（fetch 包裝）
│   │   ├── client.ts           # 注入 X-API-Key header
│   │   ├── entries.ts
│   │   ├── categories.ts
│   │   ├── api-keys.ts
│   │   ├── llm-providers.ts
│   │   └── search.ts
│   ├── hooks/                  # TanStack Query hooks
│   ├── schemas/                # Zod schemas
│   └── utils.ts
├── public/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── Dockerfile
```

### API Key 儲存策略
- 使用 `localStorage` 儲存（管理介面，同源使用）
- 首次進入頁面偵測：無 key → redirect /bootstrap → bootstrap 流程建立
- API client 自動注入 `X-API-Key` header

---

## 41. Sprint 7 新增依賴

| 用途 | Package | 選擇理由 |
|------|---------|---------|
| Framework | next@14 | App Router + RSC |
| UI Kit | shadcn/ui + tailwindcss@4 + radix-ui | 已決策（#6） |
| Data Fetching | @tanstack/react-query@5 | mutation 完整、DevTools |
| Form | react-hook-form@7 + zod@3 + @hookform/resolvers | shadcn/ui 官方組合 |
| Markdown | react-markdown + remark-gfm + rehype-highlight | 安全 + GFM + 語法高亮 |
| Icons | lucide-react | shadcn/ui 預設 |
| Date | date-fns | 輕量、tree-shakable |
| Toast | sonner | shadcn/ui 預設 |

---

## 42. Sprint 7 技術風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| API Key 存在 localStorage 有 XSS 風險 | Key 洩漏 | 管理介面本就需要認證、CSP header + react-markdown 不啟用 raw HTML |
| Tailwind v4 與 shadcn/ui 相容性 | 樣式錯亂 | 使用 shadcn/ui 官方 CLI 生成元件，確認 v4 相容 |
| Next.js 14 App Router 與 TanStack Query hydration | SSR 錯誤 | 使用 HydrationBoundary、查詢以 "use client" 組件觸發 |
| 後端 CORS 設定缺失 | 前端無法呼叫 API | Gin 加 CORS middleware，允許 localhost:3000 |
| Docker multi-service 啟動順序 | frontend 先於 api 啟動失敗 | docker-compose depends_on + Next.js client-side fetch 重試 |

---

## Sprint 8：行事曆基礎

### 調查日期
2026-04-24

### 需求摘要
- 月 / 週 / 日三種檢視（F-027）
- 後端彙整 API：entries + gcal events read-through（F-026）
- 點擊日格 → 右側 Sheet（shadcn）
- 行事曆元件需能與 Tailwind 3 + shadcn/ui 搭配、不拖累 bundle、支援 a11y

### 1. React 行事曆元件選型

| 方案 | 版本 | Bundle (gzip) | shadcn/Tailwind 契合度 | a11y | 客製自由度 | 備註 |
|------|------|-------------|------------------------|------|-----------|------|
| `@fullcalendar/react` | 6.x | core ~14KB + 每個插件 10-40KB（dayGrid + timeGrid + interaction 合計約 60-80KB gzip） | 低：自帶 CSS、class naming 難覆蓋 | 佳 | 中，需寫 CSS override | 功能最豐富但「重」，且要額外買 premium 拿 resource timeline |
| `react-big-calendar` | 1.x | ~45KB gzip（含 moment/date-fns localizer） | 中：SCSS 可覆蓋，但要手動套 Tailwind | 中 | 高（React-native） | 需帶 localizer（date-fns localizer 較省），樣式要花功夫 |
| `@schedule-x/react` | 2.x | ~30KB gzip（plugins 另計） | 中：有自己的 theme tokens | 宣稱支援 | 中 | 社群較新、生態小 |
| **自幹 grid + date-fns** | — | ~5-8KB（僅 date-fns tree-shaken + 自寫元件） | **最高** | 自控（必須自己實作 gridcell/aria） | 最高 | 月視圖即 6×7 grid，相對單純；週/日視圖需時間軸渲染 |

**決策：採「自幹 + date-fns」** 作為 F-027 實作主線。
**理由**：
1. 視覺需求聚焦「顯示數量 badge + 最多 2 個 event title + 日記 icon」，並非拖拽排程——不需要 FullCalendar / react-big-calendar 的 drag-drop / resize 重型能力。
2. 現有 UI 以 shadcn/ui + Tailwind 3 為主，自幹 grid 能一次對齊 design tokens，不用 shadow DOM / CSS 覆寫戰。
3. Bundle size 比引入任一 lib 都小一個數量級，符合個人工具「啟動快」的定位。
4. a11y（`role="gridcell"` + `aria-label`）與鍵盤快捷鍵（左右方向鍵、M/W/D 切換 view）在 spec 已明列，自幹可精確控制。
5. 未來若需要進階排程（Sprint 10 專案 Gantt），屆時再評估 FullCalendar premium 不遲。

**風險與緩解**：
- 風險：週/日視圖時間軸（06:00-24:00）計算與跨日 event 切片較繁瑣。
- 緩解：先把 `getWeekEvents(day)` / `eventsCoveringDay(events, day)` 寫成純函式並單測，視圖層純渲染。

### 2. 日期處理 library

| 候選 | Bundle | 既有專案狀態 |
|------|--------|-------------|
| `date-fns` | tree-shakable（單一 function < 1KB） | **Sprint 7 已列入** tech-survey §41（待引入） |
| `dayjs` | 2KB 但需手動 load plugin 處理 IANA timezone | — |
| `luxon` | 23KB，timezone 支援最完整 | — |

**決策：引入 `date-fns` + `date-fns-tz`**。
- `date-fns` 處理 week start / month grid / format。
- `date-fns-tz` 處理使用者 `X-Timezone`（如 `Asia/Taipei`）時的日期邊界（F-026 Scenario: 不同時區下的日期歸屬）。
- 既有 frontend package.json 尚未安裝，F-027 PR 需新增依賴。

### 3. Google Calendar 讀取策略

| 項目 | 策略 |
|------|------|
| API | `calendar.v3.Events.List`（既有 `dev/src/service/gcal.go:230` 已使用） |
| 參數 | `TimeMin=since`、`TimeMax=until`（RFC3339 + TZ offset）、`SingleEvents=true`（展開 recurring）、`OrderBy=startTime`、`MaxResults=250` |
| Pagination | 單次 `until-since` 最多 92 天（spec 限制），250 結果通常足夠；若 `NextPageToken` 非空則迴圈抓取到空 |
| Timeout | Context 帶 8s timeout；超時視為 upstream 錯誤 |
| Degraded | 上游非 200 或 timeout → 回應 `X-Degraded: gcal`、`events: []`，HTTP 仍為 200（非 `include_gcal` 必需時） |
| Cache | Server 端 5 分鐘 in-memory（key = `email + calendarId + since + until`）用 sync.Map + TTL；降低重複 API quota |
| Token refresh | 沿用既有 `TokenSource` 自動 refresh + `gcalRepo.UpdateTokens`（見 `service/gcal.go:203`） |
| Rate limit | Google Calendar quota：1M queries/day per project、600 queries/min per user；單使用者工具遠低於此，不實作 backoff（upstream error 直接 degraded） |

**實作重點**：
- 新增 `service.GcalService.ListEvents(ctx, calendarID, since, until) ([]*calendar.Event, error)`，將 `ImportEvents` 中的 list 邏輯抽出共用。
- `CalendarService.Aggregate(ctx, req)` 組合 `entryRepo.ListByDateRange` + `gcalSvc.ListEvents`，在同一層組出 `days[]` 結構。

### 4. Backend API 端點與 query 設計

沿用 spec（f026-calendar-view.md）；補充慣例：
- 所有端點放在 `v1.Group("/calendar")`，middleware 同既有 `/api/v1/*` 走 API Key auth。
- `X-Timezone` header 解析失敗 → 回 400 `INVALID_INPUT`。
- 新增 DTO：`dto/calendar.go` 放 `CalendarResponse` / `CalendarDay` / `CalendarEntry` / `CalendarEvent`。
- Repo：`EntryRepository.ListByDateRange(ctx, sinceDate, untilDate, tz string) ([]CalendarEntry, error)`，於 SQL 使用 `created_at AT TIME ZONE $3` 算當地日，join migration 012 的 `idx_entries_created_at_date`（對 UTC 日適用；若帶 tz，用 `((created_at AT TIME ZONE 'UTC') AT TIME ZONE $tz)::date` 需要 full scan + date bucketing，暫以 between `created_at >= since_utc AND created_at < until_utc+1d` 粗篩後 in-memory 分桶）。
- Migration 012：見 spec `Data Model` 段。

### 5. Frontend 新增依賴

| Package | 版本 | 用途 |
|---------|------|------|
| `date-fns` | ^3 | 日期計算 |
| `date-fns-tz` | ^3 | IANA timezone |
| `@radix-ui/react-tabs` | ^1.1 | toolbar 月/週/日 Tabs（尚未安裝但與既有 radix 生態一致） |
| **Sheet 元件** | — | shadcn/ui `Sheet`（基於 `@radix-ui/react-dialog`，已安裝）—走 shadcn CLI 新增 `sheet.tsx` |

### 6. 風險與緩解（Sprint 8）

| 風險 | 影響 | 緩解 |
|------|------|------|
| 自幹 grid 在 week/day 視圖時間軸計算 bug | 顯示錯位 | 核心 util function 全量單測；視圖層純渲染 |
| timezone 分桶錯誤（UTC vs Asia/Taipei） | entry 歸錯日 | 後端以 `X-Timezone` 決定；單測覆蓋跨日 case（F-026 edge scenario） |
| Gcal 上游不穩導致整個頁面失敗 | UX 壞 | degraded response 固定回 200 + `X-Degraded`，前端 toast 提示 |
| 首次進 `/calendar` 使用者未連 gcal → 424 洪水 | 體驗差 | 前端先讀 `/api/v1/integrations/gcal/status`（F-030 會補，此 sprint 用 localStorage cache `gcal_connected` bool；無時請求帶 `include_gcal=false`） |
| Migration 012 `uq_entries_gcal_ref` 若既有資料有重複 gcal entry 衝突 | migration 失敗 | migration 前先跑 cleanup query（同 up.sql），deduplicate 保留最早一筆 |

### 7. 參考資料
- [schedule-x GitHub — modern alternative to fullcalendar](https://github.com/schedule-x/schedule-x)
- [FullCalendar React docs](https://fullcalendar.io/docs/react)
- [react-big-calendar npm](https://www.npmjs.com/package/react-big-calendar)
- [npm-compare: react-big-calendar vs fullcalendar](https://npm-compare.com/@fullcalendar/react,react-big-calendar,react-calendar,react-datepicker)
- [Google Calendar Events: list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Avoid Calendar API limits](https://support.google.com/a/answer/2905486)
- [date-fns-tz](https://github.com/marnusw/date-fns-tz)

---

## Sprint 14 技術調查（2026-04-28）

### 調查主題：TanStack Table v8、TanStack Virtual v3、URL State Sync

---

### 1. TanStack Table v8

#### 核心架構
TanStack Table v8 為 headless 表格引擎，不包含任何 markup 或樣式，完全由消費方控制渲染。版本 v8 相較 v7（react-table）為完整重寫，API 以 `createColumnHelper` 為核心，以 row model pipeline 處理 filter / sort / group / expand 等狀態。

#### 與虛擬化的整合
- 虛擬化需搭配 `@tanstack/react-virtual`；**不可同時啟用 pagination**（`getPaginatedRowModel`），因虛擬化需要全部 row 在 DOM 外可見
- 消費 `table.getRowModel().rows` 取得所有已套用 filter/sort/group 後的最終 rows，再交給 Virtualizer
- spacer row 技術（padding top / bottom div）保留原生 `<table>` 語意結構

#### 效能重點
- v8 近期 PR（#5927）將重複 row instance methods 移至 prototype，大幅降低大量資料集的記憶體佔用
- 50,000+ rows 下仍可維持 60 FPS（搭配 TanStack Virtual）

#### 決策
使用 **TanStack Table v8**（`@tanstack/react-table`）作為 Library Table（F-041）的核心。

---

### 2. TanStack Virtual v3

#### 概述
`@tanstack/react-virtual` v3 為 headless 虛擬化 hook，最新版本 **3.13.24**（2025-04 更新，活躍維護中）。

#### 關鍵 API
| API | 用途 |
|-----|------|
| `useVirtualizer` | row / column 虛擬化 hook |
| `getTotalSize()` | 回傳完整列表高度，供 spacer div 使用 |
| `getVirtualItems()` | 當前可視範圍的 item 描述陣列 |
| `useFlushSync` option | 同步渲染（精確捲動，影響效能需測試） |

#### 套件規格
- bundle 大小：約 10–15 KB（tree-shaking 後更小）
- 支援：vertical / horizontal / grid 虛擬化、sticky items、variable size
- 框架支援：React、Vue、Solid、Svelte、Lit、Angular

#### 決策
F-040 Inbox（虛擬化列表）、F-041 Library Table（虛擬化 rows）均使用 **`@tanstack/react-virtual` v3**。

---

### 3. URL State Sync

#### 問題：原生 `useSearchParams` 的缺陷
- 需手動 string 轉換（parse / stringify / encode）
- 無型別安全
- `router.push` / `router.replace` 更新後不立即反映（非 useState 語意）
- 需要大量 `useEffect` 同步

#### 方案比較

| 方案 | 型別安全 | Next.js App Router 支援 | bundle 大小 | 維護狀態 |
|------|---------|------------------------|------------|---------|
| 原生 `useSearchParams` | 無 | 是 | 0 KB | Next.js 內建 |
| **nuqs** | 是（parser 系統） | 是（NuqsAdapter） | ~8 KB | 活躍（47ng/nuqs） |
| next-usequerystate | 已合併入 nuqs | — | — | 停止維護 |

#### nuqs 關鍵特性
- `useQueryState` / `useQueryStates`：類 `useState` 介面，自動同步 URL
- 內建 parser：`parseAsInteger`、`parseAsString`、`parseAsArrayOf` 等
- 支援 `shallow: true`（不觸發 server re-render）
- throttle / debounce 內建（避免高頻率搜尋輸入寫 URL 的效能問題）
- 與 Zustand / Jotai 互補：URL state 管理 filter/sort 參數，UI state（hover、modal open）留在 store

#### 決策
F-041 Library Table、F-043 Saved Views 的 filter/sort URL 同步使用 **nuqs**（`nuqs` package）。

---

### 4. Sprint 14 依賴套件清單

| 套件 | 版本 | 用途 | Feature |
|------|------|------|---------|
| `@tanstack/react-table` | ^8 | 表格核心 | F-041 |
| `@tanstack/react-virtual` | ^3 | 虛擬化滾動 | F-040, F-041 |
| `nuqs` | ^2 | URL search params state | F-041, F-043 |

### 5. 參考資料

- [TanStack Table v8 Virtualization Guide](https://tanstack.com/table/v8/docs/guide/virtualization)
- [TanStack Virtual v3 React Docs](https://tanstack.com/virtual/v3/docs/framework/react/react-virtual)
- [Building an Efficient Virtualized Table with TanStack Virtual and React Query with ShadCN](https://dev.to/ainayeem/building-an-efficient-virtualized-table-with-tanstack-virtual-and-react-query-with-shadcn-2hhl)
- [nuqs — Type-safe search params state management for React](https://nuqs.dev/)
- [Managing search parameters in Next.js with nuqs — LogRocket](https://blog.logrocket.com/managing-search-parameters-next-js-nuqs/)
- [Stop Fighting Next.js Search Params: Use nuqs](https://dev.to/tphilus/stop-fighting-nextjs-search-params-use-nuqs-for-type-safe-url-state-2a0h)
