import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/today",
}));

// Mock API modules
vi.mock("@/lib/api/journal", () => ({
  getJournal: vi.fn(),
}));
vi.mock("@/lib/api/today", () => ({
  listTodayTasks: vi.fn(),
  listTodayEntries: vi.fn(),
}));
vi.mock("@/lib/api/gcal-settings", () => ({
  getGcalStatus: vi.fn(),
}));
vi.mock("@/lib/api/calendar-day", () => ({
  fetchCalendarDay: vi.fn(),
}));

import { getJournal } from "@/lib/api/journal";
import { listTodayTasks, listTodayEntries } from "@/lib/api/today";
import { getGcalStatus } from "@/lib/api/gcal-settings";
import { fetchCalendarDay } from "@/lib/api/calendar-day";
import { ApiError } from "@/lib/api/client";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// 懶載 Section 元件（避免 page.tsx 的 useTodayDate hook 在測試中出問題）
import { JournalSection } from "@/components/today/JournalSection";
import { TasksSection } from "@/components/today/TasksSection";
import { RecentEntriesSection } from "@/components/today/RecentEntriesSection";
import { CalendarSection } from "@/components/today/CalendarSection";
import { SectionErrorBoundary } from "@/components/today/SectionErrorBoundary";

const TODAY = "2026-04-28";
const TODAY_START = "2026-04-27T16:00:00.000Z";

describe("JournalSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario: 今日日記存在時顯示預覽和 Edit 按鈕", async () => {
    vi.mocked(getJournal).mockResolvedValue({
      id: "j1",
      date: TODAY,
      title: "今日隨筆",
      content: "今天天氣很好，完成了許多工作。",
      mood: "great",
      highlights: [],
      is_draft: false,
      generated_by: null,
      llm_provider_id: null,
      source_refs: [],
      created_at: `${TODAY}T10:00:00Z`,
      updated_at: `${TODAY}T10:00:00Z`,
    });

    render(<JournalSection today={TODAY} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("journal-preview")).toBeInTheDocument();
    });
    expect(screen.getByText("今日隨筆")).toBeInTheDocument();
    expect(screen.getByTestId("journal-edit-btn")).toBeInTheDocument();
  });

  it("Scenario: 今日無日記時顯示 CTA", async () => {
    vi.mocked(getJournal).mockRejectedValue(
      new ApiError("Not Found", 404, null),
    );

    render(<JournalSection today={TODAY} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("journal-cta")).toBeInTheDocument();
    });
    expect(screen.getByText(/Start today's journal/i)).toBeInTheDocument();
  });

  it("Scenario: Journal API 失敗顯示 error state", async () => {
    vi.mocked(getJournal).mockRejectedValue(new Error("Server Error"));

    render(<JournalSection today={TODAY} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("journal-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/Could not load journal/i)).toBeInTheDocument();
  });
});

describe("TasksSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario: 顯示今日待辦 tasks", async () => {
    vi.mocked(listTodayTasks).mockResolvedValue({
      data: [
        {
          id: "t1",
          project_id: "p1",
          title: "寫完 PR",
          description: null,
          status: "pending",
          priority: "high",
          due_date: TODAY,
          position: 0,
          created_at: `${TODAY}T09:00:00Z`,
          updated_at: `${TODAY}T09:00:00Z`,
          completed_at: null,
        },
        {
          id: "t2",
          project_id: "p1",
          title: "Review code",
          description: null,
          status: "pending",
          priority: "medium",
          due_date: TODAY,
          position: 1,
          created_at: `${TODAY}T09:00:00Z`,
          updated_at: `${TODAY}T09:00:00Z`,
          completed_at: null,
        },
      ],
    });

    render(<TasksSection today={TODAY} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("tasks-list")).toBeInTheDocument();
    });
    const items = screen.getAllByTestId("task-item");
    expect(items).toHaveLength(2);
    expect(screen.getByText("寫完 PR")).toBeInTheDocument();
  });

  it("Scenario: Tasks API 失敗顯示 error，不影響其他 section", async () => {
    vi.mocked(listTodayTasks).mockRejectedValue(
      new Error("Internal Server Error"),
    );

    render(<TasksSection today={TODAY} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("tasks-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/Could not load tasks/i)).toBeInTheDocument();
  });

  it("Scenario: 沒有今日 tasks 時顯示空狀態", async () => {
    vi.mocked(listTodayTasks).mockResolvedValue({ data: [] });

    render(<TasksSection today={TODAY} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("tasks-empty")).toBeInTheDocument();
    });
  });
});

