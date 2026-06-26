// Форматирование для интерфейса. Всё на русском, числа — табличными цифрами.

/** Brier и калибровка показываются с тремя знаками: 0.142 */
export const fmtBrier = (v: number): string => v.toFixed(3);

export const fmtPercent = (frac: number, digits = 0): string =>
  `${(frac * 100).toFixed(digits)}%`;

/** Русская плюрализация: pluralize(3, ['прогноз','прогноза','прогнозов']) */
export function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

export const nPredictions = (n: number): string =>
  `${n} ${pluralize(n, ["прогноз", "прогноза", "прогнозов"])}`;

export const nPeople = (n: number): string =>
  `${n.toLocaleString("ru-RU")} ${pluralize(n, ["участник", "участника", "участников"])}`;

const MONTHS = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Человеческий дедлайн относительно «сейчас»: «через 3 дня», «завтра»,
 * «сегодня», «закрыт». Источник времени в проде — сервер (PRD §4.2).
 */
export function deadlineLabel(iso: string, now: Date = new Date()): string {
  const target = new Date(iso).getTime();
  const diffMs = target - now.getTime();
  if (diffMs <= 0) return "приём закрыт";
  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor(diffMs / 3_600_000);
  if (days >= 2) return `через ${days} ${pluralize(days, ["день", "дня", "дней"])}`;
  if (days === 1) return "закрытие завтра";
  if (hours >= 1) return `через ${hours} ${pluralize(hours, ["час", "часа", "часов"])}`;
  return "закрытие вот-вот";
}

/** true, если до дедлайна меньше суток — для пометки «скоро закрытие». */
export const isClosingSoon = (iso: string, now: Date = new Date()): boolean => {
  const diffMs = new Date(iso).getTime() - now.getTime();
  return diffMs > 0 && diffMs < 86_400_000;
};
