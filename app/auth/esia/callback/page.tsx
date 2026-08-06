"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/app/AuthProvider";

// Коды OIDC-ошибок, означающие «пользователь сам прервал вход» (а не сбой).
// Совпадают с _DENIED_OIDC_ERRORS бэкенда.
const DENIED_ERRORS = new Set(["access_denied", "consent_required", "login_required", "interaction_required"]);

type Failure = { title: string; detail: string };

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<Failure | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code");
    const state = params.get("state");
    // Госуслуги вернули отказ вместо кода: обменивать нечего — бэкенд не дёргаем.
    const oidcError = params.get("error");
    if (oidcError) {
      setError(
        DENIED_ERRORS.has(oidcError)
          ? { title: "Вход отменён", detail: "Вы не подтвердили вход через Госуслуги. Можно попробовать снова." }
          : { title: "Госуслуги недоступны", detail: "Сервис авторизации вернул ошибку. Попробуйте войти ещё раз чуть позже." },
      );
      return;
    }
    if (!code || !state) {
      setError({ title: "Не удалось войти", detail: "Госуслуги не передали код авторизации." });
      return;
    }
    (async () => {
      try {
        // Обмен кода на сессию: бэкенд ставит httpOnly-cookie в этом ответе.
        await apiFetch(`/auth/esia/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
        const me = await refresh();
        router.replace(me?.needs_onboarding ? "/onboarding" : "/events");
      } catch (e) {
        setError({
          title: "Не удалось войти",
          detail: e instanceof Error ? e.message : "Не удалось завершить вход",
        });
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
            <h1 className="font-display text-xl font-600">{error.title}</h1>
            <p className="mt-2 text-sm text-haze">{error.detail}</p>
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
