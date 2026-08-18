"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/app/AuthProvider";
import { redeemInvite } from "@/lib/api/endpoints";
import { forgetInvite, pendingInvite } from "@/lib/invite";

/**
 * Активирует приглашение, как только у человека появилась сессия.
 *
 * Отдельным шагом после входа, а не при регистрации: identity ничего не знает
 * про подписки и знать не должен. Код из ссылки хранится на клиенте и
 * предъявляется, когда сессия готова.
 *
 * Код забываем при любом исходе, кроме сетевого сбоя: чужая или уже
 * использованная ссылка иначе дёргала бы бэкенд при каждой загрузке.
 */
export function InviteRedeemer() {
  const { me } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (!me || done.current) return;
    const code = pendingInvite();
    if (!code) return;

    done.current = true;
    redeemInvite(code)
      .then(() => forgetInvite())
      .catch(() => {
        // Сеть могла отвалиться — оставляем код на следующую попытку.
        done.current = false;
      });
  }, [me]);

  return null;
}
