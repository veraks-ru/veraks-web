// Типизированные моки. Контракт совместим с REST API из архитектуры —
// при подключении бэкенда меняется только источник, не компоненты.

import type { Category, PredictionEvent } from "./types";

export const CATEGORIES: Category[] = [
  { slug: "politics", title: "Политика" },
  { slug: "economy", title: "Экономика" },
  { slug: "tech", title: "Технологии" },
  { slug: "sport", title: "Спорт" },
  { slug: "science", title: "Наука" },
  { slug: "society", title: "Общество" },
];

export const categoryTitle = (slug: string): string =>
  CATEGORIES.find((c) => c.slug === slug)?.title ?? slug;

const DAY = 86_400_000;
const iso = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * DAY).toISOString();

export const EVENTS: PredictionEvent[] = [
  {
    id: "e1",
    slug: "cbr-key-rate-cut",
    title: "Ключевая ставка ЦБ будет снижена на ближайшем заседании",
    categorySlug: "economy",
    status: "open",
    opensAt: iso(-6),
    closesAt: iso(2),
    resolvesAt: iso(4),
    resolutionSource: "Официальный пресс-релиз Банка России (cbr.ru)",
    resolutionCriteria:
      "Засчитывается ДА, если объявленная ключевая ставка ниже текущей хотя бы на 0,25 п.п.",
    forecasters: 1284,
    crowd: { counts: [40, 120, 260, 520, 344] },
    myGrade: null,
  },
  {
    id: "e2",
    slug: "spacex-starship-orbit",
    title: "Starship выполнит полный орбитальный полёт до конца квартала",
    categorySlug: "tech",
    status: "open",
    opensAt: iso(-10),
    closesAt: iso(6),
    resolvesAt: iso(9),
    resolutionSource: "Официальные каналы SpaceX и трансляция запуска",
    resolutionCriteria:
      "Засчитывается ДА при достижении орбитальной скорости и витка вокруг Земли по подтверждению SpaceX.",
    forecasters: 932,
    crowd: { counts: [180, 300, 220, 150, 82] },
    myGrade: null,
  },
  {
    id: "e3",
    slug: "national-team-quarterfinal",
    title: "Сборная выйдет в четвертьфинал турнира",
    categorySlug: "sport",
    status: "open",
    opensAt: iso(-3),
    closesAt: iso(0.4),
    resolvesAt: iso(7),
    resolutionSource: "Официальный сайт турнира",
    resolutionCriteria: "Засчитывается ДА, если команда сыграет матч стадии 1/4 финала.",
    forecasters: 2140,
    crowd: { counts: [90, 210, 540, 760, 540] },
    myGrade: "probably_yes",
  },
  {
    id: "e4",
    slug: "inflation-below-target",
    title: "Годовая инфляция опустится ниже 5% по итогам месяца",
    categorySlug: "economy",
    status: "open",
    opensAt: iso(-8),
    closesAt: iso(3),
    resolvesAt: iso(12),
    resolutionSource: "Публикация Росстата",
    resolutionCriteria: "Засчитывается ДА при значении годовой инфляции строго менее 5,0%.",
    forecasters: 671,
    crowd: { counts: [220, 240, 120, 70, 21] },
    myGrade: null,
  },
  {
    id: "e5",
    slug: "ai-model-benchmark",
    title: "Открытая модель обгонит закрытого лидера в публичном бенчмарке",
    categorySlug: "tech",
    status: "open",
    opensAt: iso(-5),
    closesAt: iso(9),
    resolvesAt: iso(14),
    resolutionSource: "Публичный лидерборд бенчмарка (фиксируется на дату разрешения)",
    resolutionCriteria:
      "Засчитывается ДА, если открытая модель занимает первое место в общем зачёте.",
    forecasters: 458,
    crowd: { counts: [60, 140, 160, 70, 28] },
    myGrade: null,
  },
  {
    id: "e6",
    slug: "fusion-net-gain-replicated",
    title: "Результат по термоядерному синтезу с чистым выигрышем энергии повторят независимо",
    categorySlug: "science",
    status: "resolved",
    opensAt: iso(-40),
    closesAt: iso(-20),
    resolvesAt: iso(-5),
    resolvedAt: iso(-5),
    outcome: false,
    sourceReference: "Рецензируемая публикация и пресс-релиз лаборатории",
    resolutionSource: "Рецензируемая публикация в профильном журнале",
    resolutionCriteria: "Засчитывается ДА при независимом подтверждении net energy gain.",
    forecasters: 540,
    crowd: { counts: [60, 180, 160, 100, 40] },
    myGrade: "probably_no",
  },
  {
    id: "e7",
    slug: "city-launches-metro-line",
    title: "Новая линия метро будет официально открыта в этом полугодии",
    categorySlug: "society",
    status: "resolved",
    opensAt: iso(-50),
    closesAt: iso(-30),
    resolvesAt: iso(-2),
    resolvedAt: iso(-2),
    outcome: true,
    sourceReference: "Официальное сообщение мэрии",
    resolutionSource: "Официальный портал города",
    resolutionCriteria: "Засчитывается ДА при запуске пассажирского движения.",
    forecasters: 1190,
    crowd: { counts: [40, 90, 200, 480, 380] },
    myGrade: "definitely_yes",
  },
  {
    id: "e8",
    slug: "summit-joint-statement",
    title: "По итогам саммита будет принято совместное заявление сторон",
    categorySlug: "politics",
    status: "resolving",
    opensAt: iso(-14),
    closesAt: iso(-1),
    resolvesAt: iso(1),
    resolutionSource: "Официальные коммюнике сторон",
    resolutionCriteria: "Засчитывается ДА при публикации совместного документа.",
    forecasters: 803,
    crowd: { counts: [120, 220, 240, 150, 73] },
    myGrade: "fifty_fifty",
  },
];

/* ── Имитация асинхронного источника (loading/error в UI) ───────── */

export function fetchEvents(): Promise<PredictionEvent[]> {
  return new Promise((resolve) => setTimeout(() => resolve(EVENTS), 650));
}

export function getEvent(slug: string): PredictionEvent | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
