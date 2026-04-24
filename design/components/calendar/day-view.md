# DayView

單日視圖：頂部 entries chips 區 + 左側時間軸 + 右側 events blocks。

## Props

```ts
interface DayViewProps {
  day: CalendarDay;            // 當日完整資料（由 /calendar/days/:date 供應或 /calendar 聚合）
  date: string;                // 'YYYY-MM-DD'
  onEntryClick: (entry: EntrySummary) => void;
  onEventClick: (event: EventSummary) => void;
  onCreateJournal: () => void; // 跳 F-028 journal 頁
}
```

## Layout（desktop）

```
┌──────────────────────────────────────────────────────────┐
│ 2026-04-24 星期五                     [ 📖 寫日記 ]       │  ← Day header
├──────────────────────────────────────────────────────────┤
│ 今日條目（3）                                             │
│ [E1 標題...] [E2 標題...] [E3 標題...]                    │  ← entries chips
├──────────────────────────────────────────────────────────┤
│ 全天 ▸ 團隊 off-site                                      │  ← AllDayLane
├──────────────────────────────────────────────────────────┤
│ ⏰ 早於 06:00：1 件  [展開]                              │
├──────┬───────────────────────────────────────────────────┤
│06:00 │                                                   │
│07:00 │                                                   │
│...   │                                                   │
│09:00 │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓                 │
│      │ ┃ 09:00 Standup                ┃                 │
│10:00 │ ┃ 已連結 Entry ↗               ┃                 │
│...   │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛                 │
└──────┴───────────────────────────────────────────────────┘
```

## Tailwind 結構

```tsx
<section className="flex flex-col gap-3">
  {/* Day Header */}
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-xl font-semibold">{formatDateZh(date)}</h2>
      <p className="text-sm text-muted-foreground">共 {entryCount} 條目 · {eventCount} 事件</p>
    </div>
    <Button onClick={onCreateJournal} variant={hasJournal ? "outline" : "default"}>
      <BookOpenIcon className="mr-2 h-4 w-4" />
      {hasJournal ? "檢視日記" : "寫日記"}
    </Button>
  </div>

  {/* Entries chips */}
  {entries.length > 0 && (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">今日條目（{entries.length}）</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {entries.map(e => (
          <button onClick={() => onEntryClick(e)} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <Badge variant="secondary" className="max-w-[32ch] truncate cursor-pointer hover:bg-secondary/80">
              {e.title || e.summary}
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  )}

  {/* Time grid - 與 WeekView 共用結構，但只有一欄 DayColumn */}
  <div className="rounded-md border overflow-hidden">
    <AllDayLane events={allDayEvents} />
    <EarlyMorningRow events={earlyEvents} />
    <div className="relative grid grid-cols-[56px_1fr] overflow-y-auto max-h-[60vh]">
      <TimeColumn />
      <DayColumn date={date} events={timedEvents} />
    </div>
  </div>
</section>
```

- DayColumn 右側寬度比 WeekView 寬得多，EventBlock 不需要擠（最多 3 欄重疊分欄）
- 點擊 EventBlock：呼叫 `onEventClick`，展開該事件的 EventActionMenu popover（「轉成 entry」等）

## Empty State

- 無 entries 與 events：顯示 `<EmptyState>` 文案「今天還沒有任何紀錄 —— 從新增條目或撰寫日記開始」+ CTA 按鈕

## a11y

- 整個區塊外包 `<section aria-label={`${fullDate} 單日視圖`}>`
- 時間軸用 `role="grid"`，TimeColumn `role="rowheader"`
- EntryChip 使用 `<button>` 可達；EventBlock 同 WeekView

## 響應式

| 斷點 | 行為 |
|------|------|
| ≥ 768px | 如上圖，時間軸高度可用 `max-h-[60vh]` |
| < 768px | 時間軸每格高 **56px**，EventBlock 最小字級 13px；entries chips 顯示 `max-w-[22ch]` |

## Mock

見 `/Users/gpwang/project/aibo/design/pages/calendar/day-view.mock.md`
