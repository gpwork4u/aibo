-- F-030a: 擴充 gcal_integrations，加入 default_calendar_id 與 access_token_expires_at
-- default_calendar_id: 使用者選定的預設日曆（events / calendar 強化用）
-- access_token_expires_at: 新欄位，與既有 token_expiry 雙寫，供 token refresh 後的狀態查詢
ALTER TABLE gcal_integrations
  ADD COLUMN IF NOT EXISTS default_calendar_id TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;

-- backfill 既有資料：將 token_expiry 複製到 access_token_expires_at
UPDATE gcal_integrations
SET access_token_expires_at = token_expiry
WHERE access_token_expires_at IS NULL;
