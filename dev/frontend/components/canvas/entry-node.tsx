"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { GraphNode } from "@/lib/api/graph";

export interface EntryNodeData extends GraphNode {
  /** 是否被搜尋高亮 */
  highlighted?: boolean;
  /** 效能模式 */
  perfMode?: "full" | "compact" | "dot";
}

function EntryNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as EntryNodeData;
  const { title, category, confidence, highlighted, perfMode = "full" } = nodeData;

  // dot-only 降級模式（> 200 節點）
  if (perfMode === "dot") {
    return (
      <>
        <Handle type="target" position={Position.Top} />
        <div
          title={title}
          className={`h-3 w-3 rounded-full border-2 transition-colors ${
            selected ? "border-blue-500 bg-blue-400" : "border-slate-400 bg-slate-300"
          }`}
        />
        <Handle type="source" position={Position.Bottom} />
      </>
    );
  }

  // compact 模式（51–200 節點）— title only
  if (perfMode === "compact") {
    return (
      <>
        <Handle type="target" position={Position.Top} />
        <div
          className={`rounded border px-2 py-1 text-xs shadow-sm transition-all ${
            highlighted
              ? "border-yellow-400 bg-yellow-50"
              : selected
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white"
          }`}
          style={{ minWidth: 80, maxWidth: 140 }}
        >
          <p className="truncate font-medium leading-tight">{title}</p>
        </div>
        <Handle type="source" position={Position.Bottom} />
      </>
    );
  }

  // full 模式（≤ 50 節點）
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        className={`rounded-lg border px-3 py-2 shadow-sm transition-all ${
          highlighted
            ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300"
            : selected
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
        }`}
        style={{ minWidth: 120, maxWidth: 200 }}
      >
        <p className="truncate text-sm font-semibold leading-tight text-slate-800">{title}</p>

        {/* category badge */}
        {category && (
          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {category.name}
          </span>
        )}

        {/* confidence bar */}
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export const EntryNode = memo(EntryNodeComponent);
EntryNode.displayName = "EntryNode";
