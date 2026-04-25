-- Rollback F-031 專案/任務 資料層
-- DROP 順序：task_refs（child）→ tasks → projects（parent）

DROP INDEX IF EXISTS idx_task_refs_lookup;
DROP TABLE IF EXISTS task_refs;

DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_project_status;
DROP TABLE IF EXISTS tasks;

DROP INDEX IF EXISTS uq_projects_name_ci;
DROP TABLE IF EXISTS projects;
