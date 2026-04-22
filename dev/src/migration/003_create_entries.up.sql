-- 啟用 pg_trgm 擴展（支援中文模糊搜尋）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 建立 entries 表
CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NULL,
    content TEXT NULL,
    category_id UUID NULL REFERENCES categories(id) ON DELETE SET NULL,
    source VARCHAR(500) NULL,
    source_type VARCHAR(20) NULL,
    source_ref VARCHAR(500) NULL,
    tags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_title_or_content CHECK (title IS NOT NULL OR content IS NOT NULL)
);

-- 來源唯一索引（source_type 非空時）
CREATE UNIQUE INDEX idx_entries_source ON entries (source_type, source_ref) WHERE source_type IS NOT NULL;

-- Tags GIN 索引（支援 @> 運算子）
CREATE INDEX idx_entries_tags ON entries USING GIN (tags);

-- 全文搜尋 GIN 索引
CREATE INDEX idx_entries_fts ON entries USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')));

-- pg_trgm 模糊搜尋索引（支援中文）
CREATE INDEX idx_entries_trgm ON entries USING GIN ((coalesce(title,'') || ' ' || coalesce(content,'')) gin_trgm_ops);

-- category_id 索引
CREATE INDEX idx_entries_category ON entries (category_id);

-- is_archived 索引
CREATE INDEX idx_entries_archived ON entries (is_archived);
