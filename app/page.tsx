import type { Metadata } from "next";
import { FeedScreen } from "@/components/feed/FeedScreen";

export const metadata: Metadata = {
  title: "Веракс — лента прогнозов",
  description:
    "Что случится, а что нет? Открытые события одной стопкой: влево — нет, вправо — да. Мнение толпы видно сразу, точность считается по факту.",
};

/**
 * Главная — лента-свайп для всех: и гостя, и вошедшего. Рассказ «что это»
 * живёт на /about. Данные грузит клиент: они зависят от сессии.
 */
export default function HomePage() {
  return <FeedScreen />;
}
