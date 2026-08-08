/**
 * Скриншоты авторизованного вида без живого бэкенда.
 *
 * `/auth/me` подменяется фикстурой: иначе нижняя панель и лист «Ещё» для
 * вошедшего пользователя проверить нечем — их ветка кода просто не
 * выполняется.
 *
 * Playwright ставится разово (в зависимостях его нет — см. scripts/shots.mjs):
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *
 *   node scripts/shots-auth.mjs http://localhost:3000 /tmp/shots-auth
 */
import { mkdir } from "node:fs/promises";
import { chromium, devices } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "/tmp/shots-auth";
await mkdir(out, { recursive: true });

const ME = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "andrey",
  display_name: "Андрей",
  role: "admin",
  status: "active",
  identity_verified: false,
  email: "avvolob@gmail.com",
  onboarded_at: "2026-08-08T00:00:00Z",
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"], locale: "ru-RU" });

// Предикат вместо glob: glob-шаблон Playwright на абсолютный кросс-оригин URL
// здесь не срабатывал, и запрос уходил в сеть (ERR_CONNECTION_REFUSED).
// apiFetch ходит с credentials:"include", а при этом браузер не принимает
// Allow-Origin: * — нужен конкретный источник и Allow-Credentials.
const CORS = {
  "Access-Control-Allow-Origin": base,
  "Access-Control-Allow-Credentials": "true",
};

const json = (route, body) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: CORS,
    body: JSON.stringify(body),
  });

await context.route(
  (url) => url.port === "8000",
  (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/me") return json(route, ME);
    if (path === "/categories") return json(route, []);
    if (path === "/events") return json(route, []);
    if (path === "/seasons") return json(route, { items: [] });
    // Остальное — пусто: проверяем оболочку, а не данные.
    return json(route, []);
  },
);

const routes = process.argv[4] ? process.argv[4].split(",") : ["/events"];
const page = await context.newPage();

for (const route of routes) {
  const name = route.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "root";
  await page.goto(base + route, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/authed-${name}.png` });
  console.log(`  ${route} (вошёл) → ${out}/authed-${name}.png`);
}

// Открываем лист «Ещё».
const more = page.getByRole("button", { name: "Ещё" });
if (await more.count()) {
  await more.first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/more-sheet.png` });
  console.log(`  лист «Ещё» → ${out}/more-sheet.png`);
} else {
  console.log("  ! вкладка «Ещё» не найдена — панель отрисовалась как для гостя");
}

await browser.close();
