"use client";

import { useEffect, useState } from "react";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { useAuth } from "@/components/app/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { listAuditLog, verifyAuditLog } from "@/lib/api/admin";
import type { ApiAuditLogEntry, ApiChainVerification } from "@/lib/api/dto";

const ACTOR_TYPE_LABEL: Record<string, string> = {
  user: "участник",
  editor: "редактор",
  arbiter: "арбитр",
  admin: "админ",
  system: "система",
};

const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const PAGE_SIZE = 30;

export default function AdminAuditPage() {
  const { me, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
      </div>
    );
  }

  if (me?.role !== "admin") {
    return (
      <Panel title="Аудит">
        <p className="text-sm text-slate">
          Журнал аудита содержит действия всех ролей и доступен только администратору.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-600 sm:text-3xl">Аудит</h1>
      <VerifyChainPanel />
      <AuditLogPanel />
    </div>
  );
}

function VerifyChainPanel() {
  const act = useAction();
  const [result, setResult] = useState<ApiChainVerification | null>(null);

  return (
    <Panel
      title="Целостность цепочки"
      desc="Пересчитывает хеш каждой записи журнала и сверяет со следующей"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Btn
          tone="primary"
          loading={act.loading}
          onClick={async () => {
            const r = await act.run(() => verifyAuditLog());
            if (r) setResult(r);
          }}
        >
          Проверить целостность цепочки
        </Btn>
        {result && (
          <span className="text-sm text-slate">
            Проверено записей: {result.checked}
          </span>
        )}
      </div>
      <Notice error={act.error} />
      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            result.ok
              ? "bg-paper text-slate"
              : "bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]"
          }`}
        >
          {result.ok
            ? "Цепочка цела — расхождений не найдено."
            : `Расхождение обнаружено: первая испорченная запись #${result.first_broken_id}. Требуется расследование.`}
        </p>
      )}
    </Panel>
  );
}

function AuditLogPanel() {
  const [items, setItems] = useState<ApiAuditLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [actionFilter, setActionFilter] = useState("");
  const [appliedAction, setAppliedAction] = useState<string | undefined>(undefined);
  const act = useAction();

  async function loadFirstPage(action?: string) {
    setLoaded(false);
    const page = await act.run(() => listAuditLog({ action, limit: PAGE_SIZE }));
    setItems(page?.items ?? []);
    setHasMore(page?.has_more ?? false);
    setLoaded(true);
  }

  async function loadMore() {
    const lastId = items[items.length - 1]?.id;
    const page = await act.run(() =>
      listAuditLog({ action: appliedAction, beforeId: lastId, limit: PAGE_SIZE }),
    );
    if (page) {
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.has_more);
    }
  }

  // Первая загрузка страницы.
  useEffect(() => {
    void loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Panel title="Журнал" desc="Записи неизменяемого журнала — новые сначала">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Field label="Фильтр по действию" hint="например, identity.login">
            <input
              className={inputCls}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="season.finalized"
            />
          </Field>
        </div>
        <Btn
          tone="ghost"
          loading={act.loading}
          onClick={() => {
            const action = actionFilter.trim() || undefined;
            setAppliedAction(action);
            void loadFirstPage(action);
          }}
        >
          Применить
        </Btn>
        {appliedAction && (
          <Btn
            tone="ghost"
            onClick={() => {
              setActionFilter("");
              setAppliedAction(undefined);
              void loadFirstPage(undefined);
            }}
          >
            Сбросить
          </Btn>
        )}
      </div>
      <Notice error={act.error} />

      {!loaded ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate">Записей не найдено.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-slate uppercase">
                <th className="py-2 pr-3 font-600">Время</th>
                <th className="py-2 pr-3 font-600">Действие</th>
                <th className="py-2 pr-3 font-600">Актор</th>
                <th className="py-2 pr-3 font-600">Entity</th>
                <th className="py-2 font-600">Payload</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id} className="border-b border-line/60 align-top">
                  <td className="py-2.5 pr-3 whitespace-nowrap text-slate">
                    {fmtDateTime(entry.occurred_at)}
                  </td>
                  <td className="py-2.5 pr-3 font-500">{entry.action}</td>
                  <td className="py-2.5 pr-3 text-slate">
                    {ACTOR_TYPE_LABEL[entry.actor_type] ?? entry.actor_type}
                    {entry.actor_id && (
                      <span className="block text-xs text-slate/70">
                        {entry.actor_id.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-slate">
                    {entry.entity_type}
                    {entry.entity_id && (
                      <span className="block text-xs text-slate/70">
                        {entry.entity_id.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <details>
                      <summary className="cursor-pointer text-xs font-600 text-[color:var(--color-signal-deep)]">
                        показать
                      </summary>
                      <pre className="mt-2 max-w-md overflow-x-auto rounded-lg bg-paper p-2 text-xs text-slate">
                        {JSON.stringify(
                          { before: entry.before, after: entry.after, metadata: entry.metadata },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Btn tone="ghost" loading={act.loading} onClick={loadMore}>
                Показать ещё
              </Btn>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
