# `/calendar` 頁面規格總覽

對應 Feature：**F-027 行事曆前端頁面**（spec: `specs/features/f027-calendar-frontend.md`）
資料來源 API：**F-026 /api/v1/calendar**（spec: `specs/features/f026-calendar-view.md`）

## Mocks

| 視圖 | 檔案 |
|------|------|
| 月視圖 | `month-view.mock.md` |
| 週視圖 | `week-view.mock.md` |
| 日視圖（desktop + mobile） | `day-view.mock.md` |
| DayDetailSheet 打開狀態 | `sheet-open.mock.md` |

## 元件索引（`design/components/calendar/`）

| 檔案 | 對應元件 |
|------|---------|
| `tokens.md` | 行事曆專用 token / 樣式約定 |
| `calendar-toolbar.md` | CalendarToolbar |
| `month-view.md` | MonthView / MonthGrid / DayCell |
| `week-view.md` | WeekView / WeekGrid / TimeSlot / EventBlock / AllDayLane |
| `day-view.md` | DayView |
| `day-detail-sheet.md` | DayDetailSheet |
| `event-card.md` | EventChip / EventCard / EntryMiniCard / lifecycle badge |
| `gcal-banner.md` | GcalBanner / DegradedToast / EventActionMenu |
| `mobile-fallback.md` | 手機版（< 768px）降級規則 |
| `examples.tsx` | React code snippets（可複製，markup + class） |

## 頁面組裝（給 engineer 的組裝指南）

```tsx
// app/(dashboard)/calendar/page.tsx
<main className="flex flex-col">
  {needsBanner && <GcalBanner onDismiss={...} />}
  <CalendarToolbar view={...} onViewChange={...} ... />

  {effectiveView === "month" && <MonthView daysMap={...} anchorDate={...} ... />}
  {effectiveView === "week"  && <WeekView  daysMap={...} weekStart={...} ... />}
  {effectiveView === "day"   && <DayView   day={...} date={...} ... />}

  <DayDetailSheet
    open={!!selectedDate}
    date={selectedDate}
    data={dayDetailQuery.data}
    isLoading={dayDetailQuery.isLoading}
    onConvertEvent={convertEventMutation.mutateAsync}
    onCreateJournal={() => router.push(`/journal/${selectedDate}`)}
    onOpenEntry={(id) => router.push(`/entries/${id}`)}
    onOpenChange={(open) => !open && setSelectedDate(undefined)}
  />
</main>
```

## URL 狀態同步

- `?view=month|week|day`
- `?date=YYYY-MM-DD`（選中日）
- `?anchor=YYYY-MM-DD`（當前錨點，決定顯示哪個月/週）
  - 實作可選擇由 `date` 推導 `anchor`，省略 `anchor` 參數
- 未提供時預設為 `view=month` + 今天

## TanStack Query keys

| 用途 | queryKey | staleTime |
|------|----------|-----------|
| 月/週彙整 | `['calendar', since, until, view]` | 5 分鐘 |
| 單日詳情 | `['calendar', 'day', date]` | 1 分鐘 |

## 鍵盤快捷鍵

| 鍵 | 動作 |
|----|------|
| ← / → | 前一天 / 後一天 |
| PgUp / PgDn | 前一月 / 後一月 |
| M / W / D | 切換月 / 週 / 日 |
| T | 回到今天 |
| Enter / Space | 打開所選日的 DayDetailSheet |
| Esc | 關閉 Sheet |

在 CalendarToolbar 按鈕 tooltip 中以 `<kbd>` 提示。

## 待 engineer 新增的 shadcn 元件

- [ ] `components/ui/sheet.tsx`（shadcn add sheet）
- [ ] `components/ui/tabs.tsx`（shadcn add tabs）

其他（`dialog` / `dropdown-menu` / `popover` / `tooltip` / `badge` / `button` / `card` / `separator` / `skeleton`）皆已安裝，直接使用。
