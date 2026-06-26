import { GRADES, gradeColor, indexOfGrade } from "@/lib/confidence";
import { crowdReadingLabel, crowdShares } from "@/lib/crowd";
import type { ConfidenceGrade, CrowdDistribution } from "@/lib/types";

/**
 * Компактное распределение мнений толпы по 5 градациям. Показывается только
 * после того, как пользователь сделал прогноз (анти-якорение, PRD §4.2),
 * и на разрешённых событиях. mine — подсветить столбец пользователя.
 */
export function MiniConsensus({
  crowd,
  mine,
  labelled = false,
}: {
  crowd: CrowdDistribution;
  mine?: ConfidenceGrade | null;
  labelled?: boolean;
}) {
  const shares = crowdShares(crowd);
  const max = Math.max(...shares, 0.0001);
  const mineIdx = mine ? indexOfGrade(mine) : -1;

  return (
    <div>
      <div className="flex items-end gap-1.5" aria-hidden="true">
        {GRADES.map((g, i) => {
          const h = 6 + (shares[i] / max) * 32;
          const isMine = i === mineIdx;
          return (
            <div key={g.grade} className="flex flex-1 flex-col items-center gap-1">
              <span
                className="w-full rounded-t-[3px] transition-[height]"
                style={{
                  height: `${h}px`,
                  background: gradeColor(i),
                  opacity: isMine ? 1 : 0.45,
                  outline: isMine ? "2px solid var(--color-signal)" : "none",
                  outlineOffset: "1px",
                }}
              />
            </div>
          );
        })}
      </div>

      {labelled && (
        <div className="mt-1.5 flex justify-between text-[0.62rem] font-500 text-slate">
          <span>Точно нет</span>
          <span>Точно да</span>
        </div>
      )}

      <p className="mt-2 text-xs text-slate">
        Толпа склоняется:{" "}
        <span className="font-700 text-graphite">{crowdReadingLabel(crowd)}</span>
      </p>
    </div>
  );
}