describe("RecentEntriesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario: 顯示今日更新的 entries", async () => {
    vi.mocked(listTodayEntries).mockResolvedValue({
      data: [
        {
          id: "e1",
          title: "Golang 設計模式",
          content_preview: "使用 interface 達成 DI",
          category_id: null,
          domains: [],
          tags: [],
          is_archived: false,
          confidence: 0.9,
          confirmations: 1,
          flags_count: 0,
          lifecycle_status: "active",
          source_type: null,
          created_at: `${TODAY}T10:00:00Z`,
          updated_at: `${TODAY}T10:00:00Z`,
        },
      ],
      pagination: { page: 1, per_page: 5, total: 1, total_pages: 1 },
    });

    render(<RecentEntriesSection todayStart={TODAY_START} />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("entries-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Golang 設計模式")).toBeInTheDocument();
  });

  it("Scenario: Entries API 失敗顯示 error", async () => {
    vi.mocked(listTodayEntries).mockRejectedValue(new Error("Network Error"));

    render(<RecentEntriesSection todayStart={TODAY_START} />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("entries-error")).toBeInTheDocument();
    });
  });
});

describe("CalendarSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario: GCal 未連線時不顯示 CalendarSection", async () => {
    vi.mocked(getGcalStatus).mockResolvedValue({
      connected: false,
      email: null,
    });

    const { container } = render(<CalendarSection today={TODAY} />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      // gcal status 已回傳 false
      expect(vi.mocked(getGcalStatus)).toHaveBeenCalled();
    });

    // CalendarSection 應該 return null，容器為空
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("Scenario: GCal 已連線時顯示今日事件", async () => {
    vi.mocked(getGcalStatus).mockResolvedValue({ connected: true });
    vi.mocked(fetchCalendarDay).mockResolvedValue({
      data: {
        date: TODAY,
        events: [
          {
            id: "ev1",
            gcal_id: "gcal-ev1",
            title: "週會",
            start_time: `${TODAY}T09:00:00+08:00`,
            end_time: `${TODAY}T10:00:00+08:00`,
            all_day: false,
            location: null,
            calendar_id: "primary",
          } as any,
        ],
        entries: [],
        journal: null,
        gcal_connected: true,
        degraded: false,
      },
      degradedHeader: null,
    });

    render(<CalendarSection today={TODAY} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("calendar-events")).toBeInTheDocument();
    });
    expect(screen.getByText("週會")).toBeInTheDocument();
  });
});

describe("SectionErrorBoundary", () => {
  it("catch render error 並顯示 error 訊息", () => {
    const ThrowError = () => {
      throw new Error("Render crash");
    };

    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SectionErrorBoundary sectionName="tasks">
        <ThrowError />
      </SectionErrorBoundary>,
    );

    expect(
      screen.getByTestId("section-error-tasks"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Could not load tasks/i)).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("不影響其他 section：一個 boundary crash 不擴散", () => {
    const ThrowError = () => {
      throw new Error("Crash");
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <div>
        <SectionErrorBoundary sectionName="journal">
          <div data-testid="journal-ok">Journal OK</div>
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="tasks">
          <ThrowError />
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="entries">
          <div data-testid="entries-ok">Entries OK</div>
        </SectionErrorBoundary>
      </div>,
    );

    expect(screen.getByTestId("journal-ok")).toBeInTheDocument();
    expect(screen.getByTestId("section-error-tasks")).toBeInTheDocument();
    expect(screen.getByTestId("entries-ok")).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
