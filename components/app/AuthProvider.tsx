"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
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
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  me: null,
  subscribed: false,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      let user = await getMe();
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
      setMe(null);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
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

  return (
    <AuthContext.Provider value={{ me, subscribed, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
