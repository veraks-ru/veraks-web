"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/app/AuthProvider";
import { Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { listComments, postComment, deleteComment } from "@/lib/api/endpoints";
import type { ApiComment } from "@/lib/api/dto";
import { fmtDate } from "@/lib/format";

export function EventComments({ eventId }: { eventId: string }) {
  const { me } = useAuth();
  const [comments, setComments] = useState<ApiComment[] | null>(null);
  const [body, setBody] = useState("");
  const act = useAction();
  const isModerator = me?.role === "admin" || me?.role === "editor" || me?.role === "arbiter";

  const load = () =>
    listComments(eventId)
      .then((c) => setComments(c ?? []))
      .catch(() => setComments([]));
  useEffect(() => {
    let alive = true;
    listComments(eventId)
      .then((c) => {
        if (alive) setComments(c ?? []);
      })
      .catch(() => {
        if (alive) setComments([]);
      });
    return () => {
      alive = false;
    };
  }, [eventId]);

  async function submit() {
    if (!body.trim()) return;
    const r = await act.run(() => postComment(eventId, body.trim()), "Отправлено");
    if (r) {
      setBody("");
      load();
    }
  }

  async function remove(id: string) {
    const r = await act.run(() => deleteComment(id), "Удалено");
    if (r !== undefined) load();
  }

  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <p className="mb-4 text-sm font-600">
        Обсуждение{comments ? ` · ${comments.length}` : ""}
      </p>

      {me ? (
        <div className="mb-5">
          <textarea
            className={`${inputCls} min-h-[4.5rem]`}
            placeholder="Что думаете об исходе?"
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-3">
            <Btn tone="primary" loading={act.loading} onClick={submit}>
              Отправить
            </Btn>
            <Notice error={act.error} ok={act.okMsg} />
          </div>
        </div>
      ) : (
        <p className="mb-5 text-sm text-slate">
          <Link href="/join" className="font-600 text-[color:var(--color-signal-deep)]">
            Войдите
          </Link>
          , чтобы комментировать.
        </p>
      )}

      {comments === null ? (
        <p className="py-2 text-sm text-slate">Загрузка…</p>
      ) : comments.length === 0 ? (
        <p className="py-2 text-sm text-slate">Пока нет комментариев — будьте первым.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const canDelete = me && (c.author?.user_id === me.id || isModerator);
            return (
              <li key={c.id} className="border-b border-line/60 pb-3 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm">
                    {c.author ? (
                      <Link
                        href={`/u/${c.author.username}`}
                        className="font-600 hover:text-[color:var(--color-signal-deep)]"
                      >
                        {c.author.display_name}
                      </Link>
                    ) : (
                      <span className="font-600 text-slate">Участник</span>
                    )}
                    <span className="ml-2 text-xs text-slate">{fmtDate(c.created_at)}</span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => remove(c.id)}
                      className="text-xs text-slate hover:text-[color:var(--color-danger)]"
                    >
                      удалить
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap text-graphite">{c.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
