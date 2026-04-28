import { describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibraryToolbar } from "@/components/library/library-toolbar";

const defaultProps = {
  q: "",
  onQChange: vi.fn(),
  sortBy: "updated_at",
  onSortByChange: vi.fn(),
  sortDir: "desc" as const,
  onSortDirChange: vi.fn(),
  statusFilter: "library",
  onStatusFilterChange: vi.fn(),
  totalCount: 30,
  filteredCount: 30,
};

describe("LibraryToolbar", () => {
  it("renders search input and total count", () => {
    render(<LibraryToolbar {...defaultProps} />);
    expect(screen.getByPlaceholderText("搜尋 Library...")).toBeInTheDocument();
    expect(screen.getByText("30 筆")).toBeInTheDocument();
  });

  it("debounces search input and calls onQChange", async () => {
    vi.useFakeTimers();
    const onQChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LibraryToolbar {...defaultProps} onQChange={onQChange} />);

    const input = screen.getByPlaceholderText("搜尋 Library...");
    await user.type(input, "ml");

    expect(onQChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onQChange).toHaveBeenCalledWith("ml");
    vi.useRealTimers();
  });

  it("shows filtered count badge when q is set", () => {
    render(
      <LibraryToolbar
        {...defaultProps}
        q="ml"
        filteredCount={5}
        totalCount={30}
      />
    );
    // Should show filtered badge
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/\/ 30 筆/)).toBeInTheDocument();
  });

  it("clears search when X is clicked", async () => {
    const onQChange = vi.fn();
    const user = userEvent.setup();
    render(<LibraryToolbar {...defaultProps} q="test" onQChange={onQChange} />);

    const clearBtn = screen.getByLabelText("清除搜尋");
    await user.click(clearBtn);
    expect(onQChange).toHaveBeenCalledWith("");
  });
});
