import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";

/**
 * Server-side Supabase client for Server Components, Server Actions and
 * Route Handlers. A fresh client is created per call (never share one across
 * requests). `setAll` is wrapped in try/catch because Server Components cannot
 * write cookies; the proxy (`lib/supabase/proxy.ts`) refreshes sessions there.
 */
export async function createClient() {
  const store = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only here and the
          // proxy already refreshed the session for this request.
        }
      },
    },
  });
}
