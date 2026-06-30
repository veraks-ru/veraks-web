"use client";

import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/app/TopNav";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { useAuth } from "@/components/app/AuthProvider";
import type { LeaderboardRow, LeaderboardScope } from "@/lib/types";
import type { ApiCategory } from "@/lib/api/dto";
import {
  getCategoryLeaderboard,
  getGlobalLeaderboard,
  getSeasonLeaderboard,
  listCategories,
  lookupUser,
} from "@/lib/api/endpoints";

const SEASON_SLUG = "2026-q2";

export default function LeaderboardsPage() {
  const { me } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [cat, setCat] = useState<string>("");
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    listCategories().then((c) => {
      setCategories(c ?? []);
      if (c && c.length) setCat((prev) => prev || c[0].id);
    });
  }, []);

  useEffect(() => {
    if (scope === "category" && !cat) return;
    let alive = true;
    setRows(null);
    setError(false);
    (async () => {
      try {
        const lb =
          scope === "category"
            ? await getCategoryLeaderboard(cat)
            : scope === "season"
              ? await getSeasonLeaderboard(SEASON_SLUG)
              : await getGlobalLeaderboard();
        const entries = lb?.entries ?? [];
        const refs = await Promise.all(entries.map((e) => lookupUser(e.user_id)));
        const out: LeaderboardRow[] = entries.map((e, i) => ({
          rank: e.rank,
          username: refs[i]?.username ?? e.user_id.slice(0, 8),
          displayName: refs[i]?.display_name ?? "—",
          meanBrier: Number(e.mean_brier),
          nResolved: e.n_resolved,
          isMe: !!me && refs[i]?.username === me.username,
        }));
        if (alive) setRows(out);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope, cat, reload, me]);

  const catTitle = useMemo(
    () => categories.find((c) => c.id === cat)?.title ?? "",
    [categories, cat],
  );

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/leaderboards" />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Лидерборды</h1>
        <p className="mt-1.5 text-sm text-slate">
          Ранжирование по точности (Brier — меньше значит точнее). В зачёт идут участники,
          преодолевшие порог по числу разрешённых прогнозов.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Tab on={scope === "global"} onClick={() => setScope("global")}>Глобальный</Tab>
          <Tab on={scope === "category"} onClick={() => setScope("category")}>По категориям</Tab>
          <Tab on={scope === "season"} onClick={() => setScope("season")}>Сезон</Tab>
        </div>

        {scope === "category" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={`rounded-full px-3 py-1.5 text-sm font-600 transition-colors ${
                  cat === c.id
                    ? "bg-graphite text-white"
                    : "border border-line bg-surface text-slate hover:text-graphite"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}

        {scope === "season" && <SeasonBanner />}

        <div className="mt-6">
          {error ? (
            <ErrorState onRetry={() => setReload((n) => n + 1)} />
          ) : !rows ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <Empty scope={scope} catTitle={catTitle} />
          ) : (
            <>
              <LeaderboardTable rows={rows} />
              <p className="mt-4 text-xs leading-relaxed text-slate">
                Средний Brier по разным наборам событий сопоставим не полностью — порог
                участия и общий пул сезона смягчают это.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SeasonBanner() {
  return (
    <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-600">Сезон 2026 · II квартал</p>
          <p className="mt-0.5 text-sm text-slate">
            Зачёт по пулу событий сезона.
          </p>
        </div>
        <span className="rounded-full bg-[color:var(--color-signal)]/12 px-3 py-1.5 text-xs font-600 text-[color:var(--color-signal-deep)]">
          идёт
        </span>
      </div>
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${
        on ? "bg-graphite text-white" : "border border-line bg-surface text-slate hover:text-graphite"
      }`}
    >
      {children}
    </button>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
          <div className="size-7 animate-pulse rounded-lg bg-line" />
          <div className="size-9 animate-pulse rounded-full bg-line" />
          <div className="h-3 flex-1 animate-pulse rounded bg-line" />
          <div className="h-3 w-12 animate-pulse rounded bg-line" />
        </div>
      ))}
    </div>
  );
}

function Empty({ scope, catTitle }: { scope: LeaderboardScope; catTitle: string }) {
  const what =
    scope === "season"
      ? "в этом сезоне"
      : scope === "category"
        ? `в категории «${catTitle}»`
        : "";
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface py-14 text-center">
      <p className="font-display text-lg font-500">Пока нет участников в зачёте {what}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate">
        Здесь появятся прогнозисты, преодолевшие порог по числу разрешённых прогнозов.
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface py-14 text-center" role="alert">
      <p className="font-display text-lg font-500">Не удалось загрузить лидерборд</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black"
      >
        Повторить
      </button>
    </div>
  );
}
