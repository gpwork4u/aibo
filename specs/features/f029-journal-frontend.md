# F-029: 日記前端頁面

## Status: active
## Sprint: 9
## Priority: P0

## 使用者故事
As a 使用者,
I want 一個簡潔的日記編輯頁與時間線瀏覽頁,
so that 每天可以快速寫日記或讓 LLM 產初稿。

## 範圍
- 側邊欄新增「日記」→ `/journal`
- `/journal` 列表頁：時間軸（最新在上），每筆卡片顯示 date, title, mood emoji, 前 200 字 preview, draft badge
- `/journal/:date` 編輯頁：
  - 標題、Markdown 編輯器（`@uiw/react-md-editor` 或 shadcn textarea + preview tab）
  - Mood 選擇（emoji toggle group）
  - 「讓 AI 產生初稿」按鈕（loading state）
  - Source refs 區塊：展示關聯的 entries / events（唯讀）
  - Draft badge + 「確認發布」按鈕（→ PATCH is_draft=false）
- 從行事曆 Day Sheet 點「寫日記」→ 跳轉 `/journal/:date`

## 元件
- `JournalListPage`
- `JournalEditorPage`
- `MoodPicker`
- `DraftBanner`（顯示 LLM draft 時出現）
- `SourceRefsPanel`

## Scenarios

### Happy Path

#### Scenario: 從行事曆進入編輯
GIVEN 點擊 /calendar 某日 Sheet 中「寫日記」
WHEN 跳轉完成
THEN URL = /journal/2026-04-24
AND 呼叫 GET /api/v1/journal/2026-04-24
AND 若 404 則顯示空白編輯器

#### Scenario: LLM 產生 draft 並確認
GIVEN 今日尚無 journal
WHEN 使用者點「讓 AI 產生初稿」
THEN 按鈕 loading
AND 呼叫 POST /api/v1/journal/2026-04-24/draft
AND 載入完成後編輯器填入內容
AND 頁首顯示 DraftBanner「這是 AI 草稿」
WHEN 使用者點「確認發布」
THEN 呼叫 PATCH /api/v1/journal/2026-04-24 with { is_draft: false }
AND DraftBanner 消失

### Error Handling

#### Scenario: LLM 產 draft 失敗
GIVEN API 回 503 LLM_UNAVAILABLE
THEN 顯示 toast「LLM 暫時無法使用，請檢查 Provider 設定」
AND 編輯器保持空白

#### Scenario: 儲存時已有 non-draft
GIVEN API 回 409 JOURNAL_EXISTS
THEN 顯示確認 dialog「今日已有日記，要重新載入嗎？」

### Edge Cases

#### Scenario: 未儲存離開頁面
GIVEN 編輯器內容已修改但未儲存
WHEN 使用者嘗試離開
THEN 顯示 `beforeunload` 確認
