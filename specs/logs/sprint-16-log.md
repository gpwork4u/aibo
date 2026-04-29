# Sprint 16 工作日誌：Copilot SSE + CmdK Power + Shortcuts

**Milestone**: #16
**Epic**: #187
**Sprint Issue**: #191
**完成日**: 2026-04-29

## 交付清單

| Feature | Issue | PR | 狀態 |
|---------|-------|----|----|
| F-047 Copilot Side Panel | #232 | #243 | ✅ MERGED |
| F-048 Copilot Backend SSE | #231 | #240 | ✅ MERGED |
| F-049 CmdK Power Actions | #233 | #241 | ✅ MERGED |
| F-050 Keyboard Shortcuts | #234 | #238 | ✅ MERGED |
| D-16 UI Components | #235 | #242 | ✅ MERGED |
| QA-16 e2e skeleton | #236 | #239 | ✅ MERGED |
| Tech Survey | — | #237 | ✅ MERGED |

## 重點變更

### Backend (`dev/src/`)
- migration `020`：copilot_sessions + copilot_messages
- `model.Copilot*` / `dto.Copilot*` / `repository.CopilotRepository`
- `service.CopilotService`：context 注入（最近 entries）+ LLM streaming
- `handler.CopilotHandler` 取代 F-039 skeleton：POST /copilot/messages、GET /copilot/stream、sessions CRUD
- router.go + main.go DI

### Frontend (`dev/frontend/`)
- `lib/api/copilot.ts`、`lib/stores/copilot-store.ts`（zustand）
- `lib/hooks/use-copilot-sse.ts`：EventSource + 指數退避重連（1s/2s/4s，最多 3 次）
- `components/copilot/`：CopilotPanel（resizable 240-600px）+ MessageList（streaming cursor）+ MessageInput（Enter 送、Shift+Enter 換行）
- `lib/hooks/use-keyboard-shortcuts.ts`：自訂 hook，G 系列 sequential（500ms timeout）+ ⌘K/⌘J/?
- `components/shortcuts/shortcuts-modal.tsx`：5 sections kbd grid
- CmdK power：entries-search（debounce 200ms）、ai-actions（`>` prefix）、quick-create-modal、create-actions
- 整合 (shell) layout

### Design (`design/`)
- `components/copilot-panel/`、`cmdk-power/`、`shortcuts-modal/`（spec.md + .example.tsx）
- `pages/f047-copilot.md`（layout + 響應式 + zustand 流程）

### Test (`test/`)
- 24 scenarios skeleton：CP-1~6、CB-1~5、CP-1~6、KS-1~6（test.skip）

## 技術決策
- 原生 EventSource + 自訂重連（不引入 reconnecting-eventsource）
- zustand 不用 persist middleware（避免 SSR hydration mismatch）
- 自訂 useKeyboardShortcuts（不用 react-hotkeys-hook）
- 後端 SSE：X-Accel-Buffering: no、c.Stream() flush、15s ping

## Sprint 16 完成 = 整個 visual redesign milestone 完成
F-035~F-050 共 16 個 feature 全部 merged。aibo 從純表格列表型 UI 轉變為 editorial 紙本設計系統 + dashboard hub + canvas + copilot 整合。

## Follow-up（跨 sprint）
1. F-039 router 註冊（Sprint 13 遺留）— 已被 F-048 取代為 CopilotHandler
2. F-043 frontend：saved-views-bar UI
3. e2e 124+ scenarios 待 features 啟用後逐步解開 test.skip
