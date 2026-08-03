// Реестр юридических документов и парсер их текста (из content/legal/*.txt).
// Внутренние редакционные пометки «⚠ ТРЕБУЕТ ЮРИСТА …» в публичную версию не
// попадают.

export const LEGAL_DOCS = [
  { slug: "oferta", title: "Пользовательское соглашение (оферта)", short: "Оферта" },
  { slug: "reglament", title: "Регламент публичного конкурса", short: "Регламент конкурса" },
  { slug: "politika", title: "Политика разрешения событий и споров", short: "Разрешение споров" },
  { slug: "pdn", title: "Политика обработки персональных данных", short: "Персональные данные" },
] as const;

export type LegalSlug = (typeof LEGAL_DOCS)[number]["slug"];

/**
 * Сопоставление серверных ключей документа согласия (`missing_consents[].document`
 * из `GET /auth/me`, `POST /users/me/onboarding`) со слагами страниц `/legal/*`.
 * Бэкенд называет оферту "offer" (веб — "oferta"); "pdn" совпадает буквально.
 */
export const CONSENT_DOCUMENT_SLUGS: Record<string, LegalSlug> = {
  offer: "oferta",
  pdn: "pdn",
};

/** Короткое название документа согласия для UI (чекбоксы онбординга и т.п.). */
export function consentDocTitle(document: string): string {
  const slug = CONSENT_DOCUMENT_SLUGS[document];
  const doc = slug ? LEGAL_DOCS.find((d) => d.slug === slug) : undefined;
  return doc?.short ?? document;
}

export interface LegalBlock {
  t: "meta" | "h" | "p";
  text: string;
}

/** Разбор плоского текста документа в блоки (заголовки/пункты), без ⚠-пометок. */
export function parseLegal(raw: string): { title: string; blocks: LegalBlock[] } {
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const title = lines[0] ?? "";
  const blocks: LegalBlock[] = [];
  let skip = false; // пропуск блока «⚠ ТРЕБУЕТ ЮРИСТА …» до следующего пункта

  for (const line of lines.slice(1)) {
    if (line.startsWith("⚠")) {
      skip = true;
      continue;
    }
    const startsDigit = /^\d/.test(line);
    if (skip) {
      if (startsDigit) skip = false;
      else continue;
    }
    const isHeading = /^\d+\.\s+\S/.test(line) && !/^\d+\.\d/.test(line);
    if (isHeading) blocks.push({ t: "h", text: line });
    else if (!startsDigit && blocks.length === 0) blocks.push({ t: "meta", text: line });
    else blocks.push({ t: "p", text: line });
  }
  return { title, blocks };
}
