"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfidenceDial } from "./ConfidenceDial";
import { EventComments } from "@/components/events/EventComments";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { GRADES, gradeColor, indexOfGrade } from "@/lib/confidence";
import { putPrediction } from "@/lib/api/endpoints";
import { categoryTitle } from "@/lib/mock";
import { deadlineLabel, nPeople } from "@/lib/format";
import { useAuth } from "@/components/app/AuthProvider";
import type { PredictionEvent } from "@/lib/types";

type Phase = "edit" | "submitting" | "done";

export function PredictExperience({ event }: { event: PredictionEvent }) {
  const { me } = useAuth();
  const initial = event.myGrade ? indexOfGrade(event.myGrade) : null;
  const [chosen, setChosen] = useState<number | null>(initial);
  const [phase, setPhase] = useState<Phase>(event.myGrade ? "done" : "edit");
  const [error, setError] = useState(false);

  const hadPrediction = initial !== null;

  async function submit() {
    if (chosen == null) return;
    setError(false);
    setPhase("submitting");
    try {
      await putPrediction(event.id, GRADES[chosen].grade);
      setPhase("done");
    } catch {
      setError(true);
      setPhase("edit");
    }
  }

  return (
    <main className="bg-oracle grain min-h-dvh text-white">
      <div className="mx-auto w-full max-w-xl px-5 py-5 sm:px-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm font-600 text-haze hover:text-white"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
            <path d="M13 8H4m0 0 3.5-3.5M4 8l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Все события
        </Link>

        <div className="mt-6 flex items-center gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-600 text-haze">
            {categoryTitle(event.categorySlug)}
          </span>
          <span className="text-haze-dim">·</span>
          <span className="font-600 text-warm">{deadlineLabel(event.closesAt)}</span>
          <span className="text-haze-dim">·</span>
          <span className="tnum text-haze-dim">{nPeople(event.forecasters)}</span>
        </div>

        <h1 className="mt-4 font-display text-2xl leading-snug font-600 text-balance sm:text-[1.75rem]">
          {event.title}
        </h1>

        <SourceDisclosure event={event} />

        {/* Дуга + вывод */}
        <section className="mt-8 rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/50 p-6 backdrop-blur-sm sm:p-8">
          <p className="text-center text-sm text-haze">
            {phase === "done" ? "Ваше показание" : "Насколько уверены, что это сбудется?"}
          </p>

          <ConfidenceDial
            value={chosen}
            onChange={(i) => {
              setChosen(i);
              if (phase === "done") setPhase("edit");
            }}
            disabled={phase === "submitting"}
          />

          {/* Крупное слово — эмоциональный итог, без процентов */}
          <p
            className="-mt-2 text-center font-display text-3xl font-700 transition-colors sm:text-4xl"
            style={{ color: chosen == null ? "var(--color-haze-dim)" : gradeColor(chosen) }}
            aria-live="polite"
          >
            {chosen == null ? "Выберите" : GRADES[chosen].label}
          </p>
          <p className="mt-2 text-center text-xs text-haze-dim">
            Скажите словами — проценты система посчитает сама.
          </p>

          {/* Сегменты-дубль для точного тапа и доступности */}
          <GradeSegments
            value={chosen}
            onChange={(i) => {
              setChosen(i);
              if (phase === "done") setPhase("edit");
            }}
            disabled={phase === "submitting"}
          />
        </section>

        {/* Консенсус толпы на вводе не показываем: он скрыт до закрытия приёма
            (анти-якорение), а проценты на вводе запрещены (DESIGN.md). */}

        {/* Действие — гейт только по входу (участие бесплатно). */}
        <div className="mt-6">
          {!me ? (
            <GatePanel
              title="Войдите, чтобы голосовать"
              note="Участвовать можно бесплатно. Войдите, чтобы сделать свой прогноз."
              cta="Войти через Госуслуги"
              href="/join"
            />
          ) : phase === "done" ? (
            <div className="flex flex-col items-center gap-3">
              <p className="flex items-center gap-2 text-sm font-600 text-signal">
                <CheckBadge className="size-5" />
                Прогноз зафиксирован
              </p>
              <p className="text-center text-xs text-haze-dim">
                Можно менять до закрытия приёма — в зачёт идёт последнее значение.
              </p>
            </div>
          ) : (
            <>
              <Button
                variant="signal"
                size="lg"
                className="w-full"
                disabled={chosen == null || phase === "submitting"}
                onClick={submit}
              >
                {phase === "submitting" ? (
                  <Spinner className="size-5" />
                ) : hadPrediction ? (
                  "Обновить прогноз"
                ) : (
                  "Зафиксировать прогноз"
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-haze-dim">
                После закрытия приёма прогноз заморозится. Менять можно до этого момента.
              </p>
            </>
          )}
          {error && (
            <p className="mt-3 text-center text-sm text-warm" role="alert">
              Не удалось сохранить. Попробуйте ещё раз.
            </p>
          )}
        </div>
        <EventComments eventId={event.id} />
      </div>
    </main>
  );
}

function GatePanel({
  title,
  note,
  cta,
  href,
}: {
  title: string;
  note: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/50 p-6 text-center">
      <p className="font-display text-lg font-600">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-haze">{note}</p>
      <ButtonLink href={href} variant="signal" size="lg" className="mt-5 w-full">
        {cta}
      </ButtonLink>
    </div>
  );
}

/* ───────────────────── Сегменты-кнопки ───────────────────── */

function GradeSegments({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (i: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 grid grid-cols-5 gap-1.5" role="group" aria-label="Градации уверенности">
      {GRADES.map((g, i) => {
        const on = i === value;
        return (
          <button
            key={g.grade}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i)}
            aria-pressed={on}
            className="flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[0.7rem] leading-tight font-600 transition-colors disabled:opacity-50"
            style={{
              borderColor: on ? gradeColor(i) : "var(--color-edge)",
              background: on
                ? `color-mix(in srgb, ${cssVarFor(i)} 18%, transparent)`
                : "transparent",
              color: on ? "#fff" : "var(--color-haze)",
            }}
          >
            <span className="size-2 rounded-full" style={{ background: gradeColor(i) }} />
            {g.short}
          </button>
        );
      })}
    </div>
  );
}

// gradeColor возвращает var(); для color-mix нужен тот же токен.
function cssVarFor(i: number): string {
  return gradeColor(i);
}

/* ───────────────────── Источник истины ───────────────────── */

function SourceDisclosure({ event }: { event: PredictionEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-[color:var(--color-edge)] bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
      >
        <span className="flex items-center gap-2 font-600 text-haze">
          <DocIcon className="size-4 text-signal" />
          Источник истины и критерии
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-[color:var(--color-edge)] px-4 py-3.5 text-sm text-haze">
          <div>
            <p className="text-xs font-600 tracking-wide text-haze-dim uppercase">Источник</p>
            <p className="mt-1 leading-snug">{event.resolutionSource}</p>
          </div>
          <div>
            <p className="text-xs font-600 tracking-wide text-haze-dim uppercase">Критерии</p>
            <p className="mt-1 leading-snug">{event.resolutionCriteria}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Иконки ───────────────────── */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`size-4 text-haze-dim transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 13h6M9 16.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 12 2.3 2.3L15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
