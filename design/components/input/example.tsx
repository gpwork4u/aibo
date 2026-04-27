// Input 元件使用範例
// 技術棧：Tailwind CSS v4 + shadcn/ui
// 對應規格：design/components/input/spec.md

import { Search, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

// --- 標準 Input（含 Label） ---
export function StandardInput() {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="name@example.com"
        aria-required="true"
      />
    </div>
  );
}

// --- 必填 Input ---
export function RequiredInput() {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="api-key">
        API Key
        <span
          className="ml-1 text-[color:var(--danger)] text-xs"
          aria-hidden="true"
        >
          *
        </span>
      </Label>
      <Input
        id="api-key"
        type="password"
        required
        aria-required="true"
        placeholder="sk-..."
      />
    </div>
  );
}

// --- 含前置圖示 ---
export function InputWithPrefix() {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="search-lib">搜尋資料庫</Label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--fg-muted)]"
          aria-hidden="true"
        />
        <Input
          id="search-lib"
          type="search"
          placeholder="輸入關鍵字..."
          className="pl-9"
          aria-label="搜尋資料庫"
        />
      </div>
    </div>
  );
}

// --- Error State ---
export function InputWithError() {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="username">使用者名稱</Label>
      <Input
        id="username"
        type="text"
        defaultValue="ab"
        aria-describedby="username-error"
        aria-invalid="true"
        className="border-[color:var(--danger)] bg-[color:var(--danger-subtle)]"
      />
      <p
        id="username-error"
        role="alert"
        className="flex items-center gap-1 text-sm text-[color:var(--danger)]"
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        使用者名稱至少需要 3 個字元
      </p>
    </div>
  );
}

// --- Disabled State ---
export function InputDisabled() {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="readonly-field" className="text-[color:var(--fg-muted)]">
        整合帳號（唯讀）
      </Label>
      <Input
        id="readonly-field"
        type="text"
        defaultValue="gpwork4u@gmail.com"
        disabled
        aria-disabled="true"
      />
    </div>
  );
}

// --- Password Input with Toggle ---
export function PasswordInput() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="password">密碼</Label>
      <div className="relative">
        <Input
          id="password"
          type={visible ? "text" : "password"}
          placeholder="輸入密碼"
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-muted)] hover:text-[color:var(--fg-default)] transition-colors"
          aria-label={visible ? "隱藏密碼" : "顯示密碼"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
