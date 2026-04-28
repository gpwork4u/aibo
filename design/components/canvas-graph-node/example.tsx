// Canvas Graph Node 元件範例
// 技術基礎：@xyflow/react v12 + shadcn/ui + Tailwind CSS v4 + Lucide icons
//
// 安裝依賴：
//   npm install @xyflow/react elkjs
//   import '@xyflow/react/dist/style.css'

import React, { memo, useCallback } from "react";
import {
  Handle,
  Position,
  NodeProps,
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";
import {
  GitBranch,
  Atom,
  CircleDot,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

// ─── 型別 ─────────────────────────────────────────────────────────────────────

type NodeMode = "full" | "compact" | "dot";

type LinkType =
  | "derives_from"
  | "contradicts"
  | "duplicate_of"
  | "references"
  | "supersedes"
  | "related_to";

interface EntryNodeData {
  title: string;
  category: string;
  categoryColor?: string;
  confidence?: number;
  mode?: NodeMode;
}

interface LinkEdgeData {
  link_type: LinkType;
  confidence?: number;
  relation?: string;
}

interface LinkPreview {
  id: string;
  link_type: LinkType;
  title: string;
  confidence?: number;
}

// ─── Link Type 色彩對應 ────────────────────────────────────────────────────────

const LINK_TYPE_COLORS: Record<LinkType, { hex: string; label: string; tw: string }> = {
  derives_from:  { hex: "#3B82F6", label: "衍生自", tw: "bg-blue-500" },
  contradicts:   { hex: "#EF4444", label: "矛盾",   tw: "bg-red-500" },
  duplicate_of:  { hex: "#F97316", label: "重複",   tw: "bg-orange-500" },
  references:    { hex: "#6B7280", label: "參考",   tw: "bg-gray-500" },
  supersedes:    { hex: "#A855F7", label: "取代",   tw: "bg-purple-500" },
  related_to:    { hex: "#22C55E", label: "相關",   tw: "bg-green-500" },
};

// ─── 1. EntryNode ─────────────────────────────────────────────────────────────

/**
 * React Flow 自定義節點
 * 必須用 React.memo 包裹（React Flow v12 效能要求）
 */
export const EntryNode = memo(function EntryNode({
  data,
  selected,
}: NodeProps<EntryNodeData>) {
  const mode = data.mode ?? "full";

  // dot-only 模式：僅圓點
  if (mode === "dot") {
    return (
      <>
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <div
          role="button"
          tabIndex={0}
          title={data.title}
          aria-label={`${data.title}，分類：${data.category}`}
          className={cn(
            "w-4 h-4 rounded-full transition-transform hover:scale-125",
            selected && "ring-2 ring-primary",
            data.categoryColor ? "" : "bg-primary"
          )}
          style={data.categoryColor ? { backgroundColor: data.categoryColor } : undefined}
        />
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </>
    );
  }

  // compact 模式：僅 title
  if (mode === "compact") {
    return (
      <>
        <Handle type="target" position={Position.Top} />
        <div
          role="button"
          tabIndex={0}
          aria-label={`${data.title}，分類：${data.category}`}
          className={cn(
            "w-[140px] min-h-[40px] px-2 py-1.5 bg-background border border-border",
            "rounded-lg shadow-sm cursor-pointer select-none",
            "hover:shadow-md transition-shadow",
            selected && "ring-2 ring-primary"
          )}
        >
          <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
            {data.title}
          </p>
        </div>
        <Handle type="source" position={Position.Bottom} />
      </>
    );
  }

  // 完整模式
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        role="button"
        tabIndex={0}
        aria-label={`${data.title}，分類：${data.category}`}
        className={cn(
          "w-[180px] min-h-[64px] p-3 bg-background border border-border",
          "rounded-lg shadow-sm cursor-pointer select-none",
          "hover:shadow-md transition-shadow",
          selected && "ring-2 ring-primary"
        )}
      >
        {/* Title */}
        <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground mb-2">
          {data.title}
        </p>

        {/* Badges 行 */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Category badge */}
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-normal text-white"
            style={data.categoryColor ? { backgroundColor: data.categoryColor } : undefined}
          >
            {data.category}
          </span>

          {/* Confidence badge（< 1.0 才顯示） */}
          {data.confidence !== undefined && data.confidence < 1.0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-muted-foreground bg-neutral-100">
              {(data.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

// ─── 2. LinkEdge ─────────────────────────────────────────────────────────────

/**
 * React Flow 自定義邊
 * Label 使用 EdgeLabelRenderer portal（非 SVG foreignObject）
 */
export const LinkEdge = memo(function LinkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<LinkEdgeData>) {
  const linkType = (data?.link_type ?? "related_to") as LinkType;
  const confidence = data?.confidence ?? 1.0;
  const color = LINK_TYPE_COLORS[linkType];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeWidth = selected ? 2.5 : 1.5;
  const strokeDasharray = confidence < 0.5 ? "6 3" : undefined;

  return (
    <>
      {/* Edge 主體 */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={strokeWidth}
        stroke={color.hex}
        strokeDasharray={strokeDasharray}
        fill="none"
        markerEnd={markerEnd}
      />

      {/* 不可見寬互動區 */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        strokeOpacity={0}
        className="react-flow__edge-interaction"
      />

      {/* EdgeLabel（使用 EdgeLabelRenderer portal） */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <span
            title={`${linkType}（信心值：${confidence}）`}
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-normal",
              "bg-background border shadow-sm whitespace-nowrap",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
            style={{ borderColor: color.hex, color: color.hex }}
          >
            {color.label}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// ─── 3. CanvasToolbar ────────────────────────────────────────────────────────

type LayoutMode = "hierarchical" | "force" | "radial";

interface CanvasToolbarProps {
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  selectedLinkTypes: LinkType[];
  onLinkTypesChange: (types: LinkType[]) => void;
  minConfidence: number;
  onMinConfidenceChange: (v: number) => void;
  showIsolated: boolean;
  onShowIsolatedChange: (v: boolean) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function CanvasToolbar({
  layout,
  onLayoutChange,
  selectedLinkTypes,
  onLinkTypesChange,
  minConfidence,
  onMinConfidenceChange,
  showIsolated,
  onShowIsolatedChange,
  searchQuery,
  onSearchChange,
}: CanvasToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const ALL_LINK_TYPES = Object.keys(LINK_TYPE_COLORS) as LinkType[];

  const toggleLinkType = useCallback(
    (type: LinkType) => {
      onLinkTypesChange(
        selectedLinkTypes.includes(type)
          ? selectedLinkTypes.filter((t) => t !== type)
          : [...selectedLinkTypes, type]
      );
    },
    [selectedLinkTypes, onLinkTypesChange]
  );

  return (
    <div
      role="toolbar"
      aria-label="Canvas 工具列"
      className="flex items-center gap-3 h-14 px-4 bg-background border-b border-border z-10 flex-wrap"
    >
      {/* LayoutToggle */}
      <ToggleGroup
        type="single"
        value={layout}
        onValueChange={(v) => v && onLayoutChange(v as LayoutMode)}
        aria-label="佈局模式"
      >
        <ToggleGroupItem value="hierarchical" aria-label="層次佈局">
          <GitBranch className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="force" aria-label="力導向佈局">
          <Atom className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="radial" aria-label="放射佈局">
          <CircleDot className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* 分隔 */}
      <div className="w-px h-6 bg-border" aria-hidden="true" />

      {/* FilterBar — link_type 多選 */}
      <div className="flex items-center gap-1" role="group" aria-label="連結類型篩選">
        {ALL_LINK_TYPES.map((type) => {
          const isSelected = selectedLinkTypes.includes(type);
          const color = LINK_TYPE_COLORS[type];
          return (
            <button
              key={type}
              onClick={() => toggleLinkType(type)}
              aria-pressed={isSelected}
              aria-label={`篩選：${color.label}`}
              className={cn(
                "h-6 px-2 rounded-full text-xs font-normal border transition-all",
                "min-w-[44px] min-h-[44px] flex items-center gap-1",
                isSelected ? "text-white" : "bg-background text-muted-foreground"
              )}
              style={
                isSelected
                  ? { backgroundColor: color.hex, borderColor: color.hex }
                  : { borderColor: color.hex }
              }
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color.hex }}
                aria-hidden="true"
              />
              {color.label}
            </button>
          );
        })}
      </div>

      {/* 分隔 */}
      <div className="w-px h-6 bg-border" aria-hidden="true" />

      {/* min_confidence slider */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <label htmlFor="confidence-slider" className="text-xs text-muted-foreground whitespace-nowrap">
          信心值 ≥ {minConfidence.toFixed(1)}
        </label>
        <Slider
          id="confidence-slider"
          min={0}
          max={1}
          step={0.1}
          value={[minConfidence]}
          onValueChange={([v]) => onMinConfidenceChange(v)}
          className="w-20"
          aria-label="最低信心值"
        />
      </div>

      {/* show isolated toggle */}
      <div className="flex items-center gap-1.5">
        <Switch
          id="show-isolated"
          checked={showIsolated}
          onCheckedChange={onShowIsolatedChange}
          aria-label="顯示孤立節點"
        />
        <label htmlFor="show-isolated" className="text-xs text-muted-foreground cursor-pointer">
          顯示孤立
        </label>
      </div>

      {/* 分隔 */}
      <div className="w-px h-6 bg-border" aria-hidden="true" />

      {/* SearchHighlight */}
      <div className="relative flex items-center">
        <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜尋節點..."
          className="h-8 pl-7 pr-7 w-36 text-sm"
          aria-label="搜尋節點"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            aria-label="清除搜尋"
            className="absolute right-2 p-0.5 rounded hover:bg-neutral-100 transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* 彈性空間 */}
      <div className="flex-1" />

      {/* ZoomControls */}
      <div className="flex items-center gap-1" role="group" aria-label="縮放控制">
        <button
          onClick={() => fitView({ padding: 0.2 })}
          aria-label="適合視窗"
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors p-1.5"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomIn()}
          aria-label="放大"
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors p-1.5"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomOut()}
          aria-label="縮小"
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors p-1.5"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── 4. NodeDetailSheet ───────────────────────────────────────────────────────

interface NodeDetailSheetProps {
  open: boolean;
  onClose: () => void;
  entry: {
    title: string;
    summary: string;
    tags: string[];
    category: string;
    outgoing_links: LinkPreview[];
    incoming_links: LinkPreview[];
  } | null;
  onOpenLibrary: () => void;
}

export function NodeDetailSheet({ open, onClose, entry, onOpenLibrary }: NodeDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      {/* md+ 右側；< md 底部 sheet（side 由 CSS 控制） */}
      <SheetContent
        side="right"
        className="w-full sm:w-[360px] md:w-[360px] p-0 flex flex-col"
        aria-label={entry ? `節點詳情：${entry.title}` : "節點詳情"}
      >
        {entry ? (
          <>
            <SheetHeader className="px-5 py-4 border-b border-border">
              <SheetTitle className="text-xl font-semibold leading-tight pr-8">
                {entry.title}
              </SheetTitle>
              {/* Meta */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <Badge variant="secondary">{entry.category}</Badge>
                {entry.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Summary */}
              {entry.summary && (
                <section>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {entry.summary}
                  </p>
                </section>
              )}

              {/* Outgoing Links */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  連出（{entry.outgoing_links.length}）
                </h3>
                <div className="space-y-1.5">
                  {entry.outgoing_links.slice(0, 3).map((link) => (
                    <LinkPreviewChip key={link.id} link={link} direction="out" />
                  ))}
                </div>
              </section>

              {/* Incoming Links */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  連入（{entry.incoming_links.length}）
                </h3>
                <div className="space-y-1.5">
                  {entry.incoming_links.slice(0, 3).map((link) => (
                    <LinkPreviewChip key={link.id} link={link} direction="in" />
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border">
              <Button variant="outline" className="w-full" onClick={onOpenLibrary}>
                在 Library 開啟
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-5">
            <p className="text-sm text-muted-foreground">載入中...</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// 小型 Link Preview chip（NodeDetailSheet 內使用）
function LinkPreviewChip({
  link,
  direction,
}: {
  link: LinkPreview;
  direction: "in" | "out";
}) {
  const color = LINK_TYPE_COLORS[link.link_type];
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {direction === "in" && (
        <span className="text-xs text-muted-foreground">from</span>
      )}
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-normal text-white flex-shrink-0"
        style={{ backgroundColor: color.hex }}
      >
        {color.label}
      </span>
      <span className="text-sm text-foreground truncate">{link.title}</span>
      {link.confidence !== undefined && link.confidence < 1.0 && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {(link.confidence * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

// ─── 5. TruncatedWarningBanner ────────────────────────────────────────────────

export function TruncatedWarningBanner({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 h-10 px-4 bg-yellow-50 border-b border-yellow-200 z-20"
    >
      <AlertTriangle className="h-4 w-4 text-yellow-700 flex-shrink-0" aria-hidden="true" />
      <p className="text-sm text-yellow-800 flex-1">
        圖譜資料已截斷（&gt; 200 節點），建議篩選後查看
      </p>
      <button
        onClick={onClose}
        aria-label="關閉截斷警告"
        className="p-1 rounded hover:bg-yellow-100 transition-colors"
      >
        <X className="h-3.5 w-3.5 text-yellow-700" />
      </button>
    </div>
  );
}

// ─── 6. Canvas Empty State ────────────────────────────────────────────────────

export function CanvasEmptyState({ onGoToLibrary }: { onGoToLibrary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      {/* 插圖 placeholder */}
      <div
        className="w-32 h-32 rounded-full bg-neutral-100 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg viewBox="0 0 80 80" className="w-20 h-20 text-neutral-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="20" cy="40" r="8" />
          <circle cx="60" cy="20" r="8" />
          <circle cx="60" cy="60" r="8" />
          <line x1="28" y1="37" x2="52" y2="23" />
          <line x1="28" y1="43" x2="52" y2="57" />
        </svg>
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">尚無連結關係</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          在 Library 頁面新增條目並設定連結後，此處將顯示知識圖譜
        </p>
      </div>
      <Button onClick={onGoToLibrary}>前往 Library</Button>
    </div>
  );
}

// ─── 組合使用示範 ──────────────────────────────────────────────────────────────

/*
// 在 CanvasPage 中使用：
// （完整實作見 design/pages/f045-canvas.md）

const nodeTypes = { entry: EntryNode };
const edgeTypes = { link: LinkEdge };

<ReactFlowProvider>
  <div className="flex flex-col h-screen">
    {truncated && <TruncatedWarningBanner onClose={() => setTruncated(false)} />}
    <CanvasToolbar ... />
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      />
      <NodeDetailSheet
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        entry={selectedEntry}
        onOpenLibrary={handleOpenLibrary}
      />
    </div>
  </div>
</ReactFlowProvider>
*/
