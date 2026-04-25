# TaskSheet

任務詳情編輯抽屜（右側 Sheet），使用 shadcn `<Sheet side="right">`。

---

## 用途

- mode=create：從 KanbanColumn「+」或 List 頁「新增任務」觸發，建立新 task
- mode=edit：從 KanbanCard、TaskListRow 點擊觸發，編輯既有 task
- 內含完整表單：title、description、status、priority、due_date、refs

---

## 結構

```
                                        ┌─────────────────────────────────┐
                                        │ 任務詳情                    [✕]  │
                                        ├─────────────────────────────────┤
                                        │ 標題 *                            │
                                        │ [設計 schema                  ]   │
                                        │                                 │
                                        │ 描述                             │
                                        │ ┌─────────────────────────────┐ │
                                        │ │ Markdown 描述...             │ │
                                        │ └─────────────────────────────┘ │
                                        │                                 │
                                        │ 狀態         優先級              │
                                        │ [進行中ˇ]   [急迫ˇ]              │
                                        │                                 │
                                        │ 截止日                           │
                                        │ [📅 2026-04-30      ✕清除]      │
                                        │                                 │
                                        │ 關聯項目                         │
                                        │ ┌─────────────────────────────┐ │
                                        │ │ 📄 entry：每週設計回顧 ✕     │ │
                                        │ │ 📔 journal：2026-04-23  ✕    │ │
                                        │ │ 📅 gcal：與小明會議 ✕        │ │
                                        │ └─────────────────────────────┘ │
                                        │ [ + 新增關聯 ]                   │
                                        │                                 │
                                        │ 儲存中…                          │  ← saving indicator
                                        ├─────────────────────────────────┤
                                        │ [刪除]            [完成 / 取消]   │
                                        └─────────────────────────────────┘
```

寬度 desktop 480px、tablet 100% 但保留 `max-w-md`、mobile 100%。

---

## Props

```ts
interface TaskSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  projectId: string;
  initial?: Partial<TaskFull>;          // edit 時帶入
  defaultStatus?: TaskStatus;            // create 時可指定欄位
  onSaved: (task: TaskFull) => void;    // 成功 PATCH/POST 後回傳給 parent
  onDeleted?: (taskId: string) => void;
}
```

每次欄位變動以 debounce 800ms 自動 `PATCH /api/v1/tasks/:id`（edit 模式）。create 模式則需點「建立」按鈕送出。

---

## Tailwind / 範例（核心結構）

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Trash2Icon, CheckIcon, PaperclipIcon, XIcon, FileTextIcon, BookOpenIcon, CalendarIcon } from "lucide-react";
import { TASK_TESTIDS } from "@/lib/testids/task";
import { RefsPicker } from "./refs-picker";

const STATUS_OPTIONS = [
  { value: "todo",        label: "待辦" },
  { value: "in_progress", label: "進行中" },
  { value: "blocked",     label: "卡住" },
  { value: "done",        label: "完成" },
  { value: "cancelled",   label: "已取消" },
];
const PRIORITY_OPTIONS = [
  { value: "low",    label: "低" },
  { value: "normal", label: "一般" },
  { value: "high",   label: "高" },
  { value: "urgent", label: "急迫" },
];

const REF_ICON = {
  entry:       FileTextIcon,
  journal:     BookOpenIcon,
  gcal_event:  CalendarIcon,
};
const REF_LABEL = {
  entry: "條目",
  journal: "日記",
  gcal_event: "行事曆",
};

