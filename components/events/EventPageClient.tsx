"use client";

// Клиентская часть страницы события: роутер трёх состояний
// (Predict / Resolved / Pending) и загрузка данных через lib/api.
// Серверная обёртка (app/events/[slug]/page.tsx) отвечает только за
// метаданные и OG — данные для экрана по-прежнему грузит клиент, потому что
// они зависят от сессии (мой прогноз) и от видимости сводки.

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { PredictExperience } from "@/components/predict/PredictExperience";
import { ResolvedEvent } from "@/components/events/ResolvedEvent";
import { MiniConsensus } from "@/components/events/MiniConsensus";
import { EventComments } from "@/components/events/EventComments";
import { CategoryChip, StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useCategoryTitle } from "@/lib/api/useCategories";
import type { PredictionEvent } from "@/lib/types";
import {
  getEvent,
  getMyPrediction,
  getPredictionSummary,
  listCategories,
} from "@/lib/api/endpoints";
import { toPredictionEvent } from "@/lib/api/map";

type State =
  | { kind: "loading" }
  | { kind: "notfound" }
  | { kind: "error" }
  | { kind: "ready"; event: PredictionEvent };

export function EventPageClient({ slug }: { slug: string }) {
  const id = slug;
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    (async () => {
      try {
        const [ev, cats] = await Promise.all([getEvent(id), listCategories()]);
        if (!ev || ev.status === "proposed") {
          // Предложения на модерации публично не показываем.
          if (alive) setState({ kind: "notfound" });
          return;
        }
        const catMap = new Map((cats ?? []).map((c) => [c.id, c.slug]));
        const [summary, mine] = await Promise.all([
          getPredictionSummary(ev.id),
          getMyPrediction(ev.id),
        ]);
        const mapped = toPredictionEvent(ev, catMap, {
          summary,
          myGrade: mine?.confidence_grade ?? null,
        });
        if (alive) setState({ kind: "ready", event: mapped });
      } catch {
        if (alive) setState({ kind: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
      </div>
    );
  }
  if (state.kind === "notfound") return <NotFound />;
  if (state.kind === "error") return <ErrorView onRetry={() => location.reload()} />;

  const { event } = state;
  if (event.status === "open") return <PredictExperience event={event} />;
  // Аннулированное/отменённое событие — отдельный честный экран: исход (если
  // он был) больше ни на что не влияет, показывать «разрешено» нельзя.
  if (event.status === "annulled" || event.status === "cancelled") {
    return <VoidedEvent event={event} />;
  }
  // Оспоренное событие тоже имеет зафиксированный исход — показываем его и блок
  // Disputes (как в resolved), а не заглушку «результат появится».
  if (
    (event.status === "resolved" || event.status === "disputed") &&
    event.outcome !== undefined
  ) {
    return <ResolvedEvent event={event} />;
  }
  return <PendingEvent event={event} />;
}

/**
 * Экран аннулированного (или отменённого) события.
 *
 * Показываем факт и его последствие для рейтинга — без причины: она
 * фиксируется в аудите и публично не раскрывается. Оформление нейтральное
 * (не красное): аннулирование — не наказание участнику, а признание того,
 * что событие было сформулировано или разрешено некорректно.
 */
function VoidedEvent({ event }: { event: PredictionEvent }) {
  const categoryTitle = useCategoryTitle(event.categorySlug);
  const annulled = event.status === "annulled";
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href="/events" className="text-sm font-600 text-slate hover:text-graphite">
          ← Все события
        </Link>
        <div className="mt-5 flex items-center gap-2">
          <CategoryChip title={categoryTitle} />
          <StatusBadge status={event.status} />
        </div>
        <h1 className="mt-4 font-display text-2xl leading-snug font-600 sm:text-3xl">
          {event.title}
        </h1>

        <section className="mt-5 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <p className="font-display text-xl font-600">
            {annulled ? "Событие аннулировано" : "Событие отменено"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            {annulled ? (
              <>
                Организатор признал событие некорректным уже после подведения
                исхода. Прогнозы по нему не участвуют в рейтингах и калибровке —
                ни у кого: ни как выигрыш, ни как ошибка.
              </>
            ) : (
              <>
                Событие снято до подведения исхода. Прогнозы по нему не
                оценивались и в рейтингах не участвуют.
              </>
            )}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate">
            Решение и его основание зафиксированы в неизменяемом журнале
            платформы.
          </p>
        </section>

        {event.forecasters > 0 && (
          <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <p className="mb-4 text-sm font-600">Как распределились прогнозы</p>
            <MiniConsensus crowd={event.crowd} mine={event.myGrade} labelled />
            <p className="mt-4 text-xs text-slate">
              Распределение оставлено для истории и на рейтинг не влияет.
            </p>
          </section>
        )}

        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm">
          <p className="text-xs font-600 tracking-wide text-slate uppercase">
            Источник истины
          </p>
          <p className="mt-1 leading-snug">{event.resolutionSource}</p>
          <p className="mt-3 leading-snug text-slate">{event.resolutionCriteria}</p>
        </section>

        <EventComments eventId={event.id} />
      </main>
    </div>
  );
}

function PendingEvent({ event }: { event: PredictionEvent }) {
  const categoryTitle = useCategoryTitle(event.categorySlug);
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href="/events" className="text-sm font-600 text-slate hover:text-graphite">
          ← Все события
        </Link>
        <div className="mt-5 flex items-center gap-2">
          <CategoryChip title={categoryTitle} />
          <StatusBadge status={event.status} />
        </div>
        <h1 className="mt-4 font-display text-2xl leading-snug font-600 sm:text-3xl">
          {event.title}
        </h1>
        <p className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm text-slate">
          Приём прогнозов закрыт. Событие разрешается по источнику — результат появится
          здесь после проверки и окна оспаривания.
        </p>
        {event.forecasters > 0 && (
          <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <p className="mb-4 text-sm font-600">Как распределились прогнозы</p>
            <MiniConsensus crowd={event.crowd} mine={event.myGrade} labelled />
          </section>
        )}
        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm">
          <p className="text-xs font-600 tracking-wide text-slate uppercase">Источник истины</p>
          <p className="mt-1 leading-snug">{event.resolutionSource}</p>
          <p className="mt-3 leading-snug text-slate">{event.resolutionCriteria}</p>
        </section>
        <EventComments eventId={event.id} />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="font-display text-xl font-600">Событие не найдено</p>
        <Link href="/events" className="mt-4 inline-block text-sm font-600 text-[color:var(--color-signal-deep)]">
          ← Ко всем событиям
        </Link>
      </main>
    </div>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-20 text-center" role="alert">
        <p className="font-display text-xl font-600">Не удалось загрузить событие</p>
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
