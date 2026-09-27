"use client";

import { ButtonLink } from "@/components/ui/Button";
import type { FeedCard } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";

/**
 * Сервер не принял ответ (402): прогнозы принимаются по подписке или
 * приглашению. `card` — чей ответ не записан; null — ответы, накопленные
 * гостем до входа.
 */
export function SubscriptionSheet({
  open,
  card,
  onClose,
}: {
  open: boolean;
  card: FeedCard | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} label="Нужна подписка" onClose={onClose}>
      <h2 className="font-display text-xl leading-snug font-600">
        Прогнозы принимаются по подписке
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-haze">
        {card ? `Ответ по «${card.title}» не записан. ` : "Ответы, ждавшие входа, не записаны. "}
        Оформите подписку или воспользуйтесь приглашением, чтобы участвовать в прогнозах и
        вести свой трек-рекорд.
      </p>
      <div className="mt-6 grid gap-3">
        <ButtonLink href="/pricing" variant="signal" size="lg" className="w-full">
          Посмотреть тарифы
        </ButtonLink>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full rounded-full text-sm font-600 text-haze hover:text-white"
        >
          Смотреть без участия
        </button>
      </div>
    </BottomSheet>
  );
}
