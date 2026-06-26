// Моки участников, лидербордов и профилей. Контракт совместим с
// /leaderboards/* и /users/{username} из архитектуры.

import { GRADES, brier } from "./confidence";
import { CATEGORIES } from "./mock";
import type {
  CalibrationBucket,
  CategoryStat,
  HistoryItem,
  LeaderboardRow,
  LeaderboardScope,
  UserProfile,
} from "./types";

export const ME = "kalibr";

interface RawUser {
  username: string;
  displayName: string;
  meanBrier: number;
  nResolved: number;
  seasonBrier: number;
  seasonResolved: number;
  /** brier по категориям (slug → [brier, nResolved]) */
  cats: Record<string, [number, number]>;
}

// brier: меньше — лучше. Лучшие — около 0.10, слабые — к 0.28.
const USERS: RawUser[] = [
  u("mediana", "Медиана", 0.108, 174, 0.101, 58, { economy: [0.09, 70], politics: [0.12, 60], tech: [0.13, 44] }),
  u("kalibr", "Калибр", 0.121, 137, 0.114, 49, { economy: [0.1, 52], tech: [0.13, 48], sport: [0.14, 37] }),
  u("baseline", "Базлайн", 0.129, 210, 0.133, 71, { politics: [0.12, 90], economy: [0.14, 70], society: [0.13, 50] }),
  u("statistik", "Статистик", 0.134, 96, 0.127, 41, { science: [0.11, 40], tech: [0.15, 32], economy: [0.16, 24] }),
  u("vera_d", "Вера Д.", 0.142, 158, 0.139, 55, { society: [0.12, 64], politics: [0.15, 54], sport: [0.16, 40] }),
  u("prognoz", "Прогноз", 0.149, 64, 0.151, 22, { sport: [0.13, 30], tech: [0.17, 20], politics: [0.18, 14] }),
  u("panteley", "Пантелей", 0.156, 121, 0.16, 44, { economy: [0.15, 50], science: [0.16, 38], society: [0.17, 33] }),
  u("kassandra", "Кассандра", 0.163, 188, 0.158, 63, { politics: [0.16, 80], society: [0.17, 60], economy: [0.18, 48] }),
  u("signal_77", "Сигнал", 0.171, 52, 0.169, 19, { tech: [0.16, 26], science: [0.19, 16], economy: [0.2, 10] }),
  u("marina_p", "Марина П.", 0.184, 143, 0.18, 50, { sport: [0.17, 58], society: [0.19, 49], politics: [0.2, 36] }),
  u("nostra_lite", "Ностра-лайт", 0.205, 79, 0.211, 28, { politics: [0.2, 34], tech: [0.22, 26], sport: [0.21, 19] }),
  u("pari_net", "Пари-нет", 0.232, 110, 0.236, 38, { economy: [0.23, 44], society: [0.24, 38], science: [0.24, 28] }),
  // ниже порога участия — для проверки фильтрации
  u("newcomer", "Новичок", 0.118, 6, 0.118, 6, { tech: [0.12, 4], economy: [0.14, 2] }),
  u("probnik", "Пробник", 0.16, 8, 0.16, 8, { sport: [0.16, 5], politics: [0.17, 3] }),
];

function u(
  username: string,
  displayName: string,
  meanBrier: number,
  nResolved: number,
  seasonBrier: number,
  seasonResolved: number,
  cats: Record<string, [number, number]>,
): RawUser {
  return { username, displayName, meanBrier, nResolved, seasonBrier, seasonResolved, cats };
}

const GLOBAL_THRESHOLD = 10;
const CATEGORY_THRESHOLD = 5;
const SEASON_THRESHOLD = 8;

export interface LeaderboardResult {
  rows: LeaderboardRow[];
  excluded: number;
  threshold: number;
}

