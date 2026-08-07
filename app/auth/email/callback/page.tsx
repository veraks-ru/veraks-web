"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api/client";
import { completeEmailLogin } from "@/lib/api/endpoints";
import { useAuth } from "@/components/app/AuthProvider";

type Failure = { title: string; detail: string; cta?: { label: string; href: string } };

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<Failure | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get("token");
    if (!token) {
      setError({ title: "Не удалось войти", detail: "В ссылке нет токена входа — проверьте, что она скопирована полностью." });
      return;
    }
    (async () => {
      try {
        // Обмен токена на сессию: бэкенд ставит httpOnly-cookie в этом ответе.
        await completeEmailLogin(token);
        const me = await refresh();
        router.replace(me?.needs_onboarding ? "/onboarding" : "/account");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setError({
            title: "Ссылка устарела или уже использована",
            detail: "Ссылки для входа действуют 15 минут и работают один раз. Запросите новую.",
            cta: { label: "Получить новую ссылку", href: "/join" },
          });
        } else if (e instanceof ApiError && e.status === 403) {
          setError({ title: "Вход невозможен", detail: e.message });
        } else {
          setError({
            title: "Не удалось войти",
            detail: e instanceof Error ? e.message : "Не удалось завершить вход",
          });
        }
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
            <ButtonLink href={error.cta?.href ?? "/join"} variant="signal" className="mt-6 w-full">
              {error.cta?.label ?? "Попробовать снова"}
            </ButtonLink>
          </div>
        ) : (
          <div role="status" aria-live="polite">
            <Spinner className="mx-auto size-10 text-signal" />
            <h1 className="mt-6 font-display text-xl font-500">Завершаем вход…</h1>
            <p className="mt-2 text-sm text-haze">Проверяем ссылку из письма.</p>
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
