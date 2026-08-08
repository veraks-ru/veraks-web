/**
 * Экраны запуска для iOS (`apple-touch-startup-image`).
 *
 * Android рисует сплэш сам из манифеста, iOS — только по этим ссылкам. Без
 * них запуск с ярлыка встречает белой вспышкой, и это самый заметный признак
 * «на самом деле это сайт».
 *
 * Метаданные Next такого тега не умеют, поэтому рендерим `<link>` прямо —
 * React 19 поднимает их в `<head>`.
 *
 * Медиа-запрос обязан совпасть с устройством ТОЧНО: если ни одно правило не
 * подошло, iOS не возьмёт ничего и покажет ту же белую вспышку. Поэтому здесь
 * перечислены реальные размеры конкретных моделей, а не round-числа. Список
 * синхронизирован с ``scripts/build-icons.mjs``; ориентация только портретная —
 * манифест фиксирует `orientation: portrait`.
 */

const DEVICES: [number, number, number][] = [
  // [css-ширина, css-высота, dpr]
  [393, 852, 3], // iPhone 16/15/14 Pro
  [430, 932, 3], // iPhone 16 Plus / 15 Pro Max / 14 Pro Max
  [390, 844, 3], // iPhone 14/13/12
  [428, 926, 3], // iPhone 14 Plus / 13 Pro Max
  [375, 812, 3], // iPhone 13 mini / 12 mini / 11 Pro / X
  [414, 896, 2], // iPhone 11 / XR
  [375, 667, 2], // iPhone SE
];

export function AppleSplashLinks() {
  return (
    <>
      {DEVICES.map(([w, h, dpr]) => (
        <link
          key={`${w}x${h}@${dpr}`}
          rel="apple-touch-startup-image"
          href={`/splash-${w}x${h}@${dpr}x.png`}
          media={
            `(device-width: ${w}px) and (device-height: ${h}px) ` +
            `and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`
          }
        />
      ))}
    </>
  );
}
