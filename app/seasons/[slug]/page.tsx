"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { Spinner } from "@/components/ui/Spinner";
import { fmtDate, fmtPercent } from "@/lib/format";
import { getSeasonPrizeFund } from "@/lib/api/admin";
import { getSeason } from "@/lib/api/endpoints";
import type { ApiSeason, ApiSeasonPrizeFund, LeagueConfigInput } from "@/lib/api/dto";

const STATUS_LABEL: Record<ApiSeason["status"], string> = {
  upcoming: "Скоро",
  active: "Идёт",
  finished: "Завершён",
};

const rub = (kop: number) => `${(kop / 100).toLocaleString("ru-RU")} ₽`;

// Человеческие подписи и пояснения для замороженного снапшота правил лиги.
// Порядок и формулировки — см. scoring_system_design.md и
// backend/app/modules/seasons/domain/value_objects.py (LeagueConfig).
const RULES: {
  key: keyof Omit<LeagueConfigInput, "gradation_map">;
  label: string;
  hint: string;
  format: (v: number) => string;
}[] = [
  {
    key: "n_min",
    label: "Объём прогнозов",
    hint: "минимум разрешённых прогнозов за сезон, чтобы попасть в зачёт",
    format: (v) => String(v),
  },
  {
    key: "c_min",
    label: "Разнообразие категорий",
    hint: "минимум разных категорий, в которых сделаны прогнозы",
    format: (v) => String(v),
  },
  {
    key: "w_min",
    label: "Охват сложности",
    hint: "минимальная суммарная сложность (сумма весов) засчитанных прогнозов",
    format: (v) => v.toFixed(1),
  },
  {
    key: "m_per_category",
    label: "Прогнозов в категории для зачёта",
    hint: "сколько нужно прогнозов в одной категории, чтобы она пошла в разнообразие",
    format: (v) => String(v),
  },
  {
    key: "min_predictors",
    label: "Прогнозистов на событие",
    hint: "минимум участников события, чтобы оно вошло в сезонный зачёт",
    format: (v) => String(v),
  },
  {
    key: "k_shrink",
    label: "Сглаживание рейтинга",
    hint: "константа усадки сезонного рейтинга к среднему при малом числе прогнозов",
    format: (v) => v.toFixed(1),
  },
];

type State =
  | { kind: "loading" }
  | { kind: "notfound" }
  | { kind: "error" }
  | { kind: "ready"; season: ApiSeason; fund: ApiSeasonPrizeFund | null };

export default function SeasonPage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    (async () => {
      try {
        const season = await getSeason(slug);
        if (!season) {
          if (alive) setState({ kind: "notfound" });
          return;
        }
        const fund = await getSeasonPrizeFund(slug);
        if (alive) setState({ kind: "ready", season, fund: fund ?? null });
      } catch {
        if (alive) setState({ kind: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
      </div>
    );
  }
  if (state.kind === "notfound") return <NotFound />;
  if (state.kind === "error") return <ErrorView onRetry={() => location.reload()} />;

  const { season, fund } = state;
  const totalBalance = (fund?.funds ?? []).reduce((a, f) => a + f.balance_kopecks, 0);
  const totalCommitted = (fund?.funds ?? []).reduce((a, f) => a + f.committed_kopecks, 0);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/seasons" />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href="/seasons" className="text-sm font-600 text-slate hover:text-graphite">
          ← Сезоны
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-600 sm:text-3xl">{season.title}</h1>
          <span className="rounded-full bg-[color:var(--color-signal)]/12 px-3 py-1.5 text-xs font-600 text-[color:var(--color-signal-deep)]">
            {STATUS_LABEL[season.status]}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-slate">
          {fmtDate(season.starts_at)} — {fmtDate(season.ends_at)}
        </p>

        <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-600">Правила сезона</h2>
          <p className="mt-0.5 mb-5 text-sm text-slate">
            Публичный конкурс (гл. 57 ГК РФ) — параметры зачёта фиксируются заранее и не
            меняются задним числом.
          </p>

          {!season.league_config ? (
            <p className="rounded-xl border border-dashed border-line bg-paper p-4 text-sm text-slate">
              Правила фиксируются при активации сезона.
            </p>
          ) : (
            <div className="space-y-4">
              <ul className="divide-y divide-line">
                {RULES.map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-600">{r.label}</p>
                      <p className="mt-0.5 text-xs text-slate">{r.hint}</p>
                    </div>
                    <span className="num shrink-0 text-lg font-700 text-graphite">
                      {r.format(season.league_config![r.key])}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl bg-paper p-4">
                <p className="text-sm font-600">Сетка градаций уверенности</p>
                <p className="mt-0.5 text-xs text-slate">
                  словесные ответы на вводе прогноза переводятся в эти значения вероятности
                </p>
                <p className="num mt-2 text-sm font-600 text-graphite">
                  {season.league_config.gradation_map.map((p) => fmtPercent(p)).join(" · ")}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-600">Призовой фонд</h2>
            <Link
              href={`/seasons/${season.slug}/fund`}
              className="text-sm font-600 text-[color:var(--color-signal-deep)] hover:underline"
            >
              Подробнее о фонде →
            </Link>
          </div>
          {!fund || fund.funds.length === 0 ? (
            <p className="mt-3 text-sm text-slate">Для этого сезона фонды пока не заведены.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Заявлено спонсорами" value={rub(totalCommitted)} />
              <Stat label="Текущий баланс" value={rub(totalBalance)} accent />
            </div>
          )}
        </section>

        <Link
          href={`/leaderboards?season=${season.slug}`}
          className="mt-6 block rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm font-700 text-graphite hover:bg-[color:var(--color-signal)]/6"
        >
          Лидерборд сезона →
        </Link>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <p className="text-xs text-slate">{label}</p>
      <p
        className="num mt-1 text-xl font-700"
        style={{ color: accent ? "var(--color-signal-deep)" : undefined }}
      >
        {value}
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/seasons" />
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="font-display text-xl font-600">Сезон не найден</p>
        <Link href="/seasons" className="mt-4 inline-block text-sm font-600 text-[color:var(--color-signal-deep)]">
          ← Ко всем сезонам
        </Link>
      </main>
    </div>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/seasons" />
      <main className="mx-auto max-w-2xl px-5 py-20 text-center" role="alert">
        <p className="font-display text-xl font-600">Не удалось загрузить сезон</p>
        <button
          onClick={onRetry}
          className="mt-4 rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black"
        >
          Обновить
        </button>
      </main>
    </div>
  );
}
