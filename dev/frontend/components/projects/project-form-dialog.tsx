"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  PROJECTS_TESTIDS,
  PROJECT_COLOR_PALETTE,
  DEFAULT_PROJECT_COLOR,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from "@/lib/projects/testids";
import {
  projectFormSchema,
  type ProjectFormValues,
} from "@/lib/schemas/project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useCreateProject,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import type { Project, ProjectListItem } from "@/lib/api/projects";

type InitialProject =
  | (Pick<Project, "id" | "name" | "description" | "color" | "status" | "start_date" | "end_date">)
  | (Pick<ProjectListItem, "id" | "name" | "color" | "status" | "start_date" | "end_date"> & {
      description?: string | null;
    });

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = create；有值 = edit */
  project?: InitialProject | null;
  /** 建立成功後的 callback（預設 navigate 到 /projects/:id） */
  onCreated?: (project: Project) => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ["active", "paused", "done", "archived"];

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onCreated,
}: ProjectFormDialogProps) {
  const isEdit = !!project;
  const createMut = useCreateProject();
  const updateMut = useUpdateProject();

  const defaultValues = React.useMemo<ProjectFormValues>(
    () => ({
      name: project?.name ?? "",
      description: project?.description ?? "",
      color: project?.color ?? DEFAULT_PROJECT_COLOR,
      status: (project?.status as ProjectStatus | undefined) ?? "active",
      start_date: project?.start_date ?? "",
      end_date: project?.end_date ?? "",
    }),
    [project],
  );

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
    mode: "onSubmit",
  });

  const watchColor = form.watch("color");
  const watchStatus = form.watch("status") ?? "active";

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // 關閉時不 reset，避免 unmount 動畫期間閃爍
  }, [open, defaultValues, form]);

  const submitting = createMut.isPending || updateMut.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const description =
      values.description && values.description.length > 0 ? values.description : null;
    const start_date =
      values.start_date && values.start_date.length > 0 ? values.start_date : null;
    const end_date =
      values.end_date && values.end_date.length > 0 ? values.end_date : null;

    try {
      if (isEdit && project) {
        const updated = await updateMut.mutateAsync({
          id: project.id,
          input: {
            name: values.name.trim(),
            description,
            color: values.color,
            status: values.status,
            start_date,
            end_date,
          },
        });
        toast.success("專案已更新", { id: PROJECTS_TESTIDS.toastUpdated });
        onOpenChange(false);
        onCreated?.(updated);
      } else {
        const created = await createMut.mutateAsync({
          name: values.name.trim(),
          description,
          color: values.color,
          status: values.status,
          start_date,
          end_date,
        });
        toast.success("專案已建立", { id: PROJECTS_TESTIDS.toastCreated });
        onOpenChange(false);
        if (onCreated) onCreated(created);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const code =
          err.body && typeof err.body === "object" && "code" in err.body
            ? String((err.body as { code: unknown }).code)
            : "";
        if (code === "PROJECT_NAME_DUPLICATE" || code === "DUPLICATE" || true) {
          form.setError("name", { type: "server", message: "名稱已存在" });
          return;
        }
      }
      const msg = err instanceof Error ? err.message : "操作失敗";
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid={PROJECTS_TESTIDS.dialog}
      >
        <DialogHeader>
          <DialogTitle data-testid={PROJECTS_TESTIDS.dialogTitle}>
            {isEdit ? "編輯專案" : "新增專案"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* 名稱 */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name">
              名稱 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              data-testid={PROJECTS_TESTIDS.dialogNameInput}
              maxLength={80}
              autoFocus
              aria-invalid={!!form.formState.errors.name}
              aria-describedby={
                form.formState.errors.name ? "project-name-error" : undefined
              }
              className={cn(
                form.formState.errors.name &&
                  "border-destructive focus-visible:ring-destructive",
              )}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p
                id="project-name-error"
                data-testid={PROJECTS_TESTIDS.dialogNameError}
                className="text-xs text-destructive"
              >
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* 描述 */}
          <div className="space-y-1.5">
            <Label htmlFor="project-description">描述</Label>
            <Textarea
              id="project-description"
              data-testid={PROJECTS_TESTIDS.dialogDescriptionInput}
              rows={3}
              maxLength={5000}
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* 顏色 */}
          <div className="space-y-1.5">
            <Label>顏色</Label>
            <div
              data-testid={PROJECTS_TESTIDS.dialogColorPicker}
              role="radiogroup"
              aria-label="專案顏色"
              className="flex flex-wrap gap-2"
            >
              {Object.entries(PROJECT_COLOR_PALETTE).map(([key, hex]) => {
                const selected = watchColor?.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`顏色 ${key}`}
                    data-testid={PROJECTS_TESTIDS.dialogColorSwatch(key)}
                    onClick={() =>
                      form.setValue("color", hex, { shouldDirty: true })
                    }
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected ? "border-foreground scale-110" : "border-transparent",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                );
              })}
            </div>
            {form.formState.errors.color && (
              <p className="text-xs text-destructive">
                {form.formState.errors.color.message}
              </p>
            )}
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="project-start">起始日</Label>
              <Input
                id="project-start"
                type="date"
                data-testid={PROJECTS_TESTIDS.dialogStartDate}
                {...form.register("start_date")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-end">結束日</Label>
              <Input
                id="project-end"
                type="date"
                data-testid={PROJECTS_TESTIDS.dialogEndDate}
                {...form.register("end_date")}
              />
            </div>
          </div>
          {form.formState.errors.end_date && (
            <p
              data-testid={PROJECTS_TESTIDS.dialogDateError}
              className="text-xs text-destructive"
            >
              {form.formState.errors.end_date.message}
            </p>
          )}

          {/* 狀態（edit 才顯示） */}
          {isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="project-status">狀態</Label>
              <Select
                value={watchStatus}
                onValueChange={(v) =>
                  form.setValue("status", v as ProjectStatus, { shouldDirty: true })
                }
              >
                <SelectTrigger
                  id="project-status"
                  data-testid={PROJECTS_TESTIDS.dialogStatusSelect}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              data-testid={PROJECTS_TESTIDS.dialogCancel}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.watch("name")?.trim()}
              data-testid={PROJECTS_TESTIDS.dialogSubmit}
            >
              {submitting ? "儲存中…" : isEdit ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
