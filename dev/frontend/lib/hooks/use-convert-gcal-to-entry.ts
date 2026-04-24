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
    onSuccess: (_data, variables) => {
      toast.success("已轉成知識條目");
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: calendarDayKey(variables.date) });
    },
    onError: (err) => {
      const mapped = convertEventErrorMessage(err);
      if (!mapped) {
        toast.error("轉換失敗");
        return;
      }
      switch (mapped.code) {
        case "ALREADY_LINKED":
          // 已存在：重新載入當日讓 linked_entry_id 出現
          toast.info(mapped.message);
          // invalidate 交由 caller 自己處理
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
