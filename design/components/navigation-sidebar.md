# Navigation Sidebar 元件規格

## 概述

左側導航欄使用 shadcn/ui 的 Sidebar 元件，提供全域導航和 Inbox 數量指示。支援展開/收合。

## 基礎元件

- **來源**：`shadcn/ui` Sidebar
- **底層**：Radix UI + 自訂 Sidebar context
- **圖示**：Lucide Icons

## 結構

```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      {/* Logo + 應用名稱 */}
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>主要功能</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {/* 導航項目 */}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>設定</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {/* 設定項目 */}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      {/* 版本資訊 */}
    </SidebarFooter>
  </Sidebar>
  <SidebarInset>
    {/* 主要內容區域 */}
  </SidebarInset>
</SidebarProvider>
```

## 導航項目

| 群組 | 項目 | Icon | 路由 | Badge |
|------|------|------|------|-------|
| 主要功能 | Inbox | `Inbox` | `/inbox` | 未分類條目數量 |
| 主要功能 | 知識條目 | `FileText` | `/entries` | - |
| 主要功能 | 分類管理 | `FolderTree` | `/categories` | - |
| 設定 | API Key | `Key` | `/settings/api-keys` | - |
| 設定 | LLM Provider | `Bot` | `/settings/llm-providers` | - |

## 樣式規格

### Sidebar 容器

| 屬性 | 值 |
|------|-----|
| 展開寬度 | `w-64` (256px) |
| 收合寬度 | `w-16` (64px) |
| 背景 | `bg-sidebar-background` |
| 邊框 | `border-r border-sidebar-border` |
| 高度 | `h-screen` (滿版) |
| 位置 | `fixed`（mobile）/ `sticky`（desktop） |

### Header

```tsx
<SidebarHeader className="p-4">
  <div className="flex items-center gap-2">
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
      A
    </div>
    <span className="text-lg font-semibold">aibo</span>
  </div>
</SidebarHeader>
```

### 導航項目

```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild isActive={pathname === "/inbox"}>
    <Link href="/inbox">
      <Inbox className="h-4 w-4" />
      <span>Inbox</span>
    </Link>
  </SidebarMenuButton>
  <SidebarMenuBadge>12</SidebarMenuBadge>
</SidebarMenuItem>
```

| 狀態 | 樣式 |
|------|------|
| Default | `text-sidebar-foreground` |
| Hover | `bg-sidebar-accent text-sidebar-accent-foreground` |
| Active | `bg-sidebar-primary text-sidebar-primary-foreground` |
| Focus | `focus-visible:ring-2 focus-visible:ring-sidebar-ring` |

### 項目尺寸

| 屬性 | 值 |
|------|-----|
| 高度 | `h-10` (40px) |
| 內距 | `px-3 py-2` |
| 圓角 | `rounded-md` |
| Icon 大小 | `h-4 w-4` |
| Icon 與文字間距 | `gap-3` |
| 項目間距 | `gap-1` |

### Badge（Inbox 數量）

```tsx
<SidebarMenuBadge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
  12
</SidebarMenuBadge>
```

### Group Label

| 屬性 | 值 |
|------|-----|
| 字級 | `text-xs` |
| 字重 | `font-medium` |
| 色彩 | `text-muted-foreground` |
| 內距 | `px-3 py-2` |
| 大寫 | `uppercase tracking-wider`（可選） |

### Footer

```tsx
<SidebarFooter className="p-4 border-t border-sidebar-border">
  <p className="text-xs text-muted-foreground">aibo v1.0.0</p>
</SidebarFooter>
```

## 收合行為

| 狀態 | 顯示 | 觸發 |
|------|------|------|
| 展開 | Icon + 文字 + Badge | 預設（desktop） |
| 收合 | 只有 Icon（tooltip 顯示名稱） | 點擊收合按鈕 |
| Mobile | 全螢幕 overlay | 點擊 hamburger menu |

### 收合按鈕

```tsx
<SidebarTrigger className="h-9 w-9">
  <PanelLeftClose className="h-4 w-4" />
  <span className="sr-only">收合側邊欄</span>
</SidebarTrigger>
```

## 響應式

| 斷點 | 行為 |
|------|------|
| Desktop (>= 1024px) | 固定顯示，可收合 |
| Tablet (768-1023px) | 預設收合，可展開 |
| Mobile (< 768px) | 隱藏，透過 hamburger 展開為 overlay |

### Mobile Overlay

| 屬性 | 值 |
|------|-----|
| 背景遮罩 | `bg-black/50` |
| 動畫 | slide-in from left |
| 關閉 | 點擊遮罩或 X 按鈕 |

## Accessibility

- 使用 `<nav>` 語義標籤
- `aria-label="主要導航"`
- Active 項目使用 `aria-current="page"`
- 收合按鈕有 `aria-expanded` 狀態
- Badge 使用 `aria-label` 描述數量（如 `aria-label="12 筆未分類條目"`）
- 鍵盤可完整導航（Tab + Enter）
- Mobile overlay 開啟時 focus trap
