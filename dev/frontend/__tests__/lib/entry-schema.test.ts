import { describe, expect, it } from "vitest";
import { entryFormSchema, quickAddSchema } from "@/lib/schemas/entry";

describe("entryFormSchema", () => {
  it("rejects when both title and content are empty", () => {
    const result = entryFormSchema.safeParse({
      title: "",
      content: "",
      category_id: "none",
      tags: [],
      source: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/至少需要填寫一項/);
    }
  });

  it("accepts when only title is provided", () => {
    const result = entryFormSchema.safeParse({
      title: "Hello",
      content: "",
      category_id: "none",
      tags: [],
      source: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts when only content is provided", () => {
    const result = entryFormSchema.safeParse({
      title: "",
      content: "# Markdown body",
      category_id: "none",
      tags: [],
      source: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects title longer than 100 chars", () => {
    const long = "a".repeat(101);
    const result = entryFormSchema.safeParse({
      title: long,
      content: "x",
      category_id: "none",
      tags: [],
      source: "",
    });
    expect(result.success).toBe(false);
  });

  it("treats whitespace-only title as empty", () => {
    const result = entryFormSchema.safeParse({
      title: "   ",
      content: "",
      category_id: "none",
      tags: [],
      source: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("quickAddSchema", () => {
  it("requires title or content", () => {
    const empty = quickAddSchema.safeParse({ title: "", content: "", tags: [] });
    expect(empty.success).toBe(false);

    const ok = quickAddSchema.safeParse({ title: "", content: "idea", tags: [] });
    expect(ok.success).toBe(true);
  });
});
