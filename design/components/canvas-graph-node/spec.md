# Canvas Graph Node（EntryNode + LinkEdge + CanvasToolbar + NodeDetailSheet）

## 對應 Feature
#220 F-045: Canvas Graph View

## 技術基礎
- `@xyflow/react` v12（`@xyflow/react` package）
- 所有自定義節點 Component 必須用 `React.memo` 包裹
- `LinkEdge` 標籤使用 `EdgeLabelRenderer` portal（非 SVG foreignObject）
- 佈局引擎：ELK.js（`elkjs` ^0.9），dynamic import 延遲載入

---

## 元件一覽

### 1. EntryNode

#### 用途
React Flow 自定義節點，顯示知識庫條目卡片。

#### 節點模式（依節點總數分級）

| 節點總數 | 模式 | 顯示內容 |
|---------|------|---------|
| ≤ 50 | 完整模式 | title、category badge、confidence badge、完整樣式 |
| 51–200 | 精簡模式 | title only，移除 badge、confidence，簡化樣式 |
| > 200 | dot-only 模式 | 僅圓點（16×16px），hover 顯示 tooltip |

#### 完整模式 Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| data.title | string | — | 條目標題，最多 2 行 ellipsis |
| data.category | string | — | 分類名稱，對應 badge 顏色 |
| data.categoryColor | string | — | 分類色彩 token（primary / neutral / etc.） |
| data.confidence | number | 1.0 | 信心值，< 1.0 時顯示灰色小字 badge |
| data.mode | 'full' \| 'compact' \| 'dot' | 'full' | 渲染模式 |
| selected | boolean | false | React Flow 注入，選中狀態 |

#### 尺寸規格

| 模式 | 寬度 | 最小高度 | Padding |
|------|------|---------|---------|
| 完整 | 180px | 64px | spacing-3 |
| 精簡 | 140px | 40px | spacing-2 |
| dot-only | 16px | 16px | 0 |

#### 外觀規格

| 狀態 | 外觀 |
|------|------|
| default | 白底、border-default、radius-lg、shadow-sm |
| selected | ring 2px primary-500（`ring-2 ring-primary-500`）|
| hover | shadow-md、cursor-pointer |
| dot-only | 圓形（radius-full），顏色對應 category |

#### 字型規格
- title：font-size sm（0.875rem）、font-weight medium、行高 tight（1.25）、最多 2 行、overflow ellipsis
- category badge：font-size xs（0.75rem）、font-weight normal
- confidence badge：font-size xs（0.75rem）、color foreground-subtle、背景 neutral-100

#### Accessibility
- `aria-label`：`{title}，分類：{category}` 
- `role="button"`（可點擊進入 ego network）
- `tabIndex={0}`，支援 Enter 觸發 double-click 行為
- dot-only 模式：`title` attribute 顯示 tooltip（原生 HTML tooltip）

---

### 2. LinkEdge

#### 用途
React Flow 自定義邊，顯示知識連結。

#### Props

| Prop | Type | 說明 |
|------|------|------|
| data.link_type | LinkType | 連結類型 |
| data.confidence | number | 信心值 |
| data.relation | string | 關係說明文字（optional） |

#### Link Type 色彩規格

| link_type | 顏色 token | Hex | Badge 文字 |
|-----------|-----------|-----|-----------|
| derives_from | blue-500 | #3B82F6 | 衍生自 |
| contradicts | red-500 | #EF4444 | 矛盾 |
| duplicate_of | orange-500 | #F97316 | 重複 |
| references | gray-500 | #6B7280 | 參考 |
| supersedes | purple-500 | #A855F7 | 取代 |
| related_to | green-500 | #22C55E | 相關 |

#### 視覺規格

| 條件 | 樣式 |
|------|------|
| 預設 | BezierEdge 基底，實線，strokeWidth 1.5 |
| confidence < 0.5 | 虛線（strokeDasharray: "6 3"）|
| 選中 | strokeWidth 2.5 |
| hover | strokeWidth 2，顯示 EdgeLabel |

#### EdgeLabel（EdgeLabelRenderer portal）
- 位置：邊中點
- 外觀：白底 pill，font-size xs，對應 link_type 顏色邊框
- 顯示時機：hover 或圖中 ≤ 50 節點時
- `title` attribute：顯示 `{link_type}（信心值：{confidence}）`（a11y tooltip）

---

### 3. CanvasToolbar

