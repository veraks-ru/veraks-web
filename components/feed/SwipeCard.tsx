"use client";

import { useEffect, type MutableRefObject } from "react";
import { MiniConsensus } from "@/components/events/MiniConsensus";
import { deadlineLabel, nPeople } from "@/lib/format";
import { SWIPE_LABELS, type SwipeDirection } from "@/lib/feed";
import type { FeedCard } from "@/lib/types";
import { swipeBaseStyle, useSwipe } from "./useSwipe";

/**
 * Карточка события в стопке. Верхняя ловит жест, остальные лежат под ней
 * чуть меньше и ниже — видно, что за этой есть следующие.
 *
 * Картинок у событий нет, поэтому карточка типографская: вопрос набран
 * Unbounded — это и есть «большой момент» экрана, ради которого человек
 * здесь. Ответ толпы — словом и столбиками, без процентов (DESIGN.md).
 */
export function SwipeCard({
  card,
  top,
  depth,
  disabled,
  enterFrom,
  onDecide,
  onGone,
  onDetails,
  flyRef,
}: {
  card: FeedCard;
  top: boolean;
  depth: number;
  disabled: boolean;
  enterFrom: SwipeDirection | null;
  onDecide: (dir: SwipeDirection) => boolean | void;
  onGone: (dir: SwipeDirection) => void;
  onDetails: () => void;
  /** Экран дёргает верхнюю карточку с клавиатуры и кнопок через этот ref. */
  flyRef: MutableRefObject<((dir: SwipeDirection) => void) | null>;
}) {
  const swipe = useSwipe({
    onDecide,
    onGone,
    disabled: disabled || !top,
    enterFrom: top ? enterFrom : null,
  });

  useEffect(() => {
    if (!top) return;
    flyRef.current = swipe.fly;
    return () => {
      if (flyRef.current === swipe.fly) flyRef.current = null;
    };
  }, [top, swipe.fly, flyRef]);

  const stacked = top
    ? undefined
    : {
        transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.04})`,
        opacity: 1 - depth * 0.18,
      };

  return (
    <div
      ref={swipe.ref}
      {...(top ? swipe.handlers : {})}
      aria-hidden={!top}
      className="absolute inset-0 transition-[transform,opacity] duration-200"
      style={{ ...(top ? swipeBaseStyle : {}), ...stacked, zIndex: 3 - depth }}
    >
      <article className="flex h-full flex-col rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/85 p-6 shadow-[0_28px_60px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate rounded-full bg-white/10 px-2.5 py-1 font-600 text-haze">
            {card.category.title}
          </span>
          <span className="shrink-0 font-600 text-warm">{deadlineLabel(card.closesAt)}</span>
        </div>

        <h2 className="mt-5 font-display text-[1.55rem] leading-[1.22] font-600 text-balance text-white sm:text-[1.7rem]">
          {card.title}
        </h2>

        {card.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-haze hidden [@media(min-height:700px)]:block">
            {card.description}
          </p>
        )}

        <div className="mt-auto border-t border-[color:var(--color-edge)] pt-4">
          {card.forecasters > 0 ? (
            <MiniConsensus crowd={card.crowd} tone="dark" />
          ) : (
            <p className="text-sm text-haze">Никто ещё не высказался — ваш прогноз будет первым.</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="num text-xs text-haze-dim">
              {card.forecasters > 0 ? nPeople(card.forecasters) : ""}
            </span>
            <button
              type="button"
              onClick={onDetails}
              className="min-h-11 rounded-full px-3 text-sm font-600 text-signal"
            >
              Подробнее
            </button>
          </div>
        </div>
      </article>

      {top && (
        <>
          <Stamp side="left" tone="warm" label={SWIPE_LABELS.right} varName="--swipe-right" />
          <Stamp side="right" tone="cool" label={SWIPE_LABELS.left} varName="--swipe-left" />
          <Stamp side="bottom" tone="haze" label={SWIPE_LABELS.up} varName="--swipe-up" />
        </>
      )}
    </div>
  );
}

/**
 * Штамп ответа, проявляющийся по ходу жеста. «Да» слева (карточка едет
 * вправо и открывает левый край), «Нет» справа, «Пропустить» внизу.
 * Цвета спектра убеждения: warm — да, cool — нет; не красный и не зелёный.
 */
function Stamp({
  side,
  tone,
  label,
  varName,
}: {
  side: "left" | "right" | "bottom";
  tone: "warm" | "cool" | "haze";
  label: string;
  varName: string;
}) {
  const place =
    side === "left"
      ? "top-6 left-6 -rotate-12"
      : side === "right"
        ? "top-6 right-6 rotate-12"
        : "bottom-24 left-1/2 -translate-x-1/2";
  const color = `var(--color-${tone})`;
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute ${place} rounded-2xl border-[3px] px-3.5 py-1 font-display text-2xl font-700 tracking-wide`}
      style={{ opacity: `var(${varName}, 0)`, borderColor: color, color }}
    >
      {label}
    </span>
  );
}
