# SavedViewsChip

## 概述

Sidebar 的「Views」區塊中，每個 saved view 的展示單元。分為 system view（不可刪除）和 user view（可 Edit / Delete / 拖曳重排）。
另包含 SavedViewDialog（新建 / 編輯 view 的 dialog）與 FilterBar（Library toolbar 上的 active view 篩選顯示）。

## Variants

| Type | 特徵 | 說明 |
|------|------|------|
| `system` | 無 "..." menu，無拖曳 handle | 系統預設（All / Inbox） |
| `user` | "..." hover menu，drag handle | 使用者建立 |

## SavedViewChip Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `view` | `SavedView` | required | View 資料物件 |
| `isActive` | `boolean` | `false` | 目前選中的 view |
| `type` | `"system" \| "user"` | `"user"` | View 類型 |
| `onSelect` | `(id: string) => void` | - | 點選 callback |
| `onEdit` | `(id: string) => void` | - | Edit callback（user only） |
| `onDelete` | `(id: string) => void` | - | Delete callback（user only） |
| `isDragging` | `boolean` | `false` | 拖曳中狀態（@dnd-kit） |
| `dragHandleProps` | `object` | - | @dnd-kit SortableItem drag handle props |
| `className` | `string` | - | 自訂 className |

### SavedView 型別

```ts
interface SavedView {
  id: string;
  name: string;
  scope: "library" | "inbox";
  icon?: string;       // emoji，e.g. "📚"
  position: number;
}
```

## 版面結構

### User View Chip

```
┌───────────────────────────────────┐
│ [⣿] [icon] View Name    [...]   │
│  ^drag  ^emoji                ^kebab
└───────────────────────────────────┘
```

- Active 時：左側 3px border `border-l-primary`，背景 `bg-accent/40`
- Drag handle：`GripVerticalIcon`，`opacity-0 group-hover:opacity-60`，游標 `cursor-grab`
- Drag over：`opacity-50 bg-accent/20`（dnd-kit `isDragging`）
- "..." menu：`opacity-0 group-hover:opacity-100`

### System View Chip

```
┌──────────────────────────────────┐
│      [icon] View Name            │
└──────────────────────────────────┘
```

- 無 drag handle，無 "..." menu

## States

| State | 外觀 |
|-------|------|
| `default` | 透明背景，`text-sm text-foreground/70` |
| `active` | `border-l-[3px] border-l-primary bg-accent/40`，`text-foreground font-medium` |
| `hover` | `bg-accent/20`，drag handle 和 "..." 顯示 |
| `dragging` | `opacity-50`，`bg-accent/20`，cursor `grabbing` |
| `focus` | `focus-visible:ring-2 focus-visible:ring-ring` |

## Chip Sizes

- 高度：`h-9`（36px）+ hover 觸控補足至 44px 的 py
- 水平 padding：`px-3`
- Icon / emoji 大小：`text-base`（16px）

## "..." Kebab Menu（user view only）

| 項目 | Icon | 行為 |
|------|------|------|
| 編輯 | `PencilIcon` | 開啟 SavedViewDialog（edit mode） |
| 刪除 | `Trash2Icon` | 開啟 confirm dialog（destructive） |

Menu trigger：`opacity-0 group-hover:opacity-100 transition-opacity duration-150`

---

## SavedViewDialog

新建 / 編輯 saved view 的 Dialog。

```
┌─────────────────────────────────────────┐
│ 儲存視圖 / 編輯視圖                      │
├─────────────────────────────────────────┤
│                                         │
│ 名稱                                    │
│ [___________________________]（100 chars）│
│                                         │
│ 圖示                                    │
│ [📚] [🔬] [💡] [⚙️] [🎯] [🗂️] [📝] [more?]│
│                                         │
│ 範圍                                    │
│ [Library ▼]（sprint 14 只有 Library）   │
│                                         │
│         [Cancel]      [Save]           │
└─────────────────────────────────────────┘
```

### Dialog Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `open` | `boolean` | required | Dialog 開關狀態 |
| `onOpenChange` | `(v: boolean) => void` | required | 開關 callback |
| `mode` | `"create" \| "edit"` | `"create"` | 模式 |
| `initialValues` | `Partial<SavedView>` | - | 編輯時帶入初始值 |
| `onSave` | `(data: SavedViewFormData) => Promise<void>` | required | 儲存 callback（async） |

### Form Fields

| 欄位 | 元件 | 驗證 |
|------|------|------|
| 名稱 | `<Input>` | 必填，max 100 chars，錯誤顯示於欄位下方 |
| 圖示 | Emoji quick select grid | optional，預設無 |
| 範圍 | `<Select>`（disabled，固定 library） | Sprint 14 只有 library |

#### Emoji Quick Select Grid

- 預設選項：`📚 🔬 💡 ⚙️ 🎯 🗂️ 📝 🏷️ 🔖 ✨`
- Grid：`grid-cols-5 gap-1.5`
- 每格：`h-9 w-9` button，hover `bg-accent`，selected `bg-accent border border-ring`
- 使用 emoji 本身顯示（not Lucide icon）—— emoji picker 是特例

### Loading / Error

- Save Button 按下後：`loading` state（spinner），disabled
- 儲存失敗：Toast error 通知

---

## FilterBar（Library Toolbar Active View 顯示）

Library toolbar 右側顯示目前 active view 的 chip，允許快速切換或 clear。

```
┌──────────────────────────────────────────────┐
│ [SearchInput]  [Filter chips...]  [📚 My View ×] │
└──────────────────────────────────────────────┘
```

### ActiveViewChip Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `view` | `SavedView \| null` | `null` | 目前 active view |
| `onClear` | `() => void` | - | 清除 active view |

- 外觀：`<Badge variant="secondary">` + icon + name + X 按鈕
- X 按鈕：`aria-label="Clear view filter"`，`hover:bg-accent`

---

## Drag-and-Drop（@dnd-kit/sortable）

- 使用 `SortableContext` + `useSortable` hook
- Drag handle：`GripVerticalIcon`
- Drag overlay：clone 原始 chip，`shadow-lg`
- 拖曳結束後觸發 `PATCH /api/v1/views/:id`（更新 position）
- `keyboard` sensor 支援（空格拾起，方向鍵移動，Enter 放下）

## Accessibility

- 每個 chip：`role="button"` 或 `<button>`，`aria-pressed={isActive}`
- Active：`aria-current="page"`
- "..." trigger：`aria-label="View options for {view.name}"`
- Drag handle：`aria-label="Drag to reorder {view.name}"`，`aria-roledescription="sortable"`
- Dialog：`aria-labelledby` 指向 dialog title
- Emoji grid：`role="radiogroup" aria-label="選擇圖示"`，每個 emoji `role="radio"`

## 依賴元件

- shadcn：`Button`, `Dialog`, `DropdownMenu`, `Input`, `Select`, `Badge`
- @dnd-kit：`@dnd-kit/core`, `@dnd-kit/sortable`
- Lucide：`GripVertical`, `MoreHorizontal`, `Pencil`, `Trash2`, `X`

## 使用範例

見 `saved-views-chip.example.tsx`
