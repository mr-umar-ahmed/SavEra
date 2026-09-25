"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { useDataStore } from "@/stores/data";
import { currentMonth } from "@/lib/dates";
import type { ApplianceType, ElectricityBill } from "@/types";
import { ONBOARDING_STEPS, STEP_COUNT } from "./steps";
import { useOnboardingFlow } from "./useOnboardingFlow";
import { OnboardingRail } from "./OnboardingRail";
import { OnboardingSkeleton } from "./StepShell";
import { WelcomeStep } from "./WelcomeStep";
import { HouseholdStep } from "./HouseholdStep";
import { ApplianceStep } from "./ApplianceStep";
import { BillStep } from "./BillStep";
import { HistoryStep } from "./HistoryStep";
import { BaselineStep } from "./BaselineStep";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Vertical slide keeps the page free of horizontal overflow at 375 px. */
const STEP_VARIANTS = {
  enter: (direction: number) => ({ opacity: 0, y: 20 * direction }),
  center: { opacity: 1, y: 0 },
  exit: (direction: number) => ({ opacity: 0, y: -16 * direction }),
};

/**
 * First-run guided setup for the citizen electricity portal (`/citizen/onboarding`).
 * Rail + animated step panel; every step can be skipped; progress resumes after a refresh.
 */
export function OnboardingFlow() {
  const flow = useOnboardingFlow();
  const reducedMotion = useReducedMotion();
  const appliances = useDataStore((s) => s.appliances);
  const bills = useDataStore((s) => s.bills);
  const areas = useDataStore((s) => s.areas);
  const wards = useDataStore((s) => s.wards);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousStep = React.useRef<number | null>(null);

  const { household, demoNow, step, direction, patchSummary, next, finish, skipAll } = flow;
  const householdId = household?.id;

  const initialCounts = React.useMemo(() => {
    const out: Partial<Record<ApplianceType, number>> = {};
    for (const a of appliances) {
      if (a.householdId !== householdId) continue;
      out[a.type] = (out[a.type] ?? 0) + Math.max(0, a.count);
    }
    return out;
  }, [appliances, householdId]);

  const existingUpload = React.useMemo<ElectricityBill | undefined>(() => {
    if (!householdId) return undefined;
    const month = currentMonth(demoNow);
    return bills.find(
      (b) => b.householdId === householdId && b.month === month && (b.source === "upload" || b.source === "manual"),
    );
  }, [bills, demoNow, householdId]);

  // A bill saved before a refresh still counts as uploaded.
  const existingUploadId = existingUpload?.id;
  React.useEffect(() => {
    if (existingUploadId) patchSummary({ billUploaded: true });
  }, [existingUploadId, patchSummary]);

  // Move focus to the new step's heading (skip the very first render).
  React.useEffect(() => {
    if (step === null) return;
    if (previousStep.current === null) {
      previousStep.current = step;
      return;
    }
    if (previousStep.current === step) return;
    previousStep.current = step;
    const delay = reducedMotion ? 0 : 360;
    const timer = window.setTimeout(() => {
      containerRef.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, step]);

  if (!flow.ready || !household || step === null) {
    return <OnboardingSkeleton />;
  }

  const areaLabel = areas.find((a) => a.id === household.areaId)?.name ?? "XYZ Colony";
  const wardLabel = wards.find((w) => w.id === household.wardId)?.name ?? "Ward 24";
  const meta = ONBOARDING_STEPS[step] ?? ONBOARDING_STEPS[0];

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <WelcomeStep
            firstName={flow.firstName}
            household={household}
            areaLabel={areaLabel}
            wardLabel={wardLabel}
            onStart={next}
            onSkipAll={skipAll}
          />
        );
      case 1:
        return (
          <HouseholdStep
            household={household}
            wardLabel={wardLabel}
            onSaved={() => {
              patchSummary({ householdSaved: true });
              next();
            }}
            onSkip={next}
          />
        );
      case 2:
        return (
          <ApplianceStep
            initialCounts={initialCounts}
            onContinue={(applianceCount) => {
              patchSummary({ applianceCount });
              next();
            }}
            onSkip={next}
          />
        );
      case 3:
        return (
          <BillStep
            household={household}
            demoNow={demoNow}
            existingUpload={existingUpload}
            onSaved={() => patchSummary({ billUploaded: true })}
            onContinue={next}
            onSkip={next}
          />
        );
      case 4:
        return (
          <HistoryStep
            household={household}
            demoNow={demoNow}
            onContinue={(previousBills) => {
              patchSummary({ previousBills });
              next();
            }}
            onSkip={next}
          />
        );
      default:
        return <BaselineStep household={household} summary={flow.summary} onFinish={finish} />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      {flow.alreadyDone ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-ink"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {flow.previousOutcome === "skipped" ? (
              <>
                You skipped setup for <span className="font-mono font-bold">{household.id}</span> earlier — running it
                now updates your profile.
              </>
            ) : (
              <>
                You&apos;ve already set up <span className="font-mono font-bold">{household.id}</span> — running this
                again updates your profile.
              </>
            )}
          </p>
        </div>
      ) : null}

      <div className="lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-8">
        <OnboardingRail step={step} onNavigate={flow.goTo} />

        <div ref={containerRef} className="mt-4 min-w-0 lg:mt-0">
          {reducedMotion ? (
            <div key={step}>{renderStep()}</div>
          ) : (
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={STEP_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: EASE }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Step {step + 1} of {STEP_COUNT}: {meta.label}
      </p>
    </div>
  );
}
