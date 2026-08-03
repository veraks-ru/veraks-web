import { ImageResponse } from "next/og";
import { getPublicEvent } from "@/lib/api/server";
import {
  BRAND,
  clampTitle,
  eventStatusLabel,
  eventTimingLabel,
} from "@/lib/eventMeta";

// Картинка собирается на запрос: данные события живые, бэкенда на сборке нет.
export const dynamic = "force-dynamic";

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

// Шрифт не подключаем: ImageResponse рендерит встроенным Noto Sans (кириллица
// есть), внешние fetch'и за шрифтами на рантайме нам не нужны.

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
  const res = await getPublicEvent(slug);

  // ИНВАРИАНТ (анти-якорение): на карточке нет и не должно быть процентов,
  // сводки толпы и числа участников — только формулировка, категория,
  // статус и даты. См. комментарий в lib/eventMeta.ts.
  const title =
    res.kind === "ok" ? clampTitle(res.event.title) : "Событие на Вераксе";
  const category = res.kind === "ok" ? res.categoryTitle : null;
  const status = res.kind === "ok" ? eventStatusLabel(res.event) : null;
  const timing = res.kind === "ok" ? eventTimingLabel(res.event) : null;

  const titleSize = title.length > 90 ? 46 : title.length > 55 ? 58 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 80px",
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

        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            paddingTop: 30,
            borderTop: `1px solid ${EDGE}`,
            fontSize: 26,
            color: HAZE,
          }}
        >
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
      </div>
    ),
    size,
  );
}
