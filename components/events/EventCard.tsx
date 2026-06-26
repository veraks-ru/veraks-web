import Link from "next/link";
import { CategoryChip, StatusBadge, OutcomeBadge } from "@/components/ui/Badge";
import { MiniConsensus } from "./MiniConsensus";
import { crowdTotal } from "@/lib/crowd";
import { categoryTitle } from "@/lib/mock";
import { GRADES, gradeColor, indexOfGrade } from "@/lib/confidence";
import { deadlineLabel } from "@/lib/format";
import { nPeople } from "@/lib/format";
import type { ConfidenceGrade, PredictionEvent } from "@/lib/types";

function GradePill({ grade }: { grade: ConfidenceGrade }) {
  const i = indexOfGrade(grade);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm font-700"
      style={{ color: gradeColor(i) }}
    >
      <span className="size-2 rounded-full" style={{ background: gradeColor(i) }} />
      {GRADES[i].label}
    </span>
  );
}

export function EventCard({ event }: { event: PredictionEvent }) {
  const predicted = !!event.myGrade;
  const isResolved = event.status === "resolved";
  const isOpen = event.status === "open";
  const href = `/events/${event.slug}`;

  return (
    <article className="group flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-shadow hover:shadow-[0_8px_30px_-18px_rgba(20,23,28,0.35)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <CategoryChip title={categoryTitle(event.categorySlug)} />
        {isResolved && event.outcome !== undefined ? (
          <OutcomeBadge outcome={event.outcome} />
        ) : (
          <StatusBadge status={event.status} closesAt={event.closesAt} />
        )}
      </div>

      <Link href={href} className="block">
        <h3 className="font-display text-[1.05rem] leading-snug font-500 text-balance group-hover:text-[color:var(--color-signal-deep)]">
          {event.title}
        </h3>
      </Link>

      <p className="mt-2.5 flex items-center gap-2 text-xs text-slate">
        <span className="tnum">{nPeople(event.forecasters)}</span>
        <span aria-hidden>·</span>
        {isResolved ? (
          <span>разрешено по источнику</span>
        ) : (
          <span className="font-600 text-graphite">{deadlineLabel(event.closesAt)}</span>
        )}
      </p>

      {/* Состояние нижней части зависит от того, прогнозировал ли пользователь */}
      <div className="mt-4 flex-1">
        {isOpen && !predicted && (
          <LockedConsensus />
        )}

        {predicted && !isResolved && (
          <div className="rounded-xl bg-paper p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate">Ваше показание</span>
              <GradePill grade={event.myGrade!} />
            </div>
            {crowdTotal(event.crowd) > 0 ? (
              <div className="mt-2.5">
                <MiniConsensus crowd={event.crowd} mine={event.myGrade} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate">
                Прогноз учтён. Мнение толпы откроется после закрытия приёма.
              </p>
            )}
          </div>
        )}

        {isResolved && (
          <div className="rounded-xl bg-paper p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs text-slate">Вы сказали</span>
              {event.myGrade ? (
                <GradePill grade={event.myGrade} />
              ) : (
                <span className="text-sm text-slate">не прогнозировали</span>
              )}
            </div>
            <MiniConsensus crowd={event.crowd} mine={event.myGrade} />
          </div>
        )}
      </div>

      <div className="mt-4">
        {isOpen && (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-700 text-[color:var(--color-signal-deep)] hover:gap-2.5"
          >
            {predicted ? "Изменить прогноз" : "Сделать прогноз"}
            <Arrow />
          </Link>
        )}
        {isResolved && (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-700 text-graphite hover:gap-2.5"
          >
            Кто как предсказал
            <Arrow />
          </Link>
        )}
        {!isOpen && !isResolved && (
          <span className="text-sm text-slate">Приём закрыт — ждём разрешения</span>
        )}
      </div>
    </article>
  );
}

/** Анти-якорение: до прогноза мнение толпы скрыто. */
function LockedConsensus() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-paper/60 p-3.5">
      <LockIcon className="size-5 shrink-0 text-slate" />
      <p className="text-xs leading-snug text-slate">
        Мнение толпы скрыто, чтобы не влиять на вас. Откроется после вашего прогноза.
      </p>
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 transition-all" fill="none" aria-hidden="true">
      <path d="M3 8h9m0 0-3.5-3.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
