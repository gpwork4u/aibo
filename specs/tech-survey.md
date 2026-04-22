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
