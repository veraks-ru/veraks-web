import { GRADES } from "./confidence";
import type { CalibrationBucket } from "./types";

/** Фактическая частота наступления ДА в бакете (0..1). */
export const bucketActual = (b: CalibrationBucket): number =>
  b.nResolved > 0 ? b.nYes / b.nResolved : 0;

/** Заявленная вероятность бакета (внутренний маппинг градации). */
export const bucketClaimed = (b: CalibrationBucket): number =>
  GRADES[b.gradeIndex].probability;

/**
 * Expected Calibration Error: средневзвешенный |заявлено − факт|.
 * Меньше — лучше (PRD §4.5).
 */
export function ece(buckets: CalibrationBucket[]): number {
  const n = buckets.reduce((a, b) => a + b.nResolved, 0) || 1;
  const sum = buckets.reduce(
    (a, b) => a + b.nResolved * Math.abs(bucketClaimed(b) - bucketActual(b)),
    0,
  );
  return sum / n;
}

export function calibrationVerdict(e: number): {
  label: string;
  tone: "good" | "ok" | "off";
} {
  if (e < 0.05) return { label: "Отлично калиброван", tone: "good" };
  if (e < 0.1) return { label: "Хорошо калиброван", tone: "good" };
  if (e < 0.18) return { label: "Есть смещение", tone: "ok" };
  return { label: "Слабая калибровка", tone: "off" };
}

/**
 * Над/недо-уверенность в бакете. Переуверенность = прогноз ЭКСТРЕМАЛЬНЕЕ
 * реальности (дальше от 50%, чем оправдалось), а не просто «факт ниже
 * заявленного». Иначе для «нет»-градаций знак инвертируется: сказать «Точно
 * нет» (10%), когда сбывается 22%, — это переуверенность, а не наоборот.
 * Сравниваем удалённость от 0.5: |actual−0.5| < |claimed−0.5| → over.
 * Для «50 на 50» (claimed=0.5) экстремальности нет — выйдет under/spot.
 */
export function bucketBias(b: CalibrationBucket): "over" | "under" | "spot" {
  const claimedExt = Math.abs(bucketClaimed(b) - 0.5);
  const actualExt = Math.abs(bucketActual(b) - 0.5);
  const gap = actualExt - claimedExt;
  if (Math.abs(gap) <= 0.04) return "spot";
  return gap < 0 ? "over" : "under";
}
