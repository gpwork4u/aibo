# Relation Editor（RelationChip + RelationsSection + AddRelationForm）

## 對應 Feature
#221 F-046: Relation Editor

## 技術基礎
- shadcn/ui primitives：Badge、Sheet、Select、Button、Input
- Combobox：沿用既有 Combobox primitive（Entry 搜尋用）
- Tailwind CSS v4 + Lucide icons

---

## 元件一覽

### 1. RelationChip

#### 用途
顯示單一連結關係的 chip。區分 outgoing（可編輯）與 incoming（唯讀）兩種模式。

#### Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| link_type | LinkType | — | 連結類型，對應色彩規格 |
| targetTitle | string | — | 目標條目標題（可點擊） |
| targetId | string | — | 目標條目 ID |
| relation | string \| undefined | — | 關係說明文字（灰色小字） |
| confidence | number | 1.0 | 信心值，< 1.0 顯示 badge |
| isLlmGenerated | boolean | false | LLM 生成標記 |
| direction | 'out' \| 'in' | 'out' | outgoing 或 incoming |
| onEdit | () => void \| undefined | — | 編輯回呼（outgoing only） |
| onDelete | () => void \| undefined | — | 刪除回呼（outgoing only） |
| onTitleClick | (id: string) => void | — | 標題點擊回呼 |

#### 外觀規格

| 條件 | 樣式 |
|------|------|
| 預設 | 白底 pill，border border-border，radius-full，padding spacing-1 spacing-2 |
| LLM + confidence < 0.7 | 虛線外框（`border-dashed`）|
| incoming | 前置「from」灰色小字標籤 |
| hover（outgoing only） | 顯示 Edit + Delete icon buttons |

#### Chip 內容排列（左→右）

**outgoing chip：**
```
[link_type badge] [target title] [relation text?] [confidence?] | [Edit icon] [Delete icon]
```

**incoming chip：**
```
[from 標籤] [link_type badge] [source title] [relation text?] [confidence?]
```

#### link_type badge 規格
- 圓角 pill，對應色彩背景，白色文字
- font-size xs（0.75rem）
- padding：spacing-1 spacing-1.5

#### target title 規格
- font-size sm（0.875rem）
- 可點擊：`cursor-pointer underline-offset-2 hover:underline`
- 最大寬度 200px，overflow ellipsis

#### relation text 規格
- font-size xs（0.75rem）
- 顏色：foreground-subtle
- 以「·」分隔顯示

#### confidence badge 規格
- 顯示條件：confidence < 1.0
- 外觀：foreground-subtle 顏色，neutral-100 背景，font-size xs
- 格式：`{confidence*100}%`

#### Edit / Delete icon buttons 規格
- 圖示：`Pencil`（Edit）、`Trash2`（Delete）— Lucide
- 尺寸：20×20px，padding 補足至 44×44pt 觸控區
- hover 狀態：Edit 用 primary-50 背景，Delete 用 red-50 背景
- aria-label：「編輯連結」、「刪除連結」
- 顯示時機：chip hover 時（`group-hover:flex`，預設 `hidden`）

#### Accessibility
- `role="listitem"`
- 可點擊 title：`role="link"`，`aria-label="前往：{targetTitle}"`
- Delete 按鈕：`aria-label="刪除連結至 {targetTitle}"`

---

### 2. RelationsSection

#### 用途
Outgoing / Incoming 分區標題 + RelationChip 列表容器。

#### Props

| Prop | Type | 說明 |
|------|------|------|
| title | string | 區段標題（「連出」/ 「連入」）|
| links | RelationLink[] | 連結資料陣列 |
| direction | 'out' \| 'in' | 控制 RelationChip 模式 |
| onEdit | (id: string) => void | 編輯回呼（direction=out）|
| onDelete | (id: string) => void | 刪除回呼（direction=out）|
| onTitleClick | (id: string) => void | 標題點擊跳轉 |

#### 外觀規格

- 區段標題：font-size xs、font-weight semibold、foreground-muted、uppercase、tracking-wide
- 標題右側：chip 數量 badge（neutral-100 背景，foreground-subtle 文字）
- chip 列表：`flex flex-wrap gap-2 mt-2`
- 空白狀態（無連結）：「尚無連結」文字，foreground-subtle，font-size sm

---

### 3. AddRelationForm

#### 用途
新增連結的表單（顯示於 outgoing 區塊下方，可展開/收合）。

#### Props

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| onSubmit | (data: NewRelation) => Promise\<void\> | — | 提交回呼 |
| isLoading | boolean | false | 提交中 |

#### NewRelation 型別
```ts
interface NewRelation {
  target_entry_id: string;
  link_type: LinkType;
  relation?: string;
}
```

#### 表單欄位規格

| 欄位 | 元件 | 說明 |
|------|------|------|
| 目標條目 | EntrySearch Combobox | 搜尋現有條目，顯示名稱 + 分類 |
| 連結類型 | Select（shadcn） | 6 種 link_type，各帶顏色 dot |
| 關係說明 | Input（shadcn） | optional，placeholder「關係描述（選填）」|
| 送出 | Button primary | 「新增連結」，loading 時顯示 spinner |

#### EntrySearch Combobox 規格
- 使用既有 Combobox primitive
- 搜尋時呼叫 API：`GET /api/v1/entries?q={query}&limit=10`
- 每個選項：條目 title（font-sm）+ 分類 badge（font-xs）
- 空白狀態：「找不到符合的條目」（foreground-subtle，font-sm）
- 選中後：顯示條目 title + 分類，X 清除按鈕

#### Link Type Select 規格
- 每個選項帶顏色 dot（`link_type` 對應色彩）
- placeholder：「選擇連結類型」

#### 表單驗證
- 目標條目：必填（顯示錯誤：「請選擇目標條目」）
- 連結類型：必填（顯示錯誤：「請選擇連結類型」）
- 錯誤訊息顯示於欄位正下方，error-500 顏色，font-size xs

#### 送出行為
1. 驗證通過 → Button 進入 loading 狀態（spinner + 文字「新增中...」）
2. 成功 → Toast「連結已新增」（成功色）+ 表單重置
3. 失敗 → Toast「新增失敗，請重試」（錯誤色）+ Button 恢復

#### 展開/收合控制
- 預設：收合，顯示「+ 新增連結」按鈕（ghost variant，PlusCircle icon）
- 展開後：顯示表單，按鈕改為「取消」
- 動畫：150ms ease-out（`transition-all`）

## States 總覽

| 元件 | 支援狀態 |
|------|---------|
| RelationChip | default / hover（outgoing）/ dashed（LLM 低信心）/ incoming（唯讀）|
| RelationsSection | default / empty |
| AddRelationForm | collapsed / expanded / loading / success / error |

## 使用範例
見 `example.tsx`
