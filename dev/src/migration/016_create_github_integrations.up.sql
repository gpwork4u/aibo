-- F-034a GitHub Commit 整合（連接/狀態/中斷）
--
-- 本 migration 建立 github_integrations 資料表，用於存放：
--   * GitHub 使用者名稱（以 LOWER(username) 做唯一約束，確保同一帳號只有一筆）
--   * 加密後的 Personal Access Token（AES-256-GCM）
--   * 授權 scopes 清單
--   * 最後同步時間與錯誤訊息（供狀態顯示用）
--
-- 設計重點：
--   * token_encrypted TEXT — 明文 PAT 在 service 層加密後才落地；DB 內永不存明文
--   * UNIQUE INDEX ON LOWER(username) — MVP 僅支援單一 GitHub 帳號，避免重複新增
--   * scopes TEXT[] DEFAULT '{}' — 存放從 X-OAuth-Scopes header 解析出的 scope 清單
--   * last_synced_at / last_error — 由 sync job 更新；connect 時清空 last_error

CREATE TABLE github_integrations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username         VARCHAR(255) NOT NULL,
  token_encrypted  TEXT         NOT NULL,
  scopes           TEXT[]       NOT NULL DEFAULT '{}',
  last_synced_at   TIMESTAMPTZ,
  last_error       TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- UNIQUE constraint 以小寫 username 為鍵（case-insensitive）
CREATE UNIQUE INDEX idx_github_integrations_username_lower
  ON github_integrations (LOWER(username));
