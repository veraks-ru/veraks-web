"use client";

import { BottomNav, useBottomNavVisible } from "@/components/app/BottomNav";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { ServiceWorkerRegistrar } from "@/components/app/ServiceWorkerRegistrar";

/**
 * Оболочка мобильного приложения поверх страниц.
 *
 * Отступ снизу задаётся здесь, а не в каждой странице: панель зафиксирована,
 * и без запаса последняя строка контента уезжает под неё — на «Лидербордах»
 * это прятало бы как раз закреплённую строку «вы».
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const navVisible = useBottomNavVisible();

  return (
    <>
      <div
        className={
          navVisible
            ? "pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0"
            : undefined
        }
      >
        {children}
      </div>
      <BottomNav />
      <InstallPrompt />
      <ServiceWorkerRegistrar />
    </>
  );
}
