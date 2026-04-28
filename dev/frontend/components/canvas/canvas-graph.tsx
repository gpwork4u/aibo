"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  FitViewOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { GraphNode, GraphEdge, GraphResponse, GraphQueryParams, fetchGraph } from "@/lib/api/graph";
import { EntryNode, EntryNodeData } from "@/components/canvas/entry-node";
import { LinkEdge } from "@/components/canvas/link-edge";
import { CanvasToolbar, LayoutType } from "@/components/canvas/canvas-toolbar";
import { NodeDetailSheet } from "@/components/canvas/node-detail-sheet";

// ------------------------------------------------------------------
// 型別
// ------------------------------------------------------------------
const nodeTypes = { entryNode: EntryNode };
const edgeTypes = { linkEdge: LinkEdge };

function calcPerfMode(count: number): "full" | "compact" | "dot" {
  if (count <= 50) return "full";
  if (count <= 200) return "compact";
  return "dot";
}

/** 將 API 回傳的 GraphNode 轉換成 React Flow Node */
function toFlowNode(
  n: GraphNode,
  index: number,
  total: number,
  perfMode: "full" | "compact" | "dot",
  highlighted: boolean,
): Node {
  // 初始位置：圓形排列
  const angle = (index / total) * 2 * Math.PI;
  const radius = Math.min(300, total * 8);
  return {
    id: n.id,
    type: "entryNode",
    position: {
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
    },
    data: { ...n, perfMode, highlighted } as unknown as Record<string, unknown>,
  };
}

/** 將 API 回傳的 GraphEdge 轉換成 React Flow Edge */
function toFlowEdge(e: GraphEdge, hidden: boolean): Edge {
  return {
    id: e.id,
    source: e.from_id,
    target: e.to_id,
    type: "linkEdge",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    data: { link_type: e.link_type, relation: e.relation, hidden },
  };
}

