"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { SwipeDirection } from "@/lib/feed";

/**
 * Жест свайпа верхней карточки — на Pointer Events, без зависимостей
 * (тот же приём, что у ConfidenceDial: setPointerCapture + touch-none).
 *
 * Пока палец ведёт карточку, ничего не проходит через React: transform и
 * прогресс штампов пишутся прямо в style элемента (CSS-переменные
 * --swipe-left/--swipe-right/--swipe-up), чтобы на слабом телефоне рука не
 * обгоняла картинку. React узнаёт только о результате: onDecide на
 * отпускании, onGone — когда карточка улетела за экран.
 *
 * Автомат: idle → armed (нажали) → dragging (сдвинули ≥ 8px) →
 *   flying (за порогом или флик) → onGone → idle
 *   settling (не дотянули) → idle
 */

type Phase = "idle" | "armed" | "dragging" | "flying" | "settling";

interface Options {
  /**
   * Отпустили за порогом. Вернуть false — карточка возвращается на место
   * (так гостю показываем вход, не отбирая карточку).
   */
  onDecide: (dir: SwipeDirection) => boolean | void;
  /** Карточка скрылась за экраном — стопку можно двигать. */
  onGone: (dir: SwipeDirection) => void;
  disabled?: boolean;
  /** Возврат после «Отменить»: карточка въезжает с той стороны, куда улетала. */
  enterFrom?: SwipeDirection | null;
}

