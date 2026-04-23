DROP TABLE IF EXISTS entry_flags;

DROP INDEX IF EXISTS idx_entries_confidence;

ALTER TABLE entries DROP COLUMN IF EXISTS superseded_by;
ALTER TABLE entries DROP COLUMN IF EXISTS flags_count;
ALTER TABLE entries DROP COLUMN IF EXISTS confirmations;
ALTER TABLE entries DROP COLUMN IF EXISTS confidence;
