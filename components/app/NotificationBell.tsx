"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/app/AuthProvider";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/endpoints";
import type { ApiNotification } from "@/lib/api/dto";

const WS_URL = process.env.NEXT_PUBLIC_GOCTOPUS_URL;

export function NotificationBell() {
  const { me } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotification[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  // open держим в ref, чтобы сокет не пересоздавался на каждый клик по колокольчику.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refreshCount = useCallback(async () => {
    try {
      const r = await getUnreadCount();
      setUnread(r?.unread ?? 0);
    } catch {
      /* сеть недоступна — счётчик не критичен */
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      const n = await getNotifications();
      setItems(n ?? []);
    } catch {
      setItems([]); // не крутить «Загрузка…» вечно при ошибке
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    void refreshCount();
  }, [me, refreshCount]);

  // Реал-тайм пуш через goctopus. Зависит только от наличия сессии — открытие
  // выпадашки не рвёт сокет (open читаем из ref).
  useEffect(() => {
    if (!me || !WS_URL) return;
    let socket: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    const connect = () => {
      socket = new WebSocket(WS_URL);
      socket.onmessage = (e) => {
        let d: { id?: string; payload?: { title?: string } };
        try {
          d = JSON.parse(e.data);
        } catch {
          return;
        }
        if (d.id) socket?.send(JSON.stringify({ id: d.id })); // ACK
        if (!d.id || seen.current.has(d.id)) return;
        seen.current.add(d.id);
        setUnread((n) => n + 1);
        setToast(d.payload?.title ?? "Новое уведомление");
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
        if (openRef.current) void loadList();
      };
      socket.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      socket?.close();
    };
  }, [me, loadList]);

  if (!me) return null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await loadList();
  }

  async function readAll() {
    await markAllNotificationsRead();
    setUnread(0);
    loadList();
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Уведомления"
        className="relative flex size-9 items-center justify-center rounded-full border border-line text-slate hover:text-graphite"
      >
        <BellIcon className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-[color:var(--color-signal-deep)] px-1 text-[0.6rem] font-700 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {toast && (
        <div className="absolute top-11 right-0 z-40 w-64 rounded-xl border border-line bg-surface p-3 text-sm shadow-lg">
          <span className="font-600">{toast}</span>
        </div>
      )}

      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute top-11 right-0 z-40 max-h-[70vh] w-80 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-600">Уведомления</span>
              {unread > 0 && (
                <button onClick={readAll} className="text-xs font-600 text-[color:var(--color-signal-deep)] hover:underline">
                  Прочитать все
                </button>
              )}
            </div>
            {items === null ? (
              <p className="px-4 py-6 text-center text-sm text-slate">Загрузка…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate">Пока пусто.</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <NotificationRow key={n.id} n={n} onClose={() => setOpen(false)} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({ n, onClose }: { n: ApiNotification; onClose: () => void }) {
  const href =
    n.entity_type === "event" && n.entity_id ? `/events/${n.entity_id}` : null;
  const body = (
    <div className={`px-4 py-3 ${n.is_read ? "" : "bg-[color:var(--color-signal)]/[0.05]"}`}>
      <p className="text-sm font-600">{n.title}</p>
      {n.body && <p className="mt-0.5 text-sm leading-snug text-slate">{n.body}</p>}
    </div>
  );
  const onClick = () => {
    if (!n.is_read) markNotificationRead(n.id);
    onClose();
  };
  return (
    <li>
      {href ? (
        <Link href={href} onClick={onClick} className="block hover:bg-paper">
          {body}
        </Link>
      ) : (
        <button onClick={onClick} className="block w-full text-left hover:bg-paper">
          {body}
        </button>
      )}
    </li>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
