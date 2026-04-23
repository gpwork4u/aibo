"use client";

import { useCallback, useEffect, useState } from "react";
import { API_KEY_STORAGE, UNAUTHORIZED_EVENT } from "@/lib/api/client";

/** React hook for reading / writing the aibo API key in localStorage. */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setApiKeyState(window.localStorage.getItem(API_KEY_STORAGE));
    } catch {
      setApiKeyState(null);
    }
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === API_KEY_STORAGE) setApiKeyState(e.newValue);
    };
    const onUnauthorized = () => setApiKeyState(null);
    window.addEventListener("storage", onStorage);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized as EventListener);
    };
  }, []);

  const setApiKey = useCallback((key: string | null) => {
    try {
      if (key) window.localStorage.setItem(API_KEY_STORAGE, key);
      else window.localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      /* ignore */
    }
    setApiKeyState(key);
  }, []);

  return { apiKey, setApiKey, hydrated };
}
