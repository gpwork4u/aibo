import { z } from "zod";

/**
 * Calendar API response 的 zod schema（可選使用；預設 hook 僅以 TypeScript 型別為準，
 * 若需要嚴格驗證可在 queryFn 中 `calendarResponseSchema.parse(data)`）。
 */
export const calendarEntrySummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  source_type: z.string().nullable(),
  tags: z.array(z.string()),
  created_at: z.string(),
});

export const calendarEventSummarySchema = z.object({
  gcal_id: z.string(),
  summary: z.string(),
  start: z.string(),
  end: z.string(),
  all_day: z.boolean(),
  linked_entry_id: z.string().nullable(),
});

export const calendarJournalSchema = z.object({
  id: z.string(),
  mood: z.string().nullable().optional(),
});

export const calendarDaySchema = z.object({
  date: z.string(),
  entry_count: z.number(),
  event_count: z.number(),
  has_journal: z.boolean(),
  entries: z.array(calendarEntrySummarySchema),
  events: z.array(calendarEventSummarySchema),
  journal: calendarJournalSchema.nullable().optional(),
});

export const calendarResponseSchema = z.object({
  since: z.string(),
  until: z.string(),
  days: z.array(calendarDaySchema),
});

export type CalendarResponseSchema = z.infer<typeof calendarResponseSchema>;
