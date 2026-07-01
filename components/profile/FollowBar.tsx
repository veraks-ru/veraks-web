"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/app/AuthProvider";
import {
  getSocialStats,
  getMyFollowing,
  followUser,
  unfollowUser,
} from "@/lib/api/endpoints";

export function FollowBar({ username }: { username: string }) {
  const { me } = useAuth();
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSelf = me?.username === username;
  const canFollow = !!me && !isSelf;

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
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <span className="text-sm text-slate">
        <b className="tnum text-graphite">{followers ?? "—"}</b> читателей ·{" "}
        <b className="tnum text-graphite">{following}</b> подписок
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
  );
}
