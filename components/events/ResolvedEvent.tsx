import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { CategoryChip } from "@/components/ui/Badge";
import { GRADES, gradeColor, indexOfGrade } from "@/lib/confidence";
import { crowdShares, crowdTotal } from "@/lib/crowd";
import { categoryTitle } from "@/lib/mock";
import { eventLeaders, resultVerdict, ME } from "@/lib/mock-users";
import { fmtBrier, fmtDate } from "@/lib/format";
import type { PredictionEvent } from "@/lib/types";

export function ResolvedEvent({ event }: { event: PredictionEvent }) {
  const outcome = !!event.outcome;
  const o = outcome ? 1 : 0;
  const gradeBrier = (i: number) => (GRADES[i].probability - o) ** 2;

  const total = crowdTotal(event.crowd);
  const crowdMeanBrier =
    event.crowd.counts.reduce((acc, n, i) => acc + n * gradeBrier(i), 0) / (total || 1);

  const myIdx = event.myGrade ? indexOfGrade(event.myGrade) : null;
  const myBrier = myIdx == null ? null : gradeBrier(myIdx);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href="/events" className="text-sm font-600 text-slate hover:text-graphite">
          ← Все события
        </Link>

        <div className="mt-5 flex items-center gap-2">
          <CategoryChip title={categoryTitle(event.categorySlug)} />
          {event.resolvedAt && (
            <span className="text-xs text-slate">разрешено {fmtDate(event.resolvedAt)}</span>
          )}
        </div>

        <h1 className="mt-4 font-display text-2xl leading-snug font-600 sm:text-3xl">
          {event.title}
        </h1>

        {/* Вердикт исхода */}
        <Verdict outcome={outcome} event={event} />

        {/* Ваш результат */}
        {myIdx != null && myBrier != null && (
          <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate">Ваш прогноз</p>
                <p className="mt-1 font-display text-xl font-700" style={{ color: gradeColor(myIdx) }}>
                  «{GRADES[myIdx].label}»
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate">Brier</p>
                <p className="font-mono text-xl font-700 tnum">{fmtBrier(myBrier)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate">Оценка</p>
                <p
                  className="font-display text-xl font-700"
                  style={{ color: myBrier < 0.2 ? "var(--color-signal-deep)" : myBrier < 0.45 ? "#b56b1e" : "#c2453a" }}
                >
                  {resultVerdict(myBrier)}
                </p>
              </div>
            </div>
            <Link
              href={`/events/${event.slug}/share`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-graphite px-4 py-2.5 text-sm font-600 text-white hover:bg-black"
            >
              <ShareIcon className="size-4" />
              Поделиться результатом
            </Link>
          </section>
        )}

        {/* Кто как предсказал + скоринг */}
        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-600">Кто как предсказал</h2>
            <p className="text-xs text-slate">
              Средний Brier толпы <span className="font-mono font-700 tnum">{fmtBrier(crowdMeanBrier)}</span>
            </p>
          </div>
          <p className="mt-1 mb-5 text-sm text-slate">
            Уверенный промах стоит дорого — вот цена каждой градации при исходе «{outcome ? "ДА" : "НЕТ"}».
          </p>
          <ScoringBars event={event} gradeBrier={gradeBrier} myIdx={myIdx} />
        </section>

        {/* Лучшие на событии */}
        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <h2 className="mb-4 font-display text-lg font-600">Лучшие на этом событии</h2>
          <ul className="divide-y divide-line">
            {eventLeaders(event.slug, outcome).map((l, i) => (
              <li key={l.username} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-5 font-mono text-sm font-700 tnum text-slate">{i + 1}</span>
                <Link
                  href={`/u/${l.username}`}
                  className={`min-w-0 flex-1 truncate text-sm font-600 hover:underline ${
                    l.isMe ? "text-[color:var(--color-signal-deep)]" : ""
                  }`}
                >
                  @{l.username}
                  {l.isMe && <span className="ml-1.5 text-xs">вы</span>}
                </Link>
                <span className="text-xs font-600" style={{ color: gradeColor(l.gradeIndex) }}>
                  {GRADES[l.gradeIndex].short}
                </span>
                <span className="w-12 text-right font-mono text-sm font-700 tnum">
                  {fmtBrier(l.brier)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Источник истины */}
        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm">
          <p className="text-xs font-600 tracking-wide text-slate uppercase">Источник истины</p>
          <p className="mt-1 leading-snug">{event.resolutionSource}</p>
          {event.sourceReference && (
            <p className="mt-3 leading-snug text-slate">Подтверждение: {event.sourceReference}</p>
          )}
          <p className="mt-3 leading-snug text-slate">{event.resolutionCriteria}</p>
        </section>
      </main>
    </div>
  );
}

function Verdict({ outcome, event }: { outcome: boolean; event: PredictionEvent }) {
  const color = outcome ? "var(--color-warm)" : "var(--color-cool)";
  return (
    <div
      className="mt-5 overflow-hidden rounded-[var(--radius-card)] border bg-surface p-6"
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, var(--color-line))` }}
    >
      <p className="text-xs font-600 tracking-wide text-slate uppercase">Исход по источнику</p>
      <p className="mt-1 font-display text-4xl font-700" style={{ color }}>
        {outcome ? "ДА" : "НЕТ"}
      </p>
      <p className="mt-2 text-sm text-slate">
        Прошло окно оспаривания · засчитано в рейтинги
      </p>
    </div>
  );
}

function ScoringBars({
  event,
  gradeBrier,
  myIdx,
}: {
  event: PredictionEvent;
  gradeBrier: (i: number) => number;
  myIdx: number | null;
}) {
  const shares = crowdShares(event.crowd);
  const max = Math.max(...shares, 0.0001);
  return (
    <div className="flex items-end gap-2.5">
      {GRADES.map((g, i) => {
        const h = 12 + (shares[i] / max) * 88;
        const bs = gradeBrier(i);
        const isMine = i === myIdx;
        return (
          <div key={g.grade} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[0.62rem] tnum text-slate">{Math.round(shares[i] * 100)}%</span>
            <span
              className="w-full rounded-t-md"
              style={{
                height: `${h}px`,
                background: gradeColor(i),
                opacity: isMine ? 1 : 0.45,
                outline: isMine ? "2px solid var(--color-signal-deep)" : "none",
                outlineOffset: "2px",
              }}
            />
            <span className="font-mono text-[0.62rem] font-600 tnum text-graphite">{fmtBrier(bs)}</span>
            <span className="text-center text-[0.6rem] leading-tight text-slate">{g.short}</span>
          </div>
        );
      })}
    </div>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v12m0-12 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
