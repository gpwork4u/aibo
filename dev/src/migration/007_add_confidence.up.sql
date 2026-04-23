-- Entry 信心度欄位
ALTER TABLE entries ADD COLUMN confidence REAL NOT NULL DEFAULT 0.5;
ALTER TABLE entries ADD COLUMN confirmations INTEGER NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN flags_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN superseded_by UUID NULL REFERENCES entries(id) ON DELETE SET NULL;

-- 信心度索引（搜尋排序用）
CREATE INDEX idx_entries_confidence ON entries (confidence);

-- Entry flags table
CREATE TABLE entry_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    reason VARCHAR(20) NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flag_reason CHECK (reason IN ('outdated', 'inaccurate', 'incomplete', 'duplicate'))
);

CREATE INDEX idx_entry_flags_entry ON entry_flags (entry_id);
