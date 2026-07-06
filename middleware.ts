import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Первый барьер для /admin/*: без сессионной cookie — сразу на /join, не
// раскрывая админ-оболочку. Это НЕ авторизация: роль всё равно проверяется на
// бэкенде и в app/admin/layout.tsx. httpOnly access-cookie доступна на всех
// путях (refresh ограничен /auth), поэтому её наличие — самый ранний сигнал.
export function middleware(request: NextRequest) {
  if (!request.cookies.has("access_token")) {
    const url = request.nextUrl.clone();
    url.pathname = "/join";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
