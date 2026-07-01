"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/app/TopNav";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/components/app/AuthProvider";
import { Btn, Notice, inputCls, useAction } from "@/components/admin/ui";
import { createApiKey, getMyApiKeys, revokeApiKey } from "@/lib/api/endpoints";
import type { ApiApiKey } from "@/lib/api/dto";
import { fmtDate } from "@/lib/format";

export default function B2bPage() {
  const { me, loading: authLoading } = useAuth();
  const [keys, setKeys] = useState<ApiApiKey[] | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const load = () => getMyApiKeys().then((k) => setKeys(k ?? []));
  useEffect(() => {
    if (authLoading) return;
    if (!me) {
      setKeys([]);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, authLoading]);

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Signal API</h1>
        <p className="mt-1 text-sm text-slate">
          Программный доступ к сигналам платформы: консенсус толпы, рейтинги
          предсказателей и лента событий. Аутентификация — по API-ключу.
        </p>

        {authLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7 text-[color:var(--color-signal-deep)]" />
          </div>
        ) : !me ? (
          <p className="mt-8 text-sm text-slate">
            <Link href="/join" className="font-600 text-[color:var(--color-signal-deep)]">
              Войдите
            </Link>
            , чтобы получить ключ.
          </p>
        ) : (
          <>
            <CreateForm onIssued={(s) => { setSecret(s); load(); }} />
            {secret && <SecretReveal secret={secret} onClose={() => setSecret(null)} />}

            <section className="mt-8">
              <h2 className="mb-3 text-sm font-600">Мои ключи</h2>
              {keys === null ? (
                <p className="text-sm text-slate">Загрузка…</p>
              ) : keys.length === 0 ? (
                <p className="text-sm text-slate">Пока нет ключей — создайте первый выше.</p>
              ) : (
                <ul className="space-y-3">
                  {keys.map((k) => (
                    <KeyRow key={k.id} apiKey={k} onChanged={load} />
                  ))}
                </ul>
              )}
            </section>

            <Reference />
          </>
        )}
      </main>
    </div>
  );
}

function CreateForm({ onIssued }: { onIssued: (secret: string) => void }) {
  const [name, setName] = useState("");
  const act = useAction();
  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="mb-3 text-sm font-600">Создать ключ</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${inputCls} max-w-xs flex-1`}
          placeholder="Название (напр. «Аналитика»)"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
        <Btn
          tone="primary"
          loading={act.loading}
          onClick={async () => {
            if (!name.trim()) return;
            const r = await act.run(() => createApiKey(name.trim()), "Ключ создан");
            if (r) {
              setName("");
              onIssued(r.secret);
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

function SecretReveal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 rounded-[var(--radius-card)] border border-[#e0b45c] bg-[#fbf4e3] p-4">
      <p className="text-sm font-600">Скопируйте секрет — он показывается только сейчас</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-sm">
          {secret}
        </code>
        <Btn
          tone="ghost"
          onClick={() => {
            navigator.clipboard?.writeText(secret);
            setCopied(true);
          }}
        >
          {copied ? "Скопировано" : "Копировать"}
        </Btn>
        <Btn tone="ghost" onClick={onClose}>Скрыть</Btn>
      </div>
    </div>
  );
}

function KeyRow({ apiKey, onChanged }: { apiKey: ApiApiKey; onChanged: () => void }) {
  const act = useAction();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div>
        <p className="font-600">{apiKey.name}</p>
        <p className="text-xs text-slate">
          <span className="font-mono">{apiKey.key_prefix}…</span> · квота{" "}
          {apiKey.daily_quota}/сут · создан {fmtDate(apiKey.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {apiKey.is_active ? (
          <Btn
            tone="danger"
            loading={act.loading}
            onClick={async () => {
              const r = await act.run(() => revokeApiKey(apiKey.id), "Отозван");
              if (r !== undefined) onChanged();
            }}
          >
            Отозвать
          </Btn>
        ) : (
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-600 text-slate">
            Отозван
          </span>
        )}
      </div>
    </li>
  );
}

function Reference() {
  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="text-sm font-600">Как использовать</p>
      <p className="mt-1 text-xs text-slate">
        Передавайте ключ в заголовке <code className="font-mono">X-API-Key</code>.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-paper p-3 text-xs leading-relaxed">
        <code>{`curl -H "X-API-Key: <ваш ключ>" \\
  ${apiBase()}/v1/signals/leaderboard?scope=global&limit=10

GET /v1/signals/consensus/{event_id}
GET /v1/signals/leaderboard?scope=global|category|season&scope_id=...
GET /v1/signals/events?status=open|resolved`}</code>
      </pre>
    </section>
  );
}

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "https://api.veraks";
}
