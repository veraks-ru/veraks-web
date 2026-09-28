"use client";

import { useState } from "react";
import { OracleArc } from "@/components/brand/OracleArc";
import { ButtonLink, Button } from "@/components/ui/Button";
import { shareLink } from "@/lib/share";
import { shareOrigin } from "@/lib/shareUrl";

/**
 * Стопка пуста. Это не тупик: у вошедшего лента продолжается его же ответами
 * (свайп там только листает), пропущенное можно вернуть, событие —
 * предложить, друзей — позвать. Дуга без показания: прибор ждёт данных.
 *
 * `variant="reviewed"` — второй конец: пролистаны и свои ответы.
 */
export function EndOfStack({
  variant = "fresh",
  skippedCount,
  filtered,
  canPropose,
  reviewAvailable = false,
  onStartReview,
  onRestartReview,
  onExitReview,
  onRestoreSkipped,
  onClearFilter,
  fill = true,
}: {
  variant?: "fresh" | "reviewed";
  /** Растянуться по секции стопки (absolute) или лечь блоком в потоке. */
  fill?: boolean;
  skippedCount: number;
  /** Пусто из-за фильтра по категории, а не вообще. */
  filtered: boolean;
  canPropose: boolean;
  /** У зрителя есть ответы, которые можно листать. */
  reviewAvailable?: boolean;
  onStartReview?: () => void;
  onRestartReview?: () => void;
  onExitReview?: () => void;
  onRestoreSkipped: () => void;
  onClearFilter: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const reviewed = variant === "reviewed";

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

  const title = reviewed
    ? "Это все ваши ответы"
    : filtered
      ? "В этой категории новых событий нет"
      : "Новые события закончились";

  const lead = reviewed
    ? "Новые появляются каждый день. Позовите друзей — с ними интереснее сверять точность."
    : reviewAvailable
      ? "Можно позвать друзей или полистать события, где вы уже ответили: там видно ваш ответ и как двигается толпа."
      : skippedCount > 0
        ? "Пропущенные можно посмотреть ещё раз."
        : "Новые появляются каждый день. Загляните позже или позовите друзей.";

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-line bg-surface p-6 text-center ${
        fill ? "absolute inset-0" : "min-h-[22rem]"
      }`}
    >
      <OracleArc activeIndex={null} className="w-36 opacity-70" />
      <p className="mt-5 font-display text-xl font-600 text-graphite">{title}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate">{lead}</p>

      <div className="mt-6 grid w-full max-w-xs gap-2.5">
        <Button variant="solid-light" size="md" onClick={invite}>
          {copied ? "Ссылка скопирована" : "Позвать друзей"}
        </Button>
        {!reviewed && reviewAvailable && onStartReview && (
          <Button variant="ghost-light" size="md" onClick={onStartReview}>
            Листать мои ответы
          </Button>
        )}
        {reviewed && onRestartReview && (
          <Button variant="ghost-light" size="md" onClick={onRestartReview}>
            Смотреть сначала
          </Button>
        )}
        {reviewed && onExitReview && (
          <Button variant="ghost-light" size="md" onClick={onExitReview}>
            Проверить новые
          </Button>
        )}
        {!reviewed && skippedCount > 0 && (
          <Button variant="ghost-light" size="md" onClick={onRestoreSkipped}>
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
        <ButtonLink href="/events" variant="ghost-light" size="md">
          Все события
        </ButtonLink>
      </div>
    </div>
  );
}
