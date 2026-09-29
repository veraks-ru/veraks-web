import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

// SITE_URL задаётся окружением контейнера, а не сборкой — поэтому на запрос,
// а не пререндером (иначе в файл вшился бы localhost).
export const dynamic = "force-dynamic";

/**
 * Индексируется публичное: события, лидерборды, сезоны, профили, документы.
 * Закрыто личное и служебное — кабинет, админка, вход, онбординг, а также
 * страницы-обёртки (share, offline, join), у которых нет своего содержания.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/auth/",
        "/onboarding",
        "/offline",
        "/join",
        "/events/propose",
        "/events/*/share",
      ],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.origin,
  };
}
