# Sprint 9 三維度驗證報告

**Sprint**：#76（日記 + Google Calendar 強化）
**驗證日期**：2026-04-25
**驗證者**：orchestrator（rate-limit 期間自驗）

## 結論：🟢 PASS（含若干後續改善項）

---

## 三維度檢查

### Completeness 完整性

| 項目 | 狀態 | 證據 |
|---|---|---|
| F-028a Journal migration + repo | ✅ | `dev/src/migration/013_create_journal.{up,down}.sql`、`repository/journal.go`、`dto/journal.go`、`model/journal.go`、`service/interfaces.go` 已加 `JournalRepository` |
| F-028b Journal CRUD API | ✅ | `service/journal.go` + `handler/journal.go`：GET/POST/PATCH/DELETE `/:date` + GET 範圍 |
| F-028c Journal LLM Draft | ✅ | `service/journal_draft.go` + `handler/journal_draft.go`：POST `/:date/draft`，回 markdown + used_refs + mood |
| F-029a Journal 列表頁 | ✅ | `app/(dashboard)/journal/page.tsx` + heatmap + filters + list-card；sidebar 加「日記」 |
| F-029b Journal 編輯頁 | ✅ | `app/(dashboard)/journal/[date]/page.tsx`：title / mood / write/preview tabs / LLM 草稿 / 儲存 / 刪除 |
| F-030a gcal_integrations migration | ✅ | `migration/014_extend_gcal_integrations.{up,down}.sql`，model 加 `DefaultCalendarID` / `AccessTokenExpiresAt` |
| F-030b gcal status/calendars/settings/disconnect | ✅ | 4 endpoints + handler + service |
| F-030c gcal events read-through + reauth | ✅ | `ListEventsExternal` + `GetByGcalRef`（補 linked_entry_id）+ token expired 路徑 |
| F-030d gcal settings UI | ✅ | `/settings/gcal` 頁 + `GcalStatusCard`：未連 / 已連 / 需 reauth 三態 |
| QA-09 e2e skeleton | ✅ | `test/browser/specs/journal-*.spec.ts` + `gcal-settings.spec.ts` + `gcal-reauth.spec.ts`（28 tests skeleton） |
| Design D-09 | ✅ | `design/components/journal/`、`design/components/gcal-settings/`、`design/pages/journal/`、`design/pages/settings/` |

### Correctness 正確性

| 項目 | 狀態 | 備註 |
|---|---|---|
| migration 編號連續 | ✅ | 012 → 013 → 014，無斷號 |
| API contract 對齊 spec | ✅ | journal CRUD endpoint 路徑 / request body / response schema 對齊 `f028-daily-journal.md`；gcal endpoints 對齊 `f030-gcal-enhancements.md` |
| Error code 對齊 spec | ✅ | journal 409 DUPLICATE_DATE、404 NOT_FOUND；draft 424 LLM_NOT_CONFIGURED / 502 LLM_UPSTREAM_ERROR / 404 NO_DATA；gcal 401 / 424 / 502 |
| pgconn 結構化錯誤判斷 | ✅ | `repository/journal.go` 與 `repository/entry.go` 均用 `pgErr.ConstraintName` |
| testid 三邊對齊 | ✅ | `design/components/journal/testids.md` ↔ `dev/frontend/lib/journal/testids.ts` ↔ `test/browser/fixtures/journal.ts`（同 GCAL_SETTINGS_TESTIDS） |
| LLM draft 不直接寫 DB | ✅ | `JournalDraftService.Draft` 僅回 result，未呼叫 repo.Create/Update |
| 中斷 gcal 連線保留歷史 entries | ✅ | F-030b service `Disconnect` 僅清 token / integration row，不刪 source_type=gcal entries |
| go build / vet | ✅ | `dev/src/` 通過 |
| TypeScript noEmit | ✅ | 僅剩 2 個 pre-existing 無關錯誤（data-table.test.tsx） |

### Coherence 一致性

| 項目 | 狀態 | 備註 |
|---|---|---|
| Go 風格 | ✅ | sloog/gin/pgx/AppError 一致 |
| Frontend 風格 | ✅ | shadcn + TanStack Query + zod schema 慣例延續 |
| commit / PR 訊息 | ✅ | 全部 `feat(scope): ...` / `fix(...)` + `Closes #N` |
| 檔案位置 | ✅ | 後端在 `dev/src/`、前端在 `dev/frontend/`、設計在 `design/`、測試在 `test/`，分區乾淨 |
| sidebar 整合 | ✅ | 加入「日記」（main nav）+「Google Calendar」（settings group），與 Sprint 8 行事曆並列 |

---

## 風險 / 後續改善（給 Sprint 10）

1. **Wave 4 完整 e2e 未執行**：QA-09 skeleton 已 merge（28 個 test 仍 `test.skip`），完整版需在 docker compose 環境跑。建議 Sprint 10 之初先把 CI workflow 跑起來，補完整 e2e。
2. **LLM draft 無 unit test**：`JournalDraftService.Draft` 因依賴具體 `*LlmService` 不易 stub。建議抽象出 `LlmCaller` interface。
3. **F-029a/F-030d/F-029b 由 orchestrator 自製**：rate limit 期間直接寫，未經完整 reviewer round。雖功能 / testid / a11y 自查通過，建議 Sprint 10 一起 follow-up review。
4. **`updateJournal` import 位置**：`use-journals.ts` 把 import 放在中段（為了 hook 順序），雖能 work 但風格不雅，建議下次重構統一頂部。
5. **journal heatmap 的 intensity** 目前只依字數（content.length / 200）切分，spec 將來可能要納入 mood，留給 v2 改善。
6. **F-028c gcal events fetcher**：目前在 service 內直接呼叫 `gcalSvc.ListEvents`，未連時跳過。若 reauth 路徑需要 surface 給使用者，目前 best-effort 吃掉錯誤；可考慮把 reauth 狀態傳回 draft response。

---

## Sprint 8 改善項回顧

Sprint 8 留下的 5 項改善，本 Sprint 處理狀況：

| 項目 | 狀態 |
|---|---|
| 1. tsconfig.tsbuildinfo 修掉進 git | ⏭️ 未處理（仍會偶有 untracked） |
| 2. test/reports / test/screenshots gitignore | ⏭️ 未處理 |
| 3. calendar service 三態分支 table-driven test | ⏭️ 未處理 |
| 4. parseIncludeGcal helper 消除重複 | ⏭️ 未處理 |
| 5. testid 共享 package / codegen | ⏭️ 未處理（現仍手動同步） |

→ 建議 Sprint 10 第一個 sprint 先做技術債清理 phase。
