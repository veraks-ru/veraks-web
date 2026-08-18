// Типизированные вызовы эндпоинтов бэкенда.

import { apiFetch } from "./client";
import type { EventInput } from "./admin";
import type { ConfidenceGrade } from "@/lib/confidence";
import type {
  ApiAccessGrant,
  ApiApiKey,
  ApiAuthProviders,
  ApiCalibration,
  ApiCategory,
  ApiComment,
  ApiConsent,
  ApiConsentRequirement,
  ApiDispute,
  ApiDivisionStandings,
  ApiIssuedKey,
  ApiEvent,
  ApiEventStatus,
  ApiFeedItem,
  ApiLeaderboard,
  ApiLeague,
  ApiLeagueStandings,
  ApiMe,
  ApiNotification,
  ApiPayout,
  ApiPayoutRequisites,
  ApiPlan,
  ApiPrediction,
  ApiPredictionSummary,
  ApiPrizeFund,
  ApiProfileSummary,
  ApiPublicProfile,
  ApiQualification,
  ApiResolution,
  ApiSeason,
  ApiSeasonStanding,
  ApiSocialStats,
  ApiSponsorFundDetail,
  ApiSubscription,
  ApiTopPrediction,
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

// Принимает и короткий публичный код, и UUID — бэкенд резолвит обе формы.
// Нераспознанная ссылка приходит как 404; 422 остаётся в allow для ссылок,
// сохранённых до перехода на короткие коды.
export const getEvent = (id: string) =>
  apiFetch<ApiEvent>(`/events/${id}`, { allow: [404, 422] });

/** Сводка толпы. Скрыта до закрытия приёма → null на 409/404. */
export const getPredictionSummary = (id: string) =>
  apiFetch<ApiPredictionSummary>(`/events/${id}/predictions/summary`, {
    allow: [404, 409],
  });

export const getResolution = (id: string) =>
  apiFetch<ApiResolution>(`/events/${id}/resolution`, { allow: [404] });

/** Доска лучших прогнозов. Доступна только для разрешённого события → null на 404/409. */
export const getEventTopPredictions = (id: string, limit = 10) =>
  apiFetch<ApiTopPrediction[]>(`/events/${id}/top-predictions?limit=${limit}`, {
    allow: [404, 409],
  });

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

/* ── Аутентификация: провайдеры и email-вход ── */

// Публичный: без авторизации, вызывается на /join до входа.
export const getAuthProviders = () => apiFetch<ApiAuthProviders>("/auth/providers");

// Всегда 202 (анти-энумерация: одинаковый ответ независимо от того,
// зарегистрирован адрес). Ошибки — 422 (формат) и 429 (лимит) — бросаются
// как ApiError, их разбирает вызывающий экран.
export const requestEmailLink = (email: string) =>
  apiFetch<null>("/auth/email/request", { method: "POST", body: { email } });

// 401 — ссылка устарела/использована/неизвестна, 403 — аккаунт удалён/заблокирован.
export const completeEmailLogin = (token: string) =>
  apiFetch<ApiMe>("/auth/email/callback", { method: "POST", body: { token } });

/* ── Пользователи ── */

export const getMe = () => apiFetch<ApiMe>("/auth/me", { allow: [401] });

export const logout = () => apiFetch<null>("/auth/logout", { method: "POST", allow: [401] });

export const getPublicProfile = (username: string) =>
  apiFetch<ApiPublicProfile>(`/users/${username}`, { allow: [404] });

export const getCalibration = (username: string) =>
  apiFetch<ApiCalibration>(`/users/${username}/calibration`, { allow: [404] });

/** Сводка профиля: global/категории/активный сезон — одним запросом, готовые агрегаты. */
export const getProfileSummary = (username: string) =>
  apiFetch<ApiProfileSummary>(`/users/${username}/summary`, { allow: [404] });

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

// Возврат последней оплаты подписки (только админ).
export const refundSubscription = (id: string) =>
  apiFetch<{ status: string }>(`/billing/subscriptions/${id}/refund`, { method: "POST" });

/* ── Кабинет пользователя ── */

export const getMyPayouts = () =>
  apiFetch<ApiPayout[]>("/users/me/payouts", { allow: [401] });

// Реквизиты выплат (СБП): 404 — ещё не заполнены.
export const getMyPayoutRequisites = () =>
  apiFetch<ApiPayoutRequisites>("/users/me/payout-requisites", {
    allow: [401, 404],
  });

export const saveMyPayoutRequisites = (body: {
  sbp_phone: string;
  sbp_bank_id: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
}) =>
  apiFetch<ApiPayoutRequisites>("/users/me/payout-requisites", {
    method: "PUT",
    body,
  });

// email в PATCH не принимается — бэкенд его игнорирует/отвергает (менять
// адрес нельзя через этот эндпоинт).
export const updateMe = (body: { username?: string; display_name?: string }) =>
  apiFetch<ApiMe>("/users/me", { method: "PATCH", body });

// Самостоятельное удаление аккаунта (152-ФЗ) — необратимо, см. /account.
export const deleteMyAccount = () =>
  apiFetch<null>("/users/me", { method: "DELETE" });

/* ── Онбординг (псевдоним + согласия 152-ФЗ) ── */

export const getMyConsents = () =>
  apiFetch<ApiConsent[]>("/users/me/consents", { allow: [401] });

export const submitOnboarding = (body: {
  username?: string;
  display_name?: string;
  consents: ApiConsentRequirement[];
}) => apiFetch<ApiMe>("/users/me/onboarding", { method: "POST", body });

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

/* ── Лиги и дивизионы ── */

export const createLeague = (name: string) =>
  apiFetch<ApiLeague>("/leagues", { method: "POST", body: { name } });

export const joinLeague = (invite_code: string) =>
  apiFetch<ApiLeague>("/leagues/join", {
    method: "POST",
    body: { invite_code },
    allow: [404],
  });

export const getMyLeagues = () =>
  apiFetch<ApiLeague[]>("/leagues/mine", { allow: [401] });

export const leaveLeague = (id: string) =>
  apiFetch<null>(`/leagues/${id}/leave`, { method: "DELETE", allow: [401] });

export const getLeagueStandings = (id: string) =>
  apiFetch<ApiLeagueStandings>(`/leagues/${id}/standings`, { allow: [401, 404] });

export const getDivisionStandings = (seasonId: string, level: number) =>
  apiFetch<ApiDivisionStandings>(
    `/seasons/${seasonId}/divisions/${level}/standings`,
    { allow: [404] },
  );

/* ── Кабинет спонсора ── */

export const announceSponsorFund = (body: {
  sponsor_name: string;
  committed_kopecks: number;
  season_id?: string | null;
  sponsor_ref?: string;
}) => apiFetch<ApiPrizeFund>("/sponsor/funds", { method: "POST", body });

export const depositSponsorFund = (id: string, amount_kopecks: number) =>
  apiFetch<ApiPrizeFund>(`/sponsor/funds/${id}/deposit`, {
    method: "POST",
    body: { amount_kopecks },
  });

export const getMySponsorFunds = () =>
  apiFetch<ApiPrizeFund[]>("/sponsor/funds", { allow: [401] });

export const getSponsorFund = (id: string) =>
  apiFetch<ApiSponsorFundDetail>(`/sponsor/funds/${id}`, { allow: [401, 404] });

/* ── B2B: API-ключи ── */

export const createApiKey = (name: string, daily_quota?: number) =>
  apiFetch<ApiIssuedKey>("/b2b/keys", {
    method: "POST",
    body: daily_quota ? { name, daily_quota } : { name },
  });

export const getMyApiKeys = () =>
  apiFetch<ApiApiKey[]>("/b2b/keys", { allow: [401] });

export const revokeApiKey = (id: string) =>
  apiFetch<null>(`/b2b/keys/${id}`, { method: "DELETE", allow: [401, 404] });

export const getApiKeyUsage = (id: string) =>
  apiFetch<ApiApiKey>(`/b2b/keys/${id}/usage`, { allow: [401, 404] });

/* ── Прочие чтения (сезон, фонд, тарифы, квалификация, читатели) ── */

export const getSeason = (slug: string) =>
  apiFetch<ApiSeason>(`/seasons/${slug}`, { allow: [404] });

export const getPrizeFund = (fundId: string) =>
  apiFetch<ApiPrizeFund>(`/prize-funds/${fundId}`, { allow: [404] });

export const getPlans = () =>
  apiFetch<{ plans: ApiPlan[] }>("/billing/plans", { allow: [404] });

export const getSeasonQualification = (userId: string, slug: string) =>
  apiFetch<ApiQualification>(
    `/users/${userId}/seasons/${slug}/qualification`,
    { allow: [404] },
  );

/**
 * Своя строка в сезоне (место + разбор порогов).
 *
 * 401 намеренно НЕ в ``allow``: иначе клиент не попробует тихо освежить сессию
 * и после истечения access-токена строка «вы» молча пропала бы до перезагрузки.
 * Вызывается только для залогиненного пользователя, а реальный 401 ловится
 * вызывающим кодом и просто скрывает карточку.
 */
export const getMySeasonStanding = (slug: string) =>
  apiFetch<ApiSeasonStanding>(`/leaderboards/seasons/${slug}/me`, {
    allow: [404],
  });

export const getMyFollowers = () =>
  apiFetch<ApiUserRef[]>("/users/me/followers", { allow: [401] });

/**
 * Активировать приглашение уже вошедшим пользователем.
 *
 * Отдельным шагом после входа, а не при регистрации: код из ссылки фронтенд
 * помнит сам и предъявляет, когда сессия появилась. 404 — кода нет, 409 —
 * ссылку уже использовали или отозвали.
 */
export const redeemInvite = (code: string) =>
  apiFetch<ApiAccessGrant>("/invites/redeem", {
    method: "POST",
    body: { code },
    allow: [404, 409],
  });

/**
 * Включить или выключить автопродление. Выключение оставляет доступ до конца
 * оплаченного периода и стирает сохранённый способ оплаты.
 */
export const setAutoRenew = (subscriptionId: string, enabled: boolean) =>
  apiFetch<ApiSubscription>(
    `/billing/subscriptions/${subscriptionId}/auto-renew`,
    { method: "POST", body: { enabled } },
  );
