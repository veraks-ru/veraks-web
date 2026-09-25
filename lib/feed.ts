// Лента-свайп: что означает жест. СИСТЕМНАЯ КОНСТАНТА, единственное место,
// где направление свайпа превращается в градацию уверенности.
//
// Решение владельца: свайп бинарный. Влево — «Скорее нет», вправо — «Скорее
// да»; это самые мягкие из градаций, поэтому ошибка в свайпе стоит дешевле,
// чем в «Точно». Свайп вверх — пропустить, без прогноза. Полная шкала из пяти
// градаций остаётся на странице события.

import type { ConfidenceGrade } from "./confidence";

export type SwipeDirection = "left" | "right" | "up";
export type SwipeDecision = Exclude<SwipeDirection, "up">;

export const SWIPE_GRADES: Record<SwipeDecision, ConfidenceGrade> = {
  left: "probably_no",
  right: "probably_yes",
};

/** Подписи штампов и кнопок — короткие, как ответ на вопрос карточки. */
export const SWIPE_LABELS: Record<SwipeDirection, string> = {
  left: "Нет",
  right: "Да",
  up: "Пропустить",
};

/** Сколько времени есть на «Отменить», прежде чем прогноз уйдёт на сервер. */
export const UNDO_MS = 4000;

export const FEED_PAGE_SIZE = 20;

/** При скольких оставшихся карточках подгружать следующую страницу. */
export const PREFETCH_AT = 3;

export const gradeForDirection = (dir: SwipeDecision): ConfidenceGrade => SWIPE_GRADES[dir];
