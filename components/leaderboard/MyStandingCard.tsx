import Link from "next/link";
import { fmtBrier } from "@/lib/format";
import type { ApiSeasonStanding } from "@/lib/api/dto";

/**
 * Закреплённая строка «вы» под сезонной таблицей.
 *
 * Лидерборд страничный, и после перехода на призовой порядок неквалифицированные
 * участники гарантированно уезжают вниз списка — своя позиция иначе не видна.
 * Здесь она показывается всегда, вместе с разбором трёх порогов сезона: место
 * без объяснения «почему не приз» бесполезно.
 */
export function MyStandingCard({
  standing,
  username,
}: {
  standing: ApiSeasonStanding;
  username: string;
}) {
  const { rating, qualification: q } = standing;

  return (
    <div className="sticky bottom-3 z-10 mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[0_8px_30px_-12px_rgba(20,23,28,0.28)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-signal-deep)] font-mono text-sm font-700 tnum text-white">
            {rating ? rating.rank : "—"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-600">
              <Link href={`/u/${username}`} className="hover:underline">
                @{username}
              </Link>
              <span className="ml-2 text-xs font-600 text-[color:var(--color-signal-deep)]">вы</span>
            </p>
            <p className="mt-0.5 text-xs text-slate">
              {rating
                ? `Brier ${fmtBrier(Number(rating.mean_brier))} · разрешено ${rating.n_resolved}`
                : "в этом сезоне ещё нет засчитанных прогнозов"}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-600 ${
            q.qualified
              ? "bg-[color:var(--color-signal)]/12 text-[color:var(--color-signal-deep)]"
              : "bg-paper text-slate"
          }`}
        >
          {q.qualified ? "в призовом зачёте" : "вне призового зачёта"}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-3">
        <Threshold
          label="Объём прогнозов"
          have={q.n_resolved}
          need={q.n_min}
          ok={q.volume_ok}
        />
        <Threshold
          label="Категорий"
          have={q.category_count}
          need={q.c_min}
          ok={q.diversity_ok}
        />
        <Threshold
          label="Охват сложности"
          have={q.total_weight}
          need={q.w_min}
          ok={q.coverage_ok}
          fractional
        />
      </dl>

      {!q.qualified && (
        <p className="mt-3 text-xs leading-relaxed text-slate">
          Пороги нужны, чтобы приз нельзя было взять одним удачным прогнозом или
          набором лёгких вопросов. Охват сложности растёт только на спорных
          событиях — на очевидных вес почти нулевой.
        </p>
      )}
    </div>
  );
}

/**
 * Один порог: «сколько есть / сколько нужно» + полоса заполнения.
 * Пройденный порог отмечается сигнальным цветом, непройденный — нейтральным:
 * это не «проигрыш», а незавершённый прогресс (`DESIGN.md` — не красно-зелёное).
 */
function Threshold({
  label,
  have,
  need,
  ok,
  fractional,
}: {
  label: string;
  have: number;
  need: number;
  ok: boolean;
  fractional?: boolean;
}) {
  const fmt = (v: number) => (fractional ? v.toFixed(1) : String(v));
  // need = 0 — порог отключён в правилах сезона: считаем его взятым.
  const pct = need > 0 ? Math.min(100, (have / need) * 100) : 100;

  return (
    <div className="rounded-xl bg-paper p-3">
      <div className="flex items-baseline justify-between gap-2">
        <dt className="truncate text-xs text-slate">{label}</dt>
        <dd className="shrink-0 font-mono text-xs font-700 tnum">
          <span className={ok ? "text-[color:var(--color-signal-deep)]" : "text-graphite"}>
            {fmt(have)}
          </span>
          <span className="text-slate"> / {fmt(need)}</span>
        </dd>
      </div>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${fmt(have)} из ${fmt(need)}`}
      >
        <div
          className={`h-full rounded-full ${
            ok ? "bg-[color:var(--color-signal-deep)]" : "bg-slate/50"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
