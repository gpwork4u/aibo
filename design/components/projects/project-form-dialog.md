# ProjectFormDialog

新增 / 編輯 Project 的 Dialog，與 DeleteProjectConfirmDialog 一同使用。

---

## 用途

- `mode="create"`：列表頁右上「新增專案」按鈕觸發
- `mode="edit"`：卡片動作選單「編輯」/ 詳情頁 header「編輯」按鈕觸發
- 提交成功後 parent 處理 navigate（建立後跳到 `/projects/:id` Board tab）

---

## 結構

```
┌─────────────────────────────────────────────┐
│ 新增專案 / 編輯專案                    [✕]  │
├─────────────────────────────────────────────┤
│ 名稱 *                                       │
│ [aibo v2                              ]      │
│ × 名稱已存在                                  │  ← 409 錯誤態
│                                             │
│ 描述                                         │
│ ┌─────────────────────────────────────────┐ │
│ │ 知識庫 + LLM 代理人格                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 顏色                                         │
│ [●][●][●][●][●][●][●][●][●][●][●][●]      │  ← 12 色 swatch + 自訂 hex
│                                             │
│ 起始日       結束日                          │
│ [2026-04-01] [2026-06-30]                   │
│ × 結束日不可早於起始日                        │
│                                             │
│ 狀態（編輯模式才顯示）                         │
│ [進行中 ▾]                                   │
├─────────────────────────────────────────────┤
│                       [ 取消 ]  [ 儲存 ]     │
└─────────────────────────────────────────────┘
```

---

## Props

```ts
interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: {
    id?: string;
    name?: string;
    description?: string | null;
    color?: string;
    start_date?: string | null;
    end_date?: string | null;
    status?: ProjectStatus;
  };
  onSubmit: (input: ProjectFormInput) => Promise<{ ok: true } | { ok: false; code: string; message: string }>;
}
```

`onSubmit` 由 parent 串 API；error code 對應：
- `PROJECT_NAME_DUPLICATE` → 顯示在 name 欄位下方
- `INVALID_INPUT` → 依 detail 顯示在對應欄位
- 其他 → 上方 banner

---

## Tailwind / 範例（核心結構）

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PROJECTS_TESTIDS } from "@/lib/testids/projects";
import projectsTokens from "@/../design/tokens/projects.json";

