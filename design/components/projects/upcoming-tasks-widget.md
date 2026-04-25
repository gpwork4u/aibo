# UpcomingTasksWidget

側邊欄底部的「近期 tasks」widget，呼叫 `GET /api/v1/tasks/upcoming?days=7`，最多顯示 5 筆，依 `due_at asc` 排序，過期項目以 destructive 色標示。

對齊 spec：F-032（側邊欄底部新增「近期 tasks」widget）、F-031（`/tasks/upcoming?days=7` endpoint，跨專案）。

---

## 用途

- 嵌入主 sidebar `<NavigationSidebar>` 底部
- 提供使用者一眼看到「最近 7 天內到期 / 已過期」的未完成 task
- 點擊單筆 → 跳到對應 `/projects/:projectId` 並開啟該 task sheet

---

## 結構

```
┌────────── 近期 tasks ──────────┐
│ 近期 tasks（5）         [↻]     │  ← header（標題 + count + 重整 icon）
│ ─────────────────────────────── │
│ ⚠ 設計 schema                   │  ← 過期：destructive 色 + AlertCircleIcon
│   昨天 · aibo v2                │
│ ─────────────────────────────── │
│ ● 寫 e2e 測試                   │  ← 今天到期：warning 色 dot
│   今天 · aibo v2                │
│ ─────────────────────────────── │
│ ● 做技術 survey                 │  ← 未來：normal dot
│   明天 · aibo v2                │
│ ─────────────────────────────── │
│ ● Sprint review 準備            │
│   4/29 · aibo v2                │
│ ─────────────────────────────── │
│ ● 上線部署                       │
│   5/01 · 部署                   │
└─────────────────────────────────┘
```

Empty state：

```
┌────────── 近期 tasks ──────────┐
│ 近期 tasks               [↻]    │
│ ─────────────────────────────── │
│ ✨ 未來 7 天沒有待辦 task        │
│    建立任務 →                    │
└─────────────────────────────────┘
```

---

## Props

```ts
interface UpcomingTasksWidgetProps {
  /** 預設 7 天，可由 parent 改 */
  days?: number;
  /** 預設 5；spec 上限 5 */
  limit?: number;
  /** 控制是否顯示 widget header（折疊時 false） */
  collapsed?: boolean;
  /** 點 task 時跳轉的 callback */
  onOpenTask: (task: UpcomingTask) => void;
  /** 空狀態 CTA */
  onCreateTask?: () => void;
}

interface UpcomingTask {
  id: string;
  project_id: string;
  project_name: string;
  project_color: string;     // hex
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_at: string;            // ISO（API 已過濾 due_date <= now+days 且 status != done/cancelled）
  is_overdue: boolean;       // 由前端 derive 或 API 帶
}
```

內部使用 `useUpcomingTasks(days, limit)` SWR hook，`refreshInterval: 60_000`，且在 task PATCH 後 `mutate()`。

---

## Tailwind / 範例

```tsx
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircleIcon, CalendarIcon, RefreshCwIcon, SparklesIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTS_TESTIDS } from "@/lib/testids/projects";
import { formatDueLabel } from "@/lib/format";

<aside
  data-testid={PROJECTS_TESTIDS.upcomingWidget}
  aria-labelledby="upcoming-tasks-title"
  className={cn(
    "rounded-md border bg-card",
    "mx-2 mb-2 mt-auto",                  // 在 sidebar 底部
  )}
>
  {/* Header */}
  <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
    <h3
      id="upcoming-tasks-title"
      className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
    >
      <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
      近期 tasks
      {data && data.length > 0 && (
        <span
          data-testid={PROJECTS_TESTIDS.upcomingWidgetCount}
          className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums"
        >
          {data.length}
        </span>
      )}
    </h3>
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={() => mutate()}
      aria-label="重新整理近期 tasks"
      data-testid={PROJECTS_TESTIDS.upcomingWidgetRefresh}
    >
      <RefreshCwIcon
        className={cn("h-3 w-3", isValidating && "animate-spin")}
        aria-hidden="true"
      />
    </Button>
  </div>

  {/* Body */}
  {isLoading ? (
    <div data-testid={PROJECTS_TESTIDS.upcomingWidgetSkeleton} className="space-y-1.5 px-2 pb-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : error ? (
    <div data-testid={PROJECTS_TESTIDS.upcomingWidgetError} className="px-3 pb-3 text-xs text-destructive">
      載入失敗
      <button onClick={() => mutate()} className="ml-1 underline">重試</button>
    </div>
  ) : !data || data.length === 0 ? (
    <div
      data-testid={PROJECTS_TESTIDS.upcomingWidgetEmpty}
      className="px-3 pb-3 text-xs text-muted-foreground"
    >
      <p className="flex items-center gap-1">
        <SparklesIcon className="h-3 w-3" aria-hidden="true" />
        未來 {days} 天沒有待辦 task
      </p>
      {onCreateTask && (
        <button
          onClick={onCreateTask}
          data-testid={PROJECTS_TESTIDS.upcomingWidgetCreateCta}
          className="mt-1 inline-flex items-center gap-0.5 text-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          建立任務
          <ChevronRightIcon className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </div>
  ) : (
    <ul role="list" className="px-1 pb-1.5">
      {data.slice(0, limit).map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onOpenTask(t)}
            data-testid={`${PROJECTS_TESTIDS.upcomingWidgetItem}-${t.id}`}
            data-overdue={t.is_overdue ? "true" : "false"}
            aria-label={`${t.title}，${formatDueLabel(t.due_at, t.is_overdue)}，專案 ${t.project_name}`}
            className={cn(
              "flex w-full items-start gap-2 rounded px-2 py-1.5 text-left",
              "transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            )}
          >
            {t.is_overdue ? (
              <AlertCircleIcon
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive"
                aria-hidden="true"
              />
            ) : (
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: t.project_color }}
              />
            )}
            <span className="min-w-0 flex-1">
              <span
                data-testid={`${PROJECTS_TESTIDS.upcomingWidgetItemTitle}-${t.id}`}
                className={cn(
                  "block truncate text-xs font-medium",
                  t.is_overdue && "text-destructive",
                )}
              >
                {t.title}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                <span
                  data-testid={`${PROJECTS_TESTIDS.upcomingWidgetItemDue}-${t.id}`}
                  className={cn(t.is_overdue && "text-destructive")}
                >
                  {formatDueLabel(t.due_at, t.is_overdue)}
                </span>
                <span aria-hidden="true"> · </span>
                <span className="truncate">{t.project_name}</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )}
</aside>
```

