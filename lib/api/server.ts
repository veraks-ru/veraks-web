// Серверное чтение публичных данных — для generateMetadata и OG-карточек.
//
// Намеренно отдельно от lib/api/client.ts: тот браузерный (cookie-сессия,
// тихий refresh на 401, localStorage/Web Locks) и на сервере работать не
// должен. Здесь — анонимный запрос без cookies: событие и справочник
// категорий публичны, а метаданные и так одинаковы для всех читателей.
//
// Ошибки честные: «не найдено» и «бэкенд недоступен» — разные исходы.
// Недоступный бэкенд НЕ должен превращаться в 404: страница всё равно
// отрендерит клиента, который покажет свой экран загрузки/ошибки.

import { cache } from "react";
import type { ApiCategory, ApiEvent } from "./dto";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/**
 * Таймаут одного запроса. getPublicEvent делает до двух запросов
 * последовательно (событие, затем категории), поэтому худший случай ожидания
 * — примерно 2×TIMEOUT_MS.
 */
const TIMEOUT_MS = 4000;

type Fetched<T> = { ok: true; data: T } | { ok: false; status: number };

/** status: 0 — сеть, таймаут или нечитаемое тело. */
async function fetchPublic<T>(path: string): Promise<Fetched<T>> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!resp.ok) return { ok: false, status: resp.status };
    return { ok: true, data: (await resp.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

export type PublicEventResult =
  | { kind: "ok"; event: ApiEvent; categoryTitle: string | null }
  | { kind: "notfound" }
  | { kind: "unavailable" };

/**
 * Событие по id из маршрута (в роли slug — id, см. lib/api/map.ts) вместе с
 * названием категории. Результат кэшируется в пределах одного запроса, чтобы
 * generateMetadata и сама страница не ходили на бэкенд дважды.
 */
export const getPublicEvent = cache(
  async (id: string): Promise<PublicEventResult> => {
    const ev = await fetchPublic<ApiEvent>(`/events/${encodeURIComponent(id)}`);
    if (!ev.ok) {
      // 404 — события нет; 422 — не-UUID в пути (то же правило, что в
      // endpoints.getEvent). Остальное — бэкенд недоступен или сломан.
      return ev.status === 404 || ev.status === 422
        ? { kind: "notfound" }
        : { kind: "unavailable" };
    }
    // Предложения на модерации публично не показываем — то же условие, что в
    // клиентском EventPageClient, чтобы сервер и клиент не расходились.
    if (ev.data.status === "proposed") return { kind: "notfound" };

    const cats = await fetchPublic<ApiCategory[]>("/categories");
    const categoryTitle = cats.ok
      ? (cats.data.find((c) => c.id === ev.data.category_id)?.title ?? null)
      : null;
    return { kind: "ok", event: ev.data, categoryTitle };
  },
);
