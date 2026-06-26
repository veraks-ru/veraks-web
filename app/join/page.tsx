"use client";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { API_BASE } from "@/lib/api/client";

export default function JoinPage() {
  const facts = [
    {
      t: "Один человек — один аккаунт",
      d: "Уникальность подтверждается через ЕСИА. Создать второй аккаунт нельзя — это основа честного рейтинга.",
    },
    {
      t: "Храним хэш, не паспорт",
      d: "Сохраняем только обезличенный хэш идентификатора и ваш псевдоним. Паспортные данные не хранятся.",
    },
    {
      t: "Публично — только псевдоним",
      d: "Реальное имя нигде не раскрывается. В профиле виден лишь выбранный хэндл и статистика прогнозов.",
    },
  ];

  return (
    <main className="bg-oracle grain flex min-h-dvh flex-col text-white">
      <header className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <Wordmark tone="dark" />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-7 backdrop-blur-sm sm:p-9">
            <h1 className="font-display text-2xl font-600 leading-tight">
              Подтвердите, что вы — это вы
            </h1>
            <p className="mt-3 text-[0.97rem] leading-relaxed text-haze">
              Прогнозировать может только верифицированный аккаунт. Нужна{" "}
              <span className="text-white">подтверждённая</span> учётная запись Госуслуг.
            </p>

            <ul className="my-7 space-y-4">
              {facts.map((f) => (
                <li key={f.t} className="flex gap-3">
                  <ShieldIcon className="mt-0.5 size-5 shrink-0 text-signal" />
                  <div>
                    <p className="text-sm font-600">{f.t}</p>
                    <p className="mt-0.5 text-sm leading-snug text-haze">{f.d}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              variant="signal"
              size="lg"
              className="w-full"
              onClick={() => {
                window.location.href = `${API_BASE}/auth/esia/login`;
              }}
            >
              <GosIcon className="size-5" />
              Войти через Госуслуги
            </Button>
            <p className="mt-4 text-center text-xs leading-relaxed text-haze-dim">
              Вы перейдёте на страницу ЕСИА. Мы не видим ваш пароль от Госуслуг.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.2 2.9 7.7 7 9 4.1-1.3 7-4.8 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
