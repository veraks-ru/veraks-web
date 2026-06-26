import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/app/TopNav";
import { PredictExperience } from "@/components/predict/PredictExperience";
import { ResolvedEvent } from "@/components/events/ResolvedEvent";
import { MiniConsensus } from "@/components/events/MiniConsensus";
import { CategoryChip, StatusBadge } from "@/components/ui/Badge";
import { categoryTitle, getEvent, EVENTS } from "@/lib/mock";
import type { PredictionEvent } from "@/lib/types";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  // Открытое → экран прогноза (тёмная среда).
  if (event.status === "open") return <PredictExperience event={event} />;

  // Разрешённое → полный экран результата с шерингом.
  if (event.status === "resolved" && event.outcome !== undefined) {
    return <ResolvedEvent event={event} />;
  }

  // Закрыто / идёт разрешение / оспаривание.
  return <PendingEvent event={event} />;
}

function PendingEvent({ event }: { event: PredictionEvent }) {
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href="/events" className="text-sm font-600 text-slate hover:text-graphite">
          ← Все события
        </Link>

        <div className="mt-5 flex items-center gap-2">
          <CategoryChip title={categoryTitle(event.categorySlug)} />
          <StatusBadge status={event.status} />
        </div>

        <h1 className="mt-4 font-display text-2xl leading-snug font-600 sm:text-3xl">
          {event.title}
        </h1>

        <p className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm text-slate">
          Приём прогнозов закрыт. Событие разрешается по источнику — результат появится
          здесь после проверки и окна оспаривания.
        </p>

        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <p className="mb-4 text-sm font-600">Как распределились прогнозы</p>
          <MiniConsensus crowd={event.crowd} mine={event.myGrade} labelled />
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm">
          <p className="text-xs font-600 tracking-wide text-slate uppercase">Источник истины</p>
          <p className="mt-1 leading-snug">{event.resolutionSource}</p>
          <p className="mt-3 leading-snug text-slate">{event.resolutionCriteria}</p>
        </section>
      </main>
    </div>
  );
}
