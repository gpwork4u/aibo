"use client";

import React from "react";
import { X, Tag, Link2, BookOpen } from "lucide-react";
import { GraphNode, GraphEdge } from "@/lib/api/graph";

interface NodeDetailSheetProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onFocusNode?: (nodeId: string) => void;
}

export function NodeDetailSheet({
  node,
  edges,
  allNodes,
  onClose,
  onFocusNode,
}: NodeDetailSheetProps) {
  if (!node) return null;

  // 找到與此節點相關的所有邊
  const relatedEdges = edges.filter(
    (e) => e.from_id === node.id || e.to_id === node.id
  );

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  return (
    <div className="absolute bottom-0 right-0 top-0 z-20 flex w-80 flex-col border-l bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b px-4 py-3">
        <div className="flex-1 pr-2">
          <h2 className="text-sm font-semibold leading-tight text-slate-800">
            {node.title}
          </h2>
          {node.category && (
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {node.category.name}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-slate-700">
        {/* Summary */}
        {node.summary && (
          <section className="mb-4">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <BookOpen className="h-3.5 w-3.5" />
              Summary
            </div>
            <p className="text-xs leading-relaxed text-slate-600">{node.summary}</p>
          </section>
        )}

        {/* Confidence */}
        <section className="mb-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Confidence
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.round(node.confidence * 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600">
              {Math.round(node.confidence * 100)}%
            </span>
          </div>
        </section>

        {/* Status */}
        <section className="mb-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Status
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {node.status}
          </span>
        </section>

        {/* Related links */}
        {relatedEdges.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Link2 className="h-3.5 w-3.5" />
              Links ({relatedEdges.length})
            </div>
            <ul className="space-y-2">
              {relatedEdges.map((edge) => {
                const isSource = edge.from_id === node.id;
                const otherId = isSource ? edge.to_id : edge.from_id;
                const other = nodeMap.get(otherId);
                return (
                  <li
                    key={edge.id}
                    className="flex items-start gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-xs"
                  >
                    <span className="mt-0.5 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {edge.link_type.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-700">
                        {isSource ? "→" : "←"}{" "}
                        {other ? (
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => onFocusNode?.(otherId)}
                          >
                            {other.title}
                          </button>
                        ) : (
                          <span className="text-slate-400">[unknown]</span>
                        )}
                      </p>
                      {edge.relation && (
                        <p className="mt-0.5 text-slate-500 italic">{edge.relation}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {relatedEdges.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
            No links for this entry.
          </div>
        )}
      </div>
    </div>
  );
}
