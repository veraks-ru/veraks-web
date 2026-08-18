import { ImageResponse } from "next/og";
import { getPublicEvent } from "@/lib/api/server";
import {
  BRAND,
  clampTitle,
  eventStatusLabel,
  eventTimingLabel,
} from "@/lib/eventMeta";

// Картинка собирается на запрос (бэкенда на сборке нет), но результат живёт
// 10 минут: рендер занимает около секунды, а парсеры превью ждут неохотно —
// каждый повторный заход не должен платить ту же цену. Срок совпадает с
// cache-control ниже.
export const revalidate = 600;

export const alt = `Карточка события — ${BRAND}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Значения токенов продублированы литералами: в ImageResponse нет CSS-переменных
// и Tailwind-темы. Источник истины — app/globals.css (@theme), при правке
// палитры синхронизировать вручную.
const INK = "#0e1430"; // --color-ink
const INK_2 = "#161f45"; // --color-ink-2
const INK_3 = "#090d22"; // --color-ink-3
const HAZE = "#9aa3c0"; // --color-haze
const EDGE = "#2b3566"; // --color-edge
const SIGNAL = "#46e0c4"; // --color-signal
const COOL = "#7c8cf8"; // --color-cool — край «нет»
const WARM = "#f2a65a"; // --color-warm — край «да»

// Шрифт не подключаем: ImageResponse рендерит встроенным Noto Sans (кириллица
// есть), внешние fetch'и за шрифтами на рантайме нам не нужны.

/**
 * Прибор без показания — герой карточки.
 *
 * Пять делений = пять словесных градаций (lib/confidence.ts), спектр от
 * «нет» (cool) к «да» (warm). Стрелки НЕТ намеренно: во-первых, это и есть
 * приглашение — показание ставит читатель; во-вторых, так карточка физически
 * не может выдать сводку толпы, а значит не нарушит анти-якорение (см.
 * инвариант ниже) даже если её кто-то доработает не подумав.
 */
function Dial() {
  // Полуокружность r=190 с центром внизу: те же пропорции, что у OracleArc.
  const cx = 190;
  const cy = 205;
  const r = 145;
  const at = (t: number) => {
    const a = Math.PI * (1 - t);
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };
  const left = at(0);
  const right = at(1);
  // Цвета делений — спектр убеждения из globals.css, дискретно: градиенты в
  // satori ненадёжны, а пять точек и без них читаются как шкала.
  const ticks = [
    { t: 0, color: COOL },
    { t: 0.25, color: "#8f9ae0" },
    { t: 0.5, color: HAZE },
    { t: 0.75, color: "#d99a6c" },
    { t: 1, color: WARM },
  ];

  return (
    <svg width="380" height="235" viewBox="0 0 380 235" fill="none">
      <path
        d={`M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`}
        stroke={EDGE}
        strokeWidth="9"
        strokeLinecap="round"
      />
      {ticks.map((tick) => {
        const p = at(tick.t);
        return (
          <circle key={tick.t} cx={p.x} cy={p.y} r="10" fill={tick.color} />
        );
      })}
    </svg>
  );
}

/** Глиф логотипа — «дуга уверенности» из components/brand/Wordmark.tsx. */
function Glyph() {
  return (
    <svg width="60" height="44" viewBox="0 0 30 22" fill="none">
      <path
        d="M3 19 A12 12 0 0 1 27 19"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="21.4" cy="11.5" r="3" fill={SIGNAL} />
    </svg>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Кэш на пять минут: карточку тянут парсеры превью, для которых полторы
  // секунды рендера — повод отказаться от картинки. Статус события за это
  // время устаревает несильно, а cache-control ниже обещает те же 10 минут.
  const res = await getPublicEvent(slug, { revalidate: 300 });

  // ИНВАРИАНТ (анти-якорение): на карточке нет и не должно быть процентов,
  // сводки толпы и числа участников — только формулировка, категория,
  // статус и даты. См. комментарий в lib/eventMeta.ts.
  const title =
    res.kind === "ok" ? clampTitle(res.event.title) : "Событие на Вераксе";
  const category = res.kind === "ok" ? res.categoryTitle : null;
  const status = res.kind === "ok" ? eventStatusLabel(res.event) : null;
  const timing = res.kind === "ok" ? eventTimingLabel(res.event) : null;

  // Колонку сузил прибор справа, поэтому пороги ниже прежних: при 70px
  // заголовок из четырёх строк вытеснял подвал за край холста.
  const titleSize = title.length > 85 ? 38 : title.length > 55 ? 44 : 52;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 72px",
          color: "#ffffff",
          backgroundColor: INK,
          backgroundImage: `linear-gradient(135deg, ${INK_3} 0%, ${INK} 58%, ${INK_2} 100%)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Glyph />
          <div
            style={{
              display: "flex",
              fontSize: 30,
              letterSpacing: 9,
              color: "#ffffff",
            }}
          >
            ВЕРАКС
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 30,
              flex: 1,
            }}
          >
          {category ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "10px 24px",
                borderRadius: 999,
                border: `1px solid ${EDGE}`,
                color: HAZE,
                fontSize: 26,
              }}
            >
              {category}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              lineHeight: 1.2,
              color: "#ffffff",
            }}
          >
            {title}
          </div>
          </div>

          {/* Прибор со словами по краям: человек, впервые увидевший Веракс в
              ленте, за секунду понимает, что отвечать надо не процентами. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Dial />
            <div
              style={{
                display: "flex",
                width: 350,
                justifyContent: "space-between",
                fontSize: 20,
                color: HAZE,
              }}
            >
              <div style={{ display: "flex" }}>Точно нет</div>
              <div style={{ display: "flex" }}>Точно да</div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            paddingTop: 30,
            borderTop: `1px solid ${EDGE}`,
            fontSize: 26,
            color: HAZE,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: SIGNAL,
            }}
          />
          {status ? <div style={{ display: "flex" }}>{status}</div> : null}
          {status && timing ? (
            <div style={{ display: "flex", color: EDGE }}>/</div>
          ) : null}
          {timing ? <div style={{ display: "flex" }}>{timing}</div> : null}
          {!status && !timing ? (
            <div style={{ display: "flex" }}>Биржа репутации предсказателей</div>
          ) : null}
          </div>

          {/* Настоящей кнопки в превью ссылки не бывает — кликается вся
              карточка. Плашка называет действие теми же словами, что и экран
              события, чтобы обещание совпало с тем, что человек там увидит. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 28px",
              borderRadius: 999,
              backgroundColor: SIGNAL,
              color: INK_3,
              fontSize: 26,
            }}
          >
            <div style={{ display: "flex" }}>Сделать прогноз</div>
            <div style={{ display: "flex" }}>→</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      // По умолчанию next/og отдаёт immutable max-age=31536000 — для карточки
      // с живым статусом это ловушка: CDN год держал бы «приём открыт» на уже
      // разрешённом событии, а при недоступном бэкенде намертво закэшировал бы
      // фолбэк. 10 минут — компромисс между свежестью и нагрузкой на рендер.
      headers: { "cache-control": "public, max-age=600, s-maxage=600" },
    },
  );

  // Дочитываем картинку в память и отдаём с Content-Length.
  //
  // ImageResponse отвечает потоком, без длины. Ссылку из-за этого не
  // разворачивали ни WhatsApp, ни Telegram: их парсеры превью не берут
  // изображение, размер которого нельзя узнать заранее (проверка «не тяжелее
  // лимита» делается ДО загрузки). Внешне выглядело как «превью не работает»,
  // хотя og-теги, картинка и коды ответа были в порядке.
  //
  // Карточка весит ~110 КБ — буферизовать её безопаснее, чем экономить память
  // на стриминге и терять превью.
  const png = await image.arrayBuffer();
  return new Response(png, {
    headers: {
      "content-type": contentType,
      "content-length": String(png.byteLength),
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });
}
