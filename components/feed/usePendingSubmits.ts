"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { putPrediction, putPredictionKeepalive } from "@/lib/api/endpoints";
import type { ConfidenceGrade } from "@/lib/confidence";
import { UNDO_MS, type SwipeDecision } from "@/lib/feed";
import { removeFromOutbox, upsertOutbox } from "@/lib/feedStorage";
import type { FeedCard } from "@/lib/types";

export interface PendingSubmit {
  key: number;
  card: FeedCard;
  direction: SwipeDecision;
  grade: ConfidenceGrade;
}

interface Callbacks {
  onCommitted: (p: PendingSubmit) => void;
  /** Приём закрылся, пока прогноз ждал отправки (409). */
  onClosed: (p: PendingSubmit) => void;
  /** Согласия не подтверждены (403) — очередь уже в ящике. */
  onConsentRequired: () => void;
  /** Сессии нет (401) — очередь уже в ящике. */
  onUnauthorized: () => void;
  /** Сеть или сервер не ответили — прогноз лёг в ящик до следующего раза. */
  onDeferred: (p: PendingSubmit) => void;
}

const RETRY_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toOutbox(p: PendingSubmit) {
  return {
    eventId: p.card.id,
    slug: p.card.slug,
    title: p.card.title,
    grade: p.grade,
    at: new Date().toISOString(),
  };
}

/**
 * Отложенная отправка свайпов с окном на «Отменить».
 *
 * Удалить прогноз нельзя (все прогнозы засчитываются), поэтому отмена
 * возможна только до отправки: карточка улетает сразу, PUT уходит через
 * UNDO_MS. Отправки идут строго по очереди. При уходе со страницы всё, что
 * ещё ждало, уходит keepalive-запросом и параллельно ложится в ящик — если
 * ответа не дождались, доотправим при следующем открытии ленты.
 */
export function usePendingSubmits(cb: Callbacks) {
  const pending = useRef(new Map<number, { entry: PendingSubmit; timer: ReturnType<typeof setTimeout> }>());
  const chain = useRef<Promise<void>>(Promise.resolve());
  const seq = useRef(0);
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const [last, setLast] = useState<PendingSubmit | null>(null);

  const send = useCallback(async (entry: PendingSubmit, retried = false): Promise<void> => {
    try {
      await putPrediction(entry.card.id, entry.grade);
      removeFromOutbox(entry.card.id);
      cbRef.current.onCommitted(entry);
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      if (api?.status === 409) {
        cbRef.current.onClosed(entry);
        return;
      }
      if (api?.status === 403 && api.code === "ConsentRequiredError") {
        upsertOutbox(toOutbox(entry));
        cbRef.current.onConsentRequired();
        return;
      }
      if (api?.status === 401) {
        upsertOutbox(toOutbox(entry));
        cbRef.current.onUnauthorized();
        return;
      }
      if (api?.code === "network" && !retried) {
        await sleep(RETRY_MS);
        return send(entry, true);
      }
      upsertOutbox(toOutbox(entry));
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
    (card: FeedCard, direction: SwipeDecision, grade: ConfidenceGrade): PendingSubmit => {
      const entry: PendingSubmit = { key: ++seq.current, card, direction, grade };
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
      upsertOutbox(toOutbox(entry));
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
