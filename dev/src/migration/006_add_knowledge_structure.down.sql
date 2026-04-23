-- 還原全文搜尋索引
DROP INDEX IF EXISTS idx_entries_fts;
CREATE INDEX idx_entries_fts ON entries USING GIN (
  (setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(content, '')), 'B'))
);

DROP INDEX IF EXISTS idx_entries_trgm;
CREATE INDEX idx_entries_trgm ON entries USING GIN (
  (coalesce(title,'') || ' ' || coalesce(content,'')) gin_trgm_ops
);

ALTER TABLE entries DROP COLUMN IF EXISTS action;
ALTER TABLE entries DROP COLUMN IF EXISTS detail;
ALTER TABLE entries DROP COLUMN IF EXISTS summary;
