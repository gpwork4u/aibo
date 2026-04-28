"use client";

import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getStraightPath,
} from "@xyflow/react";

const LINK_TYPE_COLORS: Record<string, string> = {
  derives_from: "#6366f1",   // indigo
  contradicts: "#ef4444",    // red
  references: "#3b82f6",     // blue
  supports: "#22c55e",       // green
  related_to: "#a855f7",     // purple
  precedes: "#f59e0b",       // amber
};

function getEdgeColor(linkType: string): string {
  return LINK_TYPE_COLORS[linkType] ?? "#94a3b8"; // slate-400 fallback
}

function LinkEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const linkType = (data?.link_type as string) ?? "related_to";
  const hidden = data?.hidden as boolean | undefined;

  if (hidden) return null;

  const color = getEdgeColor(linkType);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity: selected ? 1 : 0.7,
        }}
      />
      {/* 使用 EdgeLabelRenderer 替代 SVG foreignObject */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-opacity ${
              selected ? "opacity-100" : "opacity-0 hover:opacity-100"
            }`}
            style={{
              background: color + "22",
              color,
              border: `1px solid ${color}44`,
            }}
          >
            {linkType.replace(/_/g, " ")}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const LinkEdge = memo(LinkEdgeComponent);
LinkEdge.displayName = "LinkEdge";
