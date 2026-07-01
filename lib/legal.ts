// Реестр юридических документов и парсер их текста (из content/legal/*.txt).
// Внутренние редакционные пометки «⚠ ТРЕБУЕТ ЮРИСТА …» в публичную версию не
// попадают.

export const LEGAL_DOCS = [
  { slug: "oferta", title: "Пользовательское соглашение (оферта)", short: "Оферта" },
  { slug: "reglament", title: "Регламент публичного конкурса", short: "Регламент конкурса" },
  { slug: "politika", title: "Политика разрешения событий и споров", short: "Разрешение споров" },
] as const;

export type LegalSlug = (typeof LEGAL_DOCS)[number]["slug"];

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
