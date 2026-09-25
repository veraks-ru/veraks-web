"use client";

// Тон оболочки приложения: светлая среда («прибор») или тёмная («сумеречная»).
// Нижняя панель не знает, тёмный ли экран под ней — это зависит не только от
// маршрута (открытое событие тёмное, разрешённое светлое), поэтому экран сам
// объявляет свой тон через этот крошечный стор, а панель на него подписана.

import { useEffect, useSyncExternalStore } from "react";

export type ChromeTone = "light" | "dark";

let tone: ChromeTone = "light";
const listeners = new Set<() => void>();

function setTone(next: ChromeTone): void {
  if (tone === next) return;
  tone = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Текущий тон — для панели навигации и прочей оболочки. */
export function useChromeTone(): ChromeTone {
  return useSyncExternalStore(subscribe, () => tone, () => "light");
}

/** Экран тёмной среды объявляет себя на время своей жизни. */
export function useDarkChrome(): void {
  useEffect(() => {
    setTone("dark");
    return () => setTone("light");
  }, []);
}
