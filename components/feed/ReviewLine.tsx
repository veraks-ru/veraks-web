"use client";

/**
 * Строка над стопкой в просмотре своих ответов. Говорит главное — здесь
 * ничего не записывается — и даёт выход обратно к новым событиям.
 */
export function ReviewLine({ onExit }: { onExit: () => void }) {
  return (
    <p className="flex items-center justify-between gap-3 text-sm leading-relaxed text-slate" data-testid="review-line">
      <span>
        <span className="font-600 text-graphite">Мои ответы.</span> Свайп только листает, ответ не меняется.
      </span>
      <button
        type="button"
        onClick={onExit}
        className="shrink-0 font-600 text-[color:var(--color-signal-deep)] underline underline-offset-2"
      >
        К новым
      </button>
    </p>
  );
}
