"use client";

import { Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ESTIMATED_MINUTES, ONBOARDING_STEPS } from "./steps";

export interface OnboardingRailProps {
  step: number;
  /** Navigate to a step the viewer already reached (pending steps are disabled). */
  onNavigate: (step: number) => void;
  className?: string;
}

type StepState = "done" | "active" | "pending";

function stateOf(index: number, step: number): StepState {
  return index < step ? "done" : index === step ? "active" : "pending";
}

/**
 * Progress rail: vertical numbered list on desktop, a compact "Step n of 6" strip on phones.
 */
export function OnboardingRail({ step, onNavigate, className }: OnboardingRailProps) {
  const total = ONBOARDING_STEPS.length;
  const current = ONBOARDING_STEPS[step] ?? ONBOARDING_STEPS[0];
  const estimate = `~${ESTIMATED_MINUTES} min`;

  return (
    <>
      {/* Phone / tablet: compact strip */}
      <div className={cn("rounded-2xl border border-border bg-card px-4 py-3 lg:hidden", className)}>
        <div className="flex items-center justify-between gap-3">
          <span className="meta text-faint">
            Step {step + 1} of {total}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-2xs text-soft">
            <Clock3 className="size-3" aria-hidden="true" />
            {estimate}
          </span>
        </div>
        <div className="mt-1 text-sm font-bold text-foreground">{current.label}</div>
        <ol className="mt-2.5 flex gap-1.5" aria-label="Setup progress">
          {ONBOARDING_STEPS.map((s, i) => {
            const state = stateOf(i, step);
            return (
              <li key={s.id} className="flex-1">
                <button
                  type="button"
                  disabled={state === "pending"}
                  aria-current={state === "active" ? "step" : undefined}
                  aria-label={`${s.label}${state === "done" ? " (done)" : state === "active" ? " (current)" : ""}`}
                  onClick={() => onNavigate(i)}
                  className={cn(
                    "block w-full rounded-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    state === "pending" ? "cursor-default" : "cursor-pointer",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-1.5 w-full rounded-full transition-colors",
                      state === "done" && "bg-positive",
                      state === "active" && "bg-primary",
                      state === "pending" && "bg-secondary",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Desktop: vertical rail */}
      <nav aria-label="Setup progress" className={cn("hidden lg:block", className)}>
        <div className="lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between px-3">
            <span className="meta text-faint">Guided setup</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-2xs text-soft">
              <Clock3 className="size-3" aria-hidden="true" />
              {estimate}
            </span>
          </div>
          <ol className="relative">
            <span aria-hidden="true" className="absolute top-6 bottom-6 left-[1.45rem] w-px bg-border" />
            {ONBOARDING_STEPS.map((s, i) => {
              const state = stateOf(i, step);
              return (
                <li key={s.id} className="relative">
                  <button
                    type="button"
                    disabled={state === "pending"}
                    aria-current={state === "active" ? "step" : undefined}
                    onClick={() => onNavigate(i)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-2xl px-2 py-2 text-left outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring/60",
                      state === "active" && "bg-positive/10",
                      state === "done" && "cursor-pointer hover:bg-secondary",
                      state === "pending" && "cursor-default",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold transition-colors",
                        state === "done" && "border-positive/40 bg-positive text-positive-foreground",
                        state === "active" && "border-primary bg-primary text-primary-foreground shadow-sm",
                        state === "pending" && "border-border-strong bg-card text-faint",
                      )}
                    >
                      {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span
                        className={cn(
                          "block text-sm font-bold leading-tight",
                          state === "pending" ? "text-faint" : "text-foreground",
                        )}
                      >
                        {s.label}
                      </span>
                      <span className={cn("mt-0.5 block text-2xs leading-snug", state === "pending" ? "text-faint" : "text-muted-foreground")}>
                        {s.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </>
  );
}
