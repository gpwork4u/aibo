import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "名稱必填").max(50, "名稱最多 50 個字元"),
  description: z
    .string()
    .trim()
    .max(200, "描述最多 200 個字元")
    .optional()
    .or(z.literal("")),
  sort_order: z
    .coerce.number({ invalid_type_error: "排序必須是數字" })
    .int("排序必須是整數")
    .min(0, "排序必須 >= 0"),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
