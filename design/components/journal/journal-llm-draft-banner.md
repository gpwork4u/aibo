# JournalLlmDraftBanner（DraftBanner）

當編輯器中的 journal 為 LLM 草稿（is_draft=true）時，於頁首顯示的提示帶。

亦覆蓋「LLM 草稿生成中…」載入狀態。

---

## 三種狀態

### 1. 生成中（loading）

```
┌──────────────────────────────────────────────────────┐
│ ⟳  AI 正在閱讀你今天的條目和行事曆事件，產生草稿…    │
└──────────────────────────────────────────────────────┘
   黃底虛線（`bg-warning/10 border-warning/40 border-dashed`）
```

### 2. Draft 已生成（idle / 預設）

```
┌──────────────────────────────────────────────────────┐
│ ✨  這是 AI 草稿（基於 5 個條目 · 2 個事件）          │
│                       [重新生成]  [使用此草稿 →]     │
└──────────────────────────────────────────────────────┘
   黃底實線（`bg-warning/15 border-warning/40`）
```

### 3. 重新生成中（regenerating）

```
┌──────────────────────────────────────────────────────┐
│ ⟳  正在重新生成草稿…                                  │
│                       [重新生成中…]  [使用此草稿 →]   │
└──────────────────────────────────────────────────────┘
   按鈕 disabled + spinner
```

---

## Props

```ts
interface JournalLlmDraftBannerProps {
  state: "loading" | "draft" | "regenerating";
  sourceCounts?: { entries: number; events: number };
  onRegenerate?: () => void;
  onConfirm?: () => void;        // 「使用此草稿」→ PATCH is_draft=false
  isConfirming?: boolean;
}
```

---

## Tailwind / 範例

```tsx
import { cn } from "@/lib/utils";
import { SparklesIcon, Loader2Icon, RefreshCwIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JOURNAL_TESTIDS } from "@/lib/testids/journal";

const isLoading = state === "loading";
const isRegenerating = state === "regenerating";

<div
  role={isLoading ? "status" : "region"}
  aria-live={isLoading ? "polite" : "off"}
  aria-label="AI 草稿狀態"
  data-testid={isLoading ? JOURNAL_TESTIDS.draftBannerLoading : JOURNAL_TESTIDS.draftBanner}
  className={cn(
    "rounded-md border px-4 py-3 text-sm",
    "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
    isLoading
      ? "border-dashed border-warning/40 bg-warning/10 text-warning-foreground"
      : "border-warning/40 bg-warning/15 text-warning-foreground",
  )}
>
  {/* 左側訊息 */}
  <div className="flex items-start gap-2">
    {isLoading || isRegenerating ? (
      <Loader2Icon className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
    ) : (
      <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
    )}
    <div className="space-y-0.5">
      <p className="font-medium">
        {isLoading
          ? "AI 正在閱讀你今天的條目和行事曆事件，產生草稿…"
          : isRegenerating
            ? "正在重新生成草稿…"
            : "這是 AI 草稿"}
      </p>
      {!isLoading && sourceCounts && (
        <p className="text-xs text-muted-foreground">
          基於 {sourceCounts.entries} 個條目 · {sourceCounts.events} 個事件
        </p>
      )}
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          請稍候，這通常需要 5–15 秒
        </p>
      )}
    </div>
  </div>

  {/* 右側動作（loading 時不顯示） */}
  {!isLoading && (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onRegenerate}
        disabled={isRegenerating || isConfirming}
        data-testid={JOURNAL_TESTIDS.draftBannerRegenerate}
        className="gap-1"
      >
        {isRegenerating ? (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {isRegenerating ? "重新生成中…" : "重新生成"}
      </Button>
      <Button
        size="sm"
        onClick={onConfirm}
        disabled={isRegenerating || isConfirming}
        data-testid={JOURNAL_TESTIDS.draftBannerConfirm}
        className="gap-1"
      >
        {isConfirming ? (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        使用此草稿
      </Button>
    </div>
  )}
</div>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 進入 loading | spinner 出現；右側動作隱藏；`aria-live="polite"` 通知讀屏 |
| 進入 draft | banner 顯示完整動作；spinner 換成 sparkles |
| 點 重新生成 | onRegenerate()，狀態 → regenerating；按鈕 disabled |
| 點 使用此草稿 | onConfirm()（PATCH is_draft=false），成功後 banner 消失（由 parent 控制） |
| 503 LLM_UNAVAILABLE | 由 parent 改 banner 為 destructive 樣式（重用結構） |

### data-testid

| 元素 | testid |
|------|--------|
| Banner（draft / regenerating） | `JOURNAL_TESTIDS.draftBanner` |
| Banner（loading） | `JOURNAL_TESTIDS.draftBannerLoading` |
| 重新生成按鈕 | `JOURNAL_TESTIDS.draftBannerRegenerate` |
| 使用此草稿按鈕 | `JOURNAL_TESTIDS.draftBannerConfirm` |

---

## States

| state | 視覺 | 動作可用 |
|-------|------|---------|
| `loading` | 黃虛線、spinner、無按鈕 | 不可 |
| `draft` | 黃實線、sparkles、兩按鈕 | 可 |
| `regenerating` | 黃實線、按鈕 spinner、disabled | 不可 |

---

## a11y

- loading 狀態 `role="status"` + `aria-live="polite"`，幫助讀屏使用者知道進度
- 非 loading 狀態 `role="region" aria-label="AI 草稿狀態"`
- 所有按鈕有可見文字（不僅 icon）
- 對比：`text-warning-foreground` vs `bg-warning/15` ≥ 4.5:1（既有 token）
- spinner 動畫遵循 `prefers-reduced-motion`：可在全域 CSS 設 `.animate-spin { animation-play-state: paused }`（Tailwind 預設行為由 engineer 決定）
- 觸控目標：sm size button 高 32px；行動裝置上 banner 動作改 stack 排列以放大按鈕區，仍 ≥ 44px

---

## 範例文案

- loading：「AI 正在閱讀你今天的條目和行事曆事件，產生草稿…」「請稍候，這通常需要 5–15 秒」
- draft：「這是 AI 草稿」+「基於 5 個條目 · 2 個事件」
- regenerating：「正在重新生成草稿…」
- 503 失敗（parent 控制）：「LLM 暫時無法使用，請檢查 Provider 設定」
