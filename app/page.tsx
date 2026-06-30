import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { OracleArc } from "@/components/brand/OracleArc";
import { ButtonLink } from "@/components/ui/Button";
import { GRADES } from "@/lib/confidence";
import { TARIFFS, fmtRub } from "@/lib/pricing";

export default function HomePage() {
  return (
    <main className="bg-oracle min-h-dvh text-white">
      <div className="grain">
        <SiteNav />
        <Hero />
        <Plans />
        <Loop />
        <SiteFooter />
      </div>
    </main>
  );
}

function SiteNav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Wordmark tone="dark" />
      <nav className="flex items-center gap-2 sm:gap-3">
        <ButtonLink href="/events" variant="ghost-dark" size="md" className="hidden sm:inline-flex">
          Смотреть события
        </ButtonLink>
        <ButtonLink href="/pricing" variant="ghost-dark" size="md" className="hidden sm:inline-flex">
          Тарифы
        </ButtonLink>
        <ButtonLink href="/join" variant="signal" size="md">
          Войти
        </ButtonLink>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16 lg:pb-24">
      <div>
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-edge)] px-3.5 py-1.5 text-xs font-500 tracking-wide text-haze">
          <span className="size-1.5 rounded-full bg-signal animate-pulse-soft" />
          Биржа репутации предсказателей
        </p>

        <h1 className="font-display text-[2.6rem] leading-[1.04] font-600 tracking-tight text-balance sm:text-6xl">
          Слова стоят дёшево.
          <br />
          <span className="text-signal">Точность</span> — нет.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-haze text-pretty">
          Прогнозируйте исходы реальных событий — словами, а не процентами. Каждое
          предсказание фиксируется, разрешается по источнику и оценивается. Ваша точность
          становится публичным, накапливаемым трек-рекордом.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/events" variant="signal" size="lg">
            Смотреть события
          </ButtonLink>
          <ButtonLink href="/pricing" variant="ghost-dark" size="lg">
            Тарифы для голосования
          </ButtonLink>
        </div>

        <p className="mt-5 text-sm text-haze-dim">
          Смотреть консенсус и трек-рекорды — бесплатно. Чтобы голосовать самому, нужна
          подписка от 99 ₽.{" "}
          <Link href="/pricing" className="text-signal underline-offset-2 hover:underline">
            Тарифы →
          </Link>
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <div className="animate-drift rounded-[2rem] border border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)]/60 p-7 backdrop-blur-sm sm:p-9">
          <p className="mb-1 text-sm text-haze-dim">Сбудется ли это?</p>
          <p className="mb-7 font-display text-lg leading-snug font-500">
            Ключевая ставка ЦБ будет снижена на ближайшем заседании
          </p>
          <OracleArc activeIndex={3} animated className="w-full" />
          <div className="mt-3 flex justify-between text-[0.7rem] font-500 tracking-wide text-haze-dim">
            {GRADES.map((g) => (
              <span key={g.grade} className="w-12 text-center leading-tight">
                {g.short}
              </span>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-haze">
            Ваше показание: <span className="font-600 text-warm">Скорее да</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function Plans() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl leading-snug font-600 sm:text-3xl">
            Смотреть — бесплатно. Голосовать — по подписке.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-haze">
            Лента, консенсус толпы и публичные трек-рекорды открыты всем. Чтобы делать
            собственные прогнозы и расти в рейтинге, нужна активная подписка.
          </p>
        </div>
        <Link href="/pricing" className="text-sm font-700 text-signal underline-offset-2 hover:underline">
          Все тарифы →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TARIFFS.map((t) => (
          <div
            key={t.plan}
            className={`rounded-[var(--radius-card)] border p-5 ${
              t.popular
                ? "border-[color:var(--color-signal)]/40 bg-[color:var(--color-signal)]/[0.06]"
                : "border-[color:var(--color-edge)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-600">{t.title}</p>
              {t.popular && (
                <span className="rounded-full bg-signal px-2 py-0.5 text-[0.6rem] font-700 tracking-wide text-ink-3 uppercase">
                  Хит
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-haze-dim">{t.period}</p>
            <p className="mt-4 font-display text-2xl font-700">
              {fmtRub(t.priceRub)}
            </p>
            <p className="mt-3 text-sm leading-snug text-haze">{t.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Loop() {
  const steps = [
    {
      k: "Прогноз",
      t: "Скажите словами",
      d: "Выберите одну из пяти градаций уверенности — от «Точно нет» до «Точно да». Никаких процентов вручную.",
    },
    {
      k: "Фиксация",
      t: "Приём закрывается",
      d: "После дедлайна прогноз заморожен по серверному времени. Поздних правок не бывает — это и есть честность.",
    },
    {
      k: "Разрешение",
      t: "Сверка с источником",
      d: "Событие разрешается по заранее заданному официальному источнику. Спорное — через арбитра, неоднозначное — аннулируется.",
    },
    {
      k: "Репутация",
      t: "Растёт трек-рекорд",
      d: "Считается Brier score, обновляются профиль, калибровка и место в лидерборде. Чем точнее — тем выше.",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <h2 className="mb-10 max-w-2xl font-display text-2xl leading-snug font-600 sm:text-3xl">
        Цикл, в котором за слова отвечают
      </h2>
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.k} className="relative">
            <span className="font-mono text-sm text-signal/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mt-2 block text-xs font-600 tracking-[0.18em] text-haze-dim uppercase">
              {s.k}
            </span>
            <h3 className="mt-2 font-display text-lg font-500">{s.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-haze">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--color-edge)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Wordmark tone="dark" />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-haze">
          <Link href="/events" className="hover:text-white">События</Link>
          <Link href="/leaderboards" className="hover:text-white">Лидерборды</Link>
          <Link href="/pricing" className="hover:text-white">Тарифы</Link>
          <Link href="/legal" className="hover:text-white">Правовая информация</Link>
        </nav>
      </div>
    </footer>
  );
}
