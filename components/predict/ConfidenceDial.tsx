"use client";

import { useRef } from "react";
import { GRADES, gradeColor } from "@/lib/confidence";
import {
  VIEW_W,
  VIEW_H,
  CX,
  CY,
  R,
  STEPS,
  pointAt,
  pointForIndex,
  indexFromClient,
} from "@/lib/arc";

/**
 * Интерактивная «дуга уверенности». Ввод прогноза словами: пользователь
 * выбирает одно из 5 делений кликом, перетаскиванием или стрелками.
 * Проценты не показываются. Доступность: role="slider" + aria-valuetext словом.
 */
export function ConfidenceDial({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange: (i: number) => void;
  disabled?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const pick = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    onChange(indexFromClient(clientX, clientY, rect));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    pick(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || disabled) return;
    pick(e.clientX, e.clientY);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const cur = value ?? 2; // с середины, если ещё не выбрано
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = cur - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = cur + 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = STEPS - 1;
    if (next !== null) {
      e.preventDefault();
      onChange(Math.max(0, Math.min(STEPS - 1, next)));
    }
  };

  const active = value == null ? null : pointForIndex(value);
  const valueText = value == null ? "не выбрано" : GRADES[value].label;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={`w-full touch-none select-none ${disabled ? "opacity-60" : "cursor-pointer"}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Насколько вы уверены, что это сбудется"
      aria-valuemin={1}
      aria-valuemax={STEPS}
      aria-valuenow={value == null ? undefined : value + 1}
      aria-valuetext={valueText}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <defs>
        <linearGradient id="dial-spectrum" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-cool)" />
          <stop offset="50%" stopColor="var(--color-haze)" />
          <stop offset="100%" stopColor="var(--color-warm)" />
        </linearGradient>
        <radialGradient id="dial-glow">
          <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* широкая прозрачная зона захвата вдоль дуги */}
      <path
        d={`M ${pointAt(0).x} ${pointAt(0).y} A ${R} ${R} 0 0 1 ${pointAt(1).x} ${pointAt(1).y}`}
        fill="none"
        stroke="transparent"
        strokeWidth="56"
      />

      {/* трек-спектр */}
      <path
        d={`M ${pointAt(0).x} ${pointAt(0).y} A ${R} ${R} 0 0 1 ${pointAt(1).x} ${pointAt(1).y}`}
        fill="none"
        stroke="url(#dial-spectrum)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity={value == null ? 0.7 : 0.9}
      />

      {/* деления — крупные точки-цели */}
      {GRADES.map((g, i) => {
        const p = pointForIndex(i);
        const on = i === value;
        return (
          <g key={g.grade}>
            <circle
              cx={p.x}
              cy={p.y}
              r={on ? 9 : 6}
              fill={on ? "var(--color-signal)" : "var(--color-ink-3)"}
              stroke={on ? "var(--color-signal)" : gradeColor(i)}
              strokeWidth="2.5"
            />
          </g>
        );
      })}

      {/* показание */}
      {active && (
        <g>
          <circle cx={active.x} cy={active.y} r="26" fill="url(#dial-glow)" />
          <line
            x1={CX}
            y1={CY}
            x2={active.x}
            y2={active.y}
            stroke="var(--color-signal)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      <circle cx={CX} cy={CY} r="5" fill={active ? "var(--color-signal)" : "var(--color-haze)"} />
    </svg>
  );
}
