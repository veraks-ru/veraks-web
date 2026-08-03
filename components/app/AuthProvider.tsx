"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getMe,
  getMySubscription,
  isSubscriptionActive,
  logout as apiLogout,
} from "@/lib/api/endpoints";
import { tryRefresh } from "@/lib/api/client";
import type { ApiMe } from "@/lib/api/dto";

interface AuthState {
  me: ApiMe | null;
  subscribed: boolean;
  loading: boolean;
  refresh: () => Promise<ApiMe | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  me: null,
  subscribed: false,
  loading: true,
  refresh: async () => null,
  signOut: async () => {},
});

// Страницы, доступные до завершения онбординга (псевдоним + согласия
// 152-ФЗ) — иначе пользователь не мог бы ни дойти до /onboarding, ни
// прочитать документы, на которые там ссылаются, ни выйти.
const ONBOARDING_EXEMPT_PREFIXES = ["/onboarding", "/legal", "/join", "/auth"];

function isOnboardingExempt(pathname: string): boolean {
  return ONBOARDING_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Страховочный гард: пока не пройден онбординг (псевдоним подтверждён +
  // все обязательные согласия приняты), пускаем только на страницы из
  // исключений — с любой другой мягко возвращаем на /onboarding.
  useEffect(() => {
    if (loading || !me?.needs_onboarding) return;
    if (isOnboardingExempt(pathname ?? "")) return;
    router.replace("/onboarding");
  }, [loading, me, pathname, router]);

  return (
    <AuthContext.Provider value={{ me, subscribed, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
