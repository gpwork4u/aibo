import { describe, expect, it } from "vitest";
import {
  createApiKeySchema,
  resolveExpiresAt,
} from "@/lib/schemas/api-key";

describe("createApiKeySchema", () => {
  it("requires a non-empty name", () => {
    const res = createApiKeySchema.safeParse({ name: "", expiry: "never" });
    expect(res.success).toBe(false);
  });

  it("rejects names longer than 50 chars", () => {
    const res = createApiKeySchema.safeParse({
      name: "x".repeat(51),
      expiry: "never",
    });
    expect(res.success).toBe(false);
  });

  it("requires customExpiresAt when expiry is custom", () => {
    const res = createApiKeySchema.safeParse({
      name: "ok",
      expiry: "custom",
      customExpiresAt: "",
    });
    expect(res.success).toBe(false);
  });

  it("rejects past custom dates", () => {
    const res = createApiKeySchema.safeParse({
      name: "ok",
      expiry: "custom",
      customExpiresAt: "2000-01-01",
    });
    expect(res.success).toBe(false);
  });

  it("accepts a valid future custom date", () => {
    const future = new Date(Date.now() + 86_400_000 * 30).toISOString().slice(0, 10);
    const res = createApiKeySchema.safeParse({
      name: "ok",
      expiry: "custom",
      customExpiresAt: future,
    });
    expect(res.success).toBe(true);
  });
});

describe("resolveExpiresAt", () => {
  it("returns null for never", () => {
    expect(
      resolveExpiresAt({ name: "x", expiry: "never", customExpiresAt: "" }),
    ).toBeNull();
  });

  it("computes a future ISO string for 30 days", () => {
    const out = resolveExpiresAt({
      name: "x",
      expiry: "30",
      customExpiresAt: "",
    });
    expect(out).not.toBeNull();
    const diffDays = (new Date(out!).getTime() - Date.now()) / 86_400_000;
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it("converts custom date to ISO string", () => {
    const out = resolveExpiresAt({
      name: "x",
      expiry: "custom",
      customExpiresAt: "2099-12-31",
    });
    expect(out).toContain("2099-12-31");
  });
});
