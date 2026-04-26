"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ColumnDef, DataTable } from "@/components/data-table";
import { HealthStatus, HealthStatusValue } from "@/components/health-status";
import { LlmProviderFormDialog } from "@/components/forms/llm-provider-form-dialog";
import { LlmProvider } from "@/lib/api/llm-providers";
import {
  useCheckLlmProviderHealth,
  useDeleteLlmProvider,
  useLlmProviders,
  useUpdateLlmProvider,
} from "@/lib/hooks/use-llm-providers";

export default function LlmProvidersPage() {
  const { data, isLoading, isError, error, refetch } = useLlmProviders();
  const deleteMut = useDeleteLlmProvider();
  const updateMut = useUpdateLlmProvider();
  const healthMut = useCheckLlmProviderHealth();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LlmProvider | null>(null);
  const [deleting, setDeleting] = React.useState<LlmProvider | null>(null);
  const [healthMap, setHealthMap] = React.useState<Record<string, HealthStatusValue>>({});

  const providers = data ?? [];

  const setHealth = (id: string, v: HealthStatusValue) =>
    setHealthMap((m) => ({ ...m, [id]: v }));

  const handleHealthCheck = async (provider: LlmProvider) => {
    setHealth(provider.id, "loading");
    try {
      const res = await healthMut.mutateAsync(provider.id);
      if (res.status === "healthy") {
        setHealth(provider.id, "healthy");
        toast.success("連線正常", {
          description:
            res.response_time_ms !== undefined
              ? `回應時間 ${res.response_time_ms}ms`
              : undefined,
        });
      } else {
        setHealth(provider.id, "unhealthy");
        toast.error("連線失敗", { description: res.error ?? undefined });
      }
    } catch (err) {
      setHealth(provider.id, "unhealthy");
      toast.error("連線失敗", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleSetDefault = async (provider: LlmProvider) => {
    try {
      await updateMut.mutateAsync({
        id: provider.id,
        input: {
          name: provider.name,
          endpoint_url: provider.endpoint_url,
          model_name: provider.model_name,
          is_default: true,
          is_active: provider.is_active,
          config: provider.config,
          // api_key omitted — 不修改
        },
      });
      toast.success("已設為預設 Provider");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "設定失敗");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("Provider 已刪除");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const columns: ColumnDef<LlmProvider>[] = [
    {
      id: "name",
      header: "名稱",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.name}</span>
          {row.is_default && (
            <Badge variant="default" className="text-xs" data-testid="default-badge">
              Default
            </Badge>
          )}
        </div>
      ),
      sortKey: (row) => row.name.toLowerCase(),
    },
    {
      id: "endpoint",
      header: "Endpoint",
      className: "w-[220px]",
      accessor: (row) => (
        <span className="block max-w-[200px] truncate font-mono text-xs text-muted-foreground">
          {row.endpoint_url}
        </span>
      ),
    },
    {
      id: "model",
      header: "Model",
      className: "w-[140px]",
      accessor: (row) => <span className="text-sm">{row.model_name}</span>,
    },
    {
      id: "status",
      header: "狀態",
      className: "w-[100px]",
      accessor: (row) =>
        row.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    {
      id: "health",
      header: "健康",
      className: "w-[120px]",
      accessor: (row) => (
        <HealthStatus status={healthMap[row.id] ?? "unknown"} />
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-[160px]",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="編輯"
            data-testid="edit-provider-button"
            onClick={() => setEditing(row)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!row.is_default && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="設為預設"
              data-testid="set-default-button"
              onClick={() => handleSetDefault(row)}
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="健康檢查"
            data-testid="health-check-button"
            onClick={() => handleHealthCheck(row)}
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="刪除"
            className="text-destructive hover:text-destructive"
            data-testid="delete-provider-button"
            onClick={() => setDeleting(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="LLM Provider"
        description="管理 LLM 服務提供者"
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            data-testid="create-provider-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增 Provider
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : "載入 Provider 失敗"}
          onRetry={() => refetch()}
        />
      ) : providers.length === 0 ? (
        <div data-testid="providers-empty-state">
          <EmptyState
            icon={<Bot className="h-12 w-12" />}
            title="還沒有 LLM Provider"
            description="新增 LLM 服務提供者以啟用智慧功能"
            action={
              <Button
                onClick={() => setCreateOpen(true)}
                data-testid="create-provider-button-empty"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增 Provider
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          data={providers}
          columns={columns}
          rowKey={(row) => row.id}
          rowAttrs={(row) => ({ "data-testid": "provider-row", "data-id": row.id })}
          pageSize={20}
        />
      )}

      <LlmProviderFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <LlmProviderFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        provider={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent data-testid="delete-provider-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除 LLM Provider</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && <>確定要刪除「{deleting.name}」嗎？此操作無法復原。</>}
              {deleting?.is_default && (
                <span className="mt-2 block font-medium text-warning">
                  注意：這是目前的預設 Provider，刪除後將沒有預設 Provider。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMut.isPending}
              data-testid="delete-provider-confirm-button"
            >
              {deleteMut.isPending ? "刪除中…" : "刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
