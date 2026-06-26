import type { EventStatus } from "@/lib/types";
import { isClosingSoon } from "@/lib/format";

export function CategoryChip({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-paper px-2.5 py-1 text-xs font-600 tracking-wide text-slate">
      {title}
    </span>
  );
}

type Tone = "open" | "soon" | "resolving" | "yes" | "no" | "neutral";

const TONES: Record<Tone, string> = {
  open: "bg-[color:var(--color-signal)]/12 text-[color:var(--color-signal-deep)]",
  soon: "bg-[color:var(--color-warm)]/15 text-[#b56b1e]",
  resolving: "bg-[color:var(--color-cool)]/15 text-[#4654c4]",
  yes: "bg-[color:var(--color-warm)]/15 text-[#b56b1e]",
  no: "bg-[color:var(--color-cool)]/15 text-[#4654c4]",
  neutral: "bg-paper text-slate",
};

function Dot({ tone }: { tone: Tone }) {
  const c =
    tone === "open"
      ? "var(--color-signal)"
      : tone === "soon" || tone === "yes"
        ? "var(--color-warm)"
        : tone === "resolving" || tone === "no"
          ? "var(--color-cool)"
          : "var(--color-slate)";
  return <span className="size-1.5 rounded-full" style={{ background: c }} />;
}

export function StatusBadge({
  status,
  closesAt,
}: {
  status: EventStatus;
  closesAt?: string;
}) {
  let tone: Tone = "neutral";
  let label = "";

  if (status === "open") {
    if (closesAt && isClosingSoon(closesAt)) {
      tone = "soon";
      label = "Скоро закрытие";
    } else {
      tone = "open";
      label = "Открыто";
    }
  } else if (status === "closed" || status === "resolving") {
    tone = "resolving";
    label = "Идёт разрешение";
  } else if (status === "resolved") {
    tone = "neutral";
    label = "Разрешено";
  } else if (status === "disputed") {
    tone = "soon";
    label = "Оспорено";
  } else if (status === "annulled") {
    tone = "neutral";
    label = "Аннулировано";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-600 ${TONES[tone]}`}
    >
      <Dot tone={tone} />
      {label}
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-700 ${
        outcome ? TONES.yes : TONES.no
      }`}
    >
      Исход: {outcome ? "ДА" : "НЕТ"}
    </span>
  );
}
