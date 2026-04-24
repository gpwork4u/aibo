import { describe, expect, it } from "vitest";
import { layoutOverlaps } from "@/components/calendar/event-block";

type Ev = { id: string };

function mk(
  id: string,
  startMin: number,
  endMin: number,
): { event: Ev; clip: any } {
  return {
    event: { id },
    clip: {
      startMin,
      endMin,
      continuesFromPrev: false,
      continuesToNext: false,
    },
  };
}

describe("layoutOverlaps", () => {
  it("不重疊：皆放第 0 欄，columnCount=1", () => {
    const placed = layoutOverlaps<Ev>([
      mk("a", 9 * 60, 10 * 60),
      mk("b", 11 * 60, 12 * 60),
    ]);
    expect(placed.every((p) => p.columnIndex === 0)).toBe(true);
    expect(placed[0].columnCount).toBe(1);
  });

  it("兩個重疊：columnIndex 0/1，columnCount=2", () => {
    const placed = layoutOverlaps<Ev>([
      mk("a", 9 * 60, 11 * 60),
      mk("b", 10 * 60, 12 * 60),
    ]);
    expect(placed.map((p) => p.columnIndex)).toEqual([0, 1]);
    expect(placed[0].columnCount).toBe(2);
  });

  it("三個同時重疊：columnCount=3", () => {
    const placed = layoutOverlaps<Ev>([
      mk("a", 9 * 60, 12 * 60),
      mk("b", 9 * 60 + 30, 11 * 60),
      mk("c", 10 * 60, 11 * 60 + 30),
    ]);
    expect(placed[0].columnCount).toBe(3);
    expect(new Set(placed.map((p) => p.columnIndex))).toEqual(
      new Set([0, 1, 2]),
    );
  });

  it("早結束事件讓出欄位給後續", () => {
    const placed = layoutOverlaps<Ev>([
      mk("a", 9 * 60, 10 * 60), // 佔 col 0
      mk("b", 9 * 60 + 30, 11 * 60), // col 1
      mk("c", 10 * 60, 11 * 60), // a 已結束，佔 col 0
    ]);
    expect(placed[0].columnIndex).toBe(0);
    expect(placed[1].columnIndex).toBe(1);
    expect(placed[2].columnIndex).toBe(0);
  });
});
