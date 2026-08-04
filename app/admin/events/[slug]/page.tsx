"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/components/app/AuthProvider";
import { fmtDate } from "@/lib/format";
import { getEvent, getResolution } from "@/lib/api/endpoints";
import {
  publishEvent, closeEvent, cancelEvent, annulEvent, updateEvent,
  fixResolution, listDisputes, decideDispute,
  scoreEvent, recomputeRatings,
} from "@/lib/api/admin";
import type { ApiDispute, ApiEvent, ApiResolution } from "@/lib/api/dto";

const STATUS_LABEL: Record<string, string> = {
  proposed: "На модерации",
  draft: "Черновик", open: "Открыто", closed: "Приём закрыт",
  resolving: "Разрешается", resolved: "Разрешено", disputed: "Оспорено",
  cancelled: "Отменено", annulled: "Аннулировано",
};

const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open: "открыт", under_review: "на рассмотрении",
  accepted: "принят", rejected: "отклонён",
  voided: "снят (событие аннулировано)",
};

/** Статусы, из которых событие можно аннулировать (исход уже зафиксирован). */
const ANNULLABLE = ["resolved", "disputed"];

export default function ManageEventPage() {
  const { slug: id } = useParams<{ slug: string }>();
  const [ev, setEv] = useState<ApiEvent | null>(null);
  const [res, setRes] = useState<ApiResolution | null>(null);
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const e = await getEvent(id);
      const [r, d] = await Promise.all([getResolution(id), listDisputes(id)]);
      if (alive) {
        setEv(e);
        setRes(r);
        setDisputes(d ?? []);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, reload]);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner className="size-8 text-[color:var(--color-signal-deep)]" /></div>;
  }
  if (!ev) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-xl font-600">Событие не найдено</p>
        <Link href="/admin/events" className="mt-3 inline-block text-sm font-600 text-[color:var(--color-signal-deep)]">← К списку</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/events" className="text-sm font-600 text-slate hover:text-graphite">← Все события</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-graphite px-3 py-1 text-xs font-700 text-white">{STATUS_LABEL[ev.status] ?? ev.status}</span>
          <Link href={`/events/${ev.id}`} className="text-sm font-600 text-[color:var(--color-signal-deep)] hover:underline">Открыть публичную страницу →</Link>
        </div>
        <h1 className="mt-3 font-display text-2xl font-600">{ev.title}</h1>
        <p className="mt-1 text-sm text-slate">
          Приём до {fmtDate(ev.closes_at)} · разрешение {fmtDate(ev.resolves_at)}
          {ev.outcome != null && <> · исход <b>{ev.outcome ? "ДА" : "НЕТ"}</b></>}
        </p>
      </div>

      <Lifecycle ev={ev} onDone={refresh} />
      <ResolutionPanel ev={ev} res={res} onDone={refresh} />
      <AnnulPanel ev={ev} onDone={refresh} />
      <ScoringPanel ev={ev} />
      <DisputesPanel disputes={disputes} onDone={refresh} />
      <EditPanel ev={ev} onDone={refresh} />
    </div>
  );
}

function Lifecycle({ ev, onDone }: { ev: ApiEvent; onDone: () => void }) {
  const act = useAction();
  // Спиннер только у нажатой кнопки, а не у всех сразу.
  const [busy, setBusy] = useState<string | null>(null);
  const run = (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    return act
      .run(fn, msg)
      .then((r) => { if (r !== undefined) onDone(); })
      .finally(() => setBusy(null));
  };
  return (
    <Panel title="Жизненный цикл" desc="Перевод статуса события">
      <div className="flex flex-wrap gap-2">
        <Btn tone="primary" disabled={ev.status !== "draft"} loading={busy === "publish"} onClick={() => run("publish", () => publishEvent(ev.id), "Опубликовано")}>
          Опубликовать
        </Btn>
        <Btn disabled={ev.status !== "open"} loading={busy === "close"} onClick={() => run("close", () => closeEvent(ev.id), "Приём закрыт")}>
          Закрыть приём
        </Btn>
        <Btn tone="danger" disabled={["resolved", "disputed", "cancelled", "annulled"].includes(ev.status)} loading={busy === "cancel"} onClick={() => run("cancel", () => cancelEvent(ev.id), "Событие отменено")}>
          Отменить
        </Btn>
      </div>
      <Notice error={act.error} ok={act.okMsg} />
    </Panel>
  );
}

