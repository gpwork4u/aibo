# CmdK Power Actions

## 用途
延伸 F-037 Command Palette skeleton，加入分組動作架構、即時後端搜尋、AI Action mode（`>` prefix）、以及快速建立 Entry 的 QuickCreateModal。

## 架構

```
CommandDialog（cmdk + shadcn Dialog）
├── CommandInput（搜尋框 / AI mode prefix 偵測）
├── AIModePrefixIndicator（`>` 前綴提示，AI mode 時顯示）
├── CommandList（最大高度 60vh，overflow-y: auto）
│   ├── CommandGroup "Navigation"
│   │   └── SearchResultItem（navigation type）
│   ├── CommandGroup "Create"
│   │   └── SearchResultItem（create type）
│   ├── CommandGroup "Search Results"（3+ chars 觸發）
│   │   └── SearchResultItem（entry type，含 category badge）
│   └── CommandGroup "AI Actions"（`>` prefix，隱藏其他分組）
│       └── AIActionItem（含 magic wand icon）
├── CommandEmpty（無結果提示）
└── CommandFooter（Kbd 提示列）
```

---

## SearchResultItem

**視覺結構**
```
[icon 20px]  主文字                 [category badge]
             副文字（entry 類型有）
```

**規格**
- 高度：44px（觸控目標最小值）
- Padding：`spacing.2 spacing.3`
- Icon：`w-5 h-5`，`color.fg.muted`
- 主文字：`font.size.sm`，`font.weight.medium`，`color.fg.default`
- 副文字：`font.size.xs`，`color.fg.muted`（entry 的 category 或 status）
- Category Badge：
  - 背景：`color.secondary.default`
  - 文字：`color.fg.muted`，`font.size.xs`
  - Border-radius：`radius.sm`
  - Padding：`spacing.0.5 spacing.1.5`
- Hover / selected 背景：`color.bg.subtle`
- 選中狀態：左側 3px accent 色條（`color.accent.default`）
- Border-radius：`radius.md`

**Types**
| type | Icon（Lucide） | 說明 |
|------|--------------|------|
| navigation | `Navigation`（或對應頁面圖示） | 頁面導航 |
| create | `Plus` | 建立動作 |
| entry | `FileText` | 搜尋結果 entry |

**Props**
| Prop | Type | Default | 說明 |
|------|------|---------|------|
| icon | ReactNode | - | 左側圖示 |
| title | string | - | 主文字 |
| subtitle | string | - | 副文字（可選） |
| badge | string | - | category badge 文字（可選） |
| kbd | string | - | 右側鍵盤提示（可選） |
| onSelect | () => void | - | 選中回調 |

---

## AIActionItem

**視覺結構**
```
[Sparkles icon 20px]  > 動作名稱           [Enter 執行]
                       動作描述文字
```

**規格**
- 與 SearchResultItem 相同尺寸和 padding
- Icon：Lucide `Sparkles`，`w-5 h-5`，`color.accent.default`（魔法棒效果）
- 主文字：`> {action}`，`font.size.sm`，`font.weight.medium`，`color.fg.default`
- 動作前綴 `>`：`color.accent.default`（強調 AI 模式）
- 描述：`font.size.xs`，`color.fg.muted`
- Kbd hint：`Enter 執行`

**AI Actions 清單**
| 指令 | 描述 | 行為 |
|------|------|------|
| `> summarize` | 摘要最近的 entries | 開啟 Copilot 並預填 prompt |
| `> find duplicates` | 找出重複筆記 | 開啟 Copilot 並預填 prompt |
| `> classify all inbox` | 批次分類 Inbox | POST /api/v1/entries/batch |
| `> help` | 查看鍵盤快捷鍵 | 開啟 ShortcutsModal |

---

## AIModePrefixIndicator

**視覺結構**
```
┌──────────────────────────────────────────────┐
│  [Sparkles icon] AI Mode  ← 顯示在搜尋框上方  │
└──────────────────────────────────────────────┘
```

**規格**
- 顯示條件：輸入值以 `>` 開頭
- 位置：CommandInput 上方，寬度 100%
- 高度：28px
- 背景：`color.accent.subtle`
- 文字："AI Mode"，`font.size.xs`，`color.accent.default`，`font.weight.medium`
- Icon：Lucide `Sparkles`，`w-3 h-3`，`color.accent.default`
- Padding：`spacing.1.5 spacing.3`
- 動畫：淡入 `opacity 0 → 1`，`150ms ease`

---

## QuickCreateModal

**用途**
從 CmdK 觸發的快速建立 Entry 表單，以 Dialog 方式呈現。

