# JournalHeatmap

月曆熱力圖：每格顏色深淺代表「字數」或「心情」。位於 `/journal` 列表頁右上或上方總覽區。

---

## 結構

```
┌──────────────────────────────────────────────────────┐
│ 2026 年 4 月            [字數●] [心情]   [‹ 4 月 ›]  │  ← header（mode toggle + 月份切換）
├──────────────────────────────────────────────────────┤
│  一  二  三  四  五  六  日                          │
│  ▢  ▢  ▢  ▢  ▣  ▢  ▢                                │
│  ▣  ▤  ▥  ▦  ▣  ▢  ▢                                │
│  ▢  ▥  ▦  ▤  ▣  ▢  ▢                                │
│  ▢  ▢  ▢  ▢  ▢  ─  ─                                │
├──────────────────────────────────────────────────────┤
│ 字數：  ▢ 0   ▣ 1+   ▤ 200+   ▥ 600+   ▦ 1200+      │  ← legend
└──────────────────────────────────────────────────────┘
```

每格 28px x 28px（mobile 24px），點擊 → 跳轉 `/journal/{date}`。

---

## Props

```ts
type HeatmapMode = "wordCount" | "mood";

interface JournalHeatmapProps {
  month: string;                 // 'YYYY-MM'
  data: Array<{
    date: string;                // 'YYYY-MM-DD'
    word_count: number;
    mood: "great" | "ok" | "down" | null;
    has_journal: boolean;
  }>;
  mode: HeatmapMode;
  onModeChange: (m: HeatmapMode) => void;
  onMonthChange: (m: string) => void;
  onCellClick: (date: string) => void;
}
```

---

## Tailwind / 範例