function ResolutionPanel({ ev, res, onDone }: { ev: ApiEvent; res: ApiResolution | null; onDone: () => void }) {
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [src, setSrc] = useState("https://example.org/доказательство");
  const [notes, setNotes] = useState("");
  const act = useAction();
  const canResolve = ["closed", "resolving", "resolved", "disputed"].includes(ev.status);

  async function submit() {
    if (!src.trim()) { act.setError("Укажите ссылку-доказательство"); return; }
    const r = await act.run(
      () => fixResolution(ev.id, { outcome: outcome === "yes", source_reference: src.trim(), notes }),
      "Исход зафиксирован",
    );
    if (r) onDone();
  }

  return (
    <Panel title="Разрешение" desc="Зафиксируйте исход по источнику истины">
      {res && (
        <p className="mb-3 rounded-lg bg-paper px-3 py-2 text-sm">
          Текущий исход: <b>{res.outcome ? "ДА" : "НЕТ"}</b> ({res.status}) · {res.source_reference}
        </p>
      )}
      {!canResolve ? (
        <p className="text-sm text-slate">Разрешать можно после закрытия приёма (статус closed/resolving).</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Исход">
            <div className="flex gap-2">
              <Btn tone={outcome === "yes" ? "primary" : "ghost"} onClick={() => setOutcome("yes")}>ДА</Btn>
              <Btn tone={outcome === "no" ? "primary" : "ghost"} onClick={() => setOutcome("no")}>НЕТ</Btn>
            </div>
          </Field>
          <Field label="Ссылка на доказательство">
            <input className={inputCls} value={src} onChange={(e) => setSrc(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Примечание (опционально)"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Btn tone="primary" loading={act.loading} onClick={submit}>{res ? "Пересмотреть исход" : "Зафиксировать исход"}</Btn>
            <Notice error={act.error} ok={act.okMsg} />
          </div>
        </div>
      )}
    </Panel>
  );
}

/**
 * Аннулирование события после подведения исхода (ст. 1058 ГК РФ, PRD §7.5).
 *
 * Не путать с «Отменить» в жизненном цикле: там событие снимается ДО исхода.
 * Здесь исход уже зафиксирован, и аннулирование вычёркивает событие из
 * рейтингов всех участников — поэтому доступно только арбитру и админу,
 * требует причины (уходит в аудит) и явного подтверждения.
 */
function AnnulPanel({ ev, onDone }: { ev: ApiEvent; onDone: () => void }) {
  const { me } = useAuth();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const act = useAction();

  const allowed = me?.role === "arbiter" || me?.role === "admin";
  const annullable = ANNULLABLE.includes(ev.status);

  async function submit() {
    const text = reason.trim();
    if (!text) {
      act.setError("Причина обязательна — она уходит в неизменяемый аудит");
      return;
    }
    const r = await act.run(() => annulEvent(ev.id, text), "Событие аннулировано");
    if (r) {
      setConfirming(false);
      setReason("");
      onDone();
    }
  }

  return (
    <Panel
      title="Аннулирование"
      desc="Событие исключается из всех рейтингов и калибровки"
    >
      {ev.status === "annulled" ? (
        <p className="text-sm text-slate">
          Событие аннулировано. Прогнозы по нему не участвуют в рейтингах;
          причина зафиксирована в аудите.
        </p>
      ) : !allowed ? (
        <p className="text-sm text-slate">
          Аннулировать событие вправе только арбитр или администратор.
        </p>
      ) : !annullable ? (
        <p className="text-sm text-slate">
          Доступно только после фиксации исхода (статус resolved/disputed). Событие
          без исхода снимается кнопкой «Отменить» в жизненном цикле.
        </p>
      ) : (
        <div className="grid gap-4">
          <Field
            label="Причина"
            hint="Двусмысленная формулировка, ошибка источника, неразрешимый спор. Публично не показывается."
          >
            <input
              className={inputCls}
              value={reason}
              placeholder="Например: источник опроверг собственную публикацию"
              onChange={(e) => {
                setReason(e.target.value);
                setConfirming(false);
              }}
            />
          </Field>
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate">
                Аннулировать событие? Прогнозы всех участников по нему перестанут
                учитываться, действие необратимо.
              </p>
              <Btn tone="danger" loading={act.loading} onClick={submit}>
                Да, аннулировать
              </Btn>
              <Btn tone="ghost" onClick={() => setConfirming(false)}>
                Отмена
              </Btn>
            </div>
          ) : (
            <div>
              <Btn tone="danger" onClick={() => setConfirming(true)}>
                Аннулировать
              </Btn>
            </div>
          )}
        </div>
      )}
      <Notice error={act.error} ok={act.okMsg} />
    </Panel>
  );
}

