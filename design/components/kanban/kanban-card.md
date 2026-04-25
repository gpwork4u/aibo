# KanbanCard

Kanban 上的單張任務卡片，是拖移最小單位。

---

## 用途

呈現任務摘要（title / priority / due date / refs / status indicator / 完成勾勾），並透過 drag handle 支援滑鼠 + 鍵盤拖移。

---

## 結構

```
┌──────────────────────────────────────────────┐
│ ⠿  ☐  設計 schema                  [急迫]    │  ← drag handle + checkbox + title + priority badge
│       4/30  📎 3                              │  ← due date + refs count
└──────────────────────────────────────────────┘
```

過期：due date 變紅 + clock-alert icon。
完成（done）：title 加刪除線、整體 `opacity-70`。

---

## Props

```ts
interface KanbanCardProps {
  task: {
    id: string;
    title: string;
    status: TaskStatus;             // todo / in_progress / blocked / done
    priority: "low" | "normal" | "high" | "urgent";
    due_date: string | null;        // YYYY-MM-DD
    refs_count: number;
  };
  onOpen: () => void;
  onComplete: () => void;
  isDragOverlay?: boolean;          // true = 在 DragOverlay 中渲染（不掛 useSortable）
}
```

---

## Tailwind / 範例

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { GripVerticalIcon, CalendarIcon, ClockAlertIcon, PaperclipIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { KANBAN_TESTIDS } from "@/lib/testids/kanban";

const PRIORITY = {
  low:    { label: "低",    cls: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300" },
  normal: { label: "一般",  cls: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200" },
  high:   { label: "高",    cls: "border-orange-300 bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200" },
  urgent: { label: "急迫",  cls: "border-red-300 bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200" },
} as const;

const STATUS_DOT = {
  todo:        "bg-zinc-400",
  in_progress: "bg-blue-500",
  blocked:     "bg-red-500",
  done:        "bg-green-500",
} as const;

export function KanbanCard({ task, onOpen, onComplete, isDragOverlay }: KanbanCardProps) {
  const sortable = useSortable({
    id: task.id,
    data: { columnStatus: task.status },
    disabled: isDragOverlay,
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const isOverdue =
    task.due_date && task.status !== "done" && new Date(task.due_date) < startOfTodayLocal();
  const isDone = task.status === "done";

  const style = isDragOverlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  return (
    <article
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      data-testid={`${KANBAN_TESTIDS.card}-${task.id}`}
      className={cn(
        "group relative rounded-md border bg-card shadow-sm transition-shadow",
        "hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
        isDragging && "opacity-40",
        isDragOverlay && "rotate-[2deg] shadow-2xl ring-2 ring-blue-400",
        isDone && "opacity-70",
      )}
    >
      {/* status indicator dot（左側 4px 直條） */}
      <span
        aria-hidden="true"
        data-testid={`${KANBAN_TESTIDS.cardStatusDot}-${task.id}`}
        className={cn(
          "absolute inset-y-0 left-0 w-1 rounded-l-md",
          STATUS_DOT[task.status],
        )}
      />

      <div className="flex items-start gap-2 p-2.5 pl-3">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          data-testid={`${KANBAN_TESTIDS.cardDragHandle}-${task.id}`}
          aria-label={`拖移任務「${task.title}」`}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground",
            "hover:bg-muted hover:text-foreground active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "touch-none", // 防止 mobile scroll 競爭
          )}
        >
          <GripVerticalIcon className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Complete checkbox */}
        <Checkbox
          checked={isDone}
          onCheckedChange={onComplete}
          data-testid={`${KANBAN_TESTIDS.cardCompleteToggle}-${task.id}`}
          aria-label={isDone ? `取消完成任務「${task.title}」` : `完成任務「${task.title}」`}
          className="mt-1"
        />

        {/* Body */}
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 text-left focus:outline-none"
          aria-label={`開啟任務「${task.title}」詳情`}
        >
          <div className="mb-1 flex items-start gap-2">
            <h4
              data-testid={`${KANBAN_TESTIDS.cardTitle}-${task.id}`}
              className={cn(
                "line-clamp-2 flex-1 text-sm font-medium leading-snug",
                isDone && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </h4>
            {task.priority !== "normal" && (
              <Badge
                data-testid={`${KANBAN_TESTIDS.cardPriorityBadge}-${task.id}`}
                className={cn("shrink-0 border text-[10px] leading-tight", PRIORITY[task.priority].cls)}
                aria-label={`優先級：${PRIORITY[task.priority].label}`}
              >
                {PRIORITY[task.priority].label}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.due_date && (
              <span
                data-testid={`${KANBAN_TESTIDS.cardDueDate}-${task.id}`}
                className={cn(
                  "flex items-center gap-1 tabular-nums",
                  isOverdue && "text-destructive font-medium",
                )}
                aria-label={isOverdue ? `逾期：${task.due_date}` : `截止：${task.due_date}`}
              >
                {isOverdue ? (
                  <ClockAlertIcon className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {formatDateShortZh(task.due_date)}
              </span>
            )}
            {task.refs_count > 0 && (
              <span
                data-testid={`${KANBAN_TESTIDS.cardRefsCount}-${task.id}`}
                className="flex items-center gap-1"
                aria-label={`${task.refs_count} 個關聯項目`}
              >
                <PaperclipIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {task.refs_count}
              </span>
            )}
          </div>
        </button>
      </div>
    </article>
  );
}
```

---

## States

| 狀態 | 視覺 |
|------|------|
| Default | `bg-card border` + 細 shadow |
| Hover | `shadow-md` |
| Focus-within | `ring-2 ring-ring ring-offset-1` |
| isDragging（在原位的副本） | `opacity-40` |
| isDragOverlay（拖移 portal） | `rotate-2deg` + 大 shadow + 藍色 ring |
| done | 整體 `opacity-70`，title 刪除線 |
| overdue | due date 變紅 + 換 clock-alert icon |

---

## a11y

- drag handle 為 `<button>`，可 Tab，有繁中 `aria-label="拖移任務「X」"`
- complete checkbox 使用 shadcn `<Checkbox>`，`aria-label` 包含 task title
- 整張卡的點擊區是另一個 `<button>`，不與 drag handle 重疊（避免衝突）
- priority badge：`aria-label="優先級：急迫"`
- status indicator dot 為視覺輔助，狀態語意由欄位 label 提供
- overdue 同時用「紅色 + 不同 icon + 「逾期」文字 aria-label」三重提示，不單靠顏色
- `touch-none` class 確保 mobile 拖移不被 scroll 截走
- `prefers-reduced-motion`：移除 transform transition

---

## 與 KanbanBoard 的契約

- 每張卡 `useSortable({ id: task.id, data: { columnStatus: task.status } })`
- `KanbanColumn` 提供 `useDroppable({ id: 'col-{status}', data: { columnStatus: status } })`
- DragEnd 時 board 從 `over.data.current.columnStatus` 取得目標欄
