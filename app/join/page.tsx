"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { API_BASE, ApiError } from "@/lib/api/client";
import { getAuthProviders, requestEmailLink } from "@/lib/api/endpoints";
import { EMAIL_RE } from "@/lib/validation";
import type { ApiAuthProviders } from "@/lib/api/dto";

// Пауза перед повторной отправкой — защита от долбёжки по кнопке.
const RESEND_COOLDOWN_S = 60;

const inputCls =
  "w-full rounded-xl border border-[color:var(--color-edge)] bg-[color:var(--color-ink-3)]/60 " +
  "px-3.5 py-2.5 text-sm text-white placeholder:text-haze-dim " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

type ProvidersState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; value: ApiAuthProviders };

export default function JoinPage() {
  const [providers, setProviders] = useState<ProvidersState>({ status: "loading" });

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

  return (
    <main className="bg-oracle grain flex min-h-dvh flex-col text-white">
      <header className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <Wordmark tone="dark" />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-7 backdrop-blur-sm sm:p-9">
            <JoinCard providers={providers} />
          </div>
        </div>
      </div>
    </main>
  );
}

function JoinCard({ providers }: { providers: ProvidersState }) {
  // Пока идёт email-флоу «письмо отправлено», прячем разделитель и кнопку
  // Госуслуг — не отвлекаем от единственного осмысленного следующего шага.
  const [emailPhase, setEmailPhase] = useState<"form" | "sent">("form");

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
        {emailOn && <EmailLoginForm onPhaseChange={setEmailPhase} />}

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

function EmailLoginForm({ onPhaseChange }: { onPhaseChange: (phase: "form" | "sent") => void }) {
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onPhaseChange(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_S);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  const trimmed = email.trim();
  const formatValid = EMAIL_RE.test(trimmed);

  async function send() {
    if (!formatValid || submitting || cooldown > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      // Всегда 202 — анти-энумерация: бэкенд не выдаёт, зарегистрирован ли
      // адрес, поэтому и на клиенте текст одинаковый в любом случае.
      await requestEmailLink(trimmed);
      setPhase("sent");
      startCooldown();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? "Слишком много попыток, попробуйте позже"
          : "Не удалось отправить ссылку. Попробуйте ещё раз",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "sent") {
    return (
      <div role="status" aria-live="polite">
        <p className="text-[0.97rem] leading-relaxed text-haze">
          Письмо отправлено на <span className="font-600 text-white">{trimmed}</span>. Перейдите
          по ссылке из письма — она действует 15 минут и работает один раз.
        </p>
        <Button
          variant="ghost-dark"
          size="md"
          className="mt-5 w-full"
          disabled={cooldown > 0 || submitting}
          onClick={send}
        >
          {submitting ? (
            <Spinner className="size-4" />
          ) : cooldown > 0 ? (
            `Отправить ещё раз (${cooldown} с)`
          ) : (
            "Отправить ещё раз"
          )}
        </Button>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-[color:var(--color-danger)]/10 px-3.5 py-2.5 text-sm text-[color:var(--color-danger)]"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-600 text-haze">Email</span>
        <input
          type="email"
          inputMode="email"
          autoFocus
          autoComplete="email"
          className={inputCls}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
      </label>
      <Button
        variant="signal"
        size="lg"
        className="mt-4 w-full"
        disabled={!formatValid || submitting}
        onClick={send}
      >
        {submitting ? <Spinner className="size-5" /> : "Получить ссылку для входа"}
      </Button>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-[color:var(--color-danger)]/10 px-3.5 py-2.5 text-sm text-[color:var(--color-danger)]"
        >
          {error}
        </p>
      )}
    </div>
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
