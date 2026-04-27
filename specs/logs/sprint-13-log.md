# Sprint 13 工作日誌：Visual Foundation

**Milestone**: #13 Sprint 13: Visual Foundation
**Epic**: #187
**Sprint Issue**: #188
**完成日**: 2026-04-27

---

## 範圍

editorial 紙本設計系統的視覺基礎建設：design tokens / shadcn primitives 紙本主題 / Next.js parallel routes / Command Palette skeleton / cookie session auth + SSE skeleton。

## 交付清單

| Feature | Issue | PR | 狀態 |
|---------|-------|----|----|
| F-035 Design Tokens & Theme | #192 | #199 | ✅ MERGED |
| F-038 shadcn Primitives | #193 | #202 | ✅ MERGED |
| F-039 API SSE Auth backend | #194 | #203 | ⚠️ MERGED (skeleton, router 未註冊) |
| F-036 App Shell + Routing | #195 | #204 | ✅ MERGED |
| F-037 Command Palette Skeleton | #196 | #205 | ✅ MERGED |
| D-13 元件 dataset | #197 | #201 | ✅ MERGED |
| QA-13 e2e skeleton | #198 | #200 | ✅ MERGED (test.skip) |

## 重點變更

### Frontend (`dev/frontend/`)
- `app/globals.css`：editorial 紙本 design tokens（OKLCH）+ Tailwind v4 @theme + light/dark/system
- `components/theme/`：ThemeProvider + theme-script (FOUC 防止) + theme-toggle
- `components/ui/`：12 shadcn primitives 紙本主題（Dialog/Popover/Dropdown/Tooltip/Sheet/Select/Tabs/Label + Card/Badge/Button/Input）+ Command/Combobox/Kbd
- `app/(shell)/`：route group（sidebar + top-bar + main-area + copilot-slot）
- `app/(shell)/dashboard/`：parallel routes（@inbox / @library / @today / @copilot）
- `components/cmdk/`：Command Palette skeleton + ⌘K hotkey
- 深連結子路由：/dashboard/inbox, /library, /today, /canvas, /settings

### Backend (`dev/src/`)
- migration `017_create_sessions`
- `model.Session`、`dto.Session*`、`repository.SessionRepository`
- `middleware.CookieAuth`（與既有 X-API-Key 並存）
- `handler.SessionAuthHandler`：POST /auth/login、POST /auth/logout、GET /auth/me
- `handler.CopilotStreamHandler`：SSE skeleton（15s ping、event id `<msg_id>:<seq>`）

### Design (`design/`)
- `tokens/`：colors / typography / spacing / shadows / z-index（JSON + MD）
- `components/`：17 個元件規格（含 .example.tsx）
- `pages/`：dashboard-hub / command-palette / login layout sketches

### Test (`test/`)
- `browser/specs/`：41 scenarios（A1-A9、B1-B6、C1-C9、D1-D6、E1-E9、F1-F2）以 `test.skip` 標記，待 features 啟用後解開
- `browser/helpers/`：a11y / cookie-auth / theme helpers
- `e2e/f039_cookie_auth_test.go`：後端 9 cases

## 已知 Follow-up

1. **F-039 router 註冊**：`dev/src/router/router.go` 與 `dev/src/main.go` 需要把 `SessionAuthHandler` / `CopilotStreamHandler` / `CookieAuth middleware` wire 起來（屬 small fix）
2. **specs/features/f035-f050.md**：spec-writer 初始產出未 commit，需於 Sprint 14 開始前回填
3. **Sprint 13 e2e 啟用**：所有 test.skip 待 feature 完整實作後逐步啟用

## 備註

- 本 sprint 多次遭遇 background engineer agent stall（中途思考但未 commit），由 orchestrator 直接接手 commit + push + PR 完成。產出之程式碼已通過 sonnet code-review。
- F-039 標記為 skeleton 而非完整實作，原因為 router wiring 尚未補上；前端 EventSource 客戶端屬 F-047/F-048（Sprint 16）。
