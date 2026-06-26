import { gradeColor } from "@/lib/confidence";
import { bucketActual, bucketClaimed } from "@/lib/calibration";
import type { CalibrationBucket } from "@/lib/types";

/**
 * Диаграмма надёжности: заявленная вероятность (ось X) против фактической
 * частоты ДА (ось Y). Пунктирная диагональ — идеальная калибровка. Точка
 * выше диагонали — событие случалось чаще, чем вы говорили (недоуверенность),
 * ниже — реже (переуверенность). Размер точки = объём прогнозов.
 */

const X0 = 42;
const X1 = 244;
const Y_TOP = 16;
const Y_BOT = 228;

const px = (p: number) => X0 + p * (X1 - X0);
const py = (a: number) => Y_BOT - a * (Y_BOT - Y_TOP);

export function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const maxN = Math.max(...buckets.map((b) => b.nResolved), 1);

  return (
    <svg
      viewBox="0 0 260 256"
      className="w-full"
      role="img"
      aria-label="Диаграмма калибровки: заявленная вероятность против фактической частоты"
    >
      {/* сетка */}
      {[0, 0.5, 1].map((g) => (
        <g key={g}>
          <line x1={px(g)} y1={Y_TOP} x2={px(g)} y2={Y_BOT} stroke="var(--color-line)" strokeWidth="1" />
          <line x1={X0} y1={py(g)} x2={X1} y2={py(g)} stroke="var(--color-line)" strokeWidth="1" />
        </g>
      ))}

      {/* идеальная калибровка */}
      <line
        x1={px(0)}
        y1={py(0)}
        x2={px(1)}
        y2={py(1)}
        stroke="var(--color-slate)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.5"
      />

      {/* зазоры до диагонали + точки */}
      {buckets.map((b) => {
        const claimed = bucketClaimed(b);
        const actual = bucketActual(b);
        const x = px(claimed);
        const r = 4 + (b.nResolved / maxN) * 7;
        const c = gradeColor(b.gradeIndex);
        return (
          <g key={b.gradeIndex}>
            <line x1={x} y1={py(claimed)} x2={x} y2={py(actual)} stroke={c} strokeWidth="1.5" opacity="0.4" />
            <circle cx={x} cy={py(actual)} r={r} fill={c} fillOpacity="0.9" stroke="white" strokeWidth="1.5">
              <title>
                Заявлено {Math.round(claimed * 100)}% — сбылось {Math.round(actual * 100)}% ({b.nResolved})
              </title>
            </circle>
          </g>
        );
      })}

      {/* подписи осей */}
      <text x={X0 - 6} y={py(1) + 3} textAnchor="end" className="fill-[color:var(--color-slate)] text-[9px] tnum">100%</text>
      <text x={X0 - 6} y={py(0) + 3} textAnchor="end" className="fill-[color:var(--color-slate)] text-[9px] tnum">0%</text>
      <text x={px(0)} y={Y_BOT + 18} textAnchor="start" className="fill-[color:var(--color-slate)] text-[9px]">реже</text>
      <text x={px(1)} y={Y_BOT + 18} textAnchor="end" className="fill-[color:var(--color-slate)] text-[9px]">чаще</text>
      <text x={(X0 + X1) / 2} y={252} textAnchor="middle" className="fill-[color:var(--color-graphite)] text-[10px] font-600">
        что вы заявляли  →  как сбывалось
      </text>
    </svg>
  );
}
