import { GRADES, gradeColor } from "@/lib/confidence";
import { VIEW_W, VIEW_H, CX, CY, R, pointAt } from "@/lib/arc";

/**
 * Сигнатура продукта: «дуга уверенности» — прибор, а не слайдер казино.
 * 5 делений = 5 градаций. Спектр убеждения окрашен cool (нет) → warm (да),
 * показание (стрелка) светится сигнальным цветом.
 *
 * Презентационный компонент. Интерактивный ввод (экран прогноза) строится
 * на этой же геометрии (см. ConfidenceDial).
 */

export function OracleArc({
  activeIndex = null,
  className,
  animated = false,
}: {
  activeIndex?: number | null;
  className?: string;
  animated?: boolean;
}) {
  const ticks = GRADES.map((_, i) => i / (GRADES.length - 1));
  const active = activeIndex == null ? null : pointAt(activeIndex / (GRADES.length - 1));

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      role="img"
      aria-label="Шкала уверенности: от «Точно нет» до «Точно да»"
    >
      <defs>
        <linearGradient id="arc-spectrum" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-cool)" />
          <stop offset="50%" stopColor="var(--color-haze)" />
          <stop offset="100%" stopColor="var(--color-warm)" />
        </linearGradient>
        <radialGradient id="arc-glow">
          <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* трек-спектр */}
      <path
        d={`M ${pointAt(0).x} ${pointAt(0).y} A ${R} ${R} 0 0 1 ${pointAt(1).x} ${pointAt(1).y}`}
        fill="none"
        stroke="url(#arc-spectrum)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* деления */}
      {ticks.map((t, i) => {
        const outer = pointAt(t, R + 9);
        const inner = pointAt(t, R - 9);
        const on = i === activeIndex;
        return (
          <line
            key={i}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={on ? "var(--color-signal)" : gradeColor(i)}
            strokeWidth={on ? 3 : 2}
            strokeLinecap="round"
            opacity={on ? 1 : 0.5}
          />
        );
      })}

      {/* показание */}
      {active && (
        <g className={animated ? "animate-pulse-soft" : undefined}>
          <circle cx={active.x} cy={active.y} r="22" fill="url(#arc-glow)" />
          <line
            x1={CX}
            y1={CY}
            x2={active.x}
            y2={active.y}
            stroke="var(--color-signal)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={active.x} cy={active.y} r="6.5" fill="var(--color-signal)" />
          <circle cx={CX} cy={CY} r="4" fill="var(--color-signal)" />
        </g>
      )}
      {!active && <circle cx={CX} cy={CY} r="4" fill="var(--color-haze)" opacity="0.6" />}
    </svg>
  );
}
