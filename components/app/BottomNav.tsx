"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/app/AuthProvider";

/**
 * Нижняя навигация мобильного приложения.
 *
 * Активный раздел помечен светящейся точкой над иконкой — то же «показание»,
 * что у прибора на дуге уверенности. Дугу на всю панель сознательно не рисуем:
 * пять разделов не шкала, и превращать их в градации было бы декорацией,
 * притворяющейся смыслом.
 *
 * Разделов больше пяти, поэтому пятая вкладка — «Ещё» с листом снизу
 * (стандартный приём, когда навигация не влезает). Так шапка на мобильном
 * остаётся однорядной: второй ряд ссылок съедал высоту экрана на каждой
 * странице ради одной-двух ссылок.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS = {
  events: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  board: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <path d="M6 20v-6M12 20V6M18 20v-9" />
    </svg>
  ),
  season: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <path d="M4 12h16M4 8v8M20 8v8" />
      <circle cx="15" cy="12" r="2.6" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </svg>
  ),
  pricing: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <path d="M4 9.5 12 4l8 5.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <circle cx="5.5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18.5" cy="12" r="1.4" />
    </svg>
  ),
  feed: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <path d="M3 13h4l2.5-6 3 12L15 13h6" />
    </svg>
  ),
  divisions: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <path d="M5 18h14M7 18v-4M12 18V8M17 18v-7" />
    </svg>
  ),
  leagues: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="11" r="2.4" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15 19a4 4 0 0 1 5.5-3.7" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
      <path d="M12 3.5 19 6v5.5c0 4-3 7.2-7 8.5-4-1.3-7-4.5-7-8.5V6z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </svg>
  ),
};

// Разделы, где нижняя панель мешает: тёмная «сумеречная» среда (онбординг,
// экран прогноза, шеринг) держит фокус на одном действии, а у админки своя
// раскладка с собственной навигацией.
const HIDDEN_PREFIXES = ["/join", "/onboarding", "/auth", "/admin", "/offline"];
const HIDDEN_EXACT = ["/"];

function isHidden(pathname: string): boolean {
  if (HIDDEN_EXACT.includes(pathname)) return true;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // Карточка события — экран ввода прогноза, тёмная среда во всю высоту.
  // Список /events панель показывает.
  return /^\/events\/[^/]+/.test(pathname);
}

/** Видна ли панель на этом маршруте — нужно ещё и для отступа под контентом. */
export function useBottomNavVisible(): boolean {
  const pathname = usePathname() || "/";
  return !isHidden(pathname);
}

/** Разделы нижней панели — чтобы шапка их не дублировала. */
export const BOTTOM_NAV_HREFS = new Set([
  "/events",
  "/leaderboards",
  "/seasons",
  "/pricing",
  "/account",
  "/feed",
  "/divisions",
  "/leagues",
]);

export function BottomNav() {
  const pathname = usePathname() || "/";
  const { me, signOut } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // Лист закрывается при переходе: иначе он остаётся поверх новой страницы.
  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  if (isHidden(pathname)) return null;

  const isOn = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const secondary = me
    ? [
        { href: "/feed", label: "Лента", icon: ICONS.feed },
        { href: "/divisions", label: "Дивизионы", icon: ICONS.divisions },
        { href: "/leagues", label: "Лиги", icon: ICONS.leagues },
        { href: "/pricing", label: "Тарифы", icon: ICONS.pricing },
        ...(["editor", "arbiter", "admin"].includes(me.role)
          ? [{ href: "/admin", label: "Админка", icon: ICONS.admin }]
          : []),
      ]
    : [{ href: "/divisions", label: "Дивизионы", icon: ICONS.divisions }];

  const tabs = [
    { href: "/events", label: "События", icon: ICONS.events },
    { href: "/leaderboards", label: "Топ", icon: ICONS.board },
    { href: "/seasons", label: "Сезон", icon: ICONS.season },
    me
      ? { href: null, label: "Ещё", icon: ICONS.more }
      : { href: "/pricing", label: "Тарифы", icon: ICONS.pricing },
    me
      ? { href: "/account", label: "Кабинет", icon: ICONS.account }
      : { href: "/join", label: "Войти", icon: ICONS.account },
  ];

  const tabClass = (on: boolean) =>
    `relative flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 transition-colors ${
      on ? "text-graphite" : "text-slate"
    }`;

  const Reading = ({ on }: { on: boolean }) => (
    <span
      aria-hidden
      className={`absolute top-1 size-1.5 rounded-full transition-opacity ${
        on
          ? "bg-[color:var(--color-signal-deep)] opacity-100 shadow-[0_0_8px_var(--color-signal)]"
          : "opacity-0"
      }`}
    />
  );

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-graphite/40 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-label="Ещё разделы"
            className="pb-safe absolute inset-x-0 bottom-0 rounded-t-[1.5rem] border-t border-line bg-surface pt-2 shadow-2xl"
          >
            <span
              aria-hidden
              className="mx-auto mb-1 block h-1 w-9 rounded-full bg-line"
            />
            <ul className="px-2 pb-[4.25rem]">
              {secondary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-600 text-graphite active:bg-paper"
                  >
                    <span className="text-slate">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={async () => {
                    setMoreOpen(false);
                    await signOut();
                    router.push("/");
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-600 text-slate active:bg-paper"
                >
                  <svg viewBox="0 0 24 24" className="size-5" aria-hidden {...stroke}>
                    <path d="M15 5.5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1.5" />
                    <path d="M11 12h9m0 0-3-3m3 3-3 3" />
                  </svg>
                  Выйти
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      <nav
        aria-label="Разделы"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {tabs.map((tab) => (
            <li key={tab.label} className="flex flex-1">
              {tab.href ? (
                <Link
                  href={tab.href}
                  aria-current={isOn(tab.href) ? "page" : undefined}
                  className={tabClass(isOn(tab.href))}
                >
                  <Reading on={isOn(tab.href)} />
                  {tab.icon}
                  <span className="text-[0.6875rem] leading-none font-600">
                    {tab.label}
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  onClick={() => setMoreOpen((v) => !v)}
                  className={tabClass(moreOpen)}
                >
                  {/* Точки-показания у «Ещё» нет намеренно: она отмечает, где вы
                      находитесь, а лист — не раздел. Иначе на панели горели бы
                      два показания сразу. */}
                  {tab.icon}
                  <span className="text-[0.6875rem] leading-none font-600">
                    {tab.label}
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
