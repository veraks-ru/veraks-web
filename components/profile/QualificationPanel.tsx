"use client";

import { useEffect, useState } from "react";
import { listSeasons, getSeasonQualification } from "@/lib/api/endpoints";
import type { ApiQualification } from "@/lib/api/dto";

export function QualificationPanel({ userId }: { userId: string }) {
  const [q, setQ] = useState<ApiQualification | null | undefined>(undefined);
  const [seasonTitle, setSeasonTitle] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await listSeasons();
      const season =
        (s?.items ?? []).find((x) => x.status === "active") ?? (s?.items ?? [])[0];
      if (!season) {
        if (alive) setQ(null);
        return;
      }
      setSeasonTitle(season.title);
      const data = await getSeasonQualification(userId, season.slug);
      if (alive) setQ(data ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (q === undefined) return null; // загрузка — тихо
  if (q === null) return null; // нет сезона/данных — не показываем

  const rows: [string, boolean, string][] = [
    ["Объём прогнозов", q.volume_ok, `${q.n_resolved} / ${q.n_min}`],
    ["Разнообразие категорий", q.diversity_ok, `${q.category_count} / ${q.c_min}`],
    ["Охват сложности", q.coverage_ok, `${q.total_weight.toFixed(1)} / ${q.w_min.toFixed(1)}`],
  ];

  return (
    <section className="mt-6">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-600">Квалификация к призам</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-700 ${
              q.qualified
                ? "bg-[color:var(--color-signal)]/15 text-[color:var(--color-signal-deep)]"
                : "bg-paper text-slate"
            }`}
          >
            {q.qualified ? "Квалифицирован" : "Пока нет"}
          </span>
        </div>
        <p className="mt-0.5 mb-4 text-sm text-slate">Сезон «{seasonTitle}»</p>
        <ul className="space-y-2">
          {rows.map(([label, ok, val]) => (
            <li key={label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={ok ? "text-[color:var(--color-signal-deep)]" : "text-slate"}>
                  {ok ? "✓" : "○"}
                </span>
                {label}
              </span>
              <span className="tnum text-slate">{val}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
