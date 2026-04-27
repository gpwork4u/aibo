"use client";

/**
 * CmdkProvider — 提供全域 command palette open/close/toggle API。
 * 掛在 (shell)/layout.tsx 最外層，讓任何子元件或 hook 可存取。
 */

import * as React from "react";

interface CmdkContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CmdkContext = React.createContext<CmdkContextValue | null>(null);

export function CmdkProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = React.useState(false);

  const setOpen = React.useCallback((value: boolean) => {
    setOpenState(value);
  }, []);

  const toggle = React.useCallback(() => {
    setOpenState((prev) => !prev);
  }, []);

  const value = React.useMemo<CmdkContextValue>(
    () => ({ open, setOpen, toggle }),
    [open, setOpen, toggle],
  );

  return <CmdkContext.Provider value={value}>{children}</CmdkContext.Provider>;
}

export function useCmdk(): CmdkContextValue {
  const ctx = React.useContext(CmdkContext);
  if (!ctx) {
    throw new Error("useCmdk must be used within <CmdkProvider>");
  }
  return ctx;
}
