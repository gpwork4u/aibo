# Design Tokens（Sprint 8 沿用版）

本 sprint 不擴充新的全域 tokens，直接沿用 frontend 既有 shadcn 主題：

| Token | 來源 |
|-------|------|
| color | `dev/frontend/app/globals.css` 的 CSS variables（neutral 主色 + success/warning/destructive） |
| typography | `dev/frontend/app/layout.tsx`（`var(--font-sans)` / `var(--font-mono)`） |
| radius | `--radius: 0.5rem`（Tailwind `rounded-md/lg/sm` 皆由此計算） |
| spacing | Tailwind 預設 4dp scale |
| shadow | Tailwind 預設（`shadow-sm` / `shadow-md`） |

## 可用 semantic tokens（重點）

- `bg-background` / `text-foreground` — 主背景與文字
- `bg-card` / `text-card-foreground` — 卡片表面
- `bg-muted` / `text-muted-foreground` — 次要區塊、placeholder
- `bg-secondary` / `text-secondary-foreground` — 次要按鈕 / badge
- `bg-primary` / `text-primary-foreground` — 主要動作
- `bg-destructive` / `text-destructive-foreground` — 危險動作
- `bg-success` / `text-success-foreground` — 成功狀態（今日、已連結）
- `bg-warning` / `text-warning-foreground` — 警告（gcal degraded）
- `border-border` / `ring-ring` — 邊框與 focus

## Sprint 8 行事曆擴充

見 `design/components/calendar/tokens.md`，僅為「當前 feature 內部常數」，不入全域 CSS。
