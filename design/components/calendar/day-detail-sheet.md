# DayDetailSheet

點擊任一日期格 / 日欄後，由右側滑出（shadcn Sheet，需新增 `components/ui/sheet.tsx`）。

## 用途

- 聚焦顯示當日：entries / gcal events / journal placeholder 三大區塊
- 提供「寫日記」CTA（跳 F-028）
- 對每個 gcal event 提供「轉成 entry」動作（見 `EventActionMenu`）

## Props

```ts
interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;                // 'YYYY-MM-DD'
  data: DayDetailData | undefined;   // 由 /calendar/days/:date 提供
  isLoading: boolean;
  isError: boolean;
  onConvertEvent: (gcalId: string) => Promise<void>;
  onCreateJournal: () => void;
  onOpenEntry: (entryId: string) => void;
}
```

## 寬度與 layout

- 桌機：`w-[420px] sm:w-[480px]`（shadcn Sheet side=right）
- 手機：`w-full`

## 結構

```
┌────────────────────────────────────────────┐
│ SheetHeader                                │
│  ┌─ 2026 年 4 月 24 日  星期五  [✕ close] │
│  └─ 共 3 條目 · 2 事件                    │
├────────────────────────────────────────────┤
│ Journal Section                            │
│  ┌──────────────────────────────────────┐  │
│  │ 📖 尚未撰寫日記                       │  │
│  │ [ 寫今天的日記 → ]  (variant=default) │  │
│  └──────────────────────────────────────┘  │
│  （若已有 journal：顯示 mood + 摘要 + 檢視）│
├────────────────────────────────────────────┤
│ Entries Section（N）                       │
│  ┌─── EntryMiniCard ───┐                   │
│  │ 標題                 │                   │
│  │ summary...          │                   │
│  │ #tag1 #tag2    09:11│                   │
│  └─────────────────────┘                   │
│  ... more                                  │
├────────────────────────────────────────────┤
│ Events Section（N）                        │
│  ┌─── EventCard ───┐     [⋯ 轉成 entry ▾] │
│  │ 09:00–09:30         │                   │
│  │ Standup             │                   │
│  │ 📍 Zoom             │                   │
│  │ [已連結 → Entry ↗]   │                   │
│  └─────────────────────┘                   │
└────────────────────────────────────────────┘
```

## Tailwind

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col gap-0 p-0">
    <SheetHeader className="px-5 py-4 border-b">
      <SheetTitle className="text-lg">{formatDateZh(date)}</SheetTitle>
      <SheetDescription>
        共 {entries.length} 條目 · {events.length} 事件
      </SheetDescription>
    </SheetHeader>

    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
      {/* Journal */}
      <section aria-labelledby="sec-journal">
        <h3 id="sec-journal" className="mb-2 text-sm font-semibold text-muted-foreground">日記</h3>
        {data?.journal ? <JournalPreviewCard journal={data.journal} /> : <JournalEmptyCard onCreate={onCreateJournal} />}
      </section>

      <Separator />

      {/* Entries */}
      <section aria-labelledby="sec-entries">
        <h3 id="sec-entries" className="mb-2 text-sm font-semibold text-muted-foreground">
          條目（{entries.length}）
        </h3>
        {isLoading ? <SkeletonList rows={3} /> :
         entries.length === 0 ? <EmptyLine text="這一天沒有新增條目" /> :
         <div className="space-y-2">{entries.map(e => <EntryMiniCard key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} />)}</div>
        }
      </section>

      <Separator />

      {/* Events */}
      <section aria-labelledby="sec-events">
        <h3 id="sec-events" className="mb-2 text-sm font-semibold text-muted-foreground">
          Google Calendar 事件（{events.length}）
        </h3>
        {events.length === 0 ? <EmptyLine text="這一天沒有 Google Calendar 事件" /> :
         <div className="space-y-2">{events.map(ev => <EventCard key={ev.gcal_id} event={ev} onConvert={() => onConvertEvent(ev.gcal_id)} />)}</div>
        }
      </section>
    </div>
  </SheetContent>
</Sheet>
```

## 子元件

### JournalEmptyCard

```tsx
<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-3">
  <div className="flex items-center gap-2"><BookOpenIcon className="h-4 w-4" /> 尚未撰寫日記</div>
  <Button onClick={onCreate} size="sm" className="w-full">寫今天的日記</Button>
</div>
```

### JournalPreviewCard

```tsx
<button onClick={onOpenJournal} className="w-full rounded-md border-l-2 border-primary bg-muted/30 p-3 text-left hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
  <div className="flex items-center gap-2 text-sm">
    <MoodEmoji mood={journal.mood} />
    <span className="font-medium">{moodLabel(journal.mood)}</span>
    <span className="ml-auto text-xs text-muted-foreground">檢視 →</span>
  </div>
  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{journal.summary ?? ''}</p>
</button>
```

### EmptyLine

```tsx
<p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">{text}</p>
```

## 狀態

| 狀態 | 處理 |
|------|------|
| isLoading（初次） | 三個 section 都顯示 `<Skeleton>` 列 |
| isError | Entries / Events section 內以 `<ErrorState>` 顯示重試按鈕，Journal 仍可使用 |
| 轉成 entry 進行中 | 該 EventCard 顯示 inline spinner；其他可正常操作 |
| 轉成 entry 成功 | EventCard 加 `已連結` badge，同時於 Entries section 新增該 entry（由 onConvert 觸發 refetch） |
| 轉成 entry 409 ALREADY_LINKED | Toast warning「此事件已連結至 Entry」 |

## a11y

- Sheet 內部滾動區 `aria-label="{date} 詳情"`
- 區塊 heading 以 `<h3 id>` + `<section aria-labelledby>` 建立地標
- Close 由 shadcn Sheet 內建，`Esc` 關閉
- Focus：Sheet 打開時 focus 移至 SheetTitle；關閉時還原至觸發 DayCell

## 響應式

- `< 640px`：`w-full`，Events / Entries section 可全寬；轉成 entry 的 dropdown 改為底部 Drawer 樣式（若後續需要）

## 範例

見 `examples.tsx#DayDetailSheetExample`
