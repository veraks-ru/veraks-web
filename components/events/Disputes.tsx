"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/app/AuthProvider";
import { Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { listDisputes } from "@/lib/api/admin";
import { raiseDispute } from "@/lib/api/endpoints";
import type { ApiDispute } from "@/lib/api/dto";
import type { PredictionEvent } from "@/lib/types";

const DISPUTE_STATUS: Record<string, string> = {
  open: "открыт",
  under_review: "на рассмотрении",
  accepted: "принят",
  rejected: "отклонён",
};

export function Disputes({ event }: { event: PredictionEvent }) {
  const { me } = useAuth();
  const [disputes, setDisputes] = useState<ApiDispute[] | null>(null);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const act = useAction();

  const load = () => listDisputes(event.id).then((d) => setDisputes(d ?? []));
  useEffect(() => {
    load();
  }, [event.id]);

  const windowOpen =
    !!event.disputeWindowEndsAt &&
    new Date(event.disputeWindowEndsAt).getTime() > Date.now();

  async function submit() {
    if (!reason.trim()) {
      act.setError("Опишите причину оспаривания");
      return;
    }
    const r = await act.run(
      () => raiseDispute(event.id, { reason: reason.trim(), evidence: evidence.trim() }),
      "Оспаривание подано — его рассмотрит арбитр",
    );
    if (r) {
      setReason("");
      setEvidence("");
      load();
    }
  }

  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-600">Оспаривание исхода</h2>
      <p className="mt-0.5 mb-4 text-sm text-slate">
        Если исход зафиксирован неверно по источнику истины — оспорьте его в окне
        оспаривания. Решение принимает арбитр.
      </p>

      {disputes && disputes.length > 0 && (
        <ul className="mb-5 space-y-2">
          {disputes.map((d) => (
            <li key={d.id} className="rounded-xl bg-paper p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-600">{d.reason}</p>
                <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-xs font-600 text-slate">
                  {DISPUTE_STATUS[d.status] ?? d.status}
                </span>
              </div>
              {d.evidence && <p className="mt-1 text-xs text-slate">{d.evidence}</p>}
              {d.decision_notes && (
                <p className="mt-1 text-xs text-slate">Решение: {d.decision_notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {!me ? (
        <p className="text-sm text-slate">
          <Link href="/join" className="font-600 text-[color:var(--color-signal-deep)] hover:underline">
            Войдите
          </Link>
          , чтобы оспорить исход (доступно участникам события).
        </p>
      ) : !windowOpen ? (
        <p className="text-sm text-slate">Окно оспаривания закрыто.</p>
      ) : (
        <div className="grid gap-3 sm:max-w-lg">
          <input
            className={inputCls}
            placeholder="Причина: почему исход неверен"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Доказательство (ссылка/пояснение) — необязательно"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
          <div>
            <Btn tone="primary" loading={act.loading} onClick={submit}>
              Оспорить исход
            </Btn>
            <Notice error={act.error} ok={act.okMsg} />
          </div>
        </div>
      )}
    </section>
  );
}
