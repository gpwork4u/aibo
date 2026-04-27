# Toast（Sonner）

## 用途
操作成功/失敗/警告的即時通知，非阻斷式。基於 `sonner` 套件。

## Variants

| Variant | 左側色條 / 圖示         | 用途                        |
|---------|------------------------|----------------------------|
| success | `color.success.default`，CheckCircle icon | 操作成功          |
| error   | `color.danger.default`，XCircle icon      | 操作失敗          |
| warning | `color.warning.default`，AlertTriangle icon | 警告提示         |
| info    | `color.accent.default`，Info icon          | 一般資訊通知      |
| loading | spinner，Loader2 icon  | 進行中（呼叫 toast.promise）|

## 視覺規格
- Position：`bottom-right`（桌面），`bottom-center`（手機）
- Max-width：`360px`
- Padding：`spacing.4`
- Border-radius：`radius.lg`（12px）
- Background：`color.card.default`
- Border：`color.border.default`
- Shadow：`shadow.lg`
- 左側色條寬度：4px

## 內容結構

```
[icon 20px] [title（font-medium）]
             [description（font-sm, fg.muted）]   ← 選用
                                         [action button] ← 選用
                                         [X 關閉按鈕]
```

## Duration
- success / info：4000ms
- warning：6000ms
- error：8000ms（需要使用者更主動注意）
- loading：由 promise resolve 後自動切換

## Z-index
`z-index: toast`（700）

## Props（toast() 呼叫）

```typescript
toast.success("儲存成功")
toast.error("儲存失敗", { description: "請檢查網路連線" })
toast.warning("注意：此操作無法復原")
toast.info("已同步 GitHub commits")
toast.promise(saveData(), {
  loading: "儲存中...",
  success: "儲存成功",
  error: "儲存失敗",
})
```

## Accessibility
- `role="status"` 或 `role="alert"`（error）
- `aria-live="polite"`（success/info）/ `aria-live="assertive"`（error）
- 關閉按鈕有 `aria-label="關閉通知"`
- 顏色不作為唯一識別符號（同時有文字 + 圖示）
