"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CookingPot,
  Fan,
  Flame,
  Lightbulb,
  Microwave,
  Plug,
  Refrigerator,
  Snowflake,
  Tv,
  WashingMachine,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { SkipRow } from "@/components/savera/SkipRow";
import { EyebrowPill } from "@/components/features/landing/primitives";
import { Button } from "@/components/ui/button";
import { getCatalogueEntry } from "@/data/catalogue/appliances";
import type { ApplianceType } from "@/types";
import { cn } from "@/lib/utils";
import { StepShell } from "./StepShell";
import { AsideTips, CountStepper } from "./OnboardingPrimitives";

export interface ApplianceStepProps {
  /** Existing counts per type from the household's inventory (pre-checks the chips). */
  initialCounts: Partial<Record<ApplianceType, number>>;
  onContinue: (applianceCount: number) => void;
  onSkip: () => void;
}

interface QuickPick {
  type: ApplianceType;
  label: string;
  icon: LucideIcon;
  note: string;
  max: number;
}

/** The ten highest-impact appliance types, in the order judges expect to see them. */
export const QUICK_PICKS: readonly QuickPick[] = [
  { type: "ac", label: "Air conditioner", icon: Snowflake, note: "Largest summer load", max: 6 },
  { type: "fridge", label: "Refrigerator", icon: Refrigerator, note: "Runs 24 hours", max: 3 },
  { type: "geyser", label: "Geyser", icon: Flame, note: "Winter mornings", max: 4 },
  { type: "washing_machine", label: "Washing machine", icon: WashingMachine, note: "Per-load energy", max: 2 },
  { type: "ceiling_fan", label: "Ceiling fans", icon: Fan, note: "Count every room", max: 12 },
  { type: "led_bulb", label: "LED lighting", icon: Lightbulb, note: "Bulbs and battens", max: 30 },
  { type: "tv", label: "Television", icon: Tv, note: "Plus set-top box", max: 4 },
  { type: "water_pump", label: "Water pump", icon: Waves, note: "Overhead tank motor", max: 2 },
  { type: "microwave", label: "Microwave", icon: Microwave, note: "Short, high draw", max: 2 },
  { type: "induction_cooktop", label: "Induction cooktop", icon: CookingPot, note: "If used daily", max: 2 },
];

const TIPS = [
  { title: "Counts first", text: "Number of units matters more than model details for the first baseline." },
  { title: "Defaults fill gaps", text: "Star rating, hours and wattage come from the catalogue until you add them." },
  { title: "Add details later", text: "Electricity Setup walks through each appliance with Don't know / Skip." },
] as const;

/** Step 3 — quick appliance picks. Counts only (the wizard owns the inventory); nothing is written here. */
export function ApplianceStep({ initialCounts, onContinue, onSkip }: ApplianceStepProps) {
  const [counts, setCounts] = useState<Record<ApplianceType, number>>(() => {
    const seed = {} as Record<ApplianceType, number>;
    for (const pick of QUICK_PICKS) seed[pick.type] = Math.min(pick.max, initialCounts[pick.type] ?? 0);
    return seed;
  });

  const prefilled = useMemo(() => QUICK_PICKS.some((p) => (initialCounts[p.type] ?? 0) > 0), [initialCounts]);
  const total = QUICK_PICKS.reduce((sum, p) => sum + (counts[p.type] ?? 0), 0);
  const selectedTypes = QUICK_PICKS.filter((p) => (counts[p.type] ?? 0) > 0).length;

  const toggle = (pick: QuickPick) => {
    setCounts((prev) => {
      const current = prev[pick.type] ?? 0;
      const restored = Math.min(pick.max, initialCounts[pick.type] ?? 1) || 1;
      return { ...prev, [pick.type]: current > 0 ? 0 : restored };
    });
  };

  const setCount = (type: ApplianceType, value: number) => {
    setCounts((prev) => ({ ...prev, [type]: value }));
  };

  return (
    <StepShell
      eyebrow="Step 3 · Appliances"
      icon={Plug}
      title="Which of these do you use?"
      description="Tap the ones you own and set how many. Star ratings, hours and wattage can be added later — SAVERA uses catalogue defaults until then."
      headerAside={prefilled ? <EyebrowPill tone="neutral" dot={false}>Prefilled from your inventory</EyebrowPill> : null}
      aside={<AsideTips items={TIPS} />}
      footer={
        <>
          <SkipRow onSkip={onSkip} label="Use the current inventory" />
          <Button type="button" onClick={() => onContinue(total)} className="w-full sm:w-auto">
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <ul className="grid gap-2.5 sm:grid-cols-2" aria-label="Appliance quick picks">
        {QUICK_PICKS.map((pick) => {
          const count = counts[pick.type] ?? 0;
          const selected = count > 0;
          const highLoad = getCatalogueEntry(pick.type).highLoad;
          const Icon = pick.icon;
          return (
            <li
              key={pick.type}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                selected ? "border-positive/60 bg-positive/10 shadow-sm" : "border-border bg-card/60",
              )}
            >
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(pick)}
                className={cn(
                  "group flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl text-left outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring/60",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                    selected
                      ? "border-positive/40 bg-positive/15 text-positive"
                      : "border-border bg-muted text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold leading-tight text-foreground">{pick.label}</span>
                    {highLoad ? (
                      <span className="rounded-full border border-stream-electricity/30 bg-stream-electricity/10 px-1.5 py-px font-mono text-2xs font-semibold text-stream-electricity">
                        High load
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{pick.note}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    selected ? "border-positive bg-primary text-primary-foreground" : "border-border text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              </button>
              {selected ? (
                <CountStepper
                  size="sm"
                  label={`${pick.label} count`}
                  value={count}
                  min={1}
                  max={pick.max}
                  onChange={(v) => setCount(pick.type, v)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-inset px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-soft" aria-live="polite">
          <span className="font-mono font-bold text-foreground">{total}</span> appliances across{" "}
          <span className="font-mono font-bold text-foreground">{selectedTypes}</span> types
        </p>
        <p className="text-xs text-muted-foreground">
          You can add details any time in{" "}
          <Link href="/citizen/setup/electricity" className="font-semibold text-primary underline-offset-4 hover:underline">
            Electricity Setup
          </Link>
          .
        </p>
      </div>
    </StepShell>
  );
}
