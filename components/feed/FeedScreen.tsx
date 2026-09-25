"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OracleArc } from "@/components/brand/OracleArc";
import { TopNav } from "@/components/app/TopNav";
import { Toast, type ToastData } from "@/components/ui/Toast";
import { useAuth } from "@/components/app/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { putPrediction } from "@/lib/api/endpoints";
import { useDarkChrome } from "@/lib/chromeTone";
import { GRADES, indexOfGrade } from "@/lib/confidence";
import { UNDO_MS, gradeForDirection, type SwipeDecision, type SwipeDirection } from "@/lib/feed";
import {
  GUEST_OWNER,
  bumpDailyCount,
  bumpOutboxAttempt,
  guestContinues,
  isOutboxEntryStale,
  outboxEntry,
  readDailyCount,
  readOutbox,
  readOutboxFor,
  rememberGuestContinues,
  removeFromOutbox,
  upsertOutbox,
} from "@/lib/feedStorage";
import { pluralize } from "@/lib/format";
import { withNext } from "@/lib/returnTo";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { FeedCard } from "@/lib/types";
import { CardStack } from "./CardStack";
import { DetailsSheet } from "./DetailsSheet";
import { EndOfStack } from "./EndOfStack";
import { FeedBoard } from "./FeedBoard";
import { CategoryStrip, DailyCounter, FeedHeader, GuestLine } from "./FeedHeader";
import { GuestGate } from "./GuestGate";
import { SwipeButtons } from "./SwipeButtons";
import { useFeed } from "./useFeed";
import { usePendingSubmits } from "./usePendingSubmits";

const wordFor = (dir: SwipeDecision): string =>
  GRADES[indexOfGrade(gradeForDirection(dir))].label;

/** Сколько гостевых ответов ждут входа. */
const countWaiting = (): number => readOutbox().filter((e) => e.owner === GUEST_OWNER).length;

/**
 * Лента-свайп — главный экран.
 *
 * Свайп влево/вправо — прогноз «Скорее нет» / «Скорее да» (lib/feed.ts),
 * вверх — пропустить. Карточка улетает сразу, прогноз уходит через несколько
 * секунд с возможностью отменить. Гость свайпает так же, но его ответы ждут
 * входа в локальном ящике и записываются после согласий.
 *
 * Решение всегда привязано к карточке, которую отпустили (жест передаёт её
 * сюда), а не к «верхней на данный момент»: пока карточка летит, стопка
 * может измениться отменой.
 */
