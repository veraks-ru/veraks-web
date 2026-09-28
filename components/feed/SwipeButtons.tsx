"use client";

import { ButtonLink } from "@/components/ui/Button";
import { REVIEW_LABELS, SWIPE_LABELS, type SwipeDirection } from "@/lib/feed";

/**
 * Те же три ответа, что и жестом, — для тех, кому удобнее нажать, и для
 * доступности. Кольца: «Нет» красное, «Да» зелёное (решение владельца).
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
      <Round dir="left" label={SWIPE_LABELS.left} onClick={() => onSwipe("left")} disabled={disabled}>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </Round>
      <Round dir="up" label={SWIPE_LABELS.up} onClick={() => onSwipe("up")} disabled={disabled}>
        <ArrowUp />
      </Round>
      <Round dir="right" label={SWIPE_LABELS.right} onClick={() => onSwipe("right")} disabled={disabled}>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Round>
    </div>
  );
}

/**
 * Кнопки просмотра своих ответов: «Назад» и «Дальше» листают, между ними —
 * ссылка на страницу события, единственное место, где ответ можно изменить.
 * Никаких «Да/Нет»: их отсутствие само говорит, что здесь ничего не пишется.
 */
export function ReviewButtons({
  onSwipe,
  disabled,
  canBack,
  editHref,
}: {
  onSwipe: (dir: "up" | "down") => void;
  disabled: boolean;
  canBack: boolean;
  editHref: string | null;
}) {
  return (
    <div className="flex items-start justify-center gap-5">
      <Round dir="down" label={REVIEW_LABELS.down} onClick={() => onSwipe("down")} disabled={disabled || !canBack}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path d="M12 5v14m0 0 6-6m-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Round>
      <span className="flex w-40 flex-col items-center pt-1.5">
        {editHref ? (
          <ButtonLink href={editHref} variant="ghost-light" size="md" className="w-full whitespace-nowrap px-3">
            Изменить ответ
          </ButtonLink>
        ) : (
          <span className="h-11" />
        )}
      </span>
      <Round dir="up" label={REVIEW_LABELS.up} onClick={() => onSwipe("up")} disabled={disabled}>
        <ArrowUp />
      </Round>
    </div>
  );
}

function ArrowUp() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
      <path d="M12 19V5m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// На низких экранах (телефон в браузере с панелями) кнопки меньше, подписи
// прячутся — иначе ряд уезжает под нижнюю панель.
const RING: Record<SwipeDirection, string> = {
  left: "size-14 [@media(max-height:600px)]:size-12 border-[color:var(--color-no)] text-[color:var(--color-no-ink)]",
  right: "size-14 [@media(max-height:600px)]:size-12 border-[color:var(--color-yes)] text-[color:var(--color-yes-ink)]",
  up: "size-12 [@media(max-height:600px)]:size-10 border-line text-slate",
  down: "size-12 [@media(max-height:600px)]:size-10 border-line text-slate",
};

function Round({
  dir,
  label,
  onClick,
  disabled,
  children,
}: {
  dir: SwipeDirection;
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="flex w-16 flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={`flex items-center justify-center rounded-full border-2 bg-surface shadow-sm transition-transform active:scale-95 disabled:opacity-40 ${RING[dir]}`}
      >
        {children}
      </button>
      <span className="text-[0.7rem] font-600 text-slate [@media(max-height:600px)]:hidden">{label}</span>
    </span>
  );
}
