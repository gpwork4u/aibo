CREATE TABLE saved_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  scope       VARCHAR(20) NOT NULL DEFAULT 'library',
  filters     JSONB NOT NULL DEFAULT '{}',
  sort_by     VARCHAR(50),
  sort_dir    VARCHAR(4) DEFAULT 'desc',
  icon        VARCHAR(50),
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 大小寫不敏感的唯一約束（同 scope 下 name 不重複）
CREATE UNIQUE INDEX idx_saved_views_name_scope_lower
  ON saved_views (LOWER(name), scope);

-- 排序用 index
CREATE INDEX idx_saved_views_position ON saved_views (position ASC);
