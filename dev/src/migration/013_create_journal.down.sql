-- Rollback F-028 Journal 資料層
-- DROP 順序：先 child（journal_source_refs，含 FK）再 parent（journal_entries）

DROP INDEX IF EXISTS idx_journal_source_refs_lookup;
DROP TABLE IF EXISTS journal_source_refs;

DROP INDEX IF EXISTS idx_journal_entries_mood;
DROP INDEX IF EXISTS idx_journal_entries_is_draft;
DROP INDEX IF EXISTS idx_journal_entries_date;
DROP TABLE IF EXISTS journal_entries;
