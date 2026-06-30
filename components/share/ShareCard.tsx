import { OracleArc } from "@/components/brand/OracleArc";
import { GRADES, gradeColor, indexOfGrade } from "@/lib/confidence";
import { resultVerdict } from "@/lib/mock-users";
import { fmtBrier } from "@/lib/format";
import type { PredictionEvent } from "@/lib/types";

/**
 * Шеринговая карточка результата (Экран 7). Запоминающийся артефакт для
 * соцсетей: бренд + вопрос + исход + показание автора + вердикт по Brier.
 * Переиспользуется как превью и как основа OG-картинки в проде.
 */
export function ShareCard({
  event,
  username,
}: {
  event: PredictionEvent;
  username: string;
}) {
  const outcome = !!event.outcome;
  const gradeIndex = event.myGrade ? indexOfGrade(event.myGrade) : 2;
  const brierValue = (GRADES[gradeIndex].probability - (outcome ? 1 : 0)) ** 2;
  const verdict = resultVerdict(brierValue);
  const good = brierValue < 0.2;
  const verdictColor = good
    ? "var(--color-signal)"
    : brierValue < 0.45
      ? "var(--color-warm)"
      : "var(--color-cool)";
  const outcomeColor = outcome ? "var(--color-warm)" : "var(--color-cool)";

  return (
    <div className="bg-oracle grain relative aspect-[1.91/1] w-full overflow-hidden rounded-[1.5rem] border border-[color:var(--color-edge)] text-white">
      <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
        {/* шапка */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-sm font-600 tracking-[0.14em]">
            <span className="size-2 rounded-full bg-signal" />
            ВЕРАКС
          </span>
          <span className="text-xs font-600 tracking-wide text-haze-dim uppercase">
            результат прогноза
          </span>
        </div>

        {/* тело */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="line-clamp-3 font-display text-base leading-snug font-500 sm:text-xl">
              {event.title}
            </p>
            <p className="mt-3 text-sm text-haze">
              Истина:{" "}
              <span className="font-700" style={{ color: outcomeColor }}>
                {outcome ? "ДА" : "НЕТ"}
              </span>
            </p>
            <p className="mt-1 text-sm text-haze">
              <span className="font-600 text-white">@{username}</span> сказал{" "}
              <span className="font-700" style={{ color: gradeColor(gradeIndex) }}>
                «{GRADES[gradeIndex].label}»
              </span>
            </p>
          </div>

          <div className="hidden w-40 shrink-0 sm:block">
            <OracleArc activeIndex={gradeIndex} className="w-full" />
          </div>
        </div>

        {/* подвал */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.7rem] tracking-wide text-haze-dim uppercase">точность</p>
            <p className="font-display text-2xl font-700" style={{ color: verdictColor }}>
              {verdict}
              <span className="ml-2 font-mono text-base tnum text-haze">
                Brier {fmtBrier(brierValue)}
              </span>
            </p>
          </div>
          <p className="text-right text-xs leading-tight text-haze-dim">
            Слова стоят дёшево.
            <br />
            <span className="text-haze">Точность — нет.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
