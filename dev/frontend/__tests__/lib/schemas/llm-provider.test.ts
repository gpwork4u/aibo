import { describe, expect, it } from "vitest";
import { llmProviderFormSchema } from "@/lib/schemas/llm-provider";

const baseValid = {
  name: "OpenAI",
  endpoint_url: "https://api.openai.com/v1",
  api_key: "",
  model_name: "gpt-4",
  is_default: false,
  is_active: true,
  temperature: 0.7,
  max_tokens: 1000,
  timeout: 30,
};

describe("llmProviderFormSchema", () => {
  it("通過基本有效輸入", () => {
    const res = llmProviderFormSchema.safeParse(baseValid);
    expect(res.success).toBe(true);
  });

  it("拒絕無效的 Endpoint URL", () => {
    const res = llmProviderFormSchema.safeParse({ ...baseValid, endpoint_url: "not-a-url" });
    expect(res.success).toBe(false);
    if (!res.success) {
      const err = res.error.issues.find((i) => i.path[0] === "endpoint_url");
      expect(err?.message).toMatch(/Endpoint URL 格式不正確/);
    }
  });

  it("拒絕非 http/https 協議", () => {
    const res = llmProviderFormSchema.safeParse({
      ...baseValid,
      endpoint_url: "ftp://example.com",
    });
    expect(res.success).toBe(false);
  });

  it("拒絕過長的名稱", () => {
    const res = llmProviderFormSchema.safeParse({ ...baseValid, name: "x".repeat(51) });
    expect(res.success).toBe(false);
  });

  it("拒絕空 model_name", () => {
    const res = llmProviderFormSchema.safeParse({ ...baseValid, model_name: "" });
    expect(res.success).toBe(false);
  });
});
