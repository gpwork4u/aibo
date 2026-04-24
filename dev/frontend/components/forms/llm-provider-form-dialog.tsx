"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, Eye, EyeOff, Settings } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  CreateLlmProviderInput,
  LlmProvider,
  UpdateLlmProviderInput,
} from "@/lib/api/llm-providers";
import { llmProviderFormSchema, LlmProviderFormValues } from "@/lib/schemas/llm-provider";
import {
  useCreateLlmProvider,
  useUpdateLlmProvider,
} from "@/lib/hooks/use-llm-providers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface LlmProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: LlmProvider | null;
}

export function LlmProviderFormDialog({
  open,
  onOpenChange,
  provider,
}: LlmProviderFormDialogProps) {
  const isEdit = !!provider;
  const createMut = useCreateLlmProvider();
  const updateMut = useUpdateLlmProvider();
  const [showKey, setShowKey] = React.useState(false);
  // 編輯模式下，預設不修改 API Key；只有使用者主動點「更新 API Key」後才顯示輸入框
  const [apiKeyDirty, setApiKeyDirty] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const defaultValues = React.useMemo<LlmProviderFormValues>(() => {
    const cfg = provider?.config ?? {};
    return {
      name: provider?.name ?? "",
      endpoint_url: provider?.endpoint_url ?? "",
      api_key: "",
      model_name: provider?.model_name ?? "",
      is_default: provider?.is_default ?? false,
      is_active: provider?.is_active ?? true,
      temperature: (cfg.temperature as number | undefined) ?? 0.7,
      max_tokens: (cfg.max_tokens as number | undefined) ?? 1000,
      timeout: (cfg.timeout as number | undefined) ?? 30,
    };
  }, [provider]);

  const form = useForm<LlmProviderFormValues>({
    resolver: zodResolver(llmProviderFormSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setShowKey(false);
      setApiKeyDirty(false);
      setAdvancedOpen(false);
    }
  }, [open, defaultValues, form]);

  const submitting = createMut.isPending || updateMut.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const config = {
      temperature: values.temperature,
      max_tokens: values.max_tokens,
      timeout: values.timeout,
    };

    try {
      if (isEdit && provider) {
        const payload: UpdateLlmProviderInput = {
          name: values.name.trim(),
          endpoint_url: values.endpoint_url.trim(),
          model_name: values.model_name.trim(),
          is_default: values.is_default,
          is_active: values.is_active,
          config,
        };
        // API Key：未點「更新 API Key」則不送；點了後若空字串代表清除 → null
        if (apiKeyDirty) {
          payload.api_key =
            values.api_key && values.api_key.length > 0 ? values.api_key : null;
        }
        await updateMut.mutateAsync({ id: provider.id, input: payload });
        toast.success("Provider 已更新");
      } else {
        const payload: CreateLlmProviderInput = {
          name: values.name.trim(),
          endpoint_url: values.endpoint_url.trim(),
          model_name: values.model_name.trim(),
          is_default: values.is_default,
          is_active: values.is_active,
          config,
          api_key: values.api_key && values.api_key.length > 0 ? values.api_key : null,
        };
        await createMut.mutateAsync(payload);
        toast.success("Provider 已建立");
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
      <DialogContent className="sm:max-w-[600px]" data-testid="provider-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯 Provider" : "新增 Provider"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改 LLM Provider 設定" : "設定新的 LLM 服務提供者"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider-name">名稱 *</Label>
            <Input
              id="provider-name"
              placeholder="例如：LM Studio"
              maxLength={50}
              data-testid="provider-name-input"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-endpoint">Endpoint URL *</Label>
            <Input
              id="provider-endpoint"
              placeholder="https://api.openai.com/v1"
              maxLength={500}
              data-testid="provider-endpoint-input"
              {...form.register("endpoint_url")}
            />
            {form.formState.errors.endpoint_url && (
              <p className="text-xs text-destructive">
                {form.formState.errors.endpoint_url.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            {isEdit && !apiKeyDirty ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                <span
                  className="text-sm text-muted-foreground"
                  data-testid="api-key-status"
                >
                  {provider?.api_key_set ? "已設定" : "未設定"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="update-api-key-button"
                  onClick={() => {
                    setApiKeyDirty(true);
                    setShowKey(false);
                    form.setValue("api_key", "");
                  }}
                >
                  更新 API Key
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="provider-api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="選填，例如 sk-..."
                  maxLength={500}
                  data-testid="provider-api-key-input"
                  className="pr-10"
                  {...form.register("api_key")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10"
                  onClick={() => setShowKey((s) => !s)}
                  aria-label={showKey ? "隱藏 API Key" : "顯示 API Key"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              API Key 將以加密方式儲存，不會以明文顯示
            </p>
            {form.formState.errors.api_key && (
              <p className="text-xs text-destructive">
                {form.formState.errors.api_key.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-model">Model 名稱 *</Label>
            <Input
              id="provider-model"
              placeholder="例如：gpt-4 / llama-3"
              maxLength={100}
              data-testid="provider-model-input"
              {...form.register("model_name")}
            />
            {form.formState.errors.model_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.model_name.message}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.watch("is_default")}
                onCheckedChange={(v) => form.setValue("is_default", v === true)}
                data-testid="provider-is-default-checkbox"
              />
              設為預設
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.watch("is_active")}
                onCheckedChange={(v) => form.setValue("is_active", v === true)}
                data-testid="provider-is-active-checkbox"
              />
              啟用
            </label>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                data-testid="advanced-settings-toggle"
              >
                <Settings className="h-4 w-4" />
                進階設定
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    advancedOpen && "rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider-temperature">Temperature</Label>
                  <Input
                    id="provider-temperature"
                    type="number"
                    step="0.1"
                    min={0}
                    max={2}
                    data-testid="provider-temperature-input"
                    {...form.register("temperature")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider-max-tokens">Max Tokens</Label>
                  <Input
                    id="provider-max-tokens"
                    type="number"
                    min={1}
                    data-testid="provider-max-tokens-input"
                    {...form.register("max_tokens")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider-timeout">Timeout (秒)</Label>
                  <Input
                    id="provider-timeout"
                    type="number"
                    min={1}
                    data-testid="provider-timeout-input"
                    {...form.register("timeout")}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting} data-testid="provider-submit">
              {isEdit ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
