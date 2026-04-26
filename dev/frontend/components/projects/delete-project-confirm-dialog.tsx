"use client";

import * as React from "react";
import { AlertTriangle as AlertTriangleIcon } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PROJECTS_TESTIDS } from "@/lib/projects/testids";

export interface DeleteProjectConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string };
  /**
   * 該專案下的 task 總數。undefined = loading；0 = 無 task；>0 = 需 force。
   */
  taskCount: number | undefined;
  onConfirm: (
    force: boolean,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
}

export function DeleteProjectConfirmDialog({
  open,
  onOpenChange,
  project,
  taskCount,
  onConfirm,
}: DeleteProjectConfirmDialogProps) {
  const [force, setForce] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForce(false);
      setError(null);
    }
  }, [open]);

  const hasTasks = taskCount !== undefined && taskCount > 0;
  const isLoadingCount = taskCount === undefined;
  // hasTasks 時，按下 force button 直接視為使用者確認（不再強制要求先勾 checkbox）。
  const canSubmit = !isLoadingCount && !submitting;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    const res = await onConfirm(hasTasks);
    setSubmitting(false);
    if (res.ok) {
      onOpenChange(false);
    } else {
      setError(res.message);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid={PROJECTS_TESTIDS.deleteDialog}
        className="sm:max-w-md"
      >
        <AlertDialogHeader>
          <AlertDialogTitle data-testid={PROJECTS_TESTIDS.deleteDialogTitle}>
            刪除專案「{project.name}」？
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isLoadingCount ? (
                <Skeleton className="h-4 w-full" />
              ) : hasTasks ? (
                <div
                  data-testid={PROJECTS_TESTIDS.deleteDialogConfirmHasTasks}
                  className="contents"
                >
                <div
                  data-testid={PROJECTS_TESTIDS.deleteDialogTaskWarning}
                  className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <AlertTriangleIcon
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    此專案下有
                    <span
                      data-testid={PROJECTS_TESTIDS.deleteDialogTaskCount}
                      className="mx-1 font-semibold tabular-nums"
                    >
                      {taskCount}
                    </span>
                    筆任務，刪除將一併移除這些任務與其關聯資料，且無法復原。
                  </p>
                </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">此操作無法復原。</p>
              )}

              {hasTasks && (
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm",
                    force
                      ? "border-destructive bg-destructive/5"
                      : "border-border",
                  )}
                >
                  <Checkbox
                    checked={force}
                    onCheckedChange={(v) => setForce(v === true)}
                    data-testid={PROJECTS_TESTIDS.deleteDialogForceCheckbox}
                    className="mt-0.5"
                  />
                  <span className="leading-snug">
                    我了解風險，仍要強制刪除
                    <code className="ml-1 rounded bg-muted px-1 text-[11px] font-mono">
                      force=true
                    </code>
                  </span>
                </label>
              )}

              {error && (
                <p
                  data-testid={PROJECTS_TESTIDS.deleteDialogError}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            data-testid={PROJECTS_TESTIDS.deleteDialogCancel}
            disabled={submitting}
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canSubmit}
            data-testid={PROJECTS_TESTIDS.deleteDialogConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {submitting ? "刪除中…" : "確認刪除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