const PALETTE = projectsTokens["project-color-palette"];

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    data-testid={PROJECTS_TESTIDS.dialog}
    className="sm:max-w-md"
  >
    <DialogHeader>
      <DialogTitle data-testid={PROJECTS_TESTIDS.dialogTitle}>
        {mode === "create" ? "新增專案" : "編輯專案"}
      </DialogTitle>
    </DialogHeader>

    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* 名稱 */}
      <div className="space-y-1.5">
        <Label htmlFor="project-name">
          名稱 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="project-name"
          data-testid={PROJECTS_TESTIDS.dialogNameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "project-name-error" : undefined}
          className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
        />
        {nameError && (
          <p
            id="project-name-error"
            data-testid={PROJECTS_TESTIDS.dialogNameError}
            className="text-xs text-destructive"
          >
            {nameError}
          </p>
        )}
      </div>

      {/* 描述 */}
      <div className="space-y-1.5">
        <Label htmlFor="project-description">描述</Label>
        <Textarea
          id="project-description"
          data-testid={PROJECTS_TESTIDS.dialogDescriptionInput}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={5000}
        />
      </div>

      {/* 顏色 */}
      <div className="space-y-1.5">
        <Label>顏色</Label>
        <div
          data-testid={PROJECTS_TESTIDS.dialogColorPicker}
          role="radiogroup"
          aria-label="專案顏色"
          className="flex flex-wrap gap-2"
        >
          {Object.entries(PALETTE).map(([key, hex]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={color === hex}
              aria-label={`顏色 ${key}`}
              data-testid={`${PROJECTS_TESTIDS.dialogColorSwatch}-${key}`}
              onClick={() => setColor(hex)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform",
                "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                color === hex ? "border-foreground scale-110" : "border-transparent",
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* 日期 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="project-start">起始日</Label>
          <DatePicker
            id="project-start"
            data-testid={PROJECTS_TESTIDS.dialogStartDate}
            value={startDate}
            onChange={setStartDate}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-end">結束日</Label>
          <DatePicker
            id="project-end"
            data-testid={PROJECTS_TESTIDS.dialogEndDate}
            value={endDate}
            onChange={setEndDate}
          />
        </div>
      </div>
      {dateError && (
        <p
          data-testid={PROJECTS_TESTIDS.dialogDateError}
          className="text-xs text-destructive"
        >
          {dateError}
        </p>
      )}

      {/* 狀態（edit 才顯示） */}
      {mode === "edit" && (
        <div className="space-y-1.5">
          <Label htmlFor="project-status">狀態</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              id="project-status"
              data-testid={PROJECTS_TESTIDS.dialogStatusSelect}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">進行中</SelectItem>
              <SelectItem value="paused">暫停</SelectItem>
              <SelectItem value="done">已完成</SelectItem>
              <SelectItem value="archived">封存</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </form>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        data-testid={PROJECTS_TESTIDS.dialogCancel}
      >
        取消
      </Button>
      <Button
        type="submit"
        onClick={handleSubmit}
        disabled={isSubmitting || !name.trim()}
        data-testid={PROJECTS_TESTIDS.dialogSubmit}
      >
        {isSubmitting ? "儲存中…" : mode === "create" ? "建立" : "儲存"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Behavior

| 互動 | 行為 |
|------|------|
| 開啟 | autofocus 至 name input |
| Esc / 點背景 | 關閉（如有 dirty 變更則彈出未儲存確認） |
| Submit 成功 | parent navigate / refetch list；toast「已建立 / 已更新」 |
| Submit 409 NAME_DUPLICATE | name 欄位錯誤態，focus 回 name input |
| Submit 422 INVALID_STATUS_TRANSITION | 上方 banner 顯示訊息 |
| 名稱為空 | submit 按鈕 disabled |
| 結束日 < 起始日 | 即時錯誤訊息（不送 API） |

---

## States

| 狀態 | 視覺 |
|------|------|
| Default | shadcn Dialog 標準樣式 |
| 表單錯誤 | 對應欄位邊框 `border-destructive`，下方紅字訊息 |
| Submitting | submit 按鈕 disabled + 「儲存中…」 |
| Color 已選 | swatch 加 `border-foreground scale-110` |

---

## a11y

- Dialog 內建 focus trap、Esc 關閉、`role="dialog" aria-modal="true"`（shadcn 內建）
- 所有 Input / Select / Date 都有 visible `<Label htmlFor>`
- 錯誤訊息透過 `aria-describedby` + `aria-invalid` 連結
- color picker 使用 `role="radiogroup"` + 子項 `role="radio"`，每顆有 `aria-label="顏色 blue"` 等繁中標籤
- 對比 ≥ 4.5:1（destructive、muted-foreground 既有 token）
- 觸控目標：swatch 雖 28px，但 padding 撐到 ≥ 44px hit area；submit / cancel 預設 ≥ 40px

---

## DeleteProjectConfirmDialog（同檔附錄）

二次確認刪除，依 task 數變化文案。

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent data-testid={PROJECTS_TESTIDS.deleteDialog}>
    <AlertDialogHeader>
      <AlertDialogTitle>刪除專案「{project.name}」？</AlertDialogTitle>
      <AlertDialogDescription>
        {taskCount > 0 ? (
          <>
            此專案下有
            <span data-testid={PROJECTS_TESTIDS.deleteDialogTaskCount} className="font-semibold">
              {" "}{taskCount}{" "}
            </span>
            筆任務，將會一併刪除且無法復原。
          </>
        ) : (
          <>此操作無法復原。</>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel data-testid={PROJECTS_TESTIDS.deleteDialogCancel}>
        取消
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={onConfirmDelete}
        data-testid={PROJECTS_TESTIDS.deleteDialogConfirm}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        確認刪除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 流程

1. 卡片或詳情頁 ⋯ menu 點「刪除」
2. 先嘗試 `DELETE /api/v1/projects/:id`
3. 若回 409 PROJECT_HAS_TASKS → 開 AlertDialog，文案帶 task count
4. 確認 → `DELETE /api/v1/projects/:id?force=true`
5. 成功 → toast「已刪除」+ navigate 回列表
