// Геометрия «дуги уверенности» — общая для презентационной (OracleArc)
// и интерактивной (ConfidenceDial) версий.

export const VIEW_W = 320;
export const VIEW_H = 188;
export const CX = VIEW_W / 2;
export const CY = 172;
export const R = 132;

export const STEPS = 5; // 5 градаций
const LAST = STEPS - 1;

/** t: 0 (левый край «Точно нет») … 1 (правый «Точно да») */
export function pointAt(t: number, radius = R) {
  const angle = Math.PI * (1 - t); // 180° → 0°
  return {
    x: CX + radius * Math.cos(angle),
    y: CY - radius * Math.sin(angle),
  };
}

export const pointForIndex = (i: number, radius = R) =>
  pointAt(i / LAST, radius);

/**
 * Из координат указателя (client px) → ближайший индекс градации.
 * rect — getBoundingClientRect() контейнера svg.
 */
export function indexFromClient(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): number {
  const cxPx = rect.left + rect.width * (CX / VIEW_W);
  const cyPx = rect.top + rect.height * (CY / VIEW_H);
  const dx = clientX - cxPx;
  const dy = cyPx - clientY; // вверх — положительное

  let angle = Math.atan2(dy, dx); // (-π, π]
  if (angle < 0) {
    // Ниже центра — прижать к ближайшему краю; строго под центром (dx===0) —
    // к середине (50/50), а не к произвольному «Точно да».
    angle = dx > 0 ? 0 : dx < 0 ? Math.PI : Math.PI / 2;
  }
  const t = 1 - angle / Math.PI;
  return Math.max(0, Math.min(LAST, Math.round(t * LAST)));
}
