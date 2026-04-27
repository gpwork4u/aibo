# Login 頁面

## 對應 Feature
F-036（App Shell routing，bare layout — 不含 Sidebar/TopBar）

## 用途
API Key 登入入口，極簡卡片置中佈局。

## Layout

```
┌─────────────────────────────────────────────┐
│  背景：color.bg.subtle（米白）               │
│                                              │
│                                              │
│         ┌────────────────────────┐           │
│         │ [Logo]  aibo           │  w-96     │
│         │                        │           │
│         │ ─────────────────────  │           │
│         │                        │           │
│         │  登入你的 aibo          │           │
│         │  輸入 API Key 以繼續    │           │
│         │                        │           │
│         │  API Key               │           │
│         │  [─────────────────]   │           │
│         │  取得 API Key →        │           │
│         │                        │           │
│         │  [        登入        ]│           │
│         │                        │           │
│         │  ← 錯誤時顯示          │           │
│         │  [!] 無效的 API Key    │           │
│         └────────────────────────┘           │
│                                              │
└─────────────────────────────────────────────┘
```

## Card 規格
- Width：`w-full max-w-sm`（384px）
- 置中：`min-h-screen flex items-center justify-center`
- Background：`color.bg.subtle`（頁面底層）
- Card variant：`default`（白底 + 邊框 + shadow.sm）
- Card padding：`spacing.8`（32px）

## 內容規格

### Logo 區
- Logo：文字 "aibo"，`font.display`，`2xl`，`font-bold`
- Subtitle：`text-sm text-fg-muted`，`margin-bottom: spacing.6`

### Form
- Label：`API Key`（visible，required indicator）
- Input：`type="password"`，`placeholder="sk-..."`，`size="md"`
- 連結：「如何取得 API Key？」`variant="link"` Button，`size="sm"`
- Submit Button：`variant="default"`，`size="lg"`，`fullWidth`，submit 時 `loading`

### 錯誤狀態
- 位置：Submit Button 上方
- 樣式：`role="alert"` 容器，`border color.danger.default`，`bg color.danger.subtle`
- 圖示：AlertCircle，`w-4 h-4`
- 文字：`text-sm text-danger`

## 色彩 Token

| 元素           | Token                        |
|---------------|------------------------------|
| 頁面背景       | `color.bg.subtle`            |
| Card 背景      | `color.card.default`         |
| Logo           | `color.fg.default`           |
| Input border（focus）| `color.border.focus`  |
| 錯誤文字       | `color.danger.default`       |
| 錯誤背景       | `color.danger.subtle`        |
| CTA Button     | `color.primary.default`      |

## 響應式

| 斷點      | 變化                                  |
|----------|--------------------------------------|
| >= 640px | Card 居中，padding-x 24px            |
| < 640px  | 全寬，padding-x 16px，`rounded-none` |

## Accessibility
- `<main>` 包覆整個頁面
- Form `aria-label="API Key 登入"`
- Input 必須有 `<label>`（不用 placeholder 替代）
- Submit 按鈕 loading 時：`aria-busy="true"`，`aria-label="登入中"`
- 錯誤訊息：`role="alert"`，`aria-live="assertive"`
- `autofocus` on API Key input
