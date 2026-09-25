"use client";

import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { useCategoryList } from "@/lib/api/useCategories";
import { pluralize } from "@/lib/format";
import type { ApiMe } from "@/lib/api/dto";

/**
 * Шапка ленты: логотип, счётчик за сегодня, лента категорий и строка гостя.
 * На десктопе здесь же ссылки на разделы — TopNav светлая и сюда не ложится.
 */
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
  const categories = useCategoryList().filter((c) => !c.is_restricted);

  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <Wordmark tone="dark" />
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Разделы">
            <TopLink href="/events">События</TopLink>
            <TopLink href="/leaderboards">Топ</TopLink>
            {me ? (
              <TopLink href="/account">@{me.username}</TopLink>
            ) : (
              <TopLink href="/join?next=%2F">Войти</TopLink>
            )}
          </nav>
          {me && dailyCount > 0 && (
            <span className="text-sm text-haze" aria-label={`${dailyCount} ${pluralize(dailyCount, ["прогноз", "прогноза", "прогнозов"])} за сегодня`}>
              <span className="num font-600 text-white">{dailyCount}</span> сегодня
            </span>
          )}
        </div>
      </div>

      {!me && (
        <p className="mt-3 text-sm leading-relaxed text-haze">
          {waiting > 0 ? (
            <button type="button" onClick={onOpenGate} className="font-600 text-signal">
              {waiting} {pluralize(waiting, ["ответ ждёт", "ответа ждут", "ответов ждут"])} входа — войти
            </button>
          ) : (
            <>
              Влево — нет, вправо — да. Войдите, чтобы ответы шли в зачёт.{" "}
              <Link href="/about" className="font-600 text-white underline underline-offset-2">
                О проекте
              </Link>
            </>
          )}
        </p>
      )}

      {categories.length > 0 && (
        <div className="filter-strip mt-4" role="group" aria-label="Категории">
          <Chip on={categoryId === null} onClick={() => onCategory(null)}>
            Все
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} on={categoryId === c.id} onClick={() => onCategory(c.id)}>
              {c.title}
            </Chip>
          ))}
        </div>
      )}
    </header>
  );
}

function TopLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-full px-3 py-2 text-sm font-600 text-haze hover:text-white">
      {children}
    </Link>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 rounded-full px-3.5 text-sm font-600 transition-colors ${
        on ? "bg-white text-ink-3" : "border border-[color:var(--color-edge)] text-haze hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
