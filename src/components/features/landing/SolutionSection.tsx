"use client";

import * as React from "react";
import { ArrowRight, Home, ScanLine, Sparkles, type LucideIcon } from "lucide-react";

import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { cn } from "@/lib/utils";

import { EyebrowPill, GlowField, LandingSection, Reveal, SectionHeading } from "./primitives";

/* ------------------------------------------------------------------ */
/* THE SOLUTION — "the golden path": three round nodes on a dotted     */
/* connector (vertical on mobile), then the six-step closed loop.       */
/* ------------------------------------------------------------------ */

interface Step {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  chip: React.ReactNode;
}

const STEPS: readonly Step[] = [
  {
    number: "01",
    title: "Digitise the habitat",
    description:
      "Tell SAVERA about the home and its appliances, or scan a rating label. Every field has Skip for now.",
    icon: Home,
    chip: (
      <EyebrowPill tone="neutral" dot={false}>
        Never blocked
      </EyebrowPill>
    ),
  },
  {
    number: "02",
    title: "Scan the bill",
    description:
      "Upload a photo or PDF. Units, period and meter readings are extracted and reconciled with the appliance estimate.",
    icon: ScanLine,
    chip: <LabelChip kind="simulated" label="Simulated OCR" size="sm" />,
  },
  {
    number: "03",
    title: "Act on ranked fixes",
    description:
      "A personal baseline, a next-month forecast and actions with ₹ impact — try them in the Digital Twin first.",
    icon: Sparkles,
    chip: (
      <EstimatedChip confidence="Medium" inputs={["12 bills", "78 % appliance detail"]} size="sm" />
    ),
  },
] as const;

const LOOP = ["Measure", "Analyse", "Predict", "Recommend", "Act", "Learn"] as const;

export function SolutionSection() {
  return (
    <LandingSection id="solution" tone="page" aria-labelledby="solution-heading">
      <GlowField variant="soft" />

      <div className="relative">
        <Reveal>
          <SectionHeading
            eyebrow="The solution · How SAVERA works"
            eyebrowTone="positive"
            title={<span id="solution-heading">From paper bill to ranked action.</span>}
            description="One closed loop: measure → analyse → predict → recommend → act → learn."
          />
        </Reveal>

        {/* Golden path — three nodes on a dashed connector */}
        <ol role="list" className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === STEPS.length - 1;
            return (
              <li key={step.number} className="relative">
                {/* Connector to the next node: vertical on mobile, horizontal from md */}
                {!isLast && (
                  <>
                    <span
                      aria-hidden
                      className="border-border-strong pointer-events-none absolute top-20 -bottom-10 left-10 -ml-px border-l-2 border-dashed md:hidden"
                    />
                    <span
                      aria-hidden
                      className="border-border-strong pointer-events-none absolute top-10 left-[calc(50%_+_2.5rem)] hidden w-[calc(100%_-_3.5rem)] border-t-2 border-dashed md:block"
                    />
                  </>
                )}

                <Reveal
                  delay={i * 0.08}
                  className="flex items-start gap-5 md:flex-col md:items-center md:text-center"
                >
                  {/* Node */}
                  <div className="relative shrink-0">
                    <div className="border-positive/30 bg-card flex size-20 items-center justify-center rounded-full border shadow-md">
                      <Icon className="text-positive size-7" aria-hidden />
                    </div>
                    <span
                      className="bg-positive text-2xs text-positive-foreground ring-background absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full font-mono font-bold ring-2"
                      aria-hidden
                    >
                      {step.number}
                    </span>
                  </div>

                  {/* Copy */}
                  <div className="min-w-0 flex-1 md:mt-5 md:flex md:max-w-xs md:flex-col md:items-center">
                    <h3 className="text-foreground text-lg font-bold tracking-tight">
                      <span className="sr-only">Step {step.number}: </span>
                      {step.title}
                    </h3>
                    <p className="text-soft mt-2 text-sm leading-relaxed">{step.description}</p>
                    <div className="mt-3 flex md:justify-center">{step.chip}</div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>

        {/* The six-step loop */}
        <Reveal delay={0.24}>
          <div className="mt-14 flex flex-col items-center gap-3">
            <span className="text-2xs text-faint font-mono font-semibold tracking-[0.14em] uppercase">
              The loop
            </span>
            <ol
              role="list"
              className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2.5"
              aria-label="Closed loop"
            >
              {LOOP.map((stage, i) => (
                <li key={stage} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "border-border bg-muted text-2xs text-soft rounded-full border px-3 py-1 font-mono font-semibold tracking-[0.12em] uppercase",
                      i === LOOP.length - 1 && "border-positive/30 bg-positive/10 text-positive",
                    )}
                  >
                    {stage}
                  </span>
                  {i < LOOP.length - 1 && (
                    <ArrowRight className="text-faint size-3.5" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
            <p className="text-muted-foreground text-xs">
              Every action you take feeds the next month&apos;s baseline.
            </p>
          </div>
        </Reveal>
      </div>
    </LandingSection>
  );
}
