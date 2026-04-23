# F-025: 全文搜尋頁

## 功能描述

實作 `/search` 頁面，提供跨 entries 的全文搜尋功能，顯示排序結果（ts_rank * confidence），支援 tag/category/domain/context 篩選。

## 使用者故事

As a aibo 使用者, I want 快速搜尋整個知識庫, so that 我可以找到過去記錄的資訊。

## 設計稿
本 feature 無獨立設計稿，使用 `design/components/data-table.md` + `design/pages/entries.md` 的 pattern 擴展。

## API Contract

- `GET /api/v1/search?q=&category_id=&tags=&domains=&limit=&offset=` → 搜尋結果
- 回應包含 `rank`、`confidence`、`highlight`（ts_headline）

## Scenarios

### Scenario 1：搜尋頁初始狀態
- **WHEN** 使用者進入 `/search`
- **THEN** 顯示大型搜尋框 + 提示「輸入關鍵字搜尋知識庫」
- **AND** 尚未輸入時不顯示結果

### Scenario 2：即時搜尋
- **WHEN** 使用者輸入關鍵字
- **THEN** 500ms debounce 後 GET `/api/v1/search?q={keyword}`
- **AND** 顯示搜尋結果列表（含標題 + highlight snippet + 分類 + tags + 建立時間）

### Scenario 3：結果排序與顯示
- **WHEN** 有搜尋結果
- **THEN** 依 ts_rank * confidence 排序（後端計算）
- **AND** 每筆結果使用 Card 顯示：
  - 標題（可點擊導向 /entries/:id）
  - 匹配片段 highlight（使用 `<mark>` 或 Tailwind `bg-yellow-100`）
  - 分類 Badge + tag Badges
  - 信心度指示器（0.0-1.0 以小圓點或 badge 顯示）
  - 相對時間

### Scenario 4：無結果
- **WHEN** 搜尋關鍵字無結果
- **THEN** 顯示「找不到符合的結果」+ 搜尋 tips（如：嘗試更廣泛的關鍵字、檢查拼字）

### Scenario 5：篩選器
- **WHEN** 使用者展開「進階篩選」區塊
- **THEN** 顯示：
  - 分類 Select（多選）
  - Tags 輸入（多選 tag，從既有 tag 自動完成）
  - Domains Select（多選，from entries.domains 去重）
- **AND** 改變篩選 → 自動重新搜尋

### Scenario 6：搜尋延遲處理
- **WHEN** 搜尋中
- **THEN** 搜尋框右邊顯示 loading spinner
- **AND** 舊結果保持可見（`keepPreviousData`）

### Scenario 7：結果分頁（load more）
- **WHEN** 結果超過 20 筆
- **THEN** 列表底部顯示「載入更多」按鈕
- **WHEN** 點擊 → 取得下一頁並 append 到現有列表

### Scenario 8：URL 同步
- **WHEN** 使用者搜尋 `golang`
- **THEN** URL 更新為 `/search?q=golang`
- **AND** 重新整理頁面後保持搜尋狀態（從 URL 讀取 initial query）

### Scenario 9：從 Sidebar 快速搜尋（可選 enhancement）
- **WHEN** 使用者按 `Cmd+K`（或點擊 Header 搜尋圖示）
- **THEN** 開啟 Command palette（shadcn/ui `<Command>`）
- **AND** 即時搜尋，顯示 top 5 結果
- **AND** 點擊結果 → 導向 `/entries/:id`；按 Enter 若有 query → 導向 `/search?q=`

### Scenario 10：搜尋框清除
- **WHEN** 搜尋框有內容且有 X 按鈕
- **WHEN** 點擊 X
- **THEN** 清空搜尋 + URL 更新為 `/search`

## 實作指引

### 需要建立的檔案

```
dev/frontend/
├── app/(dashboard)/search/page.tsx
├── components/
│   ├── search-result-card.tsx
│   ├── confidence-indicator.tsx
│   ├── search-filters.tsx
│   └── command-palette.tsx          # Cmd+K（選配）
├── lib/
│   ├── api/search.ts
│   ├── hooks/use-search.ts
│   └── schemas/search.ts
```

### 關鍵邏輯
- Debounce：使用 `use-debounce` 或自製 `useDebouncedValue` hook（500ms）
- URL sync：使用 `useSearchParams()` + `router.replace()` 不產生 history entry
- Highlight：後端回傳的 `highlight` 欄位已有 `<mark>` tag，使用 `dangerouslySetInnerHTML` 但只允許 mark tag（或用 parser 轉 JSX）—**先用 DOMPurify sanitize** 再插入
- Confidence indicator：0.0-0.3 紅、0.3-0.7 黃、0.7-1.0 綠

### Unit Tests
- `components/search-result-card.test.tsx`
- `lib/hooks/use-search.test.ts` — debounce 行為

## 依賴
- Wave: 1
- 依賴：F-021（前端基礎）
