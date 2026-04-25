# SourceRefsPanel

編輯頁右側「關聯條目 / 關聯事件」面板。唯讀展示 LLM Draft 或使用者手動關聯的來源。

---

## 結構

```
┌──────────────── SourceRefs Panel ────────────────┐
│ 關聯來源                                          │
│ ─────────────────────────────────────────────── │
│ 關聯條目（3）                                     │
│ ┌─ chip ─────────────────────────────────────┐  │
│ │ 📄 今天學會的 pytest fixture 技巧 →         │  │
│ └────────────────────────────────────────────┘  │
│ ┌─ chip ─────────────────────────────────────┐  │
│ │ 📄 讀: Atomic Habits 心得 →                  │  │
│ └────────────────────────────────────────────┘  │
│ ─────────────────────────────────────────────── │
│ 關聯事件（2）                                     │
│ ┌─ chip ─────────────────────────────────────┐  │
│ │ 📅 09:00 Standup（已連結 → entry）          │  │
│ └────────────────────────────────────────────┘  │
│ ┌─ chip ─────────────────────────────────────┐  │
│ │ 📅 13:00 PR Review                          │  │
│ └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## Props

```ts
interface SourceRefsPanelProps {
  entries: Array<{ id: string; title: string | null; created_at: string }>;
  events: Array<{
    gcal_id: string;
    summary: string;
    start: string;       // ISO
    all_day: boolean;
    linked_entry_id: string | null;
  }>;
  onOpenEntry: (id: string) => void;
  isLoading?: boolean;
}
```

> 註：events 不可點（spec 寫明「不可點」）；entries 點擊跳轉。

---

## Tailwind / 範例

```tsx
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileTextIcon, CalendarIcon, ChevronRightIcon, LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { JOURNAL_TESTIDS } from "@/lib/testids/journal";

<aside
  data-testid={JOURNAL_TESTIDS.sourceRefsPanel}
  aria-labelledby="source-refs-title"
  className="rounded-lg border bg-card p-4 space-y-4 sticky top-4"
>
  <h3 id="source-refs-title" className="text-sm font-semibold">
    關聯來源
  </h3>

  {/* Entries */}
  <section
    aria-labelledby="source-refs-entries-title"
    data-testid={JOURNAL_TESTIDS.sourceRefsEntries}
  >
    <h4 id="source-refs-entries-title" className="mb-2 text-xs font-medium text-muted-foreground">
      關聯條目（{entries.length}）
    </h4>
    {isLoading ? (
      <div className="space-y-1.5">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    ) : entries.length === 0 ? (
      <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
        無關聯條目
      </p>
    ) : (
      <ul className="space-y-1.5">
        {entries.map(e => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onOpenEntry(e.id)}
              data-testid={`${JOURNAL_TESTIDS.sourceRefEntryItem}-${e.id}`}
              aria-label={`開啟條目：${e.title || "（無標題）"}`}
              className={cn(
                "group flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-xs",
                "border-l-2 border-l-primary border-border",
                "transition-colors hover:bg-muted/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">
                {e.title?.trim() || <span className="italic text-muted-foreground">（無標題）</span>}
              </span>
              <ChevronRightIcon
                className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>

  {/* Events */}
  <section
    aria-labelledby="source-refs-events-title"
    data-testid={JOURNAL_TESTIDS.sourceRefsEvents}
  >
    <h4 id="source-refs-events-title" className="mb-2 text-xs font-medium text-muted-foreground">
      關聯事件（{events.length}）
    </h4>
    {isLoading ? (
      <div className="space-y-1.5">
        <Skeleton className="h-9 w-full" />
      </div>
    ) : events.length === 0 ? (
      <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
        無關聯事件
      </p>
    ) : (
      <ul className="space-y-1.5">
        {events.map(ev => {
          const linked = !!ev.linked_entry_id;
          return (
            <li
              key={ev.gcal_id}
              data-testid={`${JOURNAL_TESTIDS.sourceRefEventItem}-${ev.gcal_id}`}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
                linked
                  ? "border-success/40 bg-success/5"
                  : "border-dashed border-border bg-muted/30",
              )}
              aria-label={`事件：${ev.summary}${linked ? "，已連結至條目" : ""}`}
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {!ev.all_day && (
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {formatTimeShort(ev.start)}
                </span>
              )}
              {ev.all_day && (
                <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px]">全天</Badge>
              )}
              <span className="truncate">{ev.summary}</span>
              {linked && (
                <Badge className="ml-auto h-4 shrink-0 gap-0.5 border-success/30 bg-success/15 px-1 text-[9px] text-success-foreground">
                  <LinkIcon className="h-2.5 w-2.5" aria-hidden="true" />
                  已連結
                </Badge>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </section>
</aside>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點 entry chip | onOpenEntry(id) → router.push(`/entries/${id}`) |
| 點 event chip | 不可點（無 onClick；非 button 元素） |
| Hover entry | `bg-muted/60`，右側 chevron 出現 |
| Tab | 僅 entry chip 可進入焦點；event chip 為靜態 `<li>` |

### data-testid

| 元素 | testid |
|------|--------|
| Panel root | `JOURNAL_TESTIDS.sourceRefsPanel` |
| Entries section | `JOURNAL_TESTIDS.sourceRefsEntries` |
| Events section | `JOURNAL_TESTIDS.sourceRefsEvents` |
| Entry chip | `journal-source-ref-entry-{entryId}` |
| Event chip | `journal-source-ref-event-{gcalId}` |

---

## States

| 狀態 | 視覺 |
|------|------|
| Loading | Skeleton x 2 |
| Empty | 虛線框「無關聯條目 / 事件」 |
| Entry default | `border-l-2 border-l-primary` 條色 |
| Entry hover | `bg-muted/60` |
| Event 已連結 | `border-success/40 bg-success/5` |
| Event 未連結 | `border-dashed border-border bg-muted/30` |

---

## 響應式

| 斷點 | 行為 |
|------|------|
| `≥ 1024px` | 桌機右側欄位（sticky top-4），寬 280–320px |
| `768–1023px` | 編輯區下方，水平排列兩 section |
| `< 768px` | 折疊在 `<details>` 中，預設關閉 |

---

## a11y

- `<aside>` + `aria-labelledby` 構成地標
- 每 section `<h4>` 加 `id` + `aria-labelledby`
- Entry chip 為 `<button>` ✓ 可 Tab
- Event chip 為靜態 `<li>` 但帶 `aria-label` 描述完整內容
- `border-l-2 border-l-primary` 與背景對比：左色條僅作裝飾，靠 icon + 文字傳達語意
- 對比：`text-primary` icon vs `bg-background` ≥ 4.5:1
