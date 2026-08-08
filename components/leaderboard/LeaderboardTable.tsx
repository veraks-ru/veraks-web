import Link from "next/link";
import { fmtBrier } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/types";

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  // Бэкенд отдаёт сезонные строки уже в порядке призовых мест: сначала
  // квалифицированные к призам, затем остальные. Находим границу, чтобы
  // отрисовать её явно — первое место в таблице должно читаться как призовое.
  const firstUnqualified = rows.findIndex((r) => r.qualified === false);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="grid grid-cols-[3rem_1fr_auto_5rem] items-center gap-3 border-b border-line px-4 py-2.5 text-xs font-600 tracking-wide text-slate uppercase sm:grid-cols-[3.5rem_1fr_7rem_6rem] sm:px-5">
        <span>Место</span>
        <span>Участник</span>
        <span className="hidden text-right sm:block">Разрешено</span>
        <span className="text-right">Brier</span>
      </div>

      <ul>
        {rows.map((r, i) => (
          <li key={r.username}>
            {i === firstUnqualified && <OutOfContestDivider />}
            <Link
              href={`/u/${r.username}`}
              className={`grid grid-cols-[3rem_1fr_auto_5rem] items-center gap-3 px-4 py-3 transition-colors sm:grid-cols-[3.5rem_1fr_7rem_6rem] sm:px-5 ${
                r.isMe
                  ? "bg-[color:var(--color-signal)]/[0.08] hover:bg-[color:var(--color-signal)]/[0.12]"
                  : "hover:bg-paper"
              }`}
            >
              <Rank rank={r.rank} inContest={r.qualified !== false} />

              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-700 ${
                    r.isMe
                      ? "bg-[color:var(--color-signal-deep)] text-white"
                      : "bg-paper text-slate"
                  } ${r.qualified === false ? "opacity-60" : ""}`}
                >
                  {r.displayName[0]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-600">
                    @{r.username}
                    {r.isMe && <span className="ml-2 text-xs font-600 text-[color:var(--color-signal-deep)]">вы</span>}
                  </span>
                  <span className="block truncate text-xs text-slate">{r.displayName}</span>
                </span>
              </span>

              <span className="hidden text-right text-sm tnum text-slate sm:block">
                {r.nResolved}
              </span>
              <span
                className={`text-right font-mono text-sm font-700 tnum ${
                  r.qualified === false ? "text-slate" : ""
                }`}
              >
                {fmtBrier(r.meanBrier)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Граница призовой зоны сезона. Всё, что ниже, — участники, не прошедшие
 * пороги квалификации (объём / разнообразие / охват сложности): они видят свою
 * позицию, но на приз не претендуют.
 */
function OutOfContestDivider() {
  return (
    <div className="border-y border-line bg-paper px-4 py-2 sm:px-5">
      <p className="text-xs font-600 tracking-wide text-slate uppercase">
        Вне призового зачёта
      </p>
      <p className="mt-0.5 text-xs text-slate">
        не пройдены пороги сезона — объём, разнообразие категорий или охват сложности
      </p>
    </div>
  );
}

function Rank({ rank, inContest }: { rank: number; inContest: boolean }) {
  // Подсветка призовой тройки — только внутри зачёта: вне его «место» условно.
  const top = inContest && rank <= 3;
  return (
    <span
      className={`flex size-7 items-center justify-center rounded-lg font-mono text-sm font-700 tnum ${
        top ? "bg-graphite text-white" : "text-slate"
      } ${inContest ? "" : "opacity-70"}`}
    >
      {rank}
    </span>
  );
}
