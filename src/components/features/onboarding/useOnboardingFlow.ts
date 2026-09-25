"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSessionStore } from "@/stores/session";
import { useDataStore } from "@/stores/data";
import { useOnboardingStore, type OnboardingOutcome } from "@/stores/onboarding";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useHasMounted } from "@/components/hooks/useHasMounted";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import type { Household, User } from "@/types";
import { ONBOARDING_STEPS, clampStep } from "./steps";

/** What the flow learned about the household; written to the onboarding record on completion. */
export interface OnboardingSummary {
  householdSaved: boolean;
  billUploaded: boolean;
  previousBills: number;
  applianceCount: number;
}

export type FinishTarget = "dashboard" | "appliances" | "scan";

const FINISH_ROUTES: Record<FinishTarget, string> = {
  dashboard: "/citizen/electricity",
  appliances: "/citizen/setup/electricity",
  scan: "/citizen/scan",
};

const EMPTY_SUMMARY: OnboardingSummary = {
  householdSaved: false,
  billUploaded: false,
  previousBills: 0,
  applianceCount: 0,
};

export interface OnboardingFlowState {
  /** `true` once the client mounted, the household exists and the draft step was restored. */
  ready: boolean;
  user: User | null;
  household?: Household;
  demoNow: string;
  firstName: string;
  /** Current step index (0–5); `null` until restored from the draft. */
  step: number | null;
  /** +1 when moving forward, −1 when moving back (drives the slide direction). */
  direction: 1 | -1;
  summary: OnboardingSummary;
  /** `true` when this user already completed or skipped the flow before. */
  alreadyDone: boolean;
  previousOutcome?: OnboardingOutcome;
  goTo(step: number): void;
  next(): void;
  back(): void;
  patchSummary(patch: Partial<OnboardingSummary>): void;
  /** Records completion, updates the electricity section status and routes onward. */
  finish(target?: FinishTarget): void;
  /** "Skip setup — explore with demo data". */
  skipAll(): void;
}

/**
 * State machine for the first-run guided setup. Progress is persisted per user
 * (`useOnboardingStore.drafts`) so a refresh resumes at the same step.
 */
export function useOnboardingFlow(): OnboardingFlowState {
  const router = useRouter();
  const mounted = useHasMounted();
  const reducedMotion = useReducedMotion();

  const user = useSessionStore((s) => s.user);
  const demoNow = useSessionStore((s) => s.demoNow);
  const { household } = useCurrentHousehold();

  const records = useOnboardingStore((s) => s.records);
  const drafts = useOnboardingStore((s) => s.drafts);
  const setDraftStep = useOnboardingStore((s) => s.setDraftStep);
  const completeRecord = useOnboardingStore((s) => s.complete);
  const skipRecord = useOnboardingStore((s) => s.skip);
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);

  const userId = user?.id ?? null;

  const [step, setStep] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [summary, setSummary] = useState<OnboardingSummary>(EMPTY_SUMMARY);
  /** Set while routing away after finish/skip so the "already set up" banner does not flash. */
  const [leaving, setLeaving] = useState(false);

  const stepRef = useRef<number | null>(null);
  stepRef.current = step;

  // Restore the draft step once per user (also when the header role switcher swaps accounts).
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!mounted || !userId) return;
    if (restoredFor.current === userId) return;
    restoredFor.current = userId;
    setStep(clampStep(drafts[userId] ?? 0));
    setSummary(EMPTY_SUMMARY);
  }, [mounted, userId, drafts]);

  const goTo = useCallback(
    (target: number) => {
      const next = clampStep(target);
      const current = stepRef.current ?? 0;
      setDirection(next >= current ? 1 : -1);
      setStep(next);
      if (userId) setDraftStep(userId, next);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }
    },
    [reducedMotion, setDraftStep, userId],
  );

  const next = useCallback(() => goTo((stepRef.current ?? 0) + 1), [goTo]);
  const back = useCallback(() => goTo((stepRef.current ?? 0) - 1), [goTo]);

  const patchSummary = useCallback((patch: Partial<OnboardingSummary>) => {
    setSummary((prev) => ({ ...prev, ...patch }));
  }, []);

  const finish = useCallback(
    (target: FinishTarget = "dashboard") => {
      if (!userId) return;
      setLeaving(true);
      completeRecord(userId, summary);
      if (household && (summary.billUploaded || summary.applianceCount > 0)) {
        setSectionStatus(household.id, "electricity", summary.billUploaded ? "complete" : "partial");
      }
      toast.success("Personalised baseline established!", {
        description: `${household?.id ?? "Your home"} is set up — every figure on the dashboard is labelled estimated or measured.`,
      });
      router.push(FINISH_ROUTES[target]);
    },
    [completeRecord, household, router, setSectionStatus, summary, userId],
  );

  const skipAll = useCallback(() => {
    if (!userId) return;
    setLeaving(true);
    skipRecord(userId);
    toast.info("Exploring with demo data", {
      description: `${household?.id ?? "Your home"} keeps its seeded bills and appliance profile. Reset Demo brings this setup back.`,
    });
    router.push(FINISH_ROUTES.dashboard);
  }, [household?.id, router, skipRecord, userId]);

  const record = userId ? records[userId] : undefined;
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "there";

  return {
    ready: mounted && step !== null && !!household,
    user,
    household,
    demoNow,
    firstName,
    step,
    direction,
    summary,
    alreadyDone: !!record && !leaving,
    previousOutcome: record?.outcome,
    goTo,
    next,
    back,
    patchSummary,
    finish,
    skipAll,
  };
}

export { ONBOARDING_STEPS };
