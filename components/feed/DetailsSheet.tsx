"use client";

import { ButtonLink } from "@/components/ui/Button";
import { ShareEventButton } from "@/components/share/ShareEventButton";
import { deadlineLabel, fmtDate } from "@/lib/format";
import type { FeedCard } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";

/** Что именно считается «да», по какому источнику и когда узнаем — то, без чего прогноз наугад. */
export function DetailsSheet({ card, onClose }: { card: FeedCard | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!card} label="Подробности события" onClose={onClose}>
      {card && (
        <>
          <p className="text-xs font-600 text-haze">{card.category.title}</p>
          <h2 className="mt-2 font-display text-xl leading-snug font-600 text-balance">{card.title}</h2>
          {card.description && (
            <p className="mt-3 text-sm leading-relaxed text-haze">{card.description}</p>
          )}

          <dl className="mt-5 grid gap-4 text-sm">
            <Row term="Критерии">{card.resolutionCriteria}</Row>
            <Row term="Источник">{card.resolutionSource}</Row>
            <Row term="Приём прогнозов">
              до {fmtDate(card.closesAt)}, {deadlineLabel(card.closesAt)}
            </Row>
            <Row term="Разрешение">{fmtDate(card.resolvesAt)}</Row>
          </dl>

          <div className="mt-6 grid gap-3">
            <ButtonLink href={`/events/${card.slug}`} variant="signal" size="lg" className="w-full">
              Открыть событие
            </ButtonLink>
            <p className="text-center text-xs text-haze-dim">
              На странице события — полная шкала из пяти градаций и обсуждение.
            </p>
            <ShareEventButton event={card} tone="dark" />
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-600 text-haze-dim">{term}</dt>
      <dd className="mt-1 leading-snug text-haze">{children}</dd>
    </div>
  );
}