export function FeedScreen() {
  useDarkChrome();
  const router = useRouter();
  const { me, loading: authLoading, subscribed, refresh } = useAuth();
  // Широкий экран — доска карточек с кнопками; телефон — стопка со свайпом.
  const wide = useMediaQuery("(min-width: 768px)");

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const feed = useFeed({ viewerKey: authLoading ? null : (me?.id ?? GUEST_OWNER), categoryId });

  const [toast, setToast] = useState<ToastData | null>(null);
  const toastSeq = useRef(0);
  const undoToastId = useRef<number | null>(null);
  const say = useCallback((message: string, opts: Omit<ToastData, "id" | "message"> = {}) => {
    const id = ++toastSeq.current;
    setToast({ id, message, ...opts });
    return id;
  }, []);
  const closeToast = useCallback((id: number) => setToast((t) => (t?.id === id ? null : t)), []);

  // Для скринридера — то, чего нет в тосте (пропуск, отмена). Одинаковый
  // текст подряд не озвучивается, поэтому чередуем невидимый суффикс.
  const [live, setLive] = useState("");
  const announce = useCallback(
    (text: string) => setLive((prev) => (prev === text ? `${text}​` : text)),
    [],
  );

  const [details, setDetails] = useState<FeedCard | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateDecision, setGateDecision] = useState<{ card: FeedCard; direction: SwipeDecision } | null>(null);
  const [enterFrom, setEnterFrom] = useState<SwipeDirection | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [onlineTick, setOnlineTick] = useState(0);
  const flyRef = useRef<((dir: SwipeDirection) => void) | null>(null);
  const guestLast = useRef<{ card: FeedCard; direction: SwipeDecision } | null>(null);
  /** id карточки, которая сейчас летит за экран: отмена в это время не принимается. */
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    setDailyCount(readDailyCount());
    setWaiting(countWaiting());
  }, []);

  useEffect(() => setEnterFrom(null), [categoryId]);

  useEffect(() => {
    const onOnline = () => setOnlineTick((n) => n + 1);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const pending = usePendingSubmits({
    onCommitted: () => setDailyCount(bumpDailyCount()),
    onClosed: (p) => say(`Приём по «${p.card.title}» уже закрыт`, { durationMs: 4000 }),
    onRejected: (p) => say(`Ответ по «${p.card.title}» не принят`, { durationMs: 4000 }),
    onConsentRequired: () => router.push(withNext("/onboarding", "/")),
    onUnauthorized: () => {
      void refresh(); // сессии больше нет — лента переключится на гостя
      setWaiting(countWaiting());
      setGateDecision(null);
      setGateOpen(true);
    },
    onDeferred: () => say("Отправим, когда вернётся сеть", { durationMs: 4000 }),
  });

  /* ── Отмена ── */

  const undoPending = useCallback(() => {
    if (inFlight.current) return;
    const entry = pending.undoLast();
    if (!entry) return;
    setEnterFrom(entry.direction);
    feed.restore(entry.card);
    announce("Отменено");
  }, [pending, feed, announce]);

  const undoGuest = useCallback(() => {
    if (inFlight.current) return;
    const g = guestLast.current;
    if (!g) return;
    guestLast.current = null;
    removeFromOutbox(g.card.id);
    setWaiting(countWaiting());
    setEnterFrom(g.direction);
    feed.restore(g.card);
    setToast(null);
    announce("Отменено");
  }, [feed, announce]);

  const undoAny = me ? undoPending : undoGuest;
  // Кнопка в тосте зовёт актуальную отмену через ref: сам эффект ниже зависит
  // только от ожидающего свайпа, иначе каждый рендер пересоздавал бы тост.
  const undoPendingRef = useRef(undoPending);
  undoPendingRef.current = undoPending;

  // Тост «Скорее да · Отменить» живёт, пока последний свайп ещё не отправлен.
  const lastPending = pending.last;
  useEffect(() => {
    if (lastPending) {
      undoToastId.current = say(wordFor(lastPending.direction), {
        action: { label: "Отменить", onClick: () => undoPendingRef.current() },
      });
    } else if (undoToastId.current != null) {
      const id = undoToastId.current;
      undoToastId.current = null;
      closeToast(id);
    }
  }, [lastPending, say, closeToast]);

  /* ── Решение по карточке, которую отпустили ── */

  const onDecide = useCallback(
    (dir: SwipeDirection, card: FeedCard): boolean => {
      if (inFlight.current) return false;
      if (dir === "up" || me || guestContinues()) {
        inFlight.current = card.id;
        return true;
      }
      // Первый свайп гостя: карточка остаётся, вход показываем здесь же.
      upsertOutbox(outboxEntry(card, gradeForDirection(dir), GUEST_OWNER));
      setWaiting(countWaiting());
      setGateDecision({ card, direction: dir });
      setGateOpen(true);
      return false;
    },
    [me],
  );

  const onGone = useCallback(
    (dir: SwipeDirection, card: FeedCard) => {
      inFlight.current = null;
      setEnterFrom(null);
      if (dir === "up") {
        feed.skip(card.id);
        announce("Пропущено");
        return;
      }
      feed.remove(card.id);
      if (me) {
        pending.enqueue(card, dir, gradeForDirection(dir), me.id);
        return;
      }
      upsertOutbox(outboxEntry(card, gradeForDirection(dir), GUEST_OWNER));
      setWaiting(countWaiting());
      guestLast.current = { card, direction: dir };
      say(wordFor(dir), { action: { label: "Отменить", onClick: undoGuest }, durationMs: UNDO_MS });
    },
    [feed, me, pending, say, undoGuest, announce],
  );

  /* ── Ящик: дозаписать после входа и согласий, и когда вернулась сеть ── */

  const replaying = useRef(false);
  const removeCard = feed.remove;
  useEffect(() => {
    if (authLoading || !me || me.needs_onboarding || replaying.current) return;
    const entries = readOutboxFor(me.id);
    if (entries.length === 0) return;
    replaying.current = true;
    (async () => {
      let ok = 0;
      for (const e of entries) {
        if (isOutboxEntryStale(e)) {
          removeFromOutbox(e.eventId);
          continue;
        }
        removeCard(e.eventId); // на время отправки карточки в стопке нет
        bumpOutboxAttempt(e.eventId);
        try {
          await putPrediction(e.eventId, e.grade);
          removeFromOutbox(e.eventId);
          setDailyCount(bumpDailyCount());
          ok++;
        } catch (err) {
          const api = err instanceof ApiError ? err : null;
          if (api?.status === 401 || api?.status === 403) break; // сначала войти/согласиться
          if (api && api.status >= 400 && api.status < 500) {
            // Приём закрылся (409) или ответ не примут никогда — не прогноз.
            removeFromOutbox(e.eventId);
            continue;
          }
          // Сеть/сервер: оставим до следующего раза.
        }
      }
      setWaiting(countWaiting());
      if (ok > 0) {
        say(`${ok} ${pluralize(ok, ["ответ засчитан", "ответа засчитаны", "ответов засчитаны"])}`, {
          durationMs: 4000,
        });
      }
      replaying.current = false;
    })();
  }, [authLoading, me, removeCard, say, onlineTick]);

  /* ── Клавиатура ── */

  const topCard = feed.cards[0] ?? null;
  const sheetOpen = gateOpen || !!details;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // Поля ввода, кнопки и ссылки сами знают, что делать с Enter и пробелом.
      if (t?.closest("input,textarea,select,[contenteditable],button,a")) return;
      if (sheetOpen || document.querySelector('[role="dialog"]')) return;
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp": {
          e.preventDefault();
          const dir = e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : "up";
          flyRef.current?.(dir);
          break;
        }
        case "Enter":
          if (topCard) setDetails(topCard);
          break;
        case "Backspace":
        case "z":
        case "Z":
        case "я":
        case "Я":
          e.preventDefault();
          undoAny();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, topCard, undoAny]);

  const closeDetails = useCallback(() => setDetails(null), []);

  /* ── Гость закрыл шторку любым способом — значит, смотрит без входа ── */

  const continueAsGuest = useCallback(() => {
    rememberGuestContinues();
    setGateOpen(false);
  }, []);

  /* ── Экран ── */

  const emptyButMore = feed.status === "ready" && feed.cards.length === 0 && (feed.loadingMore || feed.hasMore);
  const showSkeleton = feed.status === "loading" || emptyButMore;

  const sheets = (
    <>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      <DetailsSheet card={details} onClose={closeDetails} />
      <GuestGate
        open={gateOpen}
        decision={gateDecision}
        waiting={waiting}
        onClose={continueAsGuest}
        onContinue={continueAsGuest}
      />
    </>
  );

  if (wide) {
    return (
      <main className="bg-oracle grain min-h-dvh overflow-x-clip text-white">
        <h1 className="sr-only">Лента прогнозов</h1>
        <div inert={sheetOpen || undefined}>
          <TopNav tone="dark" active="/" />
          <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="min-w-0 flex-1">
                <CategoryStrip categoryId={categoryId} onCategory={setCategoryId} />
              </div>
              {me && <DailyCounter count={dailyCount} />}
            </div>
            {!me && (
              <div className="mt-3">
                <GuestLine
                  mode="board"
                  waiting={waiting}
                  onOpenGate={() => {
                    setGateDecision(null);
                    setGateOpen(true);
                  }}
                />
              </div>
            )}

            <section className="mt-6" aria-label="Открытые события">
              {showSkeleton ? (
                <BoardSkeleton />
              ) : feed.status === "error" ? (
                <div className="relative min-h-[22rem]">
                  <ErrorCard kind={feed.error ?? "generic"} onRetry={feed.reload} />
                </div>
              ) : feed.cards.length > 0 ? (
                <FeedBoard
                  cards={feed.cards}
                  hasMore={feed.hasMore}
                  loadingMore={feed.loadingMore}
                  disabled={sheetOpen}
                  onLoadMore={feed.loadMore}
                  onDecide={onDecide}
                  onGone={onGone}
                  onDetails={setDetails}
                />
              ) : (
                <EndOfStack
                  fill={false}
                  skippedCount={feed.skippedCount}
                  filtered={categoryId !== null}
                  canPropose={!!me && subscribed}
                  onRestoreSkipped={feed.restoreSkipped}
                  onClearFilter={() => setCategoryId(null)}
                />
              )}
            </section>
          </div>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="pointer-events-auto">
            <Toast toast={toast} onClose={closeToast} />
          </div>
        </div>
        {sheets}
      </main>
    );
  }

  return (
    <main className="bg-oracle grain flex min-h-[calc(100dvh-3.75rem-env(safe-area-inset-bottom))] flex-col overflow-x-clip text-white md:min-h-dvh">
      <h1 className="sr-only">Лента прогнозов</h1>
      <div
        inert={sheetOpen || undefined}
        className="pt-safe relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-4 pb-5 sm:px-6"
      >
        <FeedHeader
          me={me}
          dailyCount={dailyCount}
          waiting={waiting}
          categoryId={categoryId}
          onCategory={setCategoryId}
          onOpenGate={() => {
            setGateDecision(null);
            setGateOpen(true);
          }}
        />

        <section
          className="relative mt-4 min-h-[18rem] flex-1 md:h-[32rem] md:flex-none"
          aria-label="Стопка событий"
        >
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 -z-[1] opacity-20">
            <OracleArc activeIndex={null} className="w-full" />
          </div>

          {showSkeleton ? (
            <CardSkeleton />
          ) : feed.status === "error" ? (
            <ErrorCard kind={feed.error ?? "generic"} onRetry={feed.reload} />
          ) : feed.cards.length > 0 ? (
            <CardStack
              cards={feed.cards}
              disabled={sheetOpen}
              enterFrom={enterFrom}
              onDecide={onDecide}
              onGone={onGone}
              onDetails={setDetails}
              flyRef={flyRef}
            />
          ) : (
            <EndOfStack
              skippedCount={feed.skippedCount}
              filtered={categoryId !== null}
              canPropose={!!me && subscribed}
              onRestoreSkipped={feed.restoreSkipped}
              onClearFilter={() => setCategoryId(null)}
            />
          )}
        </section>

        <div className="mt-2">
          <Toast toast={toast} onClose={closeToast} />
        </div>

        <div className="mt-1">
          <SwipeButtons
            disabled={!topCard || showSkeleton || sheetOpen}
            onSwipe={(dir) => flyRef.current?.(dir)}
          />
        </div>
      </div>

      {sheets}
    </main>
  );
}

