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
  | "cancelled";

export interface ApiCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  parent_id: string | null;
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

export interface ApiMe {
  id: string;
  username: string;
  display_name: string;
  role: string;
  status: string;
}

export interface ApiPublicProfile {
  username: string;
  display_name: string;
  member_since: string;
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
  league_config: unknown;
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
  status: "open" | "under_review" | "accepted" | "rejected";
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
