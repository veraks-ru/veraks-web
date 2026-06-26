import { GRADES, gradeColor } from "@/lib/confidence";
import { bucketActual, bucketClaimed, bucketBias } from "@/lib/calibration";
import type { CalibrationBucket } from "@/lib/types";

/**
 * Калибровка человеческой формулировкой (PRD §4.5):
 * «Когда говорит "Скорее да" — сбывается в 78% (31 из 40)».
 */
export function CalibrationRows({ buckets }: { buckets: CalibrationBucket[] }) {
  return (
    <ul className="space-y-4">
      {[...buckets]
        .sort((a, b) => b.gradeIndex - a.gradeIndex)
        .map((b) => {
          const claimed = bucketClaimed(b);
          const actual = bucketActual(b);
          const c = gradeColor(b.gradeIndex);
          const bias = bucketBias(b);
          return (
            <li key={b.gradeIndex}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm leading-snug text-graphite">
                  Когда говорит{" "}
                  <span className="font-700" style={{ color: c }}>
                    «{GRADES[b.gradeIndex].label}»
                  </span>{" "}
                  — сбывается в{" "}
                  <span className="font-700 tnum">{Math.round(actual * 100)}%</span>
                </p>
                <span className="shrink-0 text-xs tnum text-slate">
                  {b.nYes}/{b.nResolved}
                </span>
              </div>

              {/* Заявлено (метка) vs факт (заливка) на одной шкале 0..100% */}
              <div className="relative mt-2 h-2.5 rounded-full bg-paper">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${actual * 100}%`, background: c, opacity: 0.85 }}
                />
                <span
                  className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-graphite"
                  style={{ left: `calc(${claimed * 100}% - 1px)` }}
                  title={`Заявлено ${Math.round(claimed * 100)}%`}
                />
              </div>

              <p className="mt-1.5 text-xs text-slate">
                {bias === "spot"
                  ? "точно в цель"
                  : bias === "over"
                    ? "склонность к переуверенности"
                    : "склонность к недоуверенности"}
              </p>
            </li>
          );
        })}
      <li className="flex items-center gap-4 border-t border-line pt-3 text-xs text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-graphite" /> заявлено
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-slate/60" /> сбылось
        </span>
      </li>
    </ul>
  );
}
