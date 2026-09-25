"use client";

import { OnboardingFlow } from "@/components/features/onboarding/OnboardingFlow";

/**
 * First-run guided setup for the citizen electricity portal.
 * `useFirstRunGate` on `/citizen/electricity` sends first-time citizens here; the flow itself
 * never blocks — every step can be skipped and "Skip setup" routes straight to the dashboard.
 */
export default function CitizenOnboardingPage() {
  return <OnboardingFlow />;
}
