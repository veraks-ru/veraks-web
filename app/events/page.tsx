"use client";

import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/app/TopNav";
import { EventCard } from "@/components/events/EventCard";
import { CATEGORIES, fetchEvents } from "@/lib/mock";
import { isClosingSoon } from "@/lib/format";
import type { PredictionEvent } from "@/lib/types";

type Status = "all" | "open" | "soon" | "resolved";
type Sort = "new" | "soon" | "active";

export default function EventsPage() {
  const [events, setEvents] = useState<PredictionEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<Status>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sort, setSort] = useState<Sort>("soon");

  useEffect(() => {
    let alive = true;
    setError(false);
    setEvents(null);
    fetchEvents()
      .then((e) => alive && setEvents(e))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

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
      // soon: ближайшее закрытие первым, разрешённые в конце
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
            Выберите событие и скажите словами, насколько уверены. Мнение толпы скрыто,
            пока вы не сделали прогноз.
          </p>
        </div>

        <Filters
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
            <ErrorState onRetry={() => location.reload()} />
          ) : !events ? (
            <Grid>
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </Grid>
          ) : filtered.length === 0 ? (
            <EmptyState onReset={() => {
              setCat("all");
              setStatus("all");
              setOnlyMine(false);
            }} />
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
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

/* ─────────────────────────── Фильтры ─────────────────────────── */

function Filters(props: {
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
      {/* статусы + сорт */}
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

      {/* категории */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Категория">
        <Pill on={props.cat === "all"} onClick={() => props.setCat("all")}>
          Все категории
        </Pill>
        {CATEGORIES.map((c) => (
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

/* ─────────────────────── Состояния ─────────────────────── */

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

function Bar({
  w,
  h = "h-3",
  className = "",
}: {
  w: string;
  h?: string;
  className?: string;
}) {
  return (
    <div
      className={`${w} ${h} ${className} animate-pulse rounded bg-line`}
      aria-hidden="true"
    />
  );
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
        Проверьте соединение и попробуйте ещё раз.
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
