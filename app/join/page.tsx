"use client";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { API_BASE } from "@/lib/api/client";

export default function JoinPage() {
  return (
    <main className="bg-oracle grain flex min-h-dvh flex-col text-white">
      <header className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <Wordmark tone="dark" />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-7 backdrop-blur-sm sm:p-9">
            <h1 className="font-display text-2xl font-600 leading-tight">Вход в Веракс</h1>
            <p className="mt-3 text-[0.97rem] leading-relaxed text-haze">
              Быстрый и надёжный вход через Госуслуги. Смотреть площадку можно и без входа —
              он нужен, чтобы голосовать и вести свой трек-рекорд.
            </p>

            <Button
              variant="signal"
              size="lg"
              className="mt-7 w-full"
              onClick={() => {
                window.location.href = `${API_BASE}/auth/esia/login`;
              }}
            >
              <GosIcon className="size-5" />
              Войти через Госуслуги
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function GosIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 9.5h5M8 13h8M8 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
