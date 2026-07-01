"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { useAuth } from "@/components/app/AuthProvider";
import { Panel, Btn, Notice, useAction } from "@/components/admin/ui";
import { Spinner } from "@/components/ui/Spinner";
import { fmtDate } from "@/lib/format";
import { getMySubscription, cancelSubscription, getMyPayouts } from "@/lib/api/endpoints";
import { TARIFFS } from "@/lib/pricing";
import type { ApiPayout, ApiSubscription } from "@/lib/api/dto";

const rub = (kop: number) => `${(kop / 100).toLocaleString("ru-RU")} ₽`;
const PAYOUT_STATUS: Record<string, string> = {
  pending: "создана",
  approved: "подтверждена",
  processing: "в обработке",
  paid: "выплачена",
  failed: "ошибка",
};

const PLAN_TITLE = new Map(TARIFFS.map((t) => [t.plan as string, t.title]));
const SUB_STATUS: Record<string, string> = {
  active: "активна",
  incomplete: "ожидает оплаты",
  past_due: "просрочена",
  canceled: "отменена",
  expired: "истекла",
};

export default function AccountPage() {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh bg-paper">
        <TopNav />
        <div className="flex justify-center py-24">
          <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-dvh bg-paper">
        <TopNav />
        <main className="mx-auto max-w-2xl px-5 py-20 text-center">
          <p className="font-display text-xl font-600">Войдите в аккаунт</p>
          <Link href="/join" className="mt-4 inline-block rounded-full bg-signal px-4 py-2 text-sm font-700 text-ink-3">
            Войти
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-600 sm:text-3xl">Кабинет</h1>
            <p className="mt-1 text-sm text-slate">@{me.username}</p>
          </div>
          <Link href={`/u/${me.username}`} className="text-sm font-600 text-[color:var(--color-signal-deep)] hover:underline">
            Публичный профиль →
          </Link>
        </div>

        <SubscriptionSection />
        <PayoutsSection />
      </main>
    </div>
  );
}

function PayoutsSection() {
  const [payouts, setPayouts] = useState<ApiPayout[] | null>(null);
  useEffect(() => {
    getMyPayouts().then((p) => setPayouts(p ?? []));
  }, []);

  return (
    <Panel title="Мои выплаты" desc="Призовые выплаты по итогам сезонов">
      {payouts === null ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-6 text-[color:var(--color-signal-deep)]" />
        </div>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-slate">Выплат пока нет.</p>
      ) : (
        <ul className="divide-y divide-line">
          {payouts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-600 tnum">{rub(p.amount_kopecks)}</p>
                {p.tax_withheld_kopecks > 0 && (
                  <p className="mt-0.5 text-xs text-slate">НДФЛ удержан: {rub(p.tax_withheld_kopecks)}</p>
                )}
              </div>
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-600 text-slate">
                {PAYOUT_STATUS[p.status] ?? p.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SubscriptionSection() {
  const { refresh } = useAuth();
  const [sub, setSub] = useState<ApiSubscription | null | undefined>(undefined);
  const act = useAction();

  const reload = () => getMySubscription().then((s) => setSub(s ?? null));
  useEffect(() => {
    reload();
  }, []);

  const active = sub && sub.status === "active" && sub.current_period_end
    && new Date(sub.current_period_end).getTime() > Date.now();

  return (
    <Panel title="Подписка" desc="Голосовать и предлагать события можно с активной подпиской">
      {sub === undefined ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-6 text-[color:var(--color-signal-deep)]" />
        </div>
      ) : !sub || sub.status === "expired" || sub.status === "canceled" ? (
        <div>
          <p className="text-sm text-slate">
            {sub ? `Подписка ${SUB_STATUS[sub.status]}.` : "Активной подписки нет."}
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black"
          >
            Оформить подписку
          </Link>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Тариф" value={PLAN_TITLE.get(sub.plan) ?? sub.plan} />
            <Stat label="Статус" value={SUB_STATUS[sub.status] ?? sub.status} />
            <Stat
              label="Действует до"
              value={sub.current_period_end ? fmtDate(sub.current_period_end) : "—"}
            />
          </div>
          {active && (
            <div className="mt-5">
              <Btn
                tone="danger"
                loading={act.loading}
                onClick={async () => {
                  const r = await act.run(() => cancelSubscription(sub.id), "Подписка отменена");
                  if (r) {
                    await reload();
                    await refresh();
                  }
                }}
              >
                Отменить подписку
              </Btn>
              <Notice error={act.error} ok={act.okMsg} />
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper p-3">
      <p className="text-xs text-slate">{label}</p>
      <p className="mt-0.5 font-600">{value}</p>
    </div>
  );
}
