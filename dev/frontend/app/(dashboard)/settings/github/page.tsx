"use client";

/**
 * GitHub 設定頁面 — /settings/github
 *
 * 狀態一：未連接 → 顯示 PAT 輸入表單 + scope 說明
 * 狀態二：已連接 → 顯示 username / scopes / last_synced_at / last_error
 *                  + 中斷連接按鈕（含 AlertDialog 二次確認）
 *                  + 更新 PAT 表單（可展開）
 */

import * as React from "react";
import { ExternalLink, Github } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import {
  useConnectGithub,
  useDisconnectGithub,
  useGithubStatus,
} from "@/lib/hooks/use-github-integration";
import { formatGithubError } from "@/lib/api/github-integration";
import { GITHUB_TESTIDS } from "@/lib/github/testids";

// ─── 主頁面元件 ───────────────────────────────────────────────

export default function GithubSettingsPage() {
  const { data: status, isLoading, isError } = useGithubStatus();
  const connectMut = useConnectGithub();
  const disconnectMut = useDisconnectGithub();

  const [token, setToken] = React.useState("");
  const [connectError, setConnectError] = React.useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = React.useState(false);
  // 已連接時「更新 PAT」區塊的展開狀態
  const [showUpdateForm, setShowUpdateForm] = React.useState(false);

  // ─── 連接 ─────────────────────────────────────────────────

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setConnectError(null);
    try {
      const res = await connectMut.mutateAsync(token.trim());
      toast.success("GitHub 連接成功", {
        description: `已驗證帳號：${res.username}`,
      });
      setToken("");
      setShowUpdateForm(false);
    } catch (err) {
      const msg = formatGithubError(err);
      setConnectError(msg);
      toast.error("連接失敗", { description: msg });
    }
  };

  // ─── 中斷連接 ─────────────────────────────────────────────

  const handleDisconnect = async () => {
    try {
      await disconnectMut.mutateAsync();
      toast.success("已中斷 GitHub 連接");
      setDisconnectOpen(false);
      setToken("");
      setShowUpdateForm(false);
    } catch (err) {
      const msg = formatGithubError(err);
      toast.error("中斷失敗", { description: msg });
    }
  };

  // ─── 載入中 ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div>
        <PageHeader title="GitHub" description="管理 GitHub 個人存取權杖（PAT）整合" />
        <div className="space-y-4 max-w-xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  const connected = !isError && status?.connected === true;

  return (
    <div>
      <PageHeader title="GitHub" description="管理 GitHub 個人存取權杖（PAT）整合" />

      <div className="max-w-xl space-y-6">
        {/* 連接狀態 badge */}
        <StatusBadge connected={connected} username={status?.username} />

        {/* 已連接：顯示詳情 + 中斷 + 更新 PAT */}
        {connected && status ? (
          <ConnectedSection
            status={status}
            onDisconnect={() => setDisconnectOpen(true)}
            showUpdateForm={showUpdateForm}
            onToggleUpdateForm={() => setShowUpdateForm((v) => !v)}
            token={token}
            onTokenChange={setToken}
            connectError={connectError}
            onConnect={handleConnect}
            isPending={connectMut.isPending}
          />
        ) : (
          /* 未連接：顯示連接表單 */
          <ConnectForm
            token={token}
            onTokenChange={setToken}
            error={connectError}
            onSubmit={handleConnect}
            isPending={connectMut.isPending}
          />
        )}
      </div>

      {/* 中斷連接 AlertDialog */}
      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認中斷 GitHub 連接</AlertDialogTitle>
            <AlertDialogDescription>
              中斷後，系統將無法再透過此帳號推送 commit。
              您的現有資料不受影響，未來可以重新連接。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnectMut.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDisconnect();
              }}
              disabled={disconnectMut.isPending}
              data-testid={GITHUB_TESTIDS.DISCONNECT_CONFIRM_BUTTON}
            >
              {disconnectMut.isPending ? "中斷中…" : "確認中斷"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── 子元件 ───────────────────────────────────────────────────

/** 狀態 badge：已連接 / 未連接 */
function StatusBadge({
  connected,
  username,
}: {
  connected: boolean;
  username?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">連接狀態：</span>
      {connected ? (
        <Badge
          variant="success"
          data-testid={GITHUB_TESTIDS.STATUS_BADGE}
        >
          已連接
          {username && (
            <>
              ：
              <span data-testid={GITHUB_TESTIDS.USERNAME_DISPLAY}>{username}</span>
            </>
          )}
        </Badge>
      ) : (
        <Badge variant="secondary" data-testid={GITHUB_TESTIDS.STATUS_BADGE}>
          未連接
        </Badge>
      )}
    </div>
  );
}

/** 已連接後的詳情區塊 */
function ConnectedSection({
  status,
  onDisconnect,
  showUpdateForm,
  onToggleUpdateForm,
  token,
  onTokenChange,
  connectError,
  onConnect,
  isPending,
}: {
  status: NonNullable<ReturnType<typeof useGithubStatus>["data"]>;
  onDisconnect: () => void;
  showUpdateForm: boolean;
  onToggleUpdateForm: () => void;
  token: string;
  onTokenChange: (v: string) => void;
  connectError: string | null;
  onConnect: (e: React.FormEvent) => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* 帳號 / scopes */}
      {status.scopes && status.scopes.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">已授權 Scopes</p>
          <div className="flex flex-wrap gap-1">
            {status.scopes.map((s) => (
              <Badge key={s} variant="outline" className="text-xs font-mono">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 最後同步時間 */}
      {status.last_synced_at && (
        <p className="text-sm text-muted-foreground">
          最後同步：{new Date(status.last_synced_at).toLocaleString("zh-TW")}
        </p>
      )}

      {/* 最後錯誤（若有） */}
      {status.last_error && (
        <p
          className="text-sm text-destructive"
          data-testid={GITHUB_TESTIDS.LAST_ERROR_MESSAGE}
        >
          上次錯誤：{status.last_error}
        </p>
      )}

      {/* 操作按鈕列 */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleUpdateForm}
        >
          <Github className="mr-2 h-4 w-4" />
          {showUpdateForm ? "取消更新" : "更新 PAT"}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDisconnect}
          data-testid={GITHUB_TESTIDS.DISCONNECT_BUTTON}
        >
          中斷連接
        </Button>
      </div>

      {/* 更新 PAT 表單（可收折） */}
      {showUpdateForm && (
        <ConnectForm
          token={token}
          onTokenChange={onTokenChange}
          error={connectError}
          onSubmit={onConnect}
          isPending={isPending}
          submitLabel="更新 PAT"
          submitTestId={GITHUB_TESTIDS.UPDATE_PAT_BUTTON}
        />
      )}
    </div>
  );
}

/** PAT 輸入表單（連接 / 更新共用） */
function ConnectForm({
  token,
  onTokenChange,
  error,
  onSubmit,
  isPending,
  submitLabel = "連接",
  submitTestId = GITHUB_TESTIDS.CONNECT_BUTTON,
}: {
  token: string;
  onTokenChange: (v: string) => void;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  submitLabel?: string;
  submitTestId?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="github-token">個人存取權杖（PAT）</Label>
        <Input
          id="github-token"
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          autoComplete="off"
          data-testid={GITHUB_TESTIDS.TOKEN_INPUT}
        />
        {/* 錯誤訊息 */}
        {error && (
          <p
            className="text-sm text-destructive"
            data-testid={GITHUB_TESTIDS.ERROR_MESSAGE}
          >
            {error}
          </p>
        )}
        {/* Scope 說明 */}
        <p className="text-xs text-muted-foreground">
          需要 scopes：
          <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-xs">repo</code>、
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">read:user</code>
          。
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            如何產生 PAT
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
      <Button
        type="submit"
        disabled={isPending || !token.trim()}
        data-testid={submitTestId}
      >
        {isPending ? "連接中…" : submitLabel}
      </Button>
    </form>
  );
}
