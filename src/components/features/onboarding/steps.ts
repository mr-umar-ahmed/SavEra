import type { LucideIcon } from "lucide-react";
import { Gauge, History, Home, Plug, ScanLine, Sparkles } from "lucide-react";

/**
 * The six first-run steps of the citizen electricity portal, in order.
 * `index` in the rail is the array position; the onboarding store persists it as the draft step.
 */

export type OnboardingStepId = "welcome" | "household" | "appliances" | "bill" | "history" | "baseline";

export interface OnboardingStepMeta {
  id: OnboardingStepId;
  /** Rail label. */
  label: string;
  /** Short line under the rail label. */
  hint: string;
  icon: LucideIcon;
}

export const ONBOARDING_STEPS: readonly OnboardingStepMeta[] = [
  { id: "welcome", label: "Welcome", hint: "What setup unlocks", icon: Sparkles },
  { id: "household", label: "Household", hint: "People, home type, area", icon: Home },
  { id: "appliances", label: "Appliances", hint: "Quick picks & counts", icon: Plug },
  { id: "bill", label: "Latest bill", hint: "Photo or PDF, read for you", icon: ScanLine },
  { id: "history", label: "Older bills", hint: "Optional · seasonal baseline", icon: History },
  { id: "baseline", label: "Baseline", hint: "Your personalised result", icon: Gauge },
] as const;

export const STEP_COUNT = ONBOARDING_STEPS.length;

/** Rough end-to-end time shown in the rail ("~2 min"). */
export const ESTIMATED_MINUTES = 2;

export function clampStep(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(STEP_COUNT - 1, Math.max(0, Math.round(n)));
}

export function stepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}
