# CopilotPanel

## 用途
App Shell 右側的 resizable AI 對話面板。使用者可透過 ⌘J 或 sidebar icon 開關，並與知識庫進行上下文對話。面板不遮蓋主內容區，而是將主內容擠縮。

## 子元件

### CopilotPanel（容器）

**視覺結構**

```
┌─────────────────────┐
│  CopilotHeader      │  高度 52px
├─────────────────────┤
│                     │
│  MessageList        │  flex-1，overflow-y: auto
│  （虛擬化捲動）     │
│   ┌───────────────┐ │
│   │ AssistantMsg  │ │  左對齊
│   └───────────────┘ │
│         ┌──────────┐│
│         │ UserMsg  ││  右對齊
│         └──────────┘│
│   ┌───────────────┐ │
│   │ TypingIndicator│ │  streaming 中顯示
│   └───────────────┘ │
│                     │
├─────────────────────┤
│  InputArea          │  min-height 68px
└─────────────────────┘
   ↑
   ResizeHandle（左側，垂直線，可拖拽）
```

**尺寸**
- 預設寬度：360px
- 最小寬度：240px
- 最大寬度：600px
- 高度：100%（填滿 shell 高度，排除 Navbar）

**色彩（Token）**
- Panel 背景：`color.bg.subtle`（輕度區分主內容區）
- 左側邊框：`color.border.default`（1px）
- ResizeHandle 顏色：`color.border.strong`

**動畫**
- 開啟：右側滑入，`transform: translateX(100%) → translateX(0)`，`300ms ease-out`
- 關閉：右側滑出，`transform: translateX(0) → translateX(100%)`，`200ms ease-in`
- 尊重 `prefers-reduced-motion`（僅用 opacity 替代）

**Props**
| Prop | Type | Default | 說明 |
|------|------|---------|------|
| isOpen | boolean | false | 面板開關狀態 |
| onClose | () => void | - | 關閉回調 |
| defaultWidth | number | 360 | 初始寬度（px） |
| minWidth | number | 240 | 最小寬度（px） |
| maxWidth | number | 600 | 最大寬度（px） |

---

### CopilotHeader

**視覺結構**
```
┌─────────────────────────────────────┐
│ [BotIcon] Copilot   [clear] [×]     │
└─────────────────────────────────────┘
```

**規格**
- 高度：52px
- 標題：`font.size.sm`，`font.weight.semibold`，`color.fg.default`
- BotIcon：Lucide `Bot`，`w-4 h-4`，`color.fg.muted`
- "Clear session" 連結：`font.size.xs`，`color.fg.muted`，hover 時 `color.fg.default`
- 關閉按鈕：Lucide `X`，`w-4 h-4`，觸控目標 44×44px，hover `color.fg.default`
- 底部邊框：`color.border.default`

**Accessibility**
- 關閉按鈕：`aria-label="關閉 Copilot 面板"`
- Clear session 按鈕：`aria-label="清除對話記錄"`

---

### UserMessage

**視覺結構**
```
                    ┌──────────────────┐
                    │ 使用者訊息文字   │
                    └──────────────────┘
```

**規格**
- 對齊：右對齊（`justify-end`）
- 氣泡背景：`color.primary.default`
- 氣泡文字：`color.primary.fg`
- Border-radius：`radius.lg radius.lg radius.sm radius.lg`（左下角小）
- Padding：`spacing.3 spacing.4`
- 最大寬度：80%
- Font size：`font.size.sm`
- Line height：`font.lineHeight.relaxed`
- Margin：`spacing.1`（上下）

---

### AssistantMessage

**視覺結構**
```
┌──────────────────┐
│ AI 回應文字|     │  ← `|` 為游標（streaming 中 blink）
└──────────────────┘
```

**規格**
- 對齊：左對齊（`justify-start`）
- 氣泡背景：`color.card.default`
- 氣泡文字：`color.fg.default`
- 氣泡邊框：`color.border.default`（1px）
- Border-radius：`radius.lg radius.lg radius.lg radius.sm`（左下角小）
- Padding：`spacing.3 spacing.4`
- 最大寬度：85%
- Font size：`font.size.sm`
- Line height：`font.lineHeight.relaxed`

**Streaming 游標**
- 字元：`|`（U+007C vertical bar）
- 動畫：CSS `@keyframes blink`，`opacity 1 → 0 → 1`，`1s step-start infinite`
- 游標 class：`inline-block w-[2px] h-[1em] ml-[1px] align-middle bg-current animate-blink`
- `prefers-reduced-motion`：游標靜止不動

**狀態**
| 狀態 | 外觀 |
|------|------|
| streaming | 尾端顯示 blink 游標 |
| 截斷（Panel 關閉中斷） | 文字末尾顯示 "…"（`<span className="text-fg-muted">…</span>`） |
| 完成 | 無游標 |

