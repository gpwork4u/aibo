# JournalFilters

`/journal` 列表頁的篩選列：mood、draft、date range。

---

## 結構

```
┌──────────────────────────────────────────────────────────────────┐
│ [心情：全部 ▾] [狀態：全部 ▾] [日期：2026-04 ▾]   [清除篩選]      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Props

```ts
type MoodFilter = "all" | "great" | "ok" | "down" | "none";   // 'none' = 未填心情
type DraftFilter = "all" | "draft" | "published";

interface JournalFiltersProps {
  mood: MoodFilter;
  draft: DraftFilter;
  dateRange: { since: string | null; until: string | null };
  onChange: (next: { mood?: MoodFilter; draft?: DraftFilter; dateRange?: typeof dateRange }) => void;
}
```

---

## Tailwind / 範例

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/calendar/date-range-picker";  // 沿用 Sprint 8
import { JOURNAL_TESTIDS } from "@/lib/testids/journal";

<div
  data-testid={JOURNAL_TESTIDS.listFilters}
  role="toolbar"
  aria-label="日記篩選"
  className="flex flex-wrap items-center gap-2"
>
  <Select value={mood} onValueChange={(v) => onChange({ mood: v as MoodFilter })}>
    <SelectTrigger
      className="h-9 w-auto min-w-[140px]"
      data-testid={JOURNAL_TESTIDS.filterMood}
      aria-label="心情篩選"
    >
      <SelectValue placeholder="心情：全部" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">心情：全部</SelectItem>
      <SelectItem value="great">😄 順心</SelectItem>
      <SelectItem value="ok">🙂 普通</SelectItem>
      <SelectItem value="down">😣 低落</SelectItem>
      <SelectItem value="none">未填心情</SelectItem>
    </SelectContent>
  </Select>

  <Select value={draft} onValueChange={(v) => onChange({ draft: v as DraftFilter })}>
    <SelectTrigger
      className="h-9 w-auto min-w-[140px]"
      data-testid={JOURNAL_TESTIDS.filterDraft}
      aria-label="狀態篩選"
    >
      <SelectValue placeholder="狀態：全部" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">狀態：全部</SelectItem>
      <SelectItem value="draft">AI 草稿</SelectItem>
      <SelectItem value="published">已發布</SelectItem>
    </SelectContent>
  </Select>

  <DateRangePicker
    value={dateRange}
    onChange={(r) => onChange({ dateRange: r })}
    data-testid={JOURNAL_TESTIDS.filterDateRange}
  />

  {(mood !== "all" || draft !== "all" || dateRange.since || dateRange.until) && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onChange({
        mood: "all",
        draft: "all",
        dateRange: { since: null, until: null },
      })}
      className="h-9"
    >
      清除篩選
    </Button>
  )}
</div>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 切換任一 select | onChange，parent refetch GET /journal |
| 設定日期區間 | 同上 |
| 清除篩選 | 重置全部 filter |
| 鍵盤 Tab | 在三個篩選器之間移動 |

### data-testid

| 元素 | testid |
|------|--------|
| Toolbar root | `JOURNAL_TESTIDS.listFilters` |
| Mood select | `JOURNAL_TESTIDS.filterMood` |
| Draft select | `JOURNAL_TESTIDS.filterDraft` |
| Date range picker | `JOURNAL_TESTIDS.filterDateRange` |

---

## a11y

- `role="toolbar" aria-label="日記篩選"` 構成地標
- 每個 Select 有 `aria-label`
- 觸控目標 h-9 = 36px（桌面適用），mobile 建議改 h-11

---

## 響應式

| 斷點 | 變化 |
|------|------|
| `< 640px` | 篩選器 stack 排列、寬度 100% |
| `≥ 640px` | 水平排列 |
