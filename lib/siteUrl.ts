// Публичный адрес фронта — общий для metadata, robots и sitemap.

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
export function siteUrl(): URL {
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
