# JournalMoodPicker

emoji 三選一的心情選擇器（ToggleGroup 形式）。

---

## 結構

```
┌────────────────────────────────────────┐
│ 今天的心情                              │  ← (optional) label
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ 😄 順心 │ │ 🙂 普通 │ │ 😣 低落 │    │  ← 三按鈕橫排
│ └─────────┘ └─────────┘ └─────────┘    │
│                            [清除]       │  ← 已選擇時顯示
└────────────────────────────────────────┘
```

選中態：對應 mood 顏色 fill + ring（見 `tokens/mood.md`）。

---

## Props

```ts
type Mood = "great" | "ok" | "down" | null;

interface JournalMoodPickerProps {
  value: Mood;
  onChange: (v: Mood) => void;
  disabled?: boolean;
  showLabel?: boolean;        // 是否顯示「今天的心情」label
  size?: "sm" | "md";         // sm=32px h, md=40px h
}
```

---

## Tailwind / 範例

```tsx
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { JOURNAL_TESTIDS } from "@/lib/testids/journal";

const options = [
  { value: "great", emoji: "😄", label: "順心", colorClass: "ring-mood-great bg-mood-great/15 text-mood-great" },
  { value: "ok", emoji: "🙂", label: "普通", colorClass: "ring-mood-ok bg-mood-ok/15 text-mood-ok" },
  { value: "down", emoji: "😣", label: "低落", colorClass: "ring-mood-down bg-mood-down/15 text-mood-down" },
] as const;

<div data-testid={JOURNAL_TESTIDS.moodPicker} className="space-y-1.5">
  {showLabel && (
    <label className="text-xs font-medium text-muted-foreground" id="mood-picker-label">
      今天的心情
    </label>
  )}
  <div
    role="radiogroup"
    aria-labelledby={showLabel ? "mood-picker-label" : undefined}
    aria-label={showLabel ? undefined : "選擇今天的心情"}
    className="flex flex-wrap items-center gap-2"
  >
    {options.map((opt) => {
      const selected = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          data-testid={`${JOURNAL_TESTIDS.moodOption}-${opt.value}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 transition-all",
            size === "sm" ? "h-8 min-w-[80px] text-xs" : "h-11 min-w-[96px] text-sm",
            "border-border bg-card hover:bg-muted/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            selected && cn("ring-2 ring-inset font-medium", opt.colorClass),
          )}
        >
          <span className="text-base leading-none" aria-hidden="true">{opt.emoji}</span>
          <span>{opt.label}</span>
        </button>
      );
    })}
    {value && !disabled && (
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="清除心情"
        className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    )}
  </div>
</div>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點擊未選按鈕 | onChange(value) |
| 點擊已選按鈕 | onChange(null)（取消選擇） |
| 鍵盤 ←/→ | 在三個按鈕之間移動焦點（radiogroup 預設） |
| Space / Enter | 選擇當前按鈕 |
| 清除按鈕 | 僅在 value !== null 顯示 |

### data-testid

| 元素 | testid |
|------|--------|
| Picker root | `JOURNAL_TESTIDS.moodPicker` |
| Great | `journal-mood-option-great` |
| Ok | `journal-mood-option-ok` |
| Down | `journal-mood-option-down` |

---

## States

| 狀態 | 視覺 |
|------|------|
| 未選 | `border-border bg-card text-foreground` |
| Hover | `bg-muted/60` |
| 選中 great | `bg-mood-great/15 ring-2 ring-inset ring-mood-great text-mood-great font-medium` |
| 選中 ok | 同上但 mood-ok |
| 選中 down | 同上但 mood-down |
| Focus | `ring-2 ring-ring ring-offset-2`（外環 visible） |
| Disabled | `opacity-50 cursor-not-allowed` |

---

## a11y

- `role="radiogroup"` + 各按鈕 `role="radio"` `aria-checked`
- 鍵盤完整支援（Tab 進入 group，← → 切換）
- 觸控目標 `md` size 高度 44px ✓（Priority 2 滿足）；`sm` 32px 僅用於緊湊場景，仍具焦點環和 hover
- 顏色不單獨用作辨識：每個按鈕都有 emoji + 文字 label
- 對比：選中態文字色 vs 透明背景（疊在 `bg-card`）≥ 4.5:1（mood 色 token 已驗證）
- `aria-label="清除心情"` 在 X 按鈕上

---

## 範例文案

- 順心 / 普通 / 低落（避免英文 great/ok/down 直接出現在 UI）
- 也可 fallback「今天感覺如何？」作為 placeholder label
