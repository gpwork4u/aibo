"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  convertEventErrorMessage,
  convertEventToEntry,
  type ConvertEventToEntryBody,
  type ConvertEventToEntryResult,
} from "@/lib/api/calendar-day";
import { calendarDayKey } from "@/lib/hooks/use-calendar-day";

interface MutationArgs {
  gcalId: string;
  date: string;
  body?: ConvertEventToEntryBody;
}

/**
 * F-027c：把 Google Calendar event 轉成 entry 的 mutation。
 *
 * - 成功：toast 成功、invalidate `['calendar']` 與 `['calendar-day', date]`
 * - 錯誤：依 status/code 產出對應 toast（409 / 424 / 502 / 404 / 其他）
 *
 * 錯誤處理統一透過 `convertEventErrorMessage`。
 */
export function useConvertGcalToEntry() {
  const qc = useQueryClient();
  return useMutation<ConvertEventToEntryResult, unknown, MutationArgs>({
    mutationFn: ({ gcalId, body }) => convertEventToEntry(gcalId, body),
    onSuccess: (data, variables) => {
      // 成功 toast 附「查看」action 跳轉至新 entry（spec 要求）
      const entryId = typeof data?.id === "string" ? data.id : null;
      toast.success("已轉為知識條目", {
        action: entryId
          ? {
              label: "查看",
              onClick: () => {
                if (typeof window !== "undefined") {
                  window.location.href = `/entries/${entryId}`;
                }
              },
            }
          : undefined,
      });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: calendarDayKey(variables.date) });
    },
    onError: (err, variables) => {
      const mapped = convertEventErrorMessage(err);
      if (!mapped) {
        toast.error("轉換失敗");
        return;
      }
      switch (mapped.code) {
        case "ALREADY_LINKED":
          // 已存在：invalidate 讓 linked_entry_id 能從伺服器重新載入，UI 顯示連結
          toast.info(mapped.message);
          qc.invalidateQueries({ queryKey: ["calendar"] });
          qc.invalidateQueries({ queryKey: calendarDayKey(variables.date) });
          break;
        case "GCAL_NOT_CONNECTED":
          toast.error(mapped.message, {
            action: {
              label: "前往設定",
              onClick: () => {
                if (typeof window !== "undefined") {
                  window.location.href = "/settings";
                }
              },
            },
          });
          break;
        default:
          toast.error(mapped.message);
      }
    },
  });
}
