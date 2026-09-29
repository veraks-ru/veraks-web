"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChromeTone } from "@/lib/chromeTone";
import { ackCookieNotice, useCookieNoticeAcked } from "@/lib/cookieNotice";

/**
 * Уведомление о cookie (политика ПДн, п. 9 — там и про Яндекс Метрику).
 * Показывается до первого «Понятно». Всегда внизу (над нижней панелью на
 * телефоне): сверху плашка перекрывала шапку и навигацию.
 */
export function CookieNotice() {
  const acked = useCookieNoticeAcked();
  const dark = useChromeTone() === "dark";
  const pathname = usePathname();

  // В админке и на страницах документов баннер лишний: там его текст или
  // уже читают, или это команда площадки.
  if (acked || pathname.startsWith("/admin") || pathname.startsWith("/legal")) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Уведомление о cookie"
      className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-4"
    >
      <div
        className={`mx-auto flex max-w-md items-center gap-3 rounded-[var(--radius-card)] border p-3.5 shadow-lg ${
          dark
            ? "border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)] text-white"
            : "border-line bg-surface"
        }`}
      >
        <p className={`min-w-0 flex-1 text-xs leading-relaxed ${dark ? "text-haze" : "text-slate"}`}>
          Мы используем{" "}
          <Link href="/legal/pdn" className="underline underline-offset-2">
            cookie
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={ackCookieNotice}
          className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-700 ${
            dark ? "bg-signal text-ink-3" : "bg-graphite text-white"
          }`}
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
