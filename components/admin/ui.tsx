"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-graphite " +
  "placeholder:text-slate/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export function Panel({
  title,
  desc,
  children,
  right,
}: {
  title?: string;
  desc?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6">
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-lg font-600">{title}</h2>}
            {desc && <p className="mt-0.5 text-sm text-slate">{desc}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-600 text-slate">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate/80">{hint}</span>}
    </label>
  );
}

/** Состояние и запуск асинхронного действия (мутации). */
export function useAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function run<T>(fn: () => Promise<T>, successMsg?: string): Promise<T | undefined> {
    setLoading(true);
    setError(null);
    setOkMsg(null);
    try {
      const r = await fn();
      if (successMsg) setOkMsg(successMsg);
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      return undefined;
    } finally {
      setLoading(false);
    }
  }
  return { loading, error, okMsg, run, setError, setOkMsg };
}

type BtnTone = "primary" | "ghost" | "danger";
const tones: Record<BtnTone, string> = {
  primary: "bg-graphite text-white hover:bg-black",
  ghost: "border border-line text-graphite hover:bg-paper",
  danger: "border border-[#e0746a] text-[#c2453a] hover:bg-[#e0746a]/10",
};

export function Btn({
  children,
  onClick,
  tone = "ghost",
  loading,
  disabled,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: BtnTone;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-600 transition-colors disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {loading ? <Spinner className="size-4" /> : children}
    </button>
  );
}

export function Notice({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (!error && !ok) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`mt-3 rounded-lg px-3 py-2 text-sm ${
        error
          ? "bg-[#e0746a]/10 text-[#c2453a]"
          : "bg-[color:var(--color-signal)]/12 text-[color:var(--color-signal-deep)]"
      }`}
    >
      {error ?? ok}
    </p>
  );
}
