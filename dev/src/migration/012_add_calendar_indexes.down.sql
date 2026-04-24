-- Rollback F-026 行事曆彙整 index
-- 注意：Step 1 的重複資料刪除無法回復，這是預期行為（down 僅移除 index）
DROP INDEX IF EXISTS uq_entries_gcal_ref;
DROP INDEX IF EXISTS idx_entries_created_at_date;
