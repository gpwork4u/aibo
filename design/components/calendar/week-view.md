# WeekView（WeekGrid + TimeSlot + EventBlock）

週視圖，左側時間軸 + 7 欄日欄。顯示範圍 06:00 ~ 24:00（18 小時）。

## 結構

```
WeekView
├── WeekHeader（7 欄日期列：4/20 一 / 4/21 二 / ... / 4/26 日）
├── AllDayLane（全天事件 + 跨日切片，單列）
├── EarlyMorningChip（若有早於 06:00 的事件）
└── TimeGrid（scrollable）
    ├── TimeColumn（左側時間刻度，06:00 ~ 23:00）
    └── DayColumn × 7
        ├── TimeSlot（每小時一格）
        └── EventBlock（絕對定位，依 start/end 計算 top/height）
```

## Props

```ts
interface WeekViewProps {
  daysMap: Map<string, CalendarDay>; // 當週 7 天
  weekStart: Date;                    // 週一
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  onEventClick: (event: EventSummary, date: string) => void;
  /** entries chips 以頂部 chips 區塊呈現（見 Layout） */
}
```

## Layout

```
┌──────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│          │ 4/20 │ 4/21 │ 4/22 │ 4/23 │ 4/24 │ 4/25 │ 4/26 │  ← WeekHeader (sticky top, h=56)
│          │  一  │  二  │  三  │  四  │  五● │  六  │  日  │    ● = selected
├──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ entries  │ [E1] │      │ [E2] │ [E3] │ [E4] │      │      │  ← 頂部 entries chips（每天一列 chips）
│          │ [+2] │      │      │ [+1] │      │      │      │
├──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 全天     │ ████████ 團隊 off-site ██████████   │      │      │  ← AllDayLane（跨日區塊）
├──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 早於06:00│  —   │  —   │  [2] │  —   │  —   │  —   │  —   │  ← chip 點擊 popover 展開
├──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 06:00    │      │      │      │      │      │      │      │  ← TimeGrid scrollable
│ 07:00    │      │      │      │      │      │      │      │
│  ...     │      │      │      │      │      │      │      │
│ 09:00    │      │      │      │      │ ┃09  │      │      │
│          │      │      │      │      │ ┃Sta │      │      │
│ 10:00    │      │      │      │      │ ┃ndup│      │      │
│ ...      │      │      │      │      │      │      │      │
└──────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

### Tailwind 骨架

```tsx
<div className="flex flex-col rounded-md border overflow-hidden">
  {/* WeekHeader */}
  <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b bg-muted/30">
    <div />
    {days.map(d => (
      <button
        className={cn(
          "flex flex-col items-center gap-0.5 py-2 text-xs transition-colors",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSelected && "bg-primary/10 text-foreground",
        )}
        aria-pressed={isSelected}
      >
        <span className="tabular-nums text-muted-foreground">{mm}/{dd}</span>
        <span className={cn("font-semibold", isToday && "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground")}>
          {weekdayCh}
        </span>
      </button>
    ))}
  </div>

  {/* Entries chips lane */}
  <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b">
    <div className="px-2 py-1.5 text-[10px] text-muted-foreground">條目</div>
    {days.map(d => <EntriesChipCell entries={d.entries} />)}
  </div>

  {/* AllDayLane */}
  <AllDayLane ... />

  {/* EarlyMorningChip row */}
  <EarlyMorningRow ... />

  {/* Scrollable TimeGrid */}
  <div className="relative overflow-y-auto max-h-[calc(100vh-320px)]">
    <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
      <TimeColumn hours={hours} />
      {days.map(d => <DayColumn date={d.date} events={d.events} />)}
    </div>
  </div>
</div>
```

## TimeColumn

```tsx
<div className="flex flex-col border-r bg-muted/10">
  {hours.map(h => (
    <div key={h} className="h-12 border-t border-border/60 px-1.5 text-[11px] tabular-nums text-muted-foreground">
      {h.toString().padStart(2, "0")}:00
    </div>
  ))}
</div>
```

- 每小時高 **48px**（`h-12`）
- 整點線粗 `border-border/60`

## DayColumn

```tsx
<div className="relative border-r last:border-r-0">
  {/* 背景 hour grid */}
  {hours.map(h => (
    <div key={h} className="h-12 border-t border-border/60" />
  ))}
  {/* Events 絕對定位 */}
  {events.map(ev => <EventBlock event={ev} />)}
</div>
```

## EventBlock

一個事件區塊，依 start / end 計算位置：

```ts
const start = minutesFromMidnight(ev.start);      // e.g. 540 = 09:00
const end   = minutesFromMidnight(ev.end);
const top    = ((start - 360) / 60) * 48;          // 48px per hour, 06:00 = 0
const height = Math.max(24, ((end - start) / 60) * 48);
```

```tsx
<button
  className={cn(
    "absolute left-1 right-1 flex flex-col gap-0.5 rounded-sm border px-1.5 py-1 text-left text-[11px]",
    "transition-colors hover:shadow-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    ev.linked_entry_id
      ? "bg-success/10 border-success/40"
      : "bg-muted/60 border-dashed border-border",
  )}
  style={{ top, height }}
  aria-label={`${ev.summary}，${startStr}–${endStr}${ev.linked_entry_id ? '，已連結 entry' : ''}`}
>
  <span className="tabular-nums text-muted-foreground">{startStr}</span>
  <span className="truncate font-medium">{ev.summary}</span>
  {ev.linked_entry_id && <LinkIcon className="absolute right-1 top-1 h-3 w-3 text-success" />}
</button>
```

### 重疊處理

- 同時段重疊事件：分欄（最多 3 欄），left/width 依欄位計算
- 超過 3 個：最後一欄顯示 `+N` 按鈕 → popover 列出剩餘

## AllDayLane / 跨日事件

- All-day 事件或跨日事件在頂部 `AllDayLane`（單列，h-8），以 span N 天方式呈現：
  ```tsx
  <div className="col-start-{startCol} col-span-{span} rounded-sm bg-primary/10 border border-primary/30 px-2 py-0.5 text-[11px] truncate">
    {ev.summary}
  </div>
  ```
- 跨日事件同時出現在 AllDayLane 與各天的時段格（依 F-026 規範 client-side 重複渲染）

## 頂部 entries chips

每天 DayColumn 頂上顯示 entries chips（最多 3 個，多的顯示 +N）：

```tsx
<div className="flex flex-wrap gap-1 p-1">
  {entries.slice(0, 3).map(e => (
    <Badge key={e.id} variant="secondary" className="max-w-full truncate text-[10px]">
      {e.title || '(無標題)'}
    </Badge>
  ))}
  {entries.length > 3 && <span className="text-[10px] text-muted-foreground">+{entries.length-3}</span>}
</div>
```

點擊整個 DayColumn 的 header 或 chip 都會開 DayDetailSheet。

## a11y

- TimeGrid 包 `role="grid" aria-label="週視圖時間表"`
- 每個 EventBlock `role="button"` + 清楚 `aria-label`
- 跨日 block 在 AllDayLane 使用 `aria-label="{title}，{startDate} 至 {endDate}"`
- 鍵盤：`Tab` 到任一 EventBlock，`Enter` 開啟 Sheet 並選中該日

## Mock

見 `/Users/gpwang/project/aibo/design/pages/calendar/week-view.mock.md`
