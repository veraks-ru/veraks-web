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
  seedDivisions,
  getSeasonRecalibration,
  type ApiRecalibrationRow,
} from "@/lib/api/admin";
import type { ApiSeason, LeagueConfigInput } from "@/lib/api/dto";

const STATUS_LABEL: Record<string, string> = { upcoming: "Скоро", active: "Идёт", finished: "Завершён" };

// Боевые значения по умолчанию — те же, что в scoring/domain/constants.py
// (N_MIN/C_MIN/W_MIN/K_SHRINK/MIN_PREDICTORS) и scoring_system_design.md §7.
const PROD_DEFAULTS: LeagueConfigInput = {
  gradation_map: [0.1, 0.3, 0.5, 0.7, 0.9],
  n_min: 30, c_min: 4, w_min: 8, m_per_category: 1, k_shrink: 6, min_predictors: 5,
};

// Демо-пороги, чтобы на малом пуле участники вообще квалифицировались.
const DEMO_LEAGUE: LeagueConfigInput = {
  gradation_map: [0.1, 0.3, 0.5, 0.7, 0.9],
  n_min: 3, c_min: 2, w_min: 0, m_per_category: 1, k_shrink: 1, min_predictors: 5,
};

// Подписи и пояснения к порогам — в том же порядке, что на публичной странице
// сезона (web/app/seasons/[slug]/page.tsx), чтобы админ видел ровно то, что
// увидит участник в опубликованных правилах.
const RULE_FIELDS: {
  key: keyof Omit<LeagueConfigInput, "gradation_map">;
  label: string;
  hint: string;
  step: string;
  min: number;
}[] = [
  { key: "n_min", label: "Объём прогнозов", hint: "минимум разрешённых прогнозов за сезон", step: "1", min: 0 },
  { key: "c_min", label: "Разнообразие категорий", hint: "минимум разных категорий", step: "1", min: 1 },
  { key: "w_min", label: "Охват сложности", hint: "минимальная сумма весов засчитанных прогнозов", step: "0.5", min: 0 },
  { key: "m_per_category", label: "Прогнозов в категории", hint: "сколько нужно в одной категории, чтобы она пошла в разнообразие", step: "1", min: 1 },
  { key: "k_shrink", label: "Сглаживание рейтинга", hint: "константа усадки: больше — строже к малой выборке", step: "0.5", min: 0.5 },
  { key: "min_predictors", label: "Прогнозистов на событие", hint: "минимум участников, чтобы событие вошло в зачёт (LOO нужно ≥2)", step: "1", min: 2 },
];

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

      {/* Дивизионы — редкая операция раз в сезон и вообще пост-MVP. Раньше две
          их панели стояли над списком сезонов и заслоняли то, ради чего сюда
          заходят: создать и активировать сезон. */}
      {isAdmin && seasons && seasons.length > 0 && <DivisionsSection seasons={seasons} />}
    </div>
  );
}

function DivisionsSection({ seasons }: { seasons: ApiSeason[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Panel
      title="Дивизионы"
      desc="Лестница уровней: нужна, когда сезонов уже несколько. Для первого сезона можно не трогать"
      right={
        <Btn tone="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Свернуть" : "Развернуть"}
        </Btn>
      }
    >
      {open && (
        <div className="space-y-4">
          <DivisionsSeedPanel seasons={seasons} />
          <DivisionsApplyPanel seasons={seasons} />
        </div>
      )}
    </Panel>
  );
}

/**
 * Первичный посев — то, чем стартует лестница дивизионов.
 *
 * «Разнести дивизионы» ниже строит расстановку из состава завершённого сезона,
 * поэтому для самого первого сезона оно возвращает 0. Здесь участники
 * раскладываются напрямую.
 */
