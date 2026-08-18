"use client";

import { useEffect, useState } from "react";
import { Panel, Field, Btn, Notice, useAction, inputCls } from "@/components/admin/ui";
import { Spinner } from "@/components/ui/Spinner";
import { createInvite, listInvites, revokeInvite } from "@/lib/api/admin";
import { shareOrigin } from "@/lib/shareUrl";
import type { ApiInvite } from "@/lib/api/dto";

/** Пресеты срока: слова, которыми о доступе думают, а не число дней. */
const TERMS = [
  { id: "forever", label: "Навсегда", days: null },
  { id: "week", label: "Неделя", days: 7 },
  { id: "month", label: "Месяц", days: 30 },
  { id: "year", label: "Год", days: 365 },
] as const;

type TermId = (typeof TERMS)[number]["id"];

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<ApiInvite[] | null>(null);
  const [term, setTerm] = useState<TermId>("month");
  const [note, setNote] = useState("");
  const [justCreated, setJustCreated] = useState<ApiInvite | null>(null);
  const create = useAction();
  const revoke = useAction();

  async function reload() {
    setInvites((await listInvites()) ?? []);
  }

  useEffect(() => {
    reload().catch(() => setInvites([]));
  }, []);

  async function submit() {
    const days = TERMS.find((t) => t.id === term)?.days ?? null;
    const invite = await create.run(
      () => createInvite({ duration_days: days, note: note.trim() }),
      "Ссылка создана",
    );
    if (!invite) return;
    setJustCreated(invite);
    setNote("");
    await reload();
  }

  async function drop(id: string) {
    const done = await revoke.run(() => revokeInvite(id), "Ссылка отозвана");
    if (done) await reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-600 sm:text-3xl">Приглашения</h1>
        <p className="mt-1.5 text-sm text-slate">
          Одноразовая ссылка даёт человеку право участвовать без подписки. Когда срок
          выйдет, продлевать доступ он будет уже за деньги.
        </p>
      </div>

      <Panel title="Новая ссылка" desc="Каждая ссылка срабатывает один раз.">
        <div className="space-y-4">
          <Field label="Доступ" hint="Срок считается с момента, когда человек перейдёт по ссылке.">
            <div className="flex flex-wrap gap-2">
              {TERMS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTerm(t.id)}
                  className={
                    "h-9 rounded-full border px-4 text-sm font-600 transition-colors " +
                    (term === t.id
                      ? "border-graphite bg-graphite text-white"
                      : "border-line text-graphite hover:bg-paper")
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Пометка" hint="Для кого эта ссылка — видно только в этом списке.">
            <input
              className={inputCls}
              value={note}
              maxLength={200}
              placeholder="Например: канал в телеграме"
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-3">
            <Btn tone="primary" onClick={submit} loading={create.loading}>
              Создать ссылку
            </Btn>
            <Notice error={create.error} ok={create.okMsg} />
          </div>
        </div>

        {justCreated && <FreshLink invite={justCreated} />}
      </Panel>

      <Panel
        title="Выданные"
        desc="Использованные ссылки остаются в списке — видно, кто по ним пришёл."
        right={<Notice error={revoke.error} ok={revoke.okMsg} />}
      >
        {invites === null ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : invites.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate">Ссылок пока нет.</p>
        ) : (
          <ul className="divide-y divide-line">
            {invites.map((invite) => (
              <InviteRow key={invite.id} invite={invite} onRevoke={() => drop(invite.id)} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** Только что созданная ссылка — крупно и с копированием: за этим и пришли. */
function FreshLink({ invite }: { invite: ApiInvite }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(invite.code);

  async function copy() {
    const { shareLink } = await import("@/lib/share");
    if ((await shareLink({ url: link })) !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-5 rounded-xl border border-signal/40 bg-signal/5 p-4">
      <p className="text-xs font-600 text-slate">Ссылка готова — отправьте её человеку</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 text-sm">
          {link}
        </code>
        <Btn tone="primary" onClick={copy}>
          {copied ? "Скопировано" : "Скопировать"}
        </Btn>
      </div>
      <p className="mt-2 text-xs text-slate">{termLabel(invite)}</p>
    </div>
  );
}

function InviteRow({ invite, onRevoke }: { invite: ApiInvite; onRevoke: () => void }) {
  const state = inviteState(invite);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-mono text-sm">{invite.code}</p>
        <p className="mt-0.5 text-xs text-slate">
          {termLabel(invite)}
          {invite.note && ` · ${invite.note}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-600 " +
            (state.tone === "used"
              ? "bg-signal/15 text-[color:var(--color-signal-deep)]"
              : state.tone === "revoked"
                ? "bg-paper text-slate"
                : "border border-line text-graphite")
          }
        >
          {state.label}
        </span>
        {state.tone === "open" && (
          <Btn tone="danger" onClick={onRevoke}>
            Отозвать
          </Btn>
        )}
      </div>
    </li>
  );
}

function inviteLink(code: string): string {
  // Тот же адрес, что и у ссылок «поделиться»: приглашение чаще всего уходит
  // в мессенджер, где превью берётся с зеркала.
  return `${shareOrigin()}/join?invite=${code}`;
}

function termLabel(invite: ApiInvite): string {
  if (invite.duration_days === null) return "Доступ навсегда";
  const preset = TERMS.find((t) => t.days === invite.duration_days);
  return preset ? `Доступ на ${preset.label.toLowerCase()}` : `Доступ на ${invite.duration_days} дн.`;
}

function inviteState(invite: ApiInvite): { label: string; tone: "used" | "revoked" | "open" } {
  if (invite.redeemed_at) {
    return { label: `Использована ${formatDate(invite.redeemed_at)}`, tone: "used" };
  }
  if (invite.revoked_at) return { label: "Отозвана", tone: "revoked" };
  return { label: "Ждёт", tone: "open" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
