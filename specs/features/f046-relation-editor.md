# F-046: Relation Editor

## Status: active
## Sprint: 15
## Priority: P1
## GitHub Issues: 待開

## 使用者故事
As a user, I want an inline relation editor within the entry detail view, so that I can easily create, edit, and delete semantic links between entries without leaving the current context.

## 設計決策
- Relation Editor 嵌入在 Entry 詳情頁（Sheet 或 full-page edit）的獨立 section
- 使用 Combobox（F-038）搜尋目標 entry
- Link type 以 Select 選擇（F-038 Select primitive）
- Relation 文字為 optional inline input
- 視覺：以 chip/badge 方式顯示已建立的 links，hovering 出現 edit/delete 操作

## UI 架構

```
EntryDetailPage / EntrySheet
└── RelationsSection
    ├── RelationList（已建立的 links，分 outgoing / incoming）
    │   └── RelationChip
    │       ├── link_type badge（顏色區分）
    │       ├── target entry title（點選跳轉）
    │       ├── relation text（灰色，optional）
    │       ├── confidence badge（若 < 1.0）
    │       └── [hover] Edit / Delete buttons
    └── AddRelationForm
        ├── EntrySearch Combobox（autocomplete，搜尋 title）
        ├── LinkType Select（derives_from / contradicts / ...）
        ├── Relation Input（optional，max 200 chars）
        └── Add Button
```

## API Contract（使用 F-044 endpoints）

- 建立：`POST /api/v1/entries/:id/links`
- 查詢：`GET /api/v1/entries/:id/links`
- 更新：`PATCH /api/v1/entries/links/:link_id`
- 刪除：`DELETE /api/v1/entries/links/:link_id`

### Entry 搜尋（Combobox 用）
使用現有 `GET /api/v1/entries?q=keyword&status=library&per_page=10`
前端 debounce 300ms

## Link Type 視覺對應

| Link Type | Badge 顏色 | 中文說明 |
|-----------|-----------|---------|
| derives_from | blue | 衍生自 |
| contradicts | red | 矛盾於 |
| duplicate_of | orange | 重複於 |
| references | gray | 參考 |
| supersedes | purple | 取代 |
| related_to | green | 關聯 |

## Business Rules
1. 同一 entry 的 Relation Editor 載入時，一次取得所有 incoming + outgoing links
2. 新增 link 時，若 to_id entry 就是當前 entry，前端阻止提交（self-link）
3. 編輯 link：只允許修改 `link_type`、`relation`；`from_id`、`to_id` 不可改
4. 刪除前顯示確認對話框（僅 manual source 的 links）；LLM links 刪除不需確認
5. confidence < 0.7 的 LLM links 以虛線 chip 顯示（視覺區分，非隱藏）
6. incoming links（由其他 entry 建立的指向此 entry 的 links）為唯讀，不可從此處刪除

## Scenarios

### Happy Path

#### Scenario: 新增 derives_from 連結
GIVEN 使用者在 entry A 的 Relation Editor
WHEN 在 EntrySearch 輸入 "machine" → 選擇 "Machine Learning Basics"（entry B）
AND 選擇 link_type = "derives_from"
AND 輸入 relation = "延伸討論 ML 的決策樹"
AND 點擊 Add
THEN POST /api/v1/entries/A/links 成功
AND 新 chip 出現在 RelationList 的 outgoing 區塊

#### Scenario: 搜尋 entry 時 autocomplete
GIVEN AddRelationForm 已開啟
WHEN 使用者在 EntrySearch 輸入 "go lang"（debounce 300ms 後）
THEN GET /api/v1/entries?q=go+lang&per_page=10
AND Combobox 顯示最多 10 筆匹配 entries

#### Scenario: 刪除 manual link
GIVEN entry A 有一條 manual link → entry B
WHEN 使用者 hover RelationChip，點擊 Delete
THEN 顯示確認對話框 "Remove link to [B title]?"
AND 確認後 DELETE /api/v1/entries/links/:id
AND chip 從列表移除

#### Scenario: 編輯 link_type
GIVEN entry A → B（link_type: related_to）
WHEN 使用者 hover chip → 點擊 Edit → 改選 derives_from
THEN PATCH /api/v1/entries/links/:id with { link_type: "derives_from" }
AND chip 更新顯示新 link_type badge

### Error Handling

#### Scenario: 搜尋無結果
GIVEN EntrySearch 輸入罕見字串
WHEN GET /api/v1/entries?q=... 回傳 0 筆
THEN Combobox 顯示 "No entries found"

#### Scenario: 網路錯誤時 rollback
GIVEN 使用者點擊 Add（樂觀更新：chip 立即顯示）
WHEN POST /api/v1/entries/:id/links 回傳 500
THEN chip 消失（rollback）
AND toast "Failed to add link"

### Edge Cases

#### Scenario: incoming link 顯示為唯讀
GIVEN entry C → A（references）是 incoming link for A
WHEN 使用者在 A 的 RelationEditor 查看 incoming 區塊
THEN chip 顯示 from_entry C 的 title
AND 無 Edit / Delete 按鈕（唯讀）
