/**
 * Код приглашения, ожидающий активации.
 *
 * Между переходом по ссылке и появлением сессии человек успевает уйти в почту
 * и вернуться в новой вкладке, поэтому код переживает перезагрузку страницы.
 * Активирует его InviteRedeemer, как только сессия появится.
 */

const KEY = "veraks.invite";

/** Код из ссылки, ожидающий активации, либо null. */
export function pendingInvite(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    // Приватный режим или запрет хранилища — приглашение просто не сохранится.
    return null;
  }
}

export function rememberInvite(code: string): void {
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    /* см. выше */
  }
}

export function forgetInvite(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* см. выше */
  }
}
