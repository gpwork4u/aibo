# F-031: 專案與任務管理（後端）

## Status: active
## Sprint: 10
## Priority: P0

## 使用者故事
As a 使用者,
I want 建立「專案」來追蹤有時程與狀態的工作,
I want 在專案下建立 task 並關聯到 entries / journal / gcal events,
so that 個人知識庫同時能扮演輕量 PM 工具，提供代理人格「我在忙什麼」的 context。

## 設計決策
- **Project 與 Category 互補**：Category 是知識分類（主題/概念），Project 是工作單位（有起訖、狀態、進度）。兩者不互相取代。
- **Task 為獨立實體**，可 link 到任意 entry / journal_entry / gcal_event
- 第一版提供 List + Kanban（by status），不含 Gantt / dependencies / subtasks
- v1 單使用者（沒有 member / assignee，只有 owner = 當前 api key scope）

## Data Model

### Migration 015: projects + tasks

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',     -- hex
  status TEXT NOT NULL DEFAULT 'active'       -- active / paused / done / archived
      CHECK (status IN ('active','paused','done','archived')),
  start_date DATE,
  end_date DATE,
  progress INT NOT NULL DEFAULT 0              -- 0..100（by auto-calc from tasks）
      CHECK (progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
  position INT NOT NULL DEFAULT 0,              -- for manual ordering within a status column
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
```

`progress` 自動計算規則：`ROUND(100 * COUNT(status='done') / NULLIF(COUNT(status NOT IN ('cancelled')), 0))`；每次 task 變動後 recompute 該 project 的 progress（trigger or service-level）。

## API Contract

### Projects

`POST /api/v1/projects`
Request：
```json
{ "name": "aibo v2", "description": "...", "color": "#3b82f6", "start_date": "2026-04-01", "end_date": "2026-06-30" }
```
201 → Project

`GET /api/v1/projects?status=active&page=1&per_page=20&sort=updated_at&order=desc`
200 → `{ data: [Project], pagination }`

`GET /api/v1/projects/:id` → Project（含 `task_counts: { total, by_status: {...} }`）

`PATCH /api/v1/projects/:id` → partial update（含 status 切換）

`DELETE /api/v1/projects/:id` → 204；有 tasks 時預設拒絕，須加 `?force=true` 才會 cascade 刪 tasks

`POST /api/v1/projects/:id/archive` → 便捷 alias：status → archived

### Tasks

`POST /api/v1/projects/:project_id/tasks`
Request：
```json
{
  "title": "設計 schema",
  "description": "...",
  "status": "todo",
  "priority": "high",
  "due_date": "2026-04-30",
  "refs": [ { "ref_type": "entry", "ref_id": "uuid" } ]
}
```
201 → Task

`GET /api/v1/projects/:project_id/tasks?status=todo,in_progress`
200 → `{ data: [Task] }`（無分頁，kanban 一次載入；若 project 超過 500 tasks → 400 TOO_MANY_TASKS，引導加 filter）

`GET /api/v1/tasks/:id` → 含 refs

`PATCH /api/v1/tasks/:id` → 可改 status / position / due_date / priority / refs

`POST /api/v1/tasks/:id/complete` → 便捷：status → done, completed_at = now

`DELETE /api/v1/tasks/:id` → 204

### 便捷聚合

`GET /api/v1/tasks/upcoming?days=7` → 未完成且 due_date <= now+N 的 tasks，跨專案，依 due_date asc

`GET /api/v1/tasks/overdue` → 未完成且 due_date < today

### Error Codes
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | 欄位驗證失敗 |
| 400 | TOO_MANY_TASKS | List tasks 超過 500 筆 |
| 404 | NOT_FOUND | |
| 409 | PROJECT_NAME_DUPLICATE | 名稱（CI）重複於非 archived 專案 |
| 409 | PROJECT_HAS_TASKS | 未加 force 刪除含 task 的專案 |
| 422 | INVALID_STATUS_TRANSITION | e.g. archived 不能改回 active（必須先 unarchive）|

## Business Rules
1. `name` 長度 1..80
2. `title` 長度 1..200
3. `description` <= 5000
4. `end_date` 若有值必須 >= `start_date`
5. `due_date` 可空；若設定必須介於 project 的 start/end（若 project 有設）；超過 end_date 仍允許但回傳 warning
6. Status transition：
   - project：`archived` ↔ 其他需顯式 unarchive
   - task：任何 status 可互轉，但 `done → *` 會清除 `completed_at`
7. Progress 由系統計算，PATCH 中傳 `progress` 會被忽略

## Scenarios

### Happy Path

#### Scenario: 建立 project
WHEN POST /api/v1/projects with { "name": "aibo v2", "start_date": "2026-04-01", "end_date": "2026-06-30" }
THEN response status = 201
AND response.status = "active"
AND response.progress = 0

#### Scenario: 建立 task 並關聯 entry
GIVEN project #1 存在
AND entry #e1 存在
WHEN POST /api/v1/projects/{1}/tasks with { "title": "設計 schema", "refs": [{"ref_type":"entry","ref_id":"{e1}"}] }
THEN response status = 201
AND response.refs 長度 = 1

#### Scenario: 完成 task 後 project progress 更新
GIVEN project #1 有 4 tasks，其中 1 done
WHEN POST /api/v1/tasks/{task2_id}/complete
THEN response status = 200
AND 隨後 GET /api/v1/projects/1 的 progress = 50

#### Scenario: 拖放改變 kanban 位置
GIVEN task t1 狀態 todo，position=0
WHEN PATCH /api/v1/tasks/{t1} with { "status": "in_progress", "position": 2 }
THEN response.status = "in_progress"
AND GET /tasks?status=in_progress 中 t1 排在 index 2

#### Scenario: Upcoming 聚合
GIVEN 跨專案有 5 個未完成 task，其中 3 個 due_date 在未來 7 天內
WHEN GET /api/v1/tasks/upcoming?days=7
THEN response.data 長度 = 3
AND 按 due_date asc 排序

### Error Handling

#### Scenario: 重名專案被拒
GIVEN 有 active project name = "aibo v2"
WHEN POST /api/v1/projects with { "name": "Aibo V2" }
THEN response status = 409
AND response.code = "PROJECT_NAME_DUPLICATE"

#### Scenario: 刪除有 task 的專案（無 force）
GIVEN project #1 有 3 tasks
WHEN DELETE /api/v1/projects/1
THEN response status = 409
AND response.code = "PROJECT_HAS_TASKS"

#### Scenario: 強制刪除
WHEN DELETE /api/v1/projects/1?force=true
THEN response status = 204
AND 相關 tasks 全部 cascade 刪除

#### Scenario: end_date 早於 start_date
WHEN POST /api/v1/projects with { "start_date": "2026-06-01", "end_date": "2026-04-01" }
THEN response status = 400
AND response.code = "INVALID_INPUT"

### Edge Cases

#### Scenario: 專案下無 task 時 progress = 0
GIVEN project 無 task
THEN GET project 回 progress = 0

#### Scenario: 所有 task 都 cancelled 時 progress = 0
GIVEN project 有 3 cancelled task
THEN progress = 0（分母為 0 fallback）

#### Scenario: Task 上限保護
GIVEN project 有 501 tasks
WHEN GET /api/v1/projects/:id/tasks（無 filter）
THEN response status = 400
AND response.code = "TOO_MANY_TASKS"
