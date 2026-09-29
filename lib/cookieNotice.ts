"use client";

// Отметка «уведомление о cookie прочитано». Отдельный крошечный стор, потому
// что на отметку смотрят двое: сам баннер и предложение установить
// приложение — оно ждёт, пока баннер уйдёт, чтобы две плашки не легли
// друг на друга.

import { useSyncExternalStore } from "react";

const ACK_KEY = "veraks:cookie-notice";
const listeners = new Set<() => void>();

// Значение в памяти: без localStorage (приватный режим) отметка живёт до
// перезагрузки, а не теряется сразу.
let ackedInMemory = false;

function read(): boolean {
  if (ackedInMemory) return true;
  try {
    return localStorage.getItem(ACK_KEY) !== null;
  } catch {
    return false;
  }
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Прочитано ли уведомление. На сервере — true: баннер не попадает в HTML и
 * не мигает у тех, кто его уже закрыл.
 */
export function useCookieNoticeAcked(): boolean {
  return useSyncExternalStore(subscribe, read, () => true);
}

export function ackCookieNotice(): void {
  ackedInMemory = true;
  try {
    localStorage.setItem(ACK_KEY, new Date().toISOString());
  } catch {
    /* приватный режим — хватит отметки в памяти */
  }
  listeners.forEach((l) => l());
}
