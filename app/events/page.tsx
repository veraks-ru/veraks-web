"use client";

import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/app/TopNav";
import { EventCard } from "@/components/events/EventCard";
import { isClosingSoon } from "@/lib/format";
import type { PredictionEvent } from "@/lib/types";
import {
  listCategories,
  listEvents,
  getMyPredictions,
  getPredictionSummary,
} from "@/lib/api/endpoints";
import { toPredictionEvent, myGradeMap } from "@/lib/api/map";
import type { ApiCategory } from "@/lib/api/dto";

type Status = "all" | "open" | "soon" | "resolved";
type Sort = "new" | "soon" | "active";

export default function EventsPage() {
  const [events, setEvents] = useState<PredictionEvent[] | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<Status>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sort, setSort] = useState<Sort>("soon");

  useEffect(() => {
    let alive = true;
    setError(false);
    setEvents(null);
    (async () => {
      try {
        const [cats, evs, mine] = await Promise.all([
          listCategories(),
          listEvents({ limit: 100 }),
          getMyPredictions(),
        ]);
        const catMap = new Map((cats ?? []).map((c) => [c.id, c.slug]));
        const grades = myGradeMap(mine);
        // Консенсус виден для всех событий (в т.ч. открытых).
        const list = (evs ?? []).filter(
          (e) => e.status !== "draft" && e.status !== "cancelled",
        );
        const summaries = await Promise.all(list.map((e) => getPredictionSummary(e.id)));
        const sumMap = new Map(list.map((e, i) => [e.id, summaries[i]]));
        const mapped = list.map((e) =>
          toPredictionEvent(e, catMap, {
            summary: sumMap.get(e.id) ?? null,
            myGrade: grades.get(e.id) ?? null,
          }),
        );
        if (alive) {
          setCategories(cats ?? []);
          setEvents(mapped);
        }
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const filtered = useMemo(() => {
    if (!events) return [];
    let list = events.filter((e) => {
      if (cat !== "all" && e.categorySlug !== cat) return false;
      if (onlyMine && !e.myGrade) return false;
      if (status === "open") return e.status === "open";
      if (status === "resolved") return e.status === "resolved";
      if (status === "soon") return e.status === "open" && isClosingSoon(e.closesAt);
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "active") return b.forecasters - a.forecasters;
      if (sort === "new") return +new Date(b.opensAt) - +new Date(a.opensAt);
      const ax = a.status === "open" ? +new Date(a.closesAt) : Infinity;
      const bx = b.status === "open" ? +new Date(b.closesAt) : Infinity;
      return ax - bx;
    });
    return list;
  }, [events, cat, status, onlyMine, sort]);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-600 sm:text-3xl">События</h1>
          <p className="mt-1.5 text-sm text-slate">
            Смотрите, как голосует толпа, и делайте свой прогноз словами. Голосование — по
            подписке; смотреть консенсус можно бесплатно.
          </p>
        </div>

        <Filters
          categories={categories}
          cat={cat}
          setCat={setCat}
          status={status}
          setStatus={setStatus}
          onlyMine={onlyMine}
          setOnlyMine={setOnlyMine}
          sort={sort}
          setSort={setSort}
        />

        <div className="mt-6">
          {error ? (
            <ErrorState onRetry={() => setReload((n) => n + 1)} />
          ) : !events ? (
            <Grid>
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </Grid>
          ) : filtered.length === 0 ? (
            <EmptyState
              onReset={() => {
                setCat("all");
                setStatus("all");
                setOnlyMine(false);
              }}
            />
          ) : (
            <Grid>
              {filtered.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </Grid>
          )}
        </div>
      </main>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Filters(props: {
  categories: ApiCategory[];
  cat: string;
  setCat: (v: string) => void;
  status: Status;
  setStatus: (v: Status) => void;
  onlyMine: boolean;
  setOnlyMine: (v: boolean) => void;
  sort: Sort;
  setSort: (v: Sort) => void;
}) {
  const statuses: { k: Status; label: string }[] = [
    { k: "all", label: "Все" },
    { k: "open", label: "Открытые" },
    { k: "soon", label: "Скоро закрытие" },
    { k: "resolved", label: "Разрешённые" },
  ];
  const sorts: { k: Sort; label: string }[] = [
    { k: "soon", label: "Скоро закрытие" },
    { k: "new", label: "Новые" },
    { k: "active", label: "Самые активные" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Статус">
          {statuses.map((s) => (
            <Pill key={s.k} on={props.status === s.k} onClick={() => props.setStatus(s.k)}>
              {s.label}
            </Pill>
          ))}
          <label className="ml-1 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm font-600 text-slate has-checked:border-graphite has-checked:text-graphite">
            <input
              type="checkbox"
              checked={props.onlyMine}
              onChange={(e) => props.setOnlyMine(e.target.checked)}
              className="size-4 accent-[color:var(--color-signal-deep)]"
            />
            Я прогнозировал
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate">
          <span className="hidden sm:inline">Сортировка</span>
          <select
            value={props.sort}
            onChange={(e) => props.setSort(e.target.value as Sort)}
            className="rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-600 text-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            {sorts.map((s) => (
              <option key={s.k} value={s.k}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Категория">
        <Pill on={props.cat === "all"} onClick={() => props.setCat("all")}>
          Все категории
        </Pill>
        {props.categories.map((c) => (
          <Pill key={c.slug} on={props.cat === c.slug} onClick={() => props.setCat(c.slug)}>
            {c.title}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function Pill({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3.5 py-2 text-sm font-600 transition-colors ${
        on
          ? "bg-graphite text-white"
          : "border border-line bg-surface text-slate hover:text-graphite"
      }`}
    >
      {children}
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="mb-4 flex justify-between">
        <Bar w="w-20" />
        <Bar w="w-16" />
      </div>
      <Bar w="w-full" h="h-5" />
      <Bar w="w-3/4" h="h-5" className="mt-2" />
      <Bar w="w-32" className="mt-4" />
      <div className="mt-4 h-20 rounded-xl bg-paper" />
    </div>
  );
}

function Bar({ w, h = "h-3", className = "" }: { w: string; h?: string; className?: string }) {
  return <div className={`${w} ${h} ${className} animate-pulse rounded bg-line`} aria-hidden="true" />;
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface py-16 text-center">
      <p className="font-display text-lg font-500">Под фильтры ничего не подошло</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate">
        Попробуйте смягчить условия — например, выбрать «Все категории».
      </p>
      <button
        onClick={onReset}
        className="mt-5 rounded-full border border-line px-4 py-2 text-sm font-600 hover:bg-paper"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface py-16 text-center" role="alert">
      <p className="font-display text-lg font-500">Не удалось загрузить события</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate">
        Проверьте, что бэкенд запущен, и попробуйте ещё раз.
      </p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black"
      >
        Обновить
      </button>
    </div>
  );
}
