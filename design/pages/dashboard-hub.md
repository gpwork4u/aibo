# Dashboard Hub 頁面

## 對應 Feature
#195 F-036: App Shell + Hybrid Routing — Dashboard 為預設首頁（`/`）

## 用途
App 啟動後的主視圖，以 4 個平行 slot 呈現 Inbox、Library、今日行程、Copilot 的摘要預覽。

## Layout（桌面 >= 1024px）

```
┌──────────────────────────────────────────────────────────────────┐
│  TopBar（h-14, fixed）                                           │
│  [ PanelLeft ]  [ Search... ⌘K ]          [ Bot ] [ Theme ] [U] │
├────────────┬─────────────────────────────────────────────────────┤
│            │  max-w-[1200px] mx-auto px-6 py-6                   │
│  Sidebar   │                                                      │
│  (240px)   │  Page Header                                         │
│            │  ┌─────────────────────────────────────────────┐    │
│  [logo]    │  │ h2: 早安，{username}                         │    │
│            │  │ p: 今天是 2026-04-27，有 3 件事待處理        │    │
│  Inbox  ←  │  └─────────────────────────────────────────────┘    │
│  Library   │                                                      │
│  今日      │  Dashboard Grid（gap-6）                             │
│  Canvas    │  ┌──────────────────┐  ┌──────────────────┐        │
│            │  │ Inbox Card       │  │ Library Card     │        │
│  ─────     │  │                  │  │                  │        │
│  Settings  │  │ [icon] Inbox     │  │ [icon] Library   │        │
│  [avatar]  │  │ 3 則未處理項目   │  │ 最近文件列表     │        │
│            │  │              →   │  │              →   │        │
│            │  └──────────────────┘  └──────────────────┘        │
│            │  ┌──────────────────┐  ┌──────────────────┐        │
│            │  │ Today Card       │  │ Copilot Card     │        │
│            │  │                  │  │                  │        │
│            │  │ [icon] 今日      │  │ [icon] Copilot   │        │
│            │  │ 2 件行程         │  │ 詢問 AI 建議...  │        │
│            │  │              →   │  │              →   │        │
│            │  └──────────────────┘  └──────────────────┘        │
└────────────┴─────────────────────────────────────────────────────┘
```

## Layout（平板 768-1023px）

```
┌──────────────────────────────────────────┐
│  TopBar（h-14）                           │
│  [ Menu ]  [ Search... ]     [ Theme ][U] │
├────────┬─────────────────────────────────┤
│Sidebar │  px-4 py-4                       │
│(64px   │                                  │
│collapsed│  Page Header                   │
│        │  ┌────────────────────────────┐  │
│[icons] │  │ 早安，{username}            │  │
│        │  └────────────────────────────┘  │
│        │                                  │
│        │  Grid（2 columns, gap-4）        │
│        │  ┌──────────┐  ┌──────────┐     │
│        │  │ Inbox    │  │ Library  │     │
│        │  └──────────┘  └──────────┘     │
│        │  ┌──────────┐  ┌──────────┐     │
│        │  │ Today    │  │ Copilot  │     │
│        │  └──────────┘  └──────────┘     │
└────────┴─────────────────────────────────┘
```

## Layout（Mobile < 768px）

```
┌─────────────────────────┐
│  TopBar（h-14）          │
│  [ Menu ] Search  [U]   │
├─────────────────────────┤
│  px-4 py-4              │
│                         │
│  早安，{username}        │
│  今天是 2026-04-27       │
│                         │
│  ┌─────────────────┐    │
│  │   Inbox Card    │    │
│  └─────────────────┘    │
│  ┌─────────────────┐    │
│  │  Library Card   │    │
│  └─────────────────┘    │
│  ┌─────────────────┐    │
│  │   Today Card    │    │
│  └─────────────────┘    │
│  ┌─────────────────┐    │
│  │  Copilot Card   │    │
│  └─────────────────┘    │
│                         │
└─────────────────────────┘
```

## 使用的元件

| 元件               | 規格位置                                | 用途                        |
|-------------------|-----------------------------------------|-----------------------------|
| AppShell          | `components/layout-shell/spec.md`       | 整體殼層                    |
| Card（x4）        | `components/card/spec.md`               | Dashboard 4 個 slot 卡片   |
| PillNav           | `components/pill-nav/spec.md`           | Sidebar 導航                |
| Button（link）    | `components/button/spec.md`             | 「查看更多 →」              |
| Skeleton          | shadcn/ui                               | 卡片 loading state          |

## 狀態 Mocks

### 1. 預設展開（正常載入）
- 所有卡片顯示真實資料
- Inbox badge 顯示未讀計數

### 2. 部分載入中（Skeleton）
- 某一卡片 CardContent 以 Skeleton 替換
- CardHeader 仍正常顯示 icon + title
- `aria-busy="true"` on CardContent

### 3. 某卡片錯誤
- 對應 CardErrorState（見 card/example.tsx）
- Border 變 `color.danger.default`
- 顯示錯誤訊息 + 重試按鈕

### 4. Dark Mode
- 所有色彩切換為 `color.dark.*` tokens
- Card bg：`color.dark.card.default`（深色）
- 邊框：`color.dark.border.default`

## Page Header 規格

```tsx
<section aria-label="Dashboard 歡迎訊息" className="mb-6">
  <h1 className="text-2xl font-semibold text-[color:var(--fg-default)]">
    早安，{username}
  </h1>
  <p className="text-sm text-[color:var(--fg-muted)] mt-1">
    今天是 {formattedDate}，有 {pendingCount} 件事待處理
  </p>
</section>
```

## 卡片排列（Grid CSS）

```css
/* Tailwind v4 */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem; /* spacing.4 */
}

@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem; /* spacing.4 */
  }
}

@media (min-width: 1024px) {
  .dashboard-grid {
    gap: 1.5rem; /* spacing.6 */
  }
}
```
