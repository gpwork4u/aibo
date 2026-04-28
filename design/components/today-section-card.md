# TodaySectionCard

## 概述

Today Dashboard 的共用 section 容器元件，以及四個 section 特化變體的規格。
各 section 獨立 loading / error state，互不干擾（各自 Suspense boundary）。

## 共用 Section 結構

```
┌────────────────────────────────────────┐
│  [Icon] 標題               [badge]     │  ← Section Header
├────────────────────────────────────────┤
│                                        │
│  [Content Area]                        │  ← Section Body
│                                        │
└────────────────────────────────────────┘
```

## SectionCard Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `icon` | `ReactNode` | required | Lucide icon |
| `title` | `string` | required | Section 標題 |
| `badge` | `ReactNode` | - | 右側 badge（task count、event count） |
| `children` | `ReactNode` | required | Section 內容 |
| `isLoading` | `boolean` | `false` | Skeleton loading state |
| `error` | `Error \| null` | `null` | Error boundary state |
| `onRetry` | `() => void` | - | Error 時 Retry callback |
| `className` | `string` | - | 自訂 className |

## Section States

### Loading State（Skeleton）

```
┌────────────────────────────────────────┐
│  [Icon] 標題                            │
├────────────────────────────────────────┤
│  ████████████████████  (h-4, rounded)  │
│  ██████████████        (h-4, rounded)  │
│  ████████████████████  (h-4, rounded)  │
└────────────────────────────────────────┘
```

- 三列 skeleton，使用 `animate-pulse bg-muted rounded`
- 高度模擬對應 section 內容行高

### Error State

```
┌────────────────────────────────────────┐
│  [Icon] 標題                            │
├────────────────────────────────────────┤
│                                        │
│  [AlertCircleIcon]                     │
│  Could not load（標題）                 │
│  （副文字：optional message）           │
│  [Retry]（outline button）             │
│                                        │
└────────────────────────────────────────┘
```

- Icon：`AlertCircleIcon`，`text-destructive/60 h-8 w-8`
- 標題：`text-sm font-medium text-foreground`
- 說明：`text-xs text-muted-foreground`
- Retry Button：`<Button variant="outline" size="sm">`

### Empty State（各 Section 特化）

見各 section 特化說明。

## 樣式規格

- 外框：`<Card>` 元件（shadcn），`shadow-sm`
- Section header padding：`px-5 py-4`
- Section body padding：`px-5 pb-5`
- 兩者以 `<Separator>` 分隔（`hr className="border-border"`)
- Icon 大小：`h-4 w-4`，顏色 `text-muted-foreground`
- 標題：`text-sm font-semibold text-foreground`
- Badge：`<Badge variant="secondary" className="text-xs rounded-full"`

---

## JournalSection 特化

### 有日記時

```
┌─ [BookOpenIcon] 今日日記 ─────────────────┐
│  日記摘要文字（最多 3 行截斷）              │
│  更新時間（相對）                          │
│                          [Edit]（ghost）  │
└───────────────────────────────────────────┘
```

- 摘要：`text-sm text-foreground/80 line-clamp-3 leading-relaxed`
- Edit CTA：`<Button variant="ghost" size="sm">`，右對齊
- Edit icon：`PencilIcon`

### 無日記時（Empty CTA）

```
┌─ [BookOpenIcon] 今日日記 ─────────────────┐
│                                           │
│    [BookOpenIcon]（large, muted）         │
│    今天還沒有日記                          │
│    [開始今日日記]（primary button）        │
│                                           │
└───────────────────────────────────────────┘
```

- CTA Button：`<Button variant="default" size="sm">`，icon `PlusIcon`

---

## CalendarSection 特化

僅在 GCal 已連線時顯示。

### 有 Events

```
┌─ [CalendarIcon] 今日行程  [3]（badge）───┐
│                                         │
│  09:00  [dot]  Morning standup          │
│  14:00  [dot]  Design review            │
│  17:00  [dot]  Team sync                │
│                                         │
└─────────────────────────────────────────┘
```

Event 列規格：
- 時間：`text-xs text-muted-foreground tabular-nums w-10 shrink-0`
- 顏色 dot：`h-2 w-2 rounded-full`，顏色來自 event calendar color
- Title：`text-sm text-foreground line-clamp-1`
- 每列間距：`gap-y-3`

### 無 Events Empty State

- 文字：「今日無行程」，`text-sm text-muted-foreground`，置中

---

## TaskSection 特化

### 有 Tasks

```
┌─ [CheckSquareIcon] 今日任務  [2]（badge）─┐
│                                          │
│  [ ] 完成 sprint review          [High]  │
│  [x] 回覆客戶 email               [Low]  │
│  [ ] 更新文件                    [Med]   │
│                                          │
└──────────────────────────────────────────┘
```

Task 列規格：
- Checkbox：`<Checkbox>`（shadcn），勾選觸發 API `PATCH /tasks/:id`
- Title：`text-sm`，完成時 `line-through text-muted-foreground`
- Priority Badge：
  - `high` → `<Badge variant="destructive" className="text-xs">`
  - `medium` → `<Badge className="bg-warning/20 text-warning-foreground text-xs">`
  - `low` → `<Badge variant="outline" className="text-xs text-muted-foreground">`
- 已完成 task 排後方顯示
- 超過 5 筆顯示 "查看全部 {N} 筆" link

### 無 Tasks Empty State

- 文字：「今日無待辦事項」，icon `CheckCircleIcon`（success 色）

---

## RecentEntriesSection 特化

### 有 Entries

```
┌─ [LayersIcon] 最近更新 ─────────────────┐
│                                         │
│  Entry Title 1            2 分鐘前      │
│  Entry Title 2            1 小時前      │
│  Entry Title 3            剛剛          │
│                                         │
└─────────────────────────────────────────┘
```

Entry 列規格：
- Title：`text-sm font-medium line-clamp-1 flex-1`，可點擊開啟 Sheet
- 時間：`text-xs text-muted-foreground shrink-0`（`formatDistanceToNow`）
- 最多顯示 5 筆

### 無 Entries Empty State

- 文字：「今日尚無新增或更新的項目」

---

## Accessibility

- `<section aria-labelledby="{section}-heading">`
- heading：`<h2 id="{section}-heading">`
- Error state：`role="alert"` 當 error 出現時
- Loading：`aria-busy="true"` 於 section wrapper
- Task checkbox：`aria-label="{task.title}"`

## 依賴元件

- shadcn：`Card`, `Badge`, `Button`, `Checkbox`, `Separator`
- Lucide：`BookOpen`, `Calendar`, `CheckSquare`, `Layers`, `AlertCircle`, `Pencil`, `Plus`, `CheckCircle`
- date-fns：`formatDistanceToNow`

## 使用範例

見 `today-section-card.example.tsx`
