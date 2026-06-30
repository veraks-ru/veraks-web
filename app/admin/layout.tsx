"use client";

import Link from "next/link";
import { useAuth } from "@/components/app/AuthProvider";
import { AdminNav } from "@/components/admin/AdminNav";
import { Spinner } from "@/components/ui/Spinner";

const ADMIN_ROLES = ["editor", "arbiter", "admin"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
      </div>
    );
  }

  if (!me || !ADMIN_ROLES.includes(me.role)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-5">
        <div className="max-w-sm rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
          <h1 className="font-display text-xl font-600">Нужны права</h1>
          <p className="mt-2 text-sm text-slate">
            Управление доступно ролям editor / arbiter / admin. Войдите под админ-аккаунтом
            (в демо — <span className="font-600">kalibr</span> или{" "}
            <span className="font-600">mediana</span>).
          </p>
          {!me ? (
            <Link
              href="/join"
              className="mt-5 inline-block rounded-full bg-signal px-4 py-2 text-sm font-700 text-ink-3"
            >
              Войти
            </Link>
          ) : (
            <Link
              href="/events"
              className="mt-5 inline-block rounded-full border border-line px-4 py-2 text-sm font-600"
            >
              ← В приложение
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <AdminNav role={me.role} username={me.username} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
