"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GCAL_SETTINGS_TESTIDS } from "@/lib/gcal-settings/testids";
import {
  useDisconnectGcal,
  useGcalCalendars,
  useGcalStatus,
  useStartGcalAuth,
  useUpdateGcalSettings,
} from "@/lib/hooks/use-gcal-settings";

export function GcalStatusCard() {
  const { data: status, isLoading } = useGcalStatus();
  const isConnected = !!status?.connected;
  const { data: calendarsResp, isLoading: loadingCalendars } = useGcalCalendars({
    enabled: isConnected,
  });
  const updateMut = useUpdateGcalSettings();
  const disconnectMut = useDisconnectGcal();
  const startAuth = useStartGcalAuth();

  const [selectedCalendarId, setSelectedCalendarId] = React.useState<string>("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (status?.default_calendar_id) {
      setSelectedCalendarId(status.default_calendar_id);
    }
  }, [status?.default_calendar_id]);

  const handleConnect = async () => {
    try {
      const res = await startAuth.mutateAsync();
      window.location.href = res.auth_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "啟動授權失敗");
    }
  };

  const handleSave = async () => {
    if (!selectedCalendarId) return;
    try {
      await updateMut.mutateAsync({ default_calendar_id: selectedCalendarId });
      toast.success("已儲存設定", { id: GCAL_SETTINGS_TESTIDS.toastSaved });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMut.mutateAsync();
      toast.success("已中斷 Google Calendar 連線", {
        id: GCAL_SETTINGS_TESTIDS.toastDisconnected,
      });
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "中斷連線失敗");
    }
  };

  if (isLoading) {
    return (
      <Card data-testid={GCAL_SETTINGS_TESTIDS.section}>
        <CardHeader>
          <h2 className="text-lg font-semibold">Google Calendar</h2>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={GCAL_SETTINGS_TESTIDS.section}>
      <CardHeader>
        <h2 className="text-lg font-semibold">Google Calendar</h2>
        <p className="text-sm text-muted-foreground">
          整合行事曆事件到 aibo 的彙整視圖。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div
            className="flex flex-col items-start gap-3 rounded-md border border-dashed p-4"
            data-testid={GCAL_SETTINGS_TESTIDS.notConnectedState}
          >
            <p className="text-sm text-muted-foreground">尚未連接 Google Calendar</p>
            <Button
              onClick={handleConnect}
              disabled={startAuth.isPending}
              data-testid={GCAL_SETTINGS_TESTIDS.connectButton}
            >
              {startAuth.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plug className="mr-2 h-4 w-4" />
              )}
              連接 Google Calendar
            </Button>
          </div>
        ) : (
          <div
            className="space-y-4"
            data-testid={GCAL_SETTINGS_TESTIDS.connectedState}
          >
            {status?.needs_reauth && (
              <div
                className="flex items-start justify-between gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
                data-testid={GCAL_SETTINGS_TESTIDS.reauthBanner}
                role="status"
              >
                <div>
                  <p className="font-medium">需要重新授權</p>
                  <p className="text-xs text-muted-foreground">
                    Google Calendar token 已失效，請重新授權以恢復使用。
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnect}
                  data-testid={GCAL_SETTINGS_TESTIDS.reauthBannerReconnect}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  重新授權
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span data-testid={GCAL_SETTINGS_TESTIDS.emailLabel}>
                {status?.email ?? "已連線"}
              </span>
              {status?.access_token_expires_at && (
                <span
                  className="text-xs text-muted-foreground"
                  data-testid={GCAL_SETTINGS_TESTIDS.expiresAtLabel}
                >
                  · 到期：
                  {new Date(status.access_token_expires_at).toLocaleString("zh-TW")}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">預設日曆</label>
              {loadingCalendars ? (
                <Skeleton className="h-10 w-[280px]" />
              ) : (
                <Select
                  value={selectedCalendarId}
                  onValueChange={setSelectedCalendarId}
                >
                  <SelectTrigger
                    className="w-[280px]"
                    data-testid={GCAL_SETTINGS_TESTIDS.defaultCalendarSelect}
                  >
                    <SelectValue placeholder="選擇日曆…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(calendarsResp?.calendars ?? []).map((cal) => (
                      <SelectItem
                        key={cal.id}
                        value={cal.id}
                        data-testid={GCAL_SETTINGS_TESTIDS.defaultCalendarOption(cal.id)}
                      >
                        {cal.summary}
                        {cal.primary ? " (primary)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={
                  updateMut.isPending ||
                  !selectedCalendarId ||
                  selectedCalendarId === status?.default_calendar_id
                }
                data-testid={GCAL_SETTINGS_TESTIDS.saveSettingsButton}
              >
                {updateMut.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                儲存設定
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                data-testid={GCAL_SETTINGS_TESTIDS.disconnectButton}
              >
                中斷連線
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid={GCAL_SETTINGS_TESTIDS.disconnectDialog}>
          <AlertDialogHeader>
            <AlertDialogTitle>確認中斷 Google Calendar 連線？</AlertDialogTitle>
            <AlertDialogDescription>
              中斷後將無法在行事曆上看到 Google Calendar 事件，但 **既有已轉成知識條目的內容會保留**。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={disconnectMut.isPending}
              data-testid={GCAL_SETTINGS_TESTIDS.disconnectDialogCancel}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnectMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid={GCAL_SETTINGS_TESTIDS.disconnectDialogConfirm}
            >
              {disconnectMut.isPending ? "中斷中…" : "確認中斷"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
