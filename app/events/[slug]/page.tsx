import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPageClient } from "@/components/events/EventPageClient";
import { getPublicEvent } from "@/lib/api/server";
import { BRAND, eventDescription } from "@/lib/eventMeta";

// Событие читается с бэкенда на каждый запрос: пререндерить нечего, а на
// сборке бэкенда может не быть вовсе.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await getPublicEvent(slug);
  if (res.kind !== "ok") return { title: `Событие — ${BRAND}` };

  const title = `${res.event.title} — ${BRAND}`;
  const description = eventDescription(res.event, res.categoryTitle);
  // openGraph.images сюда не пишем: картинку подставляет файловая конвенция
  // opengraph-image.tsx рядом (явное поле её бы перекрыло).
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/events/${slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await getPublicEvent(slug);
  // Недоступный бэкенд — не повод отдавать 404: пусть клиент покажет свой
  // экран загрузки/ошибки и попробует ещё раз.
  if (res.kind === "notfound") notFound();

  return <EventPageClient slug={slug} />;
}
