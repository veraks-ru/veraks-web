import type { ConfidenceGrade } from "./confidence";
export type { ConfidenceGrade } from "./confidence";

export type EventStatus =
  | "open"
  | "closed"
  | "resolving"
  | "resolved"
  | "disputed"
  | "annulled";

export interface Category {
  slug: string;
  title: string;
}

/** Распределение прогнозов толпы по 5 градациям (индексы 0..4). */
export interface CrowdDistribution {
  /** counts[i] — сколько участников выбрали GRADES[i] */
  counts: [number, number, number, number, number];
}

export interface PredictionEvent {
  id: string;
  slug: string;
  /** Формулировка исхода ДА (PRD §4.2) */
  title: string;
  categorySlug: string;
  status: EventStatus;
  opensAt: string;
  closesAt: string;
  resolvesAt: string;
  resolutionSource: string;
  resolutionCriteria: string;
  forecasters: number;
  crowd: CrowdDistribution;

  /** Текущий прогноз пользователя (если есть). Открывает мнение толпы. */
  myGrade?: ConfidenceGrade | null;

  /** Для разрешённых событий */
  outcome?: boolean;
  resolvedAt?: string;
  sourceReference?: string;
  /** Конец окна оспаривания (ISO); пока не прошло — исход можно оспорить. */
  disputeWindowEndsAt?: string;
}

/* ───────────────────── Профиль и рейтинги ───────────────────── */

/** Один бакет калибровки = одна градация. actual = nYes / nResolved. */
export interface CalibrationBucket {
  gradeIndex: number;
  nResolved: number;
  nYes: number;
}

export interface CategoryStat {
  categorySlug: string;
  meanBrier: number;
  nResolved: number;
}

export interface HistoryItem {
  eventSlug: string;
  title: string;
  categorySlug: string;
  gradeIndex: number;
  outcome: boolean;
  brier: number;
  resolvedAt: string;
}

export interface UserProfile {
  username: string;
  displayName: string;
  joinedAt: string;
  meanBrier: number;
  nPredictions: number;
  nResolved: number;
  globalRank: number;
  totalRanked: number;
  calibration: CalibrationBucket[];
  categories: CategoryStat[];
  history: HistoryItem[];
}

export type LeaderboardScope = "global" | "category" | "season";

export interface LeaderboardRow {
  rank: number;
  username: string;
  displayName: string;
  meanBrier: number;
  nResolved: number;
  isMe?: boolean;
}
