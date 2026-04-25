-- F-030a: 回滾 014_extend_gcal_integrations
ALTER TABLE gcal_integrations
  DROP COLUMN IF EXISTS access_token_expires_at,
  DROP COLUMN IF EXISTS default_calendar_id;
