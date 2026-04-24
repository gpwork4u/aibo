import { z } from "zod";

/**
 * API Key 建立表單 schema。
 * - name：必填，max 50
 * - expiry：使用預設選項或自訂 ISO 日期字串
 */
export const expiryOptions = [
  { value: "never", label: "永不過期" },
  { value: "30", label: "30 天" },
  { value: "90", label: "90 天" },
  { value: "365", label: "1 年" },
  { value: "custom", label: "自訂日期" },
] as const;

export type ExpiryOption = (typeof expiryOptions)[number]["value"];

export const createApiKeySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "請輸入名稱")
      .max(50, "名稱不可超過 50 個字元"),
    expiry: z.enum(["never", "30", "90", "365", "custom"]),
    customExpiresAt: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.expiry !== "custom") return true;
      if (!data.customExpiresAt) return false;
      const d = new Date(data.customExpiresAt);
      return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
    },
    {
      message: "請選擇一個未來的日期",
      path: ["customExpiresAt"],
    },
  );

export type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>;

/**
 * 將表單值轉為 API payload 的 expires_at（ISO string 或 null）。
 */
export function resolveExpiresAt(values: CreateApiKeyFormValues): string | null {
  switch (values.expiry) {
    case "never":
      return null;
    case "custom":
      return values.customExpiresAt
        ? new Date(values.customExpiresAt).toISOString()
        : null;
    default: {
      const days = Number(values.expiry);
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }
  }
}
