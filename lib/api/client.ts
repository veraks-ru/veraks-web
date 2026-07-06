// Тонкий типизированный HTTP-клиент к бэкенду «Веракс».
// Все запросы идут с credentials: cookie-сессия (access/refresh) — httpOnly.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface Options {
  method?: string;
  body?: unknown;
  /** не бросать на этих статусах — вернуть null (например, 401/404) */
  allow?: number[];
  signal?: AbortSignal;
}

// Ротация access-токена: при 401 один раз пробуем POST /auth/refresh и
// повторяем запрос. Дедуп в рамках вкладки — общий promise; между вкладками —
// координация (см. ниже), т.к. refresh-токен ротируется на сервере и
// одновременные обновления из разных вкладок дают каскадный разлогин.
const REFRESH_LOCK_KEY = "veraks:auth:refreshing";
const REFRESH_DONE_KEY = "veraks:auth:refreshed-at";
const LOCK_TTL_MS = 10_000;
const RECENT_MS = 5_000;

function otherTabRefreshing(): boolean {
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < LOCK_TTL_MS;
  } catch {
    return false; // нет localStorage (SSR/приватный режим) — без координации
  }
}

function setRefreshLock(on: boolean): void {
  try {
    if (on) localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()));
    else localStorage.removeItem(REFRESH_LOCK_KEY);
  } catch {
    /* без межвкладочной координации — не критично */
  }
}

async function runRefreshRequest(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Одно фактическое обновление на «пачку»: если сессию только что освежили
// (в этой или соседней вкладке) — доверяем общему httpOnly-cookie.
async function guardedRefresh(): Promise<boolean> {
  try {
    const at = Number(localStorage.getItem(REFRESH_DONE_KEY) ?? 0);
    if (Number.isFinite(at) && Date.now() - at < RECENT_MS) return true;
  } catch {
    /* нет localStorage */
  }
  const ok = await runRefreshRequest();
  if (ok) {
    try {
      localStorage.setItem(REFRESH_DONE_KEY, String(Date.now()));
    } catch {
      /* игнорируем */
    }
  }
  return ok;
}

async function doRefresh(): Promise<boolean> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  // Web Locks — межвкладочный мьютекс: обновления сериализуются, лишние
  // отсекает guardedRefresh по свежему таймстампу.
  if (locks?.request) {
    return locks.request("veraks:auth-refresh", guardedRefresh);
  }
  // Фолбэк без Web Locks: мягкий лок через localStorage-таймстамп.
  for (let i = 0; i < 20 && otherTabRefreshing(); i++) {
    await new Promise((r) => setTimeout(r, 150));
  }
  if (otherTabRefreshing()) return true; // доверяем соседней вкладке
  setRefreshLock(true);
  try {
    return await guardedRefresh();
  } finally {
    setRefreshLock(false);
  }
}

let refreshing: Promise<boolean> | null = null;
export function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function rawFetch(path: string, opts: Options): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      credentials: "include",
      cache: "no-store",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "Сеть недоступна", "network");
  }
}

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T | null> {
  let resp = await rawFetch(path, opts);

  // Молча освежаем сессию на 401 (кроме самого refresh и явно разрешённых 401).
  if (
    resp.status === 401 &&
    !opts.allow?.includes(401) &&
    path !== "/auth/refresh" &&
    path !== "/auth/me"
  ) {
    if (await tryRefresh()) {
      resp = await rawFetch(path, opts);
    }
  }

  if (opts.allow?.includes(resp.status)) return null;

  if (!resp.ok) {
    let detail = `Ошибка ${resp.status}`;
    let code: string | undefined;
    try {
      const j = await resp.json();
      detail = j.detail ?? detail;
      code = j.error;
    } catch {
      /* тело не JSON */
    }
    throw new ApiError(resp.status, detail, code);
  }

  if (resp.status === 204) return null;
  return (await resp.json()) as T;
}
