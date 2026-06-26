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

/** Над/недо-уверенность в бакете: factual − claimed. */
export function bucketBias(b: CalibrationBucket): "over" | "under" | "spot" {
  const diff = bucketActual(b) - bucketClaimed(b);
  if (Math.abs(diff) <= 0.04) return "spot";
  // склонность к ДА завышена → переуверенность в «да»-полюсе и наоборот.
  return diff < 0 ? "over" : "under";
}
