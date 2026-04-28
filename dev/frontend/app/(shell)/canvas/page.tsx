"use client";

/**
 * /canvas — F-045 Canvas Graph View
 * dynamic import 避免 SSR 問題（ReactFlow 需要瀏覽器環境）
 */
import dynamic from "next/dynamic";

const CanvasGraph = dynamic(
  () => import("@/components/canvas/canvas-graph").then((m) => m.CanvasGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Loading graph...
      </div>
    ),
  },
);

export default function CanvasPage() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <CanvasGraph />
    </div>
  );
}