`formatDueLabel` 規則（由 `lib/format` 提供）：
- `is_overdue=true` 且 < 24h → 「今天逾期」
- `is_overdue=true` 且 ≥ 24h → 「逾期 N 天」
- 今天 → 「今天」
- 明天 → 「明天」
- ≤ 7 天 → `M/D`
- 其他 → `YYYY-MM-DD`

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點刷新 icon | `mutate()`，icon 旋轉直到完成 |
| 點 task item | `onOpenTask(task)`，由 parent 處理 navigate（通常 `router.push('/projects/:projectId?taskId=:id')`） |
| 點空狀態 CTA | `onCreateTask?.()` |
| Sidebar collapsed | 隱藏整個 widget（或僅顯示 icon hover tooltip，視 sidebar 設計；本元件由 parent 控制） |
| 自動刷新 | 60s |

---

## States

| 狀態 | 視覺 |
|------|------|
| Loading | 3 row Skeleton |
| Empty | 「未來 N 天沒有待辦 task」+ 建立任務 CTA |
| Error | destructive 文字「載入失敗」+ 重試 |
| Has data | List of items |
| Item overdue | `AlertCircleIcon` + `text-destructive`，標題 / 日期皆 destructive 色 |
| Item normal | 左側 project color dot + 標題 normal、日期 muted |
| Refreshing | 刷新 icon `animate-spin`，list 維持顯示 |

---

## data-testid

| 元素 | testid |
|------|--------|
| Widget root | `PROJECTS_TESTIDS.upcomingWidget` |
| Count badge | `PROJECTS_TESTIDS.upcomingWidgetCount` |
| Refresh button | `PROJECTS_TESTIDS.upcomingWidgetRefresh` |
| Skeleton | `PROJECTS_TESTIDS.upcomingWidgetSkeleton` |
| Error | `PROJECTS_TESTIDS.upcomingWidgetError` |
| Empty | `PROJECTS_TESTIDS.upcomingWidgetEmpty` |
| Empty CTA | `PROJECTS_TESTIDS.upcomingWidgetCreateCta` |
| Item | `projects-upcoming-item-{taskId}` |
| Item title | `projects-upcoming-item-title-{taskId}` |
| Item due | `projects-upcoming-item-due-{taskId}` |

需新增至 `design/components/projects/testids.md`：

```ts
// Sidebar Upcoming Tasks Widget
upcomingWidget: "projects-upcoming-widget",
upcomingWidgetCount: "projects-upcoming-count",
upcomingWidgetRefresh: "projects-upcoming-refresh",
upcomingWidgetSkeleton: "projects-upcoming-skeleton",
upcomingWidgetError: "projects-upcoming-error",
upcomingWidgetEmpty: "projects-upcoming-empty",
upcomingWidgetCreateCta: "projects-upcoming-create-cta",
upcomingWidgetItem: "projects-upcoming-item",                  // suffix -{taskId}
upcomingWidgetItemTitle: "projects-upcoming-item-title",       // suffix -{taskId}
upcomingWidgetItemDue: "projects-upcoming-item-due",           // suffix -{taskId}
```

---

## API 串接

```
GET /api/v1/tasks/upcoming?days=7&limit=5
→ 200 [
  {
    id, project_id, project_name, project_color,
    title, status, priority,
    due_at,                  // ISO
    is_overdue: boolean
  },
  ...（依 due_at asc）
]
```

> 過期判定：`is_overdue = (due_at < now())`，由 API 計算或前端 derive 皆可（spec 未強制；本元件接受任一）。

---

## 響應式

| 斷點 | 行為 |
|------|------|
| Sidebar 展開（>= 1024px） | 完整顯示 |
| Sidebar 折疊 / mobile drawer | 由 parent 控制是否渲染；本元件本身不負責折疊樣式 |

---

## a11y

- `<aside>` + `aria-labelledby` 構成地標
- 每筆 task 為 `<button>`，`aria-label` 完整描述（標題 + 到期 + 專案）
- 過期狀態：`AlertCircleIcon` + 文字「逾期 N 天」 + destructive 色，三重表達
- Project color dot 為純裝飾，`aria-hidden="true"`
- 對比：destructive 與 muted-foreground 既有 token 已通過 4.5:1
- 觸控目標：每 row hit area 約 36–40px（含 padding 1.5），整 widget 在 sidebar 底部建議 parent 保留 8px 間距
- Reduced motion：`animate-spin` 在 `prefers-reduced-motion: reduce` 下停用（Tailwind 預設行為，或在 globals 補規則）
