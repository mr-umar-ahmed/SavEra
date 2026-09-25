"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session";
import { needsOnboarding, useOnboardingStore } from "@/stores/onboarding";
import { useHasMounted } from "@/components/hooks/useHasMounted";

export interface FirstRunGateOptions {
  /** Set `false` to disable the redirect (e.g. on the onboarding page itself). */
  enabled?: boolean;
  redirectTo?: string;
}

export interface FirstRunGateResult {
  mounted: boolean;
  /** `true` while the current citizen has never completed or skipped the first-run flow. */
  needsOnboarding: boolean;
  /** `true` once the page may render its real content. */
  ready: boolean;
}

/**
 * Redirects a first-time citizen to the guided setup (`/citizen/onboarding`).
 * Use on `/citizen/electricity`; render a skeleton while `ready` is `false`.
 */
export function useFirstRunGate(options: FirstRunGateOptions = {}): FirstRunGateResult {
  const { enabled = true, redirectTo = "/citizen/onboarding" } = options;
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const records = useOnboardingStore((s) => s.records);
  const mounted = useHasMounted();

  const needs = mounted && enabled && user?.role === "citizen" && needsOnboarding(records, user.id);

  useEffect(() => {
    if (needs) router.replace(redirectTo);
  }, [needs, redirectTo, router]);

  return { mounted, needsOnboarding: needs, ready: mounted && !needs };
}
