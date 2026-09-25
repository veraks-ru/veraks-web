"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAuth } from "@/components/app/AuthProvider";
import { NotificationBell } from "@/components/app/NotificationBell";

const LINKS = [
  { href: "/", label: "Лента" },
  { href: "/events", label: "События" },
  { href: "/leaderboards", label: "Лидерборды" },
  { href: "/divisions", label: "Дивизионы" },
  { href: "/seasons", label: "Сезон" },
  { href: "/pricing", label: "Тарифы" },
];

/**
 * Шапка светлой среды (события, лидерборды, профиль). active — текущий раздел.
 * tone="dark" — та же шапка для тёмной ленты на широком экране.
 *
 * На мобильном шапка однорядная: вся навигация ушла в нижнюю панель
 * (``BottomNav``), до которой достаёт большой палец. Здесь остаются только
 * логотип, колокольчик уведомлений и вход — всё остальное дублировало бы
 * панель и съедало высоту экрана.
 */
export function TopNav({ active, tone = "light" }: { active?: string; tone?: "light" | "dark" }) {
  const { me, loading, signOut } = useAuth();
  const router = useRouter();
  const dark = tone === "dark";

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const links = me
    ? [...LINKS, { href: "/leagues", label: "Лиги" }, { href: "/feed", label: "Подписки" }]
    : LINKS;

  return (
    <header
      className={`pt-safe sticky top-0 z-30 border-b backdrop-blur-md ${
        dark ? "border-[color:var(--color-edge)] bg-[color:var(--color-ink)]/85" : "border-line bg-surface/85"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-8">
          <Wordmark tone={dark ? "dark" : "light"} />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const on = active === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-full px-3.5 py-2 text-sm font-600 transition-colors ${
                    dark
                      ? on
                        ? "bg-white/10 text-white"
                        : "text-haze hover:text-white"
                      : on
                        ? "bg-paper text-graphite"
                        : "text-slate hover:text-graphite"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {loading ? (
          <span className={`size-8 animate-pulse rounded-full ${dark ? "bg-white/10" : "bg-line"}`} aria-hidden />
        ) : me ? (
          <div className="flex items-center gap-2">
            <NotificationBell tone={tone} />
            {["editor", "arbiter", "admin"].includes(me.role) && (
              <Link
                href="/admin"
                className={`hidden rounded-full border px-3 py-1.5 text-sm font-600 sm:inline ${
                  dark
                    ? "border-[color:var(--color-edge)] text-haze hover:text-white"
                    : "border-line text-slate hover:text-graphite"
                }`}
              >
                Админка
              </Link>
            )}
            {/* Кабинет и выход на мобильном живут в нижней панели. */}
            <Link
              href="/account"
              className={`hidden items-center gap-2.5 rounded-full border py-1 pr-3.5 pl-1 transition-colors md:flex ${
                dark ? "border-[color:var(--color-edge)] hover:bg-white/5" : "border-line hover:bg-paper"
              }`}
              aria-label="Мой кабинет"
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full text-sm font-700 ${
                  dark ? "bg-white text-ink-3" : "bg-graphite text-white"
                }`}
              >
                {(me.display_name || me.username)[0]?.toUpperCase()}
              </span>
              <span className={`text-sm font-600 ${dark ? "text-white" : ""}`}>@{me.username}</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className={`hidden rounded-full border px-3 py-1.5 text-sm font-600 md:inline ${
                dark
                  ? "border-[color:var(--color-edge)] text-haze hover:text-white"
                  : "border-line text-slate hover:text-graphite"
              }`}
            >
              Выйти
            </button>
          </div>
        ) : (
          // На мобильном «Войти» — отдельная вкладка внизу; вторая такая же
          // кнопка в шапке была бы дублем в одном экране.
          <Link
            href="/join"
            className="hidden rounded-full bg-signal px-4 py-2 text-sm font-700 text-ink-3 hover:bg-[color:var(--color-signal-deep)] hover:text-white md:inline-block"
          >
            Войти
          </Link>
        )}
      </div>

    </header>
  );
}
