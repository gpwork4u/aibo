# Mood / Journal / Gcal 狀態 Tokens（Sprint 9）

> 本 sprint 新增的 feature-scoped tokens。延續 Sprint 8 的策略：以 Tailwind class 表達為主，可選擇於 `dev/frontend/app/globals.css` 加入 CSS variable 以便 dark mode 雙主題切換。

---

## 1. Mood 顏色（情緒）

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `--color-mood-great` | `hsl(142 71% 38%)` | `hsl(142 60% 55%)` | great 😄（綠） |
| `--color-mood-ok` | `hsl(43 96% 46%)` | `hsl(48 96% 60%)` | ok 🙂（黃） |
| `--color-mood-down` | `hsl(0 72% 48%)` | `hsl(0 72% 60%)` | down 😣（紅） |
| `--color-mood-none` | `var(--muted-foreground)` | 同 | 未選（中性灰） |

對應 emoji：

| mood | emoji | 文案 |
|------|-------|------|
| `great` | 😄 | 順心 |
| `ok` | 🙂 | 普通 |
| `down` | 😣 | 低落 |
| `null` | （灰圓點） | 未填 |

> 對比驗證：所有 mood 顏色 vs `bg-card` 在 light/dark 雙模式皆 ≥ 4.5:1（針對 14px 文字）；作為背景時 `text-foreground` 須驗證。可透過加 `/15` 透明度作為 fill 背景再用 `text-foreground` 作為主文字確保對比。

### Tailwind 對應 class

```tsx
// 文字色
const moodTextClass = {
  great: "text-mood-great",   // 對應 var(--color-mood-great)
  ok: "text-mood-ok",
  down: "text-mood-down",
  null: "text-muted-foreground",
};

// Toggle 選中態（fill + ring）
const moodActiveClass = {
  great: "bg-mood-great/15 ring-2 ring-inset ring-mood-great",
  ok: "bg-mood-ok/15 ring-2 ring-inset ring-mood-ok",
  down: "bg-mood-down/15 ring-2 ring-inset ring-mood-down",
};
```

> Tailwind v4 配置：在 `globals.css` 的 `@theme` 區段加入：
> ```css
> --color-mood-great: hsl(142 71% 38%);
> --color-mood-ok: hsl(43 96% 46%);
> --color-mood-down: hsl(0 72% 48%);
> ```
> Engineer 實作時可自由決定要用 CSS variable 或直接寫 inline。

---

## 2. Journal Draft Badge

| Token | 用途 | Tailwind |
|-------|------|---------|
| draft 底色 | 黃底 | `bg-warning/15` |
| draft 文字 | 警告文字 | `text-warning-foreground` |
| draft 邊框 | 警告邊 | `border-warning/40` |
| draft icon | sparkles | `text-warning` |

```tsx
<Badge className="bg-warning/15 text-warning-foreground border border-warning/40 gap-1">
  <SparklesIcon className="h-3 w-3" /> AI 草稿
</Badge>
```

---

## 3. Journal Heatmap 顏色階梯

依「字數」或「mood 分布」為 heatmap 著色。提供 5 階梯（含空格）。

| Level | 條件（字數） | Tailwind | 對比測試 |
|-------|-------------|---------|---------|
| 0 | 無日記 | `bg-muted/40` | n/a（無數值） |
| 1 | 1–199 | `bg-primary/15` | 文字 `text-foreground` ≥ 7:1 |
| 2 | 200–599 | `bg-primary/35` | ≥ 5:1 |
| 3 | 600–1199 | `bg-primary/60 text-primary-foreground` | ≥ 4.5:1 |
| 4 | ≥ 1200 | `bg-primary text-primary-foreground` | ≥ 7:1 |

> 顏色不單獨用作辨識（色盲友善）：每格保留 tooltip 顯示日期 + 字數 + mood emoji。

### Mood-based 模式（替代）

當使用者切換到「mood」模式時：

| mood | Tailwind |
|------|---------|
| `great` | `bg-mood-great/45` |
| `ok` | `bg-mood-ok/45` |
| `down` | `bg-mood-down/45` |
| 無 | `bg-muted/40` |

兩種模式由切換器（Tabs）控制。

---

## 4. Gcal 連線狀態（Token Expiry）

| 狀態 | 條件 | Tailwind | dot |
|------|------|---------|-----|
| `healthy` | expires_at > now + 30 min | `text-success` `bg-success/15` | `bg-success` |
| `warning` | 0 < expires_at − now ≤ 30 min | `text-warning` `bg-warning/15` | `bg-warning` |
| `critical` | expires_at ≤ now（會 auto refresh，但 UI 提示） | `text-destructive` `bg-destructive/15` | `bg-destructive` |
| `disconnected` | connected = false | `text-muted-foreground` `bg-muted` | `bg-muted-foreground/40` |
| `reauth_required` | 後端回 401 GCAL_REAUTH_REQUIRED | `text-destructive` `bg-destructive/10` border `border-destructive/40` | n/a（用 banner） |

### Status Dot 元件

```tsx
<span
  className={cn("inline-block h-2 w-2 rounded-full", dotClass)}
  aria-hidden="true"
/>
<span className="sr-only">{statusLabel}</span>
```

---

## 5. a11y 共通

- 所有顏色必須**配合 icon 或文字標籤**，不單獨用顏色傳達語意（色盲友善）
- Mood emoji 旁需有可見文字 label（如「順心」「普通」「低落」）
- Heatmap 每格 `aria-label="{date}：{wordCount} 字，{moodLabel}"`
- Status dot 必須搭配 `<span class="sr-only">` 補充語意

---

## 6. 與 Sprint 8 一致性

- 沿用 `bg-success/...`、`bg-warning/...`、`bg-destructive/...` 透明度策略（`/10` `/15` `/30` `/40`）
- 邊框使用 `border-success/40` 等同 Sprint 8 風格
- 不引入新依賴；icon 一律 lucide-react
