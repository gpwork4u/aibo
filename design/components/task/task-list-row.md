# TaskListRow

`/projects/:id` List tab 的單列。基於 shadcn `<Table>`。

---

## 用途

以表格形式顯示專案內所有任務（含 cancelled），便於排序 / 批次瀏覽 / 鍵盤瀏覽。

---

## 結構

```
| ☐ | Title                | Status     | Priority | Due       | Refs | ⋯ |
| ☐ | 設計 schema           | 進行中 ●   | 急迫 🔥  | 4/30      | 📎 3 |   |
| ☑ | 撰寫遷移腳本           | 完成 ●     | 一般     | —         | —    |   |
| ☐ | 部署到 staging       | 待辦 ●     | 高      | 5/12 逾期 | 📎 1 |   |
```

---

## Props

```ts
interface TaskListRowProps {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: "low" | "normal" | "high" | "urgent";
    due_date: string | null;
    refs_count: number;
  };
  selected?: boolean;             // 預留批次選取（v1 不啟用）
  onToggleComplete: () => void;
  onOpen: () => void;
  onMenu: { edit: () => void; delete: () => void };
}
```

---

## Tailwind / 範例

```tsx
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, PaperclipIcon, ClockAlertIcon, CalendarIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_TESTIDS } from "@/lib/testids/task";

const STATUS = {
  todo:        { label: "待辦",    cls: "bg-zinc-100 text-zinc-800",       dot: "bg-zinc-400" },
  in_progress: { label: "進行中",  cls: "bg-blue-100 text-blue-900",       dot: "bg-blue-500" },
  blocked:     { label: "卡住",    cls: "bg-red-100 text-red-900",         dot: "bg-red-500" },
  done:        { label: "完成",    cls: "bg-green-100 text-green-900",     dot: "bg-green-500" },
  cancelled:   { label: "已取消",  cls: "bg-zinc-100 text-zinc-500 line-through", dot: "bg-zinc-300" },
} as const;

const PRIORITY_LABEL = { low: "低", normal: "一般", high: "高", urgent: "急迫" } as const;

<TableRow
  data-testid={`${TASK_TESTIDS.listRow}-${task.id}`}
  className={cn(
    "cursor-pointer hover:bg-muted/40",
    task.status === "done" && "opacity-70",
    task.status === "cancelled" && "opacity-50",
  )}
  onClick={onOpen}
>
  <TableCell className="w-10">
    <Checkbox
      checked={task.status === "done"}
      onCheckedChange={onToggleComplete}
      onClick={(e) => e.stopPropagation()}
      data-testid={`${TASK_TESTIDS.listRowCheckbox}-${task.id}`}
      aria-label={task.status === "done" ? `取消完成「${task.title}」` : `完成「${task.title}」`}
    />
  </TableCell>

  <TableCell
    data-testid={`${TASK_TESTIDS.listRowTitle}-${task.id}`}
    className={cn(
      "max-w-[40ch] truncate font-medium",
      task.status === "done" && "line-through text-muted-foreground",
    )}
  >
    {task.title}
  </TableCell>

  <TableCell data-testid={`${TASK_TESTIDS.listRowStatus}-${task.id}`}>
    <Badge className={cn("gap-1.5 border-transparent", STATUS[task.status].cls)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", STATUS[task.status].dot)} />
      {STATUS[task.status].label}
    </Badge>
  </TableCell>

  <TableCell data-testid={`${TASK_TESTIDS.listRowPriority}-${task.id}`}>
    <span className="text-sm text-muted-foreground">{PRIORITY_LABEL[task.priority]}</span>
  </TableCell>

  <TableCell data-testid={`${TASK_TESTIDS.listRowDue}-${task.id}`}>
    <DueCell dueDate={task.due_date} status={task.status} />
  </TableCell>

  <TableCell data-testid={`${TASK_TESTIDS.listRowRefs}-${task.id}`}>
    {task.refs_count > 0 ? (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <PaperclipIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {task.refs_count}
      </span>
    ) : (
      <span className="text-sm text-muted-foreground/60">—</span>
    )}
  </TableCell>

  <TableCell className="w-10">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
          data-testid={`${TASK_TESTIDS.listRowMenu}-${task.id}`}
          aria-label={`「${task.title}」動作選單`}
        >
          <MoreHorizontalIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onMenu.edit}>
          <PencilIcon className="mr-2 h-4 w-4" aria-hidden="true" /> 編輯
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onMenu.delete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2Icon className="mr-2 h-4 w-4" aria-hidden="true" /> 刪除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </TableCell>
</TableRow>
```

`DueCell`：

```tsx
function DueCell({ dueDate, status }: { dueDate: string | null; status: TaskStatus }) {
  if (!dueDate) return <span className="text-muted-foreground/60">—</span>;
  const isOverdue = status !== "done" && status !== "cancelled" && new Date(dueDate) < startOfTodayLocal();
  return (
    <span className={cn(
      "flex items-center gap-1 text-sm tabular-nums",
      isOverdue ? "text-destructive font-medium" : "text-foreground",
    )}>
      {isOverdue ? <ClockAlertIcon className="h-3.5 w-3.5" /> : <CalendarIcon className="h-3.5 w-3.5" />}
      {formatDateShortZh(dueDate)}
      {isOverdue && <span className="ml-1 text-xs">逾期</span>}
    </span>
  );
}
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 點擊 row（非 checkbox / menu） | onOpen → TaskSheet |
| 點擊 checkbox | onToggleComplete（不冒泡） |
| 點擊 ⋯ menu | 編輯 / 刪除（不冒泡） |
| Enter（focus 在 row） | onOpen |

---

## a11y

- row 為可點擊區，`tabIndex=0` + `role="row"`（shadcn TableRow 已是 `<tr>`）
- 內部 checkbox / menu 阻止冒泡，避免誤觸 onOpen
- status 同時用「dot 顏色 + 文字 label」表達
- overdue 用「紅色 + 不同 icon + 「逾期」文字」三重提示
- 對比通過 4.5:1
