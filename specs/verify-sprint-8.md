# Sprint 8 三維度驗證報告

**日期**：2026-04-24
**驗證者**：verifier (opus)
**Sprint**：Sprint 8（行事曆 Calendar View）
**結論**：🟢 **PASS**

## 總覽

| PR | 主題 | 狀態 |
|----|------|------|
| #86 | Sprint 8 e2e skeleton (Wave 0) | ✅ merged |
| #87 | F-026a 行事曆 migration + repo 日期區間查詢 | ✅ merged |
| #88 | design(calendar) Sprint 8 UI 元件規格 | ✅ merged |
| #89 | F-026c gcal event 轉 entry endpoint | ✅ merged |
| #90 | F-026b 行事曆彙整 API | ✅ merged |
| #91 | F-027a 月視圖 + sidebar | ✅ merged |
| #92 | F-027b 週/日視圖 + 快捷鍵 + 手機 fallback | ✅ merged |
| #93 | F-027c DayDetailSheet + gcal→entry | ✅ merged |
| #95 | QA-08 Sprint 8 e2e 完整 assertion (Wave 3) | ✅ merged |
| `e387e91` | Sprint 8-10 spec source of truth | ✅ on main |

---

## 1. Completeness（完整性） ✅

### F-026 Backend

| 需求 | 位置 | 狀態 |
|------|------|------|
| `GET /calendar`（Aggregate） | `dev/src/handler/calendar.go:26` | ✅ |
| `GET /calendar/:date`（GetDay） | `dev/src/handler/calendar.go:104` | ✅ |
| `POST /calendar/:gcal_id/to-entry` | `dev/src/handler/calendar_to_entry.go:34` | ✅ |
| 路由註冊（`/api/v1/calendar` group） | `dev/src/router/router.go:84,120-123` | ✅ |
| migration 012 up/down | `dev/src/migration/012_add_calendar_indexes.{up,down}.sql` | ✅ |
| CalendarService | `dev/src/service/calendar.go` | ✅ |
| CalendarConvertService | main.go:110 | ✅ |
| Unit test | `dev/src/dto/calendar_test.go`、`dev/src/repository/entry_calendar_test.go` | ✅ |

### F-027 Frontend

| 需求 | 位置 | 狀態 |
|------|------|------|
| 月視圖 | `dev/frontend/components/calendar/month-view.tsx` | ✅ |
| 週視圖 | `dev/frontend/components/calendar/week-view.tsx` | ✅ |
| 日視圖 | `dev/frontend/components/calendar/day-view.tsx` | ✅ |
| DayDetailSheet | `dev/frontend/components/calendar/day-detail-sheet.tsx` | ✅ |
| Toolbar | `dev/frontend/components/calendar/calendar-toolbar.tsx` | ✅ |
| EventBlock / TimeAxis / DayCell / GcalBanner | `dev/frontend/components/calendar/` | ✅ |
| Calendar page | `dev/frontend/app/(dashboard)/calendar/page.tsx` | ✅ |
| Sidebar 行事曆入口 | `app-sidebar.tsx:37` (`/calendar`) | ✅ |
| testids | `dev/frontend/lib/calendar/testids.ts` | ✅ |
| 前端 unit test | `__tests__/components/calendar/`、`__tests__/lib/calendar/` | ✅ |

### QA / Design

| 項目 | 位置 | 狀態 |
|------|------|------|
| e2e specs（6 支） | `test/browser/specs/calendar-*.spec.ts` | ✅ |
| e2e fixtures | `test/browser/fixtures/calendar.ts` | ✅ |
| design tokens / 元件 / pages | `design/tokens/`、`design/components/calendar/`、`design/pages/calendar/` | ✅ |

### Spec Source of Truth

| 文件 | 狀態 |
|------|------|
| `specs/features/f026-calendar-view.md` | ✅（commit e387e91 補齊） |
| `specs/features/f027-calendar-frontend.md` | ✅ |
| `specs/overview.md` / `dependencies.md` / `tech-survey.md` | ✅ 更新 |

---

## 2. Correctness（正確性） ✅

