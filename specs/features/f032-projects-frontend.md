# F-032: 專案管理前端頁面

## Status: active
## Sprint: 10
## Priority: P0

## 使用者故事
As a 使用者,
I want 清晰的專案列表、Kanban 看板與任務詳情,
so that 能快速追蹤自己正在進行的工作。

## 範圍
- 側邊欄新增「專案」→ `/projects`
- `/projects`：卡片 grid，顯示 name, color, progress bar, status badge, 未完成 task 數、下一個 due；支援 filter（status tabs）
- `/projects/:id`：Tabs 切換
  - **Board**：Kanban（4 欄 todo / in_progress / blocked / done），支援拖拉改 status + position（`@dnd-kit`）
  - **List**：表格（title / status / priority / due / refs）
  - **Overview**：description / 時程 / progress / 最近更新
- 建立/編輯 Project 用 Dialog；建立/編輯 Task 用 Sheet（右側抽屜）
- Task Sheet 內支援：
  - 基本欄位
  - Refs picker：能加入 entry / journal / gcal_event（用既有 search API + 下拉）
- 側邊欄底部新增「近期 tasks」widget（呼叫 `/tasks/upcoming?days=7`，最多 5 筆）

## 元件
- `ProjectsListPage`
- `ProjectDetailPage`（Tabs container）
- `KanbanBoard` + `KanbanColumn` + `TaskCard`
- `TaskSheet`
- `ProjectDialog`
- `RefsPicker`
- `UpcomingTasksWidget`

## Scenarios

### Happy Path

#### Scenario: 建立專案
WHEN 使用者在 /projects 點「新增」填表並送出
THEN 呼叫 POST /api/v1/projects
AND 成功後 navigate 到 /projects/:id 的 Board tab

#### Scenario: 拖拉 task 改變 status
GIVEN Board 上 task t1 在 todo 欄位
WHEN 使用者拖到 in_progress 欄第 2 個位置
THEN 呼叫 PATCH /api/v1/tasks/{t1} with { status: "in_progress", position: 1 }
AND 樂觀更新 UI，失敗則 rollback + toast

#### Scenario: 關聯 entry 到 task
GIVEN Task Sheet 已開啟
WHEN 使用者在 RefsPicker 搜尋 entry 並選擇
THEN 呼叫 PATCH /api/v1/tasks/{id} with refs 更新
AND Sheet 下方 refs 區塊新增一筆

#### Scenario: 一鍵完成
WHEN 使用者在 task card 點勾勾
THEN 呼叫 POST /api/v1/tasks/{id}/complete
AND task 移到 done 欄

### Error Handling

#### Scenario: 重名
GIVEN API 回 409 PROJECT_NAME_DUPLICATE
THEN Dialog name 欄位顯示「名稱已存在」

#### Scenario: 拖拉失敗 rollback
GIVEN PATCH 回 500
THEN task 回到原本欄位
AND toast「更新失敗」

### Edge Cases

#### Scenario: 刪除有 task 的專案
WHEN 使用者點 delete，API 回 409 PROJECT_HAS_TASKS
THEN 顯示二次確認 dialog「此專案有 N 筆 task，要一併刪除嗎？」
WHEN 使用者確認
THEN 呼叫 DELETE /api/v1/projects/:id?force=true
