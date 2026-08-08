/**
 * Генерация иконок приложения из «дуги уверенности» — сигнатуры продукта.
 *
 * Иконка = глиф Wordmark в квадрате: спектр убеждения от cool (нет) к warm
 * (да), деления по 5 градациям и одно светящееся показание. Никакой буквы «В»
 * в кружке — прибор узнаётся по дуге, и именно она стоит на онбординге,
 * экране прогноза и в шапке.
 *
 * Рендерим офлайн через sharp (уже есть в зависимостях Next) — сборка не ходит
 * в сеть. Maskable-вариант рисуется с запасом по краям: Android обрезает
 * иконку под форму launcher'а, и дуга без safe zone теряет края.
 *
 *   node scripts/build-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public");

// Токены из app/globals.css — иконка обязана совпадать с интерфейсом.
const INK_3 = "#090d22";
const INK = "#0e1430";
const COOL = "#7c8cf8";
const HAZE = "#9aa3c0";
const WARM = "#f2a65a";
const SIGNAL = "#46e0c4";

/**
 * @param {number} size сторона квадрата
 * @param {number} inset доля поля, свободная по краям (safe zone для maskable)
 * @param {boolean} bleed заливать фон до краёв (maskable) или скруглённым квадратом
 */
function svg(size, inset, bleed, noBg = false) {
  const S = size;
  // Геометрия дуги в координатах иконки: центр внизу, радиус — с учётом inset.
  const cx = S / 2;
  const cy = S * (0.5 + 0.17);
  const r = (S / 2) * (1 - inset);
  const stroke = Math.max(2, S * 0.055);

  const pt = (t, radius = r) => {
    const a = Math.PI * (1 - t);
    return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)];
  };
  const [x0, y0] = pt(0);
  const [x1, y1] = pt(1);
  // Показание — «Скорее да» (4-я из 5 градаций): прибор показывает уверенность,
  // а не крайность, и это же положение у глифа в шапке.
  const [rx, ry] = pt(0.75);

  const ticks = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const [tx, ty] = pt(t, r);
      return `<circle cx="${tx.toFixed(2)}" cy="${ty.toFixed(2)}" r="${(stroke * 0.34).toFixed(2)}" fill="${INK_3}" opacity="0.55"/>`;
    })
    .join("");

  // noBg — глиф без подложки: нужен для сплэша, где фон рисует холст целиком,
  // иначе на стыке виден прямоугольник с чуть другим градиентом.
  const bg = noBg
    ? ""
    : bleed
      ? `<rect width="${S}" height="${S}" fill="url(#bg)"/>`
      : `<rect width="${S}" height="${S}" rx="${(S * 0.22).toFixed(2)}" fill="url(#bg)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${INK}"/>
      <stop offset="100%" stop-color="${INK_3}"/>
    </linearGradient>
    <linearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${COOL}"/>
      <stop offset="50%" stop-color="${HAZE}"/>
      <stop offset="100%" stop-color="${WARM}"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0%" stop-color="${SIGNAL}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${SIGNAL}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${bg}
  <path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}"
        fill="none" stroke="url(#spectrum)" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round"/>
  ${ticks}
  <circle cx="${rx.toFixed(2)}" cy="${ry.toFixed(2)}" r="${(stroke * 2.6).toFixed(2)}" fill="url(#glow)"/>
  <circle cx="${rx.toFixed(2)}" cy="${ry.toFixed(2)}" r="${(stroke * 0.95).toFixed(2)}" fill="${SIGNAL}"/>
</svg>`;
}

const TARGETS = [
  // [файл, размер, inset, bleed]
  ["icon-192.png", 192, 0.2, false],
  ["icon-512.png", 512, 0.2, false],
  // Maskable: Android обрезает до 80% — держим дугу внутри safe zone.
  ["icon-maskable-512.png", 512, 0.32, true],
  // iOS сам скругляет и не любит прозрачность — фон до краёв.
  ["apple-touch-icon.png", 180, 0.22, true],
  ["favicon-32.png", 32, 0.12, false],
];

await mkdir(OUT, { recursive: true });

for (const [name, size, inset, bleed] of TARGETS) {
  const markup = svg(size, inset, bleed);
  await sharp(Buffer.from(markup)).png().toFile(path.join(OUT, name));
  console.log(`  ${name}  ${size}×${size}`);
}

// Векторная иконка — для десктопных браузеров и как источник правды.
await writeFile(path.join(OUT, "icon.svg"), svg(512, 0.2, false), "utf8");
console.log("  icon.svg  512×512");

/**
 * Экраны запуска для iOS.
 *
 * Android рисует сплэш сам из `background_color` и иконки манифеста, а iOS
 * этого не умеет: без `apple-touch-startup-image` запуск с ярлыка встречает
 * белой вспышкой — самый заметный признак «это сайт». Медиа-запрос должен
 * точно совпасть с устройством, иначе iOS не возьмёт ни одну картинку, так
 * что перечисляем реальные размеры, а не «примерно подходящие».
 */

const DEVICES = [
  // [css-ширина, css-высота, dpr, что за устройства]
  [393, 852, 3, "iPhone 16/15/14 Pro"],
  [430, 932, 3, "iPhone 16 Plus/15 Pro Max/14 Pro Max"],
  [390, 844, 3, "iPhone 14/13/12"],
  [428, 926, 3, "iPhone 14 Plus/13 Pro Max"],
  [375, 812, 3, "iPhone 13 mini/12 mini/11 Pro/X"],
  [414, 896, 2, "iPhone 11/XR"],
  [375, 667, 2, "iPhone SE"],
];

for (const [cw, ch, dpr, label] of DEVICES) {
  const w = cw * dpr;
  const h = ch * dpr;
  const size = Math.round(Math.min(w, h) * 0.42);
  const glyph = svg(size, 0.06, true, true);
  const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${INK}"/><stop offset="100%" stop-color="${INK_3}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
</svg>`;
  const name = `splash-${cw}x${ch}@${dpr}x.png`;
  await sharp(Buffer.from(canvas))
    .composite([
      {
        input: await sharp(Buffer.from(glyph)).resize(size, size).png().toBuffer(),
        top: Math.round((h - size) / 2),
        left: Math.round((w - size) / 2),
      },
    ])
    .png()
    .toFile(path.join(OUT, name));
  console.log(`  ${name}  ${w}×${h}  (${label})`);
}
