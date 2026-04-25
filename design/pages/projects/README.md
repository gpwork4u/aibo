# Projects 頁面 HTML Mocks — Sprint 10

對應 issue #126、F-031 / F-032。本目錄收錄 4 份靜態 HTML mock，所有 `data-testid` 與 `design/components/projects/testids.md`、`design/components/kanban/testids.md` 對齊，可直接給 QA 對 selector、給 engineer 對 layout。

## 檔案

| 檔案 | 對應 spec / 元件 | 涵蓋狀態 |
|------|------------------|---------|
| `projects-list.html` | F-032 `/projects` 列表頁；ProjectListCard、ProjectStatusTabs | active tab 選中、3 張卡（normal / different color / archived 半透明）、empty state（hidden 區塊示範） |
| `project-detail-board.html` | F-032b `/projects/:id` Board tab；KanbanBoard / Column / Card | 4 欄齊列、進行中欄拖移高亮（drag-over）、drop indicator、被拖卡片 rotate 預覽態 |
| `project-detail-list.html` | F-032 List tab；TaskListRow + DataTable | 篩選列、4 row（含逾期紅標、refs chip、`來源已刪除` dashed chip、已完成 line-through） |
| `project-detail-overview.html` | F-032 Overview tab；ProjectOverviewTab | 大進度條、4 個 stat card、時程、描述、最近活動 timeline |

## 使用方式

直接以瀏覽器開啟即可（純靜態 + Tailwind CDN，不需建置）：

```
open design/pages/projects/projects-list.html
open design/pages/projects/project-detail-board.html
open design/pages/projects/project-detail-list.html
open design/pages/projects/project-detail-overview.html
```

## testid 對齊

- 全部測試 selector 命名沿用 `PROJECTS_TESTIDS` / `KANBAN_TESTIDS`
- 動態 ID 以 `-{id}` suffix（範例 mock 用 `t1` / `t4` / `p1` 等假 id）
- QA 在 e2e 中可：

  ```ts
  await page.getByTestId(`project-card-${id}`).click();
  await page.getByTestId(`kanban-column-in_progress`);
  await page.getByTestId(`task-list-row-${id}`);
  ```

## 注意事項

- HTML mock **僅用於對齊版型 / a11y / testid**，不是最終實作；正式元件請以 shadcn/ui + Tailwind v4 重新組合
- 顏色對比度已對照 `design/tokens/projects.json` 採 HSL 值，皆 ≥ WCAG AA
- 拖移視覺（drop indicator、rotate、drag-over ring）在 mock 中以靜態狀態呈現，實際由 `@dnd-kit` 動態切換
