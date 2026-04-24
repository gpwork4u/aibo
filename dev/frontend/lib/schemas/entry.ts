import { z } from "zod";

/**
 * Full entry form schema — used by 建立/編輯 Dialog。
 *
 * - title / content 至少需填寫其中一項（whitespace-only 視為空）
 * - title 最長 100 字元
 */
export const entryFormSchema = z
  .object({
    title: z
      .string()
      .max(100, "標題最多 100 個字元")
      .optional()
      .or(z.literal("")),
    content: z.string().optional().or(z.literal("")),
    category_id: z.string().optional().or(z.literal("")),
    tags: z.array(z.string()).default([]),
    source: z.string().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    const hasTitle = (values.title ?? "").trim().length > 0;
    const hasContent = (values.content ?? "").trim().length > 0;
    if (!hasTitle && !hasContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "標題或內容至少需要填寫一項",
      });
    }
  });

export type EntryFormValues = z.infer<typeof entryFormSchema>;

/**
 * Quick add schema — 較寬鬆，用於 Inbox 快速記錄。
 */
export const quickAddSchema = z
  .object({
    title: z
      .string()
      .max(100, "標題最多 100 個字元")
      .optional()
      .or(z.literal("")),
    content: z.string().optional().or(z.literal("")),
    tags: z.array(z.string()).default([]),
  })
  .superRefine((values, ctx) => {
    const hasTitle = (values.title ?? "").trim().length > 0;
    const hasContent = (values.content ?? "").trim().length > 0;
    if (!hasTitle && !hasContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "標題或內容至少需要填寫一項",
      });
    }
  });

export type QuickAddValues = z.infer<typeof quickAddSchema>;
