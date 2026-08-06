"use client";

// Доска лучших прогнозов разрешённого события — публичная витрина точности
// (социальное доказательство «не казино», PRD §7): показываем, кто оказался
// точнее, а не кто выиграл. Скрытых (удалённых/заблокированных) пользователей
// бэкенд в выдачу уже не включает.

import { useEffect, useState } from "react";
import Link from "next/link";
import { GRADES, indexOfGrade } from "@/lib/confidence";
import { fmtBrier } from "@/lib/format";
import { getEventTopPredictions } from "@/lib/api/endpoints";
import type { ApiTopPrediction } from "@/lib/api/dto";

export function TopPredictions({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<ApiTopPrediction[] | null>(null);

  useEffect(() => {
    let alive = true;
    getEventTopPredictions(eventId)
      .then((r) => {
        if (alive) setRows(r ?? []);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [eventId]);

  // Пока грузится — ничего не показываем; нет прогнозов/доска недоступна
  // (409 на аннулированном/оспариваемом событии) — блок молча не выводится.
  if (!rows || rows.length === 0) return null;

  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-600">Точнее всех</h2>
      <p className="mt-1 mb-4 text-sm text-slate">
        Прогнозы с наименьшим Brier по этому событию — те, кто оказался ближе всех к исходу.
      </p>
      <ul className="divide-y divide-line">
        {rows.map((row, i) => (
          <li key={row.user_id}>
            <Link
              href={`/u/${row.username}`}
              className="flex items-center gap-3 py-2.5 transition-colors hover:opacity-70"
            >
              <span className="w-5 shrink-0 text-right font-mono text-sm text-slate tnum">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-600">{row.display_name}</span>
                <span className="block truncate text-xs text-slate">
                  «{gradeLabel(row.confidence_grade)}»
                  {row.beat_crowd && " · точнее толпы"}
                </span>
              </span>
              <span className="shrink-0 font-mono text-sm font-700 tnum">
                {fmtBrier(Number(row.brier_score))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function gradeLabel(grade: ApiTopPrediction["confidence_grade"]): string {
  return GRADES[indexOfGrade(grade)]?.label ?? grade;
}
