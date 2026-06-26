import type { Metadata } from "next";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/app/AuthProvider";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-unbounded",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
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
