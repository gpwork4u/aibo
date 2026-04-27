# F-038: shadcn Primitives（紙本主題）

## Status: active
## Sprint: 13
## Priority: P0
## GitHub Issues: #193 (feature), #202 (PR)

## 使用者故事
As a developer, I want a set of pre-styled UI primitives that follow the editorial paper design system, so that I can build consistent UI components without re-implementing basic interaction patterns.

## 設計決策
- shadcn 取捨：D 混合策略（互動用 Radix，視覺自寫）
- 12 個 primitive 元件以 editorial 紙本主題覆蓋 shadcn 預設樣式
- 額外 3 個自定義元件（Command / Combobox / Kbd）

## 元件清單

### shadcn Primitives（紙本主題覆蓋）
| 元件 | 用途 |
|------|------|
| Dialog | Modal 對話框 |
| Popover | 浮層（tooltip-like 但有互動） |
| DropdownMenu | 下拉選單 |
| Tooltip | 提示文字 |
| Sheet | 側邊抽屜 |
| Select | 下拉選擇 |
| Tabs | Tab 切換 |
| Label | 表單標籤 |
| Card | 卡片容器 |
| Badge | 標籤徽章 |
| Button | 按鈕 |
| Input | 輸入框 |

### 自定義元件
| 元件 | 用途 |
|------|------|
| Command | cmdk 整合（給 CommandPalette 使用） |
| Combobox | Command + Popover 組合的選擇器 |
| Kbd | 鍵盤快捷鍵展示（`⌘K` 等） |

## 主題覆蓋原則
- 所有元件使用 F-035 定義的 CSS variables（`--color-*`、`--shadow-*`）
- Border radius：`--radius-sm`(4px)、`--radius-md`(8px)、`--radius-lg`(12px)
- 動畫：fade + scale（150ms ease-out），無誇張滑入效果
- Focus ring：2px offset、`--color-accent` 色

## Button Variants
| Variant | 用途 | 外觀 |
|---------|------|------|
| default | 主要動作 | accent 底色 |
| secondary | 次要動作 | surface-raised 底色 |
| ghost | 低強調 | 透明底，hover 時 surface-raised |
| destructive | 危險動作 | 紅色底色 |
| outline | 邊框型 | transparent + border |

## Business Rules
1. 所有元件使用 F-035 CSS variables，不硬編碼顏色值
2. 深色模式透過 `data-theme="dark"` 自動切換，無需額外 className
3. 所有互動元件符合 WCAG 2.1 AA 對比度
4. 所有元件支援 `className` prop 進行局部覆蓋

## Scenarios

### Happy Path

#### Scenario: Button default 外觀
GIVEN `data-theme="light"`
WHEN 渲染 `<Button>Click</Button>`
THEN background 為 accent 色（oklch(55% 0.18 250)）
AND text 為 accent-fg 色

#### Scenario: Dark mode 自動切換
GIVEN `<Button variant="secondary">` 已渲染
WHEN `<html>` 的 `data-theme` 改為 "dark"
THEN background 自動切換為 dark surface-raised token
AND 無需重新渲染元件

#### Scenario: Dialog 開啟動畫
GIVEN 頁面已載入
WHEN `<Dialog open={true}>` 狀態變為 open
THEN Dialog 以 fade + scale(0.95→1) 在 150ms 內出現
AND backdrop 顯示 blur 效果

### Edge Cases

#### Scenario: Kbd 元件渲染快捷鍵
WHEN 渲染 `<Kbd>⌘K</Kbd>`
THEN 顯示小型等寬字體的鍵盤標籤
AND 有 border + 淺色底

#### Scenario: Button disabled 狀態
WHEN 渲染 `<Button disabled>Submit</Button>`
THEN opacity 降為 0.5
AND pointer-events: none
AND aria-disabled="true"
