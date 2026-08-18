"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAuth } from "@/components/app/AuthProvider";

const LINKS = [
  { href: "/admin", label: "Дашборд", exact: true },
  { href: "/admin/events", label: "События" },
  { href: "/admin/seasons", label: "Сезоны" },
  { href: "/admin/prizes", label: "Призовой фонд" },
];

// Модерация пользователей и журнал аудита — доступны только admin
// (см. require_admin в backend/app/modules/identity/api/dependencies.py и
// backend/app/shared/audit/api/dependencies.py).
const ADMIN_ONLY_LINKS = [
  { href: "/admin/invites", label: "Приглашения" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/audit", label: "Аудит" },
];

export function AdminNav({ role, username }: { role: string; username?: string }) {
  const path = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const links = role === "admin" ? [...LINKS, ...ADMIN_ONLY_LINKS] : LINKS;
  const isActive = (l: { href: string; exact?: boolean }) =>
    l.exact ? path === l.href : path.startsWith(l.href);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <Wordmark tone="light" />
          <span className="rounded-full bg-graphite px-2 py-0.5 text-[0.65rem] font-700 tracking-wide text-white uppercase">
            Админка · {role}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {username && <span className="hidden text-sm text-slate sm:inline">@{username}</span>}
          <Link href="/events" className="text-sm font-600 text-slate hover:text-graphite">
            В приложение →
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-line px-3 py-1.5 text-sm font-600 text-slate hover:text-graphite"
          >
            Выйти
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-8">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l) ? "page" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-600 transition-colors ${
              isActive(l) ? "bg-paper text-graphite" : "text-slate hover:text-graphite"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
