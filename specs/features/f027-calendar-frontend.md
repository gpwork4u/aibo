# F-027: 行事曆前端頁面

## Status: active
## Sprint: 8
## Priority: P0

## 使用者故事
As a 使用者,
I want 一個熟悉的月/週/日行事曆介面,
so that 能直覺地瀏覽每日卡片、gcal 事件並切換檢視粒度。

## 範圍
- 新增側邊欄項目「行事曆」→ `/calendar`
- 使用 shadcn/ui + 自訂日曆 grid（不引入重量級 library；必要時使用 `date-fns`）
- 月視圖：6x7 grid，每格顯示日期、entry 數 badge、最多 2 個 event title、日記 icon
- 週視圖：7 天垂直時間軸（06:00-24:00），events 以區塊顯示，entries 以 chips 排在頂部
- 日視圖：單日時間軸 + 該日 entries 全量
- 點擊日期 → 右側 Sheet（shadcn `Sheet` component），展示 `/calendar/days/:date` 結果，並提供
  - 「寫日記」按鈕（跳轉到 F-028 Journal 頁）
  - Gcal event 右側 menu「轉成 entry」按鈕
- URL 與狀態同步：`/calendar?view=month&date=2026-04-24`
- 資料載入使用 TanStack Query，`queryKey: ['calendar', since, until, view]`；cache 5 分鐘

## 元件
- `CalendarPage`：容器，處理 view state 與 URL query
- `CalendarToolbar`：上一個/下一個、今天、view 切換（Tabs）
- `MonthView` / `WeekView` / `DayView`：純展示
- `DayDetailSheet`：點日後開啟的 Sheet，內含 entries / events / journal CTA
- `EventActionMenu`：gcal event 的 dropdown（轉成 entry）

## Scenarios

### Happy Path

#### Scenario: 開啟行事曆預設為當月
GIVEN 使用者 navigate 到 /calendar
WHEN 頁面載入完成
THEN 顯示當前月份的月視圖
AND toolbar 顯示「2026 年 4 月」
AND 已呼叫 GET /api/v1/calendar?since=2026-03-30&until=2026-05-10&view=month

#### Scenario: 點日期開啟側邊詳情
WHEN 使用者點擊 2026-04-24 的格子
THEN 右側 Sheet 滑出
AND 顯示當日 entries 與 events 列表
AND URL 更新為 /calendar?view=month&date=2026-04-24

#### Scenario: 從事件轉為 entry
GIVEN Sheet 顯示 gcal event 「Standup」
WHEN 使用者點擊 event 的「轉成 entry」
THEN 呼叫 POST /api/v1/calendar/events/:gcal_id/to-entry
AND Sheet 中該 event 顯示「已連結 → Entry」狀態
AND 下方 entries 列表新增一筆

### Error Handling

#### Scenario: 未連 gcal 的提示
GIVEN API 回 424 GCAL_NOT_CONNECTED
THEN 月視圖照常顯示 entries
AND 頂部 banner 顯示「尚未連接 Google Calendar，前往設定」+ 連結 /settings

#### Scenario: gcal degraded 回傳
GIVEN response header X-Degraded = "gcal"
THEN 月視圖顯示 entries
AND 頂部顯示非阻斷式 toast「Google Calendar 暫時無法載入，僅顯示知識條目」

### Edge Cases

#### Scenario: 切換到週視圖保留所選日期
GIVEN 月視圖選中 2026-04-24
WHEN 切換到 week
THEN 顯示包含 2026-04-24 的那週（週一為起始）

#### Scenario: 手機版（<768px）
THEN 強制切換為 day 視圖
AND toolbar 顯示簡化版

## 非功能
- Keyboard：左右方向鍵切換日、PgUp/PgDn 切換月、`M/W/D` 切換視圖
- a11y：日格有 `role="gridcell"` + aria-label（完整日期 + 數量）
