# Pill Nav（Sidebar Navigation Item）

## 用途
Sidebar 導航項目。以圓角 pill 包覆 active 狀態，搭配左側色條強調當前頁面。

## 結構

```
[icon] [label]              ← 展開模式（sidebar 240px）
[icon]                      ← 收合模式（sidebar 64px，tooltip 顯示 label）
```

## Variants

| Variant  | 背景                        | 文字                     | 左側色條                     |
|----------|----------------------------|--------------------------|------------------------------|
| default  | 透明                        | `color.sidebar.fg`       | 無                           |
| active   | `color.sidebar.active-bg`  | `color.sidebar.active-fg`| `color.accent.default`（3px）|
| hover    | `color.sidebar.active-bg`（透明度 60%）| `color.sidebar.active-fg` | 無 |

## 尺寸

| 屬性           | 值                           |
|---------------|------------------------------|
| Height        | 40px（觸控目標 >= 44px 需外加 2px margin）|
| Padding X     | `spacing.3`（12px）          |
| Padding Y     | `spacing.2`（8px）           |
| Border radius | `radius.md`（8px）           |
| Icon size     | 20px x 20px                  |
| Icon-label gap| `spacing.3`（12px）          |
| 左側色條寬度   | 3px                          |

## Active State 色條

active item 左側 3px 色條：
```css
/* pseudo-element 實作 */
.pill-nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
}
```

## 動畫
- hover/active 背景：`background-color 150ms ease`
- sidebar 展開/收合：`width 200ms cubic-bezier(0.4, 0, 0.2, 1)`
- 收合模式 label：`opacity 0` + `width 0`，`overflow: hidden`

## Sidebar 整體結構

```
┌────────────────────────────────┐
│ Logo（展開：aibo，收合：圖示）  │ h-14
├────────────────────────────────┤
│ [icon] Inbox                  │ ← pill-nav item
│ [icon] Library                │
│ [icon] 今日                   │
│ [icon] Canvas                 │
├────────────────────────────────┤ margin-top: auto
│ [icon] Settings               │
│ ─────────────────────────────  │ divider
│ [avatar] User Name            │ user section
└────────────────────────────────┘
```

## 收合模式（64px）
- icon 置中顯示
- label 不顯示
- hover 時以 Tooltip（右側）顯示 label
- Tooltip 延遲 300ms

## Props

| Prop     | Type      | Default | 說明              |
|----------|-----------|---------|-----------------|
| href     | string    | -       | 導航目標路徑      |
| icon     | ReactNode | -       | Lucide 圖示元件  |
| label    | string    | -       | 顯示文字          |
| active   | boolean   | false   | 是否為當前頁面    |
| collapsed| boolean   | false   | Sidebar 是否收合  |
| badge    | number    | -       | 未讀計數 badge   |

## Accessibility
- `role="link"` 或 `<a>` 元素
- active 項目：`aria-current="page"`
- 收合模式：`aria-label={label}` 在 icon wrapper
- Keyboard：Tab 切換，Enter 導航
- 色條不作為唯一識別（同時搭配背景色變化）
