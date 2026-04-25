"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GcalStatus,
  GcalCalendarsResponse,
  UpdateGcalSettingsInput,
  disconnectGcal,
  getGcalStatus,
  listGcalCalendars,
  startGcalAuth,
  updateGcalSettings,
} from "@/lib/api/gcal-settings";

export const GCAL_STATUS_KEY = ["gcal", "status"] as const;
export const GCAL_CALENDARS_KEY = ["gcal", "calendars"] as const;

export function useGcalStatus() {
  return useQuery<GcalStatus>({
    queryKey: GCAL_STATUS_KEY,
    queryFn: () => getGcalStatus(),
    staleTime: 60_000,
  });
}

export function useGcalCalendars(opts: { enabled?: boolean } = {}) {
  return useQuery<GcalCalendarsResponse>({
    queryKey: GCAL_CALENDARS_KEY,
    queryFn: () => listGcalCalendars(),
    enabled: opts.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateGcalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGcalSettingsInput) => updateGcalSettings(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GCAL_STATUS_KEY });
      qc.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useDisconnectGcal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectGcal(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GCAL_STATUS_KEY });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: GCAL_CALENDARS_KEY });
    },
  });
}

export function useStartGcalAuth() {
  return useMutation({
    mutationFn: () => startGcalAuth(),
  });
}
