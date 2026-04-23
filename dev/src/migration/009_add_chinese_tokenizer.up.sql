-- 安裝 pg_bigm 擴展（2-gram 索引，優化中文全文搜尋）
CREATE EXTENSION IF NOT EXISTS pg_bigm;

-- 替換 pg_trgm 索引為 pg_bigm 索引
-- pg_bigm 的 2-gram 對中文字元自然對齊，效果優於 pg_trgm 的 3-gram
DROP INDEX IF EXISTS idx_entries_trgm;
CREATE INDEX idx_entries_bigm ON entries USING GIN (
  (coalesce(summary,'') || ' ' || coalesce(title,'') || ' ' || coalesce(content,'')) gin_bigm_ops
);
