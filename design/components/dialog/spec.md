# Dialog

## 用途
模態對話框，用於確認操作、表單輸入、詳細資訊顯示。基於 shadcn/ui Dialog（Radix Primitive）。

## 尺寸

| Size  | Width          | 用途                        |
|-------|----------------|-----------------------------|
| sm    | `max-w-sm`     | 確認刪除等簡短訊息           |
| md    | `max-w-md`     | 標準表單（預設）             |
| lg    | `max-w-lg`     | 較複雜表單                   |
| xl    | `max-w-xl`     | 預覽 / 詳情                  |
| full  | `w-full h-full`| Mobile fullscreen            |

## 結構
```
[Overlay（color.overlay，backdrop-blur-sm）]
┌───────────────────────────────┐  border-radius: radius.xl
│ DialogHeader                  │  padding: spacing.6
│   DialogTitle（heading-md）   │
│   DialogDescription（body-sm）│
│ ────────────────────────────  │  Separator（選用）
│ DialogContent                 │  padding: spacing.6, pt-0
│   {slot}                      │
│ ────────────────────────────  │
│ DialogFooter                  │  padding: spacing.4 spacing.6
│   [Cancel Button] [OK Button] │  flex gap-3 justify-end
│                                │
│                           [X] │  close button: top-right, absolute
└───────────────────────────────┘
```

## 關閉按鈕
- 位置：`absolute right-4 top-4`
- 樣式：Button ghost，iconOnly，`X` icon（Lucide）
- `aria-label="關閉"`

## 破壞性操作 Dialog
- Title 前加 AlertTriangle icon（`color.warning.default`）
- Confirm Button：`variant="danger"`
- Description 清楚描述不可復原後果

## 動畫
- Open: `scale(0.96) opacity(0) → scale(1) opacity(1)`，200ms
- Close: `scale(1) opacity(1) → scale(0.96) opacity(0)`，150ms
- Overlay: `opacity(0) → opacity(1)`，200ms

## Accessibility
- `role="dialog"`，`aria-modal="true"`
- `aria-labelledby` → DialogTitle id
- `aria-describedby` → DialogDescription id
- Focus trap：開啟時 focus 第一個互動元素，Escape 關閉
- 關閉後 focus 回觸發元素
