import { afterEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/api/client";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/api/api-keys";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api-keys client", () => {
  it("listApiKeys unwraps { data: [...] } response shape", async () => {
    const spy = vi
      .spyOn(client.apiClient, "get")
      .mockResolvedValue({ data: [{ id: "1", name: "a" }] });
    const result = await listApiKeys();
    expect(spy).toHaveBeenCalledWith("/api/v1/api-keys");
    expect(result).toEqual([{ id: "1", name: "a" }]);
  });

  it("listApiKeys returns array directly when response is array", async () => {
    vi.spyOn(client.apiClient, "get").mockResolvedValue([{ id: "2" }]);
    const result = await listApiKeys();
    expect(result).toEqual([{ id: "2" }]);
  });

  it("createApiKey POSTs the payload", async () => {
    const spy = vi
      .spyOn(client.apiClient, "post")
      .mockResolvedValue({ id: "x", key: "aibo_xxx" });
    await createApiKey({ name: "ci", expires_at: null });
    expect(spy).toHaveBeenCalledWith("/api/v1/api-keys", {
      name: "ci",
      expires_at: null,
    });
  });

  it("revokeApiKey DELETEs with encoded id", async () => {
    const spy = vi.spyOn(client.apiClient, "delete").mockResolvedValue(undefined);
    await revokeApiKey("abc 123");
    expect(spy).toHaveBeenCalledWith("/api/v1/api-keys/abc%20123");
  });
});
