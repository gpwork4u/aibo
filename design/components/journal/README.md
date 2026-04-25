# Journal Components — Sprint 9

對應 issue #105、F-028 / F-029。沿用 Sprint 8 的 shadcn/ui + Tailwind v4 風格與 design tokens（`design/tokens/`），新增 mood / draft 相關 token（見 `design/tokens/mood.md`）。

## 元件清單

| 元件 | 檔案 | 用途 |
|------|------|------|
| JournalListCard | `journal-list-card.md` | `/journal` 列表時間軸卡片 |
| JournalFilters | `journal-filters.md` | 列表頁篩選列（mood / draft / date range） |
| JournalHeatmap | `journal-heatmap.md` | 月曆熱力圖（字數 / 心情切換） |
| JournalEditor | `journal-editor.md` | 編輯器（Tabs：編輯／預覽 + autoGrow Textarea） |
| JournalMoodPicker | `journal-mood-picker.md` | emoji 三選一心情選擇器 |
| JournalLlmDraftBanner | `journal-llm-draft-banner.md` | LLM 草稿生成中／已生成的提示帶 |
| SourceRefsPanel | `source-refs-panel.md` | 編輯頁右側「關聯條目／事件」面板 |

## testid 規範

統一在 `testids.md` 定義（`JOURNAL_TESTIDS` 常數）。

QA 將以 `page.getByTestId('journal-card-2026-04-23')` 等方式定位元素。

## 共通 a11y

- 所有按鈕 `<button>` 元素，可 Tab、有 focus ring
- 心情顏色搭配 emoji + 文字，不單獨用顏色傳達語意
- 對比 ≥ WCAG AA（4.5:1），Sprint 8 既有 token 已驗證

## 共通互動

- 動畫 150–300ms（Tabs / Hover），尊重 `prefers-reduced-motion`
- 觸控目標 ≥ 44px（主要 CTA 與 mood picker `md` size）
- 鍵盤完整支援（Radix shadcn 內建）
