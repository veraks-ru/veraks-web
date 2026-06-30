"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/app/AuthProvider";
import { Panel, Btn, Notice, useAction } from "@/components/admin/ui";
import { Spinner } from "@/components/ui/Spinner";
import { listCategories, listEvents, listSeasons } from "@/lib/api/endpoints";
import { recomputeRatings } from "@/lib/api/admin";
import type { ApiEvent } from "@/lib/api/dto";

export default function AdminDashboard() {
  const { me } = useAuth();
  const [events, setEvents] = useState<ApiEvent[] | null>(null);
  const [cats, setCats] = useState(0);
  const [seasons, setSeasons] = useState(0);
  const recompute = useAction();

  useEffect(() => {
    Promise.all([listEvents({ limit: 200 }), listCategories(), listSeasons()]).then(
      ([e, c, s]) => {
        setEvents(e ?? []);
        setCats((c ?? []).length);
        setSeasons((s?.items ?? []).length);
      },
    );
  }, []);

  const by = (st: string) => (events ?? []).filter((e) => e.status === st).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Управление</h1>
        <p className="mt-1.5 text-sm text-slate">
          Создавайте события, ведите их жизненный цикл, фиксируйте исходы и считайте рейтинги.
        </p>
      </div>

      {!events ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat n={events.length} label="событий" />
            <Stat n={by("draft")} label="черновики" />
            <Stat n={by("open")} label="открыто" accent />
            <Stat n={by("resolved")} label="разрешено" />
            <Stat n={cats} label="категорий" />
            <Stat n={seasons} label="сезонов" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="События" desc="Создание, публикация, закрытие, разрешение, скоринг">
              <Link href="/admin/events" className="text-sm font-700 text-[color:var(--color-signal-deep)] hover:underline">
                Открыть события →
              </Link>
            </Panel>
            <Panel title="Сезоны" desc="Создание, активация, финализация лиги">
              <Link href="/admin/seasons" className="text-sm font-700 text-[color:var(--color-signal-deep)] hover:underline">
                Открыть сезоны →
              </Link>
            </Panel>
            <Panel title="Призовой фонд" desc="Спонсорские фонды и выплаты (maker-checker)">
              <Link href="/admin/prizes" className="text-sm font-700 text-[color:var(--color-signal-deep)] hover:underline">
                Открыть фонд →
              </Link>
            </Panel>
            <Panel title="Пересчёт рейтингов" desc="Полный recompute всех срезов (admin)">
              <Btn
                tone="primary"
                loading={recompute.loading}
                disabled={me?.role !== "admin"}
                onClick={() =>
                  recompute.run(async () => {
                    const r = await recomputeRatings();
                    return r;
                  }, "Рейтинги пересчитаны")
                }
              >
                Пересчитать сейчас
              </Btn>
              {me?.role !== "admin" && (
                <p className="mt-2 text-xs text-slate">Доступно только роли admin.</p>
              )}
              <Notice error={recompute.error} ok={recompute.okMsg} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p
        className="font-display text-2xl font-700 tnum"
        style={{ color: accent ? "var(--color-signal-deep)" : undefined }}
      >
        {n}
      </p>
      <p className="mt-0.5 text-xs text-slate">{label}</p>
    </div>
  );
}
