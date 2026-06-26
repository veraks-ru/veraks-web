// Типизированные вызовы эндпоинтов бэкенда.

import { apiFetch } from "./client";
import type { ConfidenceGrade } from "@/lib/confidence";
import type {
  ApiCalibration,
  ApiCategory,
  ApiEvent,
  ApiEventStatus,
  ApiLeaderboard,
  ApiMe,
  ApiPrediction,
  ApiPredictionSummary,
  ApiPublicProfile,
  ApiResolution,
  ApiSeason,
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
