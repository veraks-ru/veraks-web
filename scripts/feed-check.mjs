/*
 * Прогон ленты-свайпа на iPhone-вьюпорте с подменой API (бэкенд не нужен).
 *
 * Гость: первый свайп открывает вход, «Смотреть без входа» — свайпы копятся
 * в ящике. Пользователь: свайп → тост → «Отменить» без запроса, свайп → PUT
 * через окно отмены, пропуск с клавиатуры, шторка деталей, конец стопки.
 * Скриншоты и журнал — в консоль и каталог.
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/feed-check.mjs http://localhost:3000 /tmp/feed-check
 */
import fs from "node:fs";
import { chromium, devices } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "/tmp/feed-check";
fs.mkdirSync(out, { recursive: true });
const API = "http://localhost:8000";

const iso = (d) => d.toISOString();
const now = new Date();
const days = (n) => new Date(now.getTime() + n * 86400000);
const cats = [
  { id: "c1", slug: "economy", title: "Экономика", description: "", parent_id: null, is_restricted: false },
  { id: "c2", slug: "sport", title: "Спорт", description: "", parent_id: null, is_restricted: false },
  { id: "c3", slug: "tech", title: "Технологии", description: "", parent_id: null, is_restricted: false },
];
const card = (i, title, cat, dist, desc) => ({
  id: `e${i}`, public_code: `code${i}`, title, description: desc,
  category_id: cat.id, created_by: "u", season_id: null, status: "open",
  opens_at: iso(days(-2)), closes_at: iso(days(i + 1)), resolves_at: iso(days(i + 3)),
  resolution_source: "Сайт Банка России, пресс-релиз по итогам заседания",
  resolution_criteria: "Ключевая ставка снижена хотя бы на 0,25 п.п. относительно текущей.",
  outcome: null, resolved_at: null, dispute_window_ends_at: null,
  created_at: iso(days(-3)), updated_at: iso(days(-3)),
  category: cat,
  crowd: { total_count: Object.values(dist).reduce((a, b) => a + b, 0), distribution: dist, mean_probability: "0.62" },
});
const cards = [
  card(1, "Ключевую ставку ЦБ снизят на заседании 24 октября?", cats[0], { definitely_no: 12, probably_no: 40, fifty_fifty: 30, probably_yes: 96, definitely_yes: 36 }, "Решение по ставке принимает совет директоров Банка России. Рынок ждёт сигнала после двух пауз подряд."),
  card(2, "«Зенит» станет чемпионом РПЛ в сезоне 2026/27?", cats[1], { definitely_no: 3, probably_no: 9, fifty_fifty: 8, probably_yes: 21, definitely_yes: 40 }, "Чемпионство определяется по итогам 30 туров."),
  card(3, "Яндекс выпустит собственный смартфон до конца года?", cats[2], {}, ""),
];

async function run(name, me) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "ru-RU" });
  const puts = [];
  await ctx.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const m = route.request().method();
    const p = url.pathname;
    if (p === "/auth/me") return me ? route.fulfill({ json: me }) : route.fulfill({ status: 401, json: { detail: "no" } });
    if (p === "/auth/refresh") return route.fulfill({ status: 401, json: {} });
    if (p === "/billing/subscriptions/me") return route.fulfill({ status: 404, json: {} });
    if (p === "/categories") return route.fulfill({ json: cats });
    if (p === "/events/feed") return route.fulfill({ json: { items: cards, next_cursor: null } });
    if (m === "PUT" && /^\/events\/[^/]+\/prediction$/.test(p)) {
      puts.push({ path: p, body: route.request().postDataJSON(), at: Date.now() });
      return route.fulfill({ json: { id: "p", user_id: "u", event_id: p.split("/")[2], confidence_grade: route.request().postDataJSON().confidence_grade, probability: "0.70", is_locked: false, brier_score: null, scored_at: null, created_at: iso(now), updated_at: iso(now) } });
    }
    if (p === "/auth/providers") return route.fulfill({ json: { email: true, esia: false } });
    if (p === "/auth/email/request") return route.fulfill({ status: 202, body: "" });
    if (p.startsWith("/users/me/notifications")) return route.fulfill({ json: { unread: 0 } });
    return route.fulfill({ status: 404, json: { detail: "mock 404 " + p } });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("article");
  await page.screenshot({ path: `${out}/${name}-1-feed.png` });

  const topTitle = async () => (await page.locator("article h2").first().textContent())?.trim();
  const drag = async (dx, dy, hold = false) => {
    const box = await page.locator("article").first().boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps);
      await page.waitForTimeout(12);
    }
    if (hold) return;
    await page.mouse.up();
  };

  const log = [];
  log.push(`top: ${await topTitle()}`);
  // 1) свайп вправо с удержанием — штамп «Да»
  await drag(150, -10, true);
  await page.screenshot({ path: `${out}/${name}-2-drag-right.png` });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-3-after-right.png` });
  log.push(`after right, top: ${await topTitle()}`);
  log.push(`toast: ${(await page.locator('[role="status"]').allTextContents()).join(" | ")}`);
  if (me) {
    // undo → карточка вернулась, PUT не ушёл
    await page.getByRole("button", { name: "Отменить" }).click();
    await page.waitForTimeout(500);
    log.push(`after undo, top: ${await topTitle()}`);
    await page.waitForTimeout(4500);
    log.push(`puts after undo+4.5s: ${puts.length}`);
    // свайп влево → через 4 с PUT probably_no
    await drag(-170, 0);
    await page.waitForTimeout(4600);
    log.push(`puts after left+4.6s: ${JSON.stringify(puts.map((p) => [p.path, p.body]))}`);
    // клавиатура: вверх = пропуск
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(500);
    log.push(`after ArrowUp, top: ${await topTitle()}`);
    await page.screenshot({ path: `${out}/${name}-4-after-skip.png` });
    // детали
    await page.getByRole("button", { name: "Подробнее" }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${name}-5-details.png` });
    await page.keyboard.press("Escape");
    // кнопка «Да» → последняя карточка → конец стопки
    await page.getByRole("button", { name: "Да", exact: true }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${name}-6-end.png` });
    log.push(`end text: ${(await page.locator("main").textContent())?.includes("больше нет") ? "end-of-stack shown" : "no end state"}`);
  } else {
    // гость: первый свайп → шторка входа, карточка на месте
    await page.screenshot({ path: `${out}/${name}-4-gate.png` });
    log.push(`gate: ${await page.locator('[role="dialog"]').count()} dialog(s), top: ${await topTitle()}`);
    await page.getByRole("button", { name: "Смотреть без входа" }).click();
    await page.waitForTimeout(300);
    await drag(170, 0);
    await page.waitForTimeout(600);
    log.push(`guest after 2nd swipe, top: ${await topTitle()}`);
    await page.screenshot({ path: `${out}/${name}-5-waiting.png` });
    log.push(`header: ${(await page.locator("header").textContent())?.trim().slice(0, 120)}`);
    log.push(`outbox: ${await page.evaluate(() => localStorage.getItem("veraks.feed.outbox"))}`);
  }
  log.push(`page errors: ${errors.length ? errors.join(" || ") : "none"}`);
  console.log(`\n=== ${name}\n` + log.join("\n"));
  await browser.close();
}

await run("guest", null);
await run("user", { id: "u1", username: "kalibr", display_name: "Калибр", role: "user", status: "active", needs_onboarding: false, missing_consents: [], email: "k@example.com", identity_verified: false });
