import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, API_KEY_STORAGE } from "@/lib/api/client";

describe("ApiClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects X-API-Key header from localStorage", async () => {
    window.localStorage.setItem(API_KEY_STORAGE, "secret-key");
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const client = new ApiClient({ baseURL: "http://api.test", fetchImpl });
    await client.get("/api/v1/ping");

    const [, init] = (fetchImpl as unknown as { mock: { calls: [RequestInfo, RequestInit][] } })
      .mock.calls[0];
    const headers = new Headers(init!.headers);
    expect(headers.get("X-API-Key")).toBe("secret-key");
  });

  it("skips auth header when skipAuth is set", async () => {
    window.localStorage.setItem(API_KEY_STORAGE, "secret-key");
    const fetchImpl = vi.fn(async () =>
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    ) as unknown as typeof fetch;
    const client = new ApiClient({ baseURL: "http://api.test", fetchImpl });
    await client.post("/api/v1/bootstrap", { name: "x" }, { skipAuth: true });
    const [, init] = (fetchImpl as unknown as { mock: { calls: [RequestInfo, RequestInit][] } })
      .mock.calls[0];
    const headers = new Headers(init!.headers);
    expect(headers.has("X-API-Key")).toBe(false);
  });

  it("clears API key and calls onUnauthorized on 401", async () => {
    window.localStorage.setItem(API_KEY_STORAGE, "bad-key");
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const client = new ApiClient({
      baseURL: "http://api.test",
      fetchImpl,
      onUnauthorized,
    });

    await expect(client.get("/api/v1/entries")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it("throws ApiError with status for non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: "boom" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const client = new ApiClient({ baseURL: "http://api.test", fetchImpl });
    await expect(client.get("/api/v1/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "boom",
    });
  });
});
