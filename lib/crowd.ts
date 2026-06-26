import { GRADES, gradeByIndex } from "./confidence";
import type { CrowdDistribution } from "./types";

export const crowdTotal = (c: CrowdDistribution): number =>
  c.counts.reduce((a, b) => a + b, 0);

/** Доли по каждой градации (0..1), индексы 0..4. */
export function crowdShares(c: CrowdDistribution): number[] {
  const total = crowdTotal(c) || 1;
  return c.counts.map((n) => n / total);
}

/**
 * «Показание толпы»: средняя внутренняя вероятность, приведённая к ближайшей
 * градации. Используется как агрегированный сигнал — слово, не процент.
 */
export function crowdReadingIndex(c: CrowdDistribution): number {
  const total = crowdTotal(c) || 1;
  const meanP =
    c.counts.reduce((acc, n, i) => acc + n * GRADES[i].probability, 0) / total;
  // ближайшая градация по вероятности
  let best = 0;
  let bestDist = Infinity;
  GRADES.forEach((g, i) => {
    const d = Math.abs(g.probability - meanP);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export const crowdReadingLabel = (c: CrowdDistribution): string =>
  gradeByIndex(crowdReadingIndex(c)).label;
