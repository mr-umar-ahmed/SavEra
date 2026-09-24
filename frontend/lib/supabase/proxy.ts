import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";

/** Routes reachable without a session. Everything else (including `/`) is protected. */
const PUBLIC_EXACT = new Set(["/login", "/signup", "/manifest.webmanifest"]);
const PUBLIC_PREFIXES = ["/auth/", "/icons/"];

/** Where a signed-in visitor to /login or /signup is sent instead. */
const HOME = "/";

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Accepts a `next` value only when it is an in-app path: starts with `/` and
 * a letter, never `//` or a scheme. Returns null for anything else, so callers
 * fall back to `/` and an open redirect is impossible.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!/^\/[a-z]/i.test(value)) return null;
  if (value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return null;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return value;
}

/**
 * Refreshes the Supabase session on every matched request and enforces the
 * public/protected split. Mirrors the official Next.js + @supabase/ssr
 * pattern: cookies written by a token refresh are set on both the forwarded
 * request (so Server Components see them) and the outgoing response.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not put logic between createServerClient and getClaims(): a refreshed
  // token must be written back before anything else reads the session.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const { pathname, search } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  if (!claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const next = safeNextPath(`${pathname}${search}`);
    if (next && next !== HOME) url.searchParams.set("next", next);
    return withCookies(NextResponse.redirect(url), response);
  }

  if (claims && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = HOME;
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }

  return response;
}

/** Carries any refreshed auth cookies over to a redirect response. */
function withCookies(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}
