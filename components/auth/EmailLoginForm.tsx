"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api/client";
import { requestEmailLink } from "@/lib/api/endpoints";
import { EMAIL_RE } from "@/lib/validation";

// Пауза перед повторной отправкой — защита от долбёжки по кнопке.
const RESEND_COOLDOWN_S = 60;

const inputCls =
  "w-full rounded-xl border border-[color:var(--color-edge)] bg-[color:var(--color-ink-3)]/60 " +
  "px-3.5 py-2.5 text-sm text-white placeholder:text-haze-dim " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export type EmailLoginPhase = "form" | "sent";

/**
 * Вход по одноразовой ссылке на почту. Тёмная среда: живёт на /join и в
 * шторке ленты, где гость хочет засчитать свой свайп.
 *
 * next — куда вернуть человека после перехода по ссылке из письма (бэкенд
 * вшивает его в ссылку, а страница callback читает и редиректит).
 */
export function EmailLoginForm({
  next = null,
  autoFocus = true,
  onPhaseChange,
}: {
  next?: string | null;
  autoFocus?: boolean;
  onPhaseChange?: (phase: EmailLoginPhase) => void;
}) {
  const [phase, setPhase] = useState<EmailLoginPhase>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onPhaseChange?.(phase);
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
      await requestEmailLink(trimmed, next);
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
          autoFocus={autoFocus}
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
