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

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T | null> {
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      credentials: "include",
      cache: "no-store",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    throw new ApiError(0, "Сеть недоступна", "network");
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
