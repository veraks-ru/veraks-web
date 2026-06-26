import Link from "next/link";
import { fmtBrier } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/types";

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="grid grid-cols-[3rem_1fr_auto_5rem] items-center gap-3 border-b border-line px-4 py-2.5 text-xs font-600 tracking-wide text-slate uppercase sm:grid-cols-[3.5rem_1fr_7rem_6rem] sm:px-5">
        <span>Место</span>
        <span>Участник</span>
        <span className="hidden text-right sm:block">Разрешено</span>
        <span className="text-right">Brier</span>
      </div>

      <ul>
        {rows.map((r) => (
          <li key={r.username}>
            <Link
              href={`/u/${r.username}`}
              className={`grid grid-cols-[3rem_1fr_auto_5rem] items-center gap-3 px-4 py-3 transition-colors sm:grid-cols-[3.5rem_1fr_7rem_6rem] sm:px-5 ${
                r.isMe
                  ? "bg-[color:var(--color-signal)]/[0.08] hover:bg-[color:var(--color-signal)]/[0.12]"
                  : "hover:bg-paper"
              }`}
            >
              <Rank rank={r.rank} />

              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-700 ${
                    r.isMe ? "bg-[color:var(--color-signal-deep)] text-white" : "bg-paper text-slate"
                  }`}
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
              <span className="text-right font-mono text-sm font-700 tnum">
                {fmtBrier(r.meanBrier)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Rank({ rank }: { rank: number }) {
  const top = rank <= 3;
  return (
    <span
      className={`flex size-7 items-center justify-center rounded-lg font-mono text-sm font-700 tnum ${
        top ? "bg-graphite text-white" : "text-slate"
      }`}
    >
      {rank}
    </span>
  );
}
