"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { useAuth } from "@/components/app/AuthProvider";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { listCategories } from "@/lib/api/endpoints";
import { proposeEvent } from "@/lib/api/endpoints";
import type { EventInput } from "@/lib/api/admin";
import type { ApiCategory } from "@/lib/api/dto";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const DAY = 86_400_000;

export default function ProposeEventPage() {
  const { me, subscribed, loading } = useAuth();
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [done, setDone] = useState(false);
  const now = new Date();
  const [f, setF] = useState<Omit<EventInput, "season_id">>({
    title: "",
    description: "",
    category_id: "",
    opens_at: toLocal(now),
    closes_at: toLocal(new Date(+now + 7 * DAY)),
    resolves_at: toLocal(new Date(+now + 9 * DAY)),
    resolution_source: "",
    resolution_criteria: "Засчитывается ДА при подтверждении по источнику.",
  });
  const act = useAction();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    listCategories().then((c) => setCats(c ?? []));
  }, []);

  async function submit() {
    if (!f.title.trim() || !f.category_id || !f.resolution_source.trim()) {
      act.setError("Заполните вопрос, категорию и источник истины");
      return;
    }
    const body: EventInput = {
      ...f,
      season_id: null,
      opens_at: new Date(f.opens_at).toISOString(),
      closes_at: new Date(f.closes_at).toISOString(),
      resolves_at: new Date(f.resolves_at).toISOString(),
    };
    const r = await act.run(() => proposeEvent(body), "Отправлено");
    if (r) setDone(true);
  }

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href="/events" className="text-sm font-600 text-slate hover:text-graphite">
          ← Все события
        </Link>
        <h1 className="mt-4 font-display text-2xl font-600 sm:text-3xl">Предложить событие</h1>
        <p className="mt-1.5 text-sm text-slate">
          Предложите вопрос для голосования. Редакция проверит формулировку и источник —
          и опубликует, если всё чисто.
        </p>

        <div className="mt-6">
          {loading ? null : !me ? (
            <Gate
              title="Войдите, чтобы предложить событие"
              note="Предлагать события могут участники с подпиской."
              cta="Войти"
              href="/join"
            />
          ) : !subscribed ? (
            <Gate
              title="Нужна подписка"
              note="Предлагать события можно по активной подписке — от 99 ₽."
              cta="Выбрать тариф"
              href="/pricing"
            />
          ) : done ? (
            <Panel>
              <p className="font-display text-lg font-600">Спасибо! Отправлено на модерацию</p>
              <p className="mt-2 text-sm text-slate">
                Редакция рассмотрит предложение. Если событие одобрят, оно появится в ленте.
              </p>
              <Link
                href="/events"
                className="mt-5 inline-block rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black"
              >
                К событиям
              </Link>
            </Panel>
          ) : (
            <Panel>
              <div className="grid gap-4">
                <Field label="Формулировка исхода ДА" hint="Однозначный вопрос, на который ответ ДА или НЕТ">
                  <input
                    className={inputCls}
                    value={f.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Курс доллара превысит 100 ₽ к концу месяца"
                  />
                </Field>
                <Field label="Описание (необязательно)">
                  <textarea className={inputCls} rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
                <Field label="Категория">
                  <select className={inputCls} value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
                    <option value="">— выберите —</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Открытие приёма">
                    <input type="datetime-local" className={inputCls} value={f.opens_at} onChange={(e) => set("opens_at", e.target.value)} />
                  </Field>
                  <Field label="Закрытие приёма">
                    <input type="datetime-local" className={inputCls} value={f.closes_at} onChange={(e) => set("closes_at", e.target.value)} />
                  </Field>
                  <Field label="Дата разрешения">
                    <input type="datetime-local" className={inputCls} value={f.resolves_at} onChange={(e) => set("resolves_at", e.target.value)} />
                  </Field>
                </div>
                <Field label="Источник истины" hint="Где будет проверяться исход — официальный сайт, публикация и т.п.">
                  <input className={inputCls} value={f.resolution_source} onChange={(e) => set("resolution_source", e.target.value)} placeholder="Официальный сайт ЦБ РФ" />
                </Field>
                <Field label="Критерии засчитывания">
                  <input className={inputCls} value={f.resolution_criteria} onChange={(e) => set("resolution_criteria", e.target.value)} />
                </Field>
                <div>
                  <Btn tone="primary" loading={act.loading} onClick={submit}>Отправить на модерацию</Btn>
                  <Notice error={act.error} ok={act.okMsg} />
                </div>
              </div>
            </Panel>
          )}
        </div>
      </main>
    </div>
  );
}

function Gate({ title, note, cta, href }: { title: string; note: string; cta: string; href: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
      <p className="font-display text-lg font-600">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate">{note}</p>
      <Link href={href} className="mt-5 inline-block rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black">
        {cta}
      </Link>
    </div>
  );
}
