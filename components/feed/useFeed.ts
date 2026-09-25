"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getEventFeed } from "@/lib/api/endpoints";
import { toFeedCard } from "@/lib/api/map";
import { FEED_PAGE_SIZE, PREFETCH_AT } from "@/lib/feed";
import { addSkipped, clearSkipped, readSkipped } from "@/lib/feedStorage";
import type { FeedCard } from "@/lib/types";

export type FeedStatus = "loading" | "ready" | "error";
export type FeedError = "network" | "generic";

/**
 * Данные ленты: страницы по курсору, подгрузка заранее, пропуски.
 *
 * Сервер уже исключает события, по которым вошедший высказался; клиент сверху
 * вычитает пропущенные в этой сессии и те, что свайпнули только что (их
 * отправка ещё может быть в очереди, а страница — перезапрошена).
 */
export function useFeed({
  viewerKey,
  categoryId,
}: {
  /** Кто смотрит: id пользователя или "guest"; null — сессия ещё проверяется, не грузим. */
  viewerKey: string | null;
  categoryId: string | null;
}) {
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [error, setError] = useState<FeedError | null>(null);
  const [cards, setCards] = useState<FeedCard[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  const decided = useRef(new Set<string>());
  const request = useRef(0);

  useEffect(() => {
    setSkippedCount(readSkipped().size);
  }, []);

  const fetchPage = useCallback(
    async (cursor: string | null, token: number) => {
      const page = await getEventFeed({ cursor, categoryId, limit: FEED_PAGE_SIZE });
      if (token !== request.current) return null; // устаревший ответ
      const skipped = readSkipped();
      const fresh = (page?.items ?? [])
        .map(toFeedCard)
        .filter((c) => !skipped.has(c.id) && !decided.current.has(c.id));
      return { fresh, next: page?.next_cursor ?? null };
    },
    [categoryId],
  );

  // Первая страница — заново при смене зрителя (гость ↔ пользователь),
  // категории или по требованию.
  useEffect(() => {
    const token = ++request.current;
    setStatus("loading");
    setError(null);
    setCards([]);
    setNextCursor(null);
    if (viewerKey === null) return;
    (async () => {
      try {
        const res = await fetchPage(null, token);
        if (!res) return;
        setCards(res.fresh);
        setNextCursor(res.next);
        setStatus("ready");
      } catch (e) {
        if (token !== request.current) return;
        setError(e instanceof ApiError && e.code === "network" ? "network" : "generic");
        setStatus("error");
      }
    })();
  }, [viewerKey, categoryId, reloadToken, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const token = request.current;
    setLoadingMore(true);
    try {
      const res = await fetchPage(nextCursor, token);
      if (!res) return;
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...res.fresh.filter((c) => !seen.has(c.id))];
      });
      setNextCursor(res.next);
    } catch {
      // Следующую страницу не дотянули — попробуем, когда стопка снова
      // опустеет; текущие карточки и так на месте.
    } finally {
      if (token === request.current) setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPage]);

  useEffect(() => {
    if (status === "ready" && cards.length <= PREFETCH_AT && nextCursor && !loadingMore) {
      void loadMore();
    }
  }, [status, cards.length, nextCursor, loadingMore, loadMore]);

  /** Верхняя карточка ушла (свайп решён) — помним, чтобы не вернулась с перезапросом. */
  const remove = useCallback((id: string) => {
    decided.current.add(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /** «Отменить»: карточка снова наверху стопки. */
  const restore = useCallback((card: FeedCard) => {
    decided.current.delete(card.id);
    setCards((prev) => [card, ...prev.filter((c) => c.id !== card.id)]);
  }, []);

  const skip = useCallback((id: string) => {
    addSkipped(id);
    setSkippedCount((n) => n + 1);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const restoreSkipped = useCallback(() => {
    clearSkipped();
    setSkippedCount(0);
    reload();
  }, [reload]);

  // Один объект на состояние: потребители кладут его в зависимости хуков,
  // и новый объект на каждый рендер превращался бы в лишние перезапуски.
  return useMemo(
    () => ({
      status,
      error,
      cards,
      loadingMore,
      hasMore: !!nextCursor,
      skippedCount,
      remove,
      restore,
      skip,
      reload,
      restoreSkipped,
    }),
    [status, error, cards, loadingMore, nextCursor, skippedCount, remove, restore, skip, reload, restoreSkipped],
  );
}
