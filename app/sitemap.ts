import type { MetadataRoute } from "next";
import type { ApiEvent, ApiEventStatus, ApiSeason } from "@/lib/api/dto";
import { LEGAL_DOCS } from "@/lib/legal";
import { siteUrl } from "@/lib/siteUrl";

// Адрес сайта — из окружения контейнера, список событий — с бэкенда, которого
// на сборке может не быть. Поэтому на запрос; данные бэкенда кэшируются ниже.
export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const REVALIDATE_S = 600;
const PAGE = 200; // максимум `limit` у GET /events
const MAX_PAGES = 25;

/** Статусы, у которых есть публичная страница с содержанием. */
const LISTED: ReadonlySet<ApiEventStatus> = new Set(["open", "closed", "resolved"]);

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: REVALIDATE_S },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    return resp.ok ? ((await resp.json()) as T) : null;
  } catch {
    return null;
  }
}

async function allEvents(): Promise<ApiEvent[]> {
  const out: ApiEvent[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await fetchJson<ApiEvent[]>(
      `/events?limit=${PAGE}&offset=${page * PAGE}`,
    );
    if (!batch) break;
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

/**
 * Карта сайта для поисковиков. Недоступный бэкенд не роняет файл: статичные
 * страницы отдаются всегда, события и сезоны — сколько удалось получить.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const url = (path: string) => new URL(path, base).toString();

  const [events, seasons] = await Promise.all([
    allEvents(),
    fetchJson<{ items: ApiSeason[] }>("/seasons"),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "hourly", priority: 1 },
    { url: url("/events"), changeFrequency: "hourly", priority: 0.9 },
    { url: url("/leaderboards"), changeFrequency: "daily", priority: 0.8 },
    { url: url("/seasons"), changeFrequency: "weekly", priority: 0.6 },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/pricing"), changeFrequency: "monthly", priority: 0.6 },
    { url: url("/divisions"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/leagues"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/sponsor"), changeFrequency: "monthly", priority: 0.3 },
    { url: url("/b2b"), changeFrequency: "monthly", priority: 0.3 },
    { url: url("/legal"), changeFrequency: "monthly", priority: 0.2 },
    ...LEGAL_DOCS.map((d) => ({
      url: url(`/legal/${d.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.2,
    })),
  ];

  const eventPages: MetadataRoute.Sitemap = events
    .filter((e) => LISTED.has(e.status))
    .map((e) => ({
      url: url(`/events/${e.public_code}`),
      lastModified: e.updated_at,
      changeFrequency: e.status === "open" ? "daily" : "monthly",
      priority: e.status === "open" ? 0.8 : 0.5,
    }));

  const seasonPages: MetadataRoute.Sitemap = (seasons?.items ?? []).map((s) => ({
    url: url(`/seasons/${s.slug}`),
    changeFrequency: s.status === "active" ? "daily" : "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...eventPages, ...seasonPages];
}
