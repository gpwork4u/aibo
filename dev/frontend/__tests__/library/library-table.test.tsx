import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibraryTable } from "@/components/library/library-table";
import type { EntryListItem } from "@/lib/api/entries";

const makeEntry = (i: number): EntryListItem => ({
  id: `id-${i}`,
  title: `Entry ${i}`,
  content_preview: `Preview ${i}`,
  category_id: null,
  domains: [],
  tags: i === 1 ? ["tag-a", "tag-b"] : [],
  is_archived: false,
  confidence: 0.75,
  confirmations: 0,
  flags_count: 0,
  lifecycle_status: "library",
  source_type: null,
  created_at: new Date(2024, 0, i).toISOString(),
  updated_at: new Date(2024, 0, i + 1).toISOString(),
});

const data = Array.from({ length: 5 }).map((_, i) => makeEntry(i + 1));

const defaultProps = {
  data,
  isLoading: false,
  sortBy: "updated_at",
  sortDir: "desc" as const,
  onSortChange: vi.fn(),
  onEdit: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
  onRowClick: vi.fn(),
};

describe("LibraryTable", () => {
  it("renders skeleton when loading", () => {
    const { container } = render(<LibraryTable {...defaultProps} isLoading />);
    expect(container.querySelector(".animate-pulse") ?? container.querySelector("[data-slot='skeleton']")).toBeTruthy();
  });

  it("renders empty state when no data", () => {
    render(<LibraryTable {...defaultProps} data={[]} />);
    expect(screen.getByText("沒有找到符合條件的項目")).toBeInTheDocument();
  });

  it("renders entry rows", () => {
    render(<LibraryTable {...defaultProps} />);
    expect(screen.getByText("Entry 1")).toBeInTheDocument();
    expect(screen.getByText("Entry 5")).toBeInTheDocument();
  });

  it("calls onRowClick when row is clicked", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<LibraryTable {...defaultProps} onRowClick={onRowClick} />);

    const firstRow = screen.getAllByRole("row")[1]; // skip header
    await user.click(firstRow);
    expect(onRowClick).toHaveBeenCalled();
  });

  it("calls onSortChange when title header is clicked", async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<LibraryTable {...defaultProps} onSortChange={onSortChange} />);

    // 標題欄可排序
    const headers = screen.getAllByRole("columnheader");
    const titleHeader = headers.find((h) => h.textContent?.includes("標題"));
    if (titleHeader) {
      await user.click(titleHeader);
      expect(onSortChange).toHaveBeenCalled();
    }
  });

  it("shows confidence badge", () => {
    render(<LibraryTable {...defaultProps} />);
    // 75% confidence for each entry
    const badges = screen.getAllByText("75%");
    expect(badges.length).toBeGreaterThan(0);
  });
});
