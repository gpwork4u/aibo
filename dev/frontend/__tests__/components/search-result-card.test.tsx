import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchResultCard } from "@/components/search-result-card";
import { SearchResultItem } from "@/lib/schemas/search";

function makeItem(overrides: Partial<SearchResultItem> = {}): SearchResultItem {
  return {
    entry_id: "00000000-0000-0000-0000-000000000001",
    title: "Golang 教學：goroutine",
    summary: "goroutine 是 Go 的並發執行單位",
    content_preview: "goroutine 是 Go 的並發執行單位",
    tags: ["golang", "concurrency"],
    domains: ["programming"],
    context: null,
    lifecycle_status: "active",
    superseded_by: null,
    relevance: 0.85,
    matched_keywords: ["goroutine"],
    ...overrides,
  };
}

describe("SearchResultCard", () => {
  it("renders title linking to entry detail", () => {
    render(<SearchResultCard item={makeItem()} />);
    const title = screen.getByTestId("result-title");
    expect(title).toHaveTextContent("Golang 教學");
    expect(title.getAttribute("href")).toBe(
      "/entries/00000000-0000-0000-0000-000000000001",
    );
  });

  it("renders highlight snippet with <mark> around matched keywords", () => {
    render(<SearchResultCard item={makeItem()} />);
    const snippet = screen.getByTestId("result-highlight");
    // <mark> 應包裹 "goroutine"
    const marks = snippet.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toBe("goroutine");
  });

  it("escapes HTML in snippet to prevent XSS", () => {
    const item = makeItem({
      summary: "<script>alert(1)</script> goroutine",
      content_preview: "<script>alert(1)</script> goroutine",
      matched_keywords: ["goroutine"],
    });
    render(<SearchResultCard item={item} />);
    const snippet = screen.getByTestId("result-highlight");
    // 不應有真正的 <script>
    expect(snippet.querySelector("script")).toBeNull();
    expect(snippet.innerHTML).toContain("&lt;script");
  });

  it("renders tags and domains as badges", () => {
    render(<SearchResultCard item={makeItem()} />);
    expect(screen.getAllByTestId("result-tag")).toHaveLength(2);
    expect(screen.getAllByTestId("result-domain")).toHaveLength(1);
  });

  it("falls back to summary or placeholder when title is missing", () => {
    const item = makeItem({ title: null, summary: "只有摘要" });
    render(<SearchResultCard item={item} />);
    expect(screen.getByTestId("result-title")).toHaveTextContent("只有摘要");
  });
});
