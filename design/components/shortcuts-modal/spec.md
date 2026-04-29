# ShortcutsModal

## 用途
以 Dialog 呈現 App 所有鍵盤快捷鍵的視覺總覽。`?` 鍵觸發，Escape 或 × 按鈕關閉。快捷鍵以 `Kbd` 元件渲染，依功能分為 5 個 Section。

## 觸發方式
- 鍵盤：`?`（全域，非 input focus 狀態）
- CmdK 中輸入 `> help`
- AI Action "help" 選項

## 視覺結構

```
┌──────────────────────────────────────────────────┐
│  Keyboard Shortcuts                          [×]  │  ← Dialog header，height 56px
├──────────────────────────────────────────────────┤
│                                                  │
│  Navigation                                      │  ← Section heading
│  ┌────────────────────────────────────────────┐  │
│  │ Open Command Palette      [⌘] [K]          │  │  ← ShortcutRow
│  │ Open/Close Copilot        [⌘] [J]          │  │
│  │ Go to Inbox               [G] [I]          │  │
│  │ Go to Library             [G] [L]          │  │
│  │ Go to Today               [G] [T]          │  │
│  │ Go to Canvas              [G] [C]          │  │
│  │ Go to Settings            [G] [S]          │  │
│  │ Shortcuts Help            [?]              │  │
│  │ Close Overlay             [Esc]            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Inbox                                           │
│  ┌────────────────────────────────────────────┐  │
│  │ Next item                 [J]              │  │
│  │ Previous item             [K]              │  │
│  │ Expand/Edit               [Enter]          │  │
│  │ Archive                   [A]              │  │
│  │ Delete                    [D]              │  │
│  │ Quick edit title          [E]              │  │
│  │ Multi-select toggle       [Space]          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Library                                         │
│  ┌────────────────────────────────────────────┐  │
│  │ Move up/down              [J] / [K]        │  │
│  │ Open detail               [Enter]          │  │
│  │ Focus search              [/]              │  │
│  │ Clear search / Close sheet [Esc]           │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Entry                                           │
│  ┌────────────────────────────────────────────┐  │
│  │ Enter edit mode           [E]              │  │
│  │ Save                      [⌘] [S]          │  │
│  │ Close sheet               [Esc]            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Copilot                                         │
│  ┌────────────────────────────────────────────┐  │
│  │ Send message              [Enter]          │  │
│  │ New line                  [Shift] [Enter]  │  │
│  │ Open Command Palette      [⌘] [K]          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

## 尺寸

- Dialog 寬度：`560px`（`max-w-xl`）
- 最大高度：`80vh`，內容區 `overflow-y: auto`
- Section 間距：`spacing.6`（24px）

## ShortcutRow

**視覺結構**
```
描述文字                     [Kbd] [Kbd]
```

**規格**
- 高度：40px（min-height）
- 描述文字：`font.size.sm`，`color.fg.default`，`flex-1`
- Kbd 組合：`flex gap-1`，右側對齊
- 偶數行背景：無差異（統一 `color.bg.default`）
- Hover：`color.bg.subtle`，`border-radius: radius.md`
- Padding：`spacing.1.5 spacing.2`

## Kbd 元件規格（沿用 design/components/kbd/spec.md）

| 屬性 | 值 |
|------|-----|
| 標籤 | 語義化 `<kbd>` HTML element |
| 字型 | `font.family.mono` |
| 字級 | `font.size.xs`（12px） |
| 顏色 | `color.fg.muted` |
| 背景 | `color.bg.muted` |
| 邊框 | `color.border.default`（1px） |
| 底部陰影 | `0 1px 0 0 color.border.default`（立體感） |
| Border-radius | `radius.sm`（4px） |
| Padding | `px-1.5 py-0.5` |

**特殊 Kbd 字元對照**

| 按鍵 | 顯示字元 | aria-label |
|------|---------|------------|
| Command（macOS） | `⌘` | "Command" |
| Shift | `Shift` | "Shift" |
| Enter | `↵` 或 `Enter` | "Enter" |
| Escape | `Esc` | "Escape" |
| Space | `Space` | "Space" |
| Slash | `/` | "Slash" |
| Question mark | `?` | "Question mark" |
| Arrow keys | `↑` `↓` `←` `→` | "Up / Down / Left / Right arrow" |
| Sequential G | `G` 後加 `→` 符號則用兩個 Kbd | - |

## Section Heading

- Font：`font.size.xs`，`font.weight.semibold`，`letter-spacing: wider`，uppercase
- Color：`color.fg.subtle`
- Margin-bottom：`spacing.2`
- Padding-bottom：`spacing.1`
- 底部邊框：`color.border.default`（1px）

## Dialog Header

- 高度：56px
- 標題：Lucide `Keyboard`（`w-4 h-4`，`color.fg.muted`）+ "Keyboard Shortcuts"，`font.size.base`，`font.weight.semibold`
- 關閉按鈕：Lucide `X`，44×44px 觸控目標，`aria-label="關閉快捷鍵說明"`
- 底部邊框：`color.border.default`

## 動畫

- Dialog open：`scale(0.96) opacity 0 → scale(1) opacity 1`，`150ms ease`
- Dialog close：反向，`100ms ease`
- 尊重 `prefers-reduced-motion`（只用 opacity）

## Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| open | boolean | false | 控制開關 |
| onOpenChange | (open: boolean) => void | - | 狀態回調 |

## Accessibility

- `role="dialog"`，`aria-modal="true"`，`aria-labelledby="shortcuts-modal-title"`
- 開啟時 focus trap，第一個 focusable 元素為關閉按鈕
- Escape 鍵關閉
- 每個 `<kbd>` 元素包含 `aria-label` 說明完整按鍵名稱
- Section heading 以 `<h3>` 語義標籤
- 複合快捷鍵（如 ⌘K）：`aria-label="Command K"`

## 快捷鍵資料結構

```typescript
interface ShortcutSection {
  id: string;
  title: string;
  shortcuts: ShortcutItem[];
}