function ScoringPanel({ ev }: { ev: ApiEvent }) {
  const act = useAction();
  const [info, setInfo] = useState<string | null>(null);
  async function run() {
    setInfo(null);
    const scored = await act.run(async () => {
      const s = await scoreEvent(ev.id);
      await recomputeRatings();
      return s;
    }, "Готово");
    if (scored) setInfo(`Оценено прогнозов: ${scored.scored}. Рейтинги пересчитаны.`);
  }
  return (
    <Panel title="Скоринг" desc="Считает Brier по прогнозам и пересчитывает рейтинги">
      <Btn tone="primary" disabled={ev.status !== "resolved"} loading={act.loading} onClick={run}>
        Посчитать Brier + рейтинги
      </Btn>
      {ev.status !== "resolved" && <p className="mt-2 text-xs text-slate">Доступно после фиксации исхода.</p>}
      <Notice error={act.error} ok={info ?? act.okMsg} />
    </Panel>
  );
}

function DisputesPanel({ disputes, onDone }: { disputes: ApiDispute[]; onDone: () => void }) {
  return (
    <Panel title="Оспаривания" desc="Решения арбитра по спорам">
      {disputes.length === 0 ? (
        <p className="text-sm text-slate">Споров нет.</p>
      ) : (
        <ul className="space-y-3">
          {disputes.map((d) => <DisputeRow key={d.id} d={d} onDone={onDone} />)}
        </ul>
      )}
    </Panel>
  );
}

function DisputeRow({ d, onDone }: { d: ApiDispute; onDone: () => void }) {
  const [newOutcome, setNewOutcome] = useState<"yes" | "no">("yes");
  const [notes, setNotes] = useState("");
  const act = useAction();
  const pending = d.status === "open" || d.status === "under_review";

  const decide = async (accept: boolean) => {
    const r = await act.run(
      () => decideDispute(d.id, { accept, decision_notes: notes, new_outcome: accept ? newOutcome === "yes" : null }),
      accept ? "Спор принят (исход пересмотрен)" : "Спор отклонён",
    );
    if (r) onDone();
  };

  return (
    <li className="rounded-xl border border-line p-3.5">
      <p className="text-sm"><b>{d.reason}</b></p>
      {d.evidence && <p className="mt-0.5 text-xs text-slate">{d.evidence}</p>}
      <p className="mt-1 text-xs text-slate">статус: {DISPUTE_STATUS_LABEL[d.status] ?? d.status}</p>
      {pending && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Новый исход (если принять)">
            <div className="flex gap-2">
              <Btn tone={newOutcome === "yes" ? "primary" : "ghost"} onClick={() => setNewOutcome("yes")}>ДА</Btn>
              <Btn tone={newOutcome === "no" ? "primary" : "ghost"} onClick={() => setNewOutcome("no")}>НЕТ</Btn>
            </div>
          </Field>
          <input className={`${inputCls} max-w-xs`} placeholder="Обоснование" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Btn tone="primary" loading={act.loading} onClick={() => decide(true)}>Принять</Btn>
          <Btn tone="danger" loading={act.loading} onClick={() => decide(false)}>Отклонить</Btn>
        </div>
      )}
      <Notice error={act.error} ok={act.okMsg} />
    </li>
  );
}

function EditPanel({ ev, onDone }: { ev: ApiEvent; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(ev.title);
  const [src, setSrc] = useState(ev.resolution_source);
  const [crit, setCrit] = useState(ev.resolution_criteria);
  const act = useAction();

  async function submit() {
    const r = await act.run(
      () => updateEvent(ev.id, { title: title.trim(), resolution_source: src.trim(), resolution_criteria: crit.trim() }),
      "Сохранено",
    );
    if (r) onDone();
  }

  return (
    <Panel title="Редактировать" right={<Btn tone="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Свернуть" : "Развернуть"}</Btn>}>
      {open && (
        <div className="grid gap-4">
          <Field label="Заголовок"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Источник истины"><input className={inputCls} value={src} onChange={(e) => setSrc(e.target.value)} /></Field>
          <Field label="Критерии"><input className={inputCls} value={crit} onChange={(e) => setCrit(e.target.value)} /></Field>
          <div><Btn tone="primary" loading={act.loading} onClick={submit}>Сохранить</Btn><Notice error={act.error} ok={act.okMsg} /></div>
        </div>
      )}
    </Panel>
  );
}
