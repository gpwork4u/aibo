# Mobile Fallback（< 768px）

手機版**強制切回 Day View**。Month / Week view 在此斷點下不渲染，避免密度過高無法使用。

## 判斷邏輯（給 engineer）

```tsx
const isMobile = useMediaQuery("(max-width: 767.98px)");
const effectiveView: CalendarView = isMobile ? "day" : view;

// URL 仍可保留 ?view=month（使用者從 desktop 分享連結），
// 但 render 時用 effectiveView。在 toolbar 顯示 hint「手機版僅支援日視圖」。
```

## Toolbar 簡化版

```
┌────────────────────────────────────────┐
│ [←] 4 月 24 日 星期五        [T] [→]  │  ← prev / 標題 / today / next
└────────────────────────────────────────┘
```

- 隱藏 view Tabs（`hideViewTabs=true`）
- 標題使用「M 月 D 日 週X」短格式
- timezone 移到頁面最底部 `<footer>` 內，小字顯示

## 頁面結構

```
┌──────────────────────────────────────┐
│  Toolbar（簡化）                      │
├──────────────────────────────────────┤
│  DayView                             │
│  - 今日條目 chips                    │
│  - 全天區塊                          │
│  - 時間軸（每小時 56px）              │
├──────────────────────────────────────┤
│  FAB「寫日記」（可選）                │
└──────────────────────────────────────┘
```

- 整頁容器：`px-3 py-3 space-y-3`
- DayView 內 TimeGrid 的 `max-h` 改為 `max-h-[calc(100dvh-220px)]`（保留 toolbar + chips + 底部空間）
- Chips 以 `flex-wrap gap-1.5` 排列，單個 chip `max-w-[22ch] truncate`

## DayDetailSheet in mobile

- `<SheetContent side="right" className="w-full">`（全寬滑出）
- 或改為 `side="bottom"` 的 bottom sheet（高度 85vh），**建議：保持 right full-width 以避免鍵盤衝突**
- 頂部留 `safe-area-inset-top`

## 手勢（選配，engineer 可評估）

- 左右滑（swipe）切日：使用 `pointer` events，閾值 > 64px
- 不強制實作，鍵盤/按鈕必須可用

## 空間節省

- EventBlock 字級 13px（`text-[13px]`）
- EntryMiniCard 去除 ChevronRight icon（節省 16px）
- Journal card 的按鈕 `w-full`

## a11y

- 鍵盤操作（外接鍵盤）仍須支援 `←/→` 切日
- 所有 icon button 保持 ≥ **44×44pt**（`h-11 w-11` 或 `size="lg"`）
- 字級最小 12px（`text-xs`），對比度 ≥ 4.5:1
