# Projects Components — Sprint 10

對應 issue #126、F-031 / F-032。沿用 Sprint 8 / 9 的 shadcn/ui + Tailwind v4 風格與 design tokens。新增 status / priority 配色見 `design/tokens/projects.json`。

## 元件清單

| 元件 | 檔案 | 用途 |
|------|------|------|
| ProjectListCard | `project-list-card.md` | `/projects` 卡片 grid 單張卡片 |
| ProjectFormDialog | `project-form-dialog.md` | 新增 / 編輯 Project Dialog |
| ProjectOverviewTab | `project-overview-tab.md` | `/projects/:id` Overview tab 內容 |
| ProjectStatusTabs | （內含於 list-page mock） | 列表頁 active / paused / done / archived 切換 |
| DeleteProjectConfirmDialog | （內含於 form-dialog 末尾） | 二次確認刪除（顯示 task 數） |

## testid 規範

統一見 `testids.md`（`PROJECTS_TESTIDS` 常數）。

## 共通

- 元件庫：shadcn/ui（Dialog / Tabs / Button / Badge / Input / Calendar / Popover / DropdownMenu）
- a11y：對比 ≥ WCAG AA、所有按鈕 `<button>` 並可 Tab、focus ring 統一 `ring-ring`
- 動畫 150–300ms、尊重 `prefers-reduced-motion`
- 觸控目標 ≥ 44×44pt
- color 不單獨傳遞語意：status / priority 必有文字 label + icon
