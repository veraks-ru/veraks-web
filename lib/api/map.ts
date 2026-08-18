// Преобразование DTO бэкенда во вью-модели фронтенда (минимум изменений
// в компонентах). В роли «slug» маршрута /events/[slug] — короткий публичный
// код события: именно он попадает в ссылки, которыми делятся. UUID тоже
// принимается бэкендом, так что раньше разосланные ссылки не ломаются.

import { GRADES, type ConfidenceGrade } from "@/lib/confidence";
import type { CategoryStat, EventStatus, PredictionEvent, ScopeRatingStat } from "@/lib/types";
import type {
  ApiEvent,
  ApiEventStatus,
  ApiPrediction,
  ApiPredictionSummary,
  ApiProfileCategoryRating,
  ApiProfileScopeRating,
} from "./dto";

/**
 * Статус бэкенда → статус вью-модели.
 *
 * `cancelled` (отмена до исхода) и `annulled` (аннулирование после исхода)
 * различаются: у первого прогнозы вообще не оценивались, у второго событие
 * вычеркнуто из рейтингов уже после фиксации исхода.
 */
export function mapStatus(s: ApiEventStatus): EventStatus {
  // draft/proposed публично не показываются; на всякий случай → closed.
  if (s === "draft" || s === "proposed") return "closed";
  return s;
}

/** Распределение из summary → counts[5] в порядке градаций. */
export function distributionToCounts(
  summary: ApiPredictionSummary | null,
): [number, number, number, number, number] {
  const c: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  if (!summary) return c;
  GRADES.forEach((g, i) => {
    c[i] = summary.distribution[g.grade] ?? 0;
  });
  return c;
}

export function toPredictionEvent(
  ev: ApiEvent,
  catSlugById: Map<string, string>,
  extra: {
    summary?: ApiPredictionSummary | null;
    myGrade?: ConfidenceGrade | null;
    forecasters?: number;
  } = {},
): PredictionEvent {
  const counts = distributionToCounts(extra.summary ?? null);
  const forecasters =
    extra.forecasters ?? extra.summary?.total_count ?? counts.reduce((a, b) => a + b, 0);
  return {
    id: ev.id,
    slug: ev.public_code,
    title: ev.title,
    categorySlug: catSlugById.get(ev.category_id) ?? "",
    status: mapStatus(ev.status),
    opensAt: ev.opens_at,
    closesAt: ev.closes_at,
    resolvesAt: ev.resolves_at,
    resolutionSource: ev.resolution_source,
    resolutionCriteria: ev.resolution_criteria,
    forecasters,
    crowd: { counts },
    myGrade: extra.myGrade ?? null,
    outcome: ev.outcome ?? undefined,
    resolvedAt: ev.resolved_at ?? undefined,
    disputeWindowEndsAt: ev.dispute_window_ends_at ?? undefined,
  };
}

/** Карта event_id → выбранная градация (из «моих прогнозов»). */
export function myGradeMap(preds: ApiPrediction[] | null): Map<string, ConfidenceGrade> {
  const m = new Map<string, ConfidenceGrade>();
  for (const p of preds ?? []) m.set(p.event_id, p.confidence_grade);
  return m;
}

/** Готовый агрегат области сводки профиля (global/сезон) → вью-модель. */
export function toScopeRatingStat(r: ApiProfileScopeRating): ScopeRatingStat {
  return {
    rank: r.rank,
    skillScore: Number(r.skill_score),
    meanBrier: Number(r.mean_brier),
    nResolved: r.n_resolved,
  };
}

/** Срез сводки профиля по категории → вью-модель («По категориям» на странице). */
export function toCategoryStat(item: ApiProfileCategoryRating): CategoryStat {
  return {
    categorySlug: item.slug,
    categoryTitle: item.title,
    rank: item.rank,
    meanBrier: Number(item.mean_brier),
    nResolved: item.n_resolved,
  };
}
