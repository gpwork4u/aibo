# Sprint 15 工作日誌：Canvas + Entry Links

**Milestone**: #15
**Epic**: #187
**Sprint Issue**: #190
**完成日**: 2026-04-28

## 交付清單

| Feature | Issue | PR | 狀態 |
|---------|-------|----|----|
| F-044 Entry Links Backend | #219 | #227 | ✅ MERGED |
| F-045 Canvas Graph View | #220 | #229 | ✅ MERGED |
| F-046 Relation Editor | #221 | #228 | ✅ MERGED |
| D-15 UI Components | #222 | #226 | ✅ MERGED |
| QA-15 e2e skeleton | #223 | #225 | ✅ MERGED |
| Tech Survey | — | #224 | ✅ MERGED |

## 重點變更

### Backend (`dev/src/`)
- migration `019_create_entry_links` (含 link_type/link_source ENUM、CASCADE、UNIQUE 約束、CHECK 防 self-link)
- `model.EntryLink` + `dto.EntryLink*`
- `repository.EntryLinksRepository`：CRUD + 雙向查詢（JOIN entries 取 title/summary）+ ListByEntryForGraph
- `handler.EntryLinksHandler`：POST/GET/PATCH/DELETE /api/v1/entries/:id/links + GET /api/v1/graph
- PG error mapping：23505 → 409 DUPLICATE / 23503 → 404

### Frontend (`dev/frontend/`)
- `app/(shell)/canvas/page.tsx`（next/dynamic ssr:false）
- `components/canvas/`：EntryNode（full/compact/dot 三模式）、LinkEdge、CanvasToolbar（layout 切換 + 搜尋高亮 + zoom）、NodeDetailSheet、CanvasGraph（ReactFlow Provider + ELK dynamic import + ego network + perf mode）
- `components/relation-editor/`：RelationChip（outgoing 可刪、incoming 唯讀、低信心虛線）、AddRelationForm（Combobox + zod）、RelationsSection
- `lib/api/graph.ts` + `lib/api/entry-links.ts`
- `lib/hooks/use-entry-links.ts`：TanStack Query hooks 含樂觀更新 + rollback
- 整合到 `EntryDetailSheet` Metadata 區塊上方

### Design (`design/`)
- `components/canvas-graph-node/`、`relation-editor/`、`ai-suggestion-chip/`（spec.md + .example.tsx）
- `pages/f045-canvas.md`（layout、響應式、狀態機、快捷鍵、效能規格）

### Test (`test/`)
- 21 scenarios skeleton：EL-1~8、CG-1~5、RE-1~8（test.skip）

## 技術決策
- @xyflow/react v12 + elkjs（dynamic import）+ Web Worker fallback
- 節點數降級：≤50 full / 51-200 compact / >200 dot
- ELK 失敗時 fallback 圓形排列
- next/dynamic + ssr:false 確保 SSR 安全

## Follow-up
1. F-039 router 註冊（前 sprint 遺留）
2. F-043 frontend（saved-views-bar UI）
3. AI 建議連結 endpoint（屬 F-048 範圍，Sprint 16 處理）
4. e2e tests 啟用
