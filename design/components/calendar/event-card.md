# EventCard / EventChip / EntryMiniCard

三種卡片用於 DayDetailSheet 與時間軸中，視覺上需**清楚區分** gcal event 與 entry。

---

## 1. EventChip（月視圖 DayCell 內）

一行式、極省空間的事件列。

```tsx
<div
  className={cn(
    "flex items-center gap-1 truncate rounded-sm px-1 py-0.5 text-[11px]",
    ev.linked_entry_id
      ? "bg-success/10 border border-success/30"
      : "bg-muted/60 border border-dashed border-border",
  )}
  title={`${startStr} ${ev.summary}`}
>
  {ev.all_day ? (
    <Badge variant="outline" className="h-4 px-1 text-[9px]">全天</Badge>
  ) : (
    <span className="tabular-nums text-muted-foreground shrink-0">{startStr}</span>
  )}
  <span className="truncate">{ev.summary}</span>
  {ev.linked_entry_id && <LinkIcon className="h-3 w-3 shrink-0 text-success" />}
</div>
```

---

## 2. EventCard（Sheet 中的完整卡片）

```
┌──────────────────────────────────────────────┐
│ 09:00 – 09:30  · 30 分鐘                     │
│ Standup                                      │
│ 📍 Zoom Meeting Room                         │
│ 👥 alice@example.com, bob@example.com       │
│ description 文字最多 2 行...                 │
│ ────────────────────────────────────────── │
│ [已連結 → Entry ↗]              [⋯ 動作 ▾]  │
└──────────────────────────────────────────────┘
```

### Props

```ts
interface EventCardProps {
  event: EventDetail;       // 含 description, location, attendees
  isConverting?: boolean;
  onConvert: () => void;
  onOpenLinkedEntry?: () => void;
}
```

### Tailwind

```tsx
<div className={cn(
  "rounded-md border p-3 text-sm",
  event.linked_entry_id
    ? "bg-success/5 border-success/30"
    : "bg-muted/30 border-dashed border-border",
)}>
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-xs tabular-nums text-muted-foreground">
      {event.all_day ? "全天" : `${startStr} – ${endStr}`}
      {!event.all_day && <span className="ml-1">· {durationLabel}</span>}
    </span>
    {event.all_day && <Badge variant="outline" className="h-4 px-1 text-[9px]">全天</Badge>}
  </div>

  <h4 className="mt-1 font-medium leading-snug">{event.summary}</h4>

  {event.location && (
    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
      <MapPinIcon className="h-3.5 w-3.5" />
      <span className="truncate">{event.location}</span>
    </p>
  )}

  {event.attendees?.length > 0 && (
    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
      <UsersIcon className="h-3.5 w-3.5" />
      <span className="truncate">{event.attendees.slice(0,3).join(", ")}{event.attendees.length>3 && ` +${event.attendees.length-3}`}</span>
    </p>
  )}

  {event.description && (
    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{event.description}</p>
  )}

  <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
    {event.linked_entry_id ? (
      <button onClick={onOpenLinkedEntry} className="inline-flex items-center gap-1 text-xs text-success hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
        <LinkIcon className="h-3 w-3" /> 已連結 → Entry
      </button>
    ) : (
      <span className="text-xs text-muted-foreground">尚未轉成 entry</span>
    )}
    <EventActionMenu
      event={event}
      isConverting={isConverting}
      onConvert={onConvert}
      disabled={!!event.linked_entry_id}
    />
  </div>
</div>
```

### 視覺差異總結（gcal vs entry）

| 維度 | Gcal Event 未連結 | Gcal Event 已連結 | Entry |
|------|-----------------|-----------------|-------|
| 背景 | `bg-muted/30` | `bg-success/5` | `bg-card` |
| 邊框 | `border-dashed border-border` | `border-success/30`（實線） | `border-border`（實線） |
| 左側色條 | 無 | 無 | `border-l-2 border-primary`（Journal 款） |
| 主色強調 | 無 | success icon + badge | secondary badge（tag）|

---

## 3. EntryMiniCard（Sheet 中的條目卡片）

```
┌─────────────────────────────────────┐
│ 今天學會的 pytest fixture 技巧       │  ← title
│ 用 tmp_path + monkeypatch 替換...   │  ← summary line-clamp-2
│ #python #test        09:11 (手動)   │  ← tags + time + source_type badge
└─────────────────────────────────────┘
```

### Props

```ts
interface EntryMiniCardProps {
  entry: EntrySummary;   // 含 title, summary, tags, created_at, source_type
  onClick: () => void;
}
```

### Tailwind

```tsx
<button
  onClick={onClick}
  className="w-full rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <div className="flex items-start gap-2">
    <div className="min-w-0 flex-1">
      <h4 className="truncate font-medium text-sm">
        {entry.title || <span className="italic text-muted-foreground">(無標題)</span>}
      </h4>
      {entry.summary && (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.summary}</p>
      )}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        {entry.tags.slice(0,3).map(t => (
          <Badge key={t} variant="outline" className="text-[10px] h-4 px-1">#{t}</Badge>
        ))}
        {entry.tags.length > 3 && <span className="text-[10px]">+{entry.tags.length-3}</span>}
        <span className="ml-auto tabular-nums">{formatTime(entry.created_at)}</span>
        <SourceTypeBadge type={entry.source_type} />
      </div>
    </div>
    <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
  </div>
</button>
```

### SourceTypeBadge

| source_type | badge |
|------------|-------|
| manual | `<Badge variant="secondary" className="h-4 text-[10px]">手動</Badge>` |
| gcal | `<Badge className="h-4 text-[10px] bg-success/15 text-success-foreground border-success/30">Gcal</Badge>` |
| email / other | `<Badge variant="outline" className="h-4 text-[10px]">{label}</Badge>` |

### lifecycle_status badge（若後續有）

- `inbox` → `<Badge variant="outline" className="border-warning/40 text-warning-foreground">收件匣</Badge>`
- `active` → 不顯示
- `archived` → `<Badge variant="outline" className="opacity-60">已封存</Badge>`
- 位置：緊接 SourceTypeBadge 左側

## a11y 共通

- Card 用 `<button>` 或 `<a>`，保證可 Tab
- `aria-label` 包含日期 + 類型 + 標題（例如「Entry：今天學會的 pytest fixture 技巧」）
- hover/focus 樣式一致；不使用純色背景變化來傳達狀態（已用 badge + icon 輔助）
