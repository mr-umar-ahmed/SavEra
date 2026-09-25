"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CalendarClock,
  ChartPie,
  ChartLine,
  Home,
  MapPinned,
  Megaphone,
  Mic,
  Users,
  type LucideIcon,
} from "lucide-react";

import { LabelChip } from "@/components/savera/LabelChip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  CheckItem,
  EyebrowPill,
  GlowField,
  LandingSection,
  Reveal,
  SectionHeading,
  type EyebrowTone,
} from "./primitives";

/* ------------------------------------------------------------------ */
/* THE INNOVATION — one data loop across three portals: two large       */
/* layer cards (Citizen · Authority) bridged by the Ward Supervisor.    */
/* On mobile the bridge sits between the cards, in loop order.          */
/* ------------------------------------------------------------------ */

interface LayerFeature {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
}

interface LayerCard {
  id: string;
  tag: string;
  tone: EyebrowTone;
  title: string;
  blurb: string;
  watermark: LucideIcon;
  hover: string;
  features: readonly LayerFeature[];
  cta: { label: string; href: string; variant: "positive" | "outline" };
}

const CITIZEN: LayerCard = {
  id: "layer-citizen",
  tag: "Layer 1 · The citizen",
  tone: "positive",
  title: "Household Control",
  blurb:
    "Digitise your home, understand your electricity, water and LPG, and earn your Green Score.",
  watermark: Home,
  hover: "hover:border-positive/40",
  features: [
    {
      icon: ChartPie,
      title: "Appliance disaggregation",
      description:
        "Estimated kWh per appliance, reconciled against the bill — no smart meter needed.",
    },
    {
      icon: ChartLine,
      title: "Personal baseline & forecast",
      description: "Seasonal bands from your own bills, next-month kWh and ₹ range.",
    },
    {
      icon: Mic,
      title: "Digital Twin & voice",
      description: "Try a recommendation before you change a setting.",
    },
  ],
  cta: { label: "Launch Citizen portal", href: "/citizen", variant: "positive" },
};

const AUTHORITY: LayerCard = {
  id: "layer-authority",
  tag: "Layer 3 · The authority",
  tone: "water",
  title: "City Governance",
  blurb:
    "City-level demand intelligence, forecasting and resource planning for Electricity, Water and Gas.",
  watermark: Building2,
  hover: "hover:border-stream-water/40",
  features: [
    {
      icon: MapPinned,
      title: "Anonymised demand picture",
      description: "Zone, ward and area aggregates — never a household.",
    },
    {
      icon: CalendarClock,
      title: "Forecast & planning",
      description: (
        <>
          Next-month demand, heatmaps and supply adjustments.{" "}
          <LabelChip kind="integration-ready" size="sm" className="ml-1 align-middle" />
        </>
      ),
    },
    {
      icon: Megaphone,
      title: "Official alerts & demand response",
      description:
        "Planned interruptions and ADR events published by humans, delivered to citizens.",
    },
  ],
  cta: { label: "Launch Government portal", href: "/gov", variant: "outline" },
};

const BRIDGE_FLOW = [
  "Citizen report",
  "AI area grouping",
  "Field verification",
  "Department action",
] as const;

function LayerCardView({
  card,
  delay,
  className,
}: {
  card: LayerCard;
  delay: number;
  className?: string;
}) {
  const Watermark = card.watermark;
  return (
    <Reveal delay={delay} className={cn("h-full", className)}>
      <article
        className={cn(
          "border-border bg-muted/60 relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-3xl border p-6 transition-colors duration-200 sm:p-8",
          card.hover,
        )}
        aria-labelledby={`${card.id}-title`}
      >
        <Watermark
          aria-hidden
          strokeWidth={1.25}
          className="text-foreground/6 pointer-events-none absolute -right-6 -bottom-6 size-40"
        />

        <div className="relative">
          <EyebrowPill tone={card.tone}>{card.tag}</EyebrowPill>
          <h3
            id={`${card.id}-title`}
            className="text-foreground mt-4 text-2xl font-extrabold tracking-tight"
          >
            {card.title}
          </h3>
          <p className="text-soft mt-2 max-w-md text-sm leading-relaxed">{card.blurb}</p>

          <ul role="list" className="mt-6 space-y-4">
            {card.features.map((f) => (
              <CheckItem
                key={f.title}
                icon={f.icon}
                tone={card.tone}
                title={f.title}
                description={f.description}
              />
            ))}
          </ul>
        </div>

        <div className="relative mt-auto pt-8">
          <Button asChild variant={card.cta.variant} size="sm">
            <Link href={card.cta.href}>
              {card.cta.label}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </article>
    </Reveal>
  );
}

function MobileArrow({ position }: { position: "top" | "bottom" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "border-primary/30 bg-card text-primary absolute left-1/2 z-10 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border shadow-sm lg:hidden",
        position === "top" ? "-top-[1.625rem]" : "-bottom-[1.625rem]",
      )}
    >
      <ArrowDown className="size-3.5" />
    </span>
  );
}

export function InnovationSection() {
  return (
    <LandingSection id="innovation" tone="card" aria-labelledby="innovation-heading">
      <GlowField variant="soft" />

      <div className="relative">
        <Reveal>
          <SectionHeading
            eyebrow="The innovation · One data loop"
            eyebrowTone="positive"
            title={<span id="innovation-heading">One protocol, three portals.</span>}
            description="Household data improves individual insight; anonymised aggregates become ward and city demand intelligence."
          />
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Layer 1 — Citizen */}
          <LayerCardView card={CITIZEN} delay={0} className="order-1" />

          {/* Layer 2 — Ward supervisor bridge (between the cards on mobile, spanning both on lg) */}
          <Reveal delay={0.16} className="order-2 lg:order-3 lg:col-span-2">
            <div className="border-primary/30 bg-primary/5 relative rounded-2xl border p-5 sm:p-6">
              <MobileArrow position="top" />
              <MobileArrow position="bottom" />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="border-primary/20 bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl border"
                    aria-hidden
                  >
                    <Users className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <EyebrowPill tone="primary">Layer 2 · The ward supervisor</EyebrowPill>
                    <p className="text-foreground mt-2 max-w-xl text-sm leading-relaxed">
                      AI groups citizen reports into area cases; the supervisor verifies on the
                      ground before anything reaches the department.
                    </p>
                  </div>
                </div>

                <Button asChild variant="ghost" size="sm" className="w-fit shrink-0 sm:ml-4">
                  <Link href="/supervisor">
                    Launch Supervisor portal
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>

              <ol
                role="list"
                className="border-primary/15 mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 border-t pt-4 sm:ml-16"
                aria-label="Ward verification flow"
              >
                {BRIDGE_FLOW.map((stage, i) => (
                  <li key={stage} className="flex items-center gap-2">
                    <span className="border-border bg-card text-2xs text-soft rounded-full border px-3 py-1 font-mono font-semibold tracking-[0.1em] uppercase">
                      {stage}
                    </span>
                    {i < BRIDGE_FLOW.length - 1 && (
                      <ArrowRight className="text-faint size-3.5" aria-hidden />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          {/* Layer 3 — Authority */}
          <LayerCardView card={AUTHORITY} delay={0.08} className="order-3 lg:order-2" />
        </div>
      </div>
    </LandingSection>
  );
}
