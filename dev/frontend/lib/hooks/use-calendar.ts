"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCalendar,
  type CalendarView,
  type FetchCalendarResult,
} from "@/lib/api/calendar";

const GCAL_CONNECTED_CACHE_KEY = "aibo_gcal_connected";
const GCAL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 小時

interface GcalConnectedCache {
  connected: boolean;
  until: number;
}

function readGcalCache(): GcalConnectedCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GCAL_CONNECTED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GcalConnectedCache;
    if (
      typeof parsed?.connected !== "boolean" ||
      typeof parsed?.until !== "number"
    ) {
      return null;
    }
    if (parsed.until < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeGcalCache(connected: boolean) {
  if (typeof window === "undefined") return;
  try {
    const data: GcalConnectedCache = {
      connected,
      until: Date.now() + GCAL_CACHE_TTL_MS,
    };
    window.localStorage.setItem(GCAL_CONNECTED_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** 供 banner 讀取「是否已知 gcal 未連接」。 */
export function useGcalConnectedCache(): {
  connected: boolean | null;
  setConnected: (v: boolean) => void;
} {
  const [state, setState] = React.useState<boolean | null>(() => {
    const c = readGcalCache();
    return c ? c.connected : null;
  });

  const setConnected = React.useCallback((v: boolean) => {
    writeGcalCache(v);
    setState(v);
  }, []);

  return { connected: state, setConnected };
}

export const calendarKey = (
  since: string,
  until: string,
  view: CalendarView,
  includeGcal: boolean,
) => ["calendar", since, until, view, includeGcal] as const;

export interface UseCalendarParams {
  since: string;
  until: string;
  view: CalendarView;
  tz: string;
  /**
   * 若 undefined，會依 localStorage 快取決定（若已知未連 gcal 則以 false 打，避免重複 424）。
   */
  includeGcal?: boolean;
  enabled?: boolean;
}

/**
 * 取得行事曆彙整資料的 React Query hook。
 *
 * 錯誤處理：
 *   - API 回 424 GCAL_NOT_CONNECTED → hook 將 `gcalConnected` 設為 false，並在 localStorage
 *     記 1 小時避免下次重打；UI 應顯示 banner 並提示連接。
 *   - API 回 X-Degraded: gcal → `degraded === "gcal"`，UI 應顯示 toast/inline warning。
 */
export function useCalendar(params: UseCalendarParams) {
  const { connected, setConnected } = useGcalConnectedCache();
  // 若 includeGcal 未指定：
  //   連接狀態未知 → true
  //   已知未連 → false
  const effectiveIncludeGcal =
    params.includeGcal !== undefined ? params.includeGcal : connected === false ? false : true;

  const query = useQuery<FetchCalendarResult>({
    queryKey: calendarKey(params.since, params.until, params.view, effectiveIncludeGcal),
    queryFn: async () => {
      const result = await fetchCalendar({
        since: params.since,
        until: params.until,
        view: params.view,
        tz: params.tz,
        include_gcal: effectiveIncludeGcal,
      });
      // 寫回 localStorage 供下次使用
      if (!result.gcalConnected) {
        setConnected(false);
      } else if (connected !== true) {
        setConnected(true);
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 分鐘
    enabled: params.enabled !== false,
  });

  return {
    ...query,
    gcalConnected: query.data?.gcalConnected ?? connected ?? true,
    degraded: query.data?.degraded ?? null,
  };
}
