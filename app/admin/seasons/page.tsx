"use client";

import { useEffect, useState } from "react";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { useAuth } from "@/components/app/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { fmtDate } from "@/lib/format";
import { listSeasons } from "@/lib/api/endpoints";
import { createSeason, activateSeason, finalizeSeason } from "@/lib/api/admin";
import type { ApiSeason, LeagueConfigInput } from "@/lib/api/dto";

const STATUS_LABEL: Record<string, string> = { upcoming: "Скоро", active: "Идёт", finished: "Завершён" };

// Демо-пороги, чтобы на малом пуле участники квалифицировались.
const DEMO_LEAGUE: LeagueConfigInput = {
  gradation_map: [0.1, 0.3, 0.5, 0.7, 0.9],
  n_min: 3, c_min: 2, w_min: 0, m_per_category: 1, k_shrink: 1, min_predictors: 5,
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function AdminSeasonsPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === "admin";
  const [seasons, setSeasons] = useState<ApiSeason[] | null>(null);
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);

  useEffect(() => {
    listSeasons().then((r) => setSeasons(r?.items ?? []));
  }, [reload]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-600 sm:text-3xl">Сезоны</h1>

      <CreateSeasonForm onCreated={refresh} />

      <Panel title="Все сезоны" desc="Активация и финализация — роль admin">
        {!seasons ? (
          <div className="flex justify-center py-10"><Spinner className="size-7 text-[color:var(--color-signal-deep)]" /></div>
        ) : seasons.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate">Сезонов нет.</p>
        ) : (
          <ul className="space-y-3">
            {seasons.map((s) => <SeasonRow key={s.id} s={s} isAdmin={isAdmin} onDone={refresh} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function SeasonRow({ s, isAdmin, onDone }: { s: ApiSeason; isAdmin: boolean; onDone: () => void }) {
  const act = useAction();
  const [info, setInfo] = useState<string | null>(null);

  const activate = async () => {
    const r = await act.run(() => activateSeason(s.id, DEMO_LEAGUE), "Сезон активирован");
    if (r) onDone();
  };
  const finalize = async () => {
    setInfo(null);
    const r = await act.run(() => finalizeSeason(s.id), "Готово");
    if (r) { setInfo(`Финализирован: квалифицировано ${r.qualified_count} из ${r.total_participants}`); onDone(); }
  };

  return (
    <li className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-600">{s.title}</p>
          <p className="mt-0.5 text-sm text-slate">
            {fmtDate(s.starts_at)} — {fmtDate(s.ends_at)} · <span className="font-600">{STATUS_LABEL[s.status]}</span>
            {s.league_config ? " · конфиг есть" : " · без конфига"}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn tone="primary" disabled={!isAdmin || s.status !== "upcoming"} loading={act.loading} onClick={activate}>
            Активировать
          </Btn>
          <Btn tone="danger" disabled={!isAdmin || s.status !== "active"} loading={act.loading} onClick={finalize}>
            Финализировать
          </Btn>
        </div>
      </div>
      {!isAdmin && <p className="mt-2 text-xs text-slate">Активация/финализация — только для роли admin.</p>}
      <Notice error={act.error} ok={info ?? act.okMsg} />
    </li>
  );
}

function CreateSeasonForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState(toLocal(now));
  const [ends, setEnds] = useState(toLocal(new Date(+now + 90 * 86_400_000)));
  const act = useAction();

  async function submit() {
    if (!slug.trim() || !title.trim()) { act.setError("Slug и название обязательны"); return; }
    const r = await act.run(
      () => createSeason({
        slug: slug.trim(), title: title.trim(),
        starts_at: new Date(starts).toISOString(), ends_at: new Date(ends).toISOString(),
      }),
      "Сезон создан (upcoming)",
    );
    if (r) { setSlug(""); setTitle(""); onCreated(); }
  }

  return (
    <Panel title="Создать сезон" right={<Btn tone="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Свернуть" : "Развернуть"}</Btn>}>
      {open && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug"><input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="2026-q3" /></Field>
          <Field label="Название"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Сезон 2026 · III квартал" /></Field>
          <Field label="Начало"><input type="datetime-local" className={inputCls} value={starts} onChange={(e) => setStarts(e.target.value)} /></Field>
          <Field label="Конец"><input type="datetime-local" className={inputCls} value={ends} onChange={(e) => setEnds(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Btn tone="primary" loading={act.loading} onClick={submit}>Создать</Btn><Notice error={act.error} ok={act.okMsg} /></div>
        </div>
      )}
    </Panel>
  );
}
