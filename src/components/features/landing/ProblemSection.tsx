"use client";

import * as React from "react";
import { AlertTriangle, Droplet, Flame, Zap, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  CountUp,
  EyebrowPill,
  GlowField,
  LandingSection,
  Reveal,
  SectionHeading,
} from "./primitives";

/* ------------------------------------------------------------------ */
/* THE PROBLEM — one "pain" card per stream + an illustrative evidence  */
/* bar. Copy is deliberately un-sourced and labelled as demo figures.   */
/* ------------------------------------------------------------------ */

interface PainCard {
  stream: string;
  icon: LucideIcon;
  /** Icon tile colours (literal classes so Tailwind scans them). */
  tile: string;
  /** Stream eyebrow ink. */
  ink: string;
  /** Hover border tint for the card. */
  hover: string;
  title: string;
  description: string;
  consequence: string;
}

const PAINS: readonly PainCard[] = [
  {
    stream: "Electricity",
    icon: Zap,
    tile: "border-amber-500/20 bg-amber-500/10 text-amber-ink",
    ink: "text-amber-ink",
    hover: "hover:border-amber-500/40",
    title: "One number a month",
    description:
      "A bill total says nothing about which appliance, which habit or which season drove it.",
    consequence: "Bills drift 8–12 % above a household's own normal without anyone noticing.",
  },
  {
    stream: "Water",
    icon: Droplet,
    tile: "border-teal-500/20 bg-teal-500/10 text-teal-ink",
    ink: "text-teal-ink",
    hover: "hover:border-teal-500/40",
    title: "Complaints without evidence",
    description:
      "Low-pressure and short-supply reports arrive as phone calls, scattered across a ward, impossible to verify at scale.",
    consequence: "Supply-demand gaps stay invisible until they become outages.",
  },
  {
    stream: "LPG",
    icon: Flame,
    tile: "border-rose-500/20 bg-rose-500/10 text-rose-ink",
    ink: "text-rose-ink",
    hover: "hover:border-rose-500/40",
    title: "Refills by surprise",
    description:
      "Cylinders run out mid-cooking; unusual burn rates that could signal a safety issue are never flagged.",
    consequence: "Distribution planning runs on last year's averages.",
  },
] as const;

interface EvidenceStat {
  value: number;
  unit: string;
  rest: string;
  /** Screen-reader friendly reading of the whole stat. */
  label: string;
}

const EVIDENCE: readonly EvidenceStat[] = [
  {
    value: 1,
    unit: "bill",
    rest: "· 30 days · 0 appliance insight",
    label: "1 bill, 30 days, 0 appliance insight",
  },
  {
    value: 78,
    unit: "households",
    rest: "in one XYZ Colony water case",
    label: "78 households in one XYZ Colony water case",
  },
  {
    value: 18,
    unit: "days",
    rest: "into a 14.2 kg cylinder — no refill date",
    label: "18 days into a 14.2 kilogram cylinder, no refill date",
  },
] as const;

export function ProblemSection() {
  return (
    <LandingSection id="problem" tone="card" aria-labelledby="problem-heading">
      <GlowField variant="stream" />

      <div className="relative">
        <Reveal>
          <SectionHeading
            eyebrow="The problem"
            eyebrowTone="critical"
            title={<span id="problem-heading">Utilities are managed in the dark.</span>}
            description="Households only learn what happened when the bill arrives; wards and departments only learn when complaints pile up."
          />
        </Reveal>

        {/* Pain cards — one per stream */}
        <ul role="list" className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {PAINS.map((pain, i) => {
            const Icon = pain.icon;
            return (
              <li key={pain.stream} className="h-full">
                <Reveal delay={i * 0.08} className="h-full">
                  <div
                    className={cn(
                      "border-border bg-muted/60 hover:bg-muted flex h-full flex-col rounded-2xl border p-6 transition-colors duration-200",
                      pain.hover,
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-12 items-center justify-center rounded-xl border",
                        pain.tile,
                      )}
                      aria-hidden
                    >
                      <Icon className="size-6" />
                    </div>

                    <div
                      className={cn(
                        "text-2xs mt-5 font-mono font-semibold tracking-[0.14em] uppercase",
                        pain.ink,
                      )}
                    >
                      {pain.stream}
                    </div>
                    <h3 className="text-foreground mt-1 text-lg font-bold tracking-tight">
                      {pain.title}
                    </h3>
                    <p className="text-soft mt-2 text-sm leading-relaxed">{pain.description}</p>

                    <p className="border-border/60 text-tone-critical mt-auto flex items-start gap-2 border-t pt-4 text-xs leading-relaxed font-semibold">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span>
                        <span className="sr-only">Consequence: </span>
                        {pain.consequence}
                      </span>
                    </p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>

        {/* Evidence bar — illustrative demo figures */}
        <Reveal delay={0.24}>
          <div className="border-border bg-muted/60 mt-8 flex flex-col gap-4 rounded-2xl border p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <ul
              role="list"
              className="sm:divide-border grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x"
              aria-label="Illustrative demo figures"
            >
              {EVIDENCE.map((stat, i) => (
                <li
                  key={stat.label}
                  className={cn(
                    "flex min-w-0 flex-col gap-1",
                    i > 0 && "sm:pl-6",
                    i < EVIDENCE.length - 1 && "sm:pr-6",
                  )}
                >
                  <div className="flex items-baseline gap-1.5">
                    <CountUp
                      value={stat.value}
                      duration={1.1}
                      className="font-display text-foreground text-3xl font-extrabold tracking-tight"
                    />
                    <span className="text-soft font-mono text-xs font-semibold tracking-[0.12em] uppercase">
                      {stat.unit}
                    </span>
                  </div>
                  <p className="text-2xs text-muted-foreground font-mono leading-relaxed">
                    {stat.rest}
                  </p>
                </li>
              ))}
            </ul>

            <div className="shrink-0 lg:pl-6">
              <EyebrowPill tone="neutral">Illustrative demo figures</EyebrowPill>
            </div>
          </div>
        </Reveal>
      </div>
    </LandingSection>
  );
}
