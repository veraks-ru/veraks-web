"use client";

import { Wordmark } from "@/components/brand/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/components/app/AuthProvider";

/**
 * Шапка лендинга. Клиентская — иначе главная показывала бы «Войти» уже
 * вошедшему человеку: остальные страницы берут состояние сессии из
 * AuthProvider, а статичная серверная шапка о нём не знала.
 *
 * Пока сессия проверяется, кнопка занимает место, но не подписана: показать
 * на секунду «Войти» и заменить на «В кабинет» — то же враньё, только
 * мигающее.
 */
export function LandingNav() {
  const { me, loading } = useAuth();

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Wordmark tone="dark" />
      <nav className="flex items-center gap-2 sm:gap-3">
        {/* Прячем контейнером, а не классом на самой кнопке: base-стиль
            ButtonLink задаёт inline-flex, и при конфликте display выигрывает
            он — на телефоне ссылки налезали на логотип и уезжали за экран. */}
        <span className="hidden items-center gap-3 sm:flex">
          <ButtonLink href="/events" variant="ghost-dark" size="md">
            Смотреть события
          </ButtonLink>
          <ButtonLink href="/pricing" variant="ghost-dark" size="md">
            Тарифы
          </ButtonLink>
        </span>
        {loading ? (
          <span aria-hidden className="invisible">
            <ButtonLink href="/join" variant="signal" size="md">
              Войти
            </ButtonLink>
          </span>
        ) : me ? (
          <ButtonLink href="/account" variant="signal" size="md">
            @{me.username}
          </ButtonLink>
        ) : (
          <ButtonLink href="/join" variant="signal" size="md">
            Войти
          </ButtonLink>
        )}
      </nav>
    </header>
  );
}
