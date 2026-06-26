// Типы ответов бэкенда (snake_case, как в API). Мапятся во вью-модели
// фронтенда в lib/api/map.ts.

import type { ConfidenceGrade } from "@/lib/confidence";

export type ApiEventStatus =
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
