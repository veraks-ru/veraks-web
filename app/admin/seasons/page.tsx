"use client";

import { useEffect, useState } from "react";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { useAuth } from "@/components/app/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { fmtDate } from "@/lib/format";
import { listSeasons } from "@/lib/api/endpoints";
import {
  createSeason,
  activateSeason,
  finalizeSeason,
  updateSeason,
  applyPromotion,
  getSeasonRecalibration,
  type ApiRecalibrationRow,
} from "@/lib/api/admin";
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
    listSeasons()
      .then((r) => setSeasons(r?.items ?? []))
      .catch(() => setSeasons([]));
  }, [reload]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-600 sm:text-3xl">Сезоны</h1>

      <CreateSeasonForm onCreated={refresh} />
      {isAdmin && seasons && seasons.length > 0 && (
        <DivisionsApplyPanel seasons={seasons} />
      )}

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

function DivisionsApplyPanel({ seasons }: { seasons: ApiSeason[] }) {
  const finished = seasons.filter((s) => s.status === "finished");
  const targets = seasons.filter((s) => s.status !== "finished");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [promote, setPromote] = useState("2");
  const [relegate, setRelegate] = useState("2");
  const act = useAction();

  return (
    <Panel
      title="Разнести дивизионы"
      desc="Повышение/понижение по итогам сезона (авто при активации; здесь — вручную)"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Из завершённого сезона">
          <select className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">— выберите —</option>
            {finished.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
        <Field label="В сезон">
          <select className={inputCls} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">— выберите —</option>
            {targets.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
        <Field label="Повышать (топ N)"><input type="number" min={0} className={inputCls} value={promote} onChange={(e) => setPromote(e.target.value)} /></Field>
        <Field label="Понижать (низ N)"><input type="number" min={0} className={inputCls} value={relegate} onChange={(e) => setRelegate(e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <Btn
            tone="primary"
            loading={act.loading}
            onClick={async () => {
              if (!from || !to) { act.setError("Выберите оба сезона"); return; }
              await act.run(
                () => applyPromotion({
                  finished_season_id: from, next_season_id: to,
                  promote: Number(promote), relegate: Number(relegate),
                }),
                "Дивизионы разнесены",
              );
            }}
          >
            Разнести
          </Btn>
          <Notice error={act.error} ok={act.okMsg} />
        </div>
      </div>
    </Panel>
  );
}

function SeasonRow({ s, isAdmin, onDone }: { s: ApiSeason; isAdmin: boolean; onDone: () => void }) {
  const act = useAction();
  const [info, setInfo] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [recal, setRecal] = useState<ApiRecalibrationRow[] | null | undefined>(undefined);

  const activate = async () => {
    const r = await act.run(() => activateSeason(s.id, DEMO_LEAGUE), "Сезон активирован");
    if (r) onDone();
  };
  const finalize = async () => {
    setInfo(null);
    const r = await act.run(() => finalizeSeason(s.id), "Готово");
    if (r) { setInfo(`Финализирован: квалифицировано ${r.qualified_count} из ${r.total_participants}`); onDone(); }
  };
  const toggleRecal = async () => {
    if (recal !== undefined) { setRecal(undefined); return; }
    const r = await getSeasonRecalibration(s.id);
    setRecal(r ?? []);
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
        <div className="flex flex-wrap gap-2">
          {s.status === "upcoming" && (
            <Btn tone="ghost" disabled={!isAdmin} onClick={() => setEditing((v) => !v)}>
              {editing ? "Отмена" : "Изменить"}
            </Btn>
          )}
          {s.status === "finished" && (
            <Btn tone="ghost" onClick={toggleRecal}>
              {recal !== undefined ? "Скрыть рекалибровку" : "Рекалибровка"}
            </Btn>
          )}
          <Btn tone="primary" disabled={!isAdmin || s.status !== "upcoming"} loading={act.loading} onClick={activate}>
            Активировать
          </Btn>
          <Btn tone="danger" disabled={!isAdmin || s.status !== "active"} loading={act.loading} onClick={finalize}>
            Финализировать
          </Btn>
        </div>
      </div>

      {editing && <EditSeasonForm s={s} onSaved={() => { setEditing(false); onDone(); }} />}
      {recal !== undefined && (
        <div className="mt-3 rounded-lg border border-line bg-paper p-3">
          {recal === null || recal.length === 0 ? (
            <p className="text-sm text-slate">Недостаточно данных для рекалибровки сетки.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate uppercase">
                  <th className="py-1 pr-3 font-600">Номинал</th>
                  <th className="py-1 pr-3 font-600">Факт. частота</th>
                  <th className="py-1 pr-3 font-600">N</th>
                  <th className="py-1 font-600">Новая сетка</th>
                </tr>
              </thead>
              <tbody>
                {recal.map((r) => (
                  <tr key={r.nominal} className="tnum">
                    <td className="py-1 pr-3">{r.nominal.toFixed(2)}</td>
                    <td className="py-1 pr-3">{r.observed_freq.toFixed(3)}</td>
                    <td className="py-1 pr-3 text-slate">{r.n}</td>
                    <td className="py-1 font-600 text-[color:var(--color-signal-deep)]">{r.fitted.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!isAdmin && <p className="mt-2 text-xs text-slate">Активация/финализация — только для роли admin.</p>}
      <Notice error={act.error} ok={info ?? act.okMsg} />
    </li>
  );
}

function EditSeasonForm({ s, onSaved }: { s: ApiSeason; onSaved: () => void }) {
  const [title, setTitle] = useState(s.title);
  const [starts, setStarts] = useState(toLocal(new Date(s.starts_at)));
  const [ends, setEnds] = useState(toLocal(new Date(s.ends_at)));
  const act = useAction();
  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-line bg-paper p-3 sm:grid-cols-2">
      <Field label="Название"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <div />
      <Field label="Начало"><input type="datetime-local" className={inputCls} value={starts} onChange={(e) => setStarts(e.target.value)} /></Field>
      <Field label="Конец"><input type="datetime-local" className={inputCls} value={ends} onChange={(e) => setEnds(e.target.value)} /></Field>
      <div className="sm:col-span-2">
        <Btn
          tone="primary"
          loading={act.loading}
          onClick={async () => {
            const r = await act.run(
              () => updateSeason(s.id, {
                title: title.trim(),
                starts_at: new Date(starts).toISOString(),
                ends_at: new Date(ends).toISOString(),
              }),
              "Сохранено",
            );
            if (r) onSaved();
          }}
        >
          Сохранить
        </Btn>
        <Notice error={act.error} ok={act.okMsg} />
      </div>
    </div>
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
