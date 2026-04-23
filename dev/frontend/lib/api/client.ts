/**
 * API Client — fetch wrapper with automatic X-API-Key injection.
 *
 * - baseURL comes from NEXT_PUBLIC_API_URL (default http://localhost:8080)
 * - Reads API key from localStorage key "aibo_api_key"
 * - On 401 responses, clears the stored key and dispatches a custom event
 *   ("aibo:unauthorized") so the app shell can redirect to /bootstrap.
 */

export const API_KEY_STORAGE = "aibo_api_key";
export const UNAUTHORIZED_EVENT = "aibo:unauthorized";

export interface ApiClientOptions {
  baseURL?: string;
  /** Custom fetch (useful for tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Provide the API key explicitly (overrides localStorage). */
  getApiKey?: () => string | null;
  /** Called when a request returns 401. */
  onUnauthorized?: () => void;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function defaultGetApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

function defaultOnUnauthorized() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

export class ApiClient {
  private baseURL: string;
  private fetchImpl: typeof fetch;
  private getApiKey: () => string | null;
  private onUnauthorized: () => void;

  constructor(opts: ApiClientOptions = {}) {
    this.baseURL =
      opts.baseURL ??
      (typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
        : "http://localhost:8080");
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as typeof fetch);
    this.getApiKey = opts.getApiKey ?? defaultGetApiKey;
    this.onUnauthorized = opts.onUnauthorized ?? defaultOnUnauthorized;
  }

  async request<T = unknown>(
    path: string,
    init: RequestInit & { skipAuth?: boolean } = {},
  ): Promise<T> {
    const url = path.startsWith("http")
      ? path
      : `${this.baseURL}${path.startsWith("/") ? "" : "/"}${path}`;

    const headers = new Headers(init.headers ?? {});
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (!init.skipAuth) {
      const key = this.getApiKey();
      if (key) headers.set("X-API-Key", key);
    }

    const res = await this.fetchImpl(url, { ...init, headers });

    if (res.status === 401) {
      this.onUnauthorized();
      const body = await safeJson(res);
      throw new ApiError("Unauthorized", 401, body);
    }

    if (!res.ok) {
      const body = await safeJson(res);
      const message =
        (body && typeof body === "object" && "message" in body
          ? String((body as { message: unknown }).message)
          : res.statusText) || `HTTP ${res.status}`;
      throw new ApiError(message, res.status, body);
    }

    if (res.status === 204) return undefined as T;
    return (await safeJson(res)) as T;
  }

  get<T = unknown>(path: string, init?: RequestInit) {
    return this.request<T>(path, { ...init, method: "GET" });
  }
  post<T = unknown>(path: string, body?: unknown, init?: RequestInit & { skipAuth?: boolean }) {
    return this.request<T>(path, {
      ...init,
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  put<T = unknown>(path: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  patch<T = unknown>(path: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  delete<T = unknown>(path: string, init?: RequestInit) {
    return this.request<T>(path, { ...init, method: "DELETE" });
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Default singleton client used by the app. */
export const apiClient = new ApiClient();
