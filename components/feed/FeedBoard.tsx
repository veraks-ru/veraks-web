"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MiniConsensus } from "@/components/events/MiniConsensus";
import { deadlineLabel, nPeople } from "@/lib/format";
import { GRADES, indexOfGrade } from "@/lib/confidence";
import { SWIPE_LABELS, gradeForDirection, type SwipeDirection } from "@/lib/feed";
import type { FeedCard } from "@/lib/types";

const LEAVE_MS = 220;

/**
 * Доска для широкого экрана: те же карточки ленты сеткой, у каждой свои
 * «Нет / Пропустить / Да». Ответил — карточка гаснет, сетка сдвигается;
 * отмена живёт в тосте внизу. Страницы подгружаются, когда прокрутка
 * подходит к концу.
 */
export function FeedBoard({
  cards,
  hasMore,
  loadingMore,
  disabled,
  onLoadMore,
  onDecide,
  onGone,
  onDetails,
}: {
  cards: FeedCard[];
  hasMore: boolean;
  loadingMore: boolean;
  disabled: boolean;
  onLoadMore: () => void;
  onDecide: (dir: SwipeDirection, card: FeedCard) => boolean | void;
  onGone: (dir: SwipeDirection, card: FeedCard) => void;
  onDetails: (card: FeedCard) => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loadingMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, onLoadMore, cards.length]);

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Открытые события">
        {cards.map((card) => (
          <BoardCard
            key={card.id}
            card={card}
            disabled={disabled}
            onDecide={onDecide}
            onGone={onGone}
            onDetails={() => onDetails(card)}
          />
        ))}
      </ul>
      <div ref={sentinel} className="h-px" aria-hidden />
      {loadingMore && <p className="py-6 text-center text-sm text-haze-dim">Загружаем ещё…</p>}
    </>
  );
}

function BoardCard({
  card,
  disabled,
  onDecide,
  onGone,
  onDetails,
}: {
  card: FeedCard;
  disabled: boolean;
  onDecide: (dir: SwipeDirection, card: FeedCard) => boolean | void;
  onGone: (dir: SwipeDirection, card: FeedCard) => void;
  onDetails: () => void;
}) {
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDir = useRef<SwipeDirection | null>(null);
  const gone = useRef(onGone);
  gone.current = onGone;

  const decide = (dir: SwipeDirection) => {
    if (disabled || leaving) return;
    if (onDecide(dir, card) === false) return;
    setLeaving(dir);
    pendingDir.current = dir;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(
      () => {
        pendingDir.current = null;
        gone.current(dir, card);
      },
      reduced ? 0 : LEAVE_MS,
    );
  };

  // Карточку размонтировали, пока она гасла (сменили категорию, дозаписался
  // ящик): решение уже принято и не должно пропасть.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendingDir.current) {
        const dir = pendingDir.current;
        pendingDir.current = null;
        gone.current(dir, card);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const stamp =
    leaving && leaving !== "up" ? GRADES[indexOfGrade(gradeForDirection(leaving))].label : SWIPE_LABELS.up;
  const stampColor =
    leaving === "left" ? "var(--color-cool-ink)" : leaving === "right" ? "var(--color-warm-ink)" : "var(--color-slate)";

  return (
    <li
      className={`relative transition-[opacity,transform] duration-200 ${leaving ? "scale-95 opacity-0" : ""}`}
      aria-hidden={!!leaving || undefined}
    >
      <article className="flex h-full flex-col rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(20,23,28,0.4)]">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate rounded-full bg-paper px-2.5 py-1 font-600 text-slate">{card.category.title}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="font-600 text-[color:var(--color-warm-ink)]">{deadlineLabel(card.closesAt)}</span>
            <button
              type="button"
              onClick={onDetails}
              aria-label="Подробнее"
              className="-my-1 flex size-9 items-center justify-center rounded-full border border-line text-[color:var(--color-signal-deep)]"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.75" />
                <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        </div>

        <h3 className="mt-3 line-clamp-4 font-display text-[1.1rem] leading-[1.25] font-600 text-balance text-graphite">
          <Link href={`/events/${card.slug}`} className="hover:text-[color:var(--color-signal-deep)]">
            {card.title}
          </Link>
        </h3>
        {card.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate">{card.description}</p>
        )}

        <div className="mt-auto border-t border-line pt-3">
          {card.forecasters > 0 ? (
            <MiniConsensus
              crowd={card.crowd}
              aside={<span className="num shrink-0 text-slate">{nPeople(card.forecasters)}</span>}
            />
          ) : (
            <p className="text-xs text-slate">Никто ещё не высказался — ваш прогноз будет первым.</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => decide("left")}
              disabled={disabled}
              className="h-10 rounded-full border-2 border-[color:var(--color-cool-ink)] px-4 text-sm font-700 text-[color:var(--color-cool-ink)] transition-colors hover:bg-[color:var(--color-cool)]/15 disabled:opacity-40"
            >
              {SWIPE_LABELS.left}
            </button>
            <button
              type="button"
              onClick={() => decide("up")}
              disabled={disabled}
              className="h-10 rounded-full px-3 text-sm font-600 text-slate transition-colors hover:text-graphite disabled:opacity-40"
            >
              {SWIPE_LABELS.up}
            </button>
            <button
              type="button"
              onClick={() => decide("right")}
              disabled={disabled}
              className="h-10 rounded-full border-2 border-[color:var(--color-warm-ink)] px-4 text-sm font-700 text-[color:var(--color-warm-ink)] transition-colors hover:bg-[color:var(--color-warm)]/15 disabled:opacity-40"
            >
              {SWIPE_LABELS.right}
            </button>
          </div>
        </div>
      </article>

      {leaving && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-2xl font-700"
          style={{ color: stampColor }}
        >
          {stamp}
        </span>
      )}
    </li>
  );
}
