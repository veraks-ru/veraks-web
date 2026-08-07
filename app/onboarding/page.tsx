"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/components/app/AuthProvider";
import { submitOnboarding } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { CONSENT_DOCUMENT_SLUGS, consentDocTitle } from "@/lib/legal";
import { USERNAME_RE } from "@/lib/validation";

const inputCls =
  "w-full rounded-xl border border-[color:var(--color-edge)] bg-[color:var(--color-ink-3)]/60 " +
  "px-3.5 py-2.5 text-sm text-white placeholder:text-haze-dim " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

// Формулировка согласия под конкретный документ: юридически нейтральный текст
// + текст ссылки (в правильном падеже — короткое название из lib/legal.ts не
// всегда склоняется само по себе).
const CONSENT_COPY: Record<string, { lead: string; linkText: string }> = {
  offer: { lead: "Принимаю условия", linkText: "публичной оферты" },
  pdn: {
    lead: "Даю согласие на",
    linkText: "обработку персональных данных",
  },
};

function consentCopy(document: string): { lead: string; linkText: string } {
  return (
    CONSENT_COPY[document] ?? {
      lead: "Принимаю условия документа",
      linkText: consentDocTitle(document),
    }
  );
}

export default function OnboardingPage() {
  const { me, loading, refresh } = useAuth();
  const router = useRouter();

  const [initialized, setInitialized] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace("/join");
      return;
    }
    if (!me.needs_onboarding) {
      router.replace("/events");
    }
  }, [loading, me, router]);

  // Предзаполняем форму текущими значениями один раз, когда они пришли —
  // без этого печатать в полях было бы невозможно (me обновляется извне).
  useEffect(() => {
    if (initialized || !me) return;
    setUsername(me.username);
    setDisplayName(me.display_name ?? "");
    setInitialized(true);
  }, [initialized, me]);

  if (loading || !me || !me.needs_onboarding) {
    return (
      <main className="bg-oracle grain flex min-h-dvh items-center justify-center text-white">
        <Spinner className="size-8 text-signal" />
      </main>
    );
  }

  const missing = me.missing_consents ?? [];
  const allChecked = missing.every((c) => checked[`${c.document}:${c.version}`]);
  const trimmedUsername = username.trim();
  const usernameFormatValid = USERNAME_RE.test(trimmedUsername);
  const canSubmit = allChecked && usernameFormatValid && !submitting;

  async function submit() {
    if (!canSubmit || !me) return;
    setSubmitting(true);
    setFormError(null);
    setUsernameError(null);
    try {
      const trimmedDisplayName = displayName.trim();
      const updated = await submitOnboarding({
        username: trimmedUsername !== me.username ? trimmedUsername : undefined,
        display_name: trimmedDisplayName ? trimmedDisplayName : undefined,
        consents: missing.map((c) => ({ document: c.document, version: c.version })),
      });
      if (!updated) {
        setFormError("Не удалось сохранить, попробуйте ещё раз");
        return;
      }
      await refresh();
      // Решаем о редиректе по актуальному состоянию из ответа, а не по
      // предположению, что успешная отправка формы сразу закрывает онбординг
      // (могут остаться другие незавершённые требования).
      if (!updated.needs_onboarding) {
        router.replace("/events");
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setUsernameError("Такой псевдоним уже занят — выберите другой");
      } else if (e instanceof ApiError) {
        setFormError(e.message);
      } else {
        setFormError("Не удалось сохранить, попробуйте ещё раз");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-oracle grain flex min-h-dvh flex-col text-white">
      <header className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <Wordmark tone="dark" />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-[1.75rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-7 backdrop-blur-sm sm:p-9">
            <h1 className="font-display text-2xl font-600 leading-tight">
              Добро пожаловать в Веракс
            </h1>
            <p className="mt-3 text-[0.97rem] leading-relaxed text-haze">
              Последний шаг перед первым прогнозом — выберите псевдоним и подтвердите
              условия участия.
            </p>

            <div className="mt-7 grid gap-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-600 text-haze">Псевдоним</span>
                <input
                  className={inputCls}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(null);
                  }}
                  maxLength={32}
                  autoComplete="off"
                  spellCheck={false}
                />
                {usernameError ? (
                  <span role="alert" className="mt-1.5 block text-xs text-[color:var(--color-danger)]">
                    {usernameError}
                  </span>
                ) : trimmedUsername && !usernameFormatValid ? (
                  <span className="mt-1.5 block text-xs text-[color:var(--color-danger)]">
                    3–32 символа: латиница в нижнем регистре, цифры, дефис (не первым и не
                    последним).
                  </span>
                ) : (
                  <span className="mt-1.5 block text-xs text-haze-dim">
                    Виден в лидербордах и профиле. Латиница, цифры, дефис.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-600 text-haze">
                  Отображаемое имя (необязательно)
                </span>
                <input
                  className={inputCls}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                  placeholder="Как вас видят другие участники"
                />
              </label>

              {missing.length > 0 && (
                <div className="grid gap-3 border-t border-[color:var(--color-edge)] pt-5">
                  {missing.map((c) => {
                    const key = `${c.document}:${c.version}`;
                    const slug = CONSENT_DOCUMENT_SLUGS[c.document] ?? c.document;
                    const { lead, linkText } = consentCopy(c.document);
                    return (
                      <label key={key} className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 accent-[color:var(--color-signal)]"
                          checked={!!checked[key]}
                          onChange={(e) =>
                            setChecked((p) => ({ ...p, [key]: e.target.checked }))
                          }
                        />
                        <span className="text-sm leading-relaxed text-haze">
                          {lead}{" "}
                          <Link
                            href={`/legal/${slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white underline underline-offset-2 hover:text-signal"
                          >
                            {linkText}
                          </Link>{" "}
                          (ред. от {c.version})
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              variant="signal"
              size="lg"
              className="mt-7 w-full"
              disabled={!canSubmit}
              onClick={submit}
            >
              {submitting ? <Spinner className="size-5" /> : "Продолжить"}
            </Button>

            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-[color:var(--color-danger)]/10 px-3.5 py-2.5 text-sm text-[color:var(--color-danger)]"
              >
                {formError}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
