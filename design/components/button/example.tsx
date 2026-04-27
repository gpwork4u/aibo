// Button 元件使用範例
// 技術棧：Tailwind CSS v4 + shadcn/ui + Lucide icons
// 對應規格：design/components/button/spec.md

import { Loader2, Plus, Trash2, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Variants ---
export function ButtonVariants() {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* 主要 CTA */}
      <Button variant="default">建立筆記</Button>

      {/* 次要操作 */}
      <Button variant="secondary">取消</Button>

      {/* 低優先級 */}
      <Button variant="ghost">更多選項</Button>

      {/* 破壞性操作 */}
      <Button variant="danger">刪除</Button>

      {/* 文字連結 */}
      <Button variant="link">了解更多</Button>
    </div>
  );
}

// --- Sizes ---
export function ButtonSizes() {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Button size="sm">小型按鈕</Button>
      <Button size="md">中型按鈕</Button>
      <Button size="lg">大型按鈕</Button>
    </div>
  );
}

// --- With Icons ---
export function ButtonWithIcons() {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* 前置圖示 */}
      <Button icon={<Plus className="w-4 h-4" />}>新增項目</Button>

      {/* 後置圖示 */}
      <Button iconRight={<ArrowRight className="w-4 h-4" />} variant="link">
        查看更多
      </Button>

      {/* 僅圖示（需 aria-label） */}
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label="搜尋"
        icon={<Search className="w-4 h-4" />}
      />

      {/* 危險操作 + 圖示 */}
      <Button variant="danger" icon={<Trash2 className="w-4 h-4" />}>
        刪除文件
      </Button>
    </div>
  );
}

// --- States ---
export function ButtonStates() {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* 正常 */}
      <Button>正常</Button>

      {/* 載入中 */}
      <Button loading aria-busy="true">
        <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
        儲存中...
      </Button>

      {/* 禁用 */}
      <Button disabled aria-disabled="true">
        不可用
      </Button>
    </div>
  );
}

// --- Full Width（表單送出）---
export function ButtonFullWidth() {
  return (
    <div className="w-80">
      <Button fullWidth size="lg">
        登入
      </Button>
    </div>
  );
}

// --- 破壞性操作流程（必須有確認步驟）---
export function DangerWithConfirmation() {
  // 破壞性操作不直接執行，需先跳出確認 Dialog（見 dialog/spec.md）
  return (
    <Button
      variant="danger"
      icon={<Trash2 className="w-4 h-4" />}
      onClick={() => {
        // 觸發確認 Dialog，不直接刪除
        openConfirmDialog({
          title: "確認刪除",
          description: "此操作無法復原。確定要刪除嗎？",
          confirmLabel: "刪除",
          confirmVariant: "danger",
          onConfirm: () => handleDelete(),
        });
      }}
    >
      刪除條目
    </Button>
  );
}
