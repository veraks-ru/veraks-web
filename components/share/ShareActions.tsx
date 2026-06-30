"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShareCard } from "./ShareCard";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/app/AuthProvider";
import type { PredictionEvent } from "@/lib/types";

export function ShareActions({ event }: { event: PredictionEvent }) {
  const { me } = useAuth();
  const username = me?.username ?? "предсказатель";
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/events/${event.slug}`);
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [event.slug]);

  const shareText = `Мой прогноз на «${event.title}» — проверь свой на Вераксе`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Веракс", text: shareText, url });
      } else {
        await copy();
      }
    } catch {
      /* пользователь отменил — игнорируем */
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <ShareCard event={event} username={username} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {canShare && (
          <Button variant="signal" size="lg" className="flex-1" onClick={share}>
            <ShareIcon className="size-5" />
            Поделиться
          </Button>
        )}
        <Button
          variant={canShare ? "ghost-light" : "solid-light"}
          size="lg"
          className="flex-1"
          onClick={copy}
        >
          {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
        </Button>
      </div>

      <Link
        href={`/events/${event.slug}`}
        className="mt-4 block text-center text-sm font-600 text-slate hover:text-graphite"
      >
        ← Вернуться к событию
      </Link>
    </div>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v12m0-12 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
