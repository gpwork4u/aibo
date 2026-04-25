# Journal Editor Page Mock — `/journal/:date`

## Desktop（≥ 1024px）

```
┌─── Sidebar ───┬──────────────── Main ─────────────────────────────────────┐
│ ...           │ ┌─ sticky toolbar ─────────────────────────────────────┐ │
│               │ │ [← 返回] 2026-04-24 週五          ✓ 儲存中…  [✓ 確認發布] │ │
│               │ └──────────────────────────────────────────────────────┘ │
│ Journal ●     │                                                            │
│               │ ┌── DraftBanner（is_draft=true 時）──────────────────┐    │
│               │ │ ✨ 這是 AI 草稿（基於 5 條目 · 2 事件）              │    │
│               │ │                  [重新生成]   [使用此草稿 →]        │    │
│               │ └──────────────────────────────────────────────────────┘    │
│               │                                                            │
│               │ ┌─── Editor 區（左 2/3）─────────┐ ┌── SourceRefs（1/3）─┐│
│               │ │ MoodPicker                     │ │ 關聯來源             ││
│               │ │ [😄順心] [🙂普通●] [😣低落]   │ │ ──────────────────  ││
│               │ │                                │ │ 關聯條目（3）         ││
│               │ │ Tabs: [編輯●] [預覽]          │ │ • pytest fixture →   ││
│               │ │ ┌───────────────────────────┐ │ │ • Atomic Habits →    ││
│               │ │ │ 標題（選填）：清明連假第一天│ │ │ • ...                ││
│               │ │ ├───────────────────────────┤ │ │ ──────────────────  ││
│               │ │ │ # 清明連假第一天            │ │ │ 關聯事件（2）         ││
│               │ │ │                            │ │ │ 📅 09:00 Standup     ││
│               │ │ │ 今天和家人一起去掃墓，回程│ │ │   [已連結]            ││
│               │ │ │ 在山上的咖啡店坐了一下午。│ │ │ 📅 13:00 PR Review   ││
│               │ │ │                            │ │ └──────────────────────┘│
│               │ │ │ - 想到要重構 entry classifier                          │
│               │ │ │ - 預計這週末動工           │ │                         │
│               │ │ │                            │ │                         │
│               │ │ ├───────────────────────────┤ │                         │
│               │ │ │ 1,234 字 · 最多 20,000     │ │                         │
│               │ │ └───────────────────────────┘ │                         │
│               │ │                                │                         │
│               │ │ [✨ 讓 AI 產生初稿]           │                         │  ← 無 journal 時顯示
│               │ │   （無 journal 時的主 CTA）   │                         │
│               │ └────────────────────────────────┘                         │
└───────────────┴──────────────────────────────────────────────────────────┘
```

## Mobile（< 768px）

```
┌────────────────────────────────────┐
│ [← ] 2026-04-24 週五   [⋯ 動作 ▾] │   ← toolbar collapse；儲存按鈕進 menu
├────────────────────────────────────┤
│ DraftBanner（loading / draft）     │
├────────────────────────────────────┤
│ MoodPicker（橫排）                 │
├────────────────────────────────────┤
│ Tabs [編輯●] [預覽]                │
│ ┌────────────────────────────────┐│
│ │ 標題（選填）                    ││
│ │                                ││
│ │ Markdown 編輯區...             ││
│ │                                ││
│ │                                ││
│ └────────────────────────────────┘│
│ 1,234 字                           │
├────────────────────────────────────┤
│ <details> 關聯來源                  │  ← 收起
│   • 條目 (3)                       │
│   • 事件 (2)                       │
│ </details>                          │
├────────────────────────────────────┤
│ [✨ 讓 AI 產生初稿]                │
└────────────────────────────────────┘
```

## 狀態變體

### A. 空白（404 → 新建）
- 編輯器空白，title placeholder「標題（選填）」
- DraftBanner 不顯示
- 主 CTA「✨ 讓 AI 產生初稿」於底部
- testid `journal-editor-ai-draft-cta`

