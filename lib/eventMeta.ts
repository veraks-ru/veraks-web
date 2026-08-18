// Тексты для серверных метаданных события и OG-карточки.
//
// Процентов здесь нет и не будет: на вводе прогноза их не показывают, и
// карточка не должна учить читателя другому языку (DESIGN.md). Сводку толпы
// словом добавить можно — она публична, — но пока карточка держит только
// формулировку, категорию, статус и даты.

import type { ApiEvent } from "@/lib/api/dto";
import { fmtDate } from "@/lib/format";

/** Название продукта в UI и метаданных (ср. components/brand/Wordmark.tsx). */
export const BRAND = "Веракс";

/** Статус события словами — для описания и карточки. */
export function eventStatusLabel(ev: ApiEvent): string {
  switch (ev.status) {
    case "open":
      return "Приём прогнозов открыт";
    case "closed":
    case "resolving":
      return "Приём прогнозов закрыт";
    case "resolved":
      return "Событие разрешено";
    case "disputed":
      return "Исход оспаривается";
    case "cancelled":
      return "Событие отменено";
    case "annulled":
      return "Событие аннулировано";
    default:
      return "Событие";
  }
}

/** Срок: дедлайн приёма для открытых, дата разрешения для остальных. */
export function eventTimingLabel(ev: ApiEvent): string {
  if (ev.status === "open") return `Приём до ${fmtDate(ev.closes_at)}`;
  if (ev.resolved_at) return `Итог от ${fmtDate(ev.resolved_at)}`;
  return `Разрешение ${fmtDate(ev.resolves_at)}`;
}

/** description для <meta>: категория · статус · срок. */
export function eventDescription(
  ev: ApiEvent,
  categoryTitle: string | null,
): string {
  return [categoryTitle, eventStatusLabel(ev), eventTimingLabel(ev)]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/** Обрезка длинной формулировки по границе слова — для OG-карточки. */
export function clampTitle(title: string, max = 120): string {
  const t = title.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s,.;:—-]+$/u, "")}…`;
}
