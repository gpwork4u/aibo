"use client";

import * as React from "react";
import { KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiKey, CreateApiKeyResponse } from "@/lib/api/api-keys";
import {
  useApiKeysQuery,
  useRevokeApiKeyMutation,
} from "@/lib/hooks/use-api-keys";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { CreateApiKeyDialog } from "@/components/forms/create-api-key-dialog";
import { ShowApiKeyDialog } from "@/components/forms/show-api-key-dialog";

type ApiKeyStatus = "active" | "expired" | "inactive";

function deriveStatus(key: ApiKey): ApiKeyStatus {
  if (!key.is_active) return "inactive";
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
    return "expired";
  }
  return "active";
}

function StatusBadge({ status }: { status: ApiKeyStatus }) {
  const map: Record<ApiKeyStatus, { label: string; variant: "success" | "warning" | "secondary" }> = {
    active: { label: "Active", variant: "success" },
    expired: { label: "Expired", variant: "warning" },
    inactive: { label: "Inactive", variant: "secondary" },
  };
  const cfg = map[status];
  return (
    <Badge variant={cfg.variant} data-testid="key-status" data-status={status}>
      {cfg.label}
    </Badge>
  );
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "永不過期";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "從未使用";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "剛剛";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return d.toLocaleDateString("zh-TW");
}

export default function ApiKeysPage() {
  const { data: apiKeys, isLoading, isError, error, refetch } = useApiKeysQuery();
  const revokeMutation = useRevokeApiKeyMutation();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<ApiKey | null>(null);

  const keys = React.useMemo(() => apiKeys ?? [], [apiKeys]);
  const activeKeysCount = React.useMemo(
    () => keys.filter((k) => deriveStatus(k) === "active").length,
    [keys],
  );

  const handleCreated = (result: CreateApiKeyResponse) => {
    // 完整 key 只保留在 local state，不放入 query cache
    setNewlyCreatedKey(result.key);
    toast.success("API Key 已建立");
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    try {
      await revokeMutation.mutateAsync(revokeTarget.id);
      toast.success("API Key 已撤銷");
      setRevokeTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "撤銷失敗";
      toast.error(`撤銷失敗：${message}`);
    }
  };

  const createButton = (
    <Button
      onClick={() => setCreateOpen(true)}
      data-testid="create-api-key-button"
    >
      <Plus className="mr-2 h-4 w-4" />
      建立 API Key
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="API Key 管理"
        description="管理 API 存取金鑰"
        action={createButton}
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <ErrorState
          message={error instanceof Error ? error.message : "無法載入 API Keys"}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && keys.length === 0 && (
        <EmptyState
          title="尚未建立任何 API Key"
          description="建立你的第一把 API Key 以開始使用。"
          icon={<KeyRound className="h-12 w-12" />}
          action={createButton}
        />
      )}

      {!isLoading && !isError && keys.length > 0 && (
        <div
          className="overflow-x-auto rounded-md border"
          data-testid="api-keys-table"
        >
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-muted/50 [&_tr]:border-b">
              <tr>
                <th className="h-10 px-3 text-left align-middle font-semibold text-muted-foreground">
                  名稱
                </th>
                <th className="h-10 w-[160px] px-3 text-left align-middle font-semibold text-muted-foreground">
                  Key 前綴
                </th>
                <th className="h-10 w-[110px] px-3 text-left align-middle font-semibold text-muted-foreground">
                  狀態
                </th>
                <th className="h-10 w-[140px] px-3 text-left align-middle font-semibold text-muted-foreground">
                  到期日
                </th>
                <th className="h-10 w-[140px] px-3 text-left align-middle font-semibold text-muted-foreground">
                  最後使用
                </th>
                <th className="h-10 w-[100px] px-3 text-right align-middle font-semibold text-muted-foreground">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {keys.map((key) => {
                const status = deriveStatus(key);
                const isLastActive = status === "active" && activeKeysCount === 1;

                return (
                  <tr
                    key={key.id}
                    data-testid="api-key-row"
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td
                      className="p-3 align-middle font-medium"
                      data-testid="key-name"
                    >
                      {key.name}
                    </td>
                    <td
                      className="p-3 align-middle font-mono text-sm text-muted-foreground"
                      data-testid="key-prefix"
                    >
                      {key.key_prefix}
                    </td>
                    <td className="p-3 align-middle">
                      <StatusBadge status={status} />
                    </td>
                    <td
                      className="p-3 align-middle text-muted-foreground"
                      data-testid="key-expires-at"
                    >
                      {formatExpiry(key.expires_at)}
                    </td>
                    <td
                      className="p-3 align-middle text-muted-foreground"
                      data-testid="key-last-used"
                    >
                      {formatRelative(key.last_used_at)}
                    </td>
                    <td className="p-3 text-right align-middle">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              // span wrapper 讓 disabled button 的 tooltip 仍可觸發
                              className="inline-flex"
                              tabIndex={isLastActive ? 0 : -1}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                data-testid="revoke-key-button"
                                disabled={isLastActive}
                                onClick={() => setRevokeTarget(key)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                撤銷
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {isLastActive && (
                            <TooltipContent>
                              不能撤銷最後一把有效的 API Key
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 建立 Dialog */}
      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {/* 顯示完整 Key Dialog */}
      <ShowApiKeyDialog
        apiKey={newlyCreatedKey}
        onClose={() => setNewlyCreatedKey(null)}
      />

      {/* 撤銷確認 AlertDialog */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent data-testid="revoke-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>確認撤銷 API Key</AlertDialogTitle>
            <AlertDialogDescription>
              撤銷後，使用「{revokeTarget?.name}」的所有應用程式將無法存取 API。
              此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="revoke-confirm-button"
              disabled={revokeMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleRevokeConfirm();
              }}
            >
              {revokeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              撤銷
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
