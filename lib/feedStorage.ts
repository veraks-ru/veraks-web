// Локальная память ленты-свайпа. Всё в try/catch (приватный режим, запрет
// хранилища) — при отказе лента работает, просто ничего не помнит.
//
// Ящик (outbox) — прогнозы, которые ещё не дошли до сервера: гостевые свайпы
// до входа, свайпы при потере сети или сессии, сброс очереди при уходе со
// страницы. Отправляется при следующем открытии ленты вошедшим человеком;
// PUT прогноза идемпотентен, повтор безопасен.

import type { ConfidenceGrade } from "./confidence";

const OUTBOX_KEY = "veraks.feed.outbox";
const SKIPPED_KEY = "veraks.feed.skipped";
const COUNT_KEY = "veraks.feed.count";
const GUEST_KEY = "veraks.feed.guest-continues";

export interface OutboxEntry {
  eventId: string;
  slug: string;
  title: string;
  grade: ConfidenceGrade;
  /** ISO-время свайпа — только для отладки и порядка отправки. */
  at: string;
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

export function readOutbox(): OutboxEntry[] {
  return readJson<OutboxEntry[]>(local, OUTBOX_KEY, []);
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
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
