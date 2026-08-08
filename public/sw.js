/*
 * Service worker Веракса.
 *
 * Задача узкая и намеренно скромная: дать оболочку приложения пережить потерю
 * сети и мгновенно открываться с домашнего экрана. Данными он не заведует.
 *
 * Почему API не кэшируется вообще. Лидерборды, рейтинги и сводка толпы — это
 * показания прибора; устаревшее показание хуже отсутствующего, потому что
 * выглядит достоверно. Отдельно: сводка толпы скрыта до закрытия приёма
 * (анти-якорение), и закэшированный ответ мог бы раскрыть её раньше срока.
 * Поэтому всё, что уходит на api.veraks.ru, идёт мимо кэша.
 *
 * Написан вручную, без next-pwa: одна зависимость меньше в цепочке сборки,
 * и стратегии видны целиком в одном файле.
 */

// Меняется при правках стратегий — старые кэши сносятся в activate.
const VERSION = "v1";
const SHELL = `veraks-shell-${VERSION}`;
const STATIC = `veraks-static-${VERSION}`;

const OFFLINE_URL = "/offline";

// Минимум, который должен быть на диске к первому офлайну.
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // addAll падает целиком, если хоть один ресурс недоступен, — кладём по
      // одному, чтобы отсутствие иконки не оставило приложение без офлайна.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            /* пропускаем: критичен только OFFLINE_URL, он проверяется ниже */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, STATIC]);
      await Promise.all(
        (await caches.keys())
          .filter((k) => k.startsWith("veraks-") && !keep.has(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Немедленное применение новой версии по сигналу со страницы. */
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

/** Хэшированная статика Next неизменяема — можно отдавать из кэша сразу. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Навигация: всегда пробуем сеть — свежесть важнее скорости, приложение
 * почти целиком про актуальные данные. Кэш и офлайн-страница включаются,
 * только когда сети нет.
 */
async function navigate(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(OFFLINE_URL)) ||
      new Response("Нет сети", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Чужие источники (API, WS-релей, аналитика) — мимо воркера.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Иконки и манифест: из кэша быстро, в фоне освежаем.
  if (/\.(png|svg|webmanifest|ico)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const network = fetch(request)
          .then(async (response) => {
            if (response.ok) {
              const cache = await caches.open(SHELL);
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});