---

### TypingIndicator

**視覺結構**
```
┌──────────────────┐
│ • • •            │  三點以不同相位 bounce
└──────────────────┘
```

**規格**
- 氣泡大小：與 AssistantMessage 相同樣式
- 寬度：56px（固定）
- 三個點：`w-2 h-2`，`border-radius: full`，`color.fg.muted`
- 動畫：`@keyframes typingBounce`，各點 delay 0ms / 150ms / 300ms
  - `transform: translateY(0) → translateY(-6px) → translateY(0)`，`600ms ease-in-out infinite`
- `prefers-reduced-motion`：靜止顯示三點（無動畫）
- 顯示條件：`isStreaming === true`，以 `AnimatePresence`（framer-motion）或 CSS `transition` 淡入淡出

---

### CopilotInputArea

**視覺結構**
```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │ Textarea（Enter 送出）        │  │
│  └───────────────────────────────┘  │
│                         [SendButton]│
└─────────────────────────────────────┘
```

**Textarea 規格**
- 高度：min 44px，max 120px，auto resize
- Font size：`font.size.sm`
- Placeholder：`"Ask me anything about your knowledge base."`（顏色 `color.fg.subtle`）
- Padding：`spacing.3 spacing.4`
- Background：`color.bg.default`
- Border：`color.border.default`（1px）
- Border-radius：`radius.lg`
- Focus ring：`color.border.focus`（2px）
- 行為：Enter 送出，Shift+Enter 換行

**SendButton 規格**
- Icon：Lucide `SendHorizontal`，`w-4 h-4`
- Size：44×44px（觸控目標）
- 顏色（正常）：`color.primary.default` 背景，`color.primary.fg` icon
- 顏色（disabled）：`color.secondary.default` 背景，`color.fg.muted` icon，`opacity-50`
- Border-radius：`radius.lg`
- 禁用條件：`isStreaming === true` 或 textarea 為空
- `aria-label="送出訊息"`

**區域整體**
- 頂部邊框：`color.border.default`（1px）
- Padding：`spacing.3`
- Background：`color.bg.subtle`

---

### Empty / Welcome State

**視覺結構**
```
┌─────────────────────────────────────┐
│                                     │
│      [BotIcon 48px]                 │
│   Ask me anything about your        │
│   knowledge base.                   │
│                                     │
│   ┌────────────────────────────┐    │
│   │ "Summarize recent entries" │    │  ← 建議提示 chip
│   └────────────────────────────┘    │
└─────────────────────────────────────┘
```

**規格**
- 垂直居中，`flex flex-col items-center gap-4`
- Icon：Lucide `Bot`，`w-12 h-12`，`color.fg.subtle`
- 主文字：`font.size.sm`，`color.fg.muted`，居中
- Suggestion chips：
  - 背景：`color.secondary.default`
  - 文字：`color.fg.default`，`font.size.xs`
  - Border：`color.border.default`
  - Border-radius：`radius.full`
  - Padding：`spacing.1.5 spacing.3`
  - 點擊後填入 textarea

## States

| 狀態 | 外觀描述 |
|------|---------|
| 關閉 | Panel 不可見，translateX(100%) |
| 開啟（空） | 顯示 Welcome state |
| 對話中（正常） | MessageList 顯示訊息記錄 |
| Streaming | TypingIndicator 可見，SendButton disabled |
| SSE 連線失敗 | Toast 通知，InputArea 仍可操作（允許重試） |

## Accessibility

- Panel container：`role="complementary"`，`aria-label="Copilot AI 助手"`
- MessageList：`role="log"`，`aria-live="polite"`，`aria-label="對話記錄"`
- 每則訊息：`role="article"`
- UserMessage：`aria-label="你：{content}"`
- AssistantMessage：`aria-label="Copilot：{content}"`（streaming 中附加 `aria-busy="true"`）
- TypingIndicator：`aria-label="Copilot 正在輸入"`，`aria-live="assertive"`
- InputArea Textarea：`aria-label="輸入訊息"`，`aria-multiline="true"`
- 面板開關：鍵盤 ⌘J，Escape 關閉
- focus trap：面板開啟時 Tab 鍵限定在面板內

## ResizeHandle

**規格**
- 位置：面板左邊緣
- 寬度：8px 可拖拽熱區（視覺上 2px 線條）
- 游標：`col-resize`
- 顏色：透明背景，hover 時顯示 `color.border.focus`（2px 線）
- 拖拽時：`user-select: none`，全域 `mousemove` + `mouseup` listener
- `aria-label="調整面板寬度"`，`role="separator"`，`aria-orientation="vertical"`

## 使用範例

見 `example.tsx`
