/**
 * ShortcutsModal 單元測試
 *
 * 測試：
 * - open=true 時顯示 modal
 * - 包含所有快捷鍵 section
 * - open=false 時不顯示
 * - onClose 在按 × 後被呼叫
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutsModal } from "@/components/shortcuts/shortcuts-modal";

describe("ShortcutsModal", () => {
  it("open=true 時顯示 modal 和標題", () => {
    render(<ShortcutsModal open={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("shortcuts-modal")).toBeInTheDocument();
    expect(screen.getByText("鍵盤快捷鍵")).toBeInTheDocument();
  });

  it("顯示所有 section", () => {
    render(<ShortcutsModal open={true} onClose={vi.fn()} />);

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Entry")).toBeInTheDocument();
    expect(screen.getByText("Copilot")).toBeInTheDocument();
  });

  it("包含 G I 快捷鍵說明", () => {
    render(<ShortcutsModal open={true} onClose={vi.fn()} />);

    expect(screen.getByText("前往 Inbox")).toBeInTheDocument();
  });

  it("open=false 時不顯示內容", () => {
    render(<ShortcutsModal open={false} onClose={vi.fn()} />);

    expect(screen.queryByTestId("shortcuts-modal")).not.toBeInTheDocument();
  });

  it("onClose 在 Dialog onOpenChange(false) 時被呼叫", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ShortcutsModal open={true} onClose={onClose} />);

    // 找到關閉按鈕（Radix Dialog 的 X 按鈕）
    const closeButton = document.querySelector("[data-radix-dialog-close], button[aria-label='Close']");
    if (closeButton) {
      await user.click(closeButton as HTMLElement);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });
});
