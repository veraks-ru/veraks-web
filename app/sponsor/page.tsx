"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/components/app/AuthProvider";
import { Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import {
  announceSponsorFund,
  depositSponsorFund,
  getMySponsorFunds,
  getSponsorFund,
} from "@/lib/api/endpoints";
import type { ApiPrizeFund, ApiSponsorFundDetail } from "@/lib/api/dto";

const rub = (k: number) => `${(k / 100).toLocaleString("ru-RU")} ₽`;

const FUND_STATUS: Record<string, string> = {
  announced: "Анонсирован",
  funded: "Профинансирован",
  distributing: "Распределяется",
  closed: "Закрыт",
};
const PAYOUT_STATUS: Record<string, string> = {
  pending: "Ожидает",
  approved: "Подтверждена",
  processing: "В обработке",
  paid: "Выплачена",
  failed: "Ошибка",
};

export default function SponsorPage() {
  const { me, loading: authLoading } = useAuth();
  const [funds, setFunds] = useState<ApiPrizeFund[] | null>(null);

  const load = () => getMySponsorFunds().then((f) => setFunds(f ?? []));
  useEffect(() => {
    if (authLoading) return;
    if (!me) {
      setFunds([]);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, authLoading]);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Кабинет спонсора</h1>
        <p className="mt-1 text-sm text-slate">
          Заведите призовой фонд и пополняйте его — выплаты победителям проводит
          платформа по правилу двойного контроля.
        </p>

        {authLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
          </div>
        ) : !me ? (
          <p className="mt-8 text-sm text-slate">
            <Link href="/join" className="font-600 text-[color:var(--color-signal-deep)]">
              Войдите
            </Link>
            , чтобы стать спонсором.
          </p>
        ) : (
          <>
            <AnnounceForm onDone={load} />
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-600">Мои фонды</h2>
              {funds === null ? (
                <p className="text-sm text-slate">Загрузка…</p>
              ) : funds.length === 0 ? (
                <p className="text-sm text-slate">Пока нет фондов — заведите первый выше.</p>
              ) : (
                <ul className="space-y-3">
                  {funds.map((f) => (
                    <FundCard key={f.id} fund={f} onChanged={load} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function AnnounceForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const act = useAction();
  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="mb-3 text-sm font-600">Анонсировать фонд</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Название бренда / спонсора"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={inputCls}
          type="number"
          min={0}
          placeholder="Заявленная сумма, ₽"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Btn
          tone="primary"
          loading={act.loading}
          onClick={async () => {
            const rubles = Number(amount);
            if (!name.trim() || !(rubles >= 0)) {
              act.setError("Укажите название и сумму");
              return;
            }
            const r = await act.run(
              () =>
                announceSponsorFund({
                  sponsor_name: name.trim(),
                  committed_kopecks: Math.round(rubles * 100),
                }),
              "Фонд анонсирован",
            );
            if (r) {
              setName("");
              setAmount("");
              onDone();
            }
          }}
        >
          Анонсировать
        </Btn>
        <Notice error={act.error} ok={act.okMsg} />
      </div>
    </div>
  );
}

function FundCard({ fund, onChanged }: { fund: ApiPrizeFund; onChanged: () => void }) {
  const [amount, setAmount] = useState("");
  const [detail, setDetail] = useState<ApiSponsorFundDetail | null>(null);
  const [open, setOpen] = useState(false);
  const act = useAction();

  useEffect(() => {
    if (open && !detail) getSponsorFund(fund.id).then(setDetail);
  }, [open, detail, fund.id]);

  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-600">{fund.sponsor_name}</p>
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-600 text-slate">
          {FUND_STATUS[fund.status] ?? fund.status}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <Metric label="Заявлено" value={rub(fund.committed_kopecks)} />
        <Metric label="Внесено" value={rub(fund.deposited_kopecks)} />
        <Metric label="Доступно" value={rub(fund.balance_kopecks)} strong />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} h-9 w-40`}
          type="number"
          min={1}
          placeholder="Сумма, ₽"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Btn
          tone="primary"
          loading={act.loading}
          onClick={async () => {
            const rubles = Number(amount);
            if (!(rubles > 0)) return;
            const r = await act.run(
              () => depositSponsorFund(fund.id, Math.round(rubles * 100)),
              "Пополнено",
            );
            if (r) {
              setAmount("");
              setDetail(null);
              onChanged();
            }
          }}
        >
          Пополнить
        </Btn>
        <Btn tone="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Скрыть выплаты" : "Выплаты"}
        </Btn>
        <Notice error={act.error} ok={act.okMsg} />
      </div>

      {open && (
        <div className="mt-4 border-t border-line/60 pt-3">
          {detail === null ? (
            <p className="text-sm text-slate">Загрузка…</p>
          ) : detail.payouts.length === 0 ? (
            <p className="text-sm text-slate">Выплат из фонда пока не было.</p>
          ) : (
            <ul className="space-y-2">
              {detail.payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate">
                    {rub(p.amount_kopecks + p.tax_withheld_kopecks)}
                  </span>
                  <span className="text-xs font-600">
                    {PAYOUT_STATUS[p.status] ?? p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-2.5">
      <p className="text-xs text-slate">{label}</p>
      <p className={`tnum ${strong ? "font-700 text-[color:var(--color-signal-deep)]" : "font-500"}`}>
        {value}
      </p>
    </div>
  );
}
