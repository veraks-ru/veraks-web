import Link from "next/link";
import type { ApiStandingRow } from "@/lib/api/dto";

export function StandingsTable({
  rows,
  highlightUserId,
}: {
  rows: ApiStandingRow[];
  highlightUserId?: string | null;
}) {
  if (rows.length === 0) {
    return <p className="py-4 text-sm text-slate">Пока нет участников с рейтингом.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-slate uppercase">
            <th className="py-2 pr-3 font-600">#</th>
            <th className="py-2 pr-3 font-600">Предсказатель</th>
            <th className="py-2 pr-3 text-right font-600">Мастерство</th>
            <th className="py-2 text-right font-600">Brier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.user_id}
              className={`border-b border-line/60 ${
                highlightUserId === r.user_id ? "bg-paper" : ""
              }`}
            >
              <td className="py-2 pr-3 tnum font-700 text-[color:var(--color-signal-deep)]">
                {r.rank}
              </td>
              <td className="py-2 pr-3">
                <Link href={`/u/${r.username}`} className="font-500 hover:underline">
                  {r.display_name}
                </Link>
              </td>
              <td className="py-2 pr-3 text-right tnum">
                {r.skill_score != null ? Number(r.skill_score).toFixed(3) : "—"}
              </td>
              <td className="py-2 text-right tnum text-slate">
                {r.mean_brier != null ? Number(r.mean_brier).toFixed(3) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