// ------------------------------------------------------------------
// 主元件（內層，需要 ReactFlowProvider）
// ------------------------------------------------------------------
function CanvasGraphInner() {
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { fitView } = useReactFlow();

  // Toolbar state
  const [layout, setLayout] = useState<LayoutType>("hierarchical");
  const [hiddenLinkTypes, setHiddenLinkTypes] = useState<Set<string>>(new Set());
  const [showIsolated, setShowIsolated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Ego network state
  const [egoEntryId, setEgoEntryId] = useState<string | undefined>();
  const [centeredOnTitle, setCenteredOnTitle] = useState<string | undefined>();

  // Node detail sheet
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // ------------------------------------------------------------------
  // Fetch graph
  // ------------------------------------------------------------------
  const loadGraph = useCallback(async (params: GraphQueryParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGraph({ limit: 50, ...params });
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph({ limit: 50 });
  }, [loadGraph]);

  // ------------------------------------------------------------------
  // Convert API data → React Flow nodes/edges
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!graphData) return;

    const total = graphData.nodes.length;
    const perfMode = calcPerfMode(total);

    // 孤立節點（無連結）
    const connectedIds = new Set<string>();
    graphData.edges.forEach((e) => {
      connectedIds.add(e.from_id);
      connectedIds.add(e.to_id);
    });

    const visibleNodes = showIsolated
      ? graphData.nodes
      : graphData.nodes.filter(
          (n) => connectedIds.has(n.id) || graphData.edges.length === 0
        );

    const newNodes = visibleNodes.map((n, i) =>
      toFlowNode(
        n,
        i,
        visibleNodes.length,
        perfMode,
        searchQuery.length > 1
          ? n.title.toLowerCase().includes(searchQuery.toLowerCase())
          : false,
      ),
    );

    const newEdges = graphData.edges.map((e) =>
      toFlowEdge(e, hiddenLinkTypes.has(e.link_type)),
    );

    setNodes(newNodes);
    setEdges(newEdges);

    // fit view after layout
    setTimeout(() => fitView({ duration: 400, padding: 0.1 }), 50);
  }, [graphData, hiddenLinkTypes, showIsolated, searchQuery, setNodes, setEdges, fitView]);

  // ------------------------------------------------------------------
  // Try to apply ELK layout (dynamic import, best-effort)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (nodes.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const ELKModule = await import("elkjs/lib/elk.bundled.js");
        const ELK = ELKModule.default ?? ELKModule;
        const elk = new (ELK as { new(): { layout: (graph: unknown) => Promise<unknown> } })();

        const elkNodes = nodes.map((n) => ({
          id: n.id,
          width: 160,
          height: 60,
        }));
        const elkEdges = edges
          .filter((e) => !e.data?.hidden)
          .map((e) => ({
            id: e.id,
            sources: [e.source],
            targets: [e.target],
          }));

        const layoutType =
          layout === "hierarchical"
            ? "layered"
            : layout === "radial"
              ? "radial"
              : "force";

        const graph = await elk.layout({
          id: "root",
          layoutOptions: { "elk.algorithm": layoutType },
          children: elkNodes,
          edges: elkEdges,
        }) as { children?: { id: string; x?: number; y?: number }[] };

        if (cancelled) return;

        const posMap = new Map(
          (graph.children ?? []).map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]),
        );

        setNodes((prev) =>
          prev.map((n) => {
            const pos = posMap.get(n.id);
            return pos ? { ...n, position: pos } : n;
          }),
        );

        setTimeout(() => fitView({ duration: 600, padding: 0.1 }), 50);
      } catch {
        // ELK failed → keep default circular layout
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, layout]);

  // ------------------------------------------------------------------
  // Event handlers
  // ------------------------------------------------------------------
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const gn = graphData?.nodes.find((n) => n.id === node.id) ?? null;
      setSelectedNode(gn);
    },
    [graphData],
  );

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const gn = graphData?.nodes.find((n) => n.id === node.id);
      if (!gn) return;
      setEgoEntryId(node.id);
      setCenteredOnTitle(gn.title);
      setSelectedNode(null);
      loadGraph({ entry_id: node.id, depth: 2 });
    },
    [graphData, loadGraph],
  );

  const handleToggleLinkType = useCallback((lt: string) => {
    setHiddenLinkTypes((prev) => {
      const next = new Set(prev);
      if (next.has(lt)) next.delete(lt);
      else next.add(lt);
      return next;
    });
  }, []);

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const gn = graphData?.nodes.find((n) => n.id === nodeId) ?? null;
      setSelectedNode(gn);
    },
    [graphData],
  );

  // ------------------------------------------------------------------
  // Empty state
  // ------------------------------------------------------------------
  const noLinks =
    graphData && graphData.edges.length === 0 && graphData.nodes.length > 0;

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Toolbar — needs ReactFlow context */}
      <CanvasToolbar
        layout={layout}
        onLayoutChange={setLayout}
        hiddenLinkTypes={hiddenLinkTypes}
        onToggleLinkType={handleToggleLinkType}
        showIsolated={showIsolated}
        onToggleIsolated={() => setShowIsolated((v) => !v)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        centeredOnTitle={centeredOnTitle}
        isLoading={loading}
      />

      {/* Truncated warning */}
      {graphData?.meta.truncated && (
        <div className="absolute left-1/2 top-12 z-10 -translate-x-1/2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-700 shadow">
          Showing {graphData.nodes.length} of {graphData.meta.total_nodes} entries. Use filters to narrow down.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute left-1/2 top-12 z-10 -translate-x-1/2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-xs text-red-700 shadow">
          {error}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 pt-12">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>

      {/* No links hint */}
      {noLinks && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-md border border-dashed border-slate-300 bg-white/80 px-4 py-2 text-xs text-slate-500 backdrop-blur-sm">
          Add links between entries to build your knowledge graph
        </div>
      )}

      {/* Node detail sheet */}
      <NodeDetailSheet
        node={selectedNode}
        edges={graphData?.edges ?? []}
        allNodes={graphData?.nodes ?? []}
        onClose={() => setSelectedNode(null)}
        onFocusNode={handleFocusNode}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// 外層 Provider 包裹
// ------------------------------------------------------------------
export function CanvasGraph() {
  return (
    <ReactFlowProvider>
      <CanvasGraphInner />
    </ReactFlowProvider>
  );
}