**視覺結構**
```
┌────────────────────────────────────────┐
│  New Entry                         [×] │
├────────────────────────────────────────┤
│  Title *                               │
│  ┌────────────────────────────────────┐│
│  │ Title（auto focus）                ││
│  └────────────────────────────────────┘│
│                                        │
│  Content（optional）                   │
│  ┌────────────────────────────────────┐│
│  │ Add a note...                      ││
│  │                                    ││
│  └────────────────────────────────────┘│
│                                        │
│  Tags（optional）                      │
│  ┌────────────────────────────────────┐│
│  │ [tag1] [tag2] [+ add tag]          ││
│  └────────────────────────────────────┘│
│                                        │
│     [Create as Draft]  [Create & Classify]│
└────────────────────────────────────────┘
```

**規格**
- Dialog 寬度：480px（`max-w-lg`）
- 標題列：`font.size.base`，`font.weight.semibold`
- 關閉按鈕：Lucide `X`，44×44px 觸控目標

**TitleInput**
- Auto focus（Dialog 開啟時）
- Placeholder：`"Entry title..."`
- 必填：空白時 CTA 按鈕 disabled
- 驗證錯誤訊息（title 為空時點擊）："Title is required"，`color.danger.default`，`font.size.xs`，顯示在欄位正下方
- Label：可見 `<label>` "Title"，加上 `*` 標示必填

**ContentTextarea**
- Label："Content（optional）"
- Placeholder：`"Add a note..."`
- Auto resize，min 3 行，max 6 行
- Label 可見

**TagInput**
- Label："Tags（optional）"
- Tag chip 樣式：
  - 背景：`color.secondary.default`
  - 文字：`color.fg.default`，`font.size.xs`
  - 刪除按鈕：Lucide `X`，`w-3 h-3`
  - Border-radius：`radius.full`
- 輸入框 placeholder：`"Add tag..."`
- Enter 鍵確認新增 tag
- 最多 10 個 tag

**CTA Buttons**
| 按鈕 | Variant | 行為 |
|------|---------|------|
| Create as Draft | secondary | POST `{ status: "inbox" }` → toast "Entry created" → 關閉 |
| Create & Classify | primary | POST `{ status: "inbox" }` → 觸發分類 API → toast "Entry created" → 關閉 |
- Title 為空時兩個按鈕均 disabled

**Loading 狀態**
- 點擊後按鈕顯示 Lucide `Loader2` spinner（`animate-spin`），disabled
- 文字："建立中..."

**Accessibility**
- `role="dialog"`，`aria-modal="true"`，`aria-labelledby="quick-create-title"`
- TitleInput：`aria-required="true"`，`aria-invalid` 驗證失敗時
- 錯誤訊息：`aria-describedby` 連結到錯誤文字 element
- Focus trap in Dialog
- Escape 關閉

---

## 模式切換行為

| 輸入內容 | 顯示分組 |
|---------|---------|
| 空白 | Navigation + Create（預設動作） |
| 1-2 字元 | Navigation + Create（過濾） |
| 3+ 字元 | Navigation + Create + Search Results（debounce 200ms） |
| `>` prefix | AI Actions 分組（隱藏其他） |

---

## 空結果狀態

**CommandEmpty**
- 文字：`找不到「{query}」的結果`
- 副文字：`試試建立新的 Entry，或輸入 > 使用 AI 指令`
- 居中對齊，`padding: spacing.8`
- 圖示：Lucide `Search`，`w-8 h-8`，`color.fg.subtle`

---

## 底部 Kbd 提示列（CommandFooter）

```
[ ↑↓ 導航 ]  [ Enter 選擇 ]  [ Esc 關閉 ]  [ > AI 模式 ]
```

- 使用 `Kbd` 元件（`design/components/kbd/`）
- 高度：36px
- 頂部邊框：`color.border.default`
- Padding：`spacing.2 spacing.3`
- 背景：`color.bg.subtle`

---

## Accessibility

- CommandDialog：`role="dialog"`，`aria-modal="true"`，`aria-label="命令面板"`
- CommandInput：`aria-label="搜尋或輸入指令"`，`aria-autocomplete="list"`
- CommandList：`role="listbox"`，`aria-label="搜尋結果"`
- 每個 CommandItem：`role="option"`，`aria-selected`
- CommandEmpty：`aria-live="polite"`
- AIModePrefixIndicator：`role="status"`，`aria-live="polite"`
- 開啟時 focus trap，Escape 關閉並 restore focus

## 使用範例

見 `example.tsx`
