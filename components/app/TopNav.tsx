"use client";

import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAuth } from "@/components/app/AuthProvider";

const LINKS = [
  { href: "/events", label: "События" },
  { href: "/leaderboards", label: "Лидерборды" },
  { href: "/seasons", label: "Сезон" },
];

/** Шапка светлой среды (лента, лидерборды, профиль). active — текущий раздел. */
export function TopNav({ active }: { active?: string }) {
  const { me, loading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-8">
          <Wordmark tone="light" />
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const on = active === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-full px-3.5 py-2 text-sm font-600 transition-colors ${
                    on ? "bg-paper text-graphite" : "text-slate hover:text-graphite"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {loading ? (
          <span className="size-8 animate-pulse rounded-full bg-line" aria-hidden />
        ) : me ? (
          <div className="flex items-center gap-2">
            {["editor", "arbiter", "admin"].includes(me.role) && (
              <Link
                href="/admin"
                className="hidden rounded-full border border-line px-3 py-1.5 text-sm font-600 text-slate hover:text-graphite sm:inline"
              >
                Админка
              </Link>
            )}
            <Link
              href={`/u/${me.username}`}
              className="flex items-center gap-2.5 rounded-full border border-line py-1 pr-3.5 pl-1 transition-colors hover:bg-paper"
              aria-label="Мой профиль"
            >
            <span className="flex size-8 items-center justify-center rounded-full bg-graphite text-sm font-700 text-white">
              {(me.display_name || me.username)[0]?.toUpperCase()}
            </span>
              <span className="hidden text-sm font-600 sm:inline">@{me.username}</span>
            </Link>
          </div>
        ) : (
          <Link
            href="/join"
            className="rounded-full bg-signal px-4 py-2 text-sm font-700 text-ink-3 hover:bg-[color:var(--color-signal-deep)] hover:text-white"
          >
            Войти
          </Link>
        )}
      </div>

      <nav className="flex items-center gap-1 border-t border-line px-3 py-2 md:hidden">
        {LINKS.map((l) => {
          const on = active === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-600 ${
                on ? "bg-paper text-graphite" : "text-slate"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
