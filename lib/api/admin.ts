// Управляющие (admin/editor/arbiter) вызовы API. Мутации бросают ApiError —
// UI ловит и показывает сообщение.

import { apiFetch } from "./client";
import type {
  ApiCategory,
  ApiDispute,
  ApiEvent,
  ApiPayout,
  ApiPrizeFund,
  ApiResolution,
  ApiSeason,
  ApiSeasonPrizeFund,
  LeagueConfigInput,
} from "./dto";

/* ── События (editor/admin) ── */

export interface EventInput {
  title: string;
  description: string;
  category_id: string;
  season_id?: string | null;
  opens_at: string;
  closes_at: string;
  resolves_at: string;
  resolution_source: string;
  resolution_criteria: string;
}

export const createEvent = (body: EventInput) =>
  apiFetch<ApiEvent>("/events", { method: "POST", body });

export const updateEvent = (id: string, body: Partial<EventInput>) =>
  apiFetch<ApiEvent>(`/events/${id}`, { method: "PATCH", body });

export const publishEvent = (id: string) =>
  apiFetch<ApiEvent>(`/events/${id}/publish`, { method: "POST" });

export const closeEvent = (id: string) =>
  apiFetch<ApiEvent>(`/events/${id}/close`, { method: "POST" });

export const cancelEvent = (id: string) =>
  apiFetch<ApiEvent>(`/events/${id}/cancel`, { method: "POST" });

/* ── Модерация пользовательских предложений (editor/admin) ── */

export const approveEvent = (id: string) =>
  apiFetch<ApiEvent>(`/events/${id}/approve`, { method: "POST" });

export const rejectEvent = (id: string, reason: string) =>
  apiFetch<ApiEvent>(`/events/${id}/reject`, { method: "POST", body: { reason } });

export const createCategory = (body: {
  slug: string;
  title: string;
  description?: string;
  parent_id?: string | null;
}) => apiFetch<ApiCategory>("/categories", { method: "POST", body });

/* ── Разрешение и споры (editor/arbiter/admin) ── */

export const fixResolution = (
  eventId: string,
  body: { outcome: boolean; source_reference: string; notes?: string },
) => apiFetch<ApiResolution>(`/events/${eventId}/resolution`, { method: "POST", body });

export const listDisputes = (eventId: string) =>
  apiFetch<ApiDispute[]>(`/events/${eventId}/disputes`, { allow: [404] });

export const decideDispute = (
  disputeId: string,
  body: { accept: boolean; decision_notes?: string; new_outcome?: boolean | null },
) => apiFetch<ApiDispute>(`/disputes/${disputeId}/decision`, { method: "POST", body });

/* ── Скоринг (editor/arbiter для score; admin для recompute) ── */

export const scoreEvent = (id: string) =>
  apiFetch<{ event_id: string; scored: number }>(`/admin/events/${id}/score`, {
    method: "POST",
  });

export const recomputeRatings = (seasonId?: string) =>
  apiFetch<{ upserted: number }>(
    `/admin/ratings/recompute${seasonId ? `?season_id=${seasonId}` : ""}`,
    { method: "POST" },
  );

/* ── Сезоны (create/update: editor/admin; activate/finalize: admin) ── */

export const createSeason = (body: {
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string;
}) => apiFetch<ApiSeason>("/admin/seasons", { method: "POST", body });

export const activateSeason = (id: string, league_config?: LeagueConfigInput | null) =>
  apiFetch<ApiSeason>(`/admin/seasons/${id}/activate`, {
    method: "POST",
    body: { league_config: league_config ?? null },
  });

export const finalizeSeason = (id: string) =>
  apiFetch<{ season_id: string; finalized: boolean; qualified_count: number; total_participants: number }>(
    `/admin/seasons/${id}/finalize`,
    { method: "POST" },
  );

/* ── Призовой фонд / выплаты (admin) ── */

export const getSeasonPrizeFund = (slug: string) =>
  apiFetch<ApiSeasonPrizeFund>(`/seasons/${slug}/prize-fund`, { allow: [404] });

export const announcePrizeFund = (body: {
  sponsor_name: string;
  committed_kopecks: number;
  season_id?: string | null;
  sponsor_ref?: string;
}) => apiFetch<ApiPrizeFund>("/admin/prize-funds", { method: "POST", body });

export const depositPrizeFund = (
  fundId: string,
  body: { amount_kopecks: number; external_ref?: string | null },
) => apiFetch<ApiPrizeFund>(`/admin/prize-funds/${fundId}/deposit`, { method: "POST", body });

export const listPayouts = (seasonId?: string) =>
  apiFetch<ApiPayout[]>(`/admin/payouts${seasonId ? `?season_id=${seasonId}` : ""}`, {
    allow: [403],
  });

export const createPayout = (body: {
  user_id: string;
  prize_fund_id: string;
  amount_kopecks: number;
  tax_withheld_kopecks?: number;
  season_id?: string | null;
}) => apiFetch<ApiPayout>("/admin/payouts", { method: "POST", body });

export const approvePayout = (id: string) =>
  apiFetch<ApiPayout>(`/admin/payouts/${id}/approve`, { method: "POST" });

export const dispatchPayout = (id: string) =>
  apiFetch<ApiPayout>(`/admin/payouts/${id}/dispatch`, { method: "POST" });

/* ── Дивизионы, редактирование сезона, рекалибровка (admin) ── */

export const applyPromotion = (body: {
  finished_season_id: string;
  next_season_id: string;
  promote?: number;
  relegate?: number;
}) => apiFetch<{ placed: number }>("/admin/divisions/apply", { method: "POST", body });

export const updateSeason = (
  id: string,
  body: { title?: string; starts_at?: string; ends_at?: string },
) => apiFetch<ApiSeason>(`/admin/seasons/${id}`, { method: "PATCH", body });

export interface ApiRecalibrationRow {
  nominal: number;
  observed_freq: number;
  n: number;
  fitted: number;
}

export const getSeasonRecalibration = (seasonId: string) =>
  apiFetch<ApiRecalibrationRow[]>(
    `/admin/seasons/${seasonId}/recalibration`,
    { allow: [404, 400] },
  );
