"use client";

import { BarChart3, Cpu, FlaskConical, Plug, ScanLine, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

import { LabelChip, type LabelChipKind } from "@/components/savera/LabelChip";

import { LandingSection, Reveal, SectionHeading } from "./primitives";

/* ------------------------------------------------------------------ */
/* Tech — the stack, stated plainly. Integration points are chipped   */
/* Integration-ready or Simulated; nothing claims a live feed.        */
/* ------------------------------------------------------------------ */

interface StackCard {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STACK: ReadonlyArray<StackCard> = [
  {
    icon: Cpu,
    title: "Next.js 15 App Router",
    body: "React 19, TypeScript strict, Tailwind v4 — server-rendered, edge-ready.",
  },
  {
    icon: FlaskConical,
    title: "Deterministic engine",
    body: "Pure TypeScript: baselines, forecasts, tariffs, recommendations — 120 unit tests, no LLM in the numbers.",
  },
  {
    icon: BarChart3,
    title: "Recharts · Three.js · Leaflet",
    body: "Seasonal charts, a WebGL digital twin and a ward GIS map from one token set.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by aggregation",
    body: "Household ids never leave the aggregation module; supervisors and departments see counts and averages only.",
  },
];

interface IntegrationChip {
  icon: LucideIcon;
  title: string;
  kind: LabelChipKind;
}

const INTEGRATIONS: ReadonlyArray<IntegrationChip> = [
  { icon: Plug, title: "Consent-based utility import", kind: "integration-ready" },
  { icon: Zap, title: "OpenADR-style demand response", kind: "integration-ready" },
  { icon: ScanLine, title: "Bill OCR · payments · refill booking", kind: "simulated" },
];

export function TechSection() {
  return (
    <LandingSection id="tech" tone="inset" aria-labelledby="tech-title">
      <Reveal>
        <SectionHeading
          eyebrow="Production-grade stack"
          eyebrowTone="positive"
          eyebrowIcon={Cpu}
          title={<span id="tech-title">Built like a product, not a slide deck.</span>}
          description="A deterministic engine, typed end to end, with every integration point ready for the real feed."
        />
      </Reveal>

      <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Technology stack">
        {STACK.map((card, i) => {
          const Icon = card.icon;
          return (
            <li key={card.title} className="h-full">
              <Reveal delay={i * 0.08} className="h-full">
                <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
                  <span
                    className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-primary"
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground">{card.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>

      <ul className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Integration points">
        {INTEGRATIONS.map((item, i) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="h-full">
              <Reveal delay={0.32 + i * 0.08} className="h-full">
                <div className="flex h-full items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="size-4 shrink-0 text-soft" aria-hidden />
                    <span className="text-sm font-semibold text-foreground">{item.title}</span>
                  </span>
                  <LabelChip kind={item.kind} size="sm" />
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>

      <Reveal delay={0.56}>
        <p className="mt-8 text-center font-mono text-2xs tracking-wider text-faint uppercase">
          Typecheck · Lint · 120 Vitest specs · Playwright demo-script smoke — green after every phase
        </p>
      </Reveal>
    </LandingSection>
  );
}
