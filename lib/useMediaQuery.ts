"use client";

import { useSyncExternalStore } from "react";

/**
 * Совпадает ли медиазапрос. На сервере и до гидрации — false: экран выбирает
 * мобильную раскладку по умолчанию и переключается на широкую сразу после
 * монтирования.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
