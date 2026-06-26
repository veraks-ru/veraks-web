import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/app/TopNav";
import { ShareActions } from "@/components/share/ShareActions";
import { getEvent, EVENTS } from "@/lib/mock";

export function generateStaticParams() {
  return EVENTS.filter((e) => e.status === "resolved").map((e) => ({ slug: e.slug }));
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event || event.status !== "resolved" || event.outcome === undefined) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/events" />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href={`/events/${slug}`} className="text-sm font-600 text-slate hover:text-graphite">
          ← К событию
        </Link>
        <h1 className="mt-5 font-display text-2xl font-600 sm:text-3xl">Поделиться результатом</h1>
        <p className="mt-1.5 mb-7 text-sm text-slate">
          Карточка ниже разворачивается ссылкой в соцсетях и мессенджерах. Прогнозы открыты
          всем — пусть проверят свою точность.
        </p>
        <ShareActions event={event} />
      </main>
    </div>
  );
}
