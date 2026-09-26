"use client";

import { useState } from "react";
import { OracleArc } from "@/components/brand/OracleArc";
import { ButtonLink, Button } from "@/components/ui/Button";
import { shareLink } from "@/lib/share";
import { shareOrigin } from "@/lib/shareUrl";

/**
 * Стопка пуста. Это не тупик: пропущенное можно вернуть, событие —
 * предложить, друзей — позвать. Дуга без показания: прибор ждёт данных.
 */
export function EndOfStack({
  skippedCount,
  filtered,
  canPropose,
  onRestoreSkipped,
  onClearFilter,
  fill = true,
}: {
  /** Растянуться по секции стопки (absolute) или лечь блоком в потоке. */
  fill?: boolean;
  skippedCount: number;
  /** Пусто из-за фильтра по категории, а не вообще. */
  filtered: boolean;
  canPropose: boolean;
  onRestoreSkipped: () => void;
  onClearFilter: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    const outcome = await shareLink({
      url: `${shareOrigin()}/`,
      title: "Веракс",
      text: "Что случится, а что нет? Проверьте свою точность против толпы.",
    });
    if (outcome !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-line bg-surface p-6 text-center ${
        fill ? "absolute inset-0" : "min-h-[22rem]"
      }`}
    >
      <OracleArc activeIndex={null} className="w-36 opacity-70" />
      <p className="mt-5 font-display text-xl font-600 text-graphite">
        {filtered ? "В этой категории пока всё" : "Открытых событий больше нет"}
      </p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate">
        {skippedCount > 0
          ? "Пропущенные можно посмотреть ещё раз."
          : "Новые появляются каждый день. Загляните позже или позовите друзей."}
      </p>

      <div className="mt-6 grid w-full max-w-xs gap-2.5">
        {skippedCount > 0 && (
          <Button variant="solid-light" size="md" onClick={onRestoreSkipped}>
            Показать пропущенные ({skippedCount})
          </Button>
        )}
        {filtered && (
          <Button variant="ghost-light" size="md" onClick={onClearFilter}>
            Все категории
          </Button>
        )}
        {canPropose && (
          <ButtonLink href="/events/propose" variant="ghost-light" size="md">
            Предложить событие
          </ButtonLink>
        )}
        <Button variant="ghost-light" size="md" onClick={invite}>
          {copied ? "Ссылка скопирована" : "Позвать друзей"}
        </Button>
        <ButtonLink href="/events" variant="ghost-light" size="md">
          Все события
        </ButtonLink>
      </div>
    </div>
  );
}
