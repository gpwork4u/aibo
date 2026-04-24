import { describe, expect, it } from "vitest";
import { categoryFormSchema } from "@/lib/schemas/category";

describe("categoryFormSchema", () => {
  it("接受有效輸入", () => {
    const res = categoryFormSchema.safeParse({
      name: "Golang",
      description: "Go 語言相關",
      sort_order: 0,
    });
    expect(res.success).toBe(true);
  });

  it("允許空的 description", () => {
    const res = categoryFormSchema.safeParse({ name: "Python", description: "", sort_order: 1 });
    expect(res.success).toBe(true);
  });

  it("拒絕空名稱", () => {
    const res = categoryFormSchema.safeParse({ name: "", sort_order: 0 });
    expect(res.success).toBe(false);
  });

  it("拒絕過長名稱", () => {
    const res = categoryFormSchema.safeParse({ name: "x".repeat(51), sort_order: 0 });
    expect(res.success).toBe(false);
  });

  it("拒絕負數 sort_order", () => {
    const res = categoryFormSchema.safeParse({ name: "X", sort_order: -1 });
    expect(res.success).toBe(false);
  });
});
