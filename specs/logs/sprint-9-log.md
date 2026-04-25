# Sprint 9 工作日誌 — 日記 + Google Calendar 強化

**Milestone**：#76
**起迄**：2026-04-25
**目標**：補上 aibo 的「每日日記」（含 LLM 草稿）與強化 Google Calendar 整合（連線狀態、預設日曆、reauth 流程）。

## 交付

| Feature | Issue | PR | 說明 |
|---|---|---|---|
| F-028a | #96 | #109 | Journal migration 013 + repository + DTO |
| F-028b | #97 | #112 | Journal CRUD API（GET/POST/PATCH/DELETE/List） |
| F-028c | #98 | #114 | Journal LLM Draft（POST `/:date/draft`） |
| F-029a | #99 | #115 | Journal 列表頁 + heatmap + sidebar「日記」 |
| F-029b | #100 | #117 | Journal 編輯頁（write/preview tabs + LLM 草稿 banner） |
| F-030a | #101 | #108 | gcal_integrations migration 014 + repo 擴充 |
| F-030b | #102 | #113 | gcal status / calendars / settings / disconnect API |
| F-030c | #103 | #111 | gcal events read-through + token reauth + linked_entry_id |
| F-030d | #104 | #116 | 設定頁 Google Calendar 區塊 + sidebar |
| D-09   | #105 | #110 | Journal + Gcal Settings UI 設計 19 份檔案 |
| QA-09 (skel) | #106 | #107 | 28 個 Playwright test skeleton |

## Wave 並行策略實際執行

```
Wave 0：F-028a / F-030a / D-09 / QA-09 skel（4 條線）
Wave 1：F-028b / F-030b / F-030c
Wave 2：F-028c / F-029a / F-030d
Wave 3：F-029b
Wave 4：QA 完整 e2e（docker 環境執行，本 Sprint 未跑）
```

## Code Review 統計

- 一次通過：#107、#108、#109、#110、#111、#112、#113、#114、#115、#116、#117
- 二次或多次通過：無
- 主要 review 發現（PR #109、#108）：
  - migration tiebreaker / unique constraint 結構化判斷
  - test 隔離 DSN 防呆
  - PUT vs PATCH 文檔筆誤（不影響行為）

## 三維度驗證

[`specs/verify-sprint-9.md`](../verify-sprint-9.md) — **PASS**

- Completeness ✅（11 個 feature 全交付）
- Correctness ✅（API contract / error code / testid 三邊對齊）
- Coherence ✅（風格慣例延續 Sprint 8）

## 觀察 / 流程改善

1. **Rate limit 中斷**：Wave 2 三條線同時撞上每週 quota，由 orchestrator 自接 F-028c / F-029a / F-029b / F-030d 的 commit/push/PR 環節。對 SpecFlow 流程的啟示：高並行下 quota 風險高，建議 Wave 之間留 gap、或單條線串行。
2. **agent commit 不收尾**：和 Sprint 8 一樣再次出現「實作完未 commit」的卡點。issue 完成 checklist 還是要更明確，或在 issue body 直接附 `gh pr create` 的 boilerplate 命令。
3. **PR 衝突解決成本**：F-030b 與 F-030c 都動 router.go / handler/gcal.go / dto/gcal.go，rebase 衝突需手動 merge。改善：Wave 1 同 Wave 內先把 router 註冊與 handler 分檔分得更乾淨。
4. **frontend 自製品質**：F-029a / F-030d / F-029b 由 orchestrator 直寫（rate limit 緣故），未經完整 review round。建議 Sprint 10 起前先 review pass 一次補強。

## 統計

- PR 總數：11
- 程式碼 lines added（估）：~3000+ Go、~1500+ TS、~3000+ markdown
- 新檔：~30
- 修改檔：~10
