import "server-only";

import { redirect } from "next/navigation";

import { ApiError, isApiError } from "@/lib/api";
import type { Ctx } from "@/lib/endpoints";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side call context: the access token of the signed-in user.
 *
 * The proxy already redirected anonymous visitors away from protected routes,
 * so a missing session here means the session expired between the proxy and
 * this render. Server Components cannot write cookies, so there is nothing to
 * refresh — send the visitor back to /login rather than rendering an empty page.
 */
export async function serverCtx(): Promise<Ctx> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) redirect("/login");
  return { token: session.access_token, cache: "no-store" };
}

/**
 * Runs a server-side API call and turns an expired token into a redirect
 * instead of an error page. Every other failure is rethrown for `error.tsx`.
 */
export async function withAuth<T>(run: (ctx: Ctx) => Promise<T>): Promise<T> {
  const ctx = await serverCtx();
  try {
    return await run(ctx);
  } catch (err) {
    if (isApiError(err) && err.isUnauthorized) redirect("/login");
    throw err;
  }
}

/**
 * Like `withAuth`, but a failed call yields `fallback` instead of an error
 * page. For panels that are worth degrading rather than losing the whole
 * screen over — an unreachable backend should not hide the rest of the page.
 */
export async function withAuthOr<T>(fallback: T, run: (ctx: Ctx) => Promise<T>): Promise<T> {
  try {
    return await withAuth(run);
  } catch (err) {
    if (err instanceof ApiError) return fallback;
    throw err;
  }
}
