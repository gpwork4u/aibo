-- 新增知識結構欄位
ALTER TABLE entries ADD COLUMN summary TEXT NULL;
ALTER TABLE entries ADD COLUMN detail TEXT NULL;
ALTER TABLE entries ADD COLUMN action TEXT NULL;

-- 更新全文搜尋索引：summary 權重最高 (A)
-- 注意：array_to_string() 不是 IMMUTABLE，不放入 index
DROP INDEX IF EXISTS idx_entries_fts;
CREATE INDEX idx_entries_fts ON entries USING GIN (
  (setweight(to_tsvector('simple', coalesce(summary, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(content, '')), 'B'))
);

-- 更新 pg_trgm 索引：加入 summary
DROP INDEX IF EXISTS idx_entries_trgm;
CREATE INDEX idx_entries_trgm ON entries USING GIN (
  (coalesce(summary,'') || ' ' || coalesce(title,'') || ' ' || coalesce(content,'')) gin_trgm_ops
);
