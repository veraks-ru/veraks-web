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

/**
 * Сбрасывает кэш и перезапрашивает справочник (после создания категории в
 * админке) — иначе подписчики кэша не увидят новую категорию без перезагрузки.
 */
export function invalidateCategoryCache(): void {
  cache = null;
  inflight = null;
  ensureLoaded();
}

/** Общий хук: подписывается на модульный кэш справочника категорий. */
function useCategoriesCache(): ApiCategory[] {
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

  return cache ?? [];
}

/** Полный список категорий (включая ``is_restricted``) из общего кэша. */
export function useCategoryList(): ApiCategory[] {
  return useCategoriesCache();
}

/** Карта slug → title из справочника категорий. Пока не загружен — пустая. */
export function useCategoryMap(): Map<string, string> {
  const cats = useCategoriesCache();
  return new Map(cats.map((c) => [c.slug, c.title]));
}

/** Название категории по slug с фолбэком на сам slug, пока справочник грузится. */
export function useCategoryTitle(slug: string): string {
  const map = useCategoryMap();
  return map.get(slug) ?? slug;
}
