"use client";

import { useEffect } from "react";
import Link from "next/link";

// Корневая граница ошибок App Router: перехватывает исключения рендера в
// сегментах и даёт пользователю повторить (reset) или уйти на главную.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Точка для реального логгера/Sentry.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-5 text-center">
      <div className="max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-8">
        <h1 className="font-display text-2xl font-700">Что-то пошло не так</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Произошёл сбой при отображении страницы. Можно повторить или вернуться на
          главную.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black"
          >
            Повторить
          </button>
          <Link
            href="/"
            className="rounded-full border border-line px-4 py-2 text-sm font-600 text-graphite hover:bg-paper"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
