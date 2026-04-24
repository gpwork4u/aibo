"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { CreateApiKeyResponse } from "@/lib/api/api-keys";
import { useCreateApiKeyMutation } from "@/lib/hooks/use-api-keys";
import {
  CreateApiKeyFormValues,
  createApiKeySchema,
  expiryOptions,
  resolveExpiresAt,
} from "@/lib/schemas/api-key";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: CreateApiKeyResponse) => void;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateApiKeyDialogProps) {
  const mutation = useCreateApiKeyMutation();

  const form = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: "", expiry: "never", customExpiresAt: "" },
  });

  // 當 dialog 關閉時重設表單
  React.useEffect(() => {
    if (!open) {
      form.reset({ name: "", expiry: "never", customExpiresAt: "" });
    }
  }, [open, form]);

  const expiry = form.watch("expiry");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await mutation.mutateAsync({
        name: values.name.trim(),
        expires_at: resolveExpiresAt(values),
      });
      onOpenChange(false);
      onCreated(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("名稱已存在，請改用其他名稱");
        form.setError("name", { message: "名稱已存在" });
        return;
      }
      const message = err instanceof Error ? err.message : "建立失敗";
      toast.error(`建立失敗：${message}`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-api-key-dialog" className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>建立 API Key</DialogTitle>
          <DialogDescription>
            為新的應用或環境建立 API Key。建立後的完整 Key 僅會顯示一次。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key-name">名稱</Label>
            <Input
              id="api-key-name"
              data-testid="api-key-name-input"
              placeholder="例如：ci-bot"
              maxLength={50}
              disabled={mutation.isPending}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key-expiry">到期日</Label>
            <Select
              value={expiry}
              onValueChange={(v) =>
                form.setValue("expiry", v as CreateApiKeyFormValues["expiry"], {
                  shouldValidate: true,
                })
              }
              disabled={mutation.isPending}
            >
              <SelectTrigger id="api-key-expiry" data-testid="api-key-expiry-select">
                <SelectValue placeholder="選擇到期日" />
              </SelectTrigger>
              <SelectContent>
                {expiryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {expiry === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="api-key-custom-expiry">自訂到期日</Label>
              <Input
                id="api-key-custom-expiry"
                data-testid="api-key-custom-expiry-input"
                type="date"
                disabled={mutation.isPending}
                {...form.register("customExpiresAt")}
              />
              {form.formState.errors.customExpiresAt && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.customExpiresAt.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              取消
            </Button>
            <Button
              type="submit"
              data-testid="api-key-submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              建立
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
