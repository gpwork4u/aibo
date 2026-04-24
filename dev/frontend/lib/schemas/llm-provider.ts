import { z } from "zod";

const urlSchema = z
  .string()
  .trim()
  .min(1, "Endpoint URL 必填")
  .max(500, "Endpoint URL 最多 500 個字元")
  .refine(
    (val) => {
      try {
        const u = new URL(val);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Endpoint URL 格式不正確" },
  );

export const llmProviderFormSchema = z.object({
  name: z.string().trim().min(1, "名稱必填").max(50, "名稱最多 50 個字元"),
  endpoint_url: urlSchema,
  api_key: z.string().max(500, "API Key 最多 500 個字元").optional(),
  model_name: z.string().trim().min(1, "Model 名稱必填").max(100, "Model 名稱最多 100 個字元"),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  max_tokens: z.coerce.number().int().min(1).default(1000),
  timeout: z.coerce.number().int().min(1).default(30),
});

export type LlmProviderFormValues = z.infer<typeof llmProviderFormSchema>;
