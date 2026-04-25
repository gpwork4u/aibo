-- F-028 每日日記資料層
--
-- 本 migration 建立以下資料表：
--   1. journal_entries：每日日記主表（每日最多一篇，date 唯一）
--   2. journal_source_refs：日記與來源（entry / gcal_event）的多對多關聯
--
-- 設計重點：
--   * date 為 DATE 型別並 UNIQUE，確保「每日一篇」業務規則於 DB 層落實
--   * mood / generated_by 用 CHECK constraint 限制 enum 值，避免額外查找表
--   * content 長度 <= 20000，於 DB 層擋住超長內容（spec §Business Rules 3）
--   * llm_provider_id ON DELETE SET NULL：刪 provider 不會牽連既有日記
--   * highlights 用 TEXT[] 直接存 LLM 萃取的當日亮點（簡單即可，不需獨立表）
--   * journal_source_refs 採聯合主鍵 (journal_id, source_type, source_id)
--     - source_type CHECK 限制為 'entry' | 'gcal_event'
--     - 不對 source_id 加 FK：gcal_event id 是字串、且 entry 可能在 journal 之後刪除，
--       上層服務在組裝回應時自行 best-effort 解析
--     - 索引 (source_type, source_id)：支援「某 entry 屬於哪些日記」的反查

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  title TEXT,
  content TEXT NOT NULL,
  mood TEXT,
  highlights TEXT[],
  is_draft BOOLEAN NOT NULL DEFAULT false,
  generated_by TEXT,
  llm_provider_id UUID REFERENCES llm_providers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_journal_mood CHECK (mood IS NULL OR mood IN ('great','ok','down')),
  CONSTRAINT chk_journal_generated_by CHECK (generated_by IS NULL OR generated_by IN ('user','llm')),
  CONSTRAINT chk_journal_content_len CHECK (char_length(content) <= 20000)
);

CREATE INDEX idx_journal_entries_date ON journal_entries(date DESC);
CREATE INDEX idx_journal_entries_is_draft ON journal_entries(is_draft);
CREATE INDEX idx_journal_entries_mood ON journal_entries(mood);

CREATE TABLE journal_source_refs (
  journal_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  PRIMARY KEY (journal_id, source_type, source_id),
  CONSTRAINT chk_journal_source_type CHECK (source_type IN ('entry','gcal_event'))
);

CREATE INDEX idx_journal_source_refs_lookup ON journal_source_refs(source_type, source_id);
