"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { useAuth } from "@/components/app/AuthProvider";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { Spinner } from "@/components/ui/Spinner";
import { fmtDate } from "@/lib/format";
import {
  getMySubscription,
  cancelSubscription,
  refundSubscription,
  getMyPayouts,
  updateMe,
} from "@/lib/api/endpoints";
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

        <ProfileSection />
        <SubscriptionSection />
        <PayoutsSection />

        <Link
          href="/sponsor"
          className="flex items-center justify-between rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:bg-paper"
        >
          <span>
            <span className="block text-sm font-600">Кабинет спонсора</span>
            <span className="block text-xs text-slate">
              Завести призовой фонд и пополнять его
            </span>
          </span>
          <span className="text-[color:var(--color-signal-deep)]">→</span>
        </Link>

        <Link
          href="/b2b"
          className="flex items-center justify-between rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:bg-paper"
        >
          <span>
            <span className="block text-sm font-600">Signal API</span>
            <span className="block text-xs text-slate">
              API-ключи для программного доступа к сигналам
            </span>
          </span>
          <span className="text-[color:var(--color-signal-deep)]">→</span>
        </Link>
      </main>
    </div>
  );
}

function ProfileSection() {
  const { me, refresh } = useAuth();
  const [name, setName] = useState(me?.display_name ?? "");
  const act = useAction();

  async function save() {
    if (!name.trim()) {
      act.setError("Отображаемое имя не может быть пустым");
      return;
    }
    const r = await act.run(() => updateMe(name.trim()), "Сохранено");
    if (r) await refresh();
  }

  return (
    <Panel title="Профиль" desc="Публично виден только псевдоним и статистика прогнозов">
      <div className="grid gap-4 sm:max-w-md">
        <Field label="Псевдоним">
          <input className={`${inputCls} bg-paper`} value={`@${me?.username ?? ""}`} disabled />
        </Field>
        <Field label="Отображаемое имя">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </Field>
        <div>
          <Btn tone="primary" loading={act.loading} onClick={save}>Сохранить</Btn>
          <Notice error={act.error} ok={act.okMsg} />
        </div>
      </div>
    </Panel>
  );
}

function PayoutsSection() {
  const [payouts, setPayouts] = useState<ApiPayout[] | null>(null);
  useEffect(() => {
    getMyPayouts()
      .then((p) => setPayouts(p ?? []))
      .catch(() => setPayouts([]));
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
  const { me, refresh } = useAuth();
  const [sub, setSub] = useState<ApiSubscription | null | undefined>(undefined);
  const [paid, setPaid] = useState<"1" | "0" | null>(null);
  const [activating, setActivating] = useState(false);
  const act = useAction();

  const reload = () =>
    getMySubscription()
      .then((s) => setSub(s ?? null))
      .catch(() => setSub(null));

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("paid");
    const flag = p === "1" ? "1" : p === "0" ? "0" : null;
    setPaid(flag);
    let cancelled = false;
    // После оплаты подписку активирует вебхук асинхронно — опрашиваем статус,
    // чтобы показать «активна» сразу, без перезагрузки страницы.
    async function pollUntilActive() {
      setActivating(true);
      for (let i = 0; i < 10 && !cancelled; i++) {
        const s = await getMySubscription().catch(() => null);
        if (cancelled) return;
        setSub(s ?? null);
        if (s && s.status === "active") {
          await refresh();
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) {
        setActivating(false);
        history.replaceState(null, "", "/account");
      }
    }
    if (flag === "1") pollUntilActive();
    else reload();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = sub && sub.status === "active" && sub.current_period_end
    && new Date(sub.current_period_end).getTime() > Date.now();

  return (
    <Panel title="Подписка" desc="Расширенная аналитика и предложение событий — с активной подпиской">
      {paid === "1" && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-[color:var(--color-signal)]/40 bg-[color:var(--color-signal)]/[0.08] px-4 py-3 text-sm font-600 text-[color:var(--color-signal-deep)]">
          {active ? (
            <>✓ Оплата прошла. Подписка активна.</>
          ) : activating ? (
            <>
              <Spinner className="size-4" />
              Оплата прошла — активируем подписку…
            </>
          ) : (
            <>Оплата прошла. Подписка активируется — обновите страницу через минуту.</>
          )}
        </div>
      )}
      {paid === "0" && (
        <div className="mb-5 rounded-xl bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-[color:var(--color-danger)]">
          Оплата не прошла. Можно попробовать ещё раз — выберите тариф на «Тарифах».
        </div>
      )}
      <Notice error={act.error} ok={act.okMsg} />
      {sub === undefined ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-6 text-[color:var(--color-signal-deep)]" />
        </div>
      ) : !active || !sub ? (
        <div>
          <p className="text-sm text-slate">
            Активной подписки нет. Выберите тариф — доступ откроется сразу после оплаты.
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Btn
              tone="danger"
              loading={act.loading}
              onClick={async () => {
                const r = await act.run(() => cancelSubscription(sub.id), "Подписка отменена");
                if (r) {
                  setPaid(null);
                  await reload();
                  await refresh();
                }
              }}
            >
              Отменить подписку
            </Btn>
            <Link
              href="/pricing"
              className="rounded-full border border-line px-4 py-2 text-sm font-600 text-graphite hover:bg-paper"
            >
              Сменить тариф
            </Link>
            {me?.role === "admin" && (
              <Btn
                loading={act.loading}
                onClick={async () => {
                  const r = await act.run(
                    () => refundSubscription(sub.id),
                    "Оплата возвращена покупателю",
                  );
                  if (r) {
                    setPaid(null);
                    await reload();
                    await refresh();
                  }
                }}
              >
                Вернуть последнюю оплату
              </Btn>
            )}
          </div>
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
