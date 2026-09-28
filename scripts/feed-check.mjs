/*
 * Прогон ленты-свайпа на iPhone-вьюпорте с подменой API (бэкенд не нужен).
 *
 * Гость: первый свайп открывает вход, окно не расползается вширь, «Смотреть
 * без входа» — свайпы копятся в ящике. Пользователь: свайп → тост →
 * «Отменить» без запроса; свайп → PUT через окно отмены; пропуск с
 * клавиатуры; «потянул, замер, отпустил» не считается; отмена во время
 * полёта не переписывает чужой ответ; Enter на кнопке «Да» свайпает;
 * конец стопки. Отдельно: упавшая следующая страница не порождает шторм
 * запросов, а показывает «Проверить снова».
 *
 * Каждая проверка пишет ok/FAIL, код выхода 1 при любом FAIL.
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

const check = (ok, msg) => {
  console.log((ok ? "ok: " : "FAIL: ") + msg);
  if (!ok) process.exitCode = 1;
};

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
const CARDS = [
  card(1, "Ключевую ставку ЦБ снизят на заседании 24 октября?", cats[0], { definitely_no: 12, definitely_no: 40, fifty_fifty: 30, definitely_yes: 96, definitely_yes: 36 }, "Решение по ставке принимает совет директоров Банка России."),
  card(2, "«Зенит» станет чемпионом РПЛ в сезоне 2026/27?", cats[1], { definitely_no: 3, definitely_no: 9, fifty_fifty: 8, definitely_yes: 21, definitely_yes: 40 }, "Чемпионство определяется по итогам 30 туров."),
  card(3, "Яндекс выпустит собственный смартфон до конца года?", cats[2], {}, ""),
  card(4, "Курс доллара опустится ниже 80 рублей к Новому году?", cats[0], { definitely_no: 5, definitely_yes: 7 }, ""),
];
const answered = (c, grade) => ({ ...c, my_prediction: { confidence_grade: grade, updated_at: iso(now) } });
const MINE = [answered(CARDS[0], "definitely_yes"), answered(CARDS[1], "probably_no"), answered(CARDS[2], "fifty_fifty")];
const ME = { id: "u1", username: "kalibr", display_name: "Калибр", role: "user", status: "active", needs_onboarding: false, missing_consents: [], email: "k@example.com", identity_verified: false };

/** Подмена API. feed(cursor) → { json } | { status }. Возвращает журнал запросов. */
async function mockApi(ctx, { me, feed, answered = null, putStatus = 200 }) {
  const log = { puts: [], feed: [], answered: [] };
  await ctx.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const m = route.request().method();
    const p = url.pathname;
    if (p === "/auth/me") return me ? route.fulfill({ json: me }) : route.fulfill({ status: 401, json: { detail: "no" } });
    if (p === "/auth/refresh") return route.fulfill({ status: 401, json: {} });
    if (p === "/billing/subscriptions/me") return route.fulfill({ status: 404, json: {} });
    if (p === "/categories") return route.fulfill({ json: cats });
    if (p === "/events/feed") {
      const cursor = url.searchParams.get("cursor");
      if (url.searchParams.get("answered") === "true") {
        log.answered.push(cursor);
        const a = answered ? answered(cursor) : { json: { items: [], next_cursor: null } };
        return a.json ? route.fulfill({ json: a.json }) : route.fulfill({ status: a.status, json: { detail: "mock" } });
      }
      log.feed.push(cursor);
      const r = feed(cursor);
      return r.json ? route.fulfill({ json: r.json }) : route.fulfill({ status: r.status, json: { detail: "mock" } });
    }
    if (m === "PUT" && /^\/events\/[^/]+\/prediction$/.test(p)) {
      const body = route.request().postDataJSON();
      log.puts.push({ event: p.split("/")[2], grade: body.confidence_grade, at: Date.now() });
      if (putStatus !== 200) return route.fulfill({ status: putStatus, json: { error: "PredictionSubscriptionRequiredError", detail: "mock" } });
      return route.fulfill({ json: { id: "p", user_id: "u", event_id: p.split("/")[2], confidence_grade: body.confidence_grade, probability: "0.70", is_locked: false, brier_score: null, scored_at: null, created_at: iso(now), updated_at: iso(now) } });
    }
    if (p === "/auth/providers") return route.fulfill({ json: { email: true, esia: false } });
    if (p === "/auth/email/request") return route.fulfill({ status: 202, body: "" });
    if (p.startsWith("/users/me/notifications")) return route.fulfill({ json: { unread: 0 } });
    return route.fulfill({ status: 404, json: { detail: "mock 404 " + p } });
  });
  return log;
}

