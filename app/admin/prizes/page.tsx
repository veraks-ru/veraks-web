"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { useAuth } from "@/components/app/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { listSeasons, getSeasonLeaderboard, lookupUser } from "@/lib/api/endpoints";
import {
  getSeasonPrizeFund, announcePrizeFund, depositPrizeFund,
  listPayouts, createPayout, approvePayout, dispatchPayout,
} from "@/lib/api/admin";
import type { ApiPayout, ApiPrizeFund, ApiSeason, ApiSeasonPrizeFund } from "@/lib/api/dto";

const rub = (kop: number) => `${(kop / 100).toLocaleString("ru-RU")} ₽`;
const PAYOUT_LABEL: Record<string, string> = {
  pending: "Создана", approved: "Подтверждена", processing: "В обработке", paid: "Выплачена", failed: "Ошибка",
};

export default function AdminPrizesPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === "admin";
  const [seasons, setSeasons] = useState<ApiSeason[]>([]);
  const [slug, setSlug] = useState("");
  const [fund, setFund] = useState<ApiSeasonPrizeFund | null>(null);
  const [payouts, setPayouts] = useState<ApiPayout[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [winners, setWinners] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);

  useEffect(() => {
    listSeasons().then((r) => {
      const items = r?.items ?? [];
      setSeasons(items);
      const def = items.find((s) => s.status === "active") ?? items[0];
      if (def) setSlug((p) => p || def.slug);
    });
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const season = seasons.find((s) => s.slug === slug);
      const [pf, lb, po] = await Promise.all([
        getSeasonPrizeFund(slug),
        getSeasonLeaderboard(slug, 20),
        listPayouts(season?.id),
      ]);
      const entries = lb?.entries ?? [];
      const refs = await Promise.all(entries.map((e) => lookupUser(e.user_id)));
      const nm = new Map<string, string>();
      refs.forEach((r) => r && nm.set(r.user_id, r.username));
      // дорезолвить имена из выплат
      for (const p of po ?? []) if (!nm.has(p.user_id)) { const r = await lookupUser(p.user_id); if (r) nm.set(r.user_id, r.username); }
      if (alive) {
        setFund(pf);
        setPayouts(po ?? []);
        setNames(nm);
        setWinners(entries.map((e, i) => ({ id: e.user_id, name: refs[i]?.username ?? e.user_id.slice(0, 8) })));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug, seasons, reload]);

  const seasonId = useMemo(() => seasons.find((s) => s.slug === slug)?.id, [seasons, slug]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Призовой фонд</h1>
        <select className={`${inputCls} max-w-xs`} value={slug} onChange={(e) => setSlug(e.target.value)}>
          {seasons.map((s) => <option key={s.id} value={s.slug}>{s.title}</option>)}
        </select>
      </div>

      {!isAdmin && (
        <p className="rounded-lg bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-danger)]">
          Управление фондом и выплатами доступно роли admin.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="size-8 text-[color:var(--color-signal-deep)]" /></div>
      ) : (
        <>
          <FundsPanel fund={fund} seasonId={seasonId} isAdmin={isAdmin} onDone={refresh} />
          <PayoutsPanel
            payouts={payouts} funds={fund?.funds ?? []} winners={winners} names={names}
            seasonId={seasonId} isAdmin={isAdmin} meId={me?.id} onDone={refresh}
          />
        </>
      )}
    </div>
  );
}