interface ShortcutItem {
  description: string;
  keys: string[];         // 顯示在 Kbd 中的字串陣列
  ariaLabels?: string[];  // 對應每個 key 的 aria-label
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    id: "navigation",
    title: "Navigation",
    shortcuts: [
      { description: "Open Command Palette", keys: ["⌘", "K"], ariaLabels: ["Command", "K"] },
      { description: "Open/Close Copilot", keys: ["⌘", "J"], ariaLabels: ["Command", "J"] },
      { description: "Go to Inbox", keys: ["G", "I"] },
      { description: "Go to Library", keys: ["G", "L"] },
      { description: "Go to Today", keys: ["G", "T"] },
      { description: "Go to Canvas", keys: ["G", "C"] },
      { description: "Go to Settings", keys: ["G", "S"] },
      { description: "Shortcuts Help", keys: ["?"] },
      { description: "Close Overlay", keys: ["Esc"] },
    ],
  },
  {
    id: "inbox",
    title: "Inbox",
    shortcuts: [
      { description: "Next item", keys: ["J"] },
      { description: "Previous item", keys: ["K"] },
      { description: "Expand / Edit", keys: ["Enter"] },
      { description: "Archive", keys: ["A"] },
      { description: "Delete", keys: ["D"] },
      { description: "Quick edit title", keys: ["E"] },
      { description: "Multi-select toggle", keys: ["Space"] },
    ],
  },
  {
    id: "library",
    title: "Library",
    shortcuts: [
      { description: "Move up / down", keys: ["J", "/", "K"] },
      { description: "Open detail", keys: ["Enter"] },
      { description: "Focus search", keys: ["/"] },
      { description: "Clear search / Close sheet", keys: ["Esc"] },
    ],
  },
  {
    id: "entry",
    title: "Entry",
    shortcuts: [
      { description: "Enter edit mode", keys: ["E"] },
      { description: "Save", keys: ["⌘", "S"], ariaLabels: ["Command", "S"] },
      { description: "Close sheet", keys: ["Esc"] },
    ],
  },
  {
    id: "copilot",
    title: "Copilot",
    shortcuts: [
      { description: "Send message", keys: ["Enter"] },
      { description: "New line", keys: ["Shift", "Enter"] },
      { description: "Open Command Palette", keys: ["⌘", "K"], ariaLabels: ["Command", "K"] },
    ],
  },
];
```

## 使用範例

見 `example.tsx`
