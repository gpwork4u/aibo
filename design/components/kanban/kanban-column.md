# KanbanColumn

Kanban 單一欄位。包含 header（status label + count + 加入任務按鈕）、sortable list、空狀態。

---

## 結構

```
┌─────────────────────────┐
│ ● 待辦   3              │  ← header（status dot + label + count）
│                    [ + ]│  ← 加入任務按鈕
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Card A              │ │
│ ├─────────────────────┤ │
│ │ Card B              │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │   尚無任務           │ │  ← 空狀態（無 cards 時）
│ │   點 + 新增          │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

拖移 hover 時整欄背景轉色 + ring。

---

## Props

```ts
interface KanbanColumnProps {
  status: TaskStatus;                    // todo / in_progress / blocked / done
  label: string;                          // 「待辦」「進行中」「卡住」「完成」
  tasks: TaskCardData[];                  // 已排序
  onAddTask: (status: TaskStatus) => void;
  onOpenTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  isDraggingOver?: boolean;               // DndContext over 此欄時為 true
}
```

---

## Tailwind / 範例

```tsx
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { KANBAN_TESTIDS } from "@/lib/testids/kanban";
import { KanbanCard } from "./kanban-card";

const STATUS_DOT = {
  todo:        "bg-zinc-400",
  in_progress: "bg-blue-500",
  blocked:     "bg-red-500",
  done:        "bg-green-500",
} as const;

export function KanbanColumn({ status, label, tasks, onAddTask, onOpenTask, onCompleteTask, isDraggingOver }: KanbanColumnProps) {
  const dropId = `col-${status}`;
  const { setNodeRef } = useDroppable({
    id: dropId,
    data: { columnStatus: status },
  });

  return (
    <section
      data-testid={`${KANBAN_TESTIDS.column}-${status}`}
      aria-label={`${label} 欄，共 ${tasks.length} 筆任務`}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40 dark:bg-muted/20"
    >
      {/* Header */}
      <header
        data-testid={`${KANBAN_TESTIDS.columnHeader}-${status}`}
        className="flex items-center gap-2 border-b px-3 py-2"
      >
        <span
          aria-hidden="true"
          className={cn("inline-block h-2 w-2 rounded-full", STATUS_DOT[status])}
        />
        <h3
          data-testid={`${KANBAN_TESTIDS.columnLabel}-${status}`}
          className="text-sm font-medium"
        >
          {label}
        </h3>
        <span
          data-testid={`${KANBAN_TESTIDS.columnCount}-${status}`}
          className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
          aria-label={`共 ${tasks.length} 筆`}
        >
          {tasks.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7"
          onClick={() => onAddTask(status)}
          data-testid={`${KANBAN_TESTIDS.columnAddTask}-${status}`}
          aria-label={`在 ${label} 欄新增任務`}
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      {/* Drop zone + sortable list */}
      <div
        ref={setNodeRef}
        data-testid={`${KANBAN_TESTIDS.columnDropZone}-${status}`}
        className={cn(
          "flex-1 space-y-2 p-2 transition-colors",
          isDraggingOver && "bg-blue-50 ring-2 ring-blue-400 ring-inset dark:bg-blue-950/30",
        )}
      >
        <ul
          data-testid={`${KANBAN_TESTIDS.columnList}-${status}`}
          className="space-y-2"
        >
          {tasks.length === 0 ? (
            <li
              data-testid={`${KANBAN_TESTIDS.columnEmpty}-${status}`}
              className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground"
            >
              尚無任務
              <button
                onClick={() => onAddTask(status)}
                className="ml-1 underline underline-offset-2 hover:text-foreground"
              >
                點 + 新增
              </button>
            </li>
          ) : (
            tasks.map((task) => (
              <li key={task.id}>
                <KanbanCard
                  task={task}
                  onOpen={() => onOpenTask(task.id)}
                  onComplete={() => onCompleteTask(task.id)}
                />
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
```

---

## States

| 狀態 | 視覺 |
|------|------|
| Default | 背景 `bg-muted/40` |
| isDraggingOver | 背景 `bg-blue-50` + `ring-2 ring-blue-400 ring-inset` |
| 空欄 | 中央顯示「尚無任務 / 點 + 新增」虛線框 |
| 拖移中（其他欄為來源） | 仍顯示原狀，僅目標欄變色 |

---

## a11y

- `<section aria-label>` 含欄名 + 任務數，screen reader 直接得知
- 加入任務按鈕 `aria-label` 標明所屬欄（「在 待辦 欄新增任務」）
- count badge 使用 `aria-label="共 N 筆"`，避免被讀成「3」這類純數字
- status dot 為純裝飾（`aria-hidden`），語意由 label 文字提供
- drop zone hover 視覺 + 同時透過 DndContext announcement 朗讀
- 觸控目標：加入按鈕本體 28×28，包覆 hit area 透過 padding 撐到 ≥ 44×44pt（可在實作時加 `before:` pseudo 元素）
