"use client";

import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { useCategoryList } from "@/lib/api/useCategories";
import { pluralize } from "@/lib/format";
import type { ApiMe } from "@/lib/api/dto";

/** Шапка ленты на телефоне: логотип, счётчик за сегодня, строка гостя, категории. */
export function FeedHeader({
  me,
  dailyCount,
  waiting,
  categoryId,
  onCategory,
  onOpenGate,
}: {
  me: ApiMe | null;
  dailyCount: number;
  /** Свайпы гостя, ждущие входа. */
  waiting: number;
  categoryId: string | null;
  onCategory: (id: string | null) => void;
  onOpenGate: () => void;
}) {
  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <Wordmark tone="light" />
        {me && <DailyCounter count={dailyCount} />}
      </div>
      {!me && (
        <div className="mt-3">
          <GuestLine waiting={waiting} onOpenGate={onOpenGate} />
        </div>
      )}
      <div className="mt-4">
        <CategoryStrip categoryId={categoryId} onCategory={onCategory} />
      </div>
    </header>
  );
}

/** «12 сегодня» — сколько ответов человек дал за день. */
export function DailyCounter({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="text-sm text-slate"
      aria-label={`${count} ${pluralize(count, ["прогноз", "прогноза", "прогнозов"])} за сегодня`}
    >
      <span className="num font-600 text-graphite">{count}</span> сегодня
    </span>
  );
}

/** Строка для гостя: как пользоваться и что ответы ждут входа. */
export function GuestLine({
  waiting,
  onOpenGate,
  mode = "swipe",
}: {
  waiting: number;
  onOpenGate: () => void;
  /** Стопка со свайпом на телефоне или доска с кнопками на широком экране. */
  mode?: "swipe" | "board";
}) {
  return (
    <p className="text-sm leading-relaxed text-slate">
      {waiting > 0 ? (
        <button type="button" onClick={onOpenGate} className="font-600 text-[color:var(--color-signal-deep)]">
          {waiting} {pluralize(waiting, ["ответ ждёт", "ответа ждут", "ответов ждут"])} входа — войти
        </button>
      ) : (
        <>
          {mode === "board"
            ? "Под каждым событием — «Нет» или «Да». Войдите, чтобы ответы шли в зачёт."
            : "Влево — нет, вправо — да. Войдите, чтобы ответы шли в зачёт."}{" "}
          <Link href="/about" className="font-600 text-graphite underline underline-offset-2">
            О проекте
          </Link>
        </>
      )}
    </p>
  );
}

/** Лента категорий: «Все» и справочник без запрещённых тем. */
export function CategoryStrip({
  categoryId,
  onCategory,
}: {
  categoryId: string | null;
  onCategory: (id: string | null) => void;
}) {
  const categories = useCategoryList().filter((c) => !c.is_restricted);
  if (categories.length === 0) return null;
  return (
    <div className="filter-strip" role="group" aria-label="Категории">
      <Chip on={categoryId === null} onClick={() => onCategory(null)}>
        Все
      </Chip>
      {categories.map((c) => (
        <Chip key={c.id} on={categoryId === c.id} onClick={() => onCategory(c.id)}>
          {c.title}
        </Chip>
      ))}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-10 rounded-full px-3.5 text-sm font-600 transition-colors ${
        on ? "bg-graphite text-white" : "border border-line bg-surface text-slate hover:text-graphite"
      }`}
    >
      {children}
    </button>
  );
}
