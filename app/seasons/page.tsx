"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { Spinner } from "@/components/ui/Spinner";
import { fmtDate } from "@/lib/format";
import { listSeasons } from "@/lib/api/endpoints";
import type { ApiSeason } from "@/lib/api/dto";

const STATUS_LABEL: Record<ApiSeason["status"], string> = {
  upcoming: "Скоро",
  active: "Идёт",
  finished: "Завершён",
};

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<ApiSeason[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    listSeasons()
      .then((r) => setSeasons(r?.items ?? []))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/seasons" />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Сезоны</h1>
        <p className="mt-1.5 text-sm text-slate">
          Ограниченные по времени лиги с призовым фондом. Зачёт — по пулу событий сезона.
        </p>

        <div className="mt-6">
          {error ? (
            <p className="rounded-xl border border-line bg-surface p-5 text-sm text-slate" role="alert">
              Не удалось загрузить сезоны.
            </p>
          ) : !seasons ? (
            <div className="flex justify-center py-16">
              <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
            </div>
          ) : seasons.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-surface py-12 text-center text-sm text-slate">
              Пока нет сезонов.
            </p>
          ) : (
            <ul className="space-y-3">
              {seasons.map((s) => (
                <li key={s.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-600">{s.title}</p>
                      <p className="mt-0.5 text-sm text-slate">
                        {fmtDate(s.starts_at)} — {fmtDate(s.ends_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[color:var(--color-signal)]/12 px-3 py-1.5 text-xs font-600 text-[color:var(--color-signal-deep)]">
                        {STATUS_LABEL[s.status]}
                      </span>
                      <Link
                        href="/leaderboards"
                        className="text-sm font-700 text-graphite hover:underline"
                      >
                        Лига →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
