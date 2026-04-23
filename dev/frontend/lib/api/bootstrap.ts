import { apiClient } from "./client";

export interface BootstrapStatus {
  bootstrapped: boolean;
}

export interface BootstrapResult {
  id: string;
  name: string;
  key: string;
  created_at: string;
}

export async function fetchBootstrapStatus(): Promise<BootstrapStatus> {
  return apiClient.get<BootstrapStatus>("/api/v1/bootstrap/status", {
    // status endpoint does not require auth
  });
}

export async function createFirstApiKey(name: string): Promise<BootstrapResult> {
  return apiClient.post<BootstrapResult>(
    "/api/v1/bootstrap",
    { name },
    { skipAuth: true },
  );
}
