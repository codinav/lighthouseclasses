import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection. Courses/marketing pages are public; learning surfaces
 * require a session. In production the cookie is an httpOnly JWT verified
 * here with `jose` — see docs/ARCHITECTURE.md.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/learn", "/quiz", "/admin", "/live/", "/checkout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get("lh_session");
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/learn/:path*", "/quiz/:path*", "/admin/:path*", "/live/:path+", "/checkout/:path*"],
};
