/**
 * Скриншоты ключевых экранов в мобильном вьюпорте.
 *
 * Дизайн проверяется глазами, а не описанием: раскладка, вылезающий текст и
 * налезающая на контент нижняя панель видны только на картинке.
 *
 * Playwright намеренно не в зависимостях: он нужен только для ручной проверки
 * и утяжелял бы `npm ci` в сборке образа. Ставится разово:
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *
 *   node scripts/shots.mjs http://localhost:3000 /tmp/shots
 *   node scripts/shots.mjs https://veraks.ru /tmp/shots-prod
 */
import { mkdir } from "node:fs/promises";
import { devices, chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "/tmp/shots";
const routes = process.argv[4]
  ? process.argv[4].split(",")
  : ["/events", "/leaderboards", "/seasons", "/offline", "/account"];

await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "ru-RU",
});
const page = await context.newPage();

for (const route of routes) {
  const name = route.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "root";
  try {
    await page.goto(base + route, { waitUntil: "networkidle", timeout: 20_000 });
  } catch {
    // networkidle не наступает при висящих запросах — снимаем что есть.
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  console.log(`  ${route} → ${out}/${name}.png`);
}

await browser.close();
