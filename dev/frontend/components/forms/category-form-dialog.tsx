"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { Category } from "@/lib/api/categories";
import { categoryFormSchema, CategoryFormValues } from "@/lib/schemas/category";
import { useCreateCategory, useUpdateCategory } from "@/lib/hooks/use-categories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const isEdit = !!category;
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();

  const defaultValues = React.useMemo<CategoryFormValues>(
    () => ({
      name: category?.name ?? "",
      description: category?.description ?? "",
      sort_order: category?.sort_order ?? 0,
    }),
    [category],
  );

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const submitting = createMut.isPending || updateMut.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      description:
        values.description && values.description.length > 0 ? values.description : null,
      sort_order: values.sort_order,
    };
    try {
      if (isEdit && category) {
        await updateMut.mutateAsync({ id: category.id, input: payload });
        toast.success("分類已更新");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("分類已建立");
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("名稱已存在");
        form.setError("name", { type: "server", message: "名稱已存在" });
        return;
      }
      toast.error(err instanceof Error ? err.message : "操作失敗");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="category-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯分類" : "建立分類"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改分類基本資訊" : "建立新的知識條目分類"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">名稱 *</Label>
            <Input
              id="category-name"
              placeholder="例如：Golang"
              maxLength={50}
              data-testid="category-name-input"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">描述</Label>
            <Textarea
              id="category-description"
              placeholder="分類描述（選填）"
              rows={2}
              maxLength={200}
              data-testid="category-description-input"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-sort-order">排序</Label>
            <Input
              id="category-sort-order"
              type="number"
              min={0}
              data-testid="category-sort-order-input"
              {...form.register("sort_order")}
            />
            <p className="text-xs text-muted-foreground">數字越小排越前面</p>
            {form.formState.errors.sort_order && (
              <p className="text-xs text-destructive">
                {form.formState.errors.sort_order.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting} data-testid="category-submit">
              {isEdit ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
