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

export const metadata: Metadata = {
  title: "Оракул — биржа репутации предсказателей",
  description:
    "Прогнозируйте исходы реальных событий, накапливайте измеримый публичный трек-рекорд точности и соревнуйтесь в лидербордах. Без ставок, без банка из взносов — только навык.",
  openGraph: {
    title: "Оракул — биржа репутации предсказателей",
    description:
      "Точность как публичный, накапливаемый, верифицированный актив.",
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
