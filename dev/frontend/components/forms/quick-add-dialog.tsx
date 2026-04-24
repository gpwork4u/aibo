"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
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
import { quickAddSchema, type QuickAddValues } from "@/lib/schemas/entry";
import { useCreateEntry } from "@/lib/hooks/use-entries";

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const createMut = useCreateEntry();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: { title: "", content: "", tags: [] },
  });

  React.useEffect(() => {
    if (open) reset({ title: "", content: "", tags: [] });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createMut.mutateAsync({
        title: values.title?.trim() || null,
        content: values.content?.trim() ? values.content : null,
        tags: values.tags ?? [],
        category_id: null,
      });
      toast.success("已新增至 Inbox");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "建立失敗";
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="entry-form-dialog">
        <DialogHeader>
          <DialogTitle>快速新增</DialogTitle>
          <DialogDescription>快速記錄想法，之後再整理</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-title">標題</Label>
            <Input
              id="quick-title"
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
            <Label htmlFor="quick-content">內容</Label>
            <Textarea
              id="quick-content"
              placeholder="在這裡記下你的想法..."
              rows={4}
              data-testid="entry-content-input"
              {...register("content")}
            />
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
              {isSubmitting ? "新增中…" : "新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
