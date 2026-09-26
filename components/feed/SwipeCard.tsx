"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import { MiniConsensus } from "@/components/events/MiniConsensus";
import { deadlineLabel, nPeople } from "@/lib/format";
import { SWIPE_LABELS, type SwipeDirection } from "@/lib/feed";
import type { FeedCard } from "@/lib/types";
import { swipeBaseStyle, useSwipe } from "./useSwipe";

/**
 * Карточка события в стопке. Верхняя ловит жест, остальные лежат под ней
 * чуть меньше и ниже — видно, что за этой есть следующие.
 *
 * Светлая среда «прибора»: лента живёт в браузере между его панелями, и
 * белая карточка на бумажном фоне сливается с ним, а не спорит. Картинок у
 * событий нет, поэтому карточка типографская: вопрос набран Unbounded —
 * это и есть «большой момент» экрана. Ответ толпы — словом и столбиками,
 * без процентов (DESIGN.md).
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
  onOpen,
  flyRef,
}: {
  card: FeedCard;
  top: boolean;
  depth: number;
  disabled: boolean;
  enterFrom: SwipeDirection | null;
  onDecide: (dir: SwipeDirection, card: FeedCard) => boolean | void;
  onGone: (dir: SwipeDirection, card: FeedCard) => void;
  onDetails: () => void;
  /** Тап по карточке — на страницу события. */
  onOpen: () => void;
  /** Экран дёргает верхнюю карточку с клавиатуры и кнопок через этот ref. */
  flyRef: MutableRefObject<((dir: SwipeDirection) => void) | null>;
}) {
  const swipe = useSwipe({
    onDecide: (dir) => onDecide(dir, card),
    onGone: (dir) => onGone(dir, card),
    onTap: onOpen,
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

  // Место между заголовком и блоком толпы делят описание и критерий «что
  // считается „да“»: сначала описание столько строк, сколько ему нужно,
  // остаток — критерию; последняя строка каждого — с многоточием. Число
  // строк считается по фактической высоте бокса (у карточки фиксированная
  // высота, поэтому бокс от содержимого не зависит).
  const descBox = useRef<HTMLDivElement>(null);
  const descText = useRef<HTMLParagraphElement>(null);
  const critText = useRef<HTMLParagraphElement>(null);
  const [fit, setFit] = useState<{ desc: number; crit: number } | null>(null);
  useLayoutEffect(() => {
    const box = descBox.current;
    if (!box) return;
    const measure = () => {
      const desc = descText.current;
      const crit = critText.current;
      const probe = desc ?? crit;
      if (!probe) return;
      const lineHeight = parseFloat(getComputedStyle(probe).lineHeight) || 22;
      const total = Math.max(0, Math.floor(box.clientHeight / lineHeight));
      let d = 0;
      if (desc) {
        // Меряем полную высоту текста без обрезки, затем сами ставим итог:
        // React переписывает inline-стили только при смене своих значений.
        desc.style.display = "-webkit-box";
        desc.style.webkitLineClamp = "999";
        d = Math.min(total, Math.round(desc.scrollHeight / lineHeight));
        desc.style.webkitLineClamp = String(Math.max(d, 1));
        desc.style.display = d === 0 ? "none" : "-webkit-box";
      }
      // Подпись критерия и отступ занимают примерно две строки.
      const c = crit ? Math.max(0, total - d - 2) : 0;
      if (crit) {
        crit.style.webkitLineClamp = String(Math.max(c, 1));
        const wrap = crit.parentElement;
        if (wrap) wrap.style.display = c === 0 ? "none" : "";
      }
      setFit((prev) => (prev && prev.desc === d && prev.crit === c ? prev : { desc: d, crit: c }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // Реальные формулировки бывают в пять строк: чем длиннее, тем мельче
  // кегль, и жёсткий предел строк, чтобы карточка не разъезжалась.
  const titleSize =
    card.title.length > 70
      ? "text-[1.2rem] leading-[1.25]"
      : card.title.length > 45
        ? "text-[1.35rem] leading-[1.22]"
        : "text-[1.55rem] leading-[1.2] sm:text-[1.7rem]";

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
      inert={!top || undefined}
      className="absolute inset-0 transition-[transform,opacity] duration-200"
      style={{ ...(top ? swipeBaseStyle : {}), ...stacked, zIndex: 3 - depth }}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_18px_50px_-30px_rgba(20,23,28,0.45)] sm:p-6">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate rounded-full bg-paper px-2.5 py-1 font-600 text-slate">
            {card.category.title}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-600 text-[color:var(--color-warm-ink)]">{deadlineLabel(card.closesAt)}</span>
            <button
              type="button"
              onClick={onDetails}
              aria-label="Подробнее"
              className="-my-1 flex size-11 items-center justify-center rounded-full border border-line text-[color:var(--color-signal-deep)]"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.75" />
                <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        </div>

        <h2 className={`mt-3 shrink-0 line-clamp-5 font-display font-600 text-balance text-graphite ${titleSize}`}>
          {card.title}
        </h2>

        {(card.description || card.resolutionCriteria) && (
          <div ref={descBox} className="mt-2.5 min-h-0 flex-1 overflow-hidden">
            {card.description && (
              <p
                ref={descText}
                className="line-clamp-3 text-sm leading-relaxed text-slate"
                style={{
                  WebkitLineClamp: fit ? fit.desc : 3,
                  display: fit && fit.desc === 0 ? "none" : undefined,
                }}
              >
                {card.description}
              </p>
            )}
            {card.resolutionCriteria && (
              <div
                className={card.description ? "mt-2.5" : ""}
                style={{ display: fit && fit.crit === 0 ? "none" : undefined }}
              >
                <p className="text-xs font-600 text-slate">Что считается «да»</p>
                <p
                  ref={critText}
                  className="line-clamp-3 text-sm leading-relaxed text-slate"
                  style={{ WebkitLineClamp: fit ? fit.crit : 3 }}
                >
                  {card.resolutionCriteria}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto shrink-0 border-t border-line pt-3">
          {card.forecasters > 0 ? (
            <MiniConsensus
              crowd={card.crowd}
              aside={<span className="num shrink-0 text-slate">{nPeople(card.forecasters)}</span>}
            />
          ) : (
            <p className="text-sm text-slate">Никто ещё не высказался — ваш прогноз будет первым.</p>
          )}
        </div>
      </article>

      {top && (
        <>
          <Stamp side="left" tone="warm-ink" label={SWIPE_LABELS.right} varName="--swipe-right" />
          <Stamp side="right" tone="cool-ink" label={SWIPE_LABELS.left} varName="--swipe-left" />
          <Stamp side="bottom" tone="slate" label={SWIPE_LABELS.up} varName="--swipe-up" />
        </>
      )}
    </div>
  );
}

/**
 * Штамп ответа, проявляющийся по ходу жеста. «Да» слева (карточка едет
 * вправо и открывает левый край), «Нет» справа, «Пропустить» внизу.
 * Чернильные тона спектра убеждения: warm-ink — да, cool-ink — нет; не
 * красный и не зелёный.
 */
function Stamp({
  side,
  tone,
  label,
  varName,
}: {
  side: "left" | "right" | "bottom";
  tone: "warm-ink" | "cool-ink" | "slate";
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
      className={`pointer-events-none absolute ${place} rounded-2xl border-[3px] bg-surface/90 px-3.5 py-1 font-display text-2xl font-700 tracking-wide`}
      style={{ opacity: `var(${varName}, 0)`, borderColor: color, color }}
    >
      {label}
    </span>
  );
}
