"use client";

import { useEffect, useState } from "react";

/**
 * Регистрирует service worker и показывает, когда готова новая версия.
 *
 * Без явного предложения обновиться установленное приложение застревает на
 * старой оболочке до тех пор, пока пользователь не закроет все вкладки, —
 * человек видит починенный баг только через сутки. Поэтому новая версия не
 * применяется молча: полоса внизу говорит, что обновление готово, и
 * перезагружает по нажатию.
 */
export function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Была ли страница уже под управлением воркера. При ПЕРВОЙ установке
    // controller пуст, и clients.claim() всё равно поднимет controllerchange —
    // перезагружаться на нём нельзя: человек на первом же визите получил бы
    // необъяснимый релоад. Перезагрузка уместна только при замене работавшего
    // воркера на новую версию.
    const hadController = Boolean(navigator.serviceWorker.controller);

    let reloading = false;
    const onControllerChange = () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) return;
        if (registration.waiting) setWaiting(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // controller есть — значит это обновление, а не первая установка.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });
      })
      .catch(() => {
        // Регистрация недоступна (приватный режим, http) — приложение работает
        // как обычный сайт, молча.
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-50 px-3 pb-3">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-graphite px-4 py-3 text-white shadow-lg">
        <p className="text-sm font-600">Готово обновление</p>
        <button
          type="button"
          onClick={() => waiting.postMessage("skip-waiting")}
          className="min-h-9 shrink-0 rounded-full bg-signal px-4 text-sm font-700 text-ink-3"
        >
          Обновить
        </button>
      </div>
    </div>
  );
}
