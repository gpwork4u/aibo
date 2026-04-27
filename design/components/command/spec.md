# Command Palette（CmdK wrapper）

## 用途
全域快速搜尋 / 命令入口，⌘K 觸發。包裝 `cmdk` 套件，並與 shadcn Dialog 整合。

## 觸發方式
- 鍵盤：`⌘K`（macOS）/ `Ctrl+K`（Windows/Linux）
- TopBar SearchTrigger 按鈕點擊
- 任何頁面皆可觸發

## 視覺結構

```
┌────────────────────────────────────────┐  寬度：640px
│  ┌────────────────────────────────┐    │  最大高度：70vh
│  │ [Search icon] 搜尋或輸入指令...│    │  backdrop-blur + overlay
│  └────────────────────────────────┘    │  border-radius: radius.xl
│  ────────────────────────────────────  │
│  最近使用                              │  ← 群組標題（xs, uppercase, fg.muted）
│  ┌────────────────────────────────┐    │
│  │ [icon] 今日會議紀錄    category│    │  ← 結果 item
│  │ [icon] 週報 2026-04           │    │
│  └────────────────────────────────┘    │
│  ────────────────────────────────────  │
│  Actions                               │
│  │ [icon] 新增筆記         ⌘N   │    │
│  │ [icon] 開啟設定         ⌘,   │    │
│  ────────────────────────────────────  │
│  [ ↑↓ 導航 ]  [ Enter 選擇 ]  [ Esc 關閉 ] │  ← 底部提示列（Kbd 元件）
└────────────────────────────────────────┘
```

## 尺寸
- Width: `640px`（含 Dialog padding）
- Max-height: `70vh`
- Search input height: `48px`
- Item height: `44px`（觸控目標）
- Section header height: `28px`

## 色彩（Token 對應）
- Overlay：`color.overlay`（semi-transparent blur）
- Dialog bg：`color.card.default`
- Search input bg：透明（inherit）
- Divider：`color.border.default`
- Item hover bg：`color.bg.subtle`
- Item selected bg：`color.secondary.default`
- Selected 左側色條：`color.accent.default`（3px）

## 結果 Item 結構

```
[icon 20px] [主文字 body-sm] [副文字 caption] ........... [kbd hint]
```

- Icon: `w-5 h-5`，`color: fg.muted`
- 主文字：`text-sm font-medium`
- 副文字：`text-xs text-fg-muted`
- Kbd hint：`Kbd` 元件，右側對齊

## 群組標題
- Font: `xs`，`uppercase`，`letter-spacing: wider`
- Color: `fg.subtle`
- Padding: `spacing.2 spacing.3`
- 不可 focus / 不計入 keyboard navigation

## 底部提示列
使用 `Kbd` 元件：
- `↑` `↓`：導航
- `↵`（Enter）：選擇
- `Esc`：關閉
- 排列：`flex gap-4 px-3 py-2 border-top`

## 狀態

| 狀態          | 外觀                                         |
|-------------|---------------------------------------------|
| 預設（無輸入）| 顯示最近使用 + 建議 Actions                  |
| 輸入中        | 即時過濾結果，顯示搜尋圖示 spinner            |
| 有結果        | 分組顯示，第一項自動 selected                 |
| 空結果        | 居中「找不到「{query}」的結果」 + 建議文字    |
| API 錯誤      | 居中錯誤提示 + 重試按鈕                       |

## 動畫
- Dialog open：`scale(0.96) → scale(1)`，`opacity 0 → 1`，`150ms ease`
- Dialog close：`scale(1) → scale(0.96)`，`opacity 1 → 0`，`100ms ease`
- Item selection：`background 100ms ease`
- 尊重 `prefers-reduced-motion`

## Props（CommandDialog wrapper）

| Prop       | Type           | Default | 說明                   |
|------------|----------------|---------|----------------------|
| open       | boolean        | -       | 控制開關狀態           |
| onOpenChange| (open: boolean) => void | - | 狀態回調        |
| placeholder| string         | '搜尋或輸入指令...' | 輸入框提示文字 |

## Accessibility
- `role="dialog"`，`aria-modal="true"`，`aria-label="Command palette"`
- 開啟時 focus trap 在 Dialog 內
- `Esc` 關閉並 restore focus 到觸發元素
- Search input：`aria-label="搜尋"`，`aria-autocomplete="list"`
- 結果 list：`role="listbox"`
- 每個 item：`role="option"`，`aria-selected`
- 空結果：`aria-live="polite"`

## 使用範例
見 `example.tsx`
