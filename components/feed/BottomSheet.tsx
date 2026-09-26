"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Шторка снизу тёмной среды: детали события, вход гостя. На широком экране
 * (от md) та же панель стоит в центре как обычный диалог, без «ручки».
 *
 * Как у диалога: фокус переходит внутрь, Tab ходит по кругу, Esc и тап по
 * фону закрывают, после закрытия фокус возвращается туда, откуда пришёл.
 * Содержимое под шторкой родитель помечает inert.
 */
export function BottomSheet({
  open,
  label,
  onClose,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // onClose через ref: родитель может передавать новую функцию на каждый
  // рендер, а переустанавливать ловушку (и возвращать фокус на первый
  // элемент) нужно только при открытии.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (focusables()[0] ?? el)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close.current();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const f = focusables();
      if (f.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--color-ink-3)]/70 backdrop-blur-[2px]"
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="pb-safe absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] border-t border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)] px-5 pt-3 text-white shadow-2xl outline-none md:inset-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.75rem] md:border md:px-7 md:pt-7"
      >
        <span aria-hidden className="mx-auto mb-4 block h-1 w-9 rounded-full bg-white/20 md:hidden" />
        <div className="pb-6">{children}</div>
      </div>
    </div>
  );
}
