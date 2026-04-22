# API Key 管理頁規格

## 概述

API Key 管理頁提供 API Key 的列表、建立、撤銷功能。首次使用時需經 Bootstrap 流程建立第一把 Key。

## 路由

`/settings/api-keys`

## 頁面結構

```
┌──────────────────────────────────────────────┐
│  API Key 管理                  [建立 API Key] │
│  管理 API 存取金鑰                            │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ 名稱   │ Key 前綴  │ 狀態  │ 到期  │ 最後 │ 操作 │
│  ├────────┼──────────┼──────┼──────┼──────┼────┤
│  │ default│aibo_a1b2c│Active│ 永不 │ 3分前│ 🗑  │
│  │ ci-bot │aibo_x9y8z│Active│12/31 │ 從未 │ 🗑  │
│  └──────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────┘
```

## 元件組成

### PageHeader

```tsx
<PageHeader
  title="API Key 管理"
  description="管理 API 存取金鑰"
  action={
    <Button onClick={() => setCreateDialogOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      建立 API Key
    </Button>
  }
/>
```

### API Key 列表（DataTable）

欄位定義：

| 欄位 | 寬度 | 內容 |
|------|------|------|
| 名稱 | flex-1 | `name`，字重 `font-medium` |
| Key 前綴 | 120px | `key_prefix`，`font-mono text-sm text-muted-foreground` |
| 狀態 | 100px | Badge：Active（綠色）/ Expired（琥珀色）/ Inactive（灰色） |
| 到期日 | 140px | 日期字串或「永不過期」（`text-muted-foreground`） |
| 最後使用 | 140px | 相對時間或「從未使用」（`text-muted-foreground`） |
| 操作 | 80px | 撤銷按鈕 |

### 狀態判斷邏輯

```
if (!is_active) → Inactive（灰色）
else if (expires_at && expires_at < now) → Expired（琥珀色）
else → Active（綠色）
```

### 操作欄

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-destructive hover:text-destructive"
  onClick={() => openRevokeDialog(apiKey)}
>
  <Trash2 className="mr-2 h-4 w-4" />
  撤銷
</Button>
```

## 建立 API Key Dialog

### 表單欄位

| 欄位 | 元件 | 驗證 |
|------|------|------|
| 名稱 * | Input | 必填，max 50 chars，不可重複 |
| 到期日 | Select | 選項：永不過期 / 30 天 / 90 天 / 1 年 / 自訂日期 |

### 流程

1. 使用者填寫名稱 + 選擇到期日
2. 點擊「建立」→ POST API
3. 成功後顯示「API Key 建立成功」Dialog
4. 顯示完整 Key + 複製按鈕
5. 使用者點「我已複製」關閉

### 建立成功 Dialog

```tsx
<Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" />
        API Key 已建立
      </DialogTitle>
      <DialogDescription>
        請立即複製此 Key，關閉後將無法再次查看。
      </DialogDescription>
    </DialogHeader>
    <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
      <code className="flex-1 font-mono text-sm break-all">{newKey}</code>
      <Button variant="ghost" size="icon" onClick={copyKey}>
        <Copy className="h-4 w-4" />
        <span className="sr-only">複製</span>
      </Button>
    </div>
    <DialogFooter>
      <Button onClick={() => setShowKeyDialog(false)}>我已複製</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 撤銷確認 AlertDialog

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>確認撤銷 API Key</AlertDialogTitle>
      <AlertDialogDescription>
        撤銷後，使用此 Key 的所有應用程式將無法存取 API。此操作無法復原。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-destructive-foreground">
        撤銷
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 最後一把 Key 保護

當只剩一把有效 Key 時，撤銷按鈕 disabled，tooltip 顯示「不能撤銷最後一把有效的 API Key」。

## Bootstrap 狀態

首次使用（無任何 API Key）時，顯示引導畫面：

```
┌──────────────────────────────────────────────┐
│                                              │
│           🔑                                 │
│                                              │
│     歡迎使用 aibo                            │
│     建立你的第一把 API Key 開始使用           │
│                                              │
│     [建立 API Key]                           │
│                                              │
└──────────────────────────────────────────────┘
```

## 狀態

| 狀態 | 顯示 |
|------|------|
| 載入中 | Skeleton rows |
| 空（Bootstrap） | 引導畫面 |
| 正常 | DataTable |
| API 錯誤 | ErrorState |

## Toast 通知

| 操作 | 類型 | 訊息 |
|------|------|------|
| 建立成功 | success | API Key 已建立 |
| 撤銷成功 | success | API Key 已撤銷 |
| 撤銷最後一把 | error | 不能撤銷最後一把有效的 API Key |
| 名稱重複 | error | 名稱已存在 |
| 複製成功 | success | 已複製到剪貼簿 |