```tsx
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { JOURNAL_TESTIDS } from "@/lib/testids/journal";

// 字數階梯
function wordCountClass(n: number): string {
  if (n === 0) return "bg-muted/40";
  if (n < 200) return "bg-primary/15";
  if (n < 600) return "bg-primary/35";
  if (n < 1200) return "bg-primary/60 text-primary-foreground";
  return "bg-primary text-primary-foreground";
}
function moodClass(m: string | null): string {
  if (m === "great") return "bg-mood-great/45";
  if (m === "ok") return "bg-mood-ok/45";
  if (m === "down") return "bg-mood-down/45";
  return "bg-muted/40";
}

<section
  data-testid={JOURNAL_TESTIDS.heatmap}
  aria-label={`${month} 日記熱力圖`}
  className="rounded-lg border bg-card p-4"
>
  {/* Header */}
  <header className="mb-3 flex items-center justify-between gap-2">
    <h3 className="text-sm font-semibold">{formatMonthZh(month)}</h3>
    <div className="flex items-center gap-2">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(v) => v && onModeChange(v as HeatmapMode)}
        data-testid={JOURNAL_TESTIDS.heatmapModeToggle}
        aria-label="切換熱力圖顯示模式"
      >
        <ToggleGroupItem value="wordCount" aria-label="依字數" className="h-7 px-2 text-xs">
          字數
        </ToggleGroupItem>
        <ToggleGroupItem value="mood" aria-label="依心情" className="h-7 px-2 text-xs">
          心情
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMonthChange(prevMonth(month))}
          aria-label="上一個月"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMonthChange(nextMonth(month))}
          aria-label="下一個月"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>

  {/* 週標題 */}
  <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
    {["一","二","三","四","五","六","日"].map(d => <span key={d}>{d}</span>)}
  </div>

  {/* 日格 */}
  <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${month} 日記熱力圖網格`}>
    {monthCells.map(cell => {
      if (!cell.inMonth) {
        return <span key={cell.key} aria-hidden="true" className="h-7 w-full" />;
      }
      const cls =
        mode === "wordCount" ? wordCountClass(cell.word_count) : moodClass(cell.mood);
      const moodLabel = cell.mood ? `, ${moodLabelZh(cell.mood)}` : "";
      const aria = `${cell.date}: ${cell.has_journal ? `${cell.word_count} 字${moodLabel}` : "尚無日記"}`;
      return (
        <Tooltip key={cell.date}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="gridcell"
              onClick={() => onCellClick(cell.date)}
              data-testid={`${JOURNAL_TESTIDS.heatmapCell}-${cell.date}`}
              aria-label={aria}
              className={cn(
                "relative h-7 w-full rounded-sm text-[10px] font-medium tabular-nums transition-all",
                "flex items-center justify-center",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "hover:ring-1 hover:ring-ring/60",
                cls,
                isToday(cell.date) && "ring-1 ring-inset ring-primary",
              )}
            >
              <span className={cn(cell.has_journal ? "" : "text-muted-foreground/60")}>
                {dayNum(cell.date)}
              </span>
              {cell.mood && mode === "wordCount" && (
                <span
                  className="absolute right-0.5 top-0.5 text-[8px] leading-none"
                  aria-hidden="true"
                >
                  {moodEmoji(cell.mood)}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {formatDateZh(cell.date)}
            <br />
            {cell.has_journal ? (
              <>
                {cell.word_count.toLocaleString()} 字{cell.mood && ` · ${moodLabelZh(cell.mood)} ${moodEmoji(cell.mood)}`}
              </>
            ) : (
              <span className="text-muted-foreground">尚無日記</span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    })}
  </div>

  {/* Legend */}
  <footer
    className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground"
    data-testid={JOURNAL_TESTIDS.heatmapLegend}
  >
    {mode === "wordCount" ? (
      <>
        <span>字數</span>
        <span className="h-3 w-3 rounded-sm bg-muted/40" aria-label="0 字" />
        <span className="h-3 w-3 rounded-sm bg-primary/15" aria-label="1 至 199 字" />
        <span className="h-3 w-3 rounded-sm bg-primary/35" aria-label="200 至 599 字" />
        <span className="h-3 w-3 rounded-sm bg-primary/60" aria-label="600 至 1199 字" />
        <span className="h-3 w-3 rounded-sm bg-primary" aria-label="1200 字以上" />
        <span>少 → 多</span>
      </>
    ) : (
      <>
        <span>心情</span>
        <span className="h-3 w-3 rounded-sm bg-muted/40" aria-label="無" />
        <span className="h-3 w-3 rounded-sm bg-mood-down/45" aria-label="低落" /> 低落
        <span className="h-3 w-3 rounded-sm bg-mood-ok/45" aria-label="普通" /> 普通
        <span className="h-3 w-3 rounded-sm bg-mood-great/45" aria-label="順心" /> 順心
      </>
    )}
  </footer>
</section>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點格子 | onCellClick(date) → 跳轉 `/journal/{date}` |
| Hover 格子 | 顯示 Tooltip（日期 + 字數 + mood） |
| Tab 進入 grid | 第一格 focus，← → ↑ ↓ 移動（建議實作 roving tabindex） |
| 切換 mode | onModeChange，不觸發 fetch（同一筆 data 重渲染） |
| 切換月份 | onMonthChange → parent fetch new data |

### data-testid

| 元素 | testid |
|------|--------|
| 容器 | `JOURNAL_TESTIDS.heatmap` |
| Mode toggle | `JOURNAL_TESTIDS.heatmapModeToggle` |
| 單格 | `journal-heatmap-cell-{YYYY-MM-DD}` |
| Legend | `JOURNAL_TESTIDS.heatmapLegend` |

---

## States

| 狀態 | 視覺 |
|------|------|
| 無日記（任一模式） | `bg-muted/40` 灰底，日期數字 `text-muted-foreground/60` |
| 字數 levels | bg-primary/15 → /35 → /60 → 100%（5 階） |
| Mood | bg-mood-{great\|ok\|down}/45 |
| Today | 內框 `ring-1 ring-inset ring-primary` |
| Hover | 外框 `ring-1 ring-ring/60` |
| Focus-visible | `ring-2 ring-ring ring-offset-1` |

---

## a11y

- 容器 `role="grid"` + 格子 `role="gridcell"`，符合 ARIA grid pattern
- 每格 `aria-label` 完整描述「日期 + 字數 + 心情」
- 顏色不單獨用作辨識：tooltip + aria-label 提供完整資訊；level 4 與 level 3 同時也有 `text-primary-foreground`/`text-foreground` 對比變化
- Legend 文字明確標示每階梯數值區間
- Mode toggle 使用 `<ToggleGroup>` 支援鍵盤
- 對比驗證：所有顏色 level vs 內部數字文字 ≥ 4.5:1（見 `tokens/mood.md`）

---

## 響應式

| 斷點 | 變化 |
|------|------|
| `< 640px` | 格子 24px x 24px、字 8px、Legend 換行 |
| `≥ 640px` | 28px x 28px |
| `≥ 1024px` | 與右側列表並排（最寬 360px 容器） |

---

## 範例文案

- header：「2026 年 4 月」
- empty cell tooltip：「2026/04/03 — 尚無日記」
- with-journal tooltip：「2026/04/23 — 1,234 字 · 順心 😄」
