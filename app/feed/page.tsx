"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/components/app/AuthProvider";
import { getFeed } from "@/lib/api/endpoints";
import type { ApiFeedItem } from "@/lib/api/dto";
import { fmtBrier, fmtDate } from "@/lib/format";

export default function FeedPage() {
  const { me, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ApiFeedItem[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!me) {
      setItems([]);
      return;
    }
    getFeed()
      .then((f) => setItems(f ?? []))
      .catch(() => setItems([]));
  }, [me, authLoading]);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/feed" />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Лента</h1>
        <p className="mt-1 text-sm text-slate">
          Активность предсказателей, которых вы читаете.
        </p>

        {authLoading || items === null ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
          </div>
        ) : !me ? (
          <p className="mt-8 text-sm text-slate">
            <Link href="/join" className="font-600 text-[color:var(--color-signal-deep)]">
              Войдите
            </Link>
            , чтобы видеть персональную ленту.
          </p>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm text-slate">
            Пока пусто. Найдите сильных предсказателей в{" "}
            <Link href="/leaderboards" className="font-600 text-[color:var(--color-signal-deep)]">
              лидербордах
            </Link>{" "}
            и подпишитесь — их активность появится здесь.
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((it, i) => (
              <FeedRow key={`${it.kind}-${it.event_id}-${it.actor_id}-${i}`} item={it} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function FeedRow({ item }: { item: ApiFeedItem }) {
  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <Link
          href={`/u/${item.actor_username}`}
          className="text-sm font-700 hover:text-[color:var(--color-signal-deep)]"
        >
          {item.actor_display_name}
        </Link>
        <span className="text-xs text-slate">{fmtDate(item.occurred_at)}</span>
      </div>

      {item.kind === "comment" ? (
        <p className="mt-1 text-sm text-graphite">
          прокомментировал(а){" "}
          <EventLink item={item} />
          {item.body ? <>: «{item.body}»</> : null}
        </p>
      ) : (
        <p className="mt-1 text-sm text-graphite">
          прогноз по <EventLink item={item} /> засчитан ·{" "}
          <span className="tnum">Brier {item.brier != null ? fmtBrier(item.brier) : "—"}</span>
          {item.outcome != null && (
            <span className="text-slate"> · исход {item.outcome ? "ДА" : "НЕТ"}</span>
          )}
        </p>
      )}
    </li>
  );
}

function EventLink({ item }: { item: ApiFeedItem }) {
  return (
    <Link
      href={`/events/${item.event_id}`}
      className="font-600 text-[color:var(--color-signal-deep)] hover:underline"
    >
      «{item.event_title}»
    </Link>
  );
}
