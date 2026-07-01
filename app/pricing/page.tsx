"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/app/TopNav";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/components/app/AuthProvider";
import { startSubscription, getPlans } from "@/lib/api/endpoints";
import { TARIFFS, fmtRub, type PlanId } from "@/lib/pricing";

export default function PricingPage() {
  const { me, subscribed, refresh } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Актуальные цены — с сервера (фолбэк на статические, если API недоступен).
  const [prices, setPrices] = useState<Partial<Record<PlanId, number>>>({});

  useEffect(() => {
    getPlans().then((r) => {
      if (!r) return;
      const map: Partial<Record<PlanId, number>> = {};
      for (const p of r.plans) map[p.plan as PlanId] = p.price_kopecks / 100;
      setPrices(map);
    });
  }, []);

  async function subscribe(plan: PlanId) {
    if (!me) {
      router.push("/join");
      return;
    }
    setBusy(plan);
    setError(null);
    try {
      await startSubscription(plan);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось оформить подписку");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-700 sm:text-4xl">Тарифы</h1>
          <p className="mt-3 text-[0.97rem] leading-relaxed text-slate">
            Смотреть события, консенсус толпы и публичные трек-рекорды — бесплатно и без
            входа. Чтобы голосовать самому и расти в рейтинге, нужна активная подписка.
            Выберите срок:
          </p>
        </div>

        {subscribed && (
          <div className="mt-6 rounded-xl border border-[color:var(--color-signal)]/40 bg-[color:var(--color-signal)]/[0.08] px-4 py-3 text-sm font-600 text-[color:var(--color-signal-deep)]">
            Подписка активна — можно голосовать. Продление продлевает доступ.
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl bg-[#e0746a]/10 px-4 py-3 text-sm text-[#c2453a]" role="alert">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TARIFFS.map((t) => (
            <div
              key={t.plan}
              className={`flex flex-col rounded-[var(--radius-card)] border bg-surface p-6 ${
                t.popular ? "border-[color:var(--color-signal-deep)] shadow-[0_10px_40px_-22px_rgba(20,23,28,0.5)]" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-600">{t.title}</p>
                {t.popular && (
                  <span className="rounded-full bg-[color:var(--color-signal-deep)] px-2 py-0.5 text-[0.6rem] font-700 tracking-wide text-white uppercase">
                    Хит
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate">{t.period}</p>
              <p className="mt-4 font-display text-3xl font-700 tnum">{fmtRub(prices[t.plan] ?? t.priceRub)}</p>
              <p className="mt-3 flex-1 text-sm leading-snug text-slate">{t.note}</p>

              <button
                onClick={() => subscribe(t.plan)}
                disabled={busy !== null}
                className={`mt-5 inline-flex h-11 items-center justify-center rounded-full text-sm font-700 transition-colors disabled:opacity-50 ${
                  t.popular
                    ? "bg-graphite text-white hover:bg-black"
                    : "border border-line text-graphite hover:bg-paper"
                }`}
              >
                {busy === t.plan ? (
                  <Spinner className="size-5" />
                ) : !me ? (
                  "Войти и оформить"
                ) : subscribed ? (
                  "Продлить"
                ) : (
                  "Оформить"
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-slate">
          Подписка оплачивает доступ к участию и аналитике. Подробности —{" "}
          <Link href="/legal" className="text-[color:var(--color-signal-deep)] underline-offset-2 hover:underline">
            в правовой информации
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
