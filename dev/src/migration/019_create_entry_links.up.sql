-- migration 019: entry_links 語意關聯表
CREATE TYPE link_type_enum AS ENUM (
  'derives_from',
  'contradicts',
  'duplicate_of',
  'references',
  'supersedes',
  'related_to'
);

CREATE TYPE link_source_enum AS ENUM ('manual', 'llm', 'auto_merge');

CREATE TABLE entry_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id     UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  to_id       UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  link_type   link_type_enum NOT NULL DEFAULT 'related_to',
  relation    VARCHAR(200),
  confidence  NUMERIC(4,3) NOT NULL DEFAULT 1.000
              CHECK (confidence >= 0 AND confidence <= 1),
  source      link_source_enum NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_entry_links UNIQUE (from_id, to_id, link_type)
);

CREATE INDEX idx_entry_links_from ON entry_links(from_id);
CREATE INDEX idx_entry_links_to ON entry_links(to_id);
