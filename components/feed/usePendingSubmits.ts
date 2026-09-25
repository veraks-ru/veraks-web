"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { putPrediction, putPredictionKeepalive } from "@/lib/api/endpoints";
import type { ConfidenceGrade } from "@/lib/confidence";
import { UNDO_MS, type SwipeDecision } from "@/lib/feed";
import { outboxEntry, removeFromOutbox, upsertOutbox } from "@/lib/feedStorage";
import type { FeedCard } from "@/lib/types";

export interface PendingSubmit {
  key: number;
  card: FeedCard;
  direction: SwipeDecision;
  grade: ConfidenceGrade;
  /** Чей ответ — под него запись ложится в ящик. */
  owner: string;
}

interface Callbacks {
  onCommitted: (p: PendingSubmit) => void;
  /** Приём закрылся, пока прогноз ждал отправки (409). */
  onClosed: (p: PendingSubmit) => void;
  /** Сервер отверг насовсем (404, 422, чужой 403) — из ящика убрано. */
  onRejected: (p: PendingSubmit) => void;
  /** Согласия не подтверждены (403) — запись ждёт в ящике. */
  onConsentRequired: () => void;
  /** Сессии нет (401) — запись ждёт в ящике. */
  onUnauthorized: () => void;
  /** Сеть или сервер не ответили — запись ждёт в ящике до следующего раза. */
  onDeferred: (p: PendingSubmit) => void;
}

const RETRY_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Отложенная отправка свайпов с окном на «Отменить».
 *
 * Удалить прогноз нельзя (все прогнозы засчитываются), поэтому отмена
 * возможна только до отправки: карточка улетает сразу, PUT уходит через
 * UNDO_MS. Отправки идут строго по очереди. Перед отправкой запись ложится в
 * ящик (write-ahead): закрытая посреди запроса вкладка ничего не теряет. При
 * уходе со страницы всё, что ещё ждало, уходит keepalive-запросом.
 */
export function usePendingSubmits(cb: Callbacks) {
  const pending = useRef(new Map<number, { entry: PendingSubmit; timer: ReturnType<typeof setTimeout> }>());
  const chain = useRef<Promise<void>>(Promise.resolve());
  const seq = useRef(0);
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const [last, setLast] = useState<PendingSubmit | null>(null);

  const send = useCallback(async (entry: PendingSubmit, retried = false): Promise<void> => {
    upsertOutbox(outboxEntry(entry.card, entry.grade, entry.owner));
    try {
      await putPrediction(entry.card.id, entry.grade);
      removeFromOutbox(entry.card.id);
      cbRef.current.onCommitted(entry);
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      if (api?.status === 409) {
        removeFromOutbox(entry.card.id);
        cbRef.current.onClosed(entry);
        return;
      }
      if (api?.status === 403 && api.code === "ConsentRequiredError") {
        cbRef.current.onConsentRequired();
        return;
      }
      if (api?.status === 401) {
        cbRef.current.onUnauthorized();
        return;
      }
      if (api && api.status >= 400 && api.status < 500) {
        // Повторять бессмысленно: события нет, тело не то, доступа нет.
        removeFromOutbox(entry.card.id);
        cbRef.current.onRejected(entry);
        return;
      }
      if (api?.code === "network" && !retried) {
        await sleep(RETRY_MS);
        return send(entry, true);
      }
      cbRef.current.onDeferred(entry);
    }
  }, []);

  const commit = useCallback(
    (entry: PendingSubmit) => {
      pending.current.delete(entry.key);
      setLast((l) => (l?.key === entry.key ? null : l));
      chain.current = chain.current.then(() => send(entry));
    },
    [send],
  );

  const enqueue = useCallback(
    (card: FeedCard, direction: SwipeDecision, grade: ConfidenceGrade, owner: string): PendingSubmit => {
      const entry: PendingSubmit = { key: ++seq.current, card, direction, grade, owner };
      const timer = setTimeout(() => commit(entry), UNDO_MS);
      pending.current.set(entry.key, { entry, timer });
      setLast(entry);
      return entry;
    },
    [commit],
  );

  /** Снять последний ещё не отправленный свайп; null — отменять уже нечего. */
  const undoLast = useCallback((): PendingSubmit | null => {
    let target: { entry: PendingSubmit; timer: ReturnType<typeof setTimeout> } | null = null;
    for (const p of pending.current.values()) target = p; // последний по порядку вставки
    if (!target) return null;
    clearTimeout(target.timer);
    pending.current.delete(target.entry.key);
    let previous: PendingSubmit | null = null;
    for (const p of pending.current.values()) previous = p.entry;
    setLast(previous);
    return target.entry;
  }, []);

  /** Отправить всё, что ждало, не дожидаясь окна отмены. */
  const flush = useCallback((keepalive: boolean) => {
    const put = keepalive ? putPredictionKeepalive : putPrediction;
    for (const { entry, timer } of pending.current.values()) {
      clearTimeout(timer);
      upsertOutbox(outboxEntry(entry.card, entry.grade, entry.owner));
      put(entry.card.id, entry.grade)
        .then(() => removeFromOutbox(entry.card.id))
        .catch(() => {
          /* останется в ящике до следующего визита */
        });
    }
    pending.current.clear();
    setLast(null);
  }, []);

  useEffect(() => {
    const onHide = () => flush(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flush(false); // уход внутри приложения — обычные запросы дойдут
    };
  }, [flush]);

  return useMemo(() => ({ enqueue, undoLast, last, flush }), [enqueue, undoLast, last, flush]);
}
