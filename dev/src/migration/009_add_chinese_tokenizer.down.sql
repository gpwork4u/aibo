-- 還原 pg_bigm 索引為 pg_trgm 索引
DROP INDEX IF EXISTS idx_entries_bigm;
CREATE INDEX idx_entries_trgm ON entries USING GIN (
  (coalesce(summary,'') || ' ' || coalesce(title,'') || ' ' || coalesce(content,'')) gin_trgm_ops
);

-- 移除 pg_bigm 擴展
DROP EXTENSION IF EXISTS pg_bigm;
