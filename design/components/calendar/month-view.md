# MonthView（MonthGrid + DayCell）

月視圖，6 列 × 7 欄固定 grid（共 42 格），週一為第一欄。

## 結構

```
MonthView
├── WeekdayHeader（週日列：一 二 三 四 五 六 日）
└── MonthGrid
    └── DayCell × 42
```

## MonthView Props

```ts
interface MonthViewProps {
  /** 對應 API response.days[]，由上層 map：key 為 'YYYY-MM-DD' */
  daysMap: Map<string, CalendarDay>;
  /** 當前錨點日期（決定顯示的月份） */
  anchorDate: Date;
  /** 使用者選中的日期（為 undefined 則不高亮） */
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  /** week 起始：1=Monday（預設） */
  weekStartsOn?: 0 | 1;
}

interface CalendarDay {
  date: string;               // 'YYYY-MM-DD'
  entry_count: number;
  event_count: number;
  has_journal: boolean;
  entries: EntrySummary[];    // month view 最多 3 筆
  events: EventSummary[];
}
```

## Layout

- 外容器：`grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden border`
  - `gap-px + bg-border` 形成 1px 分隔線
- WeekdayHeader：`grid grid-cols-7 text-xs font-medium text-muted-foreground bg-muted/30`
  - 每格 `py-2 text-center`，週末（六/日）`text-muted-foreground/80`
- 每格 DayCell：最小高 **112px**（desktop），mobile 不使用月視圖（強制切 day）

## DayCell 結構

```
┌──────────────────────────────┐
│ 24       [3]              📖 │  ← header：日期數字 | entry count badge | journal icon
│ ─────────────────────────── │
│ • 09:00 Standup             │  ← event row 1（title truncate）
│ • 10:00 1:1 with manager    │  ← event row 2
│ +3 更多                      │  ← 溢出提示
└──────────────────────────────┘
```

### DayCell Tailwind

```tsx
<button
  role="gridcell"
  aria-label={`${fullDate}，${entry_count} 條目，${event_count} 事件${has_journal ? '，有日記' : ''}`}
  aria-selected={isSelected}
  className={cn(
    "relative flex min-h-[112px] flex-col gap-1 p-1.5 text-left",
    "bg-card transition-colors",
    "hover:bg-muted/60",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    isOutsideMonth && "bg-muted/30 text-muted-foreground/60",
    isToday && "ring-1 ring-inset ring-primary/50",
    isSelected && "bg-primary/10 ring-2 ring-inset ring-primary",
  )}
>
```

### Header（日期數字列）

- 左：日期數字
  - today：`inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground`
  - 其他：`text-xs font-medium tabular-nums`
- 中：entry count badge `<Badge variant="secondary" className="h-4 rounded-full px-1 text-[10px]">{entry_count}</Badge>` — 當 entry_count=0 時**不顯示**
- 右：journal icon（`BookOpenIcon` size=12, `text-primary`）— 僅在 `has_journal=true` 顯示

### Event rows

- 最多 2 列（event title），每列：
  ```tsx
  <div className="flex items-center gap-1 truncate rounded-sm bg-muted/60 px-1 py-0.5 text-[11px] text-foreground">
    <span className="tabular-nums text-muted-foreground">09:00</span>
    <span className="truncate">{event.summary}</span>
  </div>
  ```
- 若 `event.all_day=true`：省略時間，改前置 `<span className="text-[10px] rounded bg-primary/10 px-1 text-primary">全天</span>`
- 若 `event.linked_entry_id != null`：改用 `bg-success/10` + 末尾加 link icon

### 溢出

- 當 `events.length > 2` 或 `entries.length > 0 且不想顯示` 時：
  ```tsx
  <span className="text-[10px] text-muted-foreground">+{overflow} 更多</span>
  ```
- 點擊整個 DayCell 開啟 DayDetailSheet（不做 inline popover）

## 響應式

| 斷點 | 行為 |
|------|------|
| ≥ 1024px | 6×7 完整 grid，每格 min-h 112px |
| 768-1023px | 每格 min-h 96px，event row 縮為 1 列 + 「+N」 |
| < 768px | MonthView **不渲染**，強制 day view（見 `mobile-fallback.md`） |

## a11y

- 整個 MonthGrid 外包 `role="grid" aria-labelledby={titleId}`
- WeekdayHeader 各格 `role="columnheader"`
- DayCell `role="gridcell" aria-selected aria-label`（完整日期 + 數量摘要）
- 支援鍵盤：`←/→` 切日、`↑/↓` 切週、`Enter/Space` 開 Sheet、`Home/End` 跳本週首末、`PgUp/PgDn` 切月
- DayCell 使用 `<button>` 確保 Tab 可達；整個 grid 使用 roving tabindex（只有 selected/today 為 `tabIndex=0`）

## Mock

見 `/Users/gpwang/project/aibo/design/pages/calendar/month-view.mock.md`
