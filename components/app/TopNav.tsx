import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

const LINKS = [
  { href: "/events", label: "События" },
  { href: "/leaderboards", label: "Лидерборды" },
  { href: "/seasons", label: "Сезон" },
];

/**
 * Шапка светлой среды (лента, лидерборды, профиль). active — текущий раздел.
 */
export function TopNav({ active }: { active?: string }) {
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

        <Link
          href="/u/kalibr"
          className="flex items-center gap-2.5 rounded-full border border-line py-1 pr-3.5 pl-1 transition-colors hover:bg-paper"
          aria-label="Мой профиль"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-graphite text-sm font-700 text-white">
            K
          </span>
          <span className="hidden text-sm font-600 sm:inline">@kalibr</span>
        </Link>
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