const singlePage = (cards) => () => ({ json: { items: cards, next_cursor: null } });

async function open(browser, opts) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "ru-RU" });
  const log = await mockApi(ctx, opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !/status of (401|402|404|500)/.test(msg.text())) errors.push(msg.text());
  });
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("article, [role=alert]", { timeout: 15000 });
  const topTitle = async () => (await page.locator("article h2").first().textContent().catch(() => null))?.trim() ?? null;
  const drag = async (dx, dy = 0, { hold = 0, steps = 14 } = {}) => {
    const box = await page.locator("article").first().boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps);
      await page.waitForTimeout(12);
    }
    if (hold) await page.waitForTimeout(hold);
    await page.mouse.up();
  };
  const dismissInstallHint = async () => {
    const later = page.getByRole("button", { name: "Не сейчас" });
    if (await later.count()) await later.click();
  };
  return { ctx, page, log, errors, topTitle, drag, dismissInstallHint };
}

const browser = await chromium.launch();

/* ── Гость ── */
{
  console.log("\n=== guest");
  const s = await open(browser, { me: null, feed: singlePage(CARDS) });
  const { page } = s;
  const first = await s.topTitle();
  check(first === CARDS[0].title, `верхняя карточка: ${first}`);
  await page.screenshot({ path: `${out}/guest-1-feed.png` });
  await s.drag(150, -10, { hold: 1 });
  await page.screenshot({ path: `${out}/guest-2-drag-right.png` });
  await page.waitForTimeout(400);
  check((await page.locator('[role="dialog"]').count()) === 1, "первый свайп гостя открыл шторку входа");
  check((await s.topTitle()) === first, "карточка гостя осталась на месте");
  const vw = await page.evaluate(() => innerWidth);
  check(vw === 390, `окно не расползлось вширь при открытой шторке (innerWidth=${vw})`);
  check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, "нет горизонтального overflow");
  await page.screenshot({ path: `${out}/guest-3-gate.png` });
  const cont = page.getByRole("button", { name: "Смотреть без входа" });
  await cont.click({ timeout: 5000 }).then(() => check(true, "«Смотреть без входа» нажалась"), () => check(false, "«Смотреть без входа» не нажалась"));
  await page.waitForTimeout(300);
  await s.drag(170);
  await page.waitForTimeout(600);
  check((await s.topTitle()) === CARDS[1].title, "после «смотреть без входа» свайп улетает");
  const outbox = await page.evaluate(() => JSON.parse(localStorage.getItem("veraks.feed.outbox") || "[]"));
  check(outbox.length === 1 && outbox[0].owner === "guest" && outbox[0].grade === "definitely_yes", `ящик гостя: ${JSON.stringify(outbox.map((e) => [e.eventId, e.grade, e.owner]))}`);
  check(/1 ответ ждёт входа/.test(await page.locator("header").textContent()), "в шапке «1 ответ ждёт входа»");
  await page.screenshot({ path: `${out}/guest-4-waiting.png` });
  check(s.errors.length === 0, `ошибок страницы нет (${s.errors.join(" || ")})`);
  await s.ctx.close();
}

/* ── Пользователь без подписки: 402 → шторка с тарифами ── */
{
  console.log("\n=== user-402");
  const s = await open(browser, { me: ME, feed: singlePage(CARDS), putStatus: 402 });
  const { page, log } = s;
  await s.dismissInstallHint();
  await s.drag(170);
  await page.waitForTimeout(4800);
  check(log.puts.length === 1, `PUT ушёл один раз (${log.puts.length})`);
  const dlg = page.locator('[role="dialog"]');
  check((await dlg.count()) === 1, "402 открыл шторку");
  const text = (await dlg.textContent().catch(() => "")) ?? "";
  check(/по подписке/.test(text) && new RegExp(CARDS[0].title.slice(0, 20)).test(text), `в шторке — про подписку и событие: ${text.slice(0, 80)}`);
  check((await dlg.getByRole("link", { name: "Посмотреть тарифы" }).getAttribute("href")) === "/pricing", "ссылка ведёт на /pricing");
  const outbox = await page.evaluate(() => JSON.parse(localStorage.getItem("veraks.feed.outbox") || "[]"));
  check(outbox.length === 0, `ящик после 402 пуст (${outbox.length})`);
  await page.screenshot({ path: `${out}/user402-1-sheet.png` });
  await page.getByRole("button", { name: "Смотреть без участия" }).click();
  await page.waitForTimeout(300);
  check((await dlg.count()) === 0, "«Смотреть без участия» закрыла шторку");
  check(s.errors.length === 0, `ошибок страницы нет (${s.errors.join(" || ")})`);
  await s.ctx.close();
}

