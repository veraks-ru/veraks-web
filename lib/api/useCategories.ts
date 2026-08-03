"use client";

// Название категории по slug — из живого справочника API (listCategories),
// а не из мока. Общий модульный кэш: первый компонент, которому понадобился
// справочник, запускает запрос, остальные переиспользуют результат.

import { useEffect, useState } from "react";
import { listCategories } from "./endpoints";
import type { ApiCategory } from "./dto";

let cache: ApiCategory[] | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (cache || inflight) return;
  inflight = listCategories()
    .then((cats) => {
      cache = cats ?? [];
    })
    .catch(() => {
      cache = [];
    })
    .finally(() => {
      inflight = null;
      listeners.forEach((notify) => notify());
    });
}

/** Карта slug → title из справочника категорий. Пока не загружен — пустая. */
export function useCategoryMap(): Map<string, string> {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (cache) return;
    const notify = () => setTick((n) => n + 1);
    listeners.add(notify);
    ensureLoaded();
    return () => {
      listeners.delete(notify);
    };
  }, []);

  return new Map((cache ?? []).map((c) => [c.slug, c.title]));
}

/** Название категории по slug с фолбэком на сам slug, пока справочник грузится. */
export function useCategoryTitle(slug: string): string {
  const map = useCategoryMap();
  return map.get(slug) ?? slug;
}
