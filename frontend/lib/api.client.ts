"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { isApiError } from "@/lib/api";
import type { Ctx } from "@/lib/endpoints";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser call context. `getSession()` refreshes the token when it is close to
 * expiring, so a form left open for a while still submits with a live token.
 */
export async function clientCtx(signal?: AbortSignal): Promise<Ctx> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { token: session?.access_token ?? null, signal };
}

export type ApiCaller = <T>(run: (ctx: Ctx) => Promise<T>, signal?: AbortSignal) => Promise<T>;

/**
 * Runs authenticated calls from the browser and attaches the caller's token.
 *
 * A 401 means the session is gone for good — `clientCtx` refreshed it moments
 * earlier — so the route is refreshed, which re-runs it through the proxy and
 * lands the visitor on /login. The error is still rethrown so the calling form
 * stops and can leave its own state alone.
 */
export function useApi(): ApiCaller {
  const router = useRouter();

  return useCallback(
    async function call<T>(run: (ctx: Ctx) => Promise<T>, signal?: AbortSignal): Promise<T> {
      const ctx = await clientCtx(signal);
      try {
        return await run(ctx);
      } catch (err) {
        if (isApiError(err) && err.isUnauthorized) router.refresh();
        throw err;
      }
    },
    [router],
  );
}
