import { z } from "zod";

const dateOrEmpty = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式應為 YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

export const projectFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "名稱必填")
      .max(80, "名稱最多 80 個字元"),
    description: z
      .string()
      .trim()
      .max(5000, "描述最多 5000 個字元")
      .optional()
      .or(z.literal("")),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "顏色必須為 #RRGGBB")
      .max(20),
    status: z.enum(["active", "paused", "done", "archived"]).optional(),
    start_date: dateOrEmpty,
    end_date: dateOrEmpty,
  })
  .superRefine((val, ctx) => {
    if (val.start_date && val.end_date) {
      if (val.end_date < val.start_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["end_date"],
          message: "結束日不可早於起始日",
        });
      }
    }
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
