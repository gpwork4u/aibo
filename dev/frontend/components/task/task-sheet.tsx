"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RefsPicker } from "@/components/task/refs-picker";
import {
  useCompleteTask,
  useDeleteTask,
  useTask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import type { TaskPriority, TaskRef, TaskStatus } from "@/lib/api/tasks";
import { PROJECTS_TESTIDS } from "@/lib/projects/testids";

interface TaskSheetProps {
  taskId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "normal", "high", "urgent"];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "待辦",
  in_progress: "進行中",
  blocked: "受阻",
  done: "已完成",
  cancelled: "取消",
};
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "低",
  normal: "中",
  high: "高",
  urgent: "緊急",
};

export function TaskSheet({ taskId, projectId, open, onOpenChange }: TaskSheetProps) {
  const taskQ = useTask(open ? taskId : null);
  const updateMut = useUpdateTask(projectId);
  const completeMut = useCompleteTask(projectId);
  const deleteMut = useDeleteTask(projectId);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<TaskStatus>("todo");
  const [priority, setPriority] = React.useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = React.useState("");
  const [refs, setRefs] = React.useState<TaskRef[]>([]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [toastMarker, setToastMarker] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (taskQ.data) {
      setTitle(taskQ.data.title);
      setDescription(taskQ.data.description ?? "");
      setStatus(taskQ.data.status);
      setPriority(taskQ.data.priority);
      setDueDate(taskQ.data.due_date ?? "");
      setRefs(taskQ.data.refs ?? []);
    }
  }, [taskQ.data]);

  const handleSave = async () => {
    if (!taskId) return;
    if (!title.trim()) {
      toast.error("標題不可為空");
      return;
    }
    try {
      await updateMut.mutateAsync({
        id: taskId,
        input: {
          title: title.trim(),
          description: description.trim() ? description : null,
          status,
          priority,
          due_date: dueDate || null,
          refs,
        },
      });
      toast.success("已儲存");
      setToastMarker("task-toast-saved");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  const handleComplete = async () => {
    if (!taskId) return;
    try {
      await completeMut.mutateAsync(taskId);
      toast.success("任務已完成");
      setToastMarker("task-toast-completed");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "標記完成失敗");
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    try {
      await deleteMut.mutateAsync(taskId);
      toast.success("已刪除");
      setToastMarker("task-toast-deleted");
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  return (
    <>
      {toastMarker && (
        <span
          aria-hidden="true"
          className="sr-only"
          data-testid={toastMarker}
        />
      )}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
          data-testid={PROJECTS_TESTIDS.taskSheet}
        >
          <SheetHeader>
            <SheetTitle>編輯任務</SheetTitle>
            <SheetDescription>修改標題、狀態、優先級、到期日與關聯來源</SheetDescription>
          </SheetHeader>

          {taskQ.isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : taskQ.isError ? (
            <p className="mt-4 text-sm text-destructive">
              {taskQ.error instanceof Error ? taskQ.error.message : "載入失敗"}
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="task-title">標題</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid={PROJECTS_TESTIDS.taskSheetTitle}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="task-description">描述</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  data-testid={PROJECTS_TESTIDS.taskSheetDescription}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>狀態</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as TaskStatus)}
                  >
                    <SelectTrigger data-testid={PROJECTS_TESTIDS.taskSheetStatus}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>優先級</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as TaskPriority)}
                  >
                    <SelectTrigger data-testid={PROJECTS_TESTIDS.taskSheetPriority}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="task-due">到期日</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid={PROJECTS_TESTIDS.taskSheetDueDate}
                />
              </div>

              <div className="space-y-1" data-testid={PROJECTS_TESTIDS.taskSheetRefs}>
                <Label>關聯來源</Label>
                <RefsPicker value={refs} onChange={setRefs} />
              </div>
            </div>
          )}

          <SheetFooter className="mt-6 flex-row flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={!taskId || deleteMut.isPending}
              data-testid={PROJECTS_TESTIDS.taskSheetDelete}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              刪除
            </Button>
            <div className="flex gap-2">
              {status !== "done" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleComplete}
                  disabled={!taskId || completeMut.isPending}
                  data-testid={PROJECTS_TESTIDS.taskSheetComplete}
                >
                  {completeMut.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  完成
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={updateMut.isPending}
                data-testid={PROJECTS_TESTIDS.taskSheetSave}
              >
                {updateMut.isPending && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                儲存
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除任務？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原，相關的 task_refs 也會一併刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid={PROJECTS_TESTIDS.taskSheetDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