<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent
    side="right"
    data-testid={TASK_TESTIDS.sheet}
    className="flex w-full flex-col gap-0 sm:max-w-md"
  >
    <SheetHeader className="border-b px-5 py-3">
      <SheetTitle data-testid={TASK_TESTIDS.sheetTitle}>
        {mode === "create" ? "新增任務" : "任務詳情"}
      </SheetTitle>
    </SheetHeader>

    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title">
          標題 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="task-title"
          data-testid={TASK_TESTIDS.sheetTitleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          placeholder="輸入任務標題..."
          autoFocus={mode === "create"}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="task-description">描述</Label>
        <Textarea
          id="task-description"
          data-testid={TASK_TESTIDS.sheetDescriptionInput}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="補充細節（支援 Markdown）"
          className="resize-none"
        />
      </div>

      {/* Status + Priority 雙欄 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-status">狀態</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="task-status" data-testid={TASK_TESTIDS.sheetStatusSelect}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}
                  data-testid={`${TASK_TESTIDS.sheetStatusOption}-${o.value}`}
                >
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-priority">優先級</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="task-priority" data-testid={TASK_TESTIDS.sheetPrioritySelect}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}
                  data-testid={`${TASK_TESTIDS.sheetPriorityOption}-${o.value}`}
                >
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Due date */}
      <div className="space-y-1.5">
        <Label htmlFor="task-due">截止日</Label>
        <div className="flex items-center gap-2">
          <DatePicker
            id="task-due"
            data-testid={TASK_TESTIDS.sheetDuePicker}
            value={dueDate}
            onChange={setDueDate}
            className="flex-1"
          />
          {dueDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDueDate(null)}
              data-testid={TASK_TESTIDS.sheetDueClear}
              aria-label="清除截止日"
            >
              <XIcon className="h-4 w-4" aria-hidden="true" />
              <span className="ml-1">清除</span>
            </Button>
          )}
        </div>
      </div>

      {/* Refs */}
      <section
        data-testid={TASK_TESTIDS.sheetRefsSection}
        aria-label="關聯項目"
        className="space-y-2"
      >
        <Label>關聯項目（{refs.length}）</Label>
        {refs.length === 0 ? (
          <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
            尚未關聯任何項目
          </p>
        ) : (
          <ul className="space-y-1.5">
            {refs.map((r) => {
              const Icon = REF_ICON[r.ref_type];
              return (
                <li
                  key={`${r.ref_type}-${r.ref_id}`}
                  data-testid={`${TASK_TESTIDS.sheetRefItem}-${r.ref_type}-${r.ref_id}`}
                  className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">{REF_LABEL[r.ref_type]}</span>
                  <span className="flex-1 truncate">{r.label}</span>
                  {r.deleted && (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                      已刪除
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeRef(r)}
                    data-testid={`${TASK_TESTIDS.sheetRefRemove}-${r.ref_type}-${r.ref_id}`}
                    aria-label={`移除關聯：${REF_LABEL[r.ref_type]} ${r.label}`}
                  >
                    <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefsPickerOpen(true)}
          data-testid={TASK_TESTIDS.sheetRefsAddButton}
        >
          <PaperclipIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          新增關聯
        </Button>
      </section>

      {/* Saving indicator */}
      {isSaving && (
        <p
          data-testid={TASK_TESTIDS.sheetSavingIndicator}
          className="text-xs text-success"
          role="status"
          aria-live="polite"
        >
          儲存中…
        </p>
      )}
      {errorBanner && (
        <p
          data-testid={TASK_TESTIDS.sheetErrorBanner}
          className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {errorBanner}
        </p>
      )}
    </div>

    <SheetFooter className="flex flex-row items-center justify-between border-t px-5 py-3">
      {mode === "edit" ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
          data-testid={TASK_TESTIDS.sheetDeleteButton}
        >
          <Trash2Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          刪除
        </Button>
      ) : <span />}

      {mode === "edit" ? (
        <Button
          onClick={handleComplete}
          disabled={status === "done"}
          data-testid={TASK_TESTIDS.sheetCompleteButton}
        >
          <CheckIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {status === "done" ? "已完成" : "標記完成"}
        </Button>
      ) : (
        <Button onClick={handleCreate} disabled={!title.trim()}>
          建立任務
        </Button>
      )}
    </SheetFooter>

    {/* Refs Picker（巢狀 Dialog 也可以；建議放 Sheet 內以共享 focus context） */}
    <RefsPicker
      open={refsPickerOpen}
      onOpenChange={setRefsPickerOpen}
      currentRefs={refs}
      onConfirm={(next) => { setRefs(next); setRefsPickerOpen(false); }}
    />
  </SheetContent>
</Sheet>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 開啟 | autofocus 至 title input；edit 模式不 autofocus（避免不小心改名） |
| 欄位變動（edit） | debounce 800ms 觸發 PATCH；視覺顯示「儲存中…」 |
| Esc / 點背景 | 關閉（dirty + 未儲存時顯示 Unsaved confirm dialog） |
| 點「標記完成」 | POST `/tasks/:id/complete`；status 切到 done，footer 顯示「已完成」disabled |
| 點「刪除」 | AlertDialog 二次確認，DELETE 後 onDeleted + close sheet |
| 跨 status 改 done | 顯示 toast「已完成」，並若在 Kanban，移到 done 欄 |
| API 錯誤 | error banner 顯示繁中訊息，可點「重試」 |

---

## States

| 狀態 | 視覺 |
|------|------|
| Default | 標準 Sheet |
| Saving | 「儲存中…」`text-success` 出現於底部欄位區 |
| Error | error banner（destructive 色） |
| Refs 已刪除 | ref item 末尾紅色「已刪除」徽章；點擊不導航 |
| status=cancelled | title 加刪除線 |
| status=done | 「標記完成」按鈕變「已完成」disabled |

---

## a11y

- Sheet 內建 focus trap、Esc 關閉、`aria-modal`
- 所有 Input / Select / Date 都有 visible `<Label htmlFor>`
- saving indicator `role="status" aria-live="polite"`
- error banner `role="alert"`
- 巢狀的 RefsPicker 為另一個 Dialog/Popover，自身有 focus trap，關閉後焦點回到「新增關聯」按鈕
- 觸控目標：所有按鈕 ≥ 40px height（shadcn 預設）
- 對比通過 4.5:1
