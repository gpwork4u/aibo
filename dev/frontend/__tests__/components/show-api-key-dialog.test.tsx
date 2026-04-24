import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { ShowApiKeyDialog } from "@/components/forms/show-api-key-dialog";

describe("ShowApiKeyDialog", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });
  });

  it("does not render dialog content when apiKey is null", () => {
    render(<ShowApiKeyDialog apiKey={null} onClose={() => {}} />);
    expect(screen.queryByTestId("show-api-key-dialog")).toBeNull();
  });

  it("shows the full api key when apiKey provided", async () => {
    render(<ShowApiKeyDialog apiKey="aibo_secret_123" onClose={() => {}} />);
    const dialog = await screen.findByTestId("show-api-key-dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId("full-api-key")).toHaveTextContent("aibo_secret_123");
    expect(screen.getByTestId("copy-key-button")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-copied-button")).toBeInTheDocument();
  });

  it("calls onClose when 我已複製 is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ShowApiKeyDialog apiKey="aibo_key" onClose={onClose} />);

    await user.click(await screen.findByTestId("confirm-copied-button"));
    expect(onClose).toHaveBeenCalled();
  });
});
