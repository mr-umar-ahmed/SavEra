"use client";

import { ArrowRight, Coins, FileText, Gauge, Home, Plug, ScanLine, Sparkles, TrendingUp } from "lucide-react";
import { CheckItem, EyebrowPill, GlowField } from "@/components/features/landing/primitives";
import { LabelChip } from "@/components/savera/LabelChip";
import { Button } from "@/components/ui/button";
import type { Household } from "@/types";
import { ESTIMATED_MINUTES } from "./steps";
import { ValueTile } from "./OnboardingPrimitives";

export interface WelcomeStepProps {
  firstName: string;
  household?: Household;
  areaLabel: string;
  wardLabel: string;
  onStart: () => void;
  onSkipAll: () => void;
}

/** Step 1 — personalised welcome with the three value props and the "what we'll ask" list. */
export function WelcomeStep({ firstName, household, areaLabel, wardLabel, onStart, onSkipAll }: WelcomeStepProps) {
  const target = household ? household.id : "your home";

  return (
    <section
      aria-labelledby="onboarding-welcome-title"
      className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <GlowField variant="soft" />

      <div className="relative px-5 py-7 sm:px-8 sm:py-9">
        <EyebrowPill tone="positive" icon={Sparkles}>
          First-run setup · ~{ESTIMATED_MINUTES} min
        </EyebrowPill>

        <h1
          id="onboarding-welcome-title"
          tabIndex={-1}
          data-step-heading
          className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground outline-none sm:text-4xl"
        >
          Hi {firstName}, let&apos;s digitise <span className="text-primary">{target}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-soft sm:text-base">
          A few taps and one bill photo give SAVERA enough to build a baseline for your home — not a city
          average — and to show where next month&apos;s units and rupees are likely to go.
        </p>

        <p className="meta mt-4 text-faint">
          {wardLabel} · {areaLabel} · Electricity Department (Raichur)
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <ValueTile
            icon={Gauge}
            tone="positive"
            title="Personal baseline"
            description="A kWh band built from your own bills and appliances, with confidence shown."
          />
          <ValueTile
            icon={TrendingUp}
            tone="electricity"
            title="Next-month forecast"
            description="Units and ₹ range for next month, with the drivers behind it listed."
          />
          <ValueTile
            icon={Coins}
            tone="primary"
            title="₹ actions"
            description="Ranked actions that may reduce your bill — try them in the Digital Twin first."
          />
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-2xl border border-border bg-inset p-4 sm:p-5">
            <div className="meta text-faint">What we&apos;ll ask</div>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              <CheckItem icon={Home} title="Household basics" description="Prefilled — you only confirm." />
              <CheckItem icon={Plug} title="Appliances you own" description="Ten quick picks with counts." />
              <CheckItem icon={ScanLine} title="Your latest bill" description="Photo or PDF from your device." />
              <CheckItem icon={FileText} tone="neutral" title="Older bills" description="Optional — unlocks a seasonal band." />
            </ul>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-positive/30 bg-positive/10 p-4 sm:p-5">
            <div>
              <div className="meta text-positive">Every field is optional</div>
              <p className="mt-2 text-xs leading-relaxed text-soft">
                Skip anything you don&apos;t know. SAVERA falls back to catalogue defaults and lowers the
                confidence it shows — it never blocks you.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LabelChip kind="simulated" label="Simulated OCR" size="sm" />
              <span className="text-2xs text-faint">Files stay on your device.</span>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={onSkipAll} className="w-full sm:w-auto">
            Skip setup — explore with demo data
          </Button>
          <Button type="button" size="lg" onClick={onStart} className="w-full sm:w-auto">
            Start setup
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
