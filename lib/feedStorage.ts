// Локальная память ленты-свайпа. Всё в try/catch (приватный режим, запрет
// хранилища) — при отказе лента работает, просто ничего не помнит.
//
// Ящик (outbox) — прогнозы, которые ещё не дошли до сервера: гостевые свайпы
// до входа, свайпы при потере сети или сессии, сброс очереди при уходе со
// страницы, и каждая отправка на время самой отправки (write-ahead).
// Отправляется при следующем открытии ленты вошедшим человеком; PUT прогноза
// идемпотентен, повтор безопасен. У каждой записи есть владелец: чужие
// ответы с общего устройства под свою учётку не уходят.

import type { ConfidenceGrade } from "./confidence";
import type { FeedCard } from "./types";

const OUTBOX_KEY = "veraks.feed.outbox";
const SKIPPED_KEY = "veraks.feed.skipped";
const COUNT_KEY = "veraks.feed.count";
const GUEST_KEY = "veraks.feed.guest-continues";

export const GUEST_OWNER = "guest";
/** После стольких неудачных попыток или дней ожидания запись выбрасывается. */
export const OUTBOX_MAX_ATTEMPTS = 8;
export const OUTBOX_MAX_AGE_MS = 14 * 86_400_000;

export interface OutboxEntry {
  eventId: string;
  slug: string;
  title: string;
  grade: ConfidenceGrade;
  /** ISO-время свайпа — порядок отправки и срок годности. */
  at: string;
  /** Чей ответ: GUEST_OWNER или id пользователя. */
  owner: string;
  attempts: number;
}

function isEntry(v: unknown): v is OutboxEntry {
  const e = v as Partial<OutboxEntry> | null;
  return (
    !!e &&
    typeof e === "object" &&
    typeof e.eventId === "string" &&
    typeof e.grade === "string" &&
    typeof e.owner === "string" &&
    typeof e.at === "string"
  );
}

function readJson<T>(storage: () => Storage, key: string, fallback: T): T {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown): void {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно — молча */
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

/* ── Ящик отложенных прогнозов ── */

export function outboxEntry(card: FeedCard, grade: ConfidenceGrade, owner: string): OutboxEntry {
  return {
    eventId: card.id,
    slug: card.slug,
    title: card.title,
    grade,
    at: new Date().toISOString(),
    owner,
    attempts: 0,
  };
}

/** Все записи; битые (чужого формата) отбрасываются, а не превращаются в PUT /events/undefined. */
export function readOutbox(): OutboxEntry[] {
  return readJson<unknown[]>(local, OUTBOX_KEY, [])
    .filter(isEntry)
    .map((e) => ({
      ...e,
      slug: typeof e.slug === "string" ? e.slug : "",
      title: typeof e.title === "string" ? e.title : "",
      attempts: typeof e.attempts === "number" ? e.attempts : 0,
    }));
}

/** Записи, которые можно отправить под этой учёткой: свои и гостевые. */
export function readOutboxFor(owner: string): OutboxEntry[] {
  return readOutbox().filter((e) => e.owner === GUEST_OWNER || e.owner === owner);
}

/** Добавить или заменить запись по событию (последнее решение важнее). */
export function upsertOutbox(entry: OutboxEntry): void {
  const rest = readOutbox().filter((e) => e.eventId !== entry.eventId);
  writeJson(local, OUTBOX_KEY, [...rest, entry]);
}

export function removeFromOutbox(eventId: string): void {
  writeJson(
    local,
    OUTBOX_KEY,
    readOutbox().filter((e) => e.eventId !== eventId),
  );
}

export function bumpOutboxAttempt(eventId: string): void {
  writeJson(
    local,
    OUTBOX_KEY,
    readOutbox().map((e) => (e.eventId === eventId ? { ...e, attempts: e.attempts + 1 } : e)),
  );
}

/** Выход из учётки: её ответы с этого устройства больше никому не принадлежат. Гостевые остаются. */
export function forgetUserOutbox(): void {
  writeJson(
    local,
    OUTBOX_KEY,
    readOutbox().filter((e) => e.owner === GUEST_OWNER),
  );
}

export function isOutboxEntryStale(e: OutboxEntry, now: number = Date.now()): boolean {
  const age = now - Date.parse(e.at);
  return e.attempts >= OUTBOX_MAX_ATTEMPTS || !Number.isFinite(age) || age > OUTBOX_MAX_AGE_MS;
}

/* ── Пропущенные в этой сессии ── */

export function readSkipped(): Set<string> {
  return new Set(readJson<string[]>(session, SKIPPED_KEY, []));
}

export function addSkipped(eventId: string): void {
  const s = readSkipped();
  s.add(eventId);
  writeJson(session, SKIPPED_KEY, [...s]);
}

export function clearSkipped(): void {
  writeJson(session, SKIPPED_KEY, []);
}

/* ── Счётчик «сегодня» ── */

/** Местная дата YYYY-MM-DD: «сегодня» — по часам человека, а не по UTC. */
function today(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function readDailyCount(): number {
  const v = readJson<{ day: string; n: number } | null>(local, COUNT_KEY, null);
  return v && v.day === today() ? v.n : 0;
}

export function bumpDailyCount(): number {
  const n = readDailyCount() + 1;
  writeJson(local, COUNT_KEY, { day: today(), n });
  return n;
}

/* ── Гость решил свайпать без входа ── */

export function guestContinues(): boolean {
  return readJson<boolean>(session, GUEST_KEY, false);
}

export function rememberGuestContinues(): void {
  writeJson(session, GUEST_KEY, true);
}
