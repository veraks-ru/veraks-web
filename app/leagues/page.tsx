"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/AsyncStates";
import { useAuth } from "@/components/app/AuthProvider";
import { Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import {
  createLeague,
  joinLeague,
  getMyLeagues,
  getLeagueStandings,
  leaveLeague,
} from "@/lib/api/endpoints";
import type { ApiLeague, ApiLeagueStandings } from "@/lib/api/dto";
import { StandingsTable } from "@/components/leagues/StandingsTable";

export default function LeaguesPage() {
  const { me, loading: authLoading } = useAuth();
  const [leagues, setLeagues] = useState<ApiLeague[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = () => {
    setError(false);
    return getMyLeagues()
      .then((l) => setLeagues(l ?? []))
      .catch(() => setError(true));
  };
  useEffect(() => {
    if (authLoading) return;
    if (!me) {
      setLeagues([]);
      return;
    }
    load();
  }, [me, authLoading]);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="/leagues" />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Лиги</h1>
        <p className="mt-1 text-sm text-slate">
          Приватные лиги с друзьями — свой лидерборд по мастерству.
        </p>

        {authLoading ? (
          <LoadingState />
        ) : !me ? (
          <p className="mt-8 text-sm text-slate">
            <Link href="/join" className="font-600 text-[color:var(--color-signal-deep)]">
              Войдите
            </Link>
            , чтобы создавать лиги и вступать в них.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <CreateForm onDone={load} />
              <JoinForm onDone={load} />
            </div>

            <section className="mt-8">
              <h2 className="mb-3 text-sm font-600">Мои лиги</h2>
              {error ? (
                <ErrorState onRetry={load} className="py-10" />
              ) : leagues === null ? (
                <LoadingState className="py-10" />
              ) : leagues.length === 0 ? (
                <EmptyState
                  title="Пока нет лиг"
                  hint="Создайте свою или вступите по коду."
                  className="py-10"
                />
              ) : (
                <ul className="space-y-3">
                  {leagues.map((l) => (
                    <LeagueCard
                      key={l.id}
                      league={l}
                      open={selected === l.id}
                      onToggle={() => setSelected(selected === l.id ? null : l.id)}
                      onLeft={load}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const act = useAction();
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="mb-3 text-sm font-600">Создать лигу</p>
      <input
        className={inputCls}
        placeholder="Название лиги"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <Btn
          tone="primary"
          loading={act.loading}
          onClick={async () => {
            if (!name.trim()) return;
            const r = await act.run(() => createLeague(name.trim()), "Лига создана");
            if (r) {
              setName("");
              onDone();
            }
          }}
        >
          Создать
        </Btn>
        <Notice error={act.error} ok={act.okMsg} />
      </div>
    </div>
  );
}

function JoinForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const act = useAction();
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="mb-3 text-sm font-600">Вступить по коду</p>
      <input
        className={`${inputCls} uppercase`}
        placeholder="Код приглашения"
        value={code}
        maxLength={32}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <Btn
          tone="primary"
          loading={act.loading}
          onClick={async () => {
            if (!code.trim()) return;
            const r = await act.run(() => joinLeague(code.trim()), "Вы вступили");
            if (r) {
              setCode("");
              onDone();
            } else if (!act.error) {
              act.setError("Лига по коду не найдена");
            }
          }}
        >
          Вступить
        </Btn>
        <Notice error={act.error} ok={act.okMsg} />
      </div>
    </div>
  );
}

function LeagueCard({
  league,
  open,
  onToggle,
  onLeft,
}: {
  league: ApiLeague;
  open: boolean;
  onToggle: () => void;
  onLeft: () => void;
}) {
  const [standings, setStandings] = useState<ApiLeagueStandings | null | undefined>(undefined);
  const [stErr, setStErr] = useState(false);
  const act = useAction();

  const loadStandings = () => {
    setStErr(false);
    setStandings(undefined);
    getLeagueStandings(league.id)
      .then((s) => setStandings(s ?? null))
      .catch(() => setStErr(true));
  };

  useEffect(() => {
    if (open && standings === undefined && !stErr) loadStandings();
    // standings/stErr читаются только чтобы не перезапрашивать уже
    // загруженное/зафейленное — в deps их не кладём: loadStandings() сама их
    // сбрасывает (setStandings(undefined), setStErr(false)), и если бы они
    // были в deps, это перезапускало бы эффект вторым запросом на каждый клик
    // «Повторить» (и на каждую успешную загрузку).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, league.id]);

  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-600">{league.name}</p>
          <p className="text-xs text-slate">
            {league.members != null ? `${league.members} участников · ` : ""}код{" "}
            <span className="font-mono tracking-wide text-graphite">{league.invite_code}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn tone="ghost" onClick={onToggle}>
            {open ? "Свернуть" : "Лидерборд"}
          </Btn>
          <Btn
            tone="danger"
            loading={act.loading}
            onClick={async () => {
              const r = await act.run(() => leaveLeague(league.id), "Вы вышли");
              if (r !== undefined) onLeft();
            }}
          >
            Выйти
          </Btn>
        </div>
      </div>
      {open && (
        <div className="mt-4">
          {stErr ? (
            <ErrorState onRetry={loadStandings} className="py-6" bare />
          ) : standings === undefined ? (
            <LoadingState className="py-6" />
          ) : standings === null ? (
            <p className="text-sm text-slate">Лидерборд лиги недоступен.</p>
          ) : (
            <StandingsTable rows={standings.rows} />
          )}
        </div>
      )}
    </li>
  );
}
