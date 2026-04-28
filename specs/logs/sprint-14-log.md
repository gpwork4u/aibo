# Sprint 14 工作日誌：Inbox + Library + Today

**Milestone**: #14
**Epic**: #187
**Sprint Issue**: #189
**完成日**: 2026-04-28

## 交付清單

| Feature | Issue | PR | 狀態 |
|---------|-------|----|----|
| F-040 Inbox Triage View | #206 | #215 | ✅ MERGED |
| F-041 Library Table View | #207 | #216 | ✅ MERGED |
| F-042 Today Dashboard | #208 | #213 | ✅ MERGED |
| F-043 Saved Views (backend) | #209 | #217 | ⚠️ MERGED (frontend 為 follow-up) |
| D-14 UI Components | #210 | #214 | ✅ MERGED |
| QA-14 e2e skeleton | #211 | #212 | ✅ MERGED (test.skip) |

## 重點變更

### Frontend (`dev/frontend/`)
- `app/(shell)/inbox/page.tsx` — Inbox 頁面 wire up
- `components/inbox/`：InboxList / InboxCard / InboxToolbar / InboxActionBar / useInboxKeyboard hook（J/K/A/D/E/Space）
- `app/(shell)/library/page.tsx` — Library 頁面（nuqs URL state）
- `components/library/`：LibraryTable（TanStack Table v8 + Virtual v3）+ LibraryToolbar
- `app/(shell)/today/page.tsx` + `components/today/`：4 sections（Calendar/Journal/RecentEntries/Tasks）+ per-section error boundary

### Backend (`dev/src/`)
- migration `018_create_saved_views`
- `model.SavedView` / `dto.View*` / `repository.ViewRepository`
- `service.ViewService`（CRUD + 50 limit + duplicate check）
- `handler.ViewHandler`：POST/GET/PATCH/DELETE + reorder
- entries API extension：batch ops + classify + status filter

### Design (`design/`)
- `components/inbox-card`、`library-table-chrome`、`today-section-card`、`saved-views-chip` + 範例 .tsx
- `pages/`：f040-inbox-triage、f041-library、f042-today

### Test (`test/`)
- 27 scenarios skeleton（IT-1~9、LT-1~7、TD-1~5、SV-1~6），全 test.skip 待 features 啟用

## 已知 Follow-up
1. **F-043 frontend**：saved-views-bar UI（chip list + dnd-kit drag reorder + kebab menu）+ saved-view-dialog + 整合到 /library page
2. **F-039 router 註冊**（前 sprint 遺留）：仍需小 PR
3. **e2e 啟用**：features 上線後逐步解開 test.skip

## 備註
本 sprint 多次遭遇 background engineer agent stall（思考但未 commit），由 orchestrator 接手 commit/push/PR 完成。Sprint 14 共合併 6 個 PR。
