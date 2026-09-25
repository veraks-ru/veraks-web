// Куда вернуть человека после входа по ссылке из письма или после онбординга.
//
// Зеркало серверного правила (identity/domain/magic_link.py::safe_return_path):
// только относительный путь внутри сайта. Значение в ссылке письма мог
// подправить кто угодно, поэтому клиент проверяет его сам, а не доверяет.

const MAX_LEN = 512;

/** Относительный путь внутри сайта или null для всего подозрительного. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_LEN) return null;
  if (!raw.startsWith("/")) return null;
  // «//host» и «/\host» браузер трактует как абсолютный адрес.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  // Схемы, пробелы и управляющие символы — не путь.
  if (/[\s\u0000-\u001f\u007f]/.test(raw) || /^\/[^/?#]*:/.test(raw)) return null;
  return raw;
}

/** Добавить ?next= к пути входа/онбординга, если есть куда возвращать. */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = safeReturnPath(next);
  if (!safe) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}next=${encodeURIComponent(safe)}`;
}