### `include_gcal` 三態分支

`dev/src/handler/calendar.go:54-95` 正確實作三態語義：

- **未指定**：`explicitIncludeGcal=false` → 未連 gcal 算 degraded（200 + `X-Degraded`），不算錯誤
- **明確 true 但未連 gcal**：`explicitIncludeGcal && includeGcal && !GcalConnected` → **424 Failed Dependency**（spec line 84-85）
- **明確 false**：完全跳過 gcal，非 degraded

Service 層註解 `dev/src/service/calendar.go:81-83` 明確列出三種 IncludeGcal 分支，語義一致。✅

### `pgconn.PgError.ConstraintName` 使用

`dev/src/repository/entry.go:16,45-49` 正確結構化判斷 unique constraint，並保留 `strings.Contains` fallback 涵蓋非 PgError 路徑。✅

### testid 對齊

```
diff <(frontend testids) <(browser fixture testids) → Files are identical
```

前端 `dev/frontend/lib/calendar/testids.ts` 與 `test/browser/fixtures/calendar.ts` 的常數字面值**完全一致**（已用 `sort -u` 後 diff 驗證）。✅

---

## 3. Coherence（一致性） ✅

### 目錄結構符合 spec

| 角色 | 目錄 | 遵守 |
|------|------|------|
| engineer | `dev/src/handler/`、`dev/src/service/`、`dev/src/repository/`、`dev/src/migration/`、`dev/frontend/`、`dev/frontend/__tests__/` | ✅ |
| qa | `test/browser/specs/`、`test/browser/fixtures/` | ✅ |
| designer | `design/components/calendar/`、`design/pages/calendar/`、`design/tokens/` | ✅ |
| spec | `specs/features/` | ✅ |

無跨區污染。

### Commit / PR 訊息慣例

Sprint 8 所有 commit 採 `feat(scope): ...` / `test(scope): ...` / `design(scope): ...` / `docs: ...` 格式，PR body 含 `Closes #N`。✅

### Unit test 位置

Go：`*_test.go` 同目錄（`dev/src/dto/`、`dev/src/repository/`）；前端：`dev/frontend/__tests__/`。與既有慣例一致。✅

---

## 發現的問題

### CRITICAL
無。

### WARNING
無。

### SUGGESTION（帶入 Sprint 9 注意事項）

1. **`dev/frontend/tsconfig.tsbuildinfo` 仍有 modified 狀態** — build artifact 不該進 git，Sprint 9 可順手加入 `.gitignore`（或確認已在 ignore 清單但被 `git add -f` 過一次）。
2. **`test/reports/browser-results.json` 與 `test/screenshots/` 為 untracked** — 之後由 CI 自動產出並 commit 到 `test/reports/`，建議確認 `.gitignore` 策略一致（本地 run 不進 git，CI run 進 git）。
3. **gcal 三態分支單元測試覆蓋** — `calendar.go:84-95` 的三分支（424 / degraded / ok）目前主要由 e2e 覆蓋，Sprint 9 若動到 calendar service 可補 service 層 table-driven test，加速回饋。
4. **`include_gcal` 解析重複**：`Aggregate` 與 `GetDay` 各自 parse（`calendar.go:54-66` 與 `115-125`）。Sprint 9 若擴充 query param 可抽 helper `parseIncludeGcal(c)`。
5. **前端 calendar testid contract** — `dev/frontend/lib/calendar/testids.ts` 與 `test/browser/fixtures/calendar.ts` 目前是手動同步。Sprint 9 若元件增多，考慮建立 codegen 或共享 package，避免日後漂移。

---

## 結論

**Sprint 8 三維度驗證 PASS。**

- Completeness：F-026 三 endpoint、F-027 所有視圖/元件、migration 012、spec 文件全數到位
- Correctness：`include_gcal` 三態、`pgconn.PgError.ConstraintName`、testid 對齊三項核心抽查全數通過
- Coherence：角色目錄分區乾淨、commit 慣例一致、測試擺放符合既有習慣

Sprint 8 可關閉，進入 Sprint 9。
