# RefsPicker

Task Sheet 內「關聯項目」選擇器。支援 Entry / Journal / Gcal Event 三種來源切換、搜尋、選取，已選項目以 chip 形式列在下方；當來源已被刪除時以「來源已刪除」標記態呈現。

對齊 spec：F-032c（Task Sheet refs picker）、F-031（task_refs schema：ref_type ∈ entry|journal|gcal_event, ref_id）。

---

## 用途

- 在 TaskSheet 中觸發「+ 新增關聯」時開啟 Popover / 內嵌 panel
- 使用者可以：
  1. 切換 tab（Entry / Journal / Gcal）
  2. 輸入關鍵字 → debounce 300ms 呼叫對應搜尋 API
  3. 從結果列表點選 → 加入「已選 chips」
  4. 點 chip 上的 ✕ 移除
  5. 點 chip 主體跳轉到原始來源（在新分頁）
- 提交時將整個 `refs[]` 隨 PATCH /api/v1/tasks/:id 一併送出

---

## 結構

```
┌──────────────── RefsPicker ────────────────────┐
│ [📄 Entry] [📔 Journal] [📅 Gcal]              │  ← Tabs（3 個 ref_type）
│ ┌────────────────────────────────────────────┐ │
│ │ 🔍 搜尋 entry…                              │ │  ← Search input（debounce 300ms）
│ └────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────┐ │
│ │ 📄 今天學會的 pytest fixture 技巧            │ │
│ │   2026-04-23 · #engineering                 │ │  ← 結果列表（最多顯示 8 筆）
│ │ 📄 讀: Atomic Habits 心得                    │ │
│ │ 📄 設計 schema 想法                          │ │
│ └────────────────────────────────────────────┘ │
│ ─────────────────────────────────────────────── │
│ 已選（3）                                        │
│ ┌─ chip ─┐ ┌─ chip ─┐ ┌─ chip（缺漏） ────────┐ │
│ │📄 entry│ │📔 04-23│ │📅 (來源已刪除) ✕      │ │
│ │ ✕      │ │ ✕      │ │                       │ │
│ └────────┘ └────────┘ └───────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Props

```ts
type RefType = "entry" | "journal" | "gcal_event";

interface RefItem {
  ref_type: RefType;
  ref_id: string;
  /** 顯示用（API 取得後快取於 ref；若 missing 表示來源已刪除） */
  display?: {
    title: string | null;
    subtitle?: string | null;   // e.g. 日期、tag
    href?: string;              // 點 chip 主體可跳轉
  } | null;
}

interface RefsPickerProps {
  value: RefItem[];                              // 已選 refs（受控）
  onChange: (next: RefItem[]) => void;
  /** 由 parent 注入，封裝對應 search API 呼叫 */
  search: (type: RefType, q: string) => Promise<RefSearchResult[]>;
  /** 是否可新增；達上限後 input + 列表 disabled（spec 上限 50） */
  max?: number;
  disabled?: boolean;
}

