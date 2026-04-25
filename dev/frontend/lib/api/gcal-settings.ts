import { apiClient } from "./client";

export interface GcalStatus {
  connected: boolean;
  email?: string | null;
  connected_at?: string | null;
  access_token_expires_at?: string | null;
  default_calendar_id?: string | null;
  needs_reauth?: boolean;
}

export interface GcalCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  time_zone?: string;
  background_color?: string | null;
}

export interface GcalCalendarsResponse {
  calendars: GcalCalendar[];
}

export interface UpdateGcalSettingsInput {
  default_calendar_id: string;
}

export async function getGcalStatus(): Promise<GcalStatus> {
  return apiClient.get<GcalStatus>("/api/v1/integrations/gcal/status");
}

export async function listGcalCalendars(): Promise<GcalCalendarsResponse> {
  return apiClient.get<GcalCalendarsResponse>("/api/v1/integrations/gcal/calendars");
}

export async function updateGcalSettings(
  input: UpdateGcalSettingsInput,
): Promise<GcalStatus> {
  return apiClient.put<GcalStatus>("/api/v1/integrations/gcal/settings", input);
}

export async function disconnectGcal(): Promise<void> {
  await apiClient.delete("/api/v1/integrations/gcal");
}

/** 啟動 OAuth 授權：後端會回傳 auth_url，前端 redirect 過去 */
export async function startGcalAuth(): Promise<{ auth_url: string }> {
  return apiClient.post<{ auth_url: string }>("/api/v1/integrations/gcal/auth");
}