function FundsPanel({ fund, seasonId, isAdmin, onDone }: {
  fund: ApiSeasonPrizeFund | null; seasonId?: string; isAdmin: boolean; onDone: () => void;
}) {
  const [sponsor, setSponsor] = useState("Спонсор Демо");
  const [committed, setCommitted] = useState("500000");
  const [depAmt, setDepAmt] = useState<Record<string, string>>({});
  const create = useAction();
  const dep = useAction();

  return (
    <Panel title="Фонды сезона" desc="Средства фондов и их остаток">
      {fund && fund.funds.length > 0 ? (
        <ul className="mb-5 space-y-2">
          {fund.funds.map((f: ApiPrizeFund) => (
            <li key={f.id} className="rounded-xl border border-line p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-600">{f.sponsor_name} <span className="ml-2 text-xs text-slate">({f.status})</span></p>
                  <p className="mt-0.5 text-sm text-slate">
                    Заявлено {rub(f.committed_kopecks)} · Внесено {rub(f.deposited_kopecks)} · Баланс {rub(f.balance_kopecks)}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-end gap-2">
                    <input className={`${inputCls} w-28`} placeholder="₽" value={depAmt[f.id] ?? ""} onChange={(e) => setDepAmt((p) => ({ ...p, [f.id]: e.target.value }))} />
                    <Btn tone="primary" loading={dep.loading} onClick={async () => {
                      const r = await dep.run(() => depositPrizeFund(f.id, { amount_kopecks: Math.round(Number(depAmt[f.id]) * 100) }), "Депозит внесён");
                      if (r) onDone();
                    }}>Внести депозит</Btn>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-5 text-sm text-slate">Фондов пока нет.</p>
      )}
      <Notice error={dep.error} ok={dep.okMsg} />

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <div className="flex-1 min-w-[12rem]"><Field label="Спонсор"><input className={inputCls} value={sponsor} onChange={(e) => setSponsor(e.target.value)} /></Field></div>
          <div className="w-36"><Field label="Заявлено, ₽"><input className={inputCls} value={committed} onChange={(e) => setCommitted(e.target.value)} /></Field></div>
          <Btn tone="primary" loading={create.loading} onClick={async () => {
            const r = await create.run(() => announcePrizeFund({
              sponsor_name: sponsor.trim(), committed_kopecks: Math.round(Number(committed) * 100), season_id: seasonId ?? null,
            }), "Фонд заведён");
            if (r) onDone();
          }}>Завести фонд</Btn>
          <div className="w-full"><Notice error={create.error} ok={create.okMsg} /></div>
        </div>
      )}
    </Panel>
  );
}

function PayoutsPanel({ payouts, funds, winners, names, seasonId, isAdmin, meId, onDone }: {
  payouts: ApiPayout[]; funds: ApiPrizeFund[]; winners: { id: string; name: string }[];
  names: Map<string, string>; seasonId?: string; isAdmin: boolean; meId?: string; onDone: () => void;
}) {
  const [user, setUser] = useState("");
  const [fundId, setFundId] = useState("");
  const [amount, setAmount] = useState("10000");
  const create = useAction();
  const row = useAction();
  // Спиннер — только у нажатой строки, а не у всех выплат сразу.
  const [busyId, setBusyId] = useState<string | null>(null);
  const runRow = async (id: string, fn: () => Promise<unknown>, msg: string) => {
    setBusyId(id);
    try {
      const r = await row.run(fn, msg);
      if (r) onDone();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel title="Выплаты" desc="Создаёт один администратор, подтверждает — другой">
      {payouts.length > 0 ? (
        <ul className="mb-5 space-y-2">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3.5">
              <div>
                <p className="font-600">@{names.get(p.user_id) ?? p.user_id.slice(0, 8)} — {rub(p.amount_kopecks)}</p>
                <p className="mt-0.5 text-xs text-slate">
                  {PAYOUT_LABEL[p.status]}{p.approved_by ? " · подтверждена" : ""}
                  {p.created_by === meId ? " · создана вами" : ""}
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  {p.status === "pending" && (
                    <Btn tone="primary" loading={busyId === p.id} onClick={() => runRow(p.id, () => approvePayout(p.id), "Подтверждена")}>Подтвердить</Btn>
                  )}
                  {p.status === "approved" && (
                    <Btn tone="primary" loading={busyId === p.id} onClick={() => runRow(p.id, () => dispatchPayout(p.id), "Отправлена провайдеру")}>Отправить</Btn>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-5 text-sm text-slate">Выплат пока нет.</p>
      )}
      <Notice error={row.error} ok={row.okMsg} />

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <div className="min-w-[10rem]"><Field label="Победитель">
            <select className={inputCls} value={user} onChange={(e) => setUser(e.target.value)}>
              <option value="">— выбрать —</option>
              {winners.map((w) => <option key={w.id} value={w.id}>@{w.name}</option>)}
            </select>
          </Field></div>
          <div className="min-w-[10rem]"><Field label="Фонд">
            <select className={inputCls} value={fundId} onChange={(e) => setFundId(e.target.value)}>
              <option value="">— выбрать —</option>
              {funds.map((f) => <option key={f.id} value={f.id}>{f.sponsor_name} ({rub(f.balance_kopecks)})</option>)}
            </select>
          </Field></div>
          <div className="w-32"><Field label="Сумма, ₽"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field></div>
          <Btn tone="primary" loading={create.loading} onClick={async () => {
            if (!user || !fundId) { create.setError("Выберите победителя и фонд"); return; }
            const r = await create.run(() => createPayout({
              user_id: user, prize_fund_id: fundId, amount_kopecks: Math.round(Number(amount) * 100), season_id: seasonId ?? null,
            }), "Выплата создана (нужно подтверждение другим admin)");
            if (r) onDone();
          }}>Создать выплату</Btn>
          <div className="w-full"><Notice error={create.error} ok={create.okMsg} /></div>
        </div>
      )}
    </Panel>
  );
}
