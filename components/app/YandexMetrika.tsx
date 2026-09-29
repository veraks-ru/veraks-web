"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

/** Номер счётчика Яндекс Метрики — публичный, не секрет. */
const COUNTER_ID = 113159927;
const TAG_SRC = `https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`;

type YmQueue = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
type WithYm = Window & { ym?: YmQueue };

/**
 * Счётчик включается только на боевом домене: локальная разработка и
 * превью не должны засорять статистику прода.
 */
function isProdHost(): boolean {
  const host = window.location.hostname;
  return host === "veraks.ru" || host.endsWith(".veraks.ru");
}

/**
 * Стандартный сниппет Метрики, переписанный без inline-скрипта: очередь
 * `window.ym`, init и асинхронная загрузка tag.js. Очередь ставится
 * синхронно, поэтому init гарантированно попадает в неё раньше первого хита.
 */
function ensureCounter(): YmQueue {
  const w = window as WithYm;
  if (w.ym) return w.ym;

  const queue: YmQueue = (...args: unknown[]) => {
    (queue.a = queue.a || []).push(args);
  };
  queue.l = Date.now();
  w.ym = queue;

  // Переходы App Router не перезагружают страницу, поэтому `defer: true`:
  // автоматического хита при init нет, все хиты (и первый) шлёт PageHits.
  queue(COUNTER_ID, "init", {
    defer: true,
    webvisor: true,
    clickmap: true,
    accurateTrackBounce: true,
    trackLinks: true,
  });

  if (!Array.from(document.scripts).some((s) => s.src === TAG_SRC)) {
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = TAG_SRC;
    document.head.appendChild(tag);
  }
  return queue;
}

function PageHits() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!isProdHost()) return;
    const url = window.location.href;
    if (url === prevUrl.current) return;
    ensureCounter()(COUNTER_ID, "hit", url, {
      referer: prevUrl.current ?? document.referrer,
    });
    prevUrl.current = url;
  }, [pathname, search]);

  return null;
}

/** Яндекс Метрика: счётчик + хиты на каждый переход внутри SPA. */
export function YandexMetrika() {
  // useSearchParams требует Suspense, иначе статические страницы уходят в
  // клиентский рендер целиком.
  return (
    <Suspense fallback={null}>
      <PageHits />
    </Suspense>
  );
}
