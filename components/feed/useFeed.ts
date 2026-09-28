"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getEventFeed } from "@/lib/api/endpoints";
import { toFeedCard } from "@/lib/api/map";
import { FEED_PAGE_SIZE, PREFETCH_AT } from "@/lib/feed";
import { GUEST_OWNER, addSkipped, clearSkipped, readSkipped } from "@/lib/feedStorage";
import type { FeedCard } from "@/lib/types";

export type FeedStatus = "loading" | "ready" | "error";
export type FeedError = "network" | "generic";
/** «fresh» — новые события без ответа; «review» — просмотр своих ответов. */
export type FeedMode = "fresh" | "review";

const errorKind = (e: unknown): FeedError =>
  e instanceof ApiError && e.code === "network" ? "network" : "generic";

/**
 * Данные ленты: страницы по курсору, подгрузка заранее, пропуски.
 *
 * Сервер уже исключает события, по которым вошедший высказался; клиент сверху
 * вычитает пропущенные в этой сессии и те, что свайпнули только что (их
 * отправка ещё может быть в очереди, а страница — перезапрошена).
 *
 * Когда новые карточки кончились, лента не упирается в тупик: у вошедшего
 * она продолжается его же ответами (режим «review», `GET /events/feed?
 * answered=true`). Там карточки не убираются, а листаются — индекс ходит
 * вперёд и назад по загруженному списку, поэтому «назад» не требует ни
 * запроса, ни второго стека. Первая страница ответов подгружается заранее,
 * как только стопка опустела: кнопка «листать ответы» показывается только
 * когда есть что листать.
 *
 * Неудачная подгрузка следующей страницы запоминается по курсору и не
 * повторяется сама: иначе при сбое API лента била бы в него без остановки.
 * Повтор — по «Проверить снова», когда стопка опустела.
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
  const [failed, setFailed] = useState<{ cursor: string; kind: FeedError } | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  const [mode, setMode] = useState<FeedMode>("fresh");
  /** Ответы зрителя: null — ещё не запрашивали (или гость), иначе загруженное. */
  const [review, setReview] = useState<{ cards: FeedCard[]; next: string | null } | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewLoadingMore, setReviewLoadingMore] = useState(false);
  const reviewFailed = useRef<string | null>(null);

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

  const fetchReviewPage = useCallback(
    async (cursor: string | null, token: number) => {
      const page = await getEventFeed({ cursor, categoryId, limit: FEED_PAGE_SIZE, answered: true });
      if (token !== request.current) return null;
      return { cards: (page?.items ?? []).map(toFeedCard), next: page?.next_cursor ?? null };
    },
    [categoryId],
  );

  // Первая страница — заново при смене зрителя (гость ↔ пользователь),
  // категории или по требованию. Всё состояние подгрузки сбрасывается тоже:
  // иначе прерванная сменой подгрузка оставила бы loadingMore навсегда.
  useEffect(() => {
    const token = ++request.current;
    setStatus("loading");
    setError(null);
    setCards([]);
    setNextCursor(null);
    setLoadingMore(false);
    setFailed(null);
    setMode("fresh");
    setReview(null);
    setReviewIndex(0);
    setReviewLoadingMore(false);
    reviewFailed.current = null;
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
        setError(errorKind(e));
        setStatus("error");
      }
    })();
  }, [viewerKey, categoryId, reloadToken, fetchPage]);

  const loadMoreFresh = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const token = request.current;
    const cursor = nextCursor;
    setLoadingMore(true);
    try {
      const res = await fetchPage(cursor, token);
      if (!res) return;
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...res.fresh.filter((c) => !seen.has(c.id))];
      });
      setNextCursor(res.next);
    } catch (e) {
      if (token === request.current) setFailed({ cursor, kind: errorKind(e) });
    } finally {
      if (token === request.current) setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPage]);

  useEffect(() => {
    if (status !== "ready" || !nextCursor || loadingMore) return;
    if (failed?.cursor === nextCursor) {
      // Курсор уже подвёл — не долбим API. Когда карточки кончились, честно
      // показываем сбой с кнопкой повтора.
      if (cards.length === 0) {
        setError(failed.kind);
        setStatus("error");
      }
      return;
    }
    if (cards.length <= PREFETCH_AT) void loadMoreFresh();
  }, [status, cards.length, nextCursor, loadingMore, failed, loadMoreFresh]);

  /* ── Мои ответы ── */

  const freshExhausted = status === "ready" && cards.length === 0 && !nextCursor && !loadingMore;
  const canReview = viewerKey !== null && viewerKey !== GUEST_OWNER;

  // Стопка опустела у вошедшего — заранее узнаём, есть ли что листать.
  useEffect(() => {
    if (!freshExhausted || !canReview || review !== null) return;
    const token = request.current;
    (async () => {
      try {
        const res = await fetchReviewPage(null, token);
        if (res) setReview(res);
      } catch {
        // Не смогли узнать — кнопки «листать ответы» просто не будет.
      }
    })();
  }, [freshExhausted, canReview, review, fetchReviewPage]);

  const loadMoreReview = useCallback(async () => {
    if (!review?.next || reviewLoadingMore || reviewFailed.current === review.next) return;
    const token = request.current;
    const cursor = review.next;
    setReviewLoadingMore(true);
    try {
      const res = await fetchReviewPage(cursor, token);
      if (!res) return;
      setReview((prev) => {
        if (!prev) return prev;
        const seen = new Set(prev.cards.map((c) => c.id));
        return { cards: [...prev.cards, ...res.cards.filter((c) => !seen.has(c.id))], next: res.next };
      });
    } catch {
      if (token === request.current) reviewFailed.current = cursor;
    } finally {
      if (token === request.current) setReviewLoadingMore(false);
    }
  }, [review, reviewLoadingMore, fetchReviewPage]);

  const reviewCards = useMemo(
    () => (mode === "review" && review ? review.cards.slice(reviewIndex) : []),
    [mode, review, reviewIndex],
  );

  useEffect(() => {
    if (mode !== "review") return;
    if (reviewCards.length <= PREFETCH_AT) void loadMoreReview();
  }, [mode, reviewCards.length, loadMoreReview]);

  /** Начать листать свои ответы: первая страница перезапрашивается — за
   *  время, пока стопка была пуста, мог дозаписаться последний свайп. */
  const startReview = useCallback(() => {
    if (!canReview) return;
    setMode("review");
    setReviewIndex(0);
    const token = request.current;
    (async () => {
      try {
        const res = await fetchReviewPage(null, token);
        if (res && res.cards.length > 0) setReview(res);
      } catch {
        // Оставляем то, что подгрузили заранее.
      }
    })();
  }, [canReview, fetchReviewPage]);

  const exitReview = useCallback(() => setReloadToken((n) => n + 1), []);

  /** Следующая карточка в просмотре: индекс вперёд, карточки не убираются. */
  const next = useCallback(() => {
    setReviewIndex((i) => (review && i < review.cards.length ? i + 1 : i));
  }, [review]);

  /** Предыдущая карточка в просмотре; false — уже в начале. */
  const back = useCallback((): boolean => {
    if (reviewIndex <= 0) return false;
    setReviewIndex((i) => Math.max(0, i - 1));
    return true;
  }, [reviewIndex]);

  const restartReview = useCallback(() => setReviewIndex(0), []);

  /* ── Обычная лента ── */

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

  const inReview = mode === "review";
  const visible = inReview ? reviewCards : cards;
  const more = inReview ? !!review?.next : !!nextCursor;
  const loading = inReview ? reviewLoadingMore : loadingMore;
  const loadMore = inReview ? loadMoreReview : loadMoreFresh;

  // Один объект на состояние: потребители кладут его в зависимости хуков,
  // и новый объект на каждый рендер превращался бы в лишние перезапуски.
  return useMemo(
    () => ({
      status,
      error,
      mode,
      cards: visible,
      loadingMore: loading,
      hasMore: more,
      skippedCount,
      /** Есть ли у зрителя ответы, которые можно листать (узнаём, когда стопка пуста). */
      reviewAvailable: !!review && review.cards.length > 0,
      /** В просмотре: есть ли предыдущая карточка. */
      canBack: inReview && reviewIndex > 0,
      /** В просмотре: сколько карточек уже пролистано. */
      reviewIndex,
      remove,
      restore,
      skip,
      reload,
      restoreSkipped,
      loadMore,
      startReview,
      exitReview,
      next,
      back,
      restartReview,
    }),
    [
      status,
      error,
      mode,
      visible,
      loading,
      more,
      skippedCount,
      review,
      inReview,
      reviewIndex,
      remove,
      restore,
      skip,
      reload,
      restoreSkipped,
      loadMore,
      startReview,
      exitReview,
      next,
      back,
      restartReview,
    ],
  );
}
