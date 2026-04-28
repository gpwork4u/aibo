# AI 建議連結 Chip（AISuggestionChip）

## 對應 Feature
#221 F-046: Relation Editor（AI 建議連結子功能）

## 技術基礎
- shadcn/ui primitives：Badge、Button
- Tailwind CSS v4 + Lucide icons（`Sparkles`、`Check`、`X`、`Clock`）
- 狀態：pending / accepted / rejected

---

## 元件說明

AISuggestionChip 顯示 LLM 自動建議的連結，提供使用者三種操作：接受、拒絕、或保留待決。

---

## Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| link_type | LinkType | — | 建議的連結類型 |
| targetTitle | string | — | 目標條目標題 |
| targetId | string | — | 目標條目 ID |
| relation | string \| undefined | — | 建議的關係說明（灰色小字） |
| confidence | number | — | AI 信心值（0.0–1.0），必填 |
| status | 'pending' \| 'accepted' \| 'rejected' | 'pending' | 當前狀態 |
| onAccept | () => void | — | 接受回呼 |
| onReject | () => void | — | 拒絕回呼 |
| onTitleClick | (id: string) => void | — | 標題點擊跳轉 |

---

## 狀態規格

### pending（待決）

**外觀：**
- 背景：primary-50（`bg-blue-50`）
- 邊框：primary-200（`border-blue-200`）
- 左側 AI 圖示：`Sparkles` icon（primary-500）
- chip 外框：實線

**排列（左→右）：**
```
[Sparkles icon] [link_type badge] [target title] [relation?] [confidence badge] | [Accept] [Reject]
```

**Accept 按鈕：**
- icon：`Check`（Lucide）
- 尺寸：觸控區 >= 44×44pt（padding 補足）
- hover：green-50 背景，green-600 顏色
- aria-label：「接受建議：{targetTitle}」

**Reject 按鈕：**
- icon：`X`（Lucide）
- hover：red-50 背景，red-600 顏色
- aria-label：「拒絕建議：{targetTitle}」

### accepted（已接受）

**外觀：**
- 背景：green-50（`bg-green-50`）
- 邊框：green-200（`border-green-200`）
- 左側圖示：`Check` icon（green-600）
- 無操作按鈕
- 文字色：foreground-muted（已操作，低重要性）

**排列：**
```
[Check icon] [link_type badge] [target title] [relation?] [confidence badge]
```

### rejected（已拒絕）

**外觀：**
- 背景：neutral-50（`bg-neutral-50`）
- 邊框：neutral-200（`border-neutral-200`）
- 所有文字：foreground-subtle（`opacity-50` 效果）
- 左側圖示：`X` icon（neutral-400）
- 刪除線樣式：target title 加 `line-through`
- 無操作按鈕

**排列：**
```
[X icon] [link_type badge] [target title 刪除線] [relation?] [confidence badge]
```

---

## confidence badge 規格

| confidence 範圍 | 顯示格式 | 背景色 | 文字色 |
|----------------|---------|--------|--------|
| >= 0.8 | `{n}%` | green-100 | green-700 |
| 0.5 – 0.79 | `{n}%` | yellow-100 | yellow-700 |
| < 0.5 | `{n}%` | red-100 | red-700 |

---

## link_type badge 規格

沿用 RelationChip 規格：
- 圓角 pill，對應色彩背景，白色文字，font-size xs

---

## 動畫規格

| 動作 | 動畫 |
|------|------|
| pending → accepted | `scale-95` → `scale-100`，150ms ease-out |
| pending → rejected | fade-out opacity 0，150ms ease-out（可選：slide-out） |
| 初次出現 | `animate-in fade-in slide-in-from-top-1`，200ms |

尊重 `prefers-reduced-motion`：motion 設定 reduced 時跳過動畫。

---

## AISuggestionList（容器）

一組 AISuggestionChip 的容器，含標題區和批次操作。

### Props

| Prop | Type | 說明 |
|------|------|------|
| suggestions | AISuggestion[] | 建議列表 |
| onAcceptAll | () => void | 接受所有 pending |
| onRejectAll | () => void | 拒絕所有 pending |
| onAccept | (id: string) => void | 接受單一 |
| onReject | (id: string) => void | 拒絕單一 |
| onTitleClick | (id: string) => void | 標題點擊 |

### 外觀
- 標題：「AI 建議連結」+ `Sparkles` icon（primary-500）
- 標題右側：pending 數量 badge（primary-100 背景）
- 批次操作：「全部接受」（ghost，green）/ 「全部拒絕」（ghost，red）
  - 顯示條件：有至少 1 個 pending
- chip 列表：`flex flex-col gap-2 mt-2`
- 空白狀態（全部處理完）：「所有建議已處理」（foreground-subtle，font-sm）

---

## Accessibility

- `role="list"`（AISuggestionList）
- `role="listitem"`（每個 chip）
- Accept/Reject 按鈕：明確 aria-label 含目標標題
- pending status chip：`aria-label="{link_type} 建議至 {targetTitle}，信心值 {confidence}%，待決"`
- accepted status chip：`aria-label="{link_type} 建議至 {targetTitle}，已接受"`
- rejected status chip：`aria-label="{link_type} 建議至 {targetTitle}，已拒絕"`
- 狀態變化時用 `aria-live="polite"` 通知

## States 總覽

| Status | 外觀 | 操作按鈕 |
|--------|------|---------|
| pending | primary-50 底，Sparkles icon | Accept + Reject |
| accepted | green-50 底，Check icon | 無 |
| rejected | neutral-50 底，刪除線 | 無 |

## 使用範例
見 `example.tsx`
