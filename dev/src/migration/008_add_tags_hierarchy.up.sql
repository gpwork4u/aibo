-- 新增 domains TEXT[] 和 context JSONB 欄位
ALTER TABLE entries ADD COLUMN domains TEXT[] DEFAULT '{}';
ALTER TABLE entries ADD COLUMN context JSONB NULL;

-- domains GIN 索引
CREATE INDEX idx_entries_domains ON entries USING GIN (domains);

-- context GIN 索引（jsonb_path_ops，支援 @> 查詢）
CREATE INDEX idx_entries_context ON entries USING GIN (context jsonb_path_ops);

-- 更新 FTS 索引：加入 domains 到權重 A
DROP INDEX IF EXISTS idx_entries_fts;
CREATE INDEX idx_entries_fts ON entries USING GIN (
  (setweight(to_tsvector('simple', coalesce(summary, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(array_to_string(domains, ' '), '')), 'A') ||
   setweight(to_tsvector('simple', coalesce(content, '')), 'B'))
);
