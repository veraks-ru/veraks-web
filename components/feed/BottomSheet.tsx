"use client";

import { useEffect, type ReactNode } from "react";

/** Шторка снизу тёмной среды: детали события, вход гостя. Esc и тап по фону закрывают. */
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="pb-safe absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] border-t border-[color:var(--color-edge)] bg-[color:var(--color-ink-2)] px-5 pt-3 text-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2"
      >
        <span aria-hidden className="mx-auto mb-4 block h-1 w-9 rounded-full bg-white/20" />
        <div className="pb-6">{children}</div>
      </div>
    </div>
  );
}
