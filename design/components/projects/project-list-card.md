# ProjectListCard

`/projects` 列表頁的單張專案卡片。

---

## 用途

呈現專案核心摘要（color stripe / 名稱 / 描述 / 進度條 / status badge / 未完成 task 數 / 下一個 due date / 動作選單），點擊整張卡片進入 detail。

---

## 結構

```
┌──────────────────────────────────────────────────────┐
│ ▌ ← color stripe（左側 4px 直條，project.color）     │
│ ┌──────────────────────────────────────────────────┐ │
│ │ aibo v2                          [進行中] ⋯       │ │  ← name + status badge + menu
│ │ 知識庫 + LLM 代理人格                              │ │  ← description（line-clamp-2）
│ │ ────────────────────────────  60%                  │ │  ← progress bar + label
│ │ 12 未完成 · 下一個：4/30 設計 schema  >>           │ │  ← meta footer（task count + next due）
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

Hover：`bg-muted/40` + `shadow-sm`，整張卡 cursor-pointer。

---

## Props

```ts
interface ProjectListCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string;                   // hex
    status: "active" | "paused" | "done" | "archived";
    progress: number;                // 0..100
    start_date: string | null;       // YYYY-MM-DD
    end_date: string | null;
    open_task_count: number;
    next_due?: { task_id: string; title: string; due_date: string } | null;
    updated_at: string;
  };
  onClick: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}
```

---

## Tailwind / 範例

```tsx
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, ArchiveIcon, PencilIcon, Trash2Icon, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTS_TESTIDS } from "@/lib/testids/projects";

const STATUS_LABEL = {
  active: "進行中",
  paused: "暫停",
  done: "已完成",
  archived: "封存",
} as const;

const STATUS_CLASS = {
  active:   "border-green-300 bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200",
  paused:   "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  done:     "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  archived: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300",
} as const;

<div
  data-testid={`${PROJECTS_TESTIDS.card}-${project.id}`}
  className={cn(
    "group relative flex overflow-hidden rounded-lg border bg-card transition-all",
    "hover:bg-muted/40 hover:shadow-sm",
    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
  )}
>
  {/* Color stripe */}
  <span
    aria-hidden="true"
    data-testid={PROJECTS_TESTIDS.cardColorStripe}
    className="w-1 shrink-0"
    style={{ backgroundColor: project.color }}
  />

  {/* Click area */}
  <button
    onClick={onClick}
    aria-label={`開啟專案：${project.name}（${STATUS_LABEL[project.status]}，進度 ${project.progress}%）`}
    className="flex-1 p-4 text-left focus:outline-none"
  >
    {/* Header */}
    <div className="mb-1 flex items-start gap-2">
      <h3
        data-testid={PROJECTS_TESTIDS.cardName}
        className="line-clamp-1 flex-1 text-base font-semibold leading-snug"
      >
        {project.name}
      </h3>
      <Badge
        data-testid={PROJECTS_TESTIDS.cardStatusBadge}
        className={cn("shrink-0 gap-1 border", STATUS_CLASS[project.status])}
        aria-label={`狀態：${STATUS_LABEL[project.status]}`}
      >
        {STATUS_LABEL[project.status]}
      </Badge>
    </div>

    {/* Description */}
    {project.description && (
      <p
        data-testid={PROJECTS_TESTIDS.cardDescription}
        className="mb-3 line-clamp-2 text-sm text-muted-foreground"
      >
        {project.description}
      </p>
    )}

    {/* Progress */}
    <div className="mb-2 flex items-center gap-3">
      <Progress
        value={project.progress}
        className="h-1.5 flex-1"
        data-testid={PROJECTS_TESTIDS.cardProgressBar}
        aria-label={`進度 ${project.progress}%`}
      />
      <span
        data-testid={PROJECTS_TESTIDS.cardProgressLabel}
        className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground"
      >
        {project.progress}%
      </span>
    </div>

    {/* Meta footer */}
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span data-testid={PROJECTS_TESTIDS.cardOpenTaskCount}>
        {project.open_task_count} 未完成
      </span>
      {project.next_due && (
        <span
          data-testid={PROJECTS_TESTIDS.cardNextDue}
          className="flex items-center gap-1 truncate"
        >
          <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
          下一個：{formatDateZh(project.next_due.due_date)}
          <span className="ml-1 truncate">{project.next_due.title}</span>
        </span>
      )}
    </div>
  </button>

  {/* Action menu (絕對定位 overlay；不嵌套於主 button 內以避免 nested button) */}
  <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          data-testid={PROJECTS_TESTIDS.cardMenuTrigger}
          aria-label={`${project.name} 動作選單`}
        >
          <MoreHorizontalIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={onEdit}
          data-testid={PROJECTS_TESTIDS.cardMenuEdit}
        >
          <PencilIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          編輯
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onArchive}
          data-testid={PROJECTS_TESTIDS.cardMenuArchive}
        >
          <ArchiveIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {project.status === "archived" ? "取消封存" : "封存"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
          data-testid={PROJECTS_TESTIDS.cardMenuDelete}
        >
          <Trash2Icon className="mr-2 h-4 w-4" aria-hidden="true" />
          刪除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
```

---

## States

| 狀態 | 視覺 |
|------|------|
| Default | `bg-card border-border` |
| Hover | `bg-muted/40 shadow-sm`，menu trigger 顯現 |
| Focus-within | `ring-2 ring-ring ring-offset-2` |
| archived | 整體 `opacity-70`、color stripe 仍顯示但 saturate-50 |
| 無描述 | description 區塊不渲染 |
| 無 next_due | meta footer 只顯示 open_task_count |
| open_task_count = 0 | 仍顯示「0 未完成」（不省略，避免誤判） |

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點擊主區 | router.push(`/projects/${id}`)（Board tab 為預設） |
| Enter / Space | 同點擊 |
| 右上 ⋯ menu | 編輯 / 封存 / 刪除（刪除走二次確認） |
| Hover | menu trigger 顯現（鍵盤 focus 也會顯現） |

---

## a11y

- 整張卡 click area 為 `<button>`，可鍵盤 Tab 並有焦點環
- color stripe 為純裝飾，`aria-hidden="true"`
- status 永遠以「文字 + 顏色」雙重表達，不單靠顏色
- 進度條：`<Progress>` 內建 `role="progressbar"` + `aria-valuenow`
- 動作 menu：focus / Tab 可進入；Esc 關閉
- 對比：所有 status badge 配色已通過 4.5:1（見 `design/tokens/projects.json`）
- `prefers-reduced-motion`：移除 hover transition
