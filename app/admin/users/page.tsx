"use client";

import { useEffect, useState } from "react";
import { Panel, Field, Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { useAuth } from "@/components/app/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { listUsers, reinstateUser, suspendUser } from "@/lib/api/admin";
import { fmtDate } from "@/lib/format";
import type { ApiAdminUser } from "@/lib/api/dto";

const ROLE_LABEL: Record<string, string> = {
  user: "участник",
  editor: "редактор",
  arbiter: "арбитр",
  admin: "админ",
};

const STATUS_LABEL: Record<string, string> = {
  active: "активен",
  suspended: "заблокирован",
  deleted: "удалён",
};

const PAGE_SIZE = 30;

export default function AdminUsersPage() {
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
      <Panel title="Пользователи">
        <p className="text-sm text-slate">
          Модерация пользователей доступна только администратору.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-600 sm:text-3xl">Пользователи</h1>
      <UsersPanel currentUserId={me.id} />
    </div>
  );
}

function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const [items, setItems] = useState<ApiAdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string>("");
  const act = useAction();

  async function load(nextOffset: number) {
    setLoaded(false);
    const page = await act.run(() =>
      listUsers({
        status: status || undefined,
        search,
        limit: PAGE_SIZE,
        offset: nextOffset,
      }),
    );
    if (page) {
      setItems(page.items);
      setTotal(page.total);
      setOffset(nextOffset);
    }
    setLoaded(true);
  }

  useEffect(() => {
    void load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  function applySearch() {
    setSearch(searchInput.trim() || undefined);
  }

  return (
    <Panel
      title="Список"
      desc="Поиск по хэндлу/имени, фильтр по статусу; блокировка отзывает сессии пользователя"
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Field label="Поиск">
            <input
              className={inputCls}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="username или имя"
            />
          </Field>
        </div>
        <div className="w-48">
          <Field label="Статус">
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Все</option>
              <option value="active">Активен</option>
              <option value="suspended">Заблокирован</option>
              <option value="deleted">Удалён</option>
            </select>
          </Field>
        </div>
        <Btn tone="ghost" loading={act.loading} onClick={applySearch}>
          Найти
        </Btn>
        {(search || status) && (
          <Btn
            tone="ghost"
            onClick={() => {
              setSearchInput("");
              setSearch(undefined);
              setStatus("");
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
        <p className="py-6 text-center text-sm text-slate">Пользователи не найдены.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-slate uppercase">
                <th className="py-2 pr-3 font-600">Хэндл</th>
                <th className="py-2 pr-3 font-600">Имя</th>
                <th className="py-2 pr-3 font-600">Роль</th>
                <th className="py-2 pr-3 font-600">Статус</th>
                <th className="py-2 pr-3 font-600">Регистрация</th>
                <th className="py-2 font-600">Действие</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUserId}
                  onChanged={(updated) =>
                    setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                  }
                />
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between text-sm text-slate">
            <span>
              Показано {items.length} из {total}
            </span>
            <div className="flex gap-2">
              <Btn tone="ghost" disabled={offset === 0} onClick={() => load(Math.max(0, offset - PAGE_SIZE))}>
                ← Назад
              </Btn>
              <Btn
                tone="ghost"
                disabled={offset + items.length >= total}
                onClick={() => load(offset + PAGE_SIZE)}
              >
                Вперёд →
              </Btn>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function UserRow({
  user,
  isSelf,
  onChanged,
}: {
  user: ApiAdminUser;
  isSelf: boolean;
  onChanged: (u: ApiAdminUser) => void;
}) {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const act = useAction();

  const canModerate = !isSelf && user.role !== "admin";

  async function suspend() {
    const text = reason.trim();
    if (!text) {
      act.setError("Причина обязательна — она уходит в неизменяемый аудит");
      return;
    }
    const updated = await act.run(() => suspendUser(user.id, text));
    if (updated) {
      onChanged(updated);
      setConfirming(false);
      setReason("");
    }
  }

  async function reinstate() {
    const updated = await act.run(() => reinstateUser(user.id));
    if (updated) onChanged(updated);
  }

  return (
    <tr className="border-b border-line/60 align-top">
      <td className="py-2.5 pr-3 font-500">{user.username}</td>
      <td className="py-2.5 pr-3 text-slate">{user.display_name}</td>
      <td className="py-2.5 pr-3 text-slate">{ROLE_LABEL[user.role] ?? user.role}</td>
      <td className="py-2.5 pr-3 text-slate">{STATUS_LABEL[user.status] ?? user.status}</td>
      <td className="py-2.5 pr-3 whitespace-nowrap text-slate">{fmtDate(user.created_at)}</td>
      <td className="py-2.5 min-w-56">
        {user.status === "suspended" ? (
          <Btn tone="ghost" loading={act.loading} onClick={reinstate}>
            Разблокировать
          </Btn>
        ) : user.status !== "active" ? (
          <span className="text-xs text-slate/70">—</span>
        ) : !canModerate ? (
          <span className="text-xs text-slate/70">
            {isSelf ? "нельзя заблокировать себя" : "нельзя заблокировать администратора"}
          </span>
        ) : confirming ? (
          <div className="flex flex-col gap-2">
            <input
              className={inputCls}
              value={reason}
              placeholder="Причина блокировки"
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Btn tone="danger" loading={act.loading} onClick={suspend}>
                Заблокировать
              </Btn>
              <Btn tone="ghost" onClick={() => setConfirming(false)}>
                Отмена
              </Btn>
            </div>
          </div>
        ) : (
          <Btn tone="danger" onClick={() => setConfirming(true)}>
            Заблокировать
          </Btn>
        )}
        <Notice error={act.error} />
      </td>
    </tr>
  );
}
