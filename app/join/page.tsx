"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmailLoginForm, type EmailLoginPhase } from "@/components/auth/EmailLoginForm";
import { useAuth } from "@/components/app/AuthProvider";
import { API_BASE } from "@/lib/api/client";
import { getAuthProviders } from "@/lib/api/endpoints";
import { rememberInvite } from "@/lib/invite";
import { safeReturnPath, withNext } from "@/lib/returnTo";
import type { ApiAuthProviders } from "@/lib/api/dto";

type ProvidersState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; value: ApiAuthProviders };

function JoinInner() {
  const { me, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [providers, setProviders] = useState<ProvidersState>({ status: "loading" });

  // Код приглашения запоминаем сразу: активировать его можно будет только
  // после входа, а до тех пор человек успеет уйти в почту и вернуться в
  // новой вкладке (см. lib/invite.ts).
  const invited = params.get("invite");
  useEffect(() => {
    if (invited) rememberInvite(invited);
  }, [invited]);

  // Откуда пришли (лента, событие) — туда и вернём после входа.
  const next = safeReturnPath(params.get("next"));

  useEffect(() => {
    let cancelled = false;
    getAuthProviders()
      .then((p) => {
        if (!cancelled) setProviders(p ? { status: "ready", value: p } : { status: "error" });
      })
      .catch(() => {
        if (!cancelled) setProviders({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !me) return;
    router.replace(me.needs_onboarding ? withNext("/onboarding", next) : (next ?? "/account"));
  }, [loading, me, router, next]);

  // Пока сессия проверяется или уже известно, что человек вошёл (идёт
  // редирект выше), форму входа не показываем — иначе вошедший на миг видит
  // страницу входа, будто он гость.
  if (loading || me) {
    return (
      <main className="bg-oracle grain flex min-h-dvh items-center justify-center text-white">
        <Spinner className="size-8 text-signal" />
      </main>
    );
  }

  return (
    <main className="bg-oracle grain flex min-h-dvh flex-col text-white">
      <header className="pt-safe mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <Wordmark tone="dark" />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {invited && <InviteBanner />}
          <div className="rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-7 backdrop-blur-sm sm:p-9">
            <JoinCard providers={providers} next={next} />
          </div>
        </div>
      </div>
    </main>
  );
}

// useSearchParams требует Suspense-границы, иначе сборка падает на CSR bailout.
export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}

/**
 * Пришедшему по приглашению говорим, что его ждёт, до того как он введёт
 * почту: иначе вход выглядит как обычный, и ценность приглашения теряется.
 * Точный срок не называем — он известен бэкенду и зависит от ссылки.
 */
function InviteBanner() {
  return (
    <div className="mb-4 rounded-2xl border border-signal/40 bg-signal/10 p-4 text-center">
      <p className="text-sm font-600 text-signal">Вас пригласили</p>
      <p className="mt-1 text-sm text-haze">
        Голосовать можно будет без подписки — доступ откроется сразу после входа.
      </p>
    </div>
  );
}

function JoinCard({ providers, next }: { providers: ProvidersState; next: string | null }) {
  // Пока идёт email-флоу «письмо отправлено», прячем разделитель и кнопку
  // Госуслуг — не отвлекаем от единственного осмысленного следующего шага.
  const [emailPhase, setEmailPhase] = useState<EmailLoginPhase>("form");

  if (providers.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-8" role="status" aria-live="polite">
        <Spinner className="size-8 text-signal" />
        <p className="text-sm text-haze">Загружаем способы входа…</p>
      </div>
    );
  }

  const value = providers.status === "ready" ? providers.value : null;
  const esiaOn = value?.esia ?? false;
  const emailOn = value?.email ?? false;

  if (!esiaOn && !emailOn) {
    return (
      <div role="alert">
        <h1 className="font-display text-2xl font-600 leading-tight">Вход временно недоступен</h1>
        <p className="mt-3 text-[0.97rem] leading-relaxed text-haze">
          {providers.status === "error"
            ? "Не удалось загрузить способы входа. Проверьте соединение и обновите страницу."
            : "Ни один способ входа сейчас не включён — загляните чуть позже."}
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-600 leading-tight">
        {emailPhase === "sent" ? "Проверьте почту" : "Вход в Веракс"}
      </h1>
      {emailPhase === "form" && (
        <p className="mt-3 text-[0.97rem] leading-relaxed text-haze">
          Смотреть площадку можно и без входа — он нужен, чтобы голосовать и вести свой
          трек-рекорд.
        </p>
      )}

      <div className="mt-7 grid gap-5">
        {emailOn && <EmailLoginForm next={next} onPhaseChange={setEmailPhase} />}

        {emailOn && esiaOn && emailPhase === "form" && (
          <div className="flex items-center gap-3 text-xs text-haze-dim" aria-hidden="true">
            <span className="h-px flex-1 bg-[color:var(--color-edge)]" />
            или
            <span className="h-px flex-1 bg-[color:var(--color-edge)]" />
          </div>
        )}

        {esiaOn && emailPhase === "form" && (
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
        )}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-haze-dim">
        Продолжая, вы принимаете{" "}
        <Link href="/legal/oferta" className="text-haze underline underline-offset-2 hover:text-white">
          оферту
        </Link>{" "}
        и{" "}
        <Link href="/legal/pdn" className="text-haze underline underline-offset-2 hover:text-white">
          обработку персональных данных
        </Link>
        . Участие в конкурсе — бесплатное.
      </p>
    </>
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
