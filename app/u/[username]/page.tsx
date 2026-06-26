import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TopNav } from "@/components/app/TopNav";
import { CalibrationChart } from "@/components/profile/CalibrationChart";
import { CalibrationRows } from "@/components/profile/CalibrationRows";
import { OutcomeBadge } from "@/components/ui/Badge";
import { GRADES, gradeColor } from "@/lib/confidence";
import { ece, calibrationVerdict } from "@/lib/calibration";
import { categoryTitle } from "@/lib/mock";
import { getProfile, allUsernames } from "@/lib/mock-users";
import { fmtBrier, fmtDate, nPredictions } from "@/lib/format";
import type { UserProfile } from "@/lib/types";

export function generateStaticParams() {
  return allUsernames().map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const p = getProfile(username);
  if (!p) return { title: "Профиль не найден — Оракул" };
  return {
    title: `@${p.username} — трек-рекорд предсказателя · Оракул`,
    description: `Средний Brier ${fmtBrier(p.meanBrier)}, ${p.nResolved} разрешённых прогнозов, место #${p.globalRank}.`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = getProfile(username);
  if (!profile) notFound();

  const e = ece(profile.calibration);
  const verdict = calibrationVerdict(e);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <ProfileHeader profile={profile} />
        <Readout profile={profile} ece={e} verdict={verdict.label} verdictTone={verdict.tone} />

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card title="Калибровка" subtitle="Совпадает ли уверенность с реальностью">
            <CalibrationChart buckets={profile.calibration} />
          </Card>
          <Card title="Что это значит" subtitle="Читается словами, как на вводе">
            <CalibrationRows buckets={profile.calibration} />
          </Card>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="По категориям" subtitle="Где точнее">
            <Categories profile={profile} />
          </Card>
          <Card title="История" subtitle="Разрешённые прогнозы">
            <History profile={profile} />
          </Card>
        </section>

        <p className="mt-8 text-center text-xs text-slate">
          Публично — только псевдоним и статистика прогнозов. Реальное имя не раскрывается.
        </p>
      </main>
    </div>
  );
}

function ProfileHeader({ profile }: { profile: UserProfile }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-graphite text-2xl font-700 text-white">
        {profile.displayName[0]}
      </span>
      <div className="flex-1">
        <h1 className="font-display text-2xl font-600">@{profile.username}</h1>
        <p className="text-sm text-slate">
          {profile.displayName} · на платформе с {fmtDate(profile.joinedAt)}
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-surface px-5 py-3 text-center">
        <p className="text-xs text-slate">Место в общем зачёте</p>
        <p className="font-display text-2xl font-700 tnum text-[color:var(--color-signal-deep)]">
          #{profile.globalRank}
        </p>
        <p className="text-xs tnum text-slate">из {profile.totalRanked}</p>
      </div>
    </div>
  );
}

function Readout({
  profile,
  ece: e,
  verdict,
  verdictTone,
}: {
  profile: UserProfile;
  ece: number;
  verdict: string;
  verdictTone: "good" | "ok" | "off";
}) {
  const toneColor =
    verdictTone === "good"
      ? "var(--color-signal-deep)"
      : verdictTone === "ok"
        ? "#b56b1e"
        : "#c2453a";
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Средний Brier" value={fmtBrier(profile.meanBrier)} hint="меньше — точнее" accent />
      <Stat label="Разрешено" value={String(profile.nResolved)} hint="засчитанных прогнозов" />
      <Stat label="Всего прогнозов" value={String(profile.nPredictions)} hint="включая ожидающие" />
      <Stat label="Калибровка" value={verdict} valueColor={toneColor} hint={`ошибка ${fmtBrier(e)}`} small />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = false,
  small = false,
  valueColor,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  small?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-slate">{label}</p>
      <p
        className={`mt-1 font-display font-700 ${small ? "text-base leading-tight" : "text-2xl tnum"}`}
        style={{ color: valueColor ?? (accent ? "var(--color-graphite)" : undefined) }}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate">{hint}</p>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-600">{title}</h2>
      {subtitle && <p className="mt-0.5 mb-5 text-sm text-slate">{subtitle}</p>}
      {children}
    </div>
  );
}

function Categories({ profile }: { profile: UserProfile }) {
  return (
    <ul className="space-y-4">
      {profile.categories.map((c) => {
        const accuracy = Math.max(0, Math.min(1, 1 - c.meanBrier / 0.5));
        return (
          <li key={c.categorySlug}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-600">{categoryTitle(c.categorySlug)}</span>
              <span className="text-xs tnum text-slate">
                Brier {fmtBrier(c.meanBrier)} · {c.nResolved}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-[color:var(--color-signal-deep)]"
                style={{ width: `${accuracy * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function History({ profile }: { profile: UserProfile }) {
  return (
    <ul className="divide-y divide-line">
      {profile.history.map((h) => (
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
          <span className="shrink-0">
            <OutcomeBadge outcome={h.outcome} />
          </span>
          <span className="w-14 shrink-0 text-right font-mono text-sm font-600 tnum">
            {fmtBrier(h.brier)}
          </span>
        </li>
      ))}
    </ul>
  );
}
