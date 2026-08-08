/**
 * Сквозная проверка PWA на живом домене.
 *
 * Отдельные 200-ки на манифест и sw.js ничего не доказывают: важно, что
 * браузер их подхватил, воркер встал в active и офлайн реально показывает
 * офлайн-экран, а не ошибку сети. Проверяем это в настоящем браузере.
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/verify-pwa.mjs https://veraks.ru
 */
import { chromium, devices } from "playwright";

const base = process.argv[2] || "https://veraks.ru";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? `  — ${detail}` : ""}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"], locale: "ru-RU" });
const page = await context.newPage();

await page.goto(`${base}/events`, { waitUntil: "load" });

// 1. Манифест подключён и разбирается.
const manifestHref = await page.getAttribute('link[rel="manifest"]', "href");
check("манифест подключён в <head>", Boolean(manifestHref), manifestHref || "");

const manifest = await page.evaluate(async (href) => {
  const r = await fetch(href);
  return r.ok ? r.json() : null;
}, manifestHref || "/manifest.webmanifest");
check(
  "манифест валиден и standalone",
  manifest?.display === "standalone",
  manifest ? `display=${manifest.display}, иконок ${manifest.icons?.length}` : "не разобран",
);
check(
  "есть maskable-иконка (Android обрезает под форму)",
  Boolean(manifest?.icons?.some((i) => String(i.purpose).includes("maskable"))),
);

// 2. Мета для iOS: без них ярлык открывается в Safari с адресной строкой.
// Читаем разом через DOM — getAttribute на отсутствующем узле ждёт 30 секунд
// и валит проверку таймаутом вместо честного «нет такого тега».
const meta = await page.evaluate(() => {
  const out = {};
  document
    .querySelectorAll("meta[name]")
    .forEach((m) => (out[m.getAttribute("name")] = m.getAttribute("content")));
  out["__apple-touch-icon"] = document.querySelector('link[rel="apple-touch-icon"]')
    ? "yes"
    : "";
  return out;
});

check("apple-touch-icon", meta["__apple-touch-icon"] === "yes");
check(
  "web-app-capable (оба варианта: Safari <17.4 знает только apple-)",
  meta["apple-mobile-web-app-capable"] === "yes" &&
    meta["mobile-web-app-capable"] === "yes",
  `apple=${meta["apple-mobile-web-app-capable"] ?? "нет"}, стандарт=${meta["mobile-web-app-capable"] ?? "нет"}`,
);
check(
  "viewport-fit=cover (иначе safe-area всегда 0)",
  Boolean(meta.viewport?.includes("viewport-fit=cover")),
  meta.viewport || "",
);
check("theme-color задан", Boolean(meta["theme-color"]), meta["theme-color"] || "");

// 3. Service worker встаёт в active. `ready` резолвится чуть раньше, чем
// состояние станет activated, поэтому коротко ждём именно его.
const swState = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return "нет поддержки";
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg?.active) return "не активировался";
  for (let i = 0; i < 40 && reg.active.state !== "activated"; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  return reg.active.state;
});
check("service worker активен", swState === "activated", swState);

// Первая установка не должна перезагружать страницу (clients.claim поднимает
// controllerchange, и наивный обработчик обновления сделал бы релоад).
let reloaded = false;
page.once("framenavigated", () => (reloaded = true));
await page.waitForTimeout(2000); // и заодно дать воркеру докачать precache
check("первая установка не перезагружает страницу", !reloaded);
await context.setOffline(true);
let offlineText = "";
try {
  await page.goto(`${base}/leaderboards`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  offlineText = await page.textContent("body");
} catch (e) {
  offlineText = `навигация упала: ${e}`;
}
check(
  "офлайн показывает свой экран, а не ошибку браузера",
  /Сигнала нет|Показания появятся/.test(offlineText || ""),
  (offlineText || "").trim().slice(0, 60).replace(/\s+/g, " "),
);
await context.setOffline(false);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} проверок пройдено`);
process.exit(failed.length ? 1 : 0);
