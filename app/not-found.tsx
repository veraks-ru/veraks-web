import Link from "next/link";

// Корневая страница 404 App Router (в т.ч. для notFound() из сегментов).
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-5 text-center">
      <div className="max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-8">
        <p className="font-mono text-sm text-slate">404</p>
        <h1 className="mt-1 font-display text-2xl font-700">Страница не найдена</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Такой страницы нет или она была перемещена.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-graphite px-4 py-2 text-sm font-600 text-white hover:bg-black"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
