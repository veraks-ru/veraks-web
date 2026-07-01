"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/app/AuthProvider";
import Link from "next/link";
import {
  getSocialStats,
  getMyFollowing,
  getMyFollowers,
  followUser,
  unfollowUser,
} from "@/lib/api/endpoints";
import type { ApiUserRef } from "@/lib/api/dto";

export function FollowBar({ username }: { username: string }) {
  const { me } = useAuth();
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSelf = me?.username === username;
  const canFollow = !!me && !isSelf;
  const [panel, setPanel] = useState<"followers" | "following" | null>(null);
  const [list, setList] = useState<ApiUserRef[] | null>(null);

  async function openPanel(which: "followers" | "following") {
    if (panel === which) { setPanel(null); return; }
    setPanel(which);
    setList(null);
    const data = which === "followers" ? await getMyFollowers() : await getMyFollowing();
    setList(data ?? []);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const stats = await getSocialStats(username);
      if (!alive) return;
      if (stats) {
        setFollowers(stats.followers);
        setFollowing(stats.following);
      }
      if (me && me.username !== username) {
        const mine = await getMyFollowing();
        if (alive && mine) setIsFollowing(mine.some((u) => u.username === username));
      }
    })();
    return () => {
      alive = false;
    };
  }, [username, me]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowers((n) => (n ?? 0) + (next ? 1 : -1));
    try {
      if (next) await followUser(username);
      else await unfollowUser(username);
    } catch {
      // откат при ошибке
      setIsFollowing(!next);
      setFollowers((n) => (n ?? 0) + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate">
          {isSelf ? (
            <>
              <button className="hover:text-graphite" onClick={() => openPanel("followers")}>
                <b className="tnum text-graphite">{followers ?? "—"}</b> читателей
              </button>{" "}
              ·{" "}
              <button className="hover:text-graphite" onClick={() => openPanel("following")}>
                <b className="tnum text-graphite">{following}</b> подписок
              </button>
            </>
          ) : (
            <>
              <b className="tnum text-graphite">{followers ?? "—"}</b> читателей ·{" "}
              <b className="tnum text-graphite">{following}</b> подписок
            </>
          )}
        </span>
        {canFollow && (
          <button
            onClick={toggle}
            disabled={busy}
            className={`rounded-full px-4 py-1.5 text-sm font-600 transition ${
              isFollowing
                ? "border border-line text-graphite hover:bg-paper"
                : "bg-graphite text-white hover:bg-black"
            } disabled:opacity-60`}
          >
            {isFollowing ? "Вы читаете" : "Читать"}
          </button>
        )}
      </div>

      {isSelf && panel && (
        <div className="mt-2 max-w-sm rounded-xl border border-line bg-surface p-3">
          <p className="mb-2 text-xs font-600 text-slate uppercase">
            {panel === "followers" ? "Читатели" : "Подписки"}
          </p>
          {list === null ? (
            <p className="text-sm text-slate">Загрузка…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate">Пусто.</p>
          ) : (
            <ul className="space-y-1">
              {list.map((u) => (
                <li key={u.user_id}>
                  <Link href={`/u/${u.username}`} className="text-sm font-500 hover:underline">
                    {u.display_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
