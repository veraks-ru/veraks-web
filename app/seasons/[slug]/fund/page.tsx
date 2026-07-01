"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { Spinner } from "@/components/ui/Spinner";
import { getSeasonPrizeFund } from "@/lib/api/admin";
import { lookupUser, getSeason, getPrizeFund } from "@/lib/api/endpoints";
import type { ApiSeasonPrizeFund } from "@/lib/api/dto";

const rub = (kop: number) => `${(kop / 100).toLocaleString("ru-RU")} ₽`;
const PAYOUT_STATUS: Record<string, string> = {
  pending: "создана",
  approved: "подтверждена",
  processing: "в обработке",
  paid: "выплачена",
  failed: "ошибка",
};
const FUND_STATUS: Record<string, string> = {
  announced: "объявлен",
  funded: "профинансирован",
  distributing: "распределяется",
  closed: "закрыт",
};

export default function SeasonFundPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ApiSeasonPrizeFund | null | undefined>(undefined);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [seasonTitle, setSeasonTitle] = useState<string>("");
  const [balances, setBalances] = useState<Map<string, number>>(new Map());

  async function refreshFund(fundId: string) {
    const f = await getPrizeFund(fundId);
    if (f) setBalances((m) => new Map(m).set(fundId, f.balance_kopecks));
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      getSeason(slug).then((s) => { if (alive && s) setSeasonTitle(s.title); });
      const pf = await getSeasonPrizeFund(slug);
      if (!alive) return;
      setData(pf ?? null);
      const ids = [...new Set((pf?.payouts ?? []).map((p) => p.user_id))];
      const refs = await Promise.all(ids.map((id) => lookupUser(id)));
      const nm = new Map<string, string>();
      refs.forEach((r, i) => nm.set(ids[i], r?.username ?? ids[i].slice(0, 8)));
      if (alive) setNames(nm);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const totalCommitted = (data?.funds ?? []).reduce((a, f) => a + f.committed_kopecks, 0);
  const totalBalance = (data?.funds ?? []).reduce((a, f) => a + f.balance_kopecks, 0);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/seasons" />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href="/seasons" className="text-sm font-600 text-slate hover:text-graphite">
          ← Сезоны
        </Link>
        <h1 className="mt-4 font-display text-2xl font-600 sm:text-3xl">
          Призовой фонд{seasonTitle ? ` · ${seasonTitle}` : " сезона"}
        </h1>
        <p className="mt-1.5 text-sm text-slate">
          Фонд формируется из спонсорских средств. Движение фонда открыто для проверки.
        </p>

        {data === undefined ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
          </div>
        ) : !data || data.funds.length === 0 ? (
          <p className="mt-8 rounded-xl border border-line bg-surface p-5 text-sm text-slate">
            Для этого сезона фонды пока не заведены.
          </p>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Заявлено спонсорами" value={rub(totalCommitted)} />
              <Stat label="Текущий баланс" value={rub(totalBalance)} accent />
            </div>

            <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <h2 className="mb-4 font-display text-lg font-600">Спонсоры и фонды</h2>
              <ul className="space-y-3">
                {data.funds.map((f) => (
                  <li key={f.id} className="rounded-xl bg-paper p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-600">{f.sponsor_name}</p>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-600 text-slate">
                        {FUND_STATUS[f.status] ?? f.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate">
                      Заявлено {rub(f.committed_kopecks)} · внесено {rub(f.deposited_kopecks)} ·
                      баланс {rub(balances.get(f.id) ?? f.balance_kopecks)}
                      <button
                        onClick={() => refreshFund(f.id)}
                        className="ml-2 text-xs text-[color:var(--color-signal-deep)] hover:underline"
                      >
                        обновить
                      </button>
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <h2 className="mb-4 font-display text-lg font-600">История выплат</h2>
              {data.payouts.length === 0 ? (
                <p className="text-sm text-slate">Выплат пока не было.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.payouts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <Link
                        href={`/u/${names.get(p.user_id) ?? ""}`}
                        className="text-sm font-600 hover:underline"
                      >
                        @{names.get(p.user_id) ?? p.user_id.slice(0, 8)}
                      </Link>
                      <span className="text-xs text-slate">{PAYOUT_STATUS[p.status] ?? p.status}</span>
                      <span className="font-mono text-sm font-700 tnum">{rub(p.amount_kopecks)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-slate">{label}</p>
      <p
        className="mt-1 font-display text-xl font-700 tnum"
        style={{ color: accent ? "var(--color-signal-deep)" : undefined }}
      >
        {value}
      </p>
    </div>
  );
}
