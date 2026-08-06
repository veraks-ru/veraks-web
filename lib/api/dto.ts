// Типы ответов бэкенда (snake_case, как в API). Мапятся во вью-модели
// фронтенда в lib/api/map.ts.

import type { ConfidenceGrade } from "@/lib/confidence";

export type ApiEventStatus =
  | "proposed"
  | "draft"
  | "open"
  | "closed"
  | "resolving"
  | "resolved"
  | "disputed"
  /** Отменено ДО подведения исхода (прогнозы не оценивались). */
  | "cancelled"
  /** Аннулировано ПОСЛЕ исхода — событие исключено из рейтингов (ст. 1058 ГК РФ). */
  | "annulled";

export interface ApiCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  parent_id: string | null;
  /** Запрещённая тематика (PRD §7.5) — события в такой категории не создаются. */
  is_restricted: boolean;
}

export interface ApiEvent {
  id: string;
  title: string;
  description: string;
  category_id: string;
  created_by: string;
  season_id: string | null;
  status: ApiEventStatus;
  opens_at: string;
  closes_at: string;
  resolves_at: string;
  resolution_source: string;
  resolution_criteria: string;
  outcome: boolean | null;
  resolved_at: string | null;
  dispute_window_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPrediction {
  id: string;
  user_id: string;
  event_id: string;
  confidence_grade: ConfidenceGrade;
  probability: string; // Decimal как строка
  is_locked: boolean;
  brier_score: string | null;
  scored_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPredictionSummary {
  event_id: string;
  total_count: number;
  distribution: Partial<Record<ConfidenceGrade, number>>;
  mean_probability: string | null;
}

export interface ApiRating {
  user_id: string;
  scope_type: "global" | "category" | "season";
  scope_id: string | null;
  mean_brier: string;
  skill_score: string;
  calibration_error: string;
  n_resolved: number;
  rank: number;
  qualified: boolean | null;
}

export interface ApiLeaderboard {
  scope_type: string;
  scope_id: string | null;
  entries: ApiRating[];
  /**
   * Применённый порог участия (n_resolved) для global/category при
   * qualified_only=true (бэкенд: LEADERBOARD_MIN_RESOLVED_GLOBAL/_CATEGORY,
   * app/modules/scoring/domain/constants.py). null — фильтр не применялся
   * (qualified_only=false) или это сезонный лидерборд (своя квалификация).
   */
  min_resolved: number | null;
}

export interface ApiCalibrationBin {
  nominal: number;
  n: number;
  frequency: number;
  ci_low: number;
  ci_high: number;
}

export interface ApiCalibration {
  user_id: string;
  n_total: number;
  ece: number;
  reliability: number;
  resolution: number;
  uncertainty: number;
  brier_check: number;
  bins: ApiCalibrationBin[];
}

/** Требование согласия: документ + версия редакции. */
export interface ApiConsentRequirement {
  document: string;
  version: string;
}

/** Факт принятия согласия пользователем (GET /users/me/consents). */
export interface ApiConsent extends ApiConsentRequirement {
  accepted_at: string;
  method: string;
}

export interface ApiMe {
  id: string;
  username: string;
  display_name: string;
  role: string;
  status: string;
  // Присутствуют в ответах /auth/me и POST /users/me/onboarding; в ответе
  // PATCH /users/me (прежний MeResponse) их нет.
  needs_onboarding?: boolean;
  missing_consents?: ApiConsentRequirement[];
}

export interface ApiPublicProfile {
  username: string;
  display_name: string;
  member_since: string;
}

/** Метрики пользователя в одной области сводки (готовый агрегат, без пересчёта). */
export interface ApiProfileScopeRating {
  rank: number;
  skill_score: string;
  mean_brier: string;
  n_resolved: number;
}

export interface ApiProfileCategoryRating extends ApiProfileScopeRating {
  category_id: string;
  slug: string;
  title: string;
}

export interface ApiProfileSeasonRating extends ApiProfileScopeRating {
  season_id: string;
}

/** GET /users/{username}/summary — сводка профиля (global/категории/активный сезон). */
export interface ApiProfileSummary {
  user_id: string;
  global: ApiProfileScopeRating | null;
  categories: ApiProfileCategoryRating[];
  season: ApiProfileSeasonRating | null;
}

export interface ApiUserRef {
  user_id: string;
  username: string;
  display_name: string;
}

export interface ApiResolution {
  id: string;
  event_id: string;
  outcome: boolean;
  status: string;
  resolved_by: string;
  source_reference: string;
  supersedes_id: string | null;
  notes: string;
  resolved_at: string;
}

export interface ApiSeason {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "upcoming" | "active" | "finished";
  // Снапшот правил лиги — фиксируется при активации сезона, до этого null.
  league_config: LeagueConfigInput | null;
  created_at: string;
  updated_at: string;
}

export interface ApiDispute {
  id: string;
  event_id: string;
  resolution_id: string;
  raised_by: string;
  reason: string;
  evidence: string;
  /** `voided` — спор снят вместе с аннулированием события (предмета спора нет). */
  status: "open" | "under_review" | "accepted" | "rejected" | "voided";
  decided_by: string | null;
  decision_notes: string;
  created_at: string;
  decided_at: string | null;
}

export interface ApiPrizeFund {
  id: string;
  sponsor_name: string;
  season_id: string | null;
  committed_kopecks: number;
  deposited_kopecks: number;
  balance_kopecks: number;
  status: "announced" | "funded" | "distributing" | "closed";
}

export interface ApiPayout {
  id: string;
  user_id: string;
  prize_fund_id: string;
  amount_kopecks: number;
  tax_withheld_kopecks: number;
  status: "pending" | "approved" | "processing" | "paid" | "failed";
  created_by: string;
  approved_by: string | null;
  ledger_transaction_id: string | null;
  provider: string | null;
  provider_payout_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface ApiPayoutRequisites {
  id: string;
  sbp_phone: string;
  sbp_bank_id: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  updated_at: string;
}

export interface ApiSeasonPrizeFund {
  season_slug: string;
  funds: ApiPrizeFund[];
  payouts: ApiPayout[];
}

export interface ApiSubscription {
  id: string;
  user_id: string;
  plan: string;
  price_kopecks: number;
  provider: string;
  status: "incomplete" | "active" | "past_due" | "canceled" | "expired";
  current_period_end: string | null;
}

export interface ApiNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface LeagueConfigInput {
  gradation_map: number[];
  n_min: number;
  c_min: number;
  w_min: number;
  m_per_category: number;
  k_shrink: number;
  min_predictors: number;
}

// ── Соцфичи: комментарии, подписки, лента ──
export interface ApiCommentAuthor {
  user_id: string;
  username: string;
  display_name: string;
}

export interface ApiComment {
  id: string;
  event_id: string;
  body: string;
  created_at: string;
  author: ApiCommentAuthor | null;
}

export interface ApiSocialStats {
  user_id: string;
  followers: number;
  following: number;
  is_following: boolean;
}

export interface ApiFeedItem {
  kind: "comment" | "score";
  actor_id: string;
  actor_username: string;
  actor_display_name: string;
  event_id: string;
  event_title: string;
  occurred_at: string;
  body?: string | null;
  brier?: number | null;
  outcome?: boolean | null;
}

// ── Лиги и дивизионы ──
export interface ApiLeague {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  members?: number | null;
}

export interface ApiStandingRow {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  skill_score: string | null;
  mean_brier: string | null;
  n_resolved: number;
}

export interface ApiLeagueStandings {
  league: ApiLeague;
  is_member: boolean;
  rows: ApiStandingRow[];
}

export interface ApiDivisionStandings {
  level: number;
  title: string;
  season_id: string;
  rows: ApiStandingRow[];
}

// ── Кабинет спонсора ──
export interface ApiSponsorFundDetail {
  fund: ApiPrizeFund;
  available_kopecks: number;
  payouts: ApiPayout[];
}

// ── B2B: API-ключи ──
export interface ApiApiKey {
  id: string;
  name: string;
  key_prefix: string;
  daily_quota: number;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
  used_today?: number | null;
}

export interface ApiIssuedKey {
  key: ApiApiKey;
  secret: string;
}

// ── Прочие read-модели (квалификация, тарифы) ──
export interface ApiQualification {
  qualified: boolean;
  volume_ok: boolean;
  diversity_ok: boolean;
  coverage_ok: boolean;
  n_resolved: number;
  category_count: number;
  total_weight: number;
  n_min: number;
  c_min: number;
  w_min: number;
}

export interface ApiPlan {
  plan: string;
  price_kopecks: number;
}

// ── Пользователи (модерация, только admin) ──
export interface ApiAdminUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
}

export interface ApiAdminUserPage {
  items: ApiAdminUser[];
  total: number;
}

// ── Аудит-журнал (только admin) ──
export interface ApiAuditLogEntry {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  actor_type: "user" | "editor" | "arbiter" | "admin" | "system";
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  prev_hash: string | null;
  hash: string;
}

export interface ApiAuditLogPage {
  items: ApiAuditLogEntry[];
  has_more: boolean;
}

export interface ApiChainVerification {
  ok: boolean;
  checked: number;
  first_broken_id: number | null;
}