function DivisionsSeedPanel({ seasons }: { seasons: ApiSeason[] }) {
  const targets = seasons.filter((s) => s.status !== "finished");
  const [season, setSeason] = useState("");
  const [evenSplit, setEvenSplit] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [placed, setPlaced] = useState<number | null>(null);
  const act = useAction();

  return (
    <div className="rounded-xl bg-paper p-4">
      <p className="text-sm font-700">Первичный посев</p>
      <p className="mt-0.5 mb-3 text-xs text-slate">
        Разложить участников по уровням, когда предыдущего сезона ещё нет
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Сезон">
          <select className={inputCls} value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">— выберите —</option>
            {targets.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
        <Field label="Раскладка">
          <select
            className={inputCls}
            value={evenSplit ? "even" : "lowest"}
            onChange={(e) => setEvenSplit(e.target.value === "even")}
          >
            <option value="lowest">Все в низший дивизион</option>
            <option value="even">Поровну по уровням, по глобальному рейтингу</option>
          </select>
          <span className="mt-1 block text-xs text-slate">
            {evenSplit
              ? "лестница сразу осмысленна, но верхние уровни никем не заслужены"
              : "честный холодный старт: подняться можно только результатом"}
          </span>
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          Перезаписать уже назначенные дивизионы (иначе они не трогаются)
        </label>
        <div className="sm:col-span-2">
          <Btn
            tone="primary"
            loading={act.loading}
            onClick={async () => {
              if (!season) { act.setError("Выберите сезон"); return; }
              setPlaced(null);
              const r = await act.run(
                () => seedDivisions({ season_id: season, even_split: evenSplit, overwrite }),
                "Посев выполнен",
              );
              if (r) setPlaced(r.placed);
            }}
          >
            Разложить
          </Btn>
          {placed !== null && (
            <p className="mt-2 text-sm text-slate">
              {placed === 0
                ? "Никого не назначено — все участники уже в дивизионах, либо активных аккаунтов нет."
                : `Назначено участников: ${placed}.`}
            </p>
          )}
          <Notice error={act.error} ok={act.okMsg} />
        </div>
      </div>
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
    <div className="rounded-xl bg-paper p-4">
      <p className="text-sm font-700">Повышение и понижение</p>
      <p className="mt-0.5 mb-3 text-xs text-slate">
        По итогам завершённого сезона: топ поднимается уровнем выше, низ опускается
      </p>
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
    </div>
  );
}

function SeasonRow({ s, isAdmin, onDone }: { s: ApiSeason; isAdmin: boolean; onDone: () => void }) {
  const act = useAction();
  const [info, setInfo] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [recal, setRecal] = useState<ApiRecalibrationRow[] | null | undefined>(undefined);

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
          <Btn
            tone="primary"
            disabled={!isAdmin || s.status !== "upcoming"}
            onClick={() => setActivating((v) => !v)}
          >
            {activating ? "Свернуть" : "Активировать"}
          </Btn>
          <Btn tone="danger" disabled={!isAdmin || s.status !== "active"} loading={act.loading} onClick={finalize}>
            Финализировать
          </Btn>
        </div>
      </div>

      {editing && <EditSeasonForm s={s} onSaved={() => { setEditing(false); onDone(); }} />}
      {activating && s.status === "upcoming" && (
        <ActivateSeasonForm s={s} onActivated={() => { setActivating(false); onDone(); }} />
      )}
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

/**
 * Форма активации сезона: пороги задаются явно и замораживаются НАВСЕГДА.
 *
 * По ст. 1058 ГК условия публичного конкурса нельзя менять после объявления,
 * поэтому это единственный момент, когда значения ещё редактируемы. Раньше
 * здесь молча уходил демо-конфиг — на боевом сезоне это означало бы
 * неисправимо заниженные пороги.
 */
function ActivateSeasonForm({ s, onActivated }: { s: ApiSeason; onActivated: () => void }) {
  const [cfg, setCfg] = useState<LeagueConfigInput>(PROD_DEFAULTS);
  const [grid, setGrid] = useState(PROD_DEFAULTS.gradation_map.join(", "));
  const [confirming, setConfirming] = useState(false);
  const act = useAction();

  const setNum = (k: keyof Omit<LeagueConfigInput, "gradation_map">, raw: string) =>
    setCfg((p) => ({ ...p, [k]: raw === "" ? 0 : Number(raw) }));

  const applyPreset = (preset: LeagueConfigInput) => {
    setCfg(preset);
    setGrid(preset.gradation_map.join(", "));
    act.setError(null);
  };

  /** Разбирает сетку градаций и проверяет то же, что доменный LeagueConfig. */
  function parseGrid(): number[] | null {
    const parts = grid.split(",").map((x) => Number(x.trim()));
    if (parts.length < 2 || parts.some((x) => !Number.isFinite(x))) {
      act.setError("Сетка градаций: минимум 2 числа через запятую");
      return null;
    }
    if (parts.some((x) => x <= 0 || x >= 1)) {
      act.setError("Все градации должны лежать строго между 0 и 1");
      return null;
    }
    if (parts.some((x, i) => i > 0 && x <= parts[i - 1])) {
      act.setError("Сетка градаций должна строго возрастать");
      return null;
    }
    return parts;
  }

  async function submit() {
    const gradation_map = parseGrid();
    if (!gradation_map) return;
    if (cfg.min_predictors < 2) {
      act.setError("Прогнозистов на событие должно быть ≥ 2 (нужно для LOO-консенсуса)");
      return;
    }
    if (cfg.k_shrink <= 0) {
      act.setError("Сглаживание рейтинга должно быть положительным");
      return;
    }
    const r = await act.run(
      () => activateSeason(s.id, { ...cfg, gradation_map }),
      "Сезон активирован, правила опубликованы",
    );
    if (r) onActivated();
  }

  return (
    <div className="mt-3 rounded-lg border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-600">Правила сезона на момент активации</p>
        <div className="flex gap-2">
          <Btn tone="ghost" onClick={() => applyPreset(PROD_DEFAULTS)}>Боевые</Btn>
          <Btn tone="ghost" onClick={() => applyPreset(DEMO_LEAGUE)}>Демо</Btn>
        </div>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate">
        После активации эти значения <span className="font-600">нельзя изменить</span>: условия
        публичного конкурса фиксируются заранее (ст. 1058 ГК). Проверьте пороги по фактической
        активности — при слишком высоком объёме к призам не квалифицируется никто.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RULE_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              type="number"
              step={f.step}
              min={f.min}
              className={inputCls}
              value={cfg[f.key]}
              onChange={(e) => setNum(f.key, e.target.value)}
            />
            <span className="mt-1 block text-xs text-slate">{f.hint}</span>
          </Field>
        ))}
        <Field label="Сетка градаций">
          <input className={inputCls} value={grid} onChange={(e) => setGrid(e.target.value)} />
          <span className="mt-1 block text-xs text-slate">
            вероятности слов-градаций, строго по возрастанию, через запятую
          </span>
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <span className="text-sm font-600">Активировать «{s.title}» с этими правилами?</span>
            <Btn tone="primary" loading={act.loading} onClick={submit}>Да, активировать</Btn>
            <Btn tone="ghost" onClick={() => setConfirming(false)}>Отмена</Btn>
          </>
        ) : (
          <Btn tone="primary" onClick={() => setConfirming(true)}>Активировать сезон</Btn>
        )}
      </div>
      <Notice error={act.error} ok={act.okMsg} />
    </div>
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
