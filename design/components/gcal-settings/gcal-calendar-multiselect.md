# GcalCalendarMultiselect

多日曆選擇器：checkbox + 顏色色塊。Popover 形式（避免長列表撐高頁面）。

---

## 結構

Trigger（折疊狀態）：

```
┌─────────────────────────────────────────────────┐
│ ■ Work、■ 家庭、+1                          ▾   │   ← 顏色點 + 名稱（最多 2 個 + 「+N」）
└─────────────────────────────────────────────────┘
```

Popover（展開狀態）：

```
┌─────────────────────────────────────────────────┐
│ 顯示行事曆                                       │
│ ─────────────────────────────────────────────── │
│ ☑ ■ Work             primary                    │
│ ☑ ■ 家庭                                        │
│ ☐ ■ 朋友                                        │
│ ☐ ■ 公司活動                                    │
│ ─────────────────────────────────────────────── │
│ [全選]  [全不選]                       [完成]    │
└─────────────────────────────────────────────────┘
```

---

## Props

```ts
interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
  background_color?: string;     // hex e.g. "#4285f4"，未提供則用預設色盤
}

interface GcalCalendarMultiselectProps {
  calendars: Calendar[];
  value: string[];                // selected calendar ids
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}
```

---

## Tailwind / 範例

```tsx
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GCAL_SETTINGS_TESTIDS } from "@/lib/testids/gcal-settings";

const FALLBACK_COLORS = ["#4285f4","#0b8043","#e07798","#8e24aa","#f4511e","#3f51b5","#7986cb"];
const colorFor = (cal: Calendar, idx: number) =>
  cal.background_color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

const selected = calendars.filter(c => value.includes(c.id));

<Popover>
  <PopoverTrigger asChild>
    <button
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={undefined /* shadcn 自動加 */}
      aria-label={`已選擇 ${selected.length} 個行事曆，共 ${calendars.length} 個`}
      disabled={disabled}
      data-testid={GCAL_SETTINGS_TESTIDS.calendarMultiselectTrigger}
      className={cn(
        "flex h-10 w-full max-w-sm items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm",
        "hover:bg-muted/40 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        {selected.length === 0 ? (
          <span className="text-muted-foreground">未選擇</span>
        ) : (
          <>
            {selected.slice(0, 2).map((c, i) => (
              <span key={c.id} className="flex items-center gap-1 truncate">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: colorFor(c, calendars.indexOf(c)) }}
                  aria-hidden="true"
                />
                <span className="truncate">{c.summary}</span>
                {i < Math.min(selected.length, 2) - 1 && <span className="text-muted-foreground">、</span>}
              </span>
            ))}
            {selected.length > 2 && (
              <Badge variant="secondary" className="h-5 shrink-0 text-[10px]">
                +{selected.length - 2}
              </Badge>
            )}
          </>
        )}
      </span>
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  </PopoverTrigger>
  <PopoverContent
    align="start"
    data-testid={GCAL_SETTINGS_TESTIDS.calendarMultiselect}
    className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0"
  >
    <div className="border-b p-2 text-xs font-medium text-muted-foreground">
      顯示行事曆
    </div>
    {calendars.length === 0 ? (
      <p
        className="p-4 text-center text-sm text-muted-foreground"
        data-testid={GCAL_SETTINGS_TESTIDS.calendarMultiselectEmpty}
      >
        尚無可用日曆
      </p>
    ) : (
      <ul role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto p-1">
        {calendars.map((c, i) => {
          const isOn = value.includes(c.id);
          const id = `gcal-cb-${c.id}`;
          return (
            <li key={c.id} role="option" aria-selected={isOn}>
              <label
                htmlFor={id}
                data-testid={`${GCAL_SETTINGS_TESTIDS.calendarOption}-${encodeURIComponent(c.id)}`}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  "hover:bg-muted/60 transition-colors",
                )}
              >
                <Checkbox
                  id={id}
                  checked={isOn}
                  onCheckedChange={(checked) => {
                    if (checked) onChange([...value, c.id]);
                    else onChange(value.filter(v => v !== c.id));
                  }}
                  data-testid={`${GCAL_SETTINGS_TESTIDS.calendarOptionCheckbox}-${encodeURIComponent(c.id)}`}
                  aria-label={c.summary}
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border border-border/40"
                  style={{ backgroundColor: colorFor(c, i) }}
                  data-testid={`${GCAL_SETTINGS_TESTIDS.calendarOptionColor}-${encodeURIComponent(c.id)}`}
                  aria-hidden="true"
                />
                <span className="truncate">{c.summary}</span>
                {c.primary && (
                  <Badge variant="outline" className="ml-auto h-4 shrink-0 px-1 text-[9px]">
                    primary
                  </Badge>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    )}
    <div className="flex items-center justify-between gap-2 border-t p-2">
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onChange(calendars.map(c => c.id))}
        >
          全選
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onChange([])}
        >
          全不選
        </Button>
      </div>
    </div>
  </PopoverContent>
</Popover>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點 trigger | 開 popover |
| 勾 checkbox | 立即 onChange（不等「完成」按鈕） |
| 全選 / 全不選 | 一鍵切換全部 |
| Esc | 關 popover |
| 鍵盤 ↑↓ | 在 listbox 中移動焦點 |

### data-testid

| 元素 | testid |
|------|--------|
| Trigger | `GCAL_SETTINGS_TESTIDS.calendarMultiselectTrigger` |
| Popover | `GCAL_SETTINGS_TESTIDS.calendarMultiselect` |
| 單一 option label | `gcal-calendar-option-{encodedId}` |
| 單一 checkbox | `gcal-calendar-option-checkbox-{encodedId}` |
| 顏色色塊 | `gcal-calendar-option-color-{encodedId}` |
| Empty | `GCAL_SETTINGS_TESTIDS.calendarMultiselectEmpty` |

> calendarId 含 `@` 等字元時必須 `encodeURIComponent` 後再做 testid（避免 Playwright selector 解析錯誤）。

---

## States

| 狀態 | 視覺 |
|------|------|
| 0 selected | trigger 顯示「未選擇」灰字 |
| 1–2 selected | trigger 顯示色塊 + 名稱 |
| 3+ selected | trigger 顯示前兩個 + `+N` badge |
| Empty calendars | popover 內顯示「尚無可用日曆」 |
| Disabled | trigger `opacity-50 cursor-not-allowed` |

---

## a11y

- Trigger `role="combobox" aria-expanded` + `aria-label` 包含選擇統計
- Popover 內部 `role="listbox" aria-multiselectable="true"`
- 每選項 `role="option" aria-selected`
- Checkbox 與 label 用 htmlFor 連結
- 顏色色塊 `aria-hidden`，僅作裝飾；資訊靠 checkbox 狀態 + 文字
- 對比：色塊邊框 `border-border/40` 確保淺色行事曆色（如黃色）在白底仍可見
- 觸控：每 option 高度 ≥ 36px（label py-1.5 + line-height ≈ 36–40px），桌機適用；mobile 建議改成 sheet 或調高至 44px

---

## 響應式

| 斷點 | 變化 |
|------|------|
| `< 640px` | popover 改用 Drawer（底部彈出全寬） |
| `≥ 640px` | popover 同 trigger 寬度，最小 260px |

---

## 範例文案

- trigger：「Work、家庭、+1」
- empty：「尚無可用日曆」
- primary badge：「primary」