#### 用途
Canvas 頁面頂部工具列，含佈局切換、過濾、搜尋、縮放控制。

#### 子元件

##### LayoutToggle（按鈕組）

| 選項 | 圖示 | ELK algorithm |
|------|------|--------------|
| hierarchical | `GitBranch`（Lucide） | layered |
| force | `Atom`（Lucide） | force |
| radial | `CircleDot`（Lucide） | radial |

外觀：`ToggleGroup`（shadcn），選中項目 primary-600 底色，白色文字。

##### FilterBar

| 控制 | 類型 | 說明 |
|------|------|------|
| link_type 多選 | Checkbox group（6 種類型） | 各選項帶對應顏色 dot |
| min_confidence | Slider（shadcn） | 0.0～1.0，步距 0.1，預設 0 |
| show isolated | Switch（shadcn） | 顯示無連結節點，預設 off |

##### SearchHighlight
- Input（shadcn），前置 `Search` icon（Lucide）
- 輸入時高亮匹配節點（ring highlight），其餘節點半透明（opacity 0.3）
- placeholder：「搜尋節點...」
- 清除按鈕（X icon），出現時機：有值時

##### ZoomControls
- 按鈕組：Fit（`Maximize2`）、放大（`ZoomIn`）、縮小（`ZoomOut`）
- 尺寸：32×32px（觸控最小 44×44pt — 使用 padding 補足）
- aria-label：「適合視窗」、「放大」、「縮小」

#### Toolbar 尺寸
- height：56px
- padding：spacing-3 spacing-4
- 背景：background-default，下邊框 border-default
- z-index：10（覆蓋 Flow 畫布）

---

### 4. NodeDetailSheet

#### 用途
點擊節點後從右側滑入的詳情側板（shadcn `Sheet`）。

#### Props

| Prop | Type | 說明 |
|------|------|------|
| entry.title | string | 條目標題 |
| entry.summary | string | 摘要（最多 3 行 clamp）|
| entry.tags | string[] | 標籤列表 |
| entry.category | string | 分類 |
| entry.outgoing_links | LinkPreview[] | 外送連結（最多 3 條 preview）|
| entry.incoming_links | LinkPreview[] | 傳入連結（最多 3 條 preview）|
| onOpenLibrary | () => void | 跳轉 Library 頁面 |
| open | boolean | 控制開關 |
| onClose | () => void | 關閉回呼 |

#### 尺寸與版面

| 斷點 | 樣式 |
|------|------|
| >= 768px | 右側滑入，width 360px |
| < 768px | 底部 bottom sheet，height 60vh |

#### 區段
1. Header：entry title（font-xl、semibold）+ 關閉按鈕（X icon）
2. Meta：category badge + tags（Badge component）
3. Summary：font-sm、foreground-muted、行高 relaxed，最多 3 行（line-clamp-3）
4. Outgoing Links：小標題「連出」+ 最多 3 條 RelationChip（精簡版，無 edit/delete）
5. Incoming Links：小標題「連入」+ 最多 3 條 RelationChip（精簡版）
6. Footer：「在 Library 開啟」Button（variant=secondary，fullWidth）

#### Accessibility
- `role="dialog"`，`aria-label="節點詳情：{title}"`
- Escape 鍵關閉
- 開啟時 focus trap

---

### 5. Truncated Warning Banner

#### 用途
`meta.truncated = true` 時在 Canvas 頂部顯示警告。

#### 外觀
- 背景 warning-500 / 10% opacity（`bg-yellow-50`）
- 左側 `AlertTriangle` icon（warning-700）
- 文字：「圖譜資料已截斷（> 200 節點），建議篩選後查看」
- 右側 X 關閉按鈕
- height：40px，font-size sm

---

### 6. Canvas Empty State

#### 用途
無 links 時顯示。

#### 外觀
- 置中插圖（SVG，無文字裝飾圖）
- 標題：「尚無連結關係」（font-xl、semibold）
- 說明：「在 Library 頁面新增條目並設定連結後，此處將顯示知識圖譜」（font-sm、foreground-muted）
- CTA：「前往 Library」Button（variant=primary）

---

## States 總覽

| 元件 | 支援狀態 |
|------|---------|
| EntryNode | default / hover / selected / dot-only / compact |
| LinkEdge | default / hover / selected / dashed（低信心）|
| CanvasToolbar | — |
| NodeDetailSheet | open / loading / closed |

## 使用範例
見 `example.tsx`
