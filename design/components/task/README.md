# Task Components — Sprint 10

對應 issue #126、F-032b / F-032c。Task 相關的 List 視圖列、TaskSheet（右側抽屜）、RefsPicker（多源關聯選擇）、UpcomingTasksWidget（dashboard 用 widget）。

## 元件清單

| 元件 | 檔案 | 用途 |
|------|------|------|
| TaskListRow | `task-list-row.md` | 詳情頁 List tab 表格列 |
| TaskSheet | `task-sheet.md` | 右側 Sheet 任務詳情編輯 |
| RefsPicker | `refs-picker.md` | 多源（entry / journal / gcal_event）關聯選擇器 |
| UpcomingTasksWidget | `upcoming-tasks-widget.md` | Sidebar 底部「即將到期 / 逾期」widget |

## testid

統一見 `testids.md`（`TASK_TESTIDS` 常數）。

## 共通

- shadcn/ui：Sheet / Dialog（RefsPicker 內嵌）/ Table / Tabs / Select / Calendar / Popover / Checkbox / Input / Textarea
- 對比 ≥ WCAG AA、focus ring 統一 `ring-ring`
- status / priority 雙重表達（顏色 + 文字 + icon）
- 動畫 150–300ms、尊重 `prefers-reduced-motion`
- 觸控目標 ≥ 44×44pt

## 與 Kanban 的關係

- KanbanCard 點擊 → 開 TaskSheet（mode=edit）
- KanbanColumn 「+ 加入任務」 → 開 TaskSheet（mode=create, defaultStatus=該欄）
- TaskSheet PATCH 後，board 用 React Query invalidate 重新拉清單
