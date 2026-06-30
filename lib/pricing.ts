// Тарифы подписки. plan совпадает с SubscriptionPlan бэкенда.
// Голосование требует активной подписки; смотреть площадку — бесплатно.

export type PlanId = "daily" | "weekly" | "monthly" | "annual";

export interface Tariff {
  plan: PlanId;
  title: string;
  period: string;
  priceRub: number;
  note: string;
  popular?: boolean;
}

export const TARIFFS: Tariff[] = [
  { plan: "daily", title: "День", period: "24 часа", priceRub: 99, note: "Попробовать на одном событии" },
  { plan: "weekly", title: "Неделя", period: "7 дней", priceRub: 499, note: "Активная неделя прогнозов" },
  { plan: "monthly", title: "Месяц", period: "30 дней", priceRub: 990, note: "Оптимально для сезона", popular: true },
  { plan: "annual", title: "Год", period: "365 дней", priceRub: 4990, note: "Выгоднее всего — два месяца в подарок" },
];

export const fmtRub = (rub: number) => `${rub.toLocaleString("ru-RU")} ₽`;