const DRAG_START_PX = 8;
const FLY_MS = 260;
const SETTLE_MS = 220;
const MAX_ROTATE_DEG = 12;
/** px/ms — резкий короткий взмах засчитывается и без полного расстояния. */
const FLICK_VELOCITY = 0.6;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function offscreen(dir: SwipeDirection): { x: number; y: number; rot: number } {
  const w = typeof window === "undefined" ? 400 : window.innerWidth;
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  if (dir === "up") return { x: 0, y: -1.2 * h, rot: 0 };
  const sign = dir === "right" ? 1 : -1;
  return { x: sign * 1.4 * w, y: 40, rot: sign * MAX_ROTATE_DEG * 1.5 };
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const swipeBaseStyle: CSSProperties = {
  touchAction: "none",
  userSelect: "none",
  willChange: "transform",
};

export function useSwipe({ onDecide, onGone, disabled = false, enterFrom = null }: Options) {
  const ref = useRef<HTMLDivElement>(null);
  const phase = useRef<Phase>("idle");
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const samples = useRef<{ x: number; y: number; t: number }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decide = useRef(onDecide);
  const gone = useRef(onGone);
  const off = useRef(disabled);
  decide.current = onDecide;
  gone.current = onGone;
  off.current = disabled;

  const setVars = useCallback((left: number, right: number, up: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--swipe-left", String(left));
    el.style.setProperty("--swipe-right", String(right));
    el.style.setProperty("--swipe-up", String(up));
  }, []);

  /** Один раз: по transitionend или по таймеру — что раньше. */
  const after = useCallback((ms: number, fn: () => void) => {
    const el = ref.current;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      el?.removeEventListener("transitionend", run);
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      fn();
    };
    el?.addEventListener("transitionend", run);
    timer.current = setTimeout(run, ms + 60);
  }, []);

  const settle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    phase.current = "settling";
    el.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(.2,.8,.2,1)`;
    void el.offsetWidth; // зафиксировать текущий transform как начало перехода
    el.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
    setVars(0, 0, 0);
    after(SETTLE_MS, () => {
      phase.current = "idle";
    });
  }, [after, setVars]);

  const flyTo = useCallback(
    (dir: SwipeDirection) => {
      const el = ref.current;
      if (!el) return;
      phase.current = "flying";
      setVars(dir === "left" ? 1 : 0, dir === "right" ? 1 : 0, dir === "up" ? 1 : 0);
      const to = offscreen(dir);
      const target = `translate3d(${to.x}px, ${to.y}px, 0) rotate(${to.rot}deg)`;
      const finish = () => {
        phase.current = "idle";
        gone.current(dir);
      };
      if (reducedMotion()) {
        el.style.transition = "none";
        el.style.transform = target;
        requestAnimationFrame(finish);
        return;
      }
      el.style.transition = `transform ${FLY_MS}ms cubic-bezier(.2,.7,.3,1)`;
      void el.offsetWidth;
      el.style.transform = target;
      after(FLY_MS, finish);
    },
    [after, setVars],
  );

  const apply = useCallback(
    (dx: number, dy: number) => {
      const el = ref.current;
      if (!el) return;
      const rot = Math.max(-MAX_ROTATE_DEG, Math.min(MAX_ROTATE_DEG, dx * 0.05));
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
      const t = 0.35 * el.offsetWidth;
      const tUp = 0.3 * el.offsetHeight;
      const vertical = Math.abs(dy) > Math.abs(dx);
      setVars(clamp01(-dx / t), clamp01(dx / t), vertical ? clamp01(-dy / tUp) : 0);
    },
    [setVars],
  );

  const judge = useCallback((dx: number, dy: number): SwipeDirection | null => {
    const el = ref.current;
    if (!el) return null;
    const s = samples.current;
    const first = s[0];
    const last = s[s.length - 1];
    const dt = first && last ? Math.max(1, last.t - first.t) : 1;
    const vx = first && last ? (last.x - first.x) / dt : 0;
    const vy = first && last ? (last.y - first.y) / dt : 0;
    const w = el.offsetWidth;
    const t = 0.35 * w;
    const tUp = 0.3 * el.offsetHeight;
    if (Math.abs(dy) > Math.abs(dx)) {
      return dy < 0 && (-dy >= tUp || vy < -FLICK_VELOCITY) ? "up" : null;
    }
    if (Math.abs(dx) >= t) return dx > 0 ? "right" : "left";
    const flick =
      Math.abs(vx) > FLICK_VELOCITY && Math.abs(dx) > 0.12 * w && Math.sign(vx) === Math.sign(dx);
    return flick ? (dx > 0 ? "right" : "left") : null;
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (off.current || phase.current !== "idle" || e.button !== 0) return;
    // Кнопки и ссылки внутри карточки — свои, жест с них не начинается.
    if ((e.target as HTMLElement).closest("a,button,input,textarea,select")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    samples.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    phase.current = "armed";
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const now = performance.now();
      // Скорость — по последним ~100 мс, а не от самого начала жеста.
      samples.current = [...samples.current.filter((p) => now - p.t < 100), { x: e.clientX, y: e.clientY, t: now }];
      if (phase.current === "armed") {
        if (Math.hypot(dx, dy) < DRAG_START_PX) return;
        phase.current = "dragging";
        if (ref.current) ref.current.style.transition = "none";
      }
      if (phase.current !== "dragging") return;
      apply(dx, dy);
    },
    [apply],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      start.current = null;
      if (phase.current !== "dragging") {
        phase.current = "idle"; // тап без сдвига — ничего
        return;
      }
      const dir = judge(e.clientX - s.x, e.clientY - s.y);
      if (dir && decide.current(dir) !== false) flyTo(dir);
      else settle();
    },
    [judge, flyTo, settle],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      start.current = null;
      if (phase.current === "dragging") settle();
      else phase.current = "idle";
    },
    [settle],
  );

  /** Программный свайп — кнопки под карточкой и клавиатура. */
  const fly = useCallback(
    (dir: SwipeDirection) => {
      if (off.current || phase.current !== "idle") return;
      if (decide.current(dir) === false) return;
      flyTo(dir);
    },
    [flyTo],
  );

  // Возврат после «Отменить»: сначала ставим карточку за экран без перехода,
  // затем следующим кадром отпускаем её на место.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enterFrom || !el) return;
    const from = offscreen(enterFrom);
    el.style.transition = "none";
    el.style.transform = `translate3d(${from.x}px, ${from.y}px, 0) rotate(${from.rot}deg)`;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => settle());
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // только при монтировании этой карточки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return {
    ref,
    fly,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
