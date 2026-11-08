"use client";

import { useCallback, useSyncExternalStore } from "react";

const LOCAL_STORAGE_EVENT = "local-storage-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_STORAGE_EVENT, callback);
  };
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Membaca & menulis satu nilai string di localStorage tanpa setState di dalam effect.
 * Saat SSR (dan render pertama saat hydration) selalu mengembalikan null,
 * sehingga tidak terjadi hydration mismatch.
 */
export function useLocalStorageValue(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => readKey(key),
    () => null
  );

  const setValue = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        // Abaikan jika localStorage tidak tersedia (mode privat, dsb.)
      }
      window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
    },
    [key]
  );

  return [value, setValue] as const;
}
