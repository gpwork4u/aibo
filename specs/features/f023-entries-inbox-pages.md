# F-023: Entries + Inbox 頁面

## 功能描述

實作 `/inbox`、`/entries`、`/entries/:id` 三個頁面：Inbox 未分類列表、Entry 列表（含篩選/排序/分頁）、Entry 詳情（Markdown 渲染）、建立/編輯/刪除/歸檔/移至分類操作。

## 使用者故事

As a aibo 使用者, I want 透過 UI 檢視與管理知識條目, so that 我可以快速瀏覽、編輯、分類我的知識。

## 設計稿
- `design/pages/inbox.md`
- `design/pages/entries.md`

## API Contract

- `GET /api/v1/entries?category_id=&is_archived=&search=&sort=&page=&page_size=` → 列表 + pagination
- `GET /api/v1/entries/:id` → 單筆詳情
- `POST /api/v1/entries` → 建立
- `PATCH /api/v1/entries/:id` → 更新
- `DELETE /api/v1/entries/:id` → 刪除
- `GET /api/v1/categories` → 用於分類 Select

## Scenarios

### Scenario 1：Inbox 頁載入
- **WHEN** 使用者進入 `/inbox`
- **THEN** GET `/api/v1/entries?category_id=null&is_archived=false`
- **AND** 顯示 DataTable（標題/Tags/建立時間/操作）
- **AND** 分頁顯示在底部

### Scenario 2：Inbox 空狀態
- **WHEN** Inbox 無條目
- **THEN** 顯示慶祝空狀態「太棒了！沒有待處理的條目」

### Scenario 3：Entries 列表
- **WHEN** 使用者進入 `/entries`
- **THEN** 顯示 DataTable（標題/分類/Tags/更新時間/操作）
- **AND** 篩選列：搜尋輸入框、分類 Select、排序 Select

### Scenario 4：搜尋 Entries
- **WHEN** 使用者在搜尋輸入框輸入關鍵字
- **THEN** 300ms debounce 後重新 query（加上 search 參數）
- **AND** 無結果顯示「找不到符合的條目」

### Scenario 5：分類篩選
- **WHEN** 使用者選擇分類
- **THEN** 重新 query 加上 `category_id={id}` 或 `category_id=null`（未分類）

### Scenario 6：無 title 顯示
- **WHEN** entry.title 為 null/空
- **THEN** 顯示 entry.content_preview，樣式 `text-muted-foreground italic`

### Scenario 7：Entry 詳情頁
- **WHEN** 使用者點擊某列的「查看」
- **THEN** 導向 `/entries/:id`
- **AND** 顯示 Entry Card：標題、分類 badge、tags、建立/更新時間、Markdown 內容（react-markdown + remark-gfm + rehype-highlight）
- **AND** 頂部有「返回列表」連結 + 編輯按鈕 + 更多操作 menu

### Scenario 8：建立 Entry
- **WHEN** 使用者點擊「建立條目」或「快速新增」
- **THEN** 開啟 Dialog（react-hook-form + zod）
- **AND** 欄位：title（max 100）、content（Textarea）、category Select、tags（TagInput）
- **AND** 驗證：title 與 content 至少填一項
- **WHEN** 提交 → POST → 成功後關閉 + toast + 刷新列表

### Scenario 9：編輯 Entry
- **WHEN** 使用者點擊「編輯」
- **THEN** 開啟編輯 Dialog，預填現有值
- **WHEN** 提交 → PATCH → 成功後刷新列表 + 詳情頁（若在詳情頁）

### Scenario 10：移至分類
- **WHEN** 使用者在 Inbox 點擊某列的「移至分類」
- **THEN** 開啟 Popover，顯示所有 category 按鈕清單
- **WHEN** 點擊某分類
- **THEN** PATCH entry.category_id → 刷新列表 + toast「已移至「{name}」」
- **AND** 該 entry 從 Inbox 消失（樂觀更新）

### Scenario 11：歸檔
- **WHEN** 使用者點擊「歸檔」
- **THEN** PATCH `is_archived: true`
- **AND** 從列表消失 + toast

### Scenario 12：刪除
- **WHEN** 使用者點擊「刪除」
- **THEN** 開啟 AlertDialog 確認
- **WHEN** 確認 → DELETE → 刷新列表 + toast

### Scenario 13：分頁
- **WHEN** 列表超過 20 筆
- **THEN** 底部顯示「共 N 筆，第 M / K 頁」+ 上一頁/下一頁按鈕
- **AND** 第 1 頁上一頁 disabled；最後一頁下一頁 disabled

### Scenario 14：Sidebar Inbox badge 同步
- **WHEN** 使用者在任何頁面進行 Inbox 相關操作（移至分類、歸檔、刪除）
- **THEN** invalidate `["inbox-count"]` query，Sidebar badge 自動更新

## 實作指引

### 需要建立的檔案

```
dev/frontend/
├── app/(dashboard)/
│   ├── inbox/page.tsx
│   ├── entries/page.tsx
│   └── entries/[id]/page.tsx
├── components/
│   ├── forms/
│   │   ├── entry-form-dialog.tsx       # 建立/編輯共用
│   │   └── quick-add-dialog.tsx        # Inbox 簡化版
│   ├── entry-row-actions.tsx           # DropdownMenu
│   ├── move-to-category-popover.tsx
│   └── markdown-viewer.tsx             # 已在 F-021
├── lib/
│   ├── api/entries.ts
│   ├── hooks/use-entries.ts
│   ├── hooks/use-inbox-count.ts
│   └── schemas/entry.ts
```

### 關鍵邏輯
- 列表使用 `keepPreviousData: true` 讓分頁切換時不閃爍
- Markdown 渲染：`prose prose-sm dark:prose-invert`，rehype-highlight 引入 `highlight.js/styles/github.css`
- Tag Input：shadcn/ui 無內建，自行實作 — Input + Enter 新增 + Badge 可刪除

### Unit Tests
- `components/forms/entry-form-dialog.test.tsx` — 驗證 title/content 至少一項
- `components/markdown-viewer.test.tsx` — code block 渲染

## 依賴
- Wave: 1
- 依賴：F-021（前端基礎）
