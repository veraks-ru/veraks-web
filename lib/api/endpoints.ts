// Типизированные вызовы эндпоинтов бэкенда.

import { apiFetch } from "./client";
import type { EventInput } from "./admin";
import type { ConfidenceGrade } from "@/lib/confidence";
import type {
  ApiCalibration,
  ApiCategory,
  ApiComment,
  ApiDispute,
  ApiEvent,
  ApiEventStatus,
  ApiFeedItem,
  ApiLeaderboard,
  ApiMe,
  ApiNotification,
  ApiPayout,
  ApiPrediction,
  ApiPredictionSummary,
  ApiPublicProfile,
  ApiResolution,
  ApiSeason,
  ApiSocialStats,
  ApiSubscription,
  ApiUserRef,
} from "./dto";

/* ── Контент ── */

export const listCategories = () => apiFetch<ApiCategory[]>("/categories");

export function listEvents(params: {
  status?: ApiEventStatus;
  categoryId?: string;
  seasonId?: string;
  limit?: number;
} = {}): Promise<ApiEvent[] | null> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.categoryId) q.set("category_id", params.categoryId);
  if (params.seasonId) q.set("season_id", params.seasonId);
  q.set("limit", String(params.limit ?? 100));
  return apiFetch<ApiEvent[]>(`/events?${q.toString()}`);
}

export const getEvent = (id: string) =>
  apiFetch<ApiEvent>(`/events/${id}`, { allow: [404] });

/** Сводка толпы. Скрыта до закрытия приёма → null на 409/404. */
export const getPredictionSummary = (id: string) =>
  apiFetch<ApiPredictionSummary>(`/events/${id}/predictions/summary`, {
    allow: [404, 409],
  });

export const getResolution = (id: string) =>
  apiFetch<ApiResolution>(`/events/${id}/resolution`, { allow: [404] });

/* ── Прогнозы ── */

export const putPrediction = (eventId: string, grade: ConfidenceGrade) =>
  apiFetch<ApiPrediction>(`/events/${eventId}/prediction`, {
    method: "PUT",
    body: { confidence_grade: grade },
  });

export const getMyPrediction = (eventId: string) =>
  apiFetch<ApiPrediction>(`/events/${eventId}/prediction/me`, { allow: [401, 404] });

export const getMyPredictions = () =>
  apiFetch<ApiPrediction[]>("/users/me/predictions", { allow: [401] });

export const getUserPredictions = (username: string) =>
  apiFetch<ApiPrediction[]>(`/users/${username}/predictions`, { allow: [404] });

/* ── Лидерборды ── */

export const getGlobalLeaderboard = (limit = 100) =>
  apiFetch<ApiLeaderboard>(`/leaderboards/global?limit=${limit}`);

export const getCategoryLeaderboard = (categoryId: string, limit = 100) =>
  apiFetch<ApiLeaderboard>(`/leaderboards/categories/${categoryId}?limit=${limit}`, {
    allow: [404],
  });

export const getSeasonLeaderboard = (slug: string, limit = 100) =>
  apiFetch<ApiLeaderboard>(`/leaderboards/seasons/${slug}?limit=${limit}`, {
    allow: [404],
  });

/* ── Пользователи ── */

export const getMe = () => apiFetch<ApiMe>("/auth/me", { allow: [401] });

export const logout = () => apiFetch<null>("/auth/logout", { method: "POST", allow: [401] });

export const getPublicProfile = (username: string) =>
  apiFetch<ApiPublicProfile>(`/users/${username}`, { allow: [404] });

export const getCalibration = (username: string) =>
  apiFetch<ApiCalibration>(`/users/${username}/calibration`, { allow: [404] });

export const lookupUser = (userId: string) =>
  apiFetch<ApiUserRef>(`/users/lookup/${userId}`, { allow: [404] });

/* ── Сезоны ── */

export const listSeasons = () =>
  apiFetch<{ items: ApiSeason[] }>("/seasons", { allow: [404] });

/* ── Подписка ── */

export const getMySubscription = () =>
  apiFetch<ApiSubscription>("/billing/subscriptions/me", { allow: [401, 404] });

export const startSubscription = (plan: string) =>
  apiFetch<{ subscription: ApiSubscription; confirmation_url: string }>(
    "/billing/subscriptions",
    { method: "POST", body: { plan } },
  );

export const cancelSubscription = (id: string) =>
  apiFetch<ApiSubscription>(`/billing/subscriptions/${id}/cancel`, { method: "POST" });

/* ── Кабинет пользователя ── */

export const getMyPayouts = () =>
  apiFetch<ApiPayout[]>("/users/me/payouts", { allow: [401] });

export const updateMe = (display_name: string) =>
  apiFetch<ApiMe>("/users/me", { method: "PATCH", body: { display_name } });

/* ── Оспаривание исхода (участник события) ── */

export const raiseDispute = (
  eventId: string,
  body: { reason: string; evidence?: string },
) => apiFetch<ApiDispute>(`/events/${eventId}/disputes`, { method: "POST", body });

/* ── Уведомления ── */

export const getNotifications = () =>
  apiFetch<ApiNotification[]>("/users/me/notifications", { allow: [401] });

export const getUnreadCount = () =>
  apiFetch<{ unread: number }>("/users/me/notifications/unread-count", { allow: [401] });

export const markAllNotificationsRead = () =>
  apiFetch<null>("/users/me/notifications/read", { method: "POST", allow: [401] });

export const markNotificationRead = (id: string) =>
  apiFetch<null>(`/users/me/notifications/${id}/read`, { method: "POST", allow: [401] });

/** Активна ли подписка прямо сейчас. */
export function isSubscriptionActive(s: ApiSubscription | null): boolean {
  if (!s || s.status !== "active" || !s.current_period_end) return false;
  return new Date(s.current_period_end).getTime() > Date.now();
}

/* ── Предложить событие (подписчик; уходит на модерацию) ── */

export const proposeEvent = (body: EventInput) =>
  apiFetch<ApiEvent>("/events/propose", { method: "POST", body });

/* ── Соцфичи: комментарии, подписки, лента ── */

export const listComments = (eventId: string) =>
  apiFetch<ApiComment[]>(`/events/${eventId}/comments`);

export const postComment = (eventId: string, body: string) =>
  apiFetch<ApiComment>(`/events/${eventId}/comments`, {
    method: "POST",
    body: { body },
  });

export const deleteComment = (id: string) =>
  apiFetch<null>(`/comments/${id}`, { method: "DELETE", allow: [401, 403, 404] });

export const followUser = (username: string) =>
  apiFetch<null>(`/users/${username}/follow`, { method: "POST", allow: [401] });

export const unfollowUser = (username: string) =>
  apiFetch<null>(`/users/${username}/follow`, { method: "DELETE", allow: [401] });

export const getSocialStats = (username: string) =>
  apiFetch<ApiSocialStats>(`/users/${username}/social`, { allow: [404] });

export const getMyFollowing = () =>
  apiFetch<ApiUserRef[]>("/users/me/following", { allow: [401] });

export const getFeed = () => apiFetch<ApiFeedItem[]>("/feed", { allow: [401] });
