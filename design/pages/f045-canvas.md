# Canvas Page（/canvas）

## 對應 Feature
#220 F-045: Canvas Graph View

## 技術基礎
- `@xyflow/react` v12（ReactFlowProvider + ReactFlow）
- ELK.js 佈局（dynamic import）
- shadcn/ui Sheet（NodeDetailSheet）
- Next.js App Router

---

## 整體版面

```
┌─────────────────────────────────────────────────────────────────┐
│  App Shell Navbar（height: 64px）                               │
├─────────────────────────────────────────────────────────────────┤
│  [TruncatedWarningBanner: 40px — meta.truncated=true 時顯示]    │
├─────────────────────────────────────────────────────────────────┤
│  CanvasToolbar（height: 56px）                                  │
│  ┌──LayoutToggle──┐ ┌──FilterBar──┐ ┌──SearchHighlight──┐      │
│  │ 層次 力 放射   │ │ 6 type chip │ │ 搜尋框            │      │
│  └───────────────┘ └─────────────┘ └──────────────────-─┘      │
│                                     [ZoomControls: Fit/+/-]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  React Flow 畫布（flex-1，100% 剩餘高度）                       │
│                                                                  │
│  ┌─────────────────────────────────┐   ┌───────────────────┐   │
│  │  EntryNode（卡片）              │   │  NodeDetailSheet  │   │
│  │  ╔═══════════════╗             │   │  （右側，360px）  │   │
│  │  ║ Title         ║             │   │                   │   │
│  │  ║ [cat badge]   ║             │   │  [entry title]    │   │
│  │  ╚═══════════════╝             │   │  [meta badges]    │   │
│  │          ↓ LinkEdge            │   │  [summary]        │   │
│  │  ╔═══════════════╗             │   │  [連出 chips]     │   │
│  │  ║ Target Entry  ║             │   │  [連入 chips]     │   │
│  │  ╚═══════════════╝             │   │                   │   │
│  └─────────────────────────────────┘   │  [在Library開啟]  │   │
│                                         └───────────────────┘   │
│  [React Flow MiniMap — 右下角]                                   │
│  [React Flow Attribution — 左下角]                              │
│                                                                  │
│  ┌ Empty State（無連結時，整個畫布區置中）─────────────────┐    │
│  │  [圖示] 尚無連結關係  [前往 Library 按鈕]               │    │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 響應式行為

| 斷點 | 變化 |
|------|------|
| >= 768px（md） | NodeDetailSheet 右側滑入（width: 360px）；CanvasToolbar 單行 |
| < 768px（sm） | NodeDetailSheet 改為底部 bottom sheet（height: 60vh）；FilterBar 折疊為下拉按鈕 |
| < 640px | LayoutToggle 僅顯示 icon（不顯示文字標籤）；ZoomControls 縮小 |

---

## 使用的元件

| 元件 | 來源 | 用途 |
|------|------|------|
| CanvasToolbar | `design/components/canvas-graph-node` | 工具列 |
| EntryNode | `design/components/canvas-graph-node` | 節點卡片 |
| LinkEdge | `design/components/canvas-graph-node` | 連結邊 |
| NodeDetailSheet | `design/components/canvas-graph-node` | 節點詳情側板 |
| TruncatedWarningBanner | `design/components/canvas-graph-node` | 截斷警告 |
| CanvasEmptyState | `design/components/canvas-graph-node` | 空白狀態 |
| ReactFlow（@xyflow/react） | 第三方 | 圖譜渲染引擎 |
| MiniMap（@xyflow/react） | 第三方 | 縮略圖導覽 |

---

## 頁面狀態機

```
初始載入
  │
  ▼
Loading（skeleton：Toolbar 骨架 + 畫布 spinner）
  │
  ├─ 成功且有資料 ──→ 渲染 ReactFlow 圖譜
  │                        │
  │               ┌─ meta.truncated=true ──→ 顯示 TruncatedWarningBanner
  │               └─ 點擊節點 ──→ NodeDetailSheet open=true
  │
  ├─ 成功但無連結 ──→ CanvasEmptyState
  │
  └─ 失敗 ──→ Error state（Toast + 重試按鈕）
```

---

## Canvas 載入 Skeleton

- Toolbar 區域：3 個灰色圓角方塊（`animate-pulse`）
- 畫布區域：居中顯示 spinner（`LoaderCircle` icon，Lucide，animate-spin）

---

## 佈局計算流程

1. 頁面載入：`GET /api/v1/graph?entry_id={id}&depth=2`（預設 ego network）
2. 收到資料後，dynamic import ELK（`import('elkjs/lib/elk.bundled.js')`）
3. ELK Web Worker 執行 `layered` 佈局算法
4. 佈局完成後，更新 nodes 位置，呼叫 `fitView()`
5. 切換佈局（LayoutToggle）：重新執行步驟 3-4，300ms 動畫過渡

---

## 節點模式觸發

| 條件 | 行為 |
|------|------|
| 節點總數 ≤ 50 | 所有 EntryNode 用 `mode="full"` |
| 節點總數 51–200 | 所有 EntryNode 用 `mode="compact"` |
| 節點總數 > 200 | 所有 EntryNode 用 `mode="dot"`；顯示 TruncatedWarningBanner |

---

## 鍵盤互動

| 快捷鍵 | 行為 |
|--------|------|
| `Escape` | 關閉 NodeDetailSheet |
| `Cmd/Ctrl + F` | 聚焦 SearchHighlight |
| `+` / `-` | Zoom In / Out |
| `0` | Fit View |
| `Tab` | 在 Toolbar 控制項間導覽 |

---

## 數據來源

| API | 用途 |
|-----|------|
| `GET /api/v1/graph?entry_id={id}&depth={n}` | 取得圖譜資料（nodes + edges + meta）|
| `GET /api/v1/entries/{id}` | 取得節點詳情（NodeDetailSheet 用）|

---

## z-index 層級

| 元件 | z-index |
|------|---------|
| TruncatedWarningBanner | 20 |
| CanvasToolbar | 10 |
| NodeDetailSheet | 50（shadcn Sheet 預設）|
| ReactFlow MiniMap | 5 |

---

## 效能注意事項

- `nodeTypes` 和 `edgeTypes` 物件必須在元件外（或 `useMemo`）定義，避免每次 render 建立新參考
- `EntryNode` / `LinkEdge` 均以 `React.memo` 包裹
- `onNodesChange` / `onEdgesChange` handlers 使用 `useCallback`
- ELK 使用 dynamic import + Web Worker，避免阻塞 UI

---

## 空白狀態規格

顯示條件：API 回傳 nodes 陣列為空（無任何帶 links 的條目）。

詳見 `design/components/canvas-graph-node/spec.md` — Canvas Empty State 段落。
