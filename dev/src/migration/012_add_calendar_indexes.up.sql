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
--   Tiebreaker：若兩筆 created_at 完全一致（如同一批匯入 NOW() 同秒），
--   比較 id 大小決定保留哪筆，避免兩筆都被判為「非最早」而保留，
--   導致 Step 3 unique index 建立失敗。
DELETE FROM entries e
USING entries dup
WHERE e.source_type = 'gcal'
  AND dup.source_type = 'gcal'
  AND e.source_ref IS NOT NULL
  AND dup.source_ref IS NOT NULL
  AND e.source_ref = dup.source_ref
  AND (
        e.created_at > dup.created_at
     OR (e.created_at = dup.created_at AND e.id > dup.id)
  );

-- Step 2: 建立 created_at btree index：支援行事曆日期區間查詢
--
-- 設計取捨：
--   先前版本建 functional index on (created_at::date)，但行事曆 query 需支援 X-Timezone
--   header（以當地日分桶），表達式為 (created_at AT TIME ZONE $tz)::date，
--   與 functional index 不匹配 → 永遠 seq scan。
--
--   改採方案：呼叫端（Go repo 層）在應用層把「tz 下某一天」換算成 UTC 的
--   [start, end) 時間戳範圍，query 改為 created_at >= $1 AND created_at < $2，
--   即可完全命中本 btree index，且不受時區影響。
CREATE INDEX IF NOT EXISTS idx_entries_created_at
  ON entries (created_at);

-- Step 3: 建立 gcal 關聯 partial unique index
--   保證「一個 gcal event 最多只能被轉成一筆 entry」
--   僅對 source_type='gcal' 且 source_ref 非空的列生效
CREATE UNIQUE INDEX IF NOT EXISTS uq_entries_gcal_ref
  ON entries (source_ref)
  WHERE source_type = 'gcal' AND source_ref IS NOT NULL;
