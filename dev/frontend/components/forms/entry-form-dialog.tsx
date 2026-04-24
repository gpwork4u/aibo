"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tag-input";
import { entryFormSchema, type EntryFormValues } from "@/lib/schemas/entry";
import { useCreateEntry, useUpdateEntry } from "@/lib/hooks/use-entries";
import type { Entry, EntryListItem } from "@/lib/api/entries";

type EditableEntry = Entry | EntryListItem | null | undefined;

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 有值 → 編輯模式；無值 → 建立模式 */
  entry?: EditableEntry;
  /** 顯式指定模式（可選，會被 entry 是否存在覆蓋預設判斷） */
  mode?: "create" | "edit";
  onSuccess?: (entry: Entry) => void;
}

function isFullEntry(e: EditableEntry): e is Entry {
  return !!e && "content" in (e as Entry);
}

export function EntryFormDialog({
  open,
  onOpenChange,
  entry,
  mode,
  onSuccess,
}: EntryFormDialogProps) {
  const resolvedMode: "create" | "edit" = mode ?? (entry ? "edit" : "create");
  const createMut = useCreateEntry();
  const updateMut = useUpdateEntry();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      title: "",
      content: "",
      category_id: "",
      tags: [],
      source: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    if (entry) {
      reset({
        title: entry.title ?? "",
        content: isFullEntry(entry) ? entry.content ?? "" : "",
        category_id: entry.category_id ?? "",
        tags: entry.tags ?? [],
        source: isFullEntry(entry) ? entry.source ?? "" : "",
      });
    } else {
      reset({
        title: "",
        content: "",
        category_id: "",
        tags: [],
        source: "",
      });
    }
  }, [open, entry, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const title = values.title?.trim() || null;
    const content = values.content?.trim() ? values.content : null;
    const tags = values.tags ?? [];

    try {
      if (resolvedMode === "edit" && entry) {
        const updated = await updateMut.mutateAsync({
          id: entry.id,
          payload: { title, content, tags },
        });
        toast.success("條目已更新");
        onSuccess?.(updated);
      } else {
        const created = await createMut.mutateAsync({ title, content, tags });
        toast.success("條目已建立");
        onSuccess?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "儲存失敗";
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]" data-testid="entry-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {resolvedMode === "edit" ? "編輯條目" : "建立條目"}
          </DialogTitle>
          <DialogDescription>
            {resolvedMode === "edit"
              ? "更新這筆知識條目的內容"
              : "新增一筆知識條目至你的知識庫"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entry-title">標題</Label>
            <Input
              id="entry-title"
              placeholder="選填"
              data-testid="entry-title-input"
              {...register("title")}
            />
            {errors.title?.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="entry-content">內容（Markdown）</Label>
            <Textarea
              id="entry-content"
              placeholder="# 支援 Markdown 格式..."
              rows={8}
              data-testid="entry-content-input"
              {...register("content")}
            />
            {errors.content?.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.content.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput value={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="entry-submit">
              {isSubmitting
                ? "儲存中…"
                : resolvedMode === "edit"
                  ? "儲存"
                  : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
