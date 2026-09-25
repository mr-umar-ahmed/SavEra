"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Droplet,
  Flame,
  Home,
  IndianRupee,
  Leaf,
  MapPin,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { Button } from "@/components/ui/button";
import { formatInrCompact, HERO_IMPACT } from "@/lib/engine/impact";
import { formatIN, formatRange, formatRangeINR, RANGE_DASH } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CountUp, EyebrowPill, GlowField, LandingSection, Reveal } from "./primitives";

/* ------------------------------------------------------------------ */
/* 3D stage (client-only; WebGL + reduced-motion fallbacks live inside) */
/* ------------------------------------------------------------------ */

const Hero3D = dynamic(() => import("@/components/features/landing/Hero3D").then((m) => m.Hero3D), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="Loading the 3D habitat model"
      className="flex h-[380px] w-full items-center justify-center rounded-3xl border border-border bg-muted/60 sm:h-[460px] lg:h-[500px]"
    >
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

/* ------------------------------------------------------------------ */
/* Impact figures — every number here comes from src/lib/engine/impact */
/* ------------------------------------------------------------------ */

const { household, community, inputs: IMPACT_INPUTS } = HERO_IMPACT;

const IMPACT_NOTE =
  "Illustrative: 8–12 % household electricity reduction at the Ward 24 peer average under the demo tariff.";

/** `₹1.3 Cr` + `₹1.9 Cr` → `₹1.3–1.9 Cr` (shared suffix collapsed); otherwise `a–b`. */
function compactInrRange(lo: number, hi: number): string {
  const a = formatInrCompact(lo);
  const b = formatInrCompact(hi);
  const suffix = / (Cr|L)$/.exec(a)?.[1];
  if (suffix && b.endsWith(` ${suffix}`)) {
    const cut = suffix.length + 1;
    return `${a.slice(0, -cut)}${RANGE_DASH}${b.slice(1, -cut)} ${suffix}`;
  }
  return `${a}${RANGE_DASH}${b}`;
}

/** Renders a `lo–hi` string with a soft break opportunity after the dash (narrow tiles). */
function RangeText({ text }: { text: string }) {
  const parts = text.split(RANGE_DASH);
  if (parts.length !== 2) return <>{text}</>;
  return (
    <>
      {parts[0]}
      {RANGE_DASH}
      <wbr />
      {parts[1]}
    </>
  );
}

interface ImpactTile {
  key: string;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub: string;
  accent?: boolean;
}

const IMPACT_TILES: ImpactTile[] = [
  {
    key: "month",
    icon: IndianRupee,
    label: "Per home / month",
    accent: true,
    value: <CountUp value={household.rupeeHigh} prefix="₹" format={(n) => formatIN(n)} />,
    sub: `${formatRangeINR(household.rupeeLow, household.rupeeHigh)} saved · ${formatRange(
      household.kwhLow,
      household.kwhHigh,
      "kWh",
    )} less`,
  },
  {
    key: "year",
    icon: Home,
    label: "Per home / year",
    value: <RangeText text={formatRangeINR(household.yearlyRupeeLow, household.yearlyRupeeHigh)} />,
    sub: `${formatRange(household.yearlyKwhLow, household.yearlyKwhHigh, "kWh")} a year · ${
      household.reductionPctLow
    }–${household.reductionPctHigh} % reduction`,
  },
  {
    key: "community",
    icon: Users,
    label: `Across ${formatIN(community.households)} homes / year`,
    value: <RangeText text={compactInrRange(community.yearlyRupeeLow, community.yearlyRupeeHigh)} />,
    sub: `${formatIN(community.households)} seeded households · Raichur pilot`,
  },
  {
    key: "co2",
    icon: Leaf,
    label: "CO₂ avoided / year",
    value: (
      <RangeText
        text={`${formatRange(Math.round(community.co2TonnesLow), Math.round(community.co2TonnesHigh))} t`}
      />
    ),
    sub: `${formatRange(community.yearlyKwhLow / 1e5, community.yearlyKwhHigh / 1e5, "lakh kWh", 1)} not drawn from the grid`,
  },
];

/* ------------------------------------------------------------------ */
/* Stream caption chips under the stage                                */
/* ------------------------------------------------------------------ */

const STREAM_CHIPS: { icon: LucideIcon; label: string; className: string }[] = [
  {
    icon: Zap,
    label: "Electricity",
    className: "border-stream-electricity/30 bg-stream-electricity/10 text-stream-electricity",
  },
  { icon: Droplet, label: "Water", className: "border-stream-water/30 bg-stream-water/10 text-stream-water" },
  { icon: Flame, label: "LPG", className: "border-stream-lpg/30 bg-stream-lpg/10 text-stream-lpg" },
];

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

/**
 * Landing hero: positioning headline, the two entry CTAs, the financial impact
 * strip (estimated · illustrative) and the 3D digital-twin stage.
 */
export function HeroSection() {
  const reduced = useReducedMotion();

  return (
    <LandingSection
      id="hero"
      seamless
      aria-labelledby="hero-title"
      className="pt-14 pb-16 sm:pt-20 sm:pb-20"
    >
      <GlowField variant="hero" />

      {/* Headline block */}
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <Reveal>
          <EyebrowPill tone="positive">AI-powered resource intelligence · Raichur pilot</EyebrowPill>
        </Reveal>

        <Reveal delay={0.08} className="mt-6">
          <h1
            id="hero-title"
            className="font-display text-4xl leading-[0.98] font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            <span className="block">Resource Intel</span>
            <span className="block bg-gradient-to-r from-primary via-positive to-primary bg-clip-text pb-1 text-transparent">
              For Every Home.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.16} className="mt-6">
          <p className="max-w-2xl text-base leading-relaxed text-soft sm:text-lg">
            SAVERA turns household electricity, water and LPG data into a{" "}
            <span className="font-semibold text-positive">personal baseline</span>, a next-month forecast
            and ranked actions — and turns anonymised households into a{" "}
            <span className="font-semibold text-stream-water">live demand picture</span> for the ward and
            the city.
          </p>
        </Reveal>

        <Reveal delay={0.24} className="mt-8 w-full sm:w-auto">
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth">
                <Sparkles aria-hidden />
                Initialize SAVERA
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <a href="#solution">
                See the loop
                <ArrowRight aria-hidden />
              </a>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.3} className="mt-5">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 font-mono text-2xs text-faint sm:text-xs">
            <MapPin className="size-3.5 shrink-0 text-positive" aria-hidden />
            <span>Deployed demo · Raichur, Karnataka · Ward 24 pilot</span>
            <span aria-hidden>·</span>
            <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-soft">
              citizen@savera.demo / savera
            </span>
          </p>
        </Reveal>
      </div>

      {/* Impact strip */}
      <Reveal delay={0.36} className="mx-auto mt-12 w-full max-w-5xl sm:mt-14">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-between">
          <p className="flex items-center gap-2 font-mono text-2xs font-semibold tracking-[0.14em] text-faint uppercase">
            <Leaf className="size-3.5 text-positive" aria-hidden />
            Financial impact · what a home could save
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <EstimatedChip size="sm" confidence="Medium" inputs={IMPACT_INPUTS} note={IMPACT_NOTE} />
            <span className="font-mono text-2xs tracking-wide text-faint">Estimated · illustrative</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm lg:grid-cols-4">
          {IMPACT_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.key}
                className="flex min-w-0 flex-col gap-1.5 bg-card/90 p-4 backdrop-blur sm:p-5"
              >
                <dt className="flex items-start gap-1.5 font-mono text-2xs leading-snug font-semibold tracking-[0.12em] text-faint uppercase">
                  <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0">{tile.label}</span>
                </dt>
                <dd className="flex min-w-0 flex-col gap-1">
                  <span
                    className={cn(
                      "font-display text-xl leading-tight font-extrabold tracking-tight tabular-nums sm:text-2xl lg:text-3xl",
                      tile.accent ? "text-positive" : "text-foreground",
                    )}
                  >
                    {tile.value}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{tile.sub}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </Reveal>

      {/* 3D stage */}
      <Reveal delay={0.1} className="mt-12 sm:mt-14">
        <div className="rounded-[1.9rem] border border-border bg-card p-1.5 shadow-xl sm:p-2">
          <Hero3D />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <LabelChip kind="simulation" size="sm" label="Simulation — Digital Twin Prototype" />
          {STREAM_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <span
                key={chip.label}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-2xs font-semibold",
                  chip.className,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {chip.label}
              </span>
            );
          })}
        </div>
      </Reveal>

      {/* Scroll cue */}
      <div className="mt-10 flex justify-center">
        <a
          href="#problem"
          aria-label="Scroll to the problem"
          className={cn(
            "flex size-11 items-center justify-center rounded-full border border-border bg-card text-soft shadow-sm outline-none transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            !reduced && "animate-bounce",
          )}
        >
          <ChevronDown className="size-5" aria-hidden />
        </a>
      </div>
    </LandingSection>
  );
}
