"use client";

import { useEffect } from "react";

/**
 * Короткое сообщение с одним необязательным действием — например, «Скорее да»
 * и кнопка «Отменить» после свайпа.
 *
 * Живёт в потоке, в слоте фиксированной высоты, который отдаёт родитель:
 * так оно не перекрывает ни кнопки под стопкой, ни нижнюю панель, и не
 * двигает раскладку, появляясь и исчезая. Тёмное: читается на обеих средах.
 */
export interface ToastData {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
  /** Через сколько миллисекунд убрать; без значения — пока не заменят. */
  durationMs?: number;
}

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastData | null;
  onClose: (id: number) => void;
}) {
  useEffect(() => {
    if (!toast?.durationMs) return;
    const t = setTimeout(() => onClose(toast.id), toast.durationMs);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  return (
    <div className="flex min-h-12 items-center justify-center" role="status">
      {toast && (
        <div className="flex min-h-11 max-w-full items-center gap-3 rounded-full border border-[color:var(--color-edge)] bg-[color:var(--color-ink-3)]/90 py-0.5 pr-1 pl-4 text-sm text-white shadow-xl">
          <span className="min-w-0 truncate">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={toast.action.onClick}
              className="min-h-9 shrink-0 rounded-full bg-white/10 px-3.5 text-sm font-700 text-signal"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
