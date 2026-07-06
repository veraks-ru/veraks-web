"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/app/TopNav";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/components/app/AuthProvider";
import { listSeasons, getDivisionStandings } from "@/lib/api/endpoints";
import type { ApiDivisionStandings, ApiSeason } from "@/lib/api/dto";
import { StandingsTable } from "@/components/leagues/StandingsTable";

const LEVELS = [1, 2, 3];

export default function DivisionsPage() {
  const { me } = useAuth();
  const [season, setSeason] = useState<ApiSeason | null | undefined>(undefined);
  const [level, setLevel] = useState(1);
  // undefined — загрузка, null — пусто/404, стандинги — данные.
  const [standings, setStandings] = useState<ApiDivisionStandings | null | undefined>(undefined);
  const [stErr, setStErr] = useState(false);

  useEffect(() => {
    listSeasons()
      .then((s) => {
        const items = s?.items ?? [];
        setSeason(items.find((x) => x.status === "active") ?? items[0] ?? null);
      })
      .catch(() => setSeason(null));
  }, []);

  useEffect(() => {
    if (!season) return;
    setStandings(undefined);
    setStErr(false);
    getDivisionStandings(season.id, level)
      .then((d) => setStandings(d ?? null))
      .catch(() => setStErr(true));
  }, [season, level]);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/divisions" />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Дивизионы</h1>
        <p className="mt-1 text-sm text-slate">
          Лестница мастерства сезона{season ? ` «${season.title}»` : ""}. Лучшие
          поднимаются, слабейшие опускаются между сезонами.
        </p>

        {season === undefined ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
          </div>
        ) : season === null ? (
          <p className="mt-8 text-sm text-slate">Активного сезона пока нет.</p>
        ) : (
          <>
            <div className="mt-6 flex gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`rounded-full px-4 py-1.5 text-sm font-600 transition ${
                    level === l
                      ? "bg-graphite text-white"
                      : "border border-line text-slate hover:text-graphite"
                  }`}
                >
                  {l === 1 ? "Высший" : l === 2 ? "Первый" : "Второй"}
                </button>
              ))}
            </div>

            <section className="mt-5 rounded-[var(--radius-card)] border border-line bg-surface p-5">
              {stErr ? (
                <p className="py-4 text-sm text-slate">Не удалось загрузить дивизион.</p>
              ) : standings === undefined ? (
                <p className="py-4 text-sm text-slate">Загрузка…</p>
              ) : standings === null ? (
                <p className="py-4 text-sm text-slate">В этом дивизионе пока нет участников.</p>
              ) : (
                <>
                  <p className="mb-3 text-sm font-600">{standings.title}</p>
                  <StandingsTable rows={standings.rows} highlightUserId={me?.id} />
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
