// Преобразование DTO бэкенда во вью-модели фронтенда (минимум изменений
// в компонентах). Маршруты используют id события в роли «slug».

import { GRADES, type ConfidenceGrade } from "@/lib/confidence";
import type { EventStatus, PredictionEvent } from "@/lib/types";
import type {
  ApiEvent,
  ApiEventStatus,
  ApiPrediction,
  ApiPredictionSummary,
} from "./dto";

export function mapStatus(s: ApiEventStatus): EventStatus {
  if (s === "cancelled") return "annulled";
  if (s === "draft") return "closed";
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
    slug: ev.id, // маршрут /events/[slug] принимает id
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
  };
}

/** Карта event_id → выбранная градация (из «моих прогнозов»). */
export function myGradeMap(preds: ApiPrediction[] | null): Map<string, ConfidenceGrade> {
  const m = new Map<string, ConfidenceGrade>();
  for (const p of preds ?? []) m.set(p.event_id, p.confidence_grade);
  return m;
}
