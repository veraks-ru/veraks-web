"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getMe,
  getMySubscription,
  isSubscriptionActive,
  logout as apiLogout,
} from "@/lib/api/endpoints";
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
      const user = await getMe();
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
