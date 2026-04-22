# LLM Provider 設定頁規格

## 概述

LLM Provider 管理頁提供 Provider 的 CRUD、設為預設、健康檢查功能。

## 路由

`/settings/llm-providers`

## 頁面結構

```
┌──────────────────────────────────────────────────────┐
│  LLM Provider                        [新增 Provider] │
│  管理 LLM 服務提供者                                   │
├──────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ 名稱          │ Endpoint    │ Model │ 狀態  │健康│ ⋮ │
│  ├───────────────┼────────────┼──────┼──────┼────┼──┤
│  │ LM Studio     │ localhost  │llama │Active│ ● │ ⋮ │
│  │  [Default]    │ :1234/v1   │  -3  │      │   │   │
│  │ OpenAI        │ api.openai │gpt-4 │Active│ ● │ ⋮ │
│  │               │ .com/v1    │      │      │   │   │
│  └──────────────────────────────────────────────┘    │
│                                                        │
└──────────────────────────────────────────────────────┘
```

## 元件組成

### PageHeader

```tsx
<PageHeader
  title="LLM Provider"
  description="管理 LLM 服務提供者"
  action={
    <Button onClick={() => setCreateDialogOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      新增 Provider
    </Button>
  }
/>
```

### DataTable 欄位

| 欄位 | 寬度 | 內容 |
|------|------|------|
| 名稱 | flex-1 | `name`（`font-medium`）+ Default badge（若 `is_default`） |
| Endpoint | 200px | `endpoint_url`（`font-mono text-xs text-muted-foreground truncate`） |
| Model | 120px | `model_name` |
| 狀態 | 100px | Active / Inactive badge |
| 健康 | 100px | HealthStatus 指示器 |
| 操作 | 50px | DropdownMenu |

### 名稱欄位渲染

```tsx
function ProviderNameCell({ provider }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{provider.name}</span>
      {provider.is_default && (
        <Badge variant="default" className="text-xs">Default</Badge>
      )}
    </div>
  )
}
```

### HealthStatus 元件

```tsx
function HealthStatus({ status }: { status: "healthy" | "unhealthy" | "unknown" }) {
  const config = {
    healthy: {
      icon: CheckCircle2,
      label: "Healthy",
      className: "text-success",
    },
    unhealthy: {
      icon: XCircle,
      label: "Unhealthy",
      className: "text-destructive",
    },
    unknown: {
      icon: HelpCircle,
      label: "未測試",
      className: "text-muted-foreground",
    },
  }
  const { icon: Icon, label, className } = config[status]

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Icon className="h-4 w-4" />
      <span className="text-xs">{label}</span>
    </div>
  )
}
```

### 行操作（DropdownMenu）

| 項目 | Icon | 條件 | 說明 |
|------|------|------|------|
| 編輯 | `Pencil` | 永遠可用 | 開啟編輯 Dialog |
| 設為預設 | `Star` | 非 default 時 | PUT + `is_default: true` |
| 健康檢查 | `Activity` | 永遠可用 | POST health check |
| 刪除 | `Trash2` | 永遠可用 | 開啟刪除確認 |

## 建立/編輯 Dialog

### 表單欄位

| 欄位 | 元件 | 驗證規則 |
|------|------|---------|
| 名稱 * | Input | 必填，max 50 chars，不可重複 |
| Endpoint URL * | Input | 必填，max 500 chars，有效 URL 格式 |
| API Key | Input (password) | 選填，max 500 chars |
| Model 名稱 * | Input | 必填，max 100 chars |
| 設為預設 | Checkbox | 選填，default false |
| 啟用 | Checkbox | 選填，default true |
| 進階設定 | Collapsible | 可展開區塊 |

### 進階設定（Config）

| 欄位 | 元件 | 預設 |
|------|------|------|
| Temperature | Input (number) | 0.7 |
| Max Tokens | Input (number) | 1000 |
| Timeout (秒) | Input (number) | 30 |

### Dialog 大小

中型（`sm:max-w-[600px]`）

### API Key 欄位特殊處理

- 建立時：顯示為密碼欄位，帶顯示/隱藏切換
- 編輯時：顯示「已設定」或「未設定」，提供「更新 API Key」按鈕
- 清除 API Key：設為 null

```tsx
<div className="space-y-2">
  <Label>API Key</Label>
  <div className="relative">
    <Input
      type={showKey ? "text" : "password"}
      placeholder="選填，例如 sk-..."
      {...field}
    />
    <Button
      variant="ghost"
      size="icon"
      className="absolute right-0 top-0"
      onClick={() => setShowKey(!showKey)}
    >
      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  </div>
  <p className="text-xs text-muted-foreground">
    API Key 將以加密方式儲存，不會以明文顯示
  </p>
</div>
```

### 進階設定展開

```tsx
<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm" className="gap-2">
      <Settings className="h-4 w-4" />
      進階設定
      <ChevronDown className="h-4 w-4" />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 pt-4">
    {/* Temperature, Max Tokens, Timeout 欄位 */}
  </CollapsibleContent>
</Collapsible>
```

## 刪除確認 AlertDialog

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>確認刪除 LLM Provider</AlertDialogTitle>
      <AlertDialogDescription>
        確定要刪除「{provider.name}」嗎？此操作無法復原。
        {provider.is_default && (
          <span className="block mt-2 font-medium text-warning">
            注意：這是目前的預設 Provider，刪除後將沒有預設 Provider。
          </span>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-destructive-foreground">
        刪除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## 健康檢查互動

點擊健康檢查後：

1. 對應行的 HealthStatus 顯示 loading spinner
2. POST `/api/v1/llm-providers/:id/health`
3. 成功：更新 HealthStatus + Toast
4. 失敗：更新 HealthStatus + Error Toast

## 狀態

| 狀態 | 顯示 |
|------|------|
| 載入中 | Skeleton rows |
| 空 | EmptyState：「還沒有 LLM Provider」+ 新增按鈕 |
| 正常 | DataTable |
| 錯誤 | ErrorState |

### 空狀態

```tsx
<EmptyState
  icon={Bot}
  title="還沒有 LLM Provider"
  description="新增 LLM 服務提供者以啟用智慧功能"
  action={
    <Button onClick={() => setCreateDialogOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      新增 Provider
    </Button>
  }
/>
```

## Toast 通知

| 操作 | 類型 | 訊息 |
|------|------|------|
| 建立成功 | success | Provider 已建立 |
| 更新成功 | success | Provider 已更新 |
| 刪除成功 | success | Provider 已刪除 |
| 設為預設 | success | 已設為預設 Provider |
| 健康檢查成功 | success | 連線正常（描述：回應時間 {N}ms） |
| 健康檢查失敗 | error | 連線失敗（描述：{error}） |
| 名稱重複 | error | 名稱已存在 |
| URL 格式錯誤 | error | Endpoint URL 格式不正確 |
