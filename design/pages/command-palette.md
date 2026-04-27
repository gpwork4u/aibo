# Command Palette 頁面（Overlay）

## 對應 Feature
#196 F-037: Command Palette Skeleton

## 用途
全域命令入口，以 Dialog overlay 形式覆蓋在任意頁面之上。

## Overlay 結構圖

```
┌─────────────────────────────────────────────────────────────────┐
│  背景：color.overlay（深色 blur overlay，點擊關閉）              │
│                                                                   │
│         ┌────────────────────────────────────────┐               │
│         │ [Search icon]  搜尋或輸入指令...        │  ← Input     │
│         │ ─────────────────────────────────────── │              │
│         │                                         │  h-px        │
│         │ 最近使用                                │  ← Section  │
│         │                                         │  header      │
│         │ [icon] 今日會議紀錄        日誌          │  ← Item     │
│         │ [icon] 週報 2026-04        日誌          │             │
│         │ [icon] Q2 OKR 追蹤        資料庫    ←selected│        │
│         │                                         │              │
│         │ ─────────────────────────────────────── │              │
│         │                                         │              │
│         │ Actions                                 │              │
│         │                                         │              │
│         │ [icon] 新增筆記                    ⌘N   │              │
│         │ [icon] 開啟設定                    ⌘,   │              │
│         │                                         │              │
│         │ ─────────────────────────────────────── │              │
│         │ [↑][↓] 導航  [↵] 選擇  [Esc] 關閉      │  ← Footer   │
│         └────────────────────────────────────────┘               │
│                    w-[640px], max-h-[70vh]                        │
└─────────────────────────────────────────────────────────────────┘
```

## 尺寸規格

| 元素                | 尺寸                                           |
|--------------------|-----------------------------------------------|
| Dialog width       | `640px`（含 overflow 隱藏）                   |
| Dialog max-height  | `70vh`                                        |
| Dialog border-radius| `radius.xl`（16px）                          |
| Input 區高度       | `48px`                                        |
| Item 高度          | `44px`（觸控目標）                             |
| Section header     | `28px`                                        |
| Footer 高度        | `36px`                                        |
| Padding（左右）    | `spacing.0`（cmdk 內建處理）                  |

## Selected Item 左側色條
```css
.cmdk-item[aria-selected="true"] {
  background: var(--secondary);
  position: relative;
}
.cmdk-item[aria-selected="true"]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}
```

## 空結果狀態

```
┌────────────────────────────────────────────┐
│ [Search icon]  abc                         │
│ ─────────────────────────────────────────  │
│                                            │
│           [Search icon 32px]               │
│        找不到「abc」的結果                  │
│        試試其他關鍵字                        │
│                                            │
│ ─────────────────────────────────────────  │
│ [↑][↓] 導航  [↵] 選擇  [Esc] 關閉          │
└────────────────────────────────────────────┘
```

## 狀態說明

| 狀態      | 觸發條件            | 呈現                                    |
|----------|--------------------|-----------------------------------------|
| 預設      | 剛開啟，無輸入      | 最近使用 + Actions 兩個群組              |
| 輸入中    | 有搜尋文字          | 即時過濾，search icon 右側可顯示 spinner |
| 有結果    | 搜尋命中 >= 1 筆    | 分組顯示，第一筆 auto-selected           |
| 空結果    | 搜尋命中 0 筆       | 居中「找不到結果」提示                   |
| API 錯誤  | 搜尋失敗            | 居中錯誤提示 + 重試按鈕                  |

## 動畫規格

| 動畫           | 效果                                               | 時長   |
|---------------|---------------------------------------------------|--------|
| Dialog 開啟   | `scale(0.96) opacity(0) → scale(1) opacity(1)`    | 150ms  |
| Dialog 關閉   | `scale(1) opacity(1) → scale(0.96) opacity(0)`    | 100ms  |
| Item hover    | `background-color`                                | 100ms  |
| `prefers-reduced-motion` | 移除 scale transform，保留 opacity   | —      |

## 元件使用

| 元件        | 用途                        |
|------------|-----------------------------|
| CommandDialog（shadcn）| 外框 Dialog + cmdk       |
| CommandInput| 搜尋輸入框                  |
| CommandList | 結果列表容器（scroll）      |
| CommandGroup| 群組容器（含群組 heading）  |
| CommandItem | 單一結果項目                |
| CommandEmpty| 空結果狀態                  |
| CommandSeparator| 群組分隔線              |
| Kbd         | 底部提示 + item 右側 kbd hint|

## 色彩 Token

| 元素               | Token                           |
|-------------------|---------------------------------|
| Overlay 背景       | `color.overlay`                 |
| Dialog 背景        | `color.card.default`            |
| Input 文字         | `color.fg.default`              |
| Placeholder        | `color.fg.subtle`               |
| Section header     | `color.fg.subtle`               |
| Item 預設          | `color.fg.default`              |
| Item hover bg      | `color.bg.subtle`               |
| Item selected bg   | `color.secondary.default`       |
| Item selected bar  | `color.accent.default`          |
| Divider            | `color.border.default`          |
| Footer text        | `color.fg.subtle`               |
| Kbd bg             | `color.bg.muted`                |
| Kbd border         | `color.border.default`          |
