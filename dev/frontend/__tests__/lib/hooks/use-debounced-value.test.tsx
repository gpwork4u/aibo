import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("debounces updates by the given delay", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 500),
      { initialProps: { v: "a" } },
    );
    expect(result.current).toBe("a");

    rerender({ v: "ab" });
    rerender({ v: "abc" });

    // 未到 500ms，仍應是舊值
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("a");

    // 再推進足夠時間後，值應更新到最後一次
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe("abc");
  });

  it("does not update if value keeps changing within the delay window", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 500),
      { initialProps: { v: "x" } },
    );

    for (let i = 0; i < 5; i++) {
      rerender({ v: `x${i}` });
      act(() => {
        vi.advanceTimersByTime(200);
      });
    }
    // 總共只等了 200ms（每次 rerender 重置 timer），尚未觸發
    expect(result.current).toBe("x");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe("x4");
  });
});