export function getLeaderboard(
  scope: LeaderboardScope,
  slug?: string,
): LeaderboardResult {
  let pool: { username: string; displayName: string; brier: number; n: number }[];
  let threshold: number;

  if (scope === "category" && slug) {
    threshold = CATEGORY_THRESHOLD;
    pool = USERS.flatMap((x) => {
      const c = x.cats[slug];
      return c ? [{ username: x.username, displayName: x.displayName, brier: c[0], n: c[1] }] : [];
    });
  } else if (scope === "season") {
    threshold = SEASON_THRESHOLD;
    pool = USERS.map((x) => ({
      username: x.username,
      displayName: x.displayName,
      brier: x.seasonBrier,
      n: x.seasonResolved,
    }));
  } else {
    threshold = GLOBAL_THRESHOLD;
    pool = USERS.map((x) => ({
      username: x.username,
      displayName: x.displayName,
      brier: x.meanBrier,
      n: x.nResolved,
    }));
  }

  const qualified = pool.filter((p) => p.n >= threshold);
  const excluded = pool.length - qualified.length;
  qualified.sort((a, b) => a.brier - b.brier);

  const rows: LeaderboardRow[] = qualified.map((p, i) => ({
    rank: i + 1,
    username: p.username,
    displayName: p.displayName,
    meanBrier: p.brier,
    nResolved: p.n,
    isMe: p.username === ME,
  }));

  return { rows, excluded, threshold };
}

/* ───────────────── Детерминированный профиль ───────────────── */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAST_EVENTS: { slug: string; title: string; cat: string }[] = [
  { slug: "g20-joint-communique", title: "Совместное коммюнике по итогам встречи будет принято", cat: "politics" },
  { slug: "oil-above-threshold", title: "Цена нефти закроет месяц выше порога", cat: "economy" },
  { slug: "open-model-tops-bench", title: "Открытая модель возглавит публичный бенчмарк", cat: "tech" },
  { slug: "club-wins-derby", title: "Клуб выиграет дерби", cat: "sport" },
  { slug: "vaccine-phase-result", title: "Кандидат покажет заявленную эффективность в фазе III", cat: "science" },
  { slug: "city-referendum-passes", title: "Городской референдум будет признан состоявшимся", cat: "society" },
  { slug: "cbr-holds-rate", title: "Ставка останется без изменений на заседании", cat: "economy" },
  { slug: "rover-milestone", title: "Аппарат достигнет запланированной точки до конца квартала", cat: "science" },
];

function buildCalibration(rng: () => number, skill: number): CalibrationBucket[] {
  return GRADES.map((g, i) => {
    const claimed = g.probability;
    const n = 12 + Math.floor(rng() * 26);
    // смещение тем меньше, чем выше навык (меньше brier)
    const offset = (rng() - 0.5) * 2 * skill;
    const actual = Math.max(0, Math.min(1, claimed + offset));
    return { gradeIndex: i, nResolved: n, nYes: Math.round(n * actual) };
  });
}

function buildHistory(rng: () => number): HistoryItem[] {
  const days = 86_400_000;
  return [...PAST_EVENTS]
    .slice(0, 6)
    .map((e, i) => {
      const gradeIndex = Math.floor(rng() * 5);
      const p = GRADES[gradeIndex].probability;
      const outcome = rng() < p ? rng() < 0.78 : rng() < 0.3; // коррелирует с прогнозом
      return {
        eventSlug: e.slug,
        title: e.title,
        categorySlug: e.cat,
        gradeIndex,
        outcome,
        brier: brier(p, outcome),
        resolvedAt: new Date(Date.now() - (i + 1) * 5 * days).toISOString(),
      };
    });
}

export function getProfile(username: string): UserProfile | undefined {
  const raw = USERS.find((x) => x.username === username);
  if (!raw) return undefined;

  const rng = mulberry32(hashStr(username));
  const skill = Math.max(0.03, raw.meanBrier - 0.06); // амплитуда смещения
  const calibration = buildCalibration(rng, skill);
  const history = buildHistory(rng);

  const categories: CategoryStat[] = Object.entries(raw.cats)
    .map(([slug, [b, n]]) => ({ categorySlug: slug, meanBrier: b, nResolved: n }))
    .sort((a, b) => a.meanBrier - b.meanBrier);

  const global = getLeaderboard("global");
  const myRow = global.rows.find((r) => r.username === username);

  return {
    username,
    displayName: raw.displayName,
    joinedAt: new Date(Date.now() - 220 * 86_400_000).toISOString(),
    meanBrier: raw.meanBrier,
    nResolved: raw.nResolved,
    nPredictions: raw.nResolved + 4 + Math.floor(rng() * 12),
    globalRank: myRow?.rank ?? 0,
    totalRanked: global.rows.length,
    calibration,
    categories,
    history,
  };
}

export const allUsernames = (): string[] => USERS.map((x) => x.username);

/* ── Асинхронные обёртки (loading/error в UI) ── */

export function fetchLeaderboard(
  scope: LeaderboardScope,
  slug?: string,
): Promise<LeaderboardResult> {
  return new Promise((resolve) => setTimeout(() => resolve(getLeaderboard(scope, slug)), 500));
}
