"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  deleteMyAccount,
  getMe,
  getMySubscription,
  isSubscriptionActive,
  logout as apiLogout,
} from "@/lib/api/endpoints";
import Link from "next/link";
import { tryRefresh } from "@/lib/api/client";
import type { ApiMe } from "@/lib/api/dto";

interface AuthState {
  me: ApiMe | null;
  subscribed: boolean;
  loading: boolean;
  refresh: () => Promise<ApiMe | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  me: null,
  subscribed: false,
  loading: true,
  refresh: async () => null,
  signOut: async () => {},
  deleteAccount: async () => {},
});

// Страницы, где напоминание о незавершённом онбординге не показываем: на
// самом онбординге оно бессмысленно, на документах и страницах входа —
// мешает читать то, ради чего человек туда пришёл.
const ONBOARDING_EXEMPT_PREFIXES = ["/onboarding", "/legal", "/join", "/auth"];

function isOnboardingExempt(pathname: string): boolean {
  return ONBOARDING_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Полоса-напоминание: онбординг не завершён, участие пока закрыто. */
function OnboardingReminder() {
  return (
    <div
      role="status"
      className="bg-[color:var(--color-signal)]/12 px-4 py-2 text-center text-sm text-[color:var(--color-signal-deep)]"
    >
      Регистрация не завершена: примите условия и выберите псевдоним, чтобы
      делать прогнозы.{" "}
      <Link href="/onboarding" className="font-600 underline">
        Завершить
      </Link>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    let user: ApiMe | null = null;
    try {
      user = await getMe();
      // getMe идёт с allow:[401] → протухший access-токен не запускает
      // авто-refresh в клиенте. Освежаем сессию один раз и повторяем (без
      // цикла), иначе сессия «умирает» через ~15 мин, пока refresh ещё жив.
      if (!user && (await tryRefresh())) {
        user = await getMe();
      }
      setMe(user);
      if (user) {
        const sub = await getMySubscription();
        setSubscribed(isSubscriptionActive(sub));
      } else {
        setSubscribed(false);
      }
    } catch {
      user = null;
      setMe(null);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
    return user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* всё равно чистим состояние */
    }
    setMe(null);
    setSubscribed(false);
  }, []);

  // Самостоятельное удаление аккаунта (152-ФЗ). В отличие от signOut ошибку
  // НЕ глотаем — вызывающая сторона (кнопка в «Опасной зоне») должна её
  // показать пользователю и не редиректить при сбое запроса.
  const deleteAccount = useCallback(async () => {
    await deleteMyAccount();
    setMe(null);
    setSubscribed(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Незавершённый онбординг НЕ уводит со страницы принудительно: раньше
  // редирект срабатывал в том числе с публичного лендинга, и человек с живой
  // сессией не мог открыть сайт вообще — «главная → /onboarding → главная».
  // Витрина остаётся доступной, а участие всё равно закрыто на сервере
  // (ConsentRequiredError → 403), поэтому обойти согласия так нельзя.
  const showOnboardingReminder =
    !loading && !!me?.needs_onboarding && !isOnboardingExempt(pathname ?? "");

  return (
    <AuthContext.Provider
      value={{ me, subscribed, loading, refresh, signOut, deleteAccount }}
    >
      {showOnboardingReminder ? <OnboardingReminder /> : null}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
