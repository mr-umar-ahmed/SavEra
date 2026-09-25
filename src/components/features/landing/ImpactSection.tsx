"use client";

import * as React from "react";
import {
  Calculator,
  ChevronDown,
  Droplets,
  IndianRupee,
  Leaf,
  TrendingDown,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { communityImpact, formatInrCompact, HERO_IMPACT, IMPACT_ANCHORS, savingsFromBill } from "@/lib/engine/impact";
import { formatINR, formatKwh, formatRange, formatRangeINR } from "@/lib/format";
import { cn } from "@/lib/utils";

import { CountUp, GlowField, LandingSection, Reveal, SectionHeading } from "./primitives";

/* ------------------------------------------------------------------ */
/* Impact — the financial story. A slab-aware ₹ calculator driven by  */
/* the pure impact engine, next to the seeded-pilot community totals. */
/* Every number here is an estimate and is labelled as such.          */
/* ------------------------------------------------------------------ */

const BILL_MIN = 500;
const BILL_MAX = 12_000;
const BILL_STEP = 50;
const BILL_DEFAULT = 3120; // H-1024, Sep 2026 bill

const PRESETS: ReadonlyArray<{ label: string; bill: number }> = [
  { label: "1 BHK", bill: 1400 },
  { label: "H-1024", bill: BILL_DEFAULT },
  { label: "Villa", bill: 7800 },
];

const COMMUNITY = communityImpact();

const CALC_INPUTS = [
  { label: "Reduction band", value: `${IMPACT_ANCHORS.reductionPctLow}–${IMPACT_ANCHORS.reductionPctHigh} %` },
  { label: "Tariff", value: "Demo tariff — configurable" },
  { label: "Emission factor", value: `${IMPACT_ANCHORS.gridKgPerKwh} kg CO₂/kWh` },
] as const;

/** Clamp a typed or dragged value into the calculator's range; integers only. */
function clampBill(n: number): number {
  if (!Number.isFinite(n)) return BILL_DEFAULT;
  return Math.min(BILL_MAX, Math.max(BILL_MIN, Math.round(n)));
}

/* ---------------------------------- Result tile ------------------- */

interface ResultTileProps {
  label: string;
  value: string;
  emphasis?: boolean;
  live?: boolean;
}

function ResultTile({ label, value, emphasis = false, live = false }: ResultTileProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        emphasis ? "border-positive/30 bg-positive/10" : "border-border bg-muted/60",
      )}
    >
      <dt className="font-mono text-2xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd
        aria-live={live ? "polite" : undefined}
        aria-atomic={live ? true : undefined}
        className={cn(
          "mt-1.5 font-display font-extrabold tracking-tight tabular-nums",
          emphasis ? "text-2xl text-positive sm:text-3xl" : "text-lg text-foreground sm:text-xl",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/* ---------------------------------- Community stat ---------------- */

interface StatCardProps extends React.ComponentProps<"div"> {
  icon: LucideIcon;
  tone?: "primary" | "positive" | "water" | "neutral";
  label: React.ReactNode;
  children: React.ReactNode;
}

const STAT_TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "border-primary/30 bg-primary/10 text-primary",
  positive: "border-positive/30 bg-positive/10 text-positive",
  water: "border-stream-water/30 bg-stream-water/10 text-stream-water",
  neutral: "border-border bg-muted text-soft",
};

function StatCard({ icon: Icon, tone = "neutral", label, children, className, ...props }: StatCardProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border border-border bg-muted/60 p-4", className)} {...props}>
      <span
        className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", STAT_TONE[tone])}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-2xl">
          {children}
        </div>
        <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/* ---------------------------------- Section ----------------------- */

export function ImpactSection() {
  const id = React.useId();
  const labelId = `${id}-bill-label`;
  const inputId = `${id}-bill-input`;

  const [bill, setBill] = React.useState<number>(BILL_DEFAULT);
  const [draft, setDraft] = React.useState<string>(String(BILL_DEFAULT));

  const commit = React.useCallback((raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    const next = digits.length === 0 ? BILL_DEFAULT : clampBill(Number(digits));
    setBill(next);
    setDraft(String(next));
  }, []);

  const setBoth = React.useCallback((next: number) => {
    const v = clampBill(next);
    setBill(v);
    setDraft(String(v));
  }, []);

  const s = React.useMemo(() => savingsFromBill(bill), [bill]);

  const communityRupees = `${formatInrCompact(COMMUNITY.yearlyRupeeLow)}–${formatInrCompact(COMMUNITY.yearlyRupeeHigh)}`;
  const communityGwh = formatRange(COMMUNITY.yearlyKwhLow / 1e6, COMMUNITY.yearlyKwhHigh / 1e6, "GWh", 1);
  const communityCo2 = formatRange(COMMUNITY.co2TonnesLow, COMMUNITY.co2TonnesHigh, "t CO₂");

  return (
    <LandingSection id="impact" tone="card" aria-labelledby="impact-title">
      <GlowField variant="soft" />

      <Reveal>
        <SectionHeading
          eyebrow="The impact · Estimated · Illustrative"
          eyebrowTone="primary"
          eyebrowIcon={Calculator}
          title={<span id="impact-title">What a household saves — and a city gains.</span>}
          description="Slab-aware ₹ estimates under the demo tariff. Every figure here is an estimate, not a promise."
        />
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Calculator */}
        <Reveal delay={0.08} className="lg:col-span-7">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-xl shadow-primary/5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                id={labelId}
                className="font-mono text-2xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
              >
                Your monthly electricity bill
              </span>
              <LabelChip kind="demo" size="sm" label="Demo tariff" />
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-4xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-5xl">
                {formatINR(bill)}
              </span>
              <span className="font-mono text-xs text-faint">/ month</span>
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div role="group" aria-labelledby={labelId} className="flex-1 py-1">
                <Slider
                  value={[bill]}
                  min={BILL_MIN}
                  max={BILL_MAX}
                  step={BILL_STEP}
                  onValueChange={(v) => setBoth(v[0] ?? BILL_DEFAULT)}
                  aria-label="Monthly electricity bill in rupees"
                />
                <div className="mt-2 flex justify-between font-mono text-2xs text-faint tabular-nums">
                  <span>{formatINR(BILL_MIN)}</span>
                  <span>{formatINR(BILL_MAX)}</span>
                </div>
              </div>

              <div className="relative w-full sm:w-40">
                <label htmlFor={inputId} className="sr-only">
                  Monthly electricity bill in rupees
                </label>
                <span
                  className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-sm text-faint"
                  aria-hidden
                >
                  ₹
                </span>
                <Input
                  id={inputId}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                  onBlur={() => commit(draft)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commit(draft);
                      e.currentTarget.blur();
                    }
                  }}
                  className="pl-8 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Example bills">
              {PRESETS.map((p) => {
                const active = bill === p.bill;
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setBoth(p.bill)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-2xs font-semibold tracking-wider uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted text-soft hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    <span>{p.label}</span>
                    <span className="text-faint">·</span>
                    <span className="tabular-nums">{formatINR(p.bill)}</span>
                  </button>
                );
              })}
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <ResultTile label="Estimated units" value={formatKwh(s.monthlyKwh)} />
              <ResultTile label="Saves per month" value={formatRangeINR(s.rupeeLow, s.rupeeHigh)} emphasis live />
              <ResultTile label="Saves per year" value={formatRangeINR(s.yearlyRupeeLow, s.yearlyRupeeHigh)} />
              <ResultTile label="CO₂ avoided / year" value={formatRange(s.co2KgLow, s.co2KgHigh, "kg")} />
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              <EstimatedChip confidence="Medium" inputs={CALC_INPUTS} />
              <p className="text-2xs text-faint">
                Demo tariff — configurable. Actual bills differ by utility, fixed charges and taxes.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Community */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Reveal delay={0.16}>
            <StatCard
              icon={Users}
              tone="primary"
              label={
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  participating households
                  <LabelChip kind="demo" size="sm" label="Seeded demo" />
                </span>
              }
            >
              <CountUp value={COMMUNITY.households} />
            </StatCard>
          </Reveal>

          <Reveal delay={0.24}>
            <StatCard
              icon={IndianRupee}
              tone="positive"
              label="saved per year across the pilot (estimated)"
              className="border-positive/30 bg-positive/10"
            >
              <span className="text-positive">{communityRupees}</span>
            </StatCard>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={Zap} tone="primary" label="averted per year" className="items-start">
                {communityGwh}
              </StatCard>
              <StatCard icon={Leaf} tone="positive" label="avoided per year" className="items-start">
                {communityCo2}
              </StatCard>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={Droplets} tone="water" label="water concern verification (demo pipeline)">
                &lt; 24 h
              </StatCard>
              <StatCard icon={TrendingDown} tone="neutral" label="peak load averted via ADR (estimated)">
                14.2 %
              </StatCard>
            </div>
          </Reveal>

          <Reveal delay={0.48}>
            <p className="px-1 font-mono text-2xs tracking-wider text-faint uppercase">
              Estimated · illustrative · Raichur Ward 24 pilot
            </p>
          </Reveal>
        </div>
      </div>

      {/* How we count */}
      <Reveal delay={0.1} className="mt-8">
        <details className="group rounded-2xl border border-border bg-muted/50 open:bg-muted/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 font-mono text-2xs font-semibold tracking-[0.14em] text-soft uppercase outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Calculator className="size-3.5" aria-hidden />
              How we count
            </span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="border-t border-border px-5 py-4">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
              {HERO_IMPACT.inputs.map((row) => (
                <div key={row.label}>
                  <dt className="font-mono text-2xs tracking-wider text-muted-foreground uppercase">{row.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Savings = bill(kWh) − bill(kWh × (1 − reduction)) under the demo tariff, so higher slabs save more per
              unit. Community totals are 12 × the per-household estimate × participating households. Nothing here is
              measured.
            </p>
          </div>
        </details>
      </Reveal>
    </LandingSection>
  );
}
