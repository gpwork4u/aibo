import { apiClient, ApiError } from "./client";

export interface BootstrapStatus {
  bootstrapped: boolean;
}

export interface BootstrapResult {
  id: string;
  name: string;
  key: string;
  created_at: string;
}

// Bootstrap 狀態：嘗試未認證呼叫 POST /api/v1/auth/api-keys 建立（空 name 會 400），
// 若 401 代表已 bootstrapped，400/其他代表可以 bootstrap。
// 實際實作：用一個試探性 GET /api/v1/auth/api-keys（需認證，若 bootstrap 未完成會得到什麼？）
// 最簡單做法：直接嘗試建立，若 401 轉向提示輸入已有的 key。
export async function fetchBootstrapStatus(): Promise<BootstrapStatus> {
  // 探測：嘗試列 api-keys（不帶 auth）。已 bootstrap 會 401，未 bootstrap 也會 401（所有 v1 都需 auth 除了建立第一把）
  // 改用另一個探測：嘗試建立但帶無效 body → 若 400 (INVALID_INPUT) 表示 bootstrap 可用；若 401 表示已 bootstrapped
  try {
    await apiClient.post(
      "/api/v1/auth/api-keys",
      {}, // 空 body 會被 400 或 201（若 bootstrap 且 name 空則 INVALID_INPUT）
      { skipAuth: true },
    );
    return { bootstrapped: false };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { bootstrapped: true };
      if (err.status === 400) return { bootstrapped: false };
    }
    throw err;
  }
}

export async function createFirstApiKey(name: string): Promise<BootstrapResult> {
  return apiClient.post<BootstrapResult>(
    "/api/v1/auth/api-keys",
    { name },
    { skipAuth: true },
  );
}
