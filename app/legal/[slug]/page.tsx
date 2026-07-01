import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { LEGAL_DOCS, parseLegal, type LegalSlug } from "@/lib/legal";

// Только известные документы; тексты читаются на этапе сборки (страницы статические).
export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

function load(slug: string) {
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  if (!doc) return null;
  const raw = fs.readFileSync(
    path.join(process.cwd(), "content", "legal", `${slug}.txt`),
    "utf8",
  );
  return { doc, ...parseLegal(raw) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  return { title: doc ? `${doc.title} — Веракс` : "Документ — Веракс" };
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = load(slug);
  if (!data) notFound();
  const { doc, title, blocks } = data;
  const others = LEGAL_DOCS.filter((d) => d.slug !== (slug as LegalSlug));

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark tone="light" />
          <Link href="/legal" className="text-sm font-600 text-slate hover:text-graphite">
            ← Правовая информация
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-2xl leading-snug font-700 sm:text-3xl">{title}</h1>

        <article className="mt-8 space-y-4">
          {blocks.map((b, i) => {
            if (b.t === "meta")
              return (
                <p key={i} className="text-sm text-slate">
                  {b.text}
                </p>
              );
            if (b.t === "h")
              return (
                <h2 key={i} className="pt-4 font-display text-lg font-600">
                  {b.text}
                </h2>
              );
            return (
              <p key={i} className="text-[0.95rem] leading-relaxed text-graphite/90">
                {b.text}
              </p>
            );
          })}
        </article>

        <nav className="mt-12 border-t border-line pt-6">
          <p className="mb-3 text-xs font-600 tracking-wide text-slate uppercase">
            Другие документы
          </p>
          <ul className="space-y-2">
            {others.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/legal/${d.slug}`}
                  className="text-sm font-600 text-[color:var(--color-signal-deep)] hover:underline"
                >
                  {d.title} →
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
