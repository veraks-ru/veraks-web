"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { ShareActions } from "@/components/share/ShareActions";
import { Spinner } from "@/components/ui/Spinner";
import type { PredictionEvent } from "@/lib/types";
import { getEvent, getMyPrediction, listCategories } from "@/lib/api/endpoints";
import { toPredictionEvent } from "@/lib/api/map";

export default function SharePage() {
  const { slug: id } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<PredictionEvent | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ev, cats, mine] = await Promise.all([
          getEvent(id),
          listCategories(),
          getMyPrediction(id),
        ]);
        if (!ev || ev.status !== "resolved" || ev.outcome === null) {
          if (alive) setState("unavailable");
          return;
        }
        const catMap = new Map((cats ?? []).map((c) => [c.id, c.slug]));
        const mapped = toPredictionEvent(ev, catMap, {
          myGrade: mine?.confidence_grade ?? null,
        });
        if (alive) {
          setEvent(mapped);
          setState("ready");
        }
      } catch {
        if (alive) setState("unavailable");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href={`/events/${id}`} className="text-sm font-600 text-slate hover:text-graphite">
          ← К событию
        </Link>
        <h1 className="mt-5 font-display text-2xl font-600 sm:text-3xl">Поделиться результатом</h1>
        <p className="mt-1.5 mb-7 text-sm text-slate">
          Карточка ниже разворачивается ссылкой в соцсетях и мессенджерах. Прогнозы открыты
          всем — пусть проверят свою точность.
        </p>

        {state === "loading" && (
          <div className="flex justify-center py-16">
            <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
          </div>
        )}
        {state === "unavailable" && (
          <p className="rounded-xl border border-line bg-surface p-5 text-sm text-slate">
            Карточка доступна только для разрешённых событий.
          </p>
        )}
        {state === "ready" && event && <ShareActions event={event} />}
      </main>
    </div>
  );
}
