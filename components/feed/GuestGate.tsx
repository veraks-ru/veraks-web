"use client";

import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { GRADES, indexOfGrade } from "@/lib/confidence";
import { SWIPE_GRADES, type SwipeDecision } from "@/lib/feed";
import type { FeedCard } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";

/**
 * Гость свайпнул — показываем вход прямо здесь, не уводя с ленты.
 * Свайп не пропадает: он ждёт в локальном ящике и запишется после входа.
 */
export function GuestGate({
  open,
  decision,
  waiting,
  onClose,
  onContinue,
}: {
  open: boolean;
  decision: { card: FeedCard; direction: SwipeDecision } | null;
  /** Сколько свайпов уже ждут входа (гость продолжил без входа). */
  waiting: number;
  onClose: () => void;
  /** «Смотреть без входа»: гость свайпает дальше, свайпы копятся. */
  onContinue: () => void;
}) {
  const word = decision ? GRADES[indexOfGrade(SWIPE_GRADES[decision.direction])].label : null;

  return (
    <BottomSheet open={open} label="Вход" onClose={onClose}>
      <h2 className="font-display text-xl leading-snug font-600">Войдите, чтобы прогноз засчитался</h2>
      {decision && word ? (
        <p className="mt-2 text-sm leading-relaxed text-haze">
          «{decision.card.title}» — <span className="font-600 text-white">{word}</span>. Запишем сразу
          после входа. Участие бесплатное.
        </p>
      ) : waiting > 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-haze">
          Ваши ответы ждут входа и запишутся сразу после него. Участие бесплатное.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-haze">
          Участие бесплатное: вход нужен, чтобы вести свой трек-рекорд.
        </p>
      )}

      <div className="mt-6">
        <EmailLoginForm next="/" autoFocus={false} />
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-4 min-h-11 w-full rounded-full text-sm font-600 text-haze hover:text-white"
      >
        Смотреть без входа
      </button>
    </BottomSheet>
  );
}
