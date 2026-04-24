-- 行事曆彙整 API 相關 index（F-026）
--
-- 本 migration 為 Sprint 8 行事曆功能打底：
--   1. 清理既有因先前 gcal 匯入流程可能殘留的重複 entry（保留最早一筆）
--   2. 建立「依當地日」查詢用的函數式 index（created_at::date）
--   3. 建立 gcal event 與 entry 一對一關聯用的 partial unique index
--
-- 注意：gcal 唯一性僅限 source_type='gcal' 且 source_ref 非空，
--       不影響其他 source_type（如 git、manual）可能共用 source_ref 的情境。

-- Step 1: 清理既有 gcal 重複 entry（保留 created_at 最早的一筆）
--   使用 self-join：刪除「存在另一筆相同 source_ref 但 created_at 更早」的列
DELETE FROM entries e
USING entries dup
WHERE e.source_type = 'gcal'
  AND dup.source_type = 'gcal'
  AND e.source_ref IS NOT NULL
  AND dup.source_ref IS NOT NULL
  AND e.source_ref = dup.source_ref
  AND e.created_at > dup.created_at;

-- Step 2: 建立函數式 index：依 UTC 日期查詢用
--   行事曆 API 常以「某一天」為單位撈資料，此 index 讓 created_at::date 查詢可走 index scan
CREATE INDEX IF NOT EXISTS idx_entries_created_at_date
  ON entries ((created_at::date));

-- Step 3: 建立 gcal 關聯 partial unique index
--   保證「一個 gcal event 最多只能被轉成一筆 entry」
--   僅對 source_type='gcal' 且 source_ref 非空的列生效
CREATE UNIQUE INDEX IF NOT EXISTS uq_entries_gcal_ref
  ON entries (source_ref)
  WHERE source_type = 'gcal' AND source_ref IS NOT NULL;
