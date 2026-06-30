"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { Spinner } from "@/components/ui/Spinner";
import { listCategories, listEvents, listSeasons } from "@/lib/api/endpoints";
import {
  createEvent,
  createCategory,
  approveEvent,
  rejectEvent,
  type EventInput,
} from "@/lib/api/admin";
import type { ApiCategory, ApiEvent, ApiSeason } from "@/lib/api/dto";

const STATUS_LABEL: Record<string, string> = {
  proposed: "На модерации",
  draft: "Черновик",
  open: "Открыто",
  closed: "Приём закрыт",
  resolving: "Разрешается",
  resolved: "Разрешено",
  disputed: "Оспорено",
  cancelled: "Отменено",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayMs = 86_400_000;

export default function AdminEventsPage() {
  const [events, setEvents] = useState<ApiEvent[] | null>(null);
  const [proposed, setProposed] = useState<ApiEvent[]>([]);
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [seasons, setSeasons] = useState<ApiSeason[]>([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    Promise.all([
      listEvents({ limit: 200 }),
      listEvents({ status: "proposed", limit: 200 }),
      listCategories(),
      listSeasons(),
    ]).then(([e, p, c, s]) => {
      setEvents(e ?? []);
      setProposed(p ?? []);
      setCats(c ?? []);
      setSeasons(s?.items ?? []);
    });
  }, [reload]);

  const catTitle = useMemo(() => new Map(cats.map((c) => [c.id, c.title])), [cats]);
  const refresh = () => setReload((n) => n + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">События</h1>
      </div>

      <Moderation proposed={proposed} catTitle={catTitle} onDone={refresh} />
      <CreateEventForm cats={cats} seasons={seasons} onCreated={refresh} />
      <CreateCategoryForm onCreated={refresh} />

      <Panel title="Все события" desc="Перейдите в событие, чтобы вести его и фиксировать исход">
        {!events ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
          </div>
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate">Событий пока нет — создайте первое выше.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-slate uppercase">
                  <th className="py-2 pr-3 font-600">Событие</th>
                  <th className="py-2 pr-3 font-600">Категория</th>
                  <th className="py-2 pr-3 font-600">Статус</th>
                  <th className="py-2 font-600"></th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-line/60">
                    <td className="max-w-[24rem] py-2.5 pr-3">
                      <span className="line-clamp-2 font-500">{e.title}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate">{catTitle.get(e.category_id) ?? "—"}</td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-600 text-slate">
                        {STATUS_LABEL[e.status] ?? e.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/admin/events/${e.id}`}
                        className="text-sm font-700 text-[color:var(--color-signal-deep)] hover:underline"
                      >
                        Управлять →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Moderation({
  proposed,
  catTitle,
  onDone,
}: {
  proposed: ApiEvent[];
  catTitle: Map<string, string>;
  onDone: () => void;
}) {
  return (
    <Panel
      title={`На модерации${proposed.length ? ` · ${proposed.length}` : ""}`}
      desc="Предложения событий от участников — одобрить или отклонить"
    >
      {proposed.length === 0 ? (
        <p className="py-2 text-sm text-slate">Новых предложений нет.</p>
      ) : (
        <ul className="space-y-3">
          {proposed.map((ev) => (
            <ModRow key={ev.id} ev={ev} catTitle={catTitle} onDone={onDone} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ModRow({
  ev,
  catTitle,
  onDone,
}: {
  ev: ApiEvent;
  catTitle: Map<string, string>;
  onDone: () => void;
}) {
  const act = useAction();
  return (
    <li className="rounded-xl border border-line p-3.5">
      <p className="font-500">{ev.title}</p>
      <p className="mt-0.5 text-xs text-slate">
        {catTitle.get(ev.category_id) ?? "—"} · предложено участником
      </p>
      <div className="mt-3 flex gap-2">
        <Btn
          tone="primary"
          loading={act.loading}
          onClick={async () => {
            const r = await act.run(() => approveEvent(ev.id), "Одобрено — стало черновиком");
            if (r) onDone();
          }}
        >
          Одобрить
        </Btn>
        <Btn
          tone="danger"
          loading={act.loading}
          onClick={async () => {
            const r = await act.run(() => rejectEvent(ev.id, "не подходит"), "Отклонено");
            if (r) onDone();
          }}
        >
          Отклонить
        </Btn>
      </div>
      <Notice error={act.error} ok={act.okMsg} />
    </li>
  );
}

function CreateEventForm({
  cats,
  seasons,
  onCreated,
}: {
  cats: ApiCategory[];
  seasons: ApiSeason[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [f, setF] = useState<EventInput>({
    title: "",
    description: "Демо-событие.",
    category_id: "",
    season_id: null,
    opens_at: toLocal(now),
    closes_at: toLocal(new Date(+now + 7 * dayMs)),
    resolves_at: toLocal(new Date(+now + 9 * dayMs)),
    resolution_source: "Официальный источник",
    resolution_criteria: "Засчитывается ДА при подтверждении по источнику.",
  });
  const act = useAction();

  const set = (k: keyof EventInput, v: string | null) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.title.trim() || !f.category_id) {
      act.setError("Заполните заголовок и категорию");
      return;
    }
    const body: EventInput = {
      ...f,
      opens_at: new Date(f.opens_at).toISOString(),
      closes_at: new Date(f.closes_at).toISOString(),
      resolves_at: new Date(f.resolves_at).toISOString(),
      season_id: f.season_id || null,
    };
    const r = await act.run(() => createEvent(body), "Событие создано (черновик)");
    if (r) {
      setF((p) => ({ ...p, title: "" }));
      onCreated();
    }
  }

  return (
    <Panel
      title="Создать событие"
      desc="Создаётся черновиком — потом опубликуете"
      right={
        <Btn tone="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Свернуть" : "Развернуть"}
        </Btn>
      }
    >
      {open && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Формулировка исхода ДА">
              <input
                className={inputCls}
                value={f.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ключевая ставка ЦБ будет снижена на ближайшем заседании"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Описание">
              <textarea className={inputCls} rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
          <Field label="Категория">
            <select className={inputCls} value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">— выберите —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Сезон (опционально)">
            <select className={inputCls} value={f.season_id ?? ""} onChange={(e) => set("season_id", e.target.value || null)}>
              <option value="">— без сезона —</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Открытие приёма">
            <input type="datetime-local" className={inputCls} value={f.opens_at} onChange={(e) => set("opens_at", e.target.value)} />
          </Field>
          <Field label="Закрытие приёма">
            <input type="datetime-local" className={inputCls} value={f.closes_at} onChange={(e) => set("closes_at", e.target.value)} />
          </Field>
          <Field label="Дата разрешения">
            <input type="datetime-local" className={inputCls} value={f.resolves_at} onChange={(e) => set("resolves_at", e.target.value)} />
          </Field>
          <Field label="Источник истины">
            <input className={inputCls} value={f.resolution_source} onChange={(e) => set("resolution_source", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Критерии засчитывания">
              <input className={inputCls} value={f.resolution_criteria} onChange={(e) => set("resolution_criteria", e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Btn tone="primary" loading={act.loading} onClick={submit}>Создать черновик</Btn>
            <Notice error={act.error} ok={act.okMsg} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function CreateCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const act = useAction();

  async function submit() {
    if (!slug.trim() || !title.trim()) {
      act.setError("Slug и название обязательны");
      return;
    }
    const r = await act.run(() => createCategory({ slug: slug.trim(), title: title.trim() }), "Категория создана");
    if (r) {
      setSlug("");
      setTitle("");
      onCreated();
    }
  }

  return (
    <Panel
      title="Создать категорию"
      right={<Btn tone="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Свернуть" : "Развернуть"}</Btn>}
    >
      {open && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Field label="Slug"><input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="finance" /></Field>
          </div>
          <div className="flex-1">
            <Field label="Название"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Финансы" /></Field>
          </div>
          <Btn tone="primary" loading={act.loading} onClick={submit}>Создать</Btn>
          <div className="w-full"><Notice error={act.error} ok={act.okMsg} /></div>
        </div>
      )}
    </Panel>
  );
}
