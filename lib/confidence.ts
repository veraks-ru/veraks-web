// Маппинг градаций уверенности — СИСТЕМНАЯ КОНСТАНТА.
// Пользователь видит только слова. Вероятность живёт внутри и НИКОГДА
// не показывается на вводе (PRD §4.3). Крайние значения намеренно не 0/1:
// это ограничивает штраф за одну уверенную ошибку и дисциплинирует
// переуверенность.

export type ConfidenceGrade =
  | "definitely_no"
  | "probably_no"
  | "fifty_fifty"
  | "probably_yes"
  | "definitely_yes";

export interface GradeDef {
  grade: ConfidenceGrade;
  /** Что видит пользователь */
  label: string;
  /** Компактный вариант для тесных мест */
  short: string;
  /** Внутренняя вероятность p(ДА). Не для глаз пользователя на вводе. */
  probability: number;
  pole: "no" | "mid" | "yes";
}

export const GRADES: readonly GradeDef[] = [
  { grade: "definitely_no", label: "Точно нет", short: "Точно нет", probability: 0.05, pole: "no" },
  { grade: "probably_no", label: "Скорее нет", short: "Скорее нет", probability: 0.25, pole: "no" },
  { grade: "fifty_fifty", label: "50 на 50", short: "50 / 50", probability: 0.5, pole: "mid" },
  { grade: "probably_yes", label: "Скорее да", short: "Скорее да", probability: 0.75, pole: "yes" },
  { grade: "definitely_yes", label: "Точно да", short: "Точно да", probability: 0.95, pole: "yes" },
] as const;

export const gradeByIndex = (i: number): GradeDef =>
  GRADES[Math.max(0, Math.min(GRADES.length - 1, i))];

export const indexOfGrade = (g: ConfidenceGrade): number =>
  GRADES.findIndex((d) => d.grade === g);

/**
 * Цвет позиции на спектре убеждения: cool (нет) → нейтраль → warm (да).
 * Возвращает CSS-токен через var(), чтобы тема оставалась единственным
 * источником истины.
 */
export function gradeColor(i: number): string {
  const def = gradeByIndex(i);
  if (def.pole === "no") return "var(--color-cool)";
  if (def.pole === "yes") return "var(--color-warm)";
  return "var(--color-haze)";
}

/** Brier на один прогноз: BS = (p − o)². Меньше — лучше. Диапазон [0,1]. */
export const brier = (probability: number, outcome: boolean): number =>
  (probability - (outcome ? 1 : 0)) ** 2;
