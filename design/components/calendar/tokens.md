# 行事曆專用 Tokens

> 僅作用於 `/calendar` 頁面的元件，皆以 Tailwind class 表達，不在 globals.css 新增 CSS variable。

## 1. 視覺區分：Entry vs Gcal Event

| 類型 | 視覺語言 | Tailwind 建議 |
|------|---------|--------------|
| **Entry（知識條目）** | Solid/Secondary 卡片，主色系 | `bg-secondary text-secondary-foreground` 或 `bg-card border` |
| **Gcal Event（未連結）** | Outline + muted 底，與 entry 區隔 | `bg-muted/60 border border-dashed border-border text-foreground` |
| **Gcal Event（已連結 → entry）** | outline + success tint | `bg-success/10 border border-success/40 text-foreground` |
| **Journal 日記** | 主色細線點綴 | `border-l-2 border-primary pl-2` |

## 2. 日格狀態（DayCell）

| 狀態 | Tailwind |
|------|----------|
| default | `bg-card text-foreground` |
| hover | `hover:bg-muted/60 transition-colors` |
| today | `ring-1 ring-inset ring-primary/50 font-semibold` + 日期數字用 `bg-primary text-primary-foreground rounded-full` chip |
| selected | `bg-primary/10 ring-2 ring-inset ring-primary` |
| outside-month（非本月天數） | `text-muted-foreground/60 bg-muted/30` |
| weekend | header 文字 `text-muted-foreground` |
| focus-visible（鍵盤） | `outline-none ring-2 ring-ring ring-offset-2 ring-offset-background` |

## 3. Badge 與 Count

| 用途 | 元件 + class |
|------|-------------|
| Entry 數 | `<Badge variant="secondary">` 加 `rounded-full px-1.5 text-[10px]` |
| Event 數 | `<Badge variant="outline">` 加 `rounded-full px-1.5 text-[10px]` |
| 溢出「+3」 | `text-[10px] text-muted-foreground` |
| 日記 icon | Lucide `BookOpenIcon` `size={12}` `text-primary` |
| All-day badge | `<Badge variant="outline" className="text-[10px] h-4 px-1">全天</Badge>` |
| lifecycle / linked badge | `<Badge className="bg-success/15 text-success-foreground border-success/30">已連結</Badge>` |

## 4. 密度上限

| 視圖 | 每格最多顯示 |
|------|------------|
| MonthView DayCell | 2 個 event title（text truncate）+ 1 個 entry 計數 badge + 日記 icon；其餘以「+N 更多」折疊 |
| WeekView 時段 | events 為區塊，重疊時左右分欄（最多 3 欄，超過顯示「+N」點擊展開 popover） |
| DayView 時段 | events 無上限，entries chips 頂部最多 8 個 + 「更多」 |

## 5. 時間軸（WeekView / DayView）

- 顯示範圍：**06:00 ~ 24:00**（18 小時），早於 06:00 的事件摺疊為頂部「早於 06:00：N 件」chip 點擊展開
- 每小時格高：**48px**（mobile 56px）
- 刻度線：`border-t border-border/60`，整點粗線 `border-border`，半點細線 `border-border/30`
- 時間文字：`text-xs text-muted-foreground tabular-nums`，靠左時間欄寬 **56px**

## 6. 顏色對比與 a11y

- 所有文字對背景 ≥ WCAG AA（4.5:1）。僅用既有 shadcn token 即可通過
- `outside-month` 使用 `text-muted-foreground/60` 時，**仍需在 dark mode 驗證 ≥ 3:1**（大字體可接受）
- 焦點環一律使用 `ring-ring ring-2 ring-offset-2`

## 7. 鍵盤快捷鍵顯示

- 在 toolbar tooltip 中以 `<kbd>` 樣式呈現：`<kbd className="rounded border bg-muted px-1 text-[10px]">M</kbd>`
- 快捷鍵：`←/→` 切日、`PgUp/PgDn` 切月、`M/W/D` 切視圖、`T` 回到今天、`Esc` 關閉 Sheet
