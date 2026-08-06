"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/app/TopNav";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/AsyncStates";
import { useAuth } from "@/components/app/AuthProvider";
import { listSeasons, getDivisionStandings } from "@/lib/api/endpoints";
import type { ApiDivisionStandings, ApiSeason } from "@/lib/api/dto";
import { StandingsTable } from "@/components/leagues/StandingsTable";

const LEVELS = [1, 2, 3];

export default function DivisionsPage() {
  const { me } = useAuth();
  const [season, setSeason] = useState<ApiSeason | null | undefined>(undefined);
  const [seasonErr, setSeasonErr] = useState(false);
  const [level, setLevel] = useState(1);
  // undefined — загрузка, null — пусто/404, стандинги — данные.
  const [standings, setStandings] = useState<ApiDivisionStandings | null | undefined>(undefined);
  const [stErr, setStErr] = useState(false);

  const loadSeason = () => {
    setSeasonErr(false);
    setSeason(undefined);
    listSeasons()
      .then((s) => {
        const items = s?.items ?? [];
        setSeason(items.find((x) => x.status === "active") ?? items[0] ?? null);
      })
      .catch(() => setSeasonErr(true));
  };

  useEffect(() => {
    loadSeason();
  }, []);

  const loadStandings = () => {
    if (!season) return;
    setStandings(undefined);
    setStErr(false);
    getDivisionStandings(season.id, level)
      .then((d) => setStandings(d ?? null))
      .catch(() => setStErr(true));
  };

  useEffect(() => {
    loadStandings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        {seasonErr ? (
          <ErrorState onRetry={loadSeason} />
        ) : season === undefined ? (
          <LoadingState />
        ) : season === null ? (
          <EmptyState title="Активного сезона пока нет" className="mt-8 py-10" />
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
                <ErrorState
                  title="Не удалось загрузить дивизион"
                  onRetry={loadStandings}
                  className="py-4"
                  bare
                />
              ) : standings === undefined ? (
                <LoadingState className="py-4" />
              ) : standings === null ? (
                <EmptyState title="В этом дивизионе пока нет участников" className="py-4" bare />
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
