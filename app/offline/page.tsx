"use client";

import Link from "next/link";
import { OracleArc } from "@/components/brand/OracleArc";

/**
 * Экран без сети. Показывается service worker'ом, когда навигация не дошла
 * до сервера и в кэше нет нужной страницы.
 *
 * Тёмная среда и дуга без показания — прибор, потерявший сигнал. Это честнее
 * перечёркнутого облака: приложение не «сломалось», у него просто нет данных,
 * и как только связь вернётся, стрелка встанет на место.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center">
      <OracleArc activeIndex={null} className="w-56 max-w-full opacity-70" />

      <h1 className="font-display mt-8 text-2xl font-600 text-white">
        Сигнала нет
      </h1>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-haze">
        Показания появятся, как только вернётся сеть. Открытые ранее страницы
        доступны и без неё.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => location.reload()}
          className="min-h-11 rounded-full bg-signal px-5 text-sm font-700 text-ink-3 transition-colors hover:bg-[color:var(--color-signal-deep)] hover:text-white"
        >
          Проверить снова
        </button>
        <Link
          href="/events"
          className="min-h-11 rounded-full border border-edge px-5 leading-[2.75rem] text-sm font-600 text-haze transition-colors hover:text-white"
        >
          К событиям
        </Link>
      </div>
    </div>
  );
}
