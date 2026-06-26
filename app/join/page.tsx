"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type Step = "intro" | "redirecting" | "verifying" | "error" | "pseudonym" | "done";

export default function JoinPage() {
  const [step, setStep] = useState<Step>("intro");

  return (
    <main className="bg-oracle grain flex min-h-dvh flex-col text-white">
      <header className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <Wordmark tone="dark" />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {step === "intro" && <Intro onStart={() => setStep("redirecting")} />}
          {step === "redirecting" && (
            <AuthLoading
              title="Переход в Госуслуги"
              note="Открываем защищённую страницу входа ЕСИА…"
              next={() => setStep("verifying")}
              ms={1400}
            />
          )}
          {step === "verifying" && (
            <AuthLoading
              title="Проверяем личность"
              note="Получаем подтверждение из ЕСИА и сверяем уникальность…"
              next={() => setStep("pseudonym")}
              ms={1600}
            />
          )}
          {step === "error" && (
            <AuthError onRetry={() => setStep("redirecting")} onBack={() => setStep("intro")} />
          )}
          {step === "pseudonym" && <PseudonymForm onDone={() => setStep("done")} />}
          {step === "done" && <Done />}
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────── Шаги ─────────────────────────── */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-7 backdrop-blur-sm sm:p-9">
      {children}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
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
      d: "Реальное имя нигде не раскрывается. В профиле виден лишь выбранный вами хэндл и статистика прогнозов.",
    },
  ];

  return (
    <Panel>
      <h1 className="font-display text-2xl font-600 leading-tight">
        Подтвердите, что вы — это вы
      </h1>
      <p className="mt-3 text-[0.97rem] leading-relaxed text-haze">
        Прогнозировать может только верифицированный аккаунт. Нужна{" "}
        <span className="text-white">подтверждённая</span> учётная запись Госуслуг —
        упрощённая и стандартная не подойдут.
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

      <Button variant="signal" size="lg" className="w-full" onClick={onStart}>
        <GosIcon className="size-5" />
        Войти через Госуслуги
      </Button>
      <p className="mt-4 text-center text-xs leading-relaxed text-haze-dim">
        Продолжая, вы перейдёте на страницу ЕСИА. Мы не видим ваш пароль от Госуслуг.
      </p>
    </Panel>
  );
}

function AuthLoading({
  title,
  note,
  next,
  ms,
}: {
  title: string;
  note: string;
  next: () => void;
  ms: number;
}) {
  const cb = useRef(next);
  cb.current = next;
  useEffect(() => {
    const id = setTimeout(() => cb.current(), ms);
    return () => clearTimeout(id);
  }, [ms]);

  return (
    <Panel>
      <div className="flex flex-col items-center py-6 text-center" role="status" aria-live="polite">
        <Spinner className="size-10 text-signal" />
        <h2 className="mt-6 font-display text-xl font-500">{title}</h2>
        <p className="mt-2 text-sm text-haze">{note}</p>
      </div>
    </Panel>
  );
}

function AuthError({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <Panel>
      <div className="flex flex-col items-center py-2 text-center" role="alert">
        <div className="flex size-12 items-center justify-center rounded-full bg-warm/15 text-warm">
          <AlertIcon className="size-6" />
        </div>
        <h2 className="mt-5 font-display text-xl font-500">Не удалось войти</h2>
        <p className="mt-2 text-sm leading-relaxed text-haze">
          ЕСИА не вернула подтверждение. Чаще всего помогает повторная попытка. Если
          ошибка повторяется — проверьте, что учётная запись Госуслуг подтверждена.
        </p>
      </div>
      <div className="mt-7 flex flex-col gap-3">
        <Button variant="signal" className="w-full" onClick={onRetry}>
          Попробовать снова
        </Button>
        <Button variant="ghost-dark" className="w-full" onClick={onBack}>
          Назад
        </Button>
      </div>
    </Panel>
  );
}

const RESERVED = new Set(["admin", "оракул", "orakul", "moderator", "арбитр"]);

function PseudonymForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [pdn, setPdn] = useState(false);
  const [rules, setRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const validFormat = /^[A-Za-zА-Яа-яЁё0-9_]{3,20}$/.test(trimmed);
  const reserved = RESERVED.has(trimmed.toLowerCase());
  const nameError = !validFormat
    ? trimmed.length === 0
      ? "Введите псевдоним"
      : "3–20 символов: буквы, цифры и подчёркивание"
    : reserved
      ? "Этот псевдоним занят"
      : null;

  const canSubmit = !nameError && pdn && rules && !submitting;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    // Имитация регистрации: find-or-create по хэшу СНИЛС на бэкенде.
    setTimeout(onDone, 1100);
  }

  return (
    <Panel>
      <div className="mb-6 flex items-center gap-2 text-sm text-signal">
        <CheckBadge className="size-5" />
        Личность подтверждена
      </div>

      <h1 className="font-display text-2xl font-600 leading-tight">Выберите псевдоним</h1>
      <p className="mt-2 text-sm leading-relaxed text-haze">
        Под этим именем вас увидят в лидербордах и на публичном профиле. Реальное имя
        не показывается.
      </p>

      <form className="mt-7" onSubmit={submit} noValidate>
        <label htmlFor="pseudonym" className="block text-sm font-500 text-white/90">
          Псевдоним
        </label>
        <div className="mt-2 flex items-center rounded-xl border border-[color:var(--color-edge)] bg-ink-3/50 focus-within:border-signal">
          <span className="pl-3.5 text-haze-dim select-none">@</span>
          <input
            id="pseudonym"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={touched && !!nameError}
            aria-describedby="pseudonym-hint"
            placeholder="kalibr"
            className="w-full bg-transparent px-2 py-3 text-white placeholder:text-haze-dim focus:outline-none"
          />
          {trimmed.length > 0 && !nameError && (
            <CheckBadge className="mr-3 size-5 text-signal" />
          )}
        </div>
        <p
          id="pseudonym-hint"
          className={`mt-2 text-xs ${touched && nameError ? "text-warm" : "text-haze-dim"}`}
        >
          {touched && nameError ? nameError : "От 3 до 20 символов. Можно поменять позже."}
        </p>

        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Согласия</legend>
          <Consent
            checked={pdn}
            onChange={setPdn}
            id="consent-pdn"
            text={
              <>
                Согласен на обработку персональных данных в соответствии с{" "}
                <a href="/legal/privacy" className="text-signal underline-offset-2 hover:underline">
                  политикой конфиденциальности
                </a>
              </>
            }
          />
          <Consent
            checked={rules}
            onChange={setRules}
            id="consent-rules"
            text={
              <>
                Принимаю{" "}
                <a href="/legal/terms" className="text-signal underline-offset-2 hover:underline">
                  правила платформы и оферту
                </a>
              </>
            }
          />
        </fieldset>

        <Button
          variant="signal"
          size="lg"
          type="submit"
          disabled={!canSubmit}
          className="mt-7 w-full"
        >
          {submitting ? <Spinner className="size-5" /> : "Создать аккаунт"}
        </Button>
        {touched && !nameError && (!pdn || !rules) && (
          <p className="mt-3 text-center text-xs text-warm" role="status">
            Отметьте оба согласия, чтобы продолжить
          </p>
        )}
      </form>
    </Panel>
  );
}

function Consent({
  checked,
  onChange,
  id,
  text,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  text: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer gap-3 text-sm leading-snug text-haze"
    >
      <span className="relative mt-0.5 flex size-5 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer size-5 cursor-pointer appearance-none rounded-md border border-[color:var(--color-edge)] bg-ink-3/50 checked:border-signal checked:bg-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        />
        <CheckIcon className="pointer-events-none absolute inset-0 m-auto size-3.5 text-ink-3 opacity-0 peer-checked:opacity-100" />
      </span>
      <span>{text}</span>
    </label>
  );
}

function Done() {
  return (
    <Panel>
      <div className="flex flex-col items-center py-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-signal/15 text-signal">
          <CheckBadge className="size-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-600">Готово</h1>
        <p className="mt-2 text-sm leading-relaxed text-haze">
          Аккаунт создан. Теперь можно делать прогнозы и наращивать трек-рекорд.
        </p>
        <ButtonLink href="/events" variant="signal" size="lg" className="mt-7 w-full">
          К событиям
        </ButtonLink>
      </div>
    </Panel>
  );
}

/* ─────────────────────────── Иконки ─────────────────────────── */

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.2 2.9 7.7 7 9 4.1-1.3 7-4.8 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 12 2.3 2.3L15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="m3.5 8 2.8 2.8L12.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
      <path d="M12 3.5 21 19H3l9-15.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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
