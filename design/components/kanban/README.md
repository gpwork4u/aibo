# Kanban Components — Sprint 10

對應 issue #126、F-032b。基於 `@dnd-kit/core` + `@dnd-kit/sortable`，4 欄 Kanban（todo / in_progress / blocked / done），可拖移改 status + position。樣式沿用 shadcn/ui + Tailwind v4。

## 元件清單

| 元件 | 檔案 | 用途 |
|------|------|------|
| KanbanBoard | `kanban-board.md` | 4 欄整體 layout + DndContext |
| KanbanColumn | `kanban-column.md` | 單一欄位（header + sortable list + drop zone） |
| KanbanCard | `kanban-card.md` | 任務卡片（拖移單位） |

## testid

統一見 `testids.md`（`KANBAN_TESTIDS` 常數）。

## 響應式

| 斷點 | 行為 |
|------|------|
| `>= 768px` | 4 欄並排，欄寬 280–320px，水平 scroll |
| `< 768px` | 顯示單欄 + status switcher（segmented control 切換 status） |

## 拖移交互

| 來源 | 行為 |
|------|------|
| Pointer / Touch（PointerSensor，activationConstraint distance=4） | 一般拖移 |
| Keyboard（KeyboardSensor，sortableKeyboardCoordinates） | Tab 進 drag handle，Space 開始拖、`↑↓` 在欄內移、`←→` 跨欄、Enter 放下、Esc 取消 |

`@dnd-kit` 內建 `<ScreenReaderInstructions>` 與 `announcements`，本專案以繁中覆寫（見 `kanban-board.md`）。

## Tokens 對照

色票來自 `design/tokens/projects.json`：
- `kanban.column-bg` / `column-drag-over-bg` / `column-drag-over-ring`
- `kanban.card-shadow-rest` / `card-shadow-hover` / `card-shadow-drag`
- `task-status.{status}.dot/bg/fg` 用於 KanbanCard status indicator
- `priority.{level}.bg/fg/border` 用於 priority badge
