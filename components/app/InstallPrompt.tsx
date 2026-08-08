"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "veraks:install-dismissed";

/** Событие Chrome/Edge; в lib.dom его нет. */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari до сих пор сообщает об установленном приложении так.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  // Chrome и Firefox на iOS установку на домашний экран не предлагают.
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && safari;
}

/**
 * Предложение установить приложение.
 *
 * Два разных мира: Chrome/Android даёт системный диалог через
 * `beforeinstallprompt`, iOS не даёт ничего — там установка возможна только
 * руками через «Поделиться», и единственное, что можно сделать, — показать,
 * где эта кнопка.
 *
 * Показывается один раз и запоминает отказ: баннер «установите нас», который
 * возвращается каждый заход, — это раздражитель, а не приглашение.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // Приватный режим без localStorage — покажем, отказ просто не запомнится.
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault(); // иначе Chrome покажет свой мини-бар
      setDeferred(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS: событие не придёт никогда, показываем подсказку сами — но не сразу,
    // чтобы не перехватывать внимание на первом экране.
    const timer = isIosSafari() ? window.setTimeout(() => setShowIosHint(true), 12_000) : null;

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* без localStorage отказ живёт до перезагрузки */
    }
    setDeferred(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-4">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-lg">
        <span className="mt-0.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-700">Веракс на домашний экран</p>
          {deferred ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate">
              Открывается как приложение, без адресной строки.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-slate">
              Нажмите «Поделиться», затем «На экран „Домой“».
            </p>
          )}

          <div className="mt-2.5 flex gap-2">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="min-h-9 rounded-full bg-graphite px-4 text-sm font-700 text-white"
              >
                Установить
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="min-h-9 rounded-full px-3 text-sm font-600 text-slate"
            >
              Не сейчас
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
