"use client";

import type { MutableRefObject } from "react";
import type { SwipeDirection } from "@/lib/feed";
import type { FeedCard } from "@/lib/types";
import { SwipeCard } from "./SwipeCard";

const VISIBLE = 3;

/**
 * Стопка: три карточки, верхняя с жестом. Ключ — id, чтобы при сдвиге стопки
 * карточка поднималась, а не перерисовывалась. Колбэки получают саму
 * карточку: решение принадлежит ей, а не «верхней на момент вызова».
 */
export function CardStack({
  cards,
  disabled,
  enterFrom,
  onDecide,
  onGone,
  onDetails,
  flyRef,
}: {
  cards: FeedCard[];
  disabled: boolean;
  enterFrom: SwipeDirection | null;
  onDecide: (dir: SwipeDirection, card: FeedCard) => boolean | void;
  onGone: (dir: SwipeDirection, card: FeedCard) => void;
  onDetails: (card: FeedCard) => void;
  flyRef: MutableRefObject<((dir: SwipeDirection) => void) | null>;
}) {
  return (
    // Абсолют, а не h-full: секция получает высоту от flex-1, и процентная
    // высота у потомков не разрешается — а inset-0 берёт фактический размер.
    <div className="absolute inset-0">
      {cards.slice(0, VISIBLE).map((card, i) => (
        <SwipeCard
          key={card.id}
          card={card}
          top={i === 0}
          depth={i}
          disabled={disabled}
          enterFrom={enterFrom}
          onDecide={onDecide}
          onGone={onGone}
          onDetails={() => onDetails(card)}
          flyRef={flyRef}
        />
      ))}
    </div>
  );
}
