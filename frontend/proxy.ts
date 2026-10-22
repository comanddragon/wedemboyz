import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "./src/i18n/config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  if (isLocale(segment)) {
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", segment, { path: "/", maxAge: 31_536_000, sameSite: "lax" });
    return response;
  }
  const saved = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = saved && isLocale(saved) ? saved : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"] };
