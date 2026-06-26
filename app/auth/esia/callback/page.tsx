"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/app/AuthProvider";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setError("Не передан код авторизации");
      return;
    }
    (async () => {
      try {
        // Обмен кода на сессию: бэкенд ставит httpOnly-cookie в этом ответе.
        await apiFetch(`/auth/esia/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
        await refresh();
        router.replace("/events");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось завершить вход");
      }
    })();
  }, [params, refresh, router]);

  return (
    <main className="bg-oracle grain flex min-h-dvh flex-col items-center justify-center px-5 text-white">
      <div className="w-full max-w-md rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-9 text-center backdrop-blur-sm">
        <div className="mb-6 flex justify-center">
          <Wordmark tone="dark" />
        </div>
        {error ? (
          <div role="alert">
            <h1 className="font-display text-xl font-600">Не удалось войти</h1>
            <p className="mt-2 text-sm text-haze">{error}</p>
            <ButtonLink href="/join" variant="signal" className="mt-6 w-full">
              Попробовать снова
            </ButtonLink>
          </div>
        ) : (
          <div role="status" aria-live="polite">
            <Spinner className="mx-auto size-10 text-signal" />
            <h1 className="mt-6 font-display text-xl font-500">Завершаем вход…</h1>
            <p className="mt-2 text-sm text-haze">Проверяем подтверждение из ЕСИА.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
