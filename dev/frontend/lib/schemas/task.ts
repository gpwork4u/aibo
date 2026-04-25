import { z } from "zod";

export const taskRefSchema = z.object({
  ref_type: z.enum(["entry", "journal", "gcal_event"]),
  ref_id: z.string().min(1),
});

const dateOrEmpty = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式應為 YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "標題必填")
    .max(200, "標題最多 200 個字元"),
  description: z
    .string()
    .trim()
    .max(5000, "描述最多 5000 個字元")
    .optional()
    .or(z.literal("")),
  status: z
    .enum(["todo", "in_progress", "blocked", "done", "cancelled"])
    .optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  due_date: dateOrEmpty,
  refs: z.array(taskRefSchema).optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
export type TaskRefInput = z.infer<typeof taskRefSchema>;
