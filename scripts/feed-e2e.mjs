/*
 * Сквозной прогон ленты против НАСТОЯЩЕГО локального кластера:
 * фронт :3000, бэкенд :8000 (с MAIL_HOST=localhost, чтобы письмо попало в
 * mailpit :8025), Postgres с демо-данными seed.py.
 *
 * Гость свайпает → шторка входа → письмо → ссылка из mailpit → возврат в
 * ленту → отложенный ответ дозаписан. Затем вошедший свайпает влево → через
 * окно отмены прогноз лежит на сервере.
 *
 *   node scripts/feed-e2e.mjs http://localhost:3000 kalibr@example.com /tmp/feed-e2e
 */
import fs from "node:fs";
import { chromium, devices } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const email = process.argv[3] || "kalibr@example.com";
const out = process.argv[4] || "/tmp/feed-e2e";
const API = process.env.API_BASE || "http://localhost:8000";
const MAILPIT = process.env.MAILPIT || "http://localhost:8025";
fs.mkdirSync(out, { recursive: true });

const fail = (msg) => {
  console.error("FAIL: " + msg);
  process.exitCode = 1;
};
const ok = (msg) => console.log("ok: " + msg);

async function latestLink(since) {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/messages?limit=1`)).json();
    const m = list.messages?.[0];
    if (m && new Date(m.Created).getTime() > since) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json();
      const text = (full.Text || "") + "\n" + (full.HTML || "").replace(/&amp;/g, "&");
      const match = text.match(/https?:\/\/[^\s"'<>]+\/auth\/email\/callback\?[^\s"'<>]+/);
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "ru-RU" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForSelector("article", { timeout: 15000 });
const firstTitle = (await page.locator("article h2").first().textContent())?.trim();
ok(`лента гостя, верхняя карточка: ${firstTitle}`);

const drag = async (dx) => {
  const box = await page.locator("article").first().boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) {
    await page.mouse.move(cx + (dx * i) / 14, cy);
    await page.waitForTimeout(12);
  }
  await page.mouse.up();
};

await drag(170);
await page.waitForSelector('[role="dialog"]');
ok("первый свайп гостя открыл вход");
await page.screenshot({ path: `${out}/1-gate.png` });

const since = Date.now() - 1000;
await page.getByPlaceholder("you@example.com").fill(email);
await page.getByRole("button", { name: "Получить ссылку для входа" }).click();
await page.getByText("Письмо отправлено").waitFor({ timeout: 10000 });
ok("письмо запрошено");

const link = await latestLink(since);
if (!link) {
  fail("ссылка из письма не найдена в mailpit");
} else {
  ok(`ссылка: ${link.replace(/token=[^&]+/, "token=…")}`);
  if (!/[?&]next=%2F(&|$)/.test(link)) fail("в ссылке нет next=%2F");
  // Ссылка строится от MAIL_LINK_BASE_URL бэкенда; открываем её на проверяемом фронте.
  const local = new URL(link);
  const target = `${base}${local.pathname}${local.search}`;
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/onboarding", { timeout: 15000 });
  ok(`после письма попали на ${new URL(page.url()).pathname}`);
  if (new URL(page.url()).pathname === "/") {
    // Дозапись ящика: тост «1 ответ засчитан» и прогноз на сервере
    await page.getByText(/засчитан/).waitFor({ timeout: 10000 }).then(() => ok("тост о дозаписи показан")).catch(() => fail("тоста о дозаписи нет"));
    await page.screenshot({ path: `${out}/2-after-login.png` });
    const feed = await (await fetch(`${API}/events/feed?limit=50`)).json();
    const first = feed.items.find((it) => it.title === firstTitle);
    // Гость видит событие в публичной ленте; для вошедшего проверяем через /prediction/me
    const cookies = (await ctx.cookies(API)).map((c) => `${c.name}=${c.value}`).join("; ");
    if (first) {
      const mine = await fetch(`${API}/events/${first.id}/prediction/me`, { headers: { cookie: cookies } });
      if (mine.status === 200) {
        const body = await mine.json();
        body.confidence_grade === "probably_yes" ? ok("прогноз гостя дозаписан как probably_yes") : fail(`грейд ${body.confidence_grade}`);
      } else fail(`prediction/me → ${mine.status}`);
    } else fail("первое событие не найдено в публичной ленте");

    // Вошедший: свайп влево → PUT через окно отмены
    const second = (await page.locator("article h2").first().textContent())?.trim();
    await drag(-170);
    await page.waitForTimeout(4800);
    const sec = feed.items.find((it) => it.title === second);
    if (sec) {
      const mine2 = await fetch(`${API}/events/${sec.id}/prediction/me`, { headers: { cookie: cookies } });
      const b = mine2.status === 200 ? await mine2.json() : null;
      b?.confidence_grade === "probably_no" ? ok("свайп влево записан как probably_no") : fail(`второй прогноз: ${mine2.status} ${b?.confidence_grade}`);
    }
    await page.screenshot({ path: `${out}/3-after-swipe.png` });
  }
}
console.log(errors.length ? "page errors: " + errors.join(" || ") : "page errors: none");
await browser.close();
