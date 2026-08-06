// Общие состояния для страниц/секций с асинхронной загрузкой данных:
// «грузится» / «пусто» / «ошибка сети». Стиль — по образцу лучших примеров
// (app/events/page.tsx, app/leaderboards/page.tsx): карточка с пунктиром для
// пустоты, со сплошной рамкой + кнопкой «Повторить» для ошибки.

import { Spinner } from "./Spinner";

/** Спиннер по центру — для страниц/секций без собственного скелетона. */
export function LoadingState({ className = "py-16" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
    </div>
  );
}

/** Легитимная пустота (не ошибка): нет данных, но запрос выполнен успешно. */
export function EmptyState({
  title,
  hint,
  action,
  className = "py-14",
  bare = false,
}: {
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  /** Без своей рамки/фона — для секции, уже лежащей в карточке. */
  bare?: boolean;
}) {
  return (
    <div
      className={`text-center ${
        bare ? "" : "rounded-[var(--radius-card)] border border-dashed border-line bg-surface"
      } ${className}`}
    >
      <p className="font-display text-lg font-500">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-sm text-sm text-slate">{hint}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 rounded-full border border-line px-4 py-2 text-sm font-600 hover:bg-paper"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Сетевая/серверная ошибка — визуально отличается от EmptyState (сплошная,
 * не пунктирная рамка), чтобы не маскировать сбой под «просто пусто».
 * Кнопка «Повторить» показывается только если передан onRetry.
 */
export function ErrorState({
  title = "Не удалось загрузить данные",
  hint,
  onRetry,
  className = "py-14",
  bare = false,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
  className?: string;
  /** Без своей рамки/фона — для секции, уже лежащей в карточке. */
  bare?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`text-center ${bare ? "" : "rounded-[var(--radius-card)] border border-line bg-surface"} ${className}`}
    >
      <p className="font-display text-lg font-500">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-sm text-sm text-slate">{hint}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black"
        >
          Повторить
        </button>
      )}
    </div>
  );
}
