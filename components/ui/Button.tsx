import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "signal" | "ghost-dark" | "ghost-light" | "solid-light";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-600 " +
  "transition-[transform,background-color,box-shadow,border-color] duration-200 " +
  "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-14 px-7 text-base",
};

const variants: Record<Variant, string> = {
  signal:
    "bg-signal text-ink-3 hover:bg-[color:var(--color-signal-deep)] hover:text-white " +
    "shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--color-signal)_80%,transparent)]",
  "ghost-dark":
    "border border-[color:var(--color-edge)] text-white/90 hover:bg-white/5 " +
    "hover:border-white/25",
  "ghost-light":
    "border border-line text-graphite hover:bg-[color:var(--color-paper)]",
  "solid-light": "bg-graphite text-white hover:bg-black",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

export function Button({
  variant = "signal",
  size = "md",
  className = "",
  children,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "signal",
  size = "md",
  className = "",
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
