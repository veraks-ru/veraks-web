"use client";

import { SWIPE_LABELS, type SwipeDirection } from "@/lib/feed";

/**
 * Те же три ответа, что и жестом, — для тех, кому удобнее нажать, и для
 * доступности. Кольца в цветах спектра убеждения: cool — нет, warm — да.
 */
export function SwipeButtons({
  onSwipe,
  disabled,
}: {
  onSwipe: (dir: SwipeDirection) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-center gap-6">
      <Round dir="left" onClick={() => onSwipe("left")} disabled={disabled}>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </Round>
      <Round dir="up" onClick={() => onSwipe("up")} disabled={disabled}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path d="M12 19V5m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Round>
      <Round dir="right" onClick={() => onSwipe("right")} disabled={disabled}>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Round>
    </div>
  );
}

// На низких экранах (телефон в браузере с панелями) кнопки меньше, подписи
// прячутся — иначе ряд уезжает под нижнюю панель.
const RING: Record<SwipeDirection, string> = {
  left: "size-14 [@media(max-height:600px)]:size-12 border-[color:var(--color-cool)] text-[color:var(--color-cool)]",
  right: "size-14 [@media(max-height:600px)]:size-12 border-[color:var(--color-warm)] text-[color:var(--color-warm)]",
  up: "size-12 [@media(max-height:600px)]:size-10 border-[color:var(--color-edge)] text-haze",
};

function Round({
  dir,
  onClick,
  disabled,
  children,
}: {
  dir: SwipeDirection;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="flex w-16 flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={SWIPE_LABELS[dir]}
        disabled={disabled}
        onClick={onClick}
        className={`flex items-center justify-center rounded-full border-2 bg-[color:var(--color-ink-2)]/60 transition-transform active:scale-95 disabled:opacity-40 ${RING[dir]}`}
      >
        {children}
      </button>
      <span className="text-[0.7rem] font-600 text-haze-dim [@media(max-height:600px)]:hidden">
        {SWIPE_LABELS[dir]}
      </span>
    </span>
  );
}
