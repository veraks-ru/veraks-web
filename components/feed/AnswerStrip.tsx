import { GRADES, indexOfGrade } from "@/lib/confidence";
import type { ConfidenceGrade } from "@/lib/types";

/**
 * «Ваш ответ · Точно да» — полоса поверх карточки в просмотре своих ответов.
 * Цвет по полюсу: «да» зелёный, «нет» красный (решение владельца для ответов
 * в ленте), «50 на 50» нейтральный. Ответ здесь не меняется — только на
 * странице события с полной шкалой, о чём говорит подпись.
 */
export function AnswerStrip({ grade, compact = false }: { grade: ConfidenceGrade; compact?: boolean }) {
  const def = GRADES[indexOfGrade(grade)];
  const tone =
    def.pole === "yes"
      ? "border-[color:var(--color-yes)] bg-[color:var(--color-yes)]/12 text-[color:var(--color-yes-ink)]"
      : def.pole === "no"
        ? "border-[color:var(--color-no)] bg-[color:var(--color-no)]/12 text-[color:var(--color-no-ink)]"
        : "border-line bg-paper text-graphite";
  return (
    <p
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 ${compact ? "py-1.5 text-xs" : "py-2 text-sm"} ${tone}`}
      data-testid="answer-strip"
    >
      <span className="font-600">
        Ваш ответ · <span className="font-display font-700">{def.label}</span>
      </span>
      {!compact && <span className="text-xs opacity-80">записан</span>}
    </p>
  );
}