function BoardSkeleton() {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Загружаем события">
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={i}
          className="h-64 animate-pulse rounded-[1.5rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-5"
        >
          <div className="flex justify-between">
            <span className="h-6 w-20 rounded-full bg-white/10" />
            <span className="h-6 w-16 rounded-full bg-white/10" />
          </div>
          <span className="mt-5 block h-5 w-11/12 rounded bg-white/10" />
          <span className="mt-2 block h-5 w-3/4 rounded bg-white/10" />
        </li>
      ))}
    </ul>
  );
}

function CardSkeleton() {
  return (
    <div
      className="absolute inset-0 animate-pulse rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-6"
      role="status"
      aria-label="Загружаем события"
    >
      <div className="flex justify-between">
        <span className="h-6 w-24 rounded-full bg-white/10" />
        <span className="h-6 w-20 rounded-full bg-white/10" />
      </div>
      <span className="mt-6 block h-7 w-11/12 rounded-lg bg-white/10" />
      <span className="mt-2.5 block h-7 w-3/4 rounded-lg bg-white/10" />
      <span className="mt-5 block h-4 w-full rounded bg-white/5" />
      <span className="mt-2 block h-4 w-5/6 rounded bg-white/5" />
    </div>
  );
}

function ErrorCard({ kind, onRetry }: { kind: "network" | "generic"; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-center justify-center rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-6 text-center"
    >
      <OracleArc activeIndex={null} className="w-36 opacity-60" />
      <p className="mt-5 font-display text-xl font-600">
        {kind === "network" ? "Сигнала нет" : "Не удалось загрузить события"}
      </p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-haze">
        {kind === "network"
          ? "Показания появятся, как только вернётся сеть."
          : "Что-то на нашей стороне. Попробуйте ещё раз через минуту."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 min-h-11 rounded-full bg-signal px-5 text-sm font-700 text-ink-3"
      >
        Проверить снова
      </button>
    </div>
  );
}
