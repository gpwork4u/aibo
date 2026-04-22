# Dialog / Modal 元件規格

## 概述

Dialog 和 AlertDialog 基於 shadcn/ui（Radix UI primitives），用於確認操作、表單填寫等需要使用者關注的互動場景。

## 基礎元件

- **來源**：`shadcn/ui` Dialog, AlertDialog
- **底層**：Radix UI Dialog primitive
- **圖示**：Lucide Icons

---

## Dialog（通用對話框）

用於表單填寫、詳細資訊顯示等場景。

### Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `open` | `boolean` | - | 是否開啟 |
| `onOpenChange` | `(open: boolean) => void` | - | 開關回呼 |

### 結構

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>建立</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>建立知識條目</DialogTitle>
      <DialogDescription>
        填寫以下資訊建立新的知識條目。
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      {/* 表單內容 */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
      <Button type="submit">建立</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 樣式規格

| 屬性 | 值 |
|------|-----|
| 最大寬度 | `sm:max-w-[425px]`（小型）/ `sm:max-w-[600px]`（中型） |
| 內距 | `p-6` |
| 圓角 | `rounded-lg` |
| 陰影 | `shadow-lg` |
| 背景遮罩 | `bg-black/80` |
| 動畫 | fade-in + scale（Radix 預設） |
| 位置 | 垂直置中 |

### 大小變體

| 變體 | 最大寬度 | 用途 |
|------|---------|------|
| 小型 | `sm:max-w-[425px]` | 簡單表單（建立 API Key、建立分類） |
| 中型 | `sm:max-w-[600px]` | 較複雜表單（建立/編輯 Entry、LLM Provider） |
| 大型 | `sm:max-w-[800px]` | 預覽內容（Markdown 預覽） |

---

## AlertDialog（確認對話框）

用於需要二次確認的破壞性操作。

### 結構

```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>確認刪除</AlertDialogTitle>
      <AlertDialogDescription>
        此操作無法復原。確定要刪除此條目嗎？
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        刪除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 與 Dialog 的差異

| 特性 | Dialog | AlertDialog |
|------|--------|-------------|
| 點擊遮罩關閉 | 是 | 否 |
| ESC 關閉 | 是 | 否（必須點按鈕） |
| 用途 | 表單、資訊 | 確認操作 |
| 按鈕 | 自訂 | Cancel + Action |

## aibo 專案使用場景

### 建立 API Key Dialog

```
┌─────────────────────────────────┐
│ ✕                               │
│                                 │
│  建立 API Key                    │
│  建立新的 API Key 用於存取 API    │
│                                 │
│  名稱 *                         │
│  ┌─────────────────────────┐   │
│  │ 例如：my-app             │   │
│  └─────────────────────────┘   │
│                                 │
│  到期日                         │
│  ┌─────────────────────────┐   │
│  │ 永不過期                 │ ▾ │
│  └─────────────────────────┘   │
│                                 │
│           [取消]  [建立]        │
└─────────────────────────────────┘
```

### API Key 建立成功 Dialog

```
┌─────────────────────────────────┐
│                                 │
│  ⚠️ API Key 已建立               │
│  請立即複製此 Key，關閉後將無法   │
│  再次查看。                      │
│                                 │
│  ┌─────────────────────────┐   │
│  │ aibo_a1b2c3d4e5f6...  📋 │   │
│  └─────────────────────────┘   │
│                                 │
│                    [我已複製]    │
└─────────────────────────────────┘
```

### 刪除確認 AlertDialog

```
┌─────────────────────────────────┐
│                                 │
│  確認刪除                        │
│  此操作無法復原。刪除分類後，     │
│  該分類下的所有條目將移至 Inbox。  │
│                                 │
│           [取消]  [刪除]        │
└─────────────────────────────────┘
```

### 建立/編輯條目 Dialog

```
┌────────────────────────────────────────┐
│ ✕                                      │
│                                        │
│  建立知識條目                           │
│                                        │
│  標題                                  │
│  ┌──────────────────────────────┐     │
│  │                              │     │
│  └──────────────────────────────┘     │
│                                        │
│  內容（Markdown）                      │
│  ┌──────────────────────────────┐     │
│  │                              │     │
│  │                              │     │
│  │                              │     │
│  └──────────────────────────────┘     │
│                                        │
│  分類                                  │
│  ┌──────────────────────────────┐     │
│  │ 選擇分類                 │ ▾ │     │
│  └──────────────────────────────┘     │
│                                        │
│  Tags                                  │
│  ┌──────────────────────────────┐     │
│  │ [golang] [learning] +        │     │
│  └──────────────────────────────┘     │
│                                        │
│              [取消]  [建立]            │
└────────────────────────────────────────┘
```

## Accessibility

- Dialog 開啟時 focus trap（焦點被限制在 Dialog 內）
- 首次 focus 自動移到第一個可互動元素
- `Escape` 鍵關閉 Dialog（AlertDialog 除外）
- 關閉後 focus 回到觸發元素
- `DialogTitle` 必須存在（作為 `aria-labelledby`）
- `DialogDescription` 作為 `aria-describedby`
- AlertDialog 的 Action 按鈕若為破壞性操作，使用 `destructive` 樣式強調
