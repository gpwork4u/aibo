# JournalListCard

時間軸列表頁的單筆日記卡片。

---

## 結構

```
┌──────────────────────────────────────────────────────┐
│ 😄  昨天 · 2026-04-23  週四               [AI 草稿]  │  ← header（mood + 相對時間 + draft badge）
│ ┌──────────────────────────────────────────────────┐ │
│ │ 清明連假第一天                                    │ │  ← title（無則用 content 第一行）
│ │ 今天和家人一起去掃墓，回程在山上的咖啡店坐了一下  │ │  ← preview（line-clamp-3）
│ │ 午。想到要重構 entry classifier，預計這週末...   │ │
│ └──────────────────────────────────────────────────┘ │
│ 1,234 字 · 5 個關聯條目 · 2 個事件                    │  ← footer meta
└──────────────────────────────────────────────────────┘
```

Hover：`bg-muted/40` + `shadow-sm`，整張卡片 cursor-pointer。

---

## Props

```ts
interface JournalListCardProps {
  journal: {
    date: string;             // 'YYYY-MM-DD'
    title: string | null;
    content: string;          // markdown
    mood: "great" | "ok" | "down" | null;
    is_draft: boolean;
    word_count: number;
    source_refs_count?: { entries: number; events: number };
    updated_at: string;       // ISO
  };
  onClick: () => void;
}
```

---

## Tailwind / 範例

```tsx
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon, FileTextIcon, CalendarIcon } from "lucide-react";
import { JOURNAL_TESTIDS } from "@/lib/testids/journal";

const moodEmoji = { great: "😄", ok: "🙂", down: "😣" } as const;
const moodLabel = { great: "順心", ok: "普通", down: "低落" } as const;

<button
  onClick={onClick}
  data-testid={`${JOURNAL_TESTIDS.card}-${journal.date}`}
  aria-label={`${formatRelativeZh(journal.date)} 的日記${journal.title ? `：${journal.title}` : ""}${journal.is_draft ? "（AI 草稿）" : ""}`}
  className={cn(
    "group w-full rounded-lg border bg-card p-4 text-left transition-all",
    "hover:bg-muted/40 hover:shadow-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  )}
>
  {/* Header */}
  <div className="mb-2 flex items-center gap-2">
    {journal.mood ? (
      <span
        className="text-lg"
        role="img"
        aria-label={`心情：${moodLabel[journal.mood]}`}
        data-testid={JOURNAL_TESTIDS.cardMood}
      >
        {moodEmoji[journal.mood]}
      </span>
    ) : (
      <span
        className="inline-block h-4 w-4 rounded-full bg-muted"
        aria-label="未填心情"
        data-testid={JOURNAL_TESTIDS.cardMood}
      />
    )}
    <span
      className="text-sm font-medium tabular-nums"
      data-testid={JOURNAL_TESTIDS.cardDate}
    >
      {formatRelativeZh(journal.date)}
    </span>
    <span className="text-xs text-muted-foreground">
      · {formatDateZh(journal.date)}
    </span>
    {journal.is_draft && (
      <Badge
        className="ml-auto gap-1 border-warning/40 bg-warning/15 text-warning-foreground"
        data-testid={JOURNAL_TESTIDS.cardDraftBadge}
      >
        <SparklesIcon className="h-3 w-3" aria-hidden="true" />
        AI 草稿
      </Badge>
    )}
  </div>

  {/* Title */}
  <h3
    className="mb-1 line-clamp-1 text-base font-semibold leading-snug"
    data-testid={JOURNAL_TESTIDS.cardTitle}
  >
    {journal.title?.trim() || firstNonEmptyLine(journal.content) || (
      <span className="italic text-muted-foreground">（無標題）</span>
    )}
  </h3>

  {/* Preview */}
  <p
    className="mb-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground"
    data-testid={JOURNAL_TESTIDS.cardPreview}
  >
    {stripMarkdown(journal.content).slice(0, 200)}
  </p>

  {/* Footer meta */}
  <div className="flex items-center gap-3 text-xs text-muted-foreground">
    <span data-testid={JOURNAL_TESTIDS.cardWordCount} className="tabular-nums">
      {journal.word_count.toLocaleString()} 字
    </span>
    {journal.source_refs_count?.entries ? (
      <span className="flex items-center gap-1">
        <FileTextIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {journal.source_refs_count.entries}
      </span>
    ) : null}
    {journal.source_refs_count?.events ? (
      <span className="flex items-center gap-1">
        <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {journal.source_refs_count.events}
      </span>
    ) : null}
  </div>
</button>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點擊 | router.push(`/journal/${date}`) |
| Enter / Space | 同點擊（button 元素內建） |
| Hover | `bg-muted/40` + `shadow-sm`，過渡 200ms |

### data-testid

| 元素 | testid |
|------|--------|
| Card root | `journal-card-{YYYY-MM-DD}`（含日期 suffix） |
| Mood emoji / dot | `JOURNAL_TESTIDS.cardMood` |
| Date | `JOURNAL_TESTIDS.cardDate` |
| Title | `JOURNAL_TESTIDS.cardTitle` |
| Preview | `JOURNAL_TESTIDS.cardPreview` |
| Draft badge | `JOURNAL_TESTIDS.cardDraftBadge` |
| Word count | `JOURNAL_TESTIDS.cardWordCount` |

---

## States

| 狀態 | 視覺 |
|------|------|
| Default | `bg-card border-border` |
| Hover | `bg-muted/40 shadow-sm` |
| Focus-visible | `ring-2 ring-ring ring-offset-2` |
| Draft | header 右上 `[AI 草稿]` badge |
| 無心情 | 灰圓點替代 emoji |
| 無標題 | 顯示「（無標題）」斜體 muted |

---

## a11y

- 整張卡為 `<button>`，鍵盤可用、有焦點環
- `aria-label` 包含相對時間 + title + draft 標示
- mood emoji 使用 `role="img" aria-label`
- 對比：`text-muted-foreground` ≥ 4.5:1（既有 token）
- 支援 `prefers-reduced-motion`：移除 hover 動畫過渡

---

## 範例文案

- `formatRelativeZh('2026-04-23')` → 「昨天」
- `formatRelativeZh('2026-04-22')` → 「2 天前」
- 7 天以上：直接顯示日期 + 星期，不用相對時間
