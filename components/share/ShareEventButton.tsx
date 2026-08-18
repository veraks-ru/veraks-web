"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { shareLink } from "@/lib/share";
import { shareUrl } from "@/lib/shareUrl";
import type { PredictionEvent } from "@/lib/types";

/**
 * Позвать других к событию, приём по которому ещё идёт.
 *
 * Отдельно от «Поделиться результатом» на разрешённом событии: там человек
 * показывает свою точность, здесь — зовёт спрогнозировать, пока это ещё
 * возможно. Второе для платформы важнее: прогноз, сделанный после закрытия
 * приёма, не существует.
 *
 * Своего прогноза в ссылке нет и быть не должно — сводка толпы скрыта до
 * закрытия приёма, и приглашение не может её обойти (анти-якорение).
 */
export function ShareEventButton({
  event,
  tone = "light",
}: {
  event: PredictionEvent;
  tone?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const outcome = await shareLink({
      url: shareUrl(event.slug),
      title: "Веракс",
      text: `«${event.title}» — а вы как думаете?`,
    });
    if (outcome !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button
      variant={tone === "dark" ? "ghost-dark" : "ghost-light"}
      size="md"
      className="w-full"
      onClick={share}
    >
      <ShareIcon className="size-4" />
      {copied ? "Скопировано" : "Поделиться ссылкой"}
    </Button>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v12m0-12 4 4m-4-4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