### B. AI 生成中（loading）
- DraftBanner state=loading：「AI 正在閱讀你今天的條目和行事曆事件，產生草稿…」
- Editor 區半透明 + spinner overlay
- 關閉所有編輯動作

### C. Draft 已生成（is_draft=true）
- DraftBanner state=draft：兩個動作按鈕
- Editor 容器 `border-warning/40` 微黃
- 「儲存中…」會在使用者編輯時觸發 PATCH（content 編輯保留 draft 標記）
- 點「使用此草稿」→ PATCH `{ is_draft: false }` → DraftBanner 消失

### D. 已發布（is_draft=false）
- 無 DraftBanner
- toolbar 顯示「✓ 已發布 · 最後修改：剛才」
- 確認發布按鈕隱藏

### E. 衝突（409 JOURNAL_EXISTS）

```
┌──────────────────────────────────────────────────┐
│ ⚠  今日已有日記                                  │
│                                                  │
│    今日（2026-04-24）已存在已發布的日記。        │
│    要重新載入嗎？                                 │
│                                                  │
│              [取消]   [重新載入]                 │
└──────────────────────────────────────────────────┘
```
- testid `journal-editor-conflict-dialog`

### F. 未儲存離開（beforeunload）
- 瀏覽器原生 dialog（無客製 UI），`beforeunload` event 設 returnValue
- 路由切換時用 router guard 顯示 AlertDialog：
```
┌──────────────────────────────────────────────────┐
│  尚未儲存的變更                                   │
│  目前的修改尚未儲存，確定要離開？                 │
│              [取消]   [離開不儲存]                │
└──────────────────────────────────────────────────┘
```
- testid `journal-editor-leave-dialog`

### G. 503 LLM_UNAVAILABLE
- DraftBanner 從 loading → 隱藏
- toast 顯示「LLM 暫時無法使用，請檢查 Provider 設定」
- 編輯器保持空白

## 互動流程

1. **進入** → `GET /api/v1/journal/${date}`
2. 若 200 → 載入內容；若 404 → 顯示空白編輯器
3. **使用者編輯** → 1.5s debounce → `PATCH /journal/${date}`（自動儲存）
4. **點「✨ 讓 AI 產生初稿」** → loading state → `POST /journal/${date}/draft`
5. **點「使用此草稿」** → `PATCH /journal/${date}` { is_draft: false }
6. **點「重新生成」** → 同 #4，狀態改 regenerating
7. **點 SourceRefs entry chip** → router.push(`/entries/${id}`)
8. **離開頁面（unsaved）** → 顯示 leave dialog

## 用到的元件

| 元件 | 路徑 |
|------|------|
| JournalEditor | `design/components/journal/journal-editor.md` |
| JournalMoodPicker | `design/components/journal/journal-mood-picker.md` |
| JournalLlmDraftBanner | `design/components/journal/journal-llm-draft-banner.md` |
| SourceRefsPanel | `design/components/journal/source-refs-panel.md` |
| Button | 既有 |
| AlertDialog | shadcn |

## 鍵盤快捷鍵

| 快捷鍵 | 動作 |
|--------|------|
| `Cmd/Ctrl + S` | 立即儲存 |
| `Cmd/Ctrl + Enter` | 確認發布（draft → published） |
| `Esc`（編輯器內） | blur，不離開頁面 |
| `Tab` 在 textarea 中 | 預設行為（移到下一個 focusable）；不攔截 |

## a11y

- toolbar `<header>` + 含 H1 標題（隱藏文字「{date} 日記編輯」for SR）
- 自動儲存狀態用 `aria-live="polite"`：「儲存中…」「已儲存」播報
- DraftBanner loading `aria-live="polite"` 已內建
- focus trap：無（單頁應用，editor 自由 tab）
- 確認發布按鈕高度 ≥ 44px（觸控）
- 對比：toolbar `text-muted-foreground` ≥ 4.5:1