interface RefSearchResult {
  ref_type: RefType;
  ref_id: string;
  title: string | null;
  subtitle?: string | null;
  href?: string;
}
```

> 註：`value` 中若某筆 `display === null`（後端回傳 `ref_resolved=false`）則 chip 顯示「來源已刪除」標記態，整個 chip 變灰並僅可移除，不可點開。

---

## Tailwind / 範例（核心結構）

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTextIcon, BookTextIcon, CalendarIcon, SearchIcon, XIcon, AlertTriangleIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTS_TESTIDS } from "@/lib/testids/projects";

const TYPE_META: Record<RefType, { label: string; icon: any }> = {
  entry:       { label: "Entry",   icon: FileTextIcon },
  journal:     { label: "Journal", icon: BookTextIcon },
  gcal_event:  { label: "Gcal",    icon: CalendarIcon },
};

<div
  data-testid={PROJECTS_TESTIDS.refsPicker}
  className="rounded-md border bg-card p-3 space-y-3"
  aria-label="關聯項目選擇器"
>
  <Tabs value={activeType} onValueChange={(v) => setActiveType(v as RefType)}>
    <TabsList
      data-testid={PROJECTS_TESTIDS.refsPickerTabs}
      className="grid w-full grid-cols-3"
    >
      {(Object.keys(TYPE_META) as RefType[]).map((t) => {
        const Icon = TYPE_META[t].icon;
        return (
          <TabsTrigger
            key={t}
            value={t}
            data-testid={`${PROJECTS_TESTIDS.refsPickerTab}-${t}`}
            className="gap-1.5"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {TYPE_META[t].label}
          </TabsTrigger>
        );
      })}
    </TabsList>

    {(Object.keys(TYPE_META) as RefType[]).map((t) => (
      <TabsContent key={t} value={t} className="mt-3 space-y-2">
        {/* Search input */}
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            data-testid={PROJECTS_TESTIDS.refsPickerSearch}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`搜尋 ${TYPE_META[t].label}…`}
            aria-label={`搜尋 ${TYPE_META[t].label}`}
            className="pl-8"
            disabled={disabled || atMax}
          />
        </div>

        {/* Result list */}
        <ul
          data-testid={PROJECTS_TESTIDS.refsPickerResults}
          role="listbox"
          aria-label={`${TYPE_META[t].label} 搜尋結果`}
          className="max-h-64 space-y-1 overflow-auto rounded-md border bg-background p-1"
        >
          {isSearching ? (
            <>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </>
          ) : results.length === 0 ? (
            <li
              data-testid={PROJECTS_TESTIDS.refsPickerEmpty}
              className="py-6 text-center text-xs text-muted-foreground"
            >
              {query ? "沒有符合的結果" : `輸入關鍵字搜尋 ${TYPE_META[t].label}`}
            </li>
          ) : (
            results.map((r) => {
              const selected = isSelected(r);
              return (
                <li key={r.ref_id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={selected || atMax}
                    onClick={() => addRef(r)}
                    data-testid={`${PROJECTS_TESTIDS.refsPickerResultItem}-${r.ref_id}`}
                    className={cn(
                      "flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm",
                      "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    {(() => { const Icon = TYPE_META[t].icon; return <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />; })()}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{r.title || <span className="italic text-muted-foreground">（無標題）</span>}</span>
                      {r.subtitle && (
                        <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                      )}
                    </span>
                    {selected && (
                      <Badge variant="secondary" className="ml-2 shrink-0 text-[10px]">已選</Badge>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </TabsContent>
    ))}
  </Tabs>

  {/* Selected chips */}
  <div data-testid={PROJECTS_TESTIDS.refsPickerSelected} className="space-y-1.5">
    <p className="text-xs font-medium text-muted-foreground">
      已選（{value.length}{max ? ` / ${max}` : ""}）
    </p>
    {value.length === 0 ? (
      <p
        data-testid={PROJECTS_TESTIDS.refsPickerSelectedEmpty}
        className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground"
      >
        尚未選取任何關聯
      </p>
    ) : (
      <ul className="flex flex-wrap gap-1.5">
        {value.map((ref) => {
          const Icon = TYPE_META[ref.ref_type].icon;
          const missing = ref.display === null;
          return (
            <li
              key={`${ref.ref_type}-${ref.ref_id}`}
              data-testid={`${PROJECTS_TESTIDS.refsPickerChip}-${ref.ref_id}`}
              data-missing={missing ? "true" : "false"}
              className={cn(
                "group inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
                missing
                  ? "border-dashed border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-border bg-muted/40",
              )}
            >
              <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
              {missing ? (
                <span
                  data-testid={PROJECTS_TESTIDS.refsPickerChipMissing}
                  className="inline-flex items-center gap-1"
                >
                  <AlertTriangleIcon className="h-3 w-3" aria-hidden="true" />
                  來源已刪除
                </span>
              ) : ref.display?.href ? (
                <a
                  href={ref.display.href}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-[12rem] truncate underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  {ref.display.title || "（無標題）"}
                  <ExternalLinkIcon className="ml-0.5 inline h-2.5 w-2.5" aria-hidden="true" />
                </a>
              ) : (
                <span className="max-w-[12rem] truncate">
                  {ref.display?.title || "（無標題）"}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeRef(ref)}
                aria-label={`移除關聯：${ref.display?.title || ref.ref_id}`}
                data-testid={`${PROJECTS_TESTIDS.refsPickerChipRemove}-${ref.ref_id}`}
                className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
</div>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 切 tab | 清空 query + 重置結果（保留各 tab 自己的 query 可選；本元件採重置） |
| 輸入 query | debounce 300ms → `search(type, q)` → 更新結果列表 |
| 點結果項 | 加入 value（呼叫 onChange），同時 result 顯示「已選」 badge 並 disable |
| 點 chip 主體 | 若 `display.href` → `target="_blank"` 開新分頁；missing 不可點 |
| 點 chip ✕ | 從 value 移除（onChange） |
| 達 max（預設 50） | search input + 結果列表 disabled，顯示提示 |
| 重複加入 | 已選的 result 會 disabled 顯示「已選」badge |

---

## States

| 狀態 | 視覺 |
|------|------|
| Idle（未搜尋） | 結果列表顯示「輸入關鍵字搜尋 {type}」 |
| Searching | 3 row Skeleton |
| Empty result | 「沒有符合的結果」 |
| Item 已選 | 該 row `disabled` + 右側 `Badge variant=secondary 已選` |
| Chip 正常 | `border-border bg-muted/40`，標題為 `<a target=_blank>` |
| Chip 來源已刪除 | `border-dashed border-destructive/40 bg-destructive/5 text-destructive`，附 `AlertTriangleIcon` + 「來源已刪除」文字，`data-missing="true"` |
| At max | input 與結果列表 disabled，顯示提示 |
| Disabled（parent 禁用） | 整個元件 `aria-disabled="true"`，無互動 |

---

## data-testid

| 元素 | testid |
|------|--------|
| Picker root | `PROJECTS_TESTIDS.refsPicker` |
| Tabs list | `PROJECTS_TESTIDS.refsPickerTabs` |
| Tab trigger | `projects-refs-picker-tab-{type}` |
| Search input | `PROJECTS_TESTIDS.refsPickerSearch` |
| Result list | `PROJECTS_TESTIDS.refsPickerResults` |
| Result item | `projects-refs-picker-result-{refId}` |
| Empty state | `PROJECTS_TESTIDS.refsPickerEmpty` |
| Selected wrap | `PROJECTS_TESTIDS.refsPickerSelected` |
| Selected empty | `PROJECTS_TESTIDS.refsPickerSelectedEmpty` |
| Chip | `projects-refs-picker-chip-{refId}` |
| Chip remove btn | `projects-refs-picker-chip-remove-{refId}` |
| Missing label | `PROJECTS_TESTIDS.refsPickerChipMissing` |

需新增至 `design/components/projects/testids.md` 的 PROJECTS_TESTIDS（refs-picker 區塊）：

```ts
// Refs picker（TaskSheet 內）
refsPicker: "projects-refs-picker",
refsPickerTabs: "projects-refs-picker-tabs",
refsPickerTab: "projects-refs-picker-tab",                  // suffix -{type}
refsPickerSearch: "projects-refs-picker-search",
refsPickerResults: "projects-refs-picker-results",
refsPickerResultItem: "projects-refs-picker-result",        // suffix -{refId}
refsPickerEmpty: "projects-refs-picker-empty",
refsPickerSelected: "projects-refs-picker-selected",
refsPickerSelectedEmpty: "projects-refs-picker-selected-empty",
refsPickerChip: "projects-refs-picker-chip",                // suffix -{refId}
refsPickerChipRemove: "projects-refs-picker-chip-remove",   // suffix -{refId}
refsPickerChipMissing: "projects-refs-picker-chip-missing",
```

---

## API 串接

| Tab | 搜尋 endpoint |
|-----|--------------|
| entry | `GET /api/v1/entries?q={q}&limit=8` |
| journal | `GET /api/v1/journal?q={q}&limit=8` |
| gcal_event | `GET /api/v1/gcal/events?q={q}&limit=8` |

PATCH 提交時：

```json
PATCH /api/v1/tasks/:id
{ "refs": [
  { "ref_type": "entry", "ref_id": "uuid-1" },
  { "ref_type": "journal", "ref_id": "uuid-2" }
] }
```

「來源已刪除」由後端 `ref_resolved=false` 標記（F-031 task_refs JOIN 失敗時 display=null）。

---

## 響應式

| 斷點 | 行為 |
|------|------|
| `>= 640px` | Tabs 3 欄水平；結果 max-h 16rem |
| `< 640px` | Tabs 仍 3 欄但縮小字體；chip 區可換行 |

---

## a11y

- Tabs：shadcn 內建 `role="tablist"` / `role="tab"` / `aria-selected`，左右鍵切換
- Search input：`aria-label`，與下方 listbox 透過 `aria-controls` 可選擇性連結
- Result list：`role="listbox"`，每筆 `role="option" aria-selected`
- 已選 chip：`<li>` 內含跳轉 `<a>` 與移除 `<button>`，皆可 Tab；移除按鈕 `aria-label` 包含 ref 標題
- 「來源已刪除」狀態：`AlertTriangleIcon` + 文字雙重表達，不單靠顏色
- 觸控目標：tab trigger / chip remove 至少 32px hit area；search input 預設 40px；result item 至少 36px（行高 + padding）
- 對比：destructive token 已通過 4.5:1（既有設計系統驗證）
- Reduced motion：`hover:bg-muted` 為瞬時，無 transition
