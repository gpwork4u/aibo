# Input / Form 元件規格

## 概述

表單系統基於 shadcn/ui 的 Input、Textarea、Select、Checkbox 等元件，搭配 react-hook-form + zod 做表單驗證。

## 基礎元件

- **來源**：`shadcn/ui` Input, Textarea, Select, Checkbox, Label, Form
- **表單管理**：react-hook-form
- **驗證**：zod schema validation
- **圖示**：Lucide Icons

---

## Input

### Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `type` | `string` | `"text"` | 輸入類型 |
| `placeholder` | `string` | - | 佔位文字 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `className` | `string` | - | 自訂 className |

### 樣式規格

| 屬性 | 值 |
|------|-----|
| 高度 | `h-10` (40px) |
| 內距 | `px-3 py-2` |
| 邊框 | `border border-input` |
| 圓角 | `rounded-md` |
| 字級 | `text-sm` |
| 背景 | `bg-background` |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring` |
| Disabled | `disabled:opacity-50 disabled:cursor-not-allowed` |
| Placeholder | `text-muted-foreground` |

### 使用範例

```tsx
<div className="space-y-2">
  <Label htmlFor="name">名稱</Label>
  <Input id="name" placeholder="輸入名稱" />
</div>
```

---

## Textarea

### Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `placeholder` | `string` | - | 佔位文字 |
| `rows` | `number` | `3` | 預設行數 |
| `disabled` | `boolean` | `false` | 是否禁用 |

### 樣式規格

| 屬性 | 值 |
|------|-----|
| 最小高度 | `min-h-[80px]` |
| 內距 | `px-3 py-2` |
| 其餘同 Input | - |

### 使用場景

- Entry content 編輯（Markdown 格式）
- Category description 輸入
- LLM Provider config 備註

---

## Select

### Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `value` | `string` | - | 目前選取值 |
| `onValueChange` | `(value: string) => void` | - | 選取回呼 |
| `placeholder` | `string` | - | 佔位文字 |
| `disabled` | `boolean` | `false` | 是否禁用 |

### 樣式規格

與 Input 相同高度與樣式，下拉面板使用 `shadow-md`。

### 使用場景

- Entry 的 category 選擇（CategorySelector）
- Entry 的 source_type 選擇
- 排序選項（sort by）

---

## Checkbox

### 樣式規格

| 屬性 | 值 |
|------|-----|
| 大小 | `h-4 w-4` (16px) |
| 觸控區域 | 透過 Label 擴展至 44px |
| 選取狀態 | `bg-primary` + Check icon |
| Focus | `focus-visible:ring-2` |

---

## SearchInput（業務元件）

搜尋專用輸入元件，包含搜尋圖示和 debounce 機制。

### Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `value` | `string` | - | 搜尋值 |
| `onChange` | `(value: string) => void` | - | 值變更回呼（debounced） |
| `placeholder` | `string` | `"搜尋..."` | 佔位文字 |
| `debounceMs` | `number` | `300` | debounce 延遲 |

### 樣式

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input className="pl-9" placeholder="搜尋..." />
</div>
```

---

## TagInput（業務元件）

Tag 輸入元件，用於 Entry 的 tags 欄位。

### Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `value` | `string[]` | `[]` | 目前 tags |
| `onChange` | `(tags: string[]) => void` | - | tags 變更回呼 |
| `placeholder` | `string` | `"輸入後按 Enter 新增"` | 佔位文字 |
| `maxTags` | `number` | `20` | 最多 tag 數量 |

### 行為

1. 輸入文字後按 Enter 新增 tag
2. 每個 tag 顯示為 Badge + 刪除按鈕
3. 按 Backspace 可刪除最後一個 tag
4. 重複的 tag 不會新增

### 樣式

```tsx
<div className="flex flex-wrap gap-1 rounded-md border border-input p-2 min-h-[40px]">
  {tags.map((tag) => (
    <Badge key={tag} variant="secondary" className="gap-1">
      {tag}
      <button onClick={() => removeTag(tag)}>
        <X className="h-3 w-3" />
        <span className="sr-only">移除 {tag}</span>
      </button>
    </Badge>
  ))}
  <input className="flex-1 min-w-[120px] outline-none text-sm" />
</div>
```

---

## Form 整合（react-hook-form + zod）

### 表單結構

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const entrySchema = z.object({
  title: z.string().max(100, "標題不可超過 100 字").optional(),
  content: z.string().optional(),
  category_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).default([]),
}).refine(
  (data) => data.title || data.content,
  { message: "標題和內容至少填寫一項" }
)

// Form 元件使用 shadcn/ui Form wrapper
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>標題</FormLabel>
          <FormControl>
            <Input placeholder="輸入標題" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

### 錯誤狀態

| 狀態 | 樣式 |
|------|------|
| 欄位錯誤 | Input 邊框 `border-destructive`，下方顯示 `text-destructive text-sm` 錯誤訊息 |
| 全域錯誤 | 表單頂部 Toast 或 Alert |

## Accessibility

- 所有 Input 必須有對應的 `<Label>` 或 `aria-label`
- 錯誤訊息透過 `aria-describedby` 關聯到對應欄位
- Tab 順序遵循視覺順序
- 必填欄位標示 `*`（`aria-required="true"`）
- Select 使用 Radix UI primitive，支援鍵盤操作
- SearchInput 使用 `role="search"` 標記
