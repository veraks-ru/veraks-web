"use client";

import { useEffect, useState } from "react";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { useAuth } from "@/components/app/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { fmtDate } from "@/lib/format";
import { listAllLeagues, renameLeague, deleteLeague } from "@/lib/api/admin";
import type { ApiLeague } from "@/lib/api/dto";

const PAGE = 50;

/**
 * Модерация приватных лиг.
 *
 * Лиги создают сами пользователи, и владелец видит только свои — недопустимое
 * название иначе никак не поправить. Удаление здесь настоящее, а не мягкое:
 * лига не связана ни с прогнозами, ни с призовым зачётом, ни с деньгами.
 */
export default function AdminLeaguesPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === "admin";
  const [page, setPage] = useState<{ items: ApiLeague[]; total: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [failed, setFailed] = useState(false);
  const refresh = () => setReload((n) => n + 1);

  useEffect(() => {
    if (!isAdmin) return;
    setFailed(false);
    listAllLeagues(PAGE, offset)
      .then((r) => setPage(r ?? { items: [], total: 0 }))
      .catch(() => setFailed(true));
  }, [isAdmin, offset, reload]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Лиги</h1>
        <Panel title="Недостаточно прав">
          <p className="text-sm text-slate">Модерация лиг доступна только роли admin.</p>
        </Panel>
      </div>
    );
  }

  const total = page?.total ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-600 sm:text-3xl">Лиги</h1>

      <Panel
        title={`Приватные лиги${total ? ` · ${total}` : ""}`}
        desc="Пользовательские группы с собственным лидербордом — переименование и удаление"
      >
        {failed ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate">Не удалось загрузить список.</p>
            <Btn tone="ghost" onClick={refresh}>Повторить</Btn>
          </div>
        ) : !page ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
          </div>
        ) : page.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate">
            Лиг пока нет — их создают сами участники на странице «Лиги».
          </p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {page.items.map((l) => (
                <LeagueRow key={l.id} league={l} onChanged={refresh} />
              ))}
            </ul>
            {total > PAGE && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <Btn tone="ghost" onClick={() => setOffset((o) => Math.max(0, o - PAGE))}>
                  ← Назад
                </Btn>
                <span className="text-xs text-slate tnum">
                  {offset + 1}–{Math.min(offset + PAGE, total)} из {total}
                </span>
                <Btn
                  tone="ghost"
                  onClick={() => setOffset((o) => (o + PAGE < total ? o + PAGE : o))}
                >
                  Вперёд →
                </Btn>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

function LeagueRow({ league, onChanged }: { league: ApiLeague; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(league.name);
  const [confirming, setConfirming] = useState(false);
  const act = useAction();

  async function save() {
    if (!name.trim()) {
      act.setError("Название не может быть пустым");
      return;
    }
    const r = await act.run(() => renameLeague(league.id, name.trim()), "Переименована");
    if (r) {
      setEditing(false);
      onChanged();
    }
  }

  async function remove() {
    // deleteLeague отдаёт 204 → apiFetch возвращает null, что неотличимо от
    // undefined при ошибке. Возвращаем из колбэка явный признак успеха:
    // читать act.error сразу после await нельзя — это состояние из замыкания.
    const ok = await act.run(async () => {
      await deleteLeague(league.id);
      return true as const;
    }, "Лига удалена");
    if (ok) {
      setConfirming(false);
      onChanged();
    }
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      {editing ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Field label="Название"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          </div>
          <Btn tone="primary" loading={act.loading} onClick={save}>Сохранить</Btn>
          <Btn
            tone="ghost"
            onClick={() => {
              setName(league.name);
              setEditing(false);
              act.setError(null);
              act.setOkMsg(null);
            }}
          >
            Отмена
          </Btn>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-600">{league.name}</p>
            <p className="mt-0.5 text-xs text-slate">
              участников: <span className="tnum">{league.members ?? "—"}</span> · создана{" "}
              {fmtDate(league.created_at)} · код{" "}
              <span className="font-mono">{league.invite_code}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Btn tone="ghost" onClick={() => setEditing(true)}>Переименовать</Btn>
            {confirming ? (
              <>
                <Btn tone="danger" loading={act.loading} onClick={remove}>Удалить навсегда</Btn>
                <Btn tone="ghost" onClick={() => setConfirming(false)}>Отмена</Btn>
              </>
            ) : (
              <Btn tone="danger" onClick={() => setConfirming(true)}>Удалить</Btn>
            )}
          </div>
        </div>
      )}
      {confirming && !editing && (
        <p className="mt-2 text-xs text-slate">
          Лига и участие в ней исчезнут. Прогнозы, рейтинги и призовой зачёт не затрагиваются —
          лига только группирует лидерборд. Действие останется в аудите.
        </p>
      )}
      <Notice error={act.error} ok={act.okMsg} />
    </li>
  );
}
