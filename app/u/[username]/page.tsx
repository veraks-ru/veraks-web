"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { CalibrationChart } from "@/components/profile/CalibrationChart";
import { CalibrationRows } from "@/components/profile/CalibrationRows";
import { OutcomeBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { GRADES, gradeColor, gradeIndexForProbability, indexOfGrade } from "@/lib/confidence";
import { ece as eceOf, calibrationVerdict } from "@/lib/calibration";
import { categoryTitle } from "@/lib/mock";
import { fmtBrier, fmtDate } from "@/lib/format";
import type { CalibrationBucket, CategoryStat, HistoryItem } from "@/lib/types";
import {
  getCalibration,
  getGlobalLeaderboard,
  getPublicProfile,
  getUserPredictions,
  listCategories,
  listEvents,
} from "@/lib/api/endpoints";

interface ProfileVM {
  username: string;
  displayName: string;
  joinedAt: string;
  meanBrier: number | null;
  nResolved: number;
  globalRank: number | null;
  totalRanked: number;
  eceValue: number;
  calibration: CalibrationBucket[];
  categories: CategoryStat[];
  history: HistoryItem[];
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [vm, setVm] = useState<ProfileVM | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    (async () => {
      try {
        const profile = await getPublicProfile(username);
        if (!profile) {
          if (alive) setState("notfound");
          return;
        }
        const [calib, preds, evs, cats, global] = await Promise.all([
          getCalibration(username),
          getUserPredictions(username),
          listEvents({ limit: 200 }),
          listCategories(),
          getGlobalLeaderboard(200),
        ]);

        const catSlug = new Map((cats ?? []).map((c) => [c.id, c.slug]));
        const evMap = new Map(
          (evs ?? []).map((e) => [e.id, { title: e.title, category: e.category_id, outcome: e.outcome }]),
        );

        const buckets: CalibrationBucket[] = (calib?.bins ?? []).map((b) => ({
          gradeIndex: gradeIndexForProbability(b.nominal),
          nResolved: b.n,
          nYes: Math.round(b.frequency * b.n),
        }));

        const scored = (preds ?? []).filter((p) => p.brier_score != null);

        // По категориям — из собственных оценённых прогнозов.
        const byCat = new Map<string, { sum: number; n: number }>();
        for (const p of scored) {
          const ev = evMap.get(p.event_id);
          if (!ev) continue;
          const slug = catSlug.get(ev.category) ?? "";
          const acc = byCat.get(slug) ?? { sum: 0, n: 0 };
          acc.sum += Number(p.brier_score);
          acc.n += 1;
          byCat.set(slug, acc);
        }
        const categories: CategoryStat[] = [...byCat.entries()]
          .filter(([slug]) => slug)
          .map(([slug, v]) => ({ categorySlug: slug, meanBrier: v.sum / v.n, nResolved: v.n }))
          .sort((a, b) => a.meanBrier - b.meanBrier);

        const history: HistoryItem[] = [...scored]
          .sort((a, b) => +new Date(b.scored_at!) - +new Date(a.scored_at!))
          .slice(0, 8)
          .map((p) => {
            const ev = evMap.get(p.event_id);
            return {
              eventSlug: p.event_id,
              title: ev?.title ?? "Событие",
              categorySlug: catSlug.get(ev?.category ?? "") ?? "",
              gradeIndex: indexOfGrade(p.confidence_grade),
              outcome: !!ev?.outcome,
              brier: Number(p.brier_score),
              resolvedAt: p.scored_at!,
            };
          });

        const myRow = (global?.entries ?? []).find((e) => e.user_id === calib?.user_id);
        const meanBrier = myRow
          ? Number(myRow.mean_brier)
          : scored.length
            ? scored.reduce((a, p) => a + Number(p.brier_score), 0) / scored.length
            : null;

        if (alive) {
          setVm({
            username: profile.username,
            displayName: profile.display_name,
            joinedAt: profile.member_since,
            meanBrier,
            nResolved: myRow?.n_resolved ?? scored.length,
            globalRank: myRow?.rank ?? null,
            totalRanked: global?.entries.length ?? 0,
            eceValue: calib?.ece ?? eceOf(buckets),
            calibration: buckets,
            categories,
            history,
          });
          setState("ready");
        }
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  if (state === "loading") {
    return (
      <div className="min-h-dvh bg-paper">
        <TopNav />
        <div className="flex justify-center py-24">
          <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
        </div>
      </div>
    );
  }
  if (state === "notfound" || !vm) {
    return (
      <div className="min-h-dvh bg-paper">
        <TopNav />
        <main className="mx-auto max-w-2xl px-5 py-20 text-center">
          <p className="font-display text-xl font-600">Профиль не найден</p>
          <Link href="/leaderboards" className="mt-4 inline-block text-sm font-600 text-[color:var(--color-signal-deep)]">
            ← К лидербордам
          </Link>
        </main>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="min-h-dvh bg-paper">
        <TopNav />
        <main className="mx-auto max-w-2xl px-5 py-20 text-center" role="alert">
          <p className="font-display text-xl font-600">Не удалось загрузить профиль</p>
          <button onClick={() => location.reload()} className="mt-4 rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white">
            Обновить
          </button>
        </main>
      </div>
    );
  }

  const verdict = calibrationVerdict(vm.eceValue);
  const toneColor =
    verdict.tone === "good" ? "var(--color-signal-deep)" : verdict.tone === "ok" ? "#b56b1e" : "#c2453a";

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-graphite text-2xl font-700 text-white">
            {(vm.displayName || vm.username)[0]?.toUpperCase()}
          </span>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-600">@{vm.username}</h1>
            <p className="text-sm text-slate">
              {vm.displayName} · на платформе с {fmtDate(vm.joinedAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface px-5 py-3 text-center">
            <p className="text-xs text-slate">Место в общем зачёте</p>
            <p className="font-display text-2xl font-700 tnum text-[color:var(--color-signal-deep)]">
              {vm.globalRank ? `#${vm.globalRank}` : "—"}
            </p>
            <p className="text-xs tnum text-slate">{vm.totalRanked ? `из ${vm.totalRanked}` : "вне зачёта"}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Средний Brier" value={vm.meanBrier == null ? "—" : fmtBrier(vm.meanBrier)} hint="меньше — точнее" />
          <Stat label="Разрешено" value={String(vm.nResolved)} hint="засчитанных прогнозов" />
          <Stat label="Градаций в калибровке" value={String(vm.calibration.length)} hint="использовано" />
          <Stat label="Калибровка" value={verdict.label} valueColor={toneColor} hint={`ошибка ${fmtBrier(vm.eceValue)}`} small />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card title="Калибровка" subtitle="Совпадает ли уверенность с реальностью">
            {vm.calibration.length ? (
              <CalibrationChart buckets={vm.calibration} />
            ) : (
              <Empty>Пока нет разрешённых прогнозов для калибровки.</Empty>
            )}
          </Card>
          <Card title="Что это значит" subtitle="Читается словами, как на вводе">
            {vm.calibration.length ? (
              <CalibrationRows buckets={vm.calibration} />
            ) : (
              <Empty>Появится после первых разрешённых событий.</Empty>
            )}
          </Card>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="По категориям" subtitle="Где точнее">
            {vm.categories.length ? (
              <ul className="space-y-4">
                {vm.categories.map((c) => {
                  const acc = Math.max(0, Math.min(1, 1 - c.meanBrier / 0.5));
                  return (
                    <li key={c.categorySlug}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-600">{categoryTitle(c.categorySlug)}</span>
                        <span className="text-xs tnum text-slate">
                          Brier {fmtBrier(c.meanBrier)} · {c.nResolved}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-paper">
                        <div className="h-full rounded-full bg-[color:var(--color-signal-deep)]" style={{ width: `${acc * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>Нет данных по категориям.</Empty>
            )}
          </Card>
          <Card title="История" subtitle="Разрешённые прогнозы">
            {vm.history.length ? (
              <ul className="divide-y divide-line">
                {vm.history.map((h) => (
                  <li key={h.eventSlug} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-500">{h.title}</p>
                      <p className="mt-0.5 text-xs text-slate">
                        сказал{" "}
                        <span className="font-600" style={{ color: gradeColor(h.gradeIndex) }}>
                          {GRADES[h.gradeIndex].label}
                        </span>{" "}
                        · {fmtDate(h.resolvedAt)}
                      </p>
                    </div>
                    <OutcomeBadge outcome={h.outcome} />
                    <span className="w-14 shrink-0 text-right font-mono text-sm font-600 tnum">
                      {fmtBrier(h.brier)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Пока нет разрешённых прогнозов.</Empty>
            )}
          </Card>
        </section>

        <p className="mt-8 text-center text-xs text-slate">
          Публично — только псевдоним и статистика прогнозов. Реальное имя не раскрывается.
        </p>
      </main>
    </div>
  );
}

function Stat({
  label, value, hint, small = false, valueColor,
}: {
  label: string; value: string; hint?: string; small?: boolean; valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-slate">{label}</p>
      <p
        className={`mt-1 font-display font-700 ${small ? "text-base leading-tight" : "text-2xl tnum"}`}
        style={{ color: valueColor }}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate">{hint}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-600">{title}</h2>
      {subtitle && <p className="mt-0.5 mb-5 text-sm text-slate">{subtitle}</p>}
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate">{children}</p>;
}
