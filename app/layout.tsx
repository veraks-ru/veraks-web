import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/app/AuthProvider";

// Самохостинг шрифтов (variable TTF, латиница + кириллица): сборка не ходит в
// сеть за Google Fonts — образ собирается оффлайн (важно для CI/k8s).
const unbounded = localFont({
  src: "./fonts/unbounded.ttf",
  weight: "500 700",
  variable: "--font-unbounded",
  display: "swap",
});

const manrope = localFont({
  src: "./fonts/manrope.ttf",
  weight: "400 700",
  variable: "--font-manrope",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/jetbrains-mono.ttf",
  weight: "400 600",
  variable: "--font-jb",
  display: "swap",
});

const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * Публичный адрес фронта — база для абсолютных URL в OG/Twitter (без неё
 * ссылки на OG-картинки уезжают на localhost).
 *
 * SITE_URL намеренно БЕЗ префикса NEXT_PUBLIC_: metadataBase читается только
 * на сервере, поэтому переменная не вшивается в бандл на сборке, а задаётся
 * окружением контейнера — адрес меняется без пересборки образа (см.
 * infra/helm/veraks/templates/frontend.yaml). Оговорка: у статически
 * пререндеренных страниц метаданные фиксируются на сборке; страница события
 * force-dynamic, её метаданные считаются на запрос и читают свежий SITE_URL.
 *
 * Кривое значение не должно ронять весь сайт: модуль корневого layout
 * выполняется для каждой страницы, а исключение из new URL() на его уровне —
 * это белый экран везде. Поэтому фолбэк + предупреждение в лог.
 */
function siteUrl(): URL {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return new URL(DEFAULT_SITE_URL);
  try {
    return new URL(raw);
  } catch {
    console.warn(
      `[metadata] SITE_URL=${JSON.stringify(raw)} — невалидный URL, ` +
        `metadataBase откатывается на ${DEFAULT_SITE_URL}`,
    );
    return new URL(DEFAULT_SITE_URL);
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "Веракс — биржа репутации предсказателей",
  description:
    "Прогнозируйте исходы реальных событий, накапливайте измеримый публичный трек-рекорд точности и соревнуйтесь в лидербордах.",
  openGraph: {
    title: "Веракс — биржа репутации предсказателей",
    description: "Точность как публичный, накапливаемый трек-рекорд.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${unbounded.variable} ${manrope.variable} ${jetbrains.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