/* ── Пользователь ── */
{
  console.log("\n=== user");
  const s = await open(browser, { me: ME, feed: singlePage(CARDS) });
  const { page, log } = s;
  await page.screenshot({ path: `${out}/user-1-feed.png` });

  // свайп вправо → следующая карточка, тост с отменой
  await s.drag(150, -10);
  await page.waitForTimeout(500);
  check((await s.topTitle()) === CARDS[1].title, "свайп вправо: следующая карточка наверху");
  check((await page.getByRole("button", { name: "Отменить" }).count()) === 1, "тост с «Отменить» показан");
  await page.screenshot({ path: `${out}/user-2-after-right.png` });

  // отмена → карточка вернулась, PUT не ушёл
  await page.getByRole("button", { name: "Отменить" }).click();
  await page.waitForTimeout(500);
  check((await s.topTitle()) === CARDS[0].title, "отмена вернула карточку");
  await page.waitForTimeout(4500);
  check(log.puts.length === 0, `после отмены запросов нет (${log.puts.length})`);

  // детали
  await s.dismissInstallHint();
  await page.getByRole("button", { name: "Подробнее" }).first().click();
  await page.waitForTimeout(300);
  check((await page.locator('[role="dialog"]').count()) === 1, "шторка деталей открылась");
  check(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), "фокус внутри шторки");
  await page.screenshot({ path: `${out}/user-3-details.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check((await page.locator('[role="dialog"]').count()) === 0, "Esc закрыл шторку");

  // свайп влево → PUT definitely_no через окно отмены
  await s.drag(-170);
  await page.waitForTimeout(4600);
  check(log.puts.length === 1 && log.puts[0].event === "e1" && log.puts[0].grade === "definitely_no", `свайп влево записан: ${JSON.stringify(log.puts)}`);

  // пропуск с клавиатуры
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(500);
  check((await s.topTitle()) === CARDS[2].title, "ArrowUp пропустил карточку");

  // потянул, замер, отпустил — не считается
  await s.drag(100, 0, { hold: 1200, steps: 4 });
  await page.waitForTimeout(400);
  check((await s.topTitle()) === CARDS[2].title, "«потянул, замер, отпустил» — карточка на месте");

  // отмена во время полёта не переписывает ответ
  await s.drag(170);
  await page.waitForTimeout(50);
  const undo = page.getByRole("button", { name: "Отменить" });
  if (await undo.count()) await undo.click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(600);
  const topAfterFlight = await s.topTitle();
  check(topAfterFlight === CARDS[3].title || topAfterFlight === CARDS[2].title, `после отмены в полёте стопка согласована (top: ${topAfterFlight})`);
  await page.waitForTimeout(4600);
  const wrong = log.puts.filter((p) => (p.event === "e3" && p.grade !== "definitely_yes") || p.event === "e2" || p.event === "e4");
  check(wrong.length === 0, `ни одного чужого/неверного PUT: ${JSON.stringify(log.puts.map((p) => [p.event, p.grade]))}`);
  if (topAfterFlight === CARDS[2].title) {
    await s.drag(170);
    await page.waitForTimeout(600);
  }

  // Enter на сфокусированной кнопке «Да» — свайп, а не детали
  await page.getByRole("button", { name: "Да", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  check((await page.locator('[role="dialog"]').count()) === 0, "Enter на кнопке не открыл детали");
  check((await page.locator("article").count()) === 0, "Enter на «Да» свайпнул последнюю карточку");
  check(/закончились/.test(await page.locator("main").textContent()), "показан конец стопки");
  await page.screenshot({ path: `${out}/user-4-end.png` });
  await page.waitForTimeout(4600);
  const e4 = log.puts.find((p) => p.event === "e4");
  check(e4?.grade === "definitely_yes", `последний свайп записан как definitely_yes (${JSON.stringify(e4)})`);
  check(s.errors.length === 0, `ошибок страницы нет (${s.errors.join(" || ")})`);
  await s.ctx.close();
}

/* ── Просмотр своих ответов ── */
{
  console.log("\n=== review answered");
  const s = await open(browser, { me: ME, feed: singlePage([CARDS[3]]), answered: singlePage(MINE) });
  const { page, log } = s;
  await s.dismissInstallHint();
  await s.drag(170); // единственная новая карточка — «Да»
  await page.waitForTimeout(700);
  check((await page.locator("article").count()) === 0, "новые карточки кончились");
  const review = page.getByRole("button", { name: "Листать мои ответы" });
  await review.waitFor({ timeout: 5000 }).catch(() => {});
  check((await review.count()) === 1, "конец стопки предлагает листать ответы");
  check(log.answered.length >= 1, `первая страница ответов подгружена заранее (${log.answered.length})`);
  check((await page.getByRole("button", { name: "Позвать друзей" }).count()) === 1, "и позвать друзей");
  await page.screenshot({ path: `${out}/review-1-end.png` });

  await review.click();
  await page.waitForSelector("article", { timeout: 5000 });
  check((await s.topTitle()) === MINE[0].title, "первая карточка просмотра — первый ответ");
  const strip = page.locator("article").first().getByTestId("answer-strip");
  check(/Точно да/.test((await strip.textContent()) ?? ""), "полоса «Ваш ответ · Точно да»");
  check(/только листает/.test(await page.getByTestId("review-line").textContent()), "строка «свайп только листает»");
  check((await page.getByRole("button", { name: "Да", exact: true }).count()) === 0, "кнопок «Да/Нет» в просмотре нет");
  check((await page.getByRole("link", { name: "Изменить ответ" }).getAttribute("href")) === `/events/${MINE[0].public_code}`, "«Изменить ответ» ведёт на событие");
  await page.screenshot({ path: `${out}/review-2-card.png` });

  // Единственный законный PUT в сценарии — по новой карточке e4 (первый свайп выше).
  const reviewPuts = () => log.puts.filter((p) => p.event !== "e4");
  await s.drag(220); // вбок — пружина, карточка остаётся
  await page.waitForTimeout(500);
  check((await s.topTitle()) === MINE[0].title, "свайп вправо в просмотре не листает");
  await s.drag(-220);
  await page.waitForTimeout(500);
  check((await s.topTitle()) === MINE[0].title, "свайп влево в просмотре не листает");
  await page.waitForTimeout(4600);
  check(reviewPuts().length === 0, `в просмотре ни одного PUT (${JSON.stringify(reviewPuts())})`);

  await s.drag(0, -260); // вверх — дальше
  await page.waitForTimeout(700);
  check((await s.topTitle()) === MINE[1].title, "свайп вверх — следующий ответ");
  await s.drag(0, 260); // вниз — назад
  await page.waitForTimeout(800);
  check((await s.topTitle()) === MINE[0].title, "свайп вниз — предыдущий ответ");
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(700);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(700);
  check((await s.topTitle()) === MINE[2].title, "ArrowUp дважды — третий ответ");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  check((await s.topTitle()) === MINE[2].title, "ArrowRight в просмотре ничего не делает");
  await page.getByRole("button", { name: "Дальше" }).click();
  await page.waitForTimeout(700);
  check((await page.locator("article").count()) === 0, "после последнего ответа — конец просмотра");
  check(/все ваши ответы/.test(await page.locator("main").textContent()), "текст «Это все ваши ответы»");
  await page.screenshot({ path: `${out}/review-3-end.png` });
  await page.getByRole("button", { name: "Смотреть сначала" }).click();
  await page.waitForSelector("article", { timeout: 5000 });
  check((await s.topTitle()) === MINE[0].title, "«Смотреть сначала» вернул к первому ответу");
  check(s.errors.length === 0, `ошибок страницы нет (${s.errors.join(" || ")})`);
  await s.ctx.close();
}

/* ── Гость: конец стопки без «моих ответов» ── */
{
  console.log("\n=== guest end");
  const s = await open(browser, { me: null, feed: singlePage([CARDS[3]]) });
  const { page, log } = s;
  await s.dismissInstallHint();
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(700);
  check((await page.locator("article").count()) === 0, "гость пропустил единственную карточку");
  check((await page.getByRole("button", { name: "Листать мои ответы" }).count()) === 0, "гостю ответы не предлагаются");
  check(log.answered.length === 0, "и answered-запросов нет");
  check(s.errors.length === 0, `ошибок страницы нет (${s.errors.join(" || ")})`);
  await s.ctx.close();
}

/* ── Упавшая следующая страница ── */
{
  console.log("\n=== next page fails");
  const s = await open(browser, {
    me: ME,
    feed: (cursor) => (cursor ? { status: 500 } : { json: { items: CARDS.slice(0, 2), next_cursor: "c1" } }),
  });
  const { page, log } = s;
  await page.waitForTimeout(2500);
  const withCursor = log.feed.filter((c) => c === "c1").length;
  check(withCursor <= 2, `упавший курсор не долбится (запросов с курсором: ${withCursor})`);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1500);
  check((await page.getByRole("button", { name: "Проверить снова" }).count()) === 1, "стопка пуста → «Проверить снова»");
  check(log.feed.filter((c) => c === "c1").length <= 2, `и после опустошения стопки повторов нет (${log.feed.filter((c) => c === "c1").length})`);
  await page.screenshot({ path: `${out}/retry-1-error.png` });
  check(s.errors.length === 0, `ошибок страницы нет (${s.errors.join(" || ")})`);
  await s.ctx.close();
}

/* ── Широкий экран: доска карточек ── */
{
  console.log("\n=== desktop board");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ru-RU" });
  const log = await mockApi(ctx, { me: ME, feed: singlePage(CARDS) });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const cards = page.locator("ul[aria-label='Открытые события'] > li:not([aria-hidden])");
  await cards.first().waitFor({ timeout: 15000 });
  check((await cards.count()) === CARDS.length, `доска показывает все карточки (${await cards.count()})`);
  check((await page.getByRole("link", { name: "Лидерборды" }).count()) === 1, "сверху обычная шапка с разделами");
  check((await page.locator("article h2").count()) === 0, "стопки на широком экране нет");
  await page.screenshot({ path: `${out}/desktop-1-board.png` });
  await cards.first().getByRole("button", { name: "Да", exact: true }).click();
  await page.waitForTimeout(500);
  check((await cards.count()) === CARDS.length - 1, "ответ «Да» убрал карточку из сетки");
  check((await page.getByRole("button", { name: "Отменить" }).count()) === 1, "тост с «Отменить» внизу");
  await page.screenshot({ path: `${out}/desktop-2-after-yes.png` });
  await page.getByRole("button", { name: "Отменить" }).click();
  await page.waitForTimeout(400);
  check((await cards.count()) === CARDS.length, "отмена вернула карточку");
  await cards.first().getByRole("button", { name: "Нет", exact: true }).click();
  await page.waitForTimeout(4800);
  check(log.puts.length === 1 && log.puts[0].grade === "definitely_no", `«Нет» записан через окно отмены: ${JSON.stringify(log.puts.map((p) => [p.event, p.grade]))}`);
  check(errors.length === 0, `ошибок страницы нет (${errors.join(" || ")})`);
  await ctx.close();
}

/* ── Широкий экран: просмотр ответов ── */
{
  console.log("\n=== desktop review");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ru-RU" });
  const log = await mockApi(ctx, { me: ME, feed: singlePage([]), answered: singlePage(MINE) });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const review = page.getByRole("button", { name: "Листать мои ответы" });
  await review.waitFor({ timeout: 8000 }).catch(() => {});
  check((await review.count()) === 1, "пустая доска предлагает листать ответы");
  await review.click();
  const mine = page.locator("ul[aria-label='Мои ответы'] > li");
  await mine.first().waitFor({ timeout: 8000 });
  check((await mine.count()) === MINE.length, `доска ответов показывает все (${await mine.count()})`);
  check((await page.getByTestId("answer-strip").count()) === MINE.length, "у каждой карточки полоса с ответом");
  check((await page.getByRole("button", { name: "Да", exact: true }).count()) === 0, "кнопок ответа нет");
  check((await page.getByRole("link", { name: "Изменить ответ" }).count()) === MINE.length, "у каждой — «Изменить ответ»");
  await page.screenshot({ path: `${out}/review-4-board.png`, fullPage: true });
  await page.getByRole("button", { name: "К новым" }).click();
  await page.waitForTimeout(800);
  check((await mine.count()) === 0, "«К новым» вернул обычную ленту");
  check(log.puts.length === 0, "PUT не было");
  check(errors.length === 0, `ошибок страницы нет (${errors.join(" || ")})`);
  await ctx.close();
}

await browser.close();
console.log(process.exitCode ? "\nЕСТЬ ПАДЕНИЯ" : "\nВсе проверки пройдены");
