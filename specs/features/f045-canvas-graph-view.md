# F-045: Canvas Graph View

## Status: active
## Sprint: 15
## Priority: P1
## GitHub Issues: 待開

## 使用者故事
As a user, I want to visualize the relationships between my knowledge entries as an interactive graph, so that I can explore connections and discover patterns in my knowledge base.

## 設計決策
- 使用 React Flow（@xyflow/react）渲染知識圖譜
- 節點 = entry（顯示 title + category badge）
- 邊 = entry_links（F-044），帶 link_type 標籤
- 佈局算法：ELK hierarchical layout（elk.js）
- 初始載入：顯示前 50 個 library entries + 其間的 links
- 效能：超過 200 節點時降級為 dot-only 模式（無 label）

## UI 架構

```
/canvas
├── CanvasPage
│   ├── CanvasToolbar
│   │   ├── LayoutToggle（hierarchical / force / radial）
│   │   ├── FilterBar（category / link_type / min_confidence）
│   │   ├── SearchHighlight（搜尋 + 高亮節點）
│   │   └── ZoomControls（fit / zoom in/out）
│   ├── ReactFlowCanvas
│   │   ├── EntryNode（自定義節點：title + category badge + confidence）
│   │   └── LinkEdge（自定義邊：link_type label + 方向箭頭）
│   └── NodeDetailSheet（點選節點展開 entry 詳情）
```

## API Contract

### `GET /api/v1/graph`（新 endpoint）
Auth：cookie session 或 API Key

Query params：
| Param | Type | Description |
|-------|------|-------------|
| category_id | UUID | 過濾指定分類的節點 |
| link_types | string | 逗號分隔，過濾邊類型 |
| min_confidence | float | 最低 confidence（預設 0.0） |
| limit | integer | 節點數上限，預設 50，最大 200 |
| entry_id | UUID | 以指定 entry 為中心展開（ego network） |
| depth | integer | ego network 展開深度，預設 2，最大 3 |

Response 200:
```json
{
  "nodes": [{
    "id": "uuid",
    "title": "string",
    "summary": "string",
    "category": { "id": "uuid", "name": "string" },
    "confidence": 0.85,
    "status": "library"
  }],
  "edges": [{
    "id": "uuid",
    "from_id": "uuid",
    "to_id": "uuid",
    "link_type": "derives_from",
    "relation": "string or null",
    "confidence": 0.95,
    "source": "manual"
  }],
  "meta": {
    "total_nodes": 42,
    "truncated": false
  }
}
```

Error Responses:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_INPUT | depth > 3 / limit > 200 |
| 404 | NOT_FOUND | entry_id 指定的 entry 不存在 |

## Business Rules
1. 預設載入前 50 筆 library entries + 其間已知 links
2. 節點數超過 200 時，後端截斷並回傳 `meta.truncated: true`；前端顯示 warning banner
3. 孤立節點（無連結）預設隱藏（可透過 toggle 顯示）
4. 點選節點開啟 NodeDetailSheet，不離開 Canvas 頁面
5. 雙擊節點 → 以該 entry 為中心重新載入 ego network（depth=2）
6. 佈局計算在 Web Worker 執行（避免 UI 凍結）

## Scenarios

### Happy Path

#### Scenario: 載入全局圖譜
GIVEN 系統中有 30 個 library entries，其中 15 條 links
WHEN 使用者瀏覽 /canvas
THEN GET /api/v1/graph 回傳 30 nodes + 15 edges
AND React Flow 渲染圖譜，自動 fit-to-screen

#### Scenario: 點選節點展開詳情
GIVEN 圖譜已顯示
WHEN 使用者點選 entry node A
THEN 右側 NodeDetailSheet 展開
AND 顯示 A 的 title / summary / tags / links

#### Scenario: 雙擊節點切換 Ego Network
GIVEN 圖譜已顯示，entry A 有 3 個鄰居
WHEN 使用者雙擊 entry A
THEN GET /api/v1/graph?entry_id=A&depth=2
AND 圖譜重新渲染，以 A 為中心，顯示 depth-2 鄰居
AND toolbar 顯示 "Centered on: [A title]"

#### Scenario: 過濾 link_type
GIVEN 圖譜包含 derives_from、contradicts、references 各 5 條邊
WHEN 使用者取消勾選 "references"
THEN 圖譜重新渲染，references 邊隱藏（前端過濾，不重新呼叫 API）

### Error Handling

#### Scenario: 節點數截斷 warning
GIVEN 系統中有 250 個 library entries
WHEN GET /api/v1/graph（limit=200）
THEN meta.truncated = true
AND 前端顯示 "Showing 200 of 250 entries. Use filters to narrow down."

### Edge Cases

#### Scenario: 無 links 的知識庫
GIVEN 系統中有 10 個 entries，無任何 links
WHEN 使用者瀏覽 /canvas
THEN 圖譜顯示 10 個孤立節點（若 "show isolated" 已開啟）
AND 顯示提示 "Add links between entries to build your knowledge graph"
