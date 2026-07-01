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
// повторяем запрос. Дедуп параллельных обновлений — общий promise.
let refreshing: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
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
