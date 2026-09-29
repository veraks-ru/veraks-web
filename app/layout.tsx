import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/app/AuthProvider";
import { InviteRedeemer } from "@/components/app/InviteRedeemer";
import { AppChrome } from "@/components/app/AppChrome";
import { AppleSplashLinks } from "@/components/app/AppleSplashLinks";
import { YandexMetrika } from "@/components/app/YandexMetrika";
import { siteUrl } from "@/lib/siteUrl";

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
  metadataBase: siteUrl(),
  title: "Веракс — биржа репутации предсказателей",
  description:
    "Прогнозируйте исходы реальных событий, накапливайте измеримый публичный трек-рекорд точности и соревнуйтесь в лидербордах.",
  applicationName: "Веракс",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Веракс",
    // Прозрачная строка состояния: контент уходит под неё, а фон даёт сама
    // страница — тёмный на онбординге, светлый в ленте.
    statusBarStyle: "black-translucent",
  },
  // Телефоны в текстах событий — это данные, а не кнопки «позвонить».
  formatDetection: { telephone: false },
  other: {
    // Next 15 отдаёт только стандартизованное `mobile-web-app-capable`, но
    // Safari до iOS 17.4 понимает исключительно apple-префикс — без него
    // ярлык с домашнего экрана откроется в браузере с адресной строкой.
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Веракс — биржа репутации предсказателей",
    description: "Точность как публичный, накапливаемый трек-рекорд.",
    type: "website",
  },
};

/**
 * ``viewportFit: "cover"`` обязателен, иначе ``env(safe-area-inset-*)`` всегда
 * ноль и нижняя навигация налезает на индикатор «домой» у iPhone.
 *
 * Масштабирование НЕ запрещаем: `maximum-scale=1` ломает доступность для тех,
 * кто увеличивает текст. Зум при фокусе в поле лечится размером шрифта (16px),
 * а не запретом — см. globals.css.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1430" },
  ],
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
      <AppleSplashLinks />
      <body>
        <AuthProvider>
          <InviteRedeemer />
          <AppChrome>{children}</AppChrome>
        </AuthProvider>
        <YandexMetrika />
      </body>
    </html>
  );
}
