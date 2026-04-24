# CalendarToolbar

位於 `/calendar` 頁面最上方，負責視圖切換、日期導覽、今日跳回，以及顯示當前 timezone。

## 用途
- 提供 **月 / 週 / 日** 三視圖切換（shadcn Tabs，新增元件）
- 上一個 / 下一個期間、回到今天
- 顯示當前標題（如「2026 年 4 月」/「2026 年 4 月 20 日 – 4 月 26 日」/「2026 年 4 月 24 日 星期五」）
- 顯示使用者 timezone（以 `X-Timezone` 送出的值）

## Props

```ts
type CalendarView = "month" | "week" | "day";

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  /** 當前錨點日期（以此計算標題與 prev/next 跳距） */
  anchorDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** 例：Asia/Taipei */
  timezone: string;
  /** 標題字串，由上層根據 view + anchorDate + locale 計算後傳入 */
  title: string;
  /** 是否隱藏 view Tabs（mobile < 768px 時強制 day view，則隱藏） */
  hideViewTabs?: boolean;
}
```

## Layout（desktop ≥ 768px）

```
┌────────────────────────────────────────────────────────────────────┐
│ [← 上一個] [下一個 →] [今天]    2026 年 4 月    [月][週][日]  UTC+8 │
│  └ outline ghost buttons        └ h2 title    └ Tabs     └ muted   │
└────────────────────────────────────────────────────────────────────┘
```

- 高度 56px，`px-4 py-2 border-b bg-background sticky top-0 z-10`
- Prev/Next 用 shadcn `Button variant="outline" size="icon"`，icon 用 `ChevronLeftIcon` / `ChevronRightIcon`（Lucide）
- 「今天」：`Button variant="ghost" size="sm"`，右側用 `<kbd>T</kbd>` tooltip
- 標題：`h2 className="text-base font-semibold tabular-nums"`
- View Tabs：shadcn Tabs，三個 TabsTrigger：「月/週/日」，鍵盤快捷 tooltip `M` `W` `D`
- Timezone：`text-xs text-muted-foreground`，滑鼠 hover 顯示完整 IANA 名（tooltip）

## Layout（mobile < 768px）

```
┌───────────────────────────────┐
│ [←][今天][→]  4 月 24 日 週五 │
└───────────────────────────────┘
```

- 隱藏 view Tabs（`hideViewTabs`）
- 標題縮短為「M 月 D 日 週X」
- timezone 隱藏（移到頁面最底部的 footer）

## 狀態

| 狀態 | 視覺 |
|------|------|
| isLoading | Prev/Next/Today 按鈕 disabled + `opacity-60` |
| viewChange | Tabs 指示條使用 `transition-all duration-150` |
| focus-visible | 所有按鈕 `ring-2 ring-ring ring-offset-2` |

## a11y

- Prev/Next 按鈕必須有 `aria-label`（如「前一個月」/「後一週」）
- 標題用 `<h2>` + `aria-live="polite"`（切換日期時朗讀新標題）
- Tabs 用 shadcn 預設 `role="tablist"` / `role="tab"`
- 快捷鍵提示以 `title`/tooltip 提供，**不可**只用視覺表達

## 範例
見 `examples.tsx#CalendarToolbarExample`
