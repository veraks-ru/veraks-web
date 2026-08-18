/** Чем закончилось действие «поделиться». */
export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * Отдать ссылку пользователю: системным окном или копированием в буфер.
 *
 * Системное окно вызываем только на устройствах с сенсорным вводом. На
 * десктопе ``navigator.share`` существует (Chrome его объявляет), но окно
 * может не открыться или мгновенно закрыться — а раз ветка выбрана, до
 * копирования дело уже не доходило, и нажатие выглядело как «ничего не
 * произошло». Копирование предсказуемо везде, поэтому оно и основной путь.
 */
export async function shareLink(data: {
  url: string;
  title?: string;
  text?: string;
}): Promise<ShareOutcome> {
  const { url, title, text } = data;

  const sheetFits =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    navigator.maxTouchPoints > 0;

  if (sheetFits) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch {
      // Отменили или окно не открылось — не оставляем человека ни с чем,
      // а копируем ссылку: нажатие должно давать результат.
    }
  }

  return (await copyToClipboard(url)) ? "copied" : "failed";
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Clipboard API отказывает без защищённого контекста и в части
    // мобильных браузеров — тогда старый способ через скрытое поле.
    return copyViaHiddenField(value);
  }
}

function copyViaHiddenField(value: string): boolean {
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    // Вне экрана, но в документе: невидимое поле не выделяется.
    field.style.position = "fixed";
    field.style.top = "-1000px";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  } catch {
    return false;
  }
}
