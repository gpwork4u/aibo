"use client";

import React from "react";
import { useReactFlow } from "@xyflow/react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutDashboard,
  Filter,
  Search,
  EyeOff,
  Eye,
} from "lucide-react";

export type LayoutType = "hierarchical" | "force" | "radial";

const LINK_TYPES = ["derives_from", "contradicts", "references", "supports", "related_to", "precedes"];

export interface CanvasToolbarProps {
  layout: LayoutType;
  onLayoutChange: (l: LayoutType) => void;
  hiddenLinkTypes: Set<string>;
  onToggleLinkType: (lt: string) => void;
  showIsolated: boolean;
  onToggleIsolated: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  centeredOnTitle?: string;
  isLoading?: boolean;
}

export function CanvasToolbar({
  layout,
  onLayoutChange,
  hiddenLinkTypes,
  onToggleLinkType,
  showIsolated,
  onToggleIsolated,
  searchQuery,
  onSearchChange,
  centeredOnTitle,
  isLoading,
}: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 border-b bg-white/90 px-3 py-2 backdrop-blur-sm">
      {/* 佈局切換 */}
      <div className="flex items-center gap-1 rounded-md border p-1">
        {(["hierarchical", "force", "radial"] as LayoutType[]).map((l) => (
          <button
            key={l}
            onClick={() => onLayoutChange(l)}
            title={`Layout: ${l}`}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              layout === l
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {l === "hierarchical" ? "Hierarchical" : l === "force" ? "Force" : "Radial"}
          </button>
        ))}
      </div>

      {/* 搜尋 */}
      <div className="relative flex items-center">
        <Search className="absolute left-2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Highlight nodes..."
          className="h-7 rounded-md border pl-7 pr-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          style={{ width: 160 }}
        />
      </div>

      {/* link_type 過濾 */}
      <div className="flex items-center gap-1">
        <Filter className="h-3.5 w-3.5 text-slate-400" />
        {LINK_TYPES.map((lt) => {
          const hidden = hiddenLinkTypes.has(lt);
          return (
            <button
              key={lt}
              onClick={() => onToggleLinkType(lt)}
              title={hidden ? `Show ${lt}` : `Hide ${lt}`}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                hidden
                  ? "bg-slate-100 text-slate-400 line-through"
                  : "bg-slate-800 text-white"
              }`}
            >
              {lt.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      {/* 孤立節點 toggle */}
      <button
        onClick={onToggleIsolated}
        title={showIsolated ? "Hide isolated nodes" : "Show isolated nodes"}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
          showIsolated ? "border-slate-800 bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {showIsolated ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        Isolated
      </button>

      {/* ego network 提示 */}
      {centeredOnTitle && (
        <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
          <LayoutDashboard className="h-3.5 w-3.5" />
          Centered on: <span className="font-semibold">{centeredOnTitle}</span>
        </div>
      )}

      {/* 載入指示 */}
      {isLoading && (
        <span className="text-xs text-slate-400">Loading...</span>
      )}

      {/* 間隔 */}
      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => fitView({ duration: 400 })}
          title="Fit to screen"
          className="rounded border p-1.5 text-slate-600 hover:bg-slate-100"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => zoomIn({ duration: 200 })}
          title="Zoom in"
          className="rounded border p-1.5 text-slate-600 hover:bg-slate-100"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => zoomOut({ duration: 200 })}
          title="Zoom out"
          className="rounded border p-1.5 text-slate-600 hover:bg-slate-100"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
