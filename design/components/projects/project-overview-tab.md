# ProjectOverviewTab

`/projects/:id` 詳情頁的 Overview tab 內容：description、時程、整體進度、stats、最近活動。

---

## 用途

讓使用者在不切到 Board / List 的情況下，快速理解專案輪廓與進度。

---

## 結構

```
┌──────────────────────────────────────────────────────┐
│ 進度                                                   │
│ ─────────────────────────────────────────────  60%    │  ← 大號 progress bar + label
│ 12 / 20 完成                                           │
├──────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│ │ 全部    │ │ 完成    │ │ 卡住    │ │ 逾期    │      │
│ │ 20      │ │ 12      │ │ 1       │ │ 3       │      │  ← 4 個 Stat Cards
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
├──────────────────────────────────────────────────────┤
│ 時程                                                   │
│ 📅 2026-04-01 → 2026-06-30（剩 67 天）                │
├──────────────────────────────────────────────────────┤
│ 描述                                                   │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 知識庫 + LLM 代理人格                              │ │  ← markdown / 純文字
│ └──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│ 最近活動                                               │
│ • 2 小時前  完成「設計 schema」                         │
│ • 昨天      新增「資料庫 migration」                    │
│ • 3 天前    建立此專案                                  │
└──────────────────────────────────────────────────────┘
```

---

## Props

```ts
interface ProjectOverviewTabProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    status: ProjectStatus;
    progress: number;
    start_date: string | null;
    end_date: string | null;
    task_counts: {
      total: number;
      by_status: Record<TaskStatus, number>;
      overdue: number;
    };
    created_at: string;
    updated_at: string;
  };
  recentActivity: Array<{
    id: string;
    type: "task_created" | "task_completed" | "task_status_changed" | "project_created" | "project_updated";
    label: string;        // 已格式化的繁中描述
    at: string;           // ISO
    task_id?: string;
  }>;
}
```

---

## Tailwind / 範例

```tsx
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, ListTodoIcon, CheckCircle2Icon, AlertOctagonIcon, ClockAlertIcon } from "lucide-react";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { cn } from "@/lib/utils";
import { PROJECTS_TESTIDS } from "@/lib/testids/projects";

<div data-testid={PROJECTS_TESTIDS.detailTabOverview} className="space-y-6 py-4">
  {/* Progress block */}
  <section
    data-testid={PROJECTS_TESTIDS.overviewProgress}
    aria-label="專案整體進度"
  >
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-sm font-medium text-muted-foreground">進度</h2>
      <span className="text-2xl font-semibold tabular-nums">
        {project.progress}%
      </span>
    </div>
    <Progress
      value={project.progress}
      className="h-2.5"
      data-testid={PROJECTS_TESTIDS.overviewProgressBar}
      aria-label={`進度 ${project.progress}%`}
    />
    <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
      {project.task_counts.by_status.done ?? 0} / {project.task_counts.total} 完成
    </p>
  </section>

  {/* Stats grid */}
  <section
    data-testid={PROJECTS_TESTIDS.overviewStats}
    className="grid grid-cols-2 gap-3 sm:grid-cols-4"
  >
    <StatCard
      testid={PROJECTS_TESTIDS.overviewStatTotal}
      icon={<ListTodoIcon className="h-4 w-4" aria-hidden="true" />}
      label="全部"
      value={project.task_counts.total}
    />
    <StatCard
      testid={PROJECTS_TESTIDS.overviewStatDone}
      icon={<CheckCircle2Icon className="h-4 w-4 text-green-700 dark:text-green-300" aria-hidden="true" />}
      label="完成"
      value={project.task_counts.by_status.done ?? 0}
    />
    <StatCard
      testid={PROJECTS_TESTIDS.overviewStatBlocked}
      icon={<AlertOctagonIcon className="h-4 w-4 text-red-700 dark:text-red-300" aria-hidden="true" />}
      label="卡住"
      value={project.task_counts.by_status.blocked ?? 0}
    />
    <StatCard
      testid={PROJECTS_TESTIDS.overviewStatOverdue}
      icon={<ClockAlertIcon className="h-4 w-4 text-orange-700 dark:text-orange-300" aria-hidden="true" />}
      label="逾期"
      value={project.task_counts.overdue}
      highlight={project.task_counts.overdue > 0}
    />
  </section>

  {/* Timeline */}
  <section
    data-testid={PROJECTS_TESTIDS.overviewTimeline}
    aria-label="專案時程"
  >
    <h2 className="mb-2 text-sm font-medium text-muted-foreground">時程</h2>
    <p className="flex items-center gap-2 text-sm">
      <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      {project.start_date ? formatDateZh(project.start_date) : "未設定"}
      <span className="text-muted-foreground">→</span>
      {project.end_date ? formatDateZh(project.end_date) : "未設定"}
      {project.end_date && (
        <span className="text-xs text-muted-foreground">
          （{daysRemainingZh(project.end_date)}）
        </span>
      )}
    </p>
  </section>

  {/* Description */}
  {project.description && (
    <section
      data-testid={PROJECTS_TESTIDS.overviewDescription}
      aria-label="專案描述"
    >
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">描述</h2>
      <article className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-card p-4">
        <MarkdownViewer source={project.description} />
      </article>
    </section>
  )}

  {/* Recent activity */}
  <section
    data-testid={PROJECTS_TESTIDS.overviewActivity}
    aria-label="最近活動"
  >
    <h2 className="mb-2 text-sm font-medium text-muted-foreground">最近活動</h2>
    {recentActivity.length === 0 ? (
      <p className="text-sm italic text-muted-foreground">尚無活動</p>
    ) : (
      <ol className="space-y-2">
        {recentActivity.slice(0, 8).map((a, i) => (
          <li
            key={a.id}
            data-testid={`${PROJECTS_TESTIDS.overviewActivityItem}-${i}`}
            className="flex items-start gap-3 text-sm"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground"
            />
            <div className="flex-1">
              <span className="text-muted-foreground tabular-nums">
                {formatRelativeZh(a.at)}
              </span>
              <span className="mx-2 text-muted-foreground/60">·</span>
              <span>{a.label}</span>
            </div>
          </li>
        ))}
      </ol>
    )}
  </section>
</div>
```

`StatCard` 是內部小元件：

```tsx
function StatCard({ testid, icon, label, value, highlight }: {
  testid: string; icon: React.ReactNode; label: string; value: number; highlight?: boolean;
}) {
  return (
    <Card
      data-testid={testid}
      className={cn(
        "transition-colors",
        highlight && "border-orange-300 bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/20",
      )}
    >
      <CardContent className="flex flex-col gap-1 p-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}
```

---

## States

| 狀態 | 視覺 |
|------|------|
| total = 0 | progress 顯示 0%、stat 全部 0、無「最近活動」→ 顯示「尚無活動」 |
| overdue > 0 | stat 卡橘色背景 + 邊框 |
| 無 description | 不渲染描述 section |
| 無 start/end date | 顯示「未設定」灰字 |

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點擊 activity item（task_*） | 開啟對應 TaskSheet（parent 處理） |
| 點擊「描述」中的連結 | new tab 開啟（MarkdownViewer 處理） |

---

## a11y

- 每個 section 有 `aria-label`
- progress 用 shadcn `<Progress>` 內建 `role="progressbar"` + `aria-valuenow`
- 圖示 `aria-hidden="true"`，文字 label 提供語意
- stats 卡顏色強調僅輔助；數字 + 文字提供主要資訊
- 對比通過 4.5:1（重點色階皆來自 `design/tokens/projects.json`）
