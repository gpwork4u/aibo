-- F-031 專案與任務管理（資料層）
--
-- 本 migration 建立以下資料表：
--   1. projects     ：專案主表（具狀態、起訖、進度）
--   2. tasks        ：專案下的任務（kanban 用）
--   3. task_refs    ：task 與 entry / journal / gcal_event 的多對多關聯
--
-- 設計重點：
--   * projects.name 採 case-insensitive UNIQUE，但僅限非 archived 專案
--     （透過 partial unique index：LOWER(name) WHERE status != 'archived'）
--   * status / priority / ref_type 用 CHECK constraint 限制 enum
--   * progress 由 service 層 recompute 並寫回（公式於 spec 第 66 行）
--   * tasks.position：同 (project_id, status) 內的手動排序
--   * idx_tasks_due_date 為 partial：僅未完成 task 才需要 due_date 排序
--   * task_refs：複合 PK (task_id, ref_type, ref_id)；不對 ref_id 加 FK
--     （ref_type 可能為 'gcal_event'，ref_id 是字串；entry / journal 的
--      存在性由 service 層 best-effort 驗證 + Exists 標記回傳）

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active','paused','done','archived')),
  start_date DATE,
  end_date DATE,
  progress INT NOT NULL DEFAULT 0
      CHECK (progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- name (case-insensitive) 在「非 archived」專案中需唯一
CREATE UNIQUE INDEX uq_projects_name_ci ON projects (LOWER(name)) WHERE status != 'archived';

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
      CHECK (status IN ('todo','in_progress','blocked','done','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal'
      CHECK (priority IN ('low','normal','high','urgent')),
  due_date DATE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_project_status ON tasks (project_id, status, position);
CREATE INDEX idx_tasks_due_date ON tasks (due_date) WHERE status NOT IN ('done','cancelled');

CREATE TABLE task_refs (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL CHECK (ref_type IN ('entry','journal','gcal_event')),
  ref_id TEXT NOT NULL,
  PRIMARY KEY (task_id, ref_type, ref_id)
);

-- 反向查詢：某 entry / journal / gcal_event 屬於哪些 tasks
CREATE INDEX idx_task_refs_lookup ON task_refs (ref_type, ref_id);
