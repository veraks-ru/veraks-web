import Link from "next/link";

/**
 * Логотип. Глиф — миниатюрная «дуга уверенности» с делениями и одной
 * светящейся точкой-показанием: сигнатура продукта в концентрате.
 */
export function Wordmark({
  tone = "dark",
  href = "/",
}: {
  tone?: "dark" | "light";
  href?: string;
}) {
  const text = tone === "dark" ? "text-white" : "text-graphite";
  const track =
    tone === "dark" ? "rgba(255,255,255,0.25)" : "rgba(20,23,28,0.18)";

  return (
    <Link
      href={href}
      aria-label="Веракс — на главную"
      className={`group inline-flex items-center gap-2.5 ${text}`}
    >
      <svg width="30" height="22" viewBox="0 0 30 22" fill="none" aria-hidden="true">
        <path
          d="M3 19 A12 12 0 0 1 27 19"
          stroke={track}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {[3, 8.6, 15, 21.4, 27].map((x, i) => (
          <circle key={i} cx={x} cy={i === 0 || i === 4 ? 19 : i === 2 ? 7 : 11.5} r="0.9" fill={track} />
        ))}
        <circle cx="21.4" cy="11.5" r="3" fill="var(--color-signal)" />
        <circle cx="21.4" cy="11.5" r="6" fill="var(--color-signal)" opacity="0.18" />
      </svg>
      <span className="font-display text-[1.05rem] font-600 tracking-[0.14em]">
        ВЕРАКС
      </span>
    </Link>
  );
}
