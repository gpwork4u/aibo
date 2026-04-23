-- 還原 FTS 索引（移除 domains）
DROP INDEX IF EXISTS idx_entries_fts;
CREATE INDEX idx_entries_fts ON entries USING GIN (
  (setweight(to_tsvector('simple', coalesce(summary, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(content, '')), 'B'))
);

-- 移除索引
DROP INDEX IF EXISTS idx_entries_context;
DROP INDEX IF EXISTS idx_entries_domains;

-- 移除欄位
ALTER TABLE entries DROP COLUMN IF EXISTS context;
ALTER TABLE entries DROP COLUMN IF EXISTS domains;
