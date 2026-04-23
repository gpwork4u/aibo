# F-016: 中文分詞優化

## 功能描述

評估並整合 PostgreSQL 中文分詞擴展，提升中文知識的全文搜尋品質。
目前使用 `simple` configuration，對中文只能按空格分詞，無法拆解句子中的中文詞彙。

## 使用者故事

As a 開發者, I want 中文筆記能被正確分詞搜尋, so that 搜尋「資料庫」能找到包含「PostgreSQL 資料庫效能調優」的筆記。

## 背景

目前搜尋架構：
- `simple` config：按空格和標點分詞，不做語言分析
- `pg_trgm`：3-gram 模糊匹配，對中文效果有限（每個中文字 3 bytes，trigram 可能跨字）

問題：搜尋「資料庫」無法匹配「PostgreSQL資料庫效能調優」（因為 simple 不會把這段中文拆成「資料庫」等詞）。

## 技術方案

### 選定方案：pg_bigm

見 `specs/tech-survey.md` Sprint 5 技術調查。

選擇 pg_bigm（2-gram）作為中文分詞優化方案：
- 2-gram 對中文拆解合理（每個中文字視為一個 token，相鄰兩字組成 bigram）
- 不需要詞典維護（vs zhparser 需要 SCWS 詞典）
- 安裝簡單，Docker 中可直接 apt install
- 與現有 simple + pg_trgm 架構互補

### 部署方式

自訂 PostgreSQL Docker image，安裝 pg_bigm 擴展：

```dockerfile
FROM postgres:16-alpine
# pg_bigm 需要從原始碼編譯（alpine 版本）
RUN apk add --no-cache build-base postgresql-dev \
    && cd /tmp \
    && wget https://github.com/pgbigm/pg_bigm/archive/refs/tags/v1.2-20240606.tar.gz \
    && tar xzf v1.2-20240606.tar.gz \
    && cd pg_bigm-1.2-20240606 \
    && make USE_PGXS=1 \
    && make USE_PGXS=1 install \
    && cd / && rm -rf /tmp/*
```

### Migration

```sql
-- 008 或 009 migration（視 F-014 編號而定）
CREATE EXTENSION IF NOT EXISTS pg_bigm;

-- pg_bigm 搜尋索引（取代 pg_trgm 索引）
DROP INDEX IF EXISTS idx_entries_trgm;
CREATE INDEX idx_entries_bigm ON entries USING GIN (
  (coalesce(summary,'') || ' ' || coalesce(title,'') || ' ' || coalesce(content,'')) gin_bigm_ops
);
```

### 搜尋查詢變更

將搜尋 SQL 中的 pg_trgm `%%` 運算子替換為 pg_bigm 的 `LIKE` + bigm 索引：

```sql
-- 舊：pg_trgm 模糊搜尋
... OR (coalesce(e.summary,'') || ' ' || coalesce(e.title,'') || ' ' || coalesce(e.content,'')) %% $N

-- 新：pg_bigm LIKE 搜尋（bigm 索引加速）
... OR (coalesce(e.summary,'') || ' ' || coalesce(e.title,'') || ' ' || coalesce(e.content,''))
       LIKE '%' || $N || '%'
```

pg_bigm 的 GIN 索引會加速 LIKE 查詢，不需要改用特殊運算子。

### 全文搜尋配置（FTS config）

保留 `simple` config 用於 tsvector 精確搜尋（英文效果好），pg_bigm 作為模糊搜尋的補充：

```
搜尋策略：
1. tsvector (simple) — 英文精確匹配（權重搜尋）
2. pg_bigm LIKE — 中文/英文模糊匹配（bigram 索引加速）
3. tag ILIKE — tag 部分匹配
```

三者以 OR 連接，取最高 rank。

## API Contract

搜尋 API 不需要修改（內部 SQL 變更對外透明）。

新增中文分詞狀態查詢（for debugging）：

```
GET /api/v1/system/search-config
```

回應：
```json
{
  "fts_config": "simple",
  "extensions": {
    "pg_trgm": true,
    "pg_bigm": true
  },
  "chinese_support": "pg_bigm (2-gram)"
}
```

## Scenarios

### S-016-1: 中文關鍵字搜尋

```
GIVEN Entry 內容為 "PostgreSQL資料庫效能調優指南"
WHEN GET /api/v1/search/simple?q=資料庫
THEN 回傳該 entry
  AND relevance > 0
```

### S-016-2: 中文部分匹配

```
GIVEN Entry 內容為 "使用Docker部署微服務架構"
WHEN GET /api/v1/search/simple?q=微服務
THEN 回傳該 entry
```

### S-016-3: 英文搜尋不受影響

```
GIVEN Entry 內容為 "Using Gin middleware for authentication"
WHEN GET /api/v1/search/simple?q=middleware
THEN 回傳該 entry（tsvector 精確匹配仍然生效）
```

### S-016-4: 中英混合搜尋

```
GIVEN Entry 內容為 "Golang 效能優化最佳實踐"
WHEN GET /api/v1/search/simple?q=Golang效能
THEN 回傳該 entry
```

### S-016-5: 智慧搜尋中文同義詞展開

```
GIVEN Entry 內容為 "資料庫索引優化"
WHEN POST /api/v1/search {"query": "database indexing"}
THEN LLM 展開同義詞包含 "資料庫" "索引"
  AND 回傳該 entry
```

### S-016-6: pg_bigm 擴展已安裝

```
WHEN GET /api/v1/system/search-config
THEN response.extensions.pg_bigm = true
  AND response.chinese_support = "pg_bigm (2-gram)"
```

### S-016-7: Docker Compose 部署包含 pg_bigm

```
GIVEN 使用 docker compose up 啟動服務
WHEN PostgreSQL 容器啟動完成
THEN pg_bigm 擴展可用（SELECT * FROM pg_extension WHERE extname = 'pg_bigm'）
```

## Docker Compose 變更

```yaml
services:
  db:
    build:
      context: ./docker/postgres
      dockerfile: Dockerfile
    # 取代原本的 image: postgres:16-alpine
```

需要新增 `docker/postgres/Dockerfile` 來自訂 PostgreSQL image。

## Migration 編號

`009_add_chinese_tokenizer.up.sql` / `009_add_chinese_tokenizer.down.sql`
